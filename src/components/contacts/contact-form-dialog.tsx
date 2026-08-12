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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-hot-toast";
import { Building2, User } from "lucide-react";

const formSchema = z.object({
  type: z.enum(["INDIVIDUAL", "COMPANY"]),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  companyId: z.string().optional().nullable(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ContactFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  contactToEdit?: {
    id: string;
    type: "INDIVIDUAL" | "COMPANY";
    firstName?: string | null;
    lastName?: string | null;
    companyName?: string | null;
    companyId?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  companies?: { id: string; companyName: string | null }[];
}

export function ContactFormDialog({
  isOpen,
  onClose,
  onSuccess,
  contactToEdit,
  companies = [],
}: ContactFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(contactToEdit);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "INDIVIDUAL",
      firstName: "",
      lastName: "",
      companyName: "",
      companyId: null,
      email: "",
      phone: "",
    },
  });

  const watchType = form.watch("type");

  useEffect(() => {
    if (contactToEdit) {
      form.reset({
        type: contactToEdit.type,
        firstName: contactToEdit.firstName || "",
        lastName: contactToEdit.lastName || "",
        companyName: contactToEdit.companyName || "",
        companyId: contactToEdit.companyId || null,
        email: contactToEdit.email || "",
        phone: contactToEdit.phone || "",
      });
    } else {
      form.reset({
        type: "INDIVIDUAL",
        firstName: "",
        lastName: "",
        companyName: "",
        companyId: null,
        email: "",
        phone: "",
      });
    }
  }, [contactToEdit, isOpen, form]);

  const onSubmit = async (values: FormValues) => {
    // Custom validation
    if (values.type === "INDIVIDUAL" && !values.firstName?.trim() && !values.lastName?.trim()) {
      form.setError("firstName", { message: "First name or last name required for individuals" });
      return;
    }
    if (values.type === "COMPANY" && !values.companyName?.trim()) {
      form.setError("companyName", { message: "Company name is required" });
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEditing
        ? `/api/contacts/${contactToEdit!.id}`
        : `/api/contacts`;
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          companyId: values.companyId || null,
          email: values.email || null,
          phone: values.phone || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save contact");
      }

      toast.success(isEditing ? "Contact updated successfully" : "Contact created successfully");
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {watchType === "COMPANY" ? (
              <Building2 className="h-5 w-5 text-primary" />
            ) : (
              <User className="h-5 w-5 text-primary" />
            )}
            {isEditing ? "Edit Contact" : "Create New Contact"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details for this contact."
              : "Add a new individual or company contact to your list."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Contact Type</Label>
            <Select
              value={watchType}
              onValueChange={(val: "INDIVIDUAL" | "COMPANY") =>
                form.setValue("type", val)
              }
              disabled={isEditing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INDIVIDUAL">
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" /> Individual
                  </span>
                </SelectItem>
                <SelectItem value="COMPANY">
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Company
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {watchType === "INDIVIDUAL" ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    {...form.register("firstName")}
                  />
                  {form.formState.errors.firstName && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.firstName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    {...form.register("lastName")}
                  />
                  {form.formState.errors.lastName && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Associated Company (Optional)</Label>
                <Select
                  value={form.watch("companyId") || "none"}
                  onValueChange={(val) =>
                    form.setValue("companyId", val === "none" ? null : val)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.companyName || "Unnamed Company"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="Acme Corp"
                {...form.register("companyName")}
              />
              {form.formState.errors.companyName && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.companyName.message}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="contact@example.com"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+1 555-0199"
                {...form.register("phone")}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
