import { getServerSession } from "@/lib/auth";
import { removeInvoiceItem, updateInvoiceItem } from "@/services/invoice-service";
import { type ActorContext, type Role } from "@/utils/authz";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor: ActorContext = {
    userId: session.user.id,
    role: (session.user.role as Role) || "admin",
  };

  const { id, itemId } = await params;

  try {
    const body = await req.json();
    const invoice = await updateInvoiceItem(actor, id, itemId, body);
    return NextResponse.json({ invoice });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update invoice item" },
      { status: error.statusCode || 422 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor: ActorContext = {
    userId: session.user.id,
    role: (session.user.role as Role) || "admin",
  };

  const { id, itemId } = await params;

  try {
    const invoice = await removeInvoiceItem(actor, id, itemId);
    return NextResponse.json({ invoice });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to remove invoice item" },
      { status: error.statusCode || 400 }
    );
  }
}
