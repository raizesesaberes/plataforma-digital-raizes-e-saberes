# Pacote combinado — proposta para revisão, NÃO executar

Nenhum ledger remoto foi modificado. Os SQLs em review não são migrations prontas. O preflight atual de contratos continua intacto: exige 149 entradas, máximo 20261011003404 e MD5 ef9f6ce1ab21510845023cceb4228bae sobre version:name. Registrar PR2/3/4 antes de executar esse preflight fará o guard rejeitar o estado, mesmo que os corpos sejam compatíveis.

## Versões propostas, ainda não reservadas/aplicadas

| Ordem | Versão proposta | Nome exato proposto | Fonte imutável |
|---|---|---|---|
| 1 | 20261011060001 | fase3_assessment_authorization | supabase/review/fase3_assessment_authorization.sql |
| 2 | 20261011060002 | fase3_communication_replies | supabase/review/fase3_communication_replies.sql |
| 3 | 20261011060003 | fase3_notice_editing | supabase/review/fase3_notice_editing.sql |
| 4 | 20261011060004 | contract_operations | supabase/review/contract_operations.sql |

Confirmar ausência de colisões na revisão final; qualquer troca exige novo manifesto/revisão. Não inserir linhas manualmente nem usar migration repair para aparentar aplicação. A ferramenta oficial deve registrar somente os artefatos realmente aplicados, após revisão específica.

## Preflight combinado versionado proposto

1. Estado inicial: executar integralmente o preflight original de contratos (funções, proprietário, ACL/GUC, ledger e objetos ausentes), e os guards internos de cada SQL. Validar SHA256 de cada fonte contra INTEGRATION_REVIEW.md. Arquivar evidência somente de metadados, sem dados pessoais.
2. Antes do PR2: ledger exatamente original 149; dependências de PR2 exatamente originais. Aplicar somente o artefato aprovado com versão/nome 1.
3. Antes do PR3: ledger original imutável + exatamente a entrada 1; preservar as definições/ACL/configuração/triggers pós-PR2 e verificar guards internos PR3. Aplicar somente 2.
4. Antes do PR4: ledger original imutável + exatamente entradas 1/2; preservar snapshot aprovado pós-PR3 e verificar guards internos PR4. Aplicar somente 3.
5. Antes de contratos: nova revisão deve APROVAR um preflight de pacote que, no lugar do teste de ledger149 do preflight standalone, exija exatamente original149 + as três entradas acima (152 total), sem outras linhas. Calcular MD5 original filtrando somente essas três versões, exigir count149/max20261011003404/hash original; exigir pares versão/nome exatos nas três novas linhas. Reexecutar SEM ALTERAÇÃO as sete verificações de funções/ACL/GUC de contratos e seus objetos ausentes; exigir ainda todas as proteções pós-FASE3 do snapshot aprovado. O snapshot sintético integration-functions.json é evidência de comparação, não atestado remoto.
6. Após contratos: ledger153 original+quatro pares exatos; sete dependências substituídas devem coincidir com hashes finais aprovados; todas as 15 funções/triggers FASE3 devem permanecer exatamente iguais (definição, ACL, proprietário, GUC e estado do trigger). Gates continuam off até validação coordenada do backend/frontends.

O preflight de pacote deve ser artefato separado, com hash aprovado, e falhar antes da mutação se qualquer condição não for verdadeira. NÃO apagar/relaxar o preflight standalone, não aceitar apenas contagens, não tratar max(version) como prova e não executar contratos primeiro para evitar o guard. Esta proposta não executa nem fornece override. O SQL final do preflight combinado e o manifesto dos snapshots por fase ainda dependem da revisão específica do pacote; os ensaios sintéticos não constituem autorização de produção.

## Mínimo executável de QA

Em branch composta dos cinco PRs, com dependências Expo instaladas e Chromium/Playwright/Docker: `node qa/fase3/build-expo-preview.mjs`, depois `node qa/fase3/integration-run.mjs`. O runner usa banco descartável etiquetado; executa database/content/edge-cases/security-regressions/succession-regressions de contratos, FASE3 web/Expo e a ponte operacional preview/confirm→avaliação→revogação. Não aceita URL remota. O ledger149 não existe nesse banco e não é simulado como homologado.

Login oficial local: tentativa da CLI via npm bloqueada por EROFS ao criar /home/agent/.supabase. Só Postgres/PostgREST oficiais estão instalados; Auth local não iniciado. Navegação nos componentes via harness sintético não equivale a login completo ou publicação nativa. Não alterar HOME nem reutilizar credenciais/sessões de produção para contornar esse limite.
