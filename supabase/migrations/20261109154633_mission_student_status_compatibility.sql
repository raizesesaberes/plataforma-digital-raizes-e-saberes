-- Match the canonical student status spelling accepted by actor_context.
-- No student data, assignments, licensing, release controls or grants change.
begin;
create or replace function mission_private.student_allowed(c_id uuid, s_id uuid)
returns boolean language sql volatile security definer set search_path='' as $$
 select auth.uid() is not null and exists(
   select 1 from public.students s
   join public.enrollments e on e.student_id=s.id
   join public.classes c on c.id=e.class_id and c.school_id=e.school_id
   join public.schools sc on sc.id=c.school_id
   where s.user_id=auth.uid() and s.status in ('active','ativo')
   and e.status='active' and c.status='active' and sc.status='active'
   and e.class_id=c_id and e.school_id=s_id
   and e.enrolled_at<=clock_timestamp()
   and (e.ended_at is null or e.ended_at>clock_timestamp())
 );
$$;
commit;
