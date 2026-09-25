import { EditarLocalidades } from "../components/EditarLocalidades";
import { CabecalhoDoPainel } from "../components/painel/Painel";
import { exigirPapel } from "../servidor/auth/guarda";

export async function LocalidadesView() {
  await exigirPapel(["gestao"]);
  return (
    <div className="flex flex-col gap-space-lg">
      <CabecalhoDoPainel
        titulo="Localidades"
        descricao="Onde a equipe atende, quanto custa chegar e quanto tempo leva."
      />
      <EditarLocalidades />
    </div>
  );
}
