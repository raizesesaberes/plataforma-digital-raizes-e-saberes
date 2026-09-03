-- RS-SCHOOL-TEMPLATE V1 schema baseline.
-- Extracted as schema-only from the homologated RS-SCHOOL-PILOT 05E backup.
-- Contains application structure only; no pilot schools, users, students,
-- classes, enrollments, memberships, attendance, documents or communications.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.6 (Postgres.app)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: assessment_status; Type: TYPE; Schema: public; Owner: -
--

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
          AND t.typname = 'assessment_status'
    ) THEN
        CREATE TYPE public.assessment_status AS ENUM (
            'RASCUNHO',
            'PRONTA',
            'ATRIBUIDA',
            'APLICADA',
            'ARQUIVADA'
        );
    END IF;
END
$$;


--
-- Name: question_curation_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.question_curation_status AS ENUM (
    'RASCUNHO',
    'COLETADO',
    'LICENCA_EM_ANALISE',
    'BLOQUEADO_POR_LICENCA',
    'AGUARDANDO_REVISAO_PEDAGOGICA',
    'EM_REVISAO',
    'CORRECAO_SOLICITADA',
    'APROVADO',
    'PUBLICADO',
    'HOMOLOGADO',
    'DESATUALIZADO',
    'ARQUIVADO',
    'REPROVADO'
);


--
-- Name: question_legal_classification; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.question_legal_classification AS ENUM (
    'ITEM_OFICIAL_PUBLICAMENTE_LIBERADO',
    'ITEM_AUTORAL_RAIZES_SABERES_ALINHADO_SAEB',
    'ITEM_ADAPTADO_LICENCA_COMPATIVEL',
    'ITEM_EM_ANALISE_DIREITOS',
    'ITEM_BLOQUEADO_PUBLICACAO'
);


--
-- Name: question_publication_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.question_publication_status AS ENUM (
    'NAO_PUBLICADO',
    'PUBLICADO',
    'SUSPENSO',
    'ARQUIVADO'
);


--
-- Name: attendance_guardian_can_read(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.attendance_guardian_can_read(p_student_id uuid) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1
    from public.student_guardians sg
    where sg.student_id = p_student_id
      and sg.profile_id = auth.uid()
      and sg.status = 'active'
  );
$$;


--
-- Name: attendance_teacher_can_record(uuid, uuid, uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.attendance_teacher_can_record(p_class_id uuid, p_student_id uuid, p_enrollment_id uuid, p_attendance_date date) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1
    from public.enrollments e
    join public.classes c on c.id = e.class_id
    join public.class_teacher_memberships ctm on ctm.class_id = c.id
    join public.teachers t on t.id = ctm.teacher_id
    where e.id = p_enrollment_id
      and e.student_id = p_student_id
      and e.class_id = p_class_id
      and e.school_id = c.school_id
      and e.status = 'active'
      and (e.enrolled_at is null or e.enrolled_at::date <= p_attendance_date)
      and (e.ended_at is null or e.ended_at::date >= p_attendance_date)
      and c.status = 'active'
      and ctm.status = 'active'
      and ctm.started_at <= now()
      and (ctm.ended_at is null or ctm.ended_at > now())
      and t.profile_id = auth.uid()
  );
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: communications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.communications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id uuid NOT NULL,
    author_profile_id uuid DEFAULT auth.uid() NOT NULL,
    author_role text NOT NULL,
    communication_type text NOT NULL,
    audience_type text NOT NULL,
    class_id uuid,
    student_id uuid,
    title text NOT NULL,
    body text NOT NULL,
    communication_date date DEFAULT CURRENT_DATE NOT NULL,
    expires_at timestamp with time zone,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT communications_audience_check CHECK ((audience_type = ANY (ARRAY['student'::text, 'class'::text, 'school'::text]))),
    CONSTRAINT communications_audience_shape_check CHECK ((((audience_type = 'school'::text) AND (class_id IS NULL) AND (student_id IS NULL)) OR ((audience_type = 'class'::text) AND (class_id IS NOT NULL) AND (student_id IS NULL)) OR ((audience_type = 'student'::text) AND (class_id IS NOT NULL) AND (student_id IS NOT NULL)))),
    CONSTRAINT communications_body_not_blank CHECK ((length(btrim(body)) > 0)),
    CONSTRAINT communications_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))),
    CONSTRAINT communications_title_not_blank CHECK ((length(btrim(title)) > 0)),
    CONSTRAINT communications_type_check CHECK ((communication_type = ANY (ARRAY['message'::text, 'notice'::text, 'weekly_information'::text, 'institutional_announcement'::text])))
);


--
-- Name: communication_can_read(public.communications); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.communication_can_read(p_communication public.communications) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select
    p_communication.author_profile_id = auth.uid()
    or public.secretaria_can_manage_school(p_communication.school_id)
    or (
      p_communication.status = 'published'
      and (p_communication.expires_at is null or p_communication.expires_at > now())
      and (
        public.communication_teacher_can_target(p_communication.school_id, p_communication.class_id, p_communication.student_id, p_communication.audience_type)
        or public.communication_current_student_can_read(p_communication.school_id, p_communication.class_id, p_communication.student_id, p_communication.audience_type)
        or public.communication_guardian_can_read(p_communication.school_id, p_communication.class_id, p_communication.student_id, p_communication.audience_type)
      )
    );
$$;


--
-- Name: communication_current_student_can_read(uuid, uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.communication_current_student_can_read(p_school_id uuid, p_class_id uuid, p_student_id uuid, p_audience_type text) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1
    from public.students s
    join public.enrollments e on e.student_id = s.id
    where s.user_id = auth.uid()
      and e.status = 'active'
      and e.ended_at is null
      and e.school_id = p_school_id
      and (
        (p_audience_type = 'school')
        or (p_audience_type = 'class' and e.class_id = p_class_id)
        or (p_audience_type = 'student' and s.id = p_student_id)
      )
  );
$$;


--
-- Name: communication_guardian_can_read(uuid, uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.communication_guardian_can_read(p_school_id uuid, p_class_id uuid, p_student_id uuid, p_audience_type text) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1
    from public.student_guardians sg
    join public.enrollments e on e.student_id = sg.student_id
    where sg.profile_id = auth.uid()
      and sg.status = 'active'
      and e.status = 'active'
      and e.ended_at is null
      and e.school_id = p_school_id
      and (
        (p_audience_type = 'school')
        or (p_audience_type = 'class' and e.class_id = p_class_id)
        or (p_audience_type = 'student' and sg.student_id = p_student_id)
      )
  );
$$;


--
-- Name: communication_teacher_can_target(uuid, uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.communication_teacher_can_target(p_school_id uuid, p_class_id uuid, p_student_id uuid, p_audience_type text) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1
    from public.class_teacher_memberships ctm
    join public.teachers t on t.id = ctm.teacher_id
    join public.classes c on c.id = ctm.class_id
    where t.profile_id = auth.uid()
      and ctm.status = 'active'
      and ctm.started_at <= now()
      and (ctm.ended_at is null or ctm.ended_at > now())
      and c.status = 'active'
      and c.school_id = p_school_id
      and c.id = p_class_id
      and p_audience_type in ('class', 'student')
      and (
        p_audience_type = 'class'
        or exists (
          select 1
          from public.enrollments e
          where e.student_id = p_student_id
            and e.class_id = p_class_id
            and e.school_id = p_school_id
            and e.status = 'active'
            and e.ended_at is null
        )
      )
  );
$$;


--
-- Name: current_platform_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_platform_role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select lower(
    coalesce(
      auth.jwt() -> 'app_metadata' ->> 'platform_role',
      auth.jwt() -> 'app_metadata' ->> 'app_role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      case when auth.role() = 'service_role' then 'service_role' else '' end
    )
  );
$$;


--
-- Name: current_question_bank_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_question_bank_role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select lower(
    coalesce(
      auth.jwt() -> 'app_metadata' ->> 'question_bank_role',
      auth.jwt() -> 'app_metadata' ->> 'app_role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() ->> 'question_bank_role',
      auth.jwt() ->> 'app_role',
      case when auth.role() = 'service_role' then 'service_role' else '' end
    )
  );
$$;


