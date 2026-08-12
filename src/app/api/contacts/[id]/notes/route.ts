import { db } from "@/db";
import { contactNotes } from "@/db/schema";
import { getServerSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const noteSchema = z.object({
  content: z.string().min(1, "Note content cannot be empty"),
});

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
  const body = await req.json();
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const [note] = await db
    .insert(contactNotes)
    .values({
      contactId,
      content: parsed.data.content,
      createdBy: session.user.id,
    })
    .returning();

  return NextResponse.json({ note }, { status: 201 });
}
