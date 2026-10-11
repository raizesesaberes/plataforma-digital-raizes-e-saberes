"""R3/R4: real legacy question resolver, late network membership and successor states."""
from database import *
import sys
reproduce = '--reproduce' in sys.argv
tag=('SUCCESSION_'+uuid.uuid4().hex[:8]).upper()
P=str(uuid.uuid4())
today=datetime.datetime.now(ZoneInfo('America/Sao_Paulo')).date()
date=lambda n:(today+datetime.timedelta(days=n)).isoformat()
cat=rpc('admin_get_contract_operations',[])
g=next(t for t in cat['taxonomy'] if t['grade_code']=='1_ANO')
net,tenant,old,late,late_tenant,teacher_user,teacher,cls,license_id,source,qid,collection=[str(uuid.uuid4()) for _ in range(12)]
sql(f"""
insert into public.products(id,code,name,status) values('{P}','{tag}_PRODUCT','Produto de sucessão sintético','ACTIVE');
insert into public.product_content_modules(product_id,content_module_id) values('{P}','{M}');
insert into public.education_networks(id,name,code) values('{net}','{tag}','{tag}');
insert into public.tenants(id,tenant_type,network_id) values('{tenant}','NETWORK','{net}');
insert into public.network_school_memberships(network_id,school_id) values('{net}','{A}');
insert into public.contracts(id,tenant_id,contract_ref,starts_at,status) values('{old}','{tenant}','{tag}_OLD','{date(-10)}','ACTIVE');
insert into public.contract_products(contract_id,product_id,status,metadata) values('{old}','{P}','active','{{"authorized_grade_ids":["{g['grade_id']}"]}}');
insert into public.tenant_product_entitlements(contract_id,tenant_id,product_id,starts_at,status,grade_ids,metadata) values('{old}','{tenant}','{P}','{date(-10)}','ACTIVE',array['{g['grade_id']}']::uuid[],'{{"source":"synthetic_legacy"}}');
insert into public.content_feature_flags(flag_key,tenant_id,enabled) values('CONTENT_RESOLVER_QUESTIONS','{tenant}',true);
""",role='postgres')
renew={'action':'CREATE','reference':tag+'_NEW','renewal_id':old,'school_ids':[A],
       'starts_at':date(5),'ends_at':date(35),'reason':'Renovação sintética para regressão','adopt_dynamic':True,
       'products':[{'product_id':P,'institutional':False,'rules':[{'module_id':M,'content_type':'VIDEO','grade_id':g['grade_id'],'subject_id':None,'kind':'STANDARD'}]}]}
new=rpc('admin_confirm_contract_operation',[rpc('admin_preview_contract_operation',[renew]),str(uuid.uuid4())])['contract_id']
# Cancel before start: predecessor is still eligible now AND after the cancelled date arrives.
rev={'action':'REVOKE','contract_id':new,'reason':'Cancelamento antes do início sintético'}
rpc('admin_confirm_contract_operation',[rpc('admin_preview_contract_operation',[rev]),str(uuid.uuid4())])
sql(f"update public.contracts set starts_at='{date(0)}' where id='{new}';update contract_operations_private.targets set adoption_on='{date(0)}' where contract_id='{new}'",role='postgres')
assert_eq(sql(f"select school_category_private.school_contract('{A}','{old}')",role='postgres'),'t')
print('PASS R3 control: cancellation before start does not supersede predecessor')
renew['reference']=tag+'_LIVE_SUCCESSOR'
new=rpc('admin_confirm_contract_operation',[rpc('admin_preview_contract_operation',[renew]),str(uuid.uuid4())])['contract_id']
# This school joins AFTER successor confirmation, so it was absent from the target snapshot.
sql(f"""
insert into auth.users(id) values('{teacher_user}');
insert into public.profiles(id,platform_role,status) values('{teacher_user}','professor','active');
insert into public.schools(id,nome,codigo_inep,status) values('{late}','{tag}_LATE','{tag}_LATE','active');
-- Deliberately no SCHOOL tenant: late imported schools may not have one yet.
insert into public.network_school_memberships(network_id,school_id) values('{net}','{late}');
insert into public.teachers(id,school_id,profile_id,status) values('{teacher}','{late}','{teacher_user}','active');
insert into public.classes(id,school_id,nome,school_year,ano_escolar) values('{cls}','{late}','Turma sintética','1_ANO','1_ANO');
insert into public.class_teacher_memberships(class_id,teacher_id) values('{cls}','{teacher}');
insert into public.question_licenses(id,name,license_type,legal_notes,publication_allowed,allows_commercial_use) values('{license_id}','Licença sintética {tag}','TEST','Somente fixture local',true,true);
insert into public.question_sources(id,name,source_type,license_id,legal_status,curation_status) values('{source}','Fonte sintética {tag}','TEST','{license_id}','TEST','APROVADO');
insert into public.question_items(id,code,internal_title,component,stage,school_year,question_type,statement,source_id,author_name,license_id,legal_classification,curation_status,publication_status,published_at)
values('{qid}','{tag}_QUESTION','Questão sintética','Matemática','EF_INICIAIS','1_ANO','DISCURSIVA','Enunciado sintético','{source}','Autor sintético','{license_id}','ITEM_AUTORAL_RAIZES_SABERES_ALINHADO_SAEB','APROVADO','PUBLICADO',now());
""",role='postgres')
item=sql(f"select content_item_id from public.content_question_items where question_item_id='{qid}'",role='postgres')
if not item:
    item=str(uuid.uuid4())
    sql(f"insert into public.content_items(id,content_type,grade_id,segment_id,title,editorial_status,published_at) values('{item}','QUESTION','{g['grade_id']}','{g['segment_id']}','Questão sintética','PUBLISHED',now());insert into public.content_question_items(content_item_id,question_item_id) values('{item}','{qid}')",role='postgres')
