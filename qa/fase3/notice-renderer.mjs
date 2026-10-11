import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync('app-pages.js','utf8');
const escape=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function segment(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a);return source.slice(a,b);}
export async function inspectNoticeRender(client,teacherClient,row){
 const flags={RAIZES_NOTICE_EDITING_ENABLED:true};
 const {map,label,count}=new Function('communicationAudienceLabel','communicationDisplayDate',`${segment('const communicationDeliveryStateLabel =','const resolveCommunicationDeepLink =')};return {map:mapCommunicationInboxItem,label:communicationDeliveryStateLabel,count:communicationUnreadCount};`)(x=>x,x=>x);
 const enrich=new Function('globalThis',`${segment('const enrichCommunicationVersions =','const callCommunicationInbox =')};return enrichCommunicationVersions;`)(flags);
 const mapped=(await enrich(client,[row])).map(x=>map(x));
 const renderStudent=new Function('globalThis','premiumIcon','printableEscape','getActiveStudentProfile','communicationDeliveryStateLabel','resolveCommunicationDeepLink',`${segment('const renderStudentInboxCard =','const renderStudentInboxList =')};return renderStudentInboxCard;`)(flags,()=>'',escape,()=>({className:'Synthetic'}),label,x=>x);
 const summaries=new Function('globalThis',`${segment('const communicationDeliverySummariesById =','const secretariaStudentDocumentTypes =')};return communicationDeliverySummariesById;`)(flags);
 const teacherMap=new Function('getTeacherInstitutionalClasses','teacherInstitutionalState','formatTeacherClassMessageDate',`${segment('const mapTeacherClassMessage =','const ensureTeacherClassMessages =')};return mapTeacherClassMessage;`)(()=>[],{},x=>x);
 const teacher=teacherMap({id:row.communication_id,title:row.title,body:row.body,status:'published'},(await summaries(teacherClient)).get(row.communication_id));
 const renderTeacher=new Function('communicationStatusLabel','printableEscape',`${segment('const renderTeacherClassMessageCard =','const renderTeacherClassMessagesPanel =')};return renderTeacherClassMessageCard;`)(x=>x,escape);
 return {studentHtml:renderStudent(mapped[0]),unread:count(mapped),teacherHtml:renderTeacher(teacher),teacher};
}
