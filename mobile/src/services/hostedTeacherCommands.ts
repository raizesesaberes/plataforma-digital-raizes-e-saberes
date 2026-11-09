import { getTeacherMobileClasses, getTeacherCommunicationSummaries, restGet, rpc, type MobileSession } from './library';
export function validTeacherDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export class TeacherCommandError extends Error {
  constructor(public code: 'context_changed' | 'invalid_selection' | 'invalid_response' | 'busy' | 'review_required' | 'conflict' | 'uncertain') { super(code); }
}
const dependencies = { classes: getTeacherMobileClasses, messages: getTeacherCommunicationSummaries, read: restGet, rpc };
type AttendanceRow = {id:string;school_id:string;class_id:string;student_id:string;attendance_date:string;status:string;notes:string|null;updated_at:string};
export type MessageDraft = {classId:string;studentId:string|null;audience:'class'|'student';date:string;title:string;body:string};
// Retain uncertain publications across route unmounts for this running app. No automatic retry.
const unresolved = new Set<string>();
export function createHostedTeacherCommands(session: MobileSession, isCurrent: () => boolean, io = dependencies) {
  const userId = session.userId, token = session.accessToken;
  let busy = false, review = false;
  const snapshots = new WeakSet<object>();
  function guard() { if (!isCurrent() || !userId || !token || session.userId !== userId || session.accessToken !== token) throw new TeacherCommandError('context_changed'); }
  async function run<T>(action: () => Promise<T>) {
    guard(); if (busy) throw new TeacherCommandError('busy'); busy = true;
    try { const result = await action(); guard(); return result; } finally { busy = false; }
  }
  async function classes() {
    guard(); const rows = await io.classes(session); guard(); const ids = new Set<string>();
    for (const row of rows) { if (!row.id || !row.schoolId || ids.has(row.id)) throw new TeacherCommandError('invalid_response'); ids.add(row.id); }
    return rows;
  }
  async function roster(classId:string, attendanceDate?:string) {
    if(attendanceDate!==undefined&&!validTeacherDate(attendanceDate))throw new TeacherCommandError('invalid_selection');
    const schoolClass=(await classes()).find(row=>row.id===classId);
    if(!schoolClass)throw new TeacherCommandError('invalid_selection');
    // PostgreSQL performs ::date in the response, in the same DB timezone as the RPC.
    // Never slice a timestamp or reinterpret enrollment dates in the device timezone.
    const rows=await io.read<Array<{id:string;student_id:string;school_id:string;class_id:string;status:string;enrolled_date:string|null;ended_date:string|null;students:{nome:string;status:string}|Array<{nome:string;status:string}>|null}>>(session,
      `enrollments?select=id,student_id,school_id,class_id,status,enrolled_date:enrolled_at::date,ended_date:ended_at::date,students(nome,status)&school_id=eq.${encodeURIComponent(schoolClass.schoolId)}&class_id=eq.${encodeURIComponent(classId)}&status=eq.active${attendanceDate===undefined?'&ended_at=is.null':''}&order=enrolled_at.desc.nullslast,created_at.desc`);
    guard();const byId=new Map<string,{id:string;name:string;status:string}>();
    for(const row of rows){
      if(!row.id||!row.student_id||row.school_id!==schoolClass.schoolId||row.class_id!==classId||row.status!=='active'||!(row.enrolled_date===null||validTeacherDate(row.enrolled_date))||!(row.ended_date===null||validTeacherDate(row.ended_date)))throw new TeacherCommandError('invalid_response');
      if(attendanceDate!==undefined){
        if((row.enrolled_date!==null&&row.enrolled_date>attendanceDate)||(row.ended_date!==null&&row.ended_date<attendanceDate))continue;
      }else if(row.ended_date!==null)continue;
      // Multiple eligible enrollment rows represent one student, never two marks.
      const student=Array.isArray(row.students)?row.students[0]:row.students;
      if(!student||typeof student.nome!=='string')throw new TeacherCommandError('invalid_response');
      if(!byId.has(row.student_id))byId.set(row.student_id,{id:row.student_id,name:student.nome||'Aluno',status:student.status});
    }
    return {schoolClass,students:Array.from(byId.values())};
  }
  async function attendance(classId:string,date:string) {
    if(!validTeacherDate(date))throw new TeacherCommandError('invalid_selection');
    const {schoolClass,students}=await roster(classId,date);
    const rows=await io.read<AttendanceRow[]>(session,`attendance_records?select=id,school_id,class_id,student_id,attendance_date,status,notes,updated_at&school_id=eq.${encodeURIComponent(schoolClass.schoolId)}&class_id=eq.${encodeURIComponent(classId)}&attendance_date=eq.${encodeURIComponent(date)}`);guard();
    const records=new Map<string,AttendanceRow>();
    for(const row of rows){if(!row.id||row.school_id!==schoolClass.schoolId||row.class_id!==classId||row.attendance_date!==date||!['present','absent','justified'].includes(row.status)||!row.updated_at||!(row.notes===null||typeof row.notes==='string')||records.has(row.student_id))throw new TeacherCommandError('invalid_response');records.set(row.student_id,row);}
    const snapshot={schoolClass,date,students:students.map(student=>({...student,attendance:records.get(student.id)?.status??null,revision:records.get(student.id)?.updated_at??null,notes:records.get(student.id)?.notes??null}))};
    snapshots.add(snapshot);return snapshot;
  }
  return {
    classes:()=>run(classes), roster:(classId:string)=>run(()=>roster(classId)),
    attendance:(classId:string,date:string)=>run(async()=>{const value=await attendance(classId,date);review=false;return value;}),
    messages:()=>run(async()=>{const rows=await io.messages(session);guard();const ids=new Set<string>();for(const row of rows){if(!row.communicationId||ids.has(row.communicationId))throw new TeacherCommandError('invalid_response');ids.add(row.communicationId);}return rows;}),
    saveAttendance:(snapshot:Awaited<ReturnType<typeof attendance>>,marks:Record<string,string>)=>run(async()=>{
      if(review)throw new TeacherCommandError('review_required');
      if(!snapshots.has(snapshot)||!snapshot.students.length||Object.keys(marks).some(id=>!snapshot.students.some(s=>s.id===id))||snapshot.students.some(s=>!['present','absent','justified'].includes(marks[s.id])))throw new TeacherCommandError('invalid_selection');
      const current=await roster(snapshot.schoolClass.id,snapshot.date);
      if(current.schoolClass.schoolId!==snapshot.schoolClass.schoolId||current.students.length!==snapshot.students.length||current.students.some(s=>!snapshot.students.some(old=>old.id===s.id)))throw new TeacherCommandError('review_required');
      guard();review=true;
      try {
        await io.rpc(session,'teacher_set_attendance_records',{p_class_id:snapshot.schoolClass.id,p_attendance_date:snapshot.date,p_records:snapshot.students.map(s=>({student_id:s.id,status:marks[s.id],notes:s.notes,expected_updated_at:s.revision}))});guard();
        const observed=await attendance(snapshot.schoolClass.id,snapshot.date);
        if(observed.students.length!==snapshot.students.length||observed.students.some(s=>s.attendance!==marks[s.id]||s.notes!==snapshot.students.find(old=>old.id===s.id)?.notes))throw new TeacherCommandError('review_required');
        review=false;return observed;
      }catch(e){if(e instanceof Error&&/PT409|:409/.test(e.message))throw new TeacherCommandError('conflict');throw e instanceof TeacherCommandError?e:new TeacherCommandError('review_required');}
    }),
    publish:(draft:MessageDraft)=>run(async()=>{
      if(unresolved.has(userId))throw new TeacherCommandError('uncertain');
      if(!validTeacherDate(draft.date)||!draft.title.trim()||!draft.body.trim()||!['class','student'].includes(draft.audience))throw new TeacherCommandError('invalid_selection');
      const {schoolClass,students}=await roster(draft.classId);
      if(draft.audience==='student'?!draft.studentId||!students.some(s=>s.id===draft.studentId):draft.studentId!==null)throw new TeacherCommandError('invalid_selection');
      guard();unresolved.add(userId);
      try {
        const result=await io.rpc<{communication_id:string}>(session,'publish_communication',{p_school_id:schoolClass.schoolId,p_class_id:schoolClass.id,p_student_id:draft.studentId,p_audience_type:draft.audience,p_communication_type:'message',p_status:'published',p_communication_date:draft.date,p_expires_at:null,p_title:draft.title.trim(),p_body:draft.body.trim()});guard();
        if(!result?.communication_id)throw new TeacherCommandError('uncertain');
        const rows=await io.read<Array<Record<string,unknown>>>(session,`communications?select=id,school_id,class_id,student_id,author_profile_id,audience_type,title,body,communication_date,status&id=eq.${encodeURIComponent(result.communication_id)}`);guard();
        const r=rows[0];if(rows.length!==1||r.id!==result.communication_id||r.school_id!==schoolClass.schoolId||r.class_id!==draft.classId||r.student_id!==draft.studentId||r.author_profile_id!==userId||r.audience_type!==draft.audience||r.title!==draft.title.trim()||r.body!==draft.body.trim()||r.communication_date!==draft.date||r.status!=='published')throw new TeacherCommandError('uncertain');
        unresolved.delete(userId);return result.communication_id;
      }catch(e){if(e instanceof Error&&/rpc_failed:publish_communication:4\d\d:/.test(e.message)&&!/:408:/.test(e.message)){unresolved.delete(userId);throw e;}throw new TeacherCommandError('uncertain');}
    })
  };
}
