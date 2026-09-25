(() => {
  const canal = "cecchin-instagram-bridge";
  const origemPermitida = "http://localhost:3000";

  if (location.origin !== origemPermitida) return;

  window.addEventListener("message", async (event) => {
    const pedido = event.data;
    if (event.source !== window || event.origin !== origemPermitida || pedido?.canal !== canal || typeof pedido.id !== "string") return;

    try {
      const resposta = await chrome.runtime.sendMessage({
        canal,
        id: pedido.id,
        acao: pedido.acao,
        argumentos: pedido.argumentos ?? {},
        origemApp: location.origin,
      });
      window.postMessage({ canal, id: pedido.id, resposta }, origemPermitida);
    } catch {
      window.postMessage({ canal, id: pedido.id, erro: "A extensão não respondeu. Recarregue a página." }, origemPermitida);
    }
  });
})();
