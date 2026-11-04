import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync('app-pages.js','utf8');
const code=source.slice(source.indexOf('const secretariaSchoolYear ='),source.indexOf('\n};',source.indexOf('const secretariaSchoolYear ='))+3);
const year=vm.runInNewContext(code+';secretariaSchoolYear');
for(const [enrollment,group,expected] of [
 [{school_year:'2026'},{school_year:'2025'},'2026'],
 [{},{school_year:'2026',ano_escolar:'5º Ano'},'2026'],
 [{},{school_year:null,ano_escolar:'5º Ano'},'Ano não informado'],
 [{school_year:'5º Ano'},{school_year:'2026'},'2026'],
 [{school_year:''},{school_year:'5_ANO'},'Ano não informado'],
 [{},{},'Ano não informado'],
 [{school_year:2027},{},'2027'],
 [{school_year:' 2026 '},{},'2026']
]) assert.equal(year(enrollment,group),expected);
console.log('PASS:8 year-label cases using actual renderer helper; no grade fallback.');
