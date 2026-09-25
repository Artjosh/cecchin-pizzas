import { TituloNoHeader } from "@/src/components/layouts/TituloNoHeader";
import Link from "next/link";
import {
  ChevronRight,
  FileText,
  HelpCircle,
  Mail,
  MessageCircle,
  Phone,
} from "lucide-react";

import { comoData, comoHora, hojeSaoPaulo, linkWhatsApp } from "../lib/formato";
import { CONTATO } from "../lib/operacao";
import { telefoneDoAtendimento } from "../servidor/whatsapp";
import { exigirSessao } from "../servidor/auth/guarda";
import { consultar } from "../servidor/supabase";

/**
 * Suporte ao cliente.
 *
 * O desenho tinha três cartões de contato que eram `div` com `cursor-pointer` —
 * pareciam clicáveis e não levavam a lugar nenhum. Agora são links de verdade:
 * WhatsApp, telefone e e-mail.
 *
 * E o principal: quando a pessoa tem evento contratado, a tela abre com ELE.
 * Quem procura suporte quase sempre está perguntando sobre o próprio evento, e
 * fazer a pessoa repetir data e endereço para o atendente é o atrito que o
 * sistema deveria remover.
 *
 * O FAQ continua estático de propósito: é conteúdo, não dado. Colocá-lo numa
 * tabela só criaria um CRUD para texto que muda uma vez por ano.
 */

const PERGUNTAS = [
  {
    q: "Como funciona o rodízio em domicílio?",
    a: "Levamos toda a estrutura — forno, pizzaiolo e equipe — e servimos pizza quente por quatro horas no seu evento.",
  },
  {
    q: "Qual a quantidade mínima de convidados?",
    a: "Atendemos a partir de 15 adultos. Crianças até 5 anos são cortesia, e de 6 a 10 pagam meia.",
  },
  {
    q: "Preciso fornecer algum material?",
    a: "Não. Levamos forno, louça, talheres, guardanapos e todos os insumos.",
  },
  {
    q: "Posso alterar o cardápio depois de fechar?",
    a: "Sim, até 72h antes do evento. Fale com a gente pelo WhatsApp.",
  },
  {
    q: "Como funciona o sinal?",
    a: "40% garantem a data. O saldo é pago no término do evento.",
  },
  {
    q: "Vocês atendem fora de Porto Alegre?",
    a: "Sim — Grande Porto Alegre e Serra. A taxa de deslocamento varia por distância e aparece no orçamento.",
  },
];

interface MeuEvento {
  id: string;
  data_evento: string;
  horario: string | null;
  horario_texto: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  situacao: string | null;
  codigo_legado: string | null;
}

