import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  ChefHat,
  Clock,
  MapPin,
  MessageCircle,
  User,
  Users,
} from "lucide-react";

import {
  CabecalhoDoPainel,
  Etiqueta,
  LacunaDeDados,
} from "../components/painel/Painel";
import { comoData, comoHora, comoTelefone, linkWhatsApp } from "../lib/formato";
import { formatBRL } from "../lib/moeda";
import { exigirPapel } from "../servidor/auth/guarda";
import { consultar } from "../servidor/supabase";

/**
 * Um evento inteiro, numa tela.
 *
 * Faltava. A agenda listava 12.300 eventos e não havia onde abrir um — a
 * operação voltava à planilha para ver endereço, forma de pagamento e o que
 * ficou a acertar.
 *
 * Tudo vem de `vw_evento`, que já resolve os joins e calcula `total_do_evento`,
 * `situacao`, `dia_da_semana` e `horario_saida`.
 */

interface EventoCompleto {
  id: string;
  codigo_legado: string | null;
  data_evento: string;
  dia_da_semana: string | null;
  horario: string | null;
  horario_texto: string | null;
  horario_saida: string | null;
  horas_montagem: number | null;
  status: string | null;
  situacao: string | null;
  atencao: boolean | null;

  cliente_id: string | null;
  cliente_nome: string | null;
  cliente_telefone: string | null;

  responsavel_nome: string | null;
  tipo_evento_nome: string | null;
  modelo_rodizio_nome: string | null;
  modelo_forno_nome: string | null;

  endereco: string | null;
  complemento: string | null;
  cidade: string | null;
  bairro: string | null;

  inteiros: number | null;
  meios: number | null;
  valor_por_pessoa: string | number | null;
  deslocamento: string | number | null;
  extras: string | number | null;
  descricao_extra: string | null;
  excedentes: string | number | null;
  desconto: string | number | null;
  total_do_evento: string | number | null;
  valor_cobrado: string | number | null;
  sinal: string | number | null;
  a_acertar: string | number | null;
  liquidado: boolean | null;

  observacao: string | null;
  sobre_pagamento: string | null;
  avaliacao: number | null;
  feedback: string | null;
  numero_do_dia: string | null;
}

function n(v: string | number | null | undefined): number {
  return Number(v ?? 0);
}

