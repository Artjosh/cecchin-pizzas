"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Flame,
  Plus,
  Power,
  Tag,
  Utensils,
  X,
} from "lucide-react";

import { cn } from "../lib/utils";
import { formatBRL } from "../lib/moeda";

/**
 * O catálogo, com os botões fazendo o que prometem.
 *
 * **O que havia antes.** Três botões desenhados — `Novo Item`, um lápis e uma
 * lixeira — sem `onClick`. Sobre o desenho era honesto; sobre o banco, a tela
 * convidava a mexer no catálogo e não mexia em nada.
 *
 * **Por que não há lixeira.** `evento` referencia `modelo_rodizio` e
 * `modelo_forno` com `on delete restrict`, e oito anos de eventos apontam para
 * eles. Apagar um modelo em uso é impossível no banco, e apagar um sem uso
 * reescreveria o histórico no dia em que passar a ter. Desligar tira o item da
 * contratação e preserva o que já foi vendido — é a operação que a operação
 * realmente quer.
 *
 * **Por que o preço tem data.** `preco_vigencia` guarda `valida_de`, então
 * mudar o preço não reescreve o passado: o evento fechado mês passado continua
 * valendo o que valia. O formulário abre com hoje e aceita data futura, que é
 * como se anuncia reajuste sem mexer no preço de agora.
 */

export interface ItemDoCatalogo {
  id: string;
  tipo: "rodizio" | "forno";
  nome: string;
  preco: number | null;
  ativo: boolean;
  detalhe: string | null;
}

const ROTULO: Record<ItemDoCatalogo["tipo"], string> = {
  rodizio: "Rodízio",
  forno: "Forno",
};

interface Falha {
  onde: string;
  mensagem: string;
}

async function mandar(
  caminho: string,
  metodo: "POST" | "PATCH",
  corpo: Record<string, unknown>,
): Promise<string | null> {
  try {
    const r = await fetch(caminho, {
      method: metodo,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corpo),
    });

    if (r.ok) return null;

    const detalhe = (await r.json().catch(() => ({}))) as { mensagem?: string };
    return detalhe.mensagem ?? "O servidor recusou a alteração.";
  } catch {
    return "Falha de rede. A alteração não foi gravada.";
  }
}

