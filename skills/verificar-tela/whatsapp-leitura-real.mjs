// Somente GETs na Central operacional. Não cria conta, não pareia e não envia.
import { chromium } from './.runtime/node_modules/playwright/index.mjs';
import { cookiesDeSessao } from './sessao.mjs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const email=execFileSync('docker',['exec','supabase_db_Nicolas','psql','-U','postgres','-d','postgres','-Atc',"select email from usuario where papel='admin' limit 1"]).toString().trim();
const browser=await chromium.launch({executablePath:'C:/Users/josh/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',headless:true});
try {
 const contexto=await browser.newContext();await contexto.addCookies(await cookiesDeSessao('http://localhost:3000',email));
 const contasR=await contexto.request.get('http://localhost:3000/api/operacao/whatsapp/contas');
 assert.equal(contasR.status(),200);const dados=await contasR.json();assert.ok(dados.contas.length);
 const lista=await contexto.request.get('http://localhost:3000/api/operacao/whatsapp?conta=principal');assert.equal(lista.status(),200);
 const conversas=await lista.json();assert.ok(Array.isArray(conversas.conversas));
 if(conversas.telefones[0]) {const historico=await contexto.request.get(`http://localhost:3000/api/operacao/whatsapp?conta=principal&telefone=${conversas.telefones[0]}`);assert.equal(historico.status(),200);}
 const negado=await contexto.request.get('http://localhost:3000/api/operacao/whatsapp/contas?conta=ffffffff-ffff-ffff-ffff-ffffffffffff');assert.equal(negado.status(),404);
 console.log(JSON.stringify({contas:dados.contas.length,estados:dados.contas.map(c=>c.estado),conversas:conversas.total,leitura:true,contaInexistente:negado.status()}));
} finally {await browser.close();}
