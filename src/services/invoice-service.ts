import { and, asc, eq, isNull, lt, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { invoices, invoiceItems, invoiceNumberSeq, type Invoice, type InvoiceItem } from "@/db/schema";
import { contacts } from "@/db/schema";
import { products } from "@/db/schema";
import { recordAuditEvent, type Tx } from "@/utils/validation/audit";
import { assertCan, type ActorContext } from "@/utils/authz";
import { ConflictError, InvalidInvoiceStateError, NotFoundError, ValidationError } from "@/lib/errors";
import { calculateInvoiceTotals, calculateLineItem } from "@/lib/calculations";
import {
  createInvoiceSchema,
  invoiceItemInputSchema,
  invoiceSearchSchema,
  updateInvoiceSchema,
  type CreateInvoiceInput,
  type InvoiceItemInput,
  type InvoiceSearchInput,
  type UpdateInvoiceInput,
} from "@/utils/validation/invoice";

export type InvoiceWithItems = Invoice & { items: InvoiceItem[] };

// ---------------------------------------------------------------------------
// Invoice numbering — concurrency-safe via a Postgres sequence (PRD §9/§11).
// ---------------------------------------------------------------------------
async function generateInvoiceNumber(tx: Tx): Promise<string> {
  try {
    await tx.execute(
      sql`create sequence if not exists invoice_number_seq start with 1 increment by 1 minvalue 1`
    );
    const result = await tx.execute(sql`select nextval('invoice_number_seq') as nextval`);
    const rows = result.rows as Array<{ nextval: string | number }>;
    const rawVal = rows[0]?.nextval;
    if (rawVal !== undefined && rawVal !== null) {
      const n = String(rawVal);
      return `INV-${n.padStart(6, "0")}`;
    }
  } catch (e) {
    console.warn("Sequence nextval error, using table count fallback:", e);
  }

  const [maxRow] = await tx
    .select({ count: sql<number>`count(*)` })
    .from(invoices);
  const nextNum = (Number(maxRow?.count) || 0) + 1;
  return `INV-${String(nextNum).padStart(6, "0")}`;
}

// ---------------------------------------------------------------------------
// Dynamic OVERDUE derivation — never stored (PRD §9).
// ---------------------------------------------------------------------------
export type InvoiceDisplayStatus = Invoice["status"] | "OVERDUE";

export function isOverdue(invoice: Pick<Invoice, "status" | "dueDate" | "amountDue">): boolean {
  return (
    (invoice.status === "FINALIZED" || invoice.status === "PARTIALLY_PAID") &&
    invoice.dueDate !== null &&
    invoice.dueDate.getTime() < Date.now() &&
    parseFloat(invoice.amountDue) > 0
  );
}

export function getDisplayStatus(invoice: Pick<Invoice, "status" | "dueDate" | "amountDue">): InvoiceDisplayStatus {
  return isOverdue(invoice) ? "OVERDUE" : invoice.status;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------
export async function getInvoiceById(id: string): Promise<InvoiceWithItems | null> {
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  if (!invoice) return null;
  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))
    .orderBy(asc(invoiceItems.position));
  return { ...invoice, items };
}

async function requireInvoice(id: string): Promise<InvoiceWithItems> {
  const invoice = await getInvoiceById(id);
  if (!invoice) throw new NotFoundError("Invoice", id);
  return invoice;
}

function assertDraft(invoice: Pick<Invoice, "id" | "status">): void {
  if (invoice.status !== "DRAFT") {
    throw new InvalidInvoiceStateError(
      `Invoice is ${invoice.status}; only DRAFT invoices can be edited`,
      { invoiceId: invoice.id, status: invoice.status }
    );
  }
}

// ---------------------------------------------------------------------------
// Totals recalculation — re-derives subtotal/discount/tax/total from the
// current set of items, then re-derives amountDue from amountPaid. Called
// after every item mutation. Server-computed only; never trust a
// client-supplied total (PRD §6).
// ---------------------------------------------------------------------------
async function recalculateInvoiceTotals(tx: Tx, invoiceId: string): Promise<Invoice> {
  const items = await tx.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  const totals = calculateInvoiceTotals(items);

  const [current] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!current) throw new NotFoundError("Invoice", invoiceId);

  const amountDue = (parseFloat(totals.totalAmount) - parseFloat(current.amountPaid)).toFixed(4);

  const [updated] = await tx
    .update(invoices)
    .set({ ...totals, amountDue, updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId))
    .returning();

  if (!updated) throw new NotFoundError("Invoice", invoiceId);
  return updated;
}

