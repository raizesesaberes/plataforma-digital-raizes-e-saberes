-- REVIEW ONLY. Generate an official migration with the CLI after review. No production execution.
BEGIN;
DO $$ BEGIN
 IF (select md5(prosrc) from pg_proc where oid='school_category_private.normalize_config(jsonb)'::regprocedure) IS DISTINCT FROM '8d9dac331aa69445a0b2525543c7d741' THEN
  RAISE EXCEPTION 'AMENDMENT_PREFLIGHT_NORMALIZE_CONFIG_DRIFT';
 END IF;
END $$;
create function contract_operations_private.amendment_config(cfg jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.contracts%rowtype; sid uuid; prod jsonb; rule jsonb; tx record; ids uuid[]; rules jsonb; products jsonb:='[]';
begin
 perform public.school_content_assert_admin();
 if jsonb_typeof(cfg) is distinct from 'object' or octet_length(cfg::text)>262144 or exists(select 1 from jsonb_object_keys(cfg) k where k not in('action','contract_id','school_ids','products','reason')) or cfg->>'action' is distinct from 'AMEND' then raise exception 'INVALID_AMENDMENT_CONFIG';end if;
 if length(btrim(coalesce(cfg->>'reason',''))) not between 5 and 500 then raise exception 'REASON_REQUIRED';end if;
 select * into c from public.contracts where id=(cfg->>'contract_id')::uuid;
 select school_id into sid from public.tenants where id=c.tenant_id and tenant_type='SCHOOL' and status='active';
 if c.id is null or c.status<>'ACTIVE' or c.metadata->>'source' is distinct from 'contract_operations_v1' or sid is null or c.starts_at>(now() at time zone 'America/Sao_Paulo')::date or c.ends_at<(now() at time zone 'America/Sao_Paulo')::date or contract_operations_private.superseded(c.id) then raise exception 'CURRENT_SINGLE_SCHOOL_CONTRACT_REQUIRED';end if;
 if exists(select 1 from public.contracts where metadata->>'renewal_of'=c.id::text and status='ACTIVE') then raise exception 'SCHEDULED_SUCCESSOR_REQUIRES_REVIEW';end if;
 if cfg->'school_ids' is distinct from jsonb_build_array(sid) or (select array_agg(s order by s) from contract_operations_private.contract_schools(c.id) s) is distinct from array[sid] then raise exception 'EXACT_CONTRACT_SCHOOL_REQUIRED';end if;
 -- Never silently rewrite inherited, duplicate, sample or subject-restricted licenses.
 if exists(select 1 from public.tenant_product_entitlements e where e.contract_id=c.id and (e.tenant_id<>c.tenant_id or e.metadata->>'source' is distinct from 'school_content_category_v1')) or exists(select 1 from public.tenant_product_entitlements where contract_id=c.id group by product_id having count(*)<>1) then raise exception 'UNSUPPORTED_AMENDMENT_ENTITLEMENTS';end if;
 if exists(select 1 from public.contract_products where contract_id=c.id and (metadata ? 'authorized_subject_ids' or metadata ? 'authorized_sample_grade_ids')) then raise exception 'RESTRICTED_LICENSE_REQUIRES_REVIEW';end if;
 if exists(select 1 from public.tenant_product_entitlements e cross join lateral jsonb_array_elements(e.metadata->'category_rules') r where e.contract_id=c.id and r->>'kind' is distinct from 'STANDARD') then raise exception 'SAMPLE_LICENSE_REQUIRES_REVIEW';end if;
 if jsonb_typeof(cfg->'products') is distinct from 'array' or jsonb_array_length(cfg->'products') not between 1 and 20 then raise exception 'PRODUCTS_REQUIRED';end if;
 if (select count(distinct x->>'product_id') from jsonb_array_elements(cfg->'products') x)<>jsonb_array_length(cfg->'products') then raise exception 'DUPLICATE_PRODUCT';end if;
 for prod in select value from jsonb_array_elements(cfg->'products') loop
  if exists(select 1 from jsonb_object_keys(prod) k where k not in('product_id','institutional','rules')) or jsonb_typeof(prod->'institutional') is distinct from 'boolean' then raise exception 'INVALID_AMENDMENT_PRODUCT';end if;
  if exists(select 1 from public.contract_products cp where cp.contract_id=c.id and cp.product_id=(prod->>'product_id')::uuid and cp.status<>'active') or exists(select 1 from public.tenant_product_entitlements e where e.contract_id=c.id and e.product_id=(prod->>'product_id')::uuid and (e.status<>'ACTIVE' or not exists(select 1 from public.contract_products cp where cp.contract_id=c.id and cp.product_id=e.product_id and cp.status='active'))) then raise exception 'AMENDMENT_REACTIVATION_REQUIRES_REVIEW';end if;
  if not exists(select 1 from public.products where id=(prod->>'product_id')::uuid and status='ACTIVE') then raise exception 'ACTIVE_PRODUCT_REQUIRED';end if;
  if jsonb_typeof(prod->'rules') is distinct from 'array' or jsonb_array_length(prod->'rules') not between 1 and 512 then raise exception 'CATEGORY_RULES_REQUIRED';end if;
  for rule in select value from jsonb_array_elements(prod->'rules') loop
   if rule->>'kind' is distinct from 'STANDARD' or exists(select 1 from jsonb_object_keys(rule) k where k not in('module_id','content_type','grade_id','subject_id','kind')) then raise exception 'STANDARD_RULE_REQUIRED';end if;
   if not exists(select 1 from public.product_content_modules pm join public.content_modules m on m.id=pm.content_module_id and m.status='active' where pm.product_id=(prod->>'product_id')::uuid and m.id=(rule->>'module_id')::uuid and rule->>'content_type'=any(m.content_types::text[])) then raise exception 'MODULE_NOT_IN_PRODUCT';end if;
   select * into tx from school_category_private.taxonomy() where grade_id=(rule->>'grade_id')::uuid;
   if not found then raise exception 'CANONICAL_GRADE_REQUIRED';end if;
   if tx.institutional and (prod->'institutional'<>'true'::jsonb or rule->>'content_type'<>'TRAINING') or not tx.institutional and rule->>'content_type'='TRAINING' then raise exception 'SEPARATE_INSTITUTIONAL_AUTHORIZATION_REQUIRED';end if;
   if nullif(rule->>'subject_id','') is not null and not exists(select 1 from public.content_subjects where id=(rule->>'subject_id')::uuid and status='active') then raise exception 'INVALID_SUBJECT';end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(prod->'rules') r group by r->>'module_id',r->>'content_type',r->>'grade_id' having count(*)>1) then raise exception 'ONE_THEME_PER_CATEGORY';end if;
  select jsonb_agg(value order by value::text) into rules from jsonb_array_elements(prod->'rules');
  products:=products||jsonb_build_array(prod||jsonb_build_object('rules',rules));
 end loop;
 select jsonb_agg(value order by value->>'product_id') into products from jsonb_array_elements(products);
 return cfg||jsonb_build_object('products',products,'reason',btrim(cfg->>'reason'));
