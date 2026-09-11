import { ClientLayout } from "@/src/components/layouts/ClientLayout";
import { exigirSessao } from "@/src/servidor/auth/guarda";

/**
 * A área do cliente exige sessão, não papel: todo papel alcança `cliente`.
 * Quem trabalha na operação também contrata evento, e bloquear aqui só criaria
 * uma conta a mais para a mesma pessoa.
 */
export const dynamic = "force-dynamic";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await exigirSessao();
  return <ClientLayout>{children}</ClientLayout>;
}
