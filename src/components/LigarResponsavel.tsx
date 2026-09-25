"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2, Search, Unlink, UserX } from "lucide-react";

import { cn } from "../lib/utils";
import { Paginacao } from "./painel/Paginacao";

/**
 * Ligar conta a responsável — o elo que faz "Minha rota" existir.
 *
 * A tela listava os 362 responsáveis e dizia, corretamente, que nenhum tinha
 * conta ligada. Só que não havia como ligar: a única saída era um UPDATE no
 * banco, à mão. Enquanto isso, quem trabalha em campo entrava no sistema e não
 * encontrava o próprio trabalho.
 *
 * **Nem todo responsável vai ter conta**, e isso não é pendência. A planilha
 * registrava também quem respondia pelo evento sem ser da casa. Por isso a
 * tela não trata "sem conta" como erro: a busca começa nos sem conta porque é
 * ali que está o trabalho, mas a lista inteira continua acessível.
 */

export interface ResponsavelParaLigar {
  id: string;
  nome: string;
  usuario_id: string | null;
  ativo: boolean;
}

export interface ContaDaOperacao {
  id: string;
  nome: string;
  email: string | null;
  papel: string;
}

interface PaginaResponsaveis {
  responsaveis: ResponsavelParaLigar[];
  total: number;
  semConta: number;
  porPagina: number;
}

