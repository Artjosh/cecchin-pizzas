import { TituloNoHeader } from "@/src/components/layouts/TituloNoHeader";
import { CadastroVeiculos, type Veiculo } from "@/src/components/frota/CadastroVeiculos";
import { exigirPapel } from "../servidor/auth/guarda";
import { consultar } from "../servidor/supabase";

export async function AdminFleetView() {
  const sessao = await exigirPapel(["gestao"]);
  const [veiculos, pessoas] = await Promise.all([
    consultar<Veiculo[]>("veiculo_operacional?select=id,placa,modelo,carroceria,forno_maximo,bebida_maxima,lugares,limite_eventos_levar,proprietario_id,ativo&order=modelo.asc&limit=200", sessao.accessToken),
    consultar<{ id: string; nome: string }[]>("usuario?select=id,nome&ativo=eq.true&papel=in.(staff,gestao,admin)&order=nome.asc&limit=300", sessao.accessToken),
  ]);
  return <div className="space-y-5"><header><TituloNoHeader className="font-headline-md text-headline-md">Frota</TituloNoHeader><p className="text-sm text-on-surface-variant">Veículos da empresa e particulares, capacidade de carga e disponibilidade por dia.</p></header>
    {!veiculos.ok || !pessoas.ok ? <p role="alert" className="rounded-xl bg-error-container p-4 text-on-error-container">Não foi possível carregar a frota. Confira a migration de veículos e o acesso ao banco.</p> : <CadastroVeiculos veiculos={veiculos.dados ?? []} pessoas={pessoas.dados ?? []} />}
  </div>;
}
