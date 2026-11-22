/** Render the exact source Admin route with synthetic read-only state for Chromium fixtures. */
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('../../app-pages.js',import.meta.url),'utf8');
function section(a,b){
  const start=source.indexOf(a), end=source.indexOf(b,start+1);
  assert(start>=0&&end>start&&source.indexOf(a,start+1)===-1);
  return source.slice(start,end);
}
const cardEnd=source.indexOf('\n`;',source.indexOf('const renderAdminContentModuleCard ='))+3;
const cardStart=source.indexOf('const renderAdminContentModuleCard =');
assert(cardEnd>cardStart);
const code=source.slice(cardStart,cardEnd)+'\n'+section('const renderAdminTeacherTrainingPublisherCard =','const adminFormatSchoolValidation =');
const root='http://127.0.0.1';
function render({flag, role='admin', url='https://127.0.0.1/admin?view=conte%C3%BAdos'}={}){
  const location=new URL(url);
  return runInNewContext(code+'\nrenderAdminContentGovernanceConsole()',{
    URLSearchParams, window:{location,RAIZES_FORMACAO_PUBLICADOR_HOMOLOGACAO:flag},
    platformRoles:{admin:['admin','administrador','administrador_nacional']},
    getCurrentPlatformRole:()=>role,getPlatformSession:()=>({role}),normalizePlatformRole:v=>v,
    adminOperationalState:{status:'ready',data:{}},buildAdminContentCatalog:()=>[],
    adminContentAvailabilityIndex:()=>({byContent:new Map()}),adminContentTypeFromParam:v=>v,
    adminContentUrl:p=>'/admin?'+new URLSearchParams(p),
    adminInlineIcon:()=>'',
    adminContentStatusTone:()=>'neutral',
    printableEscape:v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  },{timeout:1000});
}
const href='href="/formacao-docente-homologacao"';
for(const config of [{},{flag:'true'},{flag:true,url:root},{flag:true,url:'https://www.raizesesaberes.com.br/admin'},{flag:true,role:'professor'},{flag:true,role:''}]){
  assert(!render(config).includes(href),JSON.stringify(config));
}
const body=render({flag:true});
assert.equal(body.split(href).length,2);
assert(body.includes('Central de Conteúdos')&&body.includes('Acervo Mestre')&&body.includes('Vídeos'));
process.stdout.write('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Admin | Teste isolado</title><main>'+body+'</main></html>');
