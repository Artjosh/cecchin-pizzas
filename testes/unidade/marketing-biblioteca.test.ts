import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ sessao: vi.fn(), fetch: vi.fn() }));
vi.mock("@/src/servidor/auth/sessao-atual", () => ({ sessaoAtual: mocks.sessao }));
vi.mock("@/src/servidor/config", () => ({ config: { supabase: { url: "http://storage.local", anonKey: "chave-publica" } } }));
import { GET } from "@/app/api/operacao/marketing/biblioteca/route";
import { POST as salvarMidia } from "@/app/api/operacao/marketing/midia/route";
import { POST as assinarMidia } from "@/app/api/operacao/marketing/midia/assinar/route";

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

it("salva a mídia escolhida no diretório da organização", async () => {
  mocks.fetch.mockResolvedValueOnce(Response.json({ Key: "arquivo" }));
  const dados = new FormData();
  dados.set("arquivo", new File([new Uint8Array([137, 80, 78, 71])], "imagem.png", { type: "image/png" }));
  const resposta = await salvarMidia(new NextRequest("http://localhost/api/operacao/marketing/midia", { method: "POST", headers: { origin: "http://localhost" }, body: dados }));
  expect(resposta.status).toBe(200);
  expect((await resposta.json()).caminho).toMatch(new RegExp(`^${org}/[0-9a-f-]+\\.png$`));
  const [url, opcoes] = mocks.fetch.mock.calls[0] as [string, RequestInit];
  expect(url).toMatch(new RegExp(`/storage/v1/object/marketing-conteudos/${org}/[0-9a-f-]+\\.png$`));
  expect(opcoes.headers).toEqual(expect.objectContaining({ authorization: "Bearer jwt-usuario", "content-type": "image/png" }));
});

it("assina o envio direto ao Storage sem receber os bytes no BFF", async () => {
  mocks.fetch.mockResolvedValueOnce(Response.json({ url: `/object/upload/sign/marketing-conteudos/${org}/arquivo.png?token=assinatura` }));
  const resposta = await assinarMidia(new NextRequest("http://localhost/api/operacao/marketing/midia/assinar", {
    method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" },
    body: JSON.stringify({ tipo: "image/png", tamanho: 1_500_000 }),
  }));
  expect(resposta.status).toBe(200);
  const dados = await resposta.json();
  expect(dados.caminho).toMatch(new RegExp(`^${org}/[0-9a-f-]+\\.png$`));
  expect(dados.url).toContain("/storage/v1/object/upload/sign/marketing-conteudos/");
  expect(mocks.fetch.mock.calls[0][1]).toEqual(expect.objectContaining({ method: "POST", body: "{}" }));
});
