// LOCAL SYNTHETIC QA ONLY. Not allowlisted in runtime/deployment manifests.
(() => {
 const params=new URLSearchParams(location.search),scenario=params.get('scenario')||'login',role=params.get('profile')||'professor';
 const user='synthetic-'+role,exp=Math.floor(Date.now()/1000)+3600;
 const token='x.'+btoa(JSON.stringify({sub:user,exp})).replace(/=/g,'')+'.synthetic';
 const session={access_token:token,refresh_token:'synthetic-only',user:{id:user},expires_at:exp};
 const key='raizes:supabase-auth-session';
 if(scenario==='existing')localStorage.setItem(key,JSON.stringify(session));else if(scenario!=='retain'){localStorage.removeItem(key);localStorage.removeItem('raizes:supabase-access-token');}
 window.RAIZES_SUPABASE={url:'https://backend.invalid',anonKey:'sb_publishable_synthetic'};
 const original=window.fetch.bind(window),calls=[];window.__ownLoginQa={calls};
 window.fetch=async(input,init={})=>{
  const url=new URL(typeof input==='string'?input:input.url,location.href);
  if(url.origin===location.origin)return original(input,init);
  if(url.origin!=='https://backend.invalid')throw Error('external_request_blocked_in_qa');
  calls.push({path:url.pathname,method:init.method||'GET'}); // Never capture credentials or response tokens.
  if(url.pathname==='/auth/v1/token'||url.pathname==='/functions/v1/student-institutional-login'){
   if(scenario==='pending')await new Promise(resolve=>setTimeout(resolve,6000));
   if(scenario==='timeout')await new Promise(()=>{});
   const body=JSON.parse(init.body||'{}');
   if(body.password!=='synthetic-only')return Response.json({error:'Synthetic credentials only'},{status:400});
   if(scenario==='password-change')session.user.user_metadata={password_change_required:true};
   return Response.json(url.pathname.includes('student-institutional-login')?{ok:true,session}:session);
  }
  if(url.pathname==='/auth/v1/user')return Response.json({id:user});
  if(url.pathname==='/auth/v1/logout')return new Response(null,{status:204});
  const rpc=url.pathname.split('/').pop();
  if(rpc==='app_get_self_profile')return Response.json([{profile_id:user,platform_role:role==='professor'?'professor':role==='crescer'?'educacao_infantil':'aluno',status:'active',student_ids:role==='professor'?[]:['synthetic-student']}]);
  if(rpc==='student_get_context')return Response.json([{student_id:'synthetic-student',student_name:'Estudante sintético',school_id:'synthetic-school',school_name:'Escola sintética QA',class_id:'synthetic-class',class_name:role==='crescer'?'Infantil QA':'6º ano QA',segment:role==='crescer'?'EDUCACAO_INFANTIL':role==='medio'?'ENSINO_MEDIO':'ENSINO_FUNDAMENTAL',school_year:'6',age_group:role==='crescer'?'4-5':null}]);
  if(rpc==='teacher_get_context')return Response.json([{profile_id:user,teacher_id:'synthetic-teacher',teacher_name:'Professora sintética',school_id:'synthetic-school',school_name:'Escola sintética QA',active_class_links:1}]);
  if(rpc==='teacher_list_classes_for_mobile')return Response.json([{class_id:'synthetic-class',school_id:'synthetic-school',class_name:'Turma sintética',school_year:'6',student_count:1}]);
  if(['notification_get_center','teacher_get_notification_center','library_list_editions'].includes(rpc))return Response.json([]);
  throw Error('Synthetic endpoint not provided');
 };
})();
