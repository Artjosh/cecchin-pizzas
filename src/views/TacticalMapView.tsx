import { MapaTatico, type EventoNoMapa } from "../components/mapa/MapaTatico";
import { QG_CECCHIN } from "../lib/operacao";
import { hojeSaoPaulo } from "../lib/formato";
import { exigirPapel } from "../servidor/auth/guarda";
import { consultar } from "../servidor/supabase";
import { fonteDeDados } from "../servidor/fonte";

import { MapaDesenhado } from "./desenho/MapaDesenhado";
import { LogisticaPainel } from "../components/frota/LogisticaPainel";
import Link from "next/link";

/* ===========================================================================
 * O MAPA DE VERDADE
 *
 * Mostra os eventos de hoje onde eles realmente ficam. Não mostra posição de
 * van, porque ela não existe no banco — e prometer posição inexistente é pior
 * do que não ter o mapa.
 * ======================================================================== */

async function MapaDoBanco(data?: string) {
  const sessao = await exigirPapel(["staff"]);
  const hoje = hojeSaoPaulo();
  const dia = data && /^\d{4}-\d{2}-\d{2}$/.test(data) && !Number.isNaN(Date.parse(`${data}T12:00:00Z`)) ? data : hoje;

  const r = await consultar<EventoNoMapa[]>(
    "vw_evento?select=id,cliente_nome,endereco,bairro,cidade,horario," +
      "horario_texto,horario_saida,inteiros,meios,responsavel_nome" +
      `&data_evento=eq.${dia}&status=eq.confirmado&order=horario.asc&limit=30`,
    sessao.accessToken,
  );

  return <div className="flex min-h-0 flex-col gap-3">
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2 text-sm">
      <strong className="mr-auto">Rotas · {dia === hoje ? "Hoje" : dia.split("-").reverse().join("/")}</strong>
      <Link href={`/operacional/mapa?data=${new Date(Date.parse(`${dia}T12:00:00Z`) - 86400000).toISOString().slice(0, 10)}`} className="rounded-lg bg-surface-container px-3 py-1.5">Dia anterior</Link>
      <form className="flex items-center gap-2"><label htmlFor="mapa-dia">Data</label><input id="mapa-dia" type="date" name="data" defaultValue={dia} className="rounded-lg bg-surface-container px-2 py-1.5" /><button className="rounded-lg bg-primary px-3 py-1.5 text-on-primary">Ver</button></form>
      <Link href={`/operacional/mapa?data=${new Date(Date.parse(`${dia}T12:00:00Z`) + 86400000).toISOString().slice(0, 10)}`} className="rounded-lg bg-surface-container px-3 py-1.5">Próximo dia</Link>
    </div>
    {!r.ok && <p role="alert" className="rounded-xl bg-error-container p-3 text-on-error-container">Não foi possível carregar os eventos deste dia.</p>}
    <MapaTatico eventos={r.dados ?? []} base={QG_CECCHIN.coordenada} dia={dia} />
    {(sessao.usuario.papel === "gestao" || sessao.usuario.papel === "admin") && <LogisticaPainel diaInicial={dia} />}
  </div>;
}

export async function TacticalMapView({ data }: { data?: string } = {}) {
  return (await fonteDeDados()) === "real" ? <MapaDoBanco data={data} /> : <MapaDesenhado />;
}
