import Link from "next/link";
import { ArrowRight, MessageCircle, Search } from "lucide-react";

import {
  CabecalhoDoPainel,
  Celula,
  FalhaDeLeitura,
  Linha,
  SemLinhas,
  Tabela,
} from "../components/painel/Painel";
import { comoData, comoTelefone, linkWhatsApp } from "../lib/formato";
import { formatBRL } from "../lib/moeda";
import { exigirPapel } from "../servidor/auth/guarda";
import { consultar } from "../servidor/supabase";
import { comoLeitura } from "../servidor/fonte";

/**
 * Os 10.462 clientes de oito anos.
 *
 * Não tinha tela nenhuma. É a segunda maior tabela do banco e a que a operação
 * mais consulta na planilha — "essa pessoa já contratou antes?" é a primeira
 * pergunta de todo atendimento.
 *
 * Lê `vw_cliente_resumo`, que agrega eventos, pessoas atendidas e total gasto.
 * Duas regras que a view preserva da planilha: cancelado SEM sinal não conta
 * como evento; cancelado COM sinal conta, porque o dinheiro passou.
 */

interface ClienteResumo {
  id: string;
  nome: string | null;
  telefone: string | null;
  eventos: number;
  primeiro_evento: string | null;
  ultimo_evento: string | null;
  pessoas_atendidas: number | null;
  total_gasto: string | number | null;
}

const POR_PAGINA = 50;

export async function ClientesView({
  busca,
  pagina,
}: {
  busca: string;
  pagina: number;
}) {
  const sessao = await exigirPapel(["staff"]);

  const de = (pagina - 1) * POR_PAGINA;

  /*
   * `ilike` com `*` é o curinga do PostgREST. A busca cobre nome E telefone
   * porque quem atende tem um dos dois na mão, nunca os dois — o WhatsApp traz
   * número, a indicação traz nome.
   */
  const termo = busca.trim();
  const filtro = termo
    ? `&or=(nome.ilike.*${encodeURIComponent(termo)}*,telefone.ilike.*${encodeURIComponent(
        termo.replace(/\D/g, "") || termo,
      )}*)`
    : "";

  const leitura = comoLeitura(
    await consultar<ClienteResumo[]>(
      "vw_cliente_resumo?select=id,nome,telefone,eventos,primeiro_evento," +
        "ultimo_evento,pessoas_atendidas,total_gasto" +
        filtro +
        `&order=ultimo_evento.desc.nullslast&limit=${POR_PAGINA}&offset=${de}`,
      sessao.accessToken,
    ),
  );

  const linhas = leitura.estado === "ok" ? leitura.linhas : [];
  const temProxima = linhas.length === POR_PAGINA;

  return (
    <div className="flex flex-col gap-space-lg">
      <CabecalhoDoPainel
        titulo="Clientes"
        descricao="Quem já contratou, quanto gastou e quando foi a última vez."
      />

      <form
        action="/operacional/clientes"
        method="get"
        className="flex items-center gap-space-sm"
      >
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-on-surface-variant pointer-events-none" />
          <input
            name="busca"
            defaultValue={busca}
            placeholder="Nome ou telefone"
            aria-label="Buscar cliente"
            className="w-full h-12 bg-surface-container-low pl-11 pr-4 rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container transition-colors"
          />
        </div>
        <button
          type="submit"
          className="h-12 px-5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity"
        >
          Buscar
        </button>
        {busca && (
          <Link
            href="/operacional/clientes"
            className="h-12 px-4 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md flex items-center hover:bg-surface-container-high transition-colors"
          >
            Limpar
          </Link>
        )}
      </form>

      {leitura.estado === "erro" && <FalhaDeLeitura motivo={leitura.motivo} />}

      {leitura.estado === "vazio" && (
        <SemLinhas
          titulo={busca ? "Ninguém com esse nome ou número" : "Nenhum cliente"}
          detalhe={
            busca
              ? "A busca cobre nome e telefone. Tente parte do nome, ou só os dígitos do número."
              : "Os clientes vêm da carga da planilha."
          }
        />
      )}

      {leitura.estado === "ok" && (
        <>
          <Tabela
            colunas={["Cliente", "Telefone", "Eventos", "Pessoas", "Gasto", "Último", ""]}
          >
            {linhas.map((c) => {
              const zap = linkWhatsApp(c.telefone);
              return (
                <Linha key={c.id}>
                  <Celula destaque>{c.nome ?? "sem nome"}</Celula>
                  <Celula className="whitespace-nowrap">
                    {zap ? (
                      <a
                        href={zap}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-primary hover:opacity-80"
                      >
                        <MessageCircle className="w-4 h-4" />
                        {comoTelefone(c.telefone)}
                      </a>
                    ) : (
                      comoTelefone(c.telefone)
                    )}
                  </Celula>
                  <Celula destaque className="text-right">
                    {c.eventos}
                  </Celula>
                  <Celula className="text-right">
                    {c.pessoas_atendidas ?? "—"}
                  </Celula>
                  <Celula destaque className="text-right whitespace-nowrap">
                    {formatBRL(Number(c.total_gasto ?? 0))}
                  </Celula>
                  <Celula className="whitespace-nowrap">
                    {comoData(c.ultimo_evento)}
                  </Celula>
                  <Celula className="text-right">
                    <Link
                      href={`/operacional/clientes/${c.id}`}
                      className="inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:opacity-80"
                    >
                      Abrir
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Celula>
                </Linha>
              );
            })}
          </Tabela>

          <Paginacao busca={busca} pagina={pagina} temProxima={temProxima} />
        </>
      )}
    </div>
  );
}

/**
 * Paginação por `offset`.
 *
 * Não há contagem total de propósito: `count=exact` sobre 10.462 linhas
 * agregadas custa uma varredura a cada página, e ninguém precisa saber que há
 * 210 páginas. "Tem mais" é a única informação que muda o que a pessoa faz.
 */
function Paginacao({
  busca,
  pagina,
  temProxima,
}: {
  busca: string;
  pagina: number;
  temProxima: boolean;
}) {
  const url = (n: number) => {
    const p = new URLSearchParams();
    if (busca) p.set("busca", busca);
    if (n > 1) p.set("pagina", String(n));
    const q = p.toString();
    return `/operacional/clientes${q ? "?" + q : ""}`;
  };

  if (pagina === 1 && !temProxima) return null;

  return (
    <nav className="flex items-center justify-between gap-space-md">
      {pagina > 1 ? (
        <Link
          href={url(pagina - 1)}
          className="h-10 px-4 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md flex items-center hover:bg-surface-container-high transition-colors"
        >
          Anteriores
        </Link>
      ) : (
        <span />
      )}

      <span className="font-body-sm text-body-sm text-on-surface-variant">
        Página {pagina}
      </span>

      {temProxima ? (
        <Link
          href={url(pagina + 1)}
          className="h-10 px-4 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md flex items-center hover:bg-surface-container-high transition-colors"
        >
          Próximos
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