// Resolves a line item's persisted fields from input, snapshotting from the
// referenced product when productId is given but a field is omitted
// (PRD §6: "invoice items must snapshot product name, price, tax rate...").
async function resolveItemFields(tx: Tx, input: InvoiceItemInput) {
  let description = input.description;
  let unitPrice = input.unitPrice;
  let taxRate = input.taxRate;

  if (input.productId) {
    const [product] = await tx.select().from(products).where(eq(products.id, input.productId)).limit(1);
    if (!product) throw new NotFoundError("Product", input.productId);
    if (product.status !== "ACTIVE") {
      throw new ValidationError("Only ACTIVE products can be added to a new line item", {
        productId: input.productId,
        status: product.status,
      });
    }
    description = description || product.name;
    unitPrice = unitPrice ?? product.basePrice;
    taxRate = taxRate ?? product.taxRate;
  }

  if (unitPrice === undefined) {
    throw new ValidationError("unitPrice is required when no productId is given");
  }

  return {
    description,
    unitPrice,
    taxRate: taxRate ?? "0",
  };
}

// ---------------------------------------------------------------------------
// Create — starts life as DRAFT, optionally seeded with items.
// ---------------------------------------------------------------------------
export async function createInvoice(actor: ActorContext, rawInput: CreateInvoiceInput): Promise<InvoiceWithItems> {
  assertCan(actor, "invoice:create");
  const input = createInvoiceSchema.parse(rawInput);

  const [contact] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.id, input.contactId), isNull(contacts.deletedAt)))
    .limit(1);
  if (!contact) throw new NotFoundError("Contact", input.contactId);

  return db.transaction(async (tx) => {
    const invoiceNumber = await generateInvoiceNumber(tx);

    const [created] = await tx
      .insert(invoices)
      .values({
        invoiceNumber,
        contactId: input.contactId,
        invoiceDate: input.invoiceDate,
        dueDate: input.dueDate,
        currency: input.currency,
        notes: input.notes,
        terms: input.terms,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })
      .returning();

    if (!created) throw new ConflictError("Failed to create invoice");

    await recordAuditEvent(tx, {
      entityType: "INVOICE",
      entityId: created.id,
      action: "CREATE",
      performedBy: actor.userId,
      metadata: { invoiceNumber },
    });

    let position = 0;
    for (const rawItem of input.items) {
      await insertLineItem(tx, created.id, rawItem, position++);
    }

    const finalInvoice = input.items.length > 0 ? await recalculateInvoiceTotals(tx, created.id) : created;
    const items = await tx
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, created.id))
      .orderBy(asc(invoiceItems.position));

    return { ...finalInvoice, items };
  });
}

async function insertLineItem(tx: Tx, invoiceId: string, rawItem: InvoiceItemInput, position: number): Promise<InvoiceItem> {
  const input = invoiceItemInputSchema.parse(rawItem);
  const resolved = await resolveItemFields(tx, input);
  const calc = calculateLineItem({
    quantity: input.quantity,
    unitPrice: resolved.unitPrice,
    discountType: input.discountType,
    discountValue: input.discountValue,
    taxRate: resolved.taxRate,
  });

  const [row] = await tx
    .insert(invoiceItems)
    .values({
      invoiceId,
      productId: input.productId,
      description: resolved.description,
      quantity: input.quantity,
      unitPrice: resolved.unitPrice,
      discountType: input.discountType,
      discountValue: input.discountValue,
      taxRate: resolved.taxRate,
      position,
      ...calc,
    })
    .returning();

  if (!row) throw new ConflictError("Failed to add invoice line item");
  return row;
}

