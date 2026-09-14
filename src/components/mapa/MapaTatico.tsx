"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapaMapLibre, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { AlertCircle, MapPin, Navigation, Truck } from "lucide-react";

import { cn } from "../../lib/utils";
import { comoHora } from "../../lib/formato";
import { aplicarVisualOperacional, ESTILO_MAPA_OPERACIONAL, paraLngLat, type Coordenada } from "../maps/mapa-livre";

export interface EventoNoMapa {
  id: string; cliente_nome: string | null; endereco: string | null; bairro: string | null; cidade: string | null;
  horario: string | null; horario_texto: string | null; horario_saida: string | null; inteiros: number | null; meios: number | null; responsavel_nome: string | null;
}

function enderecoDoEvento(evento: EventoNoMapa) {
  return [evento.endereco, evento.bairro, evento.cidade].filter(Boolean).join(", ");
}

function elementoBase() {
  const el = document.createElement("div");
  el.className = "flex h-8 w-8 items-center justify-center rounded-full bg-inverse-surface text-inverse-on-surface shadow-lg";
  el.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" class="h-4 w-4 fill-current"><path d="m3.5 12 18-9-9 18-2-7-7-2Z"/></svg>';
  return el;
}

function elementoEvento(numero: number, ativo: boolean) {
  const el = document.createElement("button");
  el.type = "button"; el.setAttribute("aria-label", `Evento ${numero}`);
  el.className = `flex h-8 w-8 items-center justify-center rounded-full font-medium text-sm shadow-lg transition-transform ${ativo ? "scale-125 bg-primary text-on-primary" : "bg-surface text-on-surface"}`;
  el.textContent = String(numero);
  return el;
}

function MapaReal({ eventos, base, selecionado, aoSelecionar }: { eventos: EventoNoMapa[]; base: Coordenada; selecionado: string | null; aoSelecionar: (id: string) => void }) {
  const recipiente = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaMapLibre | null>(null);
  const pinos = useRef(new Map<string, Marker>());
  const [pontos, setPontos] = useState(new Map<string, Coordenada>());
  const [buscando, setBuscando] = useState<string | null>(null);

  useEffect(() => {
    if (!recipiente.current || mapa.current) return;
    const instancia = new maplibregl.Map({ container: recipiente.current, style: ESTILO_MAPA_OPERACIONAL, center: paraLngLat(base), zoom: 11, attributionControl: true });
    mapa.current = instancia;
    instancia.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    instancia.on("load", () => aplicarVisualOperacional(instancia));
    new maplibregl.Marker({ element: elementoBase() }).setLngLat(paraLngLat(base)).setPopup(new maplibregl.Popup({ offset: 20 }).setText("Base operacional")).addTo(instancia);
    return () => { pinos.current.forEach((pino) => pino.remove()); instancia.remove(); mapa.current = null; };
  }, [base]);

  useEffect(() => {
    if (!selecionado || pontos.has(selecionado) || buscando || !mapa.current) return;
    const evento = eventos.find((item) => item.id === selecionado);
    const endereco = evento && enderecoDoEvento(evento);
    if (!endereco) return;
    let vivo = true; setBuscando(selecionado);
    void (async () => {
      try {
        const resposta = await fetch(`/api/mapa/buscar?q=${encodeURIComponent(endereco)}`);
        const dado = await resposta.json() as { locais?: Array<Coordenada> };
        const ponto = dado.locais?.[0];
        if (vivo && ponto) setPontos((antes) => new Map(antes).set(selecionado, ponto));
      } finally { if (vivo) setBuscando(null); }
    })();
    return () => { vivo = false; };
  }, [buscando, eventos, pontos, selecionado]);

  useEffect(() => {
    const instancia = mapa.current; if (!instancia) return;
    for (const [id, ponto] of pontos) {
      const evento = eventos.find((item) => item.id === id); const indice = eventos.findIndex((item) => item.id === id);
      if (!evento || indice < 0) continue;
      const anterior = pinos.current.get(id);
      anterior?.remove();
      const marcador = new maplibregl.Marker({ element: elementoEvento(indice + 1, id === selecionado) }).setLngLat(paraLngLat(ponto)).setPopup(new maplibregl.Popup({ offset: 20 }).setText(`${evento.cliente_nome ?? "Evento"} · ${enderecoDoEvento(evento)}`)).addTo(instancia);
      marcador.getElement().addEventListener("click", () => aoSelecionar(id));
      pinos.current.set(id, marcador);
    }
    const selecionadoPonto = selecionado ? pontos.get(selecionado) : null;
    if (selecionadoPonto) instancia.flyTo({ center: paraLngLat(selecionadoPonto), zoom: 15, essential: true });
  }, [aoSelecionar, eventos, pontos, selecionado]);

  return <div ref={recipiente} className="h-full w-full" />;
}

export function MapaTatico({ eventos, base }: { eventos: EventoNoMapa[]; base: Coordenada }) {
  const [selecionado, setSelecionado] = useState<string | null>(eventos[0]?.id ?? null);
  return <div className="flex h-full flex-col gap-space-md">
    <header><h1 className="font-headline-md text-headline-md tracking-tight text-on-surface">Mapa tático</h1><p className="mt-1 font-body-md text-body-md text-on-surface-variant">{eventos.length === 0 ? "Nenhum evento hoje." : `${eventos.length} evento${eventos.length > 1 ? "s" : ""} hoje, do mais cedo ao mais tarde.`}</p></header>
    <div className="flex items-start gap-space-sm rounded-xl bg-surface-container-low p-space-md"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><p className="font-body-sm text-body-sm text-on-surface-variant"><strong className="text-on-surface">Não há rastreamento de van.</strong> Selecione um evento para posicioná-lo no mapa; o endereço é pesquisado sob demanda, sem varrer a agenda inteira.</p></div>
    <div className="grid min-h-[26rem] flex-1 grid-cols-1 gap-space-md lg:grid-cols-3">
      <div className="relative min-h-[20rem] overflow-hidden rounded-xl bg-surface-container lg:col-span-2"><MapaReal eventos={eventos} base={base} selecionado={selecionado} aoSelecionar={setSelecionado} /></div>
      <ul className="flex max-h-[34rem] flex-col gap-space-sm overflow-y-auto">
        {eventos.length === 0 && <li className="rounded-xl bg-surface-container-low p-space-md font-body-md text-body-md text-on-surface-variant">A agenda de hoje está vazia.</li>}
        {eventos.map((evento, indice) => <li key={evento.id}><button type="button" onClick={() => setSelecionado(evento.id)} aria-pressed={selecionado === evento.id} className={cn("w-full rounded-xl p-space-md text-left transition-colors", selecionado === evento.id ? "bg-primary-container text-on-primary-container" : "bg-surface-container-lowest hover:bg-surface-container")}><span className="flex items-center justify-between gap-space-sm"><span className="truncate font-label-md text-label-md">{indice + 1}. {evento.cliente_nome ?? "sem cliente"}</span><span className="shrink-0 font-label-md text-label-md">{comoHora(evento.horario, evento.horario_texto)}</span></span><span className="block truncate font-body-sm text-body-sm opacity-80">{enderecoDoEvento(evento) || "sem endereço"}</span><span className="mt-1 flex flex-wrap gap-space-sm font-body-sm text-body-sm opacity-70"><span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" />sai {comoHora(evento.horario_saida, null)}</span><span>{(evento.inteiros ?? 0) + Math.ceil((evento.meios ?? 0) / 2)}p</span>{evento.responsavel_nome && <span>{evento.responsavel_nome}</span>}</span></button></li>)}
      </ul>
    </div>
  </div>;
}
