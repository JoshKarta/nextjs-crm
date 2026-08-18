import { z } from "zod";

const decimalString = () =>
  z.string().trim().regex(/^\d+(\.\d{1,4})?$/, "Must be a non-negative decimal string");

const optionalDecimalString = () =>
  z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : String(val).trim()),
    decimalString().optional()
  );

const optionalDate = () =>
  z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.coerce.date().optional()
  );

const optionalString = (maxLen = 5000) =>
  z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : String(val).trim()),
    z.string().max(maxLen).optional()
  );

export const discountTypeSchema = z.preprocess(
  (val) => (val === "" || val === "none" || val === null || val === undefined ? undefined : val),
  z.enum(["FIXED", "PERCENTAGE"]).optional()
);

export const invoiceItemInputSchema = z
  .object({
    productId: z.preprocess(
      (val) => (val === "" || val === "none" || val === null || val === undefined ? undefined : val),
      z.string().uuid().optional()
    ),
    description: z.string().trim().min(1, "Description is required").max(500),
    quantity: decimalString(),
    unitPrice: decimalString(),
    discountType: discountTypeSchema,
    discountValue: optionalDecimalString(),
    taxRate: optionalDecimalString(),
  })
  .refine((v) => !v.discountType || v.discountValue !== undefined, {
    message: "discountValue is required when discountType is set",
    path: ["discountValue"],
  });
export type InvoiceItemInput = z.infer<typeof invoiceItemInputSchema>;

export const invoiceItemUpdateSchema = invoiceItemInputSchema;
export type InvoiceItemUpdateInput = z.infer<typeof invoiceItemUpdateSchema>;

export const createInvoiceSchema = z.object({
  contactId: z.string().uuid("Invalid contact ID"),
  invoiceDate: optionalDate(),
  dueDate: optionalDate(),
  currency: z
    .string()
    .trim()
    .length(3, "Currency code must be 3 letters")
    .transform((v) => v.toUpperCase()),
  notes: optionalString(5000),
  terms: optionalString(5000),
  items: z.array(invoiceItemInputSchema).optional().default([]),
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceSchema = z.object({
  contactId: z.string().uuid().optional(),
  invoiceDate: optionalDate(),
  dueDate: optionalDate(),
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((v) => v.toUpperCase())
    .optional(),
  notes: optionalString(5000),
  terms: optionalString(5000),
});
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

export const invoiceSearchSchema = z.object({
  contactId: z.string().uuid().optional(),
  status: z.enum(["DRAFT", "FINALIZED", "PARTIALLY_PAID", "PAID", "VOID"]).optional(),
  overdueOnly: z.boolean().optional().default(false),
  limit: z.number().int().min(1).max(100).optional().default(25),
  offset: z.number().int().min(0).optional().default(0),
});
export type InvoiceSearchInput = z.infer<typeof invoiceSearchSchema>;