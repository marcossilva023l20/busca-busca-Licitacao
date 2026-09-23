import { NextResponse } from "next/server";
import { getFacets } from "@/lib/source";

export const revalidate = 300;

export async function GET() {
  try {
    const facets = await getFacets();
    return NextResponse.json(facets);
  } catch (err) {
    console.error("[api/meta]", err);
    return NextResponse.json({ ufs: [], modalidades: [], portais: [] });
  }
}
