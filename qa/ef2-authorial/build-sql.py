"""Generate review SQL only. No connection or migration version generation."""
import json, pathlib, uuid, hashlib
ROOT=pathlib.Path(__file__).resolve().parents[2]
HERE=pathlib.Path(__file__).resolve().parent
rows=json.loads((HERE/'proposed-bindings.json').read_text())['rows']
compact=[dict(id=r['question_id'],code=r['code'],revision=r['expected_question_revision'],content_id=r['proposed_content_item_id'],subject_id=r['classification']['subject_id']) for r in rows]
manifest=json.dumps(compact,separators=(',',':'),ensure_ascii=False)
template=(HERE/'batch-template.sql').read_text()
for key,val in {'MANIFEST':manifest,'MANIFEST_SHA':hashlib.sha256(manifest.encode()).hexdigest(),**{x:str(uuid.uuid5(uuid.NAMESPACE_URL,'raizesesaberes:ef2-202-authorial-20261012:'+x)) for x in ['LICENSE','SOURCE','RECEIPT']}}.items():
 template=template.replace('@'+key+'@',val)
(ROOT/'supabase/review/ef2_authorial_catalog.sql').write_text(template)
print('Generated review SQL for',len(compact),'existing question IDs')
