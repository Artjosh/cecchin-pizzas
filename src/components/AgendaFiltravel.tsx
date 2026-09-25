"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ChevronRight,
  Filter,
  MapPin,
  MessageCircle,
  Search,
} from "lucide-react";

import { AgendaPlanilha } from "./AgendaPlanilha";
import { QrEvento } from "./embarque/QrEvento";
import { cn } from "../lib/utils";
import { formatBRL } from "../lib/moeda";
import { comoData, comoDiaMes, comoHora, linkWhatsApp, linkCentralWhatsApp } from "../lib/formato";

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
  eventos: eventosIniciais,
  hoje,
  responsaveis = [],
  podeAlocar = false,
  demo = false,
}: {
  eventos: EventoDaAgenda[];
  hoje: string;
  responsaveis?: ResponsavelDisponivel[];
  podeAlocar?: boolean;
  demo?: boolean;
}) {
  const parametros=useSearchParams();
  const [eventos,setEventos]=useState(eventosIniciais);
  const [visualizacao,setVisualizacao]=useState(3);
  useEffect(()=>{try {const salvo=Number(localStorage.getItem("cecchin:agenda:visualizacao"));if(salvo>=1&&salvo<=6)setVisualizacao(salvo);}catch{}},[]);
  useEffect(()=>{let lista=eventosIniciais;if(demo){try{const salvos=JSON.parse(localStorage.getItem("cecchin:demo:agenda:responsaveis")??"{}");lista=lista.map(e=>Object.hasOwn(salvos,e.id)?{...e,responsavel_id:salvos[e.id]||null,responsavel_nome:responsaveis.find(r=>r.id===salvos[e.id])?.nome??null}:e);}catch{}}setEventos(lista);},[eventosIniciais,demo,responsaveis]);
  async function alocar(id:string,responsavel:string){
    if(!demo){const r=await fetch("/api/operacao/evento",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({evento:id,responsavel})});if(!r.ok){const d=await r.json().catch(()=>({}));throw Error(d.mensagem??"Falha ao alocar responsável.");}}
    if(demo){try{const salvos=JSON.parse(localStorage.getItem("cecchin:demo:agenda:responsaveis")??"{}");localStorage.setItem("cecchin:demo:agenda:responsaveis",JSON.stringify({...salvos,[id]:responsavel}));}catch{}}
    setEventos(atual=>atual.map(e=>e.id===id?{...e,responsavel_id:responsavel||null,responsavel_nome:responsaveis.find(r=>r.id===responsavel)?.nome??null}:e));
  }

  const [aba, setAba] = useState(parametros.get("aba")??"todos");
  const [busca, setBusca] = useState(parametros.get("busca")??"");
  const [soComTelefone, setSoComTelefone] = useState(parametros.get("telefone")==="1");
  const [filtrosAbertos,setFiltrosAbertos]=useState(false);
  const [responsavelFiltro,setResponsavelFiltro]=useState(parametros.get("responsavel")??"");
  const [cidadeFiltro,setCidadeFiltro]=useState(parametros.get("cidade")??"");
  const [fornoFiltro,setFornoFiltro]=useState(parametros.get("forno")??"");
  const [inicioFiltro,setInicioFiltro]=useState(parametros.get("de")??"");
  const [fimFiltro,setFimFiltro]=useState(parametros.get("ate")??"");
  const [atencaoFiltro,setAtencaoFiltro]=useState(parametros.get("atencao")==="1");
  const quantidadeFiltros=[soComTelefone,responsavelFiltro,cidadeFiltro,fornoFiltro,inicioFiltro,fimFiltro,atencaoFiltro].filter(Boolean).length;
  useEffect(()=>{
    const url=new URL(window.location.href);
    for(const [chave,valor] of Object.entries({aba:aba==="todos"?"":aba,busca,telefone:soComTelefone?"1":"",responsavel:responsavelFiltro,cidade:cidadeFiltro,forno:fornoFiltro,de:inicioFiltro,ate:fimFiltro,atencao:atencaoFiltro?"1":""})){
      if(valor)url.searchParams.set(chave,valor);else url.searchParams.delete(chave);
    }
    window.history.replaceState(window.history.state,"",url.pathname+url.search);
  },[aba,busca,soComTelefone,responsavelFiltro,cidadeFiltro,fornoFiltro,inicioFiltro,fimFiltro,atencaoFiltro]);
  function limparFiltros(){setSoComTelefone(false);setResponsavelFiltro("");setCidadeFiltro("");setFornoFiltro("");setInicioFiltro("");setFimFiltro("");setAtencaoFiltro(false);}


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
    (!soComTelefone || !!evento.cliente_telefone) &&
    (!responsavelFiltro || (responsavelFiltro==="com"?!!evento.responsavel_id:!evento.responsavel_id)) &&
    (!cidadeFiltro || evento.cidade===cidadeFiltro) &&
    (!fornoFiltro || evento.modelo_forno_nome===fornoFiltro) &&
    (!inicioFiltro || evento.data_evento>=inicioFiltro) &&
    (!fimFiltro || evento.data_evento<=fimFiltro) &&
    (!atencaoFiltro || evento.atencao===true);

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
            aria-expanded={filtrosAbertos}
            aria-controls="filtros-agenda"
            aria-label="Filtros da agenda"
            onClick={() => setFiltrosAbertos((v) => !v)}
            className={cn(
              "h-9 px-3 flex shrink-0 items-center justify-center gap-2 rounded-lg transition-colors",
              quantidadeFiltros>0
                ? "bg-primary text-on-primary"
                : "bg-surface-container-highest hover:bg-surface-container-high text-on-surface",
            )}
          >
            <Filter className="w-[18px] h-[18px]" /><span className="text-sm">Filtros{quantidadeFiltros?` (${quantidadeFiltros})`:""}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-on-surface-variant">{visiveis.length} eventos{demo?" de demonstração":""}</span>
        <label className="flex items-center gap-3 rounded-lg bg-surface-container-low px-3 py-2">Visualização
          <input type="range" min={1} max={6} step={1} value={visualizacao} aria-label="Visualização da agenda" aria-valuetext={visualizacao===6?"Planilha":`${visualizacao} cards por linha`} onChange={e=>{const valor=Number(e.target.value);setVisualizacao(valor);try{localStorage.setItem("cecchin:agenda:visualizacao",String(valor));}catch{}}} className="w-28 accent-primary sm:w-40"/>
          <span className="w-20 font-semibold">{visualizacao===6?"6 · Planilha":`${visualizacao} por linha`}</span>
        </label>
      </div>

      {filtrosAbertos&&<section id="filtros-agenda" aria-label="Filtros da agenda" className="rounded-xl bg-surface-container-low p-3">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 [&_input]:bg-surface-container [&_select]:bg-surface-container [&_select]:text-on-surface [&_option]:bg-surface-container [&_option]:text-on-surface">
          <label className="text-sm">Responsável<select aria-label="Responsável" value={responsavelFiltro} onChange={e=>setResponsavelFiltro(e.target.value)} className="mt-1 block w-full rounded-lg p-2"><option value="">Todos</option><option value="sem">Sem responsável</option><option value="com">Com responsável</option></select></label>
          <label className="text-sm">Cidade<select aria-label="Cidade" value={cidadeFiltro} onChange={e=>setCidadeFiltro(e.target.value)} className="mt-1 block w-full rounded-lg p-2"><option value="">Todas</option>{[...new Set(eventos.map(e=>e.cidade).filter((v):v is string=>!!v))].sort().map(c=><option key={c}>{c}</option>)}</select></label>
          <label className="text-sm">Forno<select aria-label="Forno" value={fornoFiltro} onChange={e=>setFornoFiltro(e.target.value)} className="mt-1 block w-full rounded-lg p-2"><option value="">Todos</option>{[...new Set(eventos.map(e=>e.modelo_forno_nome).filter((v):v is string=>!!v))].sort().map(f=><option key={f}>{f}</option>)}</select></label>
          <label className="text-sm">Data inicial<input type="date" value={inicioFiltro} onChange={e=>setInicioFiltro(e.target.value)} className="mt-1 block w-full rounded-lg p-2"/></label>
          <label className="text-sm">Data final<input type="date" value={fimFiltro} onChange={e=>setFimFiltro(e.target.value)} className="mt-1 block w-full rounded-lg p-2"/></label>
          <div className="flex flex-col justify-center gap-2 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={soComTelefone} onChange={e=>setSoComTelefone(e.target.checked)}/>Somente com telefone</label><label className="flex items-center gap-2"><input type="checkbox" checked={atencaoFiltro} onChange={e=>setAtencaoFiltro(e.target.checked)}/>Somente com atenção</label></div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 text-sm"><span>{visiveis.length} eventos encontrados</span><button type="button" onClick={limparFiltros} className="rounded-lg bg-surface-container px-3 py-2">Limpar filtros</button></div>
      </section>}

      {visiveis.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant bg-surface-container-low rounded-xl p-space-md">
          Nenhum evento em <strong>{abaAtual.rotulo}</strong>
          {alvo ? ` para a busca "${busca.trim()}"` : ""}
          {soComTelefone ? " com telefone cadastrado" : ""}.
        </p>
      ) : (
        visualizacao===6 ? <AgendaPlanilha eventos={visiveis} responsaveis={responsaveis} podeAlocar={podeAlocar} alocar={alocar} /> : <ColunasEventos quantidade={visualizacao} eventos={visiveis} responsaveis={responsaveis} podeAlocar={podeAlocar} demo={demo} alocar={alocar} />
      )}
    </div>
  );
}

