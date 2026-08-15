import { z } from "zod";

export const contactTypeSchema = z.enum(["INDIVIDUAL", "COMPANY"]);
export const addressTypeSchema = z.enum(["BILLING", "SHIPPING", "OFFICE", "HOME", "OTHER"]);

// Base fields shared by create/update; type-specific requirements are
// enforced in the service layer (`assertContactShape`) because Zod's
// discriminated unions get awkward once "type" is optional on update.
export const contactInputSchema = z.object({
  type: contactTypeSchema,
  firstName: z.string().trim().min(1).max(200).optional(),
  lastName: z.string().trim().min(1).max(200).optional(),
  companyName: z.string().trim().min(1).max(200).optional(),
  companyId: z.string().uuid().optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: z.string().trim().min(3).max(50).optional(),
});
export type ContactInput = z.infer<typeof contactInputSchema>;

export const contactUpdateSchema = contactInputSchema.partial().extend({
  // `type` is deliberately excluded from updates: switching a contact
  // between INDIVIDUAL and COMPANY after creation is out of scope for v1
  // and would orphan `companyId` relationships silently.
});
export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>;

export const addressInputSchema = z.object({
  type: addressTypeSchema,
  line1: z.string().trim().min(1).max(300),
  line2: z.string().trim().max(300).optional(),
  city: z.string().trim().max(150).optional(),
  state: z.string().trim().max(150).optional(),
  postalCode: z.string().trim().max(30).optional(),
  country: z.string().trim().max(100).optional(),
  isPrimary: z.boolean().optional().default(false),
});
export type AddressInput = z.infer<typeof addressInputSchema>;

export const noteInputSchema = z.object({
  content: z.string().trim().min(1).max(10_000),
});
export type NoteInput = z.infer<typeof noteInputSchema>;

export const contactSearchSchema = z.object({
  query: z.string().trim().max(200).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional().default("ACTIVE"),
  type: contactTypeSchema.optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  limit: z.number().int().min(1).max(100).optional().default(25),
  offset: z.number().int().min(0).optional().default(0),
});
export type ContactSearchInput = z.infer<typeof contactSearchSchema>;

export function assertContactShape(
  data: Partial<ContactInput>,
  existingContact?: {
    type: "INDIVIDUAL" | "COMPANY";
    firstName?: string | null;
    lastName?: string | null;
    companyName?: string | null;
  }
): void {
  const effectiveType = data.type || existingContact?.type;
  if (!effectiveType) {
    throw new Error("Contact type is required.");
  }

  if (effectiveType === "INDIVIDUAL") {
    const firstName = data.firstName !== undefined ? data.firstName : existingContact?.firstName;
    const lastName = data.lastName !== undefined ? data.lastName : existingContact?.lastName;
    if ((!firstName || !firstName.trim()) && (!lastName || !lastName.trim())) {
      throw new Error("First name or last name is required for individuals.");
    }
  } else if (effectiveType === "COMPANY") {
    const companyName = data.companyName !== undefined ? data.companyName : existingContact?.companyName;
    if (!companyName || !companyName.trim()) {
      throw new Error("Company name is required for companies.");
    }
  }
}