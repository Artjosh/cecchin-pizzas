import { NextResponse, type NextRequest } from "next/server";

import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { chamarFuncao, consultar } from "@/src/servidor/supabase";

/**
 * Quem é quem na organização, e a troca de papel.
 *
 * A regra de quem pode promover quem NÃO está aqui. Está em `app.promover()`,
 * que verifica papel de origem e de destino ao mesmo tempo, recusa mexer em
 * gestao/admin sem ser admin, e se recusa a rebaixar o último admin — uma
 * organização sem admin não tem quem devolva acesso a ninguém, e é um estado do
 * qual não se sai por dentro do produto.
 *
 * Ter essa lógica no banco e não aqui é o que garante que ela vale mesmo para
 * quem chamar o PostgREST direto, sem passar por esta rota.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Pessoa {
  id: string;
  nome: string;
  email: string | null;
  papel: "cliente" | "staff" | "gestao" | "admin";
  ativo: boolean;
  criado_em: string;
}

export async function GET() {
  const sessao = await sessaoAtual();
  if (!sessao) {
    return NextResponse.json(
      { mensagem: "Sem sessão.", codigo: "sem_sessao" },
      { status: 401 },
    );
  }

  /*
   * Só quem trabalha na operação aparece. A lista completa incluiria os
   * clientes — potencialmente milhares — e a tela existe para administrar
   * equipe, não para folhear cadastro de cliente.
   */
  const r = await consultar<Pessoa[]>(
    "usuario?select=id,nome,email,papel,ativo,criado_em" +
      "&papel=in.(staff,gestao,admin)&order=papel.asc,nome.asc",
    sessao.accessToken,
  );

  if (!r.ok) {
    return NextResponse.json(
      { mensagem: "Não foi possível ler a equipe.", codigo: "erro" },
      { status: 502 },
    );
  }

  return NextResponse.json(
    { pessoas: r.dados ?? [], meuPapel: sessao.usuario.papel },
    { status: 200 },
  );
}

export async function PATCH(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) {
    return NextResponse.json(
      { mensagem: "Sem sessão.", codigo: "sem_sessao" },
      { status: 401 },
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

  const r = await chamarFuncao(
    "promover_usuario",
    { p_usuario: corpo.usuario, p_papel: corpo.papel },
    sessao.accessToken,
  );

  if (!r.ok) {
    let mensagem = "Não foi possível alterar o papel.";
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

  return NextResponse.json({ ok: true }, { status: 200 });
}
