import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { savedSearches } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.select().from(savedSearches).orderBy(desc(savedSearches.createdAt));
  return NextResponse.json({ savedSearches: rows });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { name?: string; filters?: Record<string, unknown> };
  if (!body.name?.trim() || !body.filters) {
    return NextResponse.json({ error: "Nome e filtros são obrigatórios." }, { status: 400 });
  }
  const [row] = await db
    .insert(savedSearches)
    .values({ name: body.name.trim().slice(0, 120), filters: body.filters })
    .returning();
  return NextResponse.json({ savedSearch: row }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório." }, { status: 400 });
  await db.delete(savedSearches).where(eq(savedSearches.id, id));
  return NextResponse.json({ ok: true });
}
