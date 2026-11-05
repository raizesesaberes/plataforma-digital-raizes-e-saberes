import {createAreaShell,permanentGames} from './area-shell.mjs';
import {createAutomaticNavigation,createNavigationReader} from './automatic-navigation.mjs';
import {bindInfantilNavigation} from './navigation.mjs';
import {createSelfInfantilReader} from './client.mjs';
// Minimum read-only presentation: no player, checkpoint, reward or asset URL.
export function mountSelfInfantil({window,root,session,supabaseUrl,publishableKey,fetchImpl=fetch,onBasic=()=>{},onLegacy=()=>{},beforeInfantil=()=>true}){
 const doc=window.document,reader=createSelfInfantilReader({supabaseUrl,publishableKey,getAccessToken:session.getAccessToken,fetchImpl});
 let generation=0,active=false,offset=0,shell=null;
 const el=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
 let status=el('p');status.setAttribute('role','status');
 function clear(state){shell=null;generation++;active=false;offset=0;root.replaceChildren();root.dataset.state=state;root.dataset.selfPresentation=state;}
 function loginRequired(){clear('login_required');root.append(el('p','Sua sessão não está válida. Entre novamente com seu login.'));const link=el('a','Entrar novamente');link.href='/login?next=%2Faluno';root.append(link);}
 function failure(error,message){if(['missing_session','session_expired','session_changed'].includes(error?.message))loginRequired();else denied(message);}
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
   (shell?.content||root).append(panel);status.textContent='Informações do conteúdo';
  }catch(error){if(ticket===generation)failure(error,'Não foi possível autorizar esta leitura.');}
 }
 async function loadCatalog(){
  const ticket=++generation;root.querySelector('[data-content]')?.remove();
  try{
   const token=await session.getAccessToken();if(!token)throw Error('missing_session');
   const items=await reader.catalog(24,offset),current=await session.getAccessToken();
   if(ticket!==generation||!active)return;if(current!==token)throw Error('session_changed');
   const list=el('section'),groups=new Map(),seen=new Set();list.dataset.catalog='';
   for(const [kind,title] of [['game','Jogos permanentes'],['activity','Atividades'],['discovery','Descobertas']]){const group=el('section');group.dataset.catalogKind=kind;group.append(el('h2',title));groups.set(kind,group);list.append(group);}
   const gameItems=new Map();
   for(const item of items){
    if(!['activity','discovery','game'].includes(item?.kind)||typeof item.id!=='string'||!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(item.id)||typeof item.title!=='string'||seen.has(item.kind+':'+item.id))throw Error('invalid_catalog');seen.add(item.kind+':'+item.id);
    if(item.kind==='game'&&permanentGames.some(g=>g.id===item.id)){gameItems.set(item.id,item);continue;}
    if(!groups.has(item.kind)){const group=el('section');group.dataset.catalogKind=item.kind;group.append(el('h2',({game:'Jogos permanentes',activity:'Atividades',discovery:'Descobertas'})[item.kind]));groups.set(item.kind,group);list.append(group);}
    const card=el('article'),button=el('button',item.title);card.dataset.resourceCard='';button.dataset.kind=item.kind;button.append(el('small','Ver informações'));button.onclick=()=>void details(item);card.append(button);groups.get(item.kind).append(card);
   }
   const gameGrid=el('div');gameGrid.className='ei-game-grid';for(const game of permanentGames)gameGrid.append(shell.gameCard(game,gameItems.get(game.id),details));groups.get('game').append(gameGrid);
   for(const kind of ['activity','discovery'])if(!groups.get(kind).querySelector('[data-resource-card]'))groups.get(kind).append(el('p','Nenhum conteúdo desta seção está disponível nesta página.'));
   if(offset){const b=el('button','Anterior');b.onclick=()=>{offset=Math.max(0,offset-24);void loadCatalog();};list.append(b);}
   if(items.length===24){const b=el('button','Próxima');b.onclick=()=>{offset+=24;void loadCatalog();};list.append(b);}
   root.querySelector('[data-catalog]')?.remove();shell.content.append(list);shell.refreshView();status.textContent=items.length?'Explore os conteúdos retornados para seu acesso.':'Seu acesso ao Infantil foi confirmado. Nenhum conteúdo foi retornado para esta página.';
  }catch(error){if(ticket===generation)failure(error,'Não foi possível autorizar o catálogo.');}
 }
 const navigation=createAutomaticNavigation({getAccessToken:session.getAccessToken,readNavigation:createNavigationReader({supabaseUrl,publishableKey,fetchImpl}),render:s=>{
  clear(s.state);
  if(s.state==='basic'){onBasic(s.stage);return;}if(s.state==='legacy'){onLegacy();return;}
  if(s.state==='infantil'){
   if(!beforeInfantil())return;active=true;
   shell=createAreaShell({document:doc,root,onLogout:()=>{clear('locked');void session.logout();},onRefresh:()=>{if(active)void loadCatalog();}});status=shell.status;status.textContent='Conferindo os conteúdos disponíveis para você…';void loadCatalog();
  }else if(s.state==='login_required'){const link=el('a','Entrar');link.href='/login?next=%2Faluno';root.append(link);}
  else root.append(el('p',s.state==='checking'?'Verificando acesso':'Acesso indisponível'));
 }});
 const unbind=bindInfantilNavigation({window,navigation,subscribeSession:session.subscribe});return()=>{unbind();clear('locked');};
}
