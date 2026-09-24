import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ sessao: vi.fn(), consultar: vi.fn() }));
vi.mock("@/src/servidor/auth/sessao-atual", () => ({ sessaoAtual: mocks.sessao }));
vi.mock("@/src/servidor/supabase", () => ({ consultar: mocks.consultar }));
import { GET } from "@/app/api/localidade/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sessao.mockResolvedValue({ usuario: { papel: "gestao", organizacaoId: "org" }, accessToken: "sessao-teste" });
  mocks.consultar.mockImplementation(async (caminho: string) => {
    if (caminho.startsWith("janela_pico")) return { ok: true, dados: [{ inicio: "17:00", fim: "20:00" }] };
    if (caminho.includes("select=id,cidade")) return { ok: true, dados: [{ id: "local-1", cidade: "Gravataí" }], total: 42 };
    return { ok: true, dados: [{ id: "local-1" }], total: 12 };
  });
});

it("pagina a busca combinada com localidades incompletas sem enviar a tabela inteira", async () => {
  const resposta = await GET(new NextRequest("http://localhost/api/localidade?busca=Gravata%C3%AD&incompletas=1&pagina=1"));
  const dados = await resposta.json();
  expect(resposta.status).toBe(200);
  expect(dados.localidades).toHaveLength(1);
  expect(dados.total).toBe(42);
  expect(dados.incompletas).toBe(12);
  expect(mocks.consultar).toHaveBeenCalledWith(expect.stringContaining("&and=(or(cidade.ilike.*Gravata%C3%AD*,bairro.ilike.*Gravata%C3%AD*),or(valor.is.null,minutos_normal.is.null,minutos_pico.is.null))"), "sessao-teste", expect.any(Object));
  expect(mocks.consultar).toHaveBeenCalledWith(expect.stringContaining("limit=30&offset=30"), "sessao-teste", expect.any(Object));
});

it("bloqueia leitura sem papel de gestão", async () => {
  mocks.sessao.mockResolvedValue({ usuario: { papel: "staff" }, accessToken: "sessao-teste" });
  const resposta = await GET(new NextRequest("http://localhost/api/localidade"));
  expect(resposta.status).toBe(403);
  expect(mocks.consultar).not.toHaveBeenCalled();
});
