"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronRight,
  Filter,
  MapPin,
  MessageCircle,
  Search,
} from "lucide-react";

import { cn } from "../lib/utils";
import { formatBRL } from "../lib/moeda";
import { comoData, comoDiaMes, comoHora, linkWhatsApp } from "../lib/formato";

/**
 * A agenda do despacho, filtrável de verdade.
 *
 * **Por que isto existe.** `DispatchFilters` tinha abas com contagem escrita à
 * mão (`Todos de Hoje (6)`, `Em Montagem (2)`) e uma busca que guardava o texto
 * num `useState` e não filtrava nada. Era inofensivo sobre o desenho, onde
 * todos os números são fictícios. Sobre o banco virava mentira: a tela dizia
 * "6" enquanto mostrava 154 cartões.
 *
 * Aqui as abas nascem das linhas que chegaram, e a contagem é o tamanho de cada
 * grupo. Se a operação criar uma situação nova amanhã, a aba aparece sozinha —
 * não há lista de situações escrita no código.
 *
 * Filtrar no cliente e não no PostgREST é deliberado: a consulta traz no máximo
 * 60 eventos, e uma ida ao servidor a cada tecla digitada seria mais lenta do
 * que percorrer 60 objetos em memória. Quando o limite subir, isto vira
 * parâmetro de consulta.
 */

export interface EventoDaAgenda {
  id: string;
  data_evento: string;
  horario: string | null;
  horario_texto: string | null;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  inteiros: number | null;
  meios: number | null;
  total_do_evento: string | number | null;
  situacao: string | null;
  cidade: string | null;
  bairro: string | null;
  endereco: string | null;
  tipo_evento_nome: string | null;
  modelo_forno_nome: string | null;
  modelo_rodizio_nome: string | null;
  codigo_legado: string | null;
  atencao: boolean | null;
  horario_saida: string | null;
}

/**
 * A cor da borda vem da SITUAÇÃO, que a view calcula — não de um estado que
 * esta tela inventaria. `vw_evento.situacao` é a mesma regra que a planilha usa
 * há oito anos.
 */
function corDaSituacao(situacao: string | null): string {
  if (!situacao) return "border-outline-variant";
  const s = situacao.toLowerCase();
  if (s.includes("cobrar") || s.includes("pendente")) return "border-primary";
  if (s.includes("confirm")) return "border-tertiary";
  return "border-outline-variant";
}

