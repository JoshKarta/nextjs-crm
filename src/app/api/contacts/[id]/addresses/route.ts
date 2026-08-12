import { db } from "@/db";
import { contactAddresses } from "@/db/schema";
import { getServerSession } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const addressSchema = z.object({
  type: z.enum(["BILLING", "SHIPPING", "OFFICE", "HOME", "OTHER"]),
  line1: z.string().min(1, "Line 1 is required"),
  line2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  isPrimary: z.boolean().optional().default(false),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const addresses = await db.query.contactAddresses.findMany({
    where: eq(contactAddresses.contactId, id),
    orderBy: (a, { desc }) => [desc(a.isPrimary), desc(a.createdAt)],
  });

  return NextResponse.json({ addresses });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: contactId } = await params;
  const body = await req.json();
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const data = parsed.data;

  // If isPrimary is true, unset other primary addresses of the same type for this contact
  if (data.isPrimary) {
    await db
      .update(contactAddresses)
      .set({ isPrimary: false })
      .where(
        and(
          eq(contactAddresses.contactId, contactId),
          eq(contactAddresses.type, data.type)
        )
      );
  }

  const [address] = await db
    .insert(contactAddresses)
    .values({
      ...data,
      contactId,
    })
    .returning();

  return NextResponse.json({ address }, { status: 201 });
}
