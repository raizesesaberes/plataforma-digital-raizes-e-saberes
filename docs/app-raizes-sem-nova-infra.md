# App Raízes usando a infraestrutura existente

Plano revisado em 2026-11-09 após o usuário perguntar por que seria necessário adicionar custo se já existem Supabase, Vercel e GitHub do app.

## Resposta

Não é necessário contratar outro projeto para o App Raízes funcionar. A integração foi desenhada para usar o backend atual e abrir `/app/` no mesmo domínio da plataforma, com login, vínculos e licenças existentes. A branch Supabase paga era uma opção de isolamento de testes, não requisito do produto. A preferência atual é reaproveitar infraestrutura existente, sem criar instância, assinatura ou credencial adicional sem autorização.

Reutilizar recursos existentes evita novo custo fixo de provisionamento. Não equivale a prometer consumo gratuito ilimitado: builds, tráfego, armazenamento e consultas continuam sujeitos ao plano contratado.

## Recursos já confirmados

### GitHub/Vercel

- Repositório `https://github.com/raizesesaberes/plataforma-digital-raizes-e-saberes` já contém o código da plataforma/mobile.
- Existem Vercel `app-raizes-e-saberes` (`prj_ErvEo0crji7MrJrq19ebw2py8QPK`), `plataforma-digital-raizes-e-saberes` e `raizes-e-saberes-app-preview-bc0b188`. Não é preciso criar outro projeto frontend.
- O deployment recente do projeto App aponta ao mesmo repositório, branch histórica `review/mobile-avalia-data-compat`, SHA 620b8428. Isso não prova que o `/app/` atual esteja publicado.
- A fonte isolada atual, com build/manifesto revisados, está na branch local `feature/app-raizes-web`; sessão segura em e4a485e, com ajuste Colorir4e91990 incorporado localmente em2a02c74. Não houve push/deploy desta frente.
- Configuração completa de build/root/output dos projetos Vercel não foi exposta pela API consultada. Confirmar o destino/build antes de publicar preview. Preservar as proteções SSO existentes; não criar bypass público.
- Projetos/domínios Vercel diferentes não compartilham localStorage. Para testar sessão real, servir o login central e `/app/` no mesmo preview. Na entrega definitiva, manter `/app/` na origem da plataforma. Não transportar tokens entre domínios.

### Supabase atual

Há três projetos acessíveis, todos ativos, na organização atual Pro. Nenhum quarto projeto dedicado ao app apareceu; o backend da plataforma já contém os contratos mobile.

1. Produção `jaesjldrbjbdmzzggxzw`: manter intacta nesta preparação. Contratos principais FASE3 instalados, mas dependências posteriores exigem homologação do estado atual, não cópia cega de baseline antigo.
2. `RS-SCHOOL-TEMPLATE-V1-VALIDATION`, ref `fpzvkyoxsnhxalibdqpm`: candidato menos invasivo para reaproveitar. 51 tabelas públicas; somente document_types tem 6 registros, demais 50 vazias. Tem 1 conta Auth, 55 funções, 18 triggers e Edge ativa `library-search-runtime-check`. Sem buckets/objetos, cron ou foreign server na inspeção. Não é banco vazio nem descartável. RPCs centrais do app/Missão ainda ausentes.
3. `VALIDATION-2`, ref `khtnlmsoytshnrypevcs`: preservar. Possui escola, turmas, docentes, alunos, responsáveis e vínculos. Somente contagens foram consultadas; não foi determinado se os registros são fictícios ou operacionais.

## Plano exequível sem nova instância

### Etapa 1: continuar sem mudar serviços

- Manter código e QA na cópia isolada já existente.
- Testes sintéticos locais de UI/serviços, revisão dos contratos/ACLs por consultas de metadados e build com allowlist.
- Usar o GitHub existente para a próxima branch de revisão e um Preview do projeto Vercel existente, quando a publicação de preview estiver autorizada. Sem alterar produção ou proteção de acesso.
- Se o preview apontar para produção, limitar QA a leituras realmente sem efeito. Abrir atividade, marcar leitura, salvar progresso ou inicializar tentativa pode escrever; não tratar esses fluxos como somente leitura pelo nome da tela.
- Não apresentar QA sintético nem preview frontend como prova de login/RLS/gravação autenticada real.

### Etapa 2: aproveitar VALIDATION existente para testes com gravação

