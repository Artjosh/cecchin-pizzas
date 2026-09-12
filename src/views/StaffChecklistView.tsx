import Link from "next/link";
import {
  CabecalhoDoPainel,
  LacunaDeDados,
  SemLinhas,
} from "../components/painel/Painel";
import { comoData, comoHora } from "../lib/formato";
import { exigirPapel } from "../servidor/auth/guarda";
import { consultar } from "../servidor/supabase";
import { fonteDeDados } from "../servidor/fonte";
import React, { useState } from 'react';

import { ChecklistDesenhado } from "./desenho/ChecklistDesenhado";

/* ===========================================================================
 * O CHECKLIST DO PRÓXIMO EVENTO
 *
 * **Não existe tabela de checklist.** Nada guarda o que foi conferido, por quem
 * e quando — marcar aqui não persiste nada, e é honesto dizer isso em vez de
 * simular um estado que some ao recarregar.
 *
 * O que dá para fazer hoje, e é útil: montar a lista A PARTIR DO EVENTO. Quantas
 * massas, qual forno, que horas sair, para onde ir. Isso o banco tem, e é o que
 * a equipe confere antes de embarcar.
 * ======================================================================== */

interface EventoDoChecklist {
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
  modelo_rodizio_nome: string | null;
  observacao: string | null;
}

interface Item {
  grupo: string;
  o_que: string;
  detalhe: string | null;
}

/**
 * A lista sai dos números do evento, não de um catálogo fixo.
 *
 * A conta de massas é a da operação: uma por pessoa mais folga de 15%,
 * arredondada para cima. Está aqui, visível, em vez de escondida numa planilha
 * — se a regra mudar, muda num lugar só.
 */
function montarItens(e: EventoDoChecklist): Item[] {
  const pessoas = (e.inteiros ?? 0) + Math.ceil((e.meios ?? 0) / 2);
  const massas = Math.ceil(pessoas * 1.15);

  const destino =
    e.endereco ?? [e.bairro, e.cidade].filter(Boolean).join(" · ") ?? "—";

  return [
    {
      grupo: "Massa e insumo",
      o_que: `${massas} massas de 48h`,
      detalhe: `${pessoas} pessoas, com 15% de folga`,
    },
    { grupo: "Massa e insumo", o_que: "Molho, queijo e coberturas", detalhe: null },
    {
      grupo: "Equipamento",
      o_que: e.modelo_forno_nome ?? "Forno",
      detalhe: e.modelo_forno_nome ? null : "modelo não registrado no evento",
    },
    { grupo: "Equipamento", o_que: "Botijão e mangueira", detalhe: null },
    { grupo: "Equipamento", o_que: "Pá, tábua e cortadores", detalhe: null },
    {
      grupo: "Serviço",
      o_que: "Louças e descartáveis",
      detalhe: `para ${pessoas} pessoas`,
    },
    { grupo: "Serviço", o_que: "Guardanapos e lixeira", detalhe: null },
    {
      grupo: "Saída",
      o_que: `Sair da base às ${comoHora(e.horario_saida, null)}`,
      detalhe: `serviço começa ${comoHora(e.horario, e.horario_texto)}`,
    },
    { grupo: "Saída", o_que: `Destino: ${destino}`, detalhe: null },
  ];
}

async function ChecklistDoBanco() {
  const sessao = await exigirPapel(["staff"]);
  const hoje = new Date().toISOString().slice(0, 10);

  const r = await consultar<EventoDoChecklist[]>(
    "vw_evento?select=id,data_evento,horario,horario_texto,horario_saida," +
      "cliente_nome,cliente_telefone,endereco,bairro,cidade,inteiros,meios," +
      "modelo_forno_nome,modelo_rodizio_nome,observacao" +
      `&data_evento=gte.${hoje}&status=eq.confirmado&order=data_evento.asc&limit=1`,
    sessao.accessToken,
  );

  const evento = r.dados?.[0];

  if (!evento) {
    return (
      <div className="flex flex-col gap-space-lg max-w-3xl mx-auto">
        <CabecalhoDoPainel
          titulo="Checklist de embarque"
          descricao="O que sai da base para o próximo evento."
        />
        <SemLinhas
          titulo="Nenhum evento pela frente"
          detalhe="O checklist é montado a partir do próximo evento confirmado."
        />
      </div>
    );
  }

  const itens = montarItens(evento);
  const grupos = [...new Set(itens.map((i) => i.grupo))];

  return (
    <div className="flex flex-col gap-space-lg max-w-3xl mx-auto">
      <CabecalhoDoPainel
        titulo="Checklist de embarque"
        descricao={`${evento.cliente_nome ?? "Evento"} · ${comoData(evento.data_evento)}`}
        contagem={itens.length}
        acoes={
          <Link
            href={`/operacional/eventos/${evento.id}`}
            className="h-10 px-4 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md flex items-center hover:bg-surface-container-high transition-colors"
          >
            Abrir evento
          </Link>
        }
      />

      <LacunaDeDados titulo="Marcar aqui não guarda nada">
        <p>
          Não existe tabela de checklist: nada registra o que foi conferido, por
          quem e quando. A lista abaixo é montada a partir do evento, e é
          verdadeira — mas a marcação vive só nesta aba.
        </p>
        <p>
          Persistir isso é decisão de modelagem, com uma pergunta junto: o
          checklist é do evento ou do embarque? Um evento com duas viagens tem
          dois. Ver <code className="font-mono">AGENTES.md</code>.
        </p>
      </LacunaDeDados>

      {evento.observacao && (
        <div className="bg-surface-container-low rounded-xl p-space-md">
          <span className="font-label-md text-label-md text-on-surface">
            Observação do evento
          </span>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            {evento.observacao}
          </p>
        </div>
      )}

      {grupos.map((grupo) => (
        <section key={grupo} className="flex flex-col gap-space-sm">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            {grupo}
          </h2>
          <ul className="bg-surface-container-lowest rounded-xl shadow-sm divide-y divide-outline-variant/30">
            {itens
              .filter((i) => i.grupo === grupo)
              .map((item) => (
                <li key={item.o_que}>
                  <label className="flex items-start gap-space-sm p-space-md cursor-pointer hover:bg-surface-container-low/50 transition-colors">
                    <input
                      type="checkbox"
                      className="mt-1 w-5 h-5 accent-primary rounded shrink-0"
                    />
                    <span className="flex flex-col min-w-0">
                      <span className="font-body-md text-body-md text-on-surface">
                        {item.o_que}
                      </span>
                      {item.detalhe && (
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          {item.detalhe}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export async function StaffChecklistView() {
  return (await fonteDeDados()) === "real" ? (
    <ChecklistDoBanco />
  ) : (
    <ChecklistDesenhado />
  );
}
