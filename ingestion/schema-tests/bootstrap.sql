-- Local synthetic contract harness only; never apply to a shared database.
CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';
CREATE ROLE enem_ingest_runtime NOLOGIN; CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA supabase_migrations; CREATE TABLE supabase_migrations.schema_migrations(version text,name text); INSERT INTO supabase_migrations.schema_migrations VALUES('20261022182921','enem_ingestion_isolated_inactive');
CREATE SCHEMA enem_ingestion_private; CREATE SCHEMA enem_ingestion_api; CREATE SCHEMA school_category_private;
CREATE TABLE enem_ingestion_private.releases(digest text PRIMARY KEY,manifest_text text,commit_sha text,workflow_sha text,ref text,workflow_ref text,audience text,approval_reference text,enabled boolean,expires_at timestamptz,
CONSTRAINT releases_ref_check CHECK(ref='refs/heads/candidate/manifest-recovery-20261021'),
CONSTRAINT releases_workflow_ref_check CHECK(workflow_ref='raizesesaberes/plataforma-digital-raizes-e-saberes/.github/workflows/enem-ingest.yml@refs/heads/candidate/manifest-recovery-20261021'));
CREATE TABLE enem_ingestion_private.payloads(digest text,ordinal int,code text,external_id text,occurrence_id text,request_id uuid,payload_sha text,payload_text text);
CREATE TABLE enem_ingestion_private.receipts(digest text,ordinal int,request_id uuid,question_id uuid,payload_sha text,run_id text,jti text);
CREATE TABLE enem_ingestion_private.progress(digest text,ordinal int,state text);
CREATE TABLE enem_ingestion_private.runs(jti text PRIMARY KEY,digest text,run_id text,run_attempt text,commit_sha text);
CREATE TABLE enem_ingestion_private.lease(singleton boolean PRIMARY KEY,digest text,run_id text,run_attempt text,jti text,expires_at timestamptz);
CREATE TABLE public.question_licenses(id uuid PRIMARY KEY,publication_allowed boolean);
CREATE TABLE public.question_sources(id uuid PRIMARY KEY,license_id uuid,source_type text);
CREATE TABLE public.question_items(id uuid PRIMARY KEY,code text,metadata jsonb,statement text,correct_answer text,source_id uuid,license_id uuid,publication_status text,curation_status text,workflow_status text);
CREATE TABLE public.question_alternatives(id uuid,question_id uuid,label text,body text,is_correct boolean,position int);
CREATE TABLE public.content_subjects(id uuid PRIMARY KEY,status text);
CREATE TABLE public.content_items(id uuid,subject_id uuid,metadata jsonb,editorial_status text);
CREATE TABLE public.content_question_items(question_item_id uuid,content_item_id uuid);
CREATE FUNCTION school_category_private.taxonomy() RETURNS TABLE(grade_id uuid,institutional boolean) LANGUAGE sql AS $$ SELECT '66666666-6666-4666-8666-666666666666'::uuid,false $$;
CREATE OR REPLACE FUNCTION school_category_private.assert_rich_alternatives(p_question_type text, p_alternatives jsonb, p_metadata jsonb, p_correct_answer text)
 RETURNS void
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
DECLARE a jsonb; r jsonb; img jsonb; ref jsonb; raw bytea;
 assets jsonb := p_metadata->'enemPilotInline'->'assets';
 alts jsonb := p_metadata->'content'->'alternatives';
 n integer := 0; correct integer := 0; total bigint := 0;
 hashes text[] := ARRAY[]::text[]; paths text[] := ARRAY[]::text[];
 h text; path text; w bigint; height bigint; lim integer;
