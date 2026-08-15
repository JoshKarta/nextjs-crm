import { db } from "@/db";
import { contacts, contactAddresses, contactNotes } from "@/db/schema";
import { recordAuditEvent } from "@/utils/validation/audit";
import {
  contactInputSchema,
  contactUpdateSchema,
  addressInputSchema,
  noteInputSchema,
  assertContactShape,
  type ContactInput,
  type ContactUpdateInput,
  type AddressInput,
  type NoteInput,
} from "@/utils/validation/contact";
import { and, eq } from "drizzle-orm";

export async function createContact(userId: string, rawInput: unknown) {
  const parsed = contactInputSchema.parse(rawInput);
  assertContactShape(parsed);

  return await db.transaction(async (tx) => {
    const [contact] = await tx
      .insert(contacts)
      .values({
        ...parsed,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    await recordAuditEvent(tx, {
      entityType: "CONTACT",
      entityId: contact.id,
      action: "CREATE",
      performedBy: userId,
      metadata: {
        type: contact.type,
        name:
          contact.type === "INDIVIDUAL"
            ? `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim()
            : contact.companyName,
      },
    });

    return contact;
  });
}

export async function updateContact(
  userId: string,
  contactId: string,
  rawInput: unknown
) {
  const parsed = contactUpdateSchema.parse(rawInput);

  return await db.transaction(async (tx) => {
    const existing = await tx.query.contacts.findFirst({
      where: eq(contacts.id, contactId),
    });
    if (!existing) {
      throw new Error("Contact not found");
    }

    assertContactShape(parsed, existing);

    const [updated] = await tx
      .update(contacts)
      .set({
        ...parsed,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, contactId))
      .returning();

    await recordAuditEvent(tx, {
      entityType: "CONTACT",
      entityId: contactId,
      action: "UPDATE",
      performedBy: userId,
      metadata: parsed as Record<string, unknown>,
    });

    return updated;
  });
}

export async function archiveContact(userId: string, contactId: string) {
  return await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(contacts)
      .set({
        deletedAt: new Date(),
        status: "ARCHIVED",
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, contactId))
      .returning();

    if (!updated) {
      throw new Error("Contact not found");
    }

    await recordAuditEvent(tx, {
      entityType: "CONTACT",
      entityId: contactId,
      action: "ARCHIVE",
      performedBy: userId,
      metadata: { status: ["ACTIVE", "ARCHIVED"] },
    });

    return updated;
  });
}

export async function restoreContact(userId: string, contactId: string) {
  return await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(contacts)
      .set({
        deletedAt: null,
        status: "ACTIVE",
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, contactId))
      .returning();

    if (!updated) {
      throw new Error("Contact not found");
    }

    await recordAuditEvent(tx, {
      entityType: "CONTACT",
      entityId: contactId,
      action: "RESTORE",
      performedBy: userId,
      metadata: { status: ["ARCHIVED", "ACTIVE"] },
    });

    return updated;
  });
}

export async function createAddress(
  userId: string,
  contactId: string,
  rawInput: unknown
) {
  const parsed = addressInputSchema.parse(rawInput);

  return await db.transaction(async (tx) => {
    if (parsed.isPrimary) {
      await tx
        .update(contactAddresses)
        .set({ isPrimary: false })
        .where(
          and(
            eq(contactAddresses.contactId, contactId),
            eq(contactAddresses.type, parsed.type)
          )
        );
    }

    const [address] = await tx
      .insert(contactAddresses)
      .values({
        ...parsed,
        contactId,
      })
      .returning();

    await recordAuditEvent(tx, {
      entityType: "CONTACT_ADDRESS",
      entityId: address.id,
      action: "CREATE",
      performedBy: userId,
      metadata: { contactId, type: address.type, isPrimary: address.isPrimary },
    });

    return address;
  });
}

export async function updateAddress(
  userId: string,
  contactId: string,
  addressId: string,
  rawInput: unknown
) {
  const parsed = addressInputSchema.partial().parse(rawInput);

  return await db.transaction(async (tx) => {
    if (parsed.isPrimary && parsed.type) {
      await tx
        .update(contactAddresses)
        .set({ isPrimary: false })
        .where(
          and(
            eq(contactAddresses.contactId, contactId),
            eq(contactAddresses.type, parsed.type)
          )
        );
    }

    const [address] = await tx
      .update(contactAddresses)
      .set({
        ...parsed,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(contactAddresses.id, addressId),
          eq(contactAddresses.contactId, contactId)
        )
      )
      .returning();

    if (!address) {
      throw new Error("Address not found");
    }

    await recordAuditEvent(tx, {
      entityType: "CONTACT_ADDRESS",
      entityId: address.id,
      action: "UPDATE",
      performedBy: userId,
      metadata: { contactId, ...parsed },
    });

    return address;
  });
}

export async function deleteAddress(
  userId: string,
  contactId: string,
  addressId: string
) {
  return await db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(contactAddresses)
      .where(
        and(
          eq(contactAddresses.id, addressId),
          eq(contactAddresses.contactId, contactId)
        )
      )
      .returning();

    if (!deleted) {
      throw new Error("Address not found");
    }

    await recordAuditEvent(tx, {
      entityType: "CONTACT_ADDRESS",
      entityId: addressId,
      action: "DELETE",
      performedBy: userId,
      metadata: { contactId },
    });

    return deleted;
  });
}

export async function createNote(
  userId: string,
  contactId: string,
  rawInput: unknown
) {
  const parsed = noteInputSchema.parse(rawInput);

  return await db.transaction(async (tx) => {
    const [note] = await tx
      .insert(contactNotes)
      .values({
        contactId,
        content: parsed.content,
        createdBy: userId,
      })
      .returning();

    await recordAuditEvent(tx, {
      entityType: "CONTACT_NOTE",
      entityId: note.id,
      action: "CREATE",
      performedBy: userId,
      metadata: { contactId },
    });

    return note;
  });
}

export async function updateNote(
  userId: string,
  contactId: string,
  noteId: string,
  rawInput: unknown
) {
  const parsed = noteInputSchema.parse(rawInput);

  return await db.transaction(async (tx) => {
    const [note] = await tx
      .update(contactNotes)
      .set({
        content: parsed.content,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(contactNotes.id, noteId),
          eq(contactNotes.contactId, contactId)
        )
      )
      .returning();

    if (!note) {
      throw new Error("Note not found");
    }

    await recordAuditEvent(tx, {
      entityType: "CONTACT_NOTE",
      entityId: note.id,
      action: "UPDATE",
      performedBy: userId,
      metadata: { contactId },
    });

    return note;
  });
}

export async function deleteNote(
  userId: string,
  contactId: string,
  noteId: string
) {
  return await db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(contactNotes)
      .where(
        and(
          eq(contactNotes.id, noteId),
          eq(contactNotes.contactId, contactId)
        )
      )
      .returning();

    if (!deleted) {
      throw new Error("Note not found");
    }

    await recordAuditEvent(tx, {
      entityType: "CONTACT_NOTE",
      entityId: noteId,
      action: "DELETE",
      performedBy: userId,
      metadata: { contactId },
    });

    return deleted;
  });
}
