\set ON_ERROR_STOP on
SET ROLE pv3_prepare;
INSERT INTO pv3.manifest(batch,payload) VALUES
('ci_fixture_v1','[{"id":"ficticio","title":"Vídeo fictício","path":"synthetic/fixture.mp4","sha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","edition":"ficticia","subject":"teste","volume":1,"unit":1,"audience":"teacher","covered":[1]}]');
RESET ROLE;
SET ROLE pv3_publish;
DO $guard$ BEGIN
  BEGIN
    PERFORM pv3.publish('ci_fixture_v1');
    RAISE EXCEPTION 'expected refusal';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'approval unavailable' THEN RAISE; END IF;
  END;
  IF EXISTS(SELECT 1 FROM pv3.receipt) THEN RAISE EXCEPTION 'unexpected receipt'; END IF;
END $guard$;
RESET ROLE;
SET ROLE pv3_approve;
INSERT INTO pv3.approval(batch,payload,expires)
SELECT batch,payload,clock_timestamp()+interval '15 minutes' FROM pv3.manifest WHERE batch='ci_fixture_v1';
RESET ROLE;
SET ROLE pv3_publish;
DO $guard$ BEGIN
  IF pv3.publish('ci_fixture_v1') IS DISTINCT FROM 'published' THEN RAISE EXCEPTION 'publish failed'; END IF;
END $guard$;
DO $guard$ BEGIN
  IF pv3.publish('ci_fixture_v1') IS DISTINCT FROM 'already published' THEN RAISE EXCEPTION 'idempotency failed'; END IF;
  IF (SELECT count(*) FROM pv3.visible) <> 1 OR (SELECT count(*) FROM pv3.receipt) <> 1 OR (SELECT count(*) FROM pv3.asset) <> 1 OR (SELECT count(*) FROM pv3.coverage) <> 1 THEN RAISE EXCEPTION 'catalog mismatch'; END IF;
END $guard$;
RESET ROLE;
SELECT 'PASS: recusa sem aprovação, publicação aprovada, reexecução sem duplicata';