function semAcento(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Tudo que a busca varre, já normalizado. */
function textoDeBusca(e: EventoDaAgenda): string {
  return semAcento(
    [
      e.cliente_nome,
      e.responsavel_nome,
      e.endereco,
      e.bairro,
      e.cidade,
      e.codigo_legado,
      e.tipo_evento_nome,
      e.situacao,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

interface Aba {
  chave: string;
  rotulo: string;
  cabe: (e: EventoDaAgenda) => boolean;
}

/**
 * As abas nascem dos dados.
 *
 * `hoje` vem do servidor como prop, e não de um `new Date()` aqui dentro: data
 * calculada no corpo do componente diverge entre o HTML do servidor e o
 * primeiro render do cliente, e a hidratação quebra.
 */
function montarAbas(eventos: EventoDaAgenda[], hoje: string): Aba[] {
  const situacoes = Array.from(
    new Set(eventos.map((e) => e.situacao).filter((s): s is string => !!s)),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const abas: Aba[] = [
    { chave: "todos", rotulo: "Todos", cabe: () => true },
    {
      chave: "hoje",
      rotulo: "Hoje",
      cabe: (e) => e.data_evento.slice(0, 10) === hoje,
    },
  ];

  for (const s of situacoes) {
    abas.push({ chave: `sit:${s}`, rotulo: s, cabe: (e) => e.situacao === s });
  }

  // Só oferece a aba de atenção quando há o que atender.
  if (eventos.some((e) => e.atencao)) {
    abas.push({ chave: "atencao", rotulo: "Atenção", cabe: (e) => !!e.atencao });
  }

  return abas;
}

/** Quem pode levar um evento. Vem do servidor: a lista é a mesma para todos. */
export interface ResponsavelDisponivel {
  id: string;
  nome: string;
}

export function AgendaFiltravel({
  eventos,
  hoje,
  responsaveis = [],
  podeAlocar = false,
}: {
  eventos: EventoDaAgenda[];
  hoje: string;
  responsaveis?: ResponsavelDisponivel[];
  podeAlocar?: boolean;
}) {
  const [aba, setAba] = useState("todos");
  const [busca, setBusca] = useState("");
  const [soComTelefone, setSoComTelefone] = useState(false);

  const abas = useMemo(() => montarAbas(eventos, hoje), [eventos, hoje]);

  // Índice de busca calculado uma vez, não a cada tecla.
  const indexados = useMemo(
    () => eventos.map((e) => ({ evento: e, texto: textoDeBusca(e) })),
    [eventos],
  );

  const abaAtual = abas.find((a) => a.chave === aba) ?? abas[0];
  const alvo = semAcento(busca.trim());

  const cabeNoResto = (evento: EventoDaAgenda, texto: string) =>
    (!alvo || texto.includes(alvo)) &&
    (!soComTelefone || !!evento.cliente_telefone);

  const visiveis = indexados
    .filter(
      ({ evento, texto }) => abaAtual.cabe(evento) && cabeNoResto(evento, texto),
    )
    .map(({ evento }) => evento);

  /*
   * A contagem de cada aba respeita a busca e o filtro de telefone. Um número
   * que ignorasse o filtro ativo mandaria a pessoa clicar numa aba que abre
   * vazia.
   */
  const quantos = (a: Aba) =>
    indexados.filter(
      ({ evento, texto }) => a.cabe(evento) && cabeNoResto(evento, texto),
    ).length;

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex items-center justify-between flex-wrap gap-3 bg-surface-container-low p-2 rounded-xl shadow-sm">
        <div
          className="flex items-center gap-2 overflow-x-auto"
          role="tablist"
          aria-label="Filtrar eventos da agenda"
        >
          {abas.map((a) => {
            const selecionada = a.chave === abaAtual.chave;
            return (
              <button
                type="button"
                key={a.chave}
                role="tab"
                aria-selected={selecionada}
                onClick={() => setAba(a.chave)}
                className={cn(
                  "px-4 py-2 rounded-lg font-label-md text-label-md whitespace-nowrap transition-colors",
                  selecionada
                    ? "bg-surface-container-highest text-on-surface font-bold shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container-high",
                )}
              >
                {a.rotulo} ({quantos(a)})
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 flex-1 md:flex-initial min-w-[200px]">
          <div className="relative flex-1">
            <label htmlFor="busca-agenda" className="sr-only">
              Buscar cliente, endereço ou código
            </label>
            <Search
              aria-hidden="true"
              className="absolute left-3 top-2.5 w-[18px] h-[18px] text-on-surface-variant"
            />
            <input
              id="busca-agenda"
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente, endereço ou código"
              className="w-full h-9 bg-surface-container-highest rounded-lg pl-9 pr-3 text-body-sm font-body-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            type="button"
            aria-pressed={soComTelefone}
            aria-label="Mostrar somente eventos com telefone do cliente"
            title="Somente com telefone"
            onClick={() => setSoComTelefone((v) => !v)}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-lg transition-colors",
              soComTelefone
                ? "bg-primary text-on-primary"
                : "bg-surface-container-highest hover:bg-surface-container-high text-on-surface",
            )}
          >
            <Filter className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>

      {visiveis.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant bg-surface-container-low rounded-xl p-space-md">
          Nenhum evento em <strong>{abaAtual.rotulo}</strong>
          {alvo ? ` para a busca "${busca.trim()}"` : ""}
          {soComTelefone ? " com telefone cadastrado" : ""}.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
          {visiveis.map((evento) => (
            <CartaoEvento
              key={evento.id}
              evento={evento}
              responsaveis={responsaveis}
              podeAlocar={podeAlocar}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * O cartão, agora com o botão "Detalhes" fazendo algo.
 *
 * Abre no próprio cartão em vez de navegar: quem está despachando quer conferir
 * um número de convidados sem perder a lista que acabou de filtrar.
 */
function CartaoEvento({
  evento,
  responsaveis,
  podeAlocar,
}: {
  evento: EventoDaAgenda;
  responsaveis: ResponsavelDisponivel[];
  podeAlocar: boolean;
}) {
  const router = useRouter();
  const [pendente, comecar] = useTransition();
  const [aberto, setAberto] = useState(false);
  const [alocando, setAlocando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);

  /*
   * Alocar responsável é o outro lado do elo conta-responsável. Sem isto, a
   * conta ligada não adianta: os 154 eventos futuros vieram da planilha com
   * `responsavel_id` nulo, porque lá o nome de quem respondeu era anotado
   * depois do evento.
   */
  async function alocar(responsavel: string) {
    setFalha(null);
    setAlocando(true);

    try {
      const r = await fetch("/api/operacao/evento", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ evento: evento.id, responsavel }),
      });

      if (!r.ok) {
        const detalhe = (await r.json().catch(() => ({}))) as { mensagem?: string };
        setFalha(detalhe.mensagem ?? "O servidor recusou a alocação.");
        return;
      }

      comecar(() => router.refresh());
    } catch {
      setFalha("Falha de rede. A alocação não foi gravada.");
    } finally {
      setAlocando(false);
    }
  }

  const pessoas = (evento.inteiros ?? 0) + Math.ceil((evento.meios ?? 0) / 2);
  const local =
    [evento.bairro, evento.cidade].filter(Boolean).join(" · ") || "Sem endereço";
  const zap = linkWhatsApp(evento.cliente_telefone);

  return (
    <div
      className={cn(
        "bg-surface-container-lowest rounded-xl shadow-sm border-t-4 overflow-hidden flex flex-col hover:shadow-lg transition-shadow",
        corDaSituacao(evento.situacao),
      )}
    >
      <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low/50">
        <div className="flex items-center gap-2 min-w-0">
          {evento.atencao && (
            <AlertTriangle className="w-4 h-4 text-primary shrink-0" />
          )}
          <span className="font-label-md text-label-md text-on-surface font-bold truncate">
            {evento.situacao ?? "Sem situação"}
          </span>
        </div>
        <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded shrink-0">
          {comoDiaMes(evento.data_evento)}
        </span>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3">
        <div className="flex flex-col min-w-0">
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold truncate">
            {evento.cliente_nome ?? "Sem cliente"}
            {pessoas > 0 ? ` • ${pessoas}p` : ""}
          </h3>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {[evento.codigo_legado, evento.tipo_evento_nome]
              .filter(Boolean)
              .join(" • ") || "—"}
          </span>
        </div>

        <div className="flex items-start gap-2">
          <MapPin className="w-5 h-5 text-tertiary shrink-0 mt-0.5" />
          <div className="flex flex-col min-w-0">
            <span className="font-body-md text-body-md text-on-surface font-medium leading-tight truncate">
              {evento.endereco ?? local}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
              {local}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-surface-container-low p-2 rounded-lg">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
              Cronograma
            </span>
            <span className="font-label-md text-label-md text-on-surface">
              {comoHora(evento.horario_saida)}{" "}
              <span className="text-primary">→</span>{" "}
              {comoHora(evento.horario, evento.horario_texto)}
            </span>
          </div>
          <div className="w-px h-8 bg-outline-variant/50" />
          <div className="flex flex-col min-w-0">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
              Responsável
            </span>
            {podeAlocar && responsaveis.length > 0 ? (
              <>
                <label className="sr-only" htmlFor={`resp-${evento.id}`}>
                  Responsável por {evento.cliente_nome ?? "este evento"}
                </label>
                <select
                  id={`resp-${evento.id}`}
                  value={evento.responsavel_id ?? ""}
                  disabled={alocando || pendente}
                  onChange={(e) => void alocar(e.target.value)}
                  className="font-label-md text-label-md text-on-surface bg-transparent -ml-1 px-1 py-0.5 rounded max-w-[11rem] truncate focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                >
                  <option value="">não alocado</option>
                  {responsaveis.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <span className="font-label-md text-label-md text-on-surface truncate">
                {evento.responsavel_nome ?? "não alocado"}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-label-sm font-label-sm">
          <span className="text-on-surface-variant truncate">
            {evento.modelo_forno_nome ?? evento.modelo_rodizio_nome ?? "—"}
          </span>
          <span className="text-on-surface font-semibold">
            {formatBRL(Number(evento.total_do_evento ?? 0))}
          </span>
        </div>

        {falha && (
          <p
            role="alert"
            className="font-body-sm text-body-sm text-primary bg-primary/10 rounded-lg p-space-sm"
          >
            {falha}
          </p>
        )}

        {aberto && (
          <dl className="flex flex-col gap-1 pt-2 border-t border-outline-variant/30 font-body-sm text-body-sm">
            <Detalhe rotulo="Data" valor={comoData(evento.data_evento)} />
            <Detalhe rotulo="Inteiras" valor={String(evento.inteiros ?? 0)} />
            <Detalhe rotulo="Meias" valor={String(evento.meios ?? 0)} />
            <Detalhe rotulo="Rodízio" valor={evento.modelo_rodizio_nome ?? "—"} />
            <Detalhe rotulo="Forno" valor={evento.modelo_forno_nome ?? "—"} />
            <Detalhe rotulo="Cidade" valor={evento.cidade ?? "—"} />
          </dl>
        )}
      </div>

      <div className="p-3 bg-surface-container-highest border-t border-outline-variant/20 flex gap-2">
        <button
          type="button"
          aria-expanded={aberto}
          onClick={() => setAberto((v) => !v)}
          className="flex-1 bg-surface-container hover:bg-surface-container-high border border-outline-variant/50 text-on-surface font-label-md text-label-md py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
        >
          {aberto ? "Menos" : "Detalhes"}
          <ChevronRight
            className={cn("w-4 h-4 transition-transform", aberto && "rotate-90")}
          />
        </button>
        {zap ? (
          <a
            href={zap}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Falar no WhatsApp com ${evento.cliente_nome ?? "o cliente"}`}
            className="w-10 flex items-center justify-center rounded-lg bg-primary text-on-primary hover:opacity-90 transition-opacity"
          >
            <MessageCircle className="w-[18px] h-[18px]" />
          </a>
        ) : (
          /* Sem número, o ícone fica apagado e explica no `title`. Um botão que
             parece clicável e não faz nada é pior do que um desabilitado. */
          <span
            title="Sem telefone cadastrado"
            className="w-10 flex items-center justify-center rounded-lg bg-surface-container text-on-surface-variant/50 border border-outline-variant/50"
          >
            <MessageCircle className="w-[18px] h-[18px]" />
          </span>
        )}
      </div>
    </div>
  );
}

function Detalhe({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-space-sm">
      <dt className="text-on-surface-variant">{rotulo}</dt>
      <dd className="text-on-surface truncate">{valor}</dd>
    </div>
  );
}
