import type { Metadata } from "next";
import { Provedores } from "@/src/components/Provedores";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cecchin Pizzas",
  description:
    "Sistema de gestão e reserva para rodízio de pizzas artesanais a domicílio.",
  openGraph: {
    title: "Cecchin Pizzas",
    description:
      "Sistema de gestão e reserva para rodízio de pizzas artesanais a domicílio.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

/*
 * Server Component, e por isso é daqui que o usuário desce para a árvore. Ler a
 * sessão aqui custa uma consulta por navegação e resolve o problema todo: a
 * barra superior sabe quem está logado sem que nenhum componente de cliente
 * precise perguntar, e sem que o token chegue perto do browser.
 */
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await sessaoAtual();
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Provedores usuario={sessao?.usuario ?? null}>{children}</Provedores>
      </body>
    </html>
  );
}
