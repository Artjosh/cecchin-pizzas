import { config } from "./config";

/**
 * Acesso ao Supabase pelo lado servidor — GoTrue e PostgREST por HTTP direto.
 *
 * **Por que sem `@supabase/supabase-js`.** O cliente oficial carrega um
 * gerenciador de sessão que guarda token em storage e o renova sozinho — útil
 * no browser, exatamente o contrário do que este BFF quer. Aqui a sessão mora
 * em cookie `httpOnly` e quem decide renovar é o servidor. As chamadas que
 * fazemos são poucas e diretas; o `fetch` deixa visível qual token vai em qual
 * requisição, que é a coisa mais importante deste arquivo.
 *
 * **As três identidades, e quando cada uma vale.**
 *
 *   * `anon` — antes de existir sessão. É com ela que se pede o magic link.
 *   * o token do usuário — toda leitura e escrita de dado. É o que faz a RLS
 *     valer: o Postgres vê `auth.uid()` e aplica as policies.
 *   * `service_role` — ignora RLS. Só no pedido de login, que por definição
 *     acontece quando ainda não há usuário para a RLS reconhecer.
 *
 * Usar `service_role` para ler dado de tela seria desligar a RLS e reimplementar
 * a autorização na mão, em TypeScript, em cada consulta. A regra fica no banco.
 */

function sinal(): AbortSignal {
  // O `fetch` do Node não tem timeout. Sem isto, um GoTrue lento seguraria a
  // resposta do login por minutos — indistinguível de página travada.
  return AbortSignal.timeout(config.supabase.timeoutMs);
}

function base(): string {
  return config.supabase.url.replace(/\/$/, "");
}

export interface RespostaSupabase<T> {
  total?: number;
  ok: boolean;
  status: number;
  dados: T | null;
  erro: string | null;
}

async function chamar<T>(
  caminho: string,
  init: RequestInit,
  apikey: string,
): Promise<RespostaSupabase<T>> {
  try {
    const resposta = await fetch(base() + caminho, {
      ...init,
      headers: {
        apikey,
        "content-type": "application/json",
        ...(init.headers as Record<string, string> | undefined),
      },
      signal: sinal(),
    });

    const texto = await resposta.text();
    const corpo = texto ? (JSON.parse(texto) as T) : null;

    if (!resposta.ok) {
      return {
        ok: false,
        status: resposta.status,
        dados: null,
        erro: texto.slice(0, 500),
      };
    }

    const contagem = resposta.headers.get("content-range")?.split("/")[1];
    const total = contagem && /^\d+$/.test(contagem) ? Number(contagem) : undefined;
    return { ok: true, status: resposta.status, dados: corpo, erro: null, total };
  } catch (erro) {
    // Timeout, DNS, TLS, indisponibilidade. Nunca lança: quem chama precisa
    // distinguir "o provedor está fora" de "o usuário errou", e exceção
    // apagaria essa diferença.
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return { ok: false, status: 0, dados: null, erro: mensagem };
  }
}

// ---------------------------------------------------------------- GoTrue

/** Pede um magic link + OTP para o e-mail. O GoTrue gera e entrega os dois. */
export function pedirAcesso(
  email: string,
  redirecionarPara: string,
): Promise<RespostaSupabase<unknown>> {
  const url =
    "/auth/v1/otp?redirect_to=" + encodeURIComponent(redirecionarPara);

  return chamar(
    url,
    {
      method: "POST",
      body: JSON.stringify({
        email,
        // Não existe tela de cadastro neste produto: o primeiro acesso com um
        // e-mail cria a conta. Com `false`, um e-mail novo receberia erro em
        // vez de entrar.
        create_user: true,
      }),
    },
    config.supabase.anonKey,
  );
}

/** Valida o código de seis dígitos. Devolve a sessão quando confere. */
export function verificarCodigo(
  email: string,
  codigo: string,
): Promise<RespostaSupabase<Record<string, unknown>>> {
  return chamar(
    "/auth/v1/verify",
    {
      method: "POST",
      body: JSON.stringify({
        email,
        token: codigo.trim(),
        // `email` é o tipo do OTP digitável. `magiclink` valida o token longo
        // do link, que não é o que a pessoa digita.
        type: "email",
      }),
    },
    config.supabase.anonKey,
  );
}

/** Consome o hash que veio no magic link; a sessão resultante fica no BFF. */
export function verificarMagicLink(
  tokenHash: string,
): Promise<RespostaSupabase<Record<string, unknown>>> {
  return chamar(
    "/auth/v1/verify",
    {
      method: "POST",
      // `email` aceita tanto o primeiro acesso (signup) quanto acessos seguintes.
      body: JSON.stringify({ token_hash: tokenHash, type: "email" }),
    },
    config.supabase.anonKey,
  );
}

