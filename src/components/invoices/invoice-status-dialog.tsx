"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { CheckCircle2, XCircle, Trash2 } from "lucide-react";
import type { Invoice } from "@/db/schema";

interface InvoiceStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actionType: "finalize" | "void" | "delete";
  invoice: Invoice;
}

export function InvoiceStatusDialog({
  isOpen,
  onClose,
  onSuccess,
  actionType,
  invoice,
}: InvoiceStatusDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      let url = "";
      let method = "POST";

      if (actionType === "finalize") {
        url = `/api/invoices/${invoice.id}/finalize`;
      } else if (actionType === "void") {
        url = `/api/invoices/${invoice.id}/void`;
      } else if (actionType === "delete") {
        url = `/api/invoices/${invoice.id}`;
        method = "DELETE";
      }

      const res = await fetch(url, { method });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to ${actionType} invoice`);
      }

      if (actionType === "finalize") {
        toast.success(`Invoice ${invoice.invoiceNumber} finalized!`);
      } else if (actionType === "void") {
        toast.success(`Invoice ${invoice.invoiceNumber} voided!`);
      } else {
        toast.success(`Draft invoice ${invoice.invoiceNumber} deleted!`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const titles = {
    finalize: "Finalize Invoice",
    void: "Void Invoice",
    delete: "Delete Draft Invoice",
  };

  const descriptions = {
    finalize:
      "Finalizing this invoice locks its line items and issue amounts. An invoice must have at least one line item.",
    void: "Voiding an invoice renders it permanently voided and cannot be undone.",
    delete: "Deleting this draft invoice removes it permanently.",
  };

  const icons = {
    finalize: <CheckCircle2 className="h-5 w-5 text-blue-600" />,
    void: <XCircle className="h-5 w-5 text-destructive" />,
    delete: <Trash2 className="h-5 w-5 text-destructive" />,
  };

  const confirmButtons = {
    finalize: { label: "Finalize Invoice", variant: "default" as const },
    void: { label: "Void Invoice", variant: "destructive" as const },
    delete: { label: "Delete Invoice", variant: "destructive" as const },
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icons[actionType]}
            {titles[actionType]}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {descriptions[actionType]}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/40 border rounded-lg p-3 my-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Invoice #:</span>
            <span className="font-mono font-medium">{invoice.invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Amount:</span>
            <span className="font-mono font-medium">
              {invoice.currency} {parseFloat(invoice.totalAmount).toFixed(2)}
            </span>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant={confirmButtons[actionType].variant}
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Processing..." : confirmButtons[actionType].label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