--
-- Name: has_question_bank_role(text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_question_bank_role(required_roles text[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  select public.current_question_bank_role() = any(required_roles)
    or (
      public.current_question_bank_role() in ('admin','administrador','administrador_nacional')
      and 'administrador_nacional' = any(required_roles)
    )
    or (
      public.current_question_bank_role() in ('curator','curador','revisor','revisor_pedagogico')
      and (
        'curator' = any(required_roles)
        or 'curador' = any(required_roles)
        or 'revisor' = any(required_roles)
        or 'revisor_pedagogico' = any(required_roles)
      )
    )
    or (
      public.current_question_bank_role() in ('viewer','visualizador','aplicador')
      and (
        'viewer' = any(required_roles)
        or 'visualizador' = any(required_roles)
        or 'aplicador' = any(required_roles)
      )
    );
$$;


--
-- Name: institutional_can_access_student(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.institutional_can_access_student(target_student_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1
    from public.enrollments e
    join public.class_teacher_memberships ctm
      on ctm.class_id = e.class_id
    join public.teachers t
      on t.id = ctm.teacher_id
    where e.student_id = target_student_id
      and e.status = 'active'
      and e.enrolled_at <= now()
      and (e.ended_at is null or e.ended_at > now())

      and ctm.status = 'active'
      and ctm.started_at <= now()
      and (ctm.ended_at is null or ctm.ended_at > now())

      and t.profile_id = auth.uid()
      and coalesce(t.status, 'active') = 'active'
  );
$$;


--
-- Name: institutional_early_childhood_can_access_class(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.institutional_early_childhood_can_access_class(target_class_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1
    from public.students s
    join public.enrollments e on e.student_id = s.id
    where s.user_id = auth.uid()
      and coalesce(s.status, 'active') = 'active'
      and e.class_id = target_class_id
      and e.status = 'active'
      and e.enrolled_at <= now()
      and (e.ended_at is null or e.ended_at > now())
  );
$$;


--
-- Name: institutional_early_childhood_can_access_profile(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.institutional_early_childhood_can_access_profile(target_profile_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1
    from public.teachers t
    where t.profile_id = target_profile_id
      and public.institutional_early_childhood_can_access_teacher(t.id)
  );
$$;


--
-- Name: institutional_early_childhood_can_access_school(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.institutional_early_childhood_can_access_school(target_school_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1
    from public.students s
    join public.enrollments e on e.student_id = s.id
    where s.user_id = auth.uid()
      and coalesce(s.status, 'active') = 'active'
      and e.school_id = target_school_id
      and e.status = 'active'
      and e.enrolled_at <= now()
      and (e.ended_at is null or e.ended_at > now())
  );
$$;


--
-- Name: institutional_early_childhood_can_access_teacher(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.institutional_early_childhood_can_access_teacher(target_teacher_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1
    from public.students s
    join public.enrollments e on e.student_id = s.id
    join public.class_teacher_memberships ctm on ctm.class_id = e.class_id
    join public.teachers t on t.id = ctm.teacher_id
    where s.user_id = auth.uid()
      and coalesce(s.status, 'active') = 'active'
      and e.status = 'active'
      and e.enrolled_at <= now()
      and (e.ended_at is null or e.ended_at > now())
      and ctm.status = 'active'
      and ctm.started_at <= now()
      and (ctm.ended_at is null or ctm.ended_at > now())
      and t.id = target_teacher_id
      and coalesce(t.status, 'active') = 'active'
  );
$$;


--
-- Name: institutional_early_childhood_has_active_enrollment(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.institutional_early_childhood_has_active_enrollment(target_student_id uuid, target_class_id uuid, target_school_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1
    from public.students s
    join public.enrollments e on e.student_id = s.id
    where s.id = target_student_id
      and s.user_id = auth.uid()
      and coalesce(s.status, 'active') = 'active'
      and e.class_id = target_class_id
      and e.school_id = target_school_id
      and e.status = 'active'
      and e.enrolled_at <= now()
      and (e.ended_at is null or e.ended_at > now())
  );
$$;


--
-- Name: institutional_guardian_can_access_calendar_entry(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.institutional_guardian_can_access_calendar_entry(target_class_id uuid, target_school_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1
    from public.student_guardians sg
    join public.enrollments e on e.student_id = sg.student_id
    where sg.profile_id = auth.uid()
      and sg.status = 'active'
      and e.class_id = target_class_id
      and e.school_id = target_school_id
      and e.status = 'active'
      and e.enrolled_at <= now()
      and (e.ended_at is null or e.ended_at > now())
  );
$$;


--
-- Name: institutional_has_active_class_membership(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.institutional_has_active_class_membership(target_class_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1
    from public.class_teacher_memberships ctm
    join public.teachers t
      on t.id = ctm.teacher_id
    where ctm.class_id = target_class_id
      and t.profile_id = auth.uid()
      and coalesce(t.status, 'active') = 'active'
      and ctm.status = 'active'
      and ctm.started_at <= now()
      and (ctm.ended_at is null or ctm.ended_at > now())
  );
$$;


--
-- Name: institutional_has_active_school_membership(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.institutional_has_active_school_membership(target_school_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1
    from public.school_memberships sm
    where sm.school_id = target_school_id
      and sm.profile_id = auth.uid()
      and sm.status = 'active'
      and sm.started_at <= now()
      and (sm.ended_at is null or sm.ended_at > now())
  );
$$;


--
-- Name: institutional_is_current_early_childhood_student(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.institutional_is_current_early_childhood_student(target_student_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1
    from public.students s
    where s.id = target_student_id
      and s.user_id = auth.uid()
      and coalesce(s.status, 'active') = 'active'
  );
$$;


--
-- Name: institutional_is_current_guardian(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.institutional_is_current_guardian(target_student_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1
    from public.student_guardians sg
    where sg.student_id = target_student_id
      and sg.profile_id = auth.uid()
      and sg.status = 'active'
  );
$$;


--
-- Name: institutional_is_current_student(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.institutional_is_current_student(target_student_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1
    from public.students s
    where s.id = target_student_id
      and s.user_id = auth.uid()
      and coalesce(s.status, 'active') = 'active'
  )
  or exists (
    select 1
    from public.students s
    join public.users u on u.id = s.user_id
    where s.id = target_student_id
      and lower(coalesce(u.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and coalesce(s.status, 'active') = 'active'
  );
$$;


--
-- Name: institutional_is_current_teacher(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.institutional_is_current_teacher(target_teacher_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1
    from public.teachers t
    where t.id = target_teacher_id
      and t.profile_id = auth.uid()
      and coalesce(t.status, 'active') = 'active'
  );
$$;


--
-- Name: institutional_plan_matches_publication(uuid, uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.institutional_plan_matches_publication(target_plan_id uuid, target_teacher_id uuid, target_class_id uuid, target_school_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select
    target_plan_id is null
    or exists (
      select 1
      from public.teacher_plans tp
      where tp.id = target_plan_id
        and tp.teacher_id = target_teacher_id
        and tp.class_id = target_class_id
        and tp.school_id = target_school_id
        and tp.status in ('draft', 'published')
    );
$$;


--
-- Name: institutional_student_can_access_calendar_entry(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.institutional_student_can_access_calendar_entry(target_class_id uuid, target_school_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1
    from public.students s
    join public.enrollments e on e.student_id = s.id
    left join public.users u on u.id = s.user_id
    where e.class_id = target_class_id
      and e.school_id = target_school_id
      and e.status = 'active'
      and e.enrolled_at <= now()
      and (e.ended_at is null or e.ended_at > now())
      and coalesce(s.status, 'active') = 'active'
      and (
        s.user_id = auth.uid()
        or lower(coalesce(u.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;


--
-- Name: institutional_teacher_can_manage_class(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.institutional_teacher_can_manage_class(target_teacher_id uuid, target_class_id uuid, target_school_id uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.class_teacher_memberships ctm
      join public.teachers t on t.id = ctm.teacher_id
      join public.classes c on c.id = ctm.class_id
      where ctm.teacher_id = target_teacher_id
        and ctm.class_id = target_class_id
        and (target_school_id is null or c.school_id = target_school_id)
        and t.profile_id = auth.uid()
        and coalesce(t.status, 'active') = 'active'
        and ctm.status = 'active'
        and ctm.started_at <= now()
        and (ctm.ended_at is null or ctm.ended_at > now())
        and coalesce(c.status, 'active') = 'active'
    );
$$;


--
-- Name: institutional_touch_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.institutional_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: is_platform_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_platform_admin() RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  select public.current_platform_role() = any(array[
    'admin',
    'admin_ti',
    'administrador',
    'administrador_nacional',
    'ti',
    'service_role'
  ]);
$$;


--
-- Name: publish_communication(uuid, text, text, text, text, uuid, uuid, text, date, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.publish_communication(p_school_id uuid, p_communication_type text, p_audience_type text, p_title text, p_body text, p_class_id uuid DEFAULT NULL::uuid, p_student_id uuid DEFAULT NULL::uuid, p_status text DEFAULT 'published'::text, p_communication_date date DEFAULT CURRENT_DATE, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_role text := lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', auth.jwt() -> 'app_metadata' ->> 'role', ''));
  v_author uuid := auth.uid();
  v_comm public.communications%rowtype;
begin
  if v_author is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  if p_communication_type not in ('message', 'notice', 'weekly_information', 'institutional_announcement') then
    raise exception 'Tipo de comunicacao invalido.' using errcode = '22023';
  end if;

  if p_audience_type not in ('student', 'class', 'school') then
    raise exception 'Tipo de destino invalido.' using errcode = '22023';
  end if;

  if coalesce(p_status, 'published') not in ('draft', 'published', 'archived') then
    raise exception 'Status de comunicacao invalido.' using errcode = '22023';
  end if;

  if length(btrim(coalesce(p_title, ''))) = 0 or length(btrim(coalesce(p_body, ''))) = 0 then
    raise exception 'Titulo e mensagem sao obrigatorios.' using errcode = '22023';
  end if;

  if p_audience_type = 'school' and (p_class_id is not null or p_student_id is not null) then
    raise exception 'Comunicado escolar nao deve informar turma/aluno.' using errcode = '22023';
  end if;

  if p_audience_type = 'class' and (p_class_id is null or p_student_id is not null) then
    raise exception 'Comunicado de turma deve informar somente class_id.' using errcode = '22023';
  end if;

  if p_audience_type = 'student' and (p_class_id is null or p_student_id is null) then
    raise exception 'Comunicado individual deve informar class_id e student_id.' using errcode = '22023';
  end if;

  if public.secretaria_can_manage_school(p_school_id) then
    null;
  elsif v_role = 'professor' and public.communication_teacher_can_target(p_school_id, p_class_id, p_student_id, p_audience_type) then
    if p_audience_type = 'school' then
      raise exception 'Professor nao pode publicar comunicado institucional nesta V1.' using errcode = '42501';
    end if;
  else
    raise exception 'Usuario sem permissao para publicar este comunicado.' using errcode = '42501';
  end if;

  if p_audience_type in ('class', 'student') and not exists (
    select 1 from public.classes c
    where c.id = p_class_id
      and c.school_id = p_school_id
      and c.status = 'active'
  ) then
    raise exception 'Turma ativa nao pertence a escola informada.' using errcode = '42501';
  end if;

  if p_audience_type = 'student' and not exists (
    select 1 from public.enrollments e
    where e.student_id = p_student_id
      and e.class_id = p_class_id
      and e.school_id = p_school_id
      and e.status = 'active'
      and e.ended_at is null
  ) then
    raise exception 'Aluno nao possui matricula ativa nesta turma/escola.' using errcode = '42501';
  end if;

  insert into public.communications (
    school_id,
    author_profile_id,
    author_role,
    communication_type,
    audience_type,
    class_id,
    student_id,
    title,
    body,
    communication_date,
    expires_at,
    status
  )
  values (
    p_school_id,
    v_author,
    coalesce(nullif(v_role, ''), 'authenticated'),
    p_communication_type,
    p_audience_type,
    p_class_id,
    p_student_id,
    btrim(p_title),
    btrim(p_body),
    coalesce(p_communication_date, current_date),
    p_expires_at,
    coalesce(p_status, 'published')
  )
  returning * into v_comm;

  insert into public.communication_events (communication_id, event_type, from_status, to_status, performed_by)
  values (v_comm.id, 'created', null, v_comm.status, v_author);

  if v_comm.status = 'published' then
    insert into public.communication_events (communication_id, event_type, from_status, to_status, performed_by)
    values (v_comm.id, 'published', 'draft', 'published', v_author);
  elsif v_comm.status = 'archived' then
    insert into public.communication_events (communication_id, event_type, from_status, to_status, performed_by)
    values (v_comm.id, 'archived', 'draft', 'archived', v_author);
  end if;

  return jsonb_build_object(
    'communication_id', v_comm.id,
    'audience_type', v_comm.audience_type,
    'communication_type', v_comm.communication_type,
    'status', v_comm.status
  );
end;
$$;


--
-- Name: secretaria_can_manage_school(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.secretaria_can_manage_school(p_school_id uuid) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.school_memberships sm
      where sm.school_id = p_school_id
        and sm.profile_id = auth.uid()
        and sm.status = 'active'
        and sm.membership_role in ('gestor', 'coordenador', 'direcao', 'secretaria', 'admin', 'admin_ti')
        and sm.started_at <= now()
        and (sm.ended_at is null or sm.ended_at > now())
    );
$$;


--
-- Name: secretaria_close_enrollment(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.secretaria_close_enrollment(p_enrollment_id uuid, p_to_status text, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_enrollment public.enrollments%rowtype;
  v_to_status text := nullif(trim(p_to_status), '');
  v_reason text := nullif(trim(p_reason), '');
  v_movement_id uuid;
begin
  if v_to_status is null or v_to_status not in ('ended', 'cancelled', 'archived') then
    raise exception 'Encerramento permite somente ended, cancelled ou archived.' using errcode = '22023';
  end if;

  if v_reason is null then
    raise exception 'Motivo do encerramento e obrigatorio.' using errcode = '22023';
  end if;

  select * into v_enrollment
  from public.enrollments
  where id = p_enrollment_id
  for update;

  if v_enrollment.id is null then
    raise exception 'Matricula nao encontrada.' using errcode = '22023';
  end if;

  if not public.secretaria_can_manage_school(v_enrollment.school_id) then
    raise exception 'Perfil institucional sem permissao para movimentar esta matricula.' using errcode = '42501';
  end if;

  update public.enrollments
  set status = v_to_status,
      ended_at = coalesce(ended_at, now())
  where id = v_enrollment.id;

  insert into public.enrollment_movements (
    school_id,
    student_id,
    enrollment_id,
    movement_type,
    from_class_id,
    to_class_id,
    from_status,
    to_status,
    reason,
    performed_by
  )
  values (
    v_enrollment.school_id,
    v_enrollment.student_id,
    v_enrollment.id,
    'enrollment_closed',
    v_enrollment.class_id,
    v_enrollment.class_id,
    v_enrollment.status,
    v_to_status,
    v_reason,
    auth.uid()
  )
  returning id into v_movement_id;

  return jsonb_build_object(
    'movement_id', v_movement_id,
    'enrollment_id', v_enrollment.id,
    'student_id', v_enrollment.student_id,
    'from_status', v_enrollment.status,
    'to_status', v_to_status,
    'performed_by', auth.uid(),
    'created_at', now()
  );
end;
$$;


--
-- Name: secretaria_create_class(uuid, text, text, text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.secretaria_create_class(p_school_id uuid, p_nome text, p_school_year text, p_status text DEFAULT 'active'::text, p_age_group text DEFAULT NULL::text, p_turno text DEFAULT NULL::text, p_ano_escolar text DEFAULT NULL::text, p_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_class_id uuid;
  v_status text := coalesce(nullif(trim(p_status), ''), 'active');
  v_nome text := nullif(trim(p_nome), '');
  v_school_year text := nullif(trim(p_school_year), '');
begin
  if v_nome is null or v_school_year is null then
    raise exception 'Nome da turma e ano letivo sao obrigatorios.' using errcode = '22023';
  end if;

  if v_status not in ('active', 'inactive', 'archived') then
    raise exception 'Status de turma incompativel com o schema.' using errcode = '22023';
  end if;

  if not public.secretaria_can_manage_school(p_school_id) then
    raise exception 'Perfil institucional sem permissao para criar turma nesta escola.' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.classes c
    where c.school_id = p_school_id
      and lower(trim(c.nome)) = lower(v_nome)
      and coalesce(c.school_year, '') = v_school_year
      and c.status <> 'archived'
  ) then
    raise exception 'Turma semelhante ja existe nesta escola e ano letivo.' using errcode = '23505';
  end if;

  insert into public.classes (
    school_id,
    nome,
    school_year,
    status,
    age_group,
    turno,
    ano_escolar
  )
  values (
    p_school_id,
    v_nome,
    v_school_year,
    v_status,
    nullif(trim(p_age_group), ''),
    nullif(trim(p_turno), ''),
    nullif(trim(p_ano_escolar), '')
  )
  returning id into v_class_id;

  return jsonb_build_object(
    'class_id', v_class_id,
    'school_id', p_school_id,
    'status', v_status,
    'created_by', auth.uid(),
    'created_at', now()
  );
end;
$$;


--
-- Name: secretaria_create_guardian_link(uuid, text, text, text, text, text, boolean, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.secretaria_create_guardian_link(p_student_id uuid, p_full_name text, p_relationship text, p_phone text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_status text DEFAULT 'active'::text, p_is_primary boolean DEFAULT false, p_guardian_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_student public.students%rowtype;
  v_enrollment public.enrollments%rowtype;
  v_guardian public.guardians%rowtype;
  v_link_id uuid;
  v_relationship text := coalesce(nullif(trim(p_relationship), ''), 'responsavel');
  v_status text := coalesce(nullif(trim(p_status), ''), 'active');
  v_name text := nullif(trim(p_full_name), '');
  v_email text := nullif(lower(trim(p_email)), '');
  v_phone text := nullif(trim(p_phone), '');
begin
  if v_status <> 'active' then
    raise exception 'Nesta missao somente status active esta autorizado.'
      using errcode = '22023';
  end if;

  if v_relationship not in ('responsavel', 'mae', 'pai', 'avo', 'tutor', 'outro') then
    raise exception 'Tipo de vinculo invalido.'
      using errcode = '22023';
  end if;

  select *
    into v_student
  from public.students s
  where s.id = p_student_id
    and coalesce(s.status, 'active') = 'active'
  limit 1;

  if v_student.id is null then
    raise exception 'Aluno ativo nao encontrado.'
      using errcode = '22023';
  end if;

  select *
    into v_enrollment
  from public.enrollments e
  where e.student_id = v_student.id
    and e.status = 'active'
    and e.ended_at is null
  order by e.enrolled_at desc
  limit 1;

  if v_enrollment.id is null then
    raise exception 'Matricula ativa do aluno nao encontrada.'
      using errcode = '22023';
  end if;

  if not (
    public.is_platform_admin()
    or exists (
      select 1
      from public.school_memberships sm
      where sm.school_id = v_enrollment.school_id
        and sm.profile_id = auth.uid()
        and sm.status = 'active'
        and sm.membership_role in ('gestor', 'coordenador', 'direcao', 'secretaria', 'admin', 'admin_ti')
        and sm.started_at <= now()
        and (sm.ended_at is null or sm.ended_at > now())
    )
  ) then
    raise exception 'Perfil institucional sem permissao para vincular responsavel nesta escola.'
      using errcode = '42501';
  end if;

  if p_guardian_id is not null then
    select *
      into v_guardian
    from public.guardians g
    where g.id = p_guardian_id
      and g.school_id = v_enrollment.school_id
      and g.status = 'active'
    limit 1;

    if v_guardian.id is null then
      raise exception 'Responsavel existente nao encontrado nesta escola.'
        using errcode = '22023';
    end if;
  else
    if v_name is null then
      raise exception 'Nome completo do responsavel e obrigatorio.'
        using errcode = '22023';
    end if;

    select *
      into v_guardian
    from public.guardians g
    where g.school_id = v_enrollment.school_id
      and g.status = 'active'
      and (
        lower(trim(g.full_name)) = lower(v_name)
        or (v_email is not null and lower(g.email) = v_email)
        or (v_phone is not null and g.phone = v_phone)
      )
    order by
      case
        when v_email is not null and lower(g.email) = v_email then 1
        when v_phone is not null and g.phone = v_phone then 2
        else 3
      end
    limit 1;

    if v_guardian.id is null then
      insert into public.guardians (
        school_id,
        full_name,
        email,
        phone,
        status,
        access_status
      )
      values (
        v_enrollment.school_id,
        v_name,
        v_email,
        v_phone,
        v_status,
        'not_configured'
      )
      returning * into v_guardian;
    end if;
  end if;

  update public.student_guardian_links
    set is_primary = p_is_primary,
        updated_at = now()
  where student_id = v_student.id
    and guardian_id = v_guardian.id
    and relationship = v_relationship
    and status = 'active'
  returning id into v_link_id;

  if v_link_id is null then
    insert into public.student_guardian_links (
      student_id,
      guardian_id,
      relationship,
      is_primary,
      status
    )
    values (
      v_student.id,
      v_guardian.id,
      v_relationship,
      p_is_primary,
      'active'
    )
    returning id into v_link_id;
  end if;

  return jsonb_build_object(
    'guardian_id', v_guardian.id,
    'link_id', v_link_id,
    'student_id', v_student.id,
    'school_id', v_enrollment.school_id,
    'relationship', v_relationship,
    'is_primary', p_is_primary,
    'access_status', v_guardian.access_status,
    'created_by', auth.uid(),
    'created_at', now()
  );
end;
$$;


--
-- Name: secretaria_create_student_enrollment(text, date, uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.secretaria_create_student_enrollment(p_nome text, p_data_nascimento date, p_class_id uuid, p_school_year text, p_status text DEFAULT 'active'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_class public.classes%rowtype;
  v_student_id uuid;
  v_enrollment_id uuid;
  v_status text := coalesce(nullif(trim(p_status), ''), 'active');
  v_school_year text := nullif(trim(p_school_year), '');
begin
  if not (
    public.is_platform_admin()
    or exists (
      select 1
      from public.school_memberships sm
      where sm.profile_id = auth.uid()
        and sm.status = 'active'
        and sm.membership_role in ('gestor', 'coordenador', 'direcao', 'secretaria', 'admin', 'admin_ti')
        and sm.started_at <= now()
        and (sm.ended_at is null or sm.ended_at > now())
    )
  ) then
    raise exception 'Perfil institucional sem permissao para cadastrar aluno.'
      using errcode = '42501';
  end if;

  if nullif(trim(p_nome), '') is null then
    raise exception 'Nome completo do aluno e obrigatorio.'
      using errcode = '22023';
  end if;

  if v_status <> 'active' then
    raise exception 'Nesta missao somente status active esta autorizado.'
      using errcode = '22023';
  end if;

  select *
    into v_class
  from public.classes c
  where c.id = p_class_id
    and c.status = 'active'
  limit 1;

  if v_class.id is null then
    raise exception 'Turma ativa nao encontrada.'
      using errcode = '22023';
  end if;

  if v_class.school_year is not null and v_school_year is distinct from v_class.school_year then
    raise exception 'Ano letivo inconsistente com a turma selecionada.'
      using errcode = '22023';
  end if;

  if v_school_year is null then
    v_school_year := coalesce(v_class.school_year, '2026');
  end if;

  if not (
    public.is_platform_admin()
    or exists (
      select 1
      from public.school_memberships sm
      where sm.school_id = v_class.school_id
        and sm.profile_id = auth.uid()
        and sm.status = 'active'
        and sm.membership_role in ('gestor', 'coordenador', 'direcao', 'secretaria', 'admin', 'admin_ti')
        and sm.started_at <= now()
        and (sm.ended_at is null or sm.ended_at > now())
    )
  ) then
    raise exception 'Perfil institucional sem permissao para esta escola.'
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.students s
    where s.school_id = v_class.school_id
      and lower(trim(s.nome)) = lower(trim(p_nome))
      and (
        p_data_nascimento is null
        or s.data_nascimento is null
        or s.data_nascimento = p_data_nascimento
      )
      and coalesce(s.status, 'active') = 'active'
  ) then
    raise exception 'Possivel duplicidade: ja existe aluno ativo semelhante nesta escola.'
      using errcode = '23505';
  end if;

  insert into public.students (
    nome,
    data_nascimento,
    school_id,
    class_id,
    turma,
    status
  )
  values (
    trim(p_nome),
    p_data_nascimento,
    v_class.school_id,
    v_class.id,
    v_class.nome,
    v_status
  )
  returning id into v_student_id;

  insert into public.enrollments (
    student_id,
    class_id,
    school_id,
    school_year,
    status
  )
  values (
    v_student_id,
    v_class.id,
    v_class.school_id,
    v_school_year,
    'active'
  )
  returning id into v_enrollment_id;

  return jsonb_build_object(
    'student_id', v_student_id,
    'enrollment_id', v_enrollment_id,
    'school_id', v_class.school_id,
    'class_id', v_class.id,
    'school_year', v_school_year,
    'status', v_status,
    'created_by', auth.uid(),
    'created_at', now()
  );
end;
$$;


--
-- Name: secretaria_end_teacher_class_membership(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.secretaria_end_teacher_class_membership(p_membership_id uuid, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_membership public.class_teacher_memberships%rowtype;
  v_class public.classes%rowtype;
  v_movement_id uuid;
  v_reason text := nullif(trim(p_reason), '');
begin
  if v_reason is null then
    raise exception 'Motivo do encerramento e obrigatorio.' using errcode = '22023';
  end if;

  select * into v_membership
  from public.class_teacher_memberships
  where id = p_membership_id
  for update;

  if v_membership.id is null then
    raise exception 'Vinculo professor-turma nao encontrado.' using errcode = '22023';
  end if;

  select * into v_class
  from public.classes
  where id = v_membership.class_id
  for update;

  if v_class.id is null then
    raise exception 'Turma do vinculo nao encontrada.' using errcode = '22023';
  end if;

  if not public.secretaria_can_manage_school(v_class.school_id) then
    raise exception 'Perfil institucional sem permissao para encerrar vinculo nesta escola.' using errcode = '42501';
  end if;

  update public.class_teacher_memberships
  set status = 'ended',
      ended_at = coalesce(ended_at, now())
  where id = v_membership.id;

  if v_class.teacher_id = v_membership.teacher_id and not exists (
    select 1
    from public.class_teacher_memberships ctm
    where ctm.class_id = v_class.id
      and ctm.teacher_id <> v_membership.teacher_id
      and ctm.role = 'principal'
      and ctm.status = 'active'
      and ctm.ended_at is null
  ) then
    update public.classes
    set teacher_id = null
    where id = v_class.id;
  end if;

  insert into public.teacher_class_movements (
    school_id,
    teacher_id,
    class_id,
    membership_id,
    movement_type,
    from_status,
    to_status,
    role,
    reason,
    performed_by
  )
  values (
    v_class.school_id,
    v_membership.teacher_id,
    v_class.id,
    v_membership.id,
    'teacher_unlinked',
    v_membership.status,
    'ended',
    v_membership.role,
    v_reason,
    auth.uid()
  )
  returning id into v_movement_id;

  return jsonb_build_object(
    'movement_id', v_movement_id,
    'membership_id', v_membership.id,
    'teacher_id', v_membership.teacher_id,
    'class_id', v_class.id,
    'from_status', v_membership.status,
    'to_status', 'ended',
    'performed_by', auth.uid(),
    'created_at', now()
  );
end;
$$;


--
-- Name: secretaria_link_teacher_to_class(uuid, uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.secretaria_link_teacher_to_class(p_teacher_id uuid, p_class_id uuid, p_role text DEFAULT 'principal'::text, p_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_teacher public.teachers%rowtype;
  v_class public.classes%rowtype;
  v_role text := coalesce(nullif(trim(p_role), ''), 'principal');
  v_reason text := nullif(trim(p_reason), '');
  v_membership_id uuid;
  v_movement_id uuid;
begin
  if v_reason is null then
    raise exception 'Motivo do vinculo e obrigatorio.' using errcode = '22023';
  end if;

  if v_role not in ('principal', 'auxiliar', 'especialista', 'substituto') then
    raise exception 'Papel do professor incompativel com o schema.' using errcode = '22023';
  end if;

  select * into v_teacher from public.teachers where id = p_teacher_id and status = 'active' limit 1;
  select * into v_class from public.classes where id = p_class_id and status = 'active' limit 1;

  if v_teacher.id is null or v_class.id is null then
    raise exception 'Professor ou turma ativa nao encontrados.' using errcode = '22023';
  end if;

  if v_teacher.school_id <> v_class.school_id then
    raise exception 'Professor e turma devem pertencer a mesma escola.' using errcode = '22023';
  end if;

  if not public.secretaria_can_manage_school(v_class.school_id) then
    raise exception 'Perfil institucional sem permissao para vincular professor nesta escola.' using errcode = '42501';
  end if;

  select id into v_membership_id
  from public.class_teacher_memberships
  where class_id = v_class.id
    and teacher_id = v_teacher.id
    and role = v_role
    and status = 'active'
    and ended_at is null
  limit 1;

  if v_membership_id is null then
    insert into public.class_teacher_memberships (
      class_id,
      teacher_id,
      role,
      status,
      started_at
    )
    values (
      v_class.id,
      v_teacher.id,
      v_role,
      'active',
      now()
    )
    returning id into v_membership_id;
  end if;

  if v_role = 'principal' then
    update public.classes
    set teacher_id = v_teacher.id
    where id = v_class.id;
  end if;

  insert into public.teacher_class_movements (
    school_id,
    teacher_id,
    class_id,
    membership_id,
    movement_type,
    to_status,
    role,
    reason,
    performed_by
  )
  values (
    v_class.school_id,
    v_teacher.id,
    v_class.id,
    v_membership_id,
    'teacher_linked',
    'active',
    v_role,
    v_reason,
    auth.uid()
  )
  returning id into v_movement_id;

  return jsonb_build_object(
    'movement_id', v_movement_id,
    'membership_id', v_membership_id,
    'teacher_id', v_teacher.id,
    'class_id', v_class.id,
    'to_status', 'active',
    'performed_by', auth.uid(),
    'created_at', now()
  );
end;
$$;


--
-- Name: attendance_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attendance_record_id uuid NOT NULL,
    school_id uuid NOT NULL,
    class_id uuid NOT NULL,
    student_id uuid NOT NULL,
    enrollment_id uuid NOT NULL,
    attendance_date date NOT NULL,
    event_type text NOT NULL,
    from_status text,
    to_status text,
    notes text,
    actor_id uuid DEFAULT auth.uid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT attendance_events_status_check CHECK ((((from_status IS NULL) OR (from_status = ANY (ARRAY['present'::text, 'absent'::text, 'justified'::text]))) AND ((to_status IS NULL) OR (to_status = ANY (ARRAY['present'::text, 'absent'::text, 'justified'::text]))))),
    CONSTRAINT attendance_events_type_check CHECK ((event_type = ANY (ARRAY['created'::text, 'updated'::text])))
);


--
-- Name: secretaria_list_attendance_events(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.secretaria_list_attendance_events() RETURNS SETOF public.attendance_events
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select ae.*
  from public.attendance_events ae
  where public.secretaria_can_manage_school(ae.school_id)
  order by ae.created_at desc;
$$;


--
-- Name: attendance_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id uuid NOT NULL,
    class_id uuid NOT NULL,
    student_id uuid NOT NULL,
    enrollment_id uuid NOT NULL,
    attendance_date date NOT NULL,
    status text NOT NULL,
    notes text,
    recorded_by uuid DEFAULT auth.uid() NOT NULL,
    updated_by uuid DEFAULT auth.uid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT attendance_records_status_check CHECK ((status = ANY (ARRAY['present'::text, 'absent'::text, 'justified'::text])))
);


--
-- Name: secretaria_list_attendance_records(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.secretaria_list_attendance_records() RETURNS SETOF public.attendance_records
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select ar.*
  from public.attendance_records ar
  where public.secretaria_can_manage_school(ar.school_id)
  order by ar.attendance_date desc, ar.created_at desc;
$$;


--
-- Name: secretaria_list_class_teacher_memberships(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.secretaria_list_class_teacher_memberships() RETURNS TABLE(id uuid, class_id uuid, teacher_id uuid, role text, status text, started_at timestamp with time zone, ended_at timestamp with time zone)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select
    ctm.id,
    ctm.class_id,
    ctm.teacher_id,
    ctm.role,
    ctm.status,
    ctm.started_at,
    ctm.ended_at
  from public.class_teacher_memberships ctm
  join public.classes c
    on c.id = ctm.class_id
  where public.secretaria_can_manage_school(c.school_id)
  order by ctm.started_at asc;
$$;


--
-- Name: secretaria_list_classes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.secretaria_list_classes() RETURNS TABLE(id uuid, school_id uuid, nome character varying, ano_escolar character varying, turno character varying, teacher_id uuid, age_group text, school_year text, status text)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select
    c.id,
    c.school_id,
    c.nome,
    c.ano_escolar,
    c.turno,
    c.teacher_id,
    c.age_group,
    c.school_year,
    c.status
  from public.classes c
  where public.secretaria_can_manage_school(c.school_id)
  order by c.nome asc;
$$;


--
-- Name: communication_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.communication_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    communication_id uuid NOT NULL,
    event_type text NOT NULL,
    from_status text,
    to_status text,
    performed_by uuid DEFAULT auth.uid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT communication_events_status_check CHECK ((((from_status IS NULL) OR (from_status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))) AND ((to_status IS NULL) OR (to_status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))))),
    CONSTRAINT communication_events_type_check CHECK ((event_type = ANY (ARRAY['created'::text, 'published'::text, 'edited'::text, 'archived'::text])))
);


--
-- Name: secretaria_list_communication_events(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.secretaria_list_communication_events() RETURNS SETOF public.communication_events
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select ce.*
  from public.communication_events ce
  join public.communications c on c.id = ce.communication_id
  where public.secretaria_can_manage_school(c.school_id)
  order by ce.created_at desc;
$$;


--
-- Name: secretaria_list_communications(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.secretaria_list_communications() RETURNS SETOF public.communications
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select c.*
  from public.communications c
  where public.secretaria_can_manage_school(c.school_id)
  order by c.communication_date desc, c.created_at desc;
$$;


--
-- Name: document_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id uuid,
    code text NOT NULL,
    name text NOT NULL,
    required boolean DEFAULT true NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT document_types_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])))
);


--
-- Name: secretaria_list_document_types(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.secretaria_list_document_types() RETURNS SETOF public.document_types
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select dt.*
  from public.document_types dt
  where dt.school_id is null
    or public.secretaria_can_manage_school(dt.school_id)
  order by dt.name asc;
$$;


--
-- Name: enrollment_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enrollment_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id uuid NOT NULL,
    student_id uuid NOT NULL,
    enrollment_id uuid NOT NULL,
    movement_type text NOT NULL,
    from_class_id uuid,
    to_class_id uuid,
    from_status text,
    to_status text,
    reason text,
    performed_by uuid DEFAULT auth.uid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT enrollment_movements_status_check CHECK ((((from_status IS NULL) OR (from_status = ANY (ARRAY['active'::text, 'transferred'::text, 'ended'::text, 'cancelled'::text, 'archived'::text]))) AND ((to_status IS NULL) OR (to_status = ANY (ARRAY['active'::text, 'transferred'::text, 'ended'::text, 'cancelled'::text, 'archived'::text]))))),
    CONSTRAINT enrollment_movements_type_check CHECK ((movement_type = ANY (ARRAY['enrollment_created'::text, 'class_transfer'::text, 'status_change'::text, 'enrollment_closed'::text, 'reenrollment'::text])))
);


--
-- Name: TABLE enrollment_movements; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.enrollment_movements IS 'Historico auditavel de movimentacoes de matricula da Secretaria V1.';


--
-- Name: COLUMN enrollment_movements.performed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.enrollment_movements.performed_by IS 'UUID de auth.uid() do usuario institucional que executou a movimentacao.';


--
-- Name: secretaria_list_enrollment_movements(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.secretaria_list_enrollment_movements() RETURNS SETOF public.enrollment_movements
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select em.*
  from public.enrollment_movements em
  where public.secretaria_can_manage_school(em.school_id)
  order by em.created_at asc;
$$;


--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    class_id uuid NOT NULL,
    school_id uuid NOT NULL,
    school_year text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    enrolled_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT enrollments_dates_check CHECK (((ended_at IS NULL) OR (ended_at >= enrolled_at))),
    CONSTRAINT enrollments_status_check CHECK ((status = ANY (ARRAY['active'::text, 'transferred'::text, 'ended'::text, 'cancelled'::text, 'archived'::text])))
);


--
-- Name: secretaria_list_enrollments(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.secretaria_list_enrollments() RETURNS SETOF public.enrollments
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select e.*
  from public.enrollments e
  where public.secretaria_can_manage_school(e.school_id)
  order by e.school_year desc nulls last, e.enrolled_at desc nulls last, e.created_at desc;
$$;


--
-- Name: secretaria_list_staff_profiles(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.secretaria_list_staff_profiles() RETURNS TABLE(id uuid, display_name text, platform_role text, status text)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select distinct
    p.id,
    p.display_name,
    p.platform_role,
    p.status
  from public.profiles p
  where p.id = auth.uid()
     or exists (
       select 1
       from public.teachers t
       where t.profile_id = p.id
         and public.secretaria_can_manage_school(t.school_id)
     )
     or exists (
       select 1
       from public.school_memberships sm
       where sm.profile_id = p.id
         and public.secretaria_can_manage_school(sm.school_id)
     )
  order by p.display_name asc;
$$;


--
-- Name: student_document_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_document_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id uuid NOT NULL,
    student_document_id uuid NOT NULL,
    student_id uuid NOT NULL,
    document_type_id uuid NOT NULL,
    event_type text NOT NULL,
    from_status text,
    to_status text,
    notes text,
    file_reference text,
    actor_id uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT student_document_events_status_check CHECK ((((from_status IS NULL) OR (from_status = ANY (ARRAY['pending'::text, 'received'::text, 'waived'::text]))) AND ((to_status IS NULL) OR (to_status = ANY (ARRAY['pending'::text, 'received'::text, 'waived'::text]))))),
    CONSTRAINT student_document_events_type_check CHECK ((event_type = ANY (ARRAY['created'::text, 'status_changed'::text, 'file_referenced'::text, 'seeded'::text])))
);


--
-- Name: secretaria_list_student_document_events(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.secretaria_list_student_document_events() RETURNS SETOF public.student_document_events
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select sde.*
  from public.student_document_events sde
  where public.secretaria_can_manage_school(sde.school_id)
  order by sde.created_at desc;
$$;


--
-- Name: student_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id uuid NOT NULL,
    student_id uuid NOT NULL,
    document_type_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    file_reference text,
    received_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT student_documents_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'received'::text, 'waived'::text])))
);


--
-- Name: secretaria_list_student_documents(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.secretaria_list_student_documents() RETURNS SETOF public.student_documents
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select sd.*
  from public.student_documents sd
  where public.secretaria_can_manage_school(sd.school_id)
  order by sd.updated_at desc;
$$;


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    school_id uuid,
    class_id uuid,
    matricula character varying(50),
    data_nascimento date,
    responsavel character varying(255),
    telefone_responsavel character varying(50),
    created_at timestamp without time zone DEFAULT now(),
    nome character varying,
    email character varying,
    status character varying,
    foto_url text,
    media_geral numeric,
    frequencia numeric,
    xp_total bigint DEFAULT '0'::bigint,
    nivel bigint DEFAULT '1'::bigint,
    turma text,
    aulas_presentes bigint,
    total_aulas bigint,
    media_geral_percent numeric,
    frequencia_percent numeric,
    media_percent numeric,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: secretaria_list_students(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.secretaria_list_students() RETURNS SETOF public.students
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select s.*
  from public.students s
  where public.secretaria_can_manage_school(s.school_id)
  order by s.nome asc;
$$;


--
-- Name: secretaria_list_teachers(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.secretaria_list_teachers() RETURNS TABLE(id uuid, user_id uuid, school_id uuid, profile_id uuid, disciplina character varying, status text)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select
    t.id,
    t.user_id,
    t.school_id,
    t.profile_id,
    t.disciplina,
    t.status
  from public.teachers t
  where public.secretaria_can_manage_school(t.school_id)
  order by t.created_at asc;
$$;


--
-- Name: secretaria_reenroll_student(uuid, uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.secretaria_reenroll_student(p_student_id uuid, p_class_id uuid, p_school_year text, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_student public.students%rowtype;
  v_class public.classes%rowtype;
  v_school_year text := nullif(trim(p_school_year), '');
  v_reason text := nullif(trim(p_reason), '');
  v_enrollment_id uuid;
  v_movement_id uuid;
begin
  if v_school_year is null then
    raise exception 'Ano letivo da rematricula e obrigatorio.' using errcode = '22023';
  end if;

  if v_reason is null then
    raise exception 'Motivo da rematricula e obrigatorio.' using errcode = '22023';
  end if;

  select * into v_student
  from public.students
  where id = p_student_id
  for update;

  if v_student.id is null then
    raise exception 'Aluno nao encontrado.' using errcode = '22023';
  end if;

  select * into v_class
  from public.classes
  where id = p_class_id
    and status = 'active'
  limit 1;

  if v_class.id is null then
    raise exception 'Turma ativa nao encontrada.' using errcode = '22023';
  end if;

  if coalesce(v_class.school_year, v_school_year) <> v_school_year then
    raise exception 'Ano letivo inconsistente com a turma selecionada.' using errcode = '22023';
  end if;

  if not public.secretaria_can_manage_school(v_class.school_id) then
    raise exception 'Perfil institucional sem permissao para rematricular nesta escola.' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.enrollments e
    where e.student_id = v_student.id
      and e.school_year = v_school_year
      and e.status = 'active'
      and e.ended_at is null
  ) then
    raise exception 'Aluno ja possui matricula ativa neste ano letivo.' using errcode = '23505';
  end if;

  insert into public.enrollments (
    student_id,
    class_id,
    school_id,
    school_year,
    status
  )
  values (
    v_student.id,
    v_class.id,
    v_class.school_id,
    v_school_year,
    'active'
  )
  returning id into v_enrollment_id;

  update public.students
  set class_id = v_class.id,
      school_id = v_class.school_id,
      turma = v_class.nome,
      status = coalesce(nullif(status, ''), 'active')
  where id = v_student.id;

  insert into public.enrollment_movements (
    school_id,
    student_id,
    enrollment_id,
    movement_type,
    to_class_id,
    to_status,
    reason,
    performed_by
  )
  values (
    v_class.school_id,
    v_student.id,
    v_enrollment_id,
    'reenrollment',
    v_class.id,
    'active',
    v_reason,
    auth.uid()
  )
  returning id into v_movement_id;

  return jsonb_build_object(
    'movement_id', v_movement_id,
    'enrollment_id', v_enrollment_id,
    'student_id', v_student.id,
    'to_class_id', v_class.id,
    'to_status', 'active',
    'performed_by', auth.uid(),
    'created_at', now()
  );
end;
$$;


--
-- Name: secretaria_set_student_document_status(uuid, uuid, text, text, text, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.secretaria_set_student_document_status(p_student_id uuid, p_document_type_id uuid, p_status text, p_notes text DEFAULT NULL::text, p_file_reference text DEFAULT NULL::text, p_received_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_student public.students%rowtype;
  v_document_type public.document_types%rowtype;
  v_document public.student_documents%rowtype;
  v_document_id uuid;
  v_previous_status text;
  v_status text := lower(nullif(trim(p_status), ''));
  v_event_type text;
begin
  if v_status not in ('pending', 'received', 'waived') then
    raise exception 'Status documental invalido.' using errcode = '22023';
  end if;

  select * into v_student
  from public.students
  where id = p_student_id
  limit 1;

  if v_student.id is null then
    raise exception 'Aluno nao encontrado.' using errcode = '22023';
  end if;

  if not public.secretaria_can_manage_school(v_student.school_id) then
    raise exception 'Perfil institucional sem permissao para documentos desta escola.' using errcode = '42501';
  end if;

  select * into v_document_type
  from public.document_types
  where id = p_document_type_id
    and status = 'active'
    and (school_id is null or school_id = v_student.school_id)
  limit 1;

  if v_document_type.id is null then
    raise exception 'Tipo de documento ativo nao encontrado para a escola.' using errcode = '22023';
  end if;

  select * into v_document
  from public.student_documents
  where student_id = p_student_id
    and document_type_id = p_document_type_id
  for update;

  if v_document.id is null then
    v_previous_status := null;
    insert into public.student_documents (
      school_id,
      student_id,
      document_type_id,
      status,
      notes,
      file_reference,
      received_at,
      expires_at,
      created_by,
      updated_by
    )
    values (
      v_student.school_id,
      p_student_id,
      p_document_type_id,
      v_status,
      nullif(trim(p_notes), ''),
      nullif(trim(p_file_reference), ''),
      case when v_status = 'received' then coalesce(p_received_at, now()) else p_received_at end,
      p_expires_at,
      auth.uid(),
      auth.uid()
    )
    returning * into v_document;
    v_event_type := 'created';
  else
    v_previous_status := v_document.status;
    update public.student_documents
      set status = v_status,
        notes = nullif(trim(p_notes), ''),
        file_reference = coalesce(nullif(trim(p_file_reference), ''), file_reference),
        received_at = case
          when v_status = 'received' then coalesce(p_received_at, received_at, now())
          else null
        end,
        expires_at = p_expires_at,
        updated_by = auth.uid(),
        updated_at = now()
    where id = v_document.id
    returning * into v_document;
    v_event_type := case
      when nullif(trim(p_file_reference), '') is not null then 'file_referenced'
      else 'status_changed'
    end;
  end if;

  v_document_id := v_document.id;

  insert into public.student_document_events (
    school_id,
    student_document_id,
    student_id,
    document_type_id,
    event_type,
    from_status,
    to_status,
    notes,
    file_reference,
    actor_id
  )
  values (
    v_student.school_id,
    v_document_id,
    p_student_id,
    p_document_type_id,
    v_event_type,
    v_previous_status,
    v_status,
    nullif(trim(p_notes), ''),
    nullif(trim(p_file_reference), ''),
    auth.uid()
  );

  return jsonb_build_object(
    'document_id', v_document_id,
    'student_id', p_student_id,
    'document_type_id', p_document_type_id,
    'status', v_status,
    'updated_by', auth.uid(),
    'updated_at', now()
  );
end;
$$;


--
-- Name: secretaria_transfer_enrollment(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.secretaria_transfer_enrollment(p_enrollment_id uuid, p_to_class_id uuid, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_enrollment public.enrollments%rowtype;
  v_to_class public.classes%rowtype;
  v_movement_id uuid;
  v_reason text := nullif(trim(p_reason), '');
begin
  if v_reason is null then
    raise exception 'Motivo da transferencia e obrigatorio.' using errcode = '22023';
  end if;

  select * into v_enrollment
  from public.enrollments
  where id = p_enrollment_id
  for update;

  if v_enrollment.id is null then
    raise exception 'Matricula nao encontrada.' using errcode = '22023';
  end if;

  if v_enrollment.status <> 'active' or v_enrollment.ended_at is not null then
    raise exception 'Somente matricula ativa pode ser transferida.' using errcode = '22023';
  end if;

  if not public.secretaria_can_manage_school(v_enrollment.school_id) then
    raise exception 'Perfil institucional sem permissao para movimentar esta matricula.' using errcode = '42501';
  end if;

  select * into v_to_class
  from public.classes
  where id = p_to_class_id
    and status = 'active'
  limit 1;

  if v_to_class.id is null then
    raise exception 'Turma ativa de destino nao encontrada.' using errcode = '22023';
  end if;

  if v_to_class.school_id <> v_enrollment.school_id then
    raise exception 'Transferencia entre escolas nao esta autorizada nesta etapa.' using errcode = '22023';
  end if;

  if coalesce(v_to_class.school_year, v_enrollment.school_year) <> v_enrollment.school_year then
    raise exception 'Transferencia deve permanecer no mesmo ano letivo.' using errcode = '22023';
  end if;

  if v_to_class.id = v_enrollment.class_id then
    raise exception 'A turma de destino deve ser diferente da turma atual.' using errcode = '22023';
  end if;

  update public.enrollments
  set class_id = v_to_class.id,
      school_id = v_to_class.school_id,
      status = 'active',
      ended_at = null
  where id = v_enrollment.id;

  update public.students
  set class_id = v_to_class.id,
      school_id = v_to_class.school_id,
      turma = v_to_class.nome
  where id = v_enrollment.student_id;

  insert into public.enrollment_movements (
    school_id,
    student_id,
    enrollment_id,
    movement_type,
    from_class_id,
    to_class_id,
    from_status,
    to_status,
    reason,
    performed_by
  )
  values (
    v_enrollment.school_id,
    v_enrollment.student_id,
    v_enrollment.id,
    'class_transfer',
    v_enrollment.class_id,
    v_to_class.id,
    v_enrollment.status,
    'active',
    v_reason,
    auth.uid()
  )
  returning id into v_movement_id;

  return jsonb_build_object(
    'movement_id', v_movement_id,
    'enrollment_id', v_enrollment.id,
    'student_id', v_enrollment.student_id,
    'from_class_id', v_enrollment.class_id,
    'to_class_id', v_to_class.id,
    'from_status', v_enrollment.status,
    'to_status', 'active',
    'performed_by', auth.uid(),
    'created_at', now()
  );
end;
$$;


--
-- Name: secretaria_update_class_basic(uuid, text, text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.secretaria_update_class_basic(p_class_id uuid, p_nome text, p_status text, p_age_group text DEFAULT NULL::text, p_turno text DEFAULT NULL::text, p_ano_escolar text DEFAULT NULL::text, p_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_class public.classes%rowtype;
  v_status text := coalesce(nullif(trim(p_status), ''), 'active');
  v_nome text := nullif(trim(p_nome), '');
begin
  select * into v_class
  from public.classes
  where id = p_class_id
  for update;

  if v_class.id is null then
    raise exception 'Turma nao encontrada.' using errcode = '22023';
  end if;

  if not public.secretaria_can_manage_school(v_class.school_id) then
    raise exception 'Perfil institucional sem permissao para editar esta turma.' using errcode = '42501';
  end if;

  if v_nome is null then
    raise exception 'Nome da turma e obrigatorio.' using errcode = '22023';
  end if;

  if v_status not in ('active', 'inactive', 'archived') then
    raise exception 'Status de turma incompativel com o schema.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.classes c
    where c.id <> v_class.id
      and c.school_id = v_class.school_id
      and lower(trim(c.nome)) = lower(v_nome)
      and coalesce(c.school_year, '') = coalesce(v_class.school_year, '')
      and c.status <> 'archived'
  ) then
    raise exception 'Turma semelhante ja existe nesta escola e ano letivo.' using errcode = '23505';
  end if;

  if v_status <> 'active' and exists (
    select 1
    from public.enrollments e
    where e.class_id = v_class.id
      and e.status = 'active'
      and e.ended_at is null
  ) then
    raise exception 'Nao e permitido inativar turma com matriculas ativas.' using errcode = '22023';
  end if;

  update public.classes
  set nome = v_nome,
      status = v_status,
      age_group = nullif(trim(p_age_group), ''),
      turno = nullif(trim(p_turno), ''),
      ano_escolar = nullif(trim(p_ano_escolar), '')
  where id = v_class.id;

  return jsonb_build_object(
    'class_id', v_class.id,
    'from_status', v_class.status,
    'to_status', v_status,
    'performed_by', auth.uid(),
    'updated_at', now()
  );
end;
$$;


--
-- Name: secretaria_update_enrollment_status(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.secretaria_update_enrollment_status(p_enrollment_id uuid, p_to_status text, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_enrollment public.enrollments%rowtype;
  v_to_status text := nullif(trim(p_to_status), '');
  v_reason text := nullif(trim(p_reason), '');
  v_movement_id uuid;
begin
  if v_to_status is null or not (v_to_status = any (array['active'::text, 'transferred'::text, 'ended'::text, 'cancelled'::text, 'archived'::text])) then
    raise exception 'Status de matricula incompativel com o schema.' using errcode = '22023';
  end if;

  if v_reason is null then
    raise exception 'Motivo da alteracao de status e obrigatorio.' using errcode = '22023';
  end if;

  select * into v_enrollment
  from public.enrollments
  where id = p_enrollment_id
  for update;

  if v_enrollment.id is null then
    raise exception 'Matricula nao encontrada.' using errcode = '22023';
  end if;

  if not public.secretaria_can_manage_school(v_enrollment.school_id) then
    raise exception 'Perfil institucional sem permissao para movimentar esta matricula.' using errcode = '42501';
  end if;

  update public.enrollments
  set status = v_to_status,
      ended_at = case when v_to_status = 'active' then null else ended_at end
  where id = v_enrollment.id;

  insert into public.enrollment_movements (
    school_id,
    student_id,
    enrollment_id,
    movement_type,
    from_class_id,
    to_class_id,
    from_status,
    to_status,
    reason,
    performed_by
  )
  values (
    v_enrollment.school_id,
    v_enrollment.student_id,
    v_enrollment.id,
    'status_change',
    v_enrollment.class_id,
    v_enrollment.class_id,
    v_enrollment.status,
    v_to_status,
    v_reason,
    auth.uid()
  )
  returning id into v_movement_id;

  return jsonb_build_object(
    'movement_id', v_movement_id,
    'enrollment_id', v_enrollment.id,
    'student_id', v_enrollment.student_id,
    'from_status', v_enrollment.status,
    'to_status', v_to_status,
    'performed_by', auth.uid(),
    'created_at', now()
  );
end;
$$;


--
-- Name: teacher_set_attendance_records(uuid, date, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.teacher_set_attendance_records(p_class_id uuid, p_attendance_date date, p_records jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_class public.classes%rowtype;
  v_item jsonb;
  v_student_id uuid;
  v_status text;
  v_notes text;
  v_enrollment public.enrollments%rowtype;
  v_record public.attendance_records%rowtype;
  v_previous_status text;
  v_saved integer := 0;
begin
  if p_attendance_date is null then
    raise exception 'Data da chamada e obrigatoria.' using errcode = '22023';
  end if;

  if p_attendance_date > current_date then
    raise exception 'Nao e permitido registrar frequencia futura.' using errcode = '22023';
  end if;

  if jsonb_typeof(p_records) <> 'array' then
    raise exception 'Registros de frequencia devem ser enviados como array.' using errcode = '22023';
  end if;

  select * into v_class
  from public.classes
  where id = p_class_id
    and status = 'active'
  limit 1;

  if v_class.id is null then
    raise exception 'Turma ativa nao encontrada.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.class_teacher_memberships ctm
    join public.teachers t on t.id = ctm.teacher_id
    where ctm.class_id = v_class.id
      and ctm.status = 'active'
      and ctm.started_at <= now()
      and (ctm.ended_at is null or ctm.ended_at > now())
      and t.profile_id = auth.uid()
  ) then
    raise exception 'Professor sem vinculo ativo com esta turma.' using errcode = '42501';
  end if;

  for v_item in select * from jsonb_array_elements(p_records)
  loop
    v_student_id := nullif(v_item ->> 'student_id', '')::uuid;
    v_status := lower(nullif(trim(v_item ->> 'status'), ''));
    v_notes := nullif(trim(coalesce(v_item ->> 'notes', '')), '');

    if v_student_id is null then
      raise exception 'student_id ausente em registro de frequencia.' using errcode = '22023';
    end if;

    if v_status not in ('present', 'absent', 'justified') then
      raise exception 'Status de frequencia invalido para aluno %.', v_student_id using errcode = '22023';
    end if;

    select * into v_enrollment
    from public.enrollments e
    where e.student_id = v_student_id
      and e.class_id = v_class.id
      and e.school_id = v_class.school_id
      and e.status = 'active'
      and (e.enrolled_at is null or e.enrolled_at::date <= p_attendance_date)
      and (e.ended_at is null or e.ended_at::date >= p_attendance_date)
    order by e.enrolled_at desc nulls last, e.created_at desc
    limit 1;

    if v_enrollment.id is null then
      raise exception 'Aluno % nao possui matricula ativa nesta turma/data.', v_student_id using errcode = '42501';
    end if;

    select * into v_record
    from public.attendance_records ar
    where ar.student_id = v_student_id
      and ar.class_id = v_class.id
      and ar.attendance_date = p_attendance_date
    for update;

    if v_record.id is null then
      insert into public.attendance_records (
        school_id,
        class_id,
        student_id,
        enrollment_id,
        attendance_date,
        status,
        notes,
        recorded_by,
        updated_by
      )
      values (
        v_class.school_id,
        v_class.id,
        v_student_id,
        v_enrollment.id,
        p_attendance_date,
        v_status,
        v_notes,
        auth.uid(),
        auth.uid()
      )
      returning * into v_record;

      insert into public.attendance_events (
        attendance_record_id,
        school_id,
        class_id,
        student_id,
        enrollment_id,
        attendance_date,
        event_type,
        from_status,
        to_status,
        notes,
        actor_id
      )
      values (
        v_record.id,
        v_record.school_id,
        v_record.class_id,
        v_record.student_id,
        v_record.enrollment_id,
        v_record.attendance_date,
        'created',
        null,
        v_record.status,
        v_record.notes,
        auth.uid()
      );
    else
      v_previous_status := v_record.status;
      if v_record.status is distinct from v_status or coalesce(v_record.notes, '') is distinct from coalesce(v_notes, '') then
        update public.attendance_records
        set enrollment_id = v_enrollment.id,
          status = v_status,
          notes = v_notes,
          updated_by = auth.uid(),
          updated_at = now()
        where id = v_record.id
        returning * into v_record;

        insert into public.attendance_events (
          attendance_record_id,
          school_id,
          class_id,
          student_id,
          enrollment_id,
          attendance_date,
          event_type,
          from_status,
          to_status,
          notes,
          actor_id
        )
        values (
          v_record.id,
          v_record.school_id,
          v_record.class_id,
          v_record.student_id,
          v_record.enrollment_id,
          v_record.attendance_date,
          'updated',
          v_previous_status,
          v_record.status,
          v_record.notes,
          auth.uid()
        );
      end if;
    end if;

    v_saved := v_saved + 1;
  end loop;

  return jsonb_build_object(
    'class_id', p_class_id,
    'attendance_date', p_attendance_date,
    'saved', v_saved,
    'updated_by', auth.uid(),
    'updated_at', now()
  );
end;
$$;


--
-- Name: activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titulo character varying(255) NOT NULL,
    descricao text,
    ano_escolar character varying(20),
    unit_id uuid,
    xp integer DEFAULT 10,
    ativa boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: activity_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    activity_id uuid,
    student_id uuid,
    resposta text,
    nota numeric(5,2),
    corrigida boolean DEFAULT false,
    feedback text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: activity_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid,
    activity_id uuid,
    iniciado_em timestamp with time zone,
    concluido_em timestamp with time zone,
    status text DEFAULT 'pendente'::text
);


--
-- Name: assessment_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_id uuid NOT NULL,
    section_id uuid,
    question_id uuid NOT NULL,
    "position" integer NOT NULL,
    points numeric(8,2) DEFAULT 1 NOT NULL,
    version_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: assessment_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_id uuid NOT NULL,
    title text NOT NULL,
    instructions text,
    "position" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    owner_user_id uuid,
    owner_role text DEFAULT 'professor'::text NOT NULL,
    class_id uuid,
    class_name text,
    status public.assessment_status DEFAULT 'RASCUNHO'::public.assessment_status NOT NULL,
    cover_template text,
    instructions text,
    application_date date,
    total_points numeric(8,2) DEFAULT 0 NOT NULL,
    digital_application_enabled boolean DEFAULT false NOT NULL,
    pdf_generation_ready boolean DEFAULT false NOT NULL,
    answer_key_ready boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    component text,
    school_year text,
    archived_at timestamp with time zone,
    duplicated_from_id uuid
);


--
-- Name: book_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.book_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid,
    book_id uuid,
    current_page integer DEFAULT 1,
    percent_complete integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: books; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.books (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titulo character varying(255) NOT NULL,
    ano_escolar character varying(20),
    capa_url text,
    pdf_url text,
    descricao text,
    ativo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: class_calendar_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_calendar_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    class_id uuid NOT NULL,
    school_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    plan_id uuid,
    entry_date date NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    title text NOT NULL,
    description text,
    entry_type text DEFAULT 'outro'::text NOT NULL,
    status text DEFAULT 'published'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT class_calendar_entries_status_check CHECK ((status = ANY (ARRAY['published'::text, 'cancelled'::text, 'archived'::text]))),
    CONSTRAINT class_calendar_entries_time_check CHECK (((end_time IS NULL) OR (start_time IS NULL) OR (end_time > start_time))),
    CONSTRAINT class_calendar_entries_title_not_blank CHECK ((length(btrim(title)) > 0)),
    CONSTRAINT class_calendar_entries_type_check CHECK ((entry_type = ANY (ARRAY['atividade'::text, 'aula'::text, 'lembrete'::text, 'livro'::text, 'experiencia'::text, 'atividade_online'::text, 'outro'::text])))
);


--
-- Name: TABLE class_calendar_entries; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.class_calendar_entries IS 'Entradas publicadas na agenda da turma. Visiveis a alunos/familias somente quando houver policy institucional apropriada.';


--
-- Name: COLUMN class_calendar_entries.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.class_calendar_entries.description IS 'Descricao publica da publicacao. Nao copiar teacher_plans.teacher_notes automaticamente.';


--
-- Name: class_teacher_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_teacher_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    class_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    role text DEFAULT 'principal'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT class_teacher_memberships_dates_check CHECK (((ended_at IS NULL) OR (ended_at >= started_at))),
    CONSTRAINT class_teacher_memberships_role_check CHECK ((role = ANY (ARRAY['principal'::text, 'auxiliar'::text, 'especialista'::text, 'substituto'::text]))),
    CONSTRAINT class_teacher_memberships_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'ended'::text, 'archived'::text])))
);


--
-- Name: classes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.classes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id uuid,
    nome character varying(100),
    ano_escolar character varying(20),
    turno character varying(20),
    created_at timestamp without time zone DEFAULT now(),
    teacher_id uuid,
    age_group text,
    school_year text,
    status text DEFAULT 'active'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT classes_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])))
);


--
-- Name: contents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    book_id uuid,
    unit_id uuid,
    page_id uuid,
    titulo character varying(255),
    tipo character varying(50),
    url_arquivo text,
    descricao text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: guardians; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guardians (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id uuid NOT NULL,
    profile_id uuid,
    full_name text NOT NULL,
    email text,
    phone text,
    status text DEFAULT 'active'::text NOT NULL,
    access_status text DEFAULT 'not_configured'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT guardians_access_status_check CHECK ((access_status = ANY (ARRAY['not_configured'::text, 'active'::text, 'blocked'::text]))),
    CONSTRAINT guardians_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])))
);


--
-- Name: TABLE guardians; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.guardians IS 'Responsaveis institucionais da Secretaria. profile_id e opcional e so existe quando houver acesso digital.';


--
-- Name: licenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.licenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente character varying(255),
    data_inicio date,
    data_fim date,
    limite_alunos integer,
    status character varying(50),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: medals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(255) NOT NULL,
    descricao text,
    pontos_bonus integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_user_id uuid,
    receiver_user_id uuid,
    assunto text,
    mensagem text,
    lida boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    titulo character varying(255),
    mensagem text,
    lida boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    book_id uuid,
    unit_id uuid,
    numero_pagina integer,
    imagem_url text,
    texto text,
    qr_code text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    display_name text,
    platform_role text DEFAULT 'user'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT profiles_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'pending'::text, 'blocked'::text, 'archived'::text])))
);


--
-- Name: TABLE profiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.profiles IS 'Perfil persistente da aplicacao. A autorizacao continua usando app_metadata.platform_role.';


--
-- Name: COLUMN profiles.platform_role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.platform_role IS 'Representacao persistente; nao substitui app_metadata.platform_role automaticamente.';


--
-- Name: question_alternatives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_alternatives (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    label text NOT NULL,
    body text NOT NULL,
    is_correct boolean DEFAULT false NOT NULL,
    "position" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: question_curation_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_curation_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    actor_user_id uuid,
    actor_role text,
    previous_status public.question_curation_status,
    new_status public.question_curation_status NOT NULL,
    legal_classification public.question_legal_classification,
    comment text NOT NULL,
    snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: question_distractor_analyses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_distractor_analyses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alternative_id uuid NOT NULL,
    analysis text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: question_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    internal_title text NOT NULL,
    component text NOT NULL,
    stage text NOT NULL,
    school_year text NOT NULL,
    thematic_unit text,
    knowledge_object text,
    bncc_skill text,
    reference_matrix text,
    proficiency_level text,
    difficulty text,
    cognitive_process text,
    question_type text NOT NULL,
    statement text NOT NULL,
    base_text text,
    correct_answer text,
    justification text,
    success_feedback text,
    error_feedback text,
    recommended_intervention text,
    estimated_minutes integer,
    accessibility_notes text,
    source_id uuid NOT NULL,
    author_name text NOT NULL,
    license_id uuid NOT NULL,
    legal_classification public.question_legal_classification NOT NULL,
    curation_status public.question_curation_status DEFAULT 'RASCUNHO'::public.question_curation_status NOT NULL,
    publication_status public.question_publication_status DEFAULT 'NAO_PUBLICADO'::public.question_publication_status NOT NULL,
    version text DEFAULT '1.0'::text NOT NULL,
    reviewer_user_id uuid,
    reviewer_name text,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_reviewed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    published_at timestamp with time zone,
    CONSTRAINT question_items_check CHECK (((publication_status <> 'PUBLICADO'::public.question_publication_status) OR (curation_status = ANY (ARRAY['APROVADO'::public.question_curation_status, 'PUBLICADO'::public.question_curation_status, 'HOMOLOGADO'::public.question_curation_status])))),
    CONSTRAINT question_items_check1 CHECK (((legal_classification <> 'ITEM_BLOQUEADO_PUBLICACAO'::public.question_legal_classification) OR (publication_status <> 'PUBLICADO'::public.question_publication_status))),
    CONSTRAINT question_items_estimated_minutes_check CHECK (((estimated_minutes IS NULL) OR (estimated_minutes > 0)))
);


--
-- Name: question_licenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_licenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    license_type text NOT NULL,
    license_url text,
    allows_adaptation boolean DEFAULT false NOT NULL,
    allows_commercial_use boolean DEFAULT false NOT NULL,
    requires_attribution boolean DEFAULT true NOT NULL,
    publication_allowed boolean DEFAULT false NOT NULL,
    legal_notes text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: question_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    media_type text NOT NULL,
    url text,
    alt_text text,
    transcript text,
    license_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT question_media_media_type_check CHECK ((media_type = ANY (ARRAY['imagem'::text, 'audio'::text, 'video'::text, 'grafico'::text, 'tabela'::text, 'interativo'::text, 'arquivo'::text])))
);


--
-- Name: question_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    source_type text NOT NULL,
    institution_name text,
    official_url text,
    author_name text,
    license_id uuid NOT NULL,
    legal_status text NOT NULL,
    curation_status public.question_curation_status DEFAULT 'LICENCA_EM_ANALISE'::public.question_curation_status NOT NULL,
    source_checked_at timestamp with time zone,
    responsible_user_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT question_sources_official_url_check CHECK (((official_url IS NULL) OR (official_url ~* '^https://'::text)))
);


--
-- Name: question_usage_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_usage_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    assessment_id uuid,
    user_id uuid,
    user_role text,
    class_id uuid,
    class_name text,
    usage_type text NOT NULL,
    used_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tipo character varying(100),
    referencia_id uuid,
    dados jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: school_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.school_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    membership_role text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT school_memberships_dates_check CHECK (((ended_at IS NULL) OR (ended_at >= started_at))),
    CONSTRAINT school_memberships_role_check CHECK ((membership_role = ANY (ARRAY['professor'::text, 'gestor'::text, 'coordenador'::text, 'direcao'::text, 'secretaria'::text, 'admin'::text, 'admin_ti'::text]))),
    CONSTRAINT school_memberships_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'ended'::text, 'archived'::text])))
);


--
-- Name: schools; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schools (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(255) NOT NULL,
    codigo_inep character varying(50),
    municipio character varying(255),
    estado character varying(100),
    diretor character varying(255),
    created_at timestamp without time zone DEFAULT now(),
    status text DEFAULT 'active'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT schools_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])))
);


--
-- Name: student_grades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_grades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    disciplina character varying(100) NOT NULL,
    nota numeric(4,2) NOT NULL,
    bimestre integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT now(),
    percentual numeric
);


--
-- Name: student_guardian_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_guardian_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    guardian_id uuid NOT NULL,
    relationship text DEFAULT 'responsavel'::text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT student_guardian_links_relationship_check CHECK ((relationship = ANY (ARRAY['responsavel'::text, 'mae'::text, 'pai'::text, 'avo'::text, 'tutor'::text, 'outro'::text]))),
    CONSTRAINT student_guardian_links_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])))
);


--
-- Name: TABLE student_guardian_links; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.student_guardian_links IS 'Vinculo institucional aluno-responsavel, independente de login Auth.';


--
-- Name: student_guardians; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_guardians (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    relationship text DEFAULT 'responsavel'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT student_guardians_relationship_check CHECK ((relationship = ANY (ARRAY['responsavel'::text, 'mae'::text, 'pai'::text, 'avo'::text, 'tutor'::text, 'outro'::text]))),
    CONSTRAINT student_guardians_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])))
);


