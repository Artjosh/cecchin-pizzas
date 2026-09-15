import { Paginacao } from "../components/painel/Paginacao";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  CabecalhoDoPainel,
  Celula,
  Etiqueta,
  FalhaDeLeitura,
  Linha,
  SemLinhas,
  Tabela,
} from "../components/painel/Painel";
import { comoData } from "../lib/formato";
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

interface Pendencia {
  bloco: string;
  ordem: number;
  id: string;
  data_evento: string;
  codigo_legado: string | null;
  pendencia: string;
  faltando: string[] | null;
}

const NOME_DO_BLOCO: Record<string, string> = {
  informacao: "Informação",
  dinheiro: "Dinheiro",
  confirmacao: "Confirmação",
  feedback: "Feedback",
};

/** Dinheiro é o que atrasa faturamento. Feedback pode esperar. */
function tomDoBloco(bloco: string): "neutro" | "atencao" | "bom" {
  if (bloco === "dinheiro") return "atencao";
  if (bloco === "feedback") return "bom";
  return "neutro";
}

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
        `&order=ordem.asc,data_evento.asc,id.asc,bloco.asc&limit=51&offset=${pagina * 50}`,
      sessao.accessToken,
      { headers: { Prefer: "count=exact" } },
    );
  const leitura = comoLeitura(resultado);

  const recebidas = leitura.estado === "ok" ? leitura.linhas : [];
  const linhas = recebidas.slice(0, 50);


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
        <Tabela
          colunas={["Bloco", "Evento", "Data", "O que falta", ""]}
          className="table-fixed min-w-[1104px] [&_td]:align-middle [&_tbody_tr:hover]:bg-primary/15 [&_tbody_tr:focus-within]:bg-primary/15"
          larguras={["15%", "13.5%", "17.8%", "41%", "12.7%"]}
        >
          {linhas.map((p) => (
            <Linha key={`${p.bloco}-${p.id}`}>
              <Celula>
                <Etiqueta tom={tomDoBloco(p.bloco)}>
                  {NOME_DO_BLOCO[p.bloco] ?? p.bloco}
                </Etiqueta>
              </Celula>
              <Celula destaque>
                <span className="font-mono">{p.codigo_legado ?? "—"}</span>
              </Celula>
              <Celula className="whitespace-nowrap">
                {comoData(p.data_evento)}
              </Celula>
              <Celula>
                <div className="max-w-full overflow-x-auto" tabIndex={p.faltando?.length ? 0 : undefined} aria-label={p.faltando?.length ? "Detalhes da pendência" : undefined}>
                  <span className="flex w-max min-w-full items-center whitespace-nowrap">
                    {!p.faltando?.length && <span title={p.pendencia} className="min-w-0 truncate text-on-surface">{p.pendencia}</span>}
                    {p.faltando && p.faltando.length > 0 && (
                      <span className="flex w-max min-w-44 items-center justify-center gap-1">
                        {p.faltando.map((f) => (
                          <span
                            key={f}
                            className="shrink-0 px-1.5 py-0.5 rounded bg-surface-container font-label-sm text-label-sm"
                          >
                            {f}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                </div>
              </Celula>
              <Celula className="text-right">
                <Link prefetch={false}
                  href={`/operacional/eventos/${p.id}`}
                  className="inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:opacity-80"
                >
                  Abrir
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Celula>
            </Linha>
          ))}
        </Tabela>
      )}

      {leitura.estado !== "erro" && <Paginacao pagina={pagina + 1} total={resultado.total ?? 0} porPagina={50} baseZero />}

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
