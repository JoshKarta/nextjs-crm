import { getServerSession } from "@/lib/auth";
import { createCategory, listCategories } from "@/services/product-service";
import { type ActorContext, type Role } from "@/utils/authz";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor: ActorContext = {
    userId: session.user.id,
    role: (session.user.role as Role) || "ADMIN",
  };

  try {
    const categories = await listCategories(actor);
    return NextResponse.json({ categories });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch categories" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor: ActorContext = {
    userId: session.user.id,
    role: (session.user.role as Role) || "ADMIN",
  };

  try {
    const body = await req.json();
    const category = await createCategory(actor, body);
    return NextResponse.json({ category }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create category" },
      { status: error.statusCode || 422 }
    );
  }
}
