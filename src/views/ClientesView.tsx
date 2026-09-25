import {ClientesTabela,type ClienteResumo} from "../components/painel/TabelasOperacionais";
import { Paginacao } from "../components/painel/Paginacao";
import { podeAcessar } from "../servidor/auth/sessao-atual";
import Link from "next/link";
import { Search } from "lucide-react";

import {
  CabecalhoDoPainel,
  FalhaDeLeitura,
  SemLinhas,
} from "../components/painel/Painel";
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

  const resultado = await consultar<ClienteResumo[]>(
      "vw_cliente_resumo?select=id,nome,telefone,eventos,primeiro_evento," +
        "ultimo_evento,pessoas_atendidas,total_gasto" +
        filtro +
        `&order=ultimo_evento.desc.nullslast,id.asc&limit=${POR_PAGINA}&offset=${de}`,
      sessao.accessToken,
      { headers: { Prefer: "count=exact" } },
    );
  const leitura = comoLeitura(resultado);

  const linhas = leitura.estado === "ok" ? leitura.linhas : [];

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
          <ClientesTabela linhas={linhas} gestao={podeAcessar(sessao.usuario.papel,["gestao"])}/>


        </>
      )}
      {leitura.estado !== "erro" && <Paginacao pagina={pagina} total={resultado.total ?? 0} porPagina={POR_PAGINA} />}
    </div>
  );
}
