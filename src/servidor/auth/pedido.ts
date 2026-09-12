import { config } from "../config";
import {
  consultarComoServico,
  pedirAcesso,
  usuarioDoToken,
  verificarCodigo,
} from "../supabase";
import { ehSessaoGoTrue, type SessaoGoTrue } from "../sessao";
import { podeReceber } from "./enderecos";

/**
 * Login sem senha, com confirmação em outro aparelho.
 *
 * **A divisão de trabalho.** O GoTrue gera o magic link, gera o código de seis
 * dígitos, entrega o e-mail e valida os dois. O que ele não tem é o conceito de
 * um pedido que uma aba fica perguntando por: ele emite um link e espera o
 * clique voltar no MESMO navegador. Quem pede no computador e abre o e-mail no
 * celular fica preso.
 *
 * `pedido_login` é esse conceito que falta. Três peças:
 *
 *   * `selector` — público, repetido a cada ciclo de polling. Não aprova nada,
 *     só pergunta. Por isso pode trafegar dezenas de vezes sem risco.
 *   * o token do GoTrue — segredo, e só existe para quem abriu o e-mail. É ele
 *     que aprova.
 *   * `sessao` — onde a sessão espera entre a aprovação no celular e o ciclo de
 *     polling que a entrega ao computador.
 *
 * O pedido é de uso único: ao virar sessão, some. O polling seguinte recebe
 * `nao_encontrado`, e é assim que a aba sabe parar em vez de girar até o
 * timeout.
 */

export type FalhaLogin =
  | "nao_encontrado"
  | "codigo_invalido"
  | "tentativas_demais"
  | "email_invalido"
  | "provedor_indisponivel"
  // Pedido repetido antes do prazo. Distinto de `tentativas_demais`, que destrói
  // o pedido: aqui o anterior continua VÁLIDO e o e-mail pode estar a caminho.
  | "reenvio_cedo_demais";

export type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; falha: FalhaLogin; mensagem: string; reenviar_em?: string };

function falhar<T>(
  falha: FalhaLogin,
  mensagem: string,
  reenviarEm?: string,
): Resultado<T> {
  return reenviarEm
    ? { ok: false, falha, mensagem, reenviar_em: reenviarEm }
    : { ok: false, falha, mensagem };
}

/**
 * Checagem sintática mínima.
 *
 * Validar e-mail por regex é um beco sem saída conhecido. A verificação real é
 * a entrega: só entra quem abre a mensagem.
 */
export function emailPlausivel(email: string): boolean {
  const arroba = email.indexOf("@");
  return (
    arroba > 0 &&
    arroba < email.length - 1 &&
    email.indexOf("@", arroba + 1) < 0 &&
    email.lastIndexOf(".") > arroba + 1 &&
    !email.includes(" ")
  );
}

