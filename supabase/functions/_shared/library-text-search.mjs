// Private local prototype; authorization must precede index delivery in production.
export const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\u00ad/g,'').toLocaleLowerCase('pt-BR');
function stream(words,joinHyphens){
 let text='',ranges=[];
 words.forEach((word,i)=>{
  const prev=words[i-1];
  // Join only a trailing hyphen across a plausible line wrap, never inline compounds.
  const wrap=joinHyphens&&prev&&/\p{L}[-\u00ad]$/u.test(prev.text)&&/^\p{L}/u.test(word.text)&&word.box[1]>prev.box[1]+prev.box[3]*.35&&word.box[1]-prev.box[1]<prev.box[3]*2.8&&word.box[0]<prev.box[0];
  if(wrap){text=text.replace(/-$/,'');ranges[ranges.length-1].end=text.length;}else if(text)text+=' ';
  const start=text.length;text+=normalize(word.text);ranges.push({start,end:text.length,word});
 });return {text,ranges};
}
export function findOccurrences(pages,query){
 const q=normalize(query.trim()).replace(/\s+/g,' ');if(!q)return [];
 const results=[],seen=new Set();
 pages.forEach((words,page)=>{
  for(const joined of [false,true]){
   const {text,ranges}=stream(words,joined);
   for(let at=text.indexOf(q);at!==-1;at=text.indexOf(q,at+Math.max(q.length,1))){
    let lo=0,hi=ranges.length;while(lo<hi){const mid=(lo+hi)>>1;if(ranges[mid].end<=at)lo=mid+1;else hi=mid;}
    const found=[];for(let k=lo;k<ranges.length&&ranges[k].start<at+q.length;k++)found.push(ranges[k]);
    if(!found.length)continue;const boxes=found.map(w=>w.word.box);
    // Distinguish repeated substrings inside a word; deduplicate the alternate stream.
    const offset=at-found[0].start,key=JSON.stringify([page,boxes,offset]);if(seen.has(key))continue;seen.add(key);
    results.push({page:page+1,boxes,snippet:text.slice(Math.max(0,at-40),Math.min(text.length,at+q.length+70))});
   }
  }
 });return results.sort((a,b)=>a.page-b.page||a.boxes[0][1]-b.boxes[0][1]||a.boxes[0][0]-b.boxes[0][0]);
}
