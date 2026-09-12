import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Receipt } from "lucide-react";

import {
  CabecalhoDoPainel,
  Celula,
  Etiqueta,
  FalhaDeLeitura,
  LacunaDeDados,
  Linha,
  SemLinhas,
  Tabela,
} from "../components/painel/Painel";
import { comoData } from "../lib/formato";
import { formatBRL } from "../lib/moeda";
import { exigirPapel } from "../servidor/auth/guarda";
import { consultar } from "../servidor/supabase";
import { comoLeitura } from "../servidor/fonte";

/**
 * Financeiro: o que entrou, o que saiu e o que está a acertar.
 *
 * **As três tabelas estão vazias, e não é defeito.** `entrada`, `despesa` e
 * `conta_a_pagar` foram modeladas na migração e nunca carregadas — o financeiro
 * da planilha ficou de fora da primeira carga, e continua lá.
 *
 * A tela existe com a estrutura pronta porque o que falta é o ETL, não o
 * desenho. Quando a carga rodar, isto passa a mostrar dado sem tocar em uma
 * linha daqui.
 *
 * Enquanto isso, `vw_conciliacao_evento` já tem o que importa: quanto cada
 * evento deveria ter recebido contra o que foi lançado. É a única leitura
 * financeira que funciona hoje, e vem de `evento`, não das tabelas vazias.
 */

interface Conciliacao {
  evento_id: string;
  data_evento: string;
  cliente_nome: string | null;
  sinal: string | number | null;
  a_acertar: string | number | null;
  valor_cobrado: string | number | null;
  sinal_lancado: boolean | null;
  pagamento_lancado: boolean | null;
  sinal_a_conferir: boolean | null;
  acerto_pendente: boolean | null;
}

interface Lancamento {
  id: string;
  data: string;
  descricao: string | null;
  valor_bruto: string | number;
  valor_liquido: string | number | null;
  tipo: string | null;
}

