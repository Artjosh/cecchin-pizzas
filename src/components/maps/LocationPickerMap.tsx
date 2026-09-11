"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Polyline,
  useMap,
  useMapsLibrary,
  type MapMouseEvent,
} from "@vis.gl/react-google-maps";
import { LocateFixed, MapPin, Minus, Plus, Route, Search, Timer } from "lucide-react";
import { cn } from "../../lib/utils";
import { QG_CECCHIN } from "../../lib/operacao";

interface LocationPickerMapProps {
  initialAddress?: string;
  onLocationSelect: (location: {
    address: string;
    lat: number;
    lng: number;
  }) => void;
  className?: string;
  address?: string;
  /** Ação exibida ao lado da única busca de endereço desta tela. */
  addressAction?: React.ReactNode;
  /** Conteúdo compacto exibido logo abaixo da busca de endereço. */
  addressBelow?: React.ReactNode;
  /** Ponto escolhido fora do mapa (busca ou sugestão rápida). */
  selectedLocation?: google.maps.LatLngLiteral | null;
  /** Enquanto ativo, o próximo clique simples no mapa define o local. */
  markingMode?: boolean;
  onMarkingModeChange?: (active: boolean) => void;
  /** Mostra a busca de endereço e a dica de arraste sobre o mapa. */
  controles?: boolean;
  children?: React.ReactNode;
}

const DEFAULT_CENTER = QG_CECCHIN.coordenada;

function estimarTrajeto(destination: google.maps.LatLngLiteral) {
  const rad = (grau: number) => (grau * Math.PI) / 180;
  const dLat = rad(destination.lat - DEFAULT_CENTER.lat);
  const dLng = rad(destination.lng - DEFAULT_CENTER.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(DEFAULT_CENTER.lat)) *
      Math.cos(rad(destination.lat)) *
      Math.sin(dLng / 2) ** 2;
  const km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return {
    distance: `${Math.max(1, Math.round(km * 1.28))} km`,
    duration: `~ ${Math.max(5, Math.round((km * 1.28 * 60) / 32))} min`,
  };
}

