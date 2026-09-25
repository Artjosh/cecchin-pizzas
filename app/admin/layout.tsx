import { OperationalLayout } from "@/src/components/layouts/OperationalLayout";
import { exigirPapel } from "@/src/servidor/auth/guarda";

/**
 * /admin usa o MESMO shell de /operacional. O que separa as duas áreas é o
 * papel exigido, não o layout.
 *
 * `gestao` entra porque é aqui que mora a fila de quem pediu para virar staff,
 * e aprovar isso é trabalho de gestão. Promover alguém a gestao ou admin, não:
 * essa checagem vive em `app.promover()`, no banco, e nenhuma tela pode
 * afrouxá-la.
 */
export const dynamic = "force-dynamic";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await exigirPapel(["gestao"], "/admin/catalogo");
  return <OperationalLayout>{children}</OperationalLayout>;
}
