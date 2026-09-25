import { comoTelefone } from "./formato";
export function formatarTelefoneWhatsApp(telefone: string | null | undefined): string {
  if (!telefone) return "—";
  return /^55\d{10,11}$/.test(telefone) ? `+55 ${comoTelefone(telefone.slice(2))}` : comoTelefone(telefone);
}