--
-- Name: TABLE student_guardians; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.student_guardians IS 'Vinculo institucional entre profile Auth de familia/responsavel e aluno. Nao armazena credenciais.';


--
-- Name: COLUMN student_guardians.student_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_guardians.student_id IS 'Aluno institucional autorizado para o responsavel.';


--
-- Name: COLUMN student_guardians.profile_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_guardians.profile_id IS 'Referencia public.profiles(id), que por sua vez referencia auth.users(id).';


--
-- Name: student_medals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_medals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid,
    medal_id uuid,
    data_conquista timestamp without time zone DEFAULT now()
);


--
-- Name: teacher_class_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teacher_class_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    class_id uuid NOT NULL,
    membership_id uuid,
    movement_type text NOT NULL,
    from_status text,
    to_status text,
    role text,
    reason text,
    performed_by uuid DEFAULT auth.uid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT teacher_class_movements_role_check CHECK (((role IS NULL) OR (role = ANY (ARRAY['principal'::text, 'auxiliar'::text, 'especialista'::text, 'substituto'::text])))),
    CONSTRAINT teacher_class_movements_status_check CHECK ((((from_status IS NULL) OR (from_status = ANY (ARRAY['active'::text, 'inactive'::text, 'ended'::text, 'archived'::text]))) AND ((to_status IS NULL) OR (to_status = ANY (ARRAY['active'::text, 'inactive'::text, 'ended'::text, 'archived'::text]))))),
    CONSTRAINT teacher_class_movements_type_check CHECK ((movement_type = ANY (ARRAY['class_created'::text, 'class_updated'::text, 'teacher_linked'::text, 'teacher_unlinked'::text])))
);


