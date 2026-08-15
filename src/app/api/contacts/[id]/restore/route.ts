import { getServerSession } from "@/lib/auth";
import { restoreContact } from "@/services/contact-service";
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

  try {
    const updated = await restoreContact(session.user.id, id);
    return NextResponse.json({ contact: updated });
  } catch (error: any) {
    const status = error.message === "Contact not found" ? 404 : 422;
    return NextResponse.json(
      { error: error.message || "Failed to restore contact" },
      { status }
    );
  }
}
