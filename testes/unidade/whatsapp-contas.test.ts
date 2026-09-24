import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ sessao: vi.fn(), consultar: vi.fn(), rpc: vi.fn(), fetch: vi.fn() }));
vi.mock("@/src/servidor/auth/sessao-atual", () => ({ sessaoAtual: mocks.sessao, podeAcessar: (p: string) => ["gestao", "admin"].includes(p) }));
vi.mock("@/src/servidor/supabase", () => ({ consultar: mocks.consultar, chamarFuncao: mocks.rpc }));
import { GET, POST, PATCH as configurarPrazo } from "@/app/api/operacao/whatsapp/contas/route";
import { GET as historico, POST as enviar, PATCH as modo } from "@/app/api/operacao/whatsapp/route";
const conta = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const get = (query = "") => new NextRequest(`https://app.example/api/operacao/whatsapp/contas${query}`);
const post = (body: unknown, origin = "https://app.example") => new NextRequest("https://app.example/api/operacao/whatsapp/contas", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
const patch = (body: unknown, origin = "https://app.example") => new NextRequest("https://app.example/api/operacao/whatsapp/contas", { method: "PATCH", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
describe("contas WhatsApp sob sessão", () => {
  beforeEach(() => {
    vi.resetAllMocks(); vi.stubGlobal("fetch", mocks.fetch);
    vi.stubEnv("WHATSAPP_RUST_URL", "http://ponte.invalid"); vi.stubEnv("WHATSAPP_RUST_INTERNAL_TOKEN", "segredo-interno");
    mocks.sessao.mockResolvedValue({ accessToken: "jwt-teste", usuario: { papel: "gestao", organizacaoId: "org-teste" } });
    mocks.consultar.mockResolvedValue({ ok: true, dados: [{ id: conta, nome: "Comercial" }] });
    mocks.rpc.mockResolvedValue({ ok: true, dados: conta });
    mocks.fetch.mockImplementation(async () => Response.json({ conectado: true, telefone: "5511999990000" }));
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  it("nega leitura anônima e cliente antes de acessar a ponte", async () => {
    mocks.sessao.mockResolvedValue(null); expect((await GET(get())).status).toBe(401);
    mocks.sessao.mockResolvedValue({ usuario: { papel: "cliente" } }); expect((await GET(get())).status).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("só consulta QR de conta visível na RLS", async () => {
    expect((await GET(get("?conta=principal"))).status).toBe(404);
    expect(mocks.fetch).not.toHaveBeenCalled();
    mocks.fetch.mockResolvedValue(new Response("<svg/>", { headers: { "content-type": "image/svg+xml" } }));
    const r = await GET(get(`?conta=${conta}`)); expect(r.status).toBe(200);
    expect(mocks.fetch).toHaveBeenCalledWith(`http://ponte.invalid/accounts/${conta}/qr.svg`, expect.objectContaining({ headers: { "x-cecchin-internal-token": "segredo-interno", "x-cecchin-organizacao": "org-teste" } }));
    expect(r.headers.get("cache-control")).toContain("no-store");
  });
  it("status não expõe credencial e distingue ponte indisponível", async () => {
    let r = await GET(get()); expect(await r.text()).not.toContain("segredo-interno");
    mocks.fetch.mockRejectedValue(new Error("rede")); r = await GET(get());
    expect((await r.json()).contas[0].estado).toBe("indisponivel");
  });
  it("preserva conta criada quando a ponte falha, permitindo retomar", async () => {
    mocks.fetch.mockRejectedValue(new Error("rede"));
    const r = await POST(post({ nome: " Comercial " })); const d = await r.json();
    expect(d.id).toBe(conta); expect(d.aviso).toContain("Conta salva");
    expect(mocks.rpc).toHaveBeenCalledWith("configurar_conta_whatsapp", { p_nome: "Comercial", p_conta: null }, "jwt-teste");
  });
  it("retoma uma conta existente sem criar outra", async () => {
    const r = await POST(post({ conta, iniciar: true })); expect(r.status).toBe(200);
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.fetch).toHaveBeenCalledWith(`http://ponte.invalid/accounts/${conta}`, expect.objectContaining({ method: "POST" }));
  });
  it("recusa origem externa, corpo inválido e conta alheia", async () => {
    expect((await POST(post({ nome: "Teste" }, "https://outra.example"))).status).toBe(403);
    expect((await POST(post(null))).status).toBe(400);
    expect((await POST(post({ nome: " " }))).status).toBe(400);
    mocks.consultar.mockResolvedValue({ ok: true, dados: [] }); expect((await POST(post({ conta, iniciar: true }))).status).toBe(404);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("lista e histórico filtram a conta escolhida, inclusive a fila", async () => {
    mocks.consultar.mockResolvedValue({ ok: true, dados: [], total: 0 });
    await historico(new NextRequest(`https://app.example/api/operacao/whatsapp?conta=${conta}`));
    expect(mocks.consultar.mock.calls[0][0]).toContain(`conta_id=eq.${conta}`);
    mocks.consultar.mockClear(); mocks.consultar.mockResolvedValueOnce({ ok: true, dados: [{ modo: "automatico", atendente_id: null, historico_desde: null }] }).mockResolvedValue({ ok: true, dados: [] });
    await historico(new NextRequest(`https://app.example/api/operacao/whatsapp?conta=${conta}&telefone=5511999990000`));
    for (const call of mocks.consultar.mock.calls) expect(call[0]).toContain(`conta_id=eq.${conta}`);
  });
  it("envio e atendimento passam conta na RPC autenticada", async () => {
    await enviar(post({ conta, telefone: "5511999990000", texto: "Teste" }));
    expect(mocks.rpc).toHaveBeenLastCalledWith("enfileirar_mensagem_whatsapp_manual", { p_conta: conta, p_telefone: "5511999990000", p_texto: "Teste" }, "jwt-teste");
    await modo(post({ conta, telefone: "5511999990000", modo: "automatico" }));
    expect(mocks.rpc).toHaveBeenLastCalledWith("definir_modo_conversa_whatsapp", { p_conta: conta, p_telefone: "5511999990000", p_modo: "automatico" }, "jwt-teste");
  });
  it("mídia usa a conta da mensagem autorizada, sem confiar na query", async () => {
    mocks.consultar.mockResolvedValue({ ok: true, dados: [{ conta_id: conta, conteudo: { media: { arquivo: "abcdef", disponivel: true, mime: "image/jpeg" } } }] });
    await historico(new NextRequest(`https://app.example/api/operacao/whatsapp?conta=principal&midia=${conta}`));
    expect(mocks.fetch.mock.calls[0][0]).toBe(`http://ponte.invalid/accounts/${conta}/media/abcdef`);
  });
  it("foto exige conversa visível na conta e aceita só CDN de imagem", async () => {
    const url = `https://app.example/api/operacao/whatsapp?conta=${conta}&foto=5511999990000`;
    mocks.consultar.mockResolvedValueOnce({ ok: true, dados: [] });
    expect((await historico(new NextRequest(url))).status).toBe(404);
    expect(mocks.fetch).not.toHaveBeenCalled();
    mocks.consultar.mockResolvedValue({ ok: true, dados: [{ telefone: "5511999990000" }] });
    mocks.fetch.mockResolvedValueOnce(Response.json({ url: "https://site-externo.invalid/foto" }));
    expect((await historico(new NextRequest(url))).status).toBe(502);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.consultar.mock.calls.at(-1)?.[0]).toContain(`conta_id=eq.${conta}`);
    mocks.fetch.mockReset();
    mocks.fetch.mockResolvedValueOnce(Response.json({ url: "https://pps.whatsapp.net/foto" }))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/jpeg" } }));
    const foto = await historico(new NextRequest(url));
    expect(foto.status).toBe(200);
    expect(foto.headers.get("content-type")).toBe("image/jpeg");
    expect(mocks.fetch.mock.calls[0][0]).toBe(`http://ponte.invalid/accounts/${conta}/profile/5511999990000`);
  });
  it("remove da fila o envio que já apareceu no histórico", async () => {
    const id = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    mocks.consultar.mockResolvedValueOnce({ ok: true, dados: [{ modo: "automatico", atendente_id: null, historico_desde: null }] })
      .mockResolvedValueOnce({ ok: true, dados: [{ id, notificacao_id: id, conteudo: { texto: "Oi" }, criado_em: new Date().toISOString() }] })
      .mockResolvedValueOnce({ ok: true, dados: [{ id, status: "enviando", conteudo: { texto: "Oi" } }] });
    const resposta = await historico(new NextRequest(`https://app.example/api/operacao/whatsapp?conta=${conta}&telefone=5511999990000`));
    expect((await resposta.json()).fila).toEqual([]);
  });
  it("prazo humano valida conta, intervalo e permissão antes da RPC", async () => {
    expect((await configurarPrazo(patch({ conta, minutos: 30 }, "https://fora.example"))).status).toBe(403);
    expect((await configurarPrazo(patch({ conta, minutos: 2 }))).status).toBe(400);
    expect((await configurarPrazo(patch({ conta: "../outra", minutos: 60 }))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.sessao.mockResolvedValueOnce({ accessToken: "jwt-teste", usuario: { papel: "cliente" } });
    expect((await configurarPrazo(patch({ conta, minutos: 60 }))).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValue({ ok: true, dados: 0 });
    expect((await configurarPrazo(patch({ conta, minutos: 0 }))).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("configurar_timeout_humano_whatsapp", { p_conta: conta, p_minutos: 0 }, "jwt-teste");
  });
});