/** Token url-safe por RNG criptográfico. Nunca `Math.random`. */
export function gerarSelector(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

interface LinhaPedido {
  id: string;
  email: string;
  selector: string;
  status: "pendente" | "aprovado";
  sessao: SessaoGoTrue | null;
  tentativas_otp: number;
  criado_em: string;
  expira_em: string;
}

async function buscarPorSelector(selector: string): Promise<LinhaPedido | null> {
  const r = await consultarComoServico<LinhaPedido[]>(
    `pedido_login?selector=eq.${encodeURIComponent(selector)}&select=*&limit=1`,
  );
  return r.ok && r.dados?.length ? r.dados[0] : null;
}

async function apagar(id: string): Promise<void> {
  await consultarComoServico(`pedido_login?id=eq.${id}`, { method: "DELETE" });
}

export interface InicioDeLogin {
  selector: string;
  email: string;
  email_enviado: boolean;
  mensagem: string;
  reenviar_em: string;
}

/** Inicia um pedido e devolve o selector para o polling. */
export async function iniciarLogin(
  emailBruto: unknown,
): Promise<Resultado<InicioDeLogin>> {
  const email =
    typeof emailBruto === "string" ? emailBruto.trim().toLowerCase() : "";

  if (!email || !emailPlausivel(email)) {
    return falhar("email_invalido", "Informe um e-mail válido.");
  }

  const agora = Date.now();

  /*
   * A espera de reenvio vem ANTES de invalidar o pedido anterior, de propósito:
   * quem pede cedo demais fica com o pedido que já tem, e o e-mail que talvez
   * esteja a caminho continua servindo. Invalidar e só então recusar deixaria a
   * pessoa sem nenhum caminho de entrada.
   */
  if (config.auth.reenvioMs > 0) {
    const recentes = await consultarComoServico<LinhaPedido[]>(
      `pedido_login?email=eq.${encodeURIComponent(email)}` +
        `&status=eq.pendente&order=criado_em.desc&limit=1&select=criado_em`,
    );

    const ultimo = recentes.ok ? recentes.dados?.[0] : null;
    if (ultimo) {
      const faltam =
        new Date(ultimo.criado_em).getTime() + config.auth.reenvioMs - agora;
      if (faltam > 0) {
        return falhar(
          "reenvio_cedo_demais",
          `Um acesso já foi enviado. Aguarde ${Math.ceil(faltam / 1000)}s.`,
          new Date(agora + faltam).toISOString(),
        );
      }
    }
  }

  /*
   * Um pedido novo invalida os anteriores do mesmo e-mail. Sem isso, links
   * antigos continuariam valendo e quem pediu duas vezes teria dois códigos
   * funcionando ao mesmo tempo.
   */
  await consultarComoServico(
    `pedido_login?email=eq.${encodeURIComponent(email)}`,
    { method: "DELETE" },
  );

  /*
   * E leva junto os vencidos de todo mundo.
   *
   * `pedido_login` guarda a sessão que atravessa do celular para o computador —
   * credencial em repouso. O que limita o estrago é ela viver minutos, e isso
   * só é verdade se alguém apagar. Sem cron, o momento natural é este: uma
   * varredura por login é barata (um DELETE por índice) e mantém a tabela do
   * tamanho do movimento do dia.
   *
   * Quando o NestJS entrar, isto vira tarefa agendada e sai daqui.
   */
  const varredura = await consultarComoServico<number>(
    "rpc/limpar_pedidos_de_login",
    { method: "POST", body: "{}" },
  );

  /*
   * Falha aqui não impede ninguém de entrar — mas precisa APARECER. Como
   * `consultarComoServico` não lança, uma permissão faltando deixaria a
   * varredura sem rodar em silêncio, e a tabela de credenciais crescendo sem
   * que nada quebrasse. Foi o que aconteceu: 403 por falta de USAGE no schema.
   */
  if (!varredura.ok) {
    console.error(
      `[auth] a varredura de pedidos vencidos falhou: HTTP ${varredura.status} ${varredura.erro}`,
    );
  }

  const selector = gerarSelector();

  /*
   * O selector viaja no `redirect_to`: é o fio que liga o clique no celular ao
   * pedido que está sendo pollado no computador.
   */
  const base = config.auth.urlPublica.replace(/\/$/, "");
  const retorno = `${base}/entrar/confirmar?selector=${encodeURIComponent(selector)}`;

  /*
   * Domínio reservado por RFC nunca recebe: a mensagem viraria hard bounce, e
   * bounce corrói a entregabilidade de todo o resto — inclusive do e-mail de
   * acesso de um cliente real. A supressão acontece ANTES de delegar ao GoTrue,
   * porque quem envia é ele.
   */
  const enviavel = podeReceber(email);

  const envio = enviavel
    ? await pedirAcesso(email, retorno)
    : { ok: false, status: 0, dados: null, erro: "dominio reservado" };

  if (!enviavel) {
    console.info(
      `[auth] envio suprimido para ${email}: domínio reservado por RFC 2606.`,
    );
  } else if (!envio.ok) {
    console.error(
      `[auth] o GoTrue recusou o pedido de ${email}: HTTP ${envio.status} ${envio.erro}`,
    );
  }

  /*
   * O pedido é gravado MESMO quando o envio falhou. Parece contraintuitivo, mas
   * o selector já vai para o cliente, que já começa a pollar — e um pedido
   * ausente daria 404 com a tela dizendo "seu acesso expirou" quando o que houve
   * foi falha de entrega.
   */
  const criado = await consultarComoServico(`pedido_login`, {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({
      email,
      selector,
      status: "pendente",
      expira_em: new Date(agora + config.auth.pedidoTtlMs).toISOString(),
    }),
  });

  if (!criado.ok) {
    console.error(`[auth] falha ao gravar o pedido de ${email}: ${criado.erro}`);
    return falhar(
      "provedor_indisponivel",
      "Não foi possível iniciar o acesso agora. Tente novamente em instantes.",
    );
  }

  return {
    ok: true,
    valor: {
      selector,
      email,
      email_enviado: envio.ok,
      /*
       * Três desfechos, três frases. O do meio existe porque "tente de novo em
       * instantes" é mentira para um domínio que não existe: tentar de novo
       * nunca vai funcionar, e a pessoa ficaria repetindo em vez de corrigir o
       * endereço.
       */
      mensagem: envio.ok
        ? "Enviamos um link e um código de acesso para o seu e-mail."
        : enviavel
          ? "Não foi possível enviar o e-mail agora. Tente novamente em instantes."
          : "Este endereço não recebe e-mail. Confira e tente outro.",
      reenviar_em: new Date(agora + config.auth.reenvioMs).toISOString(),
    },
  };
}

/**
 * Aprova o pedido com o token que o GoTrue emitiu.
 *
 * É o caminho cross-device: a pessoa abre o e-mail no celular, o GoTrue valida
 * o magic link dela e redireciona para uma página nossa com o `selector` na
 * query e a sessão no fragmento da URL. A página lê o fragmento e chama isto.
 * O polling que roda no computador recebe a sessão no ciclo seguinte.
 *
 * **As duas verificações que sustentam a segurança disto.** O selector é
 * PÚBLICO — viaja em cada chamada de polling —, então aprovar só por ele
 * deixaria qualquer um que observasse uma requisição entrar na conta alheia.
 * Por isso:
 *
 *   1. o token é validado CONTRA O GOTRUE, e não localmente, o que também
 *      recusa um token já revogado;
 *   2. o e-mail que o GoTrue devolve é comparado com o do pedido — sem essa
 *      comparação, um token válido de OUTRA conta aprovaria este.
 *
 * Devolve `false` para tudo que não passa. "Selector inexistente", "token
 * inválido" e "e-mail divergente" chegam iguais ao cliente: distinguir só
 * ajudaria quem está sondando.
 */
export async function aprovarComToken(
  selectorBruto: unknown,
  sessaoBruta: unknown,
): Promise<boolean> {
  if (typeof selectorBruto !== "string" || !selectorBruto) return false;
  if (!ehSessaoGoTrue(sessaoBruta)) return false;

  const pedido = await buscarPorSelector(selectorBruto);
  if (!pedido) return false;

  if (new Date(pedido.expira_em).getTime() < Date.now()) {
    await apagar(pedido.id);
    return false;
  }

  const dono = await usuarioDoToken(sessaoBruta.access_token);
  if (dono === null) return false;

  if (dono.email !== pedido.email.toLowerCase()) {
    console.warn(
      `[auth] token de ${dono.email} não corresponde ao pedido de ${pedido.email}`,
    );
    return false;
  }

  const atualizado = await consultarComoServico(
    `pedido_login?id=eq.${pedido.id}`,
    {
      method: "PATCH",
      headers: { prefer: "return=minimal" },
      body: JSON.stringify({
        status: "aprovado",
        sessao: {
          access_token: sessaoBruta.access_token,
          refresh_token: sessaoBruta.refresh_token,
          expires_in: sessaoBruta.expires_in ?? 3600,
        },
      }),
    },
  );

  if (!atualizado.ok) {
    console.error(`[auth] falha ao aprovar o pedido ${pedido.id}: ${atualizado.erro}`);
    return false;
  }

  console.info(`[auth] acesso aprovado por magic link para ${pedido.email}`);
  return true;
}

/**
 * O polling. Devolve pendente enquanto ninguém confirmou; quando confirmado,
 * entrega a sessão e consome o pedido.
 */
export async function consultarPedido(
  selectorBruto: unknown,
): Promise<Resultado<{ status: "pendente" } | { status: "aprovado"; sessao: SessaoGoTrue }>> {
  if (typeof selectorBruto !== "string" || !selectorBruto) {
    return falhar("nao_encontrado", "Pedido de acesso não encontrado.");
  }

  const pedido = await buscarPorSelector(selectorBruto);

  /*
   * Ausente, expirado e já consumido caem no mesmo desfecho de propósito: são
   * indistinguíveis de fora, e para a aba significam a mesma coisa — pare de
   * perguntar.
   */
  if (!pedido) {
    return falhar("nao_encontrado", "Pedido de acesso não encontrado ou já usado.");
  }

  if (new Date(pedido.expira_em).getTime() < Date.now()) {
    await apagar(pedido.id);
    return falhar("nao_encontrado", "Pedido expirado. Solicite um novo acesso.");
  }

  if (pedido.status !== "aprovado" || !pedido.sessao) {
    return { ok: true, valor: { status: "pendente" } };
  }

  // Uso único: o pedido morre junto com a entrega da sessão.
  await apagar(pedido.id);

  return { ok: true, valor: { status: "aprovado", sessao: pedido.sessao } };
}

/**
 * Valida o código de seis dígitos e emite a sessão na hora.
 *
 * Caminho de quem prefere não sair da aba. Não passa pelo `sessao` da tabela:
 * o GoTrue devolve a sessão direto para quem digitou, e o pedido só serve para
 * contar tentativas e localizar o e-mail.
 */
export async function verificarOtp(
  selectorBruto: unknown,
  codigoBruto: unknown,
): Promise<Resultado<SessaoGoTrue>> {
  if (typeof selectorBruto !== "string" || typeof codigoBruto !== "string") {
    return falhar("nao_encontrado", "Pedido de acesso inválido.");
  }

  const pedido = await buscarPorSelector(selectorBruto);

  if (!pedido || new Date(pedido.expira_em).getTime() < Date.now()) {
    if (pedido) await apagar(pedido.id);
    return falhar("nao_encontrado", "Pedido não encontrado ou expirado.");
  }

  if (pedido.tentativas_otp >= config.auth.maxTentativasOtp) {
    await apagar(pedido.id);
    return falhar("tentativas_demais", "Muitas tentativas. Solicite um novo acesso.");
  }

  const resposta = await verificarCodigo(pedido.email, codigoBruto);

  /*
   * 400/401/403 = o GoTrue respondeu e disse que o código não serve. Qualquer
   * outro status é problema DELE, não do código — e a distinção importa: contar
   * tentativa por indisponibilidade consumiria o orçamento de quem não errou
   * nada, e a tela diria "código incorreto" para uma queda de dois segundos.
   */
  if (!resposta.ok) {
    if (![400, 401, 403].includes(resposta.status)) {
      console.error(
        `[auth] o GoTrue falhou ao verificar o código de ${pedido.email}: ` +
          `HTTP ${resposta.status} ${resposta.erro}`,
      );
      return falhar(
        "provedor_indisponivel",
        "Não foi possível verificar o código agora. Tente novamente em instantes.",
      );
    }

    await consultarComoServico(`pedido_login?id=eq.${pedido.id}`, {
      method: "PATCH",
      headers: { prefer: "return=minimal" },
      body: JSON.stringify({ tentativas_otp: pedido.tentativas_otp + 1 }),
    });

    return falhar("codigo_invalido", "Código incorreto.");
  }

  if (!ehSessaoGoTrue(resposta.dados)) {
    return falhar(
      "provedor_indisponivel",
      "O provedor respondeu sem sessão. Tente novamente em instantes.",
    );
  }

  await apagar(pedido.id);
  return { ok: true, valor: resposta.dados };
}

/** Mapeia a falha para o status HTTP que a tela precisa distinguir. */
export function statusDaFalha(falha: FalhaLogin): number {
  switch (falha) {
    case "nao_encontrado":
      return 404;
    case "codigo_invalido":
      return 401;
    case "tentativas_demais":
      return 429;
    case "reenvio_cedo_demais":
      return 429;
    case "email_invalido":
      return 400;
    case "provedor_indisponivel":
      // 503 e não 401: o cliente não errou nada.
      return 503;
  }
}
