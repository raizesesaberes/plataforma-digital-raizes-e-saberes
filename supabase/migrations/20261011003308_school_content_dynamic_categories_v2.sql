-- LOCAL REVIEW ONLY. Dynamic category rules in existing entitlements; not item grants.
-- No production execution authorized. Version must be registered only after review.
begin;
create schema school_category_private;
revoke all on schema school_category_private from public,anon,authenticated,service_role;
-- Operational control only; no licenses, identities or content duplicated.
create table school_category_private.checkpoint_control (
 singleton boolean primary key default true check(singleton),
 checkpoint text not null default 'dynamic-categories-local-v2',
 writes_paused boolean not null default false,
 phase text not null default 'ACTIVE' check(phase in('ACTIVE','RETIRED_BEFORE_USE','PAUSED_AFTER_USE')),
 changed_at timestamptz not null default now()
);
alter table school_category_private.checkpoint_control enable row level security;
revoke all on school_category_private.checkpoint_control from public,anon,authenticated,service_role;
insert into school_category_private.checkpoint_control(singleton) values(true);
create function school_category_private.assert_writes_open() returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from school_category_private.checkpoint_control where singleton and not writes_paused for share;
 if not found then raise exception 'CATEGORY_CHECKPOINT_WRITES_PAUSED';end if;
end $$;


-- Reuse canonical grade/segment registries. Never relabel/reassign existing IDs.
insert into public.content_segments(code,name,metadata) values
 ('EDUCACAO_INFANTIL','Educação Infantil','{"category_stage":"EI"}'),
 ('FUNDAMENTAL','Ensino Fundamental — Anos Iniciais','{"category_stage":"EF_INICIAIS"}'),
 ('FUNDAMENTAL_ANOS_FINAIS','Ensino Fundamental — Anos Finais','{"category_stage":"EF_FINAIS"}'),
 ('ENSINO_MEDIO','Ensino Médio','{"category_stage":"EM"}'),
 ('FORMACAO_INSTITUCIONAL','Universidade e capacitação institucional','{"category_stage":"INSTITUTIONAL"}')
on conflict(code) do nothing;
with definitions(segment,code,name,ord) as (values
 ('EDUCACAO_INFANTIL','EI2','EI — 2 anos',2),('EDUCACAO_INFANTIL','EI3','EI — 3 anos',3),('EDUCACAO_INFANTIL','EI4','EI — 4 anos',4),('EDUCACAO_INFANTIL','EI5','EI — 5 anos',5),
 ('FUNDAMENTAL','1_ANO','EF — 1º ano',11),('FUNDAMENTAL','2_ANO','EF — 2º ano',12),('FUNDAMENTAL','3_ANO','EF — 3º ano',13),('FUNDAMENTAL','4_ANO','EF — 4º ano',14),('FUNDAMENTAL','5_ANO','EF — 5º ano',15),
 ('FUNDAMENTAL_ANOS_FINAIS','6_ANO','EF — 6º ano',16),('FUNDAMENTAL_ANOS_FINAIS','7_ANO','EF — 7º ano',17),('FUNDAMENTAL_ANOS_FINAIS','8_ANO','EF — 8º ano',18),('FUNDAMENTAL_ANOS_FINAIS','9_ANO','EF — 9º ano',19),
 ('ENSINO_MEDIO','EM_1','EM — 1ª série',21),('ENSINO_MEDIO','EM_2','EM — 2ª série',22),('ENSINO_MEDIO','EM_3','EM — 3ª série',23),
 ('FORMACAO_INSTITUCIONAL','UNIVERSIDADE_CAPACITACAO','Universidade / capacitação',30))
insert into public.content_grades(segment_id,code,name,sort_order,metadata)
select s.id,d.code,d.name,d.ord,'{"category_taxonomy_v1":true}' from definitions d join public.content_segments s on s.code=d.segment
on conflict(segment_id,code) do nothing;

create function school_category_private.taxonomy()
returns table(grade_id uuid,segment_id uuid,stage text,stage_name text,grade_name text,grade_code text,sort_order integer,institutional boolean)
language sql stable security definer set search_path='' as $$
 select g.id,g.segment_id,case s.code when 'EDUCACAO_INFANTIL' then 'EI' when 'FUNDAMENTAL' then 'EF_INICIAIS' when 'FUNDAMENTAL_ANOS_FINAIS' then 'EF_FINAIS' when 'ENSINO_MEDIO' then 'EM' else 'INSTITUTIONAL' end,
 s.name,g.name,g.code,g.sort_order,s.code='FORMACAO_INSTITUCIONAL'
 from public.content_grades g join public.content_segments s on s.id=g.segment_id
 where g.status='active' and s.status='active' and (
 (s.code='EDUCACAO_INFANTIL' and g.code in('EI2','EI3','EI4','EI5')) or
 (s.code='FUNDAMENTAL' and g.code in('1_ANO','2_ANO','3_ANO','4_ANO','5_ANO')) or
 (s.code='FUNDAMENTAL_ANOS_FINAIS' and g.code in('6_ANO','7_ANO','8_ANO','9_ANO')) or
 (s.code='ENSINO_MEDIO' and g.code in('EM_1','EM_2','EM_3')) or
 (s.code='FORMACAO_INSTITUCIONAL' and g.code='UNIVERSIDADE_CAPACITACAO'));
$$;
-- Explicit stage-aware aliases, not a q3/v3/j3 prefix heuristic; conflicts stay unchanged.
insert into public.content_grade_aliases(grade_id,alias_code,source)
select grade_id,case when stage in('EF_INICIAIS','EF_FINAIS') then 'EF_'||split_part(grade_code,'_',1) else grade_code end,'category_v1'
from school_category_private.taxonomy() on conflict(alias_code) do nothing;

create function school_category_private.school_contract(p_school uuid,p_contract uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.contracts c join public.tenants t on t.id=c.tenant_id
 join public.schools s on s.id=p_school and s.status='active'
 where c.id=p_contract and c.status='ACTIVE' and c.starts_at<=current_date and (c.ends_at is null or c.ends_at>=current_date)
 and t.status='active' and (t.school_id=s.id or (t.tenant_type='NETWORK' and exists(
 select 1 from public.network_school_memberships m join public.education_networks n on n.id=m.network_id and n.status='active'
 where m.network_id=t.network_id and m.school_id=s.id and m.status='active' and (m.ended_at is null or m.ended_at>now())))));
$$;
create function school_category_private.scope_tenants(p_school uuid)
returns setof uuid language sql stable security definer set search_path='' as $$
 select t.id from public.tenants t where t.status='active' and (t.school_id=p_school or (t.tenant_type='NETWORK' and exists(
 select 1 from public.network_school_memberships m join public.education_networks n on n.id=m.network_id and n.status='active'
 where m.network_id=t.network_id and m.school_id=p_school and m.status='active' and (m.ended_at is null or m.ended_at>now()))));
$$;

