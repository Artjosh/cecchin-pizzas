import { NextResponse, type NextRequest } from "next/server";
import type { LineString } from "geojson";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function coordenada(valor: string | null | undefined, minimo: number, maximo: number): number | null {
  if (valor == null || valor.trim() === "") return null;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= minimo && numero <= maximo ? numero : null;
}

/** A rota é encapsulada aqui para o mapa não ficar acoplado ao provedor. */
export async function GET(request: NextRequest) {
  const paradas = request.nextUrl.searchParams.get("pontos");
  const pontos = paradas
    ? paradas.split(";").map((parada) => {
      const [lng, lat] = parada.split(",");
      return { lat: coordenada(lat, -90, 90), lng: coordenada(lng, -180, 180) };
    })
    : [
      { lat: coordenada(request.nextUrl.searchParams.get("origemLat"), -90, 90), lng: coordenada(request.nextUrl.searchParams.get("origemLng"), -180, 180) },
      { lat: coordenada(request.nextUrl.searchParams.get("destinoLat"), -90, 90), lng: coordenada(request.nextUrl.searchParams.get("destinoLng"), -180, 180) },
    ];
  if (pontos.length < 2 || pontos.length > 22 || pontos.some((ponto) => ponto.lat === null || ponto.lng === null)) {
    return NextResponse.json({ mensagem: "Coordenadas inválidas." }, { status: 400 });
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${pontos.map((ponto) => `${ponto.lng},${ponto.lat}`).join(";")}?overview=full&geometries=geojson`;
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
