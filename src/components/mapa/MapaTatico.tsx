"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection, LineString } from "geojson";
import { AlertCircle, Info, LocateFixed, MapPin, Route, Truck } from "lucide-react";
import { comoHora } from "../../lib/formato";
import { cn } from "../../lib/utils";
import { aplicarVisualOperacional, ESTILO_MAPA_OPERACIONAL, paraLngLat, type Coordenada } from "../maps/mapa-livre";
import { LogisticaPainel, type ResumoMapaLogistico } from "../frota/LogisticaPainel";

type BibliotecaMapa = typeof import("maplibre-gl");
type MapaMapLibre = import("maplibre-gl").Map;
type Marker = import("maplibre-gl").Marker;

async function carregarBibliotecaMapa(): Promise<BibliotecaMapa> {
  const [modulo] = await Promise.all([import("maplibre-gl"), import("maplibre-gl/dist/maplibre-gl.css")]);
  modulo.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
  return modulo;
}

export interface EventoNoMapa {
  id: string; cliente_nome: string | null; endereco: string | null; bairro: string | null; cidade: string | null;
  horario: string | null; horario_texto: string | null; horario_saida: string | null; inteiros: number | null; meios: number | null; responsavel_nome: string | null;
  latitude?: number | null; longitude?: number | null;
  estimado?: boolean;
}

function enderecoDoEvento(evento: EventoNoMapa) {
  return [evento.endereco, evento.bairro, evento.cidade].filter(Boolean).join(", ");
}

