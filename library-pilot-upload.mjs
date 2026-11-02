const input=document.querySelector('#package'),send=document.querySelector('#send'),status=document.querySelector('#status'),output=document.querySelector('#result');
const config=window.RAIZES_SUPABASE;
const token=()=>{try{return JSON.parse(localStorage.getItem('raizes:supabase-auth-session')||'null')?.access_token||localStorage.getItem('raizes:supabase-access-token')||'';}catch{return '';}};
const endpoint=config.url+'/functions/v1/library-pilot-private-ingest';
input.onchange=()=>{send.disabled=!input.files?.length;};
function unpack(buffer){
 const data=new DataView(buffer),decoder=new TextDecoder(),entries=[];let offset=0;
 while(offset+30<=buffer.byteLength&&data.getUint32(offset,true)===0x04034b50){
  const flags=data.getUint16(offset+6,true),method=data.getUint16(offset+8,true),size=data.getUint32(offset+18,true),nameLength=data.getUint16(offset+26,true),extra=data.getUint16(offset+28,true);
  if(flags&9||method!==0)throw Error('Pacote incompatível.');
  const start=offset+30+nameLength+extra,end=start+size;if(end>buffer.byteLength)throw Error('Pacote incompleto.');
  const name=decoder.decode(new Uint8Array(buffer,offset+30,nameLength));
  if(!/^library\/[a-f0-9-]{36}\/(pages|thumbs)\/page-\d{3}\.jpg$/.test(name))throw Error('Caminho inválido no pacote.');
  entries.push({name,bytes:new Uint8Array(buffer,start,size)});offset=end;
 }
 if(entries.length!==578||new Set(entries.map(x=>x.name)).size!==578)throw Error('Quantidade de arquivos divergente.');return entries;
}
send.onclick=async()=>{
 send.disabled=true;input.disabled=true;const results=[];
 try{
  if(!token())throw Error('Sessão administrativa obrigatória.');
  const entries=unpack(await input.files[0].arrayBuffer());let next=0,complete=0,failed=false;
  await Promise.all(Array.from({length:3},async()=>{while(next<entries.length&&!failed){const e=entries[next++];try{
   const response=await fetch(endpoint+'?path='+encodeURIComponent(e.name),{method:'POST',headers:{Authorization:'Bearer '+token(),apikey:config.anonKey,'Content-Type':'image/jpeg'},body:e.bytes});
   const result=await response.json();if(response.status!==201||!result.ok)throw Error(response.status+': '+(result.code||'envio recusado'));
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',e.bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
   if(result.sha256!==hash||result.size!==e.bytes.length||result.path!==e.name)throw Error('Conferência divergente.');
   results.push(result);complete++;status.textContent=`${complete}/578 arquivos enviados e conferidos no armazenamento privado.`;
  }catch(error){failed=true;throw error;}}}));
  if(complete!==578)throw Error('Envio incompleto.');output.textContent=JSON.stringify({ok:true,count:complete,bytes:results.reduce((n,r)=>n+r.size,0)},null,2);
 }catch(error){status.textContent='Envio interrompido: '+error.message;output.textContent=JSON.stringify({ok:false,confirmed:results.length},null,2);}
};
document.querySelector('#probe').onclick=async()=>{
 const response=await fetch(endpoint+'?path=blocked-probe',{method:'POST',headers:{Authorization:'Bearer '+token(),apikey:config.anonKey,'Content-Type':'image/jpeg'},body:new Uint8Array([255,216])});
 const result=await response.json();status.textContent=`Novo envio: HTTP ${response.status} · ${result.code||'resposta recebida'}`;
};
