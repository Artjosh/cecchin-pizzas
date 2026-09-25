import { describe, expect, it } from "vitest";
import { opcoesDaMensagem, texto } from "@/src/components/whatsapp/ConversaReal";

describe("leitura do histórico WhatsApp", () => {
  it("mostra o rótulo selecionado sem perder o identificador usado pelo bot", () => {
    const opcoes = opcoesDaMensagem({ interactive: { action: { buttons: [{ reply: { id: "disp:todo", title: "Dia todo" } }] } } });
    expect(opcoes).toEqual([{ id: "disp:todo", titulo: "Dia todo" }]);
    expect(texto({ text: { body: "disp:todo" } }, "text", new Map(opcoes.map(item => [item.id, item.titulo])))).toBe("Opção escolhida: Dia todo");
  });

  it("mantém texto Unicode, incluindo emoji, intacto", () => {
    expect(texto({ text: { body: "Olá 👋🏽🍕" } }, "text")).toBe("Olá 👋🏽🍕");
  });
});
