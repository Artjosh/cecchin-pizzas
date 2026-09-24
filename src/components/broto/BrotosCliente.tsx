"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, PackageCheck, ShoppingBasket } from "lucide-react";

type Cliente = { id: string; razao_social: string; cnpj: string; telefone: string | null; endereco: string; cidade: string; uf: string; cep: string; complemento: string | null; ativo: boolean };
type Produto = { id: string; nome: string; descricao: string; preco_base_centavos: number };
type Preco = { cliente_id: string; produto_id: string; valor_centavos: number };
type Pedido = { id: string; total_centavos: number; status: string; pagamento_status: string; solicitado_em: string; prazo_entrega: string; item_pedido_broto: { nome_produto: string; quantidade: number; preco_unitario_centavos: number }[] };
type Dados = { cliente: Cliente | null; produtos: Produto[]; precos: Preco[]; pedidos: Pedido[]; temMaisPedidos: boolean };
const classeCampo = "w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 outline-none focus:border-primary";
const dinheiro = (centavos: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);
const data = (iso: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));

export function BrotosCliente() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [paginaPedidos, setPaginaPedidos] = useState(0);
  const [observacao, setObservacao] = useState("");
  const [cadastro, setCadastro] = useState({ razao_social: "", cnpj: "", telefone: "", endereco: "", cidade: "", uf: "RS", cep: "", complemento: "" });
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const resposta = await fetch(`/api/broto/cliente?pagina=${paginaPedidos}`, { cache: "no-store" });
      if (!resposta.ok) throw new Error("Não foi possível carregar os brotos. Confira o acesso ao banco.");
      const resultado = await resposta.json() as Dados;
      setDados(resultado);
      if (resultado.cliente) setCadastro({ razao_social: resultado.cliente.razao_social, cnpj: resultado.cliente.cnpj, telefone: resultado.cliente.telefone ?? "", endereco: resultado.cliente.endereco, cidade: resultado.cliente.cidade, uf: resultado.cliente.uf, cep: resultado.cliente.cep, complemento: resultado.cliente.complemento ?? "" });
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha ao carregar"); }
    finally { setCarregando(false); }
  }, [paginaPedidos]);
  useEffect(() => { void carregar(); }, [carregar]);
  const pedidosCarregados = dados !== null;
  useEffect(() => {
    if (!pedidosCarregados || salvando) return;
    const controlador = new AbortController();
    let emAndamento = false;
    const atualizarPedidos = async () => {
      if (document.visibilityState !== "visible" || emAndamento) return;
      emAndamento = true;
      try {
        const resposta = await fetch(`/api/broto/cliente?pagina=${paginaPedidos}&somentePedidos=1`, { cache: "no-store", signal: controlador.signal });
        if (!resposta.ok) return;
        const lista = await resposta.json() as Pick<Dados, "pedidos" | "temMaisPedidos">;
        if (!controlador.signal.aborted) setDados((atual) => atual ? { ...atual, pedidos: lista.pedidos, temMaisPedidos: lista.temMaisPedidos } : atual);
      } catch { /* A próxima consulta atualiza os pedidos. */ }
      finally { emAndamento = false; }
    };
    const intervalo = window.setInterval(() => void atualizarPedidos(), 30_000);
    return () => { controlador.abort(); window.clearInterval(intervalo); };
  }, [paginaPedidos, pedidosCarregados, salvando]);
  const precos = useMemo(() => new Map(dados?.precos.map((p) => [p.produto_id, p.valor_centavos]) ?? []), [dados]);
  const total = (dados?.produtos ?? []).reduce((soma, p) => soma + (quantidades[p.id] ?? 0) * (precos.get(p.id) ?? p.preco_base_centavos), 0);
  const enviar = async (corpo: Record<string, unknown>, mensagem: string) => {
    setSalvando(true); setErro(""); setAviso("");
    try {
      const resposta = await fetch("/api/broto/cliente", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
      const resultado = await resposta.json() as { mensagem?: string };
      if (resposta.status === 409) { await carregar(); throw new Error(resultado.mensagem ?? "O preço mudou. Confira o novo total."); }
      if (!resposta.ok) throw new Error(resultado.mensagem ?? "Não foi possível salvar");
      setAviso(mensagem);
      if (corpo.acao === "pedido" && paginaPedidos !== 0) setPaginaPedidos(0);
      else await carregar();
      return true;
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha ao salvar"); return false; }
    finally { setSalvando(false); }
  };

  return <div className="mx-auto max-w-6xl space-y-8 px-4 py-9 md:px-8">
    <header><p className="font-label-sm uppercase tracking-[0.16em] text-primary">Para empresas</p><h1 className="font-headline-lg text-headline-lg">Brotos Cecchin</h1><p className="mt-2 max-w-2xl text-on-surface-variant">Cadastre seu estabelecimento, escolha as quantidades e acompanhe a entrega do pedido em até 24 horas.</p></header>
    {erro && <p role="alert" className="rounded-xl bg-error-container p-4 text-on-error-container">{erro}</p>}{aviso && <p role="status" className="rounded-xl bg-tertiary-container p-4 text-on-tertiary-container">{aviso}</p>}
    {carregando && !dados && <p className="rounded-xl bg-surface-container p-4">Carregando catálogo...</p>}
    {dados && <>
      <section className="rounded-2xl bg-surface-container-low p-5"><h2 className="font-title-lg">{dados.cliente ? "Seu estabelecimento" : "Cadastre seu estabelecimento"}</h2><p className="mb-4 text-sm text-on-surface-variant">O endereço cadastrado será usado na entrega. A gestão pode definir preços próprios para sua empresa.</p><form onSubmit={(e) => { e.preventDefault(); void enviar({ acao: "cadastro", ...cadastro }, "Cadastro atualizado"); }} className="grid gap-3 sm:grid-cols-2"><input required maxLength={150} aria-label="Razão social" placeholder="Razão social" className={classeCampo} value={cadastro.razao_social} onChange={(e) => setCadastro({ ...cadastro, razao_social: e.target.value })} /><input required aria-label="CNPJ" placeholder="CNPJ" className={classeCampo} value={cadastro.cnpj} onChange={(e) => setCadastro({ ...cadastro, cnpj: e.target.value })} /><input required aria-label="Endereço" placeholder="Rua, número e bairro" className={classeCampo} value={cadastro.endereco} onChange={(e) => setCadastro({ ...cadastro, endereco: e.target.value })} /><input aria-label="Complemento" placeholder="Complemento" className={classeCampo} value={cadastro.complemento} onChange={(e) => setCadastro({ ...cadastro, complemento: e.target.value })} /><input required aria-label="Cidade" placeholder="Cidade" className={classeCampo} value={cadastro.cidade} onChange={(e) => setCadastro({ ...cadastro, cidade: e.target.value })} /><div className="flex gap-3"><input required maxLength={2} aria-label="UF" placeholder="UF" className={`${classeCampo} w-24`} value={cadastro.uf} onChange={(e) => setCadastro({ ...cadastro, uf: e.target.value.toUpperCase() })} /><input required aria-label="CEP" placeholder="CEP" className={classeCampo} value={cadastro.cep} onChange={(e) => setCadastro({ ...cadastro, cep: e.target.value })} /></div><input aria-label="Telefone" placeholder="Telefone" className={classeCampo} value={cadastro.telefone} onChange={(e) => setCadastro({ ...cadastro, telefone: e.target.value })} /><button disabled={salvando} className="rounded-xl bg-primary px-5 py-2.5 font-label-md text-on-primary disabled:opacity-50">{dados.cliente ? "Salvar cadastro" : "Cadastrar"}</button></form></section>
      <section><div className="mb-4 flex items-center gap-2"><ShoppingBasket className="h-5 w-5 text-primary" /><h2 className="font-title-lg">Monte seu pedido</h2></div>{dados.produtos.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{dados.produtos.map((produto) => <article key={produto.id} className="flex flex-col justify-between rounded-2xl bg-surface-container-low p-5"><div><h3 className="font-title-md">{produto.nome}</h3><p className="mt-1 text-sm text-on-surface-variant">{produto.descricao}</p></div><div className="mt-4 flex items-center justify-between gap-3"><strong className="text-primary">{dinheiro(precos.get(produto.id) ?? produto.preco_base_centavos)}</strong><label className="text-sm">Qtd. <input aria-label={`Quantidade de ${produto.nome}`} type="number" min={0} max={10000} className={`${classeCampo} ml-1 w-24`} value={quantidades[produto.id] ?? 0} onChange={(e) => setQuantidades({ ...quantidades, [produto.id]: Math.max(0, Math.min(10000, Number(e.target.value) || 0)) })} /></label></div></article>)}</div> : <p className="rounded-xl bg-surface-container p-4 text-on-surface-variant">Ainda não há produtos disponíveis.</p>}<div className="mt-4 rounded-2xl bg-surface-container-high p-5"><label className="block text-sm font-medium">Observações para produção ou entrega<textarea maxLength={1000} rows={2} className={`${classeCampo} mt-2`} value={observacao} onChange={(e) => setObservacao(e.target.value)} /></label><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-on-surface-variant">Total do pedido</p><strong className="font-title-lg">{dinheiro(total)}</strong></div><button disabled={salvando || !dados.cliente?.ativo || total <= 0} onClick={async () => { const itens = Object.entries(quantidades).filter(([, quantidade]) => quantidade > 0).map(([produto_id, quantidade]) => ({ produto_id, quantidade })); if (await enviar({ acao: "pedido", itens, observacao, total_centavos: total }, "Pedido registrado. Acompanhe o prazo abaixo.")) { setQuantidades({}); setObservacao(""); } }} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-label-md text-on-primary disabled:opacity-50">Enviar pedido <ArrowRight className="h-4 w-4" /></button></div>{!dados.cliente && <p className="mt-2 text-sm text-on-surface-variant">Cadastre o estabelecimento para enviar.</p>}</div></section>
      <section><div className="mb-4 flex items-center gap-2"><PackageCheck className="h-5 w-5 text-primary" /><h2 className="font-title-lg">Histórico de pedidos</h2></div>{dados.pedidos.length ? <div className="grid gap-3 md:grid-cols-2">{dados.pedidos.map((pedido) => <article key={pedido.id} className="rounded-2xl bg-surface-container-low p-5"><div className="flex items-start justify-between gap-2"><div><p className="font-title-md">Pedido {pedido.id.slice(0, 8).toUpperCase()}</p><p className="text-sm text-on-surface-variant">{data(pedido.solicitado_em)}</p></div><span className="rounded-full bg-primary-container px-3 py-1 text-sm text-on-primary-container">{pedido.status.replaceAll("_", " ")}</span></div><p className="mt-3 text-sm text-on-surface-variant">Entrega prevista até {data(pedido.prazo_entrega)}</p><ul className="mt-3 space-y-1 text-sm">{pedido.item_pedido_broto.map((item) => <li key={item.nome_produto} className="flex justify-between gap-3"><span>{item.quantidade}× {item.nome_produto}</span><span>{dinheiro(item.quantidade * item.preco_unitario_centavos)}</span></li>)}</ul><div className="mt-4 flex justify-between border-t border-outline-variant/30 pt-3"><span>Pagamento: {pedido.pagamento_status}</span><strong>{dinheiro(pedido.total_centavos)}</strong></div></article>)}</div> : <p className="rounded-xl bg-surface-container p-4 text-on-surface-variant">Seu primeiro pedido aparecerá aqui.</p>}</section>
      {(paginaPedidos > 0 || dados.temMaisPedidos) && <nav aria-label="Páginas do histórico de pedidos" className="flex items-center justify-end gap-3 text-sm"><button type="button" disabled={paginaPedidos === 0 || carregando} onClick={() => setPaginaPedidos((pagina) => pagina - 1)} className="rounded-xl bg-surface-container px-4 py-2 disabled:opacity-50">Anterior</button><span>Página {paginaPedidos + 1}</span><button type="button" disabled={!dados.temMaisPedidos || carregando} onClick={() => setPaginaPedidos((pagina) => pagina + 1)} className="rounded-xl bg-surface-container px-4 py-2 disabled:opacity-50">Próxima</button></nav>}
    </>}
  </div>;
}
