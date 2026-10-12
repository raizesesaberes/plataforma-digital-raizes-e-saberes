from database import *
from concurrent.futures import ThreadPoolExecutor
cat=rpc('admin_get_contract_operations',[]);g=next(t['grade_id'] for t in cat['taxonomy'] if not t['institutional'])
today=datetime.datetime.now(ZoneInfo('America/Sao_Paulo')).date()
rule=dict(module_id=M,content_type='QUESTION',grade_id=g,subject_id=None,kind='STANDARD')
base=dict(action='CREATE',contractor_type='SCHOOL',reference='Individual synthetic',starts_at=str(today),ends_at=str(today+datetime.timedelta(days=364)),school_ids=[B],new_school=None,network_id=None,new_network=None,reason='Explicit individual contract',adopt_dynamic=True,products=[dict(product_id=P,institutional=False,rules=[rule])])
counts=lambda:sql('select (select count(*) from public.education_networks)||\':\'||(select count(*) from public.network_school_memberships)||\':\'||(select count(*) from auth.users)',role='postgres')
before=counts();r=rpc('admin_preview_contract_operation',[base]);assert r['contractor']['name']=='Escola Sintética B';assert counts()==before
key=str(uuid.uuid4());receipt=rpc('admin_confirm_contract_operation',[r,key]);cid=receipt['contract_id'];assert rpc('admin_confirm_contract_operation',[r,key])==receipt
assert counts()==before
assert sql(f"select t.tenant_type||':'||t.school_id from public.contracts c join public.tenants t on t.id=c.tenant_id where c.id='{cid}'",role='postgres')=='SCHOOL:'+B
assert sql(f"select status from public.schools where id='{B}'",role='postgres')=='inactive'
assert rpc('admin_get_contract_operations',[])['contracts'][0]['tenant_school_id']==B
original=sql(f"select to_jsonb(c) from public.contracts c where id='{cid}'",role='postgres')
amend=dict(action='AMEND',contract_id=cid,school_ids=[B],reason='Amend created individual',products=copy.deepcopy(base['products']));amend['products'][0]['rules'].append(dict(rule,content_type='VIDEO'))
a=rpc('admin_preview_contract_amendment',[amend]);akey=str(uuid.uuid4());ar=rpc('admin_confirm_contract_amendment',[a,akey]);assert rpc('admin_confirm_contract_amendment',[a,akey])==ar
assert sql(f"select to_jsonb(c) from public.contracts c where id='{cid}'",role='postgres')==original
# Explicit type/scope/conflicting network, duplicate reference, and ACL boundaries.
for change,error in [({'school_ids':[A,B]},'SINGLE_SCHOOL_CONTRACT_REQUIRED'),({'contractor_type':''},'EXPLICIT_CONTRACTOR_TYPE_REQUIRED'),({'new_network':{'name':'Do not create','code':'NO'}},'SCHOOL_CONTRACT_HAS_NO_NETWORK'),({'reference':base['reference']},'DUPLICATE_CONTRACT_REFERENCE')]:
 bad=copy.deepcopy(base);bad.update(change);rpc('admin_preview_contract_operation',[bad],error=error)
rpc('admin_preview_contract_operation',[base],actor=USER,error='SCHOOL_CONTENT_ADMIN_REQUIRED');rpc('admin_preview_contract_operation',[base],role='anon',error='permission denied')
# New school is created atomically, inactive, and can immediately use the amendment API.
fresh=copy.deepcopy(base);fresh.update(reference='New individual synthetic',school_ids=[],new_school=dict(name='New Individual Synthetic',code='SYN_INDIVIDUAL',year='2026',municipality='Synthetic',state='SP'))
r=rpc('admin_preview_contract_operation',[fresh]);before=counts();key=str(uuid.uuid4())
def attempt():
 try:return rpc('admin_confirm_contract_operation',[r,key])
 except AssertionError as e:assert 'CONTRACT_WRITE_BUSY' in str(e);return None
with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(lambda _:attempt(),range(2)))
created=rpc('admin_confirm_contract_operation',[r,key]);sid=created['new_school']['school_id'];ncid=created['contract_id'];assert counts()==before
assert sql(f"select count(*) from public.tenants where school_id='{sid}'",role='postgres')=='1'
assert sql(f"select count(*) from public.contract_entitlement_events where details->>'request_id'='{key}'",role='postgres')=='1'
assert sql(f"select status from public.schools where id='{sid}'",role='postgres')=='inactive'
new_amend=copy.deepcopy(amend);new_amend.update(contract_id=ncid,school_ids=[sid]);rpc('admin_confirm_contract_amendment',[rpc('admin_preview_contract_amendment',[new_amend]),str(uuid.uuid4())])
# Existing school tenant reused; renewal preserves contractor and historical contract.
renew=copy.deepcopy(base);renew.update(reference='Individual renewal',renewal_id=cid,starts_at=str(today+datetime.timedelta(days=365)),ends_at=str(today+datetime.timedelta(days=729)))
rr=rpc('admin_preview_contract_operation',[renew]);renewed=rpc('admin_confirm_contract_operation',[rr,str(uuid.uuid4())]);assert sql(f"select to_jsonb(c) from public.contracts c where id='{cid}'",role='postgres')==original
bad=copy.deepcopy(renew);bad.update(contractor_type='NETWORK',renewal_id=ncid,school_ids=[sid]);rpc('admin_preview_contract_operation',[bad],error='RENEWAL_CONTRACTOR_MUST_BE_PRESERVED')
# Legacy omitted type stays NETWORK; explicit NETWORK remains NETWORK even with one school.
for index,explicit in enumerate([False,True]):
 network=copy.deepcopy(base);network.update(reference='Network synthetic '+str(index),school_ids=[A],new_network=dict(name='Synthetic network '+str(index),code='SYN_NET_'+str(index)))
 if explicit:network['contractor_type']='NETWORK'
 else:del network['contractor_type']
 nr=rpc('admin_confirm_contract_operation',[rpc('admin_preview_contract_operation',[network]),str(uuid.uuid4())]);assert sql(f"select t.tenant_type from public.contracts c join public.tenants t on t.id=c.tenant_id where c.id='{nr['contract_id']}'",role='postgres')=='NETWORK'
 bad=copy.deepcopy(amend);bad.update(contract_id=nr['contract_id'],school_ids=[A]);rpc('admin_preview_contract_amendment',[bad],error='CURRENT_SINGLE_SCHOOL_CONTRACT_REQUIRED')
print('PASS explicit SCHOOL existing/new school creation -> amendment; tenant reuse; inactive preserved; no network/Auth changes; replay/concurrency; scopes/ACL; renewal/history; explicit and legacy NETWORK preserved')
