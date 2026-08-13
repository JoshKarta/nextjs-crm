"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  StickyNote,
  Tag,
  Plus,
  Pencil,
  Trash2,
  Building2,
  User,
  Mail,
  Phone,
  CheckCircle,
} from "lucide-react";
import { AddressFormDialog } from "./address-form-dialog";
import { NoteFormDialog } from "./note-form-dialog";
import { TagInput } from "./tag-input";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ContactDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string | null;
  onContactUpdated: () => void;
}

export function ContactDetailSheet({
  isOpen,
  onClose,
  contactId,
  onContactUpdated,
}: ContactDetailSheetProps) {
  // Sub-modal states
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressToEdit, setAddressToEdit] = useState<any>(null);

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState<any>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "address" | "note";
    id: string;
  } | null>(null);

  // Fetch full contact details with relations
  const { data, mutate, isLoading } = useSWR(
    contactId && isOpen ? `/api/contacts/${contactId}` : null,
    fetcher
  );

  const contact = data?.contact;

  const handleAddressSuccess = () => {
    mutate();
    onContactUpdated();
  };

  const handleNoteSuccess = () => {
    mutate();
    onContactUpdated();
  };

  const handleDeleteItem = async () => {
    if (!deleteConfirm || !contactId) return;

    try {
      const endpoint =
        deleteConfirm.type === "address"
          ? `/api/contacts/${contactId}/addresses/${deleteConfirm.id}`
          : `/api/contacts/${contactId}/notes/${deleteConfirm.id}`;

      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) throw new Error(`Failed to delete ${deleteConfirm.type}`);

      toast.success(
        `${deleteConfirm.type === "address" ? "Address" : "Note"} deleted`
      );
      mutate();
      onContactUpdated();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setDeleteConfirm(null);
    }
  };

  if (!contactId) return null;

  const displayName = contact
    ? contact.type === "COMPANY"
      ? contact.companyName
      : [contact.firstName, contact.lastName].filter(Boolean).join(" ")
    : "Contact Details";

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full! sm:max-w-3xl overflow-y-auto p-6 rounded-l-xl">
          <SheetHeader className="pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                {contact?.type === "COMPANY" ? (
                  <Building2 className="h-6 w-6" />
                ) : (
                  <User className="h-6 w-6" />
                )}
              </div>
              <div>
                <SheetTitle className="text-xl">{displayName}</SheetTitle>
                <SheetDescription className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {contact?.type}
                  </Badge>
                  {contact?.status && (
                    <Badge
                      variant={contact.status === "ACTIVE" ? "default" : "destructive"}
                      className={cn(contact.status === "ACTIVE" ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800" : "","text-xs")}
                    >
                      {contact.status}
                    </Badge>
                  )}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {isLoading || !contact ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading contact details...
            </div>
          ) : (
            <div className="py-6 space-y-6">
              {/* Quick Info Card */}
              <Card>
                <CardContent className="p-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{contact.email || "No email"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{contact.phone || "No phone"}</span>
                  </div>
                  {contact.company && (
                    <div className="flex items-center gap-2 col-span-2">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>Company: {contact.company.companyName}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tabs for relations */}
              <Tabs defaultValue="addresses" className="w-full">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="addresses" className="flex items-center gap-1.5 text-xs">
                    <MapPin className="h-3.5 w-3.5" />
                    Addresses ({contact.addresses?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="flex items-center gap-1.5 text-xs">
                    <StickyNote className="h-3.5 w-3.5" />
                    Notes ({contact.notes?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="tags" className="flex items-center gap-1.5 text-xs">
                    <Tag className="h-3.5 w-3.5" />
                    Tags ({contact.contactTags?.length || 0})
                  </TabsTrigger>
                </TabsList>

                {/* ADDRESSES TAB */}
                <TabsContent value="addresses" className="space-y-4 pt-4">
                  <div className="flex justify-between items-center mt-2">
                    <h4 className="text-sm font-medium">Contact Addresses</h4>
                    <Button
                      size="sm"
                      onClick={() => {
                        setAddressToEdit(null);
                        setIsAddressModalOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Address
                    </Button>
                  </div>

                  {contact.addresses?.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic py-4 text-center">
                      No addresses added yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {contact.addresses.map((addr: any) => (
                        <Card key={addr.id} className="relative">
                          <CardContent className="p-4 flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {addr.type}
                                </Badge>
                                {addr.isPrimary && (
                                  <Badge className="text-[10px] bg-green-600 text-white flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" /> Primary
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm font-medium pt-1">{addr.line1}</p>
                              {addr.line2 && (
                                <p className="text-xs text-muted-foreground">{addr.line2}</p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {[addr.city, addr.state, addr.postalCode, addr.country]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => {
                                  setAddressToEdit(addr);
                                  setIsAddressModalOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive"
                                onClick={() =>
                                  setDeleteConfirm({ type: "address", id: addr.id })
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* NOTES TAB */}
                <TabsContent value="notes" className="space-y-4 pt-4">
                  <div className="flex justify-between items-center mt-2">
                    <h4 className="text-sm font-medium">Contact Notes</h4>
                    <Button
                      size="sm"
                      onClick={() => {
                        setNoteToEdit(null);
                        setIsNoteModalOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Note
                    </Button>
                  </div>

                  {contact.notes?.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic py-4 text-center">
                      No notes added yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {contact.notes.map((note: any) => (
                        <Card key={note.id}>
                          <CardContent className="p-4 flex justify-between items-start gap-2">
                            <div className="space-y-1">
                              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                              <p className="text-[11px] text-muted-foreground pt-1">
                                {format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => {
                                  setNoteToEdit(note);
                                  setIsNoteModalOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive"
                                onClick={() =>
                                  setDeleteConfirm({ type: "note", id: note.id })
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* TAGS TAB */}
                <TabsContent value="tags" className="space-y-4 pt-4">
                  <h4 className="text-sm font-medium mt-2">Manage Tags</h4>
                  <TagInput
                    contactId={contact.id}
                    attachedTags={contact.contactTags || []}
                    onTagsUpdated={() => {
                      mutate();
                      onContactUpdated();
                    }}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Relation Modals */}
      <AddressFormDialog
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSuccess={handleAddressSuccess}
        contactId={contactId}
        addressToEdit={addressToEdit}
      />

      <NoteFormDialog
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        onSuccess={handleNoteSuccess}
        contactId={contactId}
        noteToEdit={noteToEdit}
      />

      <ConfirmationDialog
        isOpen={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteItem}
        title={`Delete ${deleteConfirm?.type === "address" ? "Address" : "Note"}`}
        description={`Are you sure you want to delete this ${
          deleteConfirm?.type === "address" ? "address" : "note"
        }? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="destructive"
      />
    </>
  );
}
