import { MapaTatico, type EventoNoMapa } from "../components/mapa/MapaTatico";
import { QG_CECCHIN } from "../lib/operacao";
import { exigirPapel } from "../servidor/auth/guarda";
import { consultar } from "../servidor/supabase";
import { fonteDeDados } from "../servidor/fonte";

import { MapaDesenhado } from "./desenho/MapaDesenhado";

/* ===========================================================================
 * O MAPA DE VERDADE
 *
 * Mostra os eventos de hoje onde eles realmente ficam. Não mostra posição de
 * van, porque ela não existe no banco — e prometer posição inexistente é pior
 * do que não ter o mapa.
 * ======================================================================== */

async function MapaDoBanco() {
  const sessao = await exigirPapel(["staff"]);
  const hoje = new Date().toISOString().slice(0, 10);

  const r = await consultar<EventoNoMapa[]>(
    "vw_evento?select=id,cliente_nome,endereco,bairro,cidade,horario," +
      "horario_texto,horario_saida,inteiros,meios,responsavel_nome" +
      `&data_evento=eq.${hoje}&status=eq.confirmado&order=horario.asc&limit=30`,
    sessao.accessToken,
  );

  return (
    <MapaTatico
      eventos={r.dados ?? []}
      base={QG_CECCHIN.coordenada}
    />
  );
}

export async function TacticalMapView() {
  return (await fonteDeDados()) === "real" ? <MapaDoBanco /> : <MapaDesenhado />;
}
