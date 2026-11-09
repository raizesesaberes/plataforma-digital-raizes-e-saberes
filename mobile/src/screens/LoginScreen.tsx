import React, { useRef, useState } from "react";
import { AppIcon as Feather } from "../components/AppIcon";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAppRoleForSession, signInWithPassword, type MobileSession } from "../services/library";
import type { AppRole } from "../data/fixtures";

const roles: { role: AppRole; title: string; detail: string; icon: "sun" | "book-open" | "feather"; color: string }[] = [
  { role: "crescer", title: "Infantil", detail: "Brincar e descobrir", icon: "sun", color: "#f9e7b3" },
  { role: "fundamental", title: "Fundamental e Médio", detail: "Explorar e aprender", icon: "book-open", color: "#dbeaf2" },
  { role: "professor", title: "Professora", detail: "Inspirar e acompanhar", icon: "feather", color: "#e6e3f2" }
];
export function LoginScreen({ onSelectRole, preview = false, initialSection = "login" }: { onSelectRole: (role: AppRole, session?: MobileSession) => void; preview?: boolean; initialSection?: "login" | "profiles" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [schoolLayout, setSchoolLayout] = useState(initialSection === "login");
  const [selected, setSelected] = useState<AppRole>("crescer");
  const [focused, setFocused] = useState("");
  const pendingRef = useRef(false);
  const passwordRef = useRef<TextInput>(null);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 960;
  async function submit() {
    if (pendingRef.current) return;
    if (preview) { onSelectRole(selected); return; }
    if (!email.trim() || !password) { setError("Preencha seu e-mail e sua senha para entrar."); return; }
    pendingRef.current = true; setPending(true); setError("");
    try { const session = await signInWithPassword(email, password); const role = await getAppRoleForSession(session); onSelectRole(role, session); }
    catch { setError("Não foi possível entrar. Confira seus dados e tente novamente."); }
    finally { pendingRef.current = false; setPending(false); }
  }
  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.scroll, { paddingTop: Math.max(24, insets.top + 18), paddingBottom: insets.bottom + 30 }]}>
        <View style={[s.layout, wide && s.wide]}>
          <View style={[s.story, wide && s.storyWide]}>
            <Image source={require("../../assets/experience/logo.png")} style={[s.logo, !wide && {width:170,height:78,marginBottom:20}]} resizeMode="contain" accessibilityLabel="Raízes e Saberes, ecossistema educacional" />
            {wide && <View style={s.kicker}><View style={s.kickerDot}/><Text style={s.kickerText}>GRANDES FUTUROS COMEÇAM AQUI</Text></View>}
            <Text style={[s.headline, !wide && s.headlineSmall]}>Um mundo de{"\n"}<Text style={s.headlineAccent}>descobertas.</Text></Text>
            {wide && <Text style={s.storyText}>Aprender, criar e crescer. Cada dia, uma nova oportunidade de florescer.</Text>}
            <View style={[s.illustration, !wide && s.illustrationSmall]}>
              <View style={s.orbit}/><View style={s.artCircle}/>
              <Image source={require("../../assets/crescer-home/icon_biblioteca.png")} style={s.bookArt} resizeMode="contain"/>
              <View style={s.leafTag}><Feather name="sun" size={20} color="#765719"/><Text style={s.leafTagText}>A curiosidade nos leva longe</Text></View>
              <View style={s.smallTag}><Feather name="feather" size={22} color="#345844"/></View>
            </View>
            {wide && <Text style={s.footer}>RAÍZES FORTES. POSSIBILIDADES INFINITAS.</Text>}
          </View>
          <View style={[s.form, wide && s.formWide]}>
            <View style={s.formBadge}><Feather name={preview ? "eye" : "lock"} size={14} color="#486b54"/><Text style={s.formBadgeText}>{preview ? "MODO DE AVALIAÇÃO" : "SEU ESPAÇO DE APRENDIZAGEM"}</Text></View>
            <Text style={s.formTitle}>{preview && !schoolLayout ? "Escolha sua experiência." : "Que bom ter você aqui."}</Text>
            <Text style={s.formText}>{preview ? schoolLayout ? "Veja o login escolar e entre na demonstração sem preencher dados reais." : "São três perfis para conhecer cada espaço do app." : "Entre com o acesso fornecido pela sua escola."}</Text>
            {preview && !schoolLayout ? <View style={s.roles} accessibilityRole="radiogroup" accessibilityLabel="Escolha uma experiência">{roles.map(r => <Pressable key={r.role} accessibilityRole="radio" aria-checked={selected === r.role} accessibilityState={{ checked: selected === r.role }} accessibilityLabel={`Perfil ${r.title}`} onPress={() => setSelected(r.role)} style={[s.role, selected === r.role && s.roleSelected]}><View style={[s.roleIcon, { backgroundColor: r.color }]}><Feather name={r.icon} size={23} color="#244c3e"/></View><View style={{flex:1}}><Text style={s.roleTitle}>{r.title}</Text><Text style={s.roleDetail}>{r.detail}</Text></View><View style={[s.radio, selected === r.role && s.radioSelected]}>{selected === r.role && <View style={s.radioDot}/>}</View></Pressable>)}</View> : <View style={s.fields}>
              {preview && <Text style={s.previewNote}>PERFIL DE TESTE: {roles.find(r => r.role === selected)?.title}</Text>}
              <Text style={s.label}>E-mail</Text>
              <View style={[s.inputFrame, focused === "email" && s.inputFocused]}><Feather name="mail" size={19} color="#6c7d6d"/><TextInput accessibilityLabel="E-mail" value={email} onChangeText={setEmail} onFocus={() => setFocused("email")} onBlur={() => setFocused("")} placeholder="Seu e-mail de acesso" placeholderTextColor="#829082" style={s.input} keyboardType="email-address" autoComplete="email" autoCapitalize="none" autoCorrect={false} editable={!pending} returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()}/></View>
              <Text style={s.label}>Senha</Text>
              <View style={[s.inputFrame, focused === "password" && s.inputFocused]}><Feather name="lock" size={19} color="#6c7d6d"/><TextInput ref={passwordRef} accessibilityLabel="Senha" value={password} onChangeText={setPassword} onFocus={() => setFocused("password")} onBlur={() => setFocused("")} placeholder="Sua senha" placeholderTextColor="#829082" style={s.input} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} editable={!pending} returnKeyType="done" onSubmitEditing={submit}/><Pressable accessibilityRole="button" accessibilityLabel={visible ? "Ocultar senha" : "Mostrar senha"} onPress={() => setVisible(!visible)} style={s.eye}><Feather name={visible ? "eye-off" : "eye"} size={19} color="#456351"/></Pressable></View>
              <Pressable accessibilityRole="button" onPress={() => setError("Peça ajuda à sua escola para recuperar o acesso.")} style={s.help}><Text style={s.helpText}>Esqueci minha senha</Text></Pressable>
            </View>}
            {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
            <Pressable accessibilityRole="button" accessibilityLabel={preview ? "Entrar na prévia" : "Entrar"} disabled={pending} onPress={submit} style={({pressed}) => [s.submit, pressed && {backgroundColor:"#235e49"}, pending && {opacity:0.6}]}>{pending ? <ActivityIndicator color="#fff"/> : <><Text style={s.submitText}>{preview ? schoolLayout ? "Entrar na demonstração" : "Explorar esta experiência" : "Entrar no meu espaço"}</Text><Feather name="arrow-right" size={20} color="#fff"/></>}</Pressable>
            <View style={s.privacy}><Feather name={preview ? "shield" : "heart"} size={17} color="#71856a"/><Text style={s.privacyText}>{preview ? "Sem conta real. Sem envio a alunos. Apenas demonstração." : "Um ambiente de cuidado, vínculo e aprendizagem."}</Text></View>
            {preview && <><Pressable accessibilityRole="button" onPress={() => { setSchoolLayout(!schoolLayout);setEmail("");setPassword("");setError("");}} style={s.help}><Text style={s.helpText}>{schoolLayout ? "Escolher outro perfil de teste" : "Ver login com este perfil"}</Text></Pressable><Text style={s.previewNote}>{schoolLayout ? "Não digite dados reais. Os campos são só para avaliar o visual e não são enviados. Entrar abre o perfil escolhido na prévia." : "O acesso escolar fica separado. Você pode conferir seu visual sem usar uma conta real."}</Text></>}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:"#faf7ee"},scroll:{flexGrow:1,paddingHorizontal:24,justifyContent:"center"},layout:{width:"100%",maxWidth:1140,alignSelf:"center",gap:20},wide:{flexDirection:"row",alignItems:"center",gap:76},story:{flex:1},storyWide:{paddingVertical:28},logo:{width:215,height:98,marginBottom:34},kicker:{flexDirection:"row",alignItems:"center",gap:8,marginBottom:17},kickerDot:{height:6,width:6,borderRadius:3,backgroundColor:"#86975a"},kickerText:{fontSize:10,fontWeight:"700",letterSpacing:1.7,color:"#75814f"},headline:{fontSize:55,fontWeight:"800",lineHeight:62,letterSpacing:-2.2,color:"#174e3e"},headlineSmall:{fontSize:32,lineHeight:37,letterSpacing:-1.2},headlineAccent:{color:"#6b8753"},storyText:{fontSize:17,lineHeight:27,color:"#647763",maxWidth:390,marginTop:18},illustration:{height:250,marginTop:18,justifyContent:"center",alignItems:"center",overflow:"hidden"},illustrationSmall:{height:0,marginTop:0},orbit:{position:"absolute",width:244,height:244,borderRadius:122,borderColor:"#d4dec0",borderWidth:1,borderStyle:"dashed"},artCircle:{position:"absolute",width:200,height:200,borderRadius:100,backgroundColor:"#e6ebd3"},bookArt:{height:207,width:207},leafTag:{position:"absolute",bottom:23,right:5,flexDirection:"row",alignItems:"center",gap:8,backgroundColor:"#f6dfa3",paddingHorizontal:13,paddingVertical:13,borderRadius:12,transform:[{rotate:"-5deg"}]},leafTagText:{fontSize:11,fontWeight:"600",color:"#6b562a"},smallTag:{position:"absolute",top:20,left:45,backgroundColor:"#e2eddf",padding:15,borderRadius:20,transform:[{rotate:"10deg"}]},footer:{color:"#80906d",fontSize:9,letterSpacing:2,marginTop:20},form:{backgroundColor:"#fffdf8",borderRadius:26,padding:24,borderWidth:1,borderColor:"#e4e2d4",shadowColor:"#345540",shadowOffset:{width:0,height:12},shadowOpacity:0.06,shadowRadius:25},formWide:{width:440,padding:34},formBadge:{flexDirection:"row",alignItems:"center",gap:7,marginBottom:24},formBadgeText:{fontSize:9,letterSpacing:1.3,fontWeight:"700",color:"#58725b"},formTitle:{color:"#194e3d",fontWeight:"800",fontSize:28,letterSpacing:-0.8,lineHeight:34},formText:{fontSize:14,lineHeight:22,color:"#73806c",marginTop:10,marginBottom:25},roles:{gap:10,marginBottom:25},role:{flexDirection:"row",alignItems:"center",gap:12,padding:12,borderRadius:16,borderWidth:1,borderColor:"#e6e7da",backgroundColor:"#fffefb",minHeight:80},roleSelected:{borderColor:"#3c7654",backgroundColor:"#f0f5e9",borderWidth:1.5},roleIcon:{width:45,height:45,borderRadius:14,alignItems:"center",justifyContent:"center"},roleTitle:{fontSize:14,fontWeight:"700",color:"#244b3c"},roleDetail:{fontSize:11,color:"#6c7c66",marginTop:4},radio:{width:19,height:19,borderRadius:10,borderWidth:1,borderColor:"#cdd7c8",alignItems:"center",justifyContent:"center"},radioSelected:{borderColor:"#2b6a4e"},radioDot:{width:9,height:9,borderRadius:5,backgroundColor:"#2b6a4e"},submit:{minHeight:56,borderRadius:14,backgroundColor:"#164f3d",flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8,paddingHorizontal:20},submitText:{fontSize:14,fontWeight:"700",color:"#fff",flexShrink:1},privacy:{flexDirection:"row",gap:9,alignItems:"center",marginTop:22},privacyText:{fontSize:11,lineHeight:17,color:"#6c7f66",flex:1},previewNote:{fontSize:10,color:"#83907b",lineHeight:16,marginTop:14},fields:{gap:9},label:{fontSize:12,fontWeight:"700",color:"#3a5c48",marginTop:4},inputFrame:{flexDirection:"row",alignItems:"center",gap:10,minHeight:54,paddingHorizontal:14,borderRadius:13,borderWidth:1,borderColor:"#dce1d3",backgroundColor:"#fffefc"},inputFocused:{borderColor:"#44825d"},input:{flex:1,minWidth:0,fontSize:14,color:"#234d3a",paddingVertical:16},eye:{width:40,height:46,alignItems:"center",justifyContent:"center"},help:{alignSelf:"flex-end",paddingVertical:12,marginBottom:8},helpText:{fontSize:12,color:"#326f51",fontWeight:"600"},error:{color:"#963f29",backgroundColor:"#fff0e7",padding:12,borderRadius:10,fontSize:12,lineHeight:18,marginBottom:14}});
