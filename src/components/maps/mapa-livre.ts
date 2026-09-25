import type { Map as MapaMapLibre } from "maplibre-gl";

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

/** Paletas inspiradas nas refer?ncias: ruas brancas no claro e carv?o no grafite. */
export function aplicarVisualOperacional(mapa: MapaMapLibre): void {
  const aplicar = () => {
    const escuro = document.documentElement.dataset.tema === "escuro";
    const cores = escuro
      ? { fundo: "#3d424b", agua: "#303641", terreno: "#393f48", rua: "#252b33", texto: "#e0e2e5", halo: "#292e36" }
      : { fundo: "#dfe3e5", agua: "#b9cbd3", terreno: "#d9dfe0", rua: "#ffffff", texto: "#46616a", halo: "#f5f6f6" };
    for (const camada of mapa.getStyle().layers ?? []) {
      const id = camada.id.toLowerCase();
      if (id === "rotas-possiveis" || id === "rotas-aprovadas" || id === "rota-selecionada") continue;
      try {
        if (/(poi|transit|aeroway|building|housenumber|address|landuse|boundary|railway|oneway)/.test(id)) {
          mapa.setLayoutProperty(camada.id, "visibility", "none");
          continue;
        }

        if (camada.type === "background") {
          mapa.setPaintProperty(camada.id, "background-color", cores.fundo);
        }

        if (camada.type === "fill") {
          mapa.setPaintProperty(camada.id, "fill-color", id === "water" ? cores.agua : cores.terreno);
        }

        if (camada.type === "line") {
          const via = /(road|highway|street|motorway|path|railway)/.test(id);
          mapa.setPaintProperty(camada.id, "line-color", via ? cores.rua : cores.agua);
        }

        if (camada.type === "symbol") {
          mapa.setPaintProperty(camada.id, "text-color", cores.texto);
          mapa.setPaintProperty(camada.id, "text-halo-color", cores.halo);
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
  const observador = new MutationObserver(aplicar);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] });
  mapa.once("remove", () => observador.disconnect());
}
