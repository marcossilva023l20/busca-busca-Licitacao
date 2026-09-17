import { NextResponse } from "next/server";
import { getFacets } from "@/lib/source";
import { MODALIDADES, PORTAIS, UFS } from "@/lib/constants";

export const revalidate = 300;

export async function GET() {
  try {
    const facets = await getFacets();
    return NextResponse.json(facets);
  } catch (err) {
    console.error("[api/meta]", err);
    return NextResponse.json({
      ufs: [...UFS],
      modalidades: MODALIDADES.map((m) => ({ id: m.id, nome: m.nome })),
      portais: PORTAIS.map((p) => ({ key: p.key, nome: p.nome })),
    });
  }
}
