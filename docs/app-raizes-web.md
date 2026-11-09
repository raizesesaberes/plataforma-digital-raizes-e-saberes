# App Raízes: integração web móvel real

Estado de 9 de novembro de 2026: implementação isolada, não publicada. Não há endereço real liberado. A prévia privada antiga continua sendo uma demonstração e não faz parte desta entrega.

## Entrega preparada

- Export do app Expo existente em `/app/`, no mesmo domínio HTTPS da plataforma. Não usa uma moldura/iframe em produção nem um segundo cadastro.
- Comando **App Raízes**, com ícone SVG e alvo de toque, nos shells elegíveis da plataforma. A plataforma tradicional continua disponível.
- Entrada `hosted-entry.tsx` independente do preview. Sem seletor de perfil, dados demonstrativos ou token em URL. Aluno infantil, aluno fundamental/médio e professora são determinados pelo servidor.
- Sessão existente validada em Auth, perfil ativo, papel e vínculo institucional antes de abrir o app. Guardas cancelam resultados antigos, bloqueiam troca de usuário, expiração, negação do servidor e logout. Revalidação mantém a tela/draft da mesma conta; requisições aguardam a confirmação. Nenhuma credencial nova foi criada ou persistida.
- Login central com retorno interno para `/app/`. Saída remove somente as chaves conhecidas da plataforma e solicita encerramento remoto. Se a confirmação remota falhar, a interface informa isso.
- Missão, Colorir e Imprimíveis reutilizam o runtime institucional e seus RPCs/permissões. Colorir solicita `discoveryLayout:'themes'`; a plataforma pode manter o hub legado.
- Agenda e avisos dos alunos usam os serviços reais e o objeto selecionado, sem lookup por título ou fallback fictício. Rotas hosted têm allowlist por papel, impedindo acesso a telas antigas com fixtures.
- Histórico Voltar/Avançar, Início e retorno à plataforma, guardas de saída e controles SVG. Nenhum service worker ou cache privado foi criado.
- Fonte mobile preservada no checkout `platform/mobile`, artefatos estáticos em `platform/app`, scripts e manifestos com SHA-256. Somente a allowlist estática entra em `dist`.

## Fontes e isolamento

Fonte de produção: `https://github.com/raizesesaberes/plataforma-digital-raizes-e-saberes`, branch `preview/student-library-unified`, base `132da48959b5dd9614f11afbcac704747ff1596f`.

Checkout de trabalho: `platform`, branch `feature/app-raizes-web`. É uma cópia isolada; app original, produção, bancos, licenças, Site privado e lojas não foram alterados. Colorir foi conciliado localmente com os commits 2fcea36 e 4d85baf. Isso não atesta promoção desse SHA em produção.

## Verificação realizada

- TypeScript da fonte integrada passou.
- Export web `/app/` e build estático com hashes passaram: 42 arquivos do app, 5.558 arquivos totais após integrar Colorir.
- 40 testes atuais de sessão, rotas e diário passaram, além da suíte de histórico. Os 14 testes do protótipo inicial também passaram anteriormente, mas não substituem os testes do código integrado.
- Matriz de allowlist de rotas por papel passou; nenhuma rota de demonstração é exposta pela entrada real.
- Chrome local, com transporte integralmente sintético e sem acesso ao backend: home dos três perfis, Missão institucional, seleção de turma docente, agenda com dois títulos iguais e detalhe correto, avaliação indisponível explícita, saída removendo conteúdo privado, Voltar básico e ícones SVG.
- Layout em 320 e 390 pixels: sem overflow observado, ícones SVG visíveis; 320px mediu scrollWidth 320 e nenhum caractere de fonte privada. São viewports no Chrome, não dispositivos físicos.
- Corrigido e retestado o primeiro toque após foco/revalidação. Sem erros ou avisos no console na rodada final.
- Arquivos de QA ficam fora do pacote runtime. O servidor local só escuta loopback, serve configuração falsa e bloqueia chamadas externas.

## Limitações e bloqueios concretos

