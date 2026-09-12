import { execFileSync } from "node:child_process";

/**
 * Ferramentas dos testes de integração.
 *
 * Estes testes falam HTTP de verdade com o BFF, o GoTrue, o PostgREST e o
 * Mailpit. Nada de mock de `fetch`: o que se quer medir aqui é exatamente o
 * que um mock esconderia — que o cookie sai com as opções certas, que o corpo
 * não traz token, que a RLS recusa a consulta.
 */

export const BFF = process.env.ALVO_BFF ?? "http://localhost:3000";
export const MAILPIT = process.env.ALVO_MAILPIT ?? "http://127.0.0.1:54324";
const CONTAINER = process.env.CONTAINER_DB ?? "supabase_db_Nicolas";

/**
 * Um navegador: pote de cookies próprio.
 *
 * O cross-device só é testável com dois destes — um "computador" e um
 * "celular" que não compartilham nada. Com um pote só, o teste passaria mesmo
 * se o fluxo dependesse do cookie do aparelho que abriu o link.
 */
export class Aparelho {
  private cookies = new Map<string, string>();
  /** Os atributos com que cada cookie foi gravado. É onde mora a segurança. */
  readonly atributos = new Map<string, string>();

  async pedir(
    caminho: string,
    opcoes: { metodo?: string; corpo?: unknown; seguirRedirect?: boolean } = {},
  ): Promise<{ status: number; corpo: any; destino: string | null; texto: string }> {
    const cabecalhos: Record<string, string> = {};
    if (this.cookies.size > 0) {
      cabecalhos.cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
    }
    if (opcoes.corpo !== undefined) cabecalhos["content-type"] = "application/json";

    const url = caminho.startsWith("http") ? caminho : BFF + caminho;

    const resposta = await fetch(url, {
      method: opcoes.metodo ?? (opcoes.corpo !== undefined ? "POST" : "GET"),
      headers: cabecalhos,
      body: opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined,
      redirect: opcoes.seguirRedirect === false ? "manual" : "follow",
    });

    this.guardarCookies(resposta);

    const texto = await resposta.text();
    let corpo: any = null;
    try {
      corpo = texto ? JSON.parse(texto) : null;
    } catch {
      corpo = null;
    }

    return {
      status: resposta.status,
      corpo,
      destino: resposta.headers.get("location"),
      texto,
    };
  }

  /** Abre uma rota sem seguir redirecionamento, para medir o 307 do guarda. */
  rota(caminho: string) {
    return this.pedir(caminho, { seguirRedirect: false });
  }

  private guardarCookies(resposta: Response) {
    const brutos = (resposta.headers as any).getSetCookie?.() ?? [];
    for (const bruto of brutos as string[]) {
      const [par, ...resto] = bruto.split(";");
      const i = par.indexOf("=");
      const nome = par.slice(0, i).trim();
      const valor = par.slice(i + 1).trim();

      this.atributos.set(nome, resto.join(";").toLowerCase());

      // Cookie apagado pelo servidor some daqui também, senão o teste
      // continuaria mandando um valor que já foi revogado.
      if (valor === "" || /max-age=0|expires=thu, 01 jan 1970/i.test(bruto)) {
        this.cookies.delete(nome);
      } else {
        this.cookies.set(nome, valor);
      }
    }
  }

  /** Define um cookie como o browser faria. Para preferência, não sessão. */
  definirCookie(nome: string, valor: string) {
    this.cookies.set(nome, valor);
  }

  temCookie(nome: string) {
    return this.cookies.has(nome);
  }

  valorDoCookie(nome: string) {
    return this.cookies.get(nome);
  }
}

/** Roda SQL no container do Postgres. Usado para montar e conferir cenário. */
export function sql(comando: string): string {
  return execFileSync(
    "docker",
    ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-tAc", comando],
    { encoding: "utf8" },
  ).trim();
}

export async function limparEmails(): Promise<void> {
  await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE" });
}

const SUPABASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/**
 * O código de seis dígitos, sem passar por caixa de entrada nenhuma.
 *
 * **Por que não ler do Mailpit.** O Mailpit só recebe quando o SMTP local está
 * ligado; com a Brevo configurada, o e-mail sai para o mundo e a suíte ficaria
 * sem como entrar. Pior: os endereços de teste usam TLD reservada por RFC, que
 * o BFF nem tenta enviar — de propósito, para não gerar hard bounce.
 *
 * `admin/generate_link` resolve os dois: devolve `email_otp` na resposta e
 * **não dispara envio**. O código é do GoTrue de verdade, e a verificação que
 * o teste exercita depois é a mesma que um usuário real faria.
 *
 * Exige `service_role`, o que é adequado: é ferramenta de teste, roda fora do
 * navegador, e a chave nunca sai do processo do Vitest.
 */