function ColunasEventos({eventos,responsaveis,podeAlocar,quantidade,demo,alocar}:{eventos:EventoDaAgenda[];responsaveis:ResponsavelDisponivel[];podeAlocar:boolean;quantidade:number;demo:boolean;alocar:(id:string,responsavel:string)=>Promise<void>}) {
  return <div className="max-w-full overflow-x-auto pb-2"><div className="grid items-start gap-3" style={{gridTemplateColumns:`repeat(${quantidade}, minmax(0, 1fr))`,minWidth:quantidade===1?undefined:quantidade*220+(quantidade-1)*12}}>
    {Array.from({length:quantidade},(_,coluna)=><div key={coluna} className="flex min-w-0 flex-col gap-3" data-coluna-eventos={coluna}>
      {eventos.filter((_,i)=>i%quantidade===coluna).map(evento=><CartaoEvento key={evento.id} evento={evento} responsaveis={responsaveis} podeAlocar={podeAlocar} demo={demo} aoAlocar={alocar}/>)}
    </div>)}
  </div></div>;
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
  demo,
  aoAlocar,
}: {
  evento: EventoDaAgenda;
  responsaveis: ResponsavelDisponivel[];
  podeAlocar: boolean;
  demo: boolean;
  aoAlocar:(id:string,responsavel:string)=>Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);
  const [alocando, setAlocando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [editandoResponsavel, setEditandoResponsavel] = useState(false);

  /*
   * Alocar responsável é o outro lado do elo conta-responsável. Sem isto, a
   * conta ligada não adianta: os 154 eventos futuros vieram da planilha com
   * `responsavel_id` nulo, porque lá o nome de quem respondeu era anotado
   * depois do evento.
   */
  async function alocar(responsavel:string){setFalha(null);setAlocando(true);try{await aoAlocar(evento.id,responsavel);}catch(e){setFalha(e instanceof Error?e.message:"Falha ao alocar");}finally{setAlocando(false);}}

  const pessoas = (evento.inteiros ?? 0) + (evento.meios ?? 0);
  const local =
    [evento.bairro, evento.cidade].filter(Boolean).join(" · ") || "Sem endereço";
  const zap = podeAlocar ? linkCentralWhatsApp(evento.cliente_telefone) : linkWhatsApp(evento.cliente_telefone);

  return (
    <div
      className={cn(
        "relative bg-surface-container-lowest rounded-xl shadow-sm border-t-4 overflow-hidden flex flex-col hover:shadow-lg transition-shadow",
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
        <div className={cn("flex flex-col min-w-0",podeAlocar&&"pr-24")}>
          <h3 title={evento.cliente_nome??"Sem cliente"} className="font-headline-sm text-headline-sm text-on-surface font-bold truncate">
            {evento.cliente_nome ?? "Sem cliente"}
            {pessoas > 0 ? ` • ${pessoas}p` : ""}
          </h3>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {[evento.codigo_legado, evento.tipo_evento_nome]
              .filter(Boolean)
              .join(" • ") || "—"}
          </span>
        </div>

        <div className={cn("flex items-start gap-2",podeAlocar&&"pr-24")}>
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

        <div className="flex flex-wrap items-center gap-2 bg-surface-container-low p-2 rounded-lg">
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
            {podeAlocar && responsaveis.length > 0 && editandoResponsavel ? (
              <>
                <label className="sr-only" htmlFor={`resp-${evento.id}`}>
                  Responsável por {evento.cliente_nome ?? "este evento"}
                </label>
                <select
                  id={`resp-${evento.id}`}
                  value={evento.responsavel_id ?? ""}
                  disabled={alocando}
                  autoFocus
                  onBlur={() => setEditandoResponsavel(false)}
                  onChange={(e) => void alocar(e.target.value).then(() => setEditandoResponsavel(false))}
                  className="font-label-md text-label-md text-on-surface bg-surface-container-high border border-on-surface/20 px-2 py-1.5 rounded max-w-[11rem] truncate focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                >
                  <option className="bg-surface-container-high text-on-surface" value="">não alocado</option>
                  {responsaveis.map((r) => (
                    <option className="bg-surface-container-high text-on-surface" key={r.id} value={r.id}>
                      {r.nome}
                    </option>
                  ))}
                </select>
              </>
            ) : podeAlocar && responsaveis.length > 0 ? (
              <button type="button" aria-label={`Alterar responsável por ${evento.cliente_nome ?? "este evento"}`} onClick={() => setEditandoResponsavel(true)} className="max-w-[11rem] truncate rounded bg-surface-container-high px-2 py-1.5 text-left font-label-md text-label-md text-on-surface hover:bg-primary-container focus:outline-none focus:ring-1 focus:ring-primary">
                {evento.responsavel_nome ?? "não alocado"}
              </button>
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

      {podeAlocar && <div className="px-3 pb-3"><a href={`/admin/montar-equipe?evento=${evento.id}`} className="mb-2 block rounded-lg bg-primary px-3 py-2 text-center text-sm text-on-primary">Montar equipe</a><QrEvento compacto demo={demo} evento={evento.id} titulo={`${evento.cliente_nome ?? "Evento"} · ${comoData(evento.data_evento)}`} /></div>}

      <div className="p-3 bg-surface-container-highest border-t border-outline-variant/20 flex flex-wrap gap-2">
        <a href={`/operacional/eventos/${evento.id}`} className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-center font-label-md text-label-md text-on-primary hover:opacity-90">Abrir evento</a>
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
            target={zap.startsWith("/") ? undefined : "_blank"}
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
