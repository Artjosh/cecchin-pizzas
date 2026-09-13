"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight, Calendar, Clock, MapPin } from "lucide-react";
import { cn } from "../lib/utils";
import { formatBRL } from "../lib/moeda";

/**
 * Meus eventos.
 *
 * Recebe as linhas prontas do Server Component da página, ou `null` para
 * desenhar o exemplo. A consulta não acontece aqui: componente de cliente não
 * fala com banco, e o token da sessão não pode chegar ao browser.
 */

export interface EventoDoCliente {
  id: string;
  data_evento: string;
  horario: string | null;
  horario_texto: string | null;
  tipo_evento_nome: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  status: string | null;
  situacao: string | null;
  total_do_evento: string | number | null;
  inteiros: number | null;
}

export interface SolicitacaoReservaDoCliente {
  id: string;
  status: string;
  data_evento: string;
  horario: string;
  endereco: string;
  valor_estimado: string | number;
  sinal_estimado: string | number;
  criado_em: string;
}

/** O desenho. Mantido inteiro: é o estado que o banco ainda não produz. */
const EXEMPLOS: EventoDoCliente[] = [
  {
    id: "exemplo-1",
    data_evento: "2026-10-15",
    horario: "19:00:00",
    horario_texto: null,
    tipo_evento_nome: "Aniversário 15 anos",
    endereco: "Salão de Festas A",
    bairro: null,
    cidade: "Porto Alegre",
    status: "confirmado",
    situacao: "Confirmado",
    total_do_evento: 3200,
    inteiros: 40,
  },
  {
    id: "exemplo-2",
    data_evento: "2026-12-20",
    horario: "20:00:00",
    horario_texto: null,
    tipo_evento_nome: "Confraternização Empresa",
    endereco: "Chácara do Sol",
    bairro: null,
    cidade: "Viamão",
    status: "confirmado",
    situacao: "Cobrar sinal",
    total_do_evento: 5800,
    inteiros: 70,
  },
];

function comoDia(iso: string): string {
  // Dividido na mão: `new Date("2026-10-15")` é lido como UTC e, num fuso
  // negativo, mostra 14/10.
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function comoHora(bruto: string | null, texto: string | null): string {
  if (texto?.trim()) return texto.trim();
  return bruto ? bruto.slice(0, 5) : "—";
}

export function ClientEventsView({
  eventos,
  solicitacoes = [],
}: {
  /** `null` = desenhar o exemplo. */
  eventos: EventoDoCliente[] | null;
  solicitacoes?: SolicitacaoReservaDoCliente[];
}) {
  const doBanco = eventos !== null;
  const lista = eventos ?? EXEMPLOS;

  return (
    <div className="max-w-4xl mx-auto px-margin md:px-margin-tablet py-space-lg flex flex-col gap-space-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight">
            Meus Eventos
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            {doBanco
              ? lista.length === 0
                ? "Você ainda não tem evento contratado."
                : `${lista.length} evento${lista.length > 1 ? "s" : ""} no seu nome.`
              : "Acompanhe e gerencie seus eventos contratados."}
          </p>
        </div>
        <Link
          href="/cliente/contratar"
          className="h-11 px-5 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          Novo Evento
        </Link>
      </div>

      {lista.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant bg-surface-container-low rounded-xl p-space-lg text-center">
          Quando você contratar um rodízio, ele aparece aqui.
        </p>
      ) : (
        <div className="grid gap-space-md">
          {lista.map((evento) => {
            const local =
              evento.endereco ??
              [evento.bairro, evento.cidade].filter(Boolean).join(" · ") ??
              "—";

            const pendente = (evento.situacao ?? "")
              .toLowerCase()
              .includes("cobrar");

            return (
              <motion.div
                key={evento.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-space-md hover:shadow-md transition-all flex flex-col md:flex-row md:items-center gap-space-lg"
              >
                <div className="flex-1 flex flex-col gap-space-sm min-w-0">
                  <div className="flex items-center gap-space-sm flex-wrap">
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">
                      {evento.tipo_evento_nome ?? "Rodízio"}
                    </h3>
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-full font-label-sm text-label-sm",
                        pendente
                          ? "bg-primary/10 text-primary"
                          : "bg-tertiary-container text-on-tertiary-container",
                      )}
                    >
                      {evento.situacao ?? evento.status ?? "—"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-space-md font-body-sm text-body-sm text-on-surface-variant">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-tertiary" />
                      {comoDia(evento.data_evento)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-tertiary" />
                      {comoHora(evento.horario, evento.horario_texto)}
                    </span>
                    <span className="flex items-center gap-1.5 min-w-0">
                      <MapPin className="w-4 h-4 text-tertiary shrink-0" />
                      <span className="truncate">{local}</span>
                    </span>
                  </div>

                  {evento.total_do_evento !== null && (
                    <span className="font-label-md text-label-md text-on-surface">
                      {formatBRL(Number(evento.total_do_evento))}
                      {evento.inteiros ? ` · ${evento.inteiros} adultos` : ""}
                    </span>
                  )}
                </div>

                <Link
                  href="/cliente/rastreio"
                  className="flex items-center gap-2 font-label-md text-label-md text-primary hover:opacity-80 px-4 py-2 bg-primary/10 rounded-lg transition-opacity shrink-0"
                >
                  Detalhes
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {doBanco && solicitacoes.length > 0 && (
        <section className="flex flex-col gap-space-sm">
          <h2 className="font-headline-sm text-on-surface">Solicitações em análise</h2>
          {solicitacoes.map((solicitacao) => (
            <article key={solicitacao.id} className="rounded-xl border border-primary/20 bg-primary/5 p-space-md">
              <div className="flex flex-wrap items-center justify-between gap-space-sm">
                <span className="font-label-lg text-on-surface">Rodízio Artesanal</span>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 font-label-sm text-primary">{solicitacao.status.replaceAll("_", " ")}</span>
              </div>
              <p className="mt-2 font-body-sm text-on-surface-variant">{comoDia(solicitacao.data_evento)} às {solicitacao.horario.slice(0, 5)} · {solicitacao.endereco}</p>
              <p className="mt-1 font-body-sm text-on-surface-variant">Estimativa {formatBRL(Number(solicitacao.valor_estimado))} · sinal previsto {formatBRL(Number(solicitacao.sinal_estimado))}</p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
