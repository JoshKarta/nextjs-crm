import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  pgEnum,
  uniqueIndex,
  index,
  primaryKey,
  type AnyPgColumn,
  jsonb,
  numeric,
  pgSequence,
  check,
  integer,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// NOTE: this table is NOT part of the original PRD (which explicitly defers
// "invoice PDF generation" and any visual layout concerns to a future
// phase — see PRD §17). It exists because the drag-and-drop template
// builder needs somewhere to persist what a person designs. Treat it as an
// intentional, flagged scope addition rather than something implied by the
// PRD text.
//
// `layout` stores the block tree the builder produces: block type,
// position, size, and per-block config (e.g. which invoice fields a "Line
// Items Table" block binds to). It is intentionally schemaless (jsonb)
// because the block shape will keep evolving with the builder UI — forcing
// it into relational columns now would mean a migration on every new block
// type.
export const invoiceTemplates = pgTable(
  "invoice_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    layout: jsonb("layout").notNull().$type<InvoiceTemplateLayout>(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id),
  },
  (table) => [
    uniqueIndex("invoice_templates_name_idx").on(table.name),
    // Only one default template at a time.
    uniqueIndex("invoice_templates_single_default_idx").on(table.isDefault).where(sql`${table.isDefault} = true`),
    index("invoice_templates_created_at_idx").on(table.createdAt),
  ]
);

// Kept close to the schema (rather than only in the frontend) since the
// server validates incoming layouts against this shape too.
export interface InvoiceTemplateBlock {
  id: string;
  type:
    | "logo"
    | "company_info"
    | "bill_to"
    | "invoice_meta"
    | "line_items_table"
    | "totals"
    | "notes"
    | "terms"
    | "text";
  x: number;
  y: number;
  width: number;
  height: number;
  config?: Record<string, unknown>;
}

export interface InvoiceTemplateLayout {
  pageSize: "LETTER" | "A4";
  blocks: InvoiceTemplateBlock[];
}

export type InvoiceTemplateRow = typeof invoiceTemplates.$inferSelect;
export type NewInvoiceTemplateRow = typeof invoiceTemplates.$inferInsert;

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "DRAFT",
  "FINALIZED",
  "PARTIALLY_PAID",
  "PAID",
  "VOID",
  // OVERDUE is intentionally NOT stored here — PRD §9 calls it out as
  // "calculated dynamically". A finalized invoice past its dueDate with
  // amountDue > 0 is overdue; deriving it at read time avoids a background
  // job that has to re-scan every invoice nightly and avoids the stored
  // status silently drifting from the actual due date.
]);

export const discountTypeEnum = pgEnum("discount_type", ["FIXED", "PERCENTAGE"]);

// Backs concurrency-safe invoice numbering (PRD §9: "unique and generated in
// a concurrency-safe manner"). Postgres sequences are atomic under
// concurrent access without any application-level locking; gaps from rolled
// back transactions are acceptable (uniqueness and monotonicity are the
// actual requirements, not gap-free numbering).
export const invoiceNumberSeq = pgSequence("invoice_number_seq", {
  startWith: 1,
  increment: 1,
  minValue: 1,
});