const AutocompleteInput = ({
  onPlaceSelect,
  address,
  addressAction,
}: {
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
  address?: string;
  addressAction?: React.ReactNode;
}) => {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [sessionToken, setSessionToken] = useState<any>(null);

  const places = useMapsLibrary("places");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (places && !sessionToken) {
      const placesAPI = places as any;
      if (placesAPI.AutocompleteSessionToken) {
        setSessionToken(new placesAPI.AutocompleteSessionToken());
      }
    }
  }, [places, sessionToken]);

  useEffect(() => {
    if (address) setInputValue(address);
  }, [address]);

  useEffect(() => {
    // Handle click outside to close dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (!val.trim() || !places || !sessionToken) {
      setSuggestions([]);
      return;
    }

    const placesAPI = places as any;
    try {
      const request = { input: val, sessionToken };
      const response =
        await placesAPI.AutocompleteSuggestion.fetchAutocompleteSuggestions(
          request,
        );
      setSuggestions(response.suggestions || []);
    } catch (err) {
      console.error("Erro ao buscar sugestões:", err);
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = async (suggestion: any) => {
    setIsFocused(false);
    try {
      // The prediction has a toPlace() method to get the Place object
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ["displayName", "formattedAddress", "location"],
      });

      setInputValue(place.formattedAddress || place.displayName || "");

      onPlaceSelect({
        geometry: {
          location: {
            lat: () => place.location.lat(),
            lng: () => place.location.lng(),
          },
        } as any,
        formatted_address: place.formattedAddress,
        name: place.displayName,
      });

      // Refresh session token after a selection
      const placesAPI = places as any;
      setSessionToken(new placesAPI.AutocompleteSessionToken());
    } catch (err) {
      console.error("Erro ao selecionar local:", err);
    }
  };

  return (
    <div className="relative z-20" ref={wrapperRef}>
      <div className="flex items-stretch gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3.5 top-3.5 text-on-surface-variant w-5 h-5" />
          <input
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            className="w-full h-12 bg-surface-container-highest shadow-md pl-11 pr-4 rounded-xl font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-on-surface-variant"
            placeholder="Digite o endereço para buscar"
          />
        </div>
        {addressAction}
      </div>

      {isFocused && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-highest rounded-xl shadow-lg overflow-hidden border border-outline-variant/30 flex flex-col max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              className="w-full text-left px-4 py-3 hover:bg-surface-container-high focus:bg-surface-container-high transition-colors border-b border-outline-variant/10 last:border-b-0"
              onClick={() => handleSelectSuggestion(suggestion)}
            >
              <div className="font-body-md text-on-surface font-medium truncate">
                {suggestion.placePrediction?.text?.text ||
                  suggestion.placePrediction?.mainText?.text ||
                  ""}
              </div>
              {suggestion.placePrediction?.secondaryText?.text && (
                <div className="font-body-sm text-on-surface-variant truncate">
                  {suggestion.placePrediction.secondaryText.text}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const MapInner = ({
  onLocationSelect,
  controles = true,
  address,
  addressAction,
  addressBelow,
  selectedLocation,
  markingMode = false,
  onMarkingModeChange,
  children,
}: {
  onLocationSelect: (location: {
    address: string;
    lat: number;
    lng: number;
  }) => void;
  controles?: boolean;
  address?: string;
  addressAction?: React.ReactNode;
  addressBelow?: React.ReactNode;
  selectedLocation?: google.maps.LatLngLiteral | null;
  markingMode?: boolean;
  onMarkingModeChange?: (active: boolean) => void;
  children?: React.ReactNode;
}) => {
  const map = useMap();
  const [markerPosition, setMarkerPosition] =
    useState<google.maps.LatLngLiteral>(DEFAULT_CENTER);
  const [gpsPosition, setGpsPosition] =
    useState<google.maps.LatLngLiteral | null>(null);
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
    estimated: boolean;
  } | null>(null);
  const [fallbackRoute, setFallbackRoute] = useState<
    google.maps.LatLngLiteral[] | null
  >(null);
  const [mapMessage, setMapMessage] = useState<string | null>(null);
  const places = useMapsLibrary("places");
  const routes = useMapsLibrary("routes");
  const selectionVersion = useRef(0);

  /**
   * Geocoding devolve rua e número. Se ele estiver indisponível na chave,
   * tentamos a Places já carregada pelo campo de busca; nunca gravamos a
   * coordenada crua como se fosse endereço.
   */
  const buscarEnderecoDoPonto = async (
    location: google.maps.LatLngLiteral,
  ): Promise<string | null> => {
    try {
      const response = await new google.maps.Geocoder().geocode({ location });
      const address = response.results[0]?.formatted_address;
      if (address) return address;
    } catch {
      // A Geocoding API pode não estar habilitada para esta chave.
    }

    if (!places) return null;
    try {
      const placesApi = places as typeof google.maps.places;
      const response = await placesApi.Place.searchNearby({
        fields: ["formattedAddress", "location"],
        locationRestriction: { center: location, radius: 80 },
        rankPreference: placesApi.SearchNearbyRankPreference.DISTANCE,
        maxResultCount: 1,
      });
      return response.places?.[0]?.formattedAddress ?? null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!selectedLocation || !map) return;
    selectionVersion.current += 1;
    setMarkerPosition(selectedLocation);
    map.panTo(selectedLocation);
    map.setZoom(15);
  }, [map, selectedLocation]);

  useEffect(() => {
    if (!selectedLocation || !map) return;
    let cancelled = false;
    setFallbackRoute([DEFAULT_CENTER, selectedLocation]);
    setRouteInfo({ ...estimarTrajeto(selectedLocation), estimated: true });
    if (!routes) return;
    routes.Route.computeRoutes({
        origin: DEFAULT_CENTER,
        destination: selectedLocation,
        travelMode: google.maps.TravelMode.DRIVING,
        fields: ["path", "distanceMeters", "durationMillis", "viewport"],
      })
      .then((result) => {
        if (cancelled) return;
        const route = result.routes?.[0];
        const path = route?.path?.map((point) => ({
          lat: point.lat,
          lng: point.lng,
        }));
        if (
          !route ||
          !path?.length ||
          route.distanceMeters === undefined ||
          route.durationMillis === undefined ||
          route.durationMillis === null
        ) {
          return;
        }
        setFallbackRoute(path);
        setRouteInfo({
          distance: `${(route.distanceMeters / 1000).toLocaleString("pt-BR", {
            maximumFractionDigits: 1,
          })} km`,
          duration: `${Math.max(1, Math.round(route.durationMillis / 60000))} min`,
          estimated: false,
        });
        if (route.viewport) map.fitBounds(route.viewport, 76);
      })
      .catch(() => {
        // Mantém a linha e a estimativa local quando Directions não estiver habilitado.
      });
    return () => {
      cancelled = true;
    };
  }, [map, routes, selectedLocation]);

  const handlePlaceSelect = (place: google.maps.places.PlaceResult) => {
    if (place.geometry?.location) {
      selectionVersion.current += 1;
      const location = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      };
      setMarkerPosition(location);
      map?.panTo(location);
      map?.setZoom(17);

      if (place.formatted_address) {
        onLocationSelect({
          address: place.formatted_address,
          ...location,
        });
      }
    }
  };

  const handleMarkerDragEnd = async (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const location = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      const version = ++selectionVersion.current;
      setMarkerPosition(location);
      const address = await buscarEnderecoDoPonto(location);
      if (version !== selectionVersion.current) return;
      onLocationSelect({
        address: address ?? "Ponto marcado no mapa",
        ...location,
      });
    }
  };

  const handleMapClick = async (e: MapMouseEvent) => {
    if (!markingMode || !e.detail.latLng) return;
    const location = e.detail.latLng;
    const version = ++selectionVersion.current;
    setMarkerPosition(location);
    onMarkingModeChange?.(false);
    map?.panTo(location);
    map?.setZoom(16);

    const address = await buscarEnderecoDoPonto(location);
    if (version !== selectionVersion.current) return;
    onLocationSelect({
      address: address ?? "Ponto marcado no mapa",
      ...location,
    });
  };

  const centralizarNoUsuario = () => {
    if (!navigator.geolocation) {
      setMapMessage("Localização do dispositivo indisponível");
      return;
    }
    setMapMessage("Buscando sua localização…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location = { lat: coords.latitude, lng: coords.longitude };
        setGpsPosition(location);
        map?.panTo(location);
        map?.setZoom(14);
        setMapMessage("Mapa centralizado na sua localização");
      },
      () => setMapMessage("Permita a localização para centralizar o mapa"),
      { enableHighAccuracy: true, maximumAge: 300000, timeout: 8000 },
    );
  };

  return (
    <div className="h-full w-full relative isolate overflow-hidden">
      <Map
        style={{ width: "100%", height: "100%" }}
        defaultZoom={12}
        defaultCenter={DEFAULT_CENTER}
        mapId="DEMO_MAP_ID"
        disableDefaultUI={true}
        gestureHandling="greedy"
        draggableCursor={markingMode ? "crosshair" : undefined}
        onClick={handleMapClick}
        internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
      >
        <AdvancedMarker
          position={markerPosition}
          draggable={!markingMode}
          onDragEnd={handleMarkerDragEnd}
        >
          <div className="w-10 h-10 -mt-10 flex items-center justify-center filter drop-shadow-md cursor-grab active:cursor-grabbing hover:scale-110 transition-transform">
            <MapPin
              className="text-primary w-10 h-10 fill-surface"
              strokeWidth={1.5}
            />
          </div>
        </AdvancedMarker>
        {fallbackRoute && (
          <Polyline
            path={fallbackRoute}
            strokeColor="#A51E06"
            strokeOpacity={0.7}
            strokeWeight={4}
          />
        )}
        {gpsPosition && (
          <AdvancedMarker position={gpsPosition}>
            <div
              aria-label="Sua localização"
              className="h-4 w-4 rounded-full border-2 border-surface bg-tertiary shadow-md"
            />
          </AdvancedMarker>
        )}
      </Map>

      {controles && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[min(92%,34rem)] z-20">
          <AutocompleteInput
            onPlaceSelect={handlePlaceSelect}
            address={address}
            addressAction={addressAction}
          />
          {addressBelow && <div className="mt-1.5">{addressBelow}</div>}
          {routeInfo && (
            <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-surface/95 px-2.5 py-1.5 shadow-sm backdrop-blur-md">
              <Route className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate font-label-sm text-label-sm text-on-surface">
                {routeInfo.estimated ? "Trajeto estimado" : "Rota do QG"} · {routeInfo.distance}
              </span>
              <span className="flex shrink-0 items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
                <Timer className="h-3.5 w-3.5" /> {routeInfo.duration}
              </span>
            </div>
          )}
        </div>
      )}

      {controles && (
        <div className="absolute bottom-16 right-3 z-20 flex flex-col overflow-hidden rounded-xl bg-surface/95 shadow-md backdrop-blur-md">
          <button
            type="button"
            aria-label="Aumentar zoom"
            title="Aumentar zoom"
            onClick={() => map?.setZoom(Math.min((map.getZoom() ?? 12) + 1, 20))}
            className="flex h-10 w-10 items-center justify-center text-on-surface transition-colors hover:bg-surface-container"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Diminuir zoom"
            title="Diminuir zoom"
            onClick={() => map?.setZoom(Math.max((map.getZoom() ?? 12) - 1, 3))}
            className="flex h-10 w-10 items-center justify-center border-t border-outline-variant/30 text-on-surface transition-colors hover:bg-surface-container"
          >
            <Minus className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Centralizar na minha localização"
            title="Centralizar na minha localização"
            onClick={centralizarNoUsuario}
            className="flex h-10 w-10 items-center justify-center border-t border-outline-variant/30 text-primary transition-colors hover:bg-surface-container"
          >
            <LocateFixed className="h-5 w-5" />
          </button>
        </div>
      )}

      {mapMessage && (
        <div className="absolute bottom-16 left-1/2 z-20 -translate-x-1/2 rounded-full bg-on-surface px-3 py-1.5 font-label-sm text-label-sm text-surface shadow-md">
          {mapMessage}
        </div>
      )}

      {children}

      {controles && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-surface/95 backdrop-blur-md px-space-sm py-1 rounded-full font-label-sm text-label-sm text-on-surface shadow-md pointer-events-none">
          {markingMode ? "Clique no mapa para marcar o ponto" : "Arraste o pino para ajustar"}
        </div>
      )}
    </div>
  );
};

