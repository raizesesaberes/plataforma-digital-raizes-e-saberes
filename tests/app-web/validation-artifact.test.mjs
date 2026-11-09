import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, unlinkSync, linkSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareValidationArtifact } from '../../scripts/lib/app-validation-artifact.mjs';
import { PRODUCTION_REF, VALIDATION_REF } from '../../scripts/lib/app-hosting-target.mjs';
const source = (ref, key='sb_publishable_synthetic') => `window.RAIZES_SUPABASE = {url:"https://${ref}.supabase.co",anonKey:"${key}",allowLocalFallback:false};\n`;
function fixture(fn) {
 const root=mkdtempSync(join(tmpdir(),'app-validation-test-')),directory=join(root,'dist'),publicConfigFile=join(root,'validation.js');
 try {
  mkdirSync(join(directory,'app'),{recursive:true}); mkdirSync(join(directory,'mission-runtime'));
  writeFileSync(join(root,'supabase-config.js'),source(PRODUCTION_REF));writeFileSync(join(directory,'supabase-config.js'),source(PRODUCTION_REF));writeFileSync(publicConfigFile,source(VALIDATION_REF));
  for(const path of ['login.html','login.js','app/platform-runtime.js','mission-runtime/institutional.mjs'])writeFileSync(join(directory,path),'');
  writeFileSync(join(directory,'app/index.html'),'<script src="/supabase-config.js"></script><script src="/app/platform-runtime.js"></script><script src="/app/_expo/static/js/web/hosted-entry-test.js"></script>');
  fn({repositoryRoot:root,directory,publicConfigFile,environment:'preview'});
 }finally{rmSync(root,{recursive:true,force:true});}
}
test('preview build changes only compiled config and emits no key',()=>fixture(options=>{
 const result=prepareValidationArtifact(options);assert.equal(result.projectRef,VALIDATION_REF);assert.equal(result.sourceConfigurationUnchanged,true);assert.equal(result.remoteActions,0);assert.equal(result.previewOnly,true);
 assert.equal(readFileSync(join(options.repositoryRoot,'supabase-config.js'),'utf8'),source(PRODUCTION_REF));assert(!JSON.stringify(result).includes('sb_publishable'));
}));
test('production environment is denied even with local override',()=>fixture(options=>{
 for(const localTest of [false,true])assert.throws(()=>prepareValidationArtifact({...options,environment:'production',localTest}));
 assert.throws(()=>prepareValidationArtifact({...options,environment:undefined}));
 assert.equal(prepareValidationArtifact({...options,environment:undefined,localTest:true}).projectRef,VALIDATION_REF);
}));
test('wrong backend and wrong legacy key project are rejected before writing',()=>fixture(options=>{
 const before=readFileSync(join(options.directory,'supabase-config.js'),'utf8');
 writeFileSync(options.publicConfigFile,source(PRODUCTION_REF));assert.throws(()=>prepareValidationArtifact(options));
 const jwt='x.'+Buffer.from(JSON.stringify({role:'anon',ref:PRODUCTION_REF})).toString('base64url')+'.x';
 writeFileSync(options.publicConfigFile,source(VALIDATION_REF,jwt));assert.throws(()=>prepareValidationArtifact(options));
 assert.equal(readFileSync(join(options.directory,'supabase-config.js'),'utf8'),before);
}));
test('source or another directory cannot be selected as output',()=>fixture(options=>{
 assert.throws(()=>prepareValidationArtifact({...options,directory:options.repositoryRoot}));
 mkdirSync(join(options.repositoryRoot,'other'));assert.throws(()=>prepareValidationArtifact({...options,directory:join(options.repositoryRoot,'other')}));
}));
test('failed artifact check restores the compiled config',()=>fixture(options=>{
 const before=readFileSync(join(options.directory,'supabase-config.js'),'utf8');
 unlinkSync(join(options.directory,'login.js'));assert.throws(()=>prepareValidationArtifact(options));assert.equal(readFileSync(join(options.directory,'supabase-config.js'),'utf8'),before);
}));
test('linked configuration cannot overwrite source',()=>fixture(options=>{
 const dest=join(options.directory,'supabase-config.js'),src=join(options.repositoryRoot,'supabase-config.js');
 unlinkSync(dest);linkSync(src,dest);assert.throws(()=>prepareValidationArtifact(options));unlinkSync(dest);symlinkSync(src,dest);assert.throws(()=>prepareValidationArtifact(options));assert.equal(readFileSync(src,'utf8'),source(PRODUCTION_REF));
}));
