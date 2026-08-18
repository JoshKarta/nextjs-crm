import { getServerSession } from "@/lib/auth";
import { createInvoice, searchInvoices } from "@/services/invoice-service";
import { type ActorContext, type Role } from "@/utils/authz";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor: ActorContext = {
    userId: session.user.id,
    role: (session.user.role as Role) || "admin",
  };

  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("contactId") || undefined;
  const status = searchParams.get("status");
  const overdueOnly = searchParams.get("overdueOnly") === "true";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Number(searchParams.get("limit")) || 25);
  const offset = (page - 1) * limit;

  try {
    const invoicesList = await searchInvoices(actor, {
      contactId,
      status: status && status !== "all" ? (status as any) : undefined,
      overdueOnly,
      limit,
      offset,
    });

    return NextResponse.json({
      invoices: invoicesList,
      page,
      limit,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch invoices" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor: ActorContext = {
    userId: session.user.id,
    role: (session.user.role as Role) || "admin",
  };

  try {
    const body = await req.json();
    const invoice = await createInvoice(actor, body);
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create invoice" },
      { status: error.statusCode || 422 }
    );
  }
}
