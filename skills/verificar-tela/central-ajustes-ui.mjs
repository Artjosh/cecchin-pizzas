import { chromium } from './.runtime/node_modules/playwright/index.mjs';
import { cookiesDeSessao } from './sessao.mjs';
import { execFileSync } from 'node:child_process';
const email=execFileSync('docker',['exec','supabase_db_Nicolas','psql','-U','postgres','-d','postgres','-Atc',"select email from usuario where papel='admin' limit 1"]).toString().trim();
const browser=await chromium.launch({executablePath:'C:/Users/josh/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',headless:true});
try {
const context=await browser.newContext({viewport:{width:1440,height:900}});
await context.addCookies(await cookiesDeSessao('http://localhost:3000',email));
await context.addInitScript(()=>{ const Original=window.AudioContext; window.tons=0; window.AudioContext=class extends Original {createOscillator(){window.tons++;return super.createOscillator();}}; });
const page=await context.newPage();const erros=[];page.on('pageerror',e=>erros.push(e.message));
await page.goto('http://localhost:3000/operacional/whatsapp'); await page.waitForTimeout(1800);
const real=await page.evaluate(async()=>{const r=await fetch('/api/operacao/whatsapp?avisos=mensagens');const j=await r.json();return {status:r.status,ids:Array.isArray(j.ids)};});
let ids=['baseline'];let removidos=0;
await page.route('**/api/operacao/whatsapp**',async route=>{
const req=route.request();const url=new URL(req.url());
if(url.searchParams.get('avisos')==='mensagens')return route.fulfill({json:{ids}});
if(req.method()==='PATCH'){if(req.postDataJSON().acao==='remover')removidos++;return route.fulfill({json:{ok:true}});}
if(url.searchParams.has('telefone'))return route.fulfill({json:{historicoOculto:false,assumida:true,mensagens:[],temMais:false,modo:'atendimento_humano',fila:[{id:'fixture',status:'pendente',conteudo:{texto:'Mensagem aguardando envio'}}]}});
if(!url.searchParams.has('avisos'))return route.fulfill({json:{telefones:['0000000000000'],conversas:[{telefone:'0000000000000',modo:'atendimento_humano',atendente_id:null}],temMais:false}});
return route.continue();});
await page.reload();await page.waitForTimeout(1800);
await page.getByRole('button',{name:'Ativar som',exact:true}).click();await page.waitForTimeout(1000);
await page.getByRole('button',{name:/Remover conversa 0/}).click();await page.getByRole('dialog').waitFor();
await page.screenshot({path:'skills/verificar-tela/capturas/central-confirmacao.png',mask:[page.locator('header').first()]});
await page.getByRole('button',{name:'Cancelar',exact:true}).click();if(removidos)throw Error('Cancelamento removeu');
await page.getByRole('button',{name:/^0000000000000/}).click();await page.getByText('Na fila de envio',{exact:true}).waitFor();
const antes=await page.evaluate(()=>window.tons);ids=['segunda','baseline'];
await page.waitForFunction(n=>window.tons>n,antes,{timeout:16000});
await page.screenshot({path:'skills/verificar-tela/capturas/central-fila-desktop.png',mask:[page.locator('header').first()]});
await page.reload();await page.waitForTimeout(1800);const persistiu=await page.getByRole('button',{name:'Som ativado',exact:true}).getAttribute('aria-pressed');
await page.goto('http://localhost:3000/operacional/despacho');await page.waitForTimeout(1800);await page.locator('body').click({position:{x:600,y:80}});await page.waitForTimeout(600);
const foraAntes=await page.evaluate(()=>window.tons);ids=['terceira','segunda','baseline'];await page.waitForFunction(n=>window.tons>n,foraAntes,{timeout:16000});
await page.goto('http://localhost:3000/operacional/whatsapp');await page.waitForTimeout(1800);
for (const [nome,width,height] of [['tablet',834,1112],['mobile',390,844]]) {await page.setViewportSize({width,height});await page.waitForTimeout(500);await page.getByRole('button',{name:/^0000000000000/}).click();await page.getByText('Na fila de envio',{exact:true}).waitFor();await page.screenshot({path:`skills/verificar-tela/capturas/central-fila-${nome}.png`,mask:[page.locator('header').first()]});await page.getByRole('button',{name:/Todas as conversas/}).click();}
console.log(JSON.stringify({endpoint:real,preferenciaPersistiu:persistiu,somConversaSelecionada:true,somForaCentral:true,cancelamentoSeguro:removidos===0,erros}));
}finally{await browser.close();}
