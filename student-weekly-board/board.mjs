export function weekDates(value=new Date()){
 const d=value instanceof Date?new Date(value):new Date(value+'T12:00:00');
 if(!Number.isFinite(+d))throw Error('INVALID_WEEK');
 d.setDate(d.getDate()-(d.getDay()+6)%7);
 return Array.from({length:5},(_,i)=>{const day=new Date(d);day.setDate(d.getDate()+i);return `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;});
}
// Weekly board UI. Requires authorized read/save transport; no default network,
// browser-storage persistence, role inference, or database access.
export async function mountWeeklyBoard({root,dates,transport,simulation=false,existingWeekElement=null,clock=()=>new Date()}){
 const doc=root.ownerDocument;let generation=0,disposed=false,pending=0,loading=false;const dirty=new Set();let current=weekDates(clock())[0];
 const node=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
 root.classList.add('weekly-board');
 const heading=node('h2','Rotina da semana');root.replaceChildren(heading);
 const status=node('p',simulation?'Demonstração local: alterações temporárias, sem salvar na plataforma.':'Carregando a semana…');status.className='weekly-status';status.setAttribute('role','status');root.append(status);
 const nav=node('div');nav.className='weekly-navigation';const previous=node('button','Semana anterior'),next=node('button','Próxima semana'),today=node('button','Semana atual'),refresh=node('button','Recarregar');
 const range=node('span');range.setAttribute('aria-live','polite');for(const b of [previous,next,today,refresh])b.type='button';nav.append(previous,range,next,today,refresh);root.append(nav);
 const intro=node('p','As anotações da família são uma rotina por dia da semana e permanecem até serem editadas. Os recados da professora correspondem à semana selecionada.');intro.className='weekly-intro';root.append(intro);
 function busy(){return loading||pending>0||dirty.size>0;}
 async function select(start){if(disposed)return;if(busy()){status.textContent='Salve ou cancele as alterações antes de trocar ou recarregar a semana.';return;}dates=weekDates(start);await load();}
 function shift(n){const d=new Date(dates[0]+'T12:00:00');d.setDate(d.getDate()+n);return select(d);}
 previous.onclick=()=>shift(-7);next.onclick=()=>shift(7);today.onclick=()=>select(clock());refresh.onclick=()=>select(dates[0]);
 function checkCalendar(){const actual=weekDates(clock())[0];if(actual===current||disposed)return;const wasCurrent=dates[0]===current;current=actual;if(wasCurrent){if(busy())status.textContent='A semana mudou. Salve ou cancele seu texto; depois escolha Semana atual.';else void select(actual);}}

 const body=node('div');body.className='weekly-days';root.append(body);
 const prior=node('details');if(existingWeekElement){prior.append(node('summary','Compromissos já publicados'));existingWeekElement.querySelector('h2')?.remove();prior.append(existingWeekElement);root.append(prior);}
 function locked(message){generation++;dirty.clear();nav.remove();body.replaceChildren();prior.remove();status.textContent=message;}
 async function load(){const ticket=++generation;loading=true;body.replaceChildren();dirty.clear();status.textContent='Carregando a semana…';range.textContent=`${dates[0].split('-').reverse().join('/')} — ${dates[4].split('-').reverse().join('/')}`;try{const rows=await transport.read(dates);if(disposed||ticket!==generation)return;body.replaceChildren();for(const row of rows){const day=node('article');day.className='student-side-card weekly-day';
 const date=new Date(row.date+'T12:00:00Z');day.dataset.weekday=String(date.getUTCDay());
 const dayHeading=node('header'),dayTitle=node('h3',new Intl.DateTimeFormat('pt-BR',{weekday:'long',timeZone:'UTC'}).format(date)),dateBadge=node('time',new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',timeZone:'UTC'}).format(date));
 dayHeading.className='weekly-day-heading';dateBadge.dateTime=row.date;dayHeading.append(dayTitle,dateBadge);day.append(dayHeading);for(const [lane,label] of [['family','Anotações da família'],['class','Professora — para toda a turma'],['student','Professora — para este aluno']]){const entry=row.lanes[lane],section=node('section'),id=`weekly-${row.date}-${lane}`,labelNode=node('label',label);section.className=`weekly-lane weekly-lane-${lane}`;labelNode.htmlFor=id;section.append(labelNode);if(entry.editable){const input=node('textarea');input.id=id;input.value=entry.text;input.rows=2;input.maxLength=500;input.placeholder=lane==='family'?'Ex.: Educação Física, Dia do brinquedo':'Escreva o recado deste dia';section.append(input);const save=node('button',simulation?'Salvar na simulação':'Salvar'),cancel=node('button','Cancelar');save.type=cancel.type='button';section.append(save,cancel);let revision=entry.version,saved=entry.text;input.oninput=()=>{if(input.value===saved)dirty.delete(input);else dirty.add(input);};
 save.onclick=async()=>{const ticket=generation;pending++;save.disabled=true;input.disabled=true;cancel.disabled=true;try{const result=await transport.save({date:row.date,lane,text:input.value,expectedVersion:revision});if(disposed||ticket!==generation)return;saved=result.text;revision=result.version;input.value=saved;dirty.delete(input);status.textContent=simulation?'Alteração guardada só nesta simulação.':'Anotação salva.';}catch(e){if(disposed||ticket!==generation)return;if(['SESSION_REQUIRED','SCOPE_CHANGED','CONTEXT_DENIED','OWNER_DENIED','CLASS_DENIED','ROLE_DENIED'].includes(e.message))locked('Acesso não confirmado. Entre novamente.');else status.textContent=e.message==='VERSION_CONFLICT'?'O conteúdo mudou. Recarregue a semana antes de salvar.':'Não foi possível salvar. Seu texto permanece no campo.';}finally{pending--;save.disabled=false;input.disabled=false;cancel.disabled=false;}};
 cancel.onclick=()=>{input.value=saved;dirty.delete(input);};
 }else{const p=node('p',entry.withheld?'Anotações privadas da família.':entry.text||'Nenhum recado publicado para este dia.');p.id=id;section.append(p);}day.append(section);}body.append(day);}if(!simulation)status.textContent='Cada área mantém sua autoria.';}catch{if(ticket===generation&&!disposed)locked('Não foi possível confirmar acesso a este quadro. Confira a sessão e o vínculo Infantil.');}finally{if(ticket===generation)loading=false;}}
 await load();return Object.freeze({reload:()=>select(dates[0]),checkCalendar,dispose(){disposed=true;locked('Sessão encerrada.');}});
}
