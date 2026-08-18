import { getServerSession } from "@/lib/auth";
import { addInvoiceItem } from "@/services/invoice-service";
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
    const body = await req.json();
    const invoice = await addInvoiceItem(actor, id, body);
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to add invoice item" },
      { status: error.statusCode || 422 }
    );
  }
}
