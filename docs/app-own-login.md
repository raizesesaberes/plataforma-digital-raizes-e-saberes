# App Raízes: abertura e acesso próprios

Candidato local em `feature/app-own-login`, partindo do beta publicado `6dffdaf157af24f459c117a4904de9c2b2643407`. A Biblioteca docente foi integrada do commit `cc31bfd` (cherry-pick local `4c8b853`). Esta alteração não foi publicada nem enviada ao remoto. Plataforma, backend, RLS, contas, credenciais e menu público não foram alterados.

## Experiência

- A entrada hosted exibe a abertura com a marca do App em toda inicialização, inclusive com sessão existente. A animação não é usada como indicador fictício de progresso. A abertura é programada para cerca de 1,4 segundo; movimento reduzido usa 200 ms. A conferência real roda em paralelo, com limite de 15 segundos e cancelamento.
- O login usa a linguagem visual aprovada: fundo claro, verdes, logo, mensagem de acolhimento, layout móvel e composição em duas colunas no desktop. Não reutiliza a página de login da plataforma nem permite escolher o papel da conta.
- Campo único Login / E-mail, senha, exibir/ocultar, envio pelo teclado, foco no próximo campo, mensagens acessíveis, carregamento e cancelamento. Os campos usam 16 px para evitar zoom automático comum no Safari móvel. A senha é apagada após a tentativa, nunca registrada em logs nem persistida.
- O acesso infantil, fundamental/médio ou docente é confirmado pelo servidor. A ajuda explica o acesso escolar e encaminha recuperação/troca de senha ao fluxo já existente da plataforma. Não há cadastro, recuperação ou troca de senha paralelos.
- Expiração não renova tokens silenciosamente: bloqueia o conteúdo e apresenta novamente o login do App. A saída usa o encerramento local remoto existente e informa se ele não pôde ser confirmado.

## Contrato de autenticação

Email/senha usa `POST /auth/v1/token?grant_type=password`. O identificador institucional segue o formato existente de 2–12 letras, hífen e 4–8 dígitos, normalizado para maiúsculas, com `POST /functions/v1/student-institutional-login` e corpo `{login,password}`. Email é normalizado para minúsculas; a senha permanece exata.

A sessão candidata fica apenas em memória até cumprir todos os passos: expiração e identidade do token; `GET /auth/v1/user`; perfil próprio ativo em `app_get_self_profile`; vínculo em `teacher_get_context` ou `student_get_context`; correspondência de usuário/aluno e segmento. Código institucional não abre perfil docente. Claims/metadata não escolhem o perfil do App.

Somente então são gravadas as chaves oficiais `raizes:supabase-auth-session` e `raizes:supabase-access-token`, no schema consumido pela plataforma. Não há segunda sessão, token em URL, flag demonstrativa, senha em armazenamento nem backend novo. O campo `question_bank_role` permanece nulo neste fluxo, sem concessão de privilégios.

Se `password_change_required` estiver presente no token inicial ou no usuário fresco retornado por Auth, o App não concede acesso nem grava a sessão candidata: orienta continuar na plataforma, que já conduz a troca obrigatória. A regra também se aplica defensivamente ao login institucional.

Erro de credencial preserva os bytes da sessão anterior da plataforma, mas não exibe essa conta automaticamente no App. Nova tentativa, logout, troca em outra aba, cancelamento, timeout ou resposta tardia não podem ressuscitar uma identidade antiga. Um erro de gravação restaura apenas a chave auxiliar se esta ainda pertence à mesma tentativa. Logout bloqueia retomada automática em memória mesmo se armazenamento falhar, tenta remover cada chave e ainda solicita revogação remota. A interface distingue falha remota de falha em apagar a sessão e, neste último caso, orienta limpar os dados do site antes de recarregar ou voltar à plataforma. O bloqueio em memória não sobrevive a recarregar a página se o navegador impedir toda persistência. O cancelamento limita o trabalho do cliente; uma requisição já recebida pelo serviço pode ter emitido um token, mas sua resposta não é persistida nem concede acesso ao App.

## Beta permanece de leitura

A exceção mínima do transporte é a autenticação existente: grant de senha, Edge de acesso institucional e logout explícito local. Métodos/caminhos/query/origem são exatos. Signup, refresh, recovery, funções desconhecidas, RPCs de escrita e progresso continuam bloqueados. Agenda, diário, missões, Colorir, jogos e demais funções fora da allowlist continuam indisponíveis. Os testes negativos continuam exercitando esses bloqueios.

## Verificação e preview

- TypeScript: `mobile/node_modules/.bin/tsc --noEmit -p mobile/tsconfig.json`.
- App: `node --experimental-strip-types --test tests/app-web/*.test.mjs`.
- Histórico: `node tests/app-web/hosted-history-unit.cjs`.
- Missão: `node --test tests/mission-institutional/unit.mjs`.
- Build: `node scripts/build-app-web.mjs --read-beta`, `node scripts/prepare-app-manifest.mjs`, `node scripts/build-static-web.mjs`.
- Preview: `node tests/app-web/serve-own-login.mjs`, depois `http://127.0.0.1:58753/qa?width=390`. Aceita larguras 320/390/768/1280 e `&landscape=1`; perfil `professor/crescer/fundamental/medio`; cenários `login/existing/pending/timeout/password-change`.

O preview é explicitamente sintético: somente loopback, nenhum proxy, configuração real nunca servida, CSP `connect-src 'self'`. Fixtures externas ao manifesto de runtime usam `backend.invalid`, identidade fictícia e senha literal `synthetic-only`. Não é homologação de login real. Não inserir credenciais reais no preview.

## Resultado da verificação em 10/11/2026

- 127 testes App passaram, incluindo as regressões de login, logout, mudança de conta, flags obrigatórias, cancelamento, timeout e navegação. TypeScript, histórico e 20 testes unitários de Missão passaram.
- Export beta e empacotamento concluíram com 5.559 arquivos verificados. Menu, login global e configuração de backend preservam os bytes do baseline; nenhum fixture, teste, fonte ou screenshot entra em `dist`.
- Chrome local, via CUA, depois de o usuário abrir o navegador: login em 320/390/768/1280 px; largura medida sem overflow horizontal em 320/768/1280; splash com sessão existente; splash 768×360 sem cortes; formulário em landscape alcançável por rolagem.
- Fluxos observados: campos obrigatórios e foco; Enter de login para senha e envio; erro sem abrir conta; ajuda abrir/fechar; mostrar/ocultar senha; entrada docente e institucional infantil sintéticas; restauração de sessões docente/fundamental sintéticas; Biblioteca docente pelo cartão; Voltar/Avançar; saída para login; botão de entrada desabilitado enquanto pendente; cancelamento sem retorno tardio; bloqueio de Colorir no beta; troca obrigatória de senha sem liberar acesso. Console sem avisos/erros na leitura final.
- Screenshots em `qa/own-login/`: splash-390, splash-landscape, login-320, login-390, login-768 e login-1280, todos JPEG. São evidências sintéticas, não dados reais ou homologação autenticada.

**Limites restantes:** não houve login real do novo formulário, teste em Safari/iPhone/Android físicos ou teclado virtual. O sucesso sintético não comprova autorização end-to-end do backend entre escolas/contas. O primeiro acesso ao CUA ficou bloqueado; a conferência acima só começou após o navegador ficar disponível. Nenhuma rota alternativa de automação foi usada. A revisão independente e a eventual publicação são etapas separadas.
