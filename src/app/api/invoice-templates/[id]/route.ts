import { getServerSession } from "@/lib/auth";
import {
  deleteInvoiceTemplate,
  getInvoiceTemplateById,
  updateInvoiceTemplate,
} from "@/services/invoice-template-service";
import { type ActorContext, type Role } from "@/utils/authz";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor: ActorContext = {
    userId: session.user.id,
    role: (session.user.role as Role) || "admin",
  };

  const { id } = await params;

  try {
    const template = await getInvoiceTemplateById(actor, id);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    return NextResponse.json({ template });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch template" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor: ActorContext = {
    userId: session.user.id,
    role: (session.user.role as Role) || "admin",
  };

  const { id } = await params;

  try {
    const body = await req.json();
    const template = await updateInvoiceTemplate(actor, id, body);
    return NextResponse.json({ template });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update template" },
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
    role: (session.user.role as Role) || "admin",
  };

  const { id } = await params;

  try {
    await deleteInvoiceTemplate(actor, id);
    return NextResponse.json({ message: "Template deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete template" },
      { status: error.statusCode || 400 }
    );
  }
}
