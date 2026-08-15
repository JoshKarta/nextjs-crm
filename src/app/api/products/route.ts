import { getServerSession } from "@/lib/auth";
import { createProduct, searchProducts } from "@/services/product-service";
import { type ActorContext, type Role } from "@/utils/authz";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor: ActorContext = {
    userId: session.user.id,
    role: (session.user.role as Role) || "ADMIN",
  };

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || searchParams.get("search") || undefined;
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const categoryId = searchParams.get("categoryId") || undefined;
  const selectableOnlyStr = searchParams.get("selectableOnly");
  const selectableOnly = selectableOnlyStr === "true" ? true : selectableOnlyStr === "false" ? false : false;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Number(searchParams.get("limit")) || 20);
  const offset = (page - 1) * limit;

  try {
    const productsList = await searchProducts(actor, {
      query,
      status: status && status !== "all" ? (status as any) : undefined,
      type: type && type !== "all" ? (type as any) : undefined,
      categoryId,
      selectableOnly,
      limit,
      offset,
    });

    return NextResponse.json({
      products: productsList,
      page,
      limit,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch products" },
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
    const product = await createProduct(actor, body);
    return NextResponse.json({ product }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create product" },
      { status: error.statusCode || 422 }
    );
  }
}
