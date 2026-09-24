import { consultar } from "./supabase";

export interface ResponsavelDaOperacao {
  id: string;
  nome: string;
  usuario_id: string | null;
  ativo: boolean;
}

export const RESPONSAVEIS_POR_PAGINA = 30;

function padraoNome(valor: string): string {
  const classes: Record<string, string> = {
    a: "[aáàâãä]", c: "[cç]", e: "[eéèêë]", i: "[iíìîï]",
    n: "[nñ]", o: "[oóòôõö]", u: "[uúùûü]",
  };
  const texto = valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const partes = [...texto].map(letra => classes[letra] ?? (/^[a-z0-9]$/.test(letra) ? letra : " "));
  return `.*${partes.join("").trim().replace(/\s+/g, ".*")}.*`;
}

export async function buscarResponsaveisOperacao(token: string, pagina: number, busca: string, soSemConta: boolean) {
  const termo = busca.trim().slice(0, 80);
  const filtroNome = termo ? `&nome=imatch.${encodeURIComponent(padraoNome(termo))}` : "";
  const filtroConta = soSemConta ? "&usuario_id=is.null" : "";
  const [registros, semConta, todos] = await Promise.all([
    consultar<ResponsavelDaOperacao[]>(
      `responsavel?select=id,nome,usuario_id,ativo${filtroNome}${filtroConta}&order=ativo.desc,nome.asc,id.asc&limit=${RESPONSAVEIS_POR_PAGINA}&offset=${pagina * RESPONSAVEIS_POR_PAGINA}`,
      token,
      { headers: { Prefer: "count=exact" } },
    ),
    consultar<{ id: string }[]>("responsavel?select=id&usuario_id=is.null&limit=1", token, { headers: { Prefer: "count=exact" } }),
    consultar<{ id: string }[]>("responsavel?select=id&limit=1", token, { headers: { Prefer: "count=exact" } }),
  ]);
  return {
    ok: registros.ok && semConta.ok && todos.ok,
    status: !registros.ok ? registros.status : !semConta.ok ? semConta.status : todos.status,
    responsaveis: registros.dados ?? [],
    total: registros.total ?? 0,
    totalGeral: todos.total ?? 0,
    semConta: semConta.total ?? 0,
    porPagina: RESPONSAVEIS_POR_PAGINA,
  };
}
