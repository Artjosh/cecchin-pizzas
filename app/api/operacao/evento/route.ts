import { NextResponse, type NextRequest } from "next/server";

import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { consultar } from "@/src/servidor/supabase";

/**
 * Quem responde por um evento.
 *
 * **Por que isto faltava e importa.** Os 154 eventos futuros do banco estão
 * todos com `responsavel_id` nulo: a planilha registrava quem respondeu depois
 * que o evento aconteceu, não antes. O resultado é que "Minha rota" fica vazia
 * mesmo para quem já tem conta ligada — não há nada apontando para ela.
 *
 * Ligar a conta ao responsável (`/api/operacao/responsavel`) é metade do
 * caminho; a outra metade é alguém dizer, na agenda, quem leva cada evento.
 *
 * `staff` pode alocar: a policy `evento_escrita` já o permite, e quem monta a
 * escala do dia costuma estar na operação, não na gestão. O que `staff` NÃO
 * pode é mexer no elo conta-responsável — isso mudaria de quem é a rota, e está
 * travado em `010_responsavel.sql`.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) {
    return NextResponse.json(
      { mensagem: "Sem sessão.", codigo: "sem_sessao" },
      { status: 401 },
    );
  }

  if (sessao.usuario.papel === "cliente") {
    return NextResponse.json(
      { mensagem: "Quem aloca equipe é a operação.", codigo: "sem_papel" },
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

  const evento = typeof corpo.evento === "string" ? corpo.evento : "";
  if (!evento) {
    return NextResponse.json(
      { mensagem: "Falta o evento.", codigo: "evento" },
      { status: 400 },
    );
  }

  // String vazia e `null` significam o mesmo: tirar o responsável. O `select`
  // da tela devolve "" quando ninguém está escolhido.
  const responsavel =
    typeof corpo.responsavel === "string" && corpo.responsavel
      ? corpo.responsavel
      : null;

  /*
   * O filtro por organização é redundante com a RLS e fica: um PATCH sem
   * filtro suficiente é a forma clássica de atualizar a tabela inteira no dia
   * em que alguém afrouxar uma policy.
   */
  const r = await consultar<unknown[]>(
    `evento?id=eq.${encodeURIComponent(evento)}` +
      `&organizacao_id=eq.${encodeURIComponent(sessao.usuario.organizacaoId)}`,
    sessao.accessToken,
    {
      method: "PATCH",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({ responsavel_id: responsavel }),
    },
  );

  if (!r.ok) {
    // 23503: o responsável não existe nesta organização.
    const semResponsavel = (r.erro ?? "").includes("23503");
    return NextResponse.json(
      {
        mensagem: semResponsavel
          ? "Responsável não encontrado."
          : "Não foi possível alocar o responsável.",
        codigo: semResponsavel ? "sem_responsavel" : "recusado",
      },
      { status: r.status === 0 ? 502 : semResponsavel ? 404 : 403 },
    );
  }

  if (!r.dados?.length) {
    return NextResponse.json(
      { mensagem: "Evento não encontrado.", codigo: "sem_evento" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, alocado: responsavel !== null }, { status: 200 });
}
