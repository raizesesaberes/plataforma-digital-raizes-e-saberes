export function createCounter(total){
 if(!Number.isInteger(total)||total<1||total>10)throw Error('Quantidade inválida.');
 let order=[];
 return {visit(index){if(!Number.isInteger(index)||index<0||index>=total)throw Error('Objeto inválido.');const existing=order.indexOf(index);if(existing!==-1)return{changed:false,count:order.length,ordinal:existing+1,complete:order.length===total};order.push(index);return{changed:true,count:order.length,ordinal:order.length,complete:order.length===total};},reset(){order=[];},snapshot(){return{total,count:order.length,order:[...order],complete:order.length===total};}};
}
