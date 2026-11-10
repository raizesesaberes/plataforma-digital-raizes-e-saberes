// Loopback-only UI harness. Never serves production config or proxies any API.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve(import.meta.dirname,'../..'),port=58753;
const server=createServer(async(req,res)=>{try{
 if(!['GET','HEAD'].includes(req.method)||!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host))throw Error();
 const url=new URL(req.url,'http://localhost'),path=decodeURIComponent(url.pathname);res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self' data:; frame-src 'self'; base-uri 'none'; form-action 'self'");
 if(path==='/qa'){
  const width=[320,390,768,1280].includes(Number(url.searchParams.get('width')))?Number(url.searchParams.get('width')):390;
  const height=url.searchParams.get('landscape')==='1'?360:844;
  const profile=['crescer','fundamental','medio','professor'].includes(url.searchParams.get('profile'))?url.searchParams.get('profile'):'professor';
  const scenario=['login','existing','retain','pending','timeout','password-change'].includes(url.searchParams.get('scenario'))?url.searchParams.get('scenario'):'login';
  res.setHeader('Content-Type','text/html');return res.end(`<meta charset="utf-8"><title>QA local do App Raízes</title><style>body{margin:0;background:#e5e9e0;font:14px system-ui}p{text-align:center}iframe{display:block;width:${width}px;max-width:100%;height:${height}px;border:0;margin:auto;background:white}</style><p><b>QA LOCAL SINTÉTICO</b> · ${width} × ${height} · ${profile} · nenhuma conta real<br>Use qa@example.invalid (docente) ou AB-1234 (aluno), senha synthetic-only. Nenhuma API de produção.</p><iframe title="App Raízes em ${width}px" src="/app/?profile=${profile}&scenario=${scenario}"></iframe>`);
 }
 if(path==='/supabase-config.js'){res.setHeader('Content-Type','text/javascript');return res.end('/* Production config intentionally never served. */');}
 if(path==='/own-login-fixture.js'){res.setHeader('Content-Type','text/javascript');return res.end(await readFile(resolve(import.meta.dirname,'own-login-fixture.js')));}
 if(!path.startsWith('/app/')&&!['/library-edition-boot.mjs','/library-edition-client.mjs','/library-edition-reader.mjs','/library-edition-search-ui.mjs'].includes(path))throw Error();
 const file=resolve(root,'.'+path+(path.endsWith('/')?'index.html':''));if(!file.startsWith(root+'/')||path.includes('/.'))throw Error();
 let body=await readFile(file);if(path==='/app/')body=Buffer.from(body.toString().replace('<script src="/app/platform-runtime.js">','<script src="/own-login-fixture.js"></script><script src="/app/platform-runtime.js">'));
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf'})[extname(file)]||'application/octet-stream');res.end(req.method==='HEAD'?'':body);
 }catch{res.statusCode=404;res.end('Not found');}});
server.listen(port,'127.0.0.1',()=>console.log(`Synthetic-only preview: http://127.0.0.1:${port}/qa?width=390`));
