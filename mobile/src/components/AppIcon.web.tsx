import React from 'react';
import {StyleSheet} from 'react-native';
import type {AppIconProps} from './AppIcon';
import {featherPaths,featherViewBox} from './featherPaths';
export function AppIcon({name,size=24,color,style,accessibilityLabel,testID,...rest}:AppIconProps){
 const flat=StyleSheet.flatten(style)||{};
 const ink=color||flat.color||'currentColor';
 const label=accessibilityLabel;
 const path=featherPaths[name];
 const svgStyle={display:'inline-block',flexShrink:0,verticalAlign:'middle',...flat,width:size,height:size} as React.CSSProperties;
 return React.createElement('svg',{xmlns:'http://www.w3.org/2000/svg',viewBox:path?featherViewBox:'0 0 24 24',width:size,height:size,fill:ink,style:svgStyle,role:rest.accessibilityRole || (label?'img':undefined),onClick:rest.onPress as unknown as React.MouseEventHandler<SVGSVGElement>,'aria-label':label,'aria-hidden':label?undefined:true,'data-testid':testID,focusable:false},path?React.createElement('path',{d:path,transform:'scale(1,-1)'}):React.createElement('g',{fill:'none',stroke:ink,strokeWidth:2},React.createElement('circle',{cx:12,cy:12,r:9}),React.createElement('path',{d:'M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4M12 17h.01'})));
}
