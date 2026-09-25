import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ sessao: vi.fn(), consultar: vi.fn() }));
vi.mock("@/src/servidor/auth/sessao-atual", () => ({ sessaoAtual: mocks.sessao }));
vi.mock("@/src/servidor/supabase", () => ({ consultar: mocks.consultar, chamarFuncao: vi.fn() }));
import { GET } from "@/app/api/operacao/responsavel/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sessao.mockResolvedValue({ usuario: { papel: "gestao" }, accessToken: "sessao-teste" });
  mocks.consultar.mockImplementation(async (caminho: string) => caminho.includes("select=id,nome")
    ? { ok: true, status: 200, dados: [{ id: "resp-1", nome: "João", usuario_id: null, ativo: true }], total: 73 }
    : { ok: true, status: 200, dados: [{ id: "resp-1" }], total: caminho.includes("usuario_id=is.null") ? 91 : 125 });
});

it("pagina a busca filtrada no banco e preserva o total de responsáveis sem conta", async () => {
  const resposta = await GET(new NextRequest("http://localhost/api/operacao/responsavel?busca=Jo%C3%A3o&pagina=2&semConta=1"));
  const dados = await resposta.json();
  expect(resposta.status).toBe(200);
  expect(dados).toMatchObject({ total: 73, totalGeral: 125, semConta: 91, porPagina: 30 });
  expect(dados.responsaveis).toHaveLength(1);
  const consulta = mocks.consultar.mock.calls.find(([caminho]) => caminho.includes("select=id,nome"))?.[0] as string;
  expect(consulta).toContain("&usuario_id=is.null");
  expect(consulta).toContain("&limit=30&offset=60");
  expect(consulta).toContain("&nome=imatch.");
  expect(mocks.consultar).toHaveBeenCalledWith(expect.stringContaining("select=id&usuario_id=is.null&limit=1"), "sessao-teste", { headers: { Prefer: "count=exact" } });

  mocks.consultar.mockClear();
  await GET(new NextRequest("http://localhost/api/operacao/responsavel?busca=Joao&pagina=2&semConta=1"));
  const semAcento = mocks.consultar.mock.calls.find(([caminho]) => caminho.includes("select=id,nome"))?.[0];
  expect(semAcento).toBe(consulta);
});

it("não consulta dados de equipe sem papel de gestão", async () => {
  mocks.sessao.mockResolvedValue({ usuario: { papel: "staff" }, accessToken: "sessao-teste" });
  const resposta = await GET(new NextRequest("http://localhost/api/operacao/responsavel"));
  expect(resposta.status).toBe(403);
  expect(mocks.consultar).not.toHaveBeenCalled();
});
