import {AuditoriaTabela,type Registro} from "../components/painel/TabelasOperacionais";
import Link from "next/link";
import { History } from "lucide-react";

import {
  CabecalhoDoPainel,
  FalhaDeLeitura,
  SemLinhas,
} from "../components/painel/Painel";
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



const TABELAS = ["evento", "cliente", "entrada", "usuario", "responsavel"];

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
          <AuditoriaTabela linhas={linhas}/>

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
