import { getServerSession } from "@/lib/auth";
import { restoreProduct } from "@/services/product-service";
import { type ActorContext, type Role } from "@/utils/authz";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
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
    const product = await restoreProduct(actor, id);
    return NextResponse.json({ product, message: "Product restored successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to restore product" },
      { status: error.statusCode || 400 }
    );
  }
}
