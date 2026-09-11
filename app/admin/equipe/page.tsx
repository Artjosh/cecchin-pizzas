import {
  AdminEquipeView,
  type Pessoa,
  type Solicitacao,
} from "@/src/views/AdminEquipeView";
import { exigirPapel } from "@/src/servidor/auth/guarda";
import { consultar } from "@/src/servidor/supabase";

export const metadata = { title: "Equipe e acessos · Cecchin Pizzas" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const sessao = await exigirPapel(["gestao"], "/admin/equipe");

  /*
   * As duas consultas vão com o token do usuário, em paralelo. A RLS decide o
   * que cada uma devolve: gestao e admin enxergam a fila da organização, e a
   * lista de pessoas é restrita a quem opera — os clientes ficam de fora porque
   * esta tela administra equipe, não cadastro de cliente.
   */
  const [fila, equipe] = await Promise.all([
    consultar<Solicitacao[]>(
      "solicitacao_staff?select=*&status=eq.pendente&order=criado_em.asc",
      sessao.accessToken,
    ),
    consultar<Pessoa[]>(
      "usuario?select=id,nome,email,papel&papel=in.(staff,gestao,admin)" +
        "&ativo=is.true&order=papel.asc,nome.asc",
      sessao.accessToken,
    ),
  ]);

  return (
    <AdminEquipeView
      solicitacoes={fila.dados ?? []}
      pessoas={equipe.dados ?? []}
      meuPapel={sessao.usuario.papel}
    />
  );
}
