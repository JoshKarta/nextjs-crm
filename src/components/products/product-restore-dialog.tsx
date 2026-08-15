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

interface ProductRestoreDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: { id: string; name: string; sku: string } | null;
}

export function ProductRestoreDialog({
  isOpen,
  onClose,
  onSuccess,
  product,
}: ProductRestoreDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!product) return null;

  const handleRestore = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/products/${product.id}/restore`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to restore product");

      toast.success(`"${product.name}" was restored to ACTIVE status`);
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
          <AlertDialogTitle>Restore Product</AlertDialogTitle>
          <AlertDialogDescription>
            Re-activate <strong>{product.name}</strong> (SKU: {product.sku})? This will make it available for selection on new invoices again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isSubmitting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleRestore} disabled={isSubmitting}>
            {isSubmitting ? "Restoring..." : "Restore Product"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