BEGIN
 IF jsonb_typeof(p_metadata->'enem') IS DISTINCT FROM 'object'
 OR p_question_type IS DISTINCT FROM 'multipla_escolha'
 OR jsonb_typeof(p_alternatives) IS DISTINCT FROM 'array'
 OR jsonb_typeof(alts) IS DISTINCT FROM 'array'
 OR jsonb_typeof(assets) IS DISTINCT FROM 'array' THEN
 RAISE EXCEPTION 'ENEM_RICH_CONTRACT_INVALID'; END IF;
 IF jsonb_array_length(p_alternatives)<>5 OR jsonb_array_length(alts)<>5
 OR jsonb_array_length(assets)>16 OR octet_length(p_metadata::text)>1048576 THEN
 RAISE EXCEPTION 'ENEM_RICH_LIMIT'; END IF;
 FOR img IN SELECT value FROM jsonb_array_elements(assets) LOOP
  h:=img->>'sha256';path:=img->>'path';
  IF jsonb_typeof(img->'sha256') IS DISTINCT FROM 'string' OR h !~ '^[a-f0-9]{64}$'
  OR jsonb_typeof(img->'path') IS DISTINCT FROM 'string' OR path IS DISTINCT FROM 'assets/'||h||'.png'
  OR h=ANY(hashes) OR path=ANY(paths) OR img->>'mime' IS DISTINCT FROM 'image/png'
  OR jsonb_typeof(img->'base64') IS DISTINCT FROM 'string'
  OR jsonb_typeof(img->'bytes') IS DISTINCT FROM 'number'
  OR jsonb_typeof(img->'width') IS DISTINCT FROM 'number'
  OR jsonb_typeof(img->'height') IS DISTINCT FROM 'number'
  OR (img->>'bytes') !~ '^[0-9]+$'
  OR (img->>'width') !~ '^[0-9]+$'
  OR (img->>'height') !~ '^[0-9]+$' THEN
  RAISE EXCEPTION 'ENEM_ASSET_INVALID'; END IF;
  lim:=CASE WHEN h='d9158d4a2865f004fa163b47962be0241211fb8147eebdea472c457de1e5136f' THEN 524288 WHEN h='eff27f9052e7a766a796c2b61665875bcae1bf17b710dd8171a21f9561fea9ab' AND (p_metadata->'source_provenance'->>'release_id'='enem-1998-q26-q27-v1' AND p_metadata->'enem'->>'examYear'='1998' AND ((p_metadata->'source_identity'->>'source_question_id'='q_0444bfbba49e2a87540fb6d1' AND p_metadata->'source_identity'->>'occurrence_id'='occ_02f96dec08b0224283f27598') OR (p_metadata->'source_identity'->>'source_question_id'='q_b63b23cc82a8be1baca400bb' AND p_metadata->'source_identity'->>'occurrence_id'='occ_74a83c4eb2a19965b7afa9c5'))) THEN 71239 WHEN h='0c2ea43681dea7da70956cd09aed28421a30801d4dc17f3d30e1242bcbb9dede' AND (p_metadata->'source_provenance'->>'release_id'='enem-1999-lot01-v1' AND p_metadata->'enem'->>'examYear'='1999' AND p_metadata->'source_identity'->>'source_question_id'='q_51a904ba4734492480406fddca38b925' AND p_metadata->'source_identity'->>'occurrence_id'='occ_156538b6e56d57241eed41f8334f3c03') THEN 69933 WHEN h='10a951911ccd987c0388173fb1f1b158847af2eda9f0394b14a41806074d07b3' AND (p_metadata->'source_provenance'->>'release_id'='enem-1999-lot01-v1' AND p_metadata->'enem'->>'examYear'='1999' AND p_metadata->'source_identity'->>'source_question_id'='q_4ed6d98aee1a46eeaec11a96ca0ab6db' AND p_metadata->'source_identity'->>'occurrence_id'='occ_c57ce428f344697bd460bc703f4b2948') THEN 71181 WHEN h='10a951911ccd987c0388173fb1f1b158847af2eda9f0394b14a41806074d07b3' AND (p_metadata->'source_provenance'->>'release_id'='enem-1999-lot01-v1' AND p_metadata->'enem'->>'examYear'='1999' AND p_metadata->'source_identity'->>'source_question_id'='q_97e9e1e513f4441981bd8bacfdf7f868' AND p_metadata->'source_identity'->>'occurrence_id'='occ_2450d04851dee36f9b15d85306e6f6c4') THEN 71181 WHEN h='020e002d611860463a65a60f848dcd9917b397323f5839a07d441bf3ad493a90' AND (p_metadata->'source_provenance'->>'release_id'='enem-1999-lot01-v1' AND p_metadata->'enem'->>'examYear'='1999' AND p_metadata->'source_identity'->>'source_question_id'='q_dc795579aea24f82a838521535a81210' AND p_metadata->'source_identity'->>'occurrence_id'='occ_9a01513d7e3a54f01fd2b3385c194d58') THEN 69501 WHEN h='020e002d611860463a65a60f848dcd9917b397323f5839a07d441bf3ad493a90' AND (p_metadata->'source_provenance'->>'release_id'='enem-1999-lot01-v1' AND p_metadata->'enem'->>'examYear'='1999' AND p_metadata->'source_identity'->>'source_question_id'='q_a596b2ac779b4329802d7565bff6edc6' AND p_metadata->'source_identity'->>'occurrence_id'='occ_4b2c59b38d8b34cbcce9c0d1474d8044') THEN 69501 WHEN h='145a40e9467bd448d79924be678adf5dc0a8a8926807091fdde69ee2b901a054' AND (p_metadata->'source_provenance'->>'release_id'='enem-1999-lot01-v1' AND p_metadata->'enem'->>'examYear'='1999' AND p_metadata->'source_identity'->>'source_question_id'='q_1819cffb8e6440b4af98b1b528e8921b' AND p_metadata->'source_identity'->>'occurrence_id'='occ_ff0e18fc293611fedb1ea877050c41d3') THEN 97418 ELSE 65536 END;
  IF length(img->>'base64')>4*ceil(lim::numeric/3) OR (img->>'base64') ~ '[^A-Za-z0-9+/=]' THEN RAISE EXCEPTION 'ENEM_BASE64_INVALID'; END IF;
  BEGIN raw:=decode(img->>'base64','base64'); EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'ENEM_BASE64_INVALID'; END;
  IF octet_length(raw)<33 OR octet_length(raw)>lim
  OR (img->>'bytes')::numeric<>octet_length(raw)
  OR replace(encode(raw,'base64'),E'\n','') IS DISTINCT FROM img->>'base64'
  OR encode(extensions.digest(raw,'sha256'),'hex') IS DISTINCT FROM h
  OR encode(substring(raw FROM 1 FOR 8),'hex')<>'89504e470d0a1a0a'
  OR encode(substring(raw FROM 9 FOR 8),'hex')<>'0000000d49484452' THEN
  RAISE EXCEPTION 'ENEM_PNG_INTEGRITY'; END IF;
  w:=get_byte(raw,16)::bigint*16777216+get_byte(raw,17)::bigint*65536+get_byte(raw,18)::bigint*256+get_byte(raw,19);
  height:=get_byte(raw,20)::bigint*16777216+get_byte(raw,21)::bigint*65536+get_byte(raw,22)::bigint*256+get_byte(raw,23);
  IF w NOT BETWEEN 1 AND 2048 OR height NOT BETWEEN 1 AND 2048
  OR (img->>'width')::numeric<>w OR (img->>'height')::numeric<>height THEN RAISE EXCEPTION 'ENEM_PNG_DIMENSIONS'; END IF;
  IF lim=524288 AND (octet_length(raw)<>468023 OR w<>992 OR height<>704) THEN RAISE EXCEPTION 'ENEM_Q167_IDENTITY'; END IF;
  IF lim=71239 AND (octet_length(raw)<>71239 OR w<>804 OR height<>633) THEN RAISE EXCEPTION 'ENEM_1998_IDENTITY'; END IF;
  IF h='0c2ea43681dea7da70956cd09aed28421a30801d4dc17f3d30e1242bcbb9dede' AND (p_metadata->'source_provenance'->>'release_id'='enem-1999-lot01-v1' AND p_metadata->'enem'->>'examYear'='1999' AND p_metadata->'source_identity'->>'source_question_id'='q_51a904ba4734492480406fddca38b925' AND p_metadata->'source_identity'->>'occurrence_id'='occ_156538b6e56d57241eed41f8334f3c03') AND (octet_length(raw)<>69933 OR w<>1332 OR height<>405) THEN RAISE EXCEPTION 'ENEM_1999_IDENTITY'; END IF;
  IF h='10a951911ccd987c0388173fb1f1b158847af2eda9f0394b14a41806074d07b3' AND (p_metadata->'source_provenance'->>'release_id'='enem-1999-lot01-v1' AND p_metadata->'enem'->>'examYear'='1999' AND p_metadata->'source_identity'->>'source_question_id'='q_4ed6d98aee1a46eeaec11a96ca0ab6db' AND p_metadata->'source_identity'->>'occurrence_id'='occ_c57ce428f344697bd460bc703f4b2948') AND (octet_length(raw)<>71181 OR w<>726 OR height<>681) THEN RAISE EXCEPTION 'ENEM_1999_IDENTITY'; END IF;
  IF h='10a951911ccd987c0388173fb1f1b158847af2eda9f0394b14a41806074d07b3' AND (p_metadata->'source_provenance'->>'release_id'='enem-1999-lot01-v1' AND p_metadata->'enem'->>'examYear'='1999' AND p_metadata->'source_identity'->>'source_question_id'='q_97e9e1e513f4441981bd8bacfdf7f868' AND p_metadata->'source_identity'->>'occurrence_id'='occ_2450d04851dee36f9b15d85306e6f6c4') AND (octet_length(raw)<>71181 OR w<>726 OR height<>681) THEN RAISE EXCEPTION 'ENEM_1999_IDENTITY'; END IF;
  IF h='020e002d611860463a65a60f848dcd9917b397323f5839a07d441bf3ad493a90' AND (p_metadata->'source_provenance'->>'release_id'='enem-1999-lot01-v1' AND p_metadata->'enem'->>'examYear'='1999' AND p_metadata->'source_identity'->>'source_question_id'='q_dc795579aea24f82a838521535a81210' AND p_metadata->'source_identity'->>'occurrence_id'='occ_9a01513d7e3a54f01fd2b3385c194d58') AND (octet_length(raw)<>69501 OR w<>1158 OR height<>768) THEN RAISE EXCEPTION 'ENEM_1999_IDENTITY'; END IF;
  IF h='020e002d611860463a65a60f848dcd9917b397323f5839a07d441bf3ad493a90' AND (p_metadata->'source_provenance'->>'release_id'='enem-1999-lot01-v1' AND p_metadata->'enem'->>'examYear'='1999' AND p_metadata->'source_identity'->>'source_question_id'='q_a596b2ac779b4329802d7565bff6edc6' AND p_metadata->'source_identity'->>'occurrence_id'='occ_4b2c59b38d8b34cbcce9c0d1474d8044') AND (octet_length(raw)<>69501 OR w<>1158 OR height<>768) THEN RAISE EXCEPTION 'ENEM_1999_IDENTITY'; END IF;
  IF h='145a40e9467bd448d79924be678adf5dc0a8a8926807091fdde69ee2b901a054' AND (p_metadata->'source_provenance'->>'release_id'='enem-1999-lot01-v1' AND p_metadata->'enem'->>'examYear'='1999' AND p_metadata->'source_identity'->>'source_question_id'='q_1819cffb8e6440b4af98b1b528e8921b' AND p_metadata->'source_identity'->>'occurrence_id'='occ_ff0e18fc293611fedb1ea877050c41d3') AND (octet_length(raw)<>97418 OR w<>1104 OR height<>522) THEN RAISE EXCEPTION 'ENEM_1999_IDENTITY'; END IF;
  total:=total+octet_length(raw);IF total>524288 THEN RAISE EXCEPTION 'ENEM_ITEM_ASSET_LIMIT'; END IF;
  hashes:=array_append(hashes,h);paths:=array_append(paths,path);
 END LOOP;
 IF jsonb_typeof(p_metadata->'content'->'blocks') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'ENEM_BLOCKS_INVALID'; END IF;
 IF jsonb_array_length(p_metadata->'content'->'blocks') NOT BETWEEN 1 AND 256 THEN RAISE EXCEPTION 'ENEM_BLOCKS_LIMIT'; END IF;
 FOR r IN SELECT value FROM jsonb_array_elements(p_metadata->'content'->'blocks') LOOP
  IF jsonb_typeof(r->'type') IS DISTINCT FROM 'string' OR jsonb_typeof(r->'value') IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'ENEM_BLOCK_INVALID'; END IF;
  IF r->>'type'='text' THEN
   IF length(r->>'value')>100000 THEN RAISE EXCEPTION 'ENEM_BLOCK_TEXT_LIMIT'; END IF;
  ELSIF r->>'type'='asset' THEN
   IF NOT ((r->>'value')=ANY(paths)) THEN RAISE EXCEPTION 'ENEM_BLOCK_ASSET_MISSING'; END IF;
  ELSE RAISE EXCEPTION 'ENEM_BLOCK_TYPE_INVALID'; END IF;
 END LOOP;
 FOR a IN SELECT value FROM jsonb_array_elements(p_alternatives) LOOP
  r:=alts->n;
  IF a->>'label' IS DISTINCT FROM substring('ABCDE' FROM n+1 FOR 1)
  OR r->>'label' IS DISTINCT FROM a->>'label'
  OR jsonb_typeof(a->'body') IS DISTINCT FROM 'string'
  OR jsonb_typeof(r->'text') IS DISTINCT FROM 'string'
  OR a->>'body' IS DISTINCT FROM r->>'text'
  OR length(r->>'text')>100000
  OR jsonb_typeof(a->'is_correct') IS DISTINCT FROM 'boolean'
  OR jsonb_typeof(r->'asset_paths') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'ENEM_ALTERNATIVE_INVALID'; END IF;
  IF jsonb_array_length(r->'asset_paths')>16 OR (btrim(r->>'text')='' AND jsonb_array_length(r->'asset_paths')=0) THEN RAISE EXCEPTION 'ENEM_ALTERNATIVE_EMPTY'; END IF;
  FOR ref IN SELECT value FROM jsonb_array_elements(r->'asset_paths') LOOP
   IF jsonb_typeof(ref) IS DISTINCT FROM 'string' OR NOT ((ref#>>'{}')=ANY(paths)) THEN RAISE EXCEPTION 'ENEM_ALTERNATIVE_ASSET_MISSING'; END IF;
  END LOOP;
  IF (a->>'is_correct')::boolean THEN
   correct:=correct+1;IF p_correct_answer IS DISTINCT FROM a->>'label' THEN RAISE EXCEPTION 'ENEM_KEY_MISMATCH'; END IF;
  END IF;
  n:=n+1;
 END LOOP;
 IF correct<>1 THEN RAISE EXCEPTION 'ENEM_KEY_INVALID'; END IF;
END $function$
;
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
CREATE OR REPLACE FUNCTION enem_ingestion_private.assert_workload(p_digest text, p_verified jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE r enem_ingestion_private.releases%rowtype;
BEGIN
 IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'NO_HUMAN_IMPERSONATION';END IF;
 SELECT * INTO r FROM enem_ingestion_private.releases WHERE digest=p_digest FOR SHARE;
 IF NOT FOUND OR NOT r.enabled OR r.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'RELEASE_REVOKED';END IF;
 IF p_verified->>'repository_id' IS DISTINCT FROM '1297887230' OR p_verified->>'commit' IS DISTINCT FROM r.commit_sha OR p_verified->>'workflow_sha' IS DISTINCT FROM r.workflow_sha OR p_verified->>'ref' IS DISTINCT FROM r.ref OR coalesce(p_verified->>'run_id','')!~'^[0-9]+$' OR coalesce(p_verified->>'run_attempt','')!~'^[0-9]+$' OR length(coalesce(p_verified->>'jti','')) NOT BETWEEN 8 AND 200 OR coalesce(p_verified->>'expires_at','')!~'^[0-9]+$' THEN RAISE EXCEPTION 'WORKLOAD_SCOPE';END IF;
 IF (p_verified->>'expires_at')::numeric<=extract(epoch from clock_timestamp()) THEN RAISE EXCEPTION 'WORKLOAD_EXPIRED';END IF;
 IF EXISTS(SELECT 1 FROM enem_ingestion_private.runs WHERE jti=p_verified->>'jti' AND (digest<>p_digest OR run_id<>p_verified->>'run_id' OR run_attempt<>p_verified->>'run_attempt' OR commit_sha<>r.commit_sha)) THEN RAISE EXCEPTION 'TOKEN_REPLAY';END IF;
 INSERT INTO enem_ingestion_private.runs(jti,digest,run_id,run_attempt,commit_sha) VALUES(p_verified->>'jti',p_digest,p_verified->>'run_id',p_verified->>'run_attempt',r.commit_sha) ON CONFLICT(jti) DO NOTHING;
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
CREATE FUNCTION enem_ingestion_api.material(p_digest text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$ BEGIN IF session_user<>'enem_ingest_runtime' THEN RAISE EXCEPTION 'INGEST_LOGIN_REQUIRED';END IF; RETURN public.enem_ingest_material(p_digest);END $$;
REVOKE ALL ON FUNCTION public.enem_ingest_material(text),public.enem_ingest_acquire(text,jsonb),enem_ingestion_private.execute_one(text,jsonb,integer) FROM PUBLIC,anon,authenticated,service_role,enem_ingest_runtime;
GRANT USAGE ON SCHEMA enem_ingestion_api TO enem_ingest_runtime;
REVOKE ALL ON FUNCTION enem_ingestion_api.material(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION enem_ingestion_api.material(text) TO enem_ingest_runtime;
