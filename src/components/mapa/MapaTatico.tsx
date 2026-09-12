"use client";

import { useEffect, useMemo, useState } from "react";
import {
  APIProvider,
  AdvancedMarker,
  Map as MapaGoogle,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { AlertCircle, MapPin, Navigation, Truck } from "lucide-react";

import { cn } from "../../lib/utils";
import { comoHora } from "../../lib/formato";

/**
 * O mapa do dia, com os eventos onde eles realmente ficam.
 *
 * **O que este mapa NÃO mostra: posição de van.** Não existe rastreamento —
 * nenhuma tabela guarda coordenada de veículo, e o desenho anterior prometia
 * "visão em tempo real das equipes" sobre um fundo pontilhado. Prometer
 * posição que não existe é pior do que não ter o mapa.
 *
 * O que ele mostra é verdadeiro: onde é cada evento de hoje, a que horas a
 * equipe sai da base e a que horas o serviço começa.
 *
 * **Por que a geocodificação acontece aqui, no cliente.** Nem `evento` nem
 * `localidade` guardam latitude e longitude — só texto de endereço. Converter
 * no servidor a cada render gastaria cota do Google em toda navegação; aqui
 * acontece uma vez por carga, e só para os eventos do dia, que são poucos.
 *
 * O dia em que `evento` ganhar coordenada, isto vira leitura direta e a
 * geocodificação sai.
 */

export interface EventoNoMapa {
  id: string;
  cliente_nome: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  horario: string | null;
  horario_texto: string | null;
  horario_saida: string | null;
  inteiros: number | null;
  meios: number | null;
  responsavel_nome: string | null;
}

interface Coordenada {
  lat: number;
  lng: number;
}

export function MapaTatico({
  eventos,
  base,
  chaveAusente,
}: {
  eventos: EventoNoMapa[];
  base: Coordenada;
  chaveAusente: boolean;
}) {
  const [selecionado, setSelecionado] = useState<string | null>(
    eventos[0]?.id ?? null,
  );

  return (
    <div className="h-full flex flex-col gap-space-md">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight">
            Mapa tático
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            {eventos.length === 0
              ? "Nenhum evento hoje."
              : `${eventos.length} evento${eventos.length > 1 ? "s" : ""} hoje, do mais cedo ao mais tarde.`}
          </p>
        </div>
      </header>

      <div className="flex items-start gap-space-sm bg-surface-container-low rounded-xl p-space-md">
        <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          <strong className="text-on-surface">Não há rastreamento de van.</strong>{" "}
          Nenhuma tabela guarda posição de veículo, então o mapa mostra onde é
          cada evento — não onde a equipe está agora. Ver{" "}
          <code className="font-mono">AGENTES.md</code>, lacunas de modelagem.
        </p>
      </div>

      <div className="flex-1 min-h-[26rem] grid grid-cols-1 lg:grid-cols-3 gap-space-md">
        <div className="lg:col-span-2 rounded-xl overflow-hidden bg-surface-container relative min-h-[20rem]">
          {chaveAusente ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-space-sm p-space-lg">
              <MapPin className="w-10 h-10 text-on-surface-variant" />
              <span className="font-label-lg text-label-lg text-on-surface">
                Mapa indisponível
              </span>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
                Falta <code className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>.
                A lista ao lado continua funcionando.
              </p>
            </div>
          ) : (
            <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}>
              <MapaComPinos
                eventos={eventos}
                base={base}
                selecionado={selecionado}
                aoSelecionar={setSelecionado}
              />
            </APIProvider>
          )}
        </div>

        <ul className="flex flex-col gap-space-sm overflow-y-auto max-h-[34rem]">
          {eventos.length === 0 && (
            <li className="bg-surface-container-low rounded-xl p-space-md font-body-md text-body-md text-on-surface-variant">
              A agenda de hoje está vazia.
            </li>
          )}
          {eventos.map((e, i) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => setSelecionado(e.id)}
                aria-pressed={selecionado === e.id}
                className={cn(
                  "w-full text-left rounded-xl p-space-md flex flex-col gap-1 transition-colors",
                  selecionado === e.id
                    ? "bg-primary-container text-on-primary-container"
                    : "bg-surface-container-lowest hover:bg-surface-container",
                )}
              >
                <span className="flex items-center justify-between gap-space-sm">
                  <span className="font-label-md text-label-md truncate">
                    {i + 1}. {e.cliente_nome ?? "sem cliente"}
                  </span>
                  <span className="font-label-md text-label-md shrink-0">
                    {comoHora(e.horario, e.horario_texto)}
                  </span>
                </span>
                <span className="font-body-sm text-body-sm opacity-80 truncate">
                  {e.endereco ??
                    [e.bairro, e.cidade].filter(Boolean).join(" · ") ??
                    "sem endereço"}
                </span>
                <span className="font-body-sm text-body-sm opacity-70 flex items-center gap-space-sm flex-wrap">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" />
                    sai {comoHora(e.horario_saida, null)}
                  </span>
                  <span>{(e.inteiros ?? 0) + Math.ceil((e.meios ?? 0) / 2)}p</span>
                  {e.responsavel_nome && <span>{e.responsavel_nome}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MapaComPinos({
  eventos,
  base,
  selecionado,
  aoSelecionar,
}: {
  eventos: EventoNoMapa[];
  base: Coordenada;
  selecionado: string | null;
  aoSelecionar: (id: string) => void;
}) {
  const pontos = useGeocodificacao(eventos);
  const mapa = useMap();

  // Centraliza no evento escolhido, quando já houver coordenada para ele.
  useEffect(() => {
    if (!mapa || !selecionado) return;
    const p = pontos.get(selecionado);
    if (p) mapa.panTo(p);
  }, [mapa, selecionado, pontos]);

  return (
    <MapaGoogle
      style={{ width: "100%", height: "100%" }}
      defaultZoom={11}
      defaultCenter={base}
      mapId="DEMO_MAP_ID"
      disableDefaultUI
      gestureHandling="greedy"
    >
      <AdvancedMarker position={base} title="Base operacional">
        <span className="w-8 h-8 -mt-4 rounded-full bg-inverse-surface text-inverse-on-surface flex items-center justify-center shadow-lg">
          <Navigation className="w-4 h-4" />
        </span>
      </AdvancedMarker>

      {eventos.map((e, i) => {
        const p = pontos.get(e.id);
        if (!p) return null;

        return (
          <AdvancedMarker
            key={e.id}
            position={p}
            onClick={() => aoSelecionar(e.id)}
            title={e.cliente_nome ?? undefined}
          >
            <span
              className={cn(
                "w-8 h-8 -mt-4 rounded-full flex items-center justify-center font-label-md text-label-md shadow-lg transition-transform",
                selecionado === e.id
                  ? "bg-primary text-on-primary scale-125"
                  : "bg-surface text-on-surface",
              )}
            >
              {i + 1}
            </span>
          </AdvancedMarker>
        );
      })}
    </MapaGoogle>
  );
}

/**
 * Converte endereço em coordenada, uma vez por evento.
 *
 * Serializado de propósito: o geocoder do Google responde `OVER_QUERY_LIMIT` a
 * rajadas, e um dia com muitos eventos dispararia todos de uma vez. Um por vez
 * é lento e chega inteiro — e são poucos, porque é só o dia de hoje.
 */
function useGeocodificacao(eventos: EventoNoMapa[]): Map<string, Coordenada> {
  const biblioteca = useMapsLibrary("geocoding");
  const [pontos, setPontos] = useState<Map<string, Coordenada>>(new Map());

  const enderecos = useMemo(
    () =>
      eventos
        .map((e) => ({
          id: e.id,
          texto: [e.endereco, e.bairro, e.cidade, "RS, Brasil"]
            .filter(Boolean)
            .join(", "),
        }))
        .filter((e) => e.texto.length > 14),
    [eventos],
  );

  useEffect(() => {
    if (!biblioteca || enderecos.length === 0) return;

    let vivo = true;
    const geocoder = new biblioteca.Geocoder();

    void (async () => {
      for (const { id, texto } of enderecos) {
        if (!vivo) return;
        try {
          const r = await geocoder.geocode({ address: texto });
          const local = r.results[0]?.geometry.location;
          if (local && vivo) {
            setPontos((antes) =>
              new Map(antes).set(id, { lat: local.lat(), lng: local.lng() }),
            );
          }
        } catch {
          // Endereço que o Google não reconhece simplesmente não ganha pino.
          // A linha continua na lista ao lado, que é o que a operação usa.
        }
      }
    })();

    return () => {
      vivo = false;
    };
  }, [biblioteca, enderecos]);

  return pontos;
}
