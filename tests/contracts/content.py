from zoneinfo import ZoneInfo
from database import *
cat=rpc('admin_get_contract_operations',[]); grade=next(t for t in cat['taxonomy'] if t['grade_code']=='1_ANO'); other=next(t for t in cat['taxonomy'] if t['grade_code']=='2_ANO')
today=datetime.datetime.now(ZoneInfo('America/Sao_Paulo')).date();date=lambda n:(today+datetime.timedelta(days=n)).isoformat()
cfg={'action':'CREATE','reference':'SYN content contract','starts_at':date(0),'ends_at':date(40),'new_network':{'name':'Conteúdos sintéticos','code':'SYN_CONTENT'},'school_ids':[A],'reason':'Validar acesso dinâmico','adopt_dynamic':True,'products':[{'product_id':P,'institutional':False,'rules':[{'module_id':M,'content_type':'VIDEO','grade_id':grade['grade_id'],'subject_id':None,'kind':'STANDARD'}]}]}
cid=rpc('admin_confirm_contract_operation',[rpc('admin_preview_contract_operation',[cfg]),str(uuid.uuid4())])['contract_id']
sql(f"insert into public.teachers(id,school_id,profile_id,status) values('50000000-0000-4000-8000-000000000001','{A}','{USER}','active');insert into public.classes(id,school_id,nome,school_year,ano_escolar) values('60000000-0000-4000-8000-000000000001','{A}','Turma sintética','1_ANO','1_ANO');insert into public.class_teacher_memberships(class_id,teacher_id) values('60000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001');",role='postgres')
ctx={'school_id':A,'content_type':'VIDEO'}
assert_eq(rpc('content_resolve_for_user',[ctx],actor=USER)['total'],0)
def item(n,g=grade,status='PUBLISHED',mode='GRADE',future=False):
 id=f'70000000-0000-4000-8000-{n:012d}'
 meta={'category_mode':mode,'arbitrary_url':'https://never-deliver.invalid/raw'}
 if mode=='TRANSVERSAL':meta['category_grade_ids']=[grade['grade_id']]
 sql(f"insert into public.content_items(id,content_type,grade_id,segment_id,title,editorial_status,published_at,metadata) values('{id}','VIDEO',{literal(g['grade_id']) if mode!='TRANSVERSAL' else 'null'},'{g['segment_id']}','Conteúdo sintético {n}','{status}',now(){'+ interval '+literal('1 day') if future else ''},{literal(json.dumps(meta))}::jsonb)",role='postgres')
 return id
one=item(1);two=item(2);three=item(3,other);draft=item(4,status='DRAFT');future=item(5,future=True);trans=item(6,mode='TRANSVERSAL')
result=rpc('content_resolve_for_user',[ctx],actor=USER);assert_eq(result['total'],3)
assert set(x['content_item_id'] for x in result['items'])=={one,two,trans}
opened=rpc('content_get_category_item',[one,ctx],actor=USER);assert_eq(opened['delivery_status'],'PROTECTED_DELIVERY_REQUIRED');assert 'arbitrary_url' not in json.dumps(opened)
rpc('content_get_category_item',[three,ctx],actor=USER,error='CONTENT_ACCESS_DENIED')
assert_eq(rpc('content_resolve_for_user',[{'school_id':C,'content_type':'VIDEO'}],actor=USER)['total'],0)
rpc('content_get_category_item',[one,{'school_id':C}],actor=USER,error='UNAUTHORIZED_SCHOOL_CONTEXT')
assert_eq(sql(f"select count(*) from public.content_items where id='{one}'",actor=USER),'0')
print('PASS actual resolver: zero / newly published content / future editorial date / grade / transversal / school switch / protected delivery / raw RLS')
sql(f"update public.content_items set editorial_status='ARCHIVED' where id='{one}'",role='postgres');assert_eq(rpc('content_resolve_for_user',[ctx],actor=USER)['total'],2)
network_tenant=sql(f"select tenant_id from public.contracts where id='{cid}'",role='postgres')
sql(f"insert into public.content_access_exceptions(tenant_id,content_item_id,action,reason) values('{network_tenant}','{two}','BLOCK','Synthetic network block')",role='postgres');assert_eq(rpc('content_resolve_for_user',[ctx],actor=USER)['total'],1)
cancel=rpc('admin_preview_contract_operation',[{'action':'REVOKE','contract_id':cid,'reason':'Revogar acesso sintético'}]);rpc('admin_confirm_contract_operation',[cancel,str(uuid.uuid4())]);assert_eq(rpc('content_resolve_for_user',[ctx],actor=USER)['total'],0)
print('PASS suspension / inherited network BLOCK / revocation through actual resolver')
