-- Manual rollback only, never run automatically. Quiesce worker first.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $g$ BEGIN IF (SELECT rolcanlogin FROM pg_roles WHERE rolname='enem_ingest_runtime') IS DISTINCT FROM false OR EXISTS(SELECT 1 FROM enem_ingestion_private.releases) OR EXISTS(SELECT 1 FROM enem_ingestion_private.lease) THEN RAISE EXCEPTION 'QUIESCE_AND_RECONCILE_FIRST'; END IF; END $g$;
DO $fingerprints$ BEGIN
 IF md5(pg_get_functiondef('public.enem_ingest_acquire(text,jsonb)'::regprocedure)) <> '419e655832df76f4a176d47e00224041' THEN RAISE EXCEPTION 'ROLLBACK_FUNCTION_DRIFT:enem_ingest_acquire(text,jsonb)'; END IF;
 IF md5(pg_get_functiondef('public.enem_ingest_material(text)'::regprocedure)) <> '5bf9ea43de25dd616409d10a79bceb58' THEN RAISE EXCEPTION 'ROLLBACK_FUNCTION_DRIFT:enem_ingest_material(text)'; END IF;
 IF md5(pg_get_functiondef('enem_ingestion_private.assert_global_preflight(text,jsonb)'::regprocedure)) <> 'aaedcd67bf487112ac4457039b60a199' THEN RAISE EXCEPTION 'ROLLBACK_FUNCTION_DRIFT:enem_ingestion_private.assert_global_preflight(text,jsonb)'; END IF;
 IF md5(pg_get_functiondef('enem_ingestion_private.execute_one(text,jsonb,integer)'::regprocedure)) <> '8e186a83541fd7cbe720797868aa7d95' THEN RAISE EXCEPTION 'ROLLBACK_FUNCTION_DRIFT:enem_ingestion_private.execute_one(text,jsonb,integer)'; END IF;
END $fingerprints$;
ALTER TABLE enem_ingestion_private.releases
 DROP CONSTRAINT releases_ref_check,
 DROP CONSTRAINT releases_workflow_ref_check,
 ADD CONSTRAINT releases_ref_check CHECK(ref='refs/heads/candidate/manifest-recovery-20261021'),
 ADD CONSTRAINT releases_workflow_ref_check CHECK(workflow_ref='raizesesaberes/plataforma-digital-raizes-e-saberes/.github/workflows/enem-ingest.yml@refs/heads/candidate/manifest-recovery-20261021');

CREATE OR REPLACE FUNCTION public.enem_ingest_material(p_digest text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM enem_ingestion_private.releases WHERE digest=p_digest AND enabled AND expires_at>now()) THEN RAISE EXCEPTION 'RELEASE_NOT_APPROVED';END IF;
 RETURN (SELECT jsonb_agg(jsonb_build_object('sha256',payload_sha,'text',payload_text) ORDER BY ordinal) FROM enem_ingestion_private.payloads WHERE digest=p_digest);
END $function$
;
CREATE OR REPLACE FUNCTION public.enem_ingest_acquire(p_digest text, p_verified jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE l enem_ingestion_private.lease%rowtype;
BEGIN
 IF NOT pg_try_advisory_xact_lock(81261016) THEN RAISE EXCEPTION 'INGEST_BUSY';END IF;
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
 SET search_path TO ''
AS $function$
DECLARE r enem_ingestion_private.releases%rowtype; p enem_ingestion_private.payloads%rowtype;
 item jsonb;q public.question_items%rowtype;existing uuid;matches integer;rec enem_ingestion_private.receipts%rowtype;
 results jsonb:='[]';count_items integer;manifest jsonb;entry jsonb;
BEGIN
 -- Only the server gateway holds EXECUTE. Claims below are the cryptographically verified
 -- workload envelope, never used as request.jwt.claims or auth.uid.
 IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'NO_HUMAN_IMPERSONATION';END IF;
 IF NOT pg_try_advisory_xact_lock(81261016) THEN RAISE EXCEPTION 'INGEST_BUSY';END IF;
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
DROP FUNCTION enem_ingestion_private.assert_global_preflight(text,jsonb);
COMMIT;
