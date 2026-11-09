-- Match the canonical aliases already used by mission_private.licensed.
-- Preschool classes may store their grade in age_group with ano_escolar NULL.
-- Classification does not grant access: enrollment, school, release and licenses
-- remain checked by the existing callers. Keep existing ownership and ACL.
begin;
create or replace function mission_private.class_grade(c_id uuid)
returns text language sql stable security definer set search_path='' as $$
 select case when count(distinct grade_id)=1 and count(distinct mapped)=1 then min(mapped) end
 from (
  select g.id grade_id,
   case when seg.code='EDUCACAO_INFANTIL' then 'infantil'
    when seg.code in('FUNDAMENTAL','FUNDAMENTAL_ANOS_FINAIS') and g.code in('1_ANO','2_ANO','3_ANO','4_ANO','5_ANO','6_ANO','7_ANO','8_ANO','9_ANO') then split_part(g.code,'_',1)
    when seg.code='ENSINO_MEDIO' and g.code in('EM_1','EM_2','EM_3') then replace(g.code,'_','') end mapped
  from public.classes c
  join public.content_grade_aliases a on a.alias_code=any(array[
   public.rs_content_normalize_code(c.school_year),
   public.rs_content_normalize_code(c.ano_escolar::text),
   public.rs_content_normalize_code(c.age_group)
  ])
  join public.content_grades g on g.id=a.grade_id and g.status='active'
  join public.content_segments seg on seg.id=g.segment_id and seg.status='active'
  where c.id=c_id
 ) canonical_grade;
$$;
commit;
