import { db } from "@/db";
import { contacts } from "@/db/schema";
import { getServerSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admins can restore
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [updated] = await db
    .update(contacts)
    .set({
      deletedAt: null,
      status: "ACTIVE",
      updatedBy: session.user.id,
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ contact: updated });
}