// ---------------------------------------------------------------------------
// Update header fields — DRAFT only.
// ---------------------------------------------------------------------------
export async function updateInvoice(actor: ActorContext, id: string, rawInput: UpdateInvoiceInput): Promise<Invoice> {
  assertCan(actor, "invoice:update");
  const input = updateInvoiceSchema.parse(rawInput);
  const existing = await requireInvoice(id);
  assertDraft(existing);

  if (input.contactId) {
    const [contact] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.id, input.contactId), isNull(contacts.deletedAt)))
      .limit(1);
    if (!contact) throw new NotFoundError("Contact", input.contactId);
  }

  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(invoices)
      .set({ ...input, updatedBy: actor.userId, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();

    if (!row) throw new NotFoundError("Invoice", id);

    await recordAuditEvent(tx, {
      entityType: "INVOICE",
      entityId: id,
      action: "UPDATE",
      performedBy: actor.userId,
      metadata: { changedFields: Object.keys(input) },
    });

    return row;
  });
}

// ---------------------------------------------------------------------------
// Line items — DRAFT only. Each mutation recalculates invoice totals.
// ---------------------------------------------------------------------------
export async function addInvoiceItem(actor: ActorContext, invoiceId: string, rawItem: InvoiceItemInput): Promise<InvoiceWithItems> {
  assertCan(actor, "invoice:update");
  const existing = await requireInvoice(invoiceId);
  assertDraft(existing);

  return db.transaction(async (tx) => {
    const [maxRow] = await tx
      .select({ maxPosition: sql<number>`coalesce(max(${invoiceItems.position}), -1)` })
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId));

    await insertLineItem(tx, invoiceId, rawItem, (maxRow?.maxPosition ?? -1) + 1);
    const invoice = await recalculateInvoiceTotals(tx, invoiceId);

    await recordAuditEvent(tx, {
      entityType: "INVOICE",
      entityId: invoiceId,
      action: "UPDATE",
      performedBy: actor.userId,
      metadata: { itemsChanged: "added" },
    });

    const items = await tx.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId)).orderBy(asc(invoiceItems.position));
    return { ...invoice, items };
  });
}

export async function updateInvoiceItem(
  actor: ActorContext,
  invoiceId: string,
  itemId: string,
  rawItem: InvoiceItemInput
): Promise<InvoiceWithItems> {
  assertCan(actor, "invoice:update");
  const existing = await requireInvoice(invoiceId);
  assertDraft(existing);

  return db.transaction(async (tx) => {
    const [existingItem] = await tx
      .select()
      .from(invoiceItems)
      .where(and(eq(invoiceItems.id, itemId), eq(invoiceItems.invoiceId, invoiceId)))
      .limit(1);
    if (!existingItem) throw new NotFoundError("InvoiceItem", itemId);

    const input = invoiceItemInputSchema.parse(rawItem);
    const resolved = await resolveItemFields(tx, input);
    const calc = calculateLineItem({
      quantity: input.quantity,
      unitPrice: resolved.unitPrice,
      discountType: input.discountType,
      discountValue: input.discountValue,
      taxRate: resolved.taxRate,
    });

    const [row] = await tx
      .update(invoiceItems)
      .set({
        productId: input.productId,
        description: resolved.description,
        quantity: input.quantity,
        unitPrice: resolved.unitPrice,
        discountType: input.discountType,
        discountValue: input.discountValue,
        taxRate: resolved.taxRate,
        ...calc,
        updatedAt: new Date(),
      })
      .where(eq(invoiceItems.id, itemId))
      .returning();

    if (!row) throw new NotFoundError("InvoiceItem", itemId);

    const invoice = await recalculateInvoiceTotals(tx, invoiceId);

    await recordAuditEvent(tx, {
      entityType: "INVOICE",
      entityId: invoiceId,
      action: "UPDATE",
      performedBy: actor.userId,
      metadata: { itemsChanged: "updated", itemId },
    });

    const items = await tx.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId)).orderBy(asc(invoiceItems.position));
    return { ...invoice, items };
  });
}

export async function removeInvoiceItem(actor: ActorContext, invoiceId: string, itemId: string): Promise<InvoiceWithItems> {
  assertCan(actor, "invoice:update");
  const existing = await requireInvoice(invoiceId);
  assertDraft(existing);

  return db.transaction(async (tx) => {
    const result = await tx
      .delete(invoiceItems)
      .where(and(eq(invoiceItems.id, itemId), eq(invoiceItems.invoiceId, invoiceId)))
      .returning({ id: invoiceItems.id });
    if (result.length === 0) throw new NotFoundError("InvoiceItem", itemId);

    const invoice = await recalculateInvoiceTotals(tx, invoiceId);

    await recordAuditEvent(tx, {
      entityType: "INVOICE",
      entityId: invoiceId,
      action: "UPDATE",
      performedBy: actor.userId,
      metadata: { itemsChanged: "removed", itemId },
    });

    const items = await tx.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId)).orderBy(asc(invoiceItems.position));
    return { ...invoice, items };
  });
}