export async function codigoDeAcesso(
  email: string,
  selector?: string,
): Promise<{ codigo: string; link: string }> {
  /*
   * `redirect_to` vai no TOPO do corpo, não dentro de `options` — ali o GoTrue
   * ignora em silêncio e cai no `site_url`, e o link volta sem o selector.
   * É o que o teste de cross-device precisa: sem selector no link, o clique no
   * celular não tem como liberar a aba do computador.
   */
  const retorno = selector
    ? `${BFF}/entrar/confirmar?selector=${encodeURIComponent(selector)}`
    : `${BFF}/entrar/confirmar`;

  const r = await fetch(`${SUPABASE}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      apikey: SERVICE,
      authorization: `Bearer ${SERVICE}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ type: "magiclink", email, redirect_to: retorno }),
  });

  const corpo = await r.json();
  if (!r.ok || !corpo.email_otp) {
    throw new Error(`generate_link falhou para ${email}: ${JSON.stringify(corpo)}`);
  }

  return { codigo: corpo.email_otp, link: corpo.action_link };
}

/**
 * Espera o e-mail chegar no Mailpit.
 *
 * Só serve com o SMTP local ligado. Quem precisa apenas do código deve usar
 * `codigoDeAcesso()`, que não depende de entrega.
 */
export async function esperarEmail(
  paraEmail: string,
): Promise<{ codigo: string; link: string; assunto: string }> {
  for (let tentativa = 0; tentativa < 40; tentativa += 1) {
    const lista = await (await fetch(`${MAILPIT}/api/v1/messages?limit=20`)).json();

    const msg = (lista.messages ?? []).find((m: any) =>
      m.To?.some((d: any) => d.Address?.toLowerCase() === paraEmail.toLowerCase()),
    );

    if (msg) {
      const det = await (await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`)).json();
      const html = (det.HTML ?? "") + (det.Text ?? "");
      const codigo =
        html.match(/>\s*(\d{6})\s*</)?.[1] ?? html.match(/\b(\d{6})\b/)?.[1] ?? "";
      const link = (html.match(/href="([^"]*auth\/v1\/verify[^"]*)"/)?.[1] ?? "")
        .replace(/&amp;/g, "&");
      return { codigo, link, assunto: msg.Subject };
    }

    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`o e-mail para ${paraEmail} não chegou no Mailpit`);
}

/** Entra de verdade, pelo código, e devolve o aparelho já com sessão. */
export async function entrar(
  email: string,
  aparelho = new Aparelho(),
): Promise<Aparelho> {
  const inicio = await aparelho.pedir("/api/auth/login?passo=iniciar", {
    corpo: { email },
  });
  if (inicio.status !== 200) {
    throw new Error(`não deu para pedir acesso de ${email}: ${inicio.texto}`);
  }

  const { codigo } = await codigoDeAcesso(email);

  const fim = await aparelho.pedir("/api/auth/login?passo=codigo", {
    corpo: { selector: inicio.corpo.selector, codigo },
  });
  if (fim.status !== 200) {
    throw new Error(`não deu para entrar como ${email}: ${fim.texto}`);
  }

  return aparelho;
}

/**
 * Um e-mail único por execução, em TLD reservada pela RFC 2606.
 *
 * `.test` nunca existe e nunca recebe. O BFF suprime o envio para ele, então
 * nenhum teste gasta cota da Brevo, manda mensagem para gente de verdade, ou
 * gera hard bounce — que corroeria a entregabilidade dos e-mails reais.
 */
export function emailDeTeste(prefixo: string): string {
  const marca = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return `${prefixo}.${marca}@cecchin.test`;
}

/**
 * Apaga o que um teste criou. Chamado no `afterAll`.
 *
 * Os pedidos de login vão junto: `pedido_login` não tem FK para `usuario` — o
 * pedido existe antes de haver conta —, então apagar a conta deixaria o pedido
 * órfão no banco.
 */
export function apagarContas(emails: string[]): void {
  if (emails.length === 0) return;
  const lista = emails.map((e) => `'${e.replace(/'/g, "''")}'`).join(",");
  sql(`delete from pedido_login where email in (${lista})`);
  sql(`delete from auth.users where email in (${lista})`);
}