end $$;

create function contract_operations_private.amendment_state(cid uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('contract',(select to_jsonb(c) from public.contracts c where id=cid),
 'products',(select coalesce(jsonb_agg(to_jsonb(p) order by product_id),'[]') from public.contract_products p where contract_id=cid),
 'entitlements',(select coalesce(jsonb_agg(to_jsonb(e) order by id),'[]') from public.tenant_product_entitlements e where contract_id=cid),
 'modules',(select coalesce(jsonb_agg(to_jsonb(m) order by entitlement_id,content_module_id),'[]') from public.tenant_product_content_modules m join public.tenant_product_entitlements e on e.id=m.entitlement_id where e.contract_id=cid));
$$;

create function public.admin_preview_contract_amendment(p_config jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare cfg jsonb; prior jsonb; previous_rules jsonb; next_rules jsonb;
begin
 cfg:=contract_operations_private.amendment_config(p_config);
 prior:=contract_operations_private.amendment_state((cfg->>'contract_id')::uuid);
 select coalesce(jsonb_agg(jsonb_build_object('product_id',e->>'product_id','rule',r)),'[]') into previous_rules from jsonb_array_elements(prior->'entitlements') e cross join lateral jsonb_array_elements(e->'metadata'->'category_rules') r where e->>'status'='ACTIVE';
 select coalesce(jsonb_agg(jsonb_build_object('product_id',p->>'product_id','rule',r)),'[]') into next_rules from jsonb_array_elements(cfg->'products') p cross join lateral jsonb_array_elements(p->'rules') r;
 return jsonb_build_object('status','PASS','config',cfg,'revision',md5(contract_operations_private.revision(cfg)||prior::text),'before',prior,
 'product_state_changes',(select coalesce(jsonb_agg(jsonb_build_object('product_id',ids.id,'before_product',cp.status,'before_entitlement',e.status,'after_product',case when selected.id is not null then 'active' else 'inactive' end,'after_entitlement',case when selected.id is not null then 'ACTIVE' else 'REVOKED' end)),'[]') from (select (p->>'product_id')::uuid id from jsonb_array_elements(prior->'products') p union select (p->>'product_id')::uuid from jsonb_array_elements(cfg->'products') p) ids left join public.contract_products cp on cp.contract_id=(cfg->>'contract_id')::uuid and cp.product_id=ids.id left join public.tenant_product_entitlements e on e.contract_id=cp.contract_id and e.product_id=ids.id left join (select (p->>'product_id')::uuid id from jsonb_array_elements(cfg->'products') p) selected on selected.id=ids.id),
 'module_changes',(select coalesce(jsonb_agg(jsonb_build_object('product_id',p->>'product_id','module_id',m.id,'name',m.name,'before',tm.enabled,'after',exists(select 1 from jsonb_array_elements(p->'rules') r where (r->>'module_id')::uuid=m.id))),'[]') from jsonb_array_elements(cfg->'products') p join public.product_content_modules pm on pm.product_id=(p->>'product_id')::uuid join public.content_modules m on m.id=pm.content_module_id left join public.tenant_product_entitlements e on e.contract_id=(cfg->>'contract_id')::uuid and e.product_id=pm.product_id left join public.tenant_product_content_modules tm on tm.entitlement_id=e.id and tm.content_module_id=m.id),
 'added_rules',(select coalesce(jsonb_agg(value),'[]') from (select value from jsonb_array_elements(next_rules) except select value from jsonb_array_elements(previous_rules)) q),
 'removed_rules',(select coalesce(jsonb_agg(value),'[]') from (select value from jsonb_array_elements(previous_rules) except select value from jsonb_array_elements(next_rules)) q),
 'removed_products',(select coalesce(jsonb_agg(p->>'product_id'),'[]') from jsonb_array_elements(prior->'products') p where (p->>'status'='active' or exists(select 1 from jsonb_array_elements(prior->'entitlements') e where e->>'product_id'=p->>'product_id' and e->>'status'<>'REVOKED')) and not exists(select 1 from jsonb_array_elements(cfg->'products') n where n->>'product_id'=p->>'product_id')),
 'effects',jsonb_build_object('dates_preserved',true,'school_activation',false,'per_item_grants',0,'warning','Aditamento do mesmo contrato. Vigência, escola e histórico preservados. Revise ampliações e retiradas.'));
end $$;

create function public.admin_confirm_contract_amendment(p_review jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' set jit='off' as $$
declare actor uuid:=auth.uid(); hash text; saved jsonb; review jsonb; cfg jsonb; prior jsonb; c public.contracts%rowtype; prod jsonb; e public.tenant_product_entitlements%rowtype; grades jsonb; result jsonb;
begin
 perform public.school_content_assert_admin();
 if p_request_id is null or p_review->>'revision' is null then raise exception 'REVIEW_REQUIRED';end if;
 if not pg_try_advisory_xact_lock(81261011) then raise exception 'CONTRACT_WRITE_BUSY';end if;
 hash:=md5(p_review::text);
 select details into saved from public.contract_entitlement_events where actor_user_id=actor and event_type='CONTRACT_AMENDED' and details->>'request_id'=p_request_id::text;
 if found then if saved->>'input_hash'<>hash then raise exception 'REQUEST_ID_REUSED';end if;return saved->'result';end if;
 perform school_category_private.assert_writes_open();perform set_config('lock_timeout','2s',true);
 lock table public.contracts,public.contract_products,public.products,public.product_content_modules,public.content_modules,public.content_grades,public.content_segments,public.content_subjects,public.schools,public.tenants,public.tenant_product_entitlements,public.tenant_product_content_modules,contract_operations_private.targets in share row exclusive mode;
 review:=public.admin_preview_contract_amendment(p_review->'config');
 if review->>'revision'<>p_review->>'revision' then raise exception 'STALE_CONTRACT_REVIEW';end if;
 cfg:=review->'config';prior:=review->'before';select * into c from public.contracts where id=(cfg->>'contract_id')::uuid;
 -- Retire only this contract's products/entitlements, preserving their historical rows.
 update public.tenant_product_entitlements set status='REVOKED' where contract_id=c.id and status<>'REVOKED' and not exists(select 1 from jsonb_array_elements(cfg->'products') p where (p->>'product_id')::uuid=product_id);
 update public.contract_products set status='inactive' where contract_id=c.id and not exists(select 1 from jsonb_array_elements(cfg->'products') p where (p->>'product_id')::uuid=product_id);
 for prod in select value from jsonb_array_elements(cfg->'products') loop
  select jsonb_agg(distinct r->>'grade_id') into grades from jsonb_array_elements(prod->'rules') r;
  insert into public.contract_products(contract_id,product_id,status,metadata) values(c.id,(prod->>'product_id')::uuid,'active',jsonb_build_object('authorized_grade_ids',grades,'institutional_training_authorized',prod->'institutional'))
  on conflict(contract_id,product_id) do update set status='active',metadata=public.contract_products.metadata||excluded.metadata;
  select * into e from public.tenant_product_entitlements where contract_id=c.id and product_id=(prod->>'product_id')::uuid;
  e:=public.admin_create_or_update_tenant_product_entitlement(e.id,c.id,c.tenant_id,(prod->>'product_id')::uuid,coalesce(e.starts_at,c.starts_at),case when e.id is null then c.ends_at else e.ends_at end,'ACTIVE',
   array(select distinct t.segment_id from jsonb_array_elements(prod->'rules') r join school_category_private.taxonomy() t on t.grade_id=(r->>'grade_id')::uuid),
   array(select value::uuid from jsonb_array_elements_text(grades)),coalesce(e.subject_ids,'{}'),
   coalesce(e.metadata,'{}')||jsonb_build_object('source','school_content_category_v1','schema_version',1,'category_rules',prod->'rules','operation_timezone','America/Sao_Paulo','reason',cfg->>'reason'));
  insert into public.tenant_product_content_modules(entitlement_id,content_module_id,enabled,source,metadata,updated_by)
  select e.id,pm.content_module_id,exists(select 1 from jsonb_array_elements(prod->'rules') r where (r->>'module_id')::uuid=pm.content_module_id),'manual','{"source":"contract_amendment_v1"}',actor from public.product_content_modules pm where pm.product_id=e.product_id
  on conflict(entitlement_id,content_module_id) do update set enabled=excluded.enabled,updated_by=actor,metadata=public.tenant_product_content_modules.metadata||excluded.metadata;
 end loop;
 result:=jsonb_build_object('status','PASS','action','AMEND','contract_id',c.id,'school_ids',cfg->'school_ids','request_id',p_request_id);
 insert into public.contract_entitlement_events(contract_id,event_type,actor_user_id,details) values(c.id,'CONTRACT_AMENDED',actor,jsonb_build_object('request_id',p_request_id,'input_hash',hash,'config',cfg,'before',prior,'after',contract_operations_private.amendment_state(c.id),'result',result));
 return result;
end $$;

revoke all on function contract_operations_private.amendment_config(jsonb),contract_operations_private.amendment_state(uuid) from public,anon,authenticated;
revoke all on function public.admin_preview_contract_amendment(jsonb),public.admin_confirm_contract_amendment(jsonb,uuid) from public,anon;
grant execute on function public.admin_preview_contract_amendment(jsonb),public.admin_confirm_contract_amendment(jsonb,uuid) to authenticated,service_role;
-- Existing validator: only the bound changes, existing ACL and behavior preserved.
create or replace function school_category_private.normalize_config(p_config jsonb)
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
 if jsonb_typeof(p_config->'rules') is distinct from 'array' or jsonb_array_length(p_config->'rules')>512 then raise exception 'INVALID_CATEGORY_RULES';end if;
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


COMMIT;
