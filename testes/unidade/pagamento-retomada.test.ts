import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({ sessao: vi.fn() }));
vi.mock("@/src/servidor/auth/guarda", () => ({ exigirSessao: mocks.sessao }));
vi.mock("@/src/components/pagamentos/CheckoutReserva", () => ({ CheckoutReserva: (props: Record<string, unknown>) => JSON.stringify(props) }));
import Page from "@/app/cliente/pagamento/page";

const id = "12345678-1234-4234-8234-123456789012";
beforeEach(() => vi.clearAllMocks());

it("retoma solicitacao por sessao sem reenviar dados ou criar nova cobranca", async () => {
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ solicitacao: id }) }));
  expect(mocks.sessao).toHaveBeenCalledWith(`/cliente/pagamento?solicitacao=${id}`);
  expect(html).toContain(id);
  expect(html).toContain("solicitacao");
  expect(html).not.toContain("inválido");
});

it("preserva retorno do provedor e ignora solicitacao concorrente", async () => {
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ pedido: id, solicitacao: "ignorada", transaction_nsu: "transacao", slug: "fatura" }) }));
  expect(mocks.sessao).toHaveBeenCalledWith(`/cliente/pagamento?pedido=${id}&transaction_nsu=transacao&slug=fatura`);
  expect(html).toContain("transacao");
  expect(html).not.toContain("ignorada");
});

it("rejeita identificador invalido sem montar checkout", async () => {
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ solicitacao: "invalida" }) }));
  expect(html).toContain("inválido");
});
