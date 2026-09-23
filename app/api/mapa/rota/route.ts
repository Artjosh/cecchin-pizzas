import { NextResponse, type NextRequest } from "next/server";
import type { LineString } from "geojson";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function coordenada(valor: string | null, minimo: number, maximo: number): number | null {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= minimo && numero <= maximo ? numero : null;
}

/** A rota é encapsulada aqui para o mapa não ficar acoplado ao provedor. */
export async function GET(request: NextRequest) {
  const origemLat = coordenada(request.nextUrl.searchParams.get("origemLat"), -90, 90);
  const origemLng = coordenada(request.nextUrl.searchParams.get("origemLng"), -180, 180);
  const destinoLat = coordenada(request.nextUrl.searchParams.get("destinoLat"), -90, 90);
  const destinoLng = coordenada(request.nextUrl.searchParams.get("destinoLng"), -180, 180);
  if ([origemLat, origemLng, destinoLat, destinoLng].some((valor) => valor === null)) {
    return NextResponse.json({ mensagem: "Coordenadas inválidas." }, { status: 400 });
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origemLng},${origemLat};${destinoLng},${destinoLat}?overview=full&geometries=geojson`;
    const resposta = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resposta.ok) throw new Error(`route ${resposta.status}`);
    const dado = (await resposta.json()) as { routes?: Array<{ distance?: number; duration?: number; geometry?: LineString }> };
    const rota = dado.routes?.[0];
    if (!rota?.geometry || !Number.isFinite(rota.distance) || !Number.isFinite(rota.duration)) throw new Error("rota ausente");
    return NextResponse.json({ distanciaMetros: rota.distance, duracaoSegundos: rota.duration, geometria: rota.geometry }, { headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch {
    return NextResponse.json({ mensagem: "Não foi possível calcular a rota agora." }, { status: 502 });
  }
}
