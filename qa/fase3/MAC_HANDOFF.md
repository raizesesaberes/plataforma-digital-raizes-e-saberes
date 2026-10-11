> Atualização de compatibilidade: a autorização específica de instalação foi recebida. O fixture corrigido passou na integração com as barreiras atuais de produção ativas; ver [BOUNDARY_COMPATIBILITY.md](BOUNDARY_COMPATIBILITY.md) e `boundary-integration-verification.log`. SQLs aprovados inalterados. Os novos checkpoints exigem revisão e releitura antes de instalar. CLI oficial com versões exatas indisponível neste executor; handoff Mac permanece. Gates continuam OFF. As menções históricas abaixo a autorização pendente não anulam esta atualização.

# Handoff Mac — Auth local, navegação e pacote combinado

Estado: PR6 draft de integração, sem deploy. Gates de produção desligados. Não usar sessões, senhas, chaves ou dados reais. Não contornar o EROFS deste executor, alterar HOME, reparar ledger ou instalar bypass.

## 1. Fixar artefatos antes de testar

- Checkout normal da branch `review/fase3-integration-check`; registrar `git rev-parse HEAD` e `git status --short`.
- Conferir `INTEGRATION_REVIEW.md`, `COMBINED_RELEASE_PLAN.md`, `integration-functions.json` e log final.
- SHA256 SQLs: PR2 `de28fdb1726d50c1fbb04b0ae96fcf148f3c391562316485911167883d179389`; PR3 `23a45eb7ae85e8fb11b8605f983b07122028e63c508a8d1e6891b13a369028be`; PR4 `9819264bd71a61d90f522040405193c211ebad9fab39880a2748b503409341c1`; PR1 `938d444f542cbd3d739044271fa0e1d43c93b6e40508ba292cb946cde772f415`.
- Preflight proposto `combined_preflight_20261011060000.sql`: `d5c4c87c4edd30bc1713f6f254102b899be9cff5c6748414c17c26cbea34eeff`; somente revisão, ainda não executado.
- No macOS, usar `shasum -a 256` nesses arquivos. Divergência bloqueia a sequência até nova revisão.

## 2. Auth oficial em laboratório separado