// ---------------------------------------------------------------------------
// invoices
// ---------------------------------------------------------------------------
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Human-facing number, e.g. "INV-000123". Generated from
    // invoiceNumberSeq in the service layer — see generateInvoiceNumber().
    invoiceNumber: text("invoice_number").notNull(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "restrict" }),
    status: invoiceStatusEnum("status").notNull().default("DRAFT"),
    invoiceDate: timestamp("invoice_date", { withTimezone: true }).notNull().defaultNow(),
    dueDate: timestamp("due_date", { withTimezone: true }),
    currency: text("currency").notNull(),
    notes: text("notes"),
    terms: text("terms"),

    // All financial totals: NUMERIC only (PRD §6/§8), never float.
    // Server-computed and re-derived on every mutating operation — never
    // trust a client-supplied total (PRD §6).
    subtotalAmount: numeric("subtotal_amount", { precision: 14, scale: 4 }).notNull().default("0"),
    discountAmount: numeric("discount_amount", { precision: 14, scale: 4 }).notNull().default("0"),
    taxAmount: numeric("tax_amount", { precision: 14, scale: 4 }).notNull().default("0"),
    totalAmount: numeric("total_amount", { precision: 14, scale: 4 }).notNull().default("0"),
    amountPaid: numeric("amount_paid", { precision: 14, scale: 4 }).notNull().default("0"),
    amountDue: numeric("amount_due", { precision: 14, scale: 4 }).notNull().default("0"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id),
  },
  (table) => [
    uniqueIndex("invoices_invoice_number_idx").on(table.invoiceNumber),
    index("invoices_contact_id_idx").on(table.contactId),
    index("invoices_status_idx").on(table.status),
    index("invoices_invoice_date_idx").on(table.invoiceDate),
    index("invoices_due_date_idx").on(table.dueDate),
    check(
      "invoices_amounts_non_negative",
      sql`${table.subtotalAmount} >= 0 AND ${table.discountAmount} >= 0 AND ${table.taxAmount} >= 0 AND ${table.totalAmount} >= 0 AND ${table.amountPaid} >= 0 AND ${table.amountDue} >= 0`
    ),
  ]
);

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  contact: one(contacts, { fields: [invoices.contactId], references: [contacts.id] }),
  items: many(invoiceItems),
}));

// ---------------------------------------------------------------------------
// invoice_items
//
// Snapshot semantics (PRD §6/§9): once finalized, an invoice's items must
// stay reproducible even if the referenced product's name/price/tax later
// change. That's why description/unitPrice/taxRate live directly on the
// item instead of being joined from `products` at read time — productId is
// only a soft reference for traceability, not the source of truth after
// finalization.
// ---------------------------------------------------------------------------
export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    // Nullable: custom line items aren't tied to the product catalog.
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),

    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 14, scale: 4 }).notNull(),

    discountType: discountTypeEnum("discount_type"),
    discountValue: numeric("discount_value", { precision: 14, scale: 4 }),
    discountAmount: numeric("discount_amount", { precision: 14, scale: 4 }).notNull().default("0"),

    taxRate: numeric("tax_rate", { precision: 6, scale: 4 }).notNull().default("0"),
    taxAmount: numeric("tax_amount", { precision: 14, scale: 4 }).notNull().default("0"),

    subtotalAmount: numeric("subtotal_amount", { precision: 14, scale: 4 }).notNull(),
    totalAmount: numeric("total_amount", { precision: 14, scale: 4 }).notNull(),

    // Explicit ordering for display/PDF rendering — insertion order alone
    // isn't reliable once items are edited/reordered on a draft.
    position: integer("position").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("invoice_items_invoice_id_idx").on(table.invoiceId),
    index("invoice_items_product_id_idx").on(table.productId),
    index("invoice_items_position_idx").on(table.invoiceId, table.position),
    check("invoice_items_quantity_positive", sql`${table.quantity} > 0`),
    check("invoice_items_amounts_non_negative", sql`${table.subtotalAmount} >= 0 AND ${table.totalAmount} >= 0 AND ${table.taxAmount} >= 0 AND ${table.discountAmount} >= 0`),
  ]
);

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
  product: one(products, { fields: [invoiceItems.productId], references: [products.id] }),
}));

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type NewInvoiceItem = typeof invoiceItems.$inferInsert;

export const productTypeEnum = pgEnum("product_type", ["PRODUCT", "SERVICE"]);
export const productStatusEnum = pgEnum("product_status", ["ACTIVE", "INACTIVE", "ARCHIVED"]);

// ---------------------------------------------------------------------------
// product_categories
//
// v1 enforces a single level (a category with a parent cannot itself have
// children — validated in the service layer, not the DB, since a CHECK
// constraint can't see sibling rows). The self-referencing FK is kept in the
// schema now specifically so a future move to arbitrary nesting doesn't
// require a migration, per PRD §8 ("schema should not prevent future
// nesting").
// ---------------------------------------------------------------------------
export const productCategories = pgTable(
  "product_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    parentCategoryId: uuid("parent_category_id").references(
      (): AnyPgColumn => productCategories.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("product_categories_name_idx").on(table.name),
    index("product_categories_parent_id_idx").on(table.parentCategoryId),
  ]
);