export function LigarResponsavel({
  dadosIniciais,
  contas,
}: {
  dadosIniciais: PaginaResponsaveis;
  contas: ContaDaOperacao[];
}) {
  const router = useRouter();
  const [pendente, comecar] = useTransition();

  const [busca, setBusca] = useState("");
  const [soSemConta, setSoSemConta] = useState(true);
  const [pagina, setPagina] = useState(0);
  const [dados, setDados] = useState(dadosIniciais);
  const [carregando, setCarregando] = useState(false);
  const primeiraLeitura = useRef(true);
  const [emVoo, setEmVoo] = useState<string | null>(null);
  const [falha, setFalha] = useState<string | null>(null);

  useEffect(() => { setDados(dadosIniciais); }, [dadosIniciais]);

  useEffect(() => {
    if (primeiraLeitura.current) {
      primeiraLeitura.current = false;
      return;
    }
    const controlador = new AbortController();
    const temporizador = setTimeout(async () => {
      setCarregando(true);
      setFalha(null);
      try {
        const parametros = new URLSearchParams({ pagina: String(pagina), busca, semConta: soSemConta ? "1" : "0" });
        const resposta = await fetch(`/api/operacao/responsavel?${parametros}`, { signal: controlador.signal, cache: "no-store" });
        if (!resposta.ok) throw new Error("Não foi possível carregar os responsáveis.");
        const novosDados = await resposta.json() as PaginaResponsaveis;
        if (!controlador.signal.aborted) setDados(novosDados);
      } catch {
        if (!controlador.signal.aborted) setFalha("Não foi possível carregar os responsáveis.");
      } finally {
        if (!controlador.signal.aborted) setCarregando(false);
      }
    }, busca ? 250 : 0);
    return () => { clearTimeout(temporizador); controlador.abort(); };
  }, [busca, soSemConta, pagina]);

  const nomeDaConta = useMemo(() => {
    const m = new Map<string, ContaDaOperacao>();
    for (const c of contas) m.set(c.id, c);
    return m;
  }, [contas]);

  const visiveis = dados.responsaveis;

  async function ligar(responsavel: string, usuario: string) {
    setFalha(null);
    setEmVoo(responsavel);

    try {
      const r = await fetch("/api/operacao/responsavel", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ responsavel, usuario }),
      });

      if (!r.ok) {
        const detalhe = (await r.json().catch(() => ({}))) as { mensagem?: string };
        setFalha(detalhe.mensagem ?? "O servidor recusou a alteração.");
        return;
      }

      /*
       * `router.refresh()` e não estado local: a lista é do Server Component,
       * e manter uma segunda cópia aqui divergiria da primeira assim que outra
       * pessoa ligasse a mesma conta.
       */
      setBusca("");
      setSoSemConta(true);
      setPagina(0);
      comecar(() => router.refresh());
    } catch {
      setFalha("Falha de rede. A alteração não foi gravada.");
    } finally {
      setEmVoo(null);
    }
  }

  const ocupado = pendente || emVoo !== null;
  const semConta = dados.semConta;

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex flex-wrap items-center gap-space-sm">
        <div className="relative flex-1 min-w-[12rem]">
          <label htmlFor="busca-responsavel" className="sr-only">
            Buscar responsável pelo nome
          </label>
          <Search
            aria-hidden="true"
            className="absolute left-3 top-3 w-[18px] h-[18px] text-on-surface-variant"
          />
          <input
            id="busca-responsavel"
            type="search"
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPagina(0); }}
            placeholder="Buscar responsável pelo nome"
            className="w-full h-11 bg-surface-container-highest rounded-lg pl-9 pr-3 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <button
          type="button"
          onClick={() => { setSoSemConta((v) => !v); setPagina(0); }}
          aria-pressed={soSemConta}
          className={cn(
            "h-11 px-4 rounded-lg font-label-md text-label-md flex items-center gap-2 transition-colors",
            soSemConta
              ? "bg-primary text-on-primary"
              : "bg-surface-container text-on-surface hover:bg-surface-container-high",
          )}
        >
          <UserX className="w-4 h-4" />
          Só sem conta ({semConta})
        </button>
      </div>

      {falha && (
        <p
          role="alert"
          className="font-body-md text-body-md text-primary bg-primary/10 rounded-xl p-space-md"
        >
          {falha}
        </p>
      )}

      {carregando && <p role="status" className="text-sm text-on-surface-variant">Buscando responsáveis…</p>}

      {contas.length === 0 && (
        <p className="font-body-md text-body-md text-on-surface-variant bg-surface-container-low rounded-xl p-space-md">
          Nenhuma conta de operação para ligar. Promova alguém a{" "}
          <strong>staff</strong> em Equipe e acessos primeiro — conta de cliente
          não responde por evento.
        </p>
      )}

      <ul className="flex flex-col gap-space-xs">
        {visiveis.map((r) => {
          const conta = r.usuario_id ? nomeDaConta.get(r.usuario_id) : undefined;

          return (
            <li
              key={r.id}
              className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-wrap items-center justify-between gap-space-sm"
            >
              <span className="flex flex-col min-w-0">
                <span className="font-label-lg text-label-lg text-on-surface truncate">
                  {r.nome}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant inline-flex items-center gap-1.5">
                  {r.usuario_id ? (
                    <>
                      <Link2 className="w-4 h-4 text-tertiary shrink-0" />
                      {conta
                        ? `${conta.nome}${conta.email ? ` · ${conta.email}` : ""}`
                        : "ligada a uma conta fora desta lista"}
                    </>
                  ) : (
                    <>
                      <UserX className="w-4 h-4 shrink-0" />
                      sem conta
                    </>
                  )}
                  {!r.ativo && " · inativo"}
                </span>
              </span>

              <span className="flex items-center gap-space-xs">
                <label className="sr-only" htmlFor={`conta-${r.id}`}>
                  Conta de {r.nome}
                </label>
                <select
                  id={`conta-${r.id}`}
                  value={r.usuario_id ?? ""}
                  disabled={ocupado || contas.length === 0}
                  onChange={(e) => void ligar(r.id, e.target.value)}
                  className="h-10 px-3 rounded-lg bg-surface-container-highest font-body-md text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 max-w-[16rem]"
                >
                  <option value="">sem conta</option>
                  {contas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.papel})
                    </option>
                  ))}
                </select>

                {r.usuario_id && (
                  <button
                    type="button"
                    disabled={ocupado}
                    aria-label={`Desligar a conta de ${r.nome}`}
                    title="Desligar"
                    onClick={() => void ligar(r.id, "")}
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-40"
                  >
                    <Unlink className="w-4 h-4" />
                  </button>
                )}

                {emVoo === r.id && (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                )}
              </span>
            </li>
          );
        })}

        {!carregando && visiveis.length === 0 && (
          <li className="font-body-md text-body-md text-on-surface-variant bg-surface-container-low rounded-xl p-space-md text-center">
            Nenhum responsável{soSemConta ? " sem conta" : ""}
            {busca ? " com esse nome" : ""}.
          </li>
        )}
      </ul>

      <Paginacao pagina={pagina + 1} total={dados.total} porPagina={dados.porPagina} onPagina={numero => setPagina(numero - 1)} rotulo="Páginas de responsáveis" />
    </div>
  );
}
