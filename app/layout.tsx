import type { Metadata } from "next";
import { Provedores } from "@/src/components/Provedores";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { cookies } from "next/headers";
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
  const preferencia = (await cookies()).get("cecchin-tema")?.value;
  const temaInicial = preferencia === "claro" || preferencia === "escuro" ? preferencia : null;
  return (
    <html lang="pt-BR" data-tema={temaInicial ?? undefined} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{if(!document.documentElement.dataset.tema){var t=localStorage.getItem('cecchin-tema');document.documentElement.dataset.tema=t==='claro'||t==='escuro'?t:matchMedia('(prefers-color-scheme: dark)').matches?'escuro':'claro'}}catch(e){}" }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Provedores usuario={sessao?.usuario ?? null} temaInicial={temaInicial}>{children}</Provedores>
      </body>
    </html>
  );
}