export const productCategoriesRelations = relations(productCategories, ({ one, many }) => ({
  parent: one(productCategories, {
    fields: [productCategories.parentCategoryId],
    references: [productCategories.id],
    relationName: "category_children",
  }),
  children: many(productCategories, { relationName: "category_children" }),
  products: many(products),
}));

// ---------------------------------------------------------------------------
// products
//
// Money: NUMERIC, never float (PRD §8). basePrice uses precision(14,4) to
// comfortably hold typical currency amounts with sub-cent rounding headroom
// for tax/discount math done in the invoice phase. taxRate is stored as a
// fraction (0.2000 = 20%), not a whole-number percentage — pick one
// convention and keep invoices consistent with it.
// ---------------------------------------------------------------------------
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    sku: text("sku").notNull(),
    type: productTypeEnum("type").notNull(),
    status: productStatusEnum("status").notNull().default("ACTIVE"),
    defaultUnit: text("default_unit"),
    basePrice: numeric("base_price", { precision: 14, scale: 4 }).notNull(),
    currency: text("currency").notNull(),
    taxRate: numeric("tax_rate", { precision: 6, scale: 4 }).notNull().default("0"),
    categoryId: uuid("category_id").references(() => productCategories.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id),

    // Soft delete, mirrored by status = ARCHIVED (same pattern as contacts).
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    // SKU uniqueness enforced at the DB level, scoped to non-deleted
    // products so an archived SKU can be reissued later (PRD §8/§11).
    uniqueIndex("products_sku_active_idx").on(table.sku).where(sql`${table.deletedAt} is null`),
    index("products_status_idx").on(table.status),
    index("products_category_id_idx").on(table.categoryId),
    index("products_name_idx").on(table.name),
    index("products_deleted_at_idx").on(table.deletedAt),
  ]
);

export const productsRelations = relations(products, ({ one }) => ({
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
}));

export type ProductCategory = typeof productCategories.$inferSelect;
export type NewProductCategory = typeof productCategories.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

// Kept intentionally generic so every future module (products, invoices,
// payments) reuses this one table instead of growing its own audit table.
export const auditEntityTypeEnum = pgEnum("audit_entity_type", [
  "CONTACT",
  "CONTACT_ADDRESS",
  "CONTACT_NOTE",
  "PRODUCT",
  "PRODUCT_CATEGORY",
  "INVOICE",
  "PAYMENT",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "CREATE",
  "UPDATE",
  "ARCHIVE",
  "RESTORE",
  "DELETE",
  "FINALIZE",
  "VOID",
    // Distinct from UPDATE per PRD §12: product price/tax changes must be
  // individually auditable, not folded into a generic "something changed".
  "PRICE_CHANGE",
]);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: auditEntityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    action: auditActionEnum("action").notNull(),
    performedBy: text("performed_by")
      .notNull()
      .references(() => user.id),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
    // Small, non-sensitive diff/context only (e.g. { "status": ["ACTIVE","ARCHIVED"] }).
    // Never store full snapshots of PII here.
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  },
  (table) => [
    index("audit_events_entity_idx").on(table.entityType, table.entityId),
    index("audit_events_performed_by_idx").on(table.performedBy),
    index("audit_events_timestamp_idx").on(table.timestamp),
  ]
);

export type AuditEvent = typeof auditEvents.$inferSelect;
export type NewAuditEvent = typeof auditEvents.$inferInsert;

export const contactTypeEnum = pgEnum("contact_type", [
  "INDIVIDUAL",
  "COMPANY",
]);
export const contactStatusEnum = pgEnum("contact_status", [
  "ACTIVE",
  "ARCHIVED",
]);
export const addressTypeEnum = pgEnum("address_type", [
  "BILLING",
  "SHIPPING",
  "OFFICE",
  "HOME",
  "OTHER",
]);