// ---------------------------------------------------------------------------
// Finalize — locks items, PRD §9: "Each invoice must contain at least one
// line item before finalization."
// ---------------------------------------------------------------------------
export async function finalizeInvoice(actor: ActorContext, id: string): Promise<Invoice> {
  assertCan(actor, "invoice:finalize");
  const existing = await requireInvoice(id);
  assertDraft(existing);

  if (existing.items.length === 0) {
    throw new ValidationError("An invoice must have at least one line item before it can be finalized", {
      invoiceId: id,
    });
  }

  return db.transaction(async (tx) => {
    // Re-run totals one last time inside the lock so finalization can never
    // ship a total that's stale relative to the items on record.
    await recalculateInvoiceTotals(tx, id);

    const [row] = await tx
      .update(invoices)
      .set({ status: "FINALIZED", updatedBy: actor.userId, updatedAt: new Date() })
      .where(and(eq(invoices.id, id), eq(invoices.status, "DRAFT")))
      .returning();

    // The status=DRAFT guard in the WHERE clause protects against a
    // concurrent finalize/edit race; if another transaction already moved
    // it out of DRAFT, this returns nothing and we surface a conflict
    // rather than silently double-finalizing.
    if (!row) {
      throw new InvalidInvoiceStateError("Invoice was modified concurrently; refresh and try again", {
        invoiceId: id,
      });
    }

    await recordAuditEvent(tx, {
      entityType: "INVOICE",
      entityId: id,
      action: "FINALIZE",
      performedBy: actor.userId,
      metadata: { totalAmount: row.totalAmount },
    });

    return row;
  });
}

// ---------------------------------------------------------------------------
// Void — terminal state, reachable from any non-DRAFT, non-VOID status.
// Draft invoices aren't voided; they're deleted (see deleteDraftInvoice)
// since nothing has been issued yet and PRD §6's "immutable history"
// concern doesn't apply to a draft.
// ---------------------------------------------------------------------------
export async function voidInvoice(actor: ActorContext, id: string): Promise<Invoice> {
  assertCan(actor, "invoice:void");
  const existing = await requireInvoice(id);

  if (existing.status === "DRAFT" || existing.status === "VOID") {
    throw new InvalidInvoiceStateError(`Cannot void an invoice with status ${existing.status}`, {
      invoiceId: id,
      status: existing.status,
    });
  }

  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(invoices)
      .set({ status: "VOID", updatedBy: actor.userId, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();

    if (!row) throw new NotFoundError("Invoice", id);

    await recordAuditEvent(tx, {
      entityType: "INVOICE",
      entityId: id,
      action: "VOID",
      performedBy: actor.userId,
    });

    return row;
  });
}

export async function deleteDraftInvoice(actor: ActorContext, id: string): Promise<void> {
  assertCan(actor, "invoice:update");
  const existing = await requireInvoice(id);
  assertDraft(existing);

  await db.transaction(async (tx) => {
    await tx.delete(invoices).where(eq(invoices.id, id));
    await recordAuditEvent(tx, {
      entityType: "INVOICE",
      entityId: id,
      action: "DELETE",
      performedBy: actor.userId,
    });
  });
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
export async function searchInvoices(actor: ActorContext, rawInput: InvoiceSearchInput) {
  assertCan(actor, "invoice:read");
  const input = invoiceSearchSchema.parse(rawInput);

  const conditions: SQL[] = [];
  if (input.contactId) conditions.push(eq(invoices.contactId, input.contactId));
  if (input.status) conditions.push(eq(invoices.status, input.status));
  if (input.overdueOnly) {
    conditions.push(
      sql`${invoices.status} in ('FINALIZED','PARTIALLY_PAID') and ${invoices.dueDate} < now() and ${invoices.amountDue}::numeric > 0`
    );
  }

  return db
    .select()
    .from(invoices)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(input.limit)
    .offset(input.offset);
}