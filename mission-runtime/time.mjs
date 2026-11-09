const parts = (date, zone) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone:zone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
const key = p => `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
export function localDeadlineToUtc(local, zone) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) throw Error('Informe a data e a hora completas.');
  const nominal = Date.parse(local+'Z');
  if (!Number.isFinite(nominal) || new Date(nominal).toISOString().slice(0,16)!==local) throw Error('Data inválida.');
  const offsets = new Set();
  for(let h=-36;h<=36;h+=6){ const t=nominal+h*3600000; const p=parts(new Date(t),zone); offsets.add(Date.parse(key(p)+'Z')-t); }
  const matches=[...offsets].map(offset=>nominal-offset).filter(t=>key(parts(new Date(t),zone))===local);
  if(matches.length!==1) throw Error(matches.length ? 'Este horário se repete na mudança de fuso. Escolha outro horário.' : 'Este horário não existe na mudança de fuso. Escolha outro horário.');
  return new Date(matches[0]).toISOString();
}
export const formatDeadline = (value,zone) => new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:zone}).format(new Date(value));
