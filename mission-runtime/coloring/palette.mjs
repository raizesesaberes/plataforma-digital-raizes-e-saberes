// Keep the first eight colors and their exact values compatible with saved paintings.
export const palette=Object.freeze([
 ['Coral','#ee7254'],['Amarelo','#f6c849'],['Verde','#71ac69'],['Azul-claro','#67bde8'],
 ['Roxo','#9c85cb'],['Rosa','#e893b4'],['Marrom','#a97755'],['Preto','#2b3c3b'],
 ['Laranja','#ed922b'],['Vermelho','#da3c36'],['Vinho','#942f4d'],['Rosa-claro','#f5bed2'],
 ['Pink','#d84282'],['Lilás','#bea9df'],['Violeta','#7046a1'],['Azul','#3374c6'],
 ['Azul-escuro','#25477b'],['Turquesa','#35afa7'],['Verde-claro','#aad479'],['Verde-escuro','#367553'],
 ['Bege','#dfc394'],['Ocre','#bb8c37'],['Cinza','#979ca5'],['Branco','#ffffff']
].map(Object.freeze));
export const compactPalette=Object.freeze(palette.slice(0,8));
export function luminance(hex){
 const channels=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
}
export function contrastRatio(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export function selectionInk(hex){return contrastRatio(hex,'#000000')>=contrastRatio(hex,'#ffffff')?'#000000':'#ffffff';}
