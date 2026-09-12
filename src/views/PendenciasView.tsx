import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";

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
}: {
  /** Filtro vindo da query. `null` mostra tudo. */
  bloco: string | null;
}) {
  const sessao = await exigirPapel(["staff"]);

  const filtro = bloco ? `&bloco=eq.${encodeURIComponent(bloco)}` : "";

  const leitura = comoLeitura(
    await consultar<Pendencia[]>(
      "vw_pendencia?select=bloco,ordem,id,data_evento,codigo_legado,pendencia,faltando" +
        filtro +
        "&order=ordem.asc,data_evento.asc&limit=300",
      sessao.accessToken,
    ),
  );

  const linhas = leitura.estado === "ok" ? leitura.linhas : [];

  const porBloco = new Map<string, number>();
  for (const p of linhas) {
    porBloco.set(p.bloco, (porBloco.get(p.bloco) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-space-lg">
      <CabecalhoDoPainel
        titulo="Pendências"
        descricao="O que ainda falta resolver, pela mesma regra que a planilha usa desde 2018."
        contagem={leitura.estado === "ok" ? linhas.length : null}
      />

      <nav className="flex items-center gap-space-xs flex-wrap">
        <Filtro rotulo="Todas" para="/operacional/pendencias" ativo={!bloco} />
        {Object.entries(NOME_DO_BLOCO).map(([chave, nome]) => (
          <Filtro
            key={chave}
            rotulo={nome}
            quantidade={porBloco.get(chave)}
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
        <Tabela colunas={["Bloco", "Evento", "Data", "O que falta", ""]}>
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
                <span className="flex flex-col gap-1">
                  <span className="text-on-surface">{p.pendencia}</span>
                  {p.faltando && p.faltando.length > 0 && (
                    <span className="flex flex-wrap gap-1">
                      {p.faltando.map((f) => (
                        <span
                          key={f}
                          className="px-1.5 py-0.5 rounded bg-surface-container font-label-sm text-label-sm"
                        >
                          {f}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </Celula>
              <Celula className="text-right">
                <Link
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

      {leitura.estado === "ok" && linhas.length === 300 && (
        <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-space-xs">
          <ClipboardList className="w-4 h-4" />
          Mostrando as 300 primeiras. Filtre por bloco para ver o resto.
        </p>
      )}
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
    <Link
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
