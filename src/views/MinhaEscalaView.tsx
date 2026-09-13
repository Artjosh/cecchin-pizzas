import { CalendarDays, MapPin, Users } from "lucide-react";

import { ResponderEscala } from "../components/ResponderEscala";
import { CabecalhoDoPainel, Etiqueta, SemLinhas } from "../components/painel/Painel";
import { comoData, comoHora } from "../lib/formato";
import { exigirPapel } from "../servidor/auth/guarda";
import { consultar } from "../servidor/supabase";

interface MinhaEscala { id: string; evento_id: string; status: string; funcao: string | null; observacao_gestao: string | null; }
interface Evento { id: string; data_evento: string; horario: string | null; horario_texto: string | null; cliente_nome: string | null; endereco: string | null; cidade: string | null; bairro: string | null; }

export async function MinhaEscalaView() {
  const sessao = await exigirPapel(["staff"]);
  const escalasR = await consultar<MinhaEscala[]>(
    `escala_evento?select=id,evento_id,status,funcao,observacao_gestao&usuario_id=eq.${sessao.usuario.id}` +
    "&status=in.(convidado,aceito)&order=convidado_em.desc&limit=200",
    sessao.accessToken,
  );
  const escalas = escalasR.dados ?? [];
  const ids = escalas.map((e) => e.evento_id);
  const eventosR = ids.length ? await consultar<Evento[]>(
    "vw_evento?select=id,data_evento,horario,horario_texto,cliente_nome,endereco,cidade,bairro" +
    `&id=in.(${ids.join(",")})&order=data_evento.asc`, sessao.accessToken,
  ) : { dados: [] as Evento[] };
  const porId = new Map((eventosR.dados ?? []).map((evento) => [evento.id, evento]));

  return <div className="mx-auto flex max-w-4xl flex-col gap-space-lg">
    <CabecalhoDoPainel titulo="Minha escala" descricao="Convites e eventos que você confirmou." contagem={escalas.length} />
    {!escalas.length ? <SemLinhas titulo="Nenhum convite de escala" detalhe="Quando a gestão escalar você, o convite aparece aqui e pode também chegar por WhatsApp ou e-mail." /> : <ul className="flex flex-col gap-space-md">
      {escalas.map((escala) => {
        const evento = porId.get(escala.evento_id);
        if (!evento) return null;
        return <li key={escala.id} className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-space-sm">
            <div><h2 className="font-headline-sm text-on-surface">{evento.cliente_nome ?? "Evento"}</h2><p className="font-body-sm text-on-surface-variant"><CalendarDays className="mr-1 inline h-4 w-4 text-tertiary" />{comoData(evento.data_evento)} · {comoHora(evento.horario, evento.horario_texto)}</p></div>
            <Etiqueta tom={escala.status === "aceito" ? "bom" : "atencao"}>{escala.status === "aceito" ? "presença confirmada" : "aguardando resposta"}</Etiqueta>
          </div>
          <div className="mt-space-md flex flex-col gap-1 font-body-sm text-on-surface-variant">
            <span><Users className="mr-1 inline h-4 w-4" />{escala.funcao ?? "Equipe de operação"}</span>
            <span><MapPin className="mr-1 inline h-4 w-4" />{evento.endereco ?? ([evento.bairro, evento.cidade].filter(Boolean).join(" · ") || "Endereço será confirmado pela gestão")}</span>
            {escala.observacao_gestao && <span>Orientação: {escala.observacao_gestao}</span>}
          </div>
          {escala.status === "convidado" && <div className="mt-space-md"><ResponderEscala escala={escala.id} /></div>}
        </li>;
      })}
    </ul>}
  </div>;
}
