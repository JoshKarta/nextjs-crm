import type { Metadata } from "next";
import Navbar from "@/components/landing/navbar";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Contact } from "lucide-react";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Contacts | Dashboard",
  description: "Manage contacts, addresses, notes, and tags",
};

export default async function ContactsDashboardPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Contact className="h-6 w-6 text-primary" />
                  Contacts Management
                </CardTitle>
                <CardDescription className="mt-1">
                  Manage individual & company contacts, addresses, notes, and tags.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ContactsTable />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
