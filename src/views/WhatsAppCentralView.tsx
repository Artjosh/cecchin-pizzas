import Link from "next/link";
import {
  CabecalhoDoPainel,
  Etiqueta,
  LacunaDeDados,
  SemLinhas,
} from "../components/painel/Painel";
import { comoData, comoHora, comoTelefone, linkCentralWhatsApp } from "../lib/formato";
import { formatBRL } from "../lib/moeda";
import { exigirPapel } from "../servidor/auth/guarda";
import { consultar } from "../servidor/supabase";
import { ConversaReal } from "../components/whatsapp/ConversaReal";
import { AbasCentral } from "../components/whatsapp/AbasCentral";
import { MessageCircle } from 'lucide-react';

interface ContatoPendente {
  id: string;
  bloco: string;
  pendencia: string;
  data_evento: string;
  codigo_legado: string | null;
}

interface DadosDoContato {
  id: string;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  data_evento: string;
  horario: string | null;
  horario_texto: string | null;
  a_acertar: string | number | null;
  sinal: string | number | null;
}

interface ConversaWhatsApp {
  telefone: string;
  modo: "automatico" | "atendimento_humano";
}

/**
 * A mensagem já vem escrita, e muda conforme o motivo.
 *
 * Quem atende manda dezenas por dia; escrever tudo do zero é o que faz o
 * contato demorar — e mensagem improvisada sobre dinheiro é onde o mal-entendido
 * nasce.
 */
function mensagemPara(
  bloco: string,
  e: DadosDoContato,
): string {
  const nome = (e.cliente_nome ?? "").split(" ")[0] || "tudo bem";
  const dia = comoData(e.data_evento);
  const hora = comoHora(e.horario, e.horario_texto);

  if (bloco === "dinheiro") {
    const falta = Number(e.a_acertar ?? 0);
    return (
      `Oi, ${nome}! Aqui é da Cecchin Pizzas. ` +
      `Sobre o seu evento de ${dia}: ficou ${formatBRL(falta)} a acertar. ` +
      `Pode confirmar a forma de pagamento?`
    );
  }

  if (bloco === "confirmacao") {
    return (
      `Oi, ${nome}! Aqui é da Cecchin Pizzas. ` +
      `Confirmando o seu evento de ${dia} às ${hora}: ` +
      `o número de convidados segue o mesmo?`
    );
  }

  if (bloco === "feedback") {
    return (
      `Oi, ${nome}! Aqui é da Cecchin Pizzas. ` +
      `Como foi o rodízio de ${dia}? Seu retorno ajuda muito a gente.`
    );
  }

  return (
    `Oi, ${nome}! Aqui é da Cecchin Pizzas. ` +
    `Sobre o seu evento de ${dia}, faltam alguns detalhes para fecharmos tudo. ` +
    `Pode me ajudar?`
  );
}

const NOME_DO_BLOCO: Record<string, string> = {
  informacao: "Falta informação",
  dinheiro: "Dinheiro a acertar",
  confirmacao: "Confirmar presença",
  feedback: "Pedir retorno",
};

async function CentralDoBanco() {
  const sessao = await exigirPapel(["gestao"]);

  const [pendentesR, conversasR] = await Promise.all([
    consultar<ContatoPendente[]>(
      "vw_pendencia?select=id,bloco,pendencia,data_evento,codigo_legado" +
        "&order=ordem.asc,data_evento.asc&limit=40",
      sessao.accessToken,
    ),
    consultar<ConversaWhatsApp[]>(
      "vw_conversa_central?removida_em=is.null&select=telefone,modo&order=telefone.asc&limit=50",
      sessao.accessToken,
    ),
  ]);

  const pendentes = pendentesR.dados ?? [];

  /*
   * Uma consulta só para todos os eventos da fila, em vez de uma por linha.
   * `in.(...)` do PostgREST resolve; quarenta consultas em série seriam
   * quarenta idas ao banco por carga de tela.
   */
  const ids = [...new Set(pendentes.map((p) => p.id))];
  const eventosR = ids.length
    ? await consultar<DadosDoContato[]>(
        "vw_evento?select=id,cliente_nome,cliente_telefone,data_evento," +
          "horario,horario_texto,a_acertar,sinal" +
          `&id=in.(${ids.join(",")})`,
        sessao.accessToken,
      )
    : { ok: true, dados: [] as DadosDoContato[], erro: null, status: 200 };

  const porId = new Map((eventosR.dados ?? []).map((e) => [e.id, e]));

  const contatos = pendentes
    .map((p) => ({ pendencia: p, evento: porId.get(p.id) }))
    .filter(
      (c): c is { pendencia: ContatoPendente; evento: DadosDoContato } =>
        c.evento !== undefined,
    );

  const telefonesDaCentral = (conversasR.dados ?? []).map((conversa) => conversa.telefone);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <CabecalhoDoPainel
        titulo="Central de WhatsApp"
        descricao="Histórico recebido pelo provedor conectado e fila de contatos da operação."
      />

      {!conversasR.ok && <LacunaDeDados titulo="Falha ao carregar conversas">Tente recarregar a página.</LacunaDeDados>}
      <AbasCentral conversas={<ConversaReal telefones={telefonesDaCentral} />}>
      {(!pendentesR.ok || !eventosR.ok) && <LacunaDeDados titulo="Falha ao carregar pendências">A lista de contatos pode estar incompleta.</LacunaDeDados>}

      {contatos.length === 0 ? (
        <SemLinhas
          titulo="Ninguém esperando"
          detalhe="A fila de pendências está vazia."
        />
      ) : (
        <ul className="flex flex-col gap-space-sm">
          {contatos.map(({ pendencia, evento }) => {
            const zap = linkCentralWhatsApp(evento.cliente_telefone);
            const texto = mensagemPara(pendencia.bloco, evento);

            return (
              <li
                key={`${pendencia.bloco}-${pendencia.id}`}
                className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-col gap-space-sm"
              >
                <div className="flex items-start justify-between gap-space-md flex-wrap">
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-lg text-label-lg text-on-surface truncate">
                      {evento.cliente_nome ?? "sem nome"}
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {comoTelefone(evento.cliente_telefone)} ·{" "}
                      {comoData(evento.data_evento)}
                      {pendencia.codigo_legado && ` · ${pendencia.codigo_legado}`}
                    </span>
                  </div>
                  <Etiqueta tom={pendencia.bloco === "dinheiro" ? "atencao" : "neutro"}>
                    {NOME_DO_BLOCO[pendencia.bloco] ?? pendencia.bloco}
                  </Etiqueta>
                </div>

                <p className="font-body-sm text-body-sm text-on-surface-variant bg-surface-container-low rounded-lg p-space-sm">
                  {texto}
                </p>

                <div className="flex items-center gap-space-xs flex-wrap">
                  {zap ? (
                    <a
                      href={zap}
                      rel="noopener noreferrer"
                      className="h-10 px-4 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center gap-2 hover:opacity-90 transition-opacity"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Abrir conversa
                    </a>
                  ) : (
                    <span className="h-10 px-4 rounded-lg bg-surface-container text-on-surface-variant font-label-md text-label-md flex items-center">
                      Sem telefone utilizável
                    </span>
                  )}
                  <Link
                    href={`/operacional/eventos/${pendencia.id}`}
                    className="h-10 px-4 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md flex items-center hover:bg-surface-container-high transition-colors"
                  >
                    Ver evento
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      </AbasCentral>
    </div>
  );
}

export async function WhatsAppCentralView() {
  return <CentralDoBanco />;
}
