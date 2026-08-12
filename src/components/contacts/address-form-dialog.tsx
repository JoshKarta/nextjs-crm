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
import { Switch } from "@/components/ui/switch";
import { toast } from "react-hot-toast";

const addressSchema = z.object({
  type: z.enum(["BILLING", "SHIPPING", "OFFICE", "HOME", "OTHER"]),
  line1: z.string().min(1, "Address Line 1 is required"),
  line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  isPrimary: z.boolean(),
});

type AddressFormValues = z.infer<typeof addressSchema>;

interface AddressFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  contactId: string;
  addressToEdit?: {
    id: string;
    type: "BILLING" | "SHIPPING" | "OFFICE" | "HOME" | "OTHER";
    line1: string;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    isPrimary: boolean;
  } | null;
}

export function AddressFormDialog({
  isOpen,
  onClose,
  onSuccess,
  contactId,
  addressToEdit,
}: AddressFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(addressToEdit);

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      type: "OFFICE",
      line1: "",
      line2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      isPrimary: false,
    },
  });

  useEffect(() => {
    if (addressToEdit) {
      form.reset({
        type: addressToEdit.type,
        line1: addressToEdit.line1,
        line2: addressToEdit.line2 || "",
        city: addressToEdit.city || "",
        state: addressToEdit.state || "",
        postalCode: addressToEdit.postalCode || "",
        country: addressToEdit.country || "",
        isPrimary: addressToEdit.isPrimary,
      });
    } else {
      form.reset({
        type: "OFFICE",
        line1: "",
        line2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
        isPrimary: false,
      });
    }
  }, [addressToEdit, isOpen, form]);

  const onSubmit = async (values: AddressFormValues) => {
    setIsSubmitting(true);
    try {
      const url = isEditing
        ? `/api/contacts/${contactId}/addresses/${addressToEdit!.id}`
        : `/api/contacts/${contactId}/addresses`;
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save address");
      }

      toast.success(isEditing ? "Address updated" : "Address added");
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
          <DialogTitle>{isEditing ? "Edit Address" : "Add Address"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update address details." : "Add a new address to this contact."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Address Type</Label>
            <Select
              value={form.watch("type")}
              onValueChange={(val: any) => form.setValue("type", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select address type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BILLING">Billing</SelectItem>
                <SelectItem value="SHIPPING">Shipping</SelectItem>
                <SelectItem value="OFFICE">Office</SelectItem>
                <SelectItem value="HOME">Home</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="line1">Address Line 1</Label>
            <Input id="line1" placeholder="123 Main St" {...form.register("line1")} />
            {form.formState.errors.line1 && (
              <p className="text-xs text-destructive">
                {form.formState.errors.line1.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="line2">Address Line 2 (Optional)</Label>
            <Input id="line2" placeholder="Suite 400" {...form.register("line2")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" placeholder="New York" {...form.register("city")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State / Province</Label>
              <Input id="state" placeholder="NY" {...form.register("state")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input id="postalCode" placeholder="10001" {...form.register("postalCode")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" placeholder="United States" {...form.register("country")} />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="space-y-0.5">
              <Label htmlFor="isPrimary">Set as Primary</Label>
              <p className="text-xs text-muted-foreground">
                Set as the primary address for this address type.
              </p>
            </div>
            <Switch
              id="isPrimary"
              checked={form.watch("isPrimary")}
              onCheckedChange={(val) => form.setValue("isPrimary", val)}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEditing ? "Save Address" : "Add Address"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