create function school_category_private.normalize_config(p_config jsonb)
returns jsonb language plpgsql security definer set search_path='' set jit='off' as $$
declare schools uuid[]; school uuid; cid uuid;pid uuid; cp public.contract_products%rowtype;ct public.contracts%rowtype;
r jsonb;rules jsonb:='[]';m uuid;g uuid;a uuid;subj uuid;kind text;st timestamptz;en timestamptz;v_inst boolean;
begin
 perform public.school_content_assert_admin();
 if jsonb_typeof(p_config) is distinct from 'object' or octet_length(p_config::text)>65536
 or exists(select 1 from jsonb_object_keys(p_config) k where k not in('school_ids','contract_id','product_id','rules','reason','adopt_dynamic')) then raise exception 'INVALID_CATEGORY_CONFIG';end if;
 if jsonb_typeof(p_config->'school_ids') is distinct from 'array' or jsonb_array_length(p_config->'school_ids') not between 1 and 25 then raise exception 'EXPLICIT_SCHOOL_SELECTION_REQUIRED';end if;
 select array_agg(x::uuid order by x::uuid) into schools from jsonb_array_elements_text(p_config->'school_ids') x;
 if array_position(schools,null) is not null or cardinality(schools)<>(select count(distinct x) from unnest(schools)x) then raise exception 'INVALID_SCHOOL_SELECTION';end if;
 cid:=(p_config->>'contract_id')::uuid;pid:=(p_config->>'product_id')::uuid;
 select * into ct from public.contracts where id=cid;
 select * into cp from public.contract_products where contract_id=cid and product_id=pid and status='active';
 if cp.contract_id is null or not exists(select 1 from public.products where id=pid and status='ACTIVE') then raise exception 'ACTIVE_CONTRACT_PRODUCT_REQUIRED';end if;
 foreach school in array schools loop
  if not school_category_private.school_contract(school,cid) then raise exception 'SCHOOL_OUTSIDE_ACTIVE_CONTRACT';end if;
  if not exists(select 1 from public.tenants where school_id=school and status='active' and metadata->>'category_entitlements_enabled'='true')
   and p_config->'adopt_dynamic' is distinct from 'true'::jsonb then raise exception 'EXPLICIT_DYNAMIC_ADOPTION_REQUIRED';end if;
  if exists(select 1 from public.tenants where school_id=school and status<>'active') then raise exception 'SCHOOL_TENANT_INACTIVE';end if;
 end loop;
 if length(btrim(coalesce(p_config->>'reason',''))) not between 5 and 500 then raise exception 'REASON_REQUIRED';end if;
 if jsonb_typeof(p_config->'rules') is distinct from 'array' or jsonb_array_length(p_config->'rules')>128 then raise exception 'INVALID_CATEGORY_RULES';end if;
 for r in select value from jsonb_array_elements(p_config->'rules') loop
  if jsonb_typeof(r) is distinct from 'object' or exists(select 1 from jsonb_object_keys(r) k where k not in('module_id','content_type','grade_id','subject_id','kind','audience_grade_id','starts_at','ends_at')) then raise exception 'INVALID_CATEGORY_RULE';end if;
  m:=(r->>'module_id')::uuid;g:=(r->>'grade_id')::uuid;subj:=nullif(r->>'subject_id','')::uuid;kind:=coalesce(r->>'kind','STANDARD');
  if kind not in('STANDARD','SAMPLE') then raise exception 'INVALID_RULE_KIND';end if;
  if not exists(select 1 from public.product_content_modules pm join public.content_modules cm on cm.id=pm.content_module_id and cm.status='active' where pm.product_id=pid and cm.id=m and r->>'content_type'=any(cm.content_types::text[])) then raise exception 'MODULE_NOT_CONTRACTED';end if;
  select institutional into v_inst from school_category_private.taxonomy() where grade_id=g;
  if not found then raise exception 'CANONICAL_GRADE_REQUIRED';end if;
  if subj is not null and not exists(select 1 from public.content_subjects where id=subj and status='active') then raise exception 'INVALID_SUBJECT';end if;
  if cp.metadata ? 'authorized_subject_ids' and (subj is null or jsonb_typeof(cp.metadata->'authorized_subject_ids') is distinct from 'array' or not (cp.metadata->'authorized_subject_ids' ? subj::text)) then raise exception 'SUBJECT_OUTSIDE_CONTRACT';end if;
  a:=null;st:=null;en:=null;
  if kind='STANDARD' then
   if r->>'audience_grade_id' is not null or r->>'starts_at' is not null or r->>'ends_at' is not null then raise exception 'STANDARD_USES_CONTRACT_WINDOW';end if;
   if jsonb_typeof(cp.metadata->'authorized_grade_ids') is distinct from 'array' or not(cp.metadata->'authorized_grade_ids' ? g::text) then raise exception 'GRADE_OUTSIDE_CONTRACT';end if;
   if v_inst and cp.metadata->'institutional_training_authorized' is distinct from 'true'::jsonb then raise exception 'SEPARATE_INSTITUTIONAL_AUTHORIZATION_REQUIRED';end if;
  else
   a:=(r->>'audience_grade_id')::uuid;st:=(r->>'starts_at')::timestamptz;en:=(r->>'ends_at')::timestamptz;
   if v_inst or not exists(select 1 from school_category_private.taxonomy() where grade_id=a and not institutional)
   or jsonb_typeof(cp.metadata->'authorized_grade_ids') is distinct from 'array' or not(cp.metadata->'authorized_grade_ids' ? a::text)
   or jsonb_typeof(cp.metadata->'authorized_sample_grade_ids') is distinct from 'array' or not(cp.metadata->'authorized_sample_grade_ids' ? g::text) then raise exception 'SAMPLE_SCOPE_OUTSIDE_CONTRACT';end if;
   if st is null or en is null or en<=st or en<=now() or st<ct.starts_at::timestamptz or (ct.ends_at is not null and en>ct.ends_at::timestamptz+interval '1 day') then raise exception 'FINITE_SAMPLE_WINDOW_REQUIRED';end if;
  end if;
  rules:=rules||jsonb_build_array(jsonb_build_object('module_id',m,'content_type',r->>'content_type','grade_id',g,'subject_id',subj,'kind',kind,'audience_grade_id',a,'starts_at',st,'ends_at',en));
 end loop;
 if jsonb_array_length(rules)<>(select count(distinct value) from jsonb_array_elements(rules)) then raise exception 'DUPLICATE_CATEGORY_RULE';end if;
 if exists(select 1 from jsonb_array_elements(rules) unique_rules(rule_value) where rule_value->>'kind'='STANDARD' group by rule_value->>'module_id',rule_value->>'content_type',rule_value->>'grade_id' having count(*)>1) then raise exception 'ONE_STANDARD_THEME_PER_CATEGORY';end if;
 select coalesce(jsonb_agg(value order by value::text),'[]') into rules from jsonb_array_elements(rules);
 return jsonb_build_object('school_ids',to_jsonb(schools),'contract_id',cid,'product_id',pid,'rules',rules,'reason',btrim(p_config->>'reason'),'adopt_dynamic',coalesce((p_config->>'adopt_dynamic')::boolean,false));
end $$;

create function school_category_private.revision(p_config jsonb)
returns text language sql stable security definer set search_path='' as $$
 select md5(jsonb_build_object('config',p_config,'contract',(select to_jsonb(c) from public.contracts c where id=(p_config->>'contract_id')::uuid),
 'contract_product',(select to_jsonb(cp) from public.contract_products cp where contract_id=(p_config->>'contract_id')::uuid and product_id=(p_config->>'product_id')::uuid),
 'product',(select to_jsonb(p) from public.products p where id=(p_config->>'product_id')::uuid),
 'modules',(select jsonb_agg(to_jsonb(pm)||jsonb_build_object('module',to_jsonb(m)) order by m.id) from public.product_content_modules pm join public.content_modules m on m.id=pm.content_module_id where pm.product_id=(p_config->>'product_id')::uuid),
 'taxonomy',(select jsonb_agg(to_jsonb(t) order by grade_id) from school_category_private.taxonomy() t),
 'schools',(select jsonb_agg(to_jsonb(s) order by s.id) from public.schools s where s.id in(select value::uuid from jsonb_array_elements_text(p_config->'school_ids'))),
 'tenants',(select jsonb_agg(to_jsonb(t) order by t.id) from public.tenants t where t.id=(select tenant_id from public.contracts where id=(p_config->>'contract_id')::uuid) or t.school_id in(select value::uuid from jsonb_array_elements_text(p_config->'school_ids'))),
 'memberships',(select jsonb_agg(to_jsonb(m)||jsonb_build_object('network',to_jsonb(n)) order by m.id) from public.network_school_memberships m join public.education_networks n on n.id=m.network_id where m.school_id in(select value::uuid from jsonb_array_elements_text(p_config->'school_ids'))),
 'entitlements',(select jsonb_agg(to_jsonb(e) order by e.id) from public.tenant_product_entitlements e join public.tenants t on t.id=e.tenant_id where t.school_id in(select value::uuid from jsonb_array_elements_text(p_config->'school_ids'))),
 'module_overrides',(select jsonb_agg(to_jsonb(tm) order by tm.entitlement_id,tm.content_module_id) from public.tenant_product_content_modules tm join public.tenant_product_entitlements e on e.id=tm.entitlement_id join public.tenants t on t.id=e.tenant_id where t.school_id in(select value::uuid from jsonb_array_elements_text(p_config->'school_ids'))))::text);
