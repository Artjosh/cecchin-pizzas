import type { Metadata } from "next";
import { Provedores } from "@/src/components/Provedores";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        <Provedores>{children}</Provedores>
      </body>
    </html>
  );
}
