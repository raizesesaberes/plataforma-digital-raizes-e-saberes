import {libraryEditionClient} from './library-edition-client.mjs';
import {connectEditionReader} from './library-edition-reader.mjs';
const config=window.RAIZES_SUPABASE||{};
const status=document.querySelector('#edition-status'),list=document.querySelector('#edition-list'),host=document.querySelector('#edition-reader');
const token=()=>{try{return JSON.parse(localStorage.getItem('raizes:supabase-auth-session')||'null')?.access_token||localStorage.getItem('raizes:supabase-access-token')||'';}catch{return '';}};
async function request(path,body){
 const session=token();if(!session)throw Error('session_required');
 const response=await fetch(`${config.url.replace(/\/$/,'')}/${path}`,{method:'POST',headers:{apikey:config.anonKey,Authorization:`Bearer ${session}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await response.json();if(!response.ok)throw Error(data.code||'access_denied');return data;
}
const client=libraryEditionClient({rpc:async(name,args={})=>{try{return {data:await request(`rest/v1/rpc/${name}`,args)};}catch(error){return {error};}},functions:{invoke:async(name,{body})=>{try{return {data:await request(`functions/v1/${name}`,body)};}catch(error){return {error};}}}});
let controller,generation=0;
async function open(book){
 const version=++generation;controller?.dispose();host.replaceChildren();host.hidden=true;status.textContent='Conferindo acesso ao livro…';
 try{
  // Check the manifest before mounting any reader UI or requesting an image.
  const initial=await client.read(book.book_id,'manifest');if(version!==generation)return;
  host.innerHTML=`<div class="book-reader" data-book-reader><header class="reader-header"><h2></h2><button type="button" data-return>Voltar aos livros</button></header><div class="reader-layout"><aside class="page-rail reader-rail"><div class="thumbnail-list" data-thumbnail-list style="max-height:65vh;overflow:auto"></div></aside><section class="book-stage"><figure class="reader-page" data-reader-page style="--zoom:1"><img data-page-image alt="Página do livro"><figcaption data-page-error hidden><span data-page-error-detail></span><button data-page-error-retry>Tentar novamente</button></figcaption></figure></section></div><nav class="viewer-controls reader-controls" aria-label="Controles de leitura"><button data-prev-page aria-label="Página anterior">Anterior</button><strong data-page-label></strong><button data-next-page aria-label="Próxima página">Próxima</button><button data-zoom-out aria-label="Reduzir zoom">−</button><span data-zoom-label>100%</span><button data-zoom-in aria-label="Aumentar zoom">+</button><button data-fullscreen-reader>Tela cheia</button></nav></div>`;
  host.querySelector('h2').textContent=book.title;
  host.hidden=false;list.hidden=true;
  host.querySelector('[data-return]').onclick=()=>{generation++;controller?.dispose();host.hidden=true;host.replaceChildren();list.hidden=false;status.textContent='Escolha um livro disponível.';};
  controller=await connectEditionReader(host.querySelector('[data-book-reader]'),{...client,read:(id,kind,page)=>kind==='manifest'?Promise.resolve(initial):client.read(id,kind,page)},book.book_id);
  if(version!==generation){controller.dispose();return;}status.textContent='Leitura autorizada.';
 }catch{if(version===generation){host.hidden=true;host.replaceChildren();list.hidden=false;status.textContent='Livro indisponível para sua sessão. Nenhum arquivo foi liberado.';}}
}
try{
 const books=await client.list();list.replaceChildren();
 for(const book of books){const card=document.createElement('article');const title=document.createElement('h2');title.textContent=book.title;const button=document.createElement('button');button.textContent='Ler';button.onclick=()=>void open(book);card.append(title,button);list.append(card);}
 status.textContent=books.length?`${books.length} livros disponíveis para sua sessão.`:'Nenhuma edição disponível para sua escola e turma no momento.';
}catch{status.textContent='Não foi possível carregar a biblioteca. Entre na plataforma e tente novamente.';}
window.addEventListener('pagehide',()=>{generation++;controller?.dispose();});
