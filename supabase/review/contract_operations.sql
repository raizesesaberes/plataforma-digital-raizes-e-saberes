-- REVIEW ONLY: do not deploy without explicit security/migration authorization.
begin;
create schema contract_operations_private;
revoke all on schema contract_operations_private from public,anon,authenticated,service_role;
create table contract_operations_private.targets (
 contract_id uuid not null references public.contracts(id),
 school_id uuid not null references public.schools(id),
 adoption_on date not null,
 cancelled_before_use boolean not null default false,
 licensed boolean not null default true,
 primary key(contract_id,school_id)
);
create index on contract_operations_private.targets(school_id,adoption_on);
alter table contract_operations_private.targets enable row level security;
revoke all on contract_operations_private.targets from public,anon,authenticated,service_role;
create unique index contract_operation_request_once on public.contract_entitlement_events(actor_user_id,(details->>'request_id')) where event_type='CONTRACT_OPERATION';
create unique index contract_operation_successor_once on public.contracts((metadata->>'renewal_of')) where metadata->>'source'='contract_operations_v1' and status='ACTIVE' and metadata->>'renewal_of' is not null;

create function contract_operations_private.adopted(p_school uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.tenants where school_id=p_school and metadata->>'category_entitlements_enabled'='true')
 or exists(select 1 from contract_operations_private.targets where school_id=p_school and adoption_on<=(now() at time zone 'America/Sao_Paulo')::date and not cancelled_before_use);
$$;
create function contract_operations_private.in_scope(p_contract uuid,p_school uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from contract_operations_private.targets where contract_id=p_contract and school_id=p_school and licensed);
$$;
-- Explicit contract targets do not add network membership or expose older network contracts.
create or replace function school_category_private.school_contract(p_school uuid,p_contract uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.contracts c join public.tenants t on t.id=c.tenant_id
 join public.schools s on s.id=p_school and s.status='active'
 where c.id=p_contract and c.status='ACTIVE' and c.starts_at<=case when c.metadata->>'source'='contract_operations_v1' then (now() at time zone 'America/Sao_Paulo')::date else current_date end and (c.ends_at is null or c.ends_at>=case when c.metadata->>'source'='contract_operations_v1' then (now() at time zone 'America/Sao_Paulo')::date else current_date end)
 and t.status='active' and not exists(select 1 from public.contracts successor where successor.metadata->>'renewal_of'=c.id::text and successor.metadata->>'source'='contract_operations_v1' and (successor.status='ACTIVE' or successor.metadata->>'revoked_after_start'='true') and successor.starts_at<=(now() at time zone 'America/Sao_Paulo')::date)
 and case when c.metadata->>'source'='contract_operations_v1' then contract_operations_private.in_scope(c.id,p_school)
 else (t.school_id=s.id or (t.tenant_type='NETWORK' and exists(
 select 1 from public.network_school_memberships m join public.education_networks n on n.id=m.network_id and n.status='active'
 where m.network_id=t.network_id and m.school_id=s.id and m.status='active' and (m.ended_at is null or m.ended_at>now())))) end
 and (t.network_id is null or exists(select 1 from public.education_networks n where n.id=t.network_id and n.status='active')));
$$;

create function contract_operations_private.contract_schools(p_contract uuid) returns setof uuid
language sql stable security definer set search_path='' as $$
 select x.school_id from contract_operations_private.targets x join public.contracts c on c.id=x.contract_id where c.id=p_contract and c.metadata->>'source'='contract_operations_v1' and x.licensed
 union select s.id from public.contracts c join public.tenants t on t.id=c.tenant_id join public.schools s on t.school_id=s.id or (t.network_id is not null and exists(select 1 from public.network_school_memberships n where n.network_id=t.network_id and n.school_id=s.id and n.status='active' and (n.ended_at is null or n.ended_at>now()))) where c.id=p_contract and c.metadata->>'source' is distinct from 'contract_operations_v1';
$$;

