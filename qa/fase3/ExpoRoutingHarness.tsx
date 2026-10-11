// QA entry only. Real App login and real AppShell; no production auth replacement.
import React,{useEffect,useState} from 'react';
import {registerRootComponent} from 'expo';
import {Text} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import App from '../../mobile/App';
import {AppShell} from '../../mobile/src/AppShell';
import {appProfiles} from '../../mobile/src/data/fixtures';
function Routing(){
 const [data,setData]=useState<any>(null),[loggedOut,setLoggedOut]=useState(false);
 const shell=new URLSearchParams(window.location.search).get('mode')==='shell';
 useEffect(()=>{if(shell)fetch('/synthetic-session'+window.location.search).then(r=>r.json()).then(setData);},[]);
 if(!shell||loggedOut)return <App/>;
 if(!data)return <Text>Loading synthetic session</Text>;
 return <SafeAreaProvider><AppShell profile={appProfiles[data.actor===1?'professor':'fundamental']} session={data.session} onLogout={()=>setLoggedOut(true)}/></SafeAreaProvider>;
}
registerRootComponent(Routing);
