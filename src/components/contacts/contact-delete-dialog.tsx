"use client";

import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { toast } from "react-hot-toast";
import { useState } from "react";

interface ContactDeleteDialogProps {
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

export function ContactDeleteDialog({
  isOpen,
  onClose,
  onSuccess,
  contact,
}: ContactDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!contact) return null;

  const displayName =
    contact.type === "COMPANY"
      ? contact.companyName
      : [contact.firstName, contact.lastName].filter(Boolean).join(" ");

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete contact");
      }

      toast.success(`Contact "${displayName}" archived successfully`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Archive Contact"
      description={`Are you sure you want to archive "${displayName}"? This contact will be soft deleted and marked as ARCHIVED.`}
      confirmText={isDeleting ? "Archiving..." : "Archive Contact"}
      confirmVariant="destructive"
    />
  );
}
