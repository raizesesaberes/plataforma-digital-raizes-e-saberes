import React, {useEffect, useState} from 'react';
import {Text} from 'react-native';
import {Action, JourneyCard, journeyStyles as s} from '../components/JourneyKit';
import {getStudentProfile, getTeacherContext, getTeacherMobileClasses, getTeacherNotificationCenter, type MobileSession, type SessionAppRole} from '../services/library';
const labels: Record<string,string> = {home:'Início',notifications:'Notificações',profile:'Perfil',classes:'Turmas'};
/** Read-only content inside the existing app shell. No fallback fixtures. */
export function ReadBetaSummary({session,role,route}:{session:MobileSession;role:SessionAppRole;route:string}) {
 const [rows,setRows]=useState<string[]|null>(null),[error,setError]=useState(false),[revision,setRevision]=useState(0);
 useEffect(()=>{
  let active=true;setRows(null);setError(false);
  const read=async()=>{
   if(role==='professor'){
    if(route==='classes')return (await getTeacherMobileClasses(session)).map(c=>`${c.name} · ${c.stage} · ${c.schedule} · ${c.studentCount} alunos`);
    if(route==='notifications')return (await getTeacherNotificationCenter(session)).map(n=>`${n.title}: ${n.summary}`);
    const c=await getTeacherContext(session);return [c.teacherName,c.schoolName,`${c.activeClassLinks} vínculos ativos com turmas`];
   }
   const p=await getStudentProfile(session);return [p.name,p.schoolName,p.className];
  };
  void read().then(value=>{if(active)setRows(value);}).catch(()=>{if(active)setError(true);});
  return()=>{active=false;};
 },[session,role,route,revision]);
 return <JourneyCard><Text accessibilityRole="header" style={s.title}>{labels[route] || 'Início'}</Text>
  {route==='home'&&<Text style={s.text}>Sua conta escolar e suas informações reais. Esta consulta não salva progresso, atividades ou alterações. Para outras funções, abra a plataforma normal.</Text>}
  {route==='notifications'&&<Text style={s.muted}>Até 50 notificações. Abrir esta tela não marca leitura.</Text>}
  {error?<><Text style={s.error}>Não foi possível consultar os dados da sua conta. Nenhum dado demonstrativo é exibido.</Text><Action title="Tentar novamente" onPress={()=>setRevision(v=>v+1)}/></>:rows===null?<Text style={s.text}>Carregando…</Text>:rows.length===0?<Text style={s.text}>Nenhum registro disponível nesta consulta.</Text>:rows.map((line,index)=><Text key={index} style={s.text}>{line}</Text>)}
 </JourneyCard>;
}