--
-- Name: TABLE teacher_class_movements; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.teacher_class_movements IS 'Historico auditavel dos vinculos professor-turma operados pela Secretaria V1.';


--
-- Name: teacher_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teacher_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id uuid NOT NULL,
    class_id uuid NOT NULL,
    school_id uuid NOT NULL,
    plan_date date NOT NULL,
    weekday text NOT NULL,
    title text NOT NULL,
    resource_type text DEFAULT 'outro'::text NOT NULL,
    resource_reference jsonb DEFAULT '{}'::jsonb NOT NULL,
    teacher_notes text,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT teacher_plans_resource_type_check CHECK ((resource_type = ANY (ARRAY['atividade'::text, 'aula'::text, 'lembrete'::text, 'livro'::text, 'experiencia'::text, 'atividade_online'::text, 'proposta_livre'::text, 'outro'::text]))),
    CONSTRAINT teacher_plans_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))),
    CONSTRAINT teacher_plans_title_not_blank CHECK ((length(btrim(title)) > 0)),
    CONSTRAINT teacher_plans_weekday_check CHECK ((weekday = ANY (ARRAY['segunda'::text, 'terca'::text, 'quarta'::text, 'quinta'::text, 'sexta'::text, 'sabado'::text, 'domingo'::text])))
);


