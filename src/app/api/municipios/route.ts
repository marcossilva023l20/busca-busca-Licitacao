import { NextRequest, NextResponse } from "next/server";
import { getMunicipios } from "@/lib/source";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  try {
    const municipios = await getMunicipios(sp.get("uf") ?? undefined, sp.get("q") ?? "");
    return NextResponse.json({ municipios });
  } catch {
    return NextResponse.json({ municipios: [] });
  }
}
