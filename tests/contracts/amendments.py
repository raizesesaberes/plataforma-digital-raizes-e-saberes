from database import *
from concurrent.futures import ThreadPoolExecutor
cat=rpc('admin_get_contract_operations',[])
gi=next(x['grade_id'] for x in cat['taxonomy'] if x['institutional'])
grades=[x['grade_id'] for x in cat['taxonomy'] if not x['institutional']]
assert len(grades)==16
# Fixtures: school-owned operational contract, inactive school, nine school types.
types=['QUESTION','VIDEO','BOOK','BOOK_PAGE','GAME','INTERACTION','ACTIVITY','ASSESSMENT_TEMPLATE','PRINTABLE']
sql("update public.content_modules set content_types=array["+','.join(literal(x) for x in types)+"]::public.rs_content_type[] where id="+literal(M),role='postgres')
MT='40000000-0000-4000-8000-000000000099'
sql(f"insert into public.content_modules(id,code,name,content_types) values('{MT}','SYN_TRAINING','University',array['TRAINING']::public.rs_content_type[]);insert into public.product_content_modules(product_id,content_module_id) values('{P}','{MT}')",role='postgres')
rules=[dict(module_id=M,content_type=t,grade_id=g,subject_id=None,kind='STANDARD') for t in types for g in grades]
today=datetime.datetime.now(ZoneInfo('America/Sao_Paulo')).date();cid=str(uuid.uuid4());tid=str(uuid.uuid4());other=str(uuid.uuid4())
sql(f"insert into public.tenants(id,tenant_type,school_id) values('{tid}','SCHOOL','{B}');insert into public.contracts(id,tenant_id,contract_ref,starts_at,ends_at,status,metadata) values('{cid}','{tid}','AMEND SYN','{today}','{today+datetime.timedelta(days=364)}','ACTIVE','{{\"source\":\"contract_operations_v1\"}}');insert into contract_operations_private.targets(contract_id,school_id,adoption_on) values('{cid}','{B}','{today}');",role='postgres')
def untouched():
 return sql("select jsonb_build_object('auth',(select jsonb_agg(to_jsonb(x) order by id) from auth.users x),'profiles',(select jsonb_agg(to_jsonb(x) order by id) from public.profiles x),'exceptions',(select jsonb_agg(to_jsonb(x)) from public.content_access_exceptions x),'other_contracts',(select jsonb_agg(to_jsonb(x) order by id) from public.contracts x where id<>"+literal(cid)+"),'other_entitlements',(select jsonb_agg(to_jsonb(x) order by id) from public.tenant_product_entitlements x where contract_id<>"+literal(cid)+"))",role='postgres')
