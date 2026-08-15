"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-hot-toast";
import { Package, Wrench, DollarSign, Tag, Layers, Sparkles } from "lucide-react";
import type { ProductCategory } from "@/db/schema";

const productFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(300),
  sku: z.string().trim().max(100).optional(),
  type: z.enum(["PRODUCT", "SERVICE"]),
  basePrice: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,4})?$/, "Must be a valid decimal number (e.g. 99.99)")
    .refine((val) => parseFloat(val) >= 0, "Price must be >= 0"),
  currency: z.string().trim().length(3, "Currency code must be 3 letters (e.g. USD)").transform((v) => v.toUpperCase()),
  taxRatePercent: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Must be a valid percentage (e.g. 20 or 5.5)")
    .refine((val) => {
      const num = parseFloat(val);
      return num >= 0 && num <= 100;
    }, "Tax rate must be between 0% and 100%"),
  defaultUnit: z.string().trim().max(50).optional(),
  categoryId: z.string().optional(),
  description: z.string().trim().max(5000).optional(),
});

type FormValues = z.infer<typeof productFormSchema>;

const generateClientSku = (name: string, type: "PRODUCT" | "SERVICE") => {
  const prefix = type === "SERVICE" ? "SRV" : "PRD";
  const slug = name
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 4)
    .toUpperCase() || "ITEM";
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${slug}-${randomSuffix}`;
};

export interface ProductToEdit {
  id: string;
  name: string;
  sku: string;
  type: "PRODUCT" | "SERVICE";
  basePrice: string;
  currency: string;
  taxRate: string;
  defaultUnit?: string | null;
  categoryId?: string | null;
  description?: string | null;
}

interface ProductFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productToEdit?: ProductToEdit | null;
  categories?: ProductCategory[];
}

export function ProductFormDialog({
  isOpen,
  onClose,
  onSuccess,
  productToEdit,
  categories = [],
}: ProductFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(productToEdit);

  const form = useForm<FormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      sku: "",
      type: "PRODUCT",
      basePrice: "0.00",
      currency: "USD",
      taxRatePercent: "0",
      defaultUnit: "unit",
      categoryId: "none",
      description: "",
    },
  });

  useEffect(() => {
    if (productToEdit) {
      const taxPercent = (parseFloat(productToEdit.taxRate || "0") * 100).toString();
      form.reset({
        name: productToEdit.name,
        sku: productToEdit.sku,
        type: productToEdit.type,
        basePrice: productToEdit.basePrice,
        currency: productToEdit.currency,
        taxRatePercent: taxPercent,
        defaultUnit: productToEdit.defaultUnit || "",
        categoryId: productToEdit.categoryId || "none",
        description: productToEdit.description || "",
      });
    } else {
      form.reset({
        name: "",
        sku: "",
        type: "PRODUCT",
        basePrice: "0.00",
        currency: "USD",
        taxRatePercent: "0",
        defaultUnit: "unit",
        categoryId: "none",
        description: "",
      });
    }
  }, [productToEdit, isOpen, form]);

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      // Convert tax percentage to fraction string (e.g., 20 -> "0.2")
      const taxRateFraction = (parseFloat(values.taxRatePercent) / 100).toString();

      // Auto-generate SKU client-side if left empty
      const finalSku = values.sku && values.sku.trim() !== ""
        ? values.sku.trim()
        : generateClientSku(values.name, values.type);

      const payload: any = {
        name: values.name,
        sku: finalSku,
        basePrice: values.basePrice,
        currency: values.currency.toUpperCase(),
        taxRate: taxRateFraction,
        defaultUnit: values.defaultUnit || undefined,
        categoryId: values.categoryId === "none" ? undefined : values.categoryId,
        description: values.description || undefined,
      };

      if (!isEditing) {
        payload.type = values.type;
      }

      const url = isEditing ? `/api/products/${productToEdit!.id}` : "/api/products";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to ${isEditing ? "update" : "create"} product`);
      }

      toast.success(`Product ${isEditing ? "updated" : "created"} successfully!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {form.watch("type") === "PRODUCT" ? (
              <Package className="h-5 w-5 text-primary" />
            ) : (
              <Wrench className="h-5 w-5 text-primary" />
            )}
            {isEditing ? "Edit Item" : "Create New Item"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update pricing, category, or specifications for this product/service."
              : "Add a new product or service catalog item."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
          {/* Type Selector (only enabled when creating) */}
          <div className="space-y-2">
            <Label>Item Type</Label>
            <Select
              disabled={isEditing}
              value={form.watch("type")}
              onValueChange={(val: "PRODUCT" | "SERVICE") => form.setValue("type", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRODUCT">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-500" />
                    <span>Physical Product</span>
                  </div>
                </SelectItem>
                <SelectItem value="SERVICE">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-amber-500" />
                    <span>Service / Labor</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {isEditing && (
              <p className="text-xs text-muted-foreground">
                Item type cannot be changed after creation to preserve invoice integrity.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Item Name <span className="text-destructive font-bold">*</span>
              </Label>
              <Input id="name" placeholder="e.g. Enterprise License" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* SKU */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="sku">
                  SKU Code <span className="text-xs text-muted-foreground font-normal">(Auto-generated if empty)</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-primary gap-1"
                  onClick={() => {
                    const nameVal = form.getValues("name");
                    const typeVal = form.getValues("type");
                    form.setValue("sku", generateClientSku(nameVal, typeVal));
                  }}
                >
                  <Sparkles className="h-3 w-3" /> Auto
                </Button>
              </div>
              <Input id="sku" placeholder="Auto-generated e.g. PRD-ITEM-8F2A" {...form.register("sku")} />
              {form.formState.errors.sku && (
                <p className="text-xs text-destructive">{form.formState.errors.sku.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Base Price */}
            <div className="space-y-2">
              <Label htmlFor="basePrice">
                Base Price <span className="text-destructive font-bold">*</span>
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="basePrice"
                  className="pl-8"
                  placeholder="0.00"
                  {...form.register("basePrice")}
                />
              </div>
              {form.formState.errors.basePrice && (
                <p className="text-xs text-destructive">{form.formState.errors.basePrice.message}</p>
              )}
            </div>

            {/* Currency */}
            <div className="space-y-2">
              <Label htmlFor="currency">
                Currency <span className="text-destructive font-bold">*</span>
              </Label>
              <Input id="currency" maxLength={3} placeholder="USD" {...form.register("currency")} />
              {form.formState.errors.currency && (
                <p className="text-xs text-destructive">{form.formState.errors.currency.message}</p>
              )}
            </div>

            {/* Tax Rate (%) */}
            <div className="space-y-2">
              <Label htmlFor="taxRatePercent">
                Tax Rate (%) <span className="text-destructive font-bold">*</span>
              </Label>
              <Input
                id="taxRatePercent"
                placeholder="0"
                {...form.register("taxRatePercent")}
              />
              {form.formState.errors.taxRatePercent && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.taxRatePercent.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Default Unit */}
            <div className="space-y-2">
              <Label htmlFor="defaultUnit">Default Unit</Label>
              <Input
                id="defaultUnit"
                placeholder="e.g. unit, hr, month, license"
                {...form.register("defaultUnit")}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.watch("categoryId") || "none"}
                onValueChange={(val) => form.setValue("categoryId", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorized</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Add product specifications, details, or terms..."
              {...form.register("description")}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                ? "Save Changes"
                : "Create Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
