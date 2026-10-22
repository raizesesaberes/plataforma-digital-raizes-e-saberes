const ISS='https://token.actions.githubusercontent.com';
const JWKS=ISS+'/.well-known/jwks';
const err=x=>{throw new Error(x)};
function decode(s){if(!/^[A-Za-z0-9_-]+$/.test(s))err('JWT_ENCODING');return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
function object(b){let v;try{v=JSON.parse(new TextDecoder().decode(b))}catch{err('JWT_JSON')}if(!v||Array.isArray(v)||typeof v!=='object')err('JWT_JSON');return v;}
export async function verifyOIDC(token,trust,{fetcher=fetch,cryptoImpl=crypto,now=Math.floor(Date.now()/1000)}={}){
 if(typeof token!=='string'||token.length>16384)err('JWT_SIZE');const p=token.split('.');if(p.length!==3)err('JWT_PARTS');
 const h=object(decode(p[0])),c=object(decode(p[1]));
 if(h.alg!=='RS256'||(h.typ&&h.typ!=='JWT')||typeof h.kid!=='string'||h.jku||h.x5u||h.crit)err('JWT_HEADER');
 const response=await fetcher(JWKS,{redirect:'error',signal:AbortSignal.timeout(5000)});if(!response.ok)err('JWKS_FETCH');
 const raw=await response.text();if(raw.length>65536)err('JWKS_SIZE');const keys=JSON.parse(raw).keys;
 if(!Array.isArray(keys)||keys.length>20)err('JWKS_FORMAT');const matches=keys.filter(k=>k.kid===h.kid&&k.kty==='RSA'&&(!k.use||k.use==='sig')&&(!k.alg||k.alg==='RS256'));
 if(matches.length!==1)err('JWKS_KEY');
 const key=await cryptoImpl.subtle.importKey('jwk',matches[0],{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 if(!await cryptoImpl.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(p[2]),new TextEncoder().encode(p[0]+'.'+p[1])))err('JWT_SIGNATURE');
 if(c.iss!==ISS||c.aud!==trust.audience||c.repository_id!=='1297887230'||c.repository!=='raizesesaberes/plataforma-digital-raizes-e-saberes'||c.ref!==trust.ref||c.workflow_ref!==trust.workflowRef||c.workflow_sha!==trust.workflowSha||c.sha!==trust.commit||c.event_name!=='push'||c.ref_type!=='branch')err('JWT_SCOPE');
 const subjects=['repo:raizesesaberes/plataforma-digital-raizes-e-saberes:environment:enem-ingest','repo:raizesesaberes@299967037/plataforma-digital-raizes-e-saberes@1297887230:environment:enem-ingest'];
 if(!subjects.includes(c.sub)||c.repository_owner_id!=='299967037'||c.environment!=='enem-ingest'||c.runner_environment!=='github-hosted')err('JWT_ENVIRONMENT');
 for(const k of ['iat','nbf','exp'])if(!Number.isSafeInteger(c[k]))err('JWT_TIME');
 if(c.exp<=now||c.nbf>now+10||c.iat>now+10||c.iat<now-600||c.exp-c.iat>600||c.exp<=c.iat)err('JWT_EXPIRED');
 if(typeof c.jti!=='string'||c.jti.length<8||c.jti.length>200||!/^\d+$/.test(c.run_id)||!/^\d+$/.test(c.run_attempt))err('JWT_RUN');
 return {jti:c.jti,run_id:c.run_id,run_attempt:c.run_attempt,commit:c.sha,workflow_sha:c.workflow_sha,expires_at:c.exp,repository_id:c.repository_id,ref:c.ref};
}