unchanged=untouched()
assert sql("select md5(replace(prosrc, '>512', '>128')) from pg_proc where oid='school_category_private.normalize_config(jsonb)'::regprocedure",role='postgres')=='8d9dac331aa69445a0b2525543c7d741'
assert sql("select proacl::text from pg_proc where oid='school_category_private.normalize_config(jsonb)'::regprocedure",role='postgres')=='{postgres=X/postgres}'
base=dict(action='AMEND',contract_id=cid,school_ids=[B],reason='Synthetic amendment',products=[dict(product_id=P,institutional=False,rules=rules)])
def snapshot():return sql(f"select contract_operations_private.amendment_state('{cid}')",role='postgres')
contract=sql(f"select to_jsonb(c) from public.contracts c where id='{cid}'",role='postgres')
before=snapshot();preview=rpc('admin_preview_contract_amendment',[base]);assert before==snapshot()
rid=str(uuid.uuid4());receipt=rpc('admin_confirm_contract_amendment',[preview,rid]);assert receipt['action']=='AMEND';assert rpc('admin_confirm_contract_amendment',[preview,rid])==receipt
assert sql(f"select to_jsonb(c) from public.contracts c where id='{cid}'",role='postgres')==contract
# Add institution and remove redundant product in the same transaction.
sql(f"insert into public.products(id,code,name,status) values('{other}','SYN_REDUNDANT','Redundant','ACTIVE');insert into public.product_content_modules(product_id,content_module_id) values('{other}','{M}')",role='postgres')
both=copy.deepcopy(base);both['products'].append(dict(product_id=other,institutional=False,rules=[rules[0]]));r=rpc('admin_preview_contract_amendment',[both]);rpc('admin_confirm_contract_amendment',[r,str(uuid.uuid4())])
expanded=copy.deepcopy(base);expanded['products'][0]['institutional']=True;expanded['products'][0]['rules'].append(dict(module_id=MT,content_type='TRAINING',grade_id=gi,subject_id=None,kind='STANDARD'))
r=rpc('admin_preview_contract_amendment',[expanded]);assert len(r['added_rules'])==1 and len(r['removed_rules'])==1 and r['removed_products']==[other]
key=str(uuid.uuid4());before=snapshot()
# Force a failure after writes begin; all license/entitlement changes must roll back.
sql("create function public.synthetic_amend_failure() returns trigger language plpgsql as $$begin if new.event_type='CONTRACT_AMENDED' then raise exception 'SYN_FAILURE';end if;return new;end$$;create trigger synthetic_amend_failure before insert on public.contract_entitlement_events for each row execute function public.synthetic_amend_failure();",role='postgres')
rpc('admin_confirm_contract_amendment',[r,key],error='SYN_FAILURE');assert snapshot()==before
sql('drop trigger synthetic_amend_failure on public.contract_entitlement_events;drop function public.synthetic_amend_failure()',role='postgres')
receipt=rpc('admin_confirm_contract_amendment',[r,key]);assert rpc('admin_confirm_contract_amendment',[r,key])==receipt
assert sql(f"select jsonb_array_length(metadata->'category_rules') from public.tenant_product_entitlements where contract_id='{cid}' and product_id='{P}'",role='postgres')=='145'
assert sql(f"select status from public.contract_products where contract_id='{cid}' and product_id='{other}'",role='postgres')=='inactive'
assert sql(f"select status from public.tenant_product_entitlements where contract_id='{cid}' and product_id='{other}'",role='postgres')=='SUSPENDED'
assert sql(f"select status from public.schools where id='{B}'",role='postgres')=='inactive'
assert sql(f"select to_jsonb(c) from public.contracts c where id='{cid}'",role='postgres')==contract
assert any(m['module_id']==MT and m['before']==False and m['after']==True for m in r['module_changes'])
assert sql(f"select tm.enabled from public.tenant_product_content_modules tm join public.tenant_product_entitlements e on e.id=tm.entitlement_id where e.contract_id='{cid}' and tm.content_module_id='{MT}'",role='postgres')=='t'
assert r['module_changes'] and all('before' in m and 'after' in m for m in r['module_changes'])
sql(f"update public.schools set status='active' where id='{B}'",role='postgres')
rpc('admin_preview_school_content_categories',[dict(school_ids=[B],contract_id=cid,product_id=P,rules=expanded['products'][0]['rules'],reason='Existing editor 145',adopt_dynamic=True)])
sql(f"update public.schools set status='inactive' where id='{B}'",role='postgres')
bad=copy.deepcopy(r);bad['config']['reason']='Different payload';rpc('admin_confirm_contract_amendment',[bad,key],error='REQUEST_ID_REUSED')
# Same-key concurrent retry cannot duplicate audit; distinct stale reviews cannot both apply.
r=rpc('admin_preview_contract_amendment',[base]);key=str(uuid.uuid4())
def attempt():
 try:return rpc('admin_confirm_contract_amendment',[r,key])
 except AssertionError as e:assert 'CONTRACT_WRITE_BUSY' in str(e);return None
with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(lambda _:attempt(),range(2)))
assert any(results);rpc('admin_confirm_contract_amendment',[r,key]);assert sql(f"select count(*) from public.contract_entitlement_events where details->>'request_id'='{key}'",role='postgres')=='1'
rpc('admin_confirm_contract_amendment',[r,str(uuid.uuid4())],error='STALE_CONTRACT_REVIEW')
rpc('admin_confirm_contract_amendment',[r,str(uuid.uuid4())],actor=USER,error='SCHOOL_CONTENT_ADMIN_REQUIRED')
rpc('admin_preview_contract_amendment',[base],actor=USER,error='SCHOOL_CONTENT_ADMIN_REQUIRED');rpc('admin_preview_contract_amendment',[base],role='anon',error='permission denied')
wrong=copy.deepcopy(base);wrong['school_ids']=[A];rpc('admin_preview_contract_amendment',[wrong],error='EXACT_CONTRACT_SCHOOL_REQUIRED')
bad=copy.deepcopy(expanded);bad['products'][0]['institutional']=False;rpc('admin_preview_contract_amendment',[bad],error='SEPARATE_INSTITUTIONAL_AUTHORIZATION_REQUIRED')
# Existing category validator now accepts 144 rules when school is active, not a broadened license.
sql(f"update public.schools set status='active' where id='{B}'",role='postgres')
rpc('admin_preview_school_content_categories',[dict(school_ids=[B],contract_id=cid,product_id=P,rules=rules,reason='Existing editor 144',adopt_dynamic=True)])
sql(f"update public.schools set status='inactive' where id='{B}'",role='postgres')
rev=rpc('admin_preview_contract_operation',[dict(action='REVOKE',contract_id=cid,reason='Synthetic revocation')]);rpc('admin_confirm_contract_operation',[rev,str(uuid.uuid4())]);rpc('admin_preview_contract_amendment',[base],error='CURRENT_SINGLE_SCHOOL_CONTRACT_REQUIRED')
assert rpc('admin_confirm_contract_amendment',[r,key])['contract_id']==cid
assert sql(f"select status from public.contracts where id='{cid}'",role='postgres')=='CANCELLED'
assert untouched()==unchanged
print('PASS amendment 144/145 rules; add/remove product; dates and inactive status; rollback; replay; concurrency; stale review; admin ACL/school scope; institutional boundary; existing category limit; revocation and old receipt recovery')
