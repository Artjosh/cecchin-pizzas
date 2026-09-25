import { NextResponse, type NextRequest } from "next/server";

import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { chamarFuncao, consultar } from "@/src/servidor/supabase";

/**
 * Pedido para entrar na equipe, e as decisões sobre ele.
 *
 * **Nenhuma checagem de papel acontece neste arquivo, de propósito.** O
 * `POST` insere em `solicitacao_staff` com o token do próprio usuário, e a
 * policy `solicitacao_staff_criacao` já exige que quem insere seja `cliente`,
 * seja o dono da linha e esteja na organização certa. O `PATCH` chama
 * `decidir_solicitacao_staff`, que verifica gestao/admin dentro do banco.
 *
 * Repetir a regra aqui daria dois lugares para ela divergir — e o que vale é
 * sempre o de baixo. Este handler é transporte: traduz HTTP em chamada e
 * devolve o que o Postgres respondeu.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Solicitacao {
  id: string;
  status: "pendente" | "aprovada" | "recusada";
  telefone: string;
  cidade: string;
  tem_cnh: boolean;
  tem_veiculo: boolean;
  experiencia: string | null;
  disponibilidade: string | null;
  motivo: string | null;
  criado_em: string;
  decidido_em: string | null;
}

function semSessao() {
  return NextResponse.json(
    { mensagem: "Sem sessão.", codigo: "sem_sessao" },
    { status: 401 },
  );
}

/**
 * Os pedidos DESTA pessoa.
 *
 * O filtro por `usuario_id` não é redundante com a RLS: a policy permite ver o
 * próprio pedido OU a fila da organização, para gestao e admin — e policy
 * permissiva se soma. Sem o filtro, esta rota devolveria a fila inteira para
 * quem só queria saber do próprio pedido.
 *
 * A fila de quem decide é outra tela, com outra consulta: `/admin/equipe`.
 */
export async function GET() {
  const sessao = await sessaoAtual();
  if (!sessao) return semSessao();

  const r = await consultar<Solicitacao[]>(
    `solicitacao_staff?select=*&usuario_id=eq.${sessao.usuario.id}` +
      `&order=criado_em.desc`,
    sessao.accessToken,
  );

  if (!r.ok) {
    return NextResponse.json(
      { mensagem: "Não foi possível ler as solicitações.", codigo: "erro" },
      { status: 502 },
    );
  }

  return NextResponse.json({ solicitacoes: r.dados ?? [] }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return semSessao();

  let corpo: Record<string, unknown>;
  try {
    corpo = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { mensagem: "JSON inválido.", codigo: "json_invalido" },
      { status: 400 },
    );
  }

  const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const telefone = texto(corpo.telefone);
  const cidade = texto(corpo.cidade);

  if (!telefone || !cidade) {
    return NextResponse.json(
      { mensagem: "Telefone e cidade são obrigatórios.", codigo: "incompleto" },
      { status: 400 },
    );
  }

  const r = await consultar("solicitacao_staff", sessao.accessToken, {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({
      organizacao_id: sessao.usuario.organizacaoId,
      usuario_id: sessao.usuario.id,
      telefone,
      cidade,
      tem_cnh: corpo.tem_cnh === true,
      tem_veiculo: corpo.tem_veiculo === true,
      experiencia: texto(corpo.experiencia) || null,
      disponibilidade: texto(corpo.disponibilidade) || null,
    }),
  });

  if (!r.ok) {
    /*
     * 23505 é o índice único `ux_solicitacao_staff_pendente`: já existe um
     * pedido em aberto. Não é erro de servidor, e a tela precisa distinguir
     * para dizer "seu pedido já está na fila" em vez de "algo deu errado".
     */
    const duplicado = r.erro?.includes("23505") || r.status === 409;
    return NextResponse.json(
      {
        mensagem: duplicado
          ? "Você já tem um pedido aguardando decisão."
          : "Não foi possível registrar o pedido.",
        codigo: duplicado ? "ja_existe" : "erro",
      },
      { status: duplicado ? 409 : 400 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

/** Aprovar ou recusar. Quem pode é decidido no banco. */
export async function PATCH(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return semSessao();

  let corpo: Record<string, unknown>;
  try {
    corpo = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { mensagem: "JSON inválido.", codigo: "json_invalido" },
      { status: 400 },
    );
  }

  const r = await chamarFuncao(
    "decidir_solicitacao_staff",
    {
      p_solicitacao: corpo.id,
      p_aprovar: corpo.aprovar === true,
      p_motivo: typeof corpo.motivo === "string" ? corpo.motivo : null,
    },
    sessao.accessToken,
  );

  if (!r.ok) {
    return NextResponse.json(
      { mensagem: mensagemDoPostgres(r.erro), codigo: "recusado" },
      { status: r.status === 0 ? 502 : 403 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

/**
 * A mensagem do `raise exception` do Postgres, quando ela chega.
 *
 * O PostgREST devolve `{"message": "..."}` no corpo do erro. As exceções das
 * funções de acesso são escritas para serem lidas por gente ("só admin altera
 * papel de gestao ou admin"), então repassá-las é melhor do que substituir por
 * um genérico. O fallback existe para erro que não veio de `raise`.
 */
function mensagemDoPostgres(erro: string | null): string {
  if (!erro) return "Não foi possível concluir.";
  try {
    const corpo = JSON.parse(erro) as { message?: string };
    return corpo.message ?? "Não foi possível concluir.";
  } catch {
    return "Não foi possível concluir.";
  }
}
