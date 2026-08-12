import { db } from "@/db";
import { contactAddresses } from "@/db/schema";
import { getServerSession } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateAddressSchema = z.object({
  type: z.enum(["BILLING", "SHIPPING", "OFFICE", "HOME", "OTHER"]).optional(),
  line1: z.string().min(1, "Line 1 is required").optional(),
  line2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  isPrimary: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; addressId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: contactId, addressId } = await params;
  const body = await req.json();
  const parsed = updateAddressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const data = parsed.data;

  // If set to primary, unset others of same type
  if (data.isPrimary && data.type) {
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
    .update(contactAddresses)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(contactAddresses.id, addressId),
        eq(contactAddresses.contactId, contactId)
      )
    )
    .returning();

  if (!address) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ address });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; addressId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: contactId, addressId } = await params;

  const [deleted] = await db
    .delete(contactAddresses)
    .where(
      and(
        eq(contactAddresses.id, addressId),
        eq(contactAddresses.contactId, contactId)
      )
    )
    .returning();

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
