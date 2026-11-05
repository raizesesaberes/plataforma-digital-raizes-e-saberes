import {createAutomaticNavigation,createNavigationReader} from './automatic-navigation.mjs';
import {bindInfantilNavigation} from './navigation.mjs';
import {createSelfInfantilReader} from './client.mjs';
// Minimum read-only presentation: no player, checkpoint, reward or asset URL.
export function mountSelfInfantil({window,root,session,supabaseUrl,publishableKey,fetchImpl=fetch,onBasic=()=>{},onLegacy=()=>{},beforeInfantil=()=>true}){
 const doc=window.document,reader=createSelfInfantilReader({supabaseUrl,publishableKey,getAccessToken:session.getAccessToken,fetchImpl});
 let generation=0,active=false,offset=0;
 const el=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
 const status=el('p');status.setAttribute('role','status');
 function clear(state){generation++;active=false;offset=0;root.replaceChildren();root.dataset.state=state;root.dataset.selfPresentation=state;}
 function denied(message){clear('denied');root.append(el('p',message));}
 async function details(item){
  if(!active)return;const ticket=++generation;root.querySelector('[data-content]')?.remove();status.textContent='Carregando informações';
  try{
   const token=await session.getAccessToken();if(!token)throw Error('missing_session');
   const value=await reader.content(item.kind,item.id),current=await session.getAccessToken();
   if(ticket!==generation||!active)return;if(current!==token)throw Error('session_changed');
   const panel=el('section');panel.dataset.content='';panel.append(el('h2',value.title||item.title));
   const text=value.instruction||value.student_instruction||value.description;
   if(typeof text==='string'&&text.trim())panel.append(el('p',text));
   const back=el('button','Voltar à lista');back.onclick=()=>{generation++;panel.remove();status.textContent='Escolha um conteúdo para ver suas informações';};panel.append(back);
   root.append(panel);status.textContent='Informações do conteúdo';
  }catch{if(ticket===generation)denied('Não foi possível autorizar esta leitura.');}
 }
 async function loadCatalog(){
  const ticket=++generation;root.querySelector('[data-content]')?.remove();
  try{
   const token=await session.getAccessToken();if(!token)throw Error('missing_session');
   const items=await reader.catalog(24,offset),current=await session.getAccessToken();
   if(ticket!==generation||!active)return;if(current!==token)throw Error('session_changed');
   const list=el('section'),groups=new Map(),seen=new Set();list.dataset.catalog='';
   for(const item of items){
    if(!['activity','discovery','game'].includes(item?.kind)||typeof item.id!=='string'||!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(item.id)||typeof item.title!=='string'||seen.has(item.kind+':'+item.id))throw Error('invalid_catalog');seen.add(item.kind+':'+item.id);
    if(!groups.has(item.kind)){const group=el('section');group.dataset.catalogKind=item.kind;group.append(el('h2',({game:'Jogos permanentes',activity:'Atividades',discovery:'Descobertas'})[item.kind]));groups.set(item.kind,group);list.append(group);}
    const card=el('article'),button=el('button',item.title);card.dataset.resourceCard='';button.dataset.kind=item.kind;button.append(el('small','Ver informações'));button.onclick=()=>void details(item);card.append(button);groups.get(item.kind).append(card);
   }
   if(!items.length)list.append(el('p','Nenhum conteúdo disponível nesta página.'));
   if(offset){const b=el('button','Anterior');b.onclick=()=>{offset=Math.max(0,offset-24);void loadCatalog();};list.append(b);}
   if(items.length===24){const b=el('button','Próxima');b.onclick=()=>{offset+=24;void loadCatalog();};list.append(b);}
   root.querySelector('[data-catalog]')?.remove();root.append(list);status.textContent='Escolha um conteúdo para ver suas informações';
  }catch{if(ticket===generation)denied('Não foi possível autorizar o catálogo.');}
 }
 const navigation=createAutomaticNavigation({getAccessToken:session.getAccessToken,readNavigation:createNavigationReader({supabaseUrl,publishableKey,fetchImpl}),render:s=>{
  clear(s.state);
  if(s.state==='basic'){onBasic(s.stage);return;}if(s.state==='legacy'){onLegacy();return;}
  if(s.state==='infantil'){
   if(!beforeInfantil())return;active=true;
   const header=el('header'),brand=el('img'),heading=el('div'),exit=el('button','Sair');header.dataset.infantilHeader='';brand.src='/logo-horizontal-light.png';brand.alt='Raízes e Saberes';brand.dataset.originalBrand='';heading.append(el('p','Educação Infantil'),el('h1','Vamos aprender'));exit.dataset.logout='';exit.onclick=()=>{clear('locked');void session.logout();};header.append(brand,heading,exit);root.append(header,status);status.textContent='Carregando conteúdos';void loadCatalog();
  }else if(s.state==='login_required'){const link=el('a','Entrar');link.href='/login?next=%2Faluno';root.append(link);}
  else root.append(el('p',s.state==='checking'?'Verificando acesso':'Acesso indisponível'));
 }});
 const unbind=bindInfantilNavigation({window,navigation,subscribeSession:session.subscribe});return()=>{unbind();clear('locked');};
}
