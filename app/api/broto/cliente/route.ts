import { NextResponse, type NextRequest } from "next/server";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { chamarFuncao, consultar } from "@/src/servidor/supabase";

const erro = (mensagem: string, status: number) => NextResponse.json({ mensagem }, { status });

export async function GET(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return erro("Entre na sua conta", 401);
  const paginaTexto = request.nextUrl.searchParams.get("pagina") ?? "0";
  if (!/^\d{1,4}$/.test(paginaTexto)) return erro("Página inválida", 400);
  const pagina = Number(paginaTexto);
  const limite = 50;
  if (request.nextUrl.searchParams.get("somentePedidos") === "1") {
    const clientes = await consultar(`cliente_broto?select=id&usuario_id=eq.${sessao.usuario.id}&limit=1`, sessao.accessToken);
    if (!clientes.ok) return erro("Falha ao carregar pedidos", 503);
    const id = Array.isArray(clientes.dados) ? clientes.dados[0]?.id : null;
    if (!id) return NextResponse.json({ pedidos: [], temMaisPedidos: false }, { headers: { "Cache-Control": "no-store" } });
    const pedidos = await consultar(`pedido_broto?select=id,total_centavos,status,pagamento_status,solicitado_em,prazo_entrega,item_pedido_broto(nome_produto,quantidade,preco_unitario_centavos)&cliente_id=eq.${id}&order=solicitado_em.desc,id.desc&limit=${limite + 1}&offset=${pagina * limite}`, sessao.accessToken);
    if (!pedidos.ok) return erro("Falha ao carregar pedidos", 503);
    const lista = Array.isArray(pedidos.dados) ? pedidos.dados : [];
    return NextResponse.json({ pedidos: lista.slice(0, limite), temMaisPedidos: lista.length > limite }, { headers: { "Cache-Control": "no-store" } });
  }
  const [clientes, produtos] = await Promise.all([
    consultar(`cliente_broto?select=id,razao_social,cnpj,telefone,endereco,cidade,uf,cep,complemento,ativo&usuario_id=eq.${sessao.usuario.id}&limit=1`, sessao.accessToken),
    consultar("produto_broto?select=id,nome,descricao,preco_base_centavos&ativo=eq.true&order=nome.asc&limit=100", sessao.accessToken),
  ]);
  if (!clientes.ok || !produtos.ok) return erro("Não foi possível carregar o catálogo de brotos", 503);
  const cliente = Array.isArray(clientes.dados) ? clientes.dados[0] ?? null : null;
  const id = cliente && typeof cliente === "object" && "id" in cliente ? String(cliente.id) : null;
  if (!id) return NextResponse.json({ cliente: null, produtos: produtos.dados ?? [], precos: [], pedidos: [], temMaisPedidos: false }, { headers: { "Cache-Control": "no-store" } });
  const [precos, pedidos] = await Promise.all([
    consultar(`preco_cliente_broto?select=cliente_id,produto_id,valor_centavos&cliente_id=eq.${id}&limit=100`, sessao.accessToken),
    consultar(`pedido_broto?select=id,cliente_id,total_centavos,status,pagamento_status,valor_pago_centavos,solicitado_em,prazo_entrega,endereco_entrega,observacao,item_pedido_broto(produto_id,nome_produto,quantidade,preco_unitario_centavos)&cliente_id=eq.${id}&order=solicitado_em.desc,id.desc&limit=${limite + 1}&offset=${pagina * limite}`, sessao.accessToken),
  ]);
  if (!precos.ok || !pedidos.ok) return erro("Não foi possível carregar seus pedidos", 503);
  const lista = Array.isArray(pedidos.dados) ? pedidos.dados : [];
  return NextResponse.json({ cliente, produtos: produtos.dados ?? [], precos: precos.dados ?? [], pedidos: lista.slice(0, limite), temMaisPedidos: lista.length > limite }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return erro("Origem inválida", 403);
  const sessao = await sessaoAtual();
  if (!sessao) return erro("Entre na sua conta", 401);
  const dados = await request.json().catch(() => null);
  if (!dados || typeof dados !== "object") return erro("Dados inválidos", 400);
  if (dados.acao === "cadastro") {
    if (typeof dados.razao_social !== "string" || dados.razao_social.trim().length < 2 || typeof dados.cnpj !== "string" || typeof dados.endereco !== "string" || typeof dados.cidade !== "string" || typeof dados.uf !== "string" || typeof dados.cep !== "string") return erro("Confira o cadastro do estabelecimento", 400);
    const r = await chamarFuncao("salvar_cliente_broto", { p_dados: { ...dados, usuario_id: sessao.usuario.id } }, sessao.accessToken);
    return r.ok ? NextResponse.json({ id: r.dados }) : erro("Não foi possível salvar o cadastro. Confira CNPJ, CEP e endereço.", r.status >= 500 ? 503 : 400);
  }
  if (dados.acao === "pedido") {
    if (!Array.isArray(dados.itens) || dados.itens.length < 1 || dados.itens.length > 100 || dados.itens.some((i: unknown) => !i || typeof i !== "object" || typeof (i as { produto_id?: unknown }).produto_id !== "string" || !Number.isInteger((i as { quantidade?: unknown }).quantidade)) || typeof dados.observacao !== "string" || dados.observacao.length > 1000 || !Number.isInteger(dados.total_centavos) || dados.total_centavos <= 0) return erro("Confira os itens e o total do pedido", 400);
    const r = await chamarFuncao("criar_pedido_broto_verificado", { p_itens: dados.itens, p_observacao: dados.observacao, p_total_esperado: dados.total_centavos }, sessao.accessToken);
    if (!r.ok && r.erro?.includes("Preco do pedido mudou")) return erro("O preço mudou. Confira o total atualizado e envie o pedido novamente.", 409);
    return r.ok ? NextResponse.json({ id: r.dados }) : erro("Não foi possível registrar o pedido. Atualize o catálogo e tente novamente.", r.status >= 500 ? 503 : 400);
  }
  return erro("Ação inválida", 400);
}
