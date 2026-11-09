import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppShell } from './AppShell';
import { AppIcon } from './components/AppIcon';
import { appProfiles, type AppProfile, type ModuleKey } from './data/fixtures';
import { InstitutionalWorkspace } from './screens/InstitutionalWorkspace';
import { enablePlatformSession, loadPlatformSession, platformLoginUrl, signOutPlatformSession, subscribePlatformSession, type PlatformSessionState } from './services/webSession';

export function HostedApplication() {
 const [state,setState]=useState<PlatformSessionState>({status:'locked',reason:'verifying'});
 const [ready,setReady]=useState<Extract<PlatformSessionState,{status:'ready'}>|null>(null);
 const [fatal,setFatal]=useState(false), [pending,setPending]=useState(false);
 const [logoutWarning,setLogoutWarning]=useState(false);
 const leaveGuard=useRef<(()=>boolean)|null>(null);
 const epoch=useRef(0), lastIdentity=useRef('');
 useEffect(()=>{
  let unsubscribe=()=>{};
  try {
   enablePlatformSession();
   unsubscribe=subscribePlatformSession(next=>{
    if(next.status==='ready'){
     setLogoutWarning(false);
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
  return unsubscribe;
 },[]);
 const canLeave=()=>leaveGuard.current?.()??true;
 const leave=()=>{if(canLeave())window.location.assign(ready?ready.role==='professor'?'/professor':ready.role==='crescer'?'/educacao-infantil':'/aluno':'/');};
 const logout=async()=>{if(pending||!canLeave())return;setPending(true);try{const result=await signOutPlatformSession();setLogoutWarning(!result.revoked);}catch{setLogoutWarning(true);}finally{setPending(false);}};
 const retry=async()=>{if(pending)return;setPending(true);try{await loadPlatformSession();}catch{}finally{setPending(false);}};
 const checking=!fatal&&state.status==='locked'&&['verifying','session_unverified'].includes(state.reason);
 let profile:AppProfile|null=null;
 if(ready)profile={...appProfiles[ready.role],userName:'',school:'',className:'',homeTitle:'Seu espaço de aprendizagem',homeIntro:'Conteúdos vinculados à sua conta.'};
 return <SafeAreaProvider><View style={s.root}><View style={s.top}><View style={s.brand}><AppIcon name="smartphone" size={18} color="#1c513e"/><Text style={s.title}>App Raízes</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Voltar à plataforma" onPress={leave} style={s.back}><AppIcon name="arrow-left" size={16} color="#1c513e"/><Text style={s.backText}>Plataforma</Text></Pressable></View>
 {profile&&ready?<View style={{flex:1}}><View style={{flex:1}}><AppShell key={epoch.current} profile={profile} session={ready.session} preview={false} hosted onLogout={()=>void logout()} canLeave={canLeave} renderInstitutional={(key:ModuleKey)=><InstitutionalWorkspace key={`${ready.role}:${key}`} profile={profile!} session={ready.session} moduleKey={key} registerLeaveGuard={guard=>{leaveGuard.current=guard;}}/>}/></View>{checking&&<View pointerEvents="none" style={s.verifyBadge} accessibilityLiveRegion="polite"><Text style={s.verifyText}>Conferindo acesso…</Text></View>}</View>:<View style={s.empty}><AppIcon name={checking?'sun':'shield'} size={34} color="#527048"/><Text style={s.heading}>{checking?'Conferindo seu acesso…':'Seu acesso, com segurança.'}</Text><Text style={s.copy}>{checking?'Aguarde enquanto confirmamos sua conta e seu vínculo com a escola.':fatal?'Abra o App Raízes pelo endereço seguro da plataforma.':logoutWarning?'O acesso foi encerrado neste navegador, mas não foi possível confirmar o encerramento no servidor. Entre novamente para continuar.':'Entre com seu acesso escolar. O app usa a mesma conta e confirma o perfil autorizado, sem escolher outro usuário.'}</Text>{checking?<ActivityIndicator color="#1c513e"/>:<><Pressable accessibilityRole="button" onPress={()=>window.location.assign(platformLoginUrl())} style={s.primary}><Text style={s.primaryText}>Entrar na plataforma</Text></Pressable>{!fatal&&<Pressable accessibilityRole="button" onPress={()=>void retry()} disabled={pending} style={s.back}><Text style={s.backText}>{pending?'Conferindo…':'Tentar novamente'}</Text></Pressable>}<Text style={s.notice}>Sem sessão válida, nenhum conteúdo da conta é exibido.</Text></>}</View>}
 </View></SafeAreaProvider>;
}
const s=StyleSheet.create({verifyBadge:{position:'absolute',top:0,right:8,padding:6,borderRadius:8,backgroundColor:'#eef1e3',zIndex:10},verifyText:{fontSize:10,color:'#527048'},root:{flex:1,backgroundColor:'#faf7ee'},top:{paddingHorizontal:16,paddingTop:6,paddingBottom:6,backgroundColor:'#eef1e3',borderBottomWidth:1,borderBottomColor:'#dce3d1',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},brand:{flexDirection:'row',alignItems:'center',gap:7},title:{fontSize:14,fontWeight:'800',color:'#1c513e'},back:{minHeight:44,paddingHorizontal:8,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},backText:{fontSize:12,fontWeight:'700',color:'#1c513e'},empty:{flex:1,alignItems:'center',justifyContent:'center',padding:28,gap:20},heading:{fontSize:27,fontWeight:'800',color:'#1c513e',textAlign:'center'},copy:{fontSize:15,lineHeight:24,color:'#65765f',maxWidth:420,textAlign:'center'},primary:{backgroundColor:'#1c513e',minHeight:50,borderRadius:14,paddingHorizontal:25,alignItems:'center',justifyContent:'center'},primaryText:{color:'#fff',fontWeight:'700'},notice:{color:'#71806c',fontSize:12,lineHeight:18,textAlign:'center',maxWidth:320}});