$$;

create function public.admin_preview_school_content_categories(p_config jsonb)
returns jsonb language plpgsql security definer set search_path='' set jit='off' as $$
declare cfg jsonb;summary jsonb;
begin
 cfg:=school_category_private.normalize_config(p_config);
 select coalesce(jsonb_agg(r.value||jsonb_build_object('module_name',m.name,'stage',g.stage,'stage_name',g.stage_name,'grade_name',g.grade_name,'subject_name',coalesce(s.name,'Todos os temas / multidisciplinar'),'audience_grade_name',a.grade_name) order by m.name,g.sort_order,s.name),'[]') into summary
 from jsonb_array_elements(cfg->'rules') r join public.content_modules m on m.id=(r.value->>'module_id')::uuid
 join school_category_private.taxonomy() g on g.grade_id=(r.value->>'grade_id')::uuid
 left join public.content_subjects s on s.id=nullif(r.value->>'subject_id','')::uuid
 left join school_category_private.taxonomy() a on a.grade_id=nullif(r.value->>'audience_grade_id','')::uuid;
 return jsonb_build_object('status','PASS','schema_version',1,'revision',school_category_private.revision(cfg),'config',cfg,'rules',summary,
 'contract',(select jsonb_build_object('id',id,'reference',contract_ref,'starts_at',starts_at,'ends_at',ends_at) from public.contracts where id=(cfg->>'contract_id')::uuid),
 'product',(select jsonb_build_object('id',id,'name',name) from public.products where id=(cfg->>'product_id')::uuid),
 'schools',(select jsonb_agg(jsonb_build_object('id',s.id,'name',s.nome,'adoption_required',not exists(select 1 from public.tenants t where t.school_id=s.id and t.metadata->>'category_entitlements_enabled'='true')) order by s.id) from public.schools s where s.id in(select value::uuid from jsonb_array_elements_text(cfg->'school_ids'))),
 'effects',jsonb_build_object('configuration_rows',jsonb_array_length(cfg->'school_ids'),'rule_count',jsonb_array_length(cfg->'rules'),'per_item_grants',0,'current_and_future',true,'legacy_policy','Preserva registros antigos e BLOCK/EMBARGO. Ao adotar categorias, direitos antigos e ALLOW/PILOT não ampliam as categorias habilitadas.','empty_means','Retirar todas as categorias deste contrato/produto nas escolas escolhidas.'));
end $$;