// ---------------------------------------------------------------------------
// contacts
// ---------------------------------------------------------------------------
export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: contactTypeEnum("type").notNull(),

    // INDIVIDUAL fields
    firstName: text("first_name"),
    lastName: text("last_name"),

    // COMPANY fields
    companyName: text("company_name"),

    // Optional: an INDIVIDUAL may belong to a COMPANY contact.
    companyId: uuid("company_id").references((): AnyPgColumn => contacts.id, {
      onDelete: "set null",
    }),

    email: text("email"),
    phone: text("phone"),

    status: contactStatusEnum("status").notNull().default("ACTIVE"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id),

    // Soft delete = archive. deletedAt is the source of truth; `status`
    // mirrors it for cheap, index-friendly filtering.
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    // Search targets from PRD section 7: names, company name, email, phone.
    index("contacts_first_last_name_idx").on(table.firstName, table.lastName),
    index("contacts_company_name_idx").on(table.companyName),
    index("contacts_email_idx").on(table.email),
    index("contacts_phone_idx").on(table.phone),
    index("contacts_company_id_idx").on(table.companyId),
    index("contacts_status_idx").on(table.status),
    // A COMPANY contact must have a companyName; an INDIVIDUAL must have a name.
    // (Also enforced in the service layer, since Postgres CHECK constraints
    // can't be conditionally expressive enough on their own here.)
    index("contacts_deleted_at_idx").on(table.deletedAt),
  ],
);

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  company: one(contacts, {
    fields: [contacts.companyId],
    references: [contacts.id],
    relationName: "company_individuals",
  }),
  individuals: many(contacts, { relationName: "company_individuals" }),
  addresses: many(contactAddresses),
  notes: many(contactNotes),
  contactTags: many(contactTags),
}));

// ---------------------------------------------------------------------------
// contact_addresses
// ---------------------------------------------------------------------------
export const contactAddresses = pgTable(
  "contact_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    type: addressTypeEnum("type").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    city: text("city"),
    state: text("state"),
    postalCode: text("postal_code"),
    country: text("country"),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("contact_addresses_contact_id_idx").on(table.contactId),
    // Only one primary address per (contact, type). Enforced at the DB level
    // via a partial unique index so "un-primary-ing" the rest is atomic.
    uniqueIndex("contact_addresses_primary_per_type_idx")
      .on(table.contactId, table.type)
      .where(sql`${table.isPrimary} = true`),
  ],
);

export const contactAddressesRelations = relations(
  contactAddresses,
  ({ one }) => ({
    contact: one(contacts, {
      fields: [contactAddresses.contactId],
      references: [contacts.id],
    }),
  }),
);

// ---------------------------------------------------------------------------
// tags + contact_tags (many-to-many)
// ---------------------------------------------------------------------------
export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("tags_name_idx").on(table.name)],
);

export const contactTags = pgTable(
  "contact_tags",
  {
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.contactId, table.tagId] }),
    index("contact_tags_tag_id_idx").on(table.tagId),
  ],
);

export const tagsRelations = relations(tags, ({ many }) => ({
  contactTags: many(contactTags),
}));

export const contactTagsRelations = relations(contactTags, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactTags.contactId],
    references: [contacts.id],
  }),
  tag: one(tags, {
    fields: [contactTags.tagId],
    references: [tags.id],
  }),
}));

// ---------------------------------------------------------------------------
// contact_notes
// ---------------------------------------------------------------------------
export const contactNotes = pgTable(
  "contact_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("contact_notes_contact_id_idx").on(table.contactId)],
);

export const contactNotesRelations = relations(contactNotes, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactNotes.contactId],
    references: [contacts.id],
  }),
}));

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type ContactAddress = typeof contactAddresses.$inferSelect;
export type NewContactAddress = typeof contactAddresses.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type ContactNote = typeof contactNotes.$inferSelect;
export type NewContactNote = typeof contactNotes.$inferInsert;

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text("role"),
  banned: boolean("banned"),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonated_by"),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
});
