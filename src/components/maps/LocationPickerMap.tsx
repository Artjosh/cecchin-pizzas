"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LocateFixed, Minus, Plus, Search, Timer } from "lucide-react";
import estilos from "./LocationPickerMap.module.css";

import { cn } from "../../lib/utils";
import { QG_CECCHIN } from "../../lib/operacao";
import { aplicarVisualOperacional, deLngLat, ESTILO_MAPA_OPERACIONAL, paraLngLat, type Coordenada } from "./mapa-livre";

interface LocationPickerMapProps {
  onLocationSelect: (location: { address: string; lat: number; lng: number }) => void;
  className?: string;
  address?: string;
  addressAction?: React.ReactNode;
  addressBelow?: React.ReactNode;
  selectedLocation?: Coordenada | null;
  markingMode?: boolean;
  onMarkingModeChange?: (active: boolean) => void;
  controles?: boolean;
  children?: React.ReactNode;
}

interface LocalEncontrado extends Coordenada { endereco: string }
interface RotaEncontrada { duracaoSegundos: number }
type BibliotecaMapa = typeof import("maplibre-gl");
type MapaMapLibre = any;
type Marker = any;
const QG = QG_CECCHIN.coordenada;
const CENTRO_PORTO_ALEGRE: Coordenada = { lat: -30.0346, lng: -51.2177 };

function estimativa(destino: Coordenada) {
  const rad = (grau: number) => (grau * Math.PI) / 180;
  const a = Math.sin(rad(destino.lat - QG.lat) / 2) ** 2 + Math.cos(rad(QG.lat)) * Math.cos(rad(destino.lat)) * Math.sin(rad(destino.lng - QG.lng) / 2) ** 2;
  const km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.28;
  return `~ ${Math.max(5, Math.round(km * 60 / 32))} min`;
}

function criarPino() {
  const elemento = document.createElement("div");
  elemento.className = "cursor-grab text-primary drop-shadow-lg active:cursor-grabbing";
  elemento.setAttribute("aria-label", "Local do evento");
  elemento.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" class="h-9 w-9 fill-current"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z"/></svg>';
  return elemento;
}

async function carregarBibliotecaMapa(): Promise<BibliotecaMapa> {
  if (typeof window === "undefined") throw new Error("Mapa disponível apenas no navegador.");
  const [modulo] = await Promise.all([
    import("maplibre-gl"),
    import("maplibre-gl/dist/maplibre-gl.css"),
  ]);
  modulo.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
  return modulo;
}

function BuscaDeEndereco({ address, addressAction, aoEscolher }: { address?: string; addressAction?: React.ReactNode; aoEscolher: (local: LocalEncontrado) => void }) {
  const [texto, setTexto] = useState("");
  const [locais, setLocais] = useState<LocalEncontrado[]>([]);
  const [estado, setEstado] = useState("");
  const [buscando, setBuscando] = useState(false);
  useEffect(() => { if (address) setTexto(address); }, [address]);
  async function buscar() {
    if (texto.trim().length < 3) { setEstado("Digite ao menos três caracteres."); return; }
    setBuscando(true); setEstado(""); setLocais([]);
    try {
      const resposta = await fetch(`/api/mapa/buscar?q=${encodeURIComponent(texto.trim())}`);
      const dados = await resposta.json() as { locais?: LocalEncontrado[]; mensagem?: string };
      if (!resposta.ok) throw new Error(dados.mensagem);
      setLocais(dados.locais ?? []);
      if (!dados.locais?.length) setEstado("Nenhum endereço encontrado.");
    } catch (erro) { setEstado(erro instanceof Error && erro.message ? erro.message : "Busca indisponível."); }
    finally { setBuscando(false); }
  }
  return <div className="relative z-20">
    <div className="flex items-stretch gap-2">
      <div className="relative min-w-0 flex-1"><Search className="absolute left-3.5 top-3.5 h-5 w-5 text-on-surface-variant" /><input value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void buscar(); }} className="h-12 w-full rounded-xl bg-surface-container-highest pl-11 pr-4 font-body-md text-body-md text-on-surface shadow-md placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Digite endereço, número ou bairro" /></div>
      <button type="button" onClick={() => void buscar()} disabled={buscando} className="h-12 rounded-xl bg-surface px-3 font-label-md text-label-md text-on-surface shadow-md hover:bg-surface-container disabled:opacity-70">{buscando ? "Buscando" : "Buscar"}</button>
      {addressAction}
    </div>
    {(locais.length > 0 || estado) && <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-highest shadow-lg">
      {locais.map((local) => <button key={`${local.lat}-${local.lng}`} type="button" onClick={() => { setTexto(local.endereco); setLocais([]); aoEscolher(local); }} className="block w-full border-b border-outline-variant/10 px-4 py-3 text-left font-body-sm text-on-surface hover:bg-surface-container-high">{local.endereco}</button>)}
      {estado && <p className="px-4 py-3 font-body-sm text-on-surface-variant">{estado}</p>}
    </div>}
  </div>;
}

