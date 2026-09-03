# RS-SCHOOL-TEMPLATE V1 - Checklist De Instalacao

1. Criar um projeto Supabase novo ou banco PostgreSQL limpo compativel.
2. Criar o primeiro usuario Auth administrativo no projeto alvo.
3. Aplicar as migrations em `supabase/template/migrations/`, na ordem.
4. Executar `supabase/template/bootstrap/rs_school_template_bootstrap.sql` com `psql`, informando `school_name`, `school_code`, `school_year`, `admin_user_id` e `admin_display_name`.
5. Confirmar que a nova escola possui zero turmas, zero alunos, zero responsaveis, zero matriculas, zero frequencias, zero comunicados e zero documentos operacionais.
6. Confirmar que `document_upload_enabled` inicia como `false`.
7. Entrar na Secretaria com o admin inicial e criar a primeira turma real.
8. Cadastrar aluno, matricula, professor e responsavel apenas pelo fluxo institucional.
9. Validar Professor, Aluno, Familia e Secretaria com Auth real.
10. Registrar o primeiro backup validado da instalacao.

