/** Ambiente HTTP sem dados operacionais, workers ou credenciais de produção.
 * Da raiz frontend: node skills/provar-cadeia/http-isolado.mjs preparar
 * Depois: node skills/provar-cadeia/http-isolado.mjs servir
 * Em outro terminal: node skills/provar-cadeia/http-isolado.mjs testar
 * Não apaga bancos/volumes nem interrompe serviços existentes.
 */
import { execFileSync, spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHmac, randomBytes } from "node:crypto";
import { createServer, request } from "node:http";
import { resolve } from "node:path";

const raiz = resolve(import.meta.dirname, "../..");
const backend = resolve(raiz, "../cecchin-pizzas-backend");
const arquivo = resolve(raiz, ".env.http-test.json");
const acao = process.argv[2];
const container = "supabase_db_Nicolas";
const nomes = { auth: "cecchin-http-auth-test", rest: "cecchin-http-rest-test", mail: "cecchin-http-mail-test" };
function docker(args, input) { return execFileSync("docker", args, { input, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }); }
function psql(banco, consulta) { return docker(["exec", "-i", container, "psql", "-U", "postgres", "-d", banco, "-v", "ON_ERROR_STOP=1", "-At"], consulta); }
function jwt(segredo, role) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
  const conteudo = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ role, iss: "supabase", iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+7*86400 })}`;
  return `${conteudo}.${createHmac("sha256",segredo).update(conteudo).digest("base64url")}`;
}
function iniciarContainer(nome, imagem, portas, env) {
  const args = ["run", "-d", "--name", nome, "--network", "cecchin-http-test"];
  for (const porta of portas) args.push("-p", `127.0.0.1:${porta}`);
  for (const [chave, valor] of Object.entries(env)) args.push("-e", `${chave}=${valor}`);
  args.push(imagem);
  docker(args);
}

if (acao === "preparar") {
  if (existsSync(arquivo)) throw new Error("Ambiente já registrado. Use servir/testar; não sobrescrever uma base existente.");
  for (const nome of Object.values(nomes)) {
    const existentes = docker(["ps", "-a", "--filter", `name=^/${nome}$`, "--format", "{{.Names}}"]);
    if (existentes.trim()) throw new Error(`Container de testes já existe: ${nome}. Inspecione antes de recriar.`);
  }
  const banco = `cecchin_http_test_${Date.now()}`;
  docker(["exec",container,"createdb","-U","postgres",banco]);
  psql(banco, "create schema if not exists extensions; create extension if not exists citext with schema public; create extension if not exists unaccent with schema public; create extension if not exists pgcrypto with schema extensions; create extension if not exists \"uuid-ossp\" with schema extensions;");
  // Cópia de definições, nunca linhas de negócio. Os default ACL de papéis
  // gerenciados não podem ser restaurados por postgres; grants de objetos ficam.
  let schema = docker(["exec",container,"pg_dump","-U","postgres","-d","postgres","--schema-only","--no-owner","--schema=public","--schema=app","--schema=auth"]);
  schema = schema.replaceAll("CREATE SCHEMA public;","CREATE SCHEMA IF NOT EXISTS public;").replace(/^ALTER DEFAULT PRIVILEGES[^\n]*\n/gm, "");
  psql(banco, schema);
  const versoes = psql("postgres", "select version from auth.schema_migrations;").trim().split(/\r?\n/);
  if (versoes.some(v => !/^\d+$/.test(v))) throw new Error("Formato inesperado do histórico GoTrue");
  psql(banco, `insert into auth.schema_migrations(version) values ${versoes.map(v => `('${v}')`).join(",")};`);
  psql(banco, readFileSync(resolve(import.meta.dirname,"http-isolado-fixtures.sql"),"utf8"));
  const segredo = randomBytes(48).toString("hex");
  const env = { CECCHIN_HTTP_TEST: "true", BANCO_TESTE_HTTP: banco, CONTAINER_DB: container,
    SUPABASE_URL: "http://127.0.0.1:54621", SUPABASE_ANON_KEY: jwt(segredo,"anon"), SUPABASE_SERVICE_ROLE_KEY: jwt(segredo,"service_role"),
    ALVO_BFF: "http://localhost:3100", APP_URL: "http://localhost:3100", AUTH_REDIRECT_URL: "http://localhost:3100",
    ALVO_MAILPIT: "http://127.0.0.1:54624", AUTH_GOOGLE_ENABLED: "false", AUTH_APPLE_ENABLED: "false", INFINITEPAY_ENABLED: "false",
    BREVO_API_KEY: "", BREVO_REMETENTE: "", NOTIFICACOES_INTERNAS_TOKEN: "teste-local-sem-worker" };
  const redes = docker(["network","ls","--filter","name=^cecchin-http-test$","--format","{{.Name}}"]);
  if (!redes.trim()) docker(["network","create","cecchin-http-test"]);
  iniciarContainer(nomes.mail,"ghcr.io/supabase/mailpit:v1.30.2",["54624:8025"],{});
  iniciarContainer(nomes.rest,"ghcr.io/supabase/postgrest:v16.2",["54631:3000"],{
    PGRST_DB_URI: `postgresql://postgres:postgres@host.docker.internal:54322/${banco}`, PGRST_DB_SCHEMAS: "public", PGRST_DB_ANON_ROLE: "anon",
    PGRST_JWT_SECRET: segredo, PGRST_DB_EXTRA_SEARCH_PATH: "public,extensions" });
  iniciarContainer(nomes.auth,"ghcr.io/supabase/gotrue:v2.196.0",["54632:9999"],{
    GOTRUE_API_HOST: "0.0.0.0", GOTRUE_API_PORT: "9999", API_EXTERNAL_URL: "http://127.0.0.1:54621",
    GOTRUE_DB_DRIVER: "postgres", GOTRUE_DB_DATABASE_URL: `postgresql://postgres:postgres@host.docker.internal:54322/${banco}?search_path=auth`,
    GOTRUE_SITE_URL: env.APP_URL, GOTRUE_URI_ALLOW_LIST: "http://localhost:3100/**,http://127.0.0.1:3100/**",
    GOTRUE_JWT_SECRET: segredo, GOTRUE_JWT_AUD: "authenticated", GOTRUE_JWT_ADMIN_ROLES: "service_role", GOTRUE_JWT_DEFAULT_GROUP_NAME: "authenticated",
    GOTRUE_EXTERNAL_EMAIL_ENABLED: "true", GOTRUE_MAILER_AUTOCONFIRM: "false", GOTRUE_RATE_LIMIT_EMAIL_SENT: "1000", GOTRUE_SMTP_MAX_FREQUENCY: "1s",
    GOTRUE_SMTP_HOST: nomes.mail, GOTRUE_SMTP_PORT: "1025", GOTRUE_SMTP_ADMIN_EMAIL: "acesso@cecchin.test", GOTRUE_SMTP_SENDER_NAME: "Cecchin Pizzas",
    GOTRUE_MAILER_SUBJECTS_MAGIC_LINK: "Seu acesso ao Cecchin Pizzas", GOTRUE_MAILER_TEMPLATES_MAGIC_LINK: "http://host.docker.internal:54621/template/acesso",
    GOTRUE_MAILER_SUBJECTS_CONFIRMATION: "Seu acesso ao Cecchin Pizzas", GOTRUE_MAILER_TEMPLATES_CONFIRMATION: "http://host.docker.internal:54621/template/acesso",
    GOTRUE_MAILER_URLPATHS_CONFIRMATION: "/auth/v1/verify", GOTRUE_MAILER_URLPATHS_INVITE: "/auth/v1/verify",
    GOTRUE_MAILER_URLPATHS_RECOVERY: "/auth/v1/verify", GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE: "/auth/v1/verify" });
  writeFileSync(arquivo, JSON.stringify(env,null,2));
  console.log(`Preparado ${banco}, somente estrutura e fixtures sintéticos. Use servir.`);
} else if (acao === "servir" || acao === "testar") {
  const env = JSON.parse(readFileSync(arquivo,"utf8"));
  if (!/^cecchin_http_test_\d+$/.test(env.BANCO_TESTE_HTTP) || env.CECCHIN_HTTP_TEST !== "true") throw new Error("Ambiente de teste inválido");
  // Não herda segredos de aplicativos, apenas o ambiente necessário ao Node/Windows.
  const base = Object.fromEntries(Object.entries(process.env).filter(([k]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|APPDATA|LOCALAPPDATA|USERPROFILE|HOMEDRIVE|HOMEPATH)$/i.test(k)));
  const childEnv = { ...base, ...env };
  if (acao === "testar") {
    const filho = spawn(process.execPath,["node_modules/vitest/vitest.mjs","run","--project","integracao",...process.argv.slice(3)],{cwd:raiz,env:childEnv,stdio:"inherit"});
    filho.on("exit",code=>process.exitCode=code??1);
  } else {
    const proxy = createServer((req,res)=> {
      if (req.url === "/template/acesso") { res.setHeader("Content-Type","text/html; charset=utf-8"); res.end(readFileSync(resolve(backend,"supabase/templates/acesso.html"))); return; }
      const auth = req.url?.startsWith("/auth/v1/");
      const rest = req.url?.startsWith("/rest/v1/");
      if (!auth && !rest) { res.writeHead(404); res.end(); return; }
      const caminho = req.url.slice(auth ? "/auth/v1".length : "/rest/v1".length);
      const headers = { ...req.headers };
      if (!headers.authorization && headers.apikey) headers.authorization = `Bearer ${headers.apikey}`;
      const destino = request({hostname:"127.0.0.1",port:auth?54632:54631,path:caminho,method:req.method,headers}, upstream=>{
        res.writeHead(upstream.statusCode??502,upstream.headers); upstream.pipe(res);
      });
      destino.on("error",()=>{res.writeHead(502);res.end("Serviço de teste indisponível");}); req.pipe(destino);
    });
    proxy.listen(54621,"0.0.0.0",()=>console.log("Gateway de testes na porta 54621; BFF na porta 3100."));
    const filho=spawn(process.execPath,["skills/provar-cadeia/http-isolado-vite.mjs"],{cwd:raiz,env:childEnv,stdio:"inherit"});
    filho.on("exit",code=>{proxy.close();process.exitCode=code??1;});
    process.on("SIGINT",()=>{filho.kill();proxy.close();});
  }
} else throw new Error("Use preparar, servir ou testar.");
