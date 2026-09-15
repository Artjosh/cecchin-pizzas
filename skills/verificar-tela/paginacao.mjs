import {chromium} from './.runtime/node_modules/playwright/index.mjs';
import {cookiesDeSessao} from './sessao.mjs';
import {execFileSync} from 'node:child_process';
const email=execFileSync('docker',['exec','supabase_db_Nicolas','psql','-U','postgres','-d','postgres','-Atc',"select email from usuario where papel='admin' limit 1"]).toString().trim();
const b=await chromium.launch({executablePath:'C:/Users/josh/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
try {
 const c=await b.newContext({viewport:{width:1440,height:900}}); await c.addCookies(await cookiesDeSessao('http://localhost:3000',email)); const p=await c.newPage(); const errors=[];p.on('pageerror',e=>errors.push(e.message));
 for(const path of ['/operacional/pendencias?bloco=dinheiro','/operacional/clientes']) {
  await p.goto('http://localhost:3000'+path); await p.waitForTimeout(1600);
  const nav=p.getByRole('navigation',{name:'Pagina\u00e7\u00e3o',exact:true}); await nav.waitFor(); console.log(path,await nav.innerText());
  await nav.getByRole('spinbutton').fill('3');await nav.getByRole('button',{name:'Ir',exact:true}).click();await p.waitForTimeout(1600);
  await nav.getByText(/3 de/).waitFor({timeout:30000});
  if(path.includes('pendencias')&&!p.url().includes('bloco=dinheiro'))throw Error('Filtro perdido');
  await nav.getByRole('button',{name:'\u00daltima p\u00e1gina',exact:true}).click();await p.waitForTimeout(1800);await nav.locator('button[aria-label="Pr\u00f3xima p\u00e1gina"]:disabled').waitFor({timeout:30000});
  await nav.getByRole('button',{name:'Primeira p\u00e1gina',exact:true}).click();await p.waitForTimeout(1600);
  for(const width of [1440,834,390]){await p.setViewportSize({width,height:900});await p.waitForTimeout(300);await nav.scrollIntoViewIfNeeded();await p.screenshot({path:`skills/verificar-tela/capturas/paginacao-${path.includes('clientes')?'clientes':'pendencias'}-${width}.png`,mask:[p.locator('header'),p.locator('tbody')]});}
 }
 await p.setViewportSize({width:1440,height:900});await p.goto('http://localhost:3000/operacional/whatsapp');await p.waitForTimeout(1800);const nav=p.getByRole('navigation',{name:'P\u00e1ginas de conversas'});await nav.waitFor();console.log('Central',await nav.innerText());await nav.screenshot({path:'skills/verificar-tela/capturas/paginacao-central.png'});console.log(JSON.stringify({errors}));
} finally { await b.close(); }
