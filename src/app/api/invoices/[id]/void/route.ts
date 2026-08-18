import { getServerSession } from "@/lib/auth";
import { voidInvoice } from "@/services/invoice-service";
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
    const invoice = await voidInvoice(actor, id);
    return NextResponse.json({ invoice, message: "Invoice voided successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to void invoice" },
      { status: error.statusCode || 400 }
    );
  }
}
