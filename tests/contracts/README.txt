CONTRATOS E ACESSOS — validação local, sem publicação

Base: main ee88cb9e80d454c64b6548f28e15f34f32fc48a2.
Worktree: /workspace/contratos-operacional; branch codex/contratos-operacional.
Interface: admin.html?view=conteudos&type=entitlements (também network-contracts).

Implementação
- Contratante novo/existente, escolas cadastradas e nova escola via admin_create_school.
- Criação atômica, com escolas novas inativas / implantação teste, sem reativação.
- Prévia de contratante, alvos, retiradas, regras, alterações e vigência.
- 12 meses calendários sugeridos, editáveis; datas interpretadas em America/Sao_Paulo.
  Fim inclusivo = aniversário de 12 meses menos um dia. Nenhuma data real presumida.
- Renovação reutiliza configurações POR ESCOLA, inclusive restrições da licença e
  módulos desabilitados, ou permite escolher nova configuração uniforme explicitamente.
- Vínculos contratuais privados não mudam filiação de rede nem criam pessoas duplicadas.
- Categorias usam entitlements e resolver publicados, sem liberações item a item.
- Adoção programada não muda direitos legados antes do início. Retiradas na renovação
  entram no controle de categorias nessa data para impedir sobrevivência do direito antigo.
- Revogação preserva histórico e não ressuscita predecessor; cancelamento de renovação
  futura preserva o contrato corrente.
- Recibo idempotente, fingerprint da prévia, locks, rollback integral e recuperação
  após perda de resposta/reload (sessionStorage por usuário, sem senhas).

Backend / revisão necessária
supabase/review/contract_operations.sql NÃO está na fila automática de migrations.
Nenhuma migration, função, policy ou concessão foi publicada. É necessária revisão
específica das RPCs SECURITY DEFINER, ACLs e alterações dos helpers de categorias,
validação de entitlement e exclusão do novo entitlement do caminho legado.
O schema privado tem RLS e nenhuma permissão direta para public/anon/authenticated/
service_role. RPCs públicas verificam perfil administrativo ativo no banco.
Não há alteração de Auth, senhas ou importação. admin_create_school é reutilizada.
A serialização usa o mesmo advisory lock das categorias e locks de tabelas com timeout;
revisar impacto de contenção antes de implantar em escala. Prévia usa fingerprint global.

Pré-requisitos: schema-base atual + migrations de categorias publicadas, incluindo
public.school_content_assert_admin(). Essa função está no banco remoto, mas não consta
na cadeia versionada do baseline local; tests/contracts/admin-assert.sql reproduz sua
assinatura/corpo somente para reconstrução sintética. Não é proposta de alteração Auth.
A CLI Supabase tentou criar o arquivo versionado, mas a instalação falhou neste ambiente
(cache/home somente leitura em uma versão; outra instalação não concluiu). Por isso o
SQL fica deliberadamente como rascunho revisável, fora das migrations automáticas.

Limites explícitos
- Direitos legados sem category_rules não são convertidos silenciosamente em categorias.
  A renovação exige escolher o modo de edição e revisar a nova configuração.
- Amostras temporárias ou entitlements anteriores ambíguos exigem revisão explícita;
  a cópia automática bloqueia em vez de ampliar licença ou descartar regras.
- A tela consome produtos/módulos existentes; não cadastra produtos/coleções comerciais.
- Mídias sem adaptador protegido continuam com PROTECTED_DELIVERY_REQUIRED.
- Alvos reais definidos: as cinco escolas no arquivo production-readonly.json.
  Início concreto da ativação e autorização de implantação ainda pendentes.
- Não há declaração de homologação do usuário.

Reproduzir do diretório raiz, em Docker exclusivamente sintético
1. docker run -d --name rs-contract-db -e POSTGRES_PASSWORD=local-synthetic-only -p 127.0.0.1:55432:5432 postgres:17
2. python tests/contracts/reset-local.py
3. python tests/contracts/database.py
4. python tests/contracts/content.py
5. python tests/contracts/edge-cases.py
6. docker run -d --name rs-contract-rest --network host -e PGRST_DB_URI=postgres://postgres:local-synthetic-only@127.0.0.1:55432/postgres -e PGRST_DB_ANON_ROLE=anon -e PGRST_JWT_SECRET=synthetic-local-jwt-signing-key-at-least-32-characters -e PGRST_SERVER_HOST=127.0.0.1 -e PGRST_SERVER_PORT=55433 postgrest/postgrest:v12.2.3
7. npm ci --prefix tests/contracts --ignore-scripts
8. node tests/contracts/server.mjs (outra sessão)
9. node tests/contracts/browser.mjs
Chromium esperado: /usr/bin/chromium. Todos os nomes/IDs dos testes são sintéticos.
reset-local.py APAGA schemas somente no container local rs-contract-db e não aceita URL.
Nenhum endpoint remoto é usado nos testes; o navegador bloqueia requisições externas.
As falhas de rede são injetadas; respostas de sucesso vêm do PostgREST/SQL reais.

Evidências: evidence/verification.log, evidence/review.png, evidence/confirmed.png.