--
-- Name: TABLE teacher_plans; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.teacher_plans IS 'Propostas privadas do planejamento do professor. Planejar nao publica automaticamente para alunos/familias.';


--
-- Name: COLUMN teacher_plans.resource_reference; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teacher_plans.resource_reference IS 'Referencia tecnica opcional para livro, pagina, experiencia ou atividade futura.';


--
-- Name: COLUMN teacher_plans.teacher_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teacher_plans.teacher_notes IS 'Observacoes internas da professora. Nunca devem ser usadas como texto publico de agenda.';


--
-- Name: teachers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teachers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    school_id uuid,
    disciplina character varying(100),
    created_at timestamp without time zone DEFAULT now(),
    profile_id uuid,
    status text DEFAULT 'active'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT teachers_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])))
);


--
-- Name: units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    book_id uuid,
    titulo character varying(255) NOT NULL,
    numero integer,
    descricao text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(255) NOT NULL,
    email character varying(255),
    perfil character varying(50),
    school_id uuid,
    class_id uuid,
    ativo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: xp_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.xp_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid,
    origem character varying(50),
    pontos integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: activity_answers activity_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_answers
    ADD CONSTRAINT activity_answers_pkey PRIMARY KEY (id);


--
-- Name: activity_progress activity_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_progress
    ADD CONSTRAINT activity_progress_pkey PRIMARY KEY (id);


--
-- Name: assessment_questions assessment_questions_assessment_id_position_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_questions
    ADD CONSTRAINT assessment_questions_assessment_id_position_key UNIQUE (assessment_id, "position");


--
-- Name: assessment_questions assessment_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_questions
    ADD CONSTRAINT assessment_questions_pkey PRIMARY KEY (id);


--
-- Name: assessment_sections assessment_sections_assessment_id_position_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_sections
    ADD CONSTRAINT assessment_sections_assessment_id_position_key UNIQUE (assessment_id, "position");


--
-- Name: assessment_sections assessment_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_sections
    ADD CONSTRAINT assessment_sections_pkey PRIMARY KEY (id);


--
-- Name: assessments assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_pkey PRIMARY KEY (id);


--
-- Name: attendance_events attendance_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT attendance_events_pkey PRIMARY KEY (id);


--
-- Name: attendance_records attendance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);


--
-- Name: book_progress book_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_progress
    ADD CONSTRAINT book_progress_pkey PRIMARY KEY (id);


--
-- Name: books books_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_pkey PRIMARY KEY (id);


--
-- Name: class_calendar_entries class_calendar_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_calendar_entries
    ADD CONSTRAINT class_calendar_entries_pkey PRIMARY KEY (id);


--
-- Name: class_teacher_memberships class_teacher_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_teacher_memberships
    ADD CONSTRAINT class_teacher_memberships_pkey PRIMARY KEY (id);


--
-- Name: classes classes_id_school_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_id_school_id_unique UNIQUE (id, school_id);


--
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);


--
-- Name: communication_events communication_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_events
    ADD CONSTRAINT communication_events_pkey PRIMARY KEY (id);


--
-- Name: communications communications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_pkey PRIMARY KEY (id);


--
-- Name: contents contents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contents
    ADD CONSTRAINT contents_pkey PRIMARY KEY (id);


--
-- Name: document_types document_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_types
    ADD CONSTRAINT document_types_pkey PRIMARY KEY (id);


--
-- Name: enrollment_movements enrollment_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollment_movements
    ADD CONSTRAINT enrollment_movements_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);


--
-- Name: guardians guardians_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guardians
    ADD CONSTRAINT guardians_pkey PRIMARY KEY (id);


--
-- Name: licenses licenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_pkey PRIMARY KEY (id);


--
-- Name: medals medals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medals
    ADD CONSTRAINT medals_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: pages pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: question_alternatives question_alternatives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_alternatives
    ADD CONSTRAINT question_alternatives_pkey PRIMARY KEY (id);


--
-- Name: question_alternatives question_alternatives_question_id_label_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_alternatives
    ADD CONSTRAINT question_alternatives_question_id_label_key UNIQUE (question_id, label);


--
-- Name: question_alternatives question_alternatives_question_id_position_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_alternatives
    ADD CONSTRAINT question_alternatives_question_id_position_key UNIQUE (question_id, "position");


--
-- Name: question_curation_history question_curation_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_curation_history
    ADD CONSTRAINT question_curation_history_pkey PRIMARY KEY (id);


--
-- Name: question_distractor_analyses question_distractor_analyses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_distractor_analyses
    ADD CONSTRAINT question_distractor_analyses_pkey PRIMARY KEY (id);


--
-- Name: question_items question_items_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_items
    ADD CONSTRAINT question_items_code_key UNIQUE (code);


--
-- Name: question_items question_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_items
    ADD CONSTRAINT question_items_pkey PRIMARY KEY (id);


--
-- Name: question_licenses question_licenses_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_licenses
    ADD CONSTRAINT question_licenses_name_key UNIQUE (name);


--
-- Name: question_licenses question_licenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_licenses
    ADD CONSTRAINT question_licenses_pkey PRIMARY KEY (id);


--
-- Name: question_media question_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_media
    ADD CONSTRAINT question_media_pkey PRIMARY KEY (id);


--
-- Name: question_sources question_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_sources
    ADD CONSTRAINT question_sources_pkey PRIMARY KEY (id);


--
-- Name: question_usage_logs question_usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_usage_logs
    ADD CONSTRAINT question_usage_logs_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: school_memberships school_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_memberships
    ADD CONSTRAINT school_memberships_pkey PRIMARY KEY (id);


--
-- Name: schools schools_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_pkey PRIMARY KEY (id);


--
-- Name: student_document_events student_document_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_document_events
    ADD CONSTRAINT student_document_events_pkey PRIMARY KEY (id);


--
-- Name: student_documents student_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_documents
    ADD CONSTRAINT student_documents_pkey PRIMARY KEY (id);


--
-- Name: student_grades student_grades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_grades
    ADD CONSTRAINT student_grades_pkey PRIMARY KEY (id);


--
-- Name: student_guardian_links student_guardian_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_guardian_links
    ADD CONSTRAINT student_guardian_links_pkey PRIMARY KEY (id);


--
-- Name: student_guardians student_guardians_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_guardians
    ADD CONSTRAINT student_guardians_pkey PRIMARY KEY (id);


