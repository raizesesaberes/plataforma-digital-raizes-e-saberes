-- Incremental review only. No installation replay, credentials, data writes or ACL expansion.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $guard$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261022182921' AND name='enem_ingestion_isolated_inactive') THEN RAISE EXCEPTION 'BASE_INSTALLATION_REQUIRED'; END IF;
 IF (SELECT rolcanlogin FROM pg_roles WHERE rolname='enem_ingest_runtime') IS DISTINCT FROM false THEN RAISE EXCEPTION 'RUNTIME_MUST_REMAIN_NOLOGIN'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='enem_ingest_runtime' AND (rolsuper OR rolcreaterole OR rolcreatedb OR rolbypassrls OR rolreplication)) THEN RAISE EXCEPTION 'UNEXPECTED_RUNTIME_PRIVILEGES'; END IF;
 IF to_regprocedure('enem_ingestion_private.assert_global_preflight(text,jsonb)') IS NOT NULL THEN RAISE EXCEPTION 'RECONCILE_EXISTING_PREFLIGHT'; END IF;
 IF EXISTS(SELECT 1 FROM enem_ingestion_private.releases) OR EXISTS(SELECT 1 FROM enem_ingestion_private.lease) THEN RAISE EXCEPTION 'RECONCILE_RELEASES_FIRST'; END IF;
 IF md5(pg_get_functiondef('public.enem_ingest_material(text)'::regprocedure)) <> '2ea9bb944d6890fde325be545292eadf' THEN RAISE EXCEPTION 'BASE_FUNCTION_DRIFT:enem_ingest_material'; END IF;
 IF md5(pg_get_functiondef('public.enem_ingest_acquire(text,jsonb)'::regprocedure)) <> '21e469b40baa24ce8aead35b2321cc61' THEN RAISE EXCEPTION 'BASE_FUNCTION_DRIFT:enem_ingest_acquire'; END IF;
 IF md5(pg_get_functiondef('enem_ingestion_private.execute_one(text,jsonb,integer)'::regprocedure)) <> 'eac03705def25430cf2348a0375db2fb' THEN RAISE EXCEPTION 'BASE_FUNCTION_DRIFT:execute_one'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='enem_ingestion_private.releases'::regclass AND conname='releases_ref_check' AND convalidated AND pg_get_constraintdef(oid)='CHECK ((ref = ''refs/heads/candidate/manifest-recovery-20261021''::text))') THEN RAISE EXCEPTION 'BASE_CONSTRAINT_DRIFT:releases_ref_check'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='enem_ingestion_private.releases'::regclass AND conname='releases_workflow_ref_check' AND convalidated AND pg_get_constraintdef(oid)='CHECK ((workflow_ref = ''raizesesaberes/plataforma-digital-raizes-e-saberes/.github/workflows/enem-ingest.yml@refs/heads/candidate/manifest-recovery-20261021''::text))') THEN RAISE EXCEPTION 'BASE_CONSTRAINT_DRIFT:releases_workflow_ref_check'; END IF;
END $guard$;
ALTER TABLE enem_ingestion_private.releases
 DROP CONSTRAINT releases_ref_check,
 DROP CONSTRAINT releases_workflow_ref_check,
 ADD CONSTRAINT releases_ref_check CHECK(ref='refs/heads/service/enem-ingestion-worker'),
 ADD CONSTRAINT releases_workflow_ref_check CHECK(workflow_ref='raizesesaberes/plataforma-digital-raizes-e-saberes/.github/workflows/enem-ingest.yml@refs/heads/service/enem-ingestion-worker');
