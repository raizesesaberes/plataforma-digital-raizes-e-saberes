// Read-only local public-university integration and teacher-template rendering.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=resolve(import.meta.dirname,'../..'),out=resolve(import.meta.dirname,'evidence');await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://local').pathname;const file=resolve(root,'.'+pathname);if(!file.startsWith(root+'/'))throw Error();res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end('Not found');}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});const report=[];

try {for(const width of [1440,390,320]) {
 const page=await browser.newPage({viewport:{width,height:900},locale:'pt-BR'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));const offsite=[];
 await page.route('**/*',route=>{if(route.request().url().startsWith(origin+'/'))return route.continue();offsite.push(route.request().url());return route.abort();});
 await page.goto(origin+'/universidade.html'); await page.locator('[data-course-results] .public-course-card').first().waitFor();
 const counts=await page.evaluate(()=>({courses:demoCuratedCourses.length,verified:demoCuratedCourses.filter(c=>c.lastVerifiedAt==='2026-11-11').length,providers:demoCourseProviders.length,unique:new Set(demoCuratedCourses.map(c=>c.id)).size,untrustedImages:demoCuratedCourses.filter(c=>c.imageUrl&&/^https?:/.test(c.imageUrl)).length,expired:externalCourseDeadlinePassed({completionDeadline:'2020-01-01'}),fresh:externalCourseDeadlinePassed({completionDeadline:'2099-01-01'})}));
 console.log('Viewport',width,'courses',counts.courses);assert.equal(counts.courses,counts.unique);assert.equal(counts.verified,32);assert.equal(counts.untrustedImages,0);assert.equal(counts.expired,true);assert.equal(counts.fresh,false);
 const search=page.locator('[data-course-search]');await search.fill('Scratch');assert.equal(await page.locator('[data-course-results] .public-course-card').count(),2);
 await search.fill('zz-no-course-zz');assert.equal(await page.locator('.catalog-empty').count(),1);await search.fill('');
 for(let step=0;step<10 && await page.locator('[data-course-results] .public-course-card').count()<counts.courses;step++)await page.locator('[data-course-load-more]').click(); assert.equal(await page.locator('[data-course-results] .public-course-card').count(),counts.courses);
 await page.locator('[data-course-sort]').selectOption('hours');const hours=await page.locator('[data-course-results] .public-course-card').first().locator('dd').first().textContent();assert.equal(hours.trim(),'6h');
 await page.evaluate(()=>renderCourseDetail('real-aprendizagem-significativa-ifrs'));
 const detail=page.locator('[data-course-detail]');await detail.waitFor();const body=await detail.innerText();assert.match(body,/IFRS/);assert.match(body,/60%/);assert.match(body,/31\/01\/2027/);assert.match(body,/não emite o certificado externo/);assert(!/undefined|NaN/.test(body));
 const illustrations=await page.evaluate(async()=>{const imgs=[...document.querySelectorAll('[data-course-detail] img')];return Promise.all(imgs.map(async img=>{img.loading='eager';await img.decode();return {src:img.getAttribute('src'),width:img.naturalWidth};}));});assert(illustrations.length>0&&illustrations.every(img=>img.width>0));
 const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1&&r.width>0}).slice(0,10).map(e=>e.className)}));
 assert(overflow.scroll<=width+1,JSON.stringify(overflow));await detail.screenshot({path:out+'/curation-detail-'+width+'.png'});
 await detail.locator('[data-auth-course-action="started"]').click();await page.waitForURL('**/personal-learning.html?**');const url=new URL(page.url());assert.equal(url.searchParams.get('status'),'in_progress');assert.equal(url.searchParams.get('provider'),'Aprenda Mais / IFRS');
 assert.equal(errors.length,0,errors.join(';'));report.push({width,...counts,hours,overflow,errors,externalResourcesBlocked:offsite.length}); await page.close();
 }await writeFile(out+'/curation-report.json',JSON.stringify({synthetic:true,report},null,2));console.log('PASS public curation counts, search, filters, details, source conditions, personal prefill at1440/390/320.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