export async function SupportView() {
  const sessao = await exigirSessao("/cliente/suporte");
  const hoje = hojeSaoPaulo();

  /*
   * Filtro por dono obrigatório: a policy de `evento` deixa quem é da operação
   * ver tudo, e sem isto um staff abrindo o suporte veria o evento de outra
   * pessoa como se fosse o dele. Quarta vez que esta armadilha aparece.
   */
  const r = await consultar<MeuEvento[]>(
    "vw_evento?select=id,data_evento,horario,horario_texto,endereco,bairro," +
      "cidade,situacao,codigo_legado" +
      `&cliente_usuario_id=eq.${sessao.usuario.id}&data_evento=gte.${hoje}` +
      "&order=data_evento.asc&limit=1",
    sessao.accessToken,
  );

  const evento = r.dados?.[0];
  const zap = linkWhatsApp(await telefoneDoAtendimento());

  const assunto = evento
    ? `Evento ${evento.codigo_legado ?? ""} de ${comoData(evento.data_evento)}`
    : "Dúvida sobre o rodízio";

  return (
    <div className="max-w-4xl mx-auto px-margin md:px-margin-tablet py-space-xl flex flex-col gap-space-xl">
      <header className="text-center flex flex-col gap-space-xs">
        <TituloNoHeader className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
          Como podemos ajudar?
        </TituloNoHeader>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-lg mx-auto">
          Fale com quem organiza o seu evento. Respondemos das 9h às 22h.
        </p>
      </header>

      {evento && (
        <section className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-lg flex flex-col gap-space-sm">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary">
            Seu próximo evento
          </span>
          <div className="flex flex-wrap items-baseline justify-between gap-space-md">
            <span className="font-headline-sm text-headline-sm text-on-surface">
              {comoData(evento.data_evento)} às{" "}
              {comoHora(evento.horario, evento.horario_texto)}
            </span>
            {evento.situacao && (
              <span className="font-label-md text-label-md text-on-surface-variant">
                {evento.situacao}
              </span>
            )}
          </div>
          <span className="font-body-md text-body-md text-on-surface-variant">
            {evento.endereco ??
              [evento.bairro, evento.cidade].filter(Boolean).join(" · ") ??
              "endereço a confirmar"}
          </span>
          <Link
            href="/cliente/eventos"
            className="font-label-md text-label-md text-primary hover:opacity-80 w-fit inline-flex items-center gap-1"
          >
            Ver meus eventos
            <ChevronRight className="w-4 h-4" />
          </Link>
        </section>
      )}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        <CartaoDeContato
          href={zap ? `${zap}?text=${encodeURIComponent(assunto)}` : null}
          icone={<MessageCircle className="w-6 h-6" />}
          titulo="WhatsApp"
          detalhe="Resposta mais rápida, das 9h às 22h"
          acao="Iniciar conversa"
          externo
        />
        <CartaoDeContato
          href={CONTATO.telefone ? `tel:${CONTATO.telefone.replace(/\D/g, "")}` : null}
          icone={<Phone className="w-6 h-6" />}
          titulo="Telefone"
          detalhe={CONTATO.telefone || "não configurado"}
          acao="Ligar agora"
        />
        <CartaoDeContato
          href={CONTATO.email ? `mailto:${CONTATO.email}?subject=${encodeURIComponent(assunto)}` : null}
          icone={<Mail className="w-6 h-6" />}
          titulo="E-mail"
          detalhe="Para orçamento e nota fiscal"
          acao="Escrever"
        />
      </section>

      <section className="flex flex-col gap-space-md">
        <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-space-sm">
          <HelpCircle className="w-5 h-5 text-tertiary" />
          Perguntas frequentes
        </h2>

        <div className="flex flex-col gap-space-xs">
          {PERGUNTAS.map((p) => (
            <details
              key={p.q}
              className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden group"
            >
              <summary className="px-space-md py-space-md font-label-md text-label-md text-on-surface cursor-pointer flex items-center justify-between gap-space-sm hover:bg-surface-container-low/50 transition-colors">
                {p.q}
                <ChevronRight className="w-4 h-4 text-on-surface-variant shrink-0 transition-transform group-open:rotate-90" />
              </summary>
              <p className="px-space-md pb-space-md font-body-md text-body-md text-on-surface-variant">
                {p.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="bg-surface-container-low rounded-xl p-space-md flex items-start gap-space-sm">
        <FileText className="w-5 h-5 text-tertiary shrink-0 mt-0.5" />
        <div className="flex flex-col">
          <span className="font-label-md text-label-md text-on-surface">
            Política de reserva
          </span>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            O sinal de 40% garante a data. Cancelamento com reembolso integral
            até 7 dias úteis antes do evento.
          </p>
        </div>
      </section>
    </div>
  );
}

/**
 * Cartão de contato — link de verdade, não `div` com `cursor-pointer`.
 *
 * Quando não há canal configurado, vira texto em vez de link morto: um card que
 * parece clicável e não faz nada é pior do que um card que não parece.
 */
function CartaoDeContato({
  href,
  icone,
  titulo,
  detalhe,
  acao,
  externo,
}: {
  href: string | null;
  icone: React.ReactNode;
  titulo: string;
  detalhe: string;
  acao: string;
  externo?: boolean;
}) {
  const miolo = (
    <>
      <span className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-space-sm">
        {icone}
      </span>
      <span className="font-label-lg text-label-lg text-on-surface block">
        {titulo}
      </span>
      <span className="font-body-sm text-body-sm text-on-surface-variant block mb-space-sm">
        {detalhe}
      </span>
      <span className="font-label-md text-label-md text-primary">
        {href ? `${acao} →` : "indisponível"}
      </span>
    </>
  );

  const classe =
    "bg-surface-container-lowest p-space-lg rounded-xl shadow-sm text-center block transition-shadow";

  if (!href) {
    return <div className={`${classe} opacity-60`}>{miolo}</div>;
  }

  return (
    <a
      href={href}
      {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`${classe} hover:shadow-md`}
    >
      {miolo}
    </a>
  );
}
