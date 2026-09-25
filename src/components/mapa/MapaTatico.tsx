"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection, LineString } from "geojson";
import { AlertCircle, LocateFixed, MapPin, Route, Truck } from "lucide-react";
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

function pontoDoEvento(evento: EventoNoMapa): Coordenada | null {
  const lat = Number(evento.latitude), lng = Number(evento.longitude);
  return evento.latitude != null && evento.longitude != null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
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
  el.className = "flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-slate-900 font-semibold text-sm text-white shadow-lg transition-transform";
  el.textContent = rotulo;
  return el;
}

function enquadrar(mapa: MapaMapLibre, modulo: BibliotecaMapa, pontos: Coordenada[]) {
  if (pontos.length === 0) return;
  const limites = new modulo.LngLatBounds();
  pontos.forEach((ponto) => limites.extend(paraLngLat(ponto)));
  mapa.fitBounds(limites, { padding: 72, maxZoom: 14, duration: 450 });
}

function MapaReal({ eventos, base, selecionado, aoSelecionar, rascunho, aoMoverRascunho, resumo }: { eventos: EventoNoMapa[]; base: Coordenada; selecionado: string | null; aoSelecionar: (id: string) => void; rascunho: Coordenada | null; aoMoverRascunho: (ponto: Coordenada) => void; resumo: ResumoMapaLogistico | null }) {
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
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState(false);
  const [rota, setRota] = useState<LineString | null>(null);
  const eventosComLocal = eventos.filter((evento) => pontoDoEvento(evento));

  useEffect(() => {
    let ativo = true;
    void carregarBibliotecaMapa().then((modulo) => {
      if (!ativo || !recipiente.current) return;
      biblioteca.current = modulo;
      const instancia = new modulo.Map({ container: recipiente.current, style: ESTILO_MAPA_OPERACIONAL, center: paraLngLat(base), zoom: 11, attributionControl: {} });
      mapa.current = instancia;
      instancia.addControl(new modulo.NavigationControl({ showCompass: false }), "bottom-right");
      instancia.on("load", () => { aplicarVisualOperacional(instancia); setPronto(true); });
      instancia.on("error", () => setErro(true));
      instancia.on("click", (ev) => { if (selecionadoAtual.current) aoMoverAtual.current({ lat: ev.lngLat.lat, lng: ev.lngLat.lng }); });
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
      marcador.getElement().classList.toggle("scale-125", ativo);
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
    if (!pronto || !mapa.current) return;
    const instancia = mapa.current;
    const geojson: FeatureCollection<LineString> = {
      type: "FeatureCollection",
      features: eventosComLocal.map((evento) => ({ type: "Feature", properties: { id: evento.id }, geometry: { type: "LineString", coordinates: [paraLngLat(base), paraLngLat(pontoDoEvento(evento)!)] } })),
    };
    if (!instancia.getSource("rotas-possiveis")) {
      instancia.addSource("rotas-possiveis", { type: "geojson", data: geojson });
      instancia.addLayer({ id: "rotas-possiveis", type: "line", source: "rotas-possiveis", paint: { "line-color": "#f1a58f", "line-width": 2, "line-opacity": 0.5, "line-dasharray": [2, 3] } });
    } else (instancia.getSource("rotas-possiveis") as import("maplibre-gl").GeoJSONSource).setData(geojson);
  }, [pronto, eventos, base.lat, base.lng]);

  useEffect(() => {
    if (!pronto || !mapa.current) return;
    const instancia = mapa.current;
    const porId = new Map(eventos.map((evento) => [evento.id, pontoDoEvento(evento)]));
    const geojson: FeatureCollection<LineString> = { type: "FeatureCollection", features: (resumo?.planos ?? []).filter((plano) => plano.situacao === "aprovado" && plano.modo === "levar").flatMap((plano) => {
      const paradas = (resumo?.paradas ?? []).filter((parada) => parada.plano_id === plano.id).sort((a, b) => a.ordem - b.ordem).map((parada) => parada.evento_id);
      const dupla = resumo?.duplos.find((item) => item.id === plano.evento_duplo_id);
      const ids = paradas.length ? paradas : dupla ? [dupla.primeiro_evento_id, dupla.segundo_evento_id] : [plano.evento_id];
      const pontos = ids.map((id) => porId.get(id)).filter((ponto): ponto is Coordenada => Boolean(ponto));
      return pontos.length === ids.length ? [{ type: "Feature" as const, properties: { veiculo: plano.veiculo_id }, geometry: { type: "LineString" as const, coordinates: [paraLngLat(base), ...pontos.map(paraLngLat), paraLngLat(base)] } }] : [];
    }) };
    if (!instancia.getSource("rotas-aprovadas")) {
      instancia.addSource("rotas-aprovadas", { type: "geojson", data: geojson });
      instancia.addLayer({ id: "rotas-aprovadas", type: "line", source: "rotas-aprovadas", paint: { "line-color": "#55b69c", "line-width": 4, "line-opacity": 0.75, "line-dasharray": [3, 2] } });
    } else (instancia.getSource("rotas-aprovadas") as import("maplibre-gl").GeoJSONSource).setData(geojson);
  }, [pronto, eventos, resumo, base.lat, base.lng]);

  useEffect(() => {
    const evento = eventos.find((item) => item.id === selecionado);
    const ponto = evento && pontoDoEvento(evento);
    setRota(null);
    if (!ponto || evento?.estimado) return;
    const controller = new AbortController();
    const qs = new URLSearchParams({ origemLat: String(base.lat), origemLng: String(base.lng), destinoLat: String(ponto.lat), destinoLng: String(ponto.lng) });
    void fetch(`/api/mapa/rota?${qs}`, { signal: controller.signal }).then((res) => res.ok ? res.json() : null).then((dado: { geometria?: LineString } | null) => {
      if (!controller.signal.aborted && dado?.geometria?.type === "LineString") setRota(dado.geometria);
    }).catch(() => {});
    return () => controller.abort();
  }, [base.lat, base.lng, eventos, selecionado]);

  useEffect(() => {
    if (!pronto || !mapa.current) return;
    const instancia = mapa.current;
    const geojson: FeatureCollection<LineString> = { type: "FeatureCollection", features: rota ? [{ type: "Feature", properties: {}, geometry: rota }] : [] };
    if (!instancia.getSource("rota-selecionada")) {
      instancia.addSource("rota-selecionada", { type: "geojson", data: geojson });
      instancia.addLayer({ id: "rota-selecionada", type: "line", source: "rota-selecionada", paint: { "line-color": "#e77651", "line-width": 5, "line-opacity": 0.9 } });
    } else (instancia.getSource("rota-selecionada") as import("maplibre-gl").GeoJSONSource).setData(geojson);
  }, [pronto, rota]);

  useEffect(() => {
    if (!recipiente.current || !mapa.current) return;
    const observer = new ResizeObserver(() => mapa.current?.resize());
    observer.observe(recipiente.current);
    return () => observer.disconnect();
  }, [pronto]);

  return <div className="relative h-full w-full">
    <div ref={recipiente} className="h-full w-full" />
    <button type="button" onClick={() => { if (mapa.current && biblioteca.current) enquadrar(mapa.current, biblioteca.current, [base, ...eventosComLocal.map((evento) => pontoDoEvento(evento)!)]); }} className="absolute left-3 top-3 flex items-center gap-1 rounded-lg bg-surface-container px-3 py-2 text-xs shadow-md"><LocateFixed className="h-4 w-4" /> Ver todos</button>
    <div className="pointer-events-none absolute bottom-3 left-3 max-w-[80%] rounded-lg bg-surface-container/95 px-3 py-2 text-xs shadow-md">Conexões esquemáticas · Verde: viagem aprovada · Laranja: rota rodoviária selecionada</div>
    {erro && <div role="alert" className="absolute left-3 top-14 rounded-lg bg-error-container p-2 text-xs text-on-error-container">Não foi possível carregar o mapa agora.</div>}
  </div>;
}

export function MapaTatico({ eventos, base, dia, podePlanejar = false }: { eventos: EventoNoMapa[]; base: Coordenada; dia?: string; podePlanejar?: boolean }) {
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [aba, setAba] = useState<"eventos" | "saidas">("eventos");
  const [locaisSalvos, setLocaisSalvos] = useState<Record<string, Coordenada>>({});
  const [estimados, setEstimados] = useState<Record<string, Coordenada>>({});
  const [buscandoTodos, setBuscandoTodos] = useState(false);
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

  async function preverLocais() {
    setBuscandoTodos(true); setErroPrevia("");
    const cache = new Map<string, Coordenada | null>();
    try {
      for (const evento of eventosVisiveis) {
        if (pontoDoEvento(evento)) continue;
        const busca = [evento.endereco?.split(/\s+-\s+/)[0], evento.cidade ?? evento.bairro].filter(Boolean).join(", ");
        if (busca.length < 3) continue;
        if (!cache.has(busca)) {
          if (cache.size) await new Promise((resolve) => setTimeout(resolve, 1100));
          try {
            const resposta = await fetch(`/api/mapa/buscar?q=${encodeURIComponent(busca)}`);
            const dado = resposta.ok ? await resposta.json() as { locais?: Array<Coordenada & { endereco: string }> } : null;
            const cidade = (evento.cidade ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const candidato = cidade ? dado?.locais?.find((local) => local.endereco.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(cidade)) : null;
            cache.set(busca, candidato ? { lat: candidato.lat, lng: candidato.lng } : null);
          } catch { cache.set(busca, null); }
        }
        const ponto = cache.get(busca);
        if (ponto) setEstimados((atual) => ({ ...atual, [evento.id]: ponto }));
      }
    } finally {
      if (cache.size && [...cache.values()].some((ponto) => !ponto)) setErroPrevia("Alguns endereços não tiveram prévia. Localize-os manualmente na lista.");
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
      setOpcoes([]); setRascunho(null);
      setEstimados((atual) => { const proximo = { ...atual }; delete proximo[eventoSelecionado.id]; return proximo; });
    } catch (erro) { setErroLocal(erro instanceof Error ? erro.message : "Não foi possível salvar o ponto."); }
    finally { setSalvando(false); }
  }

  function selecionarEvento(evento: EventoNoMapa) {
    setSelecionado(evento.id);
    setOpcoes([]); setRascunho(null); setErroLocal("");
    setConsulta([evento.endereco?.split(/\s+-\s+/)[0], evento.cidade ?? evento.bairro].filter(Boolean).join(", "));
  }
  return <div className="flex min-h-0 flex-1 flex-col gap-2">
    <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm"><span>{eventos.length} evento{eventos.length === 1 ? "" : "s"} em {dia ? dia.split("-").reverse().join("/") : "hoje"} · {eventos.length - semLocal} confirmado{eventos.length - semLocal === 1 ? "" : "s"}{totalEstimados > 0 ? ` · ${totalEstimados} prévia${totalEstimados === 1 ? "" : "s"}` : ""}</span>{semLocal > 0 && <span className="flex items-center gap-2 text-amber-500"><AlertCircle className="h-4 w-4" /> {semLocal} sem localização salva <button type="button" disabled={buscandoTodos} onClick={() => void preverLocais()} className="rounded-lg bg-surface-container px-2 py-1 text-xs text-on-surface disabled:opacity-50">{buscandoTodos ? "Localizando…" : "Prévia dos pendentes"}</button></span>}{erroPrevia && <span role="status" className="text-xs text-amber-500">{erroPrevia}</span>}</div>
    <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-3">
      <div className="relative min-h-[240px] min-w-0 overflow-hidden rounded-2xl bg-surface-container lg:col-span-2"><MapaReal eventos={eventosVisiveis} base={base} selecionado={selecionado} aoSelecionar={(id) => { const evento = eventosVisiveis.find((item) => item.id === id); if (evento) selecionarEvento(evento); }} rascunho={rascunho} aoMoverRascunho={setRascunho} resumo={resumo} /></div>
      <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl bg-surface-container-low" aria-label="Painel do mapa">
        <div className="flex shrink-0 border-b border-outline-variant/30 p-2">
          <button type="button" onClick={() => setAba("eventos")} aria-pressed={aba === "eventos"} className={cn("flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm", aba === "eventos" ? "bg-primary-container text-on-primary-container" : "text-on-surface-variant hover:bg-surface-container") }><MapPin className="h-4 w-4" /> Eventos <span className="rounded-full bg-surface-container px-1.5 text-xs">{eventos.length}</span></button>
          {podePlanejar && <button type="button" onClick={() => setAba("saidas")} aria-pressed={aba === "saidas"} className={cn("flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm", aba === "saidas" ? "bg-primary-container text-on-primary-container" : "text-on-surface-variant hover:bg-surface-container") }><Route className="h-4 w-4" /> Planejar saídas</button>}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <ul className={cn("space-y-2 p-3", aba !== "eventos" && "hidden")}>
            {eventos.length === 0 && <li className="rounded-xl bg-surface-container p-4 text-sm text-on-surface-variant">Nenhum evento confirmado neste dia.</li>}
            {eventosVisiveis.map((evento, indice) => <li key={evento.id}><button type="button" onClick={() => selecionarEvento(evento)} aria-pressed={selecionado === evento.id} className={cn("w-full rounded-xl p-3 text-left transition-colors", selecionado === evento.id ? "bg-primary-container text-on-primary-container" : "bg-surface-container-lowest hover:bg-surface-container")}><span className="flex items-center justify-between gap-2"><span className="truncate font-semibold">{indice + 1}. {evento.cliente_nome ?? "sem cliente"}</span><span className="shrink-0 text-xs">{comoHora(evento.horario, evento.horario_texto)}</span></span><span className="mt-1 block truncate text-xs opacity-80">{enderecoDoEvento(evento) || "Sem endereço"}</span><span className="mt-2 flex flex-wrap items-center gap-3 text-xs opacity-80"><span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> Sai {comoHora(evento.horario_saida, null)}</span><span>{(evento.inteiros ?? 0) + Math.ceil((evento.meios ?? 0) / 2)} pessoas</span>{evento.estimado ? <span className="text-amber-500">Prévia aproximada · confirme o ponto</span> : !pontoDoEvento(evento) && <span className="text-amber-500">Localização pendente</span>}</span></button></li>)}
          </ul>
          {aba === "eventos" && eventoSelecionado && podePlanejar && <div className="mx-3 mb-3 rounded-xl bg-surface-container p-3 text-xs"><strong>{eventoSelecionado.estimado ? "Confirmar localização do evento" : pontoDoEvento(eventoSelecionado) ? "Corrigir ponto do evento" : "Localizar evento selecionado"}</strong><p className="mt-1 text-on-surface-variant">Escolha um resultado, ajuste o pino no mapa se necessário e confirme. Você também pode clicar diretamente no mapa.</p><form onSubmit={(ev) => { ev.preventDefault(); void buscarLocal(); }} className="mt-2 flex gap-2"><input aria-label="Buscar endereço do evento" value={consulta} onChange={(ev) => setConsulta(ev.target.value)} className="min-w-0 flex-1 rounded-lg bg-surface-container-lowest px-2 py-2" placeholder="Rua, número, cidade" /><button disabled={buscando} className="rounded-lg bg-primary px-3 py-2 text-on-primary disabled:opacity-50">{buscando ? "Buscando…" : "Buscar"}</button></form>{opcoes.length > 0 && <div className="mt-2 grid gap-1">{opcoes.map((opcao, indice) => <button key={`${opcao.lat}:${opcao.lng}:${indice}`} type="button" onClick={() => { setRascunho({ lat: opcao.lat, lng: opcao.lng }); setOpcoes([]); }} className="rounded-lg bg-surface-container-lowest p-2 text-left hover:bg-primary-container">{opcao.endereco}</button>)}</div>}{rascunho && <button type="button" disabled={salvando} onClick={() => void salvarLocal(rascunho)} className="mt-2 w-full rounded-lg bg-primary px-3 py-2 font-semibold text-on-primary disabled:opacity-50">{salvando ? "Salvando…" : "Confirmar ponto no mapa"}</button>}{erroLocal && <p role="alert" className="mt-2 text-error">{erroLocal}</p>}</div>}
          {podePlanejar && <div className={aba === "saidas" ? "" : "hidden"}><LogisticaPainel diaInicial={dia} compacto aoAtualizarMapa={setResumo} /></div>}
        </div>
      </aside>
    </div>
  </div>;
}
