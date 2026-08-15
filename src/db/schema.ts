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
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";


// Kept intentionally generic so every future module (products, invoices,
// payments) reuses this one table instead of growing its own audit table.
export const auditEntityTypeEnum = pgEnum("audit_entity_type", [
  "CONTACT",
  "CONTACT_ADDRESS",
  "CONTACT_NOTE",
  "PRODUCT",
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
