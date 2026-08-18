import { db } from "@/db";
import { auditEvents, contacts, invoiceItems, invoices } from "@/db/schema";
import { getServerSession } from "@/lib/auth";
import {
  deleteDraftInvoice,
  getInvoiceById,
  updateInvoice,
} from "@/services/invoice-service";
import { type ActorContext, type Role } from "@/utils/authz";
import { and, asc, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const invoice = await getInvoiceById(id);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Fetch associated contact
  let contact = null;
  if (invoice.contactId) {
    const [contactRow] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, invoice.contactId))
      .limit(1);
    contact = contactRow || null;
  }

  // Fetch audit events for the invoice detail timeline
  const auditLogs = await db
    .select()
    .from(auditEvents)
    .where(and(eq(auditEvents.entityType, "INVOICE"), eq(auditEvents.entityId, id)))
    .orderBy(desc(auditEvents.timestamp));

  return NextResponse.json({
    invoice: {
      ...invoice,
      contact,
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
    role: (session.user.role as Role) || "admin",
  };

  const { id } = await params;

  try {
    const body = await req.json();
    const invoice = await updateInvoice(actor, id, body);
    return NextResponse.json({ invoice });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update invoice" },
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
    await deleteDraftInvoice(actor, id);
    return NextResponse.json({ message: "Draft invoice deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete invoice" },
      { status: error.statusCode || 400 }
    );
  }
}
