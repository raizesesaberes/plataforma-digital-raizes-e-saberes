from database import sql,rpc,literal
from pathlib import Path
import json,subprocess
proposal=Path('supabase/review/banco_completo_catalog.sql').read_text()
admin='00000000-0000-0000-0000-000000000003'
teacher='00000000-0000-0000-0000-000000000001'
school='10000000-0000-0000-0000-000000000001'
sql("update public.profiles set platform_role='admin' where id='"+admin+"'",role='postgres')
# Snapshot complete rows only in the disposable fixture; no production data.
tables=['contracts','contract_products','tenant_product_entitlements','tenant_product_content_modules','contract_entitlement_events','schools','profiles','content_items','product_collections']
def frozen():return {t:sql(f"select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]') from public.{t} r",role='postgres') for t in tables}
def access():
 ctx=literal(json.dumps({'school_id':school,'content_type':'QUESTION'}))+'::jsonb'
 return [sql('select '+fn+'('+ctx+')',actor=teacher,role='postgres') for fn in ['public.content_resolve_for_user','school_category_private.legacy_resolver']]
def security():return sql("select jsonb_build_object('functions',(select jsonb_agg(jsonb_build_object('id',oid,'body',md5(prosrc),'acl',proacl::text,'definer',prosecdef,'config',proconfig) order by oid) from pg_proc where pronamespace in ('public'::regnamespace,'school_category_private'::regnamespace,'contract_operations_private'::regnamespace)),'tables',(select jsonb_agg(jsonb_build_object('id',oid,'acl',relacl::text,'rls',relrowsecurity) order by oid) from pg_class where relnamespace='public'::regnamespace),'policies',(select jsonb_agg(to_jsonb(p) order by oid) from pg_policy p))",role='postgres')
security_before=security()
before=frozen();oldaccess=access();oldproducts=sql('select jsonb_agg(to_jsonb(p) order by id) from public.products p',role='postgres');oldlinks=sql('select jsonb_agg(to_jsonb(p) order by product_id,content_module_id) from public.product_content_modules p',role='postgres')
sql(proposal,role='postgres')
assert frozen()==before;assert access()==oldaccess;assert security()==security_before
pid=sql("select id from public.products where code='RS_BANCO_COMPLETO'",role='postgres')
assert sql(f"select jsonb_agg(to_jsonb(p) order by id) from public.products p where id<>'{pid}'",role='postgres')==oldproducts
assert sql(f"select jsonb_agg(to_jsonb(p) order by product_id,content_module_id) from public.product_content_modules p where product_id<>'{pid}'",role='postgres')==oldlinks
assert sql(f"select count(*) from public.tenant_product_entitlements where product_id='{pid}'",role='postgres')=='0'
assert sql(f"select count(*) from public.contract_products where product_id='{pid}'",role='postgres')=='0'
print('PASS no grant/contract/content/school/profile changes; old product/links exact; canonical and legacy access parity; new product zero rights')
cat=rpc('admin_get_contract_operations',[],actor=admin,role='postgres')
p=next(p for p in cat['products'] if p['id']==pid)
assert len(p['modules'])==7
assert sum(len([g for g in cat['taxonomy'] if g['institutional']==(t=='TRAINING')]) for m in p['modules'] for t in m['content_types'])==145
Path('/tmp/banco-completo-synthetic-catalog.json').write_text(json.dumps(cat))
subprocess.run(['node','tests/contracts/catalog-ui.mjs',pid],check=True)
def catalog_state():return sql("select jsonb_build_object('products',(select jsonb_agg(to_jsonb(p) order by id) from public.products p),'modules',(select jsonb_agg(to_jsonb(m) order by id) from public.content_modules m),'links',(select jsonb_agg(to_jsonb(p) order by product_id,content_module_id) from public.product_content_modules p))",role='postgres')
state=catalog_state();sql(proposal,role='postgres');assert catalog_state()==state;assert frozen()==before
assert security()==security_before
print('PASS unchanged function definitions/ACLs/RLS/policies')
print('PASS idempotent replay: same IDs, timestamps, associations; no rights')
sql("update public.products set name='COLLISION' where id='"+pid+"'",role='postgres');sql(proposal,role='postgres',error='CATALOG_PRODUCT_COLLISION');sql("update public.products set name='Raízes e Saberes — Banco Completo' where id='"+pid+"'",role='postgres')
sql("update public.content_modules set status='inactive' where code='VIDEOS'",role='postgres');sql(proposal,role='postgres',error='CATALOG_MODULE_REVIEW_REQUIRED');sql("update public.content_modules set status='active' where code='VIDEOS'",role='postgres')
sql("update public.content_modules set name='COLLISION' where code='UNIVERSIDADE_CAPACITACAO'",role='postgres');sql(proposal,role='postgres',error='CATALOG_TRAINING_COLLISION')
assert frozen()==before
print('PASS product/training collision and inactive required module fail closed; no rights mutation')
