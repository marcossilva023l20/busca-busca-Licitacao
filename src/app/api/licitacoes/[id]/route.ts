import { NextRequest, NextResponse } from "next/server";
import { getLicitacaoDetail } from "@/lib/source";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const decoded = decodeURIComponent(id);
  try {
    const detail = await getLicitacaoDetail(decoded);
    return NextResponse.json(detail);
  } catch (err) {
    console.error("[api/licitacoes/:id]", err);
    const message = err instanceof Error ? err.message : "Erro";
    return NextResponse.json(
      { error: message.includes("não encontrada") ? message : "Falha ao carregar detalhe." },
      { status: message.includes("não encontrada") ? 404 : 502 },
    );
  }
}
