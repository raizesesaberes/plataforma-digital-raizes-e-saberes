-- REVIEW ONLY. No installation authorization or migration version is implied.
-- One transaction, no grants/policies/functions/contract writes. Actor evidence is
-- the supplied conversation reference, not an invented authenticated user UUID.
begin;
set local lock_timeout='5s';
set local statement_timeout='90s';
create temporary table ef2_manifest(id uuid primary key,code text,revision text,content_id uuid unique,subject_id uuid) on commit drop;
insert into ef2_manifest select * from jsonb_to_recordset($manifest$@MANIFEST@$manifest$::jsonb) as r(id uuid,code text,revision text,content_id uuid,subject_id uuid);
do $batch$
#variable_conflict use_variable
declare
 license_id constant uuid:='@LICENSE@'; source_id constant uuid:='@SOURCE@'; receipt_id constant uuid:='@RECEIPT@';
 digest constant text:='@MANIFEST_SHA@'; receipt jsonb; post_hash text; protected_before text; protected_after text; r record;
 evidence constant text:='01a1207b-66b8-72c3-9d1a-c4b8638b0032; Sentinel_1f415cf116408191b6847d38108d6724: quero ver as 202 questoes de 2 ano ativas em raizes e saberes; Sentinel_2ae517adf6888191add98a2f1316a1c5: sim fomos nos que fizemos sao autorais; Sentinel_e0e03f465f8c8191ab7fb12140f9da1e: sao autorais';
