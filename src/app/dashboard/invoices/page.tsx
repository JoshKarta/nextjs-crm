import type { Metadata } from "next";
import Navbar from "@/components/landing/navbar";
import { InvoicesTable } from "@/components/invoices/invoices-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Invoices | Dashboard",
  description: "Manage client invoices, line items, status transitions, and template layouts",
};

export default async function InvoicesDashboardPage() {
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
                  <FileText className="h-6 w-6 text-primary" />
                  Invoices Management
                </CardTitle>
                <CardDescription className="mt-1">
                  Create, edit, finalize, and track client invoices. Design custom layout templates.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <InvoicesTable />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
