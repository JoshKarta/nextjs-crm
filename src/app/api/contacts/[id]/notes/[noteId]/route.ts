import { getServerSession } from "@/lib/auth";
import { updateNote, deleteNote } from "@/services/contact-service";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: contactId, noteId } = await params;

  try {
    const body = await req.json();
    const note = await updateNote(session.user.id, contactId, noteId, body);
    return NextResponse.json({ note });
  } catch (error: any) {
    const status = error.message === "Note not found" ? 404 : 422;
    return NextResponse.json(
      { error: error.message || "Failed to update note" },
      { status }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: contactId, noteId } = await params;

  try {
    await deleteNote(session.user.id, contactId, noteId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const status = error.message === "Note not found" ? 404 : 422;
    return NextResponse.json(
      { error: error.message || "Failed to delete note" },
      { status }
    );
  }
}
