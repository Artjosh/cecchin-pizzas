import {chromium} from './.runtime/node_modules/playwright/index.mjs';import {cookiesDeSessao} from './sessao.mjs';import {execFileSync} from 'node:child_process';
const email=execFileSync('docker',['exec','supabase_db_Nicolas','psql','-U','postgres','-d','postgres','-Atc',"select email from usuario where papel='admin' limit 1"]).toString().trim();const b=await chromium.launch({executablePath:'C:/Users/josh/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});try{const c=await b.newContext({viewport:{width:1920,height:1080}});await c.addCookies(await cookiesDeSessao('http://localhost:3000',email));await c.addCookies([{name:'cecchin_fonte',value:'mock',url:'http://localhost:3000'}]);const p=await c.newPage();const errors=[],writes=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.url().includes('/api/operacao/')&&['POST','PATCH','DELETE'].includes(r.method()))writes.push(r.method());});

await p.setViewportSize({width:1440,height:900});
await p.goto('http://localhost:3000/admin/operacao');await p.waitForTimeout(1500);
const fonte=p.getByRole('group',{name:'Fonte dos dados'});
await fonte.getByRole('button',{name:/Banco/}).click();await p.waitForTimeout(2200);
const fonteReal=await c.cookies();if(!fonteReal.some(x=>x.name==='cecchin_fonte'&&x.value==='real'))throw Error('Fonte nao trocou');
const dados=await p.evaluate(async()=>{const r=await fetch('/api/operacao/montagem-equipe?equipe=1&pagina=0');return r.json();});
const masks=[p.locator('header'),...dados.pessoas.flatMap(x=>[p.getByText(x.nome,{exact:true}),...(x.telefone?[p.getByText(x.telefone,{exact:true})]:[])])];
const cards=await p.locator('article').count();if(cards!==dados.pessoas.length)throw Error('Cards divergem do BFF');
await p.getByRole('button',{name:'Perfil e mapa'}).first().click();await p.waitForTimeout(3000);
const dialog=p.getByRole('dialog',{name:'Perfil do integrante'});
await dialog.getByRole('button',{name:'Editar perfil operacional'}).click();
const expected=['Uber / aplicativo','Carro','Moto','Van','Transporte da empresa','A','B','C','D','E'];
for(const name of expected)if(!(await dialog.getByRole('checkbox',{name,exact:true}).count()))throw Error('Campo ausente '+name);
const captures=[];
for(const [label,width,height] of [['desktop',1440,900],['tablet',834,1112],['mobile',390,844]]){
 await p.setViewportSize({width,height});await p.waitForTimeout(500);
 const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 if(overflow)throw Error('Overflow '+label);
 await p.screenshot({path:'skills/verificar-tela/capturas/auditoria-banco-perfil-'+label+'.png',mask:masks});
 captures.push({label,overflow});
}
await p.keyboard.press('Escape');await p.setViewportSize({width:1440,height:900});
await p.goto('http://localhost:3000/admin/montar-equipe');await p.waitForTimeout(1800);
const details=await p.evaluate(async()=>{const id=document.querySelector('select[aria-label="Evento confirmado"]').value;const r=await fetch('/api/operacao/montagem-equipe?evento='+id);return r.json();});
const maskEvent=[p.locator('header'),p.locator('select'),p.getByText(details.evento.cliente_nome??'UNMATCHED',{exact:true}),p.locator('article'),p.locator('div.px-1')];
await p.getByRole('button',{name:'Mapa do evento',exact:true}).click();await p.waitForTimeout(2500);
const map=p.getByRole('dialog',{name:'Evento e deslocamentos da equipe'});
if(!(await map.getByRole('slider',{name:'Tamanho dos cards no mapa'}).count()))throw Error('Slider ausente no Banco');
await map.getByRole('slider').fill('40');
await p.screenshot({path:'skills/verificar-tela/capturas/auditoria-banco-mapa.png',mask:[...maskEvent,map.locator('p').first()]});
await p.keyboard.press('Escape');
await p.getByRole('button',{name:'Perfil',exact:true}).first().click();await p.waitForTimeout(1000);
if(!(await p.getByRole('dialog',{name:'Perfil do integrante'}).getByText(/QG.*Evento/).count()))throw Error('Perfil da montagem sem evento');
console.log(JSON.stringify({fonteReal:true,cards,camposTransporte:true,captures,mapaReal:true,perfilComEvento:true,errors,writes}));
if(errors.length||writes.length)throw Error('Erros ou escrita inesperada');
}finally{await b.close()}
