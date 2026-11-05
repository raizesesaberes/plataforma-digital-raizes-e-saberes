// Local candidate transport. Inject existing authenticated rpc and session identity.
// No credentials, network defaults, browser persistence or authorization decisions.
export function createWeeklyRpcTransport({rpc,sessionIdentity,teacherTarget=null}) {
 let scope=null,subject=null,revision=0,allowed=new Map(),dates=[];
 function identity(){const id=sessionIdentity();if(typeof id!=='string'||!id)throw Error('SESSION_REQUIRED');return id;}
 function clear(){scope=null;subject=null;allowed.clear();revision++;}
 function error(e){const msg=String(e?.message||'RPC_ERROR');return Error(['SCOPE_CHANGED','CLASS_DENIED','OWNER_DENIED','ROLE_DENIED','SESSION_REQUIRED','CONTEXT_DENIED'].find(c=>msg.includes(c))||(msg.includes('VERSION_OR_AUTHOR_CONFLICT')?'VERSION_CONFLICT':'RPC_ERROR'));}
 return Object.freeze({
 async read(requestedDates){clear();const ticket=revision,id=identity();if(!Array.isArray(requestedDates)||requestedDates.length!==5)throw Error('INVALID_WEEK');
  const start=new Date(requestedDates[0]+'T12:00:00Z');if(!Number.isFinite(+start)||start.getUTCDay()!==1||requestedDates.some((d,i)=>d!==new Date(+start+i*86400000).toISOString().slice(0,10)))throw Error('INVALID_WEEK');
  const name=teacherTarget?'teacher_get_weekly_board_v1':'student_get_self_weekly_board_v1';
  const args=teacherTarget?{p_class_id:teacherTarget.classId,p_student_id:teacherTarget.studentId,p_week_start:requestedDates[0]}:{p_week_start:requestedDates[0]};
  const result=await rpc(name,args);if(ticket!==revision)throw Error('SESSION_REQUIRED');if(identity()!==id){clear();throw Error('SESSION_REQUIRED');}if(result.error)throw error(result.error);
  const x=result.data;if(!x||typeof x.scope!=='string'||!x.scope||!Array.isArray(x.days)||x.days.length!==5)throw Error('INVALID_RESPONSE');
  const next=new Map();for(let i=0;i<5;i++){const day=x.days[i];if(day.date!==requestedDates[i])throw Error('INVALID_RESPONSE');for(const lane of ['family','class','student']){const c=day.lanes?.[lane];if(!c||typeof c.text!=='string'||!Number.isSafeInteger(c.version)||c.version<0||typeof c.editable!=='boolean'||typeof c.withheld!=='boolean')throw Error('INVALID_RESPONSE');if(teacherTarget&&lane==='family'&&(!c.withheld||c.text||c.editable))throw Error('INVALID_RESPONSE');if(!teacherTarget&&lane!=='family'&&c.editable)throw Error('INVALID_RESPONSE');next.set(day.date+':'+lane,{editable:c.editable,version:c.version});}}
  scope=x.scope;subject=id;dates=[...requestedDates];allowed=next;return x.days;
 },
 async save(input){const id=identity();if(!scope||id!==subject){clear();throw Error('SESSION_REQUIRED');}if(!input||Object.keys(input).some(k=>!['date','lane','text','expectedVersion'].includes(k))||!dates.includes(input.date)||typeof input.text!=='string'||input.text.length>500)throw Error('INVALID_INPUT');const c=allowed.get(input.date+':'+input.lane);if(!c?.editable)throw Error('OWNER_DENIED');if(input.expectedVersion!==c.version)throw Error('VERSION_CONFLICT');
  const ticket=revision,payload={...input,scope};if(teacherTarget)Object.assign(payload,{classId:teacherTarget.classId,studentId:teacherTarget.studentId});
  const result=await rpc('save_weekly_board_entry_v1',{p_payload:payload});if(ticket!==revision)throw Error('SESSION_REQUIRED');if(identity()!==id){clear();throw Error('SESSION_REQUIRED');}if(result.error){const e=error(result.error);if(e.message!=='VERSION_CONFLICT')clear();throw e;}
  const r=result.data;if(!r||r.scope!==scope||typeof r.text!=='string'||r.text!==input.text.trim()||r.version!==input.expectedVersion+1){clear();throw Error('INVALID_RESPONSE');}c.version=r.version;return {text:r.text,version:r.version};
 },dispose:clear
 });
}
