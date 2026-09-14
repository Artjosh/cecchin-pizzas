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
const ANON = process.env.SUPABASE_ANON_KEY;

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
  if (!SERVICE || !ANON) throw new Error("faltam as chaves locais do Supabase no ambiente.");

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

  /*
   * Não chama `/api/auth/login?passo=iniciar`: essa rota entrega e-mail de
   * verdade. `generate_link` não entrega nada; validar o OTP no GoTrue local
   * produz a mesma sessão httpOnly que o BFF receberia depois do código.
   */
  const fim = await fetch(`${SUPABASE}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: ANON, "content-type": "application/json" },
    body: JSON.stringify({ email, token: codigo, type: "email" }),
  });

  if (!fim.ok) throw new Error(`login recusado: HTTP ${fim.status}`);

  const sessao = await fim.json();
  if (!sessao.access_token || !sessao.refresh_token) throw new Error("GoTrue não devolveu uma sessão de teste.");
  const cookies = [
    { name: "cecchin_acesso", value: sessao.access_token, domain: dominio, path: "/" },
    { name: "cecchin_renovacao", value: sessao.refresh_token, domain: dominio, path: "/" },
  ];

  if (fonte) {
    cookies.push({ name: "cecchin_fonte", value: fonte, domain: dominio, path: "/" });
  }

  return cookies;
}
