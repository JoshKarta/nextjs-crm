"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Palette } from "lucide-react";
import InvoiceTemplateBuilder from "./invoice-template-builder";

interface TemplateBuilderDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TemplateBuilderDialog({
  isOpen,
  onClose,
}: TemplateBuilderDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[1100px] max-h-[95vh] overflow-y-auto p-6">
        <DialogHeader className="mb-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Palette className="h-5 w-5 text-primary" />
            Invoice Template Builder
          </DialogTitle>
          <DialogDescription>
            Design visual layouts for invoices by dragging and positioning blocks. Save layout configurations to the database to use across your organization.
          </DialogDescription>
        </DialogHeader>

        {isOpen && <InvoiceTemplateBuilder />}
      </DialogContent>
    </Dialog>
  );
}
