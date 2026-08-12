import { db } from "@/db";
import { contactNotes } from "@/db/schema";
import { getServerSession } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateNoteSchema = z.object({
  content: z.string().min(1, "Note content cannot be empty"),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: contactId, noteId } = await params;
  const body = await req.json();
  const parsed = updateNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const [note] = await db
    .update(contactNotes)
    .set({
      content: parsed.data.content,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(contactNotes.id, noteId),
        eq(contactNotes.contactId, contactId)
      )
    )
    .returning();

  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ note });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: contactId, noteId } = await params;

  const [deleted] = await db
    .delete(contactNotes)
    .where(
      and(
        eq(contactNotes.id, noteId),
        eq(contactNotes.contactId, contactId)
      )
    )
    .returning();

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
