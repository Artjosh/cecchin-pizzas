import { NextResponse, type NextRequest } from "next/server";

import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { consultar } from "@/src/servidor/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function horarioValido(valor: unknown): valor is string {
  if (typeof valor !== "string" || !/^\d{2}:\d{2}$/.test(valor)) return false;
  const [hora, minuto] = valor.split(":").map(Number);
  return hora >= 0 && hora <= 23 && minuto >= 0 && minuto <= 59;
}

function numeroOuNulo(valor: unknown, maximo: number): number | null | undefined {
  if (valor === null || valor === "") return null;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0 && numero <= maximo
    ? numero
    : undefined;
}

function uuidValido(valor: unknown): valor is string {
  return typeof valor === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor);
}

function padraoBusca(valor: string) {
  const classes: Record<string, string> = {
    a: "[aáàâãä]", c: "[cç]", e: "[eéèêë]", i: "[iíìîï]",
    n: "[nñ]", o: "[oóòôõö]", u: "[uúùûü]",
  };
  const texto = valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const partes = [...texto].map((letra) => classes[letra] ?? (/^[a-z0-9]$/.test(letra) ? letra : " "));
  return `.*${partes.join("").trim().replace(/\s+/g, ".*")}.*`;
}

async function sessaoDeGestao() {
  const sessao = await sessaoAtual();
  if (!sessao) {
    return { erro: NextResponse.json({ mensagem: "Sem sessão.", codigo: "sem_sessao" }, { status: 401 }) };
  }
  if (sessao.usuario.papel !== "gestao" && sessao.usuario.papel !== "admin") {
    return {
      erro: NextResponse.json(
        { mensagem: "Só gestão ou admin configura deslocamento.", codigo: "sem_papel" },
        { status: 403 },
      ),
    };
  }
  return { sessao };
}

/** Atualiza uma localidade ou a única janela de pico da organização. */
export async function GET(request: NextRequest) {
  const { sessao, erro } = await sessaoDeGestao();
  if (erro) return erro;
  const textoPagina = request.nextUrl.searchParams.get("pagina") ?? "0";
  const busca = (request.nextUrl.searchParams.get("busca") ?? "").trim();
  const incompletas = request.nextUrl.searchParams.get("incompletas") === "1";
  if (!/^\d{1,4}$/.test(textoPagina) || busca.length > 80) return NextResponse.json({ mensagem: "Busca inválida" }, { status: 400 });
  const pagina = Number(textoPagina);
  const porPagina = 30;
  const termo = busca.replace(/[,*().%]/g, " ").trim();
  const padrao = termo ? encodeURIComponent(padraoBusca(termo)) : "";
  const buscaExpressao = `cidade.imatch.${padrao},bairro.imatch.${padrao}`;
  const incompletasExpressao = "valor.is.null,minutos_normal.is.null,minutos_pico.is.null";
  const filtro = termo && incompletas ? `&and=(or(${buscaExpressao}),or(${incompletasExpressao}))`
    : termo ? `&or=(${buscaExpressao})` : incompletas ? `&or=(${incompletasExpressao})` : "";
  const [localidades, totalIncompletas, pico] = await Promise.all([
    consultar(`localidade?select=id,cidade,bairro,uf,valor,minutos_normal,minutos_pico,ativa${filtro}&order=cidade.asc,bairro.asc,id.asc&limit=${porPagina}&offset=${pagina * porPagina}`, sessao.accessToken, { headers: { Prefer: "count=exact" } }),
    consultar("localidade?select=id&or=(valor.is.null,minutos_normal.is.null,minutos_pico.is.null)&limit=1", sessao.accessToken, { headers: { Prefer: "count=exact" } }),
    consultar<Array<{ inicio: string; fim: string }>>("janela_pico?select=inicio,fim&limit=1", sessao.accessToken),
  ]);
  if (!localidades.ok || !totalIncompletas.ok || !pico.ok) return NextResponse.json({ mensagem: "Não foi possível carregar as localidades" }, { status: 503 });
  return NextResponse.json({ localidades: localidades.dados ?? [], total: localidades.total ?? 0, incompletas: totalIncompletas.total ?? 0, inicioPico: pico.dados?.[0]?.inicio ?? "17:00", fimPico: pico.dados?.[0]?.fim ?? "20:00", porPagina }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: NextRequest) {
  const { sessao, erro } = await sessaoDeGestao();
  if (erro) return erro;

  let corpo: Record<string, unknown>;
  try {
    corpo = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ mensagem: "JSON inválido.", codigo: "json_invalido" }, { status: 400 });
  }

  if (corpo.tipo === "pico") {
    if (!horarioValido(corpo.inicio) || !horarioValido(corpo.fim) || corpo.inicio === corpo.fim) {
      return NextResponse.json(
        { mensagem: "Informe início e fim válidos para o pico.", codigo: "horario" },
        { status: 400 },
      );
    }

    const r = await consultar<unknown[]>(
      "janela_pico?on_conflict=organizacao_id",
      sessao.accessToken,
      {
        method: "POST",
        headers: { prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({
          organizacao_id: sessao.usuario.organizacaoId,
          inicio: corpo.inicio,
          fim: corpo.fim,
        }),
      },
    );
    if (!r.ok) {
      return NextResponse.json(
        { mensagem: "Não foi possível salvar a janela de pico.", codigo: "recusado" },
        { status: r.status === 0 ? 502 : 403 },
      );
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (corpo.tipo !== "localidade" || !uuidValido(corpo.id)) {
    return NextResponse.json({ mensagem: "Localidade inválida.", codigo: "localidade" }, { status: 400 });
  }

  const valor = numeroOuNulo(corpo.valor, 100_000);
  const normal = numeroOuNulo(corpo.minutos_normal, 1_440);
  const pico = numeroOuNulo(corpo.minutos_pico, 1_440);
  if (valor === undefined || normal === undefined || pico === undefined) {
    return NextResponse.json(
      { mensagem: "Valor e minutos precisam ser números positivos dentro do limite.", codigo: "numero" },
      { status: 400 },
    );
  }

  const mudanca: Record<string, unknown> = {
    valor,
    minutos_normal: normal === null ? null : Math.round(normal),
    minutos_pico: pico === null ? null : Math.round(pico),
  };
  if (typeof corpo.ativa === "boolean") mudanca.ativa = corpo.ativa;

  const r = await consultar<unknown[]>(
    `localidade?id=eq.${encodeURIComponent(corpo.id)}` +
      `&organizacao_id=eq.${encodeURIComponent(sessao.usuario.organizacaoId)}`,
    sessao.accessToken,
    {
      method: "PATCH",
      headers: { prefer: "return=representation" },
      body: JSON.stringify(mudanca),
    },
  );
  if (!r.ok) {
    return NextResponse.json(
      { mensagem: "Não foi possível salvar a localidade.", codigo: "recusado" },
      { status: r.status === 0 ? 502 : 403 },
    );
  }
  if (!r.dados?.length) {
    return NextResponse.json({ mensagem: "Localidade não encontrada.", codigo: "sem_localidade" }, { status: 404 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