create unique index category_request_once on public.contract_entitlement_events(actor_user_id,(details->>'request_id')) where event_type='CATEGORY_RULES_SAVED';
create function public.admin_save_school_content_categories(p_review jsonb,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' set jit='off' as $$
declare cfg jsonb;h text;receipt public.contract_entitlement_events%rowtype;s uuid;t uuid;e public.tenant_product_entitlements%rowtype;ct public.contracts%rowtype;before_rows jsonb:='[]';after_rows jsonb:='[]';r jsonb;result jsonb;actor uuid;
begin
 perform public.school_content_assert_admin();perform school_category_private.assert_writes_open();actor:=auth.uid();
 if p_request_id is null or jsonb_typeof(p_review) is distinct from 'object' or p_review->>'revision' is null then raise exception 'REVIEW_REQUIRED';end if;
 if not pg_try_advisory_xact_lock(81261011) then raise exception 'CATEGORY_WRITE_BUSY';end if;
 h:=md5(coalesce(p_review::text,''));
 select * into receipt from public.contract_entitlement_events where actor_user_id=actor and event_type='CATEGORY_RULES_SAVED' and details->>'request_id'=p_request_id::text;
 if found then if receipt.details->>'input_hash'<>h then raise exception 'REQUEST_ID_REUSED';end if;return receipt.details->'result';end if;
 perform set_config('lock_timeout','1s',true);
 lock table public.contracts,public.contract_products,public.products,public.product_content_modules,public.content_modules,public.content_grades,public.content_segments,public.content_subjects,public.schools,public.tenants,public.network_school_memberships,public.education_networks,public.tenant_product_entitlements,public.tenant_product_content_modules in share row exclusive mode;
 cfg:=school_category_private.normalize_config(p_review->'config');
 if school_category_private.revision(cfg)<>p_review->>'revision' then raise exception 'STALE_CATEGORY_REVIEW';end if;
 select * into ct from public.contracts where id=(cfg->>'contract_id')::uuid;
 for s in select value::uuid from jsonb_array_elements_text(cfg->'school_ids') loop
  select id into t from public.tenants where tenant_type='SCHOOL' and school_id=s;
  if t is null then insert into public.tenants(tenant_type,school_id,metadata) values('SCHOOL',s,'{}') returning id into t;end if;
  select * into e from public.tenant_product_entitlements where tenant_id=t and contract_id=ct.id and product_id=(cfg->>'product_id')::uuid and metadata->>'source'='school_content_category_v1';
  if (select count(*) from public.tenant_product_entitlements where tenant_id=t and contract_id=ct.id and product_id=(cfg->>'product_id')::uuid and metadata->>'source'='school_content_category_v1')>1 then raise exception 'DUPLICATE_CATEGORY_ENTITLEMENT';end if;
  before_rows:=before_rows||jsonb_build_array(jsonb_build_object('school_id',s,'entitlement',to_jsonb(e)));
  e:=public.admin_create_or_update_tenant_product_entitlement(e.id,ct.id,t,(cfg->>'product_id')::uuid,greatest(current_date,ct.starts_at),ct.ends_at,'ACTIVE',
   coalesce((select array_agg(distinct tx.segment_id) from jsonb_array_elements(cfg->'rules') rr join school_category_private.taxonomy() tx on tx.grade_id=(rr.value->>'grade_id')::uuid),'{}'),
   coalesce((select array_agg(distinct (rr.value->>'grade_id')::uuid) from jsonb_array_elements(cfg->'rules') rr),'{}'),'{}',
   jsonb_build_object('source','school_content_category_v1','schema_version',1,'category_rules',cfg->'rules','reason',cfg->>'reason'));
  insert into public.tenant_product_content_modules(entitlement_id,content_module_id,enabled,source,metadata,updated_by)
  select e.id,pm.content_module_id,exists(select 1 from jsonb_array_elements(cfg->'rules') rr where (rr.value->>'module_id')::uuid=pm.content_module_id),'manual','{"source":"school_content_category_v1"}',actor
  from public.product_content_modules pm where pm.product_id=e.product_id
  on conflict(entitlement_id,content_module_id) do update set enabled=excluded.enabled,source=excluded.source,metadata=excluded.metadata,updated_by=actor;
  update public.tenants set metadata=metadata||'{"category_entitlements_enabled":true}'::jsonb where id=t;
  after_rows:=after_rows||jsonb_build_array(jsonb_build_object('school_id',s,'entitlement_id',e.id,'rules',cfg->'rules'));
 end loop;
 result:=jsonb_build_object('status','PASS','schools',after_rows,'rule_count',jsonb_array_length(cfg->'rules'),'per_item_grants',0,'request_id',p_request_id);
 insert into public.contract_entitlement_events(contract_id,event_type,actor_user_id,details) values(ct.id,'CATEGORY_RULES_SAVED',actor,jsonb_build_object('request_id',p_request_id,'input_hash',h,'reason',cfg->>'reason','before',before_rows,'after',after_rows,'result',result));
 return result;
exception when lock_not_available then raise exception 'CATEGORY_WRITE_BUSY';
end $$;

create function school_category_private.actor_context(p_context jsonb)
returns jsonb language plpgsql stable security definer set search_path='' set jit='off' as $$
declare uid uuid:=auth.uid();sid uuid:=nullif(p_context->>'school_id','')::uuid;cid uuid:=nullif(p_context->>'class_id','')::uuid;
tid uuid;student uuid;actual_school uuid;actual_class uuid;classids uuid[];grades uuid[];institutional boolean:=coalesce(p_context->>'mode','SCHOOL')='INSTITUTIONAL';
begin
 if uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501';end if;
 if not exists(select 1 from public.profiles where id=uid and status='active') then raise exception 'ACTIVE_PROFILE_REQUIRED' using errcode='42501';end if;
 if exists(select 1 from public.teachers where profile_id=uid and status='active') then
  select id,school_id into tid,actual_school from public.teachers where profile_id=uid and status='active' and (sid is null or school_id=sid) order by created_at desc nulls last,id limit 1;
  if tid is null then raise exception 'UNAUTHORIZED_SCHOOL_CONTEXT' using errcode='42501';end if;sid:=actual_school;
  select coalesce(array_agg(c.id),'{}') into classids from public.class_teacher_memberships m join public.classes c on c.id=m.class_id and c.school_id=sid and c.status='active'
  where m.teacher_id=tid and m.status='active' and (m.ended_at is null or m.ended_at>now()) and (cid is null or c.id=cid);
  if cid is not null and not(cid=any(classids)) then raise exception 'UNAUTHORIZED_CLASS_CONTEXT' using errcode='42501';end if;
 else
  if institutional then raise exception 'INSTITUTIONAL_STAFF_CONTEXT_REQUIRED' using errcode='42501';end if;
  select s.id,e.school_id,e.class_id into student,actual_school,actual_class from public.students s join public.enrollments e on e.student_id=s.id
  join public.classes c on c.id=e.class_id and c.school_id=e.school_id and c.status='active'
  where s.user_id=uid and s.status in('active','ativo') and s.school_id=e.school_id and e.status in('active','ativo') and e.enrolled_at<=now() and (e.ended_at is null or e.ended_at>now()) order by e.enrolled_at desc,e.id limit 1;
  if student is null then raise exception 'UNAUTHORIZED_STUDENT_CONTEXT' using errcode='42501';end if;
  if sid is not null and sid<>actual_school then raise exception 'UNAUTHORIZED_SCHOOL_CONTEXT' using errcode='42501';end if;
  if cid is not null and cid<>actual_class then raise exception 'UNAUTHORIZED_CLASS_CONTEXT' using errcode='42501';end if;
  sid:=actual_school;cid:=actual_class;classids:=array[cid];
 end if;
 if not exists(select 1 from public.schools where id=sid and status='active') then raise exception 'ACTIVE_SCHOOL_REQUIRED' using errcode='42501';end if;
 if institutional then
  if cid is not null then raise exception 'INSTITUTIONAL_CONTEXT_HAS_NO_CLASS';end if;
  select array_agg(grade_id) into grades from school_category_private.taxonomy() tx where tx.institutional;
 else
  with resolved as (
   select c.id,array_agg(distinct tx.grade_id) g from public.classes c
   join public.content_grade_aliases a on a.alias_code=any(array[public.rs_content_normalize_code(c.school_year),public.rs_content_normalize_code(c.ano_escolar::text),public.rs_content_normalize_code(c.age_group)])
   join school_category_private.taxonomy() tx on tx.grade_id=a.grade_id and not tx.institutional
   where c.id=any(classids) group by c.id having count(distinct tx.grade_id)=1
  ) select coalesce(array_agg(distinct x),'{}') into grades from resolved cross join lateral unnest(g) x;
 end if;
 return jsonb_build_object('school_id',sid,'class_id',cid,'grade_ids',to_jsonb(coalesce(grades,'{}')),'institutional',institutional,'teacher',tid is not null);
end $$;

-- Dispatch only: it cannot authorize a caller or change their actual context.
create function school_category_private.dynamic_school(p_context jsonb)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare sid uuid:=nullif(p_context->>'school_id','')::uuid;
begin
 if sid is null then
  select school_id into sid from public.teachers where profile_id=auth.uid() and status='active' order by created_at desc nulls last,id limit 1;
  if sid is null then select school_id into sid from public.student_get_context() limit 1;end if;
 end if;
 return exists(select 1 from public.tenants where school_id=sid and metadata->>'category_entitlements_enabled'='true');
end $$;

create function school_category_private.active_rules(p_context jsonb)
returns table(module_id uuid,module_name text,rule_grade uuid,rule_subject uuid,content_types public.rs_content_type[],segment_id uuid,institutional boolean)
language sql stable security definer set search_path='' set jit='off' set plan_cache_mode='force_custom_plan' as $$
 with ctx as materialized(select school_category_private.actor_context(p_context) c),
 context as materialized(select (c->>'school_id')::uuid school_id,(c->>'institutional')::boolean institutional,
 array(select value::uuid from jsonb_array_elements_text(c->'grade_ids')) grade_ids from ctx)

  select distinct m.id module_id,m.name module_name,(r.value->>'grade_id')::uuid rule_grade,(r.value->>'subject_id')::uuid rule_subject,array[(r.value->>'content_type')::public.rs_content_type] content_types,tx.segment_id,tx.institutional
  from context x join public.tenants t on t.school_id=x.school_id and t.tenant_type='SCHOOL' and t.status='active' and t.metadata->>'category_entitlements_enabled'='true'
  join public.tenant_product_entitlements e on e.tenant_id=t.id and e.status='ACTIVE' and e.starts_at<=current_date and (e.ends_at is null or e.ends_at>=current_date) and e.metadata->>'source'='school_content_category_v1'
  join public.contracts c on c.id=e.contract_id and school_category_private.school_contract(x.school_id,c.id)
  join public.contract_products cp on cp.contract_id=c.id and cp.product_id=e.product_id and cp.status='active'
  join public.products p on p.id=e.product_id and p.status='ACTIVE'
  cross join lateral jsonb_array_elements(case when jsonb_typeof(e.metadata->'category_rules')='array' then e.metadata->'category_rules' else '[]' end) r
  join school_category_private.taxonomy() tx on tx.grade_id=(r.value->>'grade_id')::uuid and tx.grade_id=any(e.grade_ids)
  join public.product_content_modules pm on pm.product_id=p.id and pm.content_module_id=(r.value->>'module_id')::uuid
  join public.content_modules m on m.id=pm.content_module_id and m.status='active' and r.value->>'content_type'=any(m.content_types::text[])
  left join public.tenant_product_content_modules tm on tm.entitlement_id=e.id and tm.content_module_id=m.id
  where coalesce(tm.enabled,true)
  and (not(cp.metadata ? 'authorized_subject_ids') or (jsonb_typeof(cp.metadata->'authorized_subject_ids')='array' and r.value->>'subject_id' is not null and cp.metadata->'authorized_subject_ids' ? (r.value->>'subject_id')))
  and (r.value->>'subject_id' is null or exists(select 1 from public.content_subjects cs where cs.id=(r.value->>'subject_id')::uuid and cs.status='active'))
  and (
   (r.value->>'kind'='STANDARD' and jsonb_typeof(cp.metadata->'authorized_grade_ids')='array' and cp.metadata->'authorized_grade_ids' ? tx.grade_id::text
    and tx.grade_id=any(x.grade_ids) and tx.institutional=x.institutional
    and (not tx.institutional or cp.metadata->'institutional_training_authorized'='true'::jsonb))
   or (r.value->>'kind'='SAMPLE' and jsonb_typeof(cp.metadata->'authorized_grade_ids')='array' and jsonb_typeof(cp.metadata->'authorized_sample_grade_ids')='array' and not tx.institutional and not x.institutional
    and cp.metadata->'authorized_sample_grade_ids' ? tx.grade_id::text
    and cp.metadata->'authorized_grade_ids' ? (r.value->>'audience_grade_id')
    and (r.value->>'audience_grade_id')::uuid=any(x.grade_ids)
    and (r.value->>'starts_at')::timestamptz<=now() and (r.value->>'ends_at')::timestamptz>now()
    and (r.value->>'starts_at')::timestamptz>=c.starts_at::timestamptz
    and (c.ends_at is null or (r.value->>'ends_at')::timestamptz<c.ends_at::timestamptz+interval '1 day'+interval '1 microsecond')))
;
$$;

create function school_category_private.authorized_items(p_context jsonb,p_item uuid default null)
returns table(content_item_id uuid,question_item_id uuid,title text,content_type public.rs_content_type,grade_id uuid,subject_id uuid,published_at timestamptz)
language sql stable security definer set search_path='' set jit='off' set plan_cache_mode='force_custom_plan' as $$
 with ctx as materialized(select school_category_private.actor_context(p_context) c),
 context as materialized(select (c->>'school_id')::uuid school_id,(c->>'institutional')::boolean institutional,
 array(select value::uuid from jsonb_array_elements_text(c->'grade_ids')) grade_ids from ctx),
 scope as materialized(select school_category_private.scope_tenants(x.school_id) id from context x),
 rules as materialized (select * from school_category_private.active_rules(p_context) where nullif(p_context->>'module_id','') is null or module_id=(p_context->>'module_id')::uuid ), blocked as materialized (
  select b.content_item_id from public.content_access_exceptions b cross join context x
  where b.action in('BLOCK','EMBARGO') and (b.school_id=x.school_id or b.tenant_id in(select id from scope))
  and (b.starts_at is null or b.starts_at<=now()) and (b.ends_at is null or b.ends_at>=now())
 ), selected as materialized (
  select ci.* from public.content_items ci where (p_item is null or ci.id=p_item)
   and ci.content_type=coalesce(nullif(p_context->>'content_type','')::public.rs_content_type,ci.content_type)
   and ci.editorial_status='PUBLISHED' and ci.published_at is not null and ci.published_at<=now()
   and ci.id not in(select content_item_id from blocked)
 ), eligible as (
  select distinct ci.id,cq.question_item_id,ci.title,ci.content_type,ci.grade_id,ci.subject_id,ci.published_at
  from selected ci cross join context x join rules r on ci.content_type=any(r.content_types)
  left join public.content_question_items cq on cq.content_item_id=ci.id
  left join public.question_items q on q.id=cq.question_item_id
  where (r.rule_subject is null or ci.subject_id=r.rule_subject)
  and (nullif(p_context->>'subject_id','') is null or ci.subject_id=(p_context->>'subject_id')::uuid)
  and (ci.subject_id is null or exists(select 1 from public.content_subjects sub where sub.id=ci.subject_id and sub.status='active'))
  and (ci.content_type<>'QUESTION' or (q.publication_status='PUBLICADO' and q.curation_status='APROVADO'))
  and (
   (coalesce(ci.metadata->>'category_mode','GRADE')='GRADE' and not r.institutional and ci.grade_id=r.rule_grade and (ci.segment_id is null or ci.segment_id=r.segment_id))
   or (ci.metadata->>'category_mode'='TRANSVERSAL' and not r.institutional and ci.grade_id is null and jsonb_typeof(ci.metadata->'category_grade_ids')='array' and ci.metadata->'category_grade_ids' ? r.rule_grade::text and (ci.segment_id is null or ci.segment_id=r.segment_id))
   or (ci.metadata->>'category_mode'='INSTITUTIONAL' and r.institutional and x.institutional and ci.grade_id=r.rule_grade and ci.segment_id=r.segment_id))
  and (ci.owner_scope='GLOBAL_RAIZES'
   or (ci.owner_scope in('SCHOOL','NETWORK') and ci.owner_tenant_id in(select id from scope))
   or (ci.owner_scope='TEACHER' and ci.owner_user_id=auth.uid()))
 ) select * from eligible;
$$;

create function school_category_private.resolve(p_context jsonb)
returns jsonb language plpgsql stable security definer set search_path='' set jit='off' as $$
declare ctx jsonb;items jsonb;total bigint;lim integer:=least(greatest(coalesce((p_context->>'limit')::int,25),1),100);off integer:=greatest(coalesce((p_context->>'offset')::int,0),0);
begin
 ctx:=school_category_private.actor_context(p_context);
 if not school_category_private.dynamic_school(p_context) then return jsonb_build_object('status','CATEGORY_NOT_CONFIGURED','items','[]'::jsonb,'total',0);end if;
 if jsonb_array_length(ctx->'grade_ids')=0 then return jsonb_build_object('status','CLASSIFICATION_REQUIRED','items','[]'::jsonb,'total',0);end if;
 with allowed as materialized(select * from school_category_private.authorized_items(p_context)),page as(select * from allowed order by published_at desc,content_item_id limit lim offset off)
 select coalesce(jsonb_agg(to_jsonb(page) order by published_at desc,content_item_id),'[]'),(select count(*) from allowed) into items,total from page;
 return ctx||jsonb_build_object('status','PASS','source','DYNAMIC_CATEGORY_V1','items',items,'total',total,'limit',lim,'offset',off);
end $$;

create function public.content_list_category_modules(p_context jsonb default '{}')
returns jsonb language plpgsql stable security definer set search_path='' set jit='off' as $$
declare ctx jsonb;items jsonb;
begin
 ctx:=school_category_private.actor_context(p_context);
 if not school_category_private.dynamic_school(p_context) then return jsonb_build_object('status','CATEGORY_NOT_CONFIGURED','modules','[]'::jsonb);end if;
 if jsonb_array_length(ctx->'grade_ids')=0 then return jsonb_build_object('status','CLASSIFICATION_REQUIRED','modules','[]'::jsonb);end if;
 with rules as materialized(select * from school_category_private.active_rules(p_context)),
 modules as(select distinct module_id,module_name,content_types from rules),
 counted as(select m.*,(select count(*) from school_category_private.authorized_items(p_context||jsonb_build_object('module_id',m.module_id,'content_type',m.content_types[1]))) total from modules m)
 select coalesce(jsonb_agg(jsonb_build_object('id',module_id,'name',module_name,'content_types',to_jsonb(content_types),'total',total,'delivery_ready',content_types=array['QUESTION']::public.rs_content_type[],'message',case when total=0 then '0 conteúdos — Conteúdos disponíveis em breve' else total||' conteúdos disponíveis no catálogo' end) order by module_name),'[]') into items from counted;
 return ctx||jsonb_build_object('status','PASS','modules',items);
end $$;

create function public.content_get_category_item(p_content_item_id uuid,p_context jsonb default '{}')
returns jsonb language plpgsql stable security definer set search_path='' set jit='off' as $$
declare item record;ctx jsonb;question jsonb;
begin
 ctx:=school_category_private.actor_context(p_context);
 if not school_category_private.dynamic_school(p_context) then raise exception 'CATEGORY_NOT_CONFIGURED' using errcode='42501';end if;
 select * into item from school_category_private.authorized_items(p_context,p_content_item_id);
 if not found then raise exception 'CONTENT_ACCESS_DENIED' using errcode='42501';end if;
 if item.content_type='QUESTION' then
  select jsonb_build_object('id',id,'statement',statement,'command_text',command_text,'base_text',base_text,'question_type',question_type) into question from public.question_items where id=item.question_item_id;
 end if;
 -- Never emit raw media URLs from arbitrary metadata. Private media delivery is a separate gate.
 return jsonb_build_object('status','PASS','item',to_jsonb(item),'question',question,'delivery_status',case when item.content_type='QUESTION' then 'INLINE_QUESTION' else 'PROTECTED_DELIVERY_REQUIRED' end);
end $$;

create function school_category_private.has_dynamic_membership()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.tenants t where t.tenant_type='SCHOOL' and t.metadata->>'category_entitlements_enabled'='true' and (
 exists(select 1 from public.teachers a where a.profile_id=auth.uid() and a.status='active' and a.school_id=t.school_id)
 or exists(select 1 from public.students a where a.user_id=auth.uid() and a.school_id=t.school_id)
 or exists(select 1 from public.student_get_context() a where a.school_id=t.school_id)));