--
-- Name: student_medals student_medals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_medals
    ADD CONSTRAINT student_medals_pkey PRIMARY KEY (id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: teacher_class_movements teacher_class_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_class_movements
    ADD CONSTRAINT teacher_class_movements_pkey PRIMARY KEY (id);


--
-- Name: teacher_plans teacher_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_plans
    ADD CONSTRAINT teacher_plans_pkey PRIMARY KEY (id);


--
-- Name: teachers teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_pkey PRIMARY KEY (id);


--
-- Name: units units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: xp_records xp_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.xp_records
    ADD CONSTRAINT xp_records_pkey PRIMARY KEY (id);


--
-- Name: attendance_events_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attendance_events_created_at_idx ON public.attendance_events USING btree (created_at);


--
-- Name: attendance_events_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attendance_events_record_id_idx ON public.attendance_events USING btree (attendance_record_id);


--
-- Name: attendance_events_school_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attendance_events_school_date_idx ON public.attendance_events USING btree (school_id, attendance_date);


--
-- Name: attendance_events_student_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attendance_events_student_date_idx ON public.attendance_events USING btree (student_id, attendance_date);


--
-- Name: attendance_records_class_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attendance_records_class_date_idx ON public.attendance_records USING btree (class_id, attendance_date);


--
-- Name: attendance_records_school_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attendance_records_school_date_idx ON public.attendance_records USING btree (school_id, attendance_date);


--
-- Name: attendance_records_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attendance_records_status_idx ON public.attendance_records USING btree (status);


--
-- Name: attendance_records_student_class_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX attendance_records_student_class_date_idx ON public.attendance_records USING btree (student_id, class_id, attendance_date);


--
-- Name: attendance_records_student_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attendance_records_student_date_idx ON public.attendance_records USING btree (student_id, attendance_date);


--
-- Name: class_calendar_entries_class_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX class_calendar_entries_class_id_idx ON public.class_calendar_entries USING btree (class_id);


--
-- Name: class_calendar_entries_entry_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX class_calendar_entries_entry_date_idx ON public.class_calendar_entries USING btree (entry_date);


--
-- Name: class_calendar_entries_one_published_plan_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX class_calendar_entries_one_published_plan_idx ON public.class_calendar_entries USING btree (plan_id) WHERE ((plan_id IS NOT NULL) AND (status = 'published'::text));


--
-- Name: class_calendar_entries_plan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX class_calendar_entries_plan_id_idx ON public.class_calendar_entries USING btree (plan_id);


--
-- Name: class_calendar_entries_school_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX class_calendar_entries_school_id_idx ON public.class_calendar_entries USING btree (school_id);


--
-- Name: class_calendar_entries_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX class_calendar_entries_status_idx ON public.class_calendar_entries USING btree (status);


--
-- Name: class_calendar_entries_teacher_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX class_calendar_entries_teacher_id_idx ON public.class_calendar_entries USING btree (teacher_id);


--
-- Name: class_calendar_entries_week_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX class_calendar_entries_week_lookup_idx ON public.class_calendar_entries USING btree (class_id, entry_date, status);


--
-- Name: class_teacher_memberships_class_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX class_teacher_memberships_class_id_idx ON public.class_teacher_memberships USING btree (class_id);


--
-- Name: class_teacher_memberships_one_active_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX class_teacher_memberships_one_active_role_idx ON public.class_teacher_memberships USING btree (class_id, teacher_id, role) WHERE ((status = 'active'::text) AND (ended_at IS NULL));


--
-- Name: class_teacher_memberships_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX class_teacher_memberships_status_idx ON public.class_teacher_memberships USING btree (status);


--
-- Name: class_teacher_memberships_teacher_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX class_teacher_memberships_teacher_id_idx ON public.class_teacher_memberships USING btree (teacher_id);


--
-- Name: classes_school_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX classes_school_id_idx ON public.classes USING btree (school_id);


--
-- Name: classes_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX classes_status_idx ON public.classes USING btree (status);


--
-- Name: classes_teacher_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX classes_teacher_id_idx ON public.classes USING btree (teacher_id);


--
-- Name: communication_events_communication_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX communication_events_communication_id_idx ON public.communication_events USING btree (communication_id);


--
-- Name: communication_events_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX communication_events_created_at_idx ON public.communication_events USING btree (created_at DESC);


--
-- Name: communication_events_performed_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX communication_events_performed_by_idx ON public.communication_events USING btree (performed_by);


--
-- Name: communications_author_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX communications_author_idx ON public.communications USING btree (author_profile_id);


--
-- Name: communications_class_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX communications_class_date_idx ON public.communications USING btree (class_id, communication_date DESC);


--
-- Name: communications_school_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX communications_school_date_idx ON public.communications USING btree (school_id, communication_date DESC);


--
-- Name: communications_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX communications_status_idx ON public.communications USING btree (status);


--
-- Name: communications_student_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX communications_student_date_idx ON public.communications USING btree (student_id, communication_date DESC);


--
-- Name: document_types_school_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX document_types_school_code_idx ON public.document_types USING btree (COALESCE(school_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(code));


--
-- Name: document_types_school_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_types_school_id_idx ON public.document_types USING btree (school_id);


--
-- Name: document_types_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_types_status_idx ON public.document_types USING btree (status);


--
-- Name: enrollment_movements_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX enrollment_movements_created_at_idx ON public.enrollment_movements USING btree (created_at);


--
-- Name: enrollment_movements_enrollment_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX enrollment_movements_enrollment_id_idx ON public.enrollment_movements USING btree (enrollment_id);


--
-- Name: enrollment_movements_school_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX enrollment_movements_school_id_idx ON public.enrollment_movements USING btree (school_id);


--
-- Name: enrollment_movements_student_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX enrollment_movements_student_id_idx ON public.enrollment_movements USING btree (student_id);


--
-- Name: enrollments_class_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX enrollments_class_id_idx ON public.enrollments USING btree (class_id);


--
-- Name: enrollments_one_active_class_year_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX enrollments_one_active_class_year_idx ON public.enrollments USING btree (student_id, class_id, school_year) WHERE ((status = 'active'::text) AND (ended_at IS NULL));


--
-- Name: enrollments_school_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX enrollments_school_id_idx ON public.enrollments USING btree (school_id);


--
-- Name: enrollments_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX enrollments_status_idx ON public.enrollments USING btree (status);


--
-- Name: enrollments_student_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX enrollments_student_id_idx ON public.enrollments USING btree (student_id);


--
-- Name: guardians_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX guardians_email_idx ON public.guardians USING btree (lower(email)) WHERE (email IS NOT NULL);


--
-- Name: guardians_phone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX guardians_phone_idx ON public.guardians USING btree (phone) WHERE (phone IS NOT NULL);


--
-- Name: guardians_profile_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX guardians_profile_id_idx ON public.guardians USING btree (profile_id);


--
-- Name: guardians_school_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX guardians_school_id_idx ON public.guardians USING btree (school_id);


--
-- Name: guardians_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX guardians_status_idx ON public.guardians USING btree (status);


--
-- Name: idx_assessment_questions_assessment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessment_questions_assessment ON public.assessment_questions USING btree (assessment_id, "position");


--
-- Name: idx_assessments_component_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessments_component_year ON public.assessments USING btree (component, school_year);


--
-- Name: idx_assessments_owner_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessments_owner_status ON public.assessments USING btree (owner_user_id, status, updated_at DESC);


--
-- Name: idx_question_history_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_history_question ON public.question_curation_history USING btree (question_id, created_at DESC);


--
-- Name: idx_question_items_curation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_items_curation ON public.question_items USING btree (curation_status, publication_status, legal_classification);


--
-- Name: idx_question_items_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_items_lookup ON public.question_items USING btree (component, school_year, bncc_skill, difficulty, question_type);


--
-- Name: idx_question_items_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_items_source ON public.question_items USING btree (source_id);


--
-- Name: idx_question_sources_unique_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_question_sources_unique_name ON public.question_sources USING btree (lower(name));


--
-- Name: idx_question_usage_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_usage_question ON public.question_usage_logs USING btree (question_id, used_at DESC);


--
-- Name: profiles_platform_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profiles_platform_role_idx ON public.profiles USING btree (platform_role);


--
-- Name: profiles_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profiles_status_idx ON public.profiles USING btree (status);


--
-- Name: school_memberships_one_active_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX school_memberships_one_active_role_idx ON public.school_memberships USING btree (school_id, profile_id, membership_role) WHERE ((status = 'active'::text) AND (ended_at IS NULL));


--
-- Name: school_memberships_profile_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX school_memberships_profile_id_idx ON public.school_memberships USING btree (profile_id);


--
-- Name: school_memberships_school_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX school_memberships_school_id_idx ON public.school_memberships USING btree (school_id);


--
-- Name: school_memberships_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX school_memberships_status_idx ON public.school_memberships USING btree (status);


--
-- Name: schools_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX schools_status_idx ON public.schools USING btree (status);


--
-- Name: student_document_events_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX student_document_events_created_at_idx ON public.student_document_events USING btree (created_at);


--
-- Name: student_document_events_document_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX student_document_events_document_id_idx ON public.student_document_events USING btree (student_document_id);


--
-- Name: student_document_events_school_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX student_document_events_school_id_idx ON public.student_document_events USING btree (school_id);


--
-- Name: student_document_events_student_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX student_document_events_student_id_idx ON public.student_document_events USING btree (student_id);


--
-- Name: student_documents_school_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX student_documents_school_id_idx ON public.student_documents USING btree (school_id);


--
-- Name: student_documents_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX student_documents_status_idx ON public.student_documents USING btree (status);


--
-- Name: student_documents_student_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX student_documents_student_id_idx ON public.student_documents USING btree (student_id);


--
-- Name: student_documents_student_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX student_documents_student_type_idx ON public.student_documents USING btree (student_id, document_type_id);


--
-- Name: student_guardian_links_guardian_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX student_guardian_links_guardian_id_idx ON public.student_guardian_links USING btree (guardian_id);


--
-- Name: student_guardian_links_one_active_relationship_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX student_guardian_links_one_active_relationship_idx ON public.student_guardian_links USING btree (student_id, guardian_id, relationship) WHERE (status = 'active'::text);


--
-- Name: student_guardian_links_one_primary_per_student_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX student_guardian_links_one_primary_per_student_idx ON public.student_guardian_links USING btree (student_id) WHERE ((status = 'active'::text) AND is_primary);


--
-- Name: student_guardian_links_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX student_guardian_links_status_idx ON public.student_guardian_links USING btree (status);


--
-- Name: student_guardian_links_student_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX student_guardian_links_student_id_idx ON public.student_guardian_links USING btree (student_id);


--
-- Name: student_guardians_one_active_relationship_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX student_guardians_one_active_relationship_idx ON public.student_guardians USING btree (student_id, profile_id, relationship) WHERE (status = 'active'::text);


--
-- Name: student_guardians_profile_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX student_guardians_profile_id_idx ON public.student_guardians USING btree (profile_id);


--
-- Name: student_guardians_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX student_guardians_status_idx ON public.student_guardians USING btree (status);


--
-- Name: student_guardians_student_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX student_guardians_student_id_idx ON public.student_guardians USING btree (student_id);


--
-- Name: students_class_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX students_class_id_idx ON public.students USING btree (class_id);


--
-- Name: students_school_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX students_school_id_idx ON public.students USING btree (school_id);


--
-- Name: students_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX students_status_idx ON public.students USING btree (status);


--
-- Name: teacher_class_movements_class_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX teacher_class_movements_class_id_idx ON public.teacher_class_movements USING btree (class_id);


--
-- Name: teacher_class_movements_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX teacher_class_movements_created_at_idx ON public.teacher_class_movements USING btree (created_at);


--
-- Name: teacher_class_movements_membership_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX teacher_class_movements_membership_id_idx ON public.teacher_class_movements USING btree (membership_id);


--
-- Name: teacher_class_movements_school_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX teacher_class_movements_school_id_idx ON public.teacher_class_movements USING btree (school_id);


--
-- Name: teacher_class_movements_teacher_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX teacher_class_movements_teacher_id_idx ON public.teacher_class_movements USING btree (teacher_id);


--
-- Name: teacher_plans_class_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX teacher_plans_class_id_idx ON public.teacher_plans USING btree (class_id);


--
-- Name: teacher_plans_plan_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX teacher_plans_plan_date_idx ON public.teacher_plans USING btree (plan_date);


--
-- Name: teacher_plans_school_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX teacher_plans_school_id_idx ON public.teacher_plans USING btree (school_id);


--
-- Name: teacher_plans_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX teacher_plans_status_idx ON public.teacher_plans USING btree (status);


--
-- Name: teacher_plans_teacher_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX teacher_plans_teacher_id_idx ON public.teacher_plans USING btree (teacher_id);


--
-- Name: teacher_plans_week_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX teacher_plans_week_lookup_idx ON public.teacher_plans USING btree (class_id, plan_date, status);


--
-- Name: teachers_one_active_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX teachers_one_active_profile_idx ON public.teachers USING btree (profile_id) WHERE ((profile_id IS NOT NULL) AND (status = 'active'::text));


--
-- Name: teachers_profile_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX teachers_profile_id_idx ON public.teachers USING btree (profile_id);


--
-- Name: teachers_profile_id_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX teachers_profile_id_unique_idx ON public.teachers USING btree (profile_id) WHERE (profile_id IS NOT NULL);


--
-- Name: teachers_school_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX teachers_school_id_idx ON public.teachers USING btree (school_id);


--
-- Name: teachers_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX teachers_status_idx ON public.teachers USING btree (status);


--
-- Name: attendance_records attendance_records_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER attendance_records_touch_updated_at BEFORE UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION public.institutional_touch_updated_at();


--
-- Name: class_calendar_entries class_calendar_entries_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER class_calendar_entries_touch_updated_at BEFORE UPDATE ON public.class_calendar_entries FOR EACH ROW EXECUTE FUNCTION public.institutional_touch_updated_at();


--
-- Name: class_teacher_memberships class_teacher_memberships_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER class_teacher_memberships_touch_updated_at BEFORE UPDATE ON public.class_teacher_memberships FOR EACH ROW EXECUTE FUNCTION public.institutional_touch_updated_at();


--
-- Name: classes classes_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER classes_touch_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.institutional_touch_updated_at();


--
-- Name: communications communications_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER communications_touch_updated_at BEFORE UPDATE ON public.communications FOR EACH ROW EXECUTE FUNCTION public.institutional_touch_updated_at();


--
-- Name: document_types document_types_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER document_types_touch_updated_at BEFORE UPDATE ON public.document_types FOR EACH ROW EXECUTE FUNCTION public.institutional_touch_updated_at();


--
-- Name: enrollments enrollments_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enrollments_touch_updated_at BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.institutional_touch_updated_at();


--
-- Name: guardians guardians_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER guardians_touch_updated_at BEFORE UPDATE ON public.guardians FOR EACH ROW EXECUTE FUNCTION public.institutional_touch_updated_at();


--
-- Name: profiles profiles_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_touch_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.institutional_touch_updated_at();


--
-- Name: school_memberships school_memberships_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER school_memberships_touch_updated_at BEFORE UPDATE ON public.school_memberships FOR EACH ROW EXECUTE FUNCTION public.institutional_touch_updated_at();


--
-- Name: schools schools_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER schools_touch_updated_at BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION public.institutional_touch_updated_at();


--
-- Name: student_documents student_documents_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER student_documents_touch_updated_at BEFORE UPDATE ON public.student_documents FOR EACH ROW EXECUTE FUNCTION public.institutional_touch_updated_at();


--
-- Name: student_guardian_links student_guardian_links_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER student_guardian_links_touch_updated_at BEFORE UPDATE ON public.student_guardian_links FOR EACH ROW EXECUTE FUNCTION public.institutional_touch_updated_at();


--
-- Name: student_guardians student_guardians_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER student_guardians_touch_updated_at BEFORE UPDATE ON public.student_guardians FOR EACH ROW EXECUTE FUNCTION public.institutional_touch_updated_at();


--
-- Name: students students_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER students_touch_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.institutional_touch_updated_at();


--
-- Name: teacher_plans teacher_plans_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER teacher_plans_touch_updated_at BEFORE UPDATE ON public.teacher_plans FOR EACH ROW EXECUTE FUNCTION public.institutional_touch_updated_at();


--
-- Name: teachers teachers_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER teachers_touch_updated_at BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.institutional_touch_updated_at();


--
-- Name: activities activities_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;


--
-- Name: activity_answers activity_answers_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_answers
    ADD CONSTRAINT activity_answers_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: activity_answers activity_answers_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_answers
    ADD CONSTRAINT activity_answers_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: activity_progress activity_progress_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_progress
    ADD CONSTRAINT activity_progress_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id);


--
-- Name: activity_progress activity_progress_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_progress
    ADD CONSTRAINT activity_progress_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: assessment_questions assessment_questions_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_questions
    ADD CONSTRAINT assessment_questions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: assessment_questions assessment_questions_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_questions
    ADD CONSTRAINT assessment_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question_items(id);


--
-- Name: assessment_questions assessment_questions_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_questions
    ADD CONSTRAINT assessment_questions_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.assessment_sections(id) ON DELETE SET NULL;


--
-- Name: assessment_sections assessment_sections_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_sections
    ADD CONSTRAINT assessment_sections_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: assessments assessments_duplicated_from_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_duplicated_from_id_fkey FOREIGN KEY (duplicated_from_id) REFERENCES public.assessments(id) ON DELETE SET NULL;


--
-- Name: attendance_events attendance_events_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT attendance_events_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE RESTRICT;


--
-- Name: attendance_events attendance_events_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT attendance_events_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id) ON DELETE CASCADE;


--
-- Name: attendance_events attendance_events_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT attendance_events_record_id_fkey FOREIGN KEY (attendance_record_id) REFERENCES public.attendance_records(id) ON DELETE CASCADE;


--
-- Name: attendance_events attendance_events_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT attendance_events_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE RESTRICT;


--
-- Name: attendance_events attendance_events_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT attendance_events_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: attendance_records attendance_records_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE RESTRICT;


--
-- Name: attendance_records attendance_records_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id) ON DELETE CASCADE;


--
-- Name: attendance_records attendance_records_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE RESTRICT;


--
-- Name: attendance_records attendance_records_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: book_progress book_progress_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_progress
    ADD CONSTRAINT book_progress_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id);


--
-- Name: book_progress book_progress_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_progress
    ADD CONSTRAINT book_progress_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: class_calendar_entries class_calendar_entries_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_calendar_entries
    ADD CONSTRAINT class_calendar_entries_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE RESTRICT;


--
-- Name: class_calendar_entries class_calendar_entries_class_school_consistency_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_calendar_entries
    ADD CONSTRAINT class_calendar_entries_class_school_consistency_fkey FOREIGN KEY (class_id, school_id) REFERENCES public.classes(id, school_id) ON DELETE RESTRICT;


--
-- Name: class_calendar_entries class_calendar_entries_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_calendar_entries
    ADD CONSTRAINT class_calendar_entries_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.teacher_plans(id) ON DELETE SET NULL;


--
-- Name: class_calendar_entries class_calendar_entries_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_calendar_entries
    ADD CONSTRAINT class_calendar_entries_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE RESTRICT;


