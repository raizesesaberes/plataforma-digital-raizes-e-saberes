-- Execute only after both Storage uploads have been downloaded back and their
-- complete SHA-256 digests verified against these immutable filenames.
-- This activates media readiness, NOT editorial publication or license grants.
begin;
do $$
declare updated_count integer;
begin
  update teacher_training_private.assets a set ready = true, verified_at = now()
  from teacher_training_private.lessons l, storage.objects o, storage.buckets b
  where l.id = a.lesson_id and a.kind = 'video' and a.bucket = 'videos'
    and b.id = a.bucket and b.public is false
    and o.bucket_id = a.bucket and o.name = a.storage_path
    and o.metadata->>'size' = a.byte_size::text and o.metadata->>'mimetype' = 'video/mp4'
    and ((l.code = 'avalia-mais-matematica-1-ano-v1-u1-aula-1'
      and a.sha256 = '0f9a46d6c4dfb07b12b328e98b75dabd18ec299df76f2fe8712914070f14ab2d' and a.byte_size = 7024161)
      or (l.code = 'avalia-mais-matematica-1-ano-v1-u1-aula-2'
      and a.sha256 = '1a2a805a953b98da295f8a1b7534f16791151e2745d21a44b136783d54e9ddcb' and a.byte_size = 8498925))
    and a.storage_path = 'formacao/avalia-mais/matematica/1-ano/volume-1/unidade-1/aula-'
      || l.lesson_number || '/' || a.sha256 || '.mp4';
  get diagnostics updated_count = row_count;
  if updated_count <> 2 then raise exception 'EXPECTED_TWO_VERIFIED_TRAINING_ASSETS'; end if;
  if (select count(*) from teacher_training_private.lessons l
    cross join lateral teacher_training_private.ready_assets(l.id) a
    where l.code in ('avalia-mais-matematica-1-ano-v1-u1-aula-1', 'avalia-mais-matematica-1-ano-v1-u1-aula-2')) <> 2 then
    raise exception 'TRAINING_ASSET_READINESS_CHECK_FAILED';
  end if;
end;
$$;
commit;
