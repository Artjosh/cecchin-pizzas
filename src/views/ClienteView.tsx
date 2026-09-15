import { podeAcessar } from "../servidor/auth/sessao-atual";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MessageCircle } from "lucide-react";

import {
  CabecalhoDoPainel,
  Celula,
  Etiqueta,
  Linha,
  SemLinhas,
  Tabela,
} from "../components/painel/Painel";
import { comoData, comoTelefone, linkWhatsApp, linkCentralWhatsApp } from "../lib/formato";
import { formatBRL } from "../lib/moeda";
import { exigirPapel } from "../servidor/auth/guarda";
import { consultar } from "../servidor/supabase";

/**
 * A ficha de um cliente e o histórico dele.
 *
 * "Essa pessoa já contratou antes?" é a primeira pergunta de todo atendimento,
 * e até agora a resposta estava na planilha.
 */

interface Resumo {
  id: string;
  nome: string | null;
  telefone: string | null;
  eventos: number;
  primeiro_evento: string | null;
  ultimo_evento: string | null;
  pessoas_atendidas: number | null;
  total_gasto: string | number | null;
}

interface EventoDoCliente {
  id: string;
  codigo_legado: string | null;
  data_evento: string;
  tipo_evento_nome: string | null;
  inteiros: number | null;
  total_do_evento: string | number | null;
  situacao: string | null;
  status: string | null;
  cidade: string | null;
}

export async function ClienteView({ id }: { id: string }) {
  const sessao = await exigirPapel(["staff"]);

  const [resumoR, eventosR] = await Promise.all([
    consultar<Resumo[]>(
      `vw_cliente_resumo?select=*&id=eq.${encodeURIComponent(id)}&limit=1`,
      sessao.accessToken,
    ),
    consultar<EventoDoCliente[]>(
      "vw_evento?select=id,codigo_legado,data_evento,tipo_evento_nome,inteiros," +
        "total_do_evento,situacao,status,cidade" +
        `&cliente_id=eq.${encodeURIComponent(id)}&order=data_evento.desc&limit=200`,
      sessao.accessToken,
    ),
  ]);

  const cliente = resumoR.dados?.[0];

  // Se a RLS escondeu, para quem pergunta ele não existe.
  if (!cliente) notFound();

  const eventos = eventosR.dados ?? [];
  const zap = podeAcessar(sessao.usuario.papel, ["gestao"]) ? linkCentralWhatsApp(cliente.telefone) : linkWhatsApp(cliente.telefone);

  return (
    <div className="flex flex-col gap-space-lg">


      <CabecalhoDoPainel
        titulo={cliente.nome ?? "Cliente sem nome"}
        descricao={comoTelefone(cliente.telefone)}
        acoes={
          zap && (
            <a
              href={zap}
              target={zap?.startsWith("/") ? undefined : "_blank"}
              rel="noopener noreferrer"
              className="h-10 px-4 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
          )
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-md">
        <Indicador rotulo="Eventos" valor={String(cliente.eventos)} />
        <Indicador
          rotulo="Pessoas atendidas"
          valor={String(cliente.pessoas_atendidas ?? 0)}
        />
        <Indicador
          rotulo="Total gasto"
          valor={formatBRL(Number(cliente.total_gasto ?? 0))}
        />
        <Indicador
          rotulo="Cliente desde"
          valor={comoData(cliente.primeiro_evento)}
        />
      </div>

      <section className="flex flex-col gap-space-sm">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Histórico
        </h2>

        {eventos.length === 0 ? (
          <SemLinhas
            titulo="Nenhum evento"
            detalhe="O resumo conta eventos que a agenda pode não mostrar — cancelado sem sinal não entra na lista."
          />
        ) : (
          <Tabela
            colunas={["Código", "Data", "Tipo", "Cidade", "Pessoas", "Total", "Situação", ""]}
          >
            {eventos.map((e) => (
              <Linha key={e.id}>
                <Celula destaque>
                  <span className="font-mono">{e.codigo_legado ?? "—"}</span>
                </Celula>
                <Celula className="whitespace-nowrap">
                  {comoData(e.data_evento)}
                </Celula>
                <Celula>{e.tipo_evento_nome ?? "—"}</Celula>
                <Celula>{e.cidade ?? "—"}</Celula>
                <Celula className="text-right">{e.inteiros ?? 0}</Celula>
                <Celula destaque className="text-right whitespace-nowrap">
                  {formatBRL(Number(e.total_do_evento ?? 0))}
                </Celula>
                <Celula>
                  <Etiqueta
                    tom={e.status === "cancelado" ? "atencao" : "neutro"}
                  >
                    {e.situacao ?? e.status ?? "—"}
                  </Etiqueta>
                </Celula>
                <Celula className="text-right">
                  <Link
                    href={`/operacional/eventos/${e.id}`}
                    className="inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:opacity-80"
                  >
                    Abrir
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Celula>
              </Linha>
            ))}
          </Tabela>
        )}
      </section>
    </div>
  );
}

function Indicador({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-space-md flex flex-col shadow-sm">
      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
        {rotulo}
      </span>
      <span className="font-headline-sm text-headline-sm text-on-surface truncate">
        {valor}
      </span>
    </div>
  );
}