Seguir [desenvolvimento local oficial Supabase](https://supabase.com/docs/guides/local-development) e [instalação da CLI](https://supabase.com/docs/guides/local-development/cli/getting-started). Usar Docker suportado e CLI oficial em diretório gravável no Mac. Primeiro `supabase --version`, `supabase --help` e `supabase start --help`; não adivinhar flags de uma versão diferente.

Criar diretório NOVO de laboratório fora do checkout ligado à produção, executar `supabase init` ali, conferir configuração e portas. Nunca executar `supabase link`, `db push` ou comandos com project-ref remoto. Antes de `supabase start`, restringir a rede/portas ao loopback conforme documentação oficial (`--network-id` com rede Docker vinculada a 127.0.0.1). Usar somente URL local confirmada.

O bootstrap atual `qa/fase3/bootstrap.sql` cria uma tabela auth.users mínima e NÃO serve para um Auth oficial. Não instalá-lo por cima do schema gerenciado pelo Auth. Preparar fixture própria que preserve o Auth local oficial, carregue somente o schema público/dependências necessários e os SQLs revisados, e crie identidades fictícias pela API administrativa LOCAL oficial. Nunca inserir senhas diretamente em auth.users ou copiar usuários reais. IDs de profiles/users/teachers/students/enrollments da fixture devem corresponder aos IDs retornados pelo Auth local. Somente papéis já previstos, em app_metadata conforme os testes; nenhuma expansão persistente de acesso.

Chave administrativa local só no processo de seed fora do navegador; não colocar em Expo, HTML, screenshots, commits ou logs. Chave pública e URL local podem configurar o build de laboratório. O teste precisa comprovar que TODAS as requisições ficam no laboratório; bloquear hosts externos no navegador de QA. Arquivos `.env` locais não são artefatos de entrega.

## 3. Testes que faltam

- Login real com usuário fictício, credencial inválida, perfil/role correto; logout e invalidação de UI; expiração/renovação da sessão local.
- Web: login.html → professor/aluno corretos → Avalia+ e recados → retorno/reload/logout. Repetir isolamento entre duas escolas.
- Expo: App.tsx real → login → AppShell real → avaliação/entrega/resultados e comunicação → perfil/logout. O harness não substitui esse teste de login.
- Gates somente no build/host QA isolado. Sem backend, interface deve falhar explicitamente e não mostrar sucesso fictício.
- Testes já disponíveis: `node qa/fase3/build-expo-preview.mjs` + `node qa/fase3/integration-run.mjs`; roteamento focado: `node qa/fase3/build-routing-preview.mjs` + `node qa/fase3/integration-run.mjs --routing-only`. Instalar dependências mobile com lockfile (`pnpm install --frozen-lockfile`); Chromium/Playwright conforme ambiente. Scripts atuais esperam `/usr/bin/chromium` e Docker com IP172 acessível no Linux: adaptar apenas o host de QA/porta loopback e caminho do navegador no Mac, revisar o diff, sem mudar runtime/Auth da app.
- iOS/Android e homologação visual humana continuam etapas separadas; não declarar publicação de apps.

## 4. Ordem/ledger de produção — somente após aprovação específica

Propostas ainda não reservadas: 20261011060001/fase3_assessment_authorization → 20261011060002/fase3_communication_replies → 20261011060003/fase3_notice_editing → 20261011060004/contract_operations. Não criar registros de ledger manualmente. Se a criação oficial das migrations atribuir outras versões, rever versões, nomes e hash do preflight como NOVO pacote antes de aplicar qualquer coisa.

Preflight inicial: histórico original149 exato, funções/ACL/GUC/proprietários e objetos ausentes. Checkpoints exigem original149 + somente os pares já aplicados. Antes do PR1:152 exatos, sete funções originais de contratos e15 proteções FASE3 preservadas. Após PR1:153 exatos e hashes finais aprovados. O preflight standalone PR1 continua149: NÃO usá-lo com override após registrar as três anteriores. A proposta combinada deve receber revisão específica antes de qualquer execução operacional.

## 5. Recuperação

Falha no laboratório: interromper somente os containers/projeto identificados como laboratório; consultar `supabase stop --help` antes de remover volumes. Preservar logs sem segredos e reconstruir a fixture descartável. Não tocar em containers de outro trabalho.

Falha parcial em futura implantação aprovada: manter TODOS os gates off, parar antes do próximo artefato, registrar quais transações/versões realmente concluíram e revalidar o estado por leitura. Não repetir SQL à força, apagar recibos/histórico, simular ledger, remover guards ou executar rollback destrutivo. Definir recuperação/reparo forward específico revisado a partir do estado observado. Os ensaios sintéticos não validam backup/restauração de produção.

## Autorizações separadas: instalação e runtime

**Instalação SQL ainda depende de:** revisão independente específica das quatro propostas, ACLs/policies/triggers e alcance administrativo; aprovação do preflight combinado e reserva dos pares versão/nome; leitura do estado real confirmando ledger/dependências/objetos esperados; plano coordenado de recuperação e responsável pela execução. Hashes fixados não substituem a leitura do estado. Nenhum override, ledger repair ou alteração Auth está incluído.

**Runtime/ativação dos gates ainda depende de:** confirmação dos recibos/checkpoints da instalação aprovada; revisão dos SHAs web/mobile a integrar; validação dos endpoints/roles no ambiente apropriado, login real e sessão na plataforma alvo; smoke dirigido com identidades de teste autorizadas; decisão coordenada de rollout por gate. Publicar código com flags desligadas é decisão diferente de ativar funcionalidades. Não ativar gates por inferência de que o SQL passou localmente. Apps nativos e homologação humana continuam separados.

A correção de fonte no servidor QA (manifesto local do export permitindo caminho `.pnpm`) não muda runtime, permissões de rede ou requisitos de Auth. Não replicar uma exceção genérica para dotfiles no servidor de produção.

## Manifests intermediários e pós-instalação entregues

`qa/fase3/manifests/index.json` fixa as fontes e os cinco checkpoints00–04 (antes, apósPR2, apósPR3, apósPR4, apósPR1), incluindo RLS/ACL/policies/colunas/constraints/índices/triggers de14 tabelas e46 funções finais. Usar as duas consultas readonly `package_metadata_readonly.sql` e `package_versions_readonly.sql` e o comparador offline descrito em `manifests/README.md`. Versões ausentes NÃO ficam reservadas por uma SELECT; coordenação/releitura é obrigatória. Não houve leitura/escrita do ledger remoto.

No laboratório Mac, mecanismo oficial escolhido é `supabase migration new` para os arquivos e `supabase migration up --local` para cada próxima etapa aprovada pendente, com pausa para checkpoint. Confirmar versão/help instalado e apenas a próxima etapa pendente. A execução remota permanece sem autorização específica; não usar repair ou include-all para contornar divergências. CLI EROFS neste executor permanece respeitado.

Gates de UI desligados NÃO bloqueiam RPCs instaladas e concedidas ao papel authenticated. A instalação já altera superfície de backend: aprovação de ACL/escopo/SQL deve ocorrer ANTES dela. Ativação do runtime, login/refresh real, smoke no ambiente alvo e validação nativa são decisões/testes separados.
