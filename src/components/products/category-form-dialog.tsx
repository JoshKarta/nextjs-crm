"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-hot-toast";
import { Layers, Plus, FolderTree } from "lucide-react";
import type { ProductCategory } from "@/db/schema";

const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(200),
  parentCategoryId: z.string().optional(),
});

type FormValues = z.infer<typeof categorySchema>;

interface CategoryFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: ProductCategory[];
}

export function CategoryFormDialog({
  isOpen,
  onClose,
  onSuccess,
  categories = [],
}: CategoryFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter root categories that don't have a parent (to satisfy 1-level depth requirement in v1)
  const topLevelCategories = categories.filter((c) => !c.parentCategoryId);

  const form = useForm<FormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      parentCategoryId: "none",
    },
  });

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: values.name,
        parentCategoryId: values.parentCategoryId === "none" ? undefined : values.parentCategoryId,
      };

      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create category");

      toast.success(`Category "${data.category.name}" created!`);
      form.reset();
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Product Categories
          </DialogTitle>
          <DialogDescription>
            Create and organize product categories. Categories can be nested up to 1 level deep.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2 border-b pb-4">
          <div className="space-y-2">
            <Label htmlFor="categoryName">
              New Category Name <span className="text-destructive font-bold">*</span>
            </Label>
            <Input id="categoryName" placeholder="e.g. Software & Subscriptions" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Parent Category (Optional)</Label>
            <Select
              value={form.watch("parentCategoryId") || "none"}
              onValueChange={(val) => form.setValue("parentCategoryId", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Top-Level Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Top-Level Category)</SelectItem>
                {topLevelCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" size="sm" className="w-full gap-2" disabled={isSubmitting}>
            <Plus className="h-4 w-4" />
            {isSubmitting ? "Creating..." : "Add Category"}
          </Button>
        </form>

        {/* Existing categories list */}
        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Existing Categories ({categories.length})
          </Label>
          {categories.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">No categories defined yet.</p>
          ) : (
            <div className="space-y-1.5">
              {categories.map((cat) => {
                const parent = cat.parentCategoryId
                  ? categories.find((p) => p.id === cat.parentCategoryId)
                  : null;
                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-2 rounded-md border text-sm bg-muted/40"
                  >
                    <div className="flex items-center gap-2">
                      <FolderTree className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{cat.name}</span>
                    </div>
                    {parent && (
                      <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded border">
                        Subcategory of {parent.name}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
