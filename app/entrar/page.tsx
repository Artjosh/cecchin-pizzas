import { redirect } from "next/navigation";

import { EntrarView } from "@/src/views/EntrarView";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { rotaInicial } from "@/src/servidor/auth/guarda";
import { destinoSeguro } from "@/src/servidor/auth/destino";

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