-- Private assertion only: no writes, lease, run registration or public grants.
CREATE OR REPLACE FUNCTION enem_ingestion_private.assert_global_preflight(p_digest text, p_verified jsonb DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE r enem_ingestion_private.releases%rowtype; p enem_ingestion_private.payloads%rowtype;
 rec enem_ingestion_private.receipts%rowtype; q public.question_items%rowtype;
 m jsonb; e jsonb; item jsonb; ident jsonb; occ jsonb; a jsonb; img jsonb;
 n integer:=0; total bigint:=0; seen text[]:='{}'; tuple_key text; collisions integer;
BEGIN
 IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'NO_HUMAN_IMPERSONATION'; END IF;
 SELECT * INTO r FROM enem_ingestion_private.releases WHERE digest=p_digest;
 IF NOT FOUND OR NOT r.enabled OR r.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'RELEASE_NOT_APPROVED'; END IF;
 IF p_verified IS NOT NULL THEN
  IF current_setting('transaction_isolation') IS DISTINCT FROM 'read committed' THEN RAISE EXCEPTION 'READ_COMMITTED_REQUIRED'; END IF;
  IF p_verified->>'repository_id' IS DISTINCT FROM '1297887230'
   OR p_verified->>'commit' IS DISTINCT FROM r.commit_sha OR p_verified->>'workflow_sha' IS DISTINCT FROM r.workflow_sha
   OR p_verified->>'ref' IS DISTINCT FROM r.ref OR coalesce(p_verified->>'run_id','')!~'^[0-9]+$'
   OR coalesce(p_verified->>'run_attempt','')!~'^[0-9]+$' OR length(coalesce(p_verified->>'jti','')) NOT BETWEEN 8 AND 200
   OR coalesce(p_verified->>'expires_at','')!~'^[0-9]+$' THEN RAISE EXCEPTION 'WORKLOAD_SCOPE'; END IF;
  IF (p_verified->>'expires_at')::numeric<=extract(epoch from clock_timestamp()) THEN RAISE EXCEPTION 'WORKLOAD_EXPIRED'; END IF;
  IF EXISTS(SELECT 1 FROM enem_ingestion_private.runs WHERE jti=p_verified->>'jti' AND
   (digest<>p_digest OR run_id<>p_verified->>'run_id' OR run_attempt<>p_verified->>'run_attempt' OR commit_sha<>r.commit_sha)) THEN RAISE EXCEPTION 'TOKEN_REPLAY'; END IF;
 END IF;
 IF octet_length(r.manifest_text)>65536 OR encode(extensions.digest(convert_to(r.manifest_text,'UTF8'),'sha256'),'hex') IS DISTINCT FROM p_digest THEN RAISE EXCEPTION 'APPROVED_MANIFEST_HASH'; END IF;
 m:=r.manifest_text::jsonb;
 IF m->>'acceptance_contract' IS DISTINCT FROM 'helena-enem-publication-v1' OR m->'version' IS DISTINCT FROM '1'::jsonb
  OR m->>'project_id' IS DISTINCT FROM 'jaesjldrbjbdmzzggxzw' OR m->'publication_authorized' IS DISTINCT FROM 'true'::jsonb
  OR m->'quarantined_items' IS DISTINCT FROM '[]'::jsonb OR jsonb_typeof(m->'items') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'PUBLICATION_APPROVAL_REQUIRED'; END IF;
 IF m->'release_binding' IS DISTINCT FROM jsonb_build_object('commit_sha',r.commit_sha,'workflow_sha',r.workflow_sha,'ref',r.ref,'workflow_ref',r.workflow_ref,'audience',r.audience,'approval_reference',r.approval_reference) THEN RAISE EXCEPTION 'APPROVAL_TRUST_MISMATCH'; END IF;
 IF r.ref IS DISTINCT FROM 'refs/heads/service/enem-ingestion-worker' OR r.workflow_ref IS DISTINCT FROM 'raizesesaberes/plataforma-digital-raizes-e-saberes/.github/workflows/enem-ingest.yml@refs/heads/service/enem-ingestion-worker'
  OR r.audience IS DISTINCT FROM 'urn:rs:enem-ingest:jaesjldrbjbdmzzggxzw' THEN RAISE EXCEPTION 'RELEASE_SCOPE'; END IF;
 IF jsonb_array_length(m->'items') NOT BETWEEN 1 AND 25 THEN RAISE EXCEPTION 'BATCH_LIMIT'; END IF;
 IF EXISTS(SELECT 1 FROM enem_ingestion_private.progress WHERE digest=p_digest AND state='QUARANTINED') THEN RAISE EXCEPTION 'BATCH_QUARANTINED'; END IF;
 FOR p IN SELECT * FROM enem_ingestion_private.payloads WHERE digest=p_digest ORDER BY ordinal LOOP
  n:=n+1; total:=total+octet_length(p.payload_text); e:=m->'items'->(n-1); item:=p.payload_text::jsonb;
  ident:=item->'metadata'->'source_identity';occ:=item->'metadata'->'source_occurrence';
  IF p.ordinal<>n OR total>16777216 OR octet_length(p.payload_text)>4194304 OR
   encode(extensions.digest(convert_to(p.payload_text,'UTF8'),'sha256'),'hex') IS DISTINCT FROM p.payload_sha
   OR e->'ordinal' IS DISTINCT FROM to_jsonb(n) OR e->>'sha256' IS DISTINCT FROM p.payload_sha
   OR e->>'code' IS DISTINCT FROM p.code OR item->>'code' IS DISTINCT FROM p.code
   OR p.code IS DISTINCT FROM 'ENEM-SOURCE-'||p.external_id OR p.external_id !~ '^q_[A-Za-z0-9_-]+$' OR p.occurrence_id !~ '^occ_[A-Za-z0-9_-]+$'
   OR e->>'source_question_id' IS DISTINCT FROM p.external_id OR ident->>'source_question_id' IS DISTINCT FROM p.external_id
   OR e->>'occurrence_id' IS DISTINCT FROM p.occurrence_id OR ident->>'occurrence_id' IS DISTINCT FROM p.occurrence_id
   OR e->>'request_id' IS DISTINCT FROM p.request_id::text OR item->>'category_request_id' IS DISTINCT FROM p.request_id::text
   OR e->>'source_id' IS DISTINCT FROM item->>'source_id' OR e->>'license_id' IS DISTINCT FROM item->>'license_id'
   OR e->>'rights' IS DISTINCT FROM 'APPROVED' OR e->>'editorial' IS DISTINCT FROM 'APPROVED' OR e->>'quarantine' IS DISTINCT FROM 'NONE'
   THEN RAISE EXCEPTION 'PAYLOAD_BINDING'; END IF;
  FOR a IN SELECT value FROM jsonb_array_elements(jsonb_build_array(m->'human_approval',m->'rights_approval',e->'human_review',e->'images_review',e->'answer_validation')) LOOP
   IF a->>'status' IS DISTINCT FROM 'APPROVED' OR length(btrim(coalesce(a->>'reviewer','')))=0
    OR length(btrim(coalesce(a->>'reference','')))=0 OR coalesce(a->>'reviewed_at','') !~ '^\d{4}-\d{2}-\d{2}T' THEN RAISE EXCEPTION 'HUMAN_APPROVAL_REQUIRED'; END IF;
   PERFORM (a->>'reviewed_at')::timestamptz;
  END LOOP;
  IF coalesce(e->'answer_validation'->>'evidence_sha256','') !~ '^[a-f0-9]{64}$'
   OR e->'source_license_validation'->>'status' IS DISTINCT FROM 'VALID'
   OR e->'source_license_validation'->'publication_allowed' IS DISTINCT FROM 'true'::jsonb
   OR e->'source_license_validation'->>'source_id' IS DISTINCT FROM item->>'source_id'
   OR e->'source_license_validation'->>'license_id' IS DISTINCT FROM item->>'license_id'
   OR length(btrim(coalesce(e->'source_license_validation'->>'reference','')))=0 THEN RAISE EXCEPTION 'SOURCE_LICENSE_EVIDENCE_REQUIRED'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.question_sources s JOIN public.question_licenses sl ON sl.id=s.license_id
   JOIN public.question_licenses il ON il.id=(item->>'license_id')::uuid WHERE s.id=(item->>'source_id')::uuid
   AND s.source_type='OFICIAL_INEP_ENEM' AND sl.publication_allowed AND il.publication_allowed) THEN RAISE EXCEPTION 'RIGHTS_GATE'; END IF;
  IF coalesce(e->>'year','') !~ '^[0-9]{4}$' OR (e->>'year')::integer NOT BETWEEN 1998 AND 2100
   OR coalesce(e->>'number','') !~ '^[1-9][0-9]*$' OR length(btrim(coalesce(e->>'application','')))=0
   OR length(btrim(coalesce(e->>'booklet','')))=0 OR coalesce(e->>'source_url','') !~ '^https://'
   OR NOT(e ? 'language') OR (e->'language'<>'null'::jsonb AND (jsonb_typeof(e->'language')<>'string' OR length(btrim(e->>'language'))=0))
   OR occ->'exam_year' IS DISTINCT FROM e->'year' OR occ->'question_number' IS DISTINCT FROM e->'number'
   OR occ->>'application' IS DISTINCT FROM e->>'application' OR occ->>'booklet' IS DISTINCT FROM e->>'booklet'
   OR occ->>'source_url' IS DISTINCT FROM e->>'source_url' OR occ->'question_language' IS DISTINCT FROM e->'language'
   OR item->'metadata'->'enem'->'examYear' IS DISTINCT FROM e->'year' OR item->'metadata'->'enem'->'language' IS DISTINCT FROM e->'language'
   OR coalesce(e->>'official_answer','') !~ '^[A-E]$' OR item->>'correct_answer' IS DISTINCT FROM e->>'official_answer'
   OR occ->>'official_answer' IS DISTINCT FROM e->>'official_answer' OR occ->>'answer_verification' IS DISTINCT FROM 'VERIFIED_OFFICIAL'
   OR occ->>'editorial_role' IS DISTINCT FROM 'PRINCIPAL' THEN RAISE EXCEPTION 'OFFICIAL_IDENTITY_INVALID'; END IF;
  tuple_key:=jsonb_build_array(e->'year',e->'number',e->'application',e->'booklet',e->'language',e->'source_url')::text;
  IF tuple_key=ANY(seen) OR EXISTS(SELECT 1 FROM enem_ingestion_private.payloads z WHERE z.digest=p_digest AND z.ordinal<p.ordinal
   AND (z.external_id=p.external_id OR z.occurrence_id=p.occurrence_id OR z.request_id=p.request_id OR z.code=p.code)) THEN RAISE EXCEPTION 'DUPLICATE_MANIFEST_IDENTITY'; END IF;
  seen:=array_append(seen,tuple_key);
  IF item->>'question_type' IS DISTINCT FROM 'multipla_escolha' OR item->>'legal_classification' IS DISTINCT FROM 'ITEM_OFICIAL_PUBLICAMENTE_LIBERADO'
   OR length(btrim(coalesce(item->>'statement','')))=0 OR length(btrim(coalesce(item->>'category_reason',''))) NOT BETWEEN 5 AND 500
   OR item->'metadata'->'enemPilotInline'->'publication_allowed' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'CANONICAL_PAYLOAD_REQUIRED'; END IF;
  PERFORM school_category_private.assert_rich_alternatives(item->>'question_type',item->'alternatives',item->'metadata',item->>'correct_answer');
  IF jsonb_typeof(e->'images') IS DISTINCT FROM 'array' OR e->'images' IS DISTINCT FROM
   (SELECT coalesce(jsonb_agg(value-'base64' ORDER BY ord),'[]'::jsonb) FROM jsonb_array_elements(item->'metadata'->'enemPilotInline'->'assets') WITH ORDINALITY z(value,ord)) THEN RAISE EXCEPTION 'IMAGE_MANIFEST_BINDING'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.content_subjects WHERE id=(item->'canonical_category'->>'subject_id')::uuid AND status='active') THEN RAISE EXCEPTION 'INVALID_SUBJECT'; END IF;
  IF jsonb_typeof(item->'canonical_category') IS DISTINCT FROM 'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(item->'canonical_category') k WHERE k NOT IN ('subject_id','category_mode','grade_id','category_grade_ids','multidisciplinary')) OR item->'canonical_category'->'multidisciplinary'='true'::jsonb THEN RAISE EXCEPTION 'INVALID_CONTENT_CLASSIFICATION'; END IF;
  IF item->'canonical_category'->>'category_mode' IS DISTINCT FROM 'TRANSVERSAL' OR item->'canonical_category'->>'grade_id' IS NOT NULL
   OR jsonb_typeof(item->'canonical_category'->'category_grade_ids') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'INVALID_CATEGORY_MODE'; END IF;
  IF jsonb_array_length(item->'canonical_category'->'category_grade_ids')=0 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(item->'canonical_category'->'category_grade_ids') g
   WHERE NOT EXISTS(SELECT 1 FROM school_category_private.taxonomy() t WHERE t.grade_id=g.value::uuid AND NOT t.institutional)) THEN RAISE EXCEPTION 'EXPLICIT_TRANSVERSAL_GRADES_REQUIRED'; END IF;
  SELECT * INTO rec FROM enem_ingestion_private.receipts WHERE digest=p_digest AND ordinal=p.ordinal;
  IF FOUND THEN
   SELECT * INTO q FROM public.question_items WHERE id=rec.question_id;
   IF NOT FOUND OR rec.payload_sha IS DISTINCT FROM p.payload_sha OR rec.request_id IS DISTINCT FROM p.request_id
    OR q.code IS DISTINCT FROM p.code OR q.metadata IS DISTINCT FROM item->'metadata' OR q.statement IS DISTINCT FROM item->>'statement'
    OR q.source_id::text IS DISTINCT FROM item->>'source_id' OR q.license_id::text IS DISTINCT FROM item->>'license_id'
    OR q.correct_answer IS DISTINCT FROM item->>'correct_answer' OR q.publication_status IS DISTINCT FROM 'PUBLICADO' OR q.curation_status IS DISTINCT FROM 'APROVADO' OR q.workflow_status IS DISTINCT FROM 'APROVADO'
    OR (SELECT jsonb_agg(jsonb_build_object('label',label,'body',body,'is_correct',is_correct) ORDER BY position) FROM public.question_alternatives WHERE question_id=q.id) IS DISTINCT FROM item->'alternatives' THEN RAISE EXCEPTION 'RECEIPT_DRIFT'; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.content_question_items link JOIN public.content_items c ON c.id=link.content_item_id
    WHERE link.question_item_id=q.id AND c.editorial_status='PUBLISHED' AND c.subject_id::text=item->'canonical_category'->>'subject_id'
    AND c.metadata->>'category_mode'=item->'canonical_category'->>'category_mode'
    AND (SELECT jsonb_agg(value ORDER BY value) FROM jsonb_array_elements(c.metadata->'category_grade_ids')) IS NOT DISTINCT FROM
    (SELECT jsonb_agg(value ORDER BY value) FROM jsonb_array_elements(item->'canonical_category'->'category_grade_ids'))) THEN RAISE EXCEPTION 'RECEIPT_CATEGORY_DRIFT'; END IF;
  END IF;
  SELECT count(*) INTO collisions FROM public.question_items qi WHERE (rec.question_id IS NULL OR qi.id<>rec.question_id) AND
   (qi.code=p.code OR qi.metadata->>'import_request_id'=p.request_id::text OR qi.metadata->'source_identity'->>'source_question_id'=p.external_id OR qi.metadata->'source_identity'->>'occurrence_id'=p.occurrence_id
    OR (qi.metadata->'source_occurrence'->>'exam_year'=e->>'year' AND qi.metadata->'source_occurrence'->>'question_number'=e->>'number'
    AND qi.metadata->'source_occurrence'->>'application'=e->>'application' AND qi.metadata->'source_occurrence'->>'booklet'=e->>'booklet'
    AND qi.metadata->'source_occurrence'->'question_language' IS NOT DISTINCT FROM e->'language' AND (qi.metadata->'source_occurrence'->>'source_url'=e->>'source_url' OR EXISTS(SELECT 1 FROM public.question_sources origin WHERE origin.id=qi.source_id AND origin.source_type='OFICIAL_INEP_ENEM'))));
  IF collisions<>0 OR EXISTS(SELECT 1 FROM enem_ingestion_private.receipts z WHERE z.request_id=p.request_id AND (z.digest<>p_digest OR z.ordinal<>p.ordinal)) THEN RAISE EXCEPTION 'PREEXISTING_IDENTITY_REQUIRES_RECONCILIATION'; END IF;
 END LOOP;
 IF n<>jsonb_array_length(m->'items') THEN RAISE EXCEPTION 'BATCH_LIMIT'; END IF;