export async function EventoView({ id }: { id: string }) {
  const sessao = await exigirPapel(["staff"]);

  const r = await consultar<EventoCompleto[]>(
    `vw_evento?select=*&id=eq.${encodeURIComponent(id)}&limit=1`,
    sessao.accessToken,
  );

  const evento = r.dados?.[0];

  /*
   * `notFound()` e não uma mensagem: se a RLS escondeu o evento, dizer "você
   * não pode ver este" confirmaria que ele existe. Para quem não pode, não
   * existe.
   */
  if (!evento) notFound();

  const pessoas = (evento.inteiros ?? 0) + Math.ceil((evento.meios ?? 0) / 2);
  const zap = linkWhatsApp(evento.cliente_telefone);

  return (
    <div className="flex flex-col gap-space-lg">
      <Link
        href="/operacional/despacho"
        className="inline-flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant hover:text-on-surface w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar à agenda
      </Link>

      <CabecalhoDoPainel
        titulo={evento.cliente_nome ?? "Evento sem cliente"}
        descricao={
          [
            evento.codigo_legado,
            evento.tipo_evento_nome,
            evento.dia_da_semana,
          ]
            .filter(Boolean)
            .join(" · ") || "Sem identificação"
        }
        acoes={
          zap && (
            <a
              href={zap}
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 px-4 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
          )
        }
      />

      <div className="flex items-center gap-space-xs flex-wrap">
        <Etiqueta tom={evento.atencao ? "atencao" : "neutro"}>
          {evento.situacao ?? "sem situação"}
        </Etiqueta>
        <Etiqueta tom={evento.status === "confirmado" ? "bom" : "neutro"}>
          {evento.status ?? "—"}
        </Etiqueta>
        {evento.liquidado && <Etiqueta tom="bom">liquidado</Etiqueta>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
        <Bloco titulo="Quando" icone={<Calendar className="w-5 h-5" />}>
          <Campo rotulo="Data" valor={comoData(evento.data_evento)} />
          <Campo
            rotulo="Início do serviço"
            valor={comoHora(evento.horario, evento.horario_texto)}
          />
          <Campo
            rotulo="Saída da base"
            valor={comoHora(evento.horario_saida, null)}
          />
          {evento.horas_montagem !== null && (
            <Campo
              rotulo="Montagem"
              valor={`${evento.horas_montagem}h antes`}
            />
          )}
        </Bloco>

        <Bloco titulo="Onde" icone={<MapPin className="w-5 h-5" />}>
          <Campo rotulo="Endereço" valor={evento.endereco ?? "—"} />
          {evento.complemento && (
            <Campo rotulo="Complemento" valor={evento.complemento} />
          )}
          <Campo
            rotulo="Localidade"
            valor={
              [evento.bairro, evento.cidade].filter(Boolean).join(" · ") || "—"
            }
          />
        </Bloco>

        <Bloco titulo="Quem" icone={<Users className="w-5 h-5" />}>
          <Campo
            rotulo="Cliente"
            valor={
              evento.cliente_id ? (
                <Link
                  href={`/operacional/clientes/${evento.cliente_id}`}
                  className="text-primary hover:opacity-80"
                >
                  {evento.cliente_nome ?? "sem nome"}
                </Link>
              ) : (
                (evento.cliente_nome ?? "—")
              )
            }
          />
          <Campo
            rotulo="Telefone"
            valor={comoTelefone(evento.cliente_telefone)}
          />
          <Campo
            rotulo="Responsável"
            valor={evento.responsavel_nome ?? "não alocado"}
          />
          <Campo rotulo="Convidados" valor={`${pessoas} pessoas`} />
        </Bloco>

        <Bloco titulo="O que" icone={<ChefHat className="w-5 h-5" />}>
          <Campo rotulo="Rodízio" valor={evento.modelo_rodizio_nome ?? "—"} />
          <Campo rotulo="Forno" valor={evento.modelo_forno_nome ?? "—"} />
          <Campo
            rotulo="Inteiras / meias"
            valor={`${evento.inteiros ?? 0} / ${evento.meios ?? 0}`}
          />
        </Bloco>

        <div className="lg:col-span-2">
          <Bloco titulo="Dinheiro" icone={<Clock className="w-5 h-5" />}>
            <Valor
              rotulo={`${evento.inteiros ?? 0} inteiras`}
              valor={n(evento.inteiros) * n(evento.valor_por_pessoa)}
            />
            {n(evento.meios) > 0 && (
              <Valor
                rotulo={`${evento.meios} meias`}
                valor={(n(evento.valor_por_pessoa) / 2) * n(evento.meios)}
              />
            )}
            {n(evento.deslocamento) !== 0 && (
              <Valor rotulo="Deslocamento" valor={n(evento.deslocamento)} />
            )}
            {n(evento.extras) !== 0 && (
              <Valor
                rotulo={evento.descricao_extra ?? "Extras"}
                valor={n(evento.extras)}
              />
            )}
            {n(evento.excedentes) !== 0 && (
              <Valor rotulo="Excedentes" valor={n(evento.excedentes)} />
            )}
            {n(evento.desconto) !== 0 && (
              <Valor rotulo="Desconto" valor={-Math.abs(n(evento.desconto))} />
            )}

            <div className="border-t border-outline-variant/40 pt-space-sm mt-space-xs flex flex-col gap-space-xs">
              <Valor rotulo="Total do evento" valor={n(evento.total_do_evento)} forte />
              {evento.valor_cobrado !== null && (
                <Valor rotulo="Valor cobrado" valor={n(evento.valor_cobrado)} />
              )}
              <Valor rotulo="Sinal" valor={n(evento.sinal)} />
              <Valor rotulo="A acertar" valor={n(evento.a_acertar)} forte />
            </div>

            {/*
             * `valor_cobrado` NULL não é zero: NULL é "não acertado", zero é
             * cortesia registrada. Mostrar os dois como "R$ 0,00" apagaria a
             * diferença que a operação usa para saber o que cobrar.
             */}
            {evento.valor_cobrado === null && (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Valor cobrado ainda não acertado — diferente de zero, que seria
                cortesia registrada.
              </p>
            )}
          </Bloco>
        </div>

        <Bloco titulo="Anotações" icone={<User className="w-5 h-5" />}>
          <Campo rotulo="Observação" valor={evento.observacao ?? "—"} />
          <Campo
            rotulo="Sobre pagamento"
            valor={evento.sobre_pagamento ?? "—"}
          />
          {evento.avaliacao !== null && (
            <Campo rotulo="Avaliação" valor={`${evento.avaliacao}`} />
          )}
          <Campo rotulo="Feedback" valor={evento.feedback ?? "—"} />
        </Bloco>
      </div>

      {evento.numero_do_dia && (
        <LacunaDeDados titulo="Rastro da planilha">
          <p>
            Este evento tem <code className="font-mono">Nº do dia</code> ={" "}
            <strong>{evento.numero_do_dia}</strong>. Na planilha, o decimal
            codificava qual equipe atendia — <code className="font-mono">1</code>{" "}
            e <code className="font-mono">1.2</code> eram a mesma; vírgula em vez
            de ponto significava equipe diferente.
          </p>
          <p>
            No banco a relação é nativa (<code className="font-mono">
              responsavel_id
            </code>{" "}
            e <code className="font-mono">data_evento</code>), então o campo ficou
            como texto e nada o lê. Está aqui só para conferência contra a
            planilha.
          </p>
        </LacunaDeDados>
      )}
    </div>
  );
}

function Bloco({
  titulo,
  icone,
  children,
}: {
  titulo: string;
  icone: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-col gap-space-sm">
      <h2 className="font-label-lg text-label-lg text-on-surface flex items-center gap-space-sm">
        <span className="text-tertiary">{icone}</span>
        {titulo}
      </h2>
      <div className="flex flex-col gap-space-xs">{children}</div>
    </section>
  );
}

function Campo({
  rotulo,
  valor,
}: {
  rotulo: string;
  valor: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
        {rotulo}
      </span>
      <span className="font-body-md text-body-md text-on-surface break-words">
        {valor}
      </span>
    </div>
  );
}

function Valor({
  rotulo,
  valor,
  forte,
}: {
  rotulo: string;
  valor: number;
  forte?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-space-md">
      <span
        className={
          forte
            ? "font-label-md text-label-md text-on-surface"
            : "font-body-md text-body-md text-on-surface-variant"
        }
      >
        {rotulo}
      </span>
      <span
        className={
          forte
            ? "font-headline-sm text-headline-sm text-on-surface whitespace-nowrap"
            : "font-body-md text-body-md text-on-surface whitespace-nowrap"
        }
      >
        {formatBRL(valor)}
      </span>
    </div>
  );
}