begin
 if not pg_try_advisory_xact_lock(81261013) then raise exception 'EF2_CANONICAL_WRITE_BUSY'; end if;
 perform school_category_private.assert_writes_open();
 if (select md5(prosrc) from pg_proc where oid=to_regprocedure('school_category_private.authorized_items(jsonb,uuid)')) is distinct from 'a06373e13d20bc63655b416bcaa8b863' or (select md5(prosrc) from pg_proc where oid=to_regprocedure('school_category_private.legacy_resolver(jsonb)')) is distinct from '22ffa2f36c5192ac7574c9f9f3131ea3' then raise exception 'EF2_REQUIRED_RESOLVER_PATCHES_MISSING';end if;
 if (select count(*) from ef2_manifest)<>202 then raise exception 'EF2_MANIFEST_COUNT';end if;
 -- Prevent concurrent catalog/alternative edits for the short guarded batch.
 lock table public.content_question_items,public.content_items,public.question_alternatives,public.question_media,public.content_editorial_events in share row exclusive mode;
 perform 1 from public.question_items q join ef2_manifest m on m.id=q.id order by q.id for update of q;
 perform 1 from public.question_sources where id in(source_id,'f4039b27-3fe7-4446-94c4-66d9a31ddcb5') order by id for update;
 perform 1 from public.question_licenses where id in(license_id,'00d2716c-942d-496f-ae49-aa4db37a5228') order by id for update;
 select details into receipt from public.content_editorial_events where id=receipt_id and event_type='EF2_AUTHORIAL_BATCH_COMPLETED';
 if found then
  select md5(jsonb_build_object('items',(select jsonb_agg(jsonb_build_array(q.id,school_category_private.question_revision(q.id),to_jsonb(c),to_jsonb(a),(select jsonb_agg(to_jsonb(mm) order by mm.id) from public.question_media mm where mm.question_id=q.id)) order by q.id) from ef2_manifest m join public.question_items q on q.id=m.id join public.content_question_items a on a.question_item_id=q.id and a.content_item_id=m.content_id join public.content_items c on c.id=a.content_item_id),'license',(select to_jsonb(l) from public.question_licenses l where l.id=license_id),'source',(select to_jsonb(s) from public.question_sources s where s.id=source_id))::text) into post_hash;
  if receipt->>'manifest_sha256' is distinct from digest or receipt->>'post_hash' is distinct from post_hash or (select count(*) from public.content_editorial_events where event_type='EF2_AUTHORIAL_ITEM_RECONCILED' and details->>'batch_id'=receipt_id::text)<>202 then raise exception 'EF2_REPLAY_DRIFT';end if;
  raise notice 'EF2_AUTHORIAL_NOOP_202';return;
 end if;
 if exists(select 1 from public.question_licenses where id=license_id) or exists(select 1 from public.question_sources where id=source_id) or exists(select 1 from public.content_items c join ef2_manifest m on m.content_id=c.id) or exists(select 1 from public.content_question_items a join ef2_manifest m on m.id=a.question_item_id) then raise exception 'EF2_PARTIAL_OR_COLLISION';end if;
 if (select count(*) from ef2_manifest m join public.question_items q on q.id=m.id and q.code=m.code and school_category_private.question_revision(q.id)=m.revision and q.source_id='f4039b27-3fe7-4446-94c4-66d9a31ddcb5' and q.license_id='00d2716c-942d-496f-ae49-aa4db37a5228' and q.school_year='2o ano' and q.workflow_status='APROVADO' and q.curation_status='HOMOLOGADO' and q.publication_status='PUBLICADO')<>202 then raise exception 'EF2_QUESTION_REVISION_DRIFT';end if;
 if (select md5(to_jsonb(s)::text) from public.question_sources s where id='f4039b27-3fe7-4446-94c4-66d9a31ddcb5') is distinct from '0052a2de7800e916b46d83bdacd83b63' or (select md5(to_jsonb(l)::text) from public.question_licenses l where id='00d2716c-942d-496f-ae49-aa4db37a5228') is distinct from '07dcaf110de3a55ed47da22e17133c5e' then raise exception 'EF2_SHARED_PROVENANCE_DRIFT';end if;
 if not exists(select 1 from public.content_grades where id='a1b1498a-26a9-498a-9e3a-65634cf70904' and code='2_ANO' and segment_id='6ff7f173-bc5c-42f7-a87a-4c57c542e1ab' and status='active') or (select count(*) from public.content_subjects where id in('d7cf397b-a497-484f-bd11-f5453e090727','611fe688-b66d-421a-a332-c683217f0572') and status='active')<>2 then raise exception 'EF2_TAXONOMY_DRIFT';end if;
 -- This hash covers every untouched question field and alternatives/media/history.
 select md5(jsonb_agg(jsonb_build_array(to_jsonb(q)-array['source_id','license_id','curation_status','updated_at'],(select jsonb_agg(to_jsonb(a) order by a.id) from public.question_alternatives a where a.question_id=q.id),(select jsonb_agg(to_jsonb(a) order by a.id) from public.question_media a where a.question_id=q.id),(select jsonb_agg(to_jsonb(a) order by a.id) from public.question_workflow_events a where a.question_id=q.id),(select jsonb_agg(to_jsonb(a) order by a.id) from public.question_item_versions a where a.question_id=q.id)) order by q.id)::text) into protected_before from public.question_items q join ef2_manifest m on m.id=q.id;
 insert into public.question_licenses(id,name,license_type,allows_adaptation,allows_commercial_use,requires_attribution,publication_allowed,legal_notes)
 values(license_id,'Raízes e Saberes — acervo autoral EF2 202 — 2026-10-12','AUTORAL_RAIZES_SABERES',false,true,true,true,'Uso na plataforma Raízes e Saberes e em avaliações das escolas contratantes. Restrita aos 202 IDs do manifesto SHA256 '||digest||'. Sem licença geral para outros itens ou adaptação. Autoria declarada pelo titular; ativação solicitada. Evidência: '||evidence);
 insert into public.question_sources(id,name,source_type,institution_name,license_id,legal_status,curation_status,source_checked_at,notes)
 values(source_id,'Acervo autoral Raízes e Saberes — 202 questões EF2','AUTORAL','Raízes e Saberes',license_id,'Autoria declarada e ativação autorizada pelo titular','APROVADO',now(),'Correção da proveniência padrão de importação para o manifesto '||digest||'. Inclui 200 importadas e 2 seeds identificadas no manifesto. Evidência: '||evidence);
 for r in select q.*,m.content_id,m.subject_id from ef2_manifest m join public.question_items q on q.id=m.id order by q.id loop
  insert into public.content_items(id,content_type,segment_id,grade_id,subject_id,title,owner_scope,editorial_status,published_at,metadata)
  values(r.content_id,'QUESTION','6ff7f173-bc5c-42f7-a87a-4c57c542e1ab','a1b1498a-26a9-498a-9e3a-65634cf70904',r.subject_id,r.internal_title,'GLOBAL_RAIZES','PUBLISHED',now(),jsonb_build_object('category_mode','GRADE','classification_source','canonical_category_v1','multidisciplinary',false,'category_grade_ids','[]'::jsonb,'authorial_batch_id',receipt_id));
  insert into public.content_question_items(content_item_id,question_item_id) values(r.content_id,r.id);
  update public.question_items set source_id=source_id,license_id=license_id,curation_status='APROVADO' where id=r.id;
  insert into public.content_editorial_events(content_item_id,event_type,to_status,details)
  values(r.content_id,'EF2_AUTHORIAL_ITEM_RECONCILED','PUBLISHED',jsonb_build_object('batch_id',receipt_id,'manifest_sha256',digest,'question_id',r.id,'before',jsonb_build_object('source_id',r.source_id,'license_id',r.license_id,'legal_classification',r.legal_classification,'curation_status',r.curation_status,'workflow_status',r.workflow_status,'publication_status',r.publication_status,'updated_at',r.updated_at),'after',jsonb_build_object('source_id',source_id,'license_id',license_id,'curation_status','APROVADO'),'editorial_basis','Limited migration of already APROVADO workflow / PUBLICADO / HOMOLOGADO, activation requested by owner; no blanket HOMOLOGADO acceptance','evidence',evidence,'database_executor',session_user));
 end loop;
 select md5(jsonb_agg(jsonb_build_array(to_jsonb(q)-array['source_id','license_id','curation_status','updated_at'],(select jsonb_agg(to_jsonb(a) order by a.id) from public.question_alternatives a where a.question_id=q.id),(select jsonb_agg(to_jsonb(a) order by a.id) from public.question_media a where a.question_id=q.id),(select jsonb_agg(to_jsonb(a) order by a.id) from public.question_workflow_events a where a.question_id=q.id),(select jsonb_agg(to_jsonb(a) order by a.id) from public.question_item_versions a where a.question_id=q.id)) order by q.id)::text) into protected_after from public.question_items q join ef2_manifest m on m.id=q.id;
 if protected_before is distinct from protected_after then raise exception 'EF2_IMMUTABLE_CONTENT_CHANGED';end if;
 select md5(jsonb_build_object('items',(select jsonb_agg(jsonb_build_array(q.id,school_category_private.question_revision(q.id),to_jsonb(c),to_jsonb(a),(select jsonb_agg(to_jsonb(mm) order by mm.id) from public.question_media mm where mm.question_id=q.id)) order by q.id) from ef2_manifest m join public.question_items q on q.id=m.id join public.content_question_items a on a.question_item_id=q.id and a.content_item_id=m.content_id join public.content_items c on c.id=a.content_item_id),'license',(select to_jsonb(l) from public.question_licenses l where l.id=license_id),'source',(select to_jsonb(s) from public.question_sources s where s.id=source_id))::text) into post_hash;
 insert into public.content_editorial_events(id,event_type,details) values(receipt_id,'EF2_AUTHORIAL_BATCH_COMPLETED',jsonb_build_object('manifest_sha256',digest,'post_hash',post_hash,'protected_hash',protected_after,'count',202,'license_id',license_id,'source_id',source_id,'evidence',evidence,'database_executor',session_user,'contract_writes',0,'per_item_grants',0));
 raise notice 'EF2_AUTHORIAL_APPLIED_202';
end $batch$;
commit;
