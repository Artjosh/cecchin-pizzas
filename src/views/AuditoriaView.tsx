import Link from "next/link";
import { History } from "lucide-react";

import {
  CabecalhoDoPainel,
  Celula,
  Etiqueta,
  FalhaDeLeitura,
  Linha,
  SemLinhas,
  Tabela,
} from "../components/painel/Painel";
import { comoMomento } from "../lib/formato";
import { exigirPapel } from "../servidor/auth/guarda";
import { consultar } from "../servidor/supabase";
import { comoLeitura } from "../servidor/fonte";

/**
 * As 22.762 linhas de auditoria — a maior tabela do banco.
 *
 * Guarda campo a campo o que mudou, quem mudou e de onde veio a mudança. É o
 * que a planilha nunca teve: lá, quem tinha o link editava qualquer célula sem
 * deixar rastro.
 *
 * `frase` é a versão legível do par antes/depois, montada no gatilho. Existe
 * porque ninguém audita lendo `valor_anterior` e `valor_novo` em colunas
 * separadas — audita lendo "mudou o horário de 20:00 para 21:30".
 */

interface Registro {
  id: string;
  momento: string;
  tabela: string;
  registro_id: string | null;
  operacao: string;
  campo: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  autor: string | null;
  origem: string | null;
  frase: string | null;
}

const TABELAS = ["evento", "cliente", "entrada", "usuario", "responsavel"];

/** O gatilho grava em minúscula (`insert`, `update`, `delete`). */
function tomDaOperacao(op: string): "neutro" | "atencao" | "bom" {
  const o = op.toLowerCase();
  if (o === "delete") return "atencao";
  if (o === "insert") return "bom";
  return "neutro";
}

export async function AuditoriaView({
  tabela,
}: {
  tabela: string | null;
}) {
  const sessao = await exigirPapel(["gestao"]);

  const filtro = tabela ? `&tabela=eq.${encodeURIComponent(tabela)}` : "";

  const leitura = comoLeitura(
    await consultar<Registro[]>(
      "auditoria?select=id,momento,tabela,registro_id,operacao,campo," +
        "valor_anterior,valor_novo,autor,origem,frase" +
        filtro +
        "&order=momento.desc&limit=200",
      sessao.accessToken,
    ),
  );

  const linhas = leitura.estado === "ok" ? leitura.linhas : [];

  return (
    <div className="flex flex-col gap-space-lg">
      <CabecalhoDoPainel
        titulo="Auditoria"
        descricao="Campo a campo: o que mudou, quando, por quem e de onde."
        contagem={leitura.estado === "ok" ? linhas.length : null}
      />

      <nav className="flex items-center gap-space-xs flex-wrap">
        <Filtro rotulo="Tudo" para="/admin/auditoria" ativo={!tabela} />
        {TABELAS.map((t) => (
          <Filtro
            key={t}
            rotulo={t}
            para={`/admin/auditoria?tabela=${t}`}
            ativo={tabela === t}
          />
        ))}
      </nav>

      {leitura.estado === "erro" && <FalhaDeLeitura motivo={leitura.motivo} />}

      {leitura.estado === "vazio" && (
        <SemLinhas
          titulo="Nenhum registro"
          detalhe={
            tabela
              ? `Nada foi alterado em ${tabela}.`
              : "A auditoria começa a gravar na primeira escrita depois da carga."
          }
        />
      )}

      {leitura.estado === "ok" && (
        <>
          <Tabela colunas={["Quando", "Tabela", "Operação", "O que mudou", "Quem", ""]}>
            {linhas.map((r) => (
              <Linha key={r.id}>
                <Celula className="whitespace-nowrap">
                  {comoMomento(r.momento)}
                </Celula>
                <Celula>
                  <span className="font-mono">{r.tabela}</span>
                </Celula>
                <Celula>
                  <Etiqueta tom={tomDaOperacao(r.operacao)}>
                    {r.operacao.toLowerCase()}
                  </Etiqueta>
                </Celula>
                <Celula destaque>
                  {r.frase ?? (
                    <span className="flex flex-col gap-0.5">
                      <span>{r.campo ?? "—"}</span>
                      {(r.valor_anterior || r.valor_novo) && (
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          <span className="line-through">
                            {r.valor_anterior ?? "vazio"}
                          </span>
                          {" → "}
                          {r.valor_novo ?? "vazio"}
                        </span>
                      )}
                    </span>
                  )}
                </Celula>
                <Celula>
                  <span className="flex flex-col">
                    <span>{r.autor ?? "—"}</span>
                    {r.origem && (
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {r.origem}
                      </span>
                    )}
                  </span>
                </Celula>
                <Celula className="text-right">
                  {r.tabela === "evento" && r.registro_id && (
                    <Link
                      href={`/operacional/eventos/${r.registro_id}`}
                      className="font-label-md text-label-md text-primary hover:opacity-80"
                    >
                      Abrir
                    </Link>
                  )}
                </Celula>
              </Linha>
            ))}
          </Tabela>

          {linhas.length === 200 && (
            <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-space-xs">
              <History className="w-4 h-4" />
              Mostrando as 200 mais recentes. Filtre por tabela para estreitar.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Filtro({
  rotulo,
  para,
  ativo,
}: {
  rotulo: string;
  para: string;
  ativo: boolean;
}) {
  return (
    <Link
      href={para}
      aria-current={ativo ? "page" : undefined}
      className={
        "h-9 px-3 rounded-full font-label-md text-label-md flex items-center transition-colors " +
        (ativo
          ? "bg-primary text-on-primary"
          : "bg-surface-container text-on-surface hover:bg-surface-container-high")
      }
    >
      {rotulo}
    </Link>
  );
}