1. **Não houve homologação autenticada real.** Não existe banco de teste isolado preparado. O preview automático da plataforma aponta para Supabase de produção e não pode receber registros fictícios. Faltam contas autorizadas de teste e confirmação de contratos/RLS/licenças nos três perfis, incluindo negativas entre escolas/turmas e persistência.
2. **Paridade funcional não está concluída.** Avaliações, respostas de comunicação e edição de avisos continuam com flags desabilitadas. O diário agora permite rascunhos com revisão esperada e releitura; o fechamento continua indisponível por ausência de revisão otimista no contrato atual. A interface não simula sucesso dessas funções. É necessário integrar/homologar esses fluxos antes de anunciá-los como disponíveis.
3. **Renovação de sessão não foi implementada.** O app não gira refresh tokens nem disputa a sessão entre abas. Ao expirar, bloqueia e encaminha ao login central. Logout remoto pode falhar por rede e isso é informado.
4. **Safari/iPhone e Chrome Android físicos pendentes.** Validar teclado, safe-area, orientação, pintura por toque, impressão/download, upload, rede interrompida, retomada, voltar/avançar e confirmação de saída. QA local não comprova compatibilidade real nesses dispositivos.
5. **Publicação e lojas pendentes.** Nenhum deploy/push realizado por esta frente. Não há PWA offline, push, APK/IPA ou integração com lojas nesta entrega.

## Reprodução

Com dependências do `mobile/pnpm-lock.yaml` disponíveis, no checkout `platform`:

1. `cd mobile && npm run typecheck`
2. `node --experimental-strip-types --test tests/app-web/web-session*.test.mjs` (a partir da raiz; Node com suporte a strip-types)
3. `node scripts/build-app-web.mjs` (restaura package.json/app.json ao terminar, sem variáveis de backend no bundle)
4. `node scripts/prepare-app-manifest.mjs`
5. `node scripts/build-static-web.mjs`

O build estático existente continua usando artefatos allowlisted; não instala/executa Expo no servidor de produção. Não publicar este checkout sem conciliar o último SHA da plataforma e concluir os itens de homologação acima.

## Próximo passo seguro

Revisar o diff final e preparar ambiente/contas isoladas de homologação. Só após a matriz autenticada e os testes móveis pode-se coordenar a inclusão do comando e do endereço real no domínio da plataforma. A rota prevista é `/app/`, mas ainda não é um link de entrega verificado.

## Continuação autorizada

A integração continua em trabalho. A consulta somente leitura do catálogo Supabase confirmou que os projetos VALIDATION existentes são templates sem os contratos do app e não devem ser sobrescritos por inferência. Preparar roteiro e orçamento de uma branch sem dados da produção; não criar ambiente, credenciais nem contas antes da autorização apropriada.

Consulta de metadados atual encontrou as quatro versões FASE3 no ledger. O upsert atual do diário preserva vínculos com null e aplica If-Match; a preocupação do baseline antigo não descreve a definição atual. Hashes/ACLs e adaptação mobile continuam em verificação. Flags permanecem desligadas até homologação.

## QA final desta etapa

Build integrado com 5.558 arquivos, TypeScript, 40 testes App, suíte de histórico e 20 testes unitários da Missão passaram. Chrome local sintético em390px: abriu Diário, bloqueou Voltar com alterações não salvas e deu feedback, salvou rascunho via adaptador real com transporte simulado, confirmou releitura e permitiu retorno. Em320px: agenda com títulos iguais abriu o segundo registro correto; Voltar retornou à lista e Avançar ao mesmo detalhe. Logout removeu conteúdo; console sem erros/avisos. Nenhuma chamada a backend real. Servidor QA e aba encerrados ao terminar.

Limitação de navegação restante: Colorir dentro de /app usa seus controles internos de tema/desenho; integrar esses subpassos ao histórico do navegador requer ampliar um contrato público de leitura/restauração de navegação no runtime. Não foi usado acesso por DOM ou cliques sintéticos para simular esse contrato.
