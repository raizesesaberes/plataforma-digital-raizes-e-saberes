"""Exercise official catalog bytes from the local build; no external services."""
from pathlib import Path
import json
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
BASE='http://127.0.0.1:8769/'
catalog=json.loads((ROOT.parents[1]/'assets/colecoes/catalogo-oficial.json').read_text())
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [390,768,1440]:
  context=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce')
  blocked=[]
  def route(r):
   if r.request.url.startswith(BASE): return r.continue_()
   blocked.append(r.request.url.split('?')[0]);return r.fulfill(status=204,body='')
  context.route('**/*',route)
  page=context.new_page();errors=[];console_errors=[];bad_responses=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None)
  page.on('response',lambda r:bad_responses.append([r.status,r.url]) if r.url.startswith(BASE) and r.status>=400 else None)
  page.goto(BASE+'index.html');page.locator('[data-public-book]').first.wait_for()
  assert page.locator('[data-public-book]').count()==70
  assert page.locator('[data-public-explore]').count()==3
  nav=page.locator('[data-nav] a[href="#colecoes"]');assert nav.inner_text()=='Coleções Raízes e Saberes'
  if not nav.is_visible():page.locator('[data-menu-button]').click()
  nav.click();page.wait_for_timeout(1400)
  def below_header(selector):
   head=page.locator('[data-header]').bounding_box();box=page.locator(selector).bounding_box();assert head['y']+head['height']-2 <= box['y'] < 850,(width,selector,box,head)
  below_header('#collections-title')
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
  page.screenshot(path=str(ROOT/f'catalog-{width}-official-overview.png'))
  # Cover image boxes must stay inside their frames, including portrait overview samples.
  page.locator('[data-public-collection-overview] img').evaluate_all('(imgs)=>Promise.all(imgs.map(i=>i.decode()))')
  assert page.locator('[data-public-collection-overview] img').evaluate_all('(imgs)=>imgs.every(i=>i.getBoundingClientRect().height<=i.parentElement.getBoundingClientRect().height+1)')
  # Force decoding every real cover and verify the computed contain style.
  sizes=page.locator('[data-public-books-grid] img').evaluate_all('''async imgs => { await Promise.all(imgs.map(i=>{i.loading='eager';return i.decode()})); return imgs.map(i=>({w:i.naturalWidth,h:i.naturalHeight,fit:getComputedStyle(i).objectFit,src:i.getAttribute('src')})); }''')
  assert page.locator('[data-public-books-grid] img').evaluate_all('(imgs)=>imgs.every(i=>i.getBoundingClientRect().height<=i.parentElement.getBoundingClientRect().height+1)')
  assert len(sizes)==70 and sum(i['w']>i['h'] for i in sizes)==8
  assert all(i['fit']=='contain' and i['w']==600 for i in sizes)
  for book,image in zip(catalog['books'],sizes):assert image['src']==book['cover']['src'] and image['h']==book['cover']['height']
  for cid,count in [('raizes-crescer',16),('avalia-mais',36),('indigena-afro-brasileira',18)]:
   page.locator(f'[data-public-explore="{cid}"]').click();page.wait_for_timeout(100)
   assert page.locator('[data-public-book]').count()==count
   below_header('#livros-das-colecoes')
  page.locator('[data-public-explore="raizes-crescer"]').click()
  page.locator('[name=grade]').select_option('infantil:2');page.locator('[name=volume]').select_option('1');page.locator('[name=audience]').select_option('teacher')
  assert page.locator('[data-public-book]').count()==1
  trigger=page.locator('[data-public-book]').first;assert trigger.inner_text()=='Ver detalhes';trigger.focus();trigger.press('Enter')
  dialog=page.locator('[data-public-book-dialog]');assert dialog.is_visible()
  assert dialog.evaluate('(d)=>d.contains(document.activeElement)')
  for _ in range(5):
   page.keyboard.press('Tab');assert dialog.evaluate('(d)=>d.contains(document.activeElement)')
  page.keyboard.press('Shift+Tab');assert dialog.evaluate('(d)=>d.contains(document.activeElement)')
  img=dialog.locator('img');img.evaluate('(i)=>i.decode()');assert img.evaluate('(i)=>i.naturalWidth>i.naturalHeight && getComputedStyle(i).objectFit==="contain"')
  assert dialog.locator('a').inner_text()=='Acessar a plataforma'
  assert dialog.locator('a').get_attribute('href')=='login.html?next=biblioteca.html'
  assert 'leitura integral' not in dialog.inner_text().lower()
  page.screenshot(path=str(ROOT/f'catalog-{width}-official-dialog.png'))
  page.keyboard.press('Escape');assert not dialog.is_visible();assert trigger.evaluate('(x)=>x===document.activeElement')
  page.locator('[name=search]').fill('nenhum-livro-com-este-nome');assert page.locator('[data-public-catalog-empty]').is_visible()
  page.locator('[data-public-catalog-filters] button[type=reset]').click();page.wait_for_timeout(100);assert page.locator('[data-public-book]').count()==70
  for query,expected in [('raízes crescer',16),('raizes crescer',16),('INDÍGENA',18),('indigena',18)]:
   page.locator('[name=search]').fill(query);assert page.locator('[data-public-book]').count()==expected,(query,width)
  page.locator('[name=search]').fill('')
  page.locator('[name=collection]').select_option('avalia-mais');page.locator('[name=grade]').select_option('fundamental:9');page.locator('[name=volume]').select_option('2');page.locator('[name=audience]').select_option('student');assert page.locator('[data-public-book]').count()==1
  page.locator('[data-public-book]').click();dialog.locator('img').evaluate('(i)=>i.decode()');assert dialog.locator('img').evaluate('(i)=>i.naturalHeight>i.naturalWidth && getComputedStyle(i).objectFit==="contain"');dialog.locator('form button').click();assert not dialog.is_visible()
  page.locator('[data-public-catalog-filters] button[type=reset]').click();page.wait_for_timeout(100)
  page.locator('[name=collection]').select_option('indigena-afro-brasileira');page.locator('[name=volume]').select_option('single');page.locator('[name=audience]').select_option('teacher');assert page.locator('[data-public-book]').count()==9
  assert page.locator('[data-public-collections] a[href*="drive.google"], [data-public-collections] a[href$=".pdf"], [data-public-collections] a[href$=".zip"]').count()==0
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
  # Verify local CTA destinations without entering authenticated UI or calling a backend.
  for name in ['login.html','biblioteca.html']:assert context.request.get(BASE+name).status==200
  assert not bad_responses,bad_responses
  assert not errors,errors
  assert not console_errors,console_errors
  results.append({'width':width,'officialBooks':70,'landscape':8,'portrait':62,'collectionCounts':[16,36,18],'combinedFilters':True,'accentSearch':True,'emptyAndReset':True,'focusTrapAndRestore':True,'escapeAndClose':True,'headerOverlap':False,'horizontalOverflow':False,'localHttpErrors':bad_responses,'pageErrors':errors,'consoleErrors':console_errors,'externalRequestsStubbed':sorted(set(blocked))})
  context.close()
 browser.close()
(ROOT/'results-official.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(results,indent=2))