export async function FinanceiroView() {
  const sessao = await exigirPapel(["gestao"]);

  const [conciliacaoR, entradasR, despesasR, contasR] = await Promise.all([
    consultar<Conciliacao[]>(
      "vw_conciliacao_evento?select=*&or=(acerto_pendente.is.true,sinal_a_conferir.is.true)" +
        "&order=data_evento.desc&limit=100",
      sessao.accessToken,
    ),
    consultar<Lancamento[]>(
      "entrada?select=id,data,descricao,valor_bruto,valor_liquido,tipo&order=data.desc&limit=30",
      sessao.accessToken,
    ),
    consultar<Lancamento[]>(
      "despesa?select=id,data,descricao,valor_bruto:valor,tipo:natureza&order=data.desc&limit=30",
      sessao.accessToken,
    ),
    consultar<{ id: string }[]>(
      "conta_a_pagar?select=id&limit=1",
      sessao.accessToken,
    ),
  ]);

  const conciliacao = comoLeitura(conciliacaoR);
  const pendentes = conciliacao.estado === "ok" ? conciliacao.linhas : [];

  const totalAAcertar = pendentes.reduce(
    (soma, c) => soma + Number(c.a_acertar ?? 0),
    0,
  );

  const semLancamento =
    (entradasR.dados?.length ?? 0) === 0 &&
    (despesasR.dados?.length ?? 0) === 0 &&
    (contasR.dados?.length ?? 0) === 0;

  return (
    <div className="flex flex-col gap-space-lg">
      <CabecalhoDoPainel
        titulo="Financeiro"
        descricao="O que ainda não foi acertado, e o que foi lançado."
      />

      {semLancamento && (
        <LacunaDeDados titulo="As tabelas de lançamento estão vazias">
          <p>
            <code className="font-mono">entrada</code>,{" "}
            <code className="font-mono">despesa</code> e{" "}
            <code className="font-mono">conta_a_pagar</code> foram modeladas na
            migração e nunca carregadas: o financeiro da planilha ficou de fora
            da primeira carga.
          </p>
          <p>
            O que falta é o ETL, não a tela. Quando a carga rodar, esta página
            passa a mostrar dado sem mudar uma linha de código. Lista em{" "}
            <code className="font-mono">migracao/ETL.md</code>.
          </p>
        </LacunaDeDados>
      )}

      <section className="flex flex-col gap-space-sm">
        <div className="flex items-baseline justify-between gap-space-md flex-wrap">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            A acertar
          </h2>
          {pendentes.length > 0 && (
            <span className="font-headline-sm text-headline-sm text-primary">
              {formatBRL(totalAAcertar)}
            </span>
          )}
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Vem de <code className="font-mono">vw_conciliacao_evento</code>, sobre{" "}
          <code className="font-mono">evento</code> — a única leitura financeira
          que funciona sem as tabelas de lançamento.
        </p>

        {conciliacao.estado === "erro" && (
          <FalhaDeLeitura motivo={conciliacao.motivo} />
        )}

        {conciliacao.estado === "vazio" && (
          <SemLinhas
            titulo="Nada a acertar"
            detalhe="Nenhum evento com sinal a conferir ou acerto pendente."
          />
        )}

        {conciliacao.estado === "ok" && (
          <Tabela
            colunas={["Data", "Cliente", "Cobrado", "Sinal", "A acertar", "Situação", ""]}
          >
            {pendentes.map((c) => (
              <Linha key={c.evento_id}>
                <Celula className="whitespace-nowrap">
                  {comoData(c.data_evento)}
                </Celula>
                <Celula destaque>{c.cliente_nome ?? "—"}</Celula>
                <Celula className="text-right whitespace-nowrap">
                  {c.valor_cobrado === null
                    ? "não acertado"
                    : formatBRL(Number(c.valor_cobrado))}
                </Celula>
                <Celula className="text-right whitespace-nowrap">
                  {formatBRL(Number(c.sinal ?? 0))}
                </Celula>
                <Celula destaque className="text-right whitespace-nowrap">
                  {formatBRL(Number(c.a_acertar ?? 0))}
                </Celula>
                <Celula>
                  <span className="flex flex-wrap gap-1">
                    {c.sinal_a_conferir && (
                      <Etiqueta tom="atencao">conferir sinal</Etiqueta>
                    )}
                    {c.acerto_pendente && (
                      <Etiqueta tom="atencao">acerto pendente</Etiqueta>
                    )}
                  </span>
                </Celula>
                <Celula className="text-right">
                  <Link
                    href={`/operacional/eventos/${c.evento_id}`}
                    className="font-label-md text-label-md text-primary hover:opacity-80"
                  >
                    Abrir
                  </Link>
                </Celula>
              </Linha>
            ))}
          </Tabela>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
        <Lancamentos
          titulo="Entradas"
          icone={<ArrowUpRight className="w-5 h-5" />}
          linhas={entradasR.dados ?? []}
          vazio="Nenhuma entrada lançada. A carga do financeiro ainda não rodou."
        />
        <Lancamentos
          titulo="Despesas"
          icone={<ArrowDownRight className="w-5 h-5" />}
          linhas={despesasR.dados ?? []}
          vazio="Nenhuma despesa lançada."
        />
      </div>
    </div>
  );
}

function Lancamentos({
  titulo,
  icone,
  linhas,
  vazio,
}: {
  titulo: string;
  icone: React.ReactNode;
  linhas: Lancamento[];
  vazio: string;
}) {
  return (
    <section className="flex flex-col gap-space-sm">
      <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-space-sm">
        <span className="text-tertiary">{icone}</span>
        {titulo}
      </h2>

      {linhas.length === 0 ? (
        <SemLinhas titulo="Sem lançamento" detalhe={vazio} />
      ) : (
        <Tabela colunas={["Data", "Descrição", "Valor"]}>
          {linhas.map((l) => (
            <Linha key={l.id}>
              <Celula className="whitespace-nowrap">{comoData(l.data)}</Celula>
              <Celula>
                <span className="flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-tertiary shrink-0" />
                  {l.descricao ?? l.tipo ?? "—"}
                </span>
              </Celula>
              <Celula destaque className="text-right whitespace-nowrap">
                {formatBRL(Number(l.valor_liquido ?? l.valor_bruto ?? 0))}
              </Celula>
            </Linha>
          ))}
        </Tabela>
      )}
    </section>
  );
}
