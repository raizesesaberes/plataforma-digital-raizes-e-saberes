import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
export const root=resolve(import.meta.dirname,'../..');
export async function launchHarness({exposeEngine=false}={}){
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
 const server=createServer(async(req,res)=>{try{
  let path=decodeURIComponent(new URL(req.url,'http://local').pathname);
  if(exposeEngine&&path==='/test-engine.mjs'){
   const source=await readFile(root+'/mission-runtime/studio/assets/Player-nHpDXt_8.js','utf8'),start=source.indexOf('function U('),end=source.indexOf('var J=',start);
   if(start<0||end<start)throw Error('Exact engine boundaries changed; review extraction.');
   res.setHeader('content-type','text/javascript');res.end('import {c as r,d as i,f as a,l as o,o as s} from "/mission-runtime/studio/assets/index-Di3aszpa.js";\n'+source.slice(start,end)+'\nexport {G as start,K as transition};');return;
  }
  if(path==='/host'){res.setHeader('content-type','text/html');res.end('<!doctype html><html lang="pt-BR"><title>Teste local dos roteiros</title><body style="margin:0"><script>window.events=[];window.addEventListener("message",e=>{if(e.origin===location.origin)events.push(e.data)});localStorage.setItem("carla-test-sentinel","untouched");</script></body></html>');return;}
  if(path.endsWith('/'))path+='index.html';
  if(!path.startsWith('/mission-runtime/')||path.includes('/.')||path.includes('/tests/'))throw Error();
  const file=resolve(root,'.'+path);if(!file.startsWith(root+'/'))throw Error();
  res.setHeader('content-type',({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.statusCode=404;res.end('Not found');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 async function page(width=1280){const page=await browser.newPage({viewport:{width,height:1000},locale:'pt-BR'});await page.route('**/*',route=>route.request().url().startsWith(origin+'/')||/^(data:|blob:)/.test(route.request().url())?route.continue():route.abort());return page;}
 async function install(p,src){await p.goto(origin+'/host');await p.evaluate(src=>{const f=document.createElement('iframe');f.src=src;f.style='width:100%;height:1000px;border:0';document.body.append(f);},src);}
 async function wait(p,type){await p.waitForFunction(type=>events.some(e=>e.type===type),type);return p.evaluate(type=>events.find(e=>e.type===type),type);}
 async function send(p,data){await p.evaluate(data=>document.querySelector('iframe').contentWindow.postMessage(data,location.origin),data);}
 return {origin,browser,page,install,wait,send,close:async()=>{await browser.close();await new Promise(r=>server.close(r));}};
}
