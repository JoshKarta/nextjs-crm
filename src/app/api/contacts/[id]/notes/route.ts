import { db } from "@/db";
import { contactNotes } from "@/db/schema";
import { getServerSession } from "@/lib/auth";
import { createNote } from "@/services/contact-service";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const notes = await db.query.contactNotes.findMany({
    where: eq(contactNotes.contactId, id),
    orderBy: (n, { desc }) => [desc(n.createdAt)],
  });

  return NextResponse.json({ notes });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: contactId } = await params;

  try {
    const body = await req.json();
    const note = await createNote(session.user.id, contactId, body);
    return NextResponse.json({ note }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create note" },
      { status: 422 }
    );
  }
}
