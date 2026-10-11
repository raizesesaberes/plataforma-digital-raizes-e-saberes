-- REVIEW ONLY. No production execution; preserve existing ACLs.
BEGIN;
DO $$ BEGIN
 IF (select md5(prosrc) from pg_proc where oid='contract_operations_private.validate(jsonb)'::regprocedure) IS DISTINCT FROM '2359da9524bbe24358fb60f0acbd8ff8' THEN RAISE EXCEPTION 'SCHOOL_CONTRACT_PREFLIGHT_DRIFT';END IF;
 IF (select md5(prosrc) from pg_proc where oid='public.admin_preview_contract_operation(jsonb)'::regprocedure) IS DISTINCT FROM '8fd3fc7f840531785b12e56851b99ef2' THEN RAISE EXCEPTION 'SCHOOL_CONTRACT_PREFLIGHT_DRIFT';END IF;
 IF (select md5(prosrc) from pg_proc where oid='public.admin_confirm_contract_operation(jsonb,uuid)'::regprocedure) IS DISTINCT FROM 'a2c468db78132a35fadaa0d7d3233357' THEN RAISE EXCEPTION 'SCHOOL_CONTRACT_PREFLIGHT_DRIFT';END IF;
END $$;
create or replace function contract_operations_private.validate(p_config jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare cfg jsonb:=p_config; old public.contracts%rowtype; prod jsonb; r jsonb; sc uuid; tx record;
 st date; en date; nw jsonb; ns jsonb; ids uuid[]; pid uuid; owner_tenant uuid; n integer; rule_set jsonb; copied jsonb; school_rules jsonb; selected_rules jsonb; source_entitlement uuid; school_modules jsonb;
begin
 perform public.school_content_assert_admin();
 if jsonb_typeof(cfg) is distinct from 'object' or octet_length(cfg::text)>262144 or exists(select 1 from jsonb_object_keys(cfg) k where k not in('action','contract_id','renewal_id','network_id','new_network','reference','starts_at','ends_at','school_ids','new_school','products','reason','adopt_dynamic','term_months','reuse_previous','contractor_type')) then raise exception 'INVALID_CONTRACT_CONFIG';end if;
 if length(btrim(coalesce(cfg->>'reason',''))) not between 5 and 500 then raise exception 'REASON_REQUIRED';end if;
 if cfg->>'action'='REVOKE' then
  select * into old from public.contracts where id=(cfg->>'contract_id')::uuid;
  if old.id is null or old.metadata->>'source' is distinct from 'contract_operations_v1' or old.status not in('ACTIVE','SUSPENDED') then raise exception 'OPERATIONAL_ACTIVE_CONTRACT_REQUIRED';end if;
  if exists(select 1 from public.contracts where metadata->>'renewal_of'=old.id::text and status='ACTIVE') then raise exception 'REVOKE_SUCCESSOR_FIRST';end if;
  -- Revoking an effective renewal must not revive its predecessor.

  return cfg;
 end if;
 if cfg->>'action' is distinct from 'CREATE' or cfg->'adopt_dynamic' is distinct from 'true'::jsonb then raise exception 'EXPLICIT_DYNAMIC_ADOPTION_REQUIRED';end if;
 if length(btrim(coalesce(cfg->>'reference',''))) not between 3 and 120 then raise exception 'CONTRACT_REFERENCE_REQUIRED';end if;
 st:=(cfg->>'starts_at')::date;en:=(cfg->>'ends_at')::date;
 if st is null or en is null or en<st or st<(now() at time zone 'America/Sao_Paulo')::date then raise exception 'VALID_FINITE_WINDOW_REQUIRED';end if;
 if cfg ? 'term_months' and (cfg->>'term_months'<>'12' or en<>((st+interval '12 months')::date-1)) then raise exception 'TWELVE_CALENDAR_MONTHS_REQUIRED';end if;
 if jsonb_typeof(cfg->'school_ids') is distinct from 'array' or jsonb_array_length(cfg->'school_ids')>25 then raise exception 'INVALID_SCHOOLS';end if;
 select coalesce(array_agg(x::uuid),'{}') into ids from jsonb_array_elements_text(cfg->'school_ids') x;
 if array_position(ids,null) is not null or cardinality(ids)<>(select count(distinct x) from unnest(ids)x) then raise exception 'DUPLICATE_SCHOOLS';end if;
 foreach sc in array ids loop
  if not exists(select 1 from public.schools where id=sc) then raise exception 'SCHOOL_NOT_FOUND';end if;
  if exists(select 1 from public.tenants where school_id=sc and status<>'active') then raise exception 'SCHOOL_TENANT_INACTIVE';end if;
 end loop;
 ns:=cfg->'new_school';
 if ns is not null and ns<>'null'::jsonb then
  if jsonb_typeof(ns) is distinct from 'object' or length(btrim(coalesce(ns->>'name','')))<3 or length(btrim(coalesce(ns->>'code','')))<2 or coalesce(ns->>'year','')!~'^[0-9]{4}$' then raise exception 'INVALID_NEW_SCHOOL';end if;
  if exists(select 1 from public.schools where lower(btrim(nome))=lower(btrim(ns->>'name')) or lower(btrim(codigo_inep))=lower(btrim(ns->>'code'))) or exists(select 1 from public.rs_school_installations where lower(btrim(school_code))=lower(btrim(ns->>'code'))) then raise exception 'DUPLICATE_SCHOOL_USE_EXISTING';end if;
 end if;
 if (cardinality(ids)+case when ns is not null and ns<>'null'::jsonb then 1 else 0 end) not between 1 and 25 then raise exception 'EXPLICIT_SCHOOL_SELECTION_REQUIRED';end if;
 if nullif(cfg->>'renewal_id','') is not null then
  select * into old from public.contracts where id=(cfg->>'renewal_id')::uuid;
  if old.id is null or old.status not in('ACTIVE','ENDED') or st<=old.starts_at or (old.ends_at is not null and st<=old.ends_at) then raise exception 'RENEWAL_WINDOW_OVERLAPS';end if;
  if exists(select 1 from public.contracts where metadata->>'renewal_of'=old.id::text and status='ACTIVE') then raise exception 'RENEWAL_ALREADY_SCHEDULED';end if;
  if (select tenant_type from public.tenants where id=old.tenant_id)='SCHOOL' and (cardinality(ids)<>1 or ns is not null and ns<>'null'::jsonb or ids[1]<>(select school_id from public.tenants where id=old.tenant_id)) then raise exception 'SCHOOL_CONTRACT_TARGET_MUST_BE_PRESERVED';end if;
 else
  if cfg ? 'contractor_type' and coalesce(cfg->>'contractor_type','') not in ('SCHOOL','NETWORK') then raise exception 'EXPLICIT_CONTRACTOR_TYPE_REQUIRED';end if;
  if cfg->>'contractor_type'='SCHOOL' then
   if (cardinality(ids)+case when ns is not null and ns<>'null'::jsonb then 1 else 0 end)<>1 then raise exception 'SINGLE_SCHOOL_CONTRACT_REQUIRED';end if;
   if nullif(cfg->>'network_id','') is not null or (cfg->'new_network' is not null and cfg->'new_network'<>'null'::jsonb) then raise exception 'SCHOOL_CONTRACT_HAS_NO_NETWORK';end if;
  else
  nw:=cfg->'new_network';
  if nullif(cfg->>'network_id','') is not null then
   if nw is not null and nw<>'null'::jsonb then raise exception 'ONE_CONTRACTOR_REQUIRED';end if;
   if not exists(select 1 from public.education_networks where id=(cfg->>'network_id')::uuid and status='active') then raise exception 'ACTIVE_CONTRACTOR_REQUIRED';end if;
  else
   if jsonb_typeof(nw) is distinct from 'object' or length(btrim(coalesce(nw->>'name','')))<3 or length(btrim(coalesce(nw->>'code','')))<2 then raise exception 'CONTRACTOR_REQUIRED';end if;
   if exists(select 1 from public.education_networks where lower(btrim(code))=lower(btrim(nw->>'code')) or lower(btrim(name))=lower(btrim(nw->>'name'))) then raise exception 'DUPLICATE_CONTRACTOR_USE_EXISTING';end if;
  end if;
  end if;
 end if;
 if old.id is not null then
  owner_tenant:=old.tenant_id;
  if cfg ? 'contractor_type' and cfg->>'contractor_type' is distinct from (select tenant_type::text from public.tenants where id=owner_tenant) then raise exception 'RENEWAL_CONTRACTOR_MUST_BE_PRESERVED';end if;
 elsif cfg->>'contractor_type'='SCHOOL' then select id into owner_tenant from public.tenants where tenant_type='SCHOOL' and school_id=ids[1];
 else select id into owner_tenant from public.tenants where network_id=nullif(cfg->>'network_id','')::uuid;end if;
 if owner_tenant is not null and not exists(select 1 from public.tenants where id=owner_tenant and status='active') then raise exception 'CONTRACTOR_TENANT_INACTIVE';end if;
 if exists(select 1 from public.contracts where tenant_id=owner_tenant and lower(btrim(contract_ref))=lower(btrim(cfg->>'reference'))) then raise exception 'DUPLICATE_CONTRACT_REFERENCE';end if;
 if cfg->'reuse_previous'='true'::jsonb then
  if old.id is null or (ns is not null and ns<>'null'::jsonb) or exists(select 1 from unnest(ids) x where x not in(select school from contract_operations_private.contract_schools(old.id) school)) then raise exception 'NEW_TARGET_REQUIRES_EDITED_CONFIGURATION';end if;
  copied:='[]';
  for pid in select distinct e.product_id from public.tenant_product_entitlements e where e.contract_id=old.id and e.status='ACTIVE' loop
   if not exists(select 1 from public.contract_products cp where cp.contract_id=old.id and cp.product_id=pid and cp.status='active') then raise exception 'INACTIVE_PREVIOUS_PRODUCT_REQUIRES_SEPARATE_REVIEW';end if;
   school_rules:='{}';school_modules:='{}';selected_rules:=null;
   foreach sc in array ids loop
    select count(*) into n from public.tenant_product_entitlements e join public.tenants t on t.id=e.tenant_id where e.contract_id=old.id and e.product_id=pid and e.status='ACTIVE' and (t.school_id=sc or t.id=old.tenant_id);
    if n>1 then raise exception 'AMBIGUOUS_PREVIOUS_CONFIGURATION_REQUIRES_EXPLICIT_REVIEW';end if;
    select e.id,e.metadata->'category_rules' into source_entitlement,rule_set from public.tenant_product_entitlements e join public.tenants t on t.id=e.tenant_id where e.contract_id=old.id and e.product_id=pid and e.status='ACTIVE' and (t.school_id=sc or t.id=old.tenant_id) order by (t.school_id=sc) desc nulls last,e.created_at desc limit 1;
    if not found then continue;end if;
    if rule_set is null or jsonb_typeof(rule_set)<>'array' or jsonb_array_length(rule_set)=0 then raise exception 'LEGACY_CONFIGURATION_REQUIRES_EXPLICIT_CATEGORY_SELECTION';end if;
    if exists(select 1 from jsonb_array_elements(rule_set) rr where rr->>'kind' is distinct from 'STANDARD') then raise exception 'TEMPORARY_SAMPLE_REQUIRES_EXPLICIT_REVIEW';end if;
    select jsonb_agg(jsonb_build_object('module_id',rr->>'module_id','content_type',rr->>'content_type','grade_id',rr->>'grade_id','subject_id',rr->>'subject_id','kind','STANDARD') order by rr::text) into rule_set from jsonb_array_elements(rule_set) rr;
    school_modules:=school_modules||jsonb_build_object(sc::text,coalesce((select jsonb_object_agg(content_module_id::text,enabled) from public.tenant_product_content_modules where entitlement_id=source_entitlement),'{}'));
    school_rules:=school_rules||jsonb_build_object(sc::text,rule_set);selected_rules:=coalesce(selected_rules,rule_set);
   end loop;
   if selected_rules is null then continue;end if;
   copied:=copied||jsonb_build_array(jsonb_build_object('product_id',pid,'rules',selected_rules,'school_rules',school_rules,'school_module_overrides',school_modules,'license_metadata',(select metadata from public.contract_products where contract_id=old.id and product_id=pid),'institutional',coalesce((select metadata->'institutional_training_authorized' from public.contract_products where contract_id=old.id and product_id=pid),'false')));
  end loop;
  cfg:=jsonb_set(cfg,'{products}',copied);
 elsif exists(select 1 from jsonb_array_elements(coalesce(cfg->'products','[]')) p where p ? 'school_rules' or p ? 'license_metadata' or p ? 'school_module_overrides') then raise exception 'SCHOOL_RULES_REQUIRE_PREVIOUS_CONFIGURATION';
 end if;
 if jsonb_typeof(cfg->'products') is distinct from 'array' or jsonb_array_length(cfg->'products') not between 1 and 20 then raise exception 'PRODUCTS_REQUIRED';end if;
 if (select count(distinct value->>'product_id') from jsonb_array_elements(cfg->'products'))<>jsonb_array_length(cfg->'products') then raise exception 'DUPLICATE_PRODUCT';end if;
 for prod in select value from jsonb_array_elements(cfg->'products') loop
  pid:=(prod->>'product_id')::uuid;
  -- Editing the uniform configuration is not implicit authorization to lift a
  -- suspension/termination on a previously contracted product. Separate review required.
  if old.id is not null and (exists(select 1 from public.contract_products cp where cp.contract_id=old.id and cp.product_id=pid) or exists(select 1 from public.tenant_product_entitlements e where e.contract_id=old.id and e.product_id=pid))
   and not exists(select 1 from public.contract_products cp where cp.contract_id=old.id and cp.product_id=pid and cp.status='active') then raise exception 'INACTIVE_PREVIOUS_PRODUCT_REQUIRES_SEPARATE_REVIEW';end if;
  if not exists(select 1 from public.products where id=pid and status='ACTIVE') then raise exception 'ACTIVE_PRODUCT_REQUIRED';end if;
  for rule_set in select prod->'rules' union all select value from jsonb_each(coalesce(prod->'school_rules','{}')) loop
  if jsonb_typeof(rule_set) is distinct from 'array' or jsonb_array_length(rule_set) not between 1 and 512 then raise exception 'CATEGORY_RULES_REQUIRED';end if;
  for r in select value from jsonb_array_elements(rule_set) loop
   if r->>'kind' is distinct from 'STANDARD' then raise exception 'STANDARD_RULE_REQUIRED';end if;
   if not exists(select 1 from public.product_content_modules pm join public.content_modules m on m.id=pm.content_module_id and m.status='active' where pm.product_id=pid and m.id=(r->>'module_id')::uuid and r->>'content_type'=any(m.content_types::text[])) then raise exception 'MODULE_NOT_IN_PRODUCT';end if;
   select * into tx from school_category_private.taxonomy() where grade_id=(r->>'grade_id')::uuid;
   if not found then raise exception 'CANONICAL_GRADE_REQUIRED';end if;
   if tx.institutional and (prod->'institutional' is distinct from 'true'::jsonb or r->>'content_type'<>'TRAINING') or not tx.institutional and r->>'content_type'='TRAINING' then raise exception 'SEPARATE_INSTITUTIONAL_AUTHORIZATION_REQUIRED';end if;
   if nullif(r->>'subject_id','') is not null and not exists(select 1 from public.content_subjects where id=(r->>'subject_id')::uuid and status='active') then raise exception 'INVALID_SUBJECT';end if;
   if exists(select 1 from jsonb_object_keys(r) k where k not in('module_id','content_type','grade_id','subject_id','kind')) then raise exception 'UNSUPPORTED_RULE_FIELDS';end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(rule_set) rr(rule) group by rr.rule->>'module_id',rr.rule->>'content_type',rr.rule->>'grade_id' having count(*)>1) then raise exception 'ONE_THEME_PER_CATEGORY';end if;
  end loop;
 end loop;
 return cfg;
