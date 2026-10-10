Avalia+ — compatibilidade de dados mobile (revisão, sem publicação)

Base: main 722d822d832d68041bb9564839a8dfc1980255b4.
Branch de revisão: review/mobile-avalia-data-compat.

Executar na raiz com Node 24 já disponível:
  node --test mobile/tests/assessment-compatibility.test.mjs

32 casos sintéticos, sem rede, Expo, dados reais ou credenciais reais. O teste
integra o serviço library.ts real com o adaptador e um fetch simulado; não chama
Supabase. O stripping nativo de TypeScript NÃO substitui typecheck.

Contratos conferidos no código SQL existente:
- supabase/baselines/20261004_pilot_schema_baseline.sql:
  student_list_assessment_assignments retorna assignments.id = atribuição;
  assessment_id identifica a avaliação, que pode ter várias atribuições.
  attempts traz as colunas de assessment_attempts (to_jsonb), incluindo
  assignment_id, score_percentage, status, responses; ordem started_at DESC.
- assessment_attempts_status_check contém in_progress, submitted, graded,
  cancelled e expired. O prazo expirado pode ter nota finalizada ou ainda null.
- Não houve consulta ao banco remoto nem alteração de contrato/backend.

Correções:
- score_percentage -> scorePercent, preservando zero e ausência de nota.
- Tentativas associadas somente pelo assignment_id, preservando a ordem do RPC.
  Linhas sem identidade de atribuição não usam assessment_id como identidade.
- graded/concluída, expired/expirada e cancelled/cancelada são estados terminais,
  mesmo com respostas. O grupo existente passa a Encerradas, com o mesmo ícone.
  Sem nota: não anuncia resultado disponível. Cancelamento nunca o anuncia.

Layout, estilos, imagens, tema e estrutura das três seções foram preservados.
Mudanças de apresentação são rótulos e classificação de dados; sem nova tela,
endpoint, execução de prova ou publicação docente. A declaração de estado FROZEN
no README é respeitada fora desta correção explicitamente autorizada.

Validação em 10/10/2026 (ambiente isolado):
- pnpm install --frozen-lockfile --ignore-scripts --store-dir
  /workspace/mobile-avalia-dependency-store --registry=https://registry.npmjs.org
  concluído; repetição confirmou Already up to date. Scripts desativados.
- pnpm run typecheck: PASS; 32/32 testes de contrato: PASS.
- Lockfile preservado, SHA256:
  190d91b072a28840391a0185add7756d0f1726966fa5544fe5777fab1ed96169.
- Expo export web: PASS, 414 módulos, 56 assets. A validação inicial usou
  NODE_PATH temporário; a correção posterior declara babel-preset-expo 57.0.11
  diretamente e permite exportar sem NODE_PATH, mantendo o CLI local.
  EXPO_NO_DOTENV=1 e EXPO_NO_TELEMETRY=1; URL/chave compiladas são sintéticas.
- Chromium/Playwright: quatro cenários (390x844 e 834x1112 com lista mista;
  celular com lista vazia e erro RPC) com todas as chamadas de dados simuladas.
  Estados e ações por cartão, identidades independentes, ausência de overflow
  horizontal e ausência de erros de execução conferidos. Nenhum acesso remoto.
- Evidências e runner: /workspace/mobile-avalia-compat-evidence/render.cjs,
  render-results.json e capturas PNG. As capturas closed mostram a área rolada.
- A listagem não exibe nota numérica; o zero é validado no contrato e pela ação
  Resultado disponível. Não se afirma exibição visual do número zero.

Limites: sem build ou execução nativa Android/iOS, dispositivo físico,
provisionamento real ou homologação em produção. Validação anterior ao commit;
publicação em produção permanece fora do escopo.
Correção de build: babel-preset-expo 57.0.11 agora é dependência direta de
desenvolvimento. O lockfile só adiciona seu importer, reutilizando o snapshot
existente; nenhuma versão transitiva mudou. Instalação congelada/offline e
scripts desativados passaram. Build sem NODE_PATH usa:
  EXPO_NO_DOTENV=1 EXPO_NO_TELEMETRY=1 CI=1 node node_modules/expo/bin/cli export --platform web
As duas EXPO_PUBLIC_SUPABASE_* devem vir da configuração pública existente do
projeto app-raizes-e-saberes; nunca publicar o artefato de fixtures sintéticas.

Oportunidades para a próxima etapa visual (não implementadas): rótulos de leitor
de tela combinando contagem/estado nos resumos; conferir truncamento com fonte
ampliada e distinção visual dos estados terminais. Medir no app e registrar
antes/depois antes de alterar estilos, dimensões ou contraste.

Revisão adicional: lista mista preserva ordem e cada atribuição válida aparece
em exatamente uma seção. Limite preexistente: o RPC filtra atribuições para
status published e janela vigente; não é um histórico de closed/archived.
