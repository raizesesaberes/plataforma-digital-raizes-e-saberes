import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Action, JourneyCard, journeyStyles as s } from '../components/JourneyKit';
import { type MobileSession, type TeacherMobileClass, type TeacherCommunicationSummary } from '../services/library';
import { createHostedTeacherCommands, validTeacherDate, TeacherCommandError } from '../services/hostedTeacherCommands';
type Api = ReturnType<typeof createHostedTeacherCommands>;
function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function HostedTeacherCommands({session,kind,registerLeaveGuard}:{session:MobileSession|null;kind:'attendance'|'communication';registerLeaveGuard:(guard:(()=>boolean)|null)=>void}) {
  if (!session) return <JourneyCard><Text style={s.text}>Entre para consultar seus registros.</Text></JourneyCard>;
  return <Workspace key={`${session.userId}:${session.accessToken}:${kind}`} session={session} kind={kind} registerLeaveGuard={registerLeaveGuard}/>;
}
function Workspace({session,kind,registerLeaveGuard}:{session:MobileSession;kind:'attendance'|'communication';registerLeaveGuard:(guard:(()=>boolean)|null)=>void}) {
  const mounted = useRef(true), request = useRef(0);
  const api = useMemo(()=>createHostedTeacherCommands(session,()=>mounted.current),[session]);
  const [classes,setClasses]=useState<TeacherMobileClass[]>([]), [classId,setClassId]=useState('');
  const [date,setDate]=useState(today), [result,setResult]=useState<Awaited<ReturnType<Api['attendance']>>|null>(null);
  const [messages,setMessages]=useState<TeacherCommunicationSummary[]>([]), [selectedId,setSelectedId]=useState<string|null>(null);
  const [marks,setMarks]=useState<Record<string,string>>({}), [dirty,setDirty]=useState(false), [notice,setNotice]=useState(''), [review,setReview]=useState(false);
  const [roster,setRoster]=useState<Awaited<ReturnType<Api['roster']>>|null>(null), [audience,setAudience]=useState<'class'|'student'>('class'), [studentId,setStudentId]=useState(''), [title,setTitle]=useState(''), [body,setBody]=useState(''), [uncertain,setUncertain]=useState(false);
  const lock=useRef(false), dirtyRef=useRef(false);dirtyRef.current=dirty;
  useEffect(()=>{const guard=()=>{if(lock.current||dirtyRef.current){setError('Aguarde a operação ou descarte as alterações antes de sair.');return false;}return true;};registerLeaveGuard(guard);const unload=(e:BeforeUnloadEvent)=>{if(!guard()){e.preventDefault();e.returnValue='';}};if(typeof window!=='undefined')window.addEventListener('beforeunload',unload);return()=>{registerLeaveGuard(null);if(typeof window!=='undefined')window.removeEventListener('beforeunload',unload);};},[registerLeaveGuard]);
  const [busy,setBusy]=useState(false), [error,setError]=useState(''), [loaded,setLoaded]=useState(false);
  useEffect(()=>{ mounted.current=true; return ()=>{mounted.current=false; request.current++;}; },[]);
  async function load(initial=false) {
    if(lock.current||dirtyRef.current)return;lock.current=true;
    const id=++request.current; setNotice('');setBusy(true);setError('');setLoaded(false);setResult(null);setMessages([]);setSelectedId(null);
    try {
      if(kind==='communication') { const rows=await api.messages(); const owned=await api.classes(); if(mounted.current&&id===request.current){setMessages(rows);setClasses(owned);} }
      else if(initial) { const rows=await api.classes();if(mounted.current&&id===request.current){setClasses(rows);setClassId('');} }
      else { const value=await api.attendance(classId,date);if(mounted.current&&id===request.current){setResult(value);setMarks(Object.fromEntries(value.students.filter(s=>s.attendance).map(s=>[s.id,s.attendance!])));setReview(false);} }
      if(mounted.current&&id===request.current)setLoaded(true);
    } catch { if(mounted.current&&id===request.current)setError('Não foi possível consultar os registros. Nenhuma alteração foi enviada. Tente novamente.'); }
    finally { lock.current=false; if(mounted.current&&id===request.current)setBusy(false); }
  }
  useEffect(()=>{void load(true);},[api,kind]);
  async function selectClass(id:string) {
    if(lock.current||dirtyRef.current)return;setClassId(id);setStudentId('');setRoster(null);setResult(null);setError('');
    if(kind==='communication'){lock.current=true;setBusy(true);try{const value=await api.roster(id);if(mounted.current)setRoster(value);}catch{if(mounted.current)setError('Não foi possível consultar destinatários.');}finally{lock.current=false;if(mounted.current)setBusy(false);}}
  }
  async function save() {
    if(lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');
    try {
      if(kind==='attendance'&&result){const value=await api.saveAttendance(result,marks);if(mounted.current){setResult(value);setDirty(false);setNotice('Chamada salva e conferida no servidor.');}}
      else if(kind==='communication'){await api.publish({classId,studentId:audience==='student'?studentId:null,audience,date,title,body});if(mounted.current){setTitle('');setBody('');setDirty(false);setNotice('Recado publicado e conferido no servidor. Atualize a lista para consultar.');}}
    }catch(e){if(mounted.current){if(kind==='attendance'){setReview(true);setError(e instanceof TeacherCommandError&&e.code==='conflict'?'A chamada foi alterada por outra sessão. Descarte e consulte novamente antes de salvar.':'Não foi possível confirmar a gravação. Descarte e consulte novamente antes de salvar.');}else{const isUncertain=e instanceof TeacherCommandError&&e.code==='uncertain';setUncertain(isUncertain);setError(isUncertain?'O envio pode ter sido concluído, mas não foi confirmado. Não envie novamente. Consulte os recados na plataforma antes de qualquer novo envio.':'O recado não foi confirmado. Confira sua sessão e o destinatário.');}}}
    finally{lock.current=false;if(mounted.current)setBusy(false);}
  }
  const selected=messages.find(row=>row.communicationId===selectedId);
  return <View><JourneyCard>
    <Text accessibilityRole="header" style={s.title}>{kind==='attendance'?'Frequência':'Comunicação'}</Text>
    <Text style={s.muted}>{kind==='attendance'?'Selecione a turma e a data. Alunos sem registro precisam de marcação explícita.':'Selecione os destinatários por vínculo e revise o texto antes de enviar.'}</Text>
    {busy?<Text accessibilityLiveRegion="polite" style={s.text}>Consultando…</Text>:null}
    {error?<Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>:null}
    {notice?<Text accessibilityLiveRegion="polite" style={s.text}>{notice}</Text>:null}
    {dirty?<Action title="Descartar alterações" disabled={busy} onPress={()=>{setDirty(false);setTitle('');setBody('');setResult(null);setMarks({});setNotice('Alterações locais descartadas. Consulte novamente para ver o servidor.');}}/>:null}
    {kind==='attendance'?<>
      <Action title="Atualizar minhas turmas" disabled={busy||dirty} onPress={()=>void load(true)}/>
      {!busy&&loaded&&!classes.length?<Text style={s.text}>Nenhuma turma vinculada disponível.</Text>:null}
      {classes.map(c=><Action key={c.id} title={`${classId===c.id?'Selecionada: ':'Selecionar: '}${c.name} · ${c.stage} · ${c.schedule} · ${c.id}`} disabled={busy||dirty} onPress={()=>void selectClass(c.id)}/>)}
      <Text style={s.text}>Data da chamada (AAAA-MM-DD)</Text>
      <TextInput accessibilityLabel="Data da chamada, formato ano mês dia" editable={!busy&&!dirty} style={s.input} value={date} maxLength={10} onChangeText={value=>{setDate(value);setResult(null);setError('');}}/>
      {!validTeacherDate(date)?<Text style={s.error}>Informe uma data válida no formato AAAA-MM-DD.</Text>:null}
      <Action title="Consultar chamada" disabled={busy||dirty||!classes.some(c=>c.id===classId)||!validTeacherDate(date)} onPress={()=>void load()}/>
      {result?<><Text style={s.title}>{result.schoolClass.name} · {result.date}</Text>{!result.students.length?<Text style={s.text}>Nenhum aluno vinculado disponível.</Text>:null}{result.students.map(student=><View key={student.id}><Text style={s.text}>{student.name} · {student.id}</Text><Text style={s.muted}>{student.attendance===null?'Sem registro':student.attendance==='present'?'Presente':student.attendance==='absent'?'Falta':'Justificada'}</Text>{['present','absent','justified'].map(status=><Action key={status} title={`${marks[student.id]===status?'Selecionado: ':''}${status==='present'?'Presente':status==='absent'?'Falta':'Justificada'}`} disabled={busy||review} onPress={()=>{setMarks(current=>({...current,[student.id]:status}));setDirty(true);setNotice('');}}/>)}</View>)}<Action title="Salvar chamada revisada" disabled={busy||review||!dirty||result.students.some(s=>!marks[s.id])} onPress={()=>void save()}/></>:null}
    </>:<>
      <Action title="Atualizar recados enviados" disabled={busy||dirty} onPress={()=>void load()}/>
      {!busy&&loaded&&!messages.length?<Text style={s.text}>Nenhum recado disponível.</Text>:null}
      {messages.map(row=><Action key={row.communicationId} title={`${row.title} · ${row.audienceLabel} · ${row.communicationDate||'Sem data'}`} onPress={()=>setSelectedId(row.communicationId)}/>)}
      {selected?<JourneyCard><Text style={s.title}>{selected.title}</Text><Text style={s.muted}>{selected.audienceLabel} · {selected.communicationDate||'Sem data'}</Text><Text style={s.text}>{selected.body}</Text><Text style={s.muted}>Estado: {selected.status}. Entregues: {selected.deliveredCount}. Lidos: {selected.readCount}.</Text><Action title="Fechar recado" onPress={()=>setSelectedId(null)}/></JourneyCard>:null}
      <Text style={s.title}>Novo recado</Text>
      {classes.map(c=><Action key={c.id} title={`${classId===c.id?'Selecionada: ':'Selecionar: '}${c.name} · ${c.id}`} disabled={busy||dirty} onPress={()=>void selectClass(c.id)}/>)}
      {roster?<><Action title="Destinar à turma inteira" disabled={busy||dirty} onPress={()=>{setAudience('class');setStudentId('');}}/><Action title="Destinar a um aluno" disabled={busy||dirty} onPress={()=>setAudience('student')}/><Text style={s.text}>Destino: {roster.schoolClass.name} · {audience==='class'?'Turma inteira':studentId||'Escolha um aluno'}</Text>{audience==='student'?roster.students.map(student=><Action key={student.id} title={`${studentId===student.id?'Selecionado: ':''}${student.name} · ${student.id}`} disabled={busy||dirty} onPress={()=>setStudentId(student.id)}/>):null}</>:null}
      <Text style={s.text}>Data do recado (AAAA-MM-DD)</Text><TextInput accessibilityLabel="Data do recado" style={s.input} editable={!busy&&!dirty} value={date} onChangeText={setDate}/>
      <TextInput accessibilityLabel="Título do recado" placeholder="Título" style={s.input} editable={!busy&&!uncertain} value={title} onChangeText={v=>{setTitle(v);setDirty(true);}}/>
      <TextInput accessibilityLabel="Texto do recado" placeholder="Mensagem" multiline style={s.input} editable={!busy&&!uncertain} value={body} onChangeText={v=>{setBody(v);setDirty(true);}}/>
      <Action title="Enviar recado revisado" disabled={busy||uncertain||!roster||roster.schoolClass.id!==classId||!validTeacherDate(date)||!title.trim()||!body.trim()||(audience==='student'&&!roster.students.some(s=>s.id===studentId))} onPress={()=>void save()}/>
    </>}
  </JourneyCard></View>;
}
