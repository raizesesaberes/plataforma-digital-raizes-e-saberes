import {connectEditionReader} from './library-edition-reader.mjs';
const config=window.RAIZES_SUPABASE||{},status=document.querySelector('#admin-reader-status'),host=document.querySelector('#admin-reader');
const bookId=new URLSearchParams(location.search).get('book');
const token=()=>{try{return JSON.parse(localStorage.getItem('raizes:supabase-auth-session')||'null')?.access_token||localStorage.getItem('raizes:supabase-access-token')||'';}catch{return '';}};
const client={async read(id,assetKind='manifest',pageNumber){
 const session=token();if(!session)throw Error('session_required');
 const response=await fetch(config.url.replace(/\/$/,'')+'/functions/v1/admin-library-read-access',{method:'POST',headers:{Authorization:'Bearer '+session,apikey:config.anonKey,'Content-Type':'application/json'},body:JSON.stringify({bookId:id,assetKind,pageNumber})});
 const data=await response.json();if(!response.ok||!data.ok)throw Error(data.code||'access_denied');return data;
}};
let controller;
try{
 const initial=await client.read(bookId);
 host.innerHTML=`<div class="book-reader" data-book-reader><header class="reader-header"><h2></h2></header><div class="reader-layout"><aside class="page-rail reader-rail"><div class="thumbnail-list" data-thumbnail-list style="max-height:65vh;overflow:auto"></div></aside><section class="book-stage"><figure class="reader-page" data-reader-page style="--zoom:1"><img data-page-image alt="Página do livro"><figcaption data-page-error hidden><span data-page-error-detail></span><button data-page-error-retry>Tentar novamente</button></figcaption></figure></section></div><nav class="viewer-controls reader-controls" aria-label="Controles de leitura"><button data-prev-page aria-label="Página anterior">Anterior</button><strong data-page-label></strong><button data-next-page aria-label="Próxima página">Próxima</button><button data-zoom-out aria-label="Reduzir zoom">−</button><span data-zoom-label>100%</span><button data-zoom-in aria-label="Aumentar zoom">+</button><button data-fullscreen-reader>Tela cheia</button></nav></div>`;
 host.querySelector('h2').textContent=initial.manifest.title;host.hidden=false;
 controller=await connectEditionReader(host.querySelector('[data-book-reader]'),{read:(id,kind,page)=>kind==='manifest'?Promise.resolve(initial):client.read(id,kind,page)},bookId);
 status.textContent='Conferência administrativa. A distribuição por escola permanece independente.';
}catch{host.hidden=true;host.replaceChildren();status.textContent='Leitura não autorizada ou sessão encerrada. Entre na conta administrativa e abra novamente pelo Banco de Conteúdos.';}
window.addEventListener('pagehide',()=>controller?.dispose());