end $$;

create or replace function public.admin_preview_contract_operation(p_config jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare cfg jsonb; prior jsonb;
begin
 cfg:=contract_operations_private.validate(p_config);
 select to_jsonb(c) into prior from public.contracts c where id=coalesce(nullif(cfg->>'renewal_id',''),nullif(cfg->>'contract_id',''))::uuid;
 return jsonb_build_object('status','PASS','config',cfg,'revision',contract_operations_private.revision(cfg),'previous_contract',prior,
 'removed_schools',(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.nome)),'[]') from contract_operations_private.contract_schools(nullif(cfg->>'renewal_id','')::uuid) sid join public.schools s on s.id=sid where not (coalesce(cfg->'school_ids','[]') ? s.id::text)),
 'contractor',case when cfg->>'contractor_type'='SCHOOL' then coalesce(nullif(cfg->'new_school','null'::jsonb),(select jsonb_build_object('name',s.nome,'code',s.codigo_inep) from public.schools s where s.id=(cfg->'school_ids'->>0)::uuid)) when cfg->'new_network' is not null and cfg->'new_network'<>'null'::jsonb then cfg->'new_network' else (select jsonb_build_object('id',n.id,'name',n.name,'code',n.code) from public.education_networks n where n.id=coalesce(nullif(cfg->>'network_id','')::uuid,(select network_id from public.tenants where id=(prior->>'tenant_id')::uuid))) end,
 'schools',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',nome,'status',status) order by nome),'[]') from public.schools where id in(select value::uuid from jsonb_array_elements_text(coalesce(cfg->'school_ids','[]')) union select sid from contract_operations_private.contract_schools(nullif(cfg->>'contract_id','')::uuid) sid)),
 'effects',jsonb_build_object('current_and_future_classified_content',true,'per_item_grants',0,'school_activation',false,'network_membership_changes',0,'legacy_history_preserved',true,
 'warning','A adoção de categorias começa na vigência. Direitos legados deixam de ampliar o acesso; BLOCK/EMBARGO, idade, suspensão e entrega protegida continuam obrigatórios. Escolas inativas continuam sem acesso.'));
