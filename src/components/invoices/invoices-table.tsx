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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Eye,
  CheckCircle2,
  XCircle,
  Trash2,
  AlertTriangle,
  Clock,
  Palette,
} from "lucide-react";
import { InvoiceFormDialog } from "./invoice-form-dialog";
import { InvoiceStatusDialog } from "./invoice-status-dialog";
import { TemplateBuilderDialog } from "./template-builder-dialog";
import type { Invoice } from "@/db/schema";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type DisplayStatus = Invoice["status"] | "OVERDUE";

function getDisplayStatus(invoice: Pick<Invoice, "status" | "dueDate" | "amountDue">): DisplayStatus {
  const isOverdue =
    (invoice.status === "FINALIZED" || invoice.status === "PARTIALLY_PAID") &&
    invoice.dueDate !== null &&
    new Date(invoice.dueDate).getTime() < Date.now() &&
    parseFloat(invoice.amountDue) > 0;
  return isOverdue ? "OVERDUE" : invoice.status;
}

function StatusBadge({ status }: { status: DisplayStatus }) {
  const map: Record<DisplayStatus, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; className?: string }> = {
    DRAFT: { variant: "secondary", label: "Draft", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
    FINALIZED: { variant: "default", label: "Finalized", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
    PARTIALLY_PAID: { variant: "outline", label: "Partial", className: "border-amber-400 text-amber-700 dark:text-amber-400" },
    PAID: { variant: "default", label: "Paid", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300" },
    VOID: { variant: "destructive", label: "Void", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
    OVERDUE: { variant: "destructive", label: "Overdue", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
  };
  const cfg = map[status] || map.DRAFT;
  return (
    <Badge variant={cfg.variant} className={`text-xs font-medium ${cfg.className}`}>
      {status === "OVERDUE" && <AlertTriangle className="h-3 w-3 mr-1" />}
      {cfg.label}
    </Badge>
  );
}

export function InvoicesTable() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);

  const [statusAction, setStatusAction] = useState<{
    type: "finalize" | "void" | "delete";
    invoice: Invoice;
  } | null>(null);

  const [isTemplateBuilderOpen, setIsTemplateBuilderOpen] = useState(false);

  // Build SWR key
  const queryParams = new URLSearchParams();
  if (statusFilter !== "all" && statusFilter !== "overdue") queryParams.set("status", statusFilter.toUpperCase());
  if (statusFilter === "overdue") queryParams.set("overdueOnly", "true");
  queryParams.set("page", page.toString());
  queryParams.set("limit", "25");

  const { data, mutate, isLoading } = useSWR(
    `/api/invoices?${queryParams.toString()}`,
    fetcher
  );

  const invoicesList: Invoice[] = data?.invoices || [];

  // Client-side name/number search filter
  const filtered = search.trim()
    ? invoicesList.filter((inv) =>
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase())
      )
    : invoicesList;

  const handleOpenCreate = () => {
    setInvoiceToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (inv: Invoice) => {
    setInvoiceToEdit(inv);
    setIsFormOpen(true);
  };

  // Summary metrics
  const totalDraft = invoicesList.filter((i) => i.status === "DRAFT").length;
  const totalFinalized = invoicesList.filter((i) => i.status === "FINALIZED" || i.status === "PARTIALLY_PAID").length;
  const totalOverdue = invoicesList.filter((i) => getDisplayStatus(i) === "OVERDUE").length;
  const totalPaid = invoicesList.filter((i) => i.status === "PAID").length;

  return (
    <div className="space-y-4">
      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border p-3 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Drafts</p>
          <p className="text-2xl font-bold tabular-nums">{totalDraft}</p>
        </div>
        <div className="rounded-lg border p-3 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Outstanding</p>
          <p className="text-2xl font-bold tabular-nums text-blue-600">{totalFinalized}</p>
        </div>
        <div className="rounded-lg border p-3 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Overdue</p>
          <p className="text-2xl font-bold tabular-nums text-orange-600">{totalOverdue}</p>
        </div>
        <div className="rounded-lg border p-3 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Paid</p>
          <p className="text-2xl font-bold tabular-nums text-emerald-600">{totalPaid}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by invoice number..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="FINALIZED">Finalized</SelectItem>
              <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="VOID">Void</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTemplateBuilderOpen(true)}
            className="gap-1.5"
          >
            <Palette className="h-4 w-4" />
            Templates
          </Button>

          <Button size="sm" onClick={handleOpenCreate} className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground text-sm">Loading invoices...</div>
      ) : filtered.length === 0 ? (
        <div className="border rounded-lg p-12 text-center space-y-3">
          <div className="flex justify-center">
            <FileText className="h-10 w-10 text-muted-foreground opacity-50" />
          </div>
          <h3 className="font-semibold text-lg">No Invoices Found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            No invoices match your filters. Create your first invoice to get started.
          </p>
          <Button size="sm" onClick={handleOpenCreate} className="gap-2 mt-2">
            <Plus className="h-4 w-4" />
            Create Invoice
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Amount Due</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((invoice) => {
                const displayStatus = getDisplayStatus(invoice);
                const isDraft = invoice.status === "DRAFT";
                const isVoid = invoice.status === "VOID";
                const canFinalize = isDraft;
                const canVoid = !isDraft && !isVoid;

                return (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/invoices/${invoice.id}`}
                        className="font-medium text-foreground hover:underline font-mono text-sm"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {invoice.invoiceDate
                        ? new Date(invoice.invoiceDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {invoice.dueDate ? (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(invoice.dueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={displayStatus} />
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {invoice.currency} {parseFloat(invoice.totalAmount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {parseFloat(invoice.amountDue) > 0 ? (
                        <span className="text-orange-600">
                          {invoice.currency} {parseFloat(invoice.amountDue).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-emerald-600">$0.00</span>
                      )}
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
                              href={`/dashboard/invoices/${invoice.id}`}
                              className="cursor-pointer"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          {isDraft && (
                            <DropdownMenuItem
                              onClick={() => handleOpenEdit(invoice)}
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Invoice
                            </DropdownMenuItem>
                          )}
                          {canFinalize && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  setStatusAction({ type: "finalize", invoice })
                                }
                                className="cursor-pointer text-blue-600 focus:text-blue-600"
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Finalize
                              </DropdownMenuItem>
                            </>
                          )}
                          {canVoid && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  setStatusAction({ type: "void", invoice })
                                }
                                className="cursor-pointer text-destructive focus:text-destructive"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Void Invoice
                              </DropdownMenuItem>
                            </>
                          )}
                          {isDraft && (
                            <DropdownMenuItem
                              onClick={() =>
                                setStatusAction({ type: "delete", invoice })
                              }
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Draft
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
      )}

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {filtered.length} invoices</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="px-2">Page {page}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={invoicesList.length < 25}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <InvoiceFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setInvoiceToEdit(null);
        }}
        onSuccess={() => mutate()}
        invoiceToEdit={invoiceToEdit}
      />

      {statusAction && (
        <InvoiceStatusDialog
          isOpen={true}
          onClose={() => setStatusAction(null)}
          onSuccess={() => mutate()}
          actionType={statusAction.type}
          invoice={statusAction.invoice}
        />
      )}

      <TemplateBuilderDialog
        isOpen={isTemplateBuilderOpen}
        onClose={() => setIsTemplateBuilderOpen(false)}
      />
    </div>
  );
}
