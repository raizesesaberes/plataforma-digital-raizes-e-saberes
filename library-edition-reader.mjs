import {connectEditionSearch} from './library-edition-search-ui.mjs';
// Controller for the existing reader controls. All page URLs come from the
// protected service; no static path or PDF fallback is permitted.
export async function connectEditionReader(root, client, bookId) {
 const image=root.querySelector('[data-page-image]');
 const label=root.querySelector('[data-page-label]');
 const frame=root.querySelector('[data-reader-page]');
 const error=root.querySelector('[data-page-error]');
 const errorDetail=root.querySelector('[data-page-error-detail]');
 const thumbs=root.querySelector('[data-thumbnail-list]');
 let current=1,zoom=1,generation=0,disposed=false,search;
 const request=await client.read(bookId,'manifest');
 const count=request.manifest?.pageCount;
 if(!Number.isSafeInteger(count)||count<1)throw Error('invalid_manifest');
 root.dataset.totalPages=String(count);
 // Reuse the protected first-page thumbnail; never construct a public asset URL.
 let coverRequest;
 const thumbnail=number=>number===1?(coverRequest??=client.read(bookId,'thumb',1)):client.read(bookId,'thumb',number);
 const title=root.querySelector('.reader-header h2');
 const identity=root.ownerDocument.createElement('div');identity.className='reader-book-identity';
 const cover=root.ownerDocument.createElement('span');cover.className='reader-book-cover';
 const fallback=root.ownerDocument.createElement('span');fallback.textContent='Capa indisponível';
 const coverImage=root.ownerDocument.createElement('img');coverImage.alt='Capa do livro';coverImage.hidden=true;
 cover.append(fallback,coverImage);
 const coverStyle=root.ownerDocument.createElement('style');
 coverStyle.textContent='.ed-reader .reader-header .reader-book-identity{display:flex;align-items:center;gap:12px;flex:1 1 280px;min-width:0}.ed-reader .reader-book-identity h2{flex:1;min-width:0}.reader-book-cover{width:56px;height:78px;flex:none;display:flex;align-items:center;justify-content:center;border:1px solid #dce6dd;border-radius:6px;background:#f7f9f6;overflow:hidden}.reader-book-cover img{width:100%;height:100%;object-fit:contain}.reader-book-cover span{font:400 10px/1.3 system-ui;text-align:center;color:#596b60;padding:3px}.reader-book-cover [hidden]{display:none!important}@media(max-width:700px){.ed-reader .reader-header .reader-book-identity{flex:0 1 100%;width:100%}.reader-book-cover{width:44px;height:62px}}';
 if(title){title.before(identity);identity.append(cover,title);root.append(coverStyle);
  coverImage.onload=()=>{if(!disposed){coverImage.hidden=false;fallback.hidden=true;}};
  coverImage.onerror=()=>{coverImage.hidden=true;fallback.hidden=false;coverImage.removeAttribute('src');};
  void thumbnail(1).then(result=>{if(!disposed&&result.asset?.kind==='thumb'&&result.asset.pageNumber===1&&result.asset.signedUrl)coverImage.src=result.asset.signedUrl;}).catch(()=>{});
 }

 const fail=()=>{search?.clear();image.removeAttribute('src');image.hidden=true;if(error)error.hidden=false;if(errorDetail)errorDetail.textContent='Não foi possível acessar esta página. Tente novamente.';};
 const show=async(number)=>{
  if(disposed||!Number.isSafeInteger(number)||number<1||number>count)return;
  const version=++generation;current=number;search?.clear();
  image.removeAttribute('src');image.hidden=true;if(error)error.hidden=true;
  label.textContent=`${current} / ${count}`;
  for(const target of root.querySelectorAll('[data-page-count]'))target.textContent=`${current}/${count}`;
  for(const target of root.querySelectorAll('[data-prev-page]'))target.disabled=current===1;
  for(const target of root.querySelectorAll('[data-next-page]'))target.disabled=current===count;
  try {
   const result=await client.read(bookId,'page',number);
   if(disposed||version!==generation)return;
   const asset=result.asset;
   if(asset?.kind!=='page'||asset.pageNumber!==number||!asset.signedUrl)throw Error('invalid_page');
   image.src=asset.signedUrl;image.alt=`Página ${number}`;image.hidden=false;
  }catch{if(!disposed&&version===generation)fail();}
 };
 const click=(event)=>{
  const button=event.target.closest('button');if(!button||!root.contains(button))return;
  if(button.matches('[data-next-page]'))void show(current+1);
  else if(button.matches('[data-prev-page]'))void show(current-1);
  else if(button.matches('[data-page-error-retry]'))void show(current);
  else if(button.matches('[data-goto-page]'))void show(Number(button.dataset.gotoPage));
  else if(button.matches('[data-zoom-in],[data-zoom-out]')){
   zoom=Math.max(.5,Math.min(3,zoom+(button.matches('[data-zoom-in]')?.1:-.1)));
   frame.style.setProperty('--zoom',String(zoom));
   const value=root.querySelector('[data-zoom-label]');if(value)value.textContent=`${Math.round(zoom*100)}%`;
  }else if(button.matches('[data-fullscreen-reader]'))void frame.requestFullscreen?.();
 };
 root.addEventListener('click',click);
 const observer=new IntersectionObserver(entries=>{
  for(const entry of entries){if(!entry.isIntersecting)continue;observer.unobserve(entry.target);
   const number=Number(entry.target.dataset.page);
   void thumbnail(number).then(result=>{
    if(!disposed&&result.asset?.kind==='thumb'&&result.asset.pageNumber===number)entry.target.src=result.asset.signedUrl;
   }).catch(()=>entry.target.setAttribute('alt',`Miniatura ${number} indisponível`));
  }
 },{root:thumbs,rootMargin:'100px'});
 thumbs.replaceChildren();
 for(let number=1;number<=count;number++){
  const button=root.ownerDocument.createElement('button');button.type='button';button.dataset.gotoPage=String(number);button.setAttribute('aria-label',`Abrir página ${number}`);
  const thumb=root.ownerDocument.createElement('img');thumb.dataset.page=String(number);thumb.alt=`Miniatura ${number}`;thumb.loading='lazy';button.append(thumb);thumbs.append(button);observer.observe(thumb);
 }
 const imageError=()=>fail();image.addEventListener('error',imageError);
 search=connectEditionSearch(root,client,bookId,show);
 await show(1);
 return {show,dispose(){disposed=true;generation++;search?.dispose();coverImage.onload=null;coverImage.onerror=null;coverImage.removeAttribute('src');if(title&&identity.parentNode)identity.before(title);identity.remove();coverStyle.remove();observer.disconnect();root.removeEventListener('click',click);image.removeEventListener('error',imageError);image.removeAttribute('src');}};
}
