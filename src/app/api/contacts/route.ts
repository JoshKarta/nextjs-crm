import { db } from "@/db";
import { contacts, contactTags, tags } from "@/db/schema";
import { getServerSession } from "@/lib/auth";
import { and, eq, ilike, isNull, isNotNull, or, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createContactSchema = z.object({
  type: z.enum(["INDIVIDUAL", "COMPANY"]),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  companyId: z.string().uuid().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || "all";
  const status = searchParams.get("status") || "all";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(50, Number(searchParams.get("limit")) || 20);
  const offset = (page - 1) * limit;

  // Build where clauses
  const conditions = [];

  if (search) {
    conditions.push(
      or(
        ilike(contacts.firstName, `%${search}%`),
        ilike(contacts.lastName, `%${search}%`),
        ilike(contacts.companyName, `%${search}%`),
        ilike(contacts.email, `%${search}%`),
        ilike(contacts.phone, `%${search}%`)
      )
    );
  }

  if (type !== "all") {
    conditions.push(eq(contacts.type, type as "INDIVIDUAL" | "COMPANY"));
  }

  if (status === "active") {
    conditions.push(isNull(contacts.deletedAt));
  } else if (status === "archived") {
    conditions.push(isNotNull(contacts.deletedAt));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db.query.contacts.findMany({
      where,
      with: {
        contactTags: { with: { tag: true } },
        company: { columns: { id: true, companyName: true } },
      },
      limit,
      offset,
      orderBy: (c, { desc }) => [desc(c.createdAt)],
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(contacts)
      .where(where),
  ]);

  return NextResponse.json({
    contacts: rows,
    total: countResult[0].count,
    totalPages: Math.ceil(countResult[0].count / limit),
    page,
    limit,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const data = parsed.data;

  // Validate conditional required fields
  if (data.type === "INDIVIDUAL" && !data.firstName && !data.lastName) {
    return NextResponse.json(
      { error: "First name or last name is required for individuals" },
      { status: 422 }
    );
  }
  if (data.type === "COMPANY" && !data.companyName) {
    return NextResponse.json(
      { error: "Company name is required for companies" },
      { status: 422 }
    );
  }

  const [contact] = await db
    .insert(contacts)
    .values({
      ...data,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    })
    .returning();

  return NextResponse.json({ contact }, { status: 201 });
}
