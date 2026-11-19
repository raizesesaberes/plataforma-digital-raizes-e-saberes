\set ON_ERROR_STOP on
-- Synthetic isolated database ONLY. Reconstructed V3, not a migration.
BEGIN;
CREATE ROLE pv3_owner NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE ROLE pv3_prepare NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE ROLE pv3_approve NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE ROLE pv3_publish NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE ROLE pv3_withdraw NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE SCHEMA pv3 AUTHORIZATION pv3_owner;
SET ROLE pv3_owner;
-- Fail closed: missing/null/wrong types never yield an UNKNOWN CHECK result.
CREATE FUNCTION pv3.valid_manifest(p jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE e jsonb; v jsonb; k text; seen_ids text[]:=ARRAY[]::text[]; seen_paths text[]:=ARRAY[]::text[]; seen_lessons int[]; n int;
BEGIN
 IF p IS NULL OR jsonb_typeof(p) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
 IF jsonb_array_length(p)=0 THEN RETURN false; END IF;
 FOR e IN SELECT value FROM jsonb_array_elements(p) LOOP
  IF jsonb_typeof(e) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
  FOREACH k IN ARRAY ARRAY['id','title','path','sha','edition','subject','audience'] LOOP
   IF jsonb_typeof(e->k) IS DISTINCT FROM 'string' OR length(trim(e->>k))=0 THEN RETURN false; END IF;
  END LOOP;
  IF (e->>'audience') NOT IN ('teacher','student') OR (e->>'sha') !~ '^[a-f0-9]{64}$' THEN RETURN false; END IF;
  IF (e->>'id')=ANY(seen_ids) OR (e->>'path')=ANY(seen_paths) THEN RETURN false; END IF;
  seen_ids:=array_append(seen_ids,e->>'id'); seen_paths:=array_append(seen_paths,e->>'path');
  FOREACH k IN ARRAY ARRAY['volume','unit'] LOOP
   IF jsonb_typeof(e->k) IS DISTINCT FROM 'number' OR (e->>k) !~ '^[1-9][0-9]*$' THEN RETURN false; END IF;
   n:=(e->>k)::int;
  END LOOP;
  IF jsonb_typeof(e->'covered') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
  IF jsonb_array_length(e->'covered')=0 THEN RETURN false; END IF;
  seen_lessons:=ARRAY[]::int[];
  FOR v IN SELECT value FROM jsonb_array_elements(e->'covered') LOOP
   IF jsonb_typeof(v) IS DISTINCT FROM 'number' OR (v#>>'{}') !~ '^[1-9][0-9]*$' THEN RETURN false; END IF;
   n:=(v#>>'{}')::int;
   IF n=ANY(seen_lessons) THEN RETURN false; END IF;
   seen_lessons:=array_append(seen_lessons,n);
  END LOOP;
 END LOOP;
 RETURN true;
 EXCEPTION WHEN numeric_value_out_of_range OR invalid_text_representation THEN RETURN false;
END $$;
CREATE TABLE pv3.manifest(batch text PRIMARY KEY,payload jsonb NOT NULL CHECK(pv3.valid_manifest(payload) IS TRUE),revoked boolean NOT NULL DEFAULT false);
CREATE TABLE pv3.approval(batch text PRIMARY KEY REFERENCES pv3.manifest,payload jsonb NOT NULL,expires timestamptz NOT NULL,actor name NOT NULL DEFAULT current_user);
CREATE TABLE pv3.revocation(batch text PRIMARY KEY REFERENCES pv3.approval,reason text NOT NULL CHECK(length(trim(reason))>0),actor name NOT NULL DEFAULT current_user,transaction_id bigint NOT NULL DEFAULT txid_current());
CREATE TABLE pv3.content(id text PRIMARY KEY,batch text NOT NULL REFERENCES pv3.manifest,title text NOT NULL);
CREATE TABLE pv3.asset(id text PRIMARY KEY REFERENCES pv3.content,batch text NOT NULL REFERENCES pv3.manifest,path text UNIQUE NOT NULL,sha text NOT NULL CHECK(sha ~ '^[a-f0-9]{64}$'));
CREATE TABLE pv3.coverage(id text NOT NULL REFERENCES pv3.content,batch text NOT NULL REFERENCES pv3.manifest,edition text NOT NULL,subject text NOT NULL,volume int NOT NULL,unit int NOT NULL,audience text NOT NULL CHECK(audience IN ('teacher','student')),lesson int NOT NULL,PRIMARY KEY(edition,subject,volume,unit,audience,lesson));
CREATE TABLE pv3.receipt(batch text PRIMARY KEY REFERENCES pv3.approval,actor name NOT NULL DEFAULT current_user);
CREATE TABLE pv3.withdrawal(batch text PRIMARY KEY REFERENCES pv3.receipt,reason text NOT NULL,actor name NOT NULL DEFAULT current_user);
GRANT USAGE ON SCHEMA pv3 TO pv3_prepare,pv3_approve,pv3_publish,pv3_withdraw;
GRANT SELECT ON ALL TABLES IN SCHEMA pv3 TO pv3_prepare,pv3_approve,pv3_publish,pv3_withdraw;
GRANT INSERT ON pv3.manifest TO pv3_prepare;
GRANT INSERT ON pv3.approval,pv3.revocation TO pv3_approve;
GRANT INSERT ON pv3.content,pv3.asset,pv3.coverage,pv3.receipt TO pv3_publish;
GRANT INSERT ON pv3.withdrawal TO pv3_withdraw;
GRANT UPDATE(revoked) ON pv3.manifest TO pv3_approve,pv3_publish;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['manifest','approval','revocation','content','asset','coverage','receipt','withdrawal'] LOOP
 EXECUTE format('ALTER TABLE pv3.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('ALTER TABLE pv3.%I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY read_fixture ON pv3.%I FOR SELECT USING(true)',t);
 END LOOP;
END $$;
CREATE POLICY prepare ON pv3.manifest FOR INSERT TO pv3_prepare WITH CHECK(NOT revoked);
CREATE POLICY lock_only ON pv3.manifest FOR UPDATE TO pv3_publish USING(true) WITH CHECK(false);
CREATE POLICY revoke_gate ON pv3.manifest FOR UPDATE TO pv3_approve USING(true) WITH CHECK(revoked);
CREATE POLICY approve ON pv3.approval FOR INSERT TO pv3_approve WITH CHECK(actor=current_user AND expires>clock_timestamp() AND payload=(SELECT m.payload FROM pv3.manifest m WHERE m.batch=approval.batch AND NOT revoked));
CREATE POLICY revoke ON pv3.revocation FOR INSERT TO pv3_approve WITH CHECK(actor=current_user AND transaction_id=txid_current());
CREATE FUNCTION pv3.allowed(b text) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path='' AS $$
DECLARE p jsonb; BEGIN SELECT a.payload INTO p FROM pv3.approval a WHERE a.batch=b AND a.expires>clock_timestamp() AND NOT EXISTS(SELECT 1 FROM pv3.revocation r WHERE r.batch=b); RETURN p; END $$;
CREATE FUNCTION pv3.lock_batch(b text) RETURNS void LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path='' AS $$
DECLARE r boolean; BEGIN
 SELECT revoked INTO r FROM pv3.manifest WHERE batch=b FOR UPDATE;
 IF NOT FOUND OR r OR pv3.allowed(b) IS NULL THEN RAISE EXCEPTION 'approval unavailable'; END IF;
END $$;
CREATE FUNCTION pv3.before_write() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$ BEGIN PERFORM pv3.lock_batch(NEW.batch); RETURN NEW; END $$;
CREATE FUNCTION pv3.revoke_gate() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$ BEGIN UPDATE pv3.manifest SET revoked=true WHERE batch=NEW.batch; RETURN NEW; END $$;
CREATE TRIGGER revoke BEFORE INSERT ON pv3.revocation FOR EACH ROW EXECUTE FUNCTION pv3.revoke_gate();
CREATE FUNCTION pv3.monotonic() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$ BEGIN IF OLD.revoked OR NOT NEW.revoked THEN RAISE EXCEPTION 'revocation monotonic'; END IF; RETURN NEW; END $$;
CREATE TRIGGER monotonic BEFORE UPDATE ON pv3.manifest FOR EACH ROW EXECUTE FUNCTION pv3.monotonic();
CREATE FUNCTION pv3.require_audit() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pv3.revocation r WHERE r.batch=NEW.batch AND r.transaction_id=txid_current() AND r.actor=current_user) THEN RAISE EXCEPTION 'revocation audit required'; END IF; RETURN NULL; END $$;
CREATE CONSTRAINT TRIGGER audit AFTER UPDATE ON pv3.manifest DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pv3.require_audit();
CREATE POLICY content ON pv3.content FOR INSERT TO pv3_publish WITH CHECK(EXISTS(SELECT 1 FROM jsonb_array_elements(pv3.allowed(batch)) e WHERE e->>'id'=id AND e->>'title'=title));
CREATE POLICY asset ON pv3.asset FOR INSERT TO pv3_publish WITH CHECK(EXISTS(SELECT 1 FROM jsonb_array_elements(pv3.allowed(batch)) e WHERE e->>'id'=id AND e->>'path'=path AND e->>'sha'=sha));
CREATE POLICY coverage ON pv3.coverage FOR INSERT TO pv3_publish WITH CHECK(EXISTS(SELECT 1 FROM jsonb_array_elements(pv3.allowed(batch)) e WHERE e->>'id'=id AND e->>'edition'=edition AND e->>'subject'=subject AND (e->>'volume')::int=volume AND (e->>'unit')::int=unit AND e->>'audience'=audience AND e->'covered' @> to_jsonb(ARRAY[lesson])));
CREATE POLICY receipt ON pv3.receipt FOR INSERT TO pv3_publish WITH CHECK(actor=current_user AND pv3.allowed(batch) IS NOT NULL);
CREATE POLICY withdraw ON pv3.withdrawal FOR INSERT TO pv3_withdraw WITH CHECK(actor=current_user);
CREATE FUNCTION pv3.complete() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE p jsonb; n bigint; k bigint; BEGIN
 PERFORM pv3.lock_batch(NEW.batch); p:=pv3.allowed(NEW.batch);
 IF pv3.valid_manifest(p) IS DISTINCT FROM true THEN RAISE EXCEPTION 'invalid approved manifest'; END IF;
 n:=jsonb_array_length(p);
 SELECT sum(jsonb_array_length(e->'covered')) INTO k FROM jsonb_array_elements(p) e;
 IF NOT EXISTS(SELECT 1 FROM pv3.receipt WHERE batch=NEW.batch)
 OR (SELECT count(*) FROM pv3.content WHERE batch=NEW.batch) IS DISTINCT FROM n
 OR (SELECT count(*) FROM pv3.asset WHERE batch=NEW.batch) IS DISTINCT FROM n
 OR (SELECT count(*) FROM pv3.coverage WHERE batch=NEW.batch) IS DISTINCT FROM k
 THEN RAISE EXCEPTION 'incomplete batch'; END IF;
 -- Equality in both directions, including full dimensions/audience and media fields.
 IF EXISTS(
 WITH expected AS (
  SELECT jsonb_build_array(e->>'id',e->>'title',e->>'path',e->>'sha',e->>'edition',e->>'subject',(e->>'volume')::int,(e->>'unit')::int,e->>'audience',(v#>>'{}')::int) row_value
  FROM jsonb_array_elements(p) e CROSS JOIN LATERAL jsonb_array_elements(e->'covered') v
 ), actual AS (
  SELECT jsonb_build_array(c.id,c.title,a.path,a.sha,g.edition,g.subject,g.volume,g.unit,g.audience,g.lesson) row_value
  FROM pv3.content c JOIN pv3.asset a USING(id,batch) JOIN pv3.coverage g USING(id,batch) WHERE c.batch=NEW.batch
 )
 SELECT 1 FROM ((SELECT row_value FROM expected EXCEPT SELECT row_value FROM actual)
 UNION ALL (SELECT row_value FROM actual EXCEPT SELECT row_value FROM expected)) mismatch
 ) THEN RAISE EXCEPTION 'manifest set mismatch'; END IF;
 RETURN NULL;
END $$;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['content','asset','coverage','receipt'] LOOP
 EXECUTE format('CREATE TRIGGER lock_write BEFORE INSERT ON pv3.%I FOR EACH ROW EXECUTE FUNCTION pv3.before_write()',t);
 EXECUTE format('CREATE CONSTRAINT TRIGGER complete AFTER INSERT ON pv3.%I DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pv3.complete()',t);
END LOOP; END $$;
CREATE FUNCTION pv3.publish(b text) RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE e jsonb; a jsonb; BEGIN
 PERFORM pv3.lock_batch(b);
 IF EXISTS(SELECT 1 FROM pv3.receipt WHERE batch=b) THEN RETURN 'already published'; END IF;
 FOR e IN SELECT value FROM jsonb_array_elements(pv3.allowed(b)) LOOP
 INSERT INTO pv3.content VALUES(e->>'id',b,e->>'title');
 INSERT INTO pv3.asset VALUES(e->>'id',b,e->>'path',e->>'sha');
 FOR a IN SELECT value FROM jsonb_array_elements(e->'covered') LOOP
 INSERT INTO pv3.coverage VALUES(e->>'id',b,e->>'edition',e->>'subject',(e->>'volume')::int,(e->>'unit')::int,e->>'audience',(a#>>'{}')::int);
 END LOOP; END LOOP;
 INSERT INTO pv3.receipt(batch) VALUES(b); RETURN 'published'; END $$;
CREATE VIEW pv3.visible WITH(security_invoker=true) AS SELECT c.* FROM pv3.content c JOIN pv3.receipt r USING(batch) WHERE NOT EXISTS(SELECT 1 FROM pv3.withdrawal w WHERE w.batch=c.batch);
GRANT SELECT ON pv3.visible TO pv3_publish,pv3_withdraw;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA pv3 FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pv3.valid_manifest(jsonb) TO pv3_prepare,pv3_approve,pv3_publish;
GRANT EXECUTE ON FUNCTION pv3.allowed(text),pv3.lock_batch(text),pv3.publish(text) TO pv3_publish;
RESET ROLE;
COMMIT;
