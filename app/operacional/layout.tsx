import { OperationalLayout } from "@/src/components/layouts/OperationalLayout";
import { exigirPapel } from "@/src/servidor/auth/guarda";

/**
 * O guarda de verdade da área de operação.
 *
 * Server Component: a decisão acontece antes de qualquer HTML sair, com o papel
 * lido de `usuario` sob RLS. Antes isto era `redirect()` dentro de um
 * componente `"use client"` — o 307 que aparecia no `curl` era SSR do mesmo
 * componente, e quem trocasse o estado no DevTools entrava.
 */
export const dynamic = "force-dynamic";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await exigirPapel(["staff"], "/operacional/minha-rota");
  return <OperationalLayout>{children}</OperationalLayout>;
}
