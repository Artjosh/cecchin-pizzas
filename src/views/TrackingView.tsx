import Link from "next/link";
import { Check, Clock, MapPin, MessageCircle } from "lucide-react";

import {
  CabecalhoDoPainel,
  LacunaDeDados,
  SemLinhas,
} from "../components/painel/Painel";
import { cn } from "../lib/utils";
import { comoData, comoHora, hojeSaoPaulo } from "../lib/formato";
import { formatBRL } from "../lib/moeda";
import { exigirSessao } from "../servidor/auth/guarda";
import { consultar } from "../servidor/supabase";
import { fonteDeDados } from "../servidor/fonte";
import { RastreioDesenhado } from "./desenho/RastreioDesenhado";

/* ===========================================================================
 * O ACOMPANHAMENTO QUE DÁ PARA TER HOJE
 *
 * O desenho acima mostra ETA em minutos e "sincronizado via satélite GPS".
 * **Não existe rastreamento.** Nenhuma tabela guarda posição de veículo, e
 * prometer minutos que ninguém mede é a pior coisa que uma tela pode fazer
 * com um cliente esperando na porta.
 *
 * O que é verdade e vale a viagem: em que ponto o evento está, a que horas a
 * equipe sai da base, quanto falta pagar, e com quem falar. Tudo isso o banco
 * tem.
 * ======================================================================== */

interface EventoParaAcompanhar {
  id: string;
  data_evento: string;
  horario: string | null;
  horario_texto: string | null;
  horario_saida: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  status: string | null;
  situacao: string | null;
  inteiros: number | null;
  meios: number | null;
  total_do_evento: string | number | null;
  sinal: string | number | null;
  a_acertar: string | number | null;
  modelo_rodizio_nome: string | null;
  responsavel_nome: string | null;
  codigo_legado: string | null;
}

interface Etapa {
  titulo: string;
  detalhe: string;
  estado: "feito" | "agora" | "adiante";
}

/**
 * A linha do tempo sai do ESTADO do evento, não de um relógio.
 *
 * Sem posição de van, "a equipe está a 18 minutos" é invenção. "A equipe sai às
 * 18:30" é fato — está no evento, calculado a partir do horário do serviço e do
 * tempo de montagem.
 */
function montarEtapas(e: EventoParaAcompanhar, hoje: string): Etapa[] {
  const temSinal = Number(e.sinal ?? 0) > 0;
  const ehHoje = e.data_evento.slice(0, 10) === hoje;
  const jaPassou = e.data_evento.slice(0, 10) < hoje;

  return [
    {
      titulo: "Reserva registrada",
      detalhe: e.codigo_legado
        ? `Código ${e.codigo_legado}`
        : "Sua data está na agenda",
      estado: "feito",
    },
    {
      titulo: "Sinal confirmado",
      detalhe: temSinal
        ? `${formatBRL(Number(e.sinal))} recebidos`
        : "Aguardando o sinal de 40% para travar a data",
      estado: temSinal ? "feito" : "agora",
    },
    {
      titulo: "Equipe a caminho",
      detalhe: e.horario_saida
        ? `Saída da base às ${comoHora(e.horario_saida, null)}`
        : "Horário de saída ainda não definido",
      estado: jaPassou ? "feito" : ehHoje ? "agora" : "adiante",
    },
    {
      titulo: "Serviço no local",
      detalhe: `${comoHora(e.horario, e.horario_texto)} · ${e.modelo_rodizio_nome ?? "rodízio"}`,
      estado: jaPassou ? "feito" : "adiante",
    },
    {
      titulo: "Acerto final",
      detalhe:
        Number(e.a_acertar ?? 0) > 0
          ? `${formatBRL(Number(e.a_acertar))} no término`
          : "Nada a acertar",
      estado: jaPassou && Number(e.a_acertar ?? 0) === 0 ? "feito" : "adiante",
    },
  ];
}

