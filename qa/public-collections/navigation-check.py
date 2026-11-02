"""Local interaction checks: external requests are stubbed, never bypass TLS."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
BASE='http://127.0.0.1:8769/'
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [390,768,1440]:
  context=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce')
  external=[];errors=[];bad=[]
  def route(r):
   if r.request.url.startswith(BASE):return r.continue_()
   external.append(r.request.url);r.fulfill(status=204,body='')
  context.route('**/*',route)
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('response',lambda r:bad.append(r.url) if r.status>=400 else None)
  page.goto(BASE);page.locator('[data-public-explore]').first.wait_for()
  panel=page.locator('[data-public-collection-panel]');cards=page.locator('[data-public-explore]');books=page.locator('[data-public-book]')
  assert cards.count()==3 and not panel.is_visible() and books.count()==0
  nav=page.locator('[data-nav] a[href="#colecoes"]')
  if not nav.is_visible():page.locator('[data-menu-button]').click()
  nav.click();page.wait_for_timeout(1400)
  page.screenshot(path=str(ROOT/f'navigation-{width}-selection.png'))
  def position(selector):
   page.wait_for_timeout(1000)
   box=page.locator(selector).bounding_box();head=page.locator('[data-header]').bounding_box()
   assert head['y']+head['height']-2<=box['y']<900,(width,selector,box,head)
   assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
  def selected(cid,count):
   assert panel.is_visible() and books.count()==count
   assert cards.count()==3 and all(cards.nth(i).is_visible() for i in range(3))
   assert page.locator('[data-public-explore][aria-expanded=true]').count()==1
   assert page.locator('[data-public-explore][aria-expanded=true]').get_attribute('data-public-explore')==cid
   assert page.locator('[name=collection]').input_value()==cid
   for name in ['search','grade','volume','audience']:assert page.locator(f'[name={name}]').input_value()==''
   position('#livros-das-colecoes')
  decoded=0
  for cid,count in [('raizes-crescer',16),('avalia-mais',36),('indigena-afro-brasileira',18)]:
   card=page.locator(f'[data-public-explore="{cid}"]');card.focus();card.press('Enter')
   selected(cid,count)
   sizes=page.locator('[data-public-books-grid] img').evaluate_all('''async imgs=>{await Promise.all(imgs.map(i=>{i.loading='eager';return i.decode()}));return imgs.map(i=>({w:i.naturalWidth,fit:getComputedStyle(i).objectFit,inside:i.getBoundingClientRect().height<=i.parentElement.getBoundingClientRect().height+1}))}''')
   assert all(i['w']==600 and i['fit']=='contain' and i['inside'] for i in sizes);decoded+=len(sizes)
   page.locator('[name=search]').fill('nenhum-livro-com-esse-nome');assert books.count()==0
   page.locator('[data-public-catalog-filters] button[type=reset]').click();assert books.count()==count
   assert page.locator('[name=collection]').input_value()==cid
   # Repeated selection resets filters without collapsing or mixing collections.
   page.locator('[name=audience]').select_option('teacher');card.click();selected(cid,count)
  assert decoded==70
  page.locator('[name=volume]').select_option('single');page.locator('[name=audience]').select_option('teacher');page.locator('[name=search]').fill('indigena');assert books.count()==9
  # Select switch must clear incompatible volume, audience, grade and search.
  page.locator('[name=grade]').select_option('fundamental:9')
  page.locator('[name=collection]').select_option('raizes-crescer');selected('raizes-crescer',16)
  assert page.locator('[name=volume] option[value=single]').count()==0
  page.locator('[name=grade]').select_option('infantil:2');page.locator('[name=volume]').select_option('1');page.locator('[name=audience]').select_option('teacher');assert books.count()==1
  trigger=books.first;trigger.focus();trigger.press('Enter');dialog=page.locator('[data-public-book-dialog]');assert dialog.is_visible()
  for _ in range(5):
   page.keyboard.press('Tab');assert dialog.evaluate('(d)=>d.contains(document.activeElement)')
  page.keyboard.press('Shift+Tab');assert dialog.evaluate('(d)=>d.contains(document.activeElement)')
  assert dialog.locator('a').get_attribute('href')=='login.html?next=biblioteca.html'
  page.keyboard.press('Escape');assert not dialog.is_visible() and trigger.evaluate('(b)=>b===document.activeElement')
  page.locator('[data-public-back]').last.focus();page.locator('[data-public-back]').last.press('Enter')
  assert not panel.is_visible() and books.count()==0 and page.locator('[data-public-explore][aria-expanded=true]').count()==0
  page.wait_for_timeout(1000)
  assert page.locator('#collections-title').evaluate('(h)=>h===document.activeElement');position('#collections-title')
  cards.first.press('Space');selected('raizes-crescer',16)
  page.screenshot(path=str(ROOT/f'navigation-{width}-open.png'))
  page.locator('[data-public-back]').first.click();assert not panel.is_visible();position('#collections-title')
  # Existing homepage sections remain accessible.
  for sid in ['ecossistema','video-institucional','plataforma','universidade','avalia','resultados','contato']:
   section=page.locator('#'+sid);assert section.is_visible();section.scroll_into_view_if_needed()
   assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
  assert not errors and not bad,(errors,bad)
  results.append({'width':width,'initiallyCollapsed':True,'threeSelectorsRemainAvailable':True,'collectionCounts':[16,36,18],'coversDecoded':decoded,'switchResetsFilters':True,'repeatSelection':True,'resetPreservesCollection':True,'returnFocusAndHeaderOffset':True,'keyboardAndModal':True,'homeSectionsVisible':True,'horizontalOverflow':False,'pageErrors':errors,'httpErrors':bad,'externalRequestsStubbed':sorted(set(external))})
  context.close()
 browser.close()
(ROOT/'navigation-results.json').write_text(json.dumps(results,indent=2,ensure_ascii=False)+'\n')
print(json.dumps(results,indent=2,ensure_ascii=False))
