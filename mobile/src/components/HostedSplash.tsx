import React, {useEffect} from 'react';
import {AccessibilityInfo, ActivityIndicator, Image, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {READ_BETA} from '../services/readBetaPolicy';
/** Brand opening, not a fake progress meter. Session verification runs independently. */
export function HostedSplash({onComplete}: {onComplete: () => void}) {
 const compact=useWindowDimensions().height<600;
 useEffect(()=>{
  let active=true;
  let timer=setTimeout(onComplete,1400);
  void AccessibilityInfo.isReduceMotionEnabled().then(reduce=>{
   if(active&&reduce){clearTimeout(timer);timer=setTimeout(onComplete,200);}
  }).catch(()=>{});
  return()=>{active=false;clearTimeout(timer);};
 },[onComplete]);
 return <View style={s.root} testID="app-splash"><View style={s.outer}/><View style={s.inner}/><Image source={require('../../assets/experience/logo.png')} style={[s.logo,compact&&{width:160,height:73,marginBottom:14}]} resizeMode="contain" accessibilityLabel="Raízes e Saberes"/><Text accessibilityRole="header" style={[s.title,compact&&{fontSize:27,lineHeight:32}]}>Grandes futuros{'\n'}nascem aqui.</Text><Text style={[s.copy,compact&&{fontSize:13,lineHeight:19,marginTop:10}]}>Um novo dia para aprender e florescer.</Text><ActivityIndicator color="#69864f" style={[s.spinner,compact&&{marginTop:14}]} accessibilityLabel="Abrindo o App Raízes"/><Text accessibilityLiveRegion="polite" style={[s.loading,compact&&{marginTop:9}]}>PREPARANDO SEU ESPAÇO</Text><View style={[s.footer,compact&&{bottom:12}]}>{READ_BETA&&<Text style={s.beta}>Beta real · somente leitura</Text>}<Text style={s.signature}>ECOSSISTEMA EDUCACIONAL</Text></View></View>;
}
const s=StyleSheet.create({root:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:'#faf7ee',padding:24,overflow:'hidden',minHeight:300},outer:{position:'absolute',width:570,height:570,borderRadius:285,borderWidth:1,borderColor:'#e4e8d6'},inner:{position:'absolute',width:460,height:460,borderRadius:230,backgroundColor:'#eef0e0',opacity:.55},logo:{width:240,height:110,marginBottom:28},title:{fontSize:34,lineHeight:41,fontWeight:'800',color:'#1c513e',textAlign:'center',letterSpacing:-1.1},copy:{fontSize:14,lineHeight:21,color:'#647758',marginTop:16,textAlign:'center'},spinner:{marginTop:25},loading:{fontSize:9,fontWeight:'700',letterSpacing:1.6,color:'#61734e',marginTop:13},footer:{position:'absolute',bottom:22,alignItems:'center',gap:8},beta:{fontSize:11,color:'#65734e'},signature:{fontSize:9,letterSpacing:2,color:'#61734e'}});
