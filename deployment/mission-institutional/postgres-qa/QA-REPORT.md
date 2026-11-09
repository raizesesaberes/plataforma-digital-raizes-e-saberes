# Missão do Dia / Colorir: PostgreSQL real

Ambiente: iMac x86_64, PostgreSQL 17.6, Node 24, banco sintético mission_test_entitlements. Sem TCP, socket privado 0700. Nenhum acesso produção. Cluster desligado ao concluir.

## Resultados

- Manifesto do bundle original: 58/58 SHA256 conferidos.
- test-entitlements.mjs: 25 testes passaram, 0 falharam.
- concurrency.mjs: 11 testes passaram, 0 falharam na execução final.
- Nenhuma alteração nos arquivos SQL V2/complementos.

Concorrência foi comprovada observando wait_event_type=Lock em pg_stat_activity antes de revogar/liberar. Sessões independentes usam SET LOCAL ROLE authenticated e JWT sub sintético parametrizado. Sessões paralelas do mesmo ator preservam a identidade para exercitar disputa real da mesma chave; professor e aluno possuem sujeitos distintos. Conexão administrativa só configura fixtures.

Cobertura: optimistic artwork com exatamente um sucesso e um conflito; revogação de matrícula/licença/release enquanto artwork aguarda; expiração temporal de matrícula enquanto artwork aguarda; cancelamento confirmado antes da leitura bloqueada da atribuição; revogação de vínculo docente/licença/release enquanto assign aguarda; planos de duas semanas isolados; publicação concorrente do mesmo request_id retorna recibo idêntico e cria uma única atribuição.

Primeira execução: 10 passaram e 1 teste foi inválido por tentar atribuir deadline ao Colorir. API corretamente retornou MISSION_INVALID_INTERVAL (Infantil não admite deadline). O teste foi corrigido para expiração de matrícula durante a espera. Log inicial preservado por transparência. Não houve bug SQL demonstrado nem correção SQL.

Limites: não há expiração de prazo de atividade Colorir por definição; foi testada expiração do vínculo durante a espera. Não representa teste de carga, todos os níveis de isolamento nem publicação em produção.

## Reprodução

1. Instalar dependências pinadas do package-lock.json no diretório QA; restaurar binário conforme README.md.
2. Iniciar cluster com sh start-postgres.sh.
3. Em cluster local novo, criar role sintética mission_qa LOGIN SUPERUSER e banco mission_test_entitlements. Teste-base cria roles anon/authenticated/service_role: elas não podem existir antes dele.
4. Extrair bundle original mission-backend-pg-qa-20261109.zip em bundle/. Pacotes pg e zod devem estar resolvíveis no diretório pai.
5. Em bundle/: MISSION_TEST_DATABASE_URL='postgresql://mission_qa@localhost:55479/mission_test_entitlements' MISSION_TEST_PGSOCKET="$(cat ../socket-path.txt)" node --experimental-strip-types test-entitlements.mjs
6. Na raiz QA: node concurrency.mjs. Executar sobre fixtures do teste-base, uma vez por banco novo (semanas de fixture fixas).
7. sh stop-postgres.sh.

Logs finais em logs/entitlements-real-pg.log e logs/concurrency-real-pg.log. Bundle de evidência não inclui banco, binários npm nem qualquer segredo.

## Complemento finalizer service-only

finalizer-concurrency.mjs: 4 passaram, 0 falharam. Licença e vínculo docente revogados durante espera no lock do draft impedem criar revisão. Duas finalizações simultâneas com mesmo draft/hash retornam a mesma revisão, mantendo apenas uma linha. Papel authenticated não pode chamar finalizer diretamente. Rodar `node --experimental-strip-types finalizer-concurrency.mjs` após demais testes.

Total final: 40 verificações passaram (25 integração + 11 concorrência geral + 4 finalizer), 0 falhas finais. Cluster novamente desligado após esse complemento.
