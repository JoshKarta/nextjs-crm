import { db } from "@/db";
import { contactAddresses } from "@/db/schema";
import { getServerSession } from "@/lib/auth";
import { createAddress } from "@/services/contact-service";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

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

  try {
    const body = await req.json();
    const address = await createAddress(session.user.id, contactId, body);
    return NextResponse.json({ address }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create address" },
      { status: 422 }
    );
  }
}