--
-- Name: class_calendar_entries class_calendar_entries_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_calendar_entries
    ADD CONSTRAINT class_calendar_entries_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE RESTRICT;


--
-- Name: class_teacher_memberships class_teacher_memberships_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_teacher_memberships
    ADD CONSTRAINT class_teacher_memberships_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: class_teacher_memberships class_teacher_memberships_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_teacher_memberships
    ADD CONSTRAINT class_teacher_memberships_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;


--
-- Name: classes classes_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: communication_events communication_events_communication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_events
    ADD CONSTRAINT communication_events_communication_id_fkey FOREIGN KEY (communication_id) REFERENCES public.communications(id) ON DELETE CASCADE;


--
-- Name: communications communications_author_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_author_profile_id_fkey FOREIGN KEY (author_profile_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: communications communications_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE RESTRICT;


--
-- Name: communications communications_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE RESTRICT;


--
-- Name: communications communications_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: contents contents_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contents
    ADD CONSTRAINT contents_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: contents contents_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contents
    ADD CONSTRAINT contents_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.pages(id) ON DELETE CASCADE;


--
-- Name: contents contents_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contents
    ADD CONSTRAINT contents_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;


--
-- Name: document_types document_types_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_types
    ADD CONSTRAINT document_types_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: enrollment_movements enrollment_movements_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollment_movements
    ADD CONSTRAINT enrollment_movements_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id) ON DELETE CASCADE;


--
-- Name: enrollment_movements enrollment_movements_from_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollment_movements
    ADD CONSTRAINT enrollment_movements_from_class_id_fkey FOREIGN KEY (from_class_id) REFERENCES public.classes(id) ON DELETE RESTRICT;


--
-- Name: enrollment_movements enrollment_movements_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollment_movements
    ADD CONSTRAINT enrollment_movements_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE RESTRICT;


--
-- Name: enrollment_movements enrollment_movements_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollment_movements
    ADD CONSTRAINT enrollment_movements_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: enrollment_movements enrollment_movements_to_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollment_movements
    ADD CONSTRAINT enrollment_movements_to_class_id_fkey FOREIGN KEY (to_class_id) REFERENCES public.classes(id) ON DELETE RESTRICT;


--
-- Name: enrollments enrollments_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE RESTRICT;


--
-- Name: enrollments enrollments_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE RESTRICT;


--
-- Name: enrollments enrollments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: guardians guardians_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guardians
    ADD CONSTRAINT guardians_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: guardians guardians_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guardians
    ADD CONSTRAINT guardians_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: messages messages_receiver_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_receiver_user_id_fkey FOREIGN KEY (receiver_user_id) REFERENCES public.users(id);


--
-- Name: messages messages_sender_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pages pages_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: pages pages_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: question_alternatives question_alternatives_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_alternatives
    ADD CONSTRAINT question_alternatives_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question_items(id) ON DELETE CASCADE;


--
-- Name: question_curation_history question_curation_history_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_curation_history
    ADD CONSTRAINT question_curation_history_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question_items(id) ON DELETE CASCADE;


--
-- Name: question_distractor_analyses question_distractor_analyses_alternative_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_distractor_analyses
    ADD CONSTRAINT question_distractor_analyses_alternative_id_fkey FOREIGN KEY (alternative_id) REFERENCES public.question_alternatives(id) ON DELETE CASCADE;


--
-- Name: question_items question_items_license_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_items
    ADD CONSTRAINT question_items_license_id_fkey FOREIGN KEY (license_id) REFERENCES public.question_licenses(id);


--
-- Name: question_items question_items_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_items
    ADD CONSTRAINT question_items_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.question_sources(id);


--
-- Name: question_media question_media_license_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_media
    ADD CONSTRAINT question_media_license_id_fkey FOREIGN KEY (license_id) REFERENCES public.question_licenses(id);


--
-- Name: question_media question_media_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_media
    ADD CONSTRAINT question_media_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question_items(id) ON DELETE CASCADE;


--
-- Name: question_sources question_sources_license_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_sources
    ADD CONSTRAINT question_sources_license_id_fkey FOREIGN KEY (license_id) REFERENCES public.question_licenses(id);


--
-- Name: question_usage_logs question_usage_logs_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_usage_logs
    ADD CONSTRAINT question_usage_logs_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE SET NULL;


--
-- Name: question_usage_logs question_usage_logs_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_usage_logs
    ADD CONSTRAINT question_usage_logs_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question_items(id) ON DELETE CASCADE;


--
-- Name: school_memberships school_memberships_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_memberships
    ADD CONSTRAINT school_memberships_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: school_memberships school_memberships_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_memberships
    ADD CONSTRAINT school_memberships_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: student_document_events student_document_events_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_document_events
    ADD CONSTRAINT student_document_events_document_id_fkey FOREIGN KEY (student_document_id) REFERENCES public.student_documents(id) ON DELETE CASCADE;


--
-- Name: student_document_events student_document_events_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_document_events
    ADD CONSTRAINT student_document_events_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: student_document_events student_document_events_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_document_events
    ADD CONSTRAINT student_document_events_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_document_events student_document_events_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_document_events
    ADD CONSTRAINT student_document_events_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES public.document_types(id) ON DELETE RESTRICT;


--
-- Name: student_documents student_documents_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_documents
    ADD CONSTRAINT student_documents_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: student_documents student_documents_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_documents
    ADD CONSTRAINT student_documents_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_documents student_documents_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_documents
    ADD CONSTRAINT student_documents_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES public.document_types(id) ON DELETE RESTRICT;


--
-- Name: student_guardian_links student_guardian_links_guardian_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_guardian_links
    ADD CONSTRAINT student_guardian_links_guardian_id_fkey FOREIGN KEY (guardian_id) REFERENCES public.guardians(id) ON DELETE CASCADE;


--
-- Name: student_guardian_links student_guardian_links_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_guardian_links
    ADD CONSTRAINT student_guardian_links_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_guardians student_guardians_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_guardians
    ADD CONSTRAINT student_guardians_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: student_guardians student_guardians_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_guardians
    ADD CONSTRAINT student_guardians_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_medals student_medals_medal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_medals
    ADD CONSTRAINT student_medals_medal_id_fkey FOREIGN KEY (medal_id) REFERENCES public.medals(id) ON DELETE CASCADE;


--
-- Name: student_medals student_medals_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_medals
    ADD CONSTRAINT student_medals_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: students students_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: students students_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: students students_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: teacher_class_movements teacher_class_movements_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_class_movements
    ADD CONSTRAINT teacher_class_movements_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: teacher_class_movements teacher_class_movements_membership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_class_movements
    ADD CONSTRAINT teacher_class_movements_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES public.class_teacher_memberships(id) ON DELETE SET NULL;


--
-- Name: teacher_class_movements teacher_class_movements_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_class_movements
    ADD CONSTRAINT teacher_class_movements_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE RESTRICT;


--
-- Name: teacher_class_movements teacher_class_movements_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_class_movements
    ADD CONSTRAINT teacher_class_movements_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;


--
-- Name: teacher_plans teacher_plans_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_plans
    ADD CONSTRAINT teacher_plans_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE RESTRICT;


--
-- Name: teacher_plans teacher_plans_class_school_consistency_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_plans
    ADD CONSTRAINT teacher_plans_class_school_consistency_fkey FOREIGN KEY (class_id, school_id) REFERENCES public.classes(id, school_id) ON DELETE RESTRICT;


--
-- Name: teacher_plans teacher_plans_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_plans
    ADD CONSTRAINT teacher_plans_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE RESTRICT;


--
-- Name: teacher_plans teacher_plans_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_plans
    ADD CONSTRAINT teacher_plans_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE RESTRICT;


--
-- Name: teachers teachers_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: teachers teachers_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: teachers teachers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: units units_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: users users_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- Name: users users_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: xp_records xp_records_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.xp_records
    ADD CONSTRAINT xp_records_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_grades Allow all read access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all read access" ON public.student_grades FOR SELECT USING (true);


--
-- Name: medals Allow authenticated users read medals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users read medals" ON public.medals FOR SELECT TO authenticated USING (true);


--
-- Name: student_medals Allow authenticated users read student_medals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users read student_medals" ON public.student_medals FOR SELECT TO authenticated USING (true);


--
-- Name: users Allow authenticated users read users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users read users" ON public.users FOR SELECT TO authenticated USING (true);


--
-- Name: activities Allow authenticated users read xp_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users read xp_records" ON public.activities FOR SELECT TO authenticated USING (true);


--
-- Name: xp_records Allow authenticated users read xp_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users read xp_records" ON public.xp_records FOR SELECT TO authenticated USING (true);


--
-- Name: activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

--
-- Name: activity_answers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_answers ENABLE ROW LEVEL SECURITY;

--
-- Name: activity_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_questions assessment questions follow assessment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "assessment questions follow assessment" ON public.assessment_questions USING ((EXISTS ( SELECT 1
   FROM public.assessments a
  WHERE ((a.id = assessment_questions.assessment_id) AND ((a.owner_user_id = auth.uid()) OR public.has_question_bank_role(ARRAY['admin'::text, 'administrador_nacional'::text, 'gestor'::text, 'gestor_da_rede'::text, 'service_role'::text])))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.assessments a
  WHERE ((a.id = assessment_questions.assessment_id) AND ((a.owner_user_id = auth.uid()) OR public.has_question_bank_role(ARRAY['admin'::text, 'administrador_nacional'::text, 'gestor'::text, 'gestor_da_rede'::text, 'service_role'::text]))))) AND (EXISTS ( SELECT 1
   FROM public.question_items qi
  WHERE ((qi.id = assessment_questions.question_id) AND (qi.publication_status = 'PUBLICADO'::public.question_publication_status) AND (qi.curation_status = ANY (ARRAY['APROVADO'::public.question_curation_status, 'PUBLICADO'::public.question_curation_status, 'HOMOLOGADO'::public.question_curation_status])) AND (qi.legal_classification <> 'ITEM_BLOQUEADO_PUBLICACAO'::public.question_legal_classification))))));


--
-- Name: assessment_sections assessment sections follow assessment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "assessment sections follow assessment" ON public.assessment_sections USING ((EXISTS ( SELECT 1
   FROM public.assessments a
  WHERE (a.id = assessment_sections.assessment_id)))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.assessments a
  WHERE (a.id = assessment_sections.assessment_id))));


--
-- Name: assessment_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_sections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessment_sections ENABLE ROW LEVEL SECURITY;

--
-- Name: assessments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

--
-- Name: assessments assessments readable by owners and managers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "assessments readable by owners and managers" ON public.assessments FOR SELECT USING (((owner_user_id = auth.uid()) OR public.has_question_bank_role(ARRAY['admin'::text, 'administrador_nacional'::text, 'gestor'::text, 'gestor_da_rede'::text, 'curator'::text, 'curador'::text, 'revisor'::text, 'revisor_pedagogico'::text, 'aplicador'::text, 'service_role'::text])));


--
-- Name: attendance_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;

--
-- Name: attendance_events attendance_events_select_institutional; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY attendance_events_select_institutional ON public.attendance_events FOR SELECT TO authenticated USING ((public.secretaria_can_manage_school(school_id) OR public.attendance_teacher_can_record(class_id, student_id, enrollment_id, attendance_date) OR public.attendance_guardian_can_read(student_id) OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = attendance_events.student_id) AND (s.user_id = auth.uid()))))));


--
-- Name: attendance_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

--
-- Name: attendance_records attendance_records_insert_teacher; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY attendance_records_insert_teacher ON public.attendance_records FOR INSERT TO authenticated WITH CHECK (public.attendance_teacher_can_record(class_id, student_id, enrollment_id, attendance_date));


--
-- Name: attendance_records attendance_records_select_institutional; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY attendance_records_select_institutional ON public.attendance_records FOR SELECT TO authenticated USING ((public.secretaria_can_manage_school(school_id) OR public.attendance_teacher_can_record(class_id, student_id, enrollment_id, attendance_date) OR public.attendance_guardian_can_read(student_id) OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = attendance_records.student_id) AND (s.user_id = auth.uid()))))));


--
-- Name: attendance_records attendance_records_update_teacher; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY attendance_records_update_teacher ON public.attendance_records FOR UPDATE TO authenticated USING (public.attendance_teacher_can_record(class_id, student_id, enrollment_id, attendance_date)) WITH CHECK (public.attendance_teacher_can_record(class_id, student_id, enrollment_id, attendance_date));


--
-- Name: book_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.book_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: books; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

--
-- Name: class_calendar_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.class_calendar_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: class_calendar_entries class_calendar_entries_insert_teacher_class_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY class_calendar_entries_insert_teacher_class_or_admin ON public.class_calendar_entries FOR INSERT TO authenticated WITH CHECK (((status = 'published'::text) AND (public.is_platform_admin() OR public.institutional_teacher_can_manage_class(teacher_id, class_id, school_id)) AND public.institutional_plan_matches_publication(plan_id, teacher_id, class_id, school_id)));


--
-- Name: class_calendar_entries class_calendar_entries_select_guardian_enrollment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY class_calendar_entries_select_guardian_enrollment ON public.class_calendar_entries FOR SELECT TO authenticated USING (((status = 'published'::text) AND public.institutional_guardian_can_access_calendar_entry(class_id, school_id)));


--
-- Name: class_calendar_entries class_calendar_entries_select_self_early_childhood; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY class_calendar_entries_select_self_early_childhood ON public.class_calendar_entries FOR SELECT TO authenticated USING (((status = 'published'::text) AND public.institutional_early_childhood_can_access_class(class_id) AND public.institutional_early_childhood_can_access_school(school_id)));


--
-- Name: class_calendar_entries class_calendar_entries_select_student_enrollment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY class_calendar_entries_select_student_enrollment ON public.class_calendar_entries FOR SELECT TO authenticated USING (((status = 'published'::text) AND (public.is_platform_admin() OR public.institutional_student_can_access_calendar_entry(class_id, school_id))));


--
-- Name: class_calendar_entries class_calendar_entries_select_teacher_class_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY class_calendar_entries_select_teacher_class_or_admin ON public.class_calendar_entries FOR SELECT TO authenticated USING ((public.is_platform_admin() OR public.institutional_teacher_can_manage_class(teacher_id, class_id, school_id)));


--
-- Name: class_calendar_entries class_calendar_entries_update_teacher_class_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY class_calendar_entries_update_teacher_class_or_admin ON public.class_calendar_entries FOR UPDATE TO authenticated USING ((public.is_platform_admin() OR public.institutional_teacher_can_manage_class(teacher_id, class_id, school_id))) WITH CHECK ((public.is_platform_admin() OR (public.institutional_teacher_can_manage_class(teacher_id, class_id, school_id) AND public.institutional_plan_matches_publication(plan_id, teacher_id, class_id, school_id))));


--
-- Name: class_teacher_memberships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.class_teacher_memberships ENABLE ROW LEVEL SECURITY;

--
-- Name: class_teacher_memberships class_teacher_memberships_admin_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY class_teacher_memberships_admin_manage ON public.class_teacher_memberships TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());


--
-- Name: class_teacher_memberships class_teacher_memberships_select_own_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY class_teacher_memberships_select_own_or_admin ON public.class_teacher_memberships FOR SELECT TO authenticated USING ((public.is_platform_admin() OR public.institutional_is_current_teacher(teacher_id)));


--
-- Name: class_teacher_memberships class_teacher_memberships_select_self_early_childhood; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY class_teacher_memberships_select_self_early_childhood ON public.class_teacher_memberships FOR SELECT TO authenticated USING (((status = 'active'::text) AND public.institutional_early_childhood_can_access_class(class_id)));


--
-- Name: classes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

--
-- Name: classes classes_select_active_guardian_enrollment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY classes_select_active_guardian_enrollment ON public.classes FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.student_guardians sg
     JOIN public.enrollments e ON ((e.student_id = sg.student_id)))
  WHERE ((sg.profile_id = auth.uid()) AND (sg.status = 'active'::text) AND (e.status = 'active'::text) AND (e.enrolled_at <= now()) AND ((e.ended_at IS NULL) OR (e.ended_at > now())) AND (e.class_id = classes.id)))));


--
-- Name: classes classes_select_by_membership_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY classes_select_by_membership_or_admin ON public.classes FOR SELECT TO authenticated USING ((public.is_platform_admin() OR public.institutional_has_active_class_membership(id)));


--
-- Name: classes classes_select_self_early_childhood; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY classes_select_self_early_childhood ON public.classes FOR SELECT TO authenticated USING (public.institutional_early_childhood_can_access_class(id));


--
-- Name: communication_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.communication_events ENABLE ROW LEVEL SECURITY;

--
-- Name: communication_events communication_events_select_authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY communication_events_select_authorized ON public.communication_events FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.communications c
  WHERE ((c.id = communication_events.communication_id) AND public.communication_can_read(c.*)))));


--
-- Name: communications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

--
-- Name: communications communications_insert_authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY communications_insert_authorized ON public.communications FOR INSERT TO authenticated WITH CHECK (((author_profile_id = auth.uid()) AND (public.secretaria_can_manage_school(school_id) OR public.communication_teacher_can_target(school_id, class_id, student_id, audience_type))));


--
-- Name: communications communications_select_authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY communications_select_authorized ON public.communications FOR SELECT TO authenticated USING (public.communication_can_read(communications.*));


--
-- Name: communications communications_update_authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY communications_update_authorized ON public.communications FOR UPDATE TO authenticated USING (((author_profile_id = auth.uid()) OR public.secretaria_can_manage_school(school_id))) WITH CHECK (((author_profile_id = auth.uid()) OR public.secretaria_can_manage_school(school_id)));


--
-- Name: contents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;

--
-- Name: document_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

