"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { Search, MapPin } from "lucide-react";
import { cn } from "../../lib/utils";

interface LocationPickerMapProps {
  initialAddress?: string;
  onLocationSelect: (location: {
    address: string;
    lat: number;
    lng: number;
  }) => void;
  className?: string;
  /**
   * Mostra a busca de endereço e a dica de arraste sobre o mapa. A tela de
   * contratação desliga os dois enquanto o painel de passos está aberto: eles
   * ficariam atrás dele, capturando clique que o usuário não vê.
   */
  controles?: boolean;
  children?: React.ReactNode;
}

// POA coordinate roughly
const DEFAULT_CENTER = { lat: -30.0346, lng: -51.2177 };

const AutocompleteInput = ({
  onPlaceSelect,
}: {
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
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
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 text-on-surface-variant w-5 h-5" />
        <input
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          className="w-full h-12 bg-surface-container-highest shadow-md pl-11 pr-4 rounded-xl font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-on-surface-variant"
          placeholder="Digite o endereço para buscar"
        />
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
  children,
}: {
  onLocationSelect: (location: {
    address: string;
    lat: number;
    lng: number;
  }) => void;
  controles?: boolean;
  children?: React.ReactNode;
}) => {
  const map = useMap();
  const [markerPosition, setMarkerPosition] =
    useState<google.maps.LatLngLiteral>(DEFAULT_CENTER);
  const geocoding = useMapsLibrary("geocoding");

  const handlePlaceSelect = (place: google.maps.places.PlaceResult) => {
    if (place.geometry?.location) {
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
    if (e.latLng && geocoding) {
      const location = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setMarkerPosition(location);

      const geocoder = new geocoding.Geocoder();
      try {
        const response = await geocoder.geocode({ location });
        if (response.results[0]) {
          onLocationSelect({
            address: response.results[0].formatted_address,
            ...location,
          });
        }
      } catch (err) {
        console.error("Geocoding failed:", err);
      }
    }
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
        internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
      >
        <AdvancedMarker
          position={markerPosition}
          draggable={true}
          onDragEnd={handleMarkerDragEnd}
        >
          <div className="w-10 h-10 -mt-10 flex items-center justify-center filter drop-shadow-md cursor-grab active:cursor-grabbing hover:scale-110 transition-transform">
            <MapPin
              className="text-primary w-10 h-10 fill-surface"
              strokeWidth={1.5}
            />
          </div>
        </AdvancedMarker>
      </Map>

      {controles && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[min(92%,34rem)] z-20">
          <AutocompleteInput onPlaceSelect={handlePlaceSelect} />
        </div>
      )}

      {children}

      {controles && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-surface/95 backdrop-blur-md px-space-sm py-1 rounded-full font-label-sm text-label-sm text-on-surface shadow-md pointer-events-none">
          Arraste o pino para ajustar
        </div>
      )}
    </div>
  );
};

export function LocationPickerMap({
  onLocationSelect,
  className,
  controles = true,
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
        <MapInner onLocationSelect={onLocationSelect} controles={controles}>
          {children}
        </MapInner>
      </APIProvider>
    </div>
  );
}
