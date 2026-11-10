# Beta real somente leitura

O baseline `6dffdaf157af24f459c117a4904de9c2b2643407` foi publicado em `https://www.raizesesaberes.com.br/app/` em 9/11/2026; o acesso docente foi conferido pelo usuário. O candidato atual `feature/app-own-login` é local e ainda não foi publicado. A ativação de atalhos no site é separada: `app-pages.js` permanece byte a byte no baseline de produção `4e91990`, sem o atalho App; o empacotador beta recusa hash diferente. A cópia `platform` e o worktree `real-read-beta` continuam intactos.

## Build explícito e versão completa preservada

- `node scripts/build-app-web.mjs --read-beta` compila `EXPO_PUBLIC_REAL_READ_BETA=true` e exporta para `app/`.
- Sem `--read-beta`, o mesmo script força a flag a `false`, mesmo que o ambiente herdado a tenha ativado. Este é o comportamento completo anterior.
- A flag é constante de compilação. Query string, storage e configuração pública de backend não podem desativá-la em um bundle beta.
- `app/build-mode.json` identifica o modo. Uma reconstrução gera arquivos e hashes diferentes: rever manifesto do candidato exato antes de publicar.
- O build beta não carrega o runtime institucional de Missão. Bibliotecas oficiais usam o adaptador existente, sem catálogo demonstrativo.

## Escopo de interface

Mantidos AppShell, ExperienceHome, imagens, cards, ícones e navegação existentes. Banner visível antes e depois da autenticação: **Beta real · somente leitura**, com aviso de que a versão completa não está homologada.

Permitidos início, contexto/perfil próprio, biblioteca oficial, notificações e lista resumida de turmas do professor. A tela de perfil infantil usa `student_get_context`, não SELECT direto de `students`. A home docente usa `teacher_get_context`, não `teacher_get_home_summary`.

Agenda, Diário, comunicação, frequência, acompanhamento, atividades, missões, jogos, colorir, imprimíveis e detalhes fora da allowlist ficam indisponíveis antes de montar seus componentes. A mensagem orienta usar o botão Plataforma, que permanece disponível. Os cartões não fingem que essas funções já estão liberadas.

Agenda foi excluída inicialmente por um fallback de identificação por e-mail encontrado no catálogo. A correção por UID foi aplicada em uma frente anterior, assim como o perfil próprio. A Agenda continua bloqueada neste beta; a correção de backend não amplia a allowlist do App.

## Transporte e limites de segurança

A camada compartilhada bloqueia, antes de fetch, todo endpoint desconhecido, REST genérico, operações de progresso, RPCs de escrita e POSTs institucionais. Há uma segunda guarda no pedido autenticado direto de sessão. Só aceita origem configurada, método/caminho exatos e ausência de query/hash nos RPCs/Edge.

Allowlist RPC: `app_get_self_profile`, `student_get_context`, `teacher_get_context`, `teacher_list_classes_for_mobile`, `notification_get_center`, `teacher_get_notification_center`, `library_list_editions`. Edge: `library-edition-read-access` e `library-edition-search`. Auth permite validar usuário, login pelo grant exato de senha e logout explícito local. A Edge `student-institutional-login` é a única exceção adicional de acesso. O candidato local apresenta splash e login próprios, usa os contratos e as duas chaves oficiais de sessão da plataforma e não libera operações escolares de escrita. Detalhes e limites: `docs/app-own-login.md`. Emissão de URL assinada para leitura não salva progresso escolar.

**A flag não é autorização nem substitui RLS.** Um cliente é modificável. O banco e as Edge Functions devem aplicar autorização por UID, escola, turma, vínculo e conteúdo. A revisão de catálogo não é uma auditoria completa de RLS ou prova de login real. A dependência `app_get_self_profile` foi aplicada antes da publicação do baseline em 9/11/2026; a menção anterior de ausência era histórica. O novo login não modifica essa função.

As definições atuais dos RPCs permitidos presentes foram lidas somente em `pg_proc/pg_get_functiondef`. Não foram encontradas escritas diretas nesses corpos; notificações filtram destinatário por UID e a listagem docente resolve contexto por UID, sem o fallback de email da Agenda. Auxiliares de autorização imediatos da biblioteca e comunicação também foram inspecionados, sem executar as funções. Isso não substitui homologação de negação entre contas/escolas.

## Verificação local

- TypeScript (`mobile/node_modules/.bin/tsc --noEmit -p mobile/tsconfig.json`).
- 87 testes App, incluindo 5 testes negativos/de sessão beta, incluindo RPC genérico, REST, progresso, início de jogo, POST institucional, endpoint desconhecido/origem errada e tentativa de alterar a flag via query/storage. Transporte sintético conta zero fetch nos casos bloqueados.
- Sessão sintética valida Auth → perfil próprio → contexto, bloqueia publicação institucional, permite busca de edições e logout explícito.
- 20 regressões de Missão e o teste de histórico passaram separadamente.
- Export web beta e build estático de 5.559 arquivos concluídos. Os 47 hashes de App, adaptadores de Biblioteca e menu de produção conferem com dist. `git diff --check` sem erros.
- Chrome via CUA, iframe de 390px, fixture local externo ao produto: três perfis; home/layout e banner; Colorir indisponível antes de montar e retorno ao início; Biblioteca oficial lista e leitor da fixture, página 1→2; lista de turmas docente. Nenhuma conta/API real usada. Configuração de produção não foi servida pelo harness.

A lista acima documenta o QA histórico do baseline, antes desta alteração. O baseline foi publicado e o usuário conferiu o acesso docente. Não foram executados nesta frente: login real do novo formulário, Safari/iPhone físico, Android físico, autorização end-to-end entre contas/escolas ou publicação do novo candidato. O QA local inicial ficou bloqueado, mas após o usuário abrir o Chrome foi realizado o QA sintético de splash/login descrito em `docs/app-own-login.md`. Os fixtures e servidor de QA ficam fora do produto; não podem ser copiados para o deploy.
