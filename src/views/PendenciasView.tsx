import {PendenciasTabela,type Pendencia} from "../components/painel/TabelasOperacionais";
import { Paginacao } from "../components/painel/Paginacao";
import Link from "next/link";

import {
  CabecalhoDoPainel,
  FalhaDeLeitura,
  SemLinhas,
} from "../components/painel/Painel";
import { exigirPapel } from "../servidor/auth/guarda";
import { consultar } from "../servidor/supabase";
import { comoLeitura } from "../servidor/fonte";

/**
 * A fila de trabalho de verdade.
 *
 * `vw_pendencia` é a única coisa neste banco que diz o que está FALTANDO, e
 * não o que aconteceu. Ela une quatro fontes — informação, dinheiro,
 * confirmação e feedback — com a mesma regra que o Apps Script usa há oito
 * anos.
 *
 * Não tinha tela. Era o maior buraco do produto: a operação enxergava a agenda
 * inteira e não tinha onde ver o que precisa de ação hoje.
 */



const NOME_DO_BLOCO: Record<string, string> = {
  informacao: "Informação",
  dinheiro: "Dinheiro",
  confirmacao: "Confirmação",
  feedback: "Feedback",
};
const PENDENCIAS_POR_PAGINA = 20;

export async function PendenciasView({
  bloco,
  pagina = 0,
}: {
  /** Filtro vindo da query. `null` mostra tudo. */
  bloco: string | null;
  pagina?: number;
}) {
  const sessao = await exigirPapel(["staff"]);

  const filtro = bloco ? `&bloco=eq.${encodeURIComponent(bloco)}` : "";

  const resultado = await consultar<Pendencia[]>(
      "vw_pendencia?select=bloco,ordem,id,data_evento,codigo_legado,pendencia,faltando" +
        filtro +
        `&order=ordem.asc,data_evento.asc,id.asc,bloco.asc&limit=${PENDENCIAS_POR_PAGINA}&offset=${pagina * PENDENCIAS_POR_PAGINA}`,
      sessao.accessToken,
      { headers: { Prefer: "count=exact" } },
    );
  const leitura = comoLeitura(resultado);

  const linhas = leitura.estado === "ok" ? leitura.linhas : [];


  return (
    <div className="flex flex-col gap-space-lg pb-20">
      <CabecalhoDoPainel
        titulo="Pendências"
        descricao="O que ainda falta resolver, pela mesma regra que a planilha usa desde 2018."
      />

      <nav className="flex items-center gap-space-xs flex-wrap">
        <Filtro rotulo="Todas" para="/operacional/pendencias" ativo={!bloco} />
        {Object.entries(NOME_DO_BLOCO).map(([chave, nome]) => (
          <Filtro
            key={chave}
            rotulo={nome}
            para={`/operacional/pendencias?bloco=${chave}`}
            ativo={bloco === chave}
          />
        ))}
      </nav>

      {leitura.estado === "erro" && <FalhaDeLeitura motivo={leitura.motivo} />}

      {leitura.estado === "vazio" && (
        <SemLinhas
          titulo="Nada pendente"
          detalhe={
            bloco
              ? "Nenhuma pendência neste bloco."
              : "A operação está em dia — ou os eventos ainda não chegaram ao ponto de gerar pendência."
          }
        />
      )}

      {leitura.estado === "ok" && (
        <PendenciasTabela linhas={linhas}/>
      )}

      {leitura.estado !== "erro" && <Paginacao pagina={pagina + 1} total={resultado.total ?? 0} porPagina={PENDENCIAS_POR_PAGINA} baseZero />}

    </div>
  );
}

function Filtro({
  rotulo,
  para,
  ativo,
  quantidade,
}: {
  rotulo: string;
  para: string;
  ativo: boolean;
  quantidade?: number;
}) {
  return (
    <Link prefetch={false}
      href={para}
      aria-current={ativo ? "page" : undefined}
      className={
        "h-9 px-3 rounded-full font-label-md text-label-md flex items-center gap-1.5 transition-colors " +
        (ativo
          ? "bg-primary text-on-primary"
          : "bg-surface-container text-on-surface hover:bg-surface-container-high")
      }
    >
      {rotulo}
      {quantidade !== undefined && quantidade > 0 && (
        <span className="opacity-70">{quantidade}</span>
      )}
    </Link>
  );
}
