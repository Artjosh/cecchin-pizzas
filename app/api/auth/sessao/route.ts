import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { COOKIE_ACESSO } from "@/src/servidor/sessao";
import { limparSessao, sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { encerrarNoProvedor } from "@/src/servidor/supabase";

/**
 * Ciclo de vida da sessão.
 *
 *   * `GET`    — quem está logado. Devolve o usuário, nunca o token.
 *   * `DELETE` — sai. Apaga os cookies **e** revoga no GoTrue.
 *
 * Revogar no provedor importa: apagar só o cookie deixaria o refresh token
 * válido por trinta dias. Se ele tiver vazado, "sair" não teria surtido efeito
 * nenhum onde importa.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const sessao = await sessaoAtual();

  if (!sessao) {
    return NextResponse.json(
      { mensagem: "Sem sessão.", codigo: "sem_sessao" },
      { status: 401 },
    );
  }

  return NextResponse.json({ usuario: sessao.usuario }, { status: 200 });
}

export async function DELETE() {
  const jar = await cookies();
  const acesso = jar.get(COOKIE_ACESSO)?.value;

  if (acesso) {
    // Falha aqui não impede o logout local: o cookie sai de qualquer jeito.
    await encerrarNoProvedor(acesso);
  }

  limparSessao(jar);
  return NextResponse.json({ ok: true }, { status: 200 });
}