$$;

create function public.content_category_can_read(p_content_item_id uuid)
returns boolean language plpgsql stable security definer set search_path='' set jit='off' as $$
begin
 if auth.uid() is null then return false;end if;
 if exists(select 1 from public.profiles where id=auth.uid() and status='active' and lower(platform_role) in('admin','admin_ti','administrador','administrador_nacional')) then return true;end if;
 if not school_category_private.has_dynamic_membership() then return true;end if;
 -- Media metadata can contain public URLs: deny raw-table delivery until protected adapters exist.
 return exists(select 1 from school_category_private.authorized_items('{}',p_content_item_id) where content_type='QUESTION');
exception when insufficient_privilege then return false;
end $$;
create function public.content_category_can_read_question(p_question_id uuid)
returns boolean language sql stable security definer set search_path='' set jit='off' as $$
 select case when auth.uid() is null then false
 when not school_category_private.has_dynamic_membership() then true
 else exists(select 1 from public.content_question_items q where q.question_item_id=p_question_id and public.content_category_can_read(q.content_item_id)) end;
$$;
-- Local proposal only: restrictive policies intersect existing permissive policies.
create policy category_read_gate on public.content_items as restrictive for select to authenticated,anon using(public.content_category_can_read(id));
create policy category_question_read_gate on public.question_items as restrictive for select to authenticated,anon using(public.content_category_can_read_question(id));

