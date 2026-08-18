import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { invoiceTemplates, type InvoiceTemplateLayout, type InvoiceTemplateRow } from "@/db/schema";
import { recordAuditEvent, type Tx } from "@/utils/validation/audit";
import { assertCan, type ActorContext } from "@/utils/authz";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------
export async function getInvoiceTemplates(actor: ActorContext): Promise<InvoiceTemplateRow[]> {
  assertCan(actor, "invoice_template:read");
  return db.select().from(invoiceTemplates).orderBy(invoiceTemplates.createdAt);
}

export async function getInvoiceTemplateById(actor: ActorContext, id: string): Promise<InvoiceTemplateRow | null> {
  assertCan(actor, "invoice_template:read");
  const [row] = await db.select().from(invoiceTemplates).where(eq(invoiceTemplates.id, id)).limit(1);
  return row ?? null;
}

export async function getDefaultInvoiceTemplate(actor: ActorContext): Promise<InvoiceTemplateRow | null> {
  assertCan(actor, "invoice_template:read");
  const [row] = await db
    .select()
    .from(invoiceTemplates)
    .where(eq(invoiceTemplates.isDefault, true))
    .limit(1);
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
export interface CreateInvoiceTemplateInput {
  name: string;
  layout: InvoiceTemplateLayout;
  isDefault?: boolean;
}

export async function createInvoiceTemplate(
  actor: ActorContext,
  input: CreateInvoiceTemplateInput
): Promise<InvoiceTemplateRow> {
  assertCan(actor, "invoice_template:manage");

  if (!input.name?.trim()) throw new ValidationError("Template name is required");
  if (!input.layout?.blocks || !Array.isArray(input.layout.blocks)) {
    throw new ValidationError("Template layout must include a blocks array");
  }

  return db.transaction(async (tx) => {
    // If this template is being set as default, clear any existing default
    if (input.isDefault) {
      await tx
        .update(invoiceTemplates)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(invoiceTemplates.isDefault, true));
    }

    const [created] = await tx
      .insert(invoiceTemplates)
      .values({
        name: input.name.trim(),
        layout: input.layout,
        isDefault: input.isDefault ?? false,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })
      .returning();

    if (!created) throw new ConflictError("Failed to create invoice template");
    return created;
  });
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
export interface UpdateInvoiceTemplateInput {
  name?: string;
  layout?: InvoiceTemplateLayout;
  isDefault?: boolean;
}

export async function updateInvoiceTemplate(
  actor: ActorContext,
  id: string,
  input: UpdateInvoiceTemplateInput
): Promise<InvoiceTemplateRow> {
  assertCan(actor, "invoice_template:manage");

  const existing = await getInvoiceTemplateById(actor, id);
  if (!existing) throw new NotFoundError("InvoiceTemplate", id);

  return db.transaction(async (tx) => {
    if (input.isDefault) {
      await tx
        .update(invoiceTemplates)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(invoiceTemplates.isDefault, true));
    }

    const updates: Record<string, unknown> = { updatedBy: actor.userId, updatedAt: new Date() };
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.layout !== undefined) updates.layout = input.layout;
    if (input.isDefault !== undefined) updates.isDefault = input.isDefault;

    const [row] = await tx
      .update(invoiceTemplates)
      .set(updates)
      .where(eq(invoiceTemplates.id, id))
      .returning();

    if (!row) throw new NotFoundError("InvoiceTemplate", id);
    return row;
  });
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------
export async function deleteInvoiceTemplate(actor: ActorContext, id: string): Promise<void> {
  assertCan(actor, "invoice_template:manage");

  const existing = await getInvoiceTemplateById(actor, id);
  if (!existing) throw new NotFoundError("InvoiceTemplate", id);
  if (existing.isDefault) {
    throw new ValidationError("Cannot delete the default template. Set another template as default first.");
  }

  await db.delete(invoiceTemplates).where(eq(invoiceTemplates.id, id));
}

// ---------------------------------------------------------------------------
// Set Default
// ---------------------------------------------------------------------------
export async function setDefaultInvoiceTemplate(actor: ActorContext, id: string): Promise<InvoiceTemplateRow> {
  assertCan(actor, "invoice_template:manage");

  const existing = await getInvoiceTemplateById(actor, id);
  if (!existing) throw new NotFoundError("InvoiceTemplate", id);

  return db.transaction(async (tx) => {
    await tx
      .update(invoiceTemplates)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(invoiceTemplates.isDefault, true));

    const [row] = await tx
      .update(invoiceTemplates)
      .set({ isDefault: true, updatedBy: actor.userId, updatedAt: new Date() })
      .where(eq(invoiceTemplates.id, id))
      .returning();

    if (!row) throw new NotFoundError("InvoiceTemplate", id);
    return row;
  });
}
