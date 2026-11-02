"""Validate the public-only projection. Release check requires all 70 official books."""
import json, re, sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[2]
data=json.loads((root/'assets/colecoes/catalogo-oficial.json').read_text())
assert set(data)=={'version','collections','books'} and data['version']==1
expected={'raizes-crescer':16,'avalia-mais':36,'indigena-afro-brasileira':18}
assert {c['id'] for c in data['collections']}==set(expected)
for collection in data['collections']:
 assert set(collection)=={'id','title','stage','range','description'}
 assert collection['stage'] in ['infantil','fundamental']
if not data['books'] and '--allow-pending' in sys.argv:
 print('PENDING: 0 books; official covers and summaries have not been integrated. Not ready for release.')
 sys.exit(0)
assert len(data['books'])==70,'Expected all 70 official books before release'
ids=set();combinations=set();counts={key:0 for key in expected}
for b in data['books']:
 assert set(b)=={'id','collectionId','title','grade','volume','audience','summary','cover'}, 'Do not expose private provenance or original URLs'
 assert b['id'] not in ids and b['id'];ids.add(b['id'])
 assert b['collectionId'] in expected
 assert b['audience'] in ['student','teacher']
 assert b['volume'] in ([''] if b['collectionId']=='indigena-afro-brasileira' else ['1','2'])
 assert isinstance(b['grade'],int) and b['grade'] in (range(2,6) if b['collectionId']=='raizes-crescer' else range(1,10))
 key=(b['collectionId'],b['grade'],b['volume'],b['audience']);assert key not in combinations;combinations.add(key)
 assert b['title'].strip() and b['summary'].strip()
 assert not re.search(r'https?://|<[^>]+>',b['summary']), 'Summary must be plain public text'
 assert set(b['cover'])=={'src','width','height'}
 assert re.fullmatch(r'assets/(?:[a-zA-Z0-9_-]+/)*[a-zA-Z0-9_.-]+\.(?:webp|png|jpe?g)',b['cover']['src'])
 with Image.open(root/b['cover']['src']) as img:
  assert img.size==(b['cover']['width'],b['cover']['height']), b['id']
 counts[b['collectionId']]+=1
assert counts==expected,counts
print(json.dumps({'status':'PASS','books':70,'counts':counts,'dimensionsVerified':True,'privateFieldsExcluded':True}))
