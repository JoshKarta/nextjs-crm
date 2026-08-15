import { and, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  products,
  productCategories,
  type Product,
  type ProductCategory,
} from "@/db/schema";
import { recordAuditEvent, type Tx } from "@/utils/validation/audit";
import { assertCan, type ActorContext } from "@/utils/authz";
import { ConflictError, DuplicateSkuError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  categoryInputSchema,
  productInputSchema,
  productSearchSchema,
  productUpdateSchema,
  type CategoryInput,
  type ProductInput,
  type ProductSearchInput,
  type ProductUpdateInput,
} from "@/utils/validation/product";

// ---------------------------------------------------------------------------
// Categories — v1 caps depth at one level (PRD §8): a category that already
// has a parent cannot become a parent itself.
// ---------------------------------------------------------------------------
export async function createCategory(actor: ActorContext, rawInput: CategoryInput): Promise<ProductCategory> {
  assertCan(actor, "product:create");
  const input = categoryInputSchema.parse(rawInput);

  if (input.parentCategoryId) {
    const [parent] = await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.id, input.parentCategoryId))
      .limit(1);

    if (!parent) throw new NotFoundError("ProductCategory", input.parentCategoryId);
    if (parent.parentCategoryId) {
      throw new ValidationError("Categories may only be nested one level deep in v1", {
        parentCategoryId: input.parentCategoryId,
      });
    }
  }

  const [row] = await db.insert(productCategories).values(input).returning();
  if (!row) throw new ConflictError("Failed to create category");
  return row;
}

export async function updateCategory(
  actor: ActorContext,
  id: string,
  rawInput: Partial<CategoryInput>
): Promise<ProductCategory> {
  assertCan(actor, "product:update");
  const input = categoryInputSchema.partial().parse(rawInput);

  const [row] = await db
    .update(productCategories)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(productCategories.id, id))
    .returning();

  if (!row) throw new NotFoundError("ProductCategory", id);
  return row;
}

export async function listCategories(actor: ActorContext): Promise<ProductCategory[]> {
  assertCan(actor, "product:read");
  return db.select().from(productCategories).orderBy(productCategories.name);
}

// ---------------------------------------------------------------------------
// SKU uniqueness — this one BLOCKS (unlike contact duplicate detection,
// which only warns). PRD §8/§11 requires it be enforced.
// ---------------------------------------------------------------------------
async function assertSkuAvailable(sku: string, excludeProductId?: string): Promise<void> {
  const conditions: SQL[] = [eq(products.sku, sku), isNull(products.deletedAt)];
  if (excludeProductId) conditions.push(sql`${products.id} != ${excludeProductId}`);

  const [existing] = await db.select({ id: products.id }).from(products).where(and(...conditions)).limit(1);
  if (existing) throw new DuplicateSkuError(sku);
}

