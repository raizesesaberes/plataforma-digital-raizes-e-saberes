// Uses the runtime's existing React instance. No audio, network service or student data collection.
import {r as requireReact} from '../studio/assets/react-Db-_YT-E.js';
import {verifyGameContent,gameCopyState} from './resolve.mjs';
const React=requireReact(),h=React.createElement;
export function GameGuidance({session}){
 const content=session.content,[match,setMatch]=React.useState(null);
 React.useEffect(()=>{let active=true;setMatch(null);verifyGameContent(content).then(example=>{if(active)setMatch({content,example});});return()=>{active=false;};},[content]);
 const state=gameCopyState(session,match?.content===content?match.example:null);
 if(!state?.example)return null;
 const line=(clip,kind)=>clip?h('p',{'data-carla-clip':clip.id,'data-copy-kind':kind},clip.text):null;
 return h('section',{className:'approved-guidance','aria-label':'Roteiro de apoio','data-carla-guidance':'v1','data-copy-bound':state.example?'true':'false'},
  session.complete?line(state.motor.finish,'finish'):null,
  h('details',{key:content.id+'-'+session.questionIndex},
   h('summary',null,session.complete?'Retomar a descoberta':'Ajuda e descobertas'),
   !session.complete?line(state.motor.entry,'entry'):null,
   !session.complete?line(state.motor.help,'motor-help'):null,
   state.before?h('div',{className:'approved-example'},h('h3',null,'Uma proposta desta atividade'),line(state.before,'before'),line(state.help,'example-help')):null,
   state.after?h('div',{className:'approved-example'},h('h3',null,'Descoberta já explorada'),line(state.after,'after')):null,
   h('p',{className:'approved-voice-status'},'Roteiro preparado para Carla. Áudio em preparação.')
  )
 );
}