sql(f"insert into public.content_collections(id,code,name,status) values('{collection}','{tag}_COLLECTION','Coleção sintética','active');insert into public.content_collection_items(collection_id,content_item_id) values('{collection}','{item}');insert into public.product_collections(product_id,collection_id) values('{P}','{collection}')",role='postgres')
context={'school_id':late,'class_id':cls,'content_type':'QUESTION'}
assert_eq(sql(f"select count(*) from contract_operations_private.targets where school_id='{late}'",role='postgres'),'0')
assert_eq(rpc('content_resolve_for_user',[context],actor=teacher_user)['total'],1)
print('PASS R4 control: real legacy question remains authorized before successor starts')
# Simulate reaching the activation boundary using synthetic records only.
sql(f"update public.contracts set starts_at='{date(0)}' where id='{new}';update contract_operations_private.targets set adoption_on='{date(0)}' where contract_id='{new}';update public.tenant_product_entitlements set starts_at='{date(0)}' where contract_id='{new}'",role='postgres')
assert_eq(sql(f"select school_category_private.school_contract('{A}','{old}')",role='postgres'),'f')
late_result=rpc('content_resolve_for_user',[context],actor=teacher_user)
if reproduce:
    assert_eq(late_result['total'],1)
    print('REPRODUCED R4: late network member receives predecessor question after successor activation')
else:
    assert_eq(late_result['total'],0)
    assert_eq(late_result['source'],'DYNAMIC_CATEGORY_V1')
    # Also deny through the legacy engine itself, independent of dispatch.
    direct=json.loads(sql('select school_category_private.legacy_resolver('+literal(json.dumps(context))+'::jsonb)',actor=teacher_user,role='postgres'))
    assert_eq(direct['total'],0)
    assert_eq(sql(f"select count(*) from public.question_items where id='{qid}'",actor=teacher_user),'0')
    rpc('content_get_category_item',[item,context],actor=teacher_user,error='CONTENT_ACCESS_DENIED')
    print('PASS R4: late member denied by dispatcher, legacy resolver, question RLS and item opener')
sql(f"update public.contracts set status='SUSPENDED' where id='{new}'",role='postgres')
old_eligible=sql(f"select school_category_private.school_contract('{A}','{old}')",role='postgres')
if reproduce:
    assert_eq(old_eligible,'t')
    print('REPRODUCED R3: suspending effective successor revives open-ended predecessor')
else:
    assert_eq(old_eligible,'f')
    assert_eq(rpc('content_resolve_for_user',[context],actor=teacher_user)['total'],0)
    sql(f"update public.contracts set status='ENDED' where id='{new}'",role='postgres')
    assert_eq(sql(f"select school_category_private.school_contract('{A}','{old}')",role='postgres'),'f')
    print('PASS R3: effective succession barrier survives SUSPENDED and ENDED successor states')

# Keep independent suites' catalog fixture unchanged.
sql(f"update public.products set status='SUSPENDED' where id='{P}'",role='postgres')
