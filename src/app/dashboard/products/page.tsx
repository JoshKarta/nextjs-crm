import type { Metadata } from "next";
import Navbar from "@/components/landing/navbar";
import { ProductsTable } from "@/components/products/products-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Products & Services | Dashboard",
  description: "Manage catalog products, services, pricing, tax rates, and categories",
};

export default async function ProductsDashboardPage() {
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
                  <Package className="h-6 w-6 text-primary" />
                  Products & Services Catalog
                </CardTitle>
                <CardDescription className="mt-1">
                  Manage physical products, service items, tax rates, SKU codes, and category hierarchies.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ProductsTable />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
