import { getServerSession } from "@/lib/auth";
import { updateCategory } from "@/services/product-service";
import { type ActorContext, type Role } from "@/utils/authz";
import { NextRequest, NextResponse } from "next/server";

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
    const category = await updateCategory(actor, id, body);
    return NextResponse.json({ category });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update category" },
      { status: error.statusCode || 422 }
    );
  }
}
