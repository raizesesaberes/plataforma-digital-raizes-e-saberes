-- REVIEW ONLY. These SELECTs observe availability; they DO NOT reserve versions.
-- No INSERT/UPDATE/DELETE, DDL, migration repair, Auth context, or user data.
BEGIN TRANSACTION READ ONLY;
WITH proposed(position,version,name) AS (VALUES
 (1,'20261011060001','fase3_assessment_authorization'),
 (2,'20261011060002','fase3_communication_replies'),
 (3,'20261011060003','fase3_notice_editing'),
 (4,'20261011060004','contract_operations')
)
SELECT p.position,p.version,p.name AS proposed_name,m.name AS observed_name,
 CASE WHEN m.version IS NULL THEN 'ABSENT_NOT_RESERVED'
      WHEN m.name=p.name THEN 'PRESENT_NAME_MATCH_REQUIRES_METADATA_CHECK'
      ELSE 'CONFLICT_STOP' END AS observation,
 false AS database_reservation_created
FROM proposed p LEFT JOIN supabase_migrations.schema_migrations m USING(version)
ORDER BY p.position;

WITH proposed(position,version,name) AS (VALUES
 (1,'20261011060001','fase3_assessment_authorization'),
 (2,'20261011060002','fase3_communication_replies'),
 (3,'20261011060003','fase3_notice_editing'),
 (4,'20261011060004','contract_operations')
), original AS (
 SELECT count(*) AS count,max(version) AS latest,
 md5(string_agg(version||':'||coalesce(name,''),E'\n' ORDER BY version)) AS hash
 FROM supabase_migrations.schema_migrations WHERE version NOT IN(SELECT version FROM proposed)
), installed AS (
 SELECT p.position,p.version,p.name,m.name AS observed_name
 FROM proposed p JOIN supabase_migrations.schema_migrations m USING(version)
)
SELECT original.count=149 AND original.latest='20261011003404'
 AND original.hash='ef9f6ce1ab21510845023cceb4228bae' AS original_149_unchanged,
 original.count,original.latest,original.hash,
 (SELECT count(*) FROM installed) AS package_entries,
 (SELECT coalesce(bool_and(name IS NOT DISTINCT FROM observed_name),true) FROM installed) AS exact_names,
 NOT EXISTS(SELECT 1 FROM installed i,proposed p WHERE p.position<i.position
   AND NOT EXISTS(SELECT 1 FROM installed previous WHERE previous.position=p.position)) AS contiguous_prefix,
 (SELECT count(*) FROM supabase_migrations.schema_migrations) AS total_entries
FROM original;
ROLLBACK;
