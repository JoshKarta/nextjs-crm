import type { Metadata } from "next";
import Navbar from "@/components/landing/navbar";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProductDetailsClient } from "./product-details-client";

export const metadata: Metadata = {
  title: "Product Details | Dashboard",
  description: "View product specifications, price calculation preview, and audit log history",
};

export default async function ProductDetailPage({
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
      <ProductDetailsClient productId={id} />
    </div>
  );
}
