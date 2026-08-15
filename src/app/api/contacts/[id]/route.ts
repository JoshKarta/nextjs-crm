import { db } from "@/db";
import { contacts } from "@/db/schema";
import { getServerSession } from "@/lib/auth";
import { updateContact, archiveContact } from "@/services/contact-service";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, id),
    with: {
      contactTags: { with: { tag: true } },
      addresses: true,
      notes: true,
      company: { columns: { id: true, companyName: true } },
      individuals: { columns: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ contact });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const updated = await updateContact(session.user.id, id, body);
    return NextResponse.json({ contact: updated });
  } catch (error: any) {
    const status = error.message === "Contact not found" ? 404 : 422;
    return NextResponse.json(
      { error: error.message || "Failed to update contact" },
      { status }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const updated = await archiveContact(session.user.id, id);
    return NextResponse.json({ contact: updated });
  } catch (error: any) {
    const status = error.message === "Contact not found" ? 404 : 422;
    return NextResponse.json(
      { error: error.message || "Failed to archive contact" },
      { status }
    );
  }
}