export function LocationPickerMap({
  onLocationSelect,
  className,
  address,
  controles = true,
  addressAction,
  addressBelow,
  selectedLocation,
  markingMode,
  onMarkingModeChange,
  children,
}: LocationPickerMapProps) {
  /*
   * `import.meta.env.VITE_*` é convenção do Vite puro. No vinext, que
   * reimplementa a API do Next, a variável exposta ao browser precisa do
   * prefixo NEXT_PUBLIC_ e chega por `process.env`.
   *
   * Sem o prefixo, o valor não é embutido no bundle do cliente e o mapa
   * renderiza o aviso abaixo mesmo com a chave configurada.
   */
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  if (!apiKey) {
    return (
      <div
        className={cn(
          "bg-surface-container-high rounded-xl p-6 flex flex-col items-center justify-center text-center",
          className,
        )}
      >
        <MapPin className="w-8 h-8 text-on-surface-variant mb-2" />
        <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
          Mapa Indisponível
        </h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm mt-1">
          A chave da API do Google Maps não está configurada. Adicione{" "}
          <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> para habilitar o mapa
          reativo.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("w-full h-full", className)}>
      <APIProvider apiKey={apiKey}>
        <MapInner
          onLocationSelect={onLocationSelect}
          controles={controles}
          address={address}
          addressAction={addressAction}
          addressBelow={addressBelow}
          selectedLocation={selectedLocation}
          markingMode={markingMode}
          onMarkingModeChange={onMarkingModeChange}
        >
          {children}
        </MapInner>
      </APIProvider>
    </div>
  );
}
