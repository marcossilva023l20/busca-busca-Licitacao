import { NextRequest, NextResponse } from "next/server";
import { searchLicitacoes, type SearchParams } from "@/lib/source";
import { PAGE_SIZE } from "@/lib/constants";

export const dynamic = "force-dynamic";

function parseNumList(v: string | null): number[] | undefined {
  if (!v) return undefined;
  const list = v
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
  return list.length ? list : undefined;
}

function parseStrList(v: string | null): string[] | undefined {
  if (!v) return undefined;
  const list = v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list : undefined;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const params: SearchParams = {
    q: sp.get("q") ?? undefined,
    uf: sp.get("uf") ?? undefined,
    municipio: sp.get("municipio") ?? undefined,
    modalidades: parseNumList(sp.get("modalidades")),
    portais: parseStrList(sp.get("portais")),
    encerramentoDe: sp.get("encerramentoDe") ?? undefined,
    encerramentoAte: sp.get("encerramentoAte") ?? undefined,
    apenasAbertas: sp.get("apenasAbertas") !== "false",
    valorMin: sp.get("valorMin") ? Number(sp.get("valorMin")) : undefined,
    valorMax: sp.get("valorMax") ? Number(sp.get("valorMax")) : undefined,
    page: Math.max(1, Number(sp.get("page") ?? 1) || 1),
    pageSize: sp.get("all") === "true" ? 1000 : Math.min(Number(sp.get("pageSize")) || PAGE_SIZE, 1000),
    sort: (sp.get("sort") as SearchParams["sort"]) ?? "encerramento_asc",
  };

  try {
    const result = await searchLicitacoes(params);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/licitacoes]", err);
    return NextResponse.json(
      { error: "Falha ao consultar a fonte de licitações. Tente novamente." },
      { status: 502 },
    );
  }
}
