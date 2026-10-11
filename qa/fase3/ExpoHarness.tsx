// QA-only entrypoint. Production App.tsx and authentication are never replaced.
import React,{useEffect,useState} from 'react';
import {registerRootComponent} from 'expo';
import {ScrollView,Text,View} from 'react-native';
import {AssessmentJourney} from '../../mobile/src/screens/AssessmentJourney';
import {CommunicationJourney} from '../../mobile/src/screens/CommunicationJourney';
import {Action} from '../../mobile/src/components/JourneyKit';
import type {MobileSession} from '../../mobile/src/services/library';
function Harness(){
 const [data,setData]=useState<{session:MobileSession;actor:number;enabled:boolean}|null>(null),[mode,setMode]=useState('assessment');
 useEffect(()=>{fetch('/synthetic-session'+window.location.search).then(r=>r.json()).then(setData);},[]);
 const [gates,setGates]=useState({assessments:false,replies:false,editing:false});
 useEffect(()=>{if(data)setGates({assessments:data.enabled,replies:data.enabled,editing:data.enabled});},[data]);
 if(!data)return <Text>Loading synthetic session</Text>;
 return <ScrollView><View style={{padding:16,maxWidth:720,width:'100%',alignSelf:'center'}}><Text>SYNTHETIC EXPO TEST · Actor {data.actor}</Text><Action title="Avaliações" onPress={()=>setMode('assessment')}/><Action title="Recados" onPress={()=>setMode('communication')}/>{mode==='assessment'?<AssessmentJourney session={data.session} teacher={data.actor===1} gates={gates}/>:<CommunicationJourney session={data.session} teacher={data.actor===1} gates={gates}/>}</View></ScrollView>;
}
registerRootComponent(Harness);