END $fn$;
REVOKE ALL ON FUNCTION enem_ingestion_private.assert_global_preflight(text,jsonb) FROM PUBLIC, anon, authenticated, service_role, enem_ingest_runtime;

CREATE OR REPLACE FUNCTION public.enem_ingest_material(p_digest text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 PERFORM enem_ingestion_private.assert_global_preflight(p_digest);
 IF NOT EXISTS(SELECT 1 FROM enem_ingestion_private.releases WHERE digest=p_digest AND enabled AND expires_at>now()) THEN RAISE EXCEPTION 'RELEASE_NOT_APPROVED';END IF;
 RETURN jsonb_build_object('contract','enem-global-preflight-v1','state','READY','manifest',p_digest,'material',(SELECT jsonb_agg(jsonb_build_object('sha256',payload_sha,'text',payload_text) ORDER BY ordinal) FROM enem_ingestion_private.payloads WHERE digest=p_digest));
END $function$
;
CREATE OR REPLACE FUNCTION public.enem_ingest_acquire(p_digest text, p_verified jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO '' SET lock_timeout TO '5s'
AS $function$
DECLARE l enem_ingestion_private.lease%rowtype;
BEGIN
 IF NOT pg_try_advisory_xact_lock(81261016) THEN RAISE EXCEPTION 'INGEST_BUSY';END IF;
 -- Short transaction locks also exclude non-cooperating writers and identity phantoms.
 -- No lock survives the RPC transaction; execute_one repeats this before each item.
 LOCK TABLE enem_ingestion_private.releases, enem_ingestion_private.payloads,
 enem_ingestion_private.receipts, enem_ingestion_private.progress,
 public.question_sources, public.question_licenses, public.question_items,
 public.question_alternatives, public.content_subjects, public.content_items,
 public.content_question_items IN SHARE ROW EXCLUSIVE MODE;
 PERFORM enem_ingestion_private.assert_global_preflight(p_digest,p_verified);
 PERFORM enem_ingestion_private.assert_workload(p_digest,p_verified);
 SELECT * INTO l FROM enem_ingestion_private.lease WHERE singleton FOR UPDATE;
 IF FOUND AND l.expires_at>clock_timestamp() AND (l.digest<>p_digest OR l.run_id<>p_verified->>'run_id' OR l.run_attempt<>p_verified->>'run_attempt') THEN RAISE EXCEPTION 'ACTIVE_JOB_LEASE';END IF;
 INSERT INTO enem_ingestion_private.lease(singleton,digest,run_id,run_attempt,jti,expires_at) VALUES(true,p_digest,p_verified->>'run_id',p_verified->>'run_attempt',p_verified->>'jti',least(to_timestamp((p_verified->>'expires_at')::double precision),clock_timestamp()+interval '5 minutes'))
 ON CONFLICT(singleton) DO UPDATE SET digest=excluded.digest,run_id=excluded.run_id,run_attempt=excluded.run_attempt,jti=excluded.jti,expires_at=excluded.expires_at;
 RETURN jsonb_build_object('state','LEASED','manifest',p_digest);
END $function$
;
CREATE OR REPLACE FUNCTION enem_ingestion_private.execute_one(p_digest text, p_verified jsonb, p_ordinal integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO '' SET lock_timeout TO '5s'
AS $function$
DECLARE r enem_ingestion_private.releases%rowtype; p enem_ingestion_private.payloads%rowtype;
 item jsonb;q public.question_items%rowtype;existing uuid;matches integer;rec enem_ingestion_private.receipts%rowtype;
 results jsonb:='[]';count_items integer;manifest jsonb;entry jsonb;
BEGIN
 -- Only the server gateway holds EXECUTE. Claims below are the cryptographically verified
 -- workload envelope, never used as request.jwt.claims or auth.uid.
 IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'NO_HUMAN_IMPERSONATION';END IF;
 IF NOT pg_try_advisory_xact_lock(81261016) THEN RAISE EXCEPTION 'INGEST_BUSY';END IF;
 -- Short transaction locks also exclude non-cooperating writers and identity phantoms.
 -- No lock survives the RPC transaction; execute_one repeats this before each item.
 LOCK TABLE enem_ingestion_private.releases, enem_ingestion_private.payloads,
 enem_ingestion_private.receipts, enem_ingestion_private.progress,
 public.question_sources, public.question_licenses, public.question_items,
 public.question_alternatives, public.content_subjects, public.content_items,
 public.content_question_items IN SHARE ROW EXCLUSIVE MODE;
 PERFORM enem_ingestion_private.assert_global_preflight(p_digest,p_verified);
 SELECT * INTO r FROM enem_ingestion_private.releases WHERE digest=p_digest FOR UPDATE;
 IF NOT FOUND OR NOT r.enabled OR r.expires_at<=now() THEN RAISE EXCEPTION 'RELEASE_REVOKED';END IF;
 IF p_verified->>'repository_id' IS DISTINCT FROM '1297887230' OR p_verified->>'commit' IS DISTINCT FROM r.commit_sha
 OR p_verified->>'workflow_sha' IS DISTINCT FROM r.workflow_sha OR p_verified->>'ref' IS DISTINCT FROM r.ref
 OR coalesce(p_verified->>'run_id','') !~ '^[0-9]+$' OR coalesce(p_verified->>'run_attempt','') !~ '^[0-9]+$'
 OR length(coalesce(p_verified->>'jti','')) NOT BETWEEN 8 AND 200
 OR coalesce(p_verified->>'expires_at','') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'WORKLOAD_SCOPE';END IF;
 IF (p_verified->>'expires_at')::numeric<=extract(epoch from clock_timestamp()) THEN RAISE EXCEPTION 'WORKLOAD_EXPIRED';END IF;
 IF EXISTS(SELECT 1 FROM enem_ingestion_private.runs WHERE jti=p_verified->>'jti' AND (digest<>p_digest OR run_id<>p_verified->>'run_id' OR run_attempt<>p_verified->>'run_attempt' OR commit_sha<>r.commit_sha)) THEN RAISE EXCEPTION 'TOKEN_REPLAY';END IF;
 INSERT INTO enem_ingestion_private.runs(jti,digest,run_id,run_attempt,commit_sha) VALUES(p_verified->>'jti',p_digest,p_verified->>'run_id',p_verified->>'run_attempt',r.commit_sha) ON CONFLICT(jti) DO NOTHING;
 manifest:=r.manifest_text::jsonb;
 SELECT count(*) INTO count_items FROM enem_ingestion_private.payloads WHERE digest=p_digest;
 IF count_items NOT BETWEEN 1 AND 25 OR jsonb_typeof(manifest->'items') IS DISTINCT FROM 'array' OR jsonb_array_length(manifest->'items')<>count_items THEN RAISE EXCEPTION 'BATCH_LIMIT';END IF;
 IF (SELECT sum(octet_length(payload_text)) FROM enem_ingestion_private.payloads WHERE digest=p_digest)>16777216 THEN RAISE EXCEPTION 'BATCH_BYTES';END IF;
 FOR p IN SELECT * FROM enem_ingestion_private.payloads WHERE digest=p_digest AND ordinal=p_ordinal ORDER BY ordinal LOOP
  -- Current transaction lock makes revocation serializable: revoke prevents the next transaction.
  -- Maximum 25 items / timeout; no claims about interrupting an already committed transaction.
  IF (p_verified->>'expires_at')::numeric<=extract(epoch from clock_timestamp()) THEN RAISE EXCEPTION 'WORKLOAD_EXPIRED';END IF;
  entry:=manifest->'items'->(p.ordinal-1);item:=p.payload_text::jsonb;
  IF entry->>'code' IS DISTINCT FROM p.code OR entry->>'sha256' IS DISTINCT FROM p.payload_sha
   OR entry->>'rights' IS DISTINCT FROM 'APPROVED' OR entry->>'editorial' IS DISTINCT FROM 'APPROVED'
   OR item->>'code' IS DISTINCT FROM p.code OR item->>'category_request_id' IS DISTINCT FROM p.request_id::text
   OR item->'metadata'->'source_identity'->>'source_question_id' IS DISTINCT FROM p.external_id
   OR item->'metadata'->'source_identity'->>'occurrence_id' IS DISTINCT FROM p.occurrence_id
   OR item->>'question_type' IS DISTINCT FROM 'multipla_escolha' THEN RAISE EXCEPTION 'PAYLOAD_BINDING';END IF;
  IF NOT EXISTS(SELECT 1 FROM public.question_sources s JOIN public.question_licenses sl ON sl.id=s.license_id JOIN public.question_licenses il ON il.id=(item->>'license_id')::uuid WHERE s.id=(item->>'source_id')::uuid AND sl.publication_allowed AND il.publication_allowed) THEN RAISE EXCEPTION 'RIGHTS_GATE';END IF;
  SELECT * INTO rec FROM enem_ingestion_private.receipts WHERE digest=p_digest AND ordinal=p.ordinal;
  IF FOUND THEN
   SELECT * INTO q FROM public.question_items WHERE id=rec.question_id;
   IF rec.payload_sha<>p.payload_sha OR q.code IS DISTINCT FROM p.code OR q.publication_status<>'PUBLICADO' OR q.curation_status<>'APROVADO' THEN RAISE EXCEPTION 'RECEIPT_DRIFT';END IF;
  ELSE
   SELECT count(*),min(id::text)::uuid INTO matches,existing FROM public.question_items WHERE code=p.code OR metadata->'source_identity'->>'source_question_id'=p.external_id OR metadata->'source_identity'->>'occurrence_id'=p.occurrence_id;
   IF matches<>0 THEN RAISE EXCEPTION 'PREEXISTING_IDENTITY_REQUIRES_RECONCILIATION';END IF;
   q:=enem_ingestion_private.save_core(null,item,null,true);
   IF q.code<>p.code OR q.metadata IS DISTINCT FROM item->'metadata' OR q.source_id::text IS DISTINCT FROM item->>'source_id' OR q.license_id::text IS DISTINCT FROM item->>'license_id' OR q.correct_answer IS DISTINCT FROM item->>'correct_answer'
    OR (SELECT count(*) FROM public.question_alternatives WHERE question_id=q.id)<>5 THEN RAISE EXCEPTION 'CREATE_READBACK';END IF;
   PERFORM public.avalia_plus_assert_objective_alternatives(q.id);
   q:=enem_ingestion_private.publish_core(q.id,'APROVADO','Publicação por workload GitHub OIDC; manifesto revisado '||p_digest,true);
   INSERT INTO enem_ingestion_private.receipts(digest,ordinal,request_id,question_id,payload_sha,run_id,jti) VALUES(p_digest,p.ordinal,p.request_id,q.id,p.payload_sha,p_verified->>'run_id',p_verified->>'jti');
  END IF;
  IF q.metadata IS DISTINCT FROM item->'metadata' OR q.source_id::text IS DISTINCT FROM item->>'source_id' OR q.license_id::text IS DISTINCT FROM item->>'license_id' OR q.correct_answer IS DISTINCT FROM item->>'correct_answer' OR q.statement IS DISTINCT FROM item->>'statement' THEN RAISE EXCEPTION 'CONTENT_DRIFT';END IF;
  IF (SELECT jsonb_agg(jsonb_build_object('label',label,'body',body,'is_correct',is_correct) ORDER BY position) FROM public.question_alternatives WHERE question_id=q.id) IS DISTINCT FROM item->'alternatives' THEN RAISE EXCEPTION 'ALTERNATIVE_DRIFT';END IF;
  IF q.publication_status<>'PUBLICADO' OR q.curation_status<>'APROVADO' OR q.workflow_status<>'APROVADO' OR NOT EXISTS(SELECT 1 FROM public.content_question_items a JOIN public.content_items c ON c.id=a.content_item_id WHERE a.question_item_id=q.id AND c.editorial_status='PUBLISHED' AND c.subject_id::text=item->'canonical_category'->>'subject_id' AND c.metadata->>'category_mode'=item->'canonical_category'->>'category_mode' AND (SELECT jsonb_agg(value ORDER BY value) FROM jsonb_array_elements(c.metadata->'category_grade_ids'))=(SELECT jsonb_agg(value ORDER BY value) FROM jsonb_array_elements(item->'canonical_category'->'category_grade_ids'))) THEN RAISE EXCEPTION 'FINAL_GATE';END IF;
  results:=results||jsonb_build_array(jsonb_build_object('code',q.code,'id',q.id,'status','CONFIRMED','receipt',(SELECT jsonb_build_object('question_id',question_id,'request_id',request_id,'payload_sha',payload_sha) FROM enem_ingestion_private.receipts WHERE digest=p_digest AND ordinal=p.ordinal)));
 END LOOP;
 RETURN jsonb_build_object('manifest',p_digest,'count',jsonb_array_length(results),'items',results);
END $function$
;
COMMIT;
