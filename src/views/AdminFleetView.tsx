import React from 'react';
import { Truck, PenTool as Tool, AlertTriangle, Plus } from 'lucide-react';
import { exigirPapel } from "../servidor/auth/guarda";
import { consultar } from "../servidor/supabase";
import { comoLeitura, fonteDeDados } from "../servidor/fonte";

/** O desenho. Mantido inteiro: descreve o que a operação quer registrar. */
function FrotaDesenhada() {
  const fleet = [
    { id: 'F01', type: 'Forno Móvel', status: 'operacional', lastMaintenance: '10/08/2026' },
    { id: 'F02', type: 'Forno Móvel', status: 'manutencao', lastMaintenance: '05/09/2026' },
    { id: 'V01', type: 'Fiorino', status: 'operacional', lastMaintenance: '20/08/2026' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Frotas e Fornos</h1>
          <p className="text-on-surface-variant mt-1">Controle de ativos físicos e manutenções.</p>
        </div>
        <button className="bg-inverse-surface text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-inverse-surface transition-colors">
          <Plus className="w-4 h-4" />
          Adicionar Ativo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {fleet.map(item => (
          <div key={item.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 p-6 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-surface-container rounded-lg">
                {item.type.includes('Forno') ? <Tool className="w-6 h-6 text-on-surface" /> : <Truck className="w-6 h-6 text-on-surface" />}
              </div>
              <span className={`px-2.5 py-1 text-xs font-bold rounded-full flex items-center gap-1 ${
                item.status === 'operacional' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {item.status === 'manutencao' && <AlertTriangle className="w-3 h-3" />}
                {item.status.toUpperCase()}
              </span>
            </div>
            
            <h3 className="text-xl font-bold text-on-surface mb-1">{item.id}</h3>
            <p className="text-on-surface-variant text-sm mb-4">{item.type}</p>
            
            <div className="mt-auto pt-4 border-t border-outline-variant/30 flex justify-between items-center text-sm">
              <span className="text-on-surface-variant">Última Revisão:</span>
              <span className="font-medium text-on-surface">{item.lastMaintenance}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===========================================================================
 * O QUE O BANCO TEM — E O QUE NÃO TEM
 *
 * Esta tela não pode ser ligada, e dizer isso é mais útil do que preencher com
 * o que houver por perto.
 *
 * O desenho fala de ATIVOS: "F01 Forno Móvel, manutenção em 10/08". O banco
 * tem `modelo_forno`, que é catálogo de TIPO — Gás, Elétrico 220V, Elétrico
 * 110V. Três linhas que descrevem categoria, não equipamento.
 *
 * Entre uma coisa e outra falta: identidade do ativo, histórico de manutenção,
 * a quem está alocado hoje, e veículo — que não existe em tabela nenhuma. Oito
 * anos de planilha nunca registraram isso; a frota vive na cabeça de quem
 * opera.
 *
 * Mostrar os três modelos com "operacional" inventado ao lado seria pior do
 * que a tela vazia: alguém acreditaria.
 * ======================================================================== */

interface ModeloDeForno {
  id: string;
  nome: string;
  ativo: boolean;
}

async function FrotaDoBanco() {
  const sessao = await exigirPapel(["gestao"]);

  const leitura = comoLeitura(
    await consultar<ModeloDeForno[]>(
      "modelo_forno?select=id,nome,ativo&order=nome.asc",
      sessao.accessToken,
    ),
  );

  return (
    <div className="flex flex-col gap-space-lg">
      <div className="flex flex-wrap justify-between items-center gap-space-md">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight">
            Frotas e Fornos
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Controle de ativos físicos e manutenções.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-space-sm bg-surface-container-low rounded-xl p-space-md">
        <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="flex flex-col gap-space-xs">
          <span className="font-label-md text-label-md text-on-surface">
            Não há ativo cadastrado no banco
          </span>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            O banco tem <strong>modelo de forno</strong> — o tipo que se oferece
            ao cliente —, não o equipamento físico. Falta identidade do ativo,
            histórico de manutenção, alocação do dia e a frota de veículos, que
            não existe em tabela nenhuma.
          </p>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Oito anos de planilha nunca registraram isso: a frota vive na cabeça
            de quem opera. Modelar é decisão de negócio, não de código — ver
            <code className="font-mono"> modelagem/docs/07-perguntas.md</code>.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-space-sm">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          O que existe: modelos de forno
        </h2>

        {leitura.estado === "erro" && (
          <p
            role="alert"
            className="font-body-md text-body-md text-primary bg-primary/10 rounded-xl p-space-md"
          >
            Não foi possível ler os modelos: {leitura.motivo}
          </p>
        )}

        {leitura.estado === "vazio" && (
          <p className="font-body-md text-body-md text-on-surface-variant bg-surface-container-low rounded-xl p-space-md">
            Nenhum modelo de forno cadastrado.
          </p>
        )}

        {leitura.estado === "ok" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
            {leitura.linhas.map((m) => (
              <div
                key={m.id}
                className="bg-surface-container-lowest rounded-xl p-space-md flex items-center gap-space-sm shadow-sm"
              >
                <span className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-md text-label-md text-on-surface truncate">
                    {m.nome}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {m.ativo ? "oferecido" : "fora de linha"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export async function AdminFleetView() {
  return (await fonteDeDados()) === "real" ? (
    <FrotaDoBanco />
  ) : (
    <FrotaDesenhada />
  );
}
