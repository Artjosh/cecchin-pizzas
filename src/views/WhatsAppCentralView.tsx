import Link from "next/link";
import {
  CabecalhoDoPainel,
  Etiqueta,
  LacunaDeDados,
  SemLinhas,
} from "../components/painel/Painel";
import { comoData, comoHora, comoTelefone, linkWhatsApp } from "../lib/formato";
import { formatBRL } from "../lib/moeda";
import { exigirPapel } from "../servidor/auth/guarda";
import { consultar } from "../servidor/supabase";
import { fonteDeDados } from "../servidor/fonte";
import { EnviarMensagemWhatsapp } from "../components/EnviarMensagemWhatsapp";
import React from 'react';
import { MessageCircle, Search, MoreVertical, Phone } from 'lucide-react';

/** O desenho. Mantido: mostra a caixa de entrada que ainda não dá para ter. */
function CentralDesenhada() {
  const chats = [
    { id: 1, name: 'Marina Fontoura', lastMessage: 'Perfeito, aguardo vocês!', time: '10:45', unread: 0, status: 'cliente' },
    { id: 2, name: 'Equipe A - Festa 15 Anos', lastMessage: 'Chegamos no local.', time: '10:30', unread: 2, status: 'staff' },
    { id: 3, name: 'João (Garçom)', lastMessage: 'Preciso de mais massa', time: '10:15', unread: 0, status: 'staff' },
  ];

  return (
    <div className="h-[calc(100vh-8rem)] bg-surface-container-lowest border border-outline-variant/50 rounded-xl overflow-hidden flex shadow-sm">
      {/* Sidebar */}
      <div className="w-80 border-r border-outline-variant/50 flex flex-col bg-surface-container-low">
        <div className="p-4 bg-surface-container-lowest border-b border-outline-variant/50 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-on-surface flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              WhatsApp Central
            </h2>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-on-surface-variant/70 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar conversas..." 
              className="w-full bg-surface-container border-none rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.map(chat => (
            <div key={chat.id} className="p-4 border-b border-outline-variant/30 hover:bg-surface-container-lowest cursor-pointer transition-colors flex gap-3 items-start">
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex-shrink-0 flex items-center justify-center font-bold text-on-surface-variant">
                {chat.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-medium text-on-surface truncate text-sm">{chat.name}</h3>
                  <span className="text-xs text-on-surface-variant/70">{chat.time}</span>
                </div>
                <p className="text-xs text-on-surface-variant truncate">{chat.lastMessage}</p>
              </div>
              {chat.unread > 0 && (
                <div className="bg-green-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {chat.unread}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#efeae2]">
        <div className="h-16 bg-surface-container-lowest border-b border-outline-variant/50 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-on-surface-variant">
              E
            </div>
            <div>
              <h3 className="font-bold text-on-surface">Equipe A - Festa 15 Anos</h3>
              <p className="text-xs text-green-600">Online</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-on-surface-variant">
            <Phone className="w-5 h-5 cursor-pointer hover:text-on-surface" />
            <MoreVertical className="w-5 h-5 cursor-pointer hover:text-on-surface" />
          </div>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
          <div className="self-center bg-amber-100 text-amber-800 text-xs px-3 py-1 rounded-lg">
            Hoje
          </div>
          <div className="bg-surface-container-lowest p-3 rounded-lg rounded-tl-none shadow-sm max-w-[70%] self-start text-sm text-on-surface relative">
            <p>Tudo carregado, estamos saindo da base.</p>
            <span className="text-[10px] text-on-surface-variant/70 absolute bottom-1 right-2">10:15</span>
          </div>
          <div className="bg-green-100 p-3 rounded-lg rounded-tr-none shadow-sm max-w-[70%] self-end text-sm text-on-surface relative">
            <p>Excelente. A cliente já confirmou que o salão está aberto.</p>
            <span className="text-[10px] text-on-surface-variant absolute bottom-1 right-2">10:18</span>
          </div>
          <div className="bg-surface-container-lowest p-3 rounded-lg rounded-tl-none shadow-sm max-w-[70%] self-start text-sm text-on-surface relative pb-5">
            <p>Chegamos no local.</p>
            <span className="text-[10px] text-on-surface-variant/70 absolute bottom-1 right-2">10:30</span>
          </div>
        </div>

        <div className="p-4 bg-surface-container border-t border-outline-variant/50">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Digite uma mensagem..." 
              className="flex-1 bg-surface-container-lowest border border-outline-variant/50 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-amber-500"
            />
            <button className="bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-green-700">
              <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* A central desenhada acima continua como referência do modo mock. No modo
 * Banco, o histórico vem do webhook assinado e as saídas passam pela fila do
 * Nest; texto livre só sai durante a janela de atendimento da Meta. */

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

interface MensagemWhatsApp {
  id: string;
  telefone: string;
  direcao: "entrada" | "saida";
  tipo: string;
  conteudo: Record<string, unknown>;
  status: string;
  criado_em: string;
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

  const [pendentesR, mensagensR] = await Promise.all([
    consultar<ContatoPendente[]>(
      "vw_pendencia?select=id,bloco,pendencia,data_evento,codigo_legado" +
        "&order=ordem.asc,data_evento.asc&limit=40",
      sessao.accessToken,
    ),
    consultar<MensagemWhatsApp[]>(
      "mensagem_whatsapp?select=id,telefone,direcao,tipo,conteudo,status,criado_em" +
        "&order=criado_em.desc&limit=80",
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

  const telefonesDaCentral = [...new Set((mensagensR.dados ?? []).map((mensagem) => mensagem.telefone))];

  return (
    <div className="flex flex-col gap-space-lg">
      <CabecalhoDoPainel
        titulo="Central de WhatsApp"
        descricao="Histórico recebido pelo provedor conectado e fila de contatos da operação."
        contagem={mensagensR.dados?.length ?? 0}
      />

      <LacunaDeDados titulo="A conversa agora tem origem rastreável">
        <p>
          O NestJS registra cada entrada e cada envio da fila pelo provedor
          conectado. A Central mantém um histórico único quando o provedor é trocado.
        </p>
        <p>
          Na Cloud API, mensagens iniciadas pela empresa obedecem à janela de
          24 horas e aos templates aprovados da Meta. No WhatsApp Web local,
          texto livre segue a conversa normal e convites pedem ACEITAR ou
          RECUSAR com o código recebido. Na Cloud API, o mesmo convite usa
          botões de resposta. Os dois caminhos entram pela mesma fila.
        </p>
      </LacunaDeDados>

      <EnviarMensagemWhatsapp telefones={telefonesDaCentral} />

      <section className="flex flex-col gap-space-sm">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">Conversas recentes</h2>
        {!mensagensR.dados?.length ? (
          <SemLinhas titulo="Nenhuma mensagem recebida ainda" detalhe="Envie uma mensagem para o número vinculado para registrar a primeira entrada e a resposta do bot." />
        ) : (
          <ul className="flex flex-col gap-space-xs">
            {mensagensR.dados.map((mensagem) => (
              <li key={mensagem.id} className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-space-sm">
                  <span className="font-label-lg text-on-surface">{comoTelefone(mensagem.telefone)}</span>
                  <span className="font-label-sm text-on-surface-variant">{new Date(mensagem.criado_em).toLocaleString("pt-BR")} · {mensagem.direcao === "entrada" ? "recebida" : mensagem.status}</span>
                </div>
                <p className="mt-1 font-body-sm text-on-surface-variant">{textoDaMensagem(mensagem)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {contatos.length === 0 ? (
        <SemLinhas
          titulo="Ninguém esperando"
          detalhe="A fila de pendências está vazia."
        />
      ) : (
        <ul className="flex flex-col gap-space-sm">
          {contatos.map(({ pendencia, evento }) => {
            const zap = linkWhatsApp(evento.cliente_telefone);
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
                      href={`${zap}?text=${encodeURIComponent(texto)}`}
                      target="_blank"
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
    </div>
  );
}

function textoDaMensagem(mensagem: MensagemWhatsApp): string {
  const textoLivre = mensagem.conteudo.texto;
  if (typeof textoLivre === "string") return textoLivre;
  const texto = mensagem.conteudo.text;
  if (typeof texto === "string") return texto;
  if (texto && typeof texto === "object" && "body" in texto && typeof texto.body === "string") return texto.body;
  const interativo = mensagem.conteudo.interactive;
  if (interativo && typeof interativo === "object" && "button_reply" in interativo) {
    const botao = interativo.button_reply;
    if (botao && typeof botao === "object" && "title" in botao && typeof botao.title === "string") return botao.title;
  }
  if (mensagem.tipo === "texto") return mensagem.direcao === "entrada" ? "Mensagem recebida" : "Mensagem enviada pela operação";
  return `Mensagem ${mensagem.tipo}`;
}

export async function WhatsAppCentralView() {
  return (await fonteDeDados()) === "real" ? (
    <CentralDoBanco />
  ) : (
    <CentralDesenhada />
  );
}
