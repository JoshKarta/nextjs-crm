"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Package,
  Wrench,
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Archive,
  RotateCcw,
  Eye,
  LayoutGrid,
  List,
  Layers,
  Tag,
  DollarSign,
} from "lucide-react";
import { ProductFormDialog, ProductToEdit } from "./product-form-dialog";
import { ProductArchiveDialog } from "./product-archive-dialog";
import { ProductRestoreDialog } from "./product-restore-dialog";
import { CategoryFormDialog } from "./category-form-dialog";
import type { Product, ProductCategory } from "@/db/schema";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ProductsTable() {
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<ProductToEdit | null>(null);
  
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [productToArchive, setProductToArchive] = useState<{ id: string; name: string; sku: string } | null>(null);

  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [productToRestore, setProductToRestore] = useState<{ id: string; name: string; sku: string } | null>(null);

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  // Fetch Categories
  const { data: categoriesData, mutate: mutateCategories } = useSWR("/api/categories", fetcher);
  const categories: ProductCategory[] = categoriesData?.categories || [];

  // Build SWR Key for Products
  const queryParams = new URLSearchParams();
  if (search) queryParams.set("query", search);
  if (typeFilter !== "all") queryParams.set("type", typeFilter);
  if (statusFilter !== "all") queryParams.set("status", statusFilter.toUpperCase());
  if (categoryFilter !== "all") queryParams.set("categoryId", categoryFilter);
  queryParams.set("selectableOnly", statusFilter === "active" ? "true" : "false");
  queryParams.set("page", page.toString());
  queryParams.set("limit", "20");

  const { data: productsData, mutate: mutateProducts, isLoading } = useSWR(
    `/api/products?${queryParams.toString()}`,
    fetcher
  );

  const productsList: Product[] = productsData?.products || [];

  const handleOpenCreate = () => {
    setProductToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setProductToEdit({
      id: p.id,
      name: p.name,
      sku: p.sku,
      type: p.type as "PRODUCT" | "SERVICE",
      basePrice: p.basePrice,
      currency: p.currency,
      taxRate: p.taxRate,
      defaultUnit: p.defaultUnit,
      categoryId: p.categoryId,
      description: p.description,
    });
    setIsFormOpen(true);
  };

  const handleOpenArchive = (p: Product) => {
    setProductToArchive({ id: p.id, name: p.name, sku: p.sku });
    setIsArchiveOpen(true);
  };

  const handleOpenRestore = (p: Product) => {
    setProductToRestore({ id: p.id, name: p.name, sku: p.sku });
    setIsRestoreOpen(true);
  };

  const getCategoryName = (catId?: string | null) => {
    if (!catId) return null;
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.name : null;
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or SKU..."
              className="pl-8"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Type Filter */}
          <Select
            value={typeFilter}
            onValueChange={(val) => {
              setTypeFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="PRODUCT">Products</SelectItem>
              <SelectItem value="SERVICE">Services</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="all">All Statuses</SelectItem>
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select
            value={categoryFilter}
            onValueChange={(val) => {
              setCategoryFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* View Mode Toggle & Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="border rounded-md p-0.5 flex items-center bg-muted/30">
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5"
              onClick={() => setViewMode("table")}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "cards" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5"
              onClick={() => setViewMode("cards")}
              title="Card Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={() => setIsCategoryOpen(true)} className="gap-1.5">
            <Layers className="h-4 w-4" />
            Categories
          </Button>

          <Button size="sm" onClick={handleOpenCreate} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Main Content Area: Table vs Cards */}
      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground text-sm">Loading catalog...</div>
      ) : productsList.length === 0 ? (
        <div className="border rounded-lg p-12 text-center space-y-3">
          <div className="flex justify-center">
            <Package className="h-10 w-10 text-muted-foreground opacity-50" />
          </div>
          <h3 className="font-semibold text-lg">No Products or Services Found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            No catalog items match your search criteria. Create your first item or clear filters.
          </p>
          <Button size="sm" onClick={handleOpenCreate} className="gap-2 mt-2">
            <Plus className="h-4 w-4" />
            Create Item
          </Button>
        </div>
      ) : viewMode === "table" ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item / SKU</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Base Price</TableHead>
                <TableHead>Tax Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productsList.map((product) => {
                const categoryName = getCategoryName(product.categoryId);
                const taxPercent = (parseFloat(product.taxRate || "0") * 100).toFixed(1);
                const isArchived = product.status === "ARCHIVED" || product.deletedAt != null;

                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div>
                        <Link
                          href={`/dashboard/products/${product.id}`}
                          className="font-medium text-foreground hover:underline flex items-center gap-1.5"
                        >
                          {product.name}
                        </Link>
                        <span className="text-xs text-muted-foreground font-mono">
                          SKU: {product.sku}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1 font-normal">
                        {product.type === "PRODUCT" ? (
                          <>
                            <Package className="h-3 w-3 text-blue-500" /> Product
                          </>
                        ) : (
                          <>
                            <Wrench className="h-3 w-3 text-amber-500" /> Service
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {categoryName ? (
                        <Badge variant="secondary" className="font-normal text-xs">
                          {categoryName}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono font-medium">
                      {product.currency} ${parseFloat(product.basePrice).toFixed(2)}
                      {product.defaultUnit && (
                        <span className="text-xs text-muted-foreground font-normal">
                          {" "}/ {product.defaultUnit}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {taxPercent}%
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isArchived ? "destructive" : "default"}
                        className="text-xs font-normal"
                      >
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/dashboard/products/${product.id}`}
                              className="cursor-pointer"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOpenEdit(product)}
                            className="cursor-pointer"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Item
                          </DropdownMenuItem>
                          {isArchived ? (
                            <DropdownMenuItem
                              onClick={() => handleOpenRestore(product)}
                              className="cursor-pointer text-emerald-600 focus:text-emerald-600"
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Restore Item
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleOpenArchive(product)}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Archive Item
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productsList.map((product) => {
            const categoryName = getCategoryName(product.categoryId);
            const taxPercent = (parseFloat(product.taxRate || "0") * 100).toFixed(1);
            const isArchived = product.status === "ARCHIVED" || product.deletedAt != null;

            return (
              <Card key={product.id} className="relative hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge variant="outline" className="mb-1.5 gap-1 font-normal text-xs">
                        {product.type === "PRODUCT" ? (
                          <>
                            <Package className="h-3 w-3 text-blue-500" /> Product
                          </>
                        ) : (
                          <>
                            <Wrench className="h-3 w-3 text-amber-500" /> Service
                          </>
                        )}
                      </Badge>
                      <CardTitle className="text-base font-semibold">
                        <Link
                          href={`/dashboard/products/${product.id}`}
                          className="hover:underline flex items-center gap-1.5"
                        >
                          {product.name}
                        </Link>
                      </CardTitle>
                      <span className="text-xs text-muted-foreground font-mono">
                        SKU: {product.sku}
                      </span>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-1">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/products/${product.id}`} className="cursor-pointer">
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEdit(product)} className="cursor-pointer">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Item
                        </DropdownMenuItem>
                        {isArchived ? (
                          <DropdownMenuItem
                            onClick={() => handleOpenRestore(product)}
                            className="cursor-pointer text-emerald-600"
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Restore
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleOpenArchive(product)}
                            className="cursor-pointer text-destructive"
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-sm pt-0">
                  {product.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between border-t pt-3">
                    <div>
                      <span className="text-xs text-muted-foreground block">Base Price</span>
                      <span className="font-mono font-semibold text-lg text-primary">
                        {product.currency} ${parseFloat(product.basePrice).toFixed(2)}
                      </span>
                      {product.defaultUnit && (
                        <span className="text-xs text-muted-foreground"> / {product.defaultUnit}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block">Tax</span>
                      <span className="font-mono font-medium text-xs bg-muted px-2 py-1 rounded">
                        {taxPercent}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    {categoryName ? (
                      <Badge variant="secondary" className="font-normal text-xs">
                        {categoryName}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground italic">Uncategorized</span>
                    )}

                    <Badge
                      variant={isArchived ? "destructive" : "default"}
                      className="text-[10px] font-normal"
                    >
                      {product.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <ProductFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => mutateProducts()}
        productToEdit={productToEdit}
        categories={categories}
      />

      <ProductArchiveDialog
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        onSuccess={() => mutateProducts()}
        product={productToArchive}
      />

      <ProductRestoreDialog
        isOpen={isRestoreOpen}
        onClose={() => setIsRestoreOpen(false)}
        onSuccess={() => mutateProducts()}
        product={productToRestore}
      />

      <CategoryFormDialog
        isOpen={isCategoryOpen}
        onClose={() => setIsCategoryOpen(false)}
        onSuccess={() => mutateCategories()}
        categories={categories}
      />
    </div>
  );
}
