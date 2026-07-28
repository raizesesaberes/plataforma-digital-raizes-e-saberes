# Homologacao Missao 01.2.1 - Data API Banco de Questoes

Data: 28/07/2026

## Classificacao final

C. PARCIALMENTE CONCLUIDA, COM PENDENCIAS TECNICAS.

## Projeto Supabase confirmado

- Project ref: `jaesjldrbjbdmzzggxzw`
- Host: `jaesjldrbjbdmzzggxzw.supabase.co`
- Chave no frontend: chave publica publishable/anon.
- `service_role`: nao exposta no frontend.

## Inspecao inicial

A conexao com a Data API do projeto remoto funciona, mas as tabelas da Missao 01.2.1 nao estao disponiveis no schema cache da Data API.

Resultado REST:

| Tabela | Status | Codigo | Resultado |
| --- | --- | --- | --- |
| `question_licenses` | 404 | PGRST205 | tabela nao encontrada no schema cache |
| `question_sources` | 404 | PGRST205 | tabela nao encontrada no schema cache |
| `question_items` | 404 | PGRST205 | tabela nao encontrada no schema cache |
| `question_alternatives` | 404 | PGRST205 | tabela nao encontrada no schema cache |
| `question_distractor_analyses` | 404 | PGRST205 | tabela nao encontrada no schema cache |
| `question_media` | 404 | PGRST205 | tabela nao encontrada no schema cache |
| `question_curation_history` | 404 | PGRST205 | tabela nao encontrada no schema cache |
| `assessments` | 404 | PGRST205 | tabela nao encontrada no schema cache |
| `assessment_sections` | 404 | PGRST205 | tabela nao encontrada no schema cache |
| `assessment_questions` | 404 | PGRST205 | tabela nao encontrada no schema cache |
| `question_usage_logs` | 404 | PGRST205 | tabela nao encontrada no schema cache |
| `curation_batches` | 404 | PGRST205 | tabela nao encontrada no schema cache |

## Migrations

Arquivos esperados:

1. `supabase/migrations/202607280002_question_bank.sql`
2. `supabase/migrations/202607280003_question_bank_activation.sql`
3. `data/question_bank/2026-07-28-question-bank-demo.seed.sql`

Nao foi possivel concluir a aplicacao pelo SQL Editor a partir deste ambiente: o navegador bloqueou a confirmacao de execucao da query no dominio `supabase.com` por politica de seguranca. Nao ha `SUPABASE_DB_URL`, `DATABASE_URL` nem `psql` configurado para aplicar pelo terminal.

## Curation batches

`curation_batches` nao pertence ao modelo principal do Banco de Questoes da Missao 01.2. Ela e criada pela migration anterior `202607280001_curation_pipeline.sql`, da Central de Curadoria/Universidade. O script `scripts/question-bank-remote-homologation.mjs` foi ajustado para trata-la como tabela opcional nesta fase.

## Seed

O seed nao pode ser validado no remoto porque `question_items`, `question_licenses` e `question_sources` ainda nao existem na Data API do projeto acessado.

## Interface

Nao foi possivel homologar a interface com dados reais porque a Data API retorna `PGRST205` para as tabelas consultadas por `questionBankDataService`.

## Evidencias locais

Comandos executados:

```bash
node --check scripts/question-bank-remote-homologation.mjs
node -e "const fs=require('fs'); const vm=require('vm'); new vm.Script(fs.readFileSync('app-pages.js','utf8')); console.log('syntax ok')"
```

Resultado:

- sintaxe OK.

Consulta REST direta executada contra `jaesjldrbjbdmzzggxzw.supabase.co` confirmou `PGRST205` em todas as tabelas obrigatorias.

## Pendencias tecnicas

1. Aplicar `202607280002_question_bank.sql` no projeto `jaesjldrbjbdmzzggxzw`.
2. Aplicar `202607280003_question_bank_activation.sql`.
3. Executar `2026-07-28-question-bank-demo.seed.sql` duas vezes para validar idempotencia.
4. Recarregar/aguardar o schema cache da Data API.
5. Reexecutar `scripts/question-bank-remote-homologation.mjs verify`.
6. Validar a interface `banco-questoes.html` fora do fallback.

## Necessario para concluir por terminal

Fornecer `SUPABASE_DB_URL` ou `DATABASE_URL` segura do projeto e um cliente `psql` disponivel, ou executar manualmente os SQLs no painel Supabase e avisar quando o schema cache estiver atualizado.
