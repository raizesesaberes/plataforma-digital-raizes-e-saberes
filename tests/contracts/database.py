from zoneinfo import ZoneInfo
"""Executable integration tests: canonical schema + real local Postgres functions."""
import json, subprocess, uuid, datetime, copy, os
CONTAINER=os.environ.get("RS_CONTRACT_TEST_CONTAINER", "rs-contract-db")
if CONTAINER != "rs-contract-db":
    assert CONTAINER.startswith("rs-fase3-"), "Only disposable integration containers accepted"
    label=subprocess.check_output(["docker","inspect","--format",'{{index .Config.Labels "rs.fase3"}}',CONTAINER],text=True).strip()
    assert label == "synthetic", "Synthetic Docker label required"
ADMIN='10000000-0000-4000-8000-000000000001'
USER='10000000-0000-4000-8000-000000000002'
A='20000000-0000-4000-8000-000000000001'; B='20000000-0000-4000-8000-000000000002'; C='20000000-0000-4000-8000-000000000003'
P='30000000-0000-4000-8000-000000000001'; M='40000000-0000-4000-8000-000000000001'
def literal(v): return "'"+str(v).replace("'","''")+"'"
def sql(query, actor=ADMIN, role='authenticated', error=None, question_bank_role=None):
    claims=json.dumps({'sub':actor,'role':'authenticated','app_metadata':{'platform_role':'admin' if actor==ADMIN else 'professor'}})
    if question_bank_role:
        payload=json.loads(claims);payload['app_metadata']['question_bank_role']=question_bank_role;claims=json.dumps(payload)
    cmd=f"set request.jwt.claim.sub={literal(actor)};set request.jwt.claims={literal(claims)};set role {role};\n"+query
    p=subprocess.run(['docker','exec','-i',CONTAINER,'psql','-XAtq','-U','postgres','-v','ON_ERROR_STOP=1'],input=cmd,text=True,capture_output=True)
    if error:
        assert p.returncode and error in p.stderr,(error,p.stdout,p.stderr);return
    assert not p.returncode,p.stderr
    return p.stdout.strip()
def rpc(name,args,**kw):
    values=','.join(literal(json.dumps(v))+'::jsonb' if isinstance(v,dict) else literal(v)+'::uuid' for v in args)
    s=sql('select public.'+name+'('+values+');',**kw)
    return json.loads(s) if s else None
