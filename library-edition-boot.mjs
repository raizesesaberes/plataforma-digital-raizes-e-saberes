import {libraryEditionClient} from './library-edition-client.mjs';
import {connectEditionReader} from './library-edition-reader.mjs';
export async function mountEditionLibrary(root=document){
const config=window.RAIZES_SUPABASE||{};
const status=root.querySelector('#edition-status'),list=root.querySelector('#edition-list'),host=root.querySelector('#edition-reader');
const token=()=>{try{return JSON.parse(localStorage.getItem('raizes:supabase-auth-session')||'null')?.access_token||localStorage.getItem('raizes:supabase-access-token')||'';}catch{return '';}};
async function request(path,body){
 const session=token();if(!session)throw Error('session_required');
 const response=await fetch(`${config.url.replace(/\/$/,'')}/${path}`,{method:'POST',headers:{apikey:config.anonKey,Authorization:`Bearer ${session}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await response.json();if(!response.ok)throw Error(data.code||'access_denied');return data;
}
const client=libraryEditionClient({rpc:async(name,args={})=>{try{return {data:await request(`rest/v1/rpc/${name}`,args)};}catch(error){return {error};}},functions:{invoke:async(name,{body})=>{try{return {data:await request(`functions/v1/${name}`,body)};}catch(error){return {error};}}}});
let controller,generation=0,catalog,disposed=false;
async function open(book){
 const version=++generation;controller?.dispose();host.replaceChildren();host.hidden=true;status.textContent='Conferindo acesso ao livro…';
 try{
  // Check the manifest before mounting any reader UI or requesting an image.
  const initial=await client.read(book.book_id,'manifest');if(disposed||!root.isConnected||version!==generation)return;
  host.innerHTML=`<div class="book-reader ed-reader" data-book-reader><header class="reader-header"><h2></h2><button type="button" data-return>Voltar aos livros</button></header><div class="reader-layout"><aside class="page-rail reader-rail"><div class="thumbnail-list" data-thumbnail-list style="max-height:65vh;overflow:auto"></div></aside><section class="book-stage"><figure class="reader-page" data-reader-page style="--zoom:1"><img data-page-image alt="Página do livro"><figcaption data-page-error hidden><span data-page-error-detail></span><button data-page-error-retry>Tentar novamente</button></figcaption></figure></section></div><nav class="viewer-controls reader-controls" aria-label="Controles de leitura"><button data-prev-page aria-label="Página anterior">Anterior</button><strong data-page-label></strong><button data-next-page aria-label="Próxima página">Próxima</button><button data-zoom-out aria-label="Reduzir zoom">−</button><span data-zoom-label>100%</span><button data-zoom-in aria-label="Aumentar zoom">+</button><button data-fullscreen-reader>Tela cheia</button></nav></div>`;
  host.querySelector('h2').textContent=book.title;
  host.hidden=false;list.hidden=true;catalog?.setHidden(true);
  host.querySelector('[data-return]').onclick=()=>{generation++;controller?.dispose();host.hidden=true;host.replaceChildren();list.hidden=false;catalog?.setHidden(false);status.textContent='Escolha um livro disponível.';};
  controller=await connectEditionReader(host.querySelector('[data-book-reader]'),{...client,read:(id,kind,page)=>kind==='manifest'?Promise.resolve(initial):client.read(id,kind,page)},book.book_id);
  if(version!==generation){controller.dispose();return;}status.textContent='Leitura autorizada.';
 }catch{if(version===generation){host.hidden=true;host.replaceChildren();list.hidden=false;catalog?.setHidden(false);status.textContent='Livro indisponível para sua sessão. Nenhum arquivo foi liberado.';}}
}
try{
 const books=await client.list();if(!root.isConnected)return;list.replaceChildren();
 catalog=renderEditionCatalog(list,status,books,(...args)=>client.read(...args),book=>void open(book));
 status.textContent=books.length?`${books.length} livros disponíveis para sua sessão.`:'Nenhuma edição disponível para sua escola e turma no momento.';
}catch{status.textContent='Não foi possível carregar a biblioteca. Entre na plataforma e tente novamente.';}
const dispose=()=>{disposed=true;generation++;controller?.dispose();catalog?.dispose();window.removeEventListener('pagehide',dispose);};
window.addEventListener('pagehide',dispose,{once:true});
return dispose;

}
if (/\/edition-library(?:\.html)?$/.test(window.location.pathname)) void mountEditionLibrary();

// Presentation receives only the server-authorized list. Filtering never adds books.
export function renderEditionCatalog(list,status,books,read,onOpen){
 const doc=list.ownerDocument;list.classList.add('ed-grid');status.classList.add('ed-status');
 const toolbar=doc.createElement('div');toolbar.className='ed-toolbar';
 toolbar.innerHTML='<label class="ed-search"><span>Buscar livro</span><input type="search" placeholder="Título ou coleção" autocomplete="off"></label><label class="ed-filter"><span>Material</span><select><option value="all">Todos os materiais</option></select></label>';
 const input=toolbar.querySelector('input'),select=toolbar.querySelector('select');
 for(const [value,label] of [['student','Livro do aluno'],['teacher','Livro do professor']]){
  if(books.some(book=>book.audience===value)){const option=doc.createElement('option');option.value=value;option.textContent=label;select.append(option);}
 }
 toolbar.querySelector('.ed-filter').hidden=select.options.length<3;
 list.before(toolbar);
 const empty=doc.createElement('p');empty.className='ed-empty';empty.hidden=true;empty.textContent='Nenhum livro encontrado. Tente outro título ou material.';list.after(empty);
 const normalize=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const entries=[];let disposed=false;
 const loadCover=record=>{if(record.loading)return;record.loading=true;
  read(record.book.book_id,'thumb',1).then(result=>{if(disposed)return;if(result.asset?.kind!=='thumb'||result.asset.pageNumber!==1||!result.asset.signedUrl)throw Error('invalid_cover');record.image.onload=()=>{record.cover.classList.add('is-loaded');};record.image.onerror=()=>{record.fallback.textContent='Capa indisponível';};record.image.src=result.asset.signedUrl;}).catch(()=>{record.fallback.textContent='Capa indisponível';});
 };
 const observer=new IntersectionObserver(items=>{for(const entry of items){if(!entry.isIntersecting)continue;observer.unobserve(entry.target);const record=entries.find(x=>x.cover===entry.target);if(record)loadCover(record);}},{rootMargin:'120px'});
 for(const book of books){
  const card=doc.createElement('article');card.className='ed-card';
  const cover=doc.createElement('div');cover.className='ed-cover';
  const image=doc.createElement('img');image.alt=`Capa de ${book.title}`;image.decoding='async';
  const fallback=doc.createElement('span');fallback.className='ed-cover-fallback';fallback.textContent='Carregando capa…';cover.append(image,fallback);
  const body=doc.createElement('div');body.className='ed-card-body';
  const badge=doc.createElement('span');badge.className='ed-badge';badge.textContent=book.audience==='teacher'?'Livro do professor':'Livro do aluno';
  const title=doc.createElement('h2');title.textContent=book.title;
  const meta=doc.createElement('p');meta.className='ed-meta';meta.textContent=`${book.page_count} páginas`;
  const button=doc.createElement('button');button.type='button';button.className='ed-read';button.textContent='Ler';button.setAttribute('aria-label',`Ler ${book.title}`);button.onclick=()=>onOpen(book);
  body.append(badge,title,meta,button);card.append(cover,body);list.append(card);entries.push({book,card,cover,image,fallback});observer.observe(cover);if(entries.length<=6)loadCover(entries[entries.length-1]);
 }
 const filter=()=>{const query=normalize(input.value.trim());let count=0;for(const {book,card} of entries){card.hidden=!(normalize(book.title).includes(query)&&(select.value==='all'||book.audience===select.value));if(!card.hidden)count++;}empty.hidden=count>0||books.length===0;status.textContent=books.length?`${count} de ${books.length} livros disponíveis`:'Nenhuma edição disponível para sua escola e turma no momento.';};
 input.addEventListener('input',filter);select.addEventListener('change',filter);
 return {setHidden(hidden){toolbar.hidden=hidden;empty.hidden=hidden||entries.some(x=>!x.card.hidden);if(!hidden)filter();},dispose(){disposed=true;observer.disconnect();}};
}
