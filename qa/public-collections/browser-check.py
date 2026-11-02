"""Synthetic catalog and cover bytes exist only in intercepted local HTTP responses."""
from pathlib import Path
import json, io
from PIL import Image
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
catalog=json.loads((ROOT.parents[1]/'assets/colecoes/catalogo-oficial.json').read_text())
for collection in catalog['collections']:
  grades=range(2,6) if collection['stage']=='infantil' else range(1,10)
  volumes=[''] if collection['id']=='indigena-afro-brasileira' else ['1','2']
  for grade in grades:
    for volume in volumes:
      for audience in ['student','teacher']:
        landscape=collection['stage']=='infantil' and grade in [2,3]
        catalog['books'].append({'id':f"test-{collection['id']}-{grade}-{volume}-{audience}",'collectionId':collection['id'],'title':f"Teste local — {collection['title']} — {grade}",'grade':grade,'volume':volume,'audience':audience,'summary':'Registro sintético exclusivo do teste de navegação. Não corresponde à síntese de um livro publicado.','cover':{'src':'assets/colecoes/fixture-landscape.png' if landscape else 'assets/colecoes/fixture-portrait.png','width':600 if landscape else 400,'height':400 if landscape else 600}})
assert len(catalog['books'])==70
images={}
for name,size in [('landscape',(600,400)),('portrait',(400,600))]:
 b=io.BytesIO();Image.new('RGB',size,(189,215,194)).save(b,format='PNG');images[name]=b.getvalue()
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [390,768,1440]:
  context=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce')
  def route(r):
   if not r.request.url.startswith('http://127.0.0.1:8769/'): return r.abort()
   if 'catalogo-oficial.json' in r.request.url: return r.fulfill(status=200,content_type='application/json',body=json.dumps(catalog))
   for name in images:
    if f'fixture-{name}.png' in r.request.url: return r.fulfill(status=200,content_type='image/png',body=images[name])
   return r.continue_()
  context.route('**/*',route);page=context.new_page();errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8769/index.html')
  page.locator('[data-public-book]').first.wait_for()
  assert page.locator('[data-public-book]').count()==70
  nav=page.locator('[data-nav] a[href="#colecoes"]')
  if not nav.is_visible(): page.locator('[data-menu-button]').click()
  nav.click();page.wait_for_timeout(350)
  assert page.locator('#collections-title').bounding_box()['y'] >= page.locator('[data-header]').bounding_box()['y']+page.locator('[data-header]').bounding_box()['height']-2
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'), (width,'overflow')
  page.locator('[data-public-explore="raizes-crescer"]').click()
  assert page.locator('[data-public-book]').count()==16
  page.locator('[name=grade]').select_option('infantil:2')
  page.locator('[name=volume]').select_option('1')
  page.locator('[name=audience]').select_option('teacher')
  assert page.locator('[data-public-book]').count()==1
  trigger=page.locator('[data-public-book]').first;trigger.focus();trigger.press('Enter')
  dialog=page.locator('[data-public-book-dialog]');assert dialog.is_visible()
  img=dialog.locator('img');assert img.evaluate('(x)=>getComputedStyle(x).objectFit')=='contain'
  assert img.evaluate('(x)=>x.naturalWidth > x.naturalHeight')
  assert dialog.locator('a').get_attribute('href')=='login.html?next=biblioteca.html'
  page.keyboard.press('Escape');assert not dialog.is_visible()
  assert trigger.evaluate('(x)=>x===document.activeElement')
  page.locator('[name=search]').fill('nenhum-livro-com-este-nome')
  assert page.locator('[data-public-catalog-empty]').is_visible()
  page.locator('[data-public-catalog-filters] button[type=reset]').click()
  page.wait_for_timeout(100);assert page.locator('[data-public-book]').count()==70
  page.locator('[name=collection]').select_option('avalia-mais');assert page.locator('[data-public-book]').count()==36
  page.locator('[name=collection]').select_option('indigena-afro-brasileira');assert page.locator('[data-public-book]').count()==18
  page.locator('[data-public-book]').first.click();page.locator('[data-public-book-dialog] form button').click();assert not dialog.is_visible()
  assert page.locator('[data-public-collections] a[href*="drive.google"], [data-public-collections] a[href$=".pdf"]').count()==0
  page.locator('[name=collection]').select_option('raizes-crescer')
  page.locator('[data-public-catalog-filters]').scroll_into_view_if_needed()
  page.screenshot(path=str(ROOT/f'catalog-{width}-synthetic.png'),full_page=False)
  assert not errors,errors
  results.append({'width':width,'books':70,'combinedFilters':True,'emptyAndReset':True,'keyboardDialog':True,'focusRestored':True,'landscapeContain':True,'headerOverlap':False,'horizontalOverflow':False,'errors':errors})
  context.close()
 # Source catalog remains intentionally empty until official assets arrive.
 context=browser.new_context();context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:8769/') else r.abort());page=context.new_page();page.goto('http://127.0.0.1:8769/index.html');page.locator('[data-public-explore]').first.wait_for();assert page.locator('[data-public-book]').count()==0;assert 'preparadas' in page.locator('[data-public-catalog-status]').inner_text();context.close()
 browser.close()
(ROOT/'results.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
