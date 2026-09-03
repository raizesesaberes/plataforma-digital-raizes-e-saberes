# Checklist RLS E Isolamento

Validar sem alterar policies.

## Perfis

- Admin ve somente a escola correta.
- Professor ve somente turmas vinculadas.
- Familia ve somente alunos vinculados.
- Aluno ve somente o proprio contexto.
- `anon` nao ve dados institucionais.

## Tabelas Criticas

- `schools`
- `profiles`
- `school_memberships`
- `teachers`
- `classes`
- `students`
- `enrollments`
- `guardians`
- `student_guardian_links`
- `attendance_records`
- `communications`
- `document_types`

## Resultado

- `RLS_ADMIN=PASS/FAIL`
- `RLS_PROFESSOR=PASS/FAIL`
- `RLS_FAMILIA=PASS/FAIL`
- `RLS_ALUNO=PASS/FAIL`
- `RLS_ANON=PASS/FAIL`

