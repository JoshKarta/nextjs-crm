import type { Metadata } from "next";
import Navbar from "@/components/landing/navbar";
import { InvoiceDetailsClient } from "./invoice-details-client";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Invoice Details | Dashboard",
  description: "View invoice line items, financial breakdown, audit history, and layout preview",
};

export default async function InvoiceDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession();
  if (!session) {
    redirect("/auth/login");
  }

  const { id } = await params;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <InvoiceDetailsClient invoiceId={id} />
      </div>
    </div>
  );
}
