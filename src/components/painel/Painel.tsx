import type { ReactNode } from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * As peças que toda tela de operação repete.
 *
 * Existem para que oito telas não sejam oito cópias do mesmo cabeçalho com
 * variações acidentais de espaçamento — que foi exatamente o que aconteceu nas
 * telas herdadas, e o que obrigou a passar 180 substituições de cor depois.
 */

export function CabecalhoDoPainel({
  titulo,
  descricao,
  contagem,
  acoes,
}: {
  titulo: string;
  descricao: string;
  /** Mostrado ao lado do título. Número de linhas, quase sempre. */
  contagem?: number | null;
  acoes?: ReactNode;
}) {
  return (
    <header className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
      <div className="flex flex-col max-w-2xl min-w-0">
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight flex items-center gap-space-sm flex-wrap">
          {titulo}
          {contagem !== null && contagem !== undefined && (
            <span className="px-2.5 py-0.5 rounded-full bg-primary text-on-primary font-label-md text-label-md">
              {contagem.toLocaleString("pt-BR")}
            </span>
          )}
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          {descricao}
        </p>
      </div>
      {acoes && <div className="flex items-center gap-space-sm shrink-0">{acoes}</div>}
    </header>
  );
}

/**
 * O estado sem linha.
 *
 * Recebe o motivo, e não só "nada encontrado": a diferença entre "a tabela está
 * vazia porque ninguém migrou o financeiro" e "o filtro não achou" muda o que a
 * pessoa faz em seguida.
 */
export function SemLinhas({
  titulo,
  detalhe,
  acao,
}: {
  titulo: string;
  detalhe?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="bg-surface-container-low rounded-xl p-space-xl flex flex-col items-center text-center gap-space-sm">
      <span className="w-12 h-12 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center">
        <Inbox className="w-6 h-6" />
      </span>
      <span className="font-label-lg text-label-lg text-on-surface">{titulo}</span>
      {detalhe && (
        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">
          {detalhe}
        </p>
      )}
      {acao}
    </div>
  );
}

/** Falha de leitura. Nunca se confunde com lista vazia. */
export function FalhaDeLeitura({ motivo }: { motivo: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-space-sm bg-primary/10 rounded-xl p-space-md"
    >
      <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
      <div className="flex flex-col">
        <span className="font-label-md text-label-md text-on-surface">
          Não foi possível ler estes dados
        </span>
        <span className="font-body-sm text-body-sm text-on-surface-variant break-all">
          {motivo}
        </span>
      </div>
    </div>
  );
}

/**
 * Aviso de lacuna de modelagem.
 *
 * Usado onde a tela existe e o banco ainda não tem o que ela mostraria. Dizer
 * isso é mais útil do que preencher com o que houver por perto — e muito melhor
 * do que uma tela que parece funcionar e mente.
 */
export function LacunaDeDados({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-space-sm bg-surface-container-low rounded-xl p-space-md">
      <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
      <div className="flex flex-col gap-space-xs min-w-0">
        <span className="font-label-md text-label-md text-on-surface">{titulo}</span>
        <div className="font-body-sm text-body-sm text-on-surface-variant flex flex-col gap-space-xs">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Tabela com rolagem horizontal própria.
 *
 * O `overflow-x-auto` é obrigatório: sem ele, uma tabela larga empurra o corpo
 * da página e o layout inteiro ganha rolagem lateral no celular.
 */
export function Tabela({
  colunas,
  children,
}: {
  colunas: string[];
  children: ReactNode;
}) {
  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-low">
            <tr>
              {colunas.map((c, i) => (
                <th
                  key={c + i}
                  scope="col"
                  className="px-space-md py-space-sm font-label-md text-label-md text-on-surface-variant whitespace-nowrap"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export function Linha({ children }: { children: ReactNode }) {
  return (
    <tr className="border-t border-outline-variant/30 hover:bg-surface-container-low/50 transition-colors">
      {children}
    </tr>
  );
}

export function Celula({
  children,
  className,
  destaque,
}: {
  children: ReactNode;
  className?: string;
  destaque?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-space-md py-space-sm align-top",
        destaque
          ? "font-label-md text-label-md text-on-surface"
          : "font-body-md text-body-md text-on-surface-variant",
        className,
      )}
    >
      {children}
    </td>
  );
}

/** Etiqueta de estado. Cor por intenção, nunca por string crua. */
export function Etiqueta({
  children,
  tom = "neutro",
}: {
  children: ReactNode;
  tom?: "neutro" | "atencao" | "bom";
}) {
  return (
    <span
      className={cn(
        "inline-block px-2.5 py-0.5 rounded-full font-label-sm text-label-sm whitespace-nowrap",
        tom === "atencao" && "bg-primary/10 text-primary",
        tom === "bom" && "bg-tertiary-container text-on-tertiary-container",
        tom === "neutro" && "bg-surface-container-high text-on-surface-variant",
      )}
    >
      {children}
    </span>
  );
}