create function public.admin_get_contract_operations() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform public.school_content_assert_admin();
 return jsonb_build_object('status','PASS','schema_version',1,
 'schools',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',nome,'code',codigo_inep,'status',status) order by nome),'[]') from public.schools),
 'networks',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'code',code,'status',status) order by name),'[]') from public.education_networks),
 'taxonomy',(select jsonb_agg(to_jsonb(t) order by sort_order) from school_category_private.taxonomy() t),
 'subjects',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) order by name),'[]') from public.content_subjects where status='active'),
 'products',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'modules',(select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'name',m.name,'content_types',m.content_types) order by m.name),'[]') from public.product_content_modules pm join public.content_modules m on m.id=pm.content_module_id and m.status='active' where pm.product_id=p.id)) order by p.name),'[]') from public.products p where p.status='ACTIVE'),
 'contracts',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'reference',c.contract_ref,'starts_at',c.starts_at,'ends_at',c.ends_at,'status',c.status,'network_id',t.network_id,'tenant_school_id',t.school_id,'operational',c.metadata->>'source'='contract_operations_v1','renewal_of',c.metadata->>'renewal_of','revoked_after_start',c.metadata->>'revoked_after_start'='true',
 'school_ids',coalesce((select jsonb_agg(sid order by sid) from contract_operations_private.contract_schools(c.id) sid),'[]'),
 'configurations',coalesce((select jsonb_agg(distinct jsonb_build_object('product_id',e.product_id,'rules',coalesce(e.metadata->'category_rules','[]'),'institutional',coalesce(cp.metadata->'institutional_training_authorized','false'))) from public.tenant_product_entitlements e join public.contract_products cp on cp.contract_id=e.contract_id and cp.product_id=e.product_id where e.contract_id=c.id and e.status='ACTIVE'),'[]')) order by c.created_at desc),'[]') from public.contracts c join public.tenants t on t.id=c.tenant_id));
end $$;

