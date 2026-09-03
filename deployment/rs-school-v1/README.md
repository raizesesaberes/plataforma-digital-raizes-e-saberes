# Pacote de Implantacao RS-SCHOOL V1

Pacote operacional para implantar uma nova escola a partir do `RS-SCHOOL-TEMPLATE V1` homologado.

Este pacote nao contem dados reais, nao contem senhas e nao aponta para project-ref fixo. Ele tambem nao deve ser usado para alterar o `RS-SCHOOL-PILOT`.

## Versao

- `schema_version`: `RS-SCHOOL-TEMPLATE V1`
- `deployment_package_version`: `RS-SCHOOL-V1-DEPLOYMENT-2026-09-01`
- `template_source`: `supabase/template/`

## Fluxo Oficial

1. Criar novo projeto Supabase da escola.
2. Escolher regiao conforme contrato e latencia esperada.
3. Configurar Data API e obter somente URL publica e anon/publishable key para frontend.
4. Aplicar migrations do `supabase/template/migrations/`.
5. Criar um Auth Admin inicial no projeto da escola.
6. Executar `supabase/template/bootstrap/rs_school_template_bootstrap.sql` com os parametros da escola.
7. Validar Secretaria vazia.
8. Configurar backup.
9. Cadastrar manualmente ou importar estrutura inicial.
10. Criar acessos operacionais de forma separada do cadastro institucional.
11. Validar RLS e isolamento.
12. Testar Secretaria, Professor e Familia.
13. Registrar GO/NO-GO.
14. Entregar handoff sem secrets.

## Arquivos

- `RS-SCHOOL-V1-PRE-DEPLOY-CHECKLIST.md`: levantamento antes da implantacao.
- `RS-SCHOOL-V1-BACKUP-CHECKLIST.md`: backup, retencao e restore.
- `RS-SCHOOL-V1-RLS-ISOLATION-CHECKLIST.md`: validacao de RLS por perfil.
- `RS-SCHOOL-V1-UAT.md`: roteiro minimo de aceite.
- `RS-SCHOOL-V1-GO-NOGO.md`: criterios finais de liberacao.
- `RS-SCHOOL-V1-SCHOOL-HANDOFF.md`: handoff da escola implantada.
- `RS-SCHOOL-V1-SUPPORT-CHECKLIST.md`: abertura de chamados.
- `RS-SCHOOL-V1-ENVIRONMENTS.md`: separacao de ambientes.
- `RS-SCHOOL-V1-ROLLBACK.md`: resposta a falha de importacao.
- `templates/csv/*.csv`: modelos ficticios para importacao em lote.
- `scripts/import-rs-school-v1.mjs`: importador com dry-run por padrao.
- `scripts/render-bootstrap-command.mjs`: helper local para montar o comando de bootstrap sem secrets.

## Cadastro Manual

Para escola pequena, usar a Secretaria:

1. Criar turmas.
2. Cadastrar alunos.
3. Criar matriculas.
4. Cadastrar responsaveis.
5. Vincular professores somente depois de os cadastros institucionais estarem consistentes.

## Importacao Em Lote

O importador sempre roda em dry-run se `--apply` nao for informado:

```bash
node deployment/rs-school-v1/scripts/import-rs-school-v1.mjs \
  --dir deployment/rs-school-v1/templates/csv \
  --school-name "Nome da Escola" \
  --school-year 2026
```

Para gravar, use `--apply` somente em ambiente tecnico controlado, com usuario autenticado autorizado:

```bash
SUPABASE_URL="https://<project-ref>.supabase.co" \
SUPABASE_ANON_KEY="<anon-or-publishable-key>" \
node deployment/rs-school-v1/scripts/import-rs-school-v1.mjs \
  --dir caminho/dos/csvs \
  --school-name "Nome da Escola" \
  --school-year 2026 \
  --email admin@escola.example \
  --apply
```

O script pede senha por prompt local quando precisa autenticar por e-mail. Nao informe senha em argumento de linha de comando.

## Caminhos Homologados Do V1

O Template V1 possui RPCs homologadas para:

- criar turma;
- criar professor institucional sem Auth;
- criar aluno com matricula;
- criar responsavel e vinculo;
- vincular professor existente a turma.

O acesso digital do professor continua separado: a RPC de importacao nao cria `auth.users`, nao recebe senha e nao libera login automaticamente.
