// Theme identity is independent of activity identity. Keep the approved artwork,
// order, labels and colors; future catalog entries can share one themeId.
export const coloringThemes = Object.freeze([
 {id:'perto-de-nos',label:'Perto de nós',name:'Bichinhos que vivem perto de nós',subtitle:'Um amigo de muitas descobertas',color:'#f6d99e',cover:'cachorro'},
 {id:'floresta',label:'Floresta',name:'Bichinhos da floresta',subtitle:'Um passeio pelas árvores',color:'#cee5be',cover:'preguica'},
 {id:'bichinhos-que-voam',label:'Bichinhos que voam',name:'Bichinhos que voam',subtitle:'Pequenas asas, grandes descobertas',color:'#ecd4e4',cover:'borboleta'},
 {id:'bichinhos-do-mar',label:'Bichinhos do mar',name:'Bichinhos que vivem no mar',subtitle:'Um mergulho nas cores',color:'#c2e5f1',cover:'peixe'},
 {id:'frutas',label:'Frutas',name:'Frutas',subtitle:'Cores e sabores do dia a dia',color:'#f4e5a9',cover:'banana'},
 {id:'legumes',label:'Legumes',name:'Legumes',subtitle:'Descobertas que vêm da terra',color:'#f3cdb2',cover:'cenoura'},
 {id:'selva',label:'Selva',name:'Selva',subtitle:'Vamos conhecer a savana',color:'#e7d5a7',cover:'leao'},
 {id:'numeros',label:'Números',name:'Números',subtitle:'Um toque, uma nova descoberta',color:'#d6def2',cover:'numero3'},
].map((theme,index)=>Object.freeze({...theme,number:String(index+1).padStart(2,'0')})));
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function themeForActivity(activity){
 if(activity?.themeId)return coloringThemes.find(t=>t.id===activity.themeId)||null;
 return coloringThemes.find(t=>normalize(t.name)===normalize(activity?.theme)||normalize(t.label)===normalize(activity?.theme))||null;
}
export function groupColoringThemes(rows){
 const grouped=new Map();
 for(const row of rows){const activity=row.snapshot?.coloring||row.snapshot;const theme=themeForActivity(activity);if(!theme)continue;if(!grouped.has(theme.id))grouped.set(theme.id,{...theme,activities:[]});grouped.get(theme.id).activities.push(row);}
 return coloringThemes.filter(t=>grouped.has(t.id)).map(t=>grouped.get(t.id));
}