create function contract_operations_private.validate(p_config jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare cfg jsonb:=p_config; old public.contracts%rowtype; prod jsonb; r jsonb; sc uuid; tx record;
 st date; en date; nw jsonb; ns jsonb; ids uuid[]; pid uuid; owner_tenant uuid; n integer; rule_set jsonb; copied jsonb; school_rules jsonb; selected_rules jsonb; source_entitlement uuid; school_modules jsonb;
begin
 perform public.school_content_assert_admin();
 if jsonb_typeof(cfg) is distinct from 'object' or octet_length(cfg::text)>262144 or exists(select 1 from jsonb_object_keys(cfg) k where k not in('action','contract_id','renewal_id','network_id','new_network','reference','starts_at','ends_at','school_ids','new_school','products','reason','adopt_dynamic','term_months','reuse_previous')) then raise exception 'INVALID_CONTRACT_CONFIG';end if;
 if length(btrim(coalesce(cfg->>'reason',''))) not between 5 and 500 then raise exception 'REASON_REQUIRED';end if;
 if cfg->>'action'='REVOKE' then
  select * into old from public.contracts where id=(cfg->>'contract_id')::uuid;
  if old.id is null or old.metadata->>'source' is distinct from 'contract_operations_v1' or old.status<>'ACTIVE' then raise exception 'OPERATIONAL_ACTIVE_CONTRACT_REQUIRED';end if;
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
  nw:=cfg->'new_network';
  if nullif(cfg->>'network_id','') is not null then
   if nw is not null and nw<>'null'::jsonb then raise exception 'ONE_CONTRACTOR_REQUIRED';end if;
   if not exists(select 1 from public.education_networks where id=(cfg->>'network_id')::uuid and status='active') then raise exception 'ACTIVE_CONTRACTOR_REQUIRED';end if;
  else
   if jsonb_typeof(nw) is distinct from 'object' or length(btrim(coalesce(nw->>'name','')))<3 or length(btrim(coalesce(nw->>'code','')))<2 then raise exception 'CONTRACTOR_REQUIRED';end if;
   if exists(select 1 from public.education_networks where lower(btrim(code))=lower(btrim(nw->>'code')) or lower(btrim(name))=lower(btrim(nw->>'name'))) then raise exception 'DUPLICATE_CONTRACTOR_USE_EXISTING';end if;
  end if;
 end if;
 if old.id is not null then owner_tenant:=old.tenant_id;else select id into owner_tenant from public.tenants where network_id=nullif(cfg->>'network_id','')::uuid;end if;
 if owner_tenant is not null and not exists(select 1 from public.tenants where id=owner_tenant and status='active') then raise exception 'CONTRACTOR_TENANT_INACTIVE';end if;
 if exists(select 1 from public.contracts where tenant_id=owner_tenant and lower(btrim(contract_ref))=lower(btrim(cfg->>'reference'))) then raise exception 'DUPLICATE_CONTRACT_REFERENCE';end if;
 if cfg->'reuse_previous'='true'::jsonb then
  if old.id is null or (ns is not null and ns<>'null'::jsonb) or exists(select 1 from unnest(ids) x where x not in(select school from contract_operations_private.contract_schools(old.id) school)) then raise exception 'NEW_TARGET_REQUIRES_EDITED_CONFIGURATION';end if;
  copied:='[]';
  for pid in select distinct e.product_id from public.tenant_product_entitlements e where e.contract_id=old.id and e.status='ACTIVE' loop
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

-- Fingerprint all mutable dependencies shown in the review, including prior school rights.
create function contract_operations_private.revision(p_config jsonb) returns text
language sql stable security definer set search_path='' as $$
 select md5(jsonb_build_object('config',p_config,'catalog',public.admin_get_contract_operations(),
 'entitlements',(select jsonb_agg(to_jsonb(e) order by id) from public.tenant_product_entitlements e),
 'tenants',(select jsonb_agg(to_jsonb(t) order by id) from public.tenants t),
 'licenses',(select jsonb_agg(to_jsonb(cp) order by contract_id,product_id) from public.contract_products cp),
 'modules',(select jsonb_agg(to_jsonb(pm) order by product_id,content_module_id) from public.product_content_modules pm),
 'targets',(select jsonb_agg(to_jsonb(t) order by contract_id,school_id) from contract_operations_private.targets t))::text);
$$;
create function public.admin_preview_contract_operation(p_config jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare cfg jsonb; prior jsonb;
begin
 cfg:=contract_operations_private.validate(p_config);
 select to_jsonb(c) into prior from public.contracts c where id=coalesce(nullif(cfg->>'renewal_id',''),nullif(cfg->>'contract_id',''))::uuid;
 return jsonb_build_object('status','PASS','config',cfg,'revision',contract_operations_private.revision(cfg),'previous_contract',prior,
 'removed_schools',(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.nome)),'[]') from contract_operations_private.contract_schools(nullif(cfg->>'renewal_id','')::uuid) sid join public.schools s on s.id=sid where not (coalesce(cfg->'school_ids','[]') ? s.id::text)),
 'contractor',case when cfg->'new_network' is not null and cfg->'new_network'<>'null'::jsonb then cfg->'new_network' else (select jsonb_build_object('id',n.id,'name',n.name,'code',n.code) from public.education_networks n where n.id=coalesce(nullif(cfg->>'network_id','')::uuid,(select network_id from public.tenants where id=(prior->>'tenant_id')::uuid))) end,
 'schools',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',nome,'status',status) order by nome),'[]') from public.schools where id in(select value::uuid from jsonb_array_elements_text(coalesce(cfg->'school_ids','[]')) union select sid from contract_operations_private.contract_schools(nullif(cfg->>'contract_id','')::uuid) sid)),
 'effects',jsonb_build_object('current_and_future_classified_content',true,'per_item_grants',0,'school_activation',false,'network_membership_changes',0,'legacy_history_preserved',true,
 'warning','A adoção de categorias começa na vigência. Direitos legados deixam de ampliar o acesso; BLOCK/EMBARGO, idade, suspensão e entrega protegida continuam obrigatórios. Escolas inativas continuam sem acesso.'));
end $$;

create function public.admin_confirm_contract_operation(p_review jsonb,p_request_id uuid) returns jsonb
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

create or replace function school_category_private.dynamic_school(p_context jsonb)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare sid uuid:=nullif(p_context->>'school_id','')::uuid;
begin
 if sid is null then
  select school_id into sid from public.teachers where profile_id=auth.uid() and status='active' order by created_at desc nulls last,id limit 1;
  if sid is null then select school_id into sid from public.student_get_context() limit 1;end if;
 end if;
 return exists(select 1 from public.tenants where school_id=sid and contract_operations_private.adopted(school_id));
end $$;

