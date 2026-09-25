import { NextResponse, type NextRequest } from "next/server";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { chamarFuncao, consultar } from "@/src/servidor/supabase";

const erro = (mensagem: string, status: number) => NextResponse.json({ mensagem }, { status });

export async function GET(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao || !["admin", "gestao"].includes(sessao.usuario.papel)) return erro("Sem permissão", 403);
  const paginaPedidosTexto = request.nextUrl.searchParams.get("paginaPedidos") ?? "0";
  const paginaFinanceiroTexto = request.nextUrl.searchParams.get("paginaFinanceiro") ?? "0";
  const tipoPedidos = request.nextUrl.searchParams.get("tipoPedidos") ?? "ativos";
  if (!/^\d{1,4}$/.test(paginaPedidosTexto) || !/^\d{1,4}$/.test(paginaFinanceiroTexto) || !["ativos", "historico"].includes(tipoPedidos)) return erro("Página inválida", 400);
  const paginaPedidos = Number(paginaPedidosTexto);
  const paginaFinanceiro = Number(paginaFinanceiroTexto);
  const limite = 50;
  const consultaPedidos = `pedido_broto?select=id,cliente_id,total_centavos,status,pagamento_status,valor_pago_centavos,solicitado_em,prazo_entrega,endereco_entrega,observacao,item_pedido_broto(produto_id,nome_produto,quantidade,preco_unitario_centavos)&status=in.${tipoPedidos === "ativos" ? "(solicitado,aceito,producao,saiu_entrega)" : "(entregue,cancelado)"}&order=${tipoPedidos === "ativos" ? "prazo_entrega.asc,id.asc" : "solicitado_em.desc,id.desc"}&limit=${limite + 1}&offset=${paginaPedidos * limite}`;
  const agora = new Date();
  const emQuatroHoras = new Date(agora.getTime() + 4 * 60 * 60_000);
  const filtroAtivos = "status=in.(solicitado,aceito,producao,saiu_entrega)";
  const consultarAlertas = async () => {
    if (tipoPedidos !== "ativos") return { atrasados: 0, proximos: 0 };
    const [atrasados, proximos] = await Promise.all([
      consultar(`pedido_broto?select=id&${filtroAtivos}&prazo_entrega=lt.${agora.toISOString()}&limit=1`, sessao.accessToken, { headers: { Prefer: "count=exact" } }),
      consultar(`pedido_broto?select=id&${filtroAtivos}&prazo_entrega=gte.${agora.toISOString()}&prazo_entrega=lte.${emQuatroHoras.toISOString()}&limit=1`, sessao.accessToken, { headers: { Prefer: "count=exact" } }),
    ]);
    if (!atrasados.ok || !proximos.ok || atrasados.total === undefined || proximos.total === undefined) return null;
    return { atrasados: atrasados.total, proximos: proximos.total };
  };
  if (request.nextUrl.searchParams.get("somenteContagem") === "1") {
    const pendentes = await consultar("pedido_broto?select=id&status=eq.solicitado&limit=1", sessao.accessToken, { headers: { Prefer: "count=exact" } });
    if (!pendentes.ok || pendentes.total === undefined) return erro("Não foi possível contar os pedidos", 503);
    return NextResponse.json({ pendentes: pendentes.total }, { headers: { "Cache-Control": "no-store" } });
  }
  if (request.nextUrl.searchParams.get("somentePedidos") === "1") {
    const [pedidos, alertas] = await Promise.all([consultar(consultaPedidos, sessao.accessToken), consultarAlertas()]);
    if (!pedidos.ok || alertas === null) return erro("Não foi possível carregar os pedidos de brotos", 503);
    const lista = Array.isArray(pedidos.dados) ? pedidos.dados : [];
    return NextResponse.json({ pedidos: lista.slice(0, limite), temMaisPedidos: lista.length > limite, alertas }, { headers: { "Cache-Control": "no-store" } });
  }
  const [clientes, produtos, precos, pedidos, financeiro, resumo, pessoas, alertas] = await Promise.all([
    consultar("cliente_broto?select=id,usuario_id,razao_social,cnpj,telefone,endereco,cidade,uf,cep,ativo&order=razao_social.asc&limit=300", sessao.accessToken),
    consultar("produto_broto?select=id,nome,descricao,preco_base_centavos,ativo&order=nome.asc&limit=200", sessao.accessToken),
    consultar("preco_cliente_broto?select=cliente_id,produto_id,valor_centavos&limit=1000", sessao.accessToken),
    consultar(consultaPedidos, sessao.accessToken),
    consultar(`vw_financeiro_broto?select=lancamento_id,data,tipo,valor_centavos,descricao,pedido_id&order=data.desc,lancamento_id.desc&limit=${limite + 1}&offset=${paginaFinanceiro * limite}`, sessao.accessToken),
    consultar("vw_resumo_financeiro_broto?select=entradas_centavos,despesas_centavos,saldo_centavos&limit=1", sessao.accessToken),
    consultar("usuario?select=id,nome,email&ativo=eq.true&order=nome.asc&limit=500", sessao.accessToken),
    consultarAlertas(),
  ]);
  if ([clientes, produtos, precos, pedidos, financeiro, resumo, pessoas].some((r) => !r.ok) || alertas === null) return erro("Não foi possível carregar a gestão de brotos", 503);
  const listaPedidos = Array.isArray(pedidos.dados) ? pedidos.dados : [];
  const listaFinanceiro = Array.isArray(financeiro.dados) ? financeiro.dados : [];
  return NextResponse.json({ clientes: clientes.dados ?? [], produtos: produtos.dados ?? [], precos: precos.dados ?? [], pedidos: listaPedidos.slice(0, limite), temMaisPedidos: listaPedidos.length > limite, financeiro: listaFinanceiro.slice(0, limite), temMaisFinanceiro: listaFinanceiro.length > limite, resumo: Array.isArray(resumo.dados) ? resumo.dados[0] ?? null : null, pessoas: pessoas.dados ?? [], alertas }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return erro("Origem inválida", 403);
  const sessao = await sessaoAtual();
  if (!sessao || !["admin", "gestao"].includes(sessao.usuario.papel)) return erro("Sem permissão", 403);
  const dados = await request.json().catch(() => null);
  if (!dados || typeof dados !== "object") return erro("Dados inválidos", 400);
  const acao = dados.acao;
  let r;
  if (acao === "cliente") {
    if (typeof dados.usuario_id !== "string" || typeof dados.razao_social !== "string" || typeof dados.cnpj !== "string" || typeof dados.endereco !== "string" || typeof dados.cidade !== "string" || typeof dados.uf !== "string" || typeof dados.cep !== "string") return erro("Confira o cliente", 400);
    r = await chamarFuncao("salvar_cliente_broto", { p_dados: dados }, sessao.accessToken);
  } else if (acao === "produto") {
    if (typeof dados.nome !== "string" || !dados.nome.trim() || dados.nome.length > 120 || !Number.isInteger(dados.preco_base_centavos) || dados.preco_base_centavos <= 0) return erro("Confira o produto e o preço", 400);
    r = await chamarFuncao("salvar_produto_broto", { p_dados: dados }, sessao.accessToken);
  } else if (acao === "preco") {
    if (typeof dados.cliente_id !== "string" || typeof dados.produto_id !== "string" || !Number.isInteger(dados.valor_centavos) || dados.valor_centavos <= 0) return erro("Preço inválido", 400);
    r = await chamarFuncao("definir_preco_cliente_broto", { p_cliente: dados.cliente_id, p_produto: dados.produto_id, p_valor_centavos: dados.valor_centavos }, sessao.accessToken);
  } else if (acao === "status") {
    if (typeof dados.id !== "string" || typeof dados.status !== "string") return erro("Pedido inválido", 400);
    r = await chamarFuncao("atualizar_pedido_broto", { p_id: dados.id, p_status: dados.status }, sessao.accessToken);
  } else if (acao === "recebimento") {
    if (typeof dados.pedido_id !== "string" || !Number.isInteger(dados.valor_centavos) || dados.valor_centavos <= 0 || typeof dados.data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dados.data) || !["pix", "cartao", "dinheiro", "transferencia", "outro"].includes(dados.forma)) return erro("Confira o recebimento", 400);
    r = await chamarFuncao("registrar_recebimento_broto", { p_pedido: dados.pedido_id, p_valor_centavos: dados.valor_centavos, p_data: dados.data, p_forma: dados.forma, p_referencia: dados.referencia ?? null }, sessao.accessToken);
  } else if (acao === "despesa") {
    if (typeof dados.descricao !== "string" || !dados.descricao.trim() || dados.descricao.length > 300 || !Number.isInteger(dados.valor_centavos) || dados.valor_centavos <= 0 || typeof dados.data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dados.data)) return erro("Confira a despesa", 400);
    r = await chamarFuncao("registrar_despesa_broto", { p_descricao: dados.descricao, p_valor_centavos: dados.valor_centavos, p_data: dados.data }, sessao.accessToken);
  } else return erro("Ação inválida", 400);
  return r.ok ? NextResponse.json({ ok: true, id: r.dados ?? null }) : erro("Não foi possível salvar. Confira os dados e tente novamente.", r.status >= 500 ? 503 : 400);
}
