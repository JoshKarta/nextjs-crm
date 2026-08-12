import { db } from "@/db";
import { contacts } from "@/db/schema";
import { getServerSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateContactSchema = z.object({
  type: z.enum(["INDIVIDUAL", "COMPANY"]).optional(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  companyId: z.string().uuid().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
});

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
  const body = await req.json();
  const parsed = updateContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const [updated] = await db
    .update(contacts)
    .set({ ...parsed.data, updatedBy: session.user.id, updatedAt: new Date() })
    .where(eq(contacts.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ contact: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Soft delete
  const [updated] = await db
    .update(contacts)
    .set({
      deletedAt: new Date(),
      status: "ARCHIVED",
      updatedBy: session.user.id,
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ contact: updated });
}