create or replace function school_category_private.active_rules(p_context jsonb)
returns table(module_id uuid,module_name text,rule_grade uuid,rule_subject uuid,content_types public.rs_content_type[],segment_id uuid,institutional boolean)
language sql stable security definer set search_path='' set jit='off' set plan_cache_mode='force_custom_plan' as $$
 with ctx as materialized(select school_category_private.actor_context(p_context) c),
 context as materialized(select (c->>'school_id')::uuid school_id,(c->>'institutional')::boolean institutional,
 array(select value::uuid from jsonb_array_elements_text(c->'grade_ids')) grade_ids from ctx)

  select distinct m.id module_id,m.name module_name,(r.value->>'grade_id')::uuid rule_grade,(r.value->>'subject_id')::uuid rule_subject,array[(r.value->>'content_type')::public.rs_content_type] content_types,tx.segment_id,tx.institutional
  from context x join public.tenants t on t.school_id=x.school_id and t.tenant_type='SCHOOL' and t.status='active' and contract_operations_private.adopted(t.school_id)
  join public.tenant_product_entitlements e on e.tenant_id=t.id and e.status='ACTIVE' and e.starts_at<=case when e.metadata->>'operation_timezone'='America/Sao_Paulo' then (now() at time zone 'America/Sao_Paulo')::date else current_date end and (e.ends_at is null or e.ends_at>=case when e.metadata->>'operation_timezone'='America/Sao_Paulo' then (now() at time zone 'America/Sao_Paulo')::date else current_date end) and e.metadata->>'source'='school_content_category_v1'
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

create or replace function school_category_private.has_dynamic_membership()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.tenants t where t.tenant_type='SCHOOL' and contract_operations_private.adopted(t.school_id) and (
 exists(select 1 from public.teachers a where a.profile_id=auth.uid() and a.status='active' and a.school_id=t.school_id)
 or exists(select 1 from public.students a where a.user_id=auth.uid() and a.school_id=t.school_id)
 or exists(select 1 from public.student_get_context() a where a.school_id=t.school_id)));
$$;

create or replace function public.content_validate_entitlement()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_contract public.contracts%rowtype;
begin
  select *
  into v_contract
  from public.contracts
  where id = new.contract_id;

  if not found then
    raise exception 'CONTRACT_NOT_FOUND';
  end if;

  if new.status = 'ACTIVE' and v_contract.status <> 'ACTIVE' then
    raise exception 'CONTRACT_NOT_ACTIVE';
  end if;

  if not exists (
    select 1
    from public.contract_products cp
    where cp.contract_id = new.contract_id
      and cp.product_id = new.product_id
      and cp.status = 'active'
  ) then
    raise exception 'PRODUCT_NOT_IN_CONTRACT';
  end if;

  if not (case when v_contract.metadata->>'source'='contract_operations_v1' then exists(select 1 from public.tenants t where t.id=new.tenant_id and t.status='active' and contract_operations_private.in_scope(new.contract_id,t.school_id)) else public.content_tenant_matches_contract_scope(v_contract.tenant_id, new.tenant_id) end) then
    raise exception 'ENTITLEMENT_TENANT_OUT_OF_CONTRACT_SCOPE';
  end if;

  if new.starts_at < v_contract.starts_at then
    raise exception 'ENTITLEMENT_STARTS_BEFORE_CONTRACT';
  end if;

  if v_contract.ends_at is not null and (new.ends_at is null or new.ends_at > v_contract.ends_at) then
    raise exception 'ENTITLEMENT_ENDS_AFTER_CONTRACT';
  end if;

  return new;
end;
$$;

create or replace function school_category_private.scope_tenants(p_school uuid)
returns setof uuid language sql stable security definer set search_path='' as $$
 select t.id from public.tenants t where t.status='active' and (t.school_id=p_school or (t.tenant_type='NETWORK' and exists(
 select 1 from public.network_school_memberships m join public.education_networks n on n.id=m.network_id and n.status='active'
 where m.network_id=t.network_id and m.school_id=p_school and m.status='active' and (m.ended_at is null or m.ended_at>now()))))
 union select c.tenant_id from public.contracts c join contract_operations_private.targets x on x.contract_id=c.id where x.school_id=p_school and school_category_private.school_contract(p_school,c.id);
$$;
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
      and tpe.metadata->>'operation_timezone' is distinct from 'America/Sao_Paulo'
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
$function$;

revoke all on all functions in schema contract_operations_private from public,anon,authenticated,service_role;
revoke all on function public.admin_get_contract_operations(),public.admin_preview_contract_operation(jsonb),public.admin_confirm_contract_operation(jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.admin_get_contract_operations(),public.admin_preview_contract_operation(jsonb),public.admin_confirm_contract_operation(jsonb,uuid) to authenticated;
commit;
