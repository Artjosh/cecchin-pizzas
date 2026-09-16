"use client";
import Link from "next/link";
import {ArrowRight,MessageCircle} from "lucide-react";
import {Tabela,Linha,Celula,Etiqueta} from "./Painel";
import {comoData,comoMomento,comoTelefone,linkCentralWhatsApp,linkWhatsApp} from "../../lib/formato";
import {formatBRL} from "../../lib/moeda";
export interface Pendencia {
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



export function PendenciasTabela({linhas}:{linhas:Pendencia[]}){return (<Tabela
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
        </Tabela>);}

export interface ClienteResumo {
  id: string;
  nome: string | null;
  telefone: string | null;
  eventos: number;
  primeiro_evento: string | null;
  ultimo_evento: string | null;
  pessoas_atendidas: number | null;
  total_gasto: string | number | null;
}

export function ClientesTabela({linhas,gestao}:{linhas:ClienteResumo[];gestao:boolean}){return (<Tabela
            colunas={["Cliente", "Telefone", "Eventos", "Pessoas", "Gasto", "Último", ""]}
          >
            {linhas.map((c) => {
              const zap = gestao ? linkCentralWhatsApp(c.telefone) : linkWhatsApp(c.telefone);
              return (
                <Linha key={c.id}>
                  <Celula destaque>{c.nome ?? "sem nome"}</Celula>
                  <Celula className="whitespace-nowrap">
                    {zap ? (
                      <a
                        href={zap}
                        target={zap?.startsWith("/") ? undefined : "_blank"}
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
                    <Link prefetch={false}
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
          </Tabela>);}

export interface Conciliacao {
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

export function ConciliacaoTabela({pendentes}:{pendentes:Conciliacao[]}){return (<Tabela
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
                  <Link prefetch={false}
                    href={`/operacional/eventos/${c.evento_id}`}
                    className="font-label-md text-label-md text-primary hover:opacity-80"
                  >
                    Abrir
                  </Link>
                </Celula>
              </Linha>
            ))}
          </Tabela>);}

export interface Registro {
  id: string;
  momento: string;
  tabela: string;
  registro_id: string | null;
  operacao: string;
  campo: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  autor: string | null;
  origem: string | null;
  frase: string | null;
}

function tomDaOperacao(op: string): "neutro" | "atencao" | "bom" {
  const o = op.toLowerCase();
  if (o === "delete") return "atencao";
  if (o === "insert") return "bom";
  return "neutro";
}



export function AuditoriaTabela({linhas}:{linhas:Registro[]}){return (<Tabela colunas={["Quando", "Tabela", "Operação", "O que mudou", "Quem", ""]}>
            {linhas.map((r) => (
              <Linha key={r.id}>
                <Celula className="whitespace-nowrap">
                  {comoMomento(r.momento)}
                </Celula>
                <Celula>
                  <span className="font-mono">{r.tabela}</span>
                </Celula>
                <Celula>
                  <Etiqueta tom={tomDaOperacao(r.operacao)}>
                    {r.operacao.toLowerCase()}
                  </Etiqueta>
                </Celula>
                <Celula destaque>
                  {r.frase ?? (
                    <span className="flex flex-col gap-0.5">
                      <span>{r.campo ?? "—"}</span>
                      {(r.valor_anterior || r.valor_novo) && (
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          <span className="line-through">
                            {r.valor_anterior ?? "vazio"}
                          </span>
                          {" → "}
                          {r.valor_novo ?? "vazio"}
                        </span>
                      )}
                    </span>
                  )}
                </Celula>
                <Celula>
                  <span className="flex flex-col">
                    <span>{r.autor ?? "—"}</span>
                    {r.origem && (
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {r.origem}
                      </span>
                    )}
                  </span>
                </Celula>
                <Celula className="text-right">
                  {r.tabela === "evento" && r.registro_id && (
                    <Link prefetch={false}
                      href={`/operacional/eventos/${r.registro_id}`}
                      className="font-label-md text-label-md text-primary hover:opacity-80"
                    >
                      Abrir
                    </Link>
                  )}
                </Celula>
              </Linha>
            ))}
          </Tabela>);}

export interface EventoDoCliente {
  id: string;
  codigo_legado: string | null;
  data_evento: string;
  tipo_evento_nome: string | null;
  inteiros: number | null;
  total_do_evento: string | number | null;
  situacao: string | null;
  status: string | null;
  cidade: string | null;
}
export function ClienteHistoricoTabela({eventos}:{eventos:EventoDoCliente[]}){return (<Tabela
            colunas={["Código", "Data", "Tipo", "Cidade", "Pessoas", "Total", "Situação", ""]}
          >
            {eventos.map((e) => (
              <Linha key={e.id}>
                <Celula destaque>
                  <span className="font-mono">{e.codigo_legado ?? "—"}</span>
                </Celula>
                <Celula className="whitespace-nowrap">
                  {comoData(e.data_evento)}
                </Celula>
                <Celula>{e.tipo_evento_nome ?? "—"}</Celula>
                <Celula>{e.cidade ?? "—"}</Celula>
                <Celula className="text-right">{e.inteiros ?? 0}</Celula>
                <Celula destaque className="text-right whitespace-nowrap">
                  {formatBRL(Number(e.total_do_evento ?? 0))}
                </Celula>
                <Celula>
                  <Etiqueta
                    tom={e.status === "cancelado" ? "atencao" : "neutro"}
                  >
                    {e.situacao ?? e.status ?? "—"}
                  </Etiqueta>
                </Celula>
                <Celula className="text-right">
                  <Link prefetch={false}
                    href={`/operacional/eventos/${e.id}`}
                    className="inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:opacity-80"
                  >
                    Abrir
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Celula>
              </Linha>
            ))}
          </Tabela>);}
