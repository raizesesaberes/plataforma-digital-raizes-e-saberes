import {mkdirSync,readFileSync,writeFileSync,symlinkSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'../..');
const project='/tmp/rs-fase3-routing-project';
mkdirSync(project,{recursive:true});
try{symlinkSync(resolve(root,'mobile/node_modules'),project+'/node_modules','dir');}catch(e){if(e.code!=='EEXIST')throw e;}
const mobile=JSON.parse(readFileSync(resolve(root,'mobile/package.json')));
writeFileSync(project+'/package.json',JSON.stringify({name:'fase3-synthetic-expo',version:'1.0.0',private:true,main:resolve(root,'qa/fase3/ExpoRoutingHarness.tsx'),dependencies:mobile.dependencies}));
writeFileSync(project+'/app.json',JSON.stringify({expo:{name:'FASE3 Synthetic',slug:'fase3-synthetic',platforms:['web'],web:{bundler:'metro',output:'single'}}}));
writeFileSync(project+'/metro.config.js',`const {getDefaultConfig}=require('expo/metro-config');const c=getDefaultConfig(__dirname);c.watchFolders=[${JSON.stringify(root)}];c.resolver.nodeModulesPaths=[${JSON.stringify(resolve(root,'mobile/node_modules'))}];module.exports=c;`);
execFileSync(process.execPath,[resolve(root,'mobile/node_modules/expo/bin/cli'),'export','--platform','web','--output-dir','/tmp/rs-fase3-routing-dist','--max-workers','2'],{cwd:project,stdio:'inherit',env:{...process.env,EXPO_OFFLINE:'1',EXPO_NO_TELEMETRY:'1',CI:'1',EXPO_PUBLIC_SUPABASE_URL:'http://127.0.0.1:58138',EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'synthetic-key',EXPO_PUBLIC_FASE3_ASSESSMENTS:'true',EXPO_PUBLIC_FASE3_REPLIES:'true',EXPO_PUBLIC_FASE3_NOTICE_EDITING:'true'}});
