// Extract the exact production callback; never duplicate its normalization logic.
export function platformAdapter(source, dependencies) {
 const start=source.indexOf('const initInstitutionalMissions =');
 const begin=source.indexOf('rpc:async(name,args)=>{',start);
 const end=source.indexOf('\n    }});',begin);
 if(start<0||begin<0||end<0)throw Error('Platform adapter source boundary changed');
 const callback=source.slice(begin+4,end)+'}';
 return Function(...Object.keys(dependencies),'return ('+callback+');')(...Object.values(dependencies));
}
