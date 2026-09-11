import { OperationalLayout } from "@/src/components/layouts/OperationalLayout";

/*
 * /admin usa o MESMO shell de /operacional — é o que o App.tsx da versão
 * anterior fazia. A diferença entre as duas áreas é o papel exigido, não o
 * layout: quem controla isso é o AuthProvider.
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <OperationalLayout>{children}</OperationalLayout>;
}