create function public.admin_get_school_content_categories(p_school_id uuid)
returns jsonb language plpgsql security definer set search_path='' set jit='off' as $$
declare contracts jsonb;targets jsonb;
begin
 perform public.school_content_assert_admin();
 if not exists(select 1 from public.schools where id=p_school_id and status='active') then raise exception 'ACTIVE_SCHOOL_REQUIRED';end if;
 select coalesce(jsonb_agg(jsonb_build_object('contract_id',c.id,'contract_ref',c.contract_ref,'product_id',p.id,'product_name',p.name,'starts_at',c.starts_at,'ends_at',c.ends_at,
 'authorized_grade_ids',coalesce(cp.metadata->'authorized_grade_ids','[]'),'authorized_sample_grade_ids',coalesce(cp.metadata->'authorized_sample_grade_ids','[]'),
 'authorized_subject_ids',cp.metadata->'authorized_subject_ids','institutional_training_authorized',cp.metadata->'institutional_training_authorized'='true'::jsonb,
 'modules',(select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'name',m.name,'content_types',to_jsonb(m.content_types)) order by m.name),'[]') from public.product_content_modules pm join public.content_modules m on m.id=pm.content_module_id and m.status='active' where pm.product_id=p.id),
 'rules',coalesce((select e.metadata->'category_rules' from public.tenant_product_entitlements e join public.tenants t on t.id=e.tenant_id and t.school_id=p_school_id where e.contract_id=c.id and e.product_id=p.id and e.metadata->>'source'='school_content_category_v1' order by e.created_at desc limit 1),'[]')) order by c.contract_ref,p.name),'[]') into contracts
 from public.contracts c join public.contract_products cp on cp.contract_id=c.id and cp.status='active' join public.products p on p.id=cp.product_id and p.status='ACTIVE'
 where school_category_private.school_contract(p_school_id,c.id);
 select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.nome) order by s.nome),'[]') into targets from public.schools s
 where s.id<>p_school_id and s.status='active' and exists(select 1 from public.network_school_memberships a join public.network_school_memberships b on b.network_id=a.network_id join public.education_networks n on n.id=a.network_id and n.status='active'
 where a.school_id=p_school_id and b.school_id=s.id and a.status='active' and b.status='active' and (a.ended_at is null or a.ended_at>now()) and (b.ended_at is null or b.ended_at>now()));
 return jsonb_build_object('status','PASS','school_id',p_school_id,'school_name',(select nome from public.schools where id=p_school_id),'dynamic_enabled',exists(select 1 from public.tenants where school_id=p_school_id and metadata->>'category_entitlements_enabled'='true'),
 'contracts',contracts,'schools',targets,'audit',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from (select id,created_at,event_type,details->>'reason' reason from public.contract_entitlement_events where event_type='CATEGORY_RULES_SAVED' and details->'after' @> jsonb_build_array(jsonb_build_object('school_id',p_school_id)) order by created_at desc,id desc limit 10)a),'taxonomy',(select jsonb_agg(to_jsonb(t) order by sort_order) from school_category_private.taxonomy()t),
 'subjects',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) order by name),'[]') from public.content_subjects where status='active'));
end $$;

create function public.admin_get_content_category(p_content_item_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare ci public.content_items%rowtype;
begin
 perform public.school_content_assert_admin();
 if p_content_item_id is not null then select * into ci from public.content_items where id=p_content_item_id;if not found then raise exception 'CONTENT_NOT_FOUND';end if;end if;
 return jsonb_build_object('status','PASS','history',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from (select id,created_at,event_type,from_status,to_status,details->>'reason' reason from public.content_editorial_events where content_item_id=p_content_item_id order by created_at desc,id desc limit 20)a),'item',case when ci.id is null then null else jsonb_build_object('id',ci.id,'title',ci.title,'content_type',ci.content_type,'grade_id',ci.grade_id,'subject_id',ci.subject_id,'category_mode',coalesce(ci.metadata->>'category_mode','GRADE'),'category_grade_ids',coalesce(ci.metadata->'category_grade_ids','[]'),'multidisciplinary',ci.metadata->'multidisciplinary'='true'::jsonb,'delivery_kind',ci.metadata->'delivery_adapter'->>'kind','delivery_resource_id',ci.metadata->'delivery_adapter'->>'resource_id','editorial_status',ci.editorial_status,'published_at',ci.published_at,'revision',md5(to_jsonb(ci)::text)) end,
 'taxonomy',(select jsonb_agg(to_jsonb(t) order by sort_order) from school_category_private.taxonomy()t),'subjects',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) order by name),'[]') from public.content_subjects where status='active'));
end $$;

