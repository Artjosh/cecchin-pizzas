import { AlertTriangle, Edit2, Flame, Plus, Trash2, Utensils } from "lucide-react";

import {
  CatalogoEditavel,
  type ItemDoCatalogo,
} from "../components/CatalogoEditavel";
import { cn } from "../lib/utils";
import { formatBRL } from "../lib/moeda";
import { exigirPapel } from "../servidor/auth/guarda";
import { consultar } from "../servidor/supabase";
import { comoLeitura, fonteDeDados } from "../servidor/fonte";

/**
 * Catálogo e preços.
 *
 * O desenho fala de "pacotes" e "adicionais" — vocabulário que o banco não tem.
 * Lá existem `modelo_rodizio` (o que se vende: Clássico, Plus, Premium, por
 * duração), `modelo_forno` (o equipamento) e `preco_vigencia` (o preço com data
 * de início).
 *
 * A diferença não é detalhe: `preco_vigencia` está VAZIA. O preço de oito anos
 * de eventos foi digitado evento a evento na planilha, e a tabela de preço
 * vigente existe como proposta. Enquanto ninguém a preencher, esta tela mostra
 * o que se vende sem conseguir dizer por quanto — e é melhor dizer isso do que
 * inventar um número.
 */

/** O desenho. Mantido inteiro. */
function CatalogoDesenhado() {
  const products = [
    { id: 1, name: "Pacote Essencial", type: "Pacote", price: "R$ 1.200", active: true },
    { id: 2, name: "Pacote Premium", type: "Pacote", price: "R$ 2.500", active: true },
    { id: 3, name: "Hora Extra Staff", type: "Adicional", price: "R$ 150/h", active: true },
    { id: 4, name: "Borda Recheada", type: "Adicional", price: "R$ 5/pessoa", active: false },
  ];

  return (
    <Moldura
      subtitulo="Gerencie os pacotes e itens adicionais do cardápio."
      linhas={products.map((p) => ({
        id: String(p.id),
        nome: p.name,
        tipo: p.type,
        preco: p.price,
        ativo: p.active,
        detalhe: null,
      }))}
    />
  );
}

interface ModeloRodizio {
  id: string;
  nome: string;
  horas_montagem: number | null;
  ativo: boolean;
  ordem: number | null;
}

interface ModeloForno {
  id: string;
  nome: string;
  ativo: boolean;
}

interface PrecoVigente {
  modelo_rodizio_id: string;
  preco: string | number;
  valida_de: string;
}

async function CatalogoDoBanco() {
  const sessao = await exigirPapel(["gestao"]);

  const [rodizios, fornos, precos] = await Promise.all([
    consultar<ModeloRodizio[]>(
      "modelo_rodizio?select=id,nome,horas_montagem,ativo,ordem&order=ordem.asc,nome.asc",
      sessao.accessToken,
    ),
    consultar<ModeloForno[]>(
      "modelo_forno?select=id,nome,ativo&order=nome.asc",
      sessao.accessToken,
    ),
    consultar<PrecoVigente[]>(
      "preco_vigencia?select=modelo_rodizio_id,preco,valida_de&order=valida_de.desc",
      sessao.accessToken,
    ),
  ]);

  const leituraRodizios = comoLeitura(rodizios);
  const leituraFornos = comoLeitura(fornos);

  /*
   * O preço vigente é o mais recente com `valida_de` já passada. Como a
   * consulta vem ordenada por data decrescente, o primeiro de cada modelo é o
   * que vale.
   */
  const hoje = new Date().toISOString().slice(0, 10);
  const precoDe = new Map<string, PrecoVigente>();
  for (const p of precos.dados ?? []) {
    if (p.valida_de <= hoje && !precoDe.has(p.modelo_rodizio_id)) {
      precoDe.set(p.modelo_rodizio_id, p);
    }
  }

  const itens: ItemDoCatalogo[] = [
    ...(leituraRodizios.estado === "ok" ? leituraRodizios.linhas : []).map((m) => {
      const preco = precoDe.get(m.id);
      return {
        id: m.id,
        tipo: "rodizio" as const,
        nome: m.nome,
        preco: preco ? Number(preco.preco) : null,
        ativo: m.ativo,
        detalhe: m.horas_montagem ? `${m.horas_montagem}h de montagem` : null,
      };
    }),
    ...(leituraFornos.estado === "ok" ? leituraFornos.linhas : []).map((f) => ({
      id: f.id,
      tipo: "forno" as const,
      nome: f.nome,
      preco: null,
      ativo: f.ativo,
      detalhe: null,
    })),
  ];

  const semPreco = precoDe.size === 0;

  return (
    <CatalogoEditavel
      subtitulo={`${itens.length} itens no catálogo do banco.`}
      itens={itens}
      hoje={hoje}
      aviso={
        semPreco
          ? "Nenhum preço vigente cadastrado. `preco_vigencia` está vazia — o valor de cada evento foi digitado evento a evento na planilha. Use a etiqueta ao lado de cada rodízio para gravar o primeiro preço."
          : null
      }
      erro={leituraRodizios.estado === "erro" ? leituraRodizios.motivo : null}
    />
  );
}

