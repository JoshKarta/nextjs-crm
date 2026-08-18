import { getServerSession } from "@/lib/auth";
import {
  createInvoiceTemplate,
  getInvoiceTemplates,
} from "@/services/invoice-template-service";
import { type ActorContext, type Role } from "@/utils/authz";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor: ActorContext = {
    userId: session.user.id,
    role: (session.user.role as Role) || "admin",
  };

  try {
    const templates = await getInvoiceTemplates(actor);
    return NextResponse.json({ templates });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch templates" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor: ActorContext = {
    userId: session.user.id,
    role: (session.user.role as Role) || "admin",
  };

  try {
    const body = await req.json();
    const template = await createInvoiceTemplate(actor, body);
    return NextResponse.json({ template }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create template" },
      { status: error.statusCode || 422 }
    );
  }
}
