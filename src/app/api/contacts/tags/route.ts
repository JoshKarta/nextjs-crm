import { db } from "@/db";
import { tags } from "@/db/schema";
import { getServerSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allTags = await db.query.tags.findMany({
    orderBy: (t, { asc }) => [asc(t.name)],
  });

  return NextResponse.json({ tags: allTags });
}
