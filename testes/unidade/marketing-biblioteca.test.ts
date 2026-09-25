import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ sessao: vi.fn(), fetch: vi.fn() }));
vi.mock("@/src/servidor/auth/sessao-atual", () => ({ sessaoAtual: mocks.sessao }));
vi.mock("@/src/servidor/config", () => ({ config: { supabase: { url: "http://storage.local", anonKey: "chave-publica" } } }));
import { GET } from "@/app/api/operacao/marketing/biblioteca/route";

const org = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const arquivo = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.jpg";
const req = (pagina = "0") => new NextRequest(`http://localhost/api/operacao/marketing/biblioteca?pagina=${pagina}`);

beforeEach(() => {
  vi.resetAllMocks(); vi.stubGlobal("fetch", mocks.fetch);
  mocks.sessao.mockResolvedValue({ accessToken: "jwt-usuario", usuario: { papel: "staff", organizacaoId: org } });
  mocks.fetch.mockResolvedValue(Response.json([{ id: "objeto", name: arquivo, created_at: "2026-09-24T12:00:00Z", metadata: { size: 2048, mimetype: "image/jpeg" } }]));
});
afterEach(() => vi.unstubAllGlobals());

it("nega cliente e sessão ausente antes de consultar o Storage", async () => {
  mocks.sessao.mockResolvedValueOnce(null).mockResolvedValueOnce({ usuario: { papel: "cliente" } });
  expect((await GET(req())).status).toBe(403);
  expect((await GET(req())).status).toBe(403);
  expect(mocks.fetch).not.toHaveBeenCalled();
});

it("lista somente o diretório da organização com o JWT do usuário", async () => {
  const resposta = await GET(req("2"));
  expect(resposta.status).toBe(200);
  expect(await resposta.json()).toEqual({ arquivos: [{ caminho: `${org}/${arquivo}`, criado_em: "2026-09-24T12:00:00Z", tamanho: 2048, tipo: "image/jpeg" }], temMais: false });
  expect(resposta.headers.get("cache-control")).toContain("no-store");
  const [url, opcoes] = mocks.fetch.mock.calls[0] as [string, RequestInit];
  expect(url).toBe("http://storage.local/storage/v1/object/list/marketing-conteudos");
  expect(opcoes.headers).toEqual(expect.objectContaining({ authorization: "Bearer jwt-usuario", apikey: "chave-publica" }));
  expect(JSON.parse(String(opcoes.body))).toEqual({ prefix: `${org}/`, limit: 41, offset: 80, sortBy: { column: "created_at", order: "desc" } });
});

it("rejeita página inválida e não devolve entradas fora do formato de mídia", async () => {
  expect((await GET(req("-1"))).status).toBe(400);
  expect(mocks.fetch).not.toHaveBeenCalled();
  mocks.fetch.mockResolvedValueOnce(Response.json([{ id: null, name: "pasta" }, { id: "objeto", name: "segredo.txt" }, { id: "objeto", name: arquivo }]));
  const resposta = await GET(req());
  const dados = await resposta.json();
  expect(dados.arquivos).toHaveLength(1);
  expect(dados.arquivos[0].caminho).toBe(`${org}/${arquivo}`);
});
