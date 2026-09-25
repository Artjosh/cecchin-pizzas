import { TituloNoHeader } from "@/src/components/layouts/TituloNoHeader";
import Link from "next/link";
import { RotaComChecklist } from "../components/embarque/RotaComChecklist";
import {
  CabecalhoDoPainel,
  Celula,
  FalhaDeLeitura,
  LacunaDeDados,
  Linha,
  SemLinhas,
  Tabela,
} from "../components/painel/Painel";
import { comoData, comoHora, linkWhatsApp } from "../lib/formato";
import { exigirPapel } from "../servidor/auth/guarda";
import { consultar } from "../servidor/supabase";
import { comoLeitura, fonteDeDados } from "../servidor/fonte";
import {
  ChevronRight,
  MapPin,
  MessageCircle,
  Navigation,
  Utensils,
} from "lucide-react";

/** O desenho. Mantido inteiro: tem checklist e temperatura que o banco não registra. */
function RotaDesenhada() {
  return (
    <RotaComChecklist demo evento={{id:"demo",titulo:"Aniversário Marina",pessoas:35,forno:"Forno a Gás Pro #03",destino:"R. Pe. Chagas, 380 - Moinhos de Vento",horario:"17:40"}}><div className="flex flex-col w-full h-full gap-space-lg max-w-4xl mx-auto">
      <div className="bg-surface-container-lowest rounded-xl shadow-md p-6 border-l-4 border-primary">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">
              Próximo Evento • Hoje
            </span>
            <TituloNoHeader className="font-headline-md text-headline-md text-on-surface font-extrabold mt-1">
              Aniversário Marina
            </TituloNoHeader>
            <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-2 mt-2">
              <MapPin className="w-[18px] h-[18px] text-tertiary" />
              R. Pe. Chagas, 380 - Moinhos de Vento
            </p>
          </div>
          <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg font-headline-sm text-headline-sm font-bold">
            35 pessoas
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="bg-surface-container-low p-3 rounded-lg flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
              Partida Base
            </span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
              17:40
            </span>
          </div>
          <div className="bg-surface-container-low p-3 rounded-lg flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
              Chegada Local
            </span>
            <span className="font-headline-sm text-headline-sm text-primary font-bold">
              18:15
            </span>
          </div>
          <div className="bg-surface-container-low p-3 rounded-lg flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
              Início Rodízio
            </span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
              20:00
            </span>
          </div>
          <div className="bg-surface-container-low p-3 rounded-lg flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
              Término
            </span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
              00:00
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <a href="https://www.google.com/maps/dir/?api=1&destination=Rua+Padre+Chagas+380+Porto+Alegre&travelmode=driving&dir_action=navigate" target="_blank" rel="noopener noreferrer" className="flex-1 bg-primary hover:opacity-90 text-on-primary font-label-lg text-label-lg py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-opacity border border-transparent">
            <Navigation className="w-5 h-5 fill-current" />
            Iniciar Rota GPS
          </a>
          <a href="/api/operacao/whatsapp?contato=1" className="flex-1 bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg py-3 rounded-xl flex items-center justify-center gap-2 transition-colors border border-outline-variant/30">
            <MessageCircle className="w-5 h-5 text-tertiary" />
            Avisar Base
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-space-lg">


        {/* Detalhes do Serviço */}
        <div className="bg-surface-container-lowest rounded-xl shadow-md p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Utensils className="w-6 h-6 text-tertiary" />
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Ficha Técnica
            </h2>
          </div>

          <div className="flex-1 flex flex-col gap-4">
            <div className="bg-surface-container-low p-3 rounded-lg">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                Restrições
              </span>
              <p className="font-body-md text-body-md text-on-surface font-medium mt-1">
                4 Veganos • 2 Intolerantes à Glúten
              </p>
            </div>

            <div className="bg-surface-container-low p-3 rounded-lg">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                Acesso ao Local
              </span>
              <p className="font-body-md text-body-md text-on-surface font-medium mt-1">
                Portaria social. Utilizar elevador de serviço (senha com
                zelador). Distância da tomada: 5m.
              </p>
            </div>

            <div className="bg-surface-container-low p-3 rounded-lg">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                Financeiro
              </span>
              <p className="font-body-md text-body-md text-on-surface font-medium mt-1">
                Saldo a receber: R$ 1.726,20
              </p>
            </div>
          </div>


        </div>
      </div>
    </div></RotaComChecklist>
  );
}

