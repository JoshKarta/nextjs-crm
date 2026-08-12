import { db } from "@/db";
import { contactTags, tags } from "@/db/schema";
import { getServerSession } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const attachTagSchema = z.object({
  name: z.string().min(1, "Tag name is required").transform((val) => val.trim().toLowerCase()),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: contactId } = await params;
  const body = await req.json();
  const parsed = attachTagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const tagName = parsed.data.name;

  // Find or create tag
  let tag = await db.query.tags.findFirst({
    where: eq(tags.name, tagName),
  });

  if (!tag) {
    const [newTag] = await db
      .insert(tags)
      .values({ name: tagName })
      .onConflictDoNothing()
      .returning();

    if (!newTag) {
      // Conflict happened, re-fetch
      tag = (await db.query.tags.findFirst({
        where: eq(tags.name, tagName),
      }))!;
    } else {
      tag = newTag;
    }
  }

  // Attach tag to contact if not already attached
  await db
    .insert(contactTags)
    .values({
      contactId,
      tagId: tag.id,
    })
    .onConflictDoNothing();

  return NextResponse.json({ tag });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: contactId } = await params;
  const { searchParams } = new URL(req.url);
  const tagId = searchParams.get("tagId");

  if (!tagId) {
    return NextResponse.json({ error: "tagId is required" }, { status: 400 });
  }

  await db
    .delete(contactTags)
    .where(
      and(
        eq(contactTags.contactId, contactId),
        eq(contactTags.tagId, tagId)
      )
    );

  return NextResponse.json({ success: true });
}
