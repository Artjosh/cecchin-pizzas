import { NextResponse, type NextRequest } from "next/server";

import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { consultar } from "@/src/servidor/supabase";

/**
 * Catálogo: criar item e ligar/desligar item.
 *
 * **Escreve pelo PostgREST com o token da pessoa**, e não com `service_role`.
 * É o que faz a RLS valer: a policy `modelo_rodizio_escrita` exige `gestao` ou
 * `admin` (009_catalogo.sql), e o `organizacao_id` que vai no corpo é
 * confrontado com `app.org_atual()` no `with check`. Se este arquivo mandasse a
 * organização errada, o banco recusaria — não é uma verificação que se possa
 * esquecer aqui.
 *
 * **Não existe DELETE.** `evento` referencia os dois modelos com
 * `on delete restrict`, e oito anos de eventos apontam para eles: apagar um
 * modelo usado é impossível, e apagar um sem uso reescreveria o histórico do
 * dia em que passar a ter. Desligar (`ativo = false`) tira o item das telas de
 * contratação e preserva o que já foi vendido.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Tipo = "rodizio" | "forno";

const TABELA: Record<Tipo, string> = {
  rodizio: "modelo_rodizio",
  forno: "modelo_forno",
};

function ehTipo(v: unknown): v is Tipo {
  return v === "rodizio" || v === "forno";
}

/**
 * `Rodízio Premium 4h` vira `rodizio-premium-4h`.
 *
 * O slug é unique por organização e não tem default no banco. Gerá-lo do nome
 * mantém o que já existe (`classico`, `premium`) legível, e o sufixo numérico
 * resolve a colisão sem pedir nada a quem está na tela.
 */
function comoSlug(nome: string): string {
  return (
    nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "item"
  );
}

async function sessaoQuePodeAdministrar() {
  const sessao = await sessaoAtual();
  if (!sessao) return { erro: NextResponse.json({ mensagem: "Sem sessão.", codigo: "sem_sessao" }, { status: 401 }) };

  if (sessao.usuario.papel !== "gestao" && sessao.usuario.papel !== "admin") {
    return {
      erro: NextResponse.json(
        { mensagem: "Só gestão ou admin mexe no catálogo.", codigo: "sem_papel" },
        { status: 403 },
      ),
    };
  }

  return { sessao };
}

/** Mensagem do Postgres, quando houver. O genérico esconde o motivo real. */
function motivo(bruto: string | null, padrao: string): string {
  try {
    const d = JSON.parse(bruto ?? "{}") as { message?: string };
    return d.message ?? padrao;
  } catch {
    return padrao;
  }
}

export async function POST(request: NextRequest) {
  const { sessao, erro } = await sessaoQuePodeAdministrar();
  if (erro) return erro;

  let corpo: Record<string, unknown>;
  try {
    corpo = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ mensagem: "JSON inválido.", codigo: "json_invalido" }, { status: 400 });
  }

  const tipo = corpo.tipo;
  const nome = typeof corpo.nome === "string" ? corpo.nome.trim() : "";

  if (!ehTipo(tipo)) {
    return NextResponse.json({ mensagem: "Tipo precisa ser rodizio ou forno.", codigo: "tipo" }, { status: 400 });
  }
  if (nome.length < 2) {
    return NextResponse.json({ mensagem: "O nome precisa de pelo menos duas letras.", codigo: "nome" }, { status: 400 });
  }

  const linha: Record<string, unknown> = {
    organizacao_id: sessao.usuario.organizacaoId,
    slug: comoSlug(nome),
    nome,
    ativo: true,
  };

  if (tipo === "rodizio") {
    const horas = Number(corpo.horas_montagem ?? 1);
    if (!Number.isFinite(horas) || horas <= 0 || horas > 12) {
      return NextResponse.json(
        { mensagem: "Horas de montagem precisam ficar entre 0 e 12.", codigo: "horas" },
        { status: 400 },
      );
    }
    linha.horas_montagem = horas;
  }

  const r = await consultar<{ id: string }[]>(TABELA[tipo], sessao.accessToken, {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify(linha),
  });

  if (!r.ok) {
    // 23505 é slug repetido: dois itens com o mesmo nome na mesma organização.
    const repetido = (r.erro ?? "").includes("23505");
    return NextResponse.json(
      {
        mensagem: repetido
          ? "Já existe um item com esse nome."
          : motivo(r.erro, "Não foi possível criar o item."),
        codigo: repetido ? "repetido" : "recusado",
      },
      { status: r.status === 0 ? 502 : repetido ? 409 : 403 },
    );
  }

  return NextResponse.json({ id: r.dados?.[0]?.id ?? null }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { sessao, erro } = await sessaoQuePodeAdministrar();
  if (erro) return erro;

  let corpo: Record<string, unknown>;
  try {
    corpo = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ mensagem: "JSON inválido.", codigo: "json_invalido" }, { status: 400 });
  }

  const tipo = corpo.tipo;
  const id = typeof corpo.id === "string" ? corpo.id : "";

  if (!ehTipo(tipo)) {
    return NextResponse.json({ mensagem: "Tipo precisa ser rodizio ou forno.", codigo: "tipo" }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ mensagem: "Falta o id do item.", codigo: "id" }, { status: 400 });
  }

  const mudanca: Record<string, unknown> = {};
  if (typeof corpo.ativo === "boolean") mudanca.ativo = corpo.ativo;
  if (typeof corpo.nome === "string" && corpo.nome.trim().length >= 2) {
    mudanca.nome = corpo.nome.trim();
  }
  if (tipo === "rodizio" && corpo.horas_montagem !== undefined) {
    const horas = Number(corpo.horas_montagem);
    if (!Number.isFinite(horas) || horas <= 0 || horas > 12) {
      return NextResponse.json(
        { mensagem: "Horas de montagem precisam ficar entre 0 e 12.", codigo: "horas" },
        { status: 400 },
      );
    }
    mudanca.horas_montagem = horas;
  }

  if (Object.keys(mudanca).length === 0) {
    return NextResponse.json({ mensagem: "Nada para alterar.", codigo: "vazio" }, { status: 400 });
  }

  /*
   * O filtro por `organizacao_id` é redundante com a RLS, e fica. A policy
   * decide o que EXISTE para esta pessoa; o filtro deixa a intenção legível no
   * próprio pedido, e um PATCH sem filtro suficiente é a forma clássica de
   * atualizar a tabela inteira quando alguém afrouxa uma policy no futuro.
   */
  const r = await consultar<unknown[]>(
    `${TABELA[tipo]}?id=eq.${encodeURIComponent(id)}` +
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
      { mensagem: motivo(r.erro, "Não foi possível alterar o item."), codigo: "recusado" },
      { status: r.status === 0 ? 502 : 403 },
    );
  }

  if (!r.dados?.length) {
    return NextResponse.json({ mensagem: "Item não encontrado.", codigo: "sem_item" }, { status: 404 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
