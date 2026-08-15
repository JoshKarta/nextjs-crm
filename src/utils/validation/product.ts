import { z } from "zod";

export const productTypeSchema = z.enum(["PRODUCT", "SERVICE"]);
export const productStatusSchema = z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]);

// Money as a decimal string, validated with a regex rather than z.number()
// to avoid floating-point round-tripping before it ever reaches Postgres
// NUMERIC. Up to 4 decimal places, matching the column's scale.
const decimalString = (opts: { min?: number } = {}) =>
  z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,4})?$/, "Must be a decimal string with up to 4 decimal places")
    .refine((val) => (opts.min === undefined ? true : parseFloat(val) >= opts.min), {
      message: `Must be >= ${opts.min}`,
    });

export const productInputSchema = z.object({
  name: z.string().trim().min(1).max(300),
  description: z.string().trim().max(5000).optional(),
  sku: z.string().trim().max(100).optional().or(z.literal("")),
  type: productTypeSchema,
  defaultUnit: z.string().trim().max(50).optional(),
  basePrice: decimalString({ min: 0 }),
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((v) => v.toUpperCase()),
  // Stored as a fraction (0.2 = 20%), 0 to 1 inclusive.
  taxRate: decimalString({ min: 0 }).refine((val) => parseFloat(val) <= 1, {
    message: "taxRate must be between 0 and 1 (a fraction, not a percentage)",
  }),
  categoryId: z.string().uuid().optional(),
});
export type ProductInput = z.infer<typeof productInputSchema>;

export const productUpdateSchema = productInputSchema.partial().extend({
  // `type` excluded from updates for the same reason as contacts: switching
  // PRODUCT <-> SERVICE post-creation isn't a v1 requirement and has no
  // defined migration behavior for existing invoice snapshots.
});
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const productSearchSchema = z.object({
  query: z.string().trim().max(200).optional(),
  status: productStatusSchema.optional(),
  type: productTypeSchema.optional(),
  categoryId: z.string().uuid().optional(),
  // When true (the default for invoice line-item pickers per PRD §8), only
  // ACTIVE products are returned.
  selectableOnly: z.boolean().optional().default(true),
  limit: z.number().int().min(1).max(100).optional().default(25),
  offset: z.number().int().min(0).optional().default(0),
});
export type ProductSearchInput = z.infer<typeof productSearchSchema>;

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  parentCategoryId: z.string().uuid().optional(),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;