/* ===========================================================================
 * A MESMA TELA, LENDO O BANCO
 *
 * O desenho acima fica: tem checklist de embarque, temperatura de forno e
 * cronômetro de chegada — coisas que a operação quer e o banco ainda não
 * registra.
 *
 * Daqui para baixo, os eventos que esta pessoa ACEITOU em `escala_evento`.
 * O responsável legado continua sendo dono do evento; ele não substitui a
 * equipe que trabalha nele.
 * ======================================================================== */

interface EventoDaRota {
  id: string;
  data_evento: string;
  horario: string | null;
  horario_texto: string | null;
  horario_saida: string | null;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  inteiros: number | null;
  meios: number | null;
  modelo_forno_nome: string | null;
  situacao: string | null;
  codigo_legado: string | null;
}

async function RotaDoBanco({eventoSelecionado}:{eventoSelecionado?:string}) {
  const sessao = await exigirPapel(["staff"]);
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

  const escalasR = await consultar<{ evento_id: string }[]>(
    `escala_evento?select=evento_id&usuario_id=eq.${sessao.usuario.id}` +
      "&status=eq.aceito&limit=100",
    sessao.accessToken,
  );
  const ids = escalasR.dados?.map((escala) => escala.evento_id) ?? [];
  const leitura = comoLeitura(
    ids.length ? await consultar<EventoDaRota[]>(
      "vw_evento?select=id,data_evento,horario,horario_texto,horario_saida," +
        "cliente_nome,cliente_telefone,endereco,bairro,cidade,inteiros,meios," +
        "modelo_forno_nome,situacao,codigo_legado" +
        `&id=in.(${ids.join(",")})&data_evento=gte.${hoje}` +
        "&status=eq.confirmado&order=data_evento.asc&limit=40",
      sessao.accessToken,
    ) : { ok: true, dados: [] as EventoDaRota[], erro: null, status: 200 },
  );

  const eventos = leitura.estado === "ok" ? leitura.linhas : [];
  const proximo = eventos.find(e=>e.id===eventoSelecionado) ?? eventos[0];
  const embarque = proximo ? { id: proximo.id, titulo: `${proximo.cliente_nome ?? "Evento"} · ${comoData(proximo.data_evento)}`, pessoas: proximo.inteiros===null && proximo.meios===null ? null : (proximo.inteiros ?? 0) + (proximo.meios ?? 0), forno: proximo.modelo_forno_nome, destino: [proximo.endereco,proximo.bairro,proximo.cidade].filter(Boolean).join(", "), horario: comoHora(proximo.horario_saida,null) } : null;

  return (
    <RotaComChecklist evento={embarque} gestao={["gestao","admin"].includes(sessao.usuario.papel)}><div className="flex flex-col gap-space-lg max-w-4xl mx-auto">
      <CabecalhoDoPainel
        titulo="Minha rota"
        descricao={`${sessao.usuario.nome} · eventos aceitos de hoje em diante`}
        contagem={leitura.estado === "ok" ? eventos.length : null}
      />

      {!escalasR.ok && <FalhaDeLeitura motivo="Não foi possível carregar sua escala." />}
      {leitura.estado === "erro" && <FalhaDeLeitura motivo={leitura.motivo} />}

      {leitura.estado === "vazio" && (
        <SemLinhas
          titulo="Nenhum evento pela frente"
          detalhe="Quando a gestão alocar você em um evento, ele aparece aqui."
        />
      )}

      {proximo && (
        <section className="bg-surface-container-lowest rounded-xl shadow-md p-space-lg border-l-4 border-primary flex flex-col gap-space-md">
          <div className="flex items-start justify-between gap-space-md flex-wrap">
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary">
                Próximo evento
              </span>
              <h2 className="font-headline-md text-headline-md text-on-surface truncate">
                {proximo.cliente_nome ?? "Sem cliente"}
              </h2>
              <span className="font-body-md text-body-md text-on-surface-variant flex items-center gap-2 mt-1">
                <MapPin className="w-[18px] h-[18px] text-tertiary shrink-0" />
                {proximo.endereco ??
                  [proximo.bairro, proximo.cidade].filter(Boolean).join(" · ") ??
                  "sem endereço"}
              </span>
            </div>
            <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg font-headline-sm text-headline-sm shrink-0">
              {embarque?.pessoas === null ? "Pessoas não informadas" : `${embarque?.pessoas} pessoas`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-md">
            <Marco rotulo="Data" valor={comoData(proximo.data_evento)} />
            <Marco
              rotulo="Sair da base"
              valor={comoHora(proximo.horario_saida, null)}
            />
            <Marco
              rotulo="Serviço"
              valor={comoHora(proximo.horario, proximo.horario_texto)}
            />
            <Marco rotulo="Forno" valor={proximo.modelo_forno_nome ?? "—"} />
          </div>

          <div className="flex items-center gap-space-sm flex-wrap">
            {linkWhatsApp(proximo.cliente_telefone) && (
              <a
                href={linkWhatsApp(proximo.cliente_telefone)!}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 px-4 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center gap-2 hover:opacity-90 transition-opacity"
              >
                <MessageCircle className="w-4 h-4" />
                Falar com o cliente
              </a>
            )}
            {proximo.endereco && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&travelmode=driving&dir_action=navigate&destination=${encodeURIComponent(
                  [proximo.endereco, proximo.bairro, proximo.cidade]
                    .filter(Boolean)
                    .join(", "),
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 px-4 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md flex items-center gap-2 hover:bg-surface-container-high transition-colors"
              >
                <Navigation className="w-4 h-4 text-tertiary" />
                Iniciar rota GPS
              </a>
            )}
            <Link
              href={`/operacional/eventos/${proximo.id}`}
              className="h-11 px-4 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md flex items-center gap-2 hover:bg-surface-container-high transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
              Abrir evento
            </Link>
          </div>
        </section>
      )}

      {eventos.length > 1 && (
        <section className="flex flex-col gap-space-sm">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            Depois deste
          </h2>
          <Tabela colunas={["Data", "Cliente", "Onde", "Serviço", ""]}>
            {eventos.filter(e=>e.id!==proximo?.id).map((e) => (
              <Linha key={e.id}>
                <Celula className="whitespace-nowrap">
                  {comoData(e.data_evento)}
                </Celula>
                <Celula destaque>{e.cliente_nome ?? "—"}</Celula>
                <Celula>
                  {[e.bairro, e.cidade].filter(Boolean).join(" · ") || "—"}
                </Celula>
                <Celula className="whitespace-nowrap">
                  {comoHora(e.horario, e.horario_texto)}
                </Celula>
                <Celula className="text-right">
                  <Link
                    href={`/operacional/minha-rota?evento=${e.id}`}
                    className="font-label-md text-label-md text-primary hover:opacity-80"
                  >
                    Abrir
                  </Link>
                </Celula>
              </Linha>
            ))}
          </Tabela>
        </section>
      )}
    </div></RotaComChecklist>
  );
}

function Marco({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-col bg-surface-container-low rounded-lg p-space-sm">
      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
        {rotulo}
      </span>
      <span className="font-label-lg text-label-lg text-on-surface truncate">
        {valor}
      </span>
    </div>
  );
}

export async function FieldRouteView({eventoSelecionado}:{eventoSelecionado?:string}={}) {
  return (await fonteDeDados()) === "real" ? (
    <RotaDoBanco eventoSelecionado={eventoSelecionado} />
  ) : (
    <RotaDesenhada />
  );
}