export function LocationPickerMap({ onLocationSelect, className, address, controles = true, addressAction, addressBelow, selectedLocation, markingMode = false, onMarkingModeChange, children }: LocationPickerMapProps) {
  const recipiente = useRef<HTMLDivElement>(null);
  const biblioteca = useRef<BibliotecaMapa | null>(null);
  const mapa = useRef<MapaMapLibre | null>(null);
  const pino = useRef<Marker | null>(null);
  const gps = useRef<Marker | null>(null);
  const versao = useRef(0);
  const escolherAtual = useRef<(local: Coordenada, endereco?: string) => Promise<void>>(async () => {});
  const marcacaoAtual = useRef(markingMode);
  const [pronto, setPronto] = useState(false);
  const [bibliotecaCarregada, setBibliotecaCarregada] = useState(false);
  const [informacaoRota, setInformacaoRota] = useState<{ duration: string; estimated: boolean } | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const escolher = useCallback(async (local: Coordenada, endereco?: string) => {
    const atual = ++versao.current;
    pino.current?.setLngLat(paraLngLat(local));
    mapa.current?.flyTo({ center: paraLngLat(local), zoom: 16, essential: true });
    onMarkingModeChange?.(false);
    if (!endereco) {
      try { const r = await fetch(`/api/mapa/reverso?lat=${local.lat}&lng=${local.lng}`); endereco = (await r.json() as { endereco?: string }).endereco; } catch { /* Mantém rótulo honesto abaixo. */ }
    }
    if (atual === versao.current) onLocationSelect({ ...local, address: endereco || "Ponto marcado no mapa" });
  }, [onLocationSelect, onMarkingModeChange]);
  useEffect(() => { escolherAtual.current = escolher; }, [escolher]);
  useEffect(() => { marcacaoAtual.current = markingMode; }, [markingMode]);

  useEffect(() => {
    let ativo = true;
    void carregarBibliotecaMapa().then((modulo) => {
      if (!ativo) return;
      biblioteca.current = modulo;
      setBibliotecaCarregada(true);
    }).catch(() => {
      if (ativo) setMensagem("Não foi possível carregar o mapa.");
    });
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    const modulo = biblioteca.current;
    if (!recipiente.current || mapa.current || !modulo) return;
    const instancia = new modulo.Map({ container: recipiente.current, style: ESTILO_MAPA_OPERACIONAL, center: paraLngLat(selectedLocation ?? CENTRO_PORTO_ALEGRE), zoom: 12, attributionControl: false });
    mapa.current = instancia;
    // A base não acompanha o destino: cada local tem seu próprio marcador.
    const marcador = new modulo.Marker({ element: criarPino(), draggable: true, anchor: "bottom" }).setLngLat(paraLngLat(selectedLocation ?? CENTRO_PORTO_ALEGRE));
    pino.current = marcador;
    marcador.on("dragend", () => { void escolherAtual.current(deLngLat(marcador.getLngLat())); });
    instancia.on("load", () => { aplicarVisualOperacional(instancia); setPronto(true); });
    instancia.on("click", (evento) => { if (marcacaoAtual.current) void escolherAtual.current(deLngLat(evento.lngLat)); });
    return () => { marcador.remove(); gps.current?.remove(); instancia.remove(); mapa.current = null; pino.current = null; gps.current = null; };
  }, [bibliotecaCarregada]);

  useEffect(() => {
    if (!mapa.current || !pino.current) return;
    pino.current.setDraggable(!markingMode);
    mapa.current.getCanvas().style.cursor = markingMode ? "crosshair" : "";
  }, [markingMode]);

  useEffect(() => {
    if (!selectedLocation || !mapa.current) return;
    pino.current?.setLngLat(paraLngLat(selectedLocation)).addTo(mapa.current);
    mapa.current.flyTo({ center: paraLngLat(selectedLocation), zoom: 15, essential: true });
  }, [selectedLocation, bibliotecaCarregada]);

  useEffect(() => {
    if (!selectedLocation || !pronto) { setInformacaoRota(null); return; }
    let cancelado = false;
    setInformacaoRota({ duration: estimativa(selectedLocation), estimated: true });
    void (async () => {
      try {
        const qs = new URLSearchParams({ origemLat: String(QG.lat), origemLng: String(QG.lng), destinoLat: String(selectedLocation.lat), destinoLng: String(selectedLocation.lng) });
        const resposta = await fetch(`/api/mapa/rota?${qs}`);
        const rota = await resposta.json() as RotaEncontrada;
        if (!resposta.ok || cancelado) return;
        setInformacaoRota({ duration: `${Math.max(1, Math.round(rota.duracaoSegundos / 60))} min`, estimated: false });
      } catch { /* Mantem a estimativa de tempo. */ }
    })();
    return () => { cancelado = true; };
  }, [pronto, selectedLocation]);

  function centralizar() {
    const modulo = biblioteca.current;
    if (!modulo || !mapa.current) { setMensagem("Carregando mapa…"); return; }
    if (!navigator.geolocation) { setMensagem("Localização do dispositivo indisponível"); return; }
    setMensagem("Buscando sua localização…");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const local = { lat: coords.latitude, lng: coords.longitude };
      if (!gps.current && mapa.current) { const e = document.createElement("div"); e.className = "h-4 w-4 rounded-full border-2 border-surface bg-tertiary shadow-md"; gps.current = new modulo.Marker({ element: e }).setLngLat(paraLngLat(local)).addTo(mapa.current); } else gps.current?.setLngLat(paraLngLat(local));
      mapa.current?.flyTo({ center: paraLngLat(local), zoom: 14, essential: true }); setMensagem("Mapa centralizado na sua localização");
    }, () => setMensagem("Permita a localização para centralizar o mapa"), { enableHighAccuracy: true, maximumAge: 300000, timeout: 8000 });
  }

  return <div className={cn("relative h-full w-full isolate overflow-hidden", estilos.mapa, className)}>
    {/* O CSS do MapLibre define position: relative fora das layers do Tailwind.
        inset-0 sozinho perde a altura; dimensione o recipiente explicitamente. */}
    <div ref={recipiente} className="h-full w-full" />
    {controles && <div className="absolute left-1/2 top-3 z-20 w-[min(92%,38rem)] -translate-x-1/2"><BuscaDeEndereco address={address} addressAction={addressAction} aoEscolher={(local) => void escolher(local, local.endereco)} />{addressBelow && <div className="mt-1.5">{addressBelow}</div>}{informacaoRota && <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-surface/95 px-2.5 py-1.5 shadow-sm backdrop-blur-md"><Timer className="h-4 w-4 shrink-0 text-primary" /><span className="min-w-0 flex-1 truncate font-label-sm text-label-sm text-on-surface">Tempo estimado de deslocamento</span><span className="font-label-sm text-label-sm text-on-surface-variant">{informacaoRota.duration}</span></div>}</div>}
    {controles && <div role="group" aria-label="Controles do mapa" className="absolute bottom-36 right-3 z-20 flex flex-col gap-3 sm:bottom-24">
      <div className="overflow-hidden rounded-2xl bg-surface/95 text-on-surface shadow-lg backdrop-blur-md">
        <button type="button" aria-label="Aproximar mapa" title="Aproximar mapa" disabled={!pronto} onClick={() => mapa.current?.zoomIn()} className="flex h-11 w-11 items-center justify-center hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40"><Plus className="h-5 w-5" /></button>
        <div className="mx-2 border-t border-outline-variant/30" />
        <button type="button" aria-label="Afastar mapa" title="Afastar mapa" disabled={!pronto} onClick={() => mapa.current?.zoomOut()} className="flex h-11 w-11 items-center justify-center hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40"><Minus className="h-5 w-5" /></button>
      </div>
      <button type="button" aria-label="Centralizar na minha localização" title="Centralizar na minha localização" onClick={centralizar} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface/95 text-on-surface shadow-lg backdrop-blur-md hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-primary"><LocateFixed className="h-5 w-5" /></button>
    </div>}
    {mensagem && <div role="status" className="absolute bottom-36 left-3 right-16 z-20 mx-auto w-fit max-w-sm rounded-xl bg-on-surface px-3 py-2 text-center font-label-sm text-label-sm text-surface shadow-md sm:bottom-24">{mensagem}</div>}
    {children}
    {controles && markingMode && <div className="pointer-events-none absolute bottom-28 left-3 right-16 z-20 mx-auto w-fit rounded-full bg-surface/95 px-space-sm py-1 font-label-sm text-label-sm text-on-surface shadow-md backdrop-blur-md sm:bottom-20">Clique no mapa para marcar o ponto</div>}
  </div>;
}
