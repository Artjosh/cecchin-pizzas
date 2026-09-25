import { redirect } from "next/navigation";

import { EntrarView } from "@/src/views/EntrarView";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { rotaInicial } from "@/src/servidor/auth/guarda";
import { destinoSeguro } from "@/src/servidor/auth/destino";
import { config } from "@/src/servidor/config";

export const metadata = { title: "Entrar · Cecchin Pizzas" };
export const dynamic = "force-dynamic";

/**
 * Quem já tem sessão não vê tela de login. Vai direto para a área do papel
 * dele — voltar aqui logado só produziria um segundo login para a mesma conta.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ para?: string; erro?: string }>;
}) {
  const sessao = await sessaoAtual();
  const { para, erro } = await searchParams;

  if (sessao) redirect(destinoSeguro(para) ?? rotaInicial(sessao.usuario.papel));

  return (
    <EntrarView
      para={destinoSeguro(para) ?? ""}
      erroInicial={erro === "oauth" ? "Não foi possível concluir o login social. Tente novamente." : ""}
      provedoresSociais={{
        google: config.auth.googleHabilitado,
        apple: config.auth.appleHabilitado,
      }}
    />
  );
}