Depois de confirmar que o primeiro VALIDATION pode receber homologação do App:

1. Registrar schema e trabalho existentes, preservando conta Auth, tipos de documento e Edge Function. Não apagar/substituir por inferência.
2. Comparar estrutura atual com contratos necessários do app. Produzir delta aditivo e testes de migração; o template difere da produção. Não aplicar automaticamente o baseline de recuperação sobre tabelas existentes.
3. Auditar dependências externas da Edge existente sem acionar serviços externos. Não copiar segredos, SMTP/OAuth ou integrações de produção para os testes.
4. Configurar somente o preview para o backend VALIDATION após conferir ref/origem. Manter login e `/app/` no mesmo domínio de preview.
5. Preparar escola, turmas e identidades fictícias dos três perfis. Obter confirmação apropriada para criar/configurar contas e acesso persistente; senhas em fluxo seguro, nunca em chat/repositório.
6. Homologar sessão, RLS, licenças, leituras/gravações e dispositivos físicos. Somente depois coordenar liberação no domínio definitivo.

O usuário autorizou reutilizar o que for necessário na estrutura existente. O alvo conservador selecionado é `RS-SCHOOL-TEMPLATE-V1-VALIDATION`, preservando o trabalho existente. Alterações de autenticação ou criação de acesso persistente continuam exigindo aprovação específica. Não é uma solicitação para contratar nova branch paga.

### Alternativa: testes controlados no backend atual

O app final pode e deve usar o backend já contratado. Testar gravações no mesmo banco exige primeiro um conjunto de contas/escola/turmas fictícias claramente autorizado e isolamento verificado. Mesmo com tenants separados, migrations, policies, funções e integrações continuam compartilhadas. Isso não tem o isolamento de um backend de homologação e não está autorizado nesta etapa. Não usar alunos reais nem criar registros de teste em produção automaticamente.

### Alternativa local completa

A suíte atual de 40 testes App, histórico, 20 unitários Missão e QA Chrome sintético já roda sem nova hospedagem. Uma stack Supabase/Auth local completa exigiria runtime apropriado; Docker e Supabase CLI não apareceram no PATH do iMac nesta inspeção. Não instalar/ativar ferramentas nem abrir rede/túnel por inferência. Localhost do iMac também não é um endereço acessível automaticamente pelo Safari do iPhone.

## Limitações atuais preservadas

- Sem novo endereço real do App liberado, push/deploy ou alterações remotas nesta preparação.
- Avaliações, respostas e edição de avisos permanecem com flags desabilitadas até testes no contrato atual.
- Diário permite rascunho na implementação isolada; fechamento continua bloqueado pela ausência de revisão otimista no contrato atual.
- Safari/iPhone e Chrome Android físicos, login real e persistência isolada pendentes.
- Histórico dos subpassos internos do Colorir exige ampliação do contrato público de navegação; não foi simulado por DOM.

## Inspeção realizada

Somente metadados e contagens agregadas do Supabase, propriedades sanitizadas Vercel, referências Git e arquivos locais. Nenhuma identidade/credencial de usuário consultada; nenhuma criação de conta, chave, projeto, branch de banco ou alteração de schema/permissão/produção. Fonte no iMac foi verificada novamente em 32fbe8e, limpa antes deste documento.

## Continuação confirmada

Após esclarecimento, o usuário autorizou reutilizar ou substituir apenas o necessário. A opção preparada é aditiva, sem apagar banco/conta/Edge nem substituir o App publicado. Aprovação visual não equivale à homologação autenticada ainda pendente.

A chave pública publishable já existente do primeiro VALIDATION foi obtida pelo conector, sem criação de credencial. A configuração local de teste fica fora do checkout público. `prepare-app-validation.mjs` só aceita o artefato compilado em dist, o alvo VALIDATION exato e ambiente preview (ou teste local explícito); recusa ambiente production e preserva a configuração-fonte. Testes negativos incluem destino errado, chave legacy de outro projeto, symlink/hardlink e rollback de falha de empacotamento. Nenhum deploy ocorreu.

Configuração pública do Auth verificada sem login: email habilitado, confirmação por email exigida, anonymous desabilitado. Não mudar essas opções. Contas sintéticas precisam de um fluxo administrativo autorizado de criação/confirmacão, ou emails de teste controlados com confirmação; não reutilizar a conta existente desconhecida e não inserir auth.users manualmente.
