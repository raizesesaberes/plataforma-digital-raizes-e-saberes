// Region masks are derived from closed white spaces, never from the colour a child chose.
export function segmentArtwork(rgba,width,height,{threshold=210,minArea=100}={}){
 const n=width*height,labels=new Int32Array(n),queue=new Int32Array(n),regions=[];let serial=0;
 for(let i=0;i<n;i++){const k=i*4;if(rgba[k+3]<128||Math.min(rgba[k],rgba[k+1],rgba[k+2])<threshold)labels[i]=-1;}
 for(let start=0;start<n;start++){
  if(labels[start]!==0)continue;const raw=++serial;let head=0,tail=1,touches=false,minX=width,minY=height,maxX=0,maxY=0;queue[0]=start;labels[start]=raw;
  while(head<tail){const p=queue[head++],x=p%width,y=Math.floor(p/width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);if(x===0||y===0||x===width-1||y===height-1)touches=true;
   const neighbors=[];if(x>0)neighbors.push(p-1);if(x<width-1)neighbors.push(p+1);if(y>0)neighbors.push(p-width);if(y<height-1)neighbors.push(p+width);
   for(const q of neighbors)if(labels[q]===0){labels[q]=raw;queue[tail++]=q;}
  }
  if(touches||tail<minArea){for(let j=0;j<tail;j++)labels[queue[j]]=-1;continue;}
  // Find the pixel nearest the bounding-box centre, always within this region.
  const cx=(minX+maxX)/2,cy=(minY+maxY)/2;let seed=start,best=Infinity;
  for(let j=0;j<tail;j++){const p=queue[j],d=(p%width-cx)**2+(Math.floor(p/width)-cy)**2;if(d<best){best=d;seed=p;}}
  regions.push({id:raw,area:tail,bounds:{x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1},seed:{x:seed%width,y:Math.floor(seed/width)}});
 }
 const remap=new Map(regions.sort((a,b)=>b.area-a.area).map((r,i)=>[r.id,i+1]));for(let i=0;i<n;i++)labels[i]=remap.get(labels[i])||0;regions.forEach((r,i)=>r.id=i+1);
 return {width,height,labels,regions};
}
export function pickRegion(seg,x,y,radius=0){
 x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=seg.width||y>=seg.height)return 0;const exact=seg.labels[y*seg.width+x];if(exact)return exact;
 let best=radius*radius+1,id=0;for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){const xx=x+dx,yy=y+dy,d=dx*dx+dy*dy;if(d>=best||xx<0||yy<0||xx>=seg.width||yy>=seg.height)continue;const k=seg.labels[yy*seg.width+xx];if(k){id=k;best=d;}}return id;
}
export function validAction(a,regionCount){return a&&Number.isInteger(a.region)&&a.region>0&&a.region<=regionCount&&['fill','brush','erase'].includes(a.tool)&&/^#[0-9a-f]{6}$/i.test(a.color)&&Array.isArray(a.points)&&a.points.length>=1&&a.points.length<=2000&&a.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.y>=0&&p.x<=1000&&p.y<=1000)&&Number.isFinite(a.size)&&a.size>=1&&a.size<=180;}
