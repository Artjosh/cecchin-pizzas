import { MarketingPainel } from "@/src/components/marketing/MarketingPainel";
import { exigirPapel } from "@/src/servidor/auth/guarda";
import { consultar } from "@/src/servidor/supabase";

export const metadata = { title: "Marketing · Cecchin Pizzas" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const sessao = await exigirPapel(["staff"]);
  const gestor = ["admin", "gestao"].includes(sessao.usuario.papel);
  const resposta = gestor
    ? await consultar<{ id: string; nome: string; papel: string }[]>("usuario?select=id,nome,papel&ativo=eq.true&papel=in.(staff,gestao,admin)&order=nome.asc&limit=300", sessao.accessToken)
    : null;
  return <MarketingPainel usuarioId={sessao.usuario.id} gestor={gestor} pessoas={resposta?.ok ? resposta.dados ?? [] : []} />;
}
