import { db } from "@/db";
import { auditEvents, productCategories, products } from "@/db/schema";
import { getServerSession } from "@/lib/auth";
import { archiveProduct, getProductById, updateProduct } from "@/services/product-service";
import { type ActorContext, type Role } from "@/utils/authz";
import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const product = await getProductById(id, { includeArchived: true });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Get Category if associated
  let category = null;
  if (product.categoryId) {
    const [catRow] = await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.id, product.categoryId))
      .limit(1);
    category = catRow || null;
  }

  // Get Audit Events for Product Details route timeline
  const auditLogs = await db
    .select()
    .from(auditEvents)
    .where(and(eq(auditEvents.entityType, "PRODUCT"), eq(auditEvents.entityId, id)))
    .orderBy(desc(auditEvents.timestamp));

  return NextResponse.json({
    product: {
      ...product,
      category,
      auditLogs,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor: ActorContext = {
    userId: session.user.id,
    role: (session.user.role as Role) || "ADMIN",
  };

  const { id } = await params;

  try {
    const body = await req.json();
    const product = await updateProduct(actor, id, body);
    return NextResponse.json({ product });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update product" },
      { status: error.statusCode || 422 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor: ActorContext = {
    userId: session.user.id,
    role: (session.user.role as Role) || "ADMIN",
  };

  const { id } = await params;

  try {
    const product = await archiveProduct(actor, id);
    return NextResponse.json({ product, message: "Product archived successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to archive product" },
      { status: error.statusCode || 400 }
    );
  }
}