end $$;

create or replace function public.admin_confirm_contract_operation(p_review jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' set jit='off' as $$
declare cfg jsonb; receipt jsonb; hash text; actor uuid:=auth.uid(); tid uuid;nid uuid;cid uuid;sid uuid;bt uuid;prod jsonb;ns jsonb;created jsonb;ent public.tenant_product_entitlements%rowtype;ids uuid[];result jsonb;previous public.contracts%rowtype; prod_rules jsonb;
begin
 perform public.school_content_assert_admin();
 if p_request_id is null or p_review->>'revision' is null then raise exception 'REVIEW_REQUIRED';end if;
 if not pg_try_advisory_xact_lock(81261011) then raise exception 'CONTRACT_WRITE_BUSY';end if;
 hash:=md5(p_review::text);
 select details into receipt from public.contract_entitlement_events where event_type='CONTRACT_OPERATION' and actor_user_id=actor and details->>'request_id'=p_request_id::text;
 if found then if receipt->>'input_hash'<>hash then raise exception 'REQUEST_ID_REUSED';end if;return receipt->'result';end if;
 perform school_category_private.assert_writes_open();
 perform set_config('lock_timeout','2s',true);
 lock table public.contracts,public.contract_products,public.products,public.product_content_modules,public.content_modules,public.content_grades,public.content_segments,public.content_subjects,public.schools,public.rs_school_installations,public.tenants,public.education_networks,public.tenant_product_entitlements,public.tenant_product_content_modules,contract_operations_private.targets in share row exclusive mode;
 cfg:=contract_operations_private.validate(p_review->'config');
 if contract_operations_private.revision(cfg)<>p_review->>'revision' then raise exception 'STALE_CONTRACT_REVIEW';end if;
 if cfg->>'action'='REVOKE' then
  cid:=(cfg->>'contract_id')::uuid;
  select * into previous from public.contracts where id=cid;
  update public.tenant_product_entitlements set status='REVOKED',updated_by=actor,updated_at=now() where contract_id=cid;
  update public.contracts set status='CANCELLED',metadata=metadata||jsonb_build_object('revoked_after_start',starts_at<=(now() at time zone 'America/Sao_Paulo')::date),updated_at=now() where id=cid;
  update contract_operations_private.targets set cancelled_before_use=true where contract_id=cid and adoption_on>(now() at time zone 'America/Sao_Paulo')::date;
 else
  select coalesce(array_agg(value::uuid),'{}') into ids from jsonb_array_elements_text(cfg->'school_ids');
  ns:=cfg->'new_school';
  if ns is not null and ns<>'null'::jsonb then
   created:=public.admin_create_school(ns->>'name',ns->>'code',ns->>'year',ns->>'municipality',ns->>'state',null,'test');
   if created->>'school_id' is null then raise exception 'SCHOOL_CREATION_FAILED';end if;
   ids:=array_append(ids,(created->>'school_id')::uuid);
  end if;
  if nullif(cfg->>'renewal_id','') is not null then
   select * into previous from public.contracts where id=(cfg->>'renewal_id')::uuid;tid:=previous.tenant_id;
  elsif cfg->>'contractor_type'='SCHOOL' then
   select id into tid from public.tenants where tenant_type='SCHOOL' and school_id=ids[1];
   if tid is null then insert into public.tenants(tenant_type,school_id) values('SCHOOL',ids[1]) returning id into tid;end if;
  else
   nid:=nullif(cfg->>'network_id','')::uuid;
   if nid is null then
    insert into public.education_networks(name,code,created_by) values(btrim(cfg->'new_network'->>'name'),btrim(cfg->'new_network'->>'code'),actor) returning id into nid;
   end if;
   select id into tid from public.tenants where network_id=nid;
   if tid is null then insert into public.tenants(tenant_type,network_id) values('NETWORK',nid) returning id into tid;end if;
  end if;
  if not exists(select 1 from public.tenants where id=tid and status='active') then raise exception 'CONTRACTOR_TENANT_INACTIVE';end if;
  insert into public.contracts(tenant_id,contract_ref,starts_at,ends_at,status,metadata,created_by)
  values(tid,btrim(cfg->>'reference'),(cfg->>'starts_at')::date,(cfg->>'ends_at')::date,'ACTIVE',jsonb_build_object('source','contract_operations_v1','renewal_of',previous.id,'reason',cfg->>'reason'),actor) returning id into cid;
  foreach sid in array ids loop
   insert into contract_operations_private.targets(contract_id,school_id,adoption_on) values(cid,sid,(cfg->>'starts_at')::date);
  end loop;
  -- Removed targets switch to the category gate at the successor start too. This
  -- prevents legacy grants from surviving a renewal that excludes their school.
  if previous.id is not null then
   for sid in select school from contract_operations_private.contract_schools(previous.id) school where not(school=any(ids)) loop
    insert into contract_operations_private.targets(contract_id,school_id,adoption_on,licensed) values(cid,sid,(cfg->>'starts_at')::date,false);
    if not exists(select 1 from public.tenants where school_id=sid) then insert into public.tenants(tenant_type,school_id) values('SCHOOL',sid);end if;
   end loop;
  end if;
  for prod in select value from jsonb_array_elements(cfg->'products') loop
   insert into public.contract_products(contract_id,product_id,status,metadata)
   values(cid,(prod->>'product_id')::uuid,'active',coalesce(prod->'license_metadata',jsonb_build_object('authorized_grade_ids',(select jsonb_agg(distinct r->>'grade_id') from (select prod->'rules' rules union all select value from jsonb_each(coalesce(prod->'school_rules','{}'))) sets cross join lateral jsonb_array_elements(sets.rules) r),'institutional_training_authorized',coalesce((prod->>'institutional')::boolean,false))));
   foreach sid in array ids loop
    if prod ? 'school_rules' and not (prod->'school_rules' ? sid::text) then continue;end if;
    prod_rules:=coalesce(prod->'school_rules'->sid::text,prod->'rules');
    select id into bt from public.tenants where school_id=sid;
    if bt is null then insert into public.tenants(tenant_type,school_id) values('SCHOOL',sid) returning id into bt;end if;
    ent:=public.admin_create_or_update_tenant_product_entitlement(null,cid,bt,(prod->>'product_id')::uuid,(cfg->>'starts_at')::date,(cfg->>'ends_at')::date,'ACTIVE',
     array(select distinct t.segment_id from jsonb_array_elements(prod_rules) r join school_category_private.taxonomy()t on t.grade_id=(r->>'grade_id')::uuid),
     array(select distinct (r->>'grade_id')::uuid from jsonb_array_elements(prod_rules)r),'{}',
     jsonb_build_object('source','school_content_category_v1','schema_version',1,'category_rules',prod_rules,'operation_timezone','America/Sao_Paulo','reason',cfg->>'reason'));
    insert into public.tenant_product_content_modules(entitlement_id,content_module_id,enabled,source,metadata,updated_by)
    select ent.id,pm.content_module_id,coalesce((prod->'school_module_overrides'->sid::text->>pm.content_module_id::text)::boolean,exists(select 1 from jsonb_array_elements(prod_rules)r where (r->>'module_id')::uuid=pm.content_module_id)),'manual','{"source":"contract_operations_v1"}',actor from public.product_content_modules pm where pm.product_id=ent.product_id;
   end loop;
  end loop;
 end if;
 result:=jsonb_build_object('status','PASS','contract_id',cid,'school_ids',to_jsonb(ids),'new_school',created,'request_id',p_request_id);
 insert into public.contract_entitlement_events(contract_id,event_type,actor_user_id,details) values(cid,'CONTRACT_OPERATION',actor,jsonb_build_object('request_id',p_request_id,'input_hash',hash,'config',cfg,'before',to_jsonb(previous),'result',result));
 return result;
exception when lock_not_available then raise exception 'CONTRACT_WRITE_BUSY';
end $$;
COMMIT;
