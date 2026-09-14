import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ResultadoNominatim {
  display_name?: string;
  lat?: string;
  lon?: string;
}

function consultaValida(valor: string | null): string | null {
  const texto = valor?.trim().replace(/\s+/g, " ") ?? "";
  return texto.length >= 3 && texto.length <= 160 ? texto : null;
}

/**
 * A busca só é chamada ao confirmar o formulário, nunca a cada tecla. O
 * Nominatim público proíbe autocomplete; o cache HTTP evita repetir endereços
 * iguais entre pessoas e sessões.
 */
export async function GET(request: NextRequest) {
  const consulta = consultaValida(request.nextUrl.searchParams.get("q"));
  if (!consulta) {
    return NextResponse.json({ mensagem: "Digite pelo menos três caracteres." }, { status: 400 });
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.search = new URLSearchParams({
      q: `${consulta}, Rio Grande do Sul, Brasil`,
      format: "jsonv2",
      addressdetails: "1",
      limit: "5",
      countrycodes: "br",
    }).toString();
    const resposta = await fetch(url, {
      headers: { "accept-language": "pt-BR,pt;q=0.9", "user-agent": "CecchinPizzas/1.0 mapa@cecchinpizzas.com.br" },
      signal: AbortSignal.timeout(7000),
    });
    if (!resposta.ok) throw new Error(`geocoder ${resposta.status}`);
    const bruto = (await resposta.json()) as ResultadoNominatim[];
    const locais = bruto.flatMap((item) => {
      const lat = Number(item.lat); const lng = Number(item.lon);
      return Number.isFinite(lat) && Number.isFinite(lng) && item.display_name
        ? [{ endereco: item.display_name, lat, lng }]
        : [];
    });
    return NextResponse.json({ locais }, { headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch {
    return NextResponse.json({ mensagem: "Não foi possível buscar o endereço agora." }, { status: 502 });
  }
}