function normalizarBusca(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function pontoDoEvento(evento: EventoNoMapa): Coordenada | null {
  const lat = Number(evento.latitude), lng = Number(evento.longitude);
  return evento.latitude != null && evento.longitude != null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

const cacheDeRotas = new Map<string, Promise<LineString | null>>();

function chaveDaRota(pontos: Coordenada[]) {
  return pontos.map((ponto) => `${ponto.lng.toFixed(6)},${ponto.lat.toFixed(6)}`).join(";");
}

function consultarRota(pontos: Coordenada[]) {
  const chave = chaveDaRota(pontos);
  let pedido = cacheDeRotas.get(chave);
  if (!pedido) {
    pedido = fetch(`/api/mapa/rota?${new URLSearchParams({ pontos: chave })}`)
      .then((resposta) => { if (!resposta.ok) throw new Error("rota indisponível"); return resposta.json(); })
      .then((dados: { geometria?: LineString }) => dados?.geometria?.type === "LineString" ? dados.geometria : null)
      .catch(() => { cacheDeRotas.delete(chave); return null; });
    cacheDeRotas.set(chave, pedido);
  }
  return pedido;
}

function elementoBase() {
  const el = document.createElement("div");
  el.className = "flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-white shadow-lg";
  el.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" class="h-4 w-4 fill-current"><path d="m3.5 12 18-9-9 18-2-7-7-2Z"/></svg>';
  return el;
}

function elementoEvento(rotulo: string, nome: string) {
  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute("aria-label", `Evento ${rotulo}: ${nome}`);
  el.className = "flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-slate-900 font-semibold text-sm text-white shadow-lg";
  el.textContent = rotulo;
  return el;
}

function enquadrar(mapa: MapaMapLibre, modulo: BibliotecaMapa, pontos: Coordenada[]) {
  if (pontos.length === 0) return;
  const limites = new modulo.LngLatBounds();
  pontos.forEach((ponto) => limites.extend(paraLngLat(ponto)));
  mapa.fitBounds(limites, { padding: 72, maxZoom: 14, duration: 450 });
}

function MapaReal({ eventos, base, selecionado, aoSelecionar, rascunho, aoMoverRascunho, resumo, podeEditar }: { eventos: EventoNoMapa[]; base: Coordenada; selecionado: string | null; aoSelecionar: (id: string) => void; rascunho: Coordenada | null; aoMoverRascunho: (ponto: Coordenada) => void; resumo: ResumoMapaLogistico | null; podeEditar: boolean }) {
  const recipiente = useRef<HTMLDivElement>(null);
  const biblioteca = useRef<BibliotecaMapa | null>(null);
  const mapa = useRef<MapaMapLibre | null>(null);
  const pinos = useRef(new Map<string, Marker>());
  const pinoRascunho = useRef<Marker | null>(null);
  const aoSelecionarAtual = useRef(aoSelecionar);
  aoSelecionarAtual.current = aoSelecionar;
  const selecionadoAtual = useRef(selecionado);
  selecionadoAtual.current = selecionado;
  const aoMoverAtual = useRef(aoMoverRascunho);
  aoMoverAtual.current = aoMoverRascunho;
  const podeEditarAtual = useRef(podeEditar);
  podeEditarAtual.current = podeEditar;
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState(false);
  const [legendaAberta, setLegendaAberta] = useState(false);
  const [rotas, setRotas] = useState<Record<string, LineString>>({});
  const [rotasAprovadas, setRotasAprovadas] = useState<LineString[]>([]);
  const eventosComLocal = eventos.filter((evento) => pontoDoEvento(evento));

  useEffect(() => {
    let ativo = true;
    setPronto(false);
    void carregarBibliotecaMapa().then((modulo) => {
      if (!ativo || !recipiente.current) return;
      biblioteca.current = modulo;
      const instancia = new modulo.Map({ container: recipiente.current, style: ESTILO_MAPA_OPERACIONAL, center: paraLngLat(base), zoom: 11, attributionControl: false });
      mapa.current = instancia;
      instancia.addControl(new modulo.NavigationControl({ showCompass: false }), "bottom-right");
      instancia.on("load", () => { aplicarVisualOperacional(instancia); setPronto(true); });
      instancia.on("error", () => setErro(true));
      instancia.on("click", (ev) => { if (podeEditarAtual.current && selecionadoAtual.current) aoMoverAtual.current({ lat: ev.lngLat.lat, lng: ev.lngLat.lng }); });
      new modulo.Marker({ element: elementoBase() }).setLngLat(paraLngLat(base)).setPopup(new modulo.Popup({ offset: 20 }).setText("Base operacional")).addTo(instancia);
    }).catch(() => { if (ativo) setErro(true); });
    return () => { ativo = false; pinos.current.forEach((pino) => pino.remove()); pinos.current.clear(); pinoRascunho.current?.remove(); pinoRascunho.current = null; mapa.current?.remove(); mapa.current = null; };
  }, [base.lat, base.lng]);

  useEffect(() => {
    if (!pronto || !mapa.current || !biblioteca.current) return;
    const instancia = mapa.current, modulo = biblioteca.current;
    const grupos = new Map<string, { ponto: Coordenada; itens: Array<{ evento: EventoNoMapa; numero: number }> }>();
    eventos.forEach((evento, indice) => {
      const ponto = pontoDoEvento(evento); if (!ponto) return;
      const chave = `${ponto.lat.toFixed(6)},${ponto.lng.toFixed(6)}`;
      const grupo = grupos.get(chave) ?? { ponto, itens: [] };
      grupo.itens.push({ evento, numero: indice + 1 }); grupos.set(chave, grupo);
    });
    for (const [id, marcador] of pinos.current) if (!grupos.has(id)) { marcador.remove(); pinos.current.delete(id); }
    for (const [chave, grupo] of grupos) {
      const rotulo = grupo.itens.map((item) => item.numero).join("·");
      let marcador = pinos.current.get(chave);
      if (!marcador) {
        const elemento = elementoEvento(rotulo, grupo.itens.map((item) => item.evento.cliente_nome ?? "Evento").join(" / "));
        const ids = grupo.itens.map((item) => item.evento.id);
        elemento.addEventListener("click", (ev) => { ev.stopPropagation(); const atual = ids.indexOf(selecionadoAtual.current ?? ""); aoSelecionarAtual.current(ids[(atual + 1) % ids.length]); });
        marcador = new modulo.Marker({ element: elemento, anchor: "center" }).setLngLat(paraLngLat(grupo.ponto)).setPopup(new modulo.Popup({ offset: 20 }).setText(grupo.itens.map((item) => `${item.numero}. ${item.evento.cliente_nome ?? "Evento"}`).join(" / "))).addTo(instancia);
        pinos.current.set(chave, marcador);
      } else {
        marcador.setLngLat(paraLngLat(grupo.ponto));
        marcador.getElement().textContent = rotulo;
      }
      const ativo = grupo.itens.some((item) => item.evento.id === selecionado);
      const estimado = grupo.itens.some((item) => item.evento.estimado);
      marcador.getElement().classList.toggle("ring-4", ativo);
      marcador.getElement().classList.toggle("ring-orange-400/60", ativo);
      marcador.getElement().classList.toggle("bg-orange-700", ativo);
      marcador.getElement().classList.toggle("bg-amber-600", !ativo && estimado);
      marcador.getElement().classList.toggle("bg-slate-900", !ativo && !estimado);
    }
  }, [pronto, eventos, selecionado]);

  useEffect(() => {
    if (!pronto || !mapa.current || !biblioteca.current) return;
    pinoRascunho.current?.remove(); pinoRascunho.current = null;
    if (!rascunho) return;
    const elemento = document.createElement("div");
    elemento.className = "h-5 w-5 rounded-full border-4 border-white bg-orange-500 shadow-lg";
    pinoRascunho.current = new biblioteca.current.Marker({ element: elemento, anchor: "center", draggable: true }).setLngLat(paraLngLat(rascunho)).addTo(mapa.current);
    pinoRascunho.current.on("dragend", () => { const p = pinoRascunho.current?.getLngLat(); if (p) aoMoverAtual.current({ lat: p.lat, lng: p.lng }); });
    mapa.current.easeTo({ center: paraLngLat(rascunho), zoom: Math.max(15, mapa.current.getZoom()), duration: 350 });
  }, [pronto, rascunho?.lat, rascunho?.lng]);

  useEffect(() => {
    if (!pronto || !mapa.current || !biblioteca.current) return;
    enquadrar(mapa.current, biblioteca.current, [base, ...eventosComLocal.map((evento) => pontoDoEvento(evento)!)]);
  }, [pronto, base.lat, base.lng, eventos]);

  useEffect(() => {
    let ativo = true;
    const destinos = [...new Set(eventosComLocal.map((evento) => chaveDaRota([base, pontoDoEvento(evento)!])))];
    async function carregarEmLotes() {
      for (let indice = 0; ativo && indice < destinos.length; indice += 3) {
        const lote = await Promise.all(destinos.slice(indice, indice + 3).map(async (chave) => {
          const pontos = chave.split(";").map((item) => {
            const [lng, lat] = item.split(",").map(Number);
            return { lat, lng };
          });
          return [chave, await consultarRota(pontos)] as const;
        }));
        if (ativo) setRotas((atual) => ({ ...atual, ...Object.fromEntries(lote.filter((item): item is readonly [string, LineString] => Boolean(item[1]))) }));
      }
    }
    void carregarEmLotes();
    return () => { ativo = false; };
  }, [eventos, base.lat, base.lng]);

  useEffect(() => {
    let ativo = true;
    const porId = new Map(eventos.map((evento) => [evento.id, pontoDoEvento(evento)]));
    const viagens = (resumo?.planos ?? []).filter((plano) => plano.situacao === "aprovado").flatMap((plano) => {
      const paradas = (resumo?.paradas ?? []).filter((parada) => parada.plano_id === plano.id).sort((a, b) => a.ordem - b.ordem).map((parada) => parada.evento_id);
      const dupla = resumo?.duplos.find((item) => item.id === plano.evento_duplo_id);
      const ids = paradas.length ? paradas : dupla ? [dupla.primeiro_evento_id, dupla.segundo_evento_id] : [plano.evento_id];
      const pontos = ids.map((id) => porId.get(id)).filter((ponto): ponto is Coordenada => Boolean(ponto));
      return pontos.length === ids.length ? [[base, ...pontos, base]] : [];
    });
    void Promise.all(viagens.map((pontos) => consultarRota(pontos))).then((geometrias) => {
      if (ativo) setRotasAprovadas(geometrias.filter((geometria): geometria is LineString => Boolean(geometria)));
    });
    return () => { ativo = false; };
  }, [eventos, resumo, base.lat, base.lng]);

  useEffect(() => {
    if (!pronto || !mapa.current) return;
    const instancia = mapa.current;
    if (!instancia.isStyleLoaded()) return;
    const colecao = (geometrias: LineString[]): FeatureCollection<LineString> => ({ type: "FeatureCollection", features: geometrias.map((geometry) => ({ type: "Feature", properties: {}, geometry })) });
    const chaveSelecionada = eventos.find((evento) => evento.id === selecionado);
    const pontoSelecionado = chaveSelecionada && pontoDoEvento(chaveSelecionada);
    const rotaSelecionada = pontoSelecionado ? chaveDaRota([base, pontoSelecionado]) : null;
    const rotasDoDia = [...new Set(eventosComLocal.map((evento) => chaveDaRota([base, pontoDoEvento(evento)!])))];
    const camadas = [
      { id: "rotas-possiveis", geometrias: rotasDoDia.filter((chave) => chave !== rotaSelecionada).map((chave) => rotas[chave]).filter((rota): rota is LineString => Boolean(rota)), cor: "#27b9ff", largura: 3, opacidade: 0.78 },
      { id: "rotas-aprovadas", geometrias: rotasAprovadas, cor: "#37f4a8", largura: 5, opacidade: 0.95 },
      { id: "rota-selecionada", geometrias: rotaSelecionada && rotas[rotaSelecionada] ? [rotas[rotaSelecionada]] : [], cor: "#ff4f68", largura: 6, opacidade: 1 },
    ];
    for (const camada of camadas) {
      if (!instancia.getSource(camada.id)) {
        instancia.addSource(camada.id, { type: "geojson", data: colecao(camada.geometrias) });
        instancia.addLayer({ id: camada.id, type: "line", source: camada.id, paint: { "line-color": camada.cor, "line-width": camada.largura, "line-opacity": camada.opacidade } });
      } else {
        (instancia.getSource(camada.id) as import("maplibre-gl").GeoJSONSource).setData(colecao(camada.geometrias));
        instancia.setPaintProperty(camada.id, "line-color", camada.cor);
        instancia.setPaintProperty(camada.id, "line-width", camada.largura);
        instancia.setPaintProperty(camada.id, "line-opacity", camada.opacidade);
      }
    }
  }, [pronto, eventos, base.lat, base.lng, selecionado, rotas, rotasAprovadas]);

  useEffect(() => {
    if (!recipiente.current || !mapa.current) return;
    const observer = new ResizeObserver(() => mapa.current?.resize());
    observer.observe(recipiente.current);
    return () => observer.disconnect();
  }, [pronto]);

  return <div className="relative h-full w-full">
    <div ref={recipiente} className="h-full w-full" />
    <button type="button" onClick={() => { if (mapa.current && biblioteca.current) enquadrar(mapa.current, biblioteca.current, [base, ...eventosComLocal.map((evento) => pontoDoEvento(evento)!)]); }} className="absolute left-3 top-3 flex items-center gap-1 rounded-lg bg-surface-container px-3 py-2 text-xs shadow-md"><LocateFixed className="h-4 w-4" /> Ver todos</button>
    <div className="absolute bottom-3 left-3 flex flex-col items-start gap-2">
      {legendaAberta && <div id="legenda-mapa-tatico" className="rounded-xl bg-surface-container/95 p-3 text-xs shadow-md backdrop-blur-sm">
        <p className="mb-2 font-semibold">Legenda do mapa</p>
        <div className="grid gap-1.5 text-on-surface-variant">
          <span className="flex items-center gap-2"><i className="h-0.5 w-5 bg-[#ff4f68]" /> Evento selecionado</span>
          <span className="flex items-center gap-2"><i className="h-0.5 w-5 bg-[#37f4a8]" /> Viagem aprovada</span>
          <span className="flex items-center gap-2"><i className="h-0.5 w-5 bg-[#27b9ff]" /> Trajeto possível</span>
        </div>
      </div>}
      <button type="button" aria-label={legendaAberta ? "Recolher legenda" : "Mostrar legenda"} aria-expanded={legendaAberta} aria-controls="legenda-mapa-tatico" onClick={() => setLegendaAberta((atual) => !atual)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container text-on-surface shadow-md hover:bg-surface-container-high"><Info className="h-4 w-4" /></button>
    </div>
    {erro && <div role="alert" className="absolute left-3 top-14 rounded-lg bg-error-container p-2 text-xs text-on-error-container">Não foi possível carregar o mapa agora.</div>}
  </div>;
}

export function MapaTatico({ eventos, base, dia, podePlanejar = false }: { eventos: EventoNoMapa[]; base: Coordenada; dia?: string; podePlanejar?: boolean }) {
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [aba, setAba] = useState<"eventos" | "saidas">("eventos");
  const [locaisSalvos, setLocaisSalvos] = useState<Record<string, Coordenada>>({});
  const [estimados, setEstimados] = useState<Record<string, Coordenada>>({});
  const [buscandoTodos, setBuscandoTodos] = useState(false);
  const [versaoLocais, setVersaoLocais] = useState(0);
  const [editandoPonto, setEditandoPonto] = useState(false);
  const [erroPrevia, setErroPrevia] = useState("");
  const [consulta, setConsulta] = useState("");
  const [opcoes, setOpcoes] = useState<Array<Coordenada & { endereco: string }>>([]);
  const [rascunho, setRascunho] = useState<Coordenada | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroLocal, setErroLocal] = useState("");
  const [resumo, setResumo] = useState<ResumoMapaLogistico | null>(null);
  const eventosVisiveis = useMemo(() => eventos.map((evento) => {
    const confirmado = locaisSalvos[evento.id] ?? pontoDoEvento(evento);
    const estimado = confirmado ? null : estimados[evento.id];
    return { ...evento, latitude: confirmado?.lat ?? estimado?.lat ?? null, longitude: confirmado?.lng ?? estimado?.lng ?? null, estimado: Boolean(estimado) };
  }), [eventos, locaisSalvos, estimados]);
  const eventoSelecionado = eventosVisiveis.find((evento) => evento.id === selecionado);
  const semLocal = eventos.filter((evento) => !locaisSalvos[evento.id] && !pontoDoEvento(evento)).length;
  const totalEstimados = eventosVisiveis.filter((evento) => evento.estimado).length;

  useEffect(() => {
    setSelecionado(null); setLocaisSalvos({}); setEstimados({}); setEditandoPonto(false);
  }, [dia]);

  useEffect(() => { void preverLocais(); }, [dia]);

  async function preverLocais() {
    setBuscandoTodos(true); setErroPrevia("");
    const cache = new Map<string, Coordenada | null>();
    let salvos = 0;
    try {
      for (const evento of eventosVisiveis) {
        if (pontoDoEvento(evento)) continue;
        if (!evento.endereco?.trim()) continue;
        const busca = [evento.endereco?.split(/\s+-\s+/)[0], evento.cidade ?? evento.bairro].filter(Boolean).join(", ");
        if (busca.length < 3) continue;
        if (!cache.has(busca)) {
          if (cache.size) await new Promise((resolve) => setTimeout(resolve, 1100));
          try {
            const resposta = await fetch(`/api/mapa/buscar?q=${encodeURIComponent(busca)}`);
            const dado = resposta.ok ? await resposta.json() as { locais?: Array<Coordenada & { endereco: string }> } : null;
            const cidade = normalizarBusca(evento.cidade ?? "");
            const palavrasDaRua = normalizarBusca(evento.endereco.split(",")[0]).split(/\W+/).filter((palavra) => palavra.length >= 4 && !["rua", "avenida", "estrada"].includes(palavra)).slice(0, 2);
            const candidato = cidade && palavrasDaRua.length ? dado?.locais?.find((local) => {
              const descricao = normalizarBusca(local.endereco);
              return descricao.includes(cidade) && palavrasDaRua.every((palavra) => descricao.includes(palavra));
            }) : null;
            cache.set(busca, candidato ? { lat: candidato.lat, lng: candidato.lng } : null);
          } catch { cache.set(busca, null); }
        }
        const ponto = cache.get(busca);
        if (ponto) {
          setEstimados((atual) => ({ ...atual, [evento.id]: ponto }));
          if (podePlanejar) {
            try {
              const resposta = await fetch("/api/operacao/montagem-equipe", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ acao: "localizacao_evento", evento: evento.id, latitude: ponto.lat, longitude: ponto.lng, enderecoReferencia: enderecoDoEvento(evento) }) });
              if (!resposta.ok) throw new Error("localização não salva");
              setLocaisSalvos((atual) => ({ ...atual, [evento.id]: ponto }));
              setEstimados((atual) => { const proximo = { ...atual }; delete proximo[evento.id]; return proximo; });
              salvos++;
            } catch { setErroPrevia("Alguns endereços foram encontrados, mas não puderam ser salvos. Ajuste-os na lista."); }
          }
        }
      }
    } finally {
      if (salvos) setVersaoLocais((atual) => atual + 1);
      if (cache.size && [...cache.values()].some((ponto) => !ponto)) setErroPrevia("Alguns endereços não foram encontrados. Ajuste-os na lista.");
      setBuscandoTodos(false);
    }
  }

  async function buscarLocal() {
    if (!consulta.trim()) return;
    setBuscando(true); setErroLocal(""); setOpcoes([]);
    try {
      const resposta = await fetch(`/api/mapa/buscar?q=${encodeURIComponent(consulta.trim())}`);
      const dado = await resposta.json();
      if (!resposta.ok) throw new Error(dado.mensagem ?? "Busca indisponível");
      setOpcoes(dado.locais ?? []);
      if (!dado.locais?.length) setErroLocal("Nenhum endereço encontrado. Ajuste a busca e tente de novo.");
    } catch (erro) { setErroLocal(erro instanceof Error ? erro.message : "Busca indisponível"); }
    finally { setBuscando(false); }
  }

  async function salvarLocal(ponto: Coordenada) {
    if (!eventoSelecionado) return;
    setSalvando(true); setErroLocal("");
    try {
      const resposta = await fetch("/api/operacao/montagem-equipe", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ acao: "localizacao_evento", evento: eventoSelecionado.id, latitude: ponto.lat, longitude: ponto.lng, enderecoReferencia: enderecoDoEvento(eventoSelecionado) }) });
      const dado = await resposta.json();
      if (!resposta.ok) throw new Error(dado.mensagem ?? "Não foi possível salvar o ponto.");
      setLocaisSalvos((atual) => ({ ...atual, [eventoSelecionado.id]: ponto }));
      setVersaoLocais((atual) => atual + 1);
      setEditandoPonto(false);
      setOpcoes([]); setRascunho(null);
      setEstimados((atual) => { const proximo = { ...atual }; delete proximo[eventoSelecionado.id]; return proximo; });
    } catch (erro) { setErroLocal(erro instanceof Error ? erro.message : "Não foi possível salvar o ponto."); }
    finally { setSalvando(false); }
  }

  function selecionarEvento(evento: EventoNoMapa) {
    setSelecionado(evento.id);
    setEditandoPonto(false);
    setOpcoes([]); setRascunho(null); setErroLocal("");
    setConsulta([evento.endereco?.split(/\s+-\s+/)[0], evento.cidade ?? evento.bairro].filter(Boolean).join(", "));
  }
  return <div className="flex min-h-0 flex-1 flex-col gap-2">
    <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm"><span>{eventos.length} evento{eventos.length === 1 ? "" : "s"} em {dia ? dia.split("-").reverse().join("/") : "hoje"}</span>{buscandoTodos ? <span role="status" className="text-xs text-on-surface-variant">Localizando endereços e traçando rotas…</span> : semLocal > 0 && <span className="flex items-center gap-2 text-amber-500"><AlertCircle className="h-4 w-4" /> {semLocal} sem ponto encontrado <button type="button" onClick={() => void preverLocais()} className="rounded-lg bg-surface-container px-2 py-1 text-xs text-on-surface">Tentar novamente</button></span>}{totalEstimados > 0 && <span className="text-xs text-amber-500">{totalEstimados} ponto{totalEstimados === 1 ? "" : "s"} aproximado{totalEstimados === 1 ? "" : "s"}</span>}{erroPrevia && <span role="status" className="text-xs text-amber-500">{erroPrevia}</span>}<span className="ml-auto text-[11px] text-on-surface-variant">© <a className="hover:underline" href="https://openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> · dados <a className="hover:underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a></span></div>
    <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-3">
      <div className="relative min-h-[240px] min-w-0 overflow-hidden rounded-2xl bg-surface-container lg:col-span-2"><MapaReal eventos={eventosVisiveis} base={base} selecionado={selecionado} aoSelecionar={(id) => { const evento = eventosVisiveis.find((item) => item.id === id); if (evento) selecionarEvento(evento); }} rascunho={rascunho} aoMoverRascunho={setRascunho} resumo={resumo} podeEditar={Boolean(eventoSelecionado && (editandoPonto || !pontoDoEvento(eventoSelecionado)))} /></div>
      <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl bg-surface-container-low" aria-label="Painel do mapa">
        <div className="flex shrink-0 border-b border-outline-variant/30 p-2">
          <button type="button" onClick={() => setAba("eventos")} aria-pressed={aba === "eventos"} className={cn("flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm", aba === "eventos" ? "bg-primary-container text-on-primary-container" : "text-on-surface-variant hover:bg-surface-container") }><MapPin className="h-4 w-4" /> Eventos <span className="rounded-full bg-surface-container px-1.5 text-xs">{eventos.length}</span></button>
          {podePlanejar && <button type="button" onClick={() => setAba("saidas")} aria-pressed={aba === "saidas"} className={cn("flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm", aba === "saidas" ? "bg-primary-container text-on-primary-container" : "text-on-surface-variant hover:bg-surface-container") }><Route className="h-4 w-4" /> Planejar saídas</button>}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <ul className={cn("space-y-2 p-3", aba !== "eventos" && "hidden")}>
            {eventos.length === 0 && <li className="rounded-xl bg-surface-container p-4 text-sm text-on-surface-variant">Nenhum evento confirmado neste dia.</li>}
             {eventosVisiveis.map((evento, indice) => <li key={evento.id}><button type="button" onClick={() => selecionarEvento(evento)} aria-pressed={selecionado === evento.id} className={cn("w-full rounded-xl p-3 text-left transition-colors", selecionado === evento.id ? "bg-primary-container text-on-primary-container" : "bg-surface-container-lowest hover:bg-surface-container")}><span className="flex items-center justify-between gap-2"><span className="truncate font-semibold">{indice + 1}. {evento.cliente_nome ?? "sem cliente"}</span><span className="shrink-0 text-xs">{comoHora(evento.horario, evento.horario_texto)}</span></span><span className="mt-1 block truncate text-xs opacity-80">{enderecoDoEvento(evento) || "Sem endereço"}</span><span className="mt-2 flex flex-wrap items-center gap-3 text-xs opacity-80"><span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> Sai {comoHora(evento.horario_saida, null)}</span><span>{(evento.inteiros ?? 0) + Math.ceil((evento.meios ?? 0) / 2)} pessoas</span>{evento.estimado ? <span className="text-amber-500">Ponto aproximado</span> : !pontoDoEvento(evento) && <span className="text-amber-500">Localizando endereço</span>}</span></button></li>)}
          </ul>
           {aba === "eventos" && eventoSelecionado && podePlanejar && <div className="mx-3 mb-3 rounded-xl bg-surface-container p-3 text-xs"><button type="button" onClick={() => setEditandoPonto((atual) => !atual)} className="font-semibold text-primary">{editandoPonto ? "Fechar ajuste" : pontoDoEvento(eventoSelecionado) ? "Ajustar ponto no mapa" : "Localizar endereço manualmente"}</button>{(editandoPonto || !pontoDoEvento(eventoSelecionado)) && <><p className="mt-1 text-on-surface-variant">Use a busca ou mova o pino no mapa caso o endereço não corresponda ao acesso correto.</p><form onSubmit={(ev) => { ev.preventDefault(); void buscarLocal(); }} className="mt-2 flex gap-2"><input aria-label="Buscar endereço do evento" value={consulta} onChange={(ev) => setConsulta(ev.target.value)} className="min-w-0 flex-1 rounded-lg bg-surface-container-lowest px-2 py-2" placeholder="Rua, número, cidade" /><button disabled={buscando} className="rounded-lg bg-primary px-3 py-2 text-on-primary disabled:opacity-50">{buscando ? "Buscando…" : "Buscar"}</button></form>{opcoes.length > 0 && <div className="mt-2 grid gap-1">{opcoes.map((opcao, indice) => <button key={`${opcao.lat}:${opcao.lng}:${indice}`} type="button" onClick={() => { setRascunho({ lat: opcao.lat, lng: opcao.lng }); setOpcoes([]); }} className="rounded-lg bg-surface-container-lowest p-2 text-left hover:bg-primary-container">{opcao.endereco}</button>)}</div>}{rascunho && <button type="button" disabled={salvando} onClick={() => void salvarLocal(rascunho)} className="mt-2 w-full rounded-lg bg-primary px-3 py-2 font-semibold text-on-primary disabled:opacity-50">{salvando ? "Salvando…" : "Salvar ajuste"}</button>}{erroLocal && <p role="alert" className="mt-2 text-error">{erroLocal}</p>}</>}</div>}
           {podePlanejar && <div className={aba === "saidas" ? "" : "hidden"}><LogisticaPainel diaInicial={dia} compacto versaoLocais={versaoLocais} aoAtualizarMapa={setResumo} /></div>}
        </div>
      </aside>
    </div>
  </div>;
}