--
-- Name: document_types document_types_manage_secretaria; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY document_types_manage_secretaria ON public.document_types TO authenticated USING (((school_id IS NOT NULL) AND public.secretaria_can_manage_school(school_id))) WITH CHECK (((school_id IS NOT NULL) AND public.secretaria_can_manage_school(school_id)));


--
-- Name: document_types document_types_select_secretaria; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY document_types_select_secretaria ON public.document_types FOR SELECT TO authenticated USING (((school_id IS NULL) OR public.secretaria_can_manage_school(school_id)));


--
-- Name: enrollment_movements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.enrollment_movements ENABLE ROW LEVEL SECURITY;

--
-- Name: enrollment_movements enrollment_movements_select_institutional; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enrollment_movements_select_institutional ON public.enrollment_movements FOR SELECT TO authenticated USING ((public.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM public.school_memberships sm
  WHERE ((sm.school_id = enrollment_movements.school_id) AND (sm.profile_id = auth.uid()) AND (sm.status = 'active'::text) AND (sm.membership_role = ANY (ARRAY['gestor'::text, 'coordenador'::text, 'direcao'::text, 'secretaria'::text, 'admin'::text, 'admin_ti'::text])) AND (sm.started_at <= now()) AND ((sm.ended_at IS NULL) OR (sm.ended_at > now())))))));


--
-- Name: enrollments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

--
-- Name: enrollments enrollments_admin_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enrollments_admin_manage ON public.enrollments TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());


--
-- Name: enrollments enrollments_select_active_guardian; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enrollments_select_active_guardian ON public.enrollments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.student_guardians sg
  WHERE ((sg.student_id = enrollments.student_id) AND (sg.profile_id = auth.uid()) AND (sg.status = 'active'::text)))));


--
-- Name: enrollments enrollments_select_by_class_membership_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enrollments_select_by_class_membership_or_admin ON public.enrollments FOR SELECT TO authenticated USING ((public.is_platform_admin() OR public.institutional_has_active_class_membership(class_id)));


--
-- Name: enrollments enrollments_select_self_early_childhood; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enrollments_select_self_early_childhood ON public.enrollments FOR SELECT TO authenticated USING (public.institutional_early_childhood_has_active_enrollment(student_id, class_id, school_id));


--
-- Name: guardians; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;

--
-- Name: guardians guardians_select_institutional_or_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY guardians_select_institutional_or_self ON public.guardians FOR SELECT TO authenticated USING ((public.is_platform_admin() OR (profile_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.school_memberships sm
  WHERE ((sm.school_id = guardians.school_id) AND (sm.profile_id = auth.uid()) AND (sm.status = 'active'::text) AND (sm.membership_role = ANY (ARRAY['gestor'::text, 'coordenador'::text, 'direcao'::text, 'secretaria'::text, 'admin'::text, 'admin_ti'::text])) AND (sm.started_at <= now()) AND ((sm.ended_at IS NULL) OR (sm.ended_at > now())))))));


--
-- Name: licenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

--
-- Name: medals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.medals ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: pages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_admin_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_admin_manage ON public.profiles TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());


--
-- Name: profiles profiles_select_own_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_select_own_or_admin ON public.profiles FOR SELECT TO authenticated USING (((id = auth.uid()) OR public.is_platform_admin()));


--
-- Name: profiles profiles_select_teacher_for_early_childhood; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_select_teacher_for_early_childhood ON public.profiles FOR SELECT TO authenticated USING (((id = auth.uid()) OR public.institutional_early_childhood_can_access_profile(id)));


--
-- Name: question_items published questions readable by educators; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "published questions readable by educators" ON public.question_items FOR SELECT USING (((publication_status = 'PUBLICADO'::public.question_publication_status) OR public.has_question_bank_role(ARRAY['admin'::text, 'administrador_nacional'::text, 'gestor'::text, 'gestor_da_rede'::text, 'curator'::text, 'curador'::text, 'revisor'::text, 'revisor_pedagogico'::text, 'service_role'::text])));


--
-- Name: question_alternatives question children managed by curators; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "question children managed by curators" ON public.question_alternatives USING (public.has_question_bank_role(ARRAY['admin'::text, 'administrador_nacional'::text, 'curator'::text, 'curador'::text, 'revisor'::text, 'revisor_pedagogico'::text, 'service_role'::text])) WITH CHECK (public.has_question_bank_role(ARRAY['admin'::text, 'administrador_nacional'::text, 'curator'::text, 'curador'::text, 'revisor'::text, 'revisor_pedagogico'::text, 'service_role'::text]));


--
-- Name: question_alternatives question children readable with question; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "question children readable with question" ON public.question_alternatives FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.question_items qi
  WHERE (qi.id = question_alternatives.question_id))));


--
-- Name: question_distractor_analyses question distractors managed by curators; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "question distractors managed by curators" ON public.question_distractor_analyses USING (public.has_question_bank_role(ARRAY['admin'::text, 'administrador_nacional'::text, 'curator'::text, 'curador'::text, 'revisor'::text, 'revisor_pedagogico'::text, 'service_role'::text])) WITH CHECK (public.has_question_bank_role(ARRAY['admin'::text, 'administrador_nacional'::text, 'curator'::text, 'curador'::text, 'revisor'::text, 'revisor_pedagogico'::text, 'service_role'::text]));


--
-- Name: question_distractor_analyses question distractors readable with question; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "question distractors readable with question" ON public.question_distractor_analyses FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.question_alternatives qa
     JOIN public.question_items qi ON ((qi.id = qa.question_id)))
  WHERE (qa.id = question_distractor_analyses.alternative_id))));


--
-- Name: question_curation_history question history managed by curators; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "question history managed by curators" ON public.question_curation_history FOR INSERT WITH CHECK (public.has_question_bank_role(ARRAY['admin'::text, 'administrador_nacional'::text, 'curator'::text, 'curador'::text, 'revisor'::text, 'revisor_pedagogico'::text, 'service_role'::text]));


--
-- Name: question_curation_history question history readable by staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "question history readable by staff" ON public.question_curation_history FOR SELECT USING (public.has_question_bank_role(ARRAY['admin'::text, 'administrador_nacional'::text, 'gestor'::text, 'gestor_da_rede'::text, 'curator'::text, 'curador'::text, 'revisor'::text, 'revisor_pedagogico'::text, 'professor'::text, 'service_role'::text]));


--
-- Name: question_licenses question licenses readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "question licenses readable" ON public.question_licenses FOR SELECT USING (true);


--
-- Name: question_media question media managed by curators; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "question media managed by curators" ON public.question_media USING (public.has_question_bank_role(ARRAY['admin'::text, 'administrador_nacional'::text, 'curator'::text, 'curador'::text, 'revisor'::text, 'revisor_pedagogico'::text, 'service_role'::text])) WITH CHECK (public.has_question_bank_role(ARRAY['admin'::text, 'administrador_nacional'::text, 'curator'::text, 'curador'::text, 'revisor'::text, 'revisor_pedagogico'::text, 'service_role'::text]));


--
-- Name: question_media question media readable with question; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "question media readable with question" ON public.question_media FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.question_items qi
  WHERE (qi.id = question_media.question_id))));


--
-- Name: question_sources question sources managed by curators; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "question sources managed by curators" ON public.question_sources USING (public.has_question_bank_role(ARRAY['admin'::text, 'administrador_nacional'::text, 'curator'::text, 'curador'::text, 'service_role'::text])) WITH CHECK (public.has_question_bank_role(ARRAY['admin'::text, 'administrador_nacional'::text, 'curator'::text, 'curador'::text, 'service_role'::text]));


--
-- Name: question_sources question sources readable by staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "question sources readable by staff" ON public.question_sources FOR SELECT USING (public.has_question_bank_role(ARRAY['admin'::text, 'administrador_nacional'::text, 'gestor'::text, 'gestor_da_rede'::text, 'curator'::text, 'curador'::text, 'revisor'::text, 'revisor_pedagogico'::text, 'professor'::text, 'aplicador'::text, 'visualizador'::text, 'service_role'::text]));


--
-- Name: question_alternatives; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.question_alternatives ENABLE ROW LEVEL SECURITY;

--
-- Name: question_curation_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.question_curation_history ENABLE ROW LEVEL SECURITY;

--
-- Name: question_distractor_analyses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.question_distractor_analyses ENABLE ROW LEVEL SECURITY;

--
-- Name: question_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.question_items ENABLE ROW LEVEL SECURITY;

--
-- Name: question_licenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.question_licenses ENABLE ROW LEVEL SECURITY;

--
-- Name: question_media; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.question_media ENABLE ROW LEVEL SECURITY;

--
-- Name: question_sources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.question_sources ENABLE ROW LEVEL SECURITY;

--
-- Name: question_usage_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.question_usage_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: question_items questions inserted by curators and reviewers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "questions inserted by curators and reviewers" ON public.question_items FOR INSERT WITH CHECK (public.has_question_bank_role(ARRAY['admin'::text, 'administrador_nacional'::text, 'curator'::text, 'curador'::text, 'revisor'::text, 'revisor_pedagogico'::text, 'professor'::text, 'service_role'::text]));


--
-- Name: question_items questions managed before publication; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "questions managed before publication" ON public.question_items FOR UPDATE USING (public.has_question_bank_role(ARRAY['admin'::text, 'administrador_nacional'::text, 'curator'::text, 'curador'::text, 'revisor'::text, 'revisor_pedagogico'::text, 'service_role'::text])) WITH CHECK (public.has_question_bank_role(ARRAY['admin'::text, 'administrador_nacional'::text, 'curator'::text, 'curador'::text, 'revisor'::text, 'revisor_pedagogico'::text, 'service_role'::text]));


--
-- Name: reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

--
-- Name: school_memberships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.school_memberships ENABLE ROW LEVEL SECURITY;

--
-- Name: school_memberships school_memberships_admin_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY school_memberships_admin_manage ON public.school_memberships TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());


--
-- Name: school_memberships school_memberships_select_own_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY school_memberships_select_own_or_admin ON public.school_memberships FOR SELECT TO authenticated USING (((profile_id = auth.uid()) OR public.is_platform_admin()));


--
-- Name: schools; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

--
-- Name: schools schools_select_active_guardian_enrollment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY schools_select_active_guardian_enrollment ON public.schools FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.student_guardians sg
     JOIN public.enrollments e ON ((e.student_id = sg.student_id)))
  WHERE ((sg.profile_id = auth.uid()) AND (sg.status = 'active'::text) AND (e.status = 'active'::text) AND (e.enrolled_at <= now()) AND ((e.ended_at IS NULL) OR (e.ended_at > now())) AND (e.school_id = schools.id)))));


--
-- Name: schools schools_select_by_membership_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY schools_select_by_membership_or_admin ON public.schools FOR SELECT TO authenticated USING ((public.is_platform_admin() OR public.institutional_has_active_school_membership(id)));


--
-- Name: schools schools_select_self_early_childhood; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY schools_select_self_early_childhood ON public.schools FOR SELECT TO authenticated USING (public.institutional_early_childhood_can_access_school(id));


--
-- Name: student_document_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_document_events ENABLE ROW LEVEL SECURITY;

--
-- Name: student_document_events student_document_events_select_secretaria; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_document_events_select_secretaria ON public.student_document_events FOR SELECT TO authenticated USING (public.secretaria_can_manage_school(school_id));


--
-- Name: student_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: student_documents student_documents_manage_secretaria; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_documents_manage_secretaria ON public.student_documents TO authenticated USING (public.secretaria_can_manage_school(school_id)) WITH CHECK (public.secretaria_can_manage_school(school_id));


--
-- Name: student_documents student_documents_select_secretaria; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_documents_select_secretaria ON public.student_documents FOR SELECT TO authenticated USING (public.secretaria_can_manage_school(school_id));


--
-- Name: student_grades; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_grades ENABLE ROW LEVEL SECURITY;

--
-- Name: student_guardian_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_guardian_links ENABLE ROW LEVEL SECURITY;

--
-- Name: student_guardian_links student_guardian_links_select_institutional_or_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_guardian_links_select_institutional_or_self ON public.student_guardian_links FOR SELECT TO authenticated USING ((public.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM public.guardians g
  WHERE ((g.id = student_guardian_links.guardian_id) AND (g.profile_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (public.guardians g
     JOIN public.school_memberships sm ON ((sm.school_id = g.school_id)))
  WHERE ((g.id = student_guardian_links.guardian_id) AND (sm.profile_id = auth.uid()) AND (sm.status = 'active'::text) AND (sm.membership_role = ANY (ARRAY['gestor'::text, 'coordenador'::text, 'direcao'::text, 'secretaria'::text, 'admin'::text, 'admin_ti'::text])) AND (sm.started_at <= now()) AND ((sm.ended_at IS NULL) OR (sm.ended_at > now())))))));


--
-- Name: student_guardians; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;

--
-- Name: student_guardians student_guardians_admin_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_guardians_admin_manage ON public.student_guardians TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());


--
-- Name: student_guardians student_guardians_select_own_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_guardians_select_own_or_admin ON public.student_guardians FOR SELECT TO authenticated USING (((profile_id = auth.uid()) OR public.is_platform_admin()));


--
-- Name: student_medals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_medals ENABLE ROW LEVEL SECURITY;

--
-- Name: students; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

--
-- Name: students students_select_active_guardian; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY students_select_active_guardian ON public.students FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.student_guardians sg
  WHERE ((sg.student_id = students.id) AND (sg.profile_id = auth.uid()) AND (sg.status = 'active'::text)))));


--
-- Name: students students_select_by_enrollment_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY students_select_by_enrollment_or_admin ON public.students FOR SELECT TO authenticated USING ((public.is_platform_admin() OR public.institutional_can_access_student(id)));


--
-- Name: students students_select_self_early_childhood; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY students_select_self_early_childhood ON public.students FOR SELECT TO authenticated USING (((user_id = auth.uid()) AND ((COALESCE(status, 'active'::character varying))::text = 'active'::text)));


--
-- Name: teacher_class_movements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teacher_class_movements ENABLE ROW LEVEL SECURITY;

--
-- Name: teacher_class_movements teacher_class_movements_select_institutional; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teacher_class_movements_select_institutional ON public.teacher_class_movements FOR SELECT TO authenticated USING ((public.is_platform_admin() OR public.institutional_is_current_teacher(teacher_id) OR (EXISTS ( SELECT 1
   FROM public.school_memberships sm
  WHERE ((sm.school_id = teacher_class_movements.school_id) AND (sm.profile_id = auth.uid()) AND (sm.status = 'active'::text) AND (sm.membership_role = ANY (ARRAY['gestor'::text, 'coordenador'::text, 'direcao'::text, 'secretaria'::text, 'admin'::text, 'admin_ti'::text])) AND (sm.started_at <= now()) AND ((sm.ended_at IS NULL) OR (sm.ended_at > now())))))));


--
-- Name: teacher_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teacher_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: teacher_plans teacher_plans_insert_own_class_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teacher_plans_insert_own_class_or_admin ON public.teacher_plans FOR INSERT TO authenticated WITH CHECK (((status = ANY (ARRAY['draft'::text, 'published'::text])) AND (public.is_platform_admin() OR public.institutional_teacher_can_manage_class(teacher_id, class_id, school_id))));


--
-- Name: teacher_plans teacher_plans_select_own_class_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teacher_plans_select_own_class_or_admin ON public.teacher_plans FOR SELECT TO authenticated USING ((public.is_platform_admin() OR public.institutional_teacher_can_manage_class(teacher_id, class_id, school_id)));


--
-- Name: teacher_plans teacher_plans_update_own_class_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teacher_plans_update_own_class_or_admin ON public.teacher_plans FOR UPDATE TO authenticated USING ((public.is_platform_admin() OR public.institutional_teacher_can_manage_class(teacher_id, class_id, school_id))) WITH CHECK ((public.is_platform_admin() OR public.institutional_teacher_can_manage_class(teacher_id, class_id, school_id)));


--
-- Name: teachers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

--
-- Name: assessments teachers manage own assessments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "teachers manage own assessments" ON public.assessments USING (((owner_user_id = auth.uid()) OR public.has_question_bank_role(ARRAY['admin'::text, 'administrador_nacional'::text, 'gestor'::text, 'gestor_da_rede'::text, 'service_role'::text]))) WITH CHECK (((owner_user_id = auth.uid()) OR public.has_question_bank_role(ARRAY['admin'::text, 'administrador_nacional'::text, 'gestor'::text, 'gestor_da_rede'::text, 'professor'::text, 'service_role'::text])));


--
-- Name: teachers teachers_select_by_profile_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teachers_select_by_profile_or_admin ON public.teachers FOR SELECT TO authenticated USING ((public.is_platform_admin() OR (profile_id = auth.uid())));


--
-- Name: teachers teachers_select_self_early_childhood; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teachers_select_self_early_childhood ON public.teachers FOR SELECT TO authenticated USING (public.institutional_early_childhood_can_access_teacher(id));


--
-- Name: units; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

--
-- Name: question_usage_logs usage logs inserted by educators; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "usage logs inserted by educators" ON public.question_usage_logs FOR INSERT WITH CHECK (public.has_question_bank_role(ARRAY['admin'::text, 'administrador_nacional'::text, 'gestor'::text, 'gestor_da_rede'::text, 'professor'::text, 'aplicador'::text, 'service_role'::text]));


--
-- Name: question_usage_logs usage logs readable by staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "usage logs readable by staff" ON public.question_usage_logs FOR SELECT USING (public.has_question_bank_role(ARRAY['admin'::text, 'administrador_nacional'::text, 'gestor'::text, 'gestor_da_rede'::text, 'curator'::text, 'curador'::text, 'revisor'::text, 'revisor_pedagogico'::text, 'professor'::text, 'service_role'::text]));


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: xp_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.xp_records ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--
