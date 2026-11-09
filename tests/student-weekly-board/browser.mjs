// Synthetic UI regression only: no production accounts, requests or private notes.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(import.meta.dirname, '../..');
const output = resolve(process.env.WEEKLY_QA_OUTPUT || resolve(import.meta.dirname, 'evidence'));
const fixture = `<!doctype html><html lang="pt-BR"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/master-pack.css"><link rel="stylesheet" href="/student-weekly-board/weekly.css">
<style>body{margin:0}.fixture-layout{display:block;padding:32px;min-height:100vh}.fixture-panel{padding:20px;max-width:1268px;margin:auto}.fixture-panel>h2{margin-bottom:8px}@media(max-width:600px){.fixture-layout{padding:12px}.fixture-panel{padding:16px}}</style>
<body><main class="student-premium-workspace fixture-layout"><section id="board" class="student-side-card fixture-panel"></section></main>
<script type="module">
import {mountWeeklyBoard,weekDates} from '/student-weekly-board/board.mjs';
const teacher=new URLSearchParams(location.search).has('teacher');
const notes=['Levar o livro favorito.','Dia de brincar e descobrir.','Lembrar da garrafinha de água.','Histórias em família.','Dia do brinquedo.'];
const stored=new Map();let fail=false;window.reads=[];window.saves=[];
window.failSave=()=>fail=true;
const transport={async read(dates){window.reads.push([...dates]);return dates.map((date,index)=>({date,lanes:{
family:{text:teacher?'':stored.get(index)?.text??notes[index],version:stored.get(index)?.version??0,editable:!teacher,withheld:teacher},
class:{text:index===2?'Hoje vamos compartilhar uma história.':'',version:0,editable:teacher,withheld:false},
student:{text:'',version:0,editable:teacher,withheld:false}}}));},async save(entry){window.saves.push(entry);if(fail){fail=false;throw Error('RPC_ERROR');}const result={text:entry.text.trim(),version:entry.expectedVersion+1};stored.set(weekDates(entry.date).indexOf(entry.date),result);return result;}};
const existing=document.createElement('section');existing.innerHTML='<h2>Minha semana</h2><p>Compromisso de teste preservado</p>';
window.board=await mountWeeklyBoard({root:document.querySelector('#board'),dates:weekDates('2026-11-09'),transport,existingWeekElement:existing,clock:()=>new Date('2026-11-09T12:00:00')});
window.ready=true;
</script></body></html>`;
const allowed = new Set(['/master-pack.css', '/student-weekly-board/weekly.css', '/student-weekly-board/board.mjs']);
const server = createServer(async(req,res)=>{
  try {
    const path = new URL(req.url,'http://localhost').pathname;
    if (path === '/') {res.setHeader('content-type','text/html; charset=utf-8');res.end(fixture);return;}
    if (!allowed.has(path)) {res.writeHead(404);res.end();return;}
    res.setHeader('content-type',extname(path)==='.css'?'text/css; charset=utf-8':'text/javascript; charset=utf-8');
    res.end(await readFile(resolve(root,'.'+path)));
  } catch {res.writeHead(500);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const checks=[],errors=[];
try {
  for (const width of [1440, 1024, 390, 320]) {
    const context=await browser.newContext({viewport:{width,height:1000},locale:'pt-BR'});
    await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base);await page.waitForFunction(()=>window.ready);
    assert.equal(await page.locator('.weekly-day').count(),5);
    assert.deepEqual(await page.locator('.weekly-day time').allTextContents(),['09/11','10/11','11/11','12/11','13/11']);
    const colors=await page.locator('.weekly-day').evaluateAll(cards=>cards.map(c=>getComputedStyle(c).borderTopColor));
    assert.equal(new Set(colors).size,5,'each weekday has a distinct quiet color');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no page overflow at '+width);
    await page.screenshot({path:resolve(output,'weekly-'+width+'.png'),fullPage:true});
    const sizes=await page.locator('.weekly-day').evaluateAll(cards=>cards.map(c=>({scroll:c.scrollWidth,client:c.clientWidth,rect:c.getBoundingClientRect().toJSON(),header:c.querySelector('header').getBoundingClientRect().toJSON()})));
    assert(sizes.every(c=>c.scroll<=c.client+1),'no clipped cards at '+width+' '+JSON.stringify(sizes));
    assert(await page.locator('.weekly-day button,.weekly-navigation button').evaluateAll(buttons=>buttons.every(b=>b.getBoundingClientRect().height>=44)),'44px controls');
    if(width===1440){
      await page.locator('#board').evaluate(el=>el.style.maxWidth='540px');
      assert(await page.locator('.weekly-day').evaluateAll(cards=>cards.every(c=>c.scrollWidth<=c.clientWidth+1)),'constrained dashboard panel does not clip');
      assert.equal(await page.locator('.weekly-days').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),1,'narrow dashboard panel uses one column');
      await page.locator('#board').evaluate(el=>el.style.removeProperty('max-width'));
    }
    const family=page.locator('.weekly-lane-family textarea').first();
    await family.fill('Alteração de teste');
    await page.getByRole('button',{name:'Próxima semana',exact:true}).click();
    assert.equal(await page.evaluate(()=>window.reads.length),1,'dirty editing prevents navigation');
    await page.locator('.weekly-lane-family').first().getByRole('button',{name:'Cancelar',exact:true}).click();
    assert.equal(await family.inputValue(),'Levar o livro favorito.','cancel restores saved content');
    await family.fill('  Rotina atualizada  ');
    await page.locator('.weekly-lane-family').first().getByRole('button',{name:'Salvar',exact:true}).click();
    await page.getByRole('status').filter({hasText:'Anotação salva.'}).waitFor();
    assert.equal(await family.inputValue(),'Rotina atualizada');
    assert.deepEqual(await page.evaluate(()=>window.saves[0]),{date:'2026-11-09',lane:'family',text:'  Rotina atualizada  ',expectedVersion:0});
    await page.getByRole('button',{name:'Próxima semana',exact:true}).click();
    await page.locator('time[datetime="2026-11-16"]').waitFor();
    assert.equal(await page.locator('.weekly-lane-family textarea').first().inputValue(),'Rotina atualizada','family weekly routine persists across navigation');
    await page.getByRole('button',{name:'Semana atual',exact:true}).click();
    await page.locator('time[datetime="2026-11-09"]').waitFor();
    await page.evaluate(()=>window.failSave());
    await family.fill('Texto preservado na falha');
    await page.locator('.weekly-lane-family').first().getByRole('button',{name:'Salvar',exact:true}).click();
    await page.getByRole('status').filter({hasText:'Não foi possível salvar.'}).waitFor();
    assert.equal(await family.inputValue(),'Texto preservado na falha');
    await page.locator('.weekly-lane-family').first().getByRole('button',{name:'Cancelar',exact:true}).click();
    assert.equal(await family.inputValue(),'Rotina atualizada');
    await page.getByRole('button',{name:'Recarregar',exact:true}).click();
    assert.equal(await page.locator('.weekly-lane-family textarea').first().inputValue(),'Rotina atualizada');
    assert.equal(await page.locator('.weekly-lane-class textarea,.weekly-lane-student textarea').count(),0,'teacher content remains read-only');
    await page.getByText('Compromissos já publicados',{exact:true}).click();
    assert(await page.getByText('Compromisso de teste preservado').isVisible());
    await page.goto(base+'?teacher=1');await page.waitForFunction(()=>window.ready);
    assert.equal(await page.locator('.weekly-lane-family textarea').count(),0,'teacher cannot edit family private notes');
    assert.equal(await page.getByText('Anotações privadas da família.',{exact:true}).count(),5);
    assert.equal(await page.locator('.weekly-lane-class textarea,.weekly-lane-student textarea').count(),10);
    await page.evaluate(()=>window.board.dispose());
    assert.equal(await page.locator('.weekly-day').count(),0,'session disposal clears content');
    checks.push({width,colors,layout:'PASS',editing:'PASS',navigation:'PASS',privacy:'PASS'});
    await context.close();
  }
  assert.deepEqual(errors,[]);
  await writeFile(resolve(output,'report.json'),JSON.stringify({synthetic:true,productionAuthenticated:false,checks,pageErrors:errors},null,2));
  console.log('PASS weekly board at 1440/1024/390/320px: color, layout, editing, save failure, cancel, week navigation, authorship and disposal');
} finally {await browser.close();await new Promise(r=>server.close(r));}
