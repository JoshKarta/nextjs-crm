"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Package,
  Wrench,
  Edit,
  Archive,
  RotateCcw,
  Clock,
  DollarSign,
  Calculator,
  History,
  Tag,
  Layers,
  Calendar,
  User,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { ProductFormDialog, ProductToEdit } from "@/components/products/product-form-dialog";
import { ProductArchiveDialog } from "@/components/products/product-archive-dialog";
import { ProductRestoreDialog } from "@/components/products/product-restore-dialog";
import type { AuditEvent, Product, ProductCategory } from "@/db/schema";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ProductWithDetails extends Product {
  category?: ProductCategory | null;
  auditLogs?: AuditEvent[];
}

export function ProductDetailsClient({ productId }: { productId: string }) {
  const router = useRouter();
  const [calcQuantity, setCalcQuantity] = useState(1);

  // Modals state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);

  // Fetch product data
  const { data, mutate, isLoading, error } = useSWR(`/api/products/${productId}`, fetcher);
  // Fetch categories for edit form dropdown
  const { data: categoriesData } = useSWR("/api/categories", fetcher);

  const product: ProductWithDetails | undefined = data?.product;
  const categories: ProductCategory[] = categoriesData?.categories || [];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-5xl text-center text-muted-foreground">
        Loading product details...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-5xl text-center space-y-4">
        <h2 className="text-xl font-bold">Product Not Found</h2>
        <p className="text-muted-foreground text-sm">
          The requested product or service could not be found or has been deleted.
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard/products">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
          </Link>
        </Button>
      </div>
    );
  }

  const basePriceNum = parseFloat(product.basePrice || "0");
  const taxRateNum = parseFloat(product.taxRate || "0");
  const taxPercent = (taxRateNum * 100).toFixed(2);
  const isArchived = product.status === "ARCHIVED" || product.deletedAt != null;

  // Calculation preview values
  const subtotal = basePriceNum * calcQuantity;
  const taxAmount = subtotal * taxRateNum;
  const total = subtotal + taxAmount;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
      {/* Top Breadcrumb & Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{product.name}</h1>
              <Badge
                variant={isArchived ? "destructive" : "default"}
                className="font-normal text-xs"
              >
                {product.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">SKU: {product.sku}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)} className="gap-1.5">
            <Edit className="h-4 w-4" />
            Edit Item
          </Button>
          {isArchived ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRestoreOpen(true)}
              className="gap-1.5 text-emerald-600 border-emerald-600/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
            >
              <RotateCcw className="h-4 w-4" />
              Restore
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsArchiveOpen(true)}
              className="gap-1.5"
            >
              <Archive className="h-4 w-4" />
              Archive
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Product Specifications */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Item Overview & Specs</span>
                <Badge variant="outline" className="gap-1 font-normal">
                  {product.type === "PRODUCT" ? (
                    <>
                      <Package className="h-3.5 w-3.5 text-blue-500" /> Physical Product
                    </>
                  ) : (
                    <>
                      <Wrench className="h-3.5 w-3.5 text-amber-500" /> Service Item
                    </>
                  )}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Description */}
              <div>
                <span className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                  Description
                </span>
                <p className="text-sm text-foreground bg-muted/30 p-3 rounded-md border min-h-[60px] whitespace-pre-wrap">
                  {product.description || <span className="italic text-muted-foreground">No description provided for this catalog item.</span>}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t pt-4">
                <div>
                  <span className="text-xs text-muted-foreground block">Base Unit Price</span>
                  <span className="text-xl font-bold font-mono text-primary">
                    {product.currency} ${basePriceNum.toFixed(2)}
                  </span>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block">Tax Rate</span>
                  <span className="text-lg font-semibold font-mono">
                    {taxPercent}%
                  </span>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block">Default Unit</span>
                  <span className="text-base font-medium">
                    {product.defaultUnit || "Unit"}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground block">Category</span>
                  <span className="font-medium">
                    {product.category?.name || "Uncategorized"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Created At</span>
                  <span className="font-medium">
                    {new Date(product.createdAt).toLocaleDateString("en-US", {
                      dateStyle: "medium",
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Pricing Calculator Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Invoice Pricing Calculator Preview
              </CardTitle>
              <CardDescription>
                Simulate line-item totals and tax application for quotes and invoices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-32">
                  <Label htmlFor="quantity" className="text-xs">
                    Quantity ({product.defaultUnit || "units"})
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    value={calcQuantity}
                    onChange={(e) => setCalcQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
              </div>

              <div className="bg-muted/40 p-4 rounded-lg border space-y-2 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal ({calcQuantity} x ${basePriceNum.toFixed(2)}):</span>
                  <span>{product.currency} ${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applied Tax ({taxPercent}%):</span>
                  <span>{product.currency} ${taxAmount.toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-base text-primary">
                  <span>Estimated Total:</span>
                  <span>{product.currency} ${total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Audit Event Timeline */}
        <div className="space-y-6">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Audit History & Changes
              </CardTitle>
              <CardDescription>
                Tracked price adjustments, updates, and lifecycle events.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {!product.auditLogs || product.auditLogs.length === 0 ? (
                <div className="text-xs text-muted-foreground italic py-4 text-center">
                  No audit events recorded yet.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {product.auditLogs.map((log) => {
                    const isPriceChange = log.action === "PRICE_CHANGE";
                    const isCreate = log.action === "CREATE";

                    return (
                      <div key={log.id} className="relative group">
                        {/* Timeline Icon Dot */}
                        <div className={`absolute -left-[23px] top-0.5 h-4 w-4 rounded-full border bg-background flex items-center justify-center ${
                          isPriceChange ? "border-amber-500 text-amber-500" : isCreate ? "border-emerald-500 text-emerald-500" : "border-primary text-primary"
                        }`}>
                          <div className="h-1.5 w-1.5 rounded-full bg-current" />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold">
                              {log.action === "PRICE_CHANGE" ? "Price / Tax Change" : log.action}
                            </span>
                            <span className="text-muted-foreground text-[10px]">
                              {new Date(log.timestamp).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          {/* Audit Metadata details */}
                          {log.metadata && (
                            <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border space-y-1 font-mono">
                              {Boolean(log.metadata.basePrice) && (
                                <div>
                                  Price: ${String((log.metadata.basePrice as any)?.from)} → ${String((log.metadata.basePrice as any)?.to)}
                                </div>
                              )}
                              {Boolean(log.metadata.taxRate) && (
                                <div>
                                  Tax Rate: {((parseFloat((log.metadata.taxRate as any)?.from) || 0) * 100).toFixed(1)}% → {((parseFloat((log.metadata.taxRate as any)?.to) || 0) * 100).toFixed(1)}%
                                </div>
                              )}
                              {Boolean(log.metadata.changedFields) && (
                                <div>Fields: {Array.isArray(log.metadata.changedFields) ? log.metadata.changedFields.join(", ") : String(log.metadata.changedFields)}</div>
                              )}
                              {Boolean(log.metadata.sku) && <div>SKU: {String(log.metadata.sku)}</div>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <ProductFormDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={() => mutate()}
        productToEdit={{
          id: product.id,
          name: product.name,
          sku: product.sku,
          type: product.type as "PRODUCT" | "SERVICE",
          basePrice: product.basePrice,
          currency: product.currency,
          taxRate: product.taxRate,
          defaultUnit: product.defaultUnit,
          categoryId: product.categoryId,
          description: product.description,
        }}
        categories={categories}
      />

      <ProductArchiveDialog
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        onSuccess={() => mutate()}
        product={{ id: product.id, name: product.name, sku: product.sku }}
      />

      <ProductRestoreDialog
        isOpen={isRestoreOpen}
        onClose={() => setIsRestoreOpen(false)}
        onSuccess={() => mutate()}
        product={{ id: product.id, name: product.name, sku: product.sku }}
      />
    </div>
  );
}
