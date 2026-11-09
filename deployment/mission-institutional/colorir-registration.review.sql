-- Exactly eight trusted catalog roots; registration is not a tenant license grant.
begin;
do $registration$
declare r mission_private.revisions;ci public.content_items;sb mission_private.source_bindings;cid uuid;gids jsonb;seg uuid;md jsonb;n integer;
begin
 perform pg_advisory_xact_lock(hashtextextended('mission-colorir-registration-v1',0));
 if (select count(*) from mission_private.revisions where engine='colorir' and root_source_revision_id is null and owner_auth_id is null)<>8 then raise exception 'MISSION_COLORIR_EXPECTED_EIGHT_ROOTS';end if;
 select count(*),jsonb_agg(grade_id::text order by grade_code),(array_agg(distinct segment_id))[1] into n,gids,seg from school_category_private.taxonomy() where grade_code in('EI2','EI3','EI4','EI5') and stage='EI' and not institutional;
 if n<>4 then raise exception 'MISSION_COLORIR_TAXONOMY_REQUIRED';end if;
 for r in select * from mission_private.revisions where engine='colorir' and root_source_revision_id is null and owner_auth_id is null loop
 if not exists(select 1 from (values
('RS-INF-COLORIR-CACHORRO-001','colorir:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50','db0c15f62ddb163526f731da6cac9a80bc182347d7ad0461f7d3472b1c3b6e4b'),
('RS-INF-COLORIR-PREGUICA-001','colorir:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148','3d881dd8adcd78fb8d78b7d8138c899601c836d4a2d7c34c20bc0000b45f71e6'),
('RS-INF-COLORIR-BORBOLETA-001','colorir:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944','790de0d24907089fa72243f4fa53b8c08817bfdffbbb107673b38924d543c978'),
('RS-INF-COLORIR-PEIXE-001','colorir:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f','6b6fa00a1f030e97164cf1c244a1a9676ca57cf3ca2ecb247d694ba546e74c54'),
('RS-INF-COLORIR-BANANA-001','colorir:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f','ec1cd06e15518cfd5aac7d49314d4561da0817ec061ca1e0b8c570ec8e7a90c5'),
('RS-INF-COLORIR-CENOURA-001','colorir:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803','1d2734e98697361ca5e24fd82e091a70b813fa5c2ebba70469beafa1ca7ad3ef'),
('RS-INF-COLORIR-LEAO-001','colorir:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c','aab03860f5a15e3b83832d4c7e31dc247907ea13e372e6769677ef43a1e569d6'),
('RS-INF-COLORIR-NUMERO3-001','colorir:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763','eb5456aa57cfb416729644bbab4cb7e2da49b864491db67e206cfc4fcb8cc51d')
) expected(activity_key,revision,source_sha256) where expected.activity_key=r.activity_key and expected.revision=r.revision and expected.source_sha256=r.source_sha256) then raise exception 'MISSION_COLORIR_SOURCE_DRIFT';end if;
 cid:=md5('mission:printable:colorir:v1:'||r.activity_key)::uuid;
 md:=jsonb_build_object('category_mode','TRANSVERSAL','category_grade_ids',gids,'mission_colorir',jsonb_build_object('activity_key',r.activity_key,'source_sha256',r.source_sha256,'revision',r.revision),'pedagogical_status','draft');
 select * into ci from public.content_items where id=cid;
 if found then
 if ci.content_type::text<>'PRINTABLE' or ci.owner_scope::text<>'GLOBAL_RAIZES' or ci.segment_id is distinct from seg or ci.grade_id is not null or ci.metadata is distinct from md then raise exception 'MISSION_COLORIR_REGISTRATION_CONFLICT';end if;
 -- Never republish or override a later administrative withdrawal on replay.
 else
 insert into public.content_items(id,content_type,segment_id,title,owner_scope,editorial_status,published_at,metadata)
 values(cid,'PRINTABLE',seg,r.title,'GLOBAL_RAIZES','PUBLISHED',now(),md);
 end if;
 select * into sb from mission_private.source_bindings where root_revision_id=r.id;
 if found then
 if sb.source_content_item_id<>cid or sb.source_reference<>'colorir:'||r.activity_key then raise exception 'MISSION_COLORIR_BINDING_CONFLICT';end if;
 else
 insert into mission_private.source_bindings(root_revision_id,source_content_item_id,source_reference,verification_batch) values(r.id,cid,'colorir:'||r.activity_key,'colorir-printable-v1');
 end if;
 end loop;
end $registration$;
commit;
