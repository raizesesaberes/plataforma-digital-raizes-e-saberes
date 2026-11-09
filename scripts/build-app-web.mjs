import {readFile,writeFile,cp,mkdir,rm,readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)), mobile=root+'mobile/';
const packagePath=mobile+'package.json',configPath=mobile+'app.json';
const originalPackage=await readFile(packagePath,'utf8'),originalConfig=await readFile(configPath,'utf8');
const config=JSON.parse(originalConfig);config.expo.experiments={...config.expo.experiments,baseUrl:'/app'};
const env={...process.env,EXPO_NO_TELEMETRY:'1',EXPO_OFFLINE:'1',EXPO_NO_DOTENV:'1',EXPO_PUBLIC_SUPABASE_URL:'',EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'',EXPO_PUBLIC_FASE3_ASSESSMENTS:'false',EXPO_PUBLIC_FASE3_REPLIES:'false',EXPO_PUBLIC_FASE3_NOTICE_EDITING:'false',CI:'1'};
try {
 await writeFile(packagePath,JSON.stringify({...JSON.parse(originalPackage),main:'./hosted-entry.tsx'},null,2)+'\n');
 await writeFile(configPath,JSON.stringify(config,null,2)+'\n');
 const result=spawnSync(mobile+'node_modules/.bin/expo',['export','--platform','web','--output-dir','../build/real-web','--max-workers','2'],{cwd:mobile,env,stdio:'inherit'});
 if(result.status!==0)throw Error('Hosted export failed '+result.status);
}finally{await writeFile(packagePath,originalPackage);await writeFile(configPath,originalConfig);}
const out=root+'app';await rm(out,{recursive:true,force:true});await cp(root+'build/real-web',out,{recursive:true});
let html=await readFile(out+'/index.html','utf8');
html=html.replace('lang="en"','lang="pt-BR"').replace(/<title>[^<]*<\/title>/,'<title>App Raízes · Raízes e Saberes</title>').replace(/<meta name="viewport"[^>]*>/,'<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">').replace('</head>','<meta name="theme-color" content="#1c513e"><link rel="icon" href="data:,"><script src="/supabase-config.js"></script><script src="/app/platform-runtime.js"></script></head>').replace('You need to enable JavaScript to run this app.','Ative JavaScript para abrir o App Raízes.');
await writeFile(out+'/index.html',html);
await writeFile(out+'/platform-runtime.js',"// Same-origin institutional runtime. No credential or session is transported here.\nwindow.RaizesMissionRuntimeReady=import('/mission-runtime/institutional.mjs');\nwindow.RaizesMissionRuntimeReady.catch(()=>{});\nwindow.RaizesEditionLibraryReady=import('/library-edition-boot.mjs');\nwindow.RaizesEditionLibraryReady.catch(()=>{});\n");
console.log('Real hosted entry exported to app/. No publication. No environment credentials embedded.');
