# Guia De Importacao RS-SCHOOL V1

## Ordem Segura

1. Turmas.
2. Professores.
3. Vinculos professor-turma.
4. Alunos + matriculas.
5. Responsaveis.
6. Vinculos aluno-responsavel.

## Dry-Run Obrigatorio

Rodar antes de qualquer gravacao:

```bash
node deployment/rs-school-v1/scripts/import-rs-school-v1.mjs \
  --dir deployment/rs-school-v1/templates/csv \
  --school-name "Nome da Escola" \
  --school-year 2026
```

O dry-run valida:

- colunas obrigatorias;
- duplicidades;
- existencia de turma referenciada;
- ano letivo;
- vinculos professor-turma;
- vinculos aluno-responsavel;
- status permitido;
- formato de data.

## Apply

Rodar somente apos dry-run `PASS`, backup confirmado e aprovacao tecnica.

```bash
SUPABASE_URL="https://<project-ref>.supabase.co" \
SUPABASE_ANON_KEY="<anon-or-publishable-key>" \
RS_SCHOOL_ID="<school-id>" \
node deployment/rs-school-v1/scripts/import-rs-school-v1.mjs \
  --dir caminho/dos/csvs \
  --school-name "Nome da Escola" \
  --school-year 2026 \
  --email admin@escola.example \
  --apply
```

O script pede a senha no prompt local quando `SUPABASE_ACCESS_TOKEN` nao estiver definido.

## Escrita Permitida No V1

O `--apply` usa RPCs homologadas para:

- `secretaria_create_class`;
- `secretaria_create_teacher`;
- `secretaria_link_teacher_to_class`;
- `secretaria_create_student_enrollment`;
- `secretaria_create_guardian_link`.

Nao ha INSERT generico no importador.

## Professores

`professores.csv` cria professor institucional sem criar Auth. `professor_turmas.csv` vincula professores ja criados ou reutilizados a turmas ja criadas ou reutilizadas.

O e-mail do professor e validado e usado pelo importador para correlacionar o lote. O schema V1 nao persiste e-mail em `profiles`; acesso digital do professor deve ser ativado depois pelo procedimento de acessos.

## Relatorio

Cada execucao gera:

- JSON tecnico;
- Markdown de leitura humana.

Os relatorios registram linhas lidas, validas, invalidas, duplicadas, criadas, ignoradas, falhas e IDs criados quando houver apply.
