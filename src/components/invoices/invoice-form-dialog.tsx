"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-hot-toast";
import {
  FileText,
  Plus,
  Trash2,
  DollarSign,
  Package,
  ShoppingCart,
} from "lucide-react";
import type { Invoice, Contact, Product } from "@/db/schema";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface LineItemDraft {
  tempId: string;
  productId?: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountType?: "FIXED" | "PERCENTAGE" | "none";
  discountValue?: string;
  taxRate?: string;
}

function generateTempId() {
  return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

interface InvoiceFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoiceToEdit?: Invoice | null;
}

export function InvoiceFormDialog({
  isOpen,
  onClose,
  onSuccess,
  invoiceToEdit,
}: InvoiceFormDialogProps) {
  const isEditing = Boolean(invoiceToEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Header fields
  const [contactId, setContactId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  // Line items
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([]);

  // Contacts for dropdown
  const { data: contactsData } = useSWR(isOpen ? "/api/contacts?limit=100" : null, fetcher);
  const contacts: Contact[] = contactsData?.contacts || [];

  // Products for line item product selector
  const { data: productsData } = useSWR(isOpen ? "/api/products?selectableOnly=true&limit=100" : null, fetcher);
  const productsList: Product[] = productsData?.products || [];

  // Reset form when opening
  useEffect(() => {
    if (!isOpen) return;

    if (invoiceToEdit) {
      setContactId(invoiceToEdit.contactId);
      setInvoiceDate(
        invoiceToEdit.invoiceDate
          ? new Date(invoiceToEdit.invoiceDate).toISOString().split("T")[0]
          : ""
      );
      setDueDate(
        invoiceToEdit.dueDate
          ? new Date(invoiceToEdit.dueDate).toISOString().split("T")[0]
          : ""
      );
      setCurrency(invoiceToEdit.currency);
      setNotes(invoiceToEdit.notes || "");
      setTerms(invoiceToEdit.terms || "");
      // Line items are not editable here (they use individual add/update/remove API calls on the detail page)
      setLineItems([]);
    } else {
      setContactId("");
      setInvoiceDate(new Date().toISOString().split("T")[0]);
      setDueDate("");
      setCurrency("USD");
      setNotes("");
      setTerms("");
      setLineItems([
        {
          tempId: generateTempId(),
          description: "",
          quantity: "1",
          unitPrice: "0",
          taxRate: "0",
        },
      ]);
    }
  }, [isOpen, invoiceToEdit]);

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        tempId: generateTempId(),
        description: "",
        quantity: "1",
        unitPrice: "0",
        taxRate: "0",
      },
    ]);
  };

  const removeLineItem = (tempId: string) => {
    setLineItems((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  const updateLineItem = (tempId: string, field: keyof LineItemDraft, value: string) => {
    setLineItems((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, [field]: value } : item))
    );
  };

  const selectProduct = (tempId: string, productId: string) => {
    if (productId === "custom") {
      updateLineItem(tempId, "productId", "");
      return;
    }
    const product = productsList.find((p) => p.id === productId);
    if (!product) return;

    setLineItems((prev) =>
      prev.map((item) =>
        item.tempId === tempId
          ? {
              ...item,
              productId: product.id,
              description: product.name,
              unitPrice: product.basePrice,
              taxRate: product.taxRate,
            }
          : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactId) {
      toast.error("Please select a contact");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && invoiceToEdit) {
        // PATCH header fields only
        const payload: any = {
          contactId,
          currency: currency.toUpperCase(),
        };
        if (invoiceDate) payload.invoiceDate = invoiceDate;
        if (dueDate) payload.dueDate = dueDate;
        if (notes) payload.notes = notes;
        if (terms) payload.terms = terms;

        const res = await fetch(`/api/invoices/${invoiceToEdit.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update invoice");
        toast.success("Invoice updated successfully!");
      } else {
        // Create new invoice with items
        const items = lineItems
          .filter((item) => item.description.trim())
          .map((item) => ({
            productId: item.productId && item.productId !== "custom" ? item.productId : undefined,
            description: item.description.trim(),
            quantity: item.quantity && item.quantity.trim() !== "" ? item.quantity.trim() : "1",
            unitPrice: item.unitPrice && item.unitPrice.trim() !== "" ? item.unitPrice.trim() : "0",
            discountType: item.discountType && item.discountType !== "none" ? item.discountType : undefined,
            discountValue: item.discountValue && item.discountValue.trim() !== "" ? item.discountValue.trim() : undefined,
            taxRate: item.taxRate && item.taxRate.trim() !== "" ? item.taxRate.trim() : "0",
          }));

        const payload: any = {
          contactId,
          currency: currency.toUpperCase(),
          items,
        };
        if (invoiceDate && invoiceDate.trim() !== "") payload.invoiceDate = invoiceDate;
        if (dueDate && dueDate.trim() !== "") payload.dueDate = dueDate;
        if (notes && notes.trim() !== "") payload.notes = notes.trim();
        if (terms && terms.trim() !== "") payload.terms = terms.trim();

        const res = await fetch("/api/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create invoice");
        toast.success("Invoice created successfully!");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getContactLabel = (c: Contact) => {
    if (c.type === "COMPANY") return c.companyName || "Unnamed Company";
    return [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unnamed Contact";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {isEditing ? "Edit Invoice" : "Create New Invoice"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this draft invoice's header details."
              : "Set up a new invoice with contact, dates, and line items."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Contact & Currency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Contact <span className="text-destructive font-bold">*</span>
              </Label>
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a contact..." />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {c.type === "COMPANY" ? "Co" : "In"}
                        </Badge>
                        {getContactLabel(c)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Currency <span className="text-destructive font-bold">*</span>
              </Label>
              <Input
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                maxLength={3}
                placeholder="USD"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Invoice Date</Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Line Items (create mode only) */}
          {!isEditing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  Line Items
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem} className="gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  Add Item
                </Button>
              </div>

              {lineItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
                  No line items yet. Add items from the catalog or create custom entries.
                </p>
              )}

              <div className="space-y-3">
                {lineItems.map((item, idx) => (
                  <div
                    key={item.tempId}
                    className="border rounded-lg p-3 space-y-3 relative bg-muted/20"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-mono">
                        Item #{idx + 1}
                      </span>
                      {lineItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => removeLineItem(item.tempId)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    {/* Product selector */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Product (optional)</Label>
                      <Select
                        value={item.productId || "custom"}
                        onValueChange={(val) => selectProduct(item.tempId, val)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Custom item" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">
                            <span className="text-muted-foreground">Custom item</span>
                          </SelectItem>
                          {productsList.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              <div className="flex items-center gap-2">
                                <Package className="h-3 w-3 text-muted-foreground" />
                                {p.name}{" "}
                                <span className="text-muted-foreground text-[10px]">
                                  ${parseFloat(p.basePrice).toFixed(2)}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-xs">Description</Label>
                        <Input
                          className="h-8 text-sm"
                          value={item.description}
                          onChange={(e) =>
                            updateLineItem(item.tempId, "description", e.target.value)
                          }
                          placeholder="Item description"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Qty</Label>
                        <Input
                          className="h-8 text-sm font-mono"
                          value={item.quantity}
                          onChange={(e) =>
                            updateLineItem(item.tempId, "quantity", e.target.value)
                          }
                          placeholder="1"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Unit Price</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-1.5 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            className="h-8 text-sm font-mono pl-6"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateLineItem(item.tempId, "unitPrice", e.target.value)
                            }
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Tax Rate (decimal)</Label>
                        <Input
                          className="h-8 text-sm font-mono"
                          value={item.taxRate || ""}
                          onChange={(e) =>
                            updateLineItem(item.tempId, "taxRate", e.target.value)
                          }
                          placeholder="0.2"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Discount Type</Label>
                        <Select
                          value={item.discountType || "none"}
                          onValueChange={(val) =>
                            updateLineItem(
                              item.tempId,
                              "discountType",
                              val === "none" ? "" : val
                            )
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="FIXED">Fixed ($)</SelectItem>
                            <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Discount Value</Label>
                        <Input
                          className="h-8 text-sm font-mono"
                          value={item.discountValue || ""}
                          onChange={(e) =>
                            updateLineItem(item.tempId, "discountValue", e.target.value)
                          }
                          placeholder="0"
                          disabled={!item.discountType}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isEditing && (
            <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              To manage line items on an existing invoice, use the{" "}
              <strong>View Details</strong> page where you can add, edit, and remove
              individual items.
            </p>
          )}

          {/* Notes & Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Thank you for your business."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Terms</Label>
              <Textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Payment due within 30 days."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                ? "Save Changes"
                : "Create Invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
