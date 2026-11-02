// Controller for the existing reader controls. All page URLs come from the
// protected service; no static path or PDF fallback is permitted.
export async function connectEditionReader(root, client, bookId) {
 const image=root.querySelector('[data-page-image]');
 const label=root.querySelector('[data-page-label]');
 const frame=root.querySelector('[data-reader-page]');
 const error=root.querySelector('[data-page-error]');
 const errorDetail=root.querySelector('[data-page-error-detail]');
 const thumbs=root.querySelector('[data-thumbnail-list]');
 let current=1,zoom=1,generation=0,disposed=false;
 const request=await client.read(bookId,'manifest');
 const count=request.manifest?.pageCount;
 if(!Number.isSafeInteger(count)||count<1)throw Error('invalid_manifest');
 root.dataset.totalPages=String(count);
 const fail=()=>{image.removeAttribute('src');image.hidden=true;if(error)error.hidden=false;if(errorDetail)errorDetail.textContent='Não foi possível acessar esta página. Tente novamente.';};
 const show=async(number)=>{
  if(disposed||!Number.isSafeInteger(number)||number<1||number>count)return;
  const version=++generation;current=number;
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
   void client.read(bookId,'thumb',number).then(result=>{
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
 await show(1);
 return {show,dispose(){disposed=true;generation++;observer.disconnect();root.removeEventListener('click',click);image.removeEventListener('error',imageError);image.removeAttribute('src');}};
}
