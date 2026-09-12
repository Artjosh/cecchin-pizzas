/**
 * Cookies de uma sessão de verdade, para o Playwright entrar nas telas que
 * exigem login — que são quase todas.
 *
 * **Por que não preencher o formulário de login na tela.** O acesso é sem
 * senha: o código de seis dígitos sai por e-mail. Automatizar a caixa de
 * entrada seria lento e frágil, e com a Brevo configurada o e-mail sai para o
 * mundo. `admin/generate_link` devolve o `email_otp` na resposta e NÃO dispara
 * envio — o código é do GoTrue de verdade, e o resto do fluxo é o mesmo que uma
 * pessoa faria.
 *
 * Exige `SUPABASE_SERVICE_ROLE_KEY`, o que é adequado: roda fora do navegador,
 * em ferramenta de verificação, e a chave não sai do processo do Node.
 *
 *   set -a; . ./.env; set +a
 *   node skills/verificar-tela/captura.mjs
 */

const SUPABASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Entra e devolve os cookies no formato que `context.addCookies()` espera.
 *
 * `fonte` grava o cookie do interruptor: sem ele a tela abre no desenho, e a
 * verificação mede o mock em vez do banco.
 */
export async function cookiesDeSessao(
  alvo,
  email,
  fonte = "real",
  dominio = "localhost",
) {
  if (!SERVICE) {
    throw new Error(
      "falta SUPABASE_SERVICE_ROLE_KEY no ambiente: `set -a; . ./.env; set +a`",
    );
  }

  const inicio = await fetch(`${alvo}/api/auth/login?passo=iniciar`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!inicio.ok) {
    throw new Error(`pedido de acesso recusado: HTTP ${inicio.status}`);
  }

  const { selector } = await inicio.json();

  const gerado = await fetch(`${SUPABASE}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      apikey: SERVICE,
      authorization: `Bearer ${SERVICE}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ type: "magiclink", email }),
  });

  const { email_otp: codigo } = await gerado.json();
  if (!codigo) throw new Error(`generate_link não devolveu código para ${email}`);

  const fim = await fetch(`${alvo}/api/auth/login?passo=codigo`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ selector, codigo }),
  });

  if (!fim.ok) throw new Error(`login recusado: HTTP ${fim.status}`);

  const cookies = fim.headers.getSetCookie().map((bruto) => {
    const [par] = bruto.split(";");
    const i = par.indexOf("=");
    return {
      name: par.slice(0, i).trim(),
      value: par.slice(i + 1).trim(),
      domain: dominio,
      path: "/",
    };
  });

  if (fonte) {
    cookies.push({ name: "cecchin_fonte", value: fonte, domain: dominio, path: "/" });
  }

  return cookies;
}
