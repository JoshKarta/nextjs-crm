"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  FileText,
  Clock,
  User,
  Building2,
  DollarSign,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  Eye,
  Package,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { InvoicePreview } from "@/components/invoices/invoice-preview";
import { InvoiceStatusDialog } from "@/components/invoices/invoice-status-dialog";
import type { Invoice, InvoiceItem, Contact, AuditEvent, Product } from "@/db/schema";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface InvoiceDetailsClientProps {
  invoiceId: string;
}

export function InvoiceDetailsClient({ invoiceId }: InvoiceDetailsClientProps) {
  const router = useRouter();

  // SWR fetch invoice details
  const { data, mutate, isLoading } = useSWR(`/api/invoices/${invoiceId}`, fetcher);
  const invoiceData = data?.invoice;

  // SWR fetch products for adding items
  const { data: productsData } = useSWR(
    invoiceData?.status === "DRAFT" ? "/api/products?selectableOnly=true&limit=100" : null,
    fetcher
  );
  const productsList: Product[] = productsData?.products || [];

  // Line item modal state
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);

  // Line item form state
  const [selectedProductId, setSelectedProductId] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [taxRate, setTaxRate] = useState("0");
  const [discountType, setDiscountType] = useState<"FIXED" | "PERCENTAGE" | "none">("none");
  const [discountValue, setDiscountValue] = useState("");
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);

  // Status dialog state
  const [statusAction, setStatusAction] = useState<"finalize" | "void" | "delete" | null>(null);

  if (isLoading) {
    return <div className="p-12 text-center text-muted-foreground text-sm">Loading invoice details...</div>;
  }

  if (!invoiceData) {
    return (
      <div className="p-12 text-center space-y-4">
        <h3 className="text-lg font-semibold">Invoice Not Found</h3>
        <Button variant="outline" asChild>
          <Link href="/dashboard/invoices">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
          </Link>
        </Button>
      </div>
    );
  }

  const invoice: Invoice = invoiceData;
  const items: InvoiceItem[] = invoiceData.items || [];
  const contact: Contact | null = invoiceData.contact;
  const auditLogs: AuditEvent[] = invoiceData.auditLogs || [];

  const isDraft = invoice.status === "DRAFT";
  const isVoid = invoice.status === "VOID";

  const handleOpenAddItem = () => {
    setEditingItem(null);
    setSelectedProductId("");
    setDescription("");
    setQuantity("1");
    setUnitPrice("0");
    setTaxRate("0");
    setDiscountType("none");
    setDiscountValue("");
    setIsAddItemOpen(true);
  };

  const handleOpenEditItem = (item: InvoiceItem) => {
    setEditingItem(item);
    setSelectedProductId(item.productId || "");
    setDescription(item.description);
    setQuantity(item.quantity);
    setUnitPrice(item.unitPrice);
    setTaxRate(item.taxRate);
    setDiscountType(item.discountType || "none");
    setDiscountValue(item.discountValue || "");
    setIsAddItemOpen(true);
  };

  const handleSelectProduct = (prodId: string) => {
    setSelectedProductId(prodId);
    if (prodId === "custom" || !prodId) return;
    const prod = productsList.find((p) => p.id === prodId);
    if (prod) {
      setDescription(prod.name);
      setUnitPrice(prod.basePrice);
      setTaxRate(prod.taxRate);
    }
  };

  const handleSaveLineItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }

    setIsSubmittingItem(true);
    try {
      const payload: any = {
        productId: selectedProductId === "custom" || !selectedProductId ? undefined : selectedProductId,
        description: description.trim(),
        quantity: quantity && quantity.trim() !== "" ? quantity.trim() : "1",
        unitPrice: unitPrice && unitPrice.trim() !== "" ? unitPrice.trim() : "0",
        taxRate: taxRate && taxRate.trim() !== "" ? taxRate.trim() : "0",
        discountType: discountType && discountType !== "none" ? discountType : undefined,
        discountValue: discountType !== "none" && discountValue && discountValue.trim() !== "" ? discountValue.trim() : undefined,
      };

      const url = editingItem
        ? `/api/invoices/${invoiceId}/items/${editingItem.id}`
        : `/api/invoices/${invoiceId}/items`;
      const method = editingItem ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to save line item");

      toast.success(editingItem ? "Item updated!" : "Item added!");
      setIsAddItemOpen(false);
      mutate();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleDeleteLineItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/items/${itemId}`, {
        method: "DELETE",
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to remove item");
      toast.success("Item removed");
      mutate();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    }
  };

  const getContactName = () => {
    if (!contact) return "—";
    if (contact.type === "COMPANY") return contact.companyName || "Unnamed Company";
    return [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Unnamed Individual";
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/invoices">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-mono tracking-tight">{invoice.invoiceNumber}</h1>
              <Badge
                variant={isDraft ? "secondary" : isVoid ? "destructive" : "default"}
                className="text-xs font-semibold"
              >
                {invoice.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Issued {new Date(invoice.invoiceDate).toLocaleDateString()} · Billed to{" "}
              <strong className="text-foreground">{getContactName()}</strong>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {isDraft && (
            <>
              <Button size="sm" onClick={() => setStatusAction("finalize")} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
                <CheckCircle2 className="h-4 w-4" /> Finalize Invoice
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setStatusAction("delete")} className="gap-1.5">
                <Trash2 className="h-4 w-4" /> Delete Draft
              </Button>
            </>
          )}

          {!isDraft && !isVoid && (
            <Button size="sm" variant="destructive" onClick={() => setStatusAction("void")} className="gap-1.5">
              <XCircle className="h-4 w-4" /> Void Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="items" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-md">
          <TabsTrigger value="items" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Items
          </TabsTrigger>
          <TabsTrigger value="totals" className="gap-1.5">
            <DollarSign className="h-3.5 w-3.5" /> Summary
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-1.5">
            <Eye className="h-3.5 w-3.5" /> Preview
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <History className="h-3.5 w-3.5" /> Activity
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Line Items */}
        <TabsContent value="items" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Line Items</CardTitle>
                <CardDescription>
                  {isDraft
                    ? "Add, update, or remove items on this draft invoice."
                    : "Line items are locked because this invoice is finalized."}
                </CardDescription>
              </div>
              {isDraft && (
                <Button size="sm" onClick={handleOpenAddItem} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Add Item
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 border rounded-lg border-dashed text-muted-foreground text-sm space-y-2">
                  <p>No line items found on this invoice.</p>
                  {isDraft && (
                    <Button size="sm" variant="outline" onClick={handleOpenAddItem} className="gap-1">
                      <Plus className="h-3.5 w-3.5" /> Add First Item
                    </Button>
                  )}
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Tax Rate</TableHead>
                        <TableHead className="text-right">Discount</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        {isDraft && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.description}</TableCell>
                          <TableCell className="text-center font-mono">{parseFloat(item.quantity)}</TableCell>
                          <TableCell className="text-right font-mono">
                            {invoice.currency} ${parseFloat(item.unitPrice).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {(parseFloat(item.taxRate) * 100).toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {parseFloat(item.discountAmount) > 0 ? (
                              <span className="text-emerald-600">
                                -${parseFloat(item.discountAmount).toFixed(2)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {invoice.currency} ${parseFloat(item.totalAmount).toFixed(2)}
                          </TableCell>
                          {isDraft && (
                            <TableCell className="text-right space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleOpenEditItem(item)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => handleDeleteLineItem(item.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Financial Summary */}
        <TabsContent value="totals" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Financial Totals</CardTitle>
                <CardDescription>Server-calculated monetary breakdown.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 font-mono text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Subtotal Amount</span>
                  <span>{invoice.currency} ${parseFloat(invoice.subtotalAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Total Discount</span>
                  <span className="text-emerald-600">-${parseFloat(invoice.discountAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Total Tax</span>
                  <span>+${parseFloat(invoice.taxAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b pb-2 font-bold text-base pt-1">
                  <span>Grand Total</span>
                  <span>{invoice.currency} ${parseFloat(invoice.totalAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-1 font-semibold text-orange-600">
                  <span>Amount Due</span>
                  <span>{invoice.currency} ${parseFloat(invoice.amountDue).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invoice Information</CardTitle>
                <CardDescription>Metadata, contact and terms.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Client Name</span>
                  <span className="font-medium">{getContactName()}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Issue Date</span>
                  <span>{new Date(invoice.invoiceDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Due Date</span>
                  <span>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "—"}</span>
                </div>
                {invoice.notes && (
                  <div className="pt-1">
                    <span className="text-xs text-muted-foreground font-semibold block">Notes</span>
                    <p className="text-xs mt-0.5">{invoice.notes}</p>
                  </div>
                )}
                {invoice.terms && (
                  <div className="pt-1">
                    <span className="text-xs text-muted-foreground font-semibold block">Terms</span>
                    <p className="text-xs mt-0.5">{invoice.terms}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: Template Preview */}
        <TabsContent value="preview" className="pt-4">
          <InvoicePreview invoice={invoiceData} />
        </TabsContent>

        {/* Tab 4: Audit Activity Log */}
        <TabsContent value="audit" className="pt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> Audit Event History
              </CardTitle>
              <CardDescription>Immutable log of actions performed on this invoice.</CardDescription>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No audit log entries recorded.</p>
              ) : (
                <div className="relative border-l pl-4 ml-2 space-y-4">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="relative space-y-1">
                      <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="text-[10px]">
                          {log.action}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground">
                        Performed by: {log.performedBy}
                      </p>
                      {log.metadata && (
                        <pre className="text-[11px] bg-muted/50 p-2 rounded text-muted-foreground font-mono">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Line Item Dialog */}
      <Dialog open={isAddItemOpen} onOpenChange={(open) => !open && setIsAddItemOpen(false)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Line Item" : "Add Line Item"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update item fields below." : "Pick a product from catalog or enter custom details."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveLineItem} className="space-y-4 py-2">
            {!editingItem && (
              <div className="space-y-2">
                <Label>Catalog Product (Optional)</Label>
                <Select value={selectedProductId} onValueChange={handleSelectProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Custom item..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom item</SelectItem>
                    {productsList.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} (${parseFloat(p.basePrice).toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Description *</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Item description"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  className="font-mono"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Price *</Label>
                <Input
                  className="font-mono"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label>Tax Rate (fraction)</Label>
                <Input
                  className="font-mono text-xs"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  placeholder="0.2"
                />
              </div>
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select
                  value={discountType}
                  onValueChange={(val: any) => setDiscountType(val)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="FIXED">Fixed ($)</SelectItem>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Discount Value</Label>
                <Input
                  className="font-mono text-xs"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  disabled={discountType === "none"}
                  placeholder="0"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddItemOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingItem}>
                {isSubmittingItem ? "Saving..." : editingItem ? "Save Changes" : "Add Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Status Action Confirmation Dialog */}
      {statusAction && (
        <InvoiceStatusDialog
          isOpen={true}
          onClose={() => setStatusAction(null)}
          onSuccess={() => {
            if (statusAction === "delete") {
              router.push("/dashboard/invoices");
            } else {
              mutate();
            }
          }}
          actionType={statusAction}
          invoice={invoice}
        />
      )}
    </div>
  );
}