create unique index category_classification_request_once on public.content_editorial_events(actor_user_id,(details->>'request_id')) where event_type='CONTENT_CATEGORY_CLASSIFIED';
create function public.admin_save_content_category(p_content_item_id uuid,p_revision text,p_document jsonb,p_reason text,p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare ci public.content_items%rowtype;before_row jsonb;g record;v_segment uuid;mode text;grade uuid;subj uuid;cross_grades uuid[];v_metadata jsonb;v_item_id uuid:=p_content_item_id;qid uuid;receipt jsonb;input_hash text;result jsonb;binding_kind text;binding_id uuid;binding_type text;
begin
 perform public.school_content_assert_admin();perform school_category_private.assert_writes_open();
 if p_request_id is not null then
  if not pg_try_advisory_xact_lock(81261015) then raise exception 'CATEGORY_CLASSIFICATION_BUSY';end if;
  input_hash:=md5(jsonb_build_array(p_content_item_id,p_revision,p_document,p_reason)::text);
  select details into receipt from public.content_editorial_events where event_type='CONTENT_CATEGORY_CLASSIFIED' and actor_user_id=auth.uid() and details->>'request_id'=p_request_id::text;
  if found then if receipt->>'input_hash'<>input_hash then raise exception 'REQUEST_ID_REUSED';end if;return receipt->'result';end if;
 end if;
 if jsonb_typeof(p_document) is distinct from 'object' or exists(select 1 from jsonb_object_keys(p_document) k where k not in('title','content_type','question_item_id','grade_id','subject_id','category_mode','category_grade_ids','multidisciplinary','delivery_kind','delivery_resource_id')) then raise exception 'INVALID_CONTENT_CLASSIFICATION';end if;
 if length(btrim(coalesce(p_reason,''))) not between 5 and 500 then raise exception 'REASON_REQUIRED';end if;
 mode:=coalesce(p_document->>'category_mode','GRADE');grade:=nullif(p_document->>'grade_id','')::uuid;subj:=nullif(p_document->>'subject_id','')::uuid;
 if subj is not null and not exists(select 1 from public.content_subjects where content_subjects.id=subj and status='active') then raise exception 'INVALID_SUBJECT';end if;
 if p_document->'multidisciplinary'='true'::jsonb and subj is not null then raise exception 'MULTIDISCIPLINARY_HAS_NO_SINGLE_THEME';end if;
 if mode in('GRADE','INSTITUTIONAL') then
  select * into g from school_category_private.taxonomy() where grade_id=grade;
  if not found or g.institutional<>(mode='INSTITUTIONAL') then raise exception 'CANONICAL_STAGE_GRADE_REQUIRED';end if;v_segment:=g.segment_id;
  cross_grades:='{}';
 elsif mode='TRANSVERSAL' then
  if grade is not null or jsonb_typeof(p_document->'category_grade_ids') is distinct from 'array' or jsonb_array_length(p_document->'category_grade_ids')=0 then raise exception 'EXPLICIT_TRANSVERSAL_GRADES_REQUIRED';end if;
  select array_agg(distinct value::uuid order by value::uuid) into cross_grades from jsonb_array_elements_text(p_document->'category_grade_ids');
  if exists(select 1 from unnest(cross_grades)x where not exists(select 1 from school_category_private.taxonomy()t where t.grade_id=x and not t.institutional)) then raise exception 'TRANSVERSAL_CANNOT_INCLUDE_INSTITUTIONAL';end if;
 else raise exception 'INVALID_CATEGORY_MODE';end if;
 if v_item_id is not null then
  select * into ci from public.content_items where content_items.id=p_content_item_id for update;
  if ci.id is null then raise exception 'CONTENT_NOT_FOUND';end if;
  if ci.owner_scope<>'GLOBAL_RAIZES' then raise exception 'ROOT_CONTENT_REQUIRED';end if;
  if p_revision is null or md5(to_jsonb(ci)::text)<>p_revision then raise exception 'STALE_CONTENT_CLASSIFICATION';end if;
  if p_document->>'content_type' is not null and p_document->>'content_type'<>ci.content_type::text then raise exception 'CONTENT_TYPE_IMMUTABLE';end if;
  before_row:=to_jsonb(ci);v_metadata:=ci.metadata;
 else
  if length(btrim(coalesce(p_document->>'title',''))) not between 1 and 300 or p_document->>'content_type' is null then raise exception 'CONTENT_TITLE_AND_TYPE_REQUIRED';end if;
  if p_document->>'content_type'='QUESTION' then
   qid:=(p_document->>'question_item_id')::uuid;
   if qid is null or not exists(select 1 from public.question_items where question_items.id=qid) then raise exception 'CANONICAL_QUESTION_ADAPTER_REQUIRED';end if;
  end if;
  v_metadata:='{}';
 end if;
 if p_document ? 'delivery_kind' then
  binding_kind:=nullif(p_document->>'delivery_kind','');binding_id:=nullif(p_document->>'delivery_resource_id','')::uuid;
  binding_type:=coalesce(ci.content_type::text,p_document->>'content_type');
  if binding_kind is null and binding_id is null then v_metadata:=v_metadata-'delivery_adapter';
  elsif binding_kind='library_book' and binding_type in('BOOK','BOOK_PAGE') and exists(select 1 from public.books where id=binding_id) then v_metadata:=v_metadata||jsonb_build_object('delivery_adapter',jsonb_build_object('kind',binding_kind,'resource_id',binding_id));
  elsif binding_kind='game' and binding_type='GAME' and exists(select 1 from public.student_games where id=binding_id) then v_metadata:=v_metadata||jsonb_build_object('delivery_adapter',jsonb_build_object('kind',binding_kind,'resource_id',binding_id));
  elsif binding_kind='activity' and binding_type in('ACTIVITY','PRINTABLE') and exists(select 1 from public.student_activities where id=binding_id) then v_metadata:=v_metadata||jsonb_build_object('delivery_adapter',jsonb_build_object('kind',binding_kind,'resource_id',binding_id));
  elsif binding_kind='discovery' and binding_type='INTERACTION' and exists(select 1 from public.student_discoveries where id=binding_id) then v_metadata:=v_metadata||jsonb_build_object('delivery_adapter',jsonb_build_object('kind',binding_kind,'resource_id',binding_id));
  else raise exception 'INVALID_CANONICAL_DELIVERY_ADAPTER';end if;
 end if;
 v_metadata:=v_metadata||jsonb_build_object('category_mode',mode,'category_grade_ids',to_jsonb(cross_grades),'multidisciplinary',coalesce((p_document->>'multidisciplinary')::boolean,false),'classification_source','canonical_category_v1');
 if v_item_id is null then
  insert into public.content_items(content_type,title,segment_id,grade_id,subject_id,metadata,created_by,updated_by)
  values((p_document->>'content_type')::public.rs_content_type,btrim(p_document->>'title'),v_segment,grade,subj,v_metadata,auth.uid(),auth.uid()) returning * into ci;v_item_id:=ci.id;
  if qid is not null then insert into public.content_question_items(content_item_id,question_item_id) values(v_item_id,qid);end if;
 else
  update public.content_items set segment_id=v_segment,grade_id=grade,subject_id=subj,metadata=v_metadata,version=version+1,editorial_status=case when editorial_status='PUBLISHED' then 'IN_REVIEW'::public.rs_content_editorial_status else editorial_status end,updated_by=auth.uid() where content_items.id=p_content_item_id returning * into ci;
 end if;
 result:=jsonb_build_object('status','PASS','content_item_id',v_item_id,'revision',md5(to_jsonb(ci)::text),'editorial_status',ci.editorial_status,'per_school_writes',0);
 insert into public.content_editorial_events(content_item_id,event_type,actor_user_id,details) values(v_item_id,'CONTENT_CATEGORY_CLASSIFIED',auth.uid(),jsonb_build_object('content_item_id',v_item_id,'reason',p_reason,'before',before_row,'after',to_jsonb(ci),'request_id',p_request_id,'input_hash',input_hash,'result',result));
 return result;
end $$;

CREATE OR REPLACE FUNCTION school_category_private.legacy_resolver(p_context jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET jit TO 'off'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_content_type public.rs_content_type := coalesce((p_context ->> 'content_type')::public.rs_content_type, 'QUESTION'::public.rs_content_type);
  v_school_id uuid := nullif(p_context ->> 'school_id', '')::uuid;
  v_class_id uuid := nullif(p_context ->> 'class_id', '')::uuid;
  v_subject_code text := public.rs_content_normalize_code(p_context ->> 'subject_code');
  v_limit integer := least(greatest(coalesce((p_context ->> 'limit')::integer, 25), 1), 100);
  v_offset integer := greatest(coalesce((p_context ->> 'offset')::integer, 0), 0);
  v_teacher_id uuid;
  v_student_id uuid;
  v_grade_id uuid;
  v_subject_id uuid;
  v_items jsonb;
  v_total integer;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if v_content_type <> 'QUESTION' then
    return jsonb_build_object('status', 'UNSUPPORTED_CONTENT_TYPE', 'items', '[]'::jsonb, 'total', 0);
  end if;

  if exists (
    select 1
    from public.teachers t
    where t.profile_id = v_uid
      and coalesce(t.status, 'active') = 'active'
  ) then
    select t.id, coalesce(v_school_id, t.school_id)
    into v_teacher_id, v_school_id
    from public.teachers t
    where t.profile_id = v_uid
      and coalesce(t.status, 'active') = 'active'
      and (v_school_id is null or t.school_id = v_school_id)
    order by t.created_at desc nulls last
    limit 1;

    if v_teacher_id is null or v_school_id is null then
      raise exception 'UNAUTHORIZED_SCHOOL_CONTEXT';
    end if;

    if v_class_id is not null then
      if not exists (
        select 1
        from public.class_teacher_memberships ctm
        join public.classes c on c.id = ctm.class_id
        where ctm.teacher_id = v_teacher_id
          and ctm.class_id = v_class_id
          and ctm.status = 'active'
          and (ctm.ended_at is null or ctm.ended_at > now())
          and c.school_id = v_school_id
          and coalesce(c.status, 'active') = 'active'
      ) then
        raise exception 'UNAUTHORIZED_CLASS_CONTEXT';
      end if;

      select cga.grade_id
      into v_grade_id
      from public.classes c
      join public.content_grade_aliases cga
        on cga.alias_code = public.rs_content_normalize_code(coalesce(c.school_year, c.ano_escolar::text))
      where c.id = v_class_id
      limit 1;
    end if;

  else
    select sgc.student_id, sgc.school_id, sgc.class_id, cga.grade_id
    into v_student_id, v_school_id, v_class_id, v_grade_id
    from public.student_get_context() sgc
    left join public.content_grade_aliases cga
      on cga.alias_code = public.rs_content_normalize_code(sgc.school_year)
    limit 1;

    if v_student_id is null then
      raise exception 'UNAUTHORIZED_STUDENT_CONTEXT';
    end if;

    if nullif(p_context ->> 'school_id', '')::uuid is not null and nullif(p_context ->> 'school_id', '')::uuid <> v_school_id then
      raise exception 'UNAUTHORIZED_SCHOOL_CONTEXT';
    end if;

    if nullif(p_context ->> 'class_id', '')::uuid is not null and nullif(p_context ->> 'class_id', '')::uuid <> v_class_id then
      raise exception 'UNAUTHORIZED_CLASS_CONTEXT';
    end if;
  end if;

  if not public.content_feature_enabled_for_school('CONTENT_RESOLVER_QUESTIONS', v_school_id) then
    return jsonb_build_object(
      'status', 'FEATURE_DISABLED',
      'feature', 'content_resolver_questions',
      'items', '[]'::jsonb,
      'total', 0
    );
  end if;

  if v_subject_code is not null then
    select csa.subject_id
    into v_subject_id
    from public.content_subject_aliases csa
    where csa.alias_code = v_subject_code
    limit 1;
  end if;

  with school_tenant as (
    select t.id
    from public.tenants t
    where t.tenant_type = 'SCHOOL'
      and t.school_id = v_school_id
      and t.status = 'active'
    limit 1
  ),
  network_tenants as (
    select t.id
    from public.tenants t
    join public.network_school_memberships nsm on nsm.network_id = t.network_id
    where t.tenant_type = 'NETWORK'
      and t.status = 'active'
      and nsm.school_id = v_school_id
      and nsm.status = 'active'
      and (nsm.ended_at is null or nsm.ended_at > now())
  ),
  entitled_products as (
    select distinct tpe.product_id, tpe.contract_id, tpe.metadata
    from public.tenant_product_entitlements tpe
    left join public.contracts valid_contract on valid_contract.id=tpe.contract_id
      and valid_contract.status='ACTIVE' and valid_contract.starts_at<=current_date
      and (valid_contract.ends_at is null or valid_contract.ends_at>=current_date)
    left join public.contract_products valid_cp on valid_cp.contract_id=tpe.contract_id
      and valid_cp.product_id=tpe.product_id and valid_cp.status='active'
    left join public.products valid_product on valid_product.id=tpe.product_id and valid_product.status='ACTIVE'
    join public.product_content_modules pcm on pcm.product_id = tpe.product_id
    join public.content_modules cm on cm.id = pcm.content_module_id
    left join public.tenant_product_content_modules tpcm
      on tpcm.entitlement_id = tpe.id
     and tpcm.content_module_id = cm.id
    where tpe.status = 'ACTIVE'
      and (tpe.metadata->>'source' is distinct from 'school_content_admin_v1' or
        (valid_contract.id is not null and valid_cp.contract_id is not null and valid_product.id is not null
        and public.content_tenant_matches_contract_scope(valid_contract.tenant_id,tpe.tenant_id)
        and exists(select 1 from public.schools s where s.id=v_school_id and s.status='active')
        and exists(select 1 from public.profiles p where p.id=v_uid and p.status='active')))
      and tpe.starts_at <= current_date
      and (tpe.ends_at is null or tpe.ends_at >= current_date)
      and cm.status = 'active'
      and v_content_type = any(cm.content_types)
      and coalesce(tpcm.enabled, true) = true
      and (
        tpe.tenant_id in (select id from school_tenant)
        or tpe.tenant_id in (select id from network_tenants)
      )
      and (cardinality(tpe.grade_ids) = 0 or v_grade_id is null or v_grade_id = any(tpe.grade_ids))
      and (cardinality(tpe.subject_ids) = 0 or v_subject_id is null or v_subject_id = any(tpe.subject_ids))
  ),
  allowed_by_exception as (
    select cae.content_item_id
    from public.content_access_exceptions cae
    where cae.action in ('ALLOW', 'PILOT')
      and (cae.school_id = v_school_id or cae.tenant_id in (select id from school_tenant union select id from network_tenants))
      and (cae.starts_at is null or cae.starts_at <= now())
      and (cae.ends_at is null or cae.ends_at >= now())
  ),
  blocked as (
    select cae.content_item_id
    from public.content_access_exceptions cae
    where cae.action in ('BLOCK', 'EMBARGO')
      and (cae.school_id = v_school_id or cae.tenant_id in (select id from school_tenant union select id from network_tenants))
      and (cae.starts_at is null or cae.starts_at <= now())
      and (cae.ends_at is null or cae.ends_at >= now())
  ),
  eligible as (
    select distinct
      ci.id as content_item_id,
      cqi.question_item_id,
      ci.title,
      ci.grade_id,
      ci.subject_id,
      ci.published_at
    from public.content_items ci
    join public.content_question_items cqi on cqi.content_item_id = ci.id
    left join public.content_collection_items cci on cci.content_item_id = ci.id
    left join public.product_collections pc on pc.collection_id = cci.collection_id
    where ci.content_type = 'QUESTION'
      and ci.editorial_status = 'PUBLISHED'
      and ci.published_at is not null
      and ci.id not in (select content_item_id from blocked)
      and (
        exists(select 1 from entitled_products ep where ep.product_id=pc.product_id
          and (ep.metadata->>'source' is distinct from 'school_content_admin_v1' or
            (coalesce(ep.metadata->'allowed_content_item_ids','[]'::jsonb) ? ci.id::text
             and ci.grade_id in(select public.school_content_managed_grades(v_school_id,v_class_id))
             and exists(select 1 from public.school_content_candidates(v_school_id,ci.id) candidate
               where candidate.product_id=ep.product_id and candidate.contract_id=ep.contract_id))))
        or ci.id in (select content_item_id from allowed_by_exception)
      )
      and (v_grade_id is null or ci.grade_id is null or ci.grade_id = v_grade_id)
      and (v_subject_id is null or ci.subject_id is null or ci.subject_id = v_subject_id)
  ),
  counted as (
    select count(*)::integer as total from eligible
  ),
  paged as (
    select *
    from eligible
    order by published_at desc nulls last, content_item_id
    limit v_limit offset v_offset
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'content_item_id', p.content_item_id,
      'question_item_id', p.question_item_id,
      'title', p.title,
      'grade_id', p.grade_id,
      'subject_id', p.subject_id,
      'published_at', p.published_at
    )), '[]'::jsonb),
    (select total from counted)
  into v_items, v_total
  from paged p;

  return jsonb_build_object(
    'status', 'PASS',
    'content_type', 'QUESTION',
    'school_id', v_school_id,
    'class_id', v_class_id,
    'limit', v_limit,
    'offset', v_offset,
    'total', coalesce(v_total, 0),
    'items', coalesce(v_items, '[]'::jsonb)
  );
