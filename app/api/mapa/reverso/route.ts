import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function coordenada(valor: string | null, minimo: number, maximo: number): number | null {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= minimo && numero <= maximo ? numero : null;
}

export async function GET(request: NextRequest) {
  const lat = coordenada(request.nextUrl.searchParams.get("lat"), -90, 90);
  const lng = coordenada(request.nextUrl.searchParams.get("lng"), -180, 180);
  if (lat === null || lng === null) return NextResponse.json({ mensagem: "Coordenada inválida." }, { status: 400 });

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.search = new URLSearchParams({ lat: String(lat), lon: String(lng), format: "jsonv2", zoom: "18" }).toString();
    const resposta = await fetch(url, {
      headers: { "accept-language": "pt-BR,pt;q=0.9", "user-agent": "CecchinPizzas/1.0 mapa@cecchinpizzas.com.br" },
      signal: AbortSignal.timeout(7000),
    });
    if (!resposta.ok) throw new Error(`reverse ${resposta.status}`);
    const dado = (await resposta.json()) as { display_name?: string };
    return NextResponse.json({ endereco: dado.display_name ?? null }, { headers: { "cache-control": "public, s-maxage=2592000, stale-while-revalidate=31536000" } });
  } catch {
    return NextResponse.json({ mensagem: "Não foi possível identificar esse ponto agora." }, { status: 502 });
  }
}
