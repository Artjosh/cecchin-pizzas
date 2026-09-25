import {chromium} from './.runtime/node_modules/playwright/index.mjs';import {cookiesDeSessao} from './sessao.mjs';import {execFileSync} from 'node:child_process';
const email=execFileSync('docker',['exec','supabase_db_Nicolas','psql','-U','postgres','-d','postgres','-Atc',"select email from usuario where papel='admin' limit 1"]).toString().trim();const b=await chromium.launch({executablePath:'C:/Users/josh/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});try{const c=await b.newContext({viewport:{width:1920,height:1080}});await c.addCookies(await cookiesDeSessao('http://localhost:3000',email));await c.addCookies([{name:'cecchin_fonte',value:'mock',url:'http://localhost:3000'}]);const p=await c.newPage();const errors=[],writes=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.url().includes('/api/operacao/')&&['POST','PATCH','DELETE'].includes(r.method()))writes.push(r.method());});
await c.addCookies([{name:'cecchin_fonte',value:'real',url:'http://localhost:3000'}]);await p.goto('http://localhost:3000/operacional/pendencias');await p.waitForTimeout(1200);
const ids=JSON.parse(execFileSync('docker',['exec','supabase_db_Nicolas','psql','-U','postgres','-d','postgres','-Atc',"select json_build_object('cliente',(select cliente_id from evento where cliente_id is not null group by cliente_id order by count(*) desc limit 1),'evento',(select id from evento where status='confirmado' order by data_evento desc limit 1))"]).toString());const urls=['/operacional/clientes/'+ids.cliente,'/operacional/eventos/'+ids.evento];
const result=[];
for(const url of ['/operacional/pendencias','/operacional/clientes','/admin/financeiro','/admin/auditoria',urls[0]]){
 await p.goto('http://localhost:3000'+url);await p.waitForTimeout(1100);
 const rows=await p.locator('tbody tr').count();
 if(!rows)throw Error('Tabela vazia: '+url.replace(/[a-f0-9-]{36}/g,'[id]'));
 result.push({url:url.replace(/[a-f0-9-]{36}/g,'[id]'),rows});
}
await p.goto('http://localhost:3000/operacional/pendencias');await p.waitForTimeout(1100);
const next=p.getByRole('button',{name:/Pr.*xima p.*gina/});
if(await next.isEnabled()){await next.click();await p.waitForURL(/pagina=1/).catch(e=>{console.log(JSON.stringify({stage:'pagination',errors,url:p.url()}));throw e;});await p.waitForTimeout(600);if(await p.locator('nav span[aria-current="page"]').textContent()!=='2')throw Error('Pagina incorreta');}
console.log(JSON.stringify({result,pagination:true,errors,writes}));
if(errors.length||writes.length)throw Error('Falha de renderizacao ou escrita inesperada');
}finally{await b.close()}
