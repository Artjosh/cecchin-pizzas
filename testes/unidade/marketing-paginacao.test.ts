import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ sessao: vi.fn(), consultar: vi.fn() }));
vi.mock("@/src/servidor/auth/sessao-atual", () => ({ sessaoAtual: mocks.sessao }));
vi.mock("@/src/servidor/supabase", () => ({ consultar: mocks.consultar, chamarFuncao: vi.fn() }));
import { GET } from "@/app/api/operacao/marketing/route";

const url = "http://localhost/api/operacao/marketing?inicio=2026-09-21&fim=2026-09-28";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sessao.mockResolvedValue({ usuario: { papel: "gestao" }, accessToken: "sessao-de-teste" });
  mocks.consultar.mockImplementation(async (caminho: string) => ({ ok: true, dados: caminho.startsWith("agenda_marketing") ? Array.from({ length: caminho.includes("offset=200") ? 1 : 201 }, (_, indice) => ({ id: `item-${indice}` })) : [] }));
});

it("entrega 200 compromissos e indica que há outra página", async () => {
  const resposta = await GET(new NextRequest(url));
  const dados = await resposta.json();
  expect(resposta.status).toBe(200);
  expect(dados.agenda).toHaveLength(200);
  expect(dados.maisAgenda).toBe(true);
  expect(mocks.consultar).toHaveBeenCalledWith(expect.stringContaining("order=agendado_para.asc,id.asc&limit=201&offset=0"), "sessao-de-teste");
});

it("busca somente a agenda ao carregar a próxima página", async () => {
  const resposta = await GET(new NextRequest(`${url}&pagina=1`));
  const dados = await resposta.json();
  expect(resposta.status).toBe(200);
  expect(dados.agenda).toHaveLength(1);
  expect(dados.maisAgenda).toBe(false);
  expect(mocks.consultar).toHaveBeenCalledTimes(1);
  expect(mocks.consultar).toHaveBeenCalledWith(expect.stringContaining("offset=200"), "sessao-de-teste");
});

it("consulta somente alertas sem substituir paginas da agenda ja carregadas", async () => {
  const resposta = await GET(new NextRequest("http://localhost/api/operacao/marketing?somenteAlertas=1"));
  const dados = await resposta.json();
  expect(resposta.status).toBe(200);
  expect(dados).toEqual({ alertas: [] });
  expect(mocks.consultar).toHaveBeenCalledTimes(1);
  expect(mocks.consultar).toHaveBeenCalledWith(expect.stringContaining("alerta_marketing?select="), "sessao-de-teste");
});
