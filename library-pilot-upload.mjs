const input=document.querySelector('#package'),send=document.querySelector('#send'),status=document.querySelector('#status'),output=document.querySelector('#result');
const approvedPackages={"c323375eb3d0829e2b0996a86d9597bda3a1528de737c0a610432288d1be1b52":{"name":"official-resume-03.zip","size":91343904,"entries":790},"7a34ec9f598440f82a72cdfba5a0b28a77a721d50b945b866278543ade82367b":{"name":"official-remaining-04.zip","size":420829294,"entries":3408},"ea4b71bea6b414c589e37c8d106dc20c36bfd6b84bdfef4dfae252d888b31554":{"name":"official-remaining-05.zip","size":407619527,"entries":2974},"49dfd5ffa678fc3ba7ff973f53601a90eb16080be49a9a63c7a27d8abba5a9b2":{"name":"official-remaining-06.zip","size":523519702,"entries":4292},"9a9fd85f6b4f195b119370d2a1bb11ebaa44f0e323ed023d822c7c2b4f5aa6c0":{"name":"official-remaining-07.zip","size":339510576,"entries":2632}};
const config=window.RAIZES_SUPABASE;
const token=()=>{try{return JSON.parse(localStorage.getItem('raizes:supabase-auth-session')||'null')?.access_token||localStorage.getItem('raizes:supabase-access-token')||'';}catch{return '';}};
const endpoint=config.url+'/functions/v1/library-pilot-private-ingest';
input.onchange=()=>{send.disabled=!input.files?.length;};
function unpack(buffer,expectedCount){
 const data=new DataView(buffer),decoder=new TextDecoder(),entries=[];let offset=0;
 while(offset+30<=buffer.byteLength&&data.getUint32(offset,true)===0x04034b50){
  const flags=data.getUint16(offset+6,true),method=data.getUint16(offset+8,true),size=data.getUint32(offset+18,true),nameLength=data.getUint16(offset+26,true),extra=data.getUint16(offset+28,true);
  if(flags&9||method!==0)throw Error('Pacote incompatível.');
  const start=offset+30+nameLength+extra,end=start+size;if(end>buffer.byteLength)throw Error('Pacote incompleto.');
  const name=decoder.decode(new Uint8Array(buffer,offset+30,nameLength));
  if(!/^library\/[a-f0-9-]{36}\/(pages|thumbs)\/page-\d{3}\.jpg$/.test(name))throw Error('Caminho inválido no pacote.');
  entries.push({name,bytes:new Uint8Array(buffer,start,size)});offset=end;
 }
 if(entries.length!==expectedCount||new Set(entries.map(x=>x.name)).size!==expectedCount)throw Error('Quantidade de arquivos divergente.');return entries;
}
send.onclick=async()=>{
 send.disabled=true;input.disabled=true;const results=[];
 try{
  if(!token())throw Error('Sessão administrativa obrigatória.');
  for (const file of Array.from(input.files)) {
  status.textContent=`Conferindo pacote ${file.name}…`;
  const buffer=await file.arrayBuffer();
  const packageHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const approved=approvedPackages[packageHash];if(!approved||approved.size!==file.size)throw Error('Pacote fora da lista autorizada.');
  const entries=unpack(buffer,approved.entries);let next=0,complete=0,failed=false;
  const workers=await Promise.allSettled(Array.from({length:6},async()=>{while(next<entries.length&&!failed){const e=entries[next++];try{
   const response=await fetch(endpoint+'?path='+encodeURIComponent(e.name),{method:'POST',headers:{Authorization:'Bearer '+token(),apikey:config.anonKey,'Content-Type':'image/jpeg'},body:e.bytes});
   const result=await response.json();if(response.status!==201||!result.ok)throw Error(response.status+': '+(result.code||'envio recusado'));
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',e.bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
   if(result.sha256!==hash||result.size!==e.bytes.length||result.path!==e.name)throw Error('Conferência divergente.');
   results.push(result);complete++;status.textContent=`${file.name}: ${complete}/${entries.length} arquivos enviados e conferidos no armazenamento privado.`;
  }catch(error){failed=true;throw error;}}}));
  const failure=workers.find(x=>x.status==='rejected');if(failure)throw failure.reason;
  if(complete!==entries.length)throw Error('Envio incompleto.');output.textContent=JSON.stringify({ok:true,lastPackage:file.name,count:results.length,bytes:results.reduce((n,r)=>n+r.size,0)},null,2);
  }
  status.textContent=`Envio concluído: ${results.length} arquivos conferidos.`;
 }catch(error){status.textContent='Envio interrompido: '+error.message;output.textContent=JSON.stringify({ok:false,confirmed:results.length},null,2);}
};
document.querySelector('#probe').onclick=async()=>{
 const response=await fetch(endpoint+'?path=blocked-probe',{method:'POST',headers:{Authorization:'Bearer '+token(),apikey:config.anonKey,'Content-Type':'image/jpeg'},body:new Uint8Array([255,216])});
 const result=await response.json();status.textContent=`Novo envio: HTTP ${response.status} · ${result.code||'resposta recebida'}`;
};
