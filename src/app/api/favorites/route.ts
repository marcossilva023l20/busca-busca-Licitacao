import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { favorites } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.select().from(favorites).orderBy(desc(favorites.createdAt));
  return NextResponse.json({ favorites: rows });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    id?: string;
    titulo?: string;
    orgao?: string | null;
    uf?: string | null;
    municipio?: string | null;
    modalidadeNome?: string | null;
    portalNome?: string | null;
    dataEncerramento?: string | null;
    valorEstimado?: number | null;
    linkPncp?: string | null;
    linkSistemaOrigem?: string | null;
  };
  if (!body.id || !body.titulo) {
    return NextResponse.json({ error: "Licitação inválida." }, { status: 400 });
  }
  const [row] = await db
    .insert(favorites)
    .values({
      numeroControlePncp: body.id,
      titulo: body.titulo,
      orgao: body.orgao ?? null,
      uf: body.uf ?? null,
      municipio: body.municipio ?? null,
      modalidadeNome: body.modalidadeNome ?? null,
      portalNome: body.portalNome ?? null,
      dataEncerramento: body.dataEncerramento ?? null,
      valorEstimado: body.valorEstimado != null ? String(body.valorEstimado) : null,
      linkPncp: body.linkPncp ?? null,
      linkSistemaOrigem: body.linkSistemaOrigem ?? null,
      snapshot: body as Record<string, unknown>,
    })
    .onConflictDoNothing({ target: favorites.numeroControlePncp })
    .returning();
  return NextResponse.json({ favorite: row ?? null }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id"); // numero_controle_pncp
  if (!id) return NextResponse.json({ error: "id obrigatório." }, { status: 400 });
  await db.delete(favorites).where(eq(favorites.numeroControlePncp, id));
  return NextResponse.json({ ok: true });
}
