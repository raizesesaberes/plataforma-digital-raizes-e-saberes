import { READ_BETA } from './services/readBetaPolicy';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppShell } from './AppShell';
import { HostedSplash } from './components/HostedSplash';
import { HostedLoginScreen } from './screens/HostedLoginScreen';
import { AppIcon } from './components/AppIcon';
import { appProfiles, type AppProfile, type ModuleKey } from './data/fixtures';
import { InstitutionalWorkspace } from './screens/InstitutionalWorkspace';
import { HostedTeacherDiary } from './screens/HostedTeacherDiary';
import { HostedEditionLibrary } from './screens/HostedEditionLibrary';
import { cancelPlatformLogin, cancelPlatformVerification, enablePlatformSession, loadPlatformSession, signOutPlatformSession, subscribePlatformSession, type PlatformSessionState } from './services/webSession';

export function HostedApplication() {
 const [opening,setOpening]=useState(true);
 const finishOpening=React.useCallback(()=>setOpening(false),[]);
 const [state,setState]=useState<PlatformSessionState>({status:'locked',reason:'verifying'});
 const [ready,setReady]=useState<Extract<PlatformSessionState,{status:'ready'}>|null>(null);
 const [fatal,setFatal]=useState(false), [pending,setPending]=useState(false);
 const [logoutWarning,setLogoutWarning]=useState<'remote'|'storage'|null>(null);
 const leaveGuard=useRef<(()=>boolean)|null>(null);
 const epoch=useRef(0), lastIdentity=useRef('');
 useEffect(()=>{
  let unsubscribe=()=>{};
  try {
   enablePlatformSession();
   unsubscribe=subscribePlatformSession(next=>{
    if(next.status==='ready'){
     setLogoutWarning(null);
     const identity=`${next.session.userId}:${next.role}:${next.session.accessToken}`;
     if(identity!==lastIdentity.current){epoch.current++;lastIdentity.current=identity;leaveGuard.current=null;}
     setReady(next);
    }else if(next.reason!=='verifying'){
     epoch.current++;lastIdentity.current='';leaveGuard.current=null;setReady(null);
    }
    setState(next);
   });
   void loadPlatformSession().catch(()=>{});
  } catch { setFatal(true); }
  return ()=>{unsubscribe();cancelPlatformVerification();cancelPlatformLogin();};
 },[]);
 const canLeave=()=>leaveGuard.current?.()??true;
 const leave=()=>{if(canLeave()){cancelPlatformLogin();cancelPlatformVerification();window.location.assign(ready?ready.role==='professor'?'/professor':ready.role==='crescer'?'/educacao-infantil':'/aluno':'/');}};
 const logout=async()=>{if(pending||!canLeave())return;setPending(true);try{const result=await signOutPlatformSession();setLogoutWarning(!result.cleared?'storage':!result.revoked?'remote':null);}catch{setLogoutWarning('storage');}finally{setPending(false);}};
 const retry=async()=>{if(pending)return;setPending(true);try{await loadPlatformSession();}catch{}finally{setPending(false);}};
 const checking=!fatal&&state.status==='locked'&&['verifying','session_unverified'].includes(state.reason);
 if(opening)return <SafeAreaProvider><HostedSplash onComplete={finishOpening}/></SafeAreaProvider>;
 let profile:AppProfile|null=null;
 if(ready)profile={...appProfiles[ready.role],userName:'',school:'',className:'',homeTitle:'Seu espaço de aprendizagem',homeIntro:'Conteúdos vinculados à sua conta.'};
 return <SafeAreaProvider><View style={s.root}><View style={s.top}><View style={s.brand}><AppIcon name="smartphone" size={18} color="#1c513e"/><Text style={s.title}>App Raízes</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Voltar à plataforma" onPress={leave} style={s.back}><AppIcon name="arrow-left" size={16} color="#1c513e"/><Text style={s.backText}>Plataforma</Text></Pressable></View>
 {READ_BETA&&<View style={{padding:12,backgroundColor:'#fff0c2'}}><Text accessibilityRole="header" style={{fontWeight:'800'}}>Beta real · somente leitura</Text><Text>Teste limitado. Sem salvar atividades, progresso ou alterações. A versão completa ainda não está homologada.</Text></View>}
 {profile&&ready?<View style={{flex:1}}><View style={{flex:1}}><AppShell key={epoch.current} profile={profile} session={ready.session} preview={false} hosted onLogout={()=>void logout()} canLeave={canLeave} registerHostedLeaveGuard={guard=>{leaveGuard.current=guard;}} renderLibrary={()=><HostedEditionLibrary session={ready.session} platformLibraryHref={ready.role==='professor'?'/professor.html?view=biblioteca':ready.role==='crescer'?'/biblioteca.html':'/biblioteca.html?from=aluno'}/>} renderDiary={()=><HostedTeacherDiary session={ready.session} registerLeaveGuard={guard=>{leaveGuard.current=guard;}}/>} renderInstitutional={(key:ModuleKey)=><InstitutionalWorkspace key={`${ready.role}:${key}`} profile={profile!} session={ready.session} moduleKey={key} registerLeaveGuard={guard=>{leaveGuard.current=guard;}}/>}/></View>{checking&&<View pointerEvents="none" style={s.verifyBadge} accessibilityLiveRegion="polite"><Text style={s.verifyText}>Conferindo acesso…</Text></View>}</View>:checking?<View style={s.empty}><ActivityIndicator color="#1c513e"/><Text accessibilityRole="header" style={s.heading}>Conferindo seu acesso…</Text><Text style={s.copy}>Estamos confirmando sua conta e seu vínculo com a escola.</Text><Pressable accessibilityRole="button" onPress={cancelPlatformVerification} style={s.back}><Text style={s.backText}>Cancelar conferência</Text></Pressable></View>:fatal?<View style={s.empty}><Text accessibilityRole="header" style={s.heading}>Não foi possível abrir o acesso.</Text><Text style={s.copy}>Abra o App Raízes pelo endereço seguro da plataforma.</Text></View>:<HostedLoginScreen reason={state.status==='locked'?state.reason:''} logoutWarning={logoutWarning} onRetry={()=>void retry()}/>}

 </View></SafeAreaProvider>;
}
const s=StyleSheet.create({verifyBadge:{position:'absolute',top:0,right:8,padding:6,borderRadius:8,backgroundColor:'#eef1e3',zIndex:10},verifyText:{fontSize:10,color:'#527048'},root:{flex:1,backgroundColor:'#faf7ee'},top:{paddingHorizontal:16,paddingTop:6,paddingBottom:6,backgroundColor:'#eef1e3',borderBottomWidth:1,borderBottomColor:'#dce3d1',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},brand:{flexDirection:'row',alignItems:'center',gap:7},title:{fontSize:14,fontWeight:'800',color:'#1c513e'},back:{minHeight:44,paddingHorizontal:8,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},backText:{fontSize:12,fontWeight:'700',color:'#1c513e'},empty:{flex:1,alignItems:'center',justifyContent:'center',padding:28,gap:20},heading:{fontSize:27,fontWeight:'800',color:'#1c513e',textAlign:'center'},copy:{fontSize:15,lineHeight:24,color:'#65765f',maxWidth:420,textAlign:'center'},primary:{backgroundColor:'#1c513e',minHeight:50,borderRadius:14,paddingHorizontal:25,alignItems:'center',justifyContent:'center'},primaryText:{color:'#fff',fontWeight:'700'},notice:{color:'#71806c',fontSize:12,lineHeight:18,textAlign:'center',maxWidth:320}});
