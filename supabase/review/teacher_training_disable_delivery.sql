-- Recoverable rollout rollback: stops new catalogs and signed URLs, preserves
-- uploaded bytes, canonical content, lesson metadata and all existing licenses.
-- Signed URLs already issued can remain usable for at most their 300-second TTL.
begin;
update teacher_training_private.assets set ready = false;
revoke execute on function public.teacher_training_catalog(uuid) from authenticated;
revoke execute on function public.teacher_training_authorize_lesson(uuid, uuid) from authenticated;
revoke execute on function public.teacher_training_asset_binding(uuid, text) from service_role;
commit;