def assert_eq(a,b):assert a==b,(a,b)
def main():
    today=datetime.datetime.now(ZoneInfo('America/Sao_Paulo')).date();date=lambda d:(today+datetime.timedelta(days=d)).isoformat()
    cat=rpc('admin_get_contract_operations',[])
    g=next(t for t in cat['taxonomy'] if t['grade_code']=='1_ANO')['grade_id']
    gi=next(t for t in cat['taxonomy'] if t['institutional'])['grade_id']
    base={'action':'CREATE','reference':'SYN Contract A','starts_at':date(0),'ends_at':date(30),'network_id':None,'new_network':{'name':'Contratante sintético','code':'SYN_CONTRACTOR'},'school_ids':[A,B],'new_school':None,'renewal_id':None,'reason':'Teste de contrato local','adopt_dynamic':True,'products':[{'product_id':P,'institutional':False,'rules':[{'module_id':M,'content_type':'VIDEO','grade_id':g,'subject_id':None,'kind':'STANDARD'}]}]}
    rpc('admin_get_contract_operations',[],actor=USER,error='SCHOOL_CONTENT_ADMIN_REQUIRED')
    rpc('admin_get_contract_operations',[],role='anon',error='permission denied')
    sql('select * from contract_operations_private.targets;',error='permission denied')
    print('PASS ACL admin / non-admin / anon / private tables')
    for mutate,err in [(lambda c:c.update(school_ids=[A,A]),'DUPLICATE_SCHOOLS'),(lambda c:c.update(school_ids=[]),'EXPLICIT_SCHOOL_SELECTION_REQUIRED'),(lambda c:c.update(ends_at=date(-1)),'VALID_FINITE_WINDOW_REQUIRED'),(lambda c:c.update(adopt_dynamic=False),'EXPLICIT_DYNAMIC_ADOPTION_REQUIRED'),(lambda c:c['products'][0]['rules'][0].update(grade_id=gi,content_type='TRAINING'),'SEPARATE_INSTITUTIONAL_AUTHORIZATION_REQUIRED'),(lambda c:c.update(new_school={'name':'Escola Sintética A','code':'SYN_D','year':'2026'}),'DUPLICATE_SCHOOL_USE_EXISTING')]:
        bad=copy.deepcopy(base);mutate(bad);rpc('admin_preview_contract_operation',[bad],error=err)
    print('PASS duplicate schools / no targets / date / explicit adoption / institutional / duplicate new school')
    before=sql('select count(*) from public.contracts',role='postgres');review=rpc('admin_preview_contract_operation',[base]);assert_eq(sql('select count(*) from public.contracts',role='postgres'),before)
    rid=str(uuid.uuid4());receipt=rpc('admin_confirm_contract_operation',[review,rid]);cid=receipt['contract_id'];assert_eq(rpc('admin_confirm_contract_operation',[review,rid]),receipt)
    changed=copy.deepcopy(review);changed['config']['reference']='different';rpc('admin_confirm_contract_operation',[changed,rid],error='REQUEST_ID_REUSED')
    assert_eq(sql(f"select count(*) from contract_operations_private.targets where contract_id='{cid}'",role='postgres'),'2')
    assert_eq(sql('select count(*) from public.network_school_memberships',role='postgres'),'0')
    assert_eq(sql(f"select status from public.schools where id='{B}'",role='postgres'),'inactive')
    assert_eq(sql(f"select school_category_private.school_contract('{A}','{cid}')",role='postgres'),'t')
    assert_eq(sql(f"select school_category_private.school_contract('{B}','{cid}')",role='postgres'),'f')
    assert_eq(sql(f"select school_category_private.school_contract('{C}','{cid}')",role='postgres'),'f')
    print('PASS atomic contract + two schools / idempotent receipt / no network expansion / inactive school denied')
    renewal=copy.deepcopy(base);renewal.update(reference='SYN Renewal',renewal_id=cid,new_network=None,starts_at=date(31),ends_at=date(60));renewal['products'][0]['rules'][0]['content_type']='BOOK'
    old=sql(f"select row_to_json(c) from public.contracts c where id='{cid}'",role='postgres')
    rev=rpc('admin_preview_contract_operation',[renewal]);new=rpc('admin_confirm_contract_operation',[rev,str(uuid.uuid4())])['contract_id']
    assert_eq(sql(f"select row_to_json(c) from public.contracts c where id='{cid}'",role='postgres'),old)
    assert_eq(sql(f"select school_category_private.school_contract('{A}','{cid}')",role='postgres'),'t');assert_eq(sql(f"select school_category_private.school_contract('{A}','{new}')",role='postgres'),'f')
    rpc('admin_preview_contract_operation',[renewal],error='RENEWAL_ALREADY_SCHEDULED')
    print('PASS future renewal preserves current contract byte-for-byte / duplicate renewal rejected')
    cancel=rpc('admin_preview_contract_operation',[{'action':'REVOKE','contract_id':new,'reason':'Cancelar renovação futura'}]);rpc('admin_confirm_contract_operation',[cancel,str(uuid.uuid4())]);assert_eq(sql(f"select school_category_private.school_contract('{A}','{cid}')",role='postgres'),'t')
    # New school and contractor creation participate in the transaction and use canonical RPC.
    fresh=copy.deepcopy(base);fresh.update(reference='SYN Future C',school_ids=[C],new_network={'name':'Outro contratante sintético','code':'SYN_OTHER'},starts_at=date(10),ends_at=date(20),new_school={'name':'Nova escola sintética','code':'SYN_NEW','year':'2026','municipality':'Cidade sintética','state':'SP'})
    prev=rpc('admin_preview_contract_operation',[fresh]);sql(f"update public.schools set nome='Escola Sintética C atualizada' where id='{C}'",role='postgres');rpc('admin_confirm_contract_operation',[prev,str(uuid.uuid4())],error='STALE_CONTRACT_REVIEW')
    fresh_receipt=rpc('admin_confirm_contract_operation',[rpc('admin_preview_contract_operation',[fresh]),str(uuid.uuid4())]);assert fresh_receipt['new_school']['school_id']
    assert_eq(sql(f"select contract_operations_private.adopted('{C}')",role='postgres'),'f')
    assert_eq(sql("select count(*) from public.rs_school_installations where school_code='SYN_NEW' and deployment_mode='test' and current_stage='em_configuracao'",role='postgres'),'1')
    print('PASS stale review / canonical new school / future adoption does not alter legacy today')
    cancel=rpc('admin_preview_contract_operation',[{'action':'REVOKE','contract_id':cid,'reason':'Revogar contrato sintético'}]);rpc('admin_confirm_contract_operation',[cancel,str(uuid.uuid4())]);assert_eq(sql(f"select school_category_private.school_contract('{A}','{cid}')",role='postgres'),'f');assert_eq(sql(f"select contract_operations_private.adopted('{A}')",role='postgres'),'t')
    print('PASS revocation is immediate and cannot resurrect legacy grants')
    print('ALL DATABASE TESTS PASSED')
if __name__=='__main__':main()
