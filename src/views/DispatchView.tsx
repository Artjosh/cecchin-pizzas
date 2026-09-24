import { eventosDemo, responsaveisDemo } from "../lib/demo-operacao";
import { hojeSaoPaulo } from "../lib/formato";
import { TituloNoHeader } from "@/src/components/layouts/TituloNoHeader";
import {
  AgendaFiltravel,
  type EventoDaAgenda,
  type ResponsavelDisponivel,
} from "../components/AgendaFiltravel";
import { exigirPapel } from "../servidor/auth/guarda";
import { consultar } from "../servidor/supabase";
import { comoLeitura, fonteDeDados } from "../servidor/fonte";


/** Demonstracao interativa usa a mesma agenda; alteracoes ficam no navegador. */
function DespachoDesenhado(){const hoje=hojeSaoPaulo();return <div className="space-y-3"><TituloNoHeader>Agenda e Despacho de Eventos</TituloNoHeader><AgendaFiltravel eventos={eventosDemo(hoje)} hoje={hoje} responsaveis={responsaveisDemo} podeAlocar demo /></div>;}

async function DespachoDoBanco() {
  const sessao = await exigirPapel(["staff"]);
  const hoje = hojeSaoPaulo();

  const [eventosR, responsaveisR] = await Promise.all([
    consultar<EventoDaAgenda[]>(
      "vw_evento?select=id,data_evento,horario,horario_texto,cliente_nome," +
        "cliente_telefone,responsavel_id,responsavel_nome,inteiros,meios," +
        "total_do_evento,situacao,cidade,bairro,endereco,tipo_evento_nome," +
        "modelo_forno_nome,modelo_rodizio_nome,codigo_legado,atencao," +
        "horario_saida" +
        `&data_evento=gte.${hoje}&status=eq.confirmado` +
        "&order=data_evento.asc&limit=60",
      sessao.accessToken,
    ),
    /*
     * Só responsáveis ATIVOS entram na lista de alocação. Os 362 vieram da
     * planilha e boa parte não trabalha mais; oferecer todos transformaria o
     * `select` numa lista impossível de percorrer.
     */
    consultar<ResponsavelDisponivel[]>(
      "responsavel?select=id,nome&ativo=is.true&order=nome.asc&limit=500",
      sessao.accessToken,
    ),
  ]);

  const leitura = comoLeitura<EventoDaAgenda>(eventosR);
  const responsaveis = responsaveisR.dados ?? [];

  return (
    <div className="flex flex-col w-full h-full gap-space-lg">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div className="flex flex-col max-w-xl">
          <TituloNoHeader className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
            Agenda e Despacho de Eventos
          </TituloNoHeader>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {leitura.estado === "ok"
              ? `${leitura.linhas.length} eventos confirmados de hoje em diante.`
              : "Eventos confirmados de hoje em diante."}
          </p>
        </div>
      </div>

      {leitura.estado === "erro" && (
        <p
          role="alert"
          className="font-body-md text-body-md text-primary bg-primary/10 rounded-xl p-space-md"
        >
          Não foi possível ler a agenda: {leitura.motivo}
        </p>
      )}

      {leitura.estado === "vazio" && (
        <p className="font-body-md text-body-md text-on-surface-variant bg-surface-container-low rounded-xl p-space-md">
          Nenhum evento confirmado de hoje em diante.
        </p>
      )}

      {leitura.estado === "ok" && (
        <AgendaFiltravel
          eventos={leitura.linhas}
          hoje={hoje}
          responsaveis={responsaveis}
          podeAlocar
        />
      )}
    </div>
  );
}

export async function DispatchView() {
  return (await fonteDeDados()) === "real" ? (
    <DespachoDoBanco />
  ) : (
    <DespachoDesenhado />
  );
}
