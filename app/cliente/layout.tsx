import { ClientLayout } from "@/src/components/layouts/ClientLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}