end;
$function$
;
create or replace function public.content_resolve_for_user(p_context jsonb default '{}')
returns jsonb language plpgsql stable security definer set search_path='' set jit='off' as $$
begin
 if school_category_private.dynamic_school(p_context) then return school_category_private.resolve(p_context);end if;
 return school_category_private.legacy_resolver(p_context);
end $$;

revoke all on all functions in schema school_category_private from public,anon,authenticated,service_role;
revoke all on function public.admin_get_school_content_categories(uuid),public.admin_preview_school_content_categories(jsonb),public.admin_save_school_content_categories(jsonb,uuid),public.admin_get_content_category(uuid),public.admin_save_content_category(uuid,text,jsonb,text,uuid),public.content_list_category_modules(jsonb),public.content_get_category_item(uuid,jsonb),public.content_category_can_read(uuid),public.content_category_can_read_question(uuid) from public,anon,authenticated,service_role;
grant execute on function public.admin_get_school_content_categories(uuid),public.admin_preview_school_content_categories(jsonb),public.admin_save_school_content_categories(jsonb,uuid),public.admin_get_content_category(uuid),public.admin_save_content_category(uuid,text,jsonb,text,uuid),public.content_list_category_modules(jsonb),public.content_get_category_item(uuid,jsonb) to authenticated;
grant execute on function public.content_category_can_read(uuid),public.content_category_can_read_question(uuid) to authenticated,anon;
commit;
