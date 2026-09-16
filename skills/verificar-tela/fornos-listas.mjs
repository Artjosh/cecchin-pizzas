import {chromium} from './.runtime/node_modules/playwright/index.mjs';import {cookiesDeSessao} from './sessao.mjs';import {execFileSync} from 'node:child_process';
const email=execFileSync('docker',['exec','supabase_db_Nicolas','psql','-U','postgres','-d','postgres','-Atc',"select email from usuario where papel='admin' limit 1"]).toString().trim();const b=await chromium.launch({executablePath:'C:/Users/josh/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});try{const c=await b.newContext({viewport:{width:1920,height:1080}});await c.addCookies(await cookiesDeSessao('http://localhost:3000',email));await c.addCookies([{name:'cecchin_fonte',value:'mock',url:'http://localhost:3000'}]);const p=await c.newPage();const errors=[],writes=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.url().includes('/api/operacao/')&&['POST','PATCH','DELETE'].includes(r.method()))writes.push(r.method());});

await p.setViewportSize({width:1440,height:900});await p.goto('http://localhost:3000/admin/montar-equipe');await p.waitForTimeout(1600);
await p.getByRole('spinbutton',{name:'Equipe base',exact:true}).fill('8');
const right=p.getByRole('region',{name:/Pessoas/}),left=p.getByRole('region',{name:'Equipe do evento',exact:true});
const functions=await right.locator('article').evaluateAll(cards=>cards.map(c=>c.textContent.includes('Forno /')));
if(functions.some((x,i)=>x&&functions.slice(0,i).includes(false)))throw Error('Ordem de fornos incorreta');
for(let i=0;i<2;i++)await right.locator('article').first().getByRole('button',{name:'Adicionar',exact:true}).click();
if(await left.getByRole('button',{name:'Líder deste evento',exact:true}).count()!==2)throw Error('Lider automatico');
const names=await left.locator('h3').allTextContents();
await left.getByRole('textbox').fill(names[1]);if(await left.locator('article').count()!==1)throw Error('Busca equipe');
await left.getByRole('textbox').fill('');await left.getByRole('button',{name:'Líder deste evento',exact:true}).first().click();
if(await left.getByRole('button',{name:'Definir como líder',exact:true}).count()!==1)throw Error('Retirada manual');
await p.screenshot({path:'skills/verificar-tela/capturas/fornos-listas.png',mask:[p.locator('header')]});
console.log({fornosPrimeiro:true,liderAutomatico:true,buscaEquipe:true,remocaoManual:true,errors,writes});
}finally{await b.close()}