export function generateSku(name: string, type: "PRODUCT" | "SERVICE"): string {
  const prefix = type === "SERVICE" ? "SRV" : "PRD";
  const slug = name
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 4)
    .toUpperCase() || "ITEM";
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${slug}-${randomSuffix}`;
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
export async function createProduct(actor: ActorContext, rawInput: ProductInput): Promise<Product> {
  assertCan(actor, "product:create");
  const input = productInputSchema.parse(rawInput);

  const sku = input.sku && input.sku.trim() !== ""
    ? input.sku.trim()
    : generateSku(input.name, input.type);

  if (input.categoryId) {
    const [category] = await db
      .select({ id: productCategories.id })
      .from(productCategories)
      .where(eq(productCategories.id, input.categoryId))
      .limit(1);
    if (!category) throw new NotFoundError("ProductCategory", input.categoryId);
  }

  await assertSkuAvailable(sku);

  return db.transaction(async (tx) => {
    await assertSkuAvailableTx(tx as unknown as Tx, sku);

    const [created] = await tx
      .insert(products)
      .values({
        name: input.name,
        description: input.description,
        sku: sku,
        type: input.type,
        defaultUnit: input.defaultUnit,
        basePrice: input.basePrice,
        currency: input.currency,
        taxRate: input.taxRate,
        categoryId: input.categoryId,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })
      .returning();

    if (!created) throw new ConflictError("Failed to create product");

    await recordAuditEvent(tx as unknown as Tx, {
      entityType: "PRODUCT",
      entityId: created.id,
      action: "CREATE",
      performedBy: actor.userId,
      metadata: { sku: created.sku, type: created.type },
    });

    return created;
  });
}

// Re-checks SKU availability inside the write transaction to close the race
// window between the pre-check above and the insert (belt-and-suspenders on
// top of the partial unique index, which is the actual guarantee).
async function assertSkuAvailableTx(tx: Tx, sku: string, excludeProductId?: string): Promise<void> {
  const conditions: SQL[] = [eq(products.sku, sku), isNull(products.deletedAt)];
  if (excludeProductId) conditions.push(sql`${products.id} != ${excludeProductId}`);
  const [existing] = await tx.select({ id: products.id }).from(products).where(and(...conditions)).limit(1);
  if (existing) throw new DuplicateSkuError(sku);
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------
export async function getProductById(id: string, opts: { includeArchived?: boolean } = {}): Promise<Product | null> {
  const [result] = await db
    .select()
    .from(products)
    .where(opts.includeArchived ? eq(products.id, id) : and(eq(products.id, id), isNull(products.deletedAt)))
    .limit(1);
  return result ?? null;
}

async function requireProduct(id: string, opts: { includeArchived?: boolean } = {}): Promise<Product> {
  const product = await getProductById(id, opts);
  if (!product) throw new NotFoundError("Product", id);
  return product;
}

// ---------------------------------------------------------------------------
// Update — price/tax changes get their own audit action (PRD §12); products
// referenced by existing invoice line items are never mutated retroactively
// because those items snapshot name/price/tax at invoice time (PRD §9).
// Editing a product here only affects future invoices.
// ---------------------------------------------------------------------------
export async function updateProduct(
  actor: ActorContext,
  id: string,
  rawInput: ProductUpdateInput
): Promise<Product> {
  assertCan(actor, "product:update");
  const input = productUpdateSchema.parse(rawInput);
  const existing = await requireProduct(id);

  if (input.sku && input.sku !== existing.sku) {
    await assertSkuAvailable(input.sku, id);
  }

  if (input.categoryId) {
    const [category] = await db
      .select({ id: productCategories.id })
      .from(productCategories)
      .where(eq(productCategories.id, input.categoryId))
      .limit(1);
    if (!category) throw new NotFoundError("ProductCategory", input.categoryId);
  }

  const priceChanged = input.basePrice !== undefined && input.basePrice !== existing.basePrice;
  const taxChanged = input.taxRate !== undefined && input.taxRate !== existing.taxRate;

  return db.transaction(async (tx) => {
    if (input.sku && input.sku !== existing.sku) {
      await assertSkuAvailableTx(tx as unknown as Tx, input.sku, id);
    }

    const [row] = await tx
      .update(products)
      .set({ ...input, updatedBy: actor.userId, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    if (!row) throw new NotFoundError("Product", id);

    const nonPriceFields = Object.keys(input).filter((k) => k !== "basePrice" && k !== "taxRate");
    if (nonPriceFields.length > 0) {
      await recordAuditEvent(tx as unknown as Tx, {
        entityType: "PRODUCT",
        entityId: id,
        action: "UPDATE",
        performedBy: actor.userId,
        metadata: { changedFields: nonPriceFields },
      });
    }

    if (priceChanged || taxChanged) {
      await recordAuditEvent(tx as unknown as Tx, {
        entityType: "PRODUCT",
        entityId: id,
        action: "PRICE_CHANGE",
        performedBy: actor.userId,
        metadata: {
          ...(priceChanged ? { basePrice: { from: existing.basePrice, to: row.basePrice } } : {}),
          ...(taxChanged ? { taxRate: { from: existing.taxRate, to: row.taxRate } } : {}),
        },
      });
    }

    return row;
  });
}

// ---------------------------------------------------------------------------
// Archive / Restore
// ---------------------------------------------------------------------------
export async function archiveProduct(actor: ActorContext, id: string): Promise<Product> {
  assertCan(actor, "product:archive");
  await requireProduct(id);

  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(products)
      .set({ status: "ARCHIVED", deletedAt: new Date(), updatedBy: actor.userId, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    if (!row) throw new NotFoundError("Product", id);

    await recordAuditEvent(tx as unknown as Tx, {
      entityType: "PRODUCT",
      entityId: id,
      action: "ARCHIVE",
      performedBy: actor.userId,
    });

    return row;
  });
}

export async function restoreProduct(actor: ActorContext, id: string): Promise<Product> {
  assertCan(actor, "product:restore");
  const existing = await requireProduct(id, { includeArchived: true });

  // Restoring re-opens the SKU slot for uniqueness purposes — make sure
  // nothing else claimed this SKU while the product was archived.
  await assertSkuAvailable(existing.sku, id);

  return db.transaction(async (tx) => {
    await assertSkuAvailableTx(tx as unknown as Tx, existing.sku, id);

    const [row] = await tx
      .update(products)
      .set({ status: "ACTIVE", deletedAt: null, updatedBy: actor.userId, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    if (!row) throw new NotFoundError("Product", id);

    await recordAuditEvent(tx as unknown as Tx, {
      entityType: "PRODUCT",
      entityId: id,
      action: "RESTORE",
      performedBy: actor.userId,
    });

    return row;
  });
}

// ---------------------------------------------------------------------------
// Search — selectableOnly=true (the default) restricts to ACTIVE products,
// matching "only active products should be selectable by default for new
// invoices" (PRD §8).
// ---------------------------------------------------------------------------
export async function searchProducts(actor: ActorContext, rawInput: ProductSearchInput) {
  assertCan(actor, "product:read");
  const input = productSearchSchema.parse(rawInput);

  const conditions: SQL[] = [isNull(products.deletedAt)];

  if (input.selectableOnly) {
    conditions.push(eq(products.status, "ACTIVE"));
  } else if (input.status) {
    conditions.push(eq(products.status, input.status));
  }

  if (input.type) conditions.push(eq(products.type, input.type));
  if (input.categoryId) conditions.push(eq(products.categoryId, input.categoryId));

  if (input.query) {
    const pattern = `%${input.query}%`;
    conditions.push(or(ilike(products.name, pattern), ilike(products.sku, pattern))!);
  }

  return db
    .select()
    .from(products)
    .where(and(...conditions))
    .limit(input.limit)
    .offset(input.offset);
}