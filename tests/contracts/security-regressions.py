"""Regression scenarios from independent review, against the real synthetic DB.
Run --reproduce on c4995e5 before applying fixes. No remote URLs are accepted.
"""
from database import *
import sys
reproduce = '--reproduce' in sys.argv
cat = rpc('admin_get_contract_operations', [])
grade = next(t for t in cat['taxonomy'] if t['grade_code'] == '1_ANO')['grade_id']
today = datetime.datetime.now(ZoneInfo('America/Sao_Paulo')).date()
date = lambda offset: (today + datetime.timedelta(days=offset)).isoformat()
tag = 'REVIEW_' + uuid.uuid4().hex[:8]
def create(label):
    reference = tag + '_' + label
    cfg = {'action':'CREATE','reference':reference,'starts_at':date(0),'ends_at':date(30),
           'new_network':{'name':reference,'code':reference},'school_ids':[A],
           'reason':'Regressão sintética de segurança','adopt_dynamic':True,
           'products':[{'product_id':P,'institutional':False,'rules':[
               {'module_id':M,'content_type':'VIDEO','grade_id':grade,'subject_id':None,'kind':'STANDARD'}]}]}
    receipt = rpc('admin_confirm_contract_operation',[rpc('admin_preview_contract_operation',[cfg]),str(uuid.uuid4())])
    return cfg, receipt['contract_id']

# R1: source entitlement remains ACTIVE while its contract-product license is inactive.
cfg, old = create('SUSPENDED_LICENSE')
sql(f"update public.contract_products set status='inactive' where contract_id='{old}'",role='postgres')
renew = copy.deepcopy(cfg)
renew.update(reference=tag+'_RENEWAL',renewal_id=old,new_network=None,reuse_previous=True,starts_at=date(31),ends_at=date(61))
if reproduce:
    successor = rpc('admin_confirm_contract_operation',[rpc('admin_preview_contract_operation',[renew]),str(uuid.uuid4())])['contract_id']
    assert_eq(sql(f"select status from public.contract_products where contract_id='{successor}'",role='postgres'),'active')
    print('REPRODUCED R1: inactive prior contract-product recreated active by automatic renewal')
else:
    rpc('admin_preview_contract_operation',[renew],error='INACTIVE_PREVIOUS_PRODUCT_REQUIRES_SEPARATE_REVIEW')
    renew['reuse_previous'] = False
    rpc('admin_preview_contract_operation',[renew],error='INACTIVE_PREVIOUS_PRODUCT_REQUIRES_SEPARATE_REVIEW')
    assert_eq(sql(f"select count(*) from public.contracts where metadata->>'renewal_of'='{old}'",role='postgres'),'0')
    assert_eq(sql(f"select status from public.contract_products where contract_id='{old}'",role='postgres'),'inactive')
    print('PASS R1: automatic and edited renewal cannot reactivate an inactive prior license')

for dependency, expected_error in [('contract_product','PRODUCT_NOT_IN_CONTRACT'),('beneficiary_tenant','ENTITLEMENT_TENANT_OUT_OF_CONTRACT_SCOPE'),('contract','OPERATIONAL_ACTIVE_CONTRACT_REQUIRED')]:
    cfg, cid = create('REVOKE_' + dependency.upper())
    # Obtain review while valid, then dependency change must also invalidate it.
    revoke = {'action':'REVOKE','contract_id':cid,'reason':'Revogar apesar da dependência inativa'}
    before_review = rpc('admin_preview_contract_operation',[revoke])
    if dependency == 'contract_product':
        sql(f"update public.contract_products set status='inactive' where contract_id='{cid}'",role='postgres')
    elif dependency == 'beneficiary_tenant':
        sql(f"update public.tenants set status='inactive' where school_id='{A}'",role='postgres')
    else:
        sql(f"update public.contracts set status='SUSPENDED' where id='{cid}'",role='postgres')
    try:
        if reproduce:
            if dependency == 'contract':
                rpc('admin_preview_contract_operation',[revoke],error=expected_error)
            else:
                review = rpc('admin_preview_contract_operation',[revoke])
                rpc('admin_confirm_contract_operation',[review,str(uuid.uuid4())],error=expected_error)
            print('REPRODUCED R2: revocation blocked with inactive dependency: '+dependency)
        else:
            rpc('admin_confirm_contract_operation',[before_review,str(uuid.uuid4())],error='STALE_CONTRACT_REVIEW')
            # A revoked-status write must not smuggle changes to the license scope.
            if dependency in ('contract_product','beneficiary_tenant'):
                sql(f"update public.tenant_product_entitlements set status='REVOKED',ends_at=ends_at+1 where contract_id='{cid}'",role='postgres',error=expected_error)
            review = rpc('admin_preview_contract_operation',[revoke])
            rid = str(uuid.uuid4())
            receipt = rpc('admin_confirm_contract_operation',[review,rid])
            assert_eq(rpc('admin_confirm_contract_operation',[review,rid]),receipt)
            assert_eq(sql(f"select status from public.contracts where id='{cid}'",role='postgres'),'CANCELLED')
            assert_eq(sql(f"select count(*) from public.tenant_product_entitlements where contract_id='{cid}' and status<>'REVOKED'",role='postgres'),'0')
            assert_eq(sql(f"select school_category_private.school_contract('{A}','{cid}')",role='postgres'),'f')
            assert_eq(sql(f"select contract_operations_private.adopted('{A}')",role='postgres'),'t')
            print('PASS R2: stale review rejected; pure revocation succeeds, replays and stays fail-closed: '+dependency)
    finally:
        if dependency == 'beneficiary_tenant':
            sql(f"update public.tenants set status='active' where school_id='{A}'",role='postgres')