/**
 * Troca o código de retorno do OAuth por uma sessão no servidor.
 *
 * O `code_verifier` nunca chega ao JavaScript da tela: ele fica em cookie
 * httpOnly por poucos minutos entre a ida ao provedor e este retorno. Assim a
 * sessão social termina do mesmo jeito que o OTP, nos cookies do BFF.
 */
export function trocarCodigoOauth(
  codigo: string,
  verificador: string,
): Promise<RespostaSupabase<Record<string, unknown>>> {
  return chamar(
    "/auth/v1/token?grant_type=pkce",
    {
      method: "POST",
      body: JSON.stringify({ auth_code: codigo, code_verifier: verificador }),
    },
    config.supabase.anonKey,
  );
}

/**
 * Pergunta ao GoTrue de quem é um access token.
 *
 * **Por que perguntar em vez de verificar a assinatura aqui.** Validar
 * localmente com o segredo do JWT dispensaria a rede — e aceitaria um token já
 * revogado. Um logout, ou um usuário desativado, continuaria autenticando por
 * até uma hora. Para o passo que decide "esta pessoa abriu o e-mail e pode
 * entrar", a resposta autoritativa vale a chamada.
 */
export async function usuarioDoToken(
  accessToken: string,
): Promise<{ id: string; email: string } | null> {
  if (!accessToken) return null;

  const resposta = await chamar<{ id?: string; email?: string }>(
    "/auth/v1/user",
    { method: "GET", headers: { authorization: `Bearer ${accessToken}` } },
    config.supabase.anonKey,
  );

  if (!resposta.ok || !resposta.dados?.id || !resposta.dados.email) return null;

  return {
    id: resposta.dados.id,
    email: resposta.dados.email.trim().toLowerCase(),
  };
}

/** Troca um refresh token por uma sessão nova. */
export function renovarSessao(
  refreshToken: string,
): Promise<RespostaSupabase<Record<string, unknown>>> {
  return chamar(
    "/auth/v1/token?grant_type=refresh_token",
    { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) },
    config.supabase.anonKey,
  );
}

/** Encerra a sessão no GoTrue, não só no cookie. */
export function encerrarNoProvedor(
  accessToken: string,
): Promise<RespostaSupabase<unknown>> {
  return chamar(
    "/auth/v1/logout",
    { method: "POST", headers: { authorization: `Bearer ${accessToken}` } },
    config.supabase.anonKey,
  );
}

// -------------------------------------------------------------- PostgREST

/**
 * Consulta o PostgREST **como o usuário**, para a RLS valer.
 *
 * `caminho` é a parte depois de `/rest/v1/`, com os filtros do PostgREST:
 * `"usuario?id=eq.123&select=papel"`.
 */
export function consultar<T>(
  caminho: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<RespostaSupabase<T>> {
  return chamar<T>(
    "/rest/v1/" + caminho.replace(/^\//, ""),
    {
      ...init,
      headers: {
        authorization: `Bearer ${accessToken}`,
        ...(init.headers as Record<string, string> | undefined),
      },
    },
    config.supabase.anonKey,
  );
}

/**
 * Consulta **ignorando a RLS**.
 *
 * Existe para um caso só: o pedido de login, que acontece antes de haver
 * usuário autenticado — não há `auth.uid()` para a policy reconhecer, e a
 * tabela `pedido_login` nega tudo a `anon` e `authenticated` justamente por
 * isso.
 *
 * Qualquer outro uso precisa de justificativa escrita. Ler dado de tela por
 * aqui desligaria a RLS e moveria a autorização para o TypeScript, consulta a
 * consulta.
 */
export function consultarComoServico<T>(
  caminho: string,
  init: RequestInit = {},
): Promise<RespostaSupabase<T>> {
  return chamar<T>(
    "/rest/v1/" + caminho.replace(/^\//, ""),
    {
      ...init,
      headers: {
        authorization: `Bearer ${config.supabase.serviceRoleKey}`,
        ...(init.headers as Record<string, string> | undefined),
      },
    },
    config.supabase.serviceRoleKey,
  );
}

/** Chama uma função do banco (`app.promover`, etc.) como o usuário. */
export function chamarFuncao<T>(
  nome: string,
  argumentos: Record<string, unknown>,
  accessToken: string,
): Promise<RespostaSupabase<T>> {
  return consultar<T>(`rpc/${nome}`, accessToken, {
    method: "POST",
    body: JSON.stringify(argumentos),
  });
}