export function CatalogoEditavel({
  itens,
  subtitulo,
  aviso,
  erro,
  hoje,
}: {
  itens: ItemDoCatalogo[];
  subtitulo: string;
  aviso?: string | null;
  erro?: string | null;
  hoje: string;
}) {
  const router = useRouter();
  const [pendente, comecar] = useTransition();

  const [criando, setCriando] = useState(false);
  const [precificando, setPrecificando] = useState<string | null>(null);
  const [falha, setFalha] = useState<Falha | null>(null);
  const [emVoo, setEmVoo] = useState<string | null>(null);

  /*
   * Depois de gravar, `router.refresh()` faz o Server Component consultar o
   * banco de novo. Guardar a lista num estado local aqui e alterá-la à mão
   * criaria uma segunda verdade, que diverge da primeira no instante em que
   * outra pessoa mexer no mesmo item.
   */
  function recarregar() {
    comecar(() => router.refresh());
  }

  async function alternarAtivo(item: ItemDoCatalogo) {
    setFalha(null);
    setEmVoo(item.id);

    const problema = await mandar("/api/catalogo", "PATCH", {
      tipo: item.tipo,
      id: item.id,
      ativo: !item.ativo,
    });

    setEmVoo(null);
    if (problema) {
      setFalha({ onde: item.nome, mensagem: problema });
      return;
    }
    recarregar();
  }

  const ocupado = pendente || emVoo !== null;

  /*
   * Os dois botões de ação, iguais no cartão do celular e na linha da tabela.
   * Função e não componente: um componente definido aqui dentro nasce com
   * identidade nova a cada render e o React remonta a subárvore inteira.
   */
  function acoesDe(item: ItemDoCatalogo) {
    return (
      <>
        {item.tipo === "rodizio" && (
          <button
            type="button"
            disabled={ocupado}
            aria-label={`Definir preço de ${item.nome}`}
            title="Definir preço"
            onClick={() => {
              setFalha(null);
              setPrecificando((v) => (v === item.id ? null : item.id));
            }}
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40",
              precificando === item.id
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
            )}
          >
            <Tag className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          disabled={ocupado}
          aria-label={`${item.ativo ? "Desligar" : "Ligar"} ${item.nome}`}
          title={
            item.ativo
              ? "Desligar: some da contratação, o histórico fica"
              : "Ligar: volta a aparecer na contratação"
          }
          onClick={() => void alternarAtivo(item)}
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40",
            item.ativo
              ? "text-on-surface-variant hover:bg-primary/10 hover:text-primary"
              : "text-on-surface-variant hover:bg-tertiary-container hover:text-on-tertiary-container",
          )}
        >
          <Power className="w-4 h-4" />
        </button>
      </>
    );
  }

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
          onClick={() => {
            setFalha(null);
            setCriando((v) => !v);
          }}
          aria-expanded={criando}
          className="h-10 px-4 rounded-lg bg-inverse-surface text-inverse-on-surface font-label-md text-label-md flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          {criando ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {criando ? "Cancelar" : "Novo item"}
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

      {falha && (
        <p
          role="alert"
          className="font-body-md text-body-md text-primary bg-primary/10 rounded-xl p-space-md"
        >
          <strong>{falha.onde}</strong>: {falha.mensagem}
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

      {criando && (
        <FormularioDeItem
          aoGravar={() => {
            setCriando(false);
            recarregar();
          }}
          aoFalhar={(m) => setFalha({ onde: "Novo item", mensagem: m })}
        />
      )}


      {/*
        O formulário de preço abre AQUI, logo abaixo do cabeçalho, e não no fim
        da página. Ele nasceu embaixo da tabela e, com treze linhas, quem
        clicava na etiqueta da primeira via a tela não mudar — o formulário
        estava a uma rolagem inteira de distância.
      */}
      {precificando && (
        <FormularioDePreco
          item={itens.find((i) => i.id === precificando) ?? null}
          hoje={hoje}
          aoFechar={() => setPrecificando(null)}
          aoGravar={() => {
            setPrecificando(null);
            recarregar();
          }}
          aoFalhar={(m) =>
            setFalha({
              onde: itens.find((i) => i.id === precificando)?.nome ?? "Preço",
              mensagem: m,
            })
          }
        />
      )}

      {/*
        Duas formas da mesma lista.
        
        A tabela num celular de 390px vira rolagem horizontal, e a coluna do
        NOME é a primeira a sair de vista: sobra "Rodízio — ativo" em todas as
        linhas, que não identifica nada. No celular cada item é um cartão.
      */}
      <ul className="flex flex-col gap-space-sm md:hidden">
        {itens.map((item) => (
          <li
            key={item.id}
            className={cn(
              "bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-col gap-space-sm",
              !item.ativo && "opacity-70",
            )}
          >
            <div className="flex items-start justify-between gap-space-sm">
              <span className="flex items-start gap-space-sm min-w-0">
                {item.tipo === "forno" ? (
                  <Flame className="w-4 h-4 text-tertiary shrink-0 mt-1" />
                ) : (
                  <Utensils className="w-4 h-4 text-tertiary shrink-0 mt-1" />
                )}
                <span className="flex flex-col min-w-0">
                  <span className="font-label-lg text-label-lg text-on-surface">
                    {item.nome}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {[ROTULO[item.tipo], item.detalhe].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </span>
              <span
                className={cn(
                  "px-2.5 py-1 rounded-full font-label-sm text-label-sm shrink-0",
                  item.ativo
                    ? "bg-tertiary-container text-on-tertiary-container"
                    : "bg-surface-container-high text-on-surface-variant",
                )}
              >
                {item.ativo ? "ativo" : "inativo"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-space-sm">
              <span className="font-label-md text-label-md text-on-surface">
                {item.tipo === "forno"
                  ? "incluso"
                  : item.preco === null
                    ? "sem preço"
                    : formatBRL(item.preco)}
              </span>
              <span className="flex items-center gap-space-xs">{acoesDe(item)}</span>
            </div>
          </li>
        ))}

        {itens.length === 0 && (
          <li className="font-body-md text-body-md text-on-surface-variant bg-surface-container-low rounded-xl p-space-md text-center">
            Nenhum item no catálogo.
          </li>
        )}
      </ul>

      <div className="hidden md:block bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr>
                {["Item", "Tipo", "Preço", "Situação", "Ações"].map((c) => (
                  <th
                    key={c}
                    className={cn(
                      "px-space-md py-space-sm font-label-md text-label-md text-on-surface-variant whitespace-nowrap",
                      c === "Ações" && "text-right",
                    )}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr
                  key={item.id}
                  className={cn(
                    "border-t border-outline-variant/30 hover:bg-surface-container-low/50 transition-colors",
                    !item.ativo && "opacity-70",
                  )}
                >
                  <td className="px-space-md py-space-sm">
                    <span className="flex items-center gap-space-sm">
                      {item.tipo === "forno" ? (
                        <Flame className="w-4 h-4 text-tertiary shrink-0" />
                      ) : (
                        <Utensils className="w-4 h-4 text-tertiary shrink-0" />
                      )}
                      <span className="flex flex-col">
                        <span className="font-label-md text-label-md text-on-surface">
                          {item.nome}
                        </span>
                        {item.detalhe && (
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            {item.detalhe}
                          </span>
                        )}
                      </span>
                    </span>
                  </td>
                  <td className="px-space-md py-space-sm font-body-md text-body-md text-on-surface-variant whitespace-nowrap">
                    {ROTULO[item.tipo]}
                  </td>
                  <td className="px-space-md py-space-sm font-label-md text-label-md text-on-surface whitespace-nowrap">
                    {item.tipo === "forno"
                      ? "incluso"
                      : item.preco === null
                        ? "—"
                        : formatBRL(item.preco)}
                  </td>
                  <td className="px-space-md py-space-sm whitespace-nowrap">
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-full font-label-sm text-label-sm",
                        item.ativo
                          ? "bg-tertiary-container text-on-tertiary-container"
                          : "bg-surface-container-high text-on-surface-variant",
                      )}
                    >
                      {item.ativo ? "ativo" : "inativo"}
                    </span>
                  </td>
                  <td className="px-space-md py-space-sm">
                    <span className="flex items-center gap-space-xs justify-end">
                      {acoesDe(item)}
                    </span>
                  </td>
                </tr>
              ))}

              {itens.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-space-md py-space-lg font-body-md text-body-md text-on-surface-variant text-center"
                  >
                    Nenhum item no catálogo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Criar rodízio ou forno. Nome é tudo que o banco exige além da organização. */
function FormularioDeItem({
  aoGravar,
  aoFalhar,
}: {
  aoGravar: () => void;
  aoFalhar: (mensagem: string) => void;
}) {
  const [tipo, setTipo] = useState<"rodizio" | "forno">("rodizio");
  const [nome, setNome] = useState("");
  const [horas, setHoras] = useState("1");
  const [gravando, setGravando] = useState(false);

  async function gravar(evento: React.FormEvent) {
    evento.preventDefault();
    setGravando(true);

    const problema = await mandar("/api/catalogo", "POST", {
      tipo,
      nome,
      ...(tipo === "rodizio" ? { horas_montagem: Number(horas) } : {}),
    });

    setGravando(false);
    if (problema) {
      aoFalhar(problema);
      return;
    }
    setNome("");
    aoGravar();
  }

  return (
    <form
      onSubmit={(e) => void gravar(e)}
      className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md"
    >
      <div className="flex flex-wrap gap-space-md">
        <label className="flex flex-col gap-1 min-w-[9rem]">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Tipo
          </span>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as "rodizio" | "forno")}
            className="h-11 px-3 rounded-lg bg-surface-container-highest font-body-md text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="rodizio">Rodízio</option>
            <option value="forno">Forno</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 flex-1 min-w-[12rem]">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Nome
          </span>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            minLength={2}
            maxLength={80}
            placeholder={tipo === "rodizio" ? "Rodízio Premium 4h" : "Forno a lenha"}
            className="h-11 px-3 rounded-lg bg-surface-container-highest font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>

        {tipo === "rodizio" && (
          <label className="flex flex-col gap-1 w-36">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Horas de montagem
            </span>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="12"
              value={horas}
              onChange={(e) => setHoras(e.target.value)}
              className="h-11 px-3 rounded-lg bg-surface-container-highest font-body-md text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
        )}
      </div>

      <button
        type="submit"
        disabled={gravando || nome.trim().length < 2}
        className="h-11 px-5 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg flex items-center gap-2 w-fit hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        <Check className="w-4 h-4" />
        {gravando ? "Gravando..." : "Criar item"}
      </button>
    </form>
  );
}

/**
 * Preço com data de início.
 *
 * `valida_de` começa em hoje, vindo do servidor como prop. Calcular a data aqui
 * com `new Date()` divergiria entre o HTML do servidor e o primeiro render do
 * cliente, e a hidratação quebra.
 */
function FormularioDePreco({
  item,
  hoje,
  aoFechar,
  aoGravar,
  aoFalhar,
}: {
  item: ItemDoCatalogo | null;
  hoje: string;
  aoFechar: () => void;
  aoGravar: () => void;
  aoFalhar: (mensagem: string) => void;
}) {
  const [preco, setPreco] = useState(item?.preco != null ? String(item.preco) : "");
  const [validaDe, setValidaDe] = useState(hoje);
  const [gravando, setGravando] = useState(false);

  if (!item) return null;

  async function gravar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!item) return;
    setGravando(true);

    const problema = await mandar("/api/catalogo/preco", "POST", {
      modelo: item.id,
      preco: Number(preco.replace(",", ".")),
      valida_de: validaDe,
    });

    setGravando(false);
    if (problema) {
      aoFalhar(problema);
      return;
    }
    aoGravar();
  }

  return (
    <form
      onSubmit={(e) => void gravar(e)}
      className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md"
    >
      <div className="flex items-start justify-between gap-space-md">
        <div className="flex flex-col">
          <span className="font-label-lg text-label-lg text-on-surface">
            Preço de {item.nome}
          </span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            O preço antigo continua valendo para os eventos já fechados.
          </span>
        </div>
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-space-md">
        <label className="flex flex-col gap-1 w-44">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Preço por pessoa (R$)
          </span>
          <input
            inputMode="decimal"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            required
            placeholder="89,90"
            className="h-11 px-3 rounded-lg bg-surface-container-highest font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>

        <label className="flex flex-col gap-1 w-48">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Vale a partir de
          </span>
          <input
            type="date"
            value={validaDe}
            onChange={(e) => setValidaDe(e.target.value)}
            required
            className="h-11 px-3 rounded-lg bg-surface-container-highest font-body-md text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={gravando || !preco.trim()}
        className="h-11 px-5 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg flex items-center gap-2 w-fit hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        <Check className="w-4 h-4" />
        {gravando ? "Gravando..." : "Gravar preço"}
      </button>
    </form>
  );
}
