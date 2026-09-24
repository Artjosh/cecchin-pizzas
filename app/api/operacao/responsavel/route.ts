import { NextResponse, type NextRequest } from "next/server";

import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { chamarFuncao } from "@/src/servidor/supabase";
import { buscarResponsaveisOperacao } from "@/src/servidor/responsaveis-operacao";

/**
 * Liga uma conta ao responsável — ou desliga.
 *
 * É o elo que faz "Minha rota" funcionar: a tela mostra os eventos cujo
 * responsável é a conta de quem está olhando. Os 362 responsáveis vieram da
 * planilha, onde só havia o nome, e sem este elo quem trabalha em campo entra
 * no sistema e não encontra o próprio trabalho.
 *
 * A regra mora em `app.ligar_responsavel()` e num gatilho, não aqui:
 * `staff` tem escrita na tabela `responsavel` e, sem a trava no banco, poderia
 * apontar o próprio id para qualquer responsável com um PATCH direto no
 * PostgREST — e passar a ver a rota de outra pessoa. Ver
 * `migracao/sql/010_responsavel.sql`.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ mensagem: "Sem sessão." }, { status: 401 });
  if (sessao.usuario.papel !== "gestao" && sessao.usuario.papel !== "admin") {
    return NextResponse.json({ mensagem: "Só gestão ou admin consulta responsáveis." }, { status: 403 });
  }
  const textoPagina = request.nextUrl.searchParams.get("pagina") ?? "0";
  const busca = request.nextUrl.searchParams.get("busca") ?? "";
  if (!/^\d{1,4}$/.test(textoPagina) || busca.length > 80) {
    return NextResponse.json({ mensagem: "Busca inválida." }, { status: 400 });
  }
  const resultado = await buscarResponsaveisOperacao(
    sessao.accessToken, Number(textoPagina), busca, request.nextUrl.searchParams.get("semConta") !== "0",
  );
  if (!resultado.ok) return NextResponse.json({ mensagem: "Não foi possível carregar os responsáveis." }, { status: 503 });
  return NextResponse.json(resultado, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) {
    return NextResponse.json(
      { mensagem: "Sem sessão.", codigo: "sem_sessao" },
      { status: 401 },
    );
  }

  if (sessao.usuario.papel !== "gestao" && sessao.usuario.papel !== "admin") {
    return NextResponse.json(
      { mensagem: "Só gestão ou admin liga conta a responsável.", codigo: "sem_papel" },
      { status: 403 },
    );
  }

  let corpo: Record<string, unknown>;
  try {
    corpo = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { mensagem: "JSON inválido.", codigo: "json_invalido" },
      { status: 400 },
    );
  }

  const responsavel = typeof corpo.responsavel === "string" ? corpo.responsavel : "";
  if (!responsavel) {
    return NextResponse.json(
      { mensagem: "Falta o responsável.", codigo: "responsavel" },
      { status: 400 },
    );
  }

  // String vazia e `null` significam a mesma coisa: desligar. O `select` da
  // tela devolve "" quando ninguém está escolhido.
  const usuario =
    typeof corpo.usuario === "string" && corpo.usuario ? corpo.usuario : null;

  const r = await chamarFuncao(
    "ligar_responsavel",
    { p_responsavel: responsavel, p_usuario: usuario },
    sessao.accessToken,
  );

  if (!r.ok) {
    let mensagem = "Não foi possível ligar a conta.";
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

  return NextResponse.json({ ok: true, ligado: usuario !== null }, { status: 200 });
}
