"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "react-hot-toast";

interface ProductArchiveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: { id: string; name: string; sku: string } | null;
}

export function ProductArchiveDialog({
  isOpen,
  onClose,
  onSuccess,
  product,
}: ProductArchiveDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!product) return null;

  const handleArchive = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to archive product");

      toast.success(`"${product.name}" was archived`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive Product</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to archive <strong>{product.name}</strong> (SKU: {product.sku})?
            Archived items will no longer be selectable for new invoices, but can be restored at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isSubmitting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleArchive}
            disabled={isSubmitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isSubmitting ? "Archiving..." : "Archive Product"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
