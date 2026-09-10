import { OperationalLayout } from "@/src/components/layouts/OperationalLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <OperationalLayout>{children}</OperationalLayout>;
}
