// Local-only static server + transparent PostgREST proxy. No RPC mocks.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve('.');
createServer(async(req,res)=>{
 try{
 const u=new URL(req.url,'http://127.0.0.1:8774');
 if(u.pathname.startsWith('/rest/v1/')){
  const body=[];for await(const part of req)body.push(part);
  const upstream=await fetch('http://127.0.0.1:55433/'+u.pathname.slice(9)+u.search,{method:req.method,headers:{'content-type':'application/json',authorization:req.headers.authorization||'',prefer:req.headers.prefer||''},body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(body)});
  res.writeHead(upstream.status,{'content-type':upstream.headers.get('content-type')||'application/json'});res.end(await upstream.text());return;
 }
 if(u.pathname==='/supabase-config.js'){res.writeHead(200,{'content-type':'text/javascript'});res.end('window.RAIZES_SUPABASE={url:"http://127.0.0.1:8774",anonKey:"synthetic-local",allowLocalFallback:false};');return;}
 const path=resolve(root,'.'+u.pathname);if(!path.startsWith(root+'/')||u.pathname.split('/').some(x=>x.startsWith('.')))throw Error('Forbidden');
 const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'};
 if(!types[extname(path)])throw Error('Forbidden');res.writeHead(200,{'content-type':types[extname(path)]});res.end(await readFile(path));
 }catch(e){res.writeHead(404);res.end('Unavailable');}
}).listen(8774,'127.0.0.1',()=>console.log('Local UI http://127.0.0.1:8774/admin.html?view=conteudos&type=entitlements'));
