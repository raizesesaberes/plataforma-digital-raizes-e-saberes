import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const baseline='56aeb6832c8624532d7499612ff0006db39d2cab';
const token='  /* Shared interface family; educational type, logos and monospace remain explicit. */\n  --platform-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;\n';
const narrowHome='\n/* Keep the public home title readable on narrow phones. */\n@media (max-width: 380px) {\n  #inicio > .hero h1 {\n    font-size: 2.25rem;\n    overflow-wrap: anywhere;\n  }\n}\n';
const stripFamilies=s=>s.replace(/font-family\s*:\s*[^;}]+/g,'font-family: FAMILY').replace(/\bfont\s*:\s*([^;}]+)/g,(_,v)=>'font: '+v.replace(/(?:Inter|Poppins)[^;}]+$|var\(--platform-font-sans\)$/,'FAMILY'));
for(const file of ['styles.css','master-pack.css']){
 const before=execFileSync('git',['show',`${baseline}:${file}`],{encoding:'utf8'}),after=readFileSync(file,'utf8');
 assert.equal(stripFamilies(after.replace(token,'').replace(narrowHome,'')),stripFamilies(before),`${file}: non-family declarations and layout must remain byte-identical`);
 if(file==='styles.css')assert(after.endsWith(narrowHome),'Exact reviewed narrow-home exception required');
 assert.equal(after.split(token).length,2,`${file}: exact shared token once`);
 assert(!after.includes('* {font-family:'));
}
const before=execFileSync('git',['show',`${baseline}:index.html`],{encoding:'utf8'});
assert.equal(readFileSync('index.html','utf8'),before.replace('font-family:Poppins,sans-serif','font-family:var(--platform-font-sans)'));
const audit=JSON.parse(readFileSync('tests/typography/fixtures/family-changes.json','utf8'));
assert.equal(audit.changes.length,287);assert(audit.exceptions.some(x=>x.family.includes('monospace')));assert(audit.exceptions.some(x=>x.selector.includes('dyslexia')));
for(const {file,selector,family} of audit.exceptions){const rules=[...readFileSync(file,'utf8').matchAll(/([^{}]+)\{([^{}]*)\}/g)];const rule=rules.find(r=>r[1].trim()===selector);assert(rule,`${file}: exception selector missing: ${selector}`);assert.equal(rule[2].match(/font-family\s*:\s*([^;}]+)/)?.[1],family,`${file}: changed exception ${selector}`)}
console.log('PASS: 287 family-only CSS substitutions, one inline family, identical sizes/weights/layout outside the reviewed narrow-home title exception, shared system-first token, 24 declared exception rules preserved.');

const shorthand=JSON.parse(readFileSync('tests/typography/fixtures/shorthand-changes.json','utf8'));
for(const x of shorthand.changes)assert.equal(x.before.replace(/(?:Inter|Poppins)[^;}]+$/,'FAMILY'),x.after.replace('var(--platform-font-sans)','FAMILY'));
console.log('PASS: '+shorthand.changes.length+' reviewed shorthand families; sizes, line heights and weights unchanged.');
