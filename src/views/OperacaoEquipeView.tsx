import {PreCadastrosEquipe} from "../components/equipe/PreCadastrosEquipe";
import Link from "next/link";
import {EquipeOperacao} from "../components/equipe/EquipeOperacao";
import {fonteDeDados} from "../servidor/fonte";
import { BadgeCheck } from "lucide-react";

import {
  LigarResponsavel,
  type ContaDaOperacao,
} from "../components/LigarResponsavel";
import { buscarResponsaveisOperacao } from "../servidor/responsaveis-operacao";

import {
  CabecalhoDoPainel,
  Celula,
  Etiqueta,
  FalhaDeLeitura,
  LacunaDeDados,
  Linha,
  SemLinhas,
  Tabela,
} from "../components/painel/Painel";
import { exigirPapel } from "../servidor/auth/guarda";
import { consultar } from "../servidor/supabase";

/**
 * Quem opera: os responsáveis históricos e os funcionários.
 *
 * Diferente de `/admin/equipe`, que trata de CONTAS e papéis. Aqui é a
 * operação: quem leva o forno, quem assina o evento.
 *
 * `responsavel` e `funcionario` são tabelas separadas de propósito
 * (`DECISOES.md` §13): a planilha registrava o nome de quem respondia pelo
 * evento, que nem sempre era funcionário da casa — às vezes era o dono da
 * festa, às vezes um parceiro.
 *
 * `responsavel.usuario_id` é o elo com a conta. Quando preenchido, "Minha rota"
 * consegue mostrar os eventos daquela pessoa; sem ele, ela entra no sistema e
 * não encontra o próprio trabalho.
 */

interface Funcionario {
  id: string;
  nome: string;
  ativo: boolean;
}

async function VinculosOperacao() {
  const sessao = await exigirPapel(["gestao"]);

  const [responsaveisR, funcionariosR, contasR] = await Promise.all([
    buscarResponsaveisOperacao(sessao.accessToken, 0, "", true),
    consultar<Funcionario[]>(
      "funcionario?select=id,nome,ativo&order=nome.asc&limit=500",
      sessao.accessToken,
    ),
    /*
     * Só contas de operação entram na lista de escolha. Cliente não responde
     * por evento — `app.ligar_responsavel()` recusa, e oferecer no `select` o
     * que o banco vai negar é convite a erro.
     */
    consultar<ContaDaOperacao[]>(
      "usuario?select=id,nome,email,papel&papel=in.(staff,gestao,admin)" +
        "&ativo=is.true&order=nome.asc&limit=500",
      sessao.accessToken,
    ),
  ]);

  const funcionarios = funcionariosR.dados ?? [];
  const contas = contasR.dados ?? [];

  return (
    <div className="flex flex-col gap-space-lg">
      <CabecalhoDoPainel
        titulo="Equipe de operação"
        descricao="Quem responde pelos eventos. Papéis e contas ficam em Equipe e acessos."
        contagem={responsaveisR.ok ? responsaveisR.totalGeral : null}
      />

      {responsaveisR.ok && responsaveisR.semConta > 0 && (
        <LacunaDeDados titulo={`${responsaveisR.semConta} responsáveis sem conta ligada`}>
          <p>
            <code className="font-mono">responsavel.usuario_id</code> é o elo
            entre quem aparece na agenda e quem entra no sistema. Sem ele, a
            pessoa faz login e <strong>não encontra o próprio trabalho</strong>{" "}
            em Minha rota.
          </p>
          <p>
            Os responsáveis históricos vieram da planilha, onde só havia o nome. Ligue abaixo, um a
            um: só quem já tem conta de operação aparece na lista, porque
            cliente não responde por evento.
          </p>
          <p>
            <strong>Nem todos vão ter conta</strong>, e isso não é pendência: a
            planilha registrava também quem respondia pelo evento sem ser da
            casa.
          </p>
        </LacunaDeDados>
      )}

      <section className="flex flex-col gap-space-sm">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Responsáveis
        </h2>

        {!responsaveisR.ok && (
          <FalhaDeLeitura motivo="Não foi possível carregar os responsáveis." />
        )}

        {responsaveisR.ok && responsaveisR.totalGeral === 0 && (
          <SemLinhas
            titulo="Nenhum responsável"
            detalhe="Vêm da carga da planilha, da coluna Responsável."
          />
        )}

        {responsaveisR.ok && (
          <LigarResponsavel
            dadosIniciais={responsaveisR}
            contas={contas}
          />
        )}
      </section>

      <section className="flex flex-col gap-space-sm">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Funcionários
        </h2>

        {funcionarios.length === 0 ? (
          <SemLinhas
            titulo="Nenhum funcionário cadastrado"
            detalhe="A tabela existe e está vazia: a folha da planilha ficou de fora da primeira carga."
          />
        ) : (
          <Tabela colunas={["Nome", "Situação"]}>
            {funcionarios.map((f) => (
              <Linha key={f.id}>
                <Celula destaque>
                  <span className="flex items-center gap-1.5">
                    <BadgeCheck className="w-4 h-4 text-tertiary shrink-0" />
                    {f.nome}
                  </span>
                </Celula>
                <Celula>
                  <Etiqueta tom={f.ativo ? "bom" : "neutro"}>
                    {f.ativo ? "ativo" : "inativo"}
                  </Etiqueta>
                </Celula>
              </Linha>
            ))}
          </Tabela>
        )}
      </section>
    </div>
  );
}

export async function OperacaoEquipeView({vinculos=false}:{vinculos?:boolean}={}){await exigirPapel(["gestao"]);const demo=(await fonteDeDados())==="mock";if(vinculos&&!demo)return <div className="space-y-4"><Link href="/admin/operacao" className="text-sm text-primary">Voltar aos integrantes</Link><PreCadastrosEquipe/><VinculosOperacao/></div>;return <EquipeOperacao demo={demo}/>;}
