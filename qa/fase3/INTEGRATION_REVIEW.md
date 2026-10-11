# Integração local dos cinco PRs — evidência final

Worktree `/workspace/fase3-integration`; branch `review/fase3-integration-check`, publicada no PR draft #6 (base PR5), sem main/deploy.

| Entrada | SHA |
|---|---|
| PR1 contratos | `4a96e6cb6035eaaea86b9a87f0e5a71b8691f271` |
| PR2 autorização | `3af739a55ba913b9f7e3794ff20da725cf9e496f` |
| PR3 respostas | `f11ee276917e5a791b9153a4cbe2946349769493` |
| PR4 edição/inbox | `43acefe670e44e97b0130796a1097c6e5e05fbb4` |
| PR5 Expo/revisões | `1f576babe4919c7b44545b9cec67249fe2067593` |

Composição sem conflitos textuais em app-pages.js. Build estático: 4277 arquivos, diretórios SQL/QA fora de dist. Typecheck e bundle Expo QA passaram. Nenhuma alteração SQL das quatro propostas foi necessária.

## Resultado da rodada conjunta no MESMO banco sintético, PR2 → PR3 → PR4 → PR1

- `database.py`, `content.py`, `edge-cases.py`, `security-regressions.py` e `succession-regressions.py`: PASS, inclusive regressões R1–R4 (licença inativa, revogação, barreira de sucessão e escola tardia).
- FASE3: **30 PASS / 0 FAIL**, incluindo web e componentes Expo em Chromium e correções da revisão independente.
- `fase3-bridge.py`: PASS. Com direito anterior da fixture suspenso, catálogo inicialmente nega. Contrato operacional criado via `admin_preview_contract_operation`/`admin_confirm_contract_operation`, metadata `contract_operations_v1` e alvo explícito confirmados; catálogo permite, professor monta/publica. Outra escola é negada. Revogar esse único direito nega NOVA montagem/publicação e mantém aplicação já atribuída. Não testa revogação contínua de aplicações antigas.
- Comparação antes/depois do PR1: **15 funções/triggers FASE3 preservados**, incluindo definição, corpo, ACL, proprietário, GUC e estado dos triggers; nenhum sobrescrito.

Log final: `integration-verification.log`; resultados FASE3: `results.json`; definições/hashes: `integration-functions.json`. Containers removidos. Fixtures corrigidas para modificar/copiar apenas seus contratos/licenças, sem depender da primeira linha de outra suíte. Identidades/JWTs são exclusivamente fictícios; o helper Python opcional reproduz o mesmo question_bank_role professor usado no harness FASE3, sem qualquer alteração Auth.

## Causa exata da ordem inversa

PR2 compara `md5(pg_proc.prosrc)` das dependências observadas. PR1 troca os dois corpos abaixo. Se PR1 vem antes, o guard do PR2 levanta `FASE3_REVIEW_BASE_CHANGED: active_rules`; `school_contract` também diverge. Proprietário, ACL e GUC desses dois permanecem iguais; a divergência é o corpo. Não remover/alterar hashes para contornar.

| Função em school_category_private | MD5 corpo anterior | MD5 corpo PR1 |
|---|---|---|
| active_rules(jsonb) | `da6a2950c152ca297f61e70a7b168d34` | `2d32f1f937196cac7184e5d498021e02` |
| school_contract(uuid,uuid) | `6124eacadbbf7838b0670e1ca0c6b203` | `049c9e65693e95cd23fb87f3927ec480` |

PR1 altera ainda `content_validate_entitlement`, `has_dynamic_membership`, `scope_tenants`, `dynamic_school` e `legacy_resolver`; todos os sete hashes de corpo/definição e ACLs/GUC constam do JSON. O guard de avaliação passa a consultar as dependências dinâmicas de contratos, e a ponte funcional comprova concessão/revogação — não apenas coexistência DDL.

## Ledger e rollout ainda bloqueados para revisão

O preflight standalone PR1 exige ledger original149; registrar PR2/3/4 antes dele resulta em152 e falha. A fixture mínima não tem ledger remoto e não fabrica uma homologação desse histórico. `COMBINED_RELEASE_PLAN.md` propõe quatro versões exatas e o checkpoint separado `supabase/review/combined_preflight_20261011060000.sql`: original149 imutável + três pares exatos, sete dependências/objetos ausentes e15 proteções pós-FASE3. Artefato somente leitura NÃO EXECUTADO, SHA256 `d5c4c87c4edd30bc1713f6f254102b899be9cff5c6748414c17c26cbea34eeff`. Exige aprovação específica do pacote; nenhum preflight original foi relaxado.

Gates continuam off: `RAIZES_COMMUNICATION_REPLIES_ENABLED`, `RAIZES_NOTICE_EDITING_ENABLED`, `EXPO_PUBLIC_FASE3_ASSESSMENTS`, `EXPO_PUBLIC_FASE3_REPLIES`, `EXPO_PUBLIC_FASE3_NOTICE_EDITING`. Backend autorizado/revisado antes de ativar qualquer gate. Combinações de gates Expo verificadas sem renderizar conteúdo de entrega proibida.

Reproduzir com Docker + Chromium/Playwright + dependências do mobile: `node qa/fase3/build-expo-preview.mjs` e `node qa/fase3/integration-run.mjs`. Nenhuma URL remota é aceita. Script não substitui procedimento de instalação aprovado.

Login BEM-SUCEDIDO via Auth local continua NÃO EXECUTADO: CLI falhou EROFS em `/home/agent/.supabase`; nenhum contorno/instalação adicional. Verificação incremental de roteamento em `routing-results.json`: sete checks PASS nas entradas reais App.tsx/login.html (falha explícita de Auth local), AppShell real professor/aluno → Avalia+ → recados → perfil/logout, páginas web professor e aluno → recados → reload/logout. Sessão de teste fornecida somente pelo harness QA/Playwright storageState. Não equivale a autenticação completa. Os três pageErrors foram diagnosticados como404 da fonte Feather local bloqueada indevidamente pelo host QA por conter `.pnpm`. Host QA corrigido com inventário de arquivos exportados; rodada focada agora8 PASS/zero pageErrors, fontes200. Auth503/Google Fonts bloqueado e403 de gamificação legada classificados separadamente em `NETWORK_DIAGNOSIS.md`; sem grants ou runtime alterados. Nativos/homologação humana pendentes. `MAC_HANDOFF.md` contém sequência oficial local, limites do bootstrap Auth, hashes/versões/preflight/recuperação.

Após a rodada conjunta, os fixes residuais PR5 `1f576ba` receberam 30 PASS em `review-residual-verification.log` (application_status, revisão-base da edição, remoção do painel pela lista). Os sete checks de roteamento foram executados sobre essa composição. Suítes estáveis de contratos não foram repetidas: os quatro SQLs e hashes de dependências permanecem idênticos. Houve conflito apenas na imagem QA `expo-browser.png` ao propagar a revisão, resolvido mantendo a evidência mais recente do PR5; nenhum conflito de runtime.

## SHA256 dos artefatos testados

| SQL | SHA256 |
|---|---|
| contract_operations.sql | `938d444f542cbd3d739044271fa0e1d43c93b6e40508ba292cb946cde772f415` |
| fase3_assessment_authorization.sql | `de28fdb1726d50c1fbb04b0ae96fcf148f3c391562316485911167883d179389` |
| fase3_communication_replies.sql | `23a45eb7ae85e8fb11b8605f983b07122028e63c508a8d1e6891b13a369028be` |
| fase3_notice_editing.sql | `9819264bd71a61d90f522040405193c211ebad9fab39880a2748b503409341c1` |
