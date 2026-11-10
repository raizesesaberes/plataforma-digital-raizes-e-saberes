import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppIcon} from '../components/AppIcon';
import {platformLoginUrl, signInPlatformSession} from '../services/webSession';

function loginMessage(error: unknown) {
 const code = error instanceof Error ? error.message : '';
 if (code === 'password_change_required') return 'Sua conta precisa atualizar a senha. Continue na plataforma para concluir essa etapa e depois volte ao App.';
 if (code === 'login_cancelled') return 'Entrada cancelada. Nenhum novo acesso foi aberto.';
 if (code === 'login_timeout' || code === 'login_unavailable') return 'A conexão demorou mais que o esperado. Tente novamente quando estiver conectado.';
 if (code === 'login_rate_limited') return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.';
 if (code === 'session_changed') return 'O acesso mudou em outra aba. Confira a sessão novamente antes de continuar.';
 if (code === 'storage_unavailable') return 'Não foi possível guardar a sessão neste navegador. Verifique as permissões de armazenamento e tente novamente.';
 if (['invalid_credentials', 'invalid_login_input'].includes(code)) return 'Confira seu login ou e-mail e a senha fornecidos pela escola. A senha diferencia maiúsculas e minúsculas.';
 return 'Não foi possível confirmar seu acesso e vínculo com a escola. Confira os dados ou peça ajuda à sua escola.';
}
export function HostedLoginScreen({reason, logoutWarning, onRetry}: {reason: string; logoutWarning: 'remote'|'storage'|null; onRetry: () => void}) {
 const [identifier,setIdentifier]=useState(''), [password,setPassword]=useState('');
 const [visible,setVisible]=useState(false), [pending,setPending]=useState(false), [error,setError]=useState(''), [help,setHelp]=useState(false);
 const controller=useRef<AbortController|null>(null), mounted=useRef(true);
 const identifierRef=useRef<TextInput>(null), passwordRef=useRef<TextInput>(null);
 const {width}=useWindowDimensions(), insets=useSafeAreaInsets(), wide=width>=960;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;controller.current?.abort();};},[]);
 async function submit() {
  if(controller.current)return;
  if(!identifier.trim()||!password){setError('Preencha seu login ou e-mail e sua senha para entrar.');(!identifier.trim()?identifierRef:passwordRef).current?.focus();return;}
  const attempt=new AbortController();controller.current=attempt;setPending(true);setError('');setHelp(false);
  try {await signInPlatformSession(identifier,password,attempt.signal);}
  catch(error){if(mounted.current)setError(loginMessage(error));}
  finally {if(controller.current===attempt)controller.current=null;if(mounted.current){setPending(false);setPassword('');setVisible(false);}}
 }
 const notice=logoutWarning==='storage'?'O App bloqueou este acesso, mas não conseguiu apagar a sessão do navegador. Antes de recarregar ou voltar à plataforma, limpe os dados deste site nas configurações do navegador.':logoutWarning==='remote'?'O acesso foi encerrado neste navegador, mas o servidor não confirmou a saída. Entre novamente para continuar.':reason==='password_change_required'?'Sua conta precisa atualizar a senha. Use a ajuda abaixo para continuar na plataforma.':reason==='session_expired'?'Sua sessão expirou. Entre novamente para continuar com segurança.':reason==='verification_timeout'?'A conferência de acesso demorou demais. Você pode tentar novamente.':reason==='session_changed'?'Seu acesso mudou. Entre novamente ou confira a sessão atual.':'';
 return <KeyboardAvoidingView style={s.root} behavior={Platform.OS==='ios'?'padding':undefined}>
  <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.scroll,{paddingTop:Math.max(24,insets.top+12),paddingBottom:insets.bottom+30}]}>
   <View style={[s.layout,wide&&s.wide]}>
    <View style={[s.story,wide&&s.storyWide]}>
     <Image source={require('../../assets/experience/logo.png')} resizeMode="contain" style={[s.logo,!wide&&{width:170,height:78,marginBottom:16}]} accessibilityLabel="Raízes e Saberes, ecossistema educacional"/>
     {wide&&<Text style={s.kicker}>GRANDES FUTUROS COMEÇAM AQUI</Text>}
     <Text accessibilityRole="header" style={[s.headline,!wide&&s.headlineSmall]}>Um mundo de{'\n'}<Text style={s.accent}>descobertas.</Text></Text>
     {wide&&<><Text style={s.storyText}>Aprender, criar e crescer. Seu vínculo com a escola, sempre por perto.</Text><View style={s.illustration}><View style={s.orbit}/><View style={s.artCircle}/><Image source={require('../../assets/crescer-home/icon_biblioteca.png')} resizeMode="contain" style={s.bookArt} accessible={false}/><View style={s.leafTag}><AppIcon name="sun" size={20} color="#765719"/><Text style={s.leafTagText}>A curiosidade nos leva longe</Text></View></View><Text style={s.footer}>RAÍZES FORTES. POSSIBILIDADES INFINITAS.</Text></>}
    </View>
    <View style={[s.form,wide&&s.formWide]} testID="app-own-login">
     <View style={s.badge}><AppIcon name="smartphone" size={16} color="#486b54"/><Text style={s.badgeText}>SEU ESPAÇO NO APP RAÍZES</Text></View>
     <Text accessibilityRole="header" style={s.formTitle}>Que bom ter você aqui.</Text>
     <Text style={s.formText}>O mesmo acesso da plataforma, em um espaço feito para acompanhar você.</Text>
     {!!notice&&<Text accessibilityRole="alert" style={s.notice}>{notice}</Text>}
     <View style={s.fields}>
      <Text nativeID="login-identifier-label" style={s.label}>Login / E-mail</Text>
      <View style={s.inputFrame}><AppIcon name="user" size={19} color="#6c7d6d"/><TextInput ref={identifierRef} accessibilityLabel="Login ou e-mail" aria-labelledby="login-identifier-label" value={identifier} onChangeText={setIdentifier} placeholder="Seu login escolar ou e-mail" placeholderTextColor="#788578" style={s.input} autoComplete="username" autoCapitalize="none" autoCorrect={false} editable={!pending} returnKeyType="next" onSubmitEditing={()=>passwordRef.current?.focus()}/></View>
      <Text style={s.inputHint}>Alunos: login do comprovante escolar. Professoras: e-mail cadastrado.</Text>
      <Text nativeID="login-password-label" style={s.label}>Senha</Text>
      <View style={s.inputFrame}><AppIcon name="lock" size={19} color="#6c7d6d"/><TextInput ref={passwordRef} accessibilityLabel="Senha" aria-labelledby="login-password-label" value={password} onChangeText={setPassword} placeholder="Sua senha" placeholderTextColor="#788578" style={s.input} secureTextEntry={!visible} autoComplete="current-password" autoCapitalize="none" autoCorrect={false} editable={!pending} returnKeyType="go" onSubmitEditing={()=>void submit()}/><Pressable accessibilityRole="button" accessibilityLabel={visible?'Ocultar senha':'Mostrar senha'} accessibilityState={{expanded:visible}} onPress={()=>setVisible(!visible)} style={s.eye}><AppIcon name={visible?'eye-off':'eye'} size={19} color="#456351"/></Pressable></View>
     </View>
     <Pressable accessibilityRole="button" accessibilityState={{expanded:help}} onPress={()=>setHelp(!help)} style={s.help}><Text style={s.helpText}>{help?'Fechar ajuda':'Preciso de ajuda para entrar'}</Text></Pressable>
     {help&&<View style={s.helpPanel}><Text style={s.inputHint}>Use o acesso que sua escola já entregou. Para recuperar ou atualizar a senha, continue na plataforma. Alunos da Educação Infantil podem pedir ajuda a um responsável.</Text><Pressable accessibilityRole="link" onPress={()=>{controller.current?.abort();window.location.assign(platformLoginUrl());}} style={s.link}><Text style={s.helpText}>Continuar na plataforma</Text><AppIcon name="arrow-right" size={16} color="#326f51"/></Pressable></View>}
     {!!error&&<Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={s.error}>{error}</Text>}
     <Pressable accessibilityRole="button" accessibilityLabel="Entrar no meu espaço" accessibilityState={{disabled:pending,busy:pending}} disabled={pending} onPress={()=>void submit()} style={({pressed})=>[s.submit,pressed&&{backgroundColor:'#235e49'},pending&&{opacity:0.7}]}>{pending?<><ActivityIndicator color="#fff"/><Text accessibilityLiveRegion="polite" style={s.submitText}>Confirmando seu acesso…</Text></>:<><Text style={s.submitText}>Entrar no meu espaço</Text><AppIcon name="arrow-right" size={20} color="#fff"/></>}</Pressable>
     {pending?<Pressable accessibilityRole="button" onPress={()=>controller.current?.abort()} style={s.secondary}><Text style={s.helpText}>Cancelar entrada</Text></Pressable>:!logoutWarning&&!['session_missing_or_invalid','signed_out'].includes(reason)&&<Pressable accessibilityRole="button" onPress={onRetry} style={s.secondary}><Text style={s.helpText}>Conferir sessão existente</Text></Pressable>}
     <View style={s.privacy}><AppIcon name="heart" size={17} color="#607456"/><Text style={s.privacyText}>Um só acesso. O perfil e os conteúdos são confirmados pela sua escola.</Text></View>
    </View>
   </View>
  </ScrollView>
 </KeyboardAvoidingView>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#faf7ee'},scroll:{flexGrow:1,paddingHorizontal:20,justifyContent:'center'},layout:{width:'100%',maxWidth:1140,alignSelf:'center',gap:24},wide:{flexDirection:'row',alignItems:'center',gap:70},story:{flexShrink:1},storyWide:{flex:1,paddingVertical:28},logo:{width:215,height:98,marginBottom:34},kicker:{fontSize:10,fontWeight:'700',letterSpacing:1.7,color:'#657348',marginBottom:17},headline:{fontSize:55,fontWeight:'800',lineHeight:62,letterSpacing:-2.2,color:'#174e3e'},headlineSmall:{fontSize:32,lineHeight:37,letterSpacing:-1.2},accent:{color:'#6b8753'},storyText:{fontSize:17,lineHeight:27,color:'#647763',maxWidth:390,marginTop:18},illustration:{height:250,marginTop:18,justifyContent:'center',alignItems:'center',overflow:'hidden'},orbit:{position:'absolute',width:244,height:244,borderRadius:122,borderColor:'#d4dec0',borderWidth:1,borderStyle:'dashed'},artCircle:{position:'absolute',width:200,height:200,borderRadius:100,backgroundColor:'#e6ebd3'},bookArt:{height:207,width:207},leafTag:{position:'absolute',bottom:23,right:5,flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#f6dfa3',padding:13,borderRadius:12,transform:[{rotate:'-5deg'}]},leafTagText:{fontSize:11,fontWeight:'600',color:'#6b562a'},footer:{color:'#61734f',fontSize:9,letterSpacing:2,marginTop:20},form:{backgroundColor:'#fffdf8',borderRadius:26,padding:22,borderWidth:1,borderColor:'#e4e2d4',shadowColor:'#345540',shadowOffset:{width:0,height:12},shadowOpacity:.06,shadowRadius:25},formWide:{width:450,padding:32},badge:{flexDirection:'row',alignItems:'center',gap:7,marginBottom:20},badgeText:{fontSize:9,letterSpacing:1.3,fontWeight:'700',color:'#58725b'},formTitle:{color:'#194e3d',fontWeight:'800',fontSize:27,letterSpacing:-.8,lineHeight:33},formText:{fontSize:14,lineHeight:22,color:'#65735f',marginTop:10,marginBottom:22},fields:{gap:9},label:{fontSize:12,fontWeight:'700',color:'#3a5c48',marginTop:4},inputFrame:{flexDirection:'row',alignItems:'center',gap:9,minHeight:54,paddingHorizontal:12,borderRadius:13,borderWidth:1,borderColor:'#cdd8c5',backgroundColor:'#fffefc'},input:{flex:1,minWidth:0,fontSize:16,color:'#234d3a',paddingVertical:16},inputHint:{fontSize:12,lineHeight:18,color:'#60705d'},eye:{width:44,height:48,alignItems:'center',justifyContent:'center'},help:{minHeight:44,alignSelf:'flex-end',justifyContent:'center',marginVertical:4},helpText:{fontSize:12,color:'#326f51',fontWeight:'700'},helpPanel:{backgroundColor:'#eef3e7',padding:14,borderRadius:12,marginBottom:14},link:{minHeight:44,flexDirection:'row',alignItems:'center',gap:8},error:{color:'#833622',backgroundColor:'#fff0e7',padding:12,borderRadius:10,fontSize:13,lineHeight:19,marginBottom:14},notice:{backgroundColor:'#f5efd7',color:'#635627',padding:12,borderRadius:10,fontSize:13,lineHeight:19,marginBottom:14},submit:{minHeight:56,borderRadius:14,backgroundColor:'#164f3d',flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,paddingHorizontal:18},submitText:{fontSize:14,fontWeight:'700',color:'#fff',flexShrink:1},secondary:{minHeight:44,alignItems:'center',justifyContent:'center',marginTop:5},privacy:{flexDirection:'row',gap:9,alignItems:'center',marginTop:20},privacyText:{fontSize:11,lineHeight:17,color:'#607456',flex:1}});
