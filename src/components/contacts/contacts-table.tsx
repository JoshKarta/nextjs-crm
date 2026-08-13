"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  UserPlus,
  Building2,
  User,
  Pencil,
  Trash2,
  RotateCcw,
  Layers,
  Tag as TagIcon,
  CheckCircle,
  Archive,
  Phone,
  Mail,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { ContactFormDialog } from "./contact-form-dialog";
import { ContactDeleteDialog } from "./contact-delete-dialog";
import { ContactRestoreDialog } from "./contact-restore-dialog";
import { ContactDetailSheet } from "./contact-detail-sheet";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ContactsTable() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auth session check for admin privileges
  const { data: sessionData } = authClient.useSession();
  const isAdmin = sessionData?.user?.role === "admin";

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<any>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<any>(null);

  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [contactToRestore, setContactToRestore] = useState<any>(null);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [type, setType] = useState(searchParams.get("type") || "all");
  const [status, setStatus] = useState(searchParams.get("status") || "all");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const limit = 10;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (type && type !== "all") params.set("type", type);
    if (status && status !== "all") params.set("status", status);
    if (page > 1) params.set("page", String(page));
    router.replace(`?${params.toString()}`);
  }, [debouncedSearch, type, status, page, router]);

  // SWR query key
  const swrKey = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (type && type !== "all") params.set("type", type);
    if (status && status !== "all") params.set("status", status);
    params.set("page", String(page));
    params.set("limit", String(limit));
    return `/api/contacts?${params.toString()}`;
  }, [debouncedSearch, type, status, page, limit]);

  const { data, mutate, isLoading } = useSWR(swrKey, fetcher);

  // Fetch company contacts for dropdown in ContactFormDialog
  const { data: companiesData } = useSWR("/api/contacts?type=COMPANY&limit=50", fetcher);
  const companies = companiesData?.contacts || [];

  const contacts = data?.contacts || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const handleCreateNew = () => {
    setContactToEdit(null);
    setIsFormOpen(true);
  };

  const handleEdit = (contact: any) => {
    setContactToEdit(contact);
    setIsFormOpen(true);
  };

  const handleDelete = (contact: any) => {
    setContactToDelete(contact);
    setIsDeleteOpen(true);
  };

  const handleRestore = (contact: any) => {
    setContactToRestore(contact);
    setIsRestoreOpen(true);
  };

  const handleManageRelations = (contactId: string) => {
    setSelectedContactId(contactId);
    setIsSheetOpen(true);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          {Array.from({ length: totalPages }).map((_, i) => (
            <PaginationItem key={i + 1}>
              <PaginationLink
                isActive={page === i + 1}
                onClick={() => setPage(i + 1)}
                className="cursor-pointer"
              >
                {i + 1}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative w-full sm:w-[220px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8 text-sm"
            />
          </div>

          {/* Type Filter */}
          <Select
            value={type}
            onValueChange={(val) => {
              setType(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="INDIVIDUAL">Individuals</SelectItem>
              <SelectItem value="COMPANY">Companies</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={status}
            onValueChange={(val) => {
              setStatus(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="archived">Archived Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleCreateNew} className="flex items-center gap-2 shrink-0">
          <UserPlus className="h-4 w-4" /> Add Contact
        </Button>
      </div>

      {/* Contacts Table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <Table className="text-sm">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="px-4 py-3 font-medium">Contact Name</TableHead>
              <TableHead className="px-4 py-3 font-medium">Type</TableHead>
              <TableHead className="px-4 py-3 font-medium">Email & Phone</TableHead>
              <TableHead className="px-4 py-3 font-medium">Company</TableHead>
              <TableHead className="px-4 py-3 font-medium">Status</TableHead>
              <TableHead className="px-4 py-3 font-medium">Tags</TableHead>
              <TableHead className="px-4 py-3 font-medium text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="px-4 py-3"><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="px-4 py-3"><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="px-4 py-3"><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="px-4 py-3"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="px-4 py-3"><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="px-4 py-3"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="px-4 py-3 text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No contacts found. Click "Add Contact" to create one.
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact: any) => {
                const displayName =
                  contact.type === "COMPANY"
                    ? contact.companyName || "Unnamed Company"
                    : [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Unnamed Individual";

                const isArchived = Boolean(contact.deletedAt) || contact.status === "ARCHIVED";

                return (
                  <TableRow key={contact.id} className={isArchived ? "bg-muted/20 opacity-75" : ""}>
                    {/* Name */}
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-full bg-accent text-accent-foreground shrink-0">
                          {contact.type === "COMPANY" ? (
                            <Building2 className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                        </div>
                        <span className="font-medium text-foreground">{displayName}</span>
                      </div>
                    </TableCell>

                    {/* Type */}
                    <TableCell className="px-4 py-3">
                      <Badge variant="outline" className={cn(contact.type==="INDIVIDUAL" ?
                             "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700"
                           :   "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700")}>
                        {contact.type}
                      </Badge>
                    </TableCell>

                    {/* Contact Info */}
                    <TableCell className="px-4 py-3">
                      <div className="space-y-0.5 text-xs">
                        {contact.email && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span>{contact.email}</span>
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                        {!contact.email && !contact.phone && (
                          <span className="text-muted-foreground italic">No contact info</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Company */}
                    <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                      {contact.company?.companyName || "-"}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="px-4 py-3">
                      {isArchived ? (
                        <Badge
                          variant="destructive"
                          // className="bg-red-50! text-red-700! border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800 flex items-center gap-1 w-fit text-xs"
                        >
                          <Archive className="h-3 w-3" /> Archived
                        </Badge>
                      ) : (
                        <Badge
                          variant="default"
                          className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800 flex items-center gap-1 w-fit text-xs"
                        >
                          <CheckCircle className="h-3 w-3" /> Active
                        </Badge>
                      )}
                    </TableCell>

                    {/* Tags */}
                    <TableCell className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {contact.contactTags?.length > 0 ? (
                          contact.contactTags.map(({ tag }: any) => (
                            <Badge key={tag.id} variant="secondary" className="text-[10px] py-0 px-1.5">
                              <TagIcon className="h-2.5 w-2.5 mr-0.5" />
                              {tag.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">-</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Manage Relations */}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="Manage details & relations"
                          onClick={() => handleManageRelations(contact.id)}
                        >
                          <Layers className="h-4 w-4" />
                        </Button>

                        {/* Edit Contact */}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="Edit contact"
                          onClick={() => handleEdit(contact)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        {/* Soft Delete or Admin Restore */}
                        {isArchived ? (
                          isAdmin && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                              title="Restore contact (Admin)"
                              onClick={() => handleRestore(contact)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            title="Archive contact"
                            onClick={() => handleDelete(contact)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer / Pagination */}
      <div className="flex items-center justify-between px-2 pt-2">
        <span className="text-xs text-muted-foreground">
          Showing {contacts.length} of {total} contacts
        </span>
        {renderPagination()}
      </div>

      {/* Modals & Dialogs */}
      <ContactFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => mutate()}
        contactToEdit={contactToEdit}
        companies={companies}
      />

      <ContactDeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={() => mutate()}
        contact={contactToDelete}
      />

      <ContactRestoreDialog
        isOpen={isRestoreOpen}
        onClose={() => setIsRestoreOpen(false)}
        onSuccess={() => mutate()}
        contact={contactToRestore}
      />

      <ContactDetailSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        contactId={selectedContactId}
        onContactUpdated={() => mutate()}
      />
    </div>
  );
}