async function RastreioDoBanco() {
  const sessao = await exigirSessao("/cliente/rastreio");
  const hoje = hojeSaoPaulo();

  /*
   * Filtro por dono obrigatório — a policy de `evento` deixa quem opera ver
   * tudo, e sem ele um staff veria o evento de outra pessoa como se fosse o
   * dele.
   *
   * Ordena pelo mais próximo de hoje que ainda não passou; se não houver
   * futuro, cai no último realizado, que é o que a pessoa quer conferir depois
   * da festa.
   */
  const futuroR = await consultar<EventoParaAcompanhar[]>(
    "vw_evento?select=id,data_evento,horario,horario_texto,horario_saida," +
      "endereco,bairro,cidade,status,situacao,inteiros,meios,total_do_evento," +
      "sinal,a_acertar,modelo_rodizio_nome,responsavel_nome,codigo_legado" +
      `&cliente_usuario_id=eq.${sessao.usuario.id}&data_evento=gte.${hoje}` +
      "&order=data_evento.asc&limit=1",
    sessao.accessToken,
  );

  let evento = futuroR.dados?.[0];

  if (!evento) {
    const passadoR = await consultar<EventoParaAcompanhar[]>(
      "vw_evento?select=id,data_evento,horario,horario_texto,horario_saida," +
        "endereco,bairro,cidade,status,situacao,inteiros,meios,total_do_evento," +
        "sinal,a_acertar,modelo_rodizio_nome,responsavel_nome,codigo_legado" +
        `&cliente_usuario_id=eq.${sessao.usuario.id}` +
        "&order=data_evento.desc&limit=1",
      sessao.accessToken,
    );
    evento = passadoR.dados?.[0];
  }

  if (!evento) {
    return (
      <div className="max-w-3xl mx-auto px-margin md:px-margin-tablet py-space-xl flex flex-col gap-space-lg">
        <CabecalhoDoPainel
          titulo="Acompanhe seu evento"
          descricao="Onde a sua reserva está, do sinal ao acerto final."
        />
        <SemLinhas
          titulo="Você ainda não tem evento"
          detalhe="Quando contratar um rodízio, o acompanhamento aparece aqui."
          acao={
            <Link
              href="/cliente/contratar"
              className="h-11 px-5 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg flex items-center hover:opacity-90 transition-opacity"
            >
              Contratar agora
            </Link>
          }
        />
      </div>
    );
  }

  const etapas = montarEtapas(evento, hoje);
  const pessoas = (evento.inteiros ?? 0) + Math.ceil((evento.meios ?? 0) / 2);
  const local =
    evento.endereco ??
    [evento.bairro, evento.cidade].filter(Boolean).join(" · ") ??
    "endereço a confirmar";

  return (
    <div className="max-w-3xl mx-auto px-margin md:px-margin-tablet py-space-xl flex flex-col gap-space-lg">
      <CabecalhoDoPainel
        titulo="Acompanhe seu evento"
        descricao={`${comoData(evento.data_evento)} às ${comoHora(evento.horario, evento.horario_texto)} · ${pessoas} pessoas`}
      />

      <LacunaDeDados titulo="Não mostramos a van no mapa">
        <p>
          Não há rastreamento por GPS: nenhum veículo transmite posição. O que
          está abaixo é o que a operação de fato sabe — a que horas a equipe sai
          da base e em que ponto o seu evento está.
        </p>
      </LacunaDeDados>

      <section className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-lg flex flex-col gap-space-md">
        <div className="flex flex-wrap items-start justify-between gap-space-md">
          <div className="flex flex-col min-w-0">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary">
              {evento.situacao ?? evento.status ?? "em andamento"}
            </span>
            <span className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-space-sm">
              <MapPin className="w-5 h-5 text-tertiary shrink-0" />
              <span className="truncate">{local}</span>
            </span>
          </div>
          <span className="font-headline-sm text-headline-sm text-on-surface shrink-0">
            {formatBRL(Number(evento.total_do_evento ?? 0))}
          </span>
        </div>

        {evento.responsavel_nome && (
          <span className="font-body-md text-body-md text-on-surface-variant">
            Responsável pelo seu evento: <strong>{evento.responsavel_nome}</strong>
          </span>
        )}
      </section>

      <ol className="flex flex-col">
        {etapas.map((etapa, i) => (
          <li key={etapa.titulo} className="flex gap-space-md">
            <div className="flex flex-col items-center shrink-0">
              <span
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                  etapa.estado === "feito" && "bg-tertiary-container text-on-tertiary-container",
                  etapa.estado === "agora" && "bg-primary text-on-primary",
                  etapa.estado === "adiante" && "bg-surface-container-high text-on-surface-variant",
                )}
              >
                {etapa.estado === "feito" ? (
                  <Check className="w-4 h-4" />
                ) : etapa.estado === "agora" ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  <span className="font-label-md text-label-md">{i + 1}</span>
                )}
              </span>
              {i < etapas.length - 1 && (
                <span className="w-px flex-1 min-h-8 bg-outline-variant/50" />
              )}
            </div>

            <div className="flex flex-col pb-space-lg min-w-0">
              <span
                className={cn(
                  "font-label-lg text-label-lg",
                  etapa.estado === "adiante"
                    ? "text-on-surface-variant"
                    : "text-on-surface",
                )}
              >
                {etapa.titulo}
              </span>
              <span className="font-body-md text-body-md text-on-surface-variant">
                {etapa.detalhe}
              </span>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex items-center gap-space-sm flex-wrap">
        <Link
          href="/cliente/suporte"
          className="h-11 px-5 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <MessageCircle className="w-4 h-4" />
          Falar com a gente
        </Link>
        <Link
          href="/cliente/eventos"
          className="h-11 px-5 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md flex items-center hover:bg-surface-container-high transition-colors"
        >
          Meus eventos
        </Link>
      </div>
    </div>
  );
}

export async function TrackingView() {
  return (await fonteDeDados()) === "real" ? (
    <RastreioDoBanco />
  ) : (
    <RastreioDesenhado />
  );
}
