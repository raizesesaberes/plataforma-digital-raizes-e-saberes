import struct,json,pathlib
root=pathlib.Path(__file__).resolve().parents[1];vendor=root/'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons';b=(vendor/'Fonts/Feather.ttf').read_bytes(); names=json.loads((vendor/'glyphmaps/Feather.json').read_text());u16=lambda o:struct.unpack_from('>H',b,o)[0];i16=lambda o:struct.unpack_from('>h',b,o)[0];u32=lambda o:struct.unpack_from('>I',b,o)[0];tables={b[12+i*16:16+i*16].decode():u32(20+i*16) for i in range(u16(4))};head=tables['head'];upem=u16(head+18);long=i16(head+50);loc=tables['loca'];gly=tables['glyf'];hhea=tables['hhea'];asc=i16(hhea+4);desc=i16(hhea+6);cmap=tables['cmap'];sub=None
for j in range(u16(cmap+2)):
 o=cmap+u32(cmap+4+j*8+4)
 if u16(o)==4:sub=o;break
assert sub is not None
seg=u16(sub+6)//2;end=sub+14;start=end+seg*2+2;delta=start+seg*2;ranges=delta+seg*2

def glyph(cp):
 for j in range(seg):
  if u16(start+2*j)<=cp<=u16(end+2*j):
   off=u16(ranges+2*j);d=i16(delta+2*j)
   if off==0:return (cp+d)%65536
   v=u16(ranges+2*j+off+2*(cp-u16(start+2*j)));return (v+d)%65536 if v else 0
 raise ValueError(cp)
def path(g):
 o=gly+(u32(loc+g*4) if long else u16(loc+g*2)*2);n=i16(o);assert n>=0,('composite',g)
 ends=[u16(o+10+2*i) for i in range(n)];count=ends[-1]+1 if ends else 0;p=o+10+2*n;p+=2+u16(p);flags=[]
 while len(flags)<count:
  f=b[p];p+=1;flags.append(f)
  if f&8:
   repeat=b[p];p+=1;flags.extend([f]*repeat)
 coords=[]
 for short,same in [(2,16),(4,32)]:
  pos=0;arr=[]
  for f in flags:
   if f&short:v=b[p];p+=1;v=v if f&same else -v
   elif f&same:v=0
   else:v=i16(p);p+=2
   pos+=v;arr.append(pos)
  coords.append(arr)
 pts=list(zip(coords[0],coords[1],[bool(f&1) for f in flags]));out=[];begin=0
 for e in ends:
  c=pts[begin:e+1];begin=e+1
  if c[0][2]:initial=c[0][:2];seq=c[1:]+[c[0]]
  elif c[-1][2]:initial=c[-1][:2];seq=c[:-1]+[c[-1]]
  else:initial=((c[0][0]+c[-1][0])/2,(c[0][1]+c[-1][1])/2);seq=c+[(initial[0],initial[1],True)]
  out.append('M %g %g'%initial);i=0
  while i<len(seq):
   q=seq[i]
   if q[2]:out.append('L %g %g'%q[:2]);i+=1
   else:
    r=seq[(i+1)%len(seq)]
    target=r[:2] if r[2] else ((q[0]+r[0])/2,(q[1]+r[1])/2)
    out.append('Q %g %g %g %g'%(q[0],q[1],target[0],target[1]));i+=2 if r[2] else 1
  out.append('Z')
 return ' '.join(out)
data={name:path(glyph(cp)) for name,cp in names.items()};assert all(data.values());dest=root/'src/components/featherPaths.ts';dest.write_text('// Generated from the installed Feather.ttf; no network or font loading.\nexport const featherViewBox = '+json.dumps('0 %s %s %s'%(-asc,upem,asc-desc))+';\nexport const featherPaths: Record<string,string> = '+json.dumps(data,ensure_ascii=False)+';\n');print('Generated',len(data),'icons; units',upem,'asc',asc,'desc',desc)