interface Linha {
  id: string;
  nome: string;
  tipo: string;
  preco: string;
  ativo: boolean;
  detalhe: string | null;
}

function Moldura({
  subtitulo,
  linhas,
  aviso,
  erro,
}: {
  subtitulo: string;
  linhas: Linha[];
  aviso?: string | null;
  erro?: string | null;
}) {
  return (
    <div className="flex flex-col gap-space-lg">
      <div className="flex flex-wrap justify-between items-center gap-space-md">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight">
            Catálogo e Preços
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            {subtitulo}
          </p>
        </div>
        <button
          type="button"
          className="h-10 px-4 rounded-lg bg-inverse-surface text-inverse-on-surface font-label-md text-label-md flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Novo Item
        </button>
      </div>

      {erro && (
        <p
          role="alert"
          className="font-body-md text-body-md text-primary bg-primary/10 rounded-xl p-space-md"
        >
          Não foi possível ler o catálogo: {erro}
        </p>
      )}

      {aviso && (
        <div className="flex items-start gap-space-sm bg-surface-container-low rounded-xl p-space-md">
          <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {aviso}
          </p>
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr>
                {["Item", "Tipo", "Preço", "Situação", ""].map((c) => (
                  <th
                    key={c}
                    className="px-space-md py-space-sm font-label-md text-label-md text-on-surface-variant whitespace-nowrap"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr
                  key={l.id}
                  className="border-t border-outline-variant/30 hover:bg-surface-container-low/50 transition-colors"
                >
                  <td className="px-space-md py-space-sm">
                    <span className="flex items-center gap-space-sm">
                      {l.tipo === "Forno" ? (
                        <Flame className="w-4 h-4 text-tertiary shrink-0" />
                      ) : (
                        <Utensils className="w-4 h-4 text-tertiary shrink-0" />
                      )}
                      <span className="flex flex-col">
                        <span className="font-label-md text-label-md text-on-surface">
                          {l.nome}
                        </span>
                        {l.detalhe && (
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            {l.detalhe}
                          </span>
                        )}
                      </span>
                    </span>
                  </td>
                  <td className="px-space-md py-space-sm font-body-md text-body-md text-on-surface-variant whitespace-nowrap">
                    {l.tipo}
                  </td>
                  <td className="px-space-md py-space-sm font-label-md text-label-md text-on-surface whitespace-nowrap">
                    {l.preco}
                  </td>
                  <td className="px-space-md py-space-sm whitespace-nowrap">
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-full font-label-sm text-label-sm",
                        l.ativo
                          ? "bg-tertiary-container text-on-tertiary-container"
                          : "bg-surface-container-high text-on-surface-variant",
                      )}
                    >
                      {l.ativo ? "ativo" : "inativo"}
                    </span>
                  </td>
                  <td className="px-space-md py-space-sm">
                    <span className="flex items-center gap-space-xs justify-end">
                      <button
                        type="button"
                        aria-label={`Editar ${l.nome}`}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remover ${l.nome}`}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export async function AdminCatalogView() {
  return (await fonteDeDados()) === "real" ? (
    <CatalogoDoBanco />
  ) : (
    <CatalogoDesenhado />
  );
}
