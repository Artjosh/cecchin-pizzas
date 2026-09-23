import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ sessao: vi.fn(), rpc: vi.fn(), consultar: vi.fn() }));
vi.mock("@/src/servidor/auth/sessao-atual", () => ({ sessaoAtual: mocks.sessao }));
vi.mock("@/src/servidor/supabase", () => ({ chamarFuncao: mocks.rpc, consultar: mocks.consultar }));
import { POST, GET } from "@/app/api/pagamentos/infinitepay/route";
import { PATCH } from "@/app/api/operacao/solicitacao-reserva/route";

const pedido = "12345678-1234-4234-8234-123456789012";
function sessao(papel = "gestao") { return { accessToken: "sessao-ficticia", usuario: { id: pedido, papel } }; }
function post(body: object, origin = "https://app.example") { return new NextRequest("https://app.example/api/pagamentos/infinitepay", { method: "POST", headers: { "Content-Type": "application/json", origin }, body: JSON.stringify(body) }); }

describe("BFF InfinitePay", () => {
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => { vi.resetAllMocks(); mocks.sessao.mockResolvedValue(sessao()); mocks.rpc.mockResolvedValue({ ok: true, dados: pedido }); vi.stubEnv("INFINITEPAY_ENABLED", "true"); });
  it("exige sessão e mesma origem", async () => {
    expect((await POST(post({ acao: "liberar" }, "https://outro.example"))).status).toBe(403);
    mocks.sessao.mockResolvedValue(null);
    expect((await POST(post({ acao: "liberar" }))).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("cliente não aprova e gestão não muda recebedor", async () => {
    mocks.sessao.mockResolvedValue(sessao("cliente"));
    expect((await POST(post({ acao: "liberar", solicitacao: pedido, total: 10000, sinal: 3000 }))).status).toBe(403);
    mocks.sessao.mockResolvedValue(sessao("gestao"));
    expect((await POST(post({ acao: "configurar", handle: "conta", habilitado: true }))).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("envia apenas valores aprovados inteiros para RPC sob sessão", async () => {
    expect((await POST(post({ acao: "liberar", solicitacao: pedido, total: 10000, sinal: 3000 }))).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("liberar_cobranca_infinitepay", { p_solicitacao: pedido, p_total_centavos: 10000, p_sinal_centavos: 3000 }, "sessao-ficticia");
    expect((await POST(post({ acao: "liberar", solicitacao: pedido, total: 10000, sinal: 3000.2 }))).status).toBe(400);
  });
  it("sem habilitação não enfileira cobranças", async () => {
    vi.stubEnv("INFINITEPAY_ENABLED", "false");
    expect((await POST(post({ acao: "liberar", solicitacao: pedido, total: 10000, sinal: 3000 }))).status).toBe(503);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("callback não recebe dinheiro nem estado financeiro do browser", async () => {
    mocks.sessao.mockResolvedValue(sessao("cliente"));
    const r = await POST(post({ acao: "retorno", pedido, transacao: "t", fatura: "f", paid: true, amount: 1, receipt_url: "https://evil.example" }));
    expect(r.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("informar_retorno_infinitepay", { p_cobranca: pedido, p_transacao: "t", p_fatura: "f" }, "sessao-ficticia");
  });
  it("consulta RLS usa token e não cacheia dados pessoais", async () => {
    mocks.consultar.mockResolvedValue({ ok: true, dados: [] });
    const r = await GET(new NextRequest(`https://app.example/api/pagamentos/infinitepay?pedido=${pedido}`));
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(mocks.consultar.mock.calls[0][1]).toBe("sessao-ficticia");
    expect(await r.text()).not.toContain("sessao-ficticia");
  });
  it("cancelamento exige gestão, origem válida e corpo estruturado", async () => {
    function patch(body: unknown, origin = "https://app.example") {
      return new NextRequest("https://app.example/api/operacao/solicitacao-reserva", { method: "PATCH", headers: { "Content-Type": "application/json", origin }, body: JSON.stringify(body) });
    }
    expect((await PATCH(patch(null))).status).toBe(400);
    expect((await PATCH(patch({ solicitacao: pedido, status: "cancelada" }, "https://outro.example"))).status).toBe(403);
    mocks.sessao.mockResolvedValue(sessao("cliente"));
    expect((await PATCH(patch({ solicitacao: pedido, status: "cancelada" }))).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.sessao.mockResolvedValue(sessao("gestao"));
    expect((await PATCH(patch({ solicitacao: pedido, status: "aguardando_pagamento" }))).status).toBe(400);
    expect((await PATCH(patch({ solicitacao: pedido, status: "cancelada" }))).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("atualizar_solicitacao_reserva", { p_solicitacao: pedido, p_status: "cancelada" }, "sessao-ficticia");
  });
});
