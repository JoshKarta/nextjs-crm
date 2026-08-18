import { getServerSession } from "@/lib/auth";
import { finalizeInvoice } from "@/services/invoice-service";
import { type ActorContext, type Role } from "@/utils/authz";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor: ActorContext = {
    userId: session.user.id,
    role: (session.user.role as Role) || "admin",
  };

  const { id } = await params;

  try {
    const invoice = await finalizeInvoice(actor, id);
    return NextResponse.json({ invoice, message: "Invoice finalized successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to finalize invoice" },
      { status: error.statusCode || 400 }
    );
  }
}
