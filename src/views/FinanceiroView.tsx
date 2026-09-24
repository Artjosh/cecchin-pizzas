import {ConciliacaoTabela,type Conciliacao} from "../components/painel/TabelasOperacionais";
import { ArrowDownRight, ArrowUpRight, Receipt } from "lucide-react";

import {
  CabecalhoDoPainel,
  Celula,
  FalhaDeLeitura,
  LacunaDeDados,
  Linha,
  SemLinhas,
  Tabela,
} from "../components/painel/Painel";
import { comoData } from "../lib/formato";
import { formatBRL } from "../lib/moeda";
import { GestaoFinanceira, type MovimentoHoje, type ResumoCaixa, type Acerto, type EscalaFreelance, type Cartao, type Fatura } from "../components/financeiro/GestaoFinanceira";
import { ReembolsoVeiculos, type PlanoVeiculo, type VeiculoFinanceiro, type UsoVeiculo, type ResumoUsoVeiculo } from "../components/financeiro/ReembolsoVeiculos";
import { exigirPapel } from "../servidor/auth/guarda";
import { consultar } from "../servidor/supabase";
import { comoLeitura } from "../servidor/fonte";

/**
 * Financeiro: o que entrou, o que saiu e o que está a acertar.
 *
 * Entradas incluem recebimentos confirmados da InfinitePay. Taxas ainda não
 * conciliadas são sinalizadas sem apresentar o bruto como líquido definitivo.
 */



interface Lancamento {
  id: string;
  data: string;
  descricao: string | null;
  valor_bruto: string | number;
  valor_liquido: string | number | null;
  tipo: string | null;
  observacao?: string | null;
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
      "entrada?select=id,data,descricao,valor_bruto,valor_liquido,tipo,observacao&order=data.desc&limit=30",
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

  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const [caixaR, resumoR, acertosR, escalasR, cartoesR, faturasR, pessoasR, planosR, veiculosR, usosR, usosResumoR] = await Promise.all([
    consultar<MovimentoHoje[]>(`vw_caixa_hoje?select=origem_id,dia,natureza,descricao,valor&dia=eq.${hoje}&order=natureza.asc,descricao.asc,valor.asc,origem_id.asc&limit=50`, sessao.accessToken),
    consultar<ResumoCaixa[]>(`vw_caixa_resumo_dia?select=movimentos,entradas,saidas,saldo&dia=eq.${hoje}&limit=1`, sessao.accessToken),
    consultar<Acerto[]>("acerto_freelance?select=id,usuario_id,evento_id,valor,chave_pix_retrato,estado,criado_em,evento(data_evento,codigo_legado)&estado=eq.pendente&order=criado_em.asc&limit=100", sessao.accessToken),
    consultar<EscalaFreelance[]>("vw_escala_freelance_a_concluir?select=id,usuario_id,evento_id,data_evento,codigo_legado,nome&order=data_evento.desc,id.asc&limit=100", sessao.accessToken),
    consultar<Cartao[]>("cartao_credito_empresa?select=id,nome,fechamento_dia,vencimento_dia&ativo=eq.true&order=nome.asc&limit=100", sessao.accessToken),
    consultar<Fatura[]>("vw_fatura_cartao?select=cartao_id,nome,competencia,vencimento,total,pago&order=competencia.desc&limit=100", sessao.accessToken),
    consultar<{ id: string; nome: string }[]>("usuario?select=id,nome&ativo=eq.true&limit=500", sessao.accessToken),
    consultar<PlanoVeiculo[]>("vw_viagem_particular_a_registrar?select=id,evento_id,veiculo_id,motorista_id,distancia_km,retorno_previsto&order=retorno_previsto.desc,id.desc&limit=26", sessao.accessToken),
    consultar<VeiculoFinanceiro[]>("veiculo_operacional?select=id,proprietario_id,modelo,placa&proprietario_id=not.is.null&order=modelo.asc&limit=200", sessao.accessToken),
    consultar<UsoVeiculo[]>("uso_veiculo_particular?select=id,plano_id,veiculo_id,motorista_id,numero_uso,km_rodados,transportou_material,lavagem_opcao,valor_deslocamento_centavos,valor_adicional_centavos,valor_lavagem_centavos,valor_bonus_centavos,estado&estado=eq.pendente&order=criado_em.asc,id.asc&limit=26", sessao.accessToken),
    consultar<ResumoUsoVeiculo[]>("vw_resumo_uso_veiculo?select=veiculo_id,ultimo_uso&limit=500", sessao.accessToken),
  ]);

  const conciliacao = comoLeitura(conciliacaoR);
  const pendentes = conciliacao.estado === "ok" ? conciliacao.linhas : [];

  const totalAAcertar = pendentes.reduce(
    (soma, c) => soma + Number(c.a_acertar ?? 0),
    0,
  );

  const semLancamento =
    entradasR.ok && despesasR.ok && contasR.ok &&
    (entradasR.dados?.length ?? 0) === 0 &&
    (despesasR.dados?.length ?? 0) === 0 &&
    (contasR.dados?.length ?? 0) === 0;

  return (
    <div className="flex flex-col gap-space-lg">
      <CabecalhoDoPainel
        titulo="Financeiro"
        descricao="O que ainda não foi acertado, e o que foi lançado."
      />

      {caixaR.ok && resumoR.ok && acertosR.ok && escalasR.ok && cartoesR.ok && faturasR.ok && pessoasR.ok ? <GestaoFinanceira movimentos={caixaR.dados ?? []} resumo={resumoR.dados?.[0] ?? { movimentos: 0, entradas: 0, saidas: 0, saldo: 0 }} acertos={acertosR.dados ?? []} escalas={escalasR.dados ?? []} cartoes={cartoesR.dados ?? []} faturas={faturasR.dados ?? []} pessoas={pessoasR.dados ?? []} /> : <p role="status" className="rounded-xl bg-surface-container-low p-4 text-on-surface-variant">Os novos módulos financeiros aguardam a migration da branch. Os lançamentos existentes continuam abaixo.</p>}

      {planosR.ok && veiculosR.ok && usosR.ok && usosResumoR.ok && pessoasR.ok ? <ReembolsoVeiculos planos={planosR.dados ?? []} veiculos={veiculosR.dados ?? []} usos={usosR.dados ?? []} resumos={usosResumoR.dados ?? []} pessoas={pessoasR.dados ?? []} /> : <p role="status" className="rounded-xl bg-surface-container-low p-4 text-on-surface-variant">Não foi possível carregar os reembolsos de veículos.</p>}

      {semLancamento && (
        <LacunaDeDados titulo="Nenhum lançamento financeiro disponível">
          <p>
            Recebimentos confirmados e demais lançamentos aparecerão aqui.
            As pendências dos eventos continuam disponíveis abaixo.
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
          Compare os valores previstos dos eventos com os recebimentos registrados.
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
          <ConciliacaoTabela pendentes={pendentes}/>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
        <Lancamentos
          titulo="Entradas"
          icone={<ArrowUpRight className="w-5 h-5" />}
          linhas={entradasR.dados ?? []}
          vazio="Nenhuma entrada lançada."
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
                {l.observacao?.startsWith("INFINITEPAY_TAXA_PENDENTE:") ? <><span>{formatBRL(Number(l.valor_bruto))} bruto</span><small className="block text-on-surface-variant">Taxas a conciliar</small></> : formatBRL(Number(l.valor_liquido ?? l.valor_bruto ?? 0))}
              </Celula>
            </Linha>
          ))}
        </Tabela>
      )}
    </section>
  );
}
