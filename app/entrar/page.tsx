import { redirect } from "next/navigation";

import { EntrarView } from "@/src/views/EntrarView";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { rotaInicial } from "@/src/servidor/auth/guarda";

export const metadata = { title: "Entrar · Cecchin Pizzas" };
export const dynamic = "force-dynamic";

/**
 * Quem já tem sessão não vê tela de login. Vai direto para a área do papel
 * dele — voltar aqui logado só produziria um segundo login para a mesma conta.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ para?: string }>;
}) {
  const sessao = await sessaoAtual();
  const { para } = await searchParams;

  if (sessao) redirect(destinoSeguro(para) ?? rotaInicial(sessao.usuario.papel));

  return <EntrarView para={destinoSeguro(para) ?? ""} />;
}

/**
 * Só caminho interno. Um `para` absoluto permitiria usar esta tela para mandar
 * alguém, recém-autenticado, para outro domínio — o open redirect clássico.
 */
function destinoSeguro(bruto: string | undefined): string | null {
  if (!bruto) return null;
  if (!bruto.startsWith("/") || bruto.startsWith("//")) return null;
  return bruto;
}
