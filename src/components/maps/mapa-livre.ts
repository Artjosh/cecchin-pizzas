type MapaMapLibre = {
  getStyle: () => { layers?: Array<{ id: string; type?: string }> };
  isStyleLoaded: () => boolean;
  once: (evento: string, ouvinte: () => void) => void;
  setLayoutProperty: (camada: string, propriedade: string, valor: string) => void;
  setPaintProperty: (camada: string, propriedade: string, valor: string | number) => void;
};

export interface Coordenada {
  lat: number;
  lng: number;
}

/**
 * Tiles vetoriais abertos; o visual final é refinado abaixo depois de o estilo
 * carregar. Assim marcadores comerciais, prédios e ruído não voltam por uma
 * configuração do provedor externo.
 */
export const ESTILO_MAPA_OPERACIONAL = "https://tiles.openfreemap.org/styles/dark";

export function paraLngLat(ponto: Coordenada): [number, number] {
  return [ponto.lng, ponto.lat];
}

export function deLngLat(ponto: { lat: number; lng: number }): Coordenada {
  return { lat: ponto.lat, lng: ponto.lng };
}

/** Deixa a base escura com vias claras e só os rótulos necessários. */
export function aplicarVisualOperacional(mapa: MapaMapLibre): void {
  const aplicar = () => {
    for (const camada of mapa.getStyle().layers ?? []) {
      const id = camada.id.toLowerCase();
      try {
        if (/(poi|transit|aeroway|building|housenumber|address|landuse|boundary)/.test(id)) {
          mapa.setLayoutProperty(camada.id, "visibility", "none");
          continue;
        }

        if (camada.type === "line" && /(road|transport|street|motorway|path)/.test(id)) {
          mapa.setPaintProperty(camada.id, "line-color", "#e5e7eb");
        }

        if (camada.type === "symbol" && /(road|transport)/.test(id)) {
          mapa.setPaintProperty(camada.id, "text-color", "#f3f4f6");
          mapa.setPaintProperty(camada.id, "text-halo-color", "#121214");
          mapa.setPaintProperty(camada.id, "text-halo-width", 1);
        }
      } catch {
        // Uma camada pode não aceitar uma propriedade visual. Ela só fica com
        // o estilo-base, sem impedir que o mapa continue utilizável.
      }
    }
  };

  if (mapa.isStyleLoaded()) aplicar();
  else mapa.once("style.load", aplicar);
}
