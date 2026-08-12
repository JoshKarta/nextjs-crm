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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";

const noteSchema = z.object({
  content: z.string().min(1, "Note content cannot be empty"),
});

type NoteFormValues = z.infer<typeof noteSchema>;

interface NoteFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  contactId: string;
  noteToEdit?: {
    id: string;
    content: string;
  } | null;
}

export function NoteFormDialog({
  isOpen,
  onClose,
  onSuccess,
  contactId,
  noteToEdit,
}: NoteFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(noteToEdit);

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { content: "" },
  });

  useEffect(() => {
    if (noteToEdit) {
      form.reset({ content: noteToEdit.content });
    } else {
      form.reset({ content: "" });
    }
  }, [noteToEdit, isOpen, form]);

  const onSubmit = async (values: NoteFormValues) => {
    setIsSubmitting(true);
    try {
      const url = isEditing
        ? `/api/contacts/${contactId}/notes/${noteToEdit!.id}`
        : `/api/contacts/${contactId}/notes`;
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save note");
      }

      toast.success(isEditing ? "Note updated" : "Note added");
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
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Note" : "Add Note"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update note content." : "Add a new note to this contact."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="content">Note Content</Label>
            <Textarea
              id="content"
              placeholder="Enter note details here..."
              rows={4}
              {...form.register("content")}
            />
            {form.formState.errors.content && (
              <p className="text-xs text-destructive">
                {form.formState.errors.content.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEditing ? "Save Note" : "Add Note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
