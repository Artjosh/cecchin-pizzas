import { NextResponse, type NextRequest } from "next/server";

import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { chamarFuncao } from "@/src/servidor/supabase";

/**
 * Preço de um modelo de rodízio.
 *
 * Passa por `definir_preco()` e não por um INSERT direto porque três regras
 * precisam valer juntas — organização de quem chama, papel de gestão, e
 * regravar a vigência do mesmo dia como ATUALIZAÇÃO em vez de violação de
 * chave única. Detalhe em `migracao/sql/009_catalogo.sql`.
 *
 * O terceiro ponto é o que aparece no uso real: quem erra um dígito corrige em
 * seguida, no mesmo dia.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) {
    return NextResponse.json({ mensagem: "Sem sessão.", codigo: "sem_sessao" }, { status: 401 });
  }

  let corpo: Record<string, unknown>;
  try {
    corpo = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ mensagem: "JSON inválido.", codigo: "json_invalido" }, { status: 400 });
  }

  const modelo = typeof corpo.modelo === "string" ? corpo.modelo : "";
  const preco = Number(corpo.preco);

  if (!modelo) {
    return NextResponse.json({ mensagem: "Falta o modelo de rodízio.", codigo: "modelo" }, { status: 400 });
  }
  if (!Number.isFinite(preco) || preco < 0) {
    return NextResponse.json({ mensagem: "Preço precisa ser zero ou mais.", codigo: "preco" }, { status: 400 });
  }

  const validaDe =
    typeof corpo.valida_de === "string" && /^\d{4}-\d{2}-\d{2}$/.test(corpo.valida_de)
      ? corpo.valida_de
      : new Date().toISOString().slice(0, 10);

  const r = await chamarFuncao<string>(
    "definir_preco",
    { p_modelo: modelo, p_preco: preco, p_valida_de: validaDe },
    sessao.accessToken,
  );

  if (!r.ok) {
    let mensagem = "Não foi possível definir o preço.";
    try {
      const detalhe = JSON.parse(r.erro ?? "{}") as { message?: string };
      if (detalhe.message) mensagem = detalhe.message;
    } catch {
      /* erro que não veio de `raise`: fica o genérico. */
    }
    return NextResponse.json(
      { mensagem, codigo: "recusado" },
      { status: r.status === 0 ? 502 : 403 },
    );
  }

  return NextResponse.json({ ok: true, validaDe }, { status: 200 });
}
