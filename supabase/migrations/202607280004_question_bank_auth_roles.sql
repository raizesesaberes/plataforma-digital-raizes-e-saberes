-- Banco Inteligente de Questoes e Atividades
-- Missao 01.3 - fonte segura de perfis para RLS.
--
-- O papel pedagogico do usuario deve vir de claim administrativamente
-- controlado. Nao usar user_metadata nem o claim padrao role=authenticated
-- como autorizacao pedagogica.

create or replace function public.current_question_bank_role()
returns text
language sql
stable
as $$
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

create or replace function public.has_question_bank_role(required_roles text[])
returns boolean
language sql
stable
as $$
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
