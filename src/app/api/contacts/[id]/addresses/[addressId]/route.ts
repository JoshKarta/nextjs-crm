import { getServerSession } from "@/lib/auth";
import { updateAddress, deleteAddress } from "@/services/contact-service";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; addressId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: contactId, addressId } = await params;

  try {
    const body = await req.json();
    const address = await updateAddress(session.user.id, contactId, addressId, body);
    return NextResponse.json({ address });
  } catch (error: any) {
    const status = error.message === "Address not found" ? 404 : 422;
    return NextResponse.json(
      { error: error.message || "Failed to update address" },
      { status }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; addressId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: contactId, addressId } = await params;

  try {
    await deleteAddress(session.user.id, contactId, addressId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const status = error.message === "Address not found" ? 404 : 422;
    return NextResponse.json(
      { error: error.message || "Failed to delete address" },
      { status }
    );
  }
}
