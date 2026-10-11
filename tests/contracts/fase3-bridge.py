"""Operational contract RPCs govern NEW assessment assembly/publication; local labeled Docker only."""
from database import *
S='10000000-0000-0000-0000-000000000001'; CLASS='30000000-0000-0000-0000-000000000001'
TEACHER='00000000-0000-0000-0000-000000000001'; OTHER='00000000-0000-0000-0000-000000000004'
Q='70000000-0000-0000-0000-000000000001'
cat=rpc('admin_get_contract_operations',[])
g=next(t for t in cat['taxonomy'] if t['grade_code']=='5_ANO')['grade_id']
today=datetime.datetime.now(ZoneInfo('America/Sao_Paulo')).date()
cfg={'action':'CREATE','reference':'SYN INTEGRATION CONTRACT','starts_at':today.isoformat(),'ends_at':(today+datetime.timedelta(days=30)).isoformat(),'new_network':{'name':'Synthetic integration','code':'SYN_INTEGRATION'},'school_ids':[S],'reason':'Isolated contract assessment regression','adopt_dynamic':True,'products':[{'product_id':P,'institutional':False,'rules':[{'module_id':M,'content_type':'QUESTION','grade_id':g,'subject_id':None,'kind':'STANDARD'}]}]}
review=rpc('admin_preview_contract_operation',[cfg]);receipt=rpc('admin_confirm_contract_operation',[review,str(uuid.uuid4())]);cid=receipt['contract_id']
assert_eq(sql(f"select metadata->>'source' from public.contracts where id='{cid}'",role='postgres'),'contract_operations_v1')
assert_eq(sql(f"select count(*) from contract_operations_private.targets where contract_id='{cid}' and school_id='{S}'",role='postgres'),'1')
ctx={'school_id':S,'class_id':CLASS,'content_type':'QUESTION'}
assert any(q['id']==Q for q in rpc('content_resolve_question_details_for_user',[ctx],actor=TEACHER)['items'])
def assemble(title,actor=TEACHER,error=None):return rpc('avalia_plus_create_assessment_from_bank',[{'title':title,'school_id':S,'class_id':CLASS,'questions':[{'question_id':Q,'points':1}]}],actor=actor,error=error)
one=assemble('SYN OPERATIONAL AUTHORIZED')['assessment']['id'];waiting=assemble('SYN OPERATIONAL DRAFT')['assessment']['id']
def publish(a,**kwargs):return json.loads(sql(f"select public.teacher_schedule_assessment_application_v2(p_assessment_id=>'{a}',p_target_type=>'class',p_class_id=>'{CLASS}')",**kwargs))
application=publish(one,actor=TEACHER)['assignment']['id']
# Actual other-school teacher must fail; inspect SQLSTATE by explicit permission error.
assemble('SYN WRONG SCHOOL',actor=OTHER,error='SCHOOL_CONTENT')
rev=rpc('admin_preview_contract_operation',[{'action':'REVOKE','contract_id':cid,'reason':'Synthetic revocation'}]);rpc('admin_confirm_contract_operation',[rev,str(uuid.uuid4())])
assert_eq(sql(f"select school_category_private.school_contract('{S}','{cid}')",role='postgres'),'f')
assemble('SYN REVOKED',error='ASSESSMENT_CONTENT_ACCESS_DENIED')
sql(f"select public.teacher_schedule_assessment_application_v2(p_assessment_id=>'{waiting}',p_target_type=>'class',p_class_id=>'{CLASS}')",actor=TEACHER,error='ASSESSMENT_CONTENT_ACCESS_DENIED')
assert_eq(sql(f"select count(*) from public.assessment_assignments where id='{application}'",role='postgres'),'1')
print('PASS integrated operational contract: preview/confirm -> category grant -> assemble/publish; wrong school denied; revoke denies NEW assembly/publication; existing assignment retained')
