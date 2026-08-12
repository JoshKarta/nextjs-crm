"use client";

import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { toast } from "react-hot-toast";
import { useState } from "react";

interface ContactRestoreDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  contact: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    companyName?: string | null;
    type: "INDIVIDUAL" | "COMPANY";
  } | null;
}

export function ContactRestoreDialog({
  isOpen,
  onClose,
  onSuccess,
  contact,
}: ContactRestoreDialogProps) {
  const [isRestoring, setIsRestoring] = useState(false);

  if (!contact) return null;

  const displayName =
    contact.type === "COMPANY"
      ? contact.companyName
      : [contact.firstName, contact.lastName].filter(Boolean).join(" ");

  const handleConfirm = async () => {
    setIsRestoring(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}/restore`, {
        method: "PATCH",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to restore contact");
      }

      toast.success(`Contact "${displayName}" restored successfully`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Restore Contact"
      description={`Are you sure you want to restore "${displayName}"? This contact will be un-archived and set back to ACTIVE.`}
      confirmText={isRestoring ? "Restoring..." : "Restore Contact"}
      confirmVariant="default"
    />
  );
}
