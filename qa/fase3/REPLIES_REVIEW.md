# Respostas a comunicados — proposta separada da correção de segurança

Branch `review/fase3-communication-replies`, derivada de `review/fase3-synthetic-journeys` (inclui a correção de snapshots de PR2). Não contém FASE2. SQL novo somente em `supabase/review/fase3_communication_replies.sql`; não aplicado em produção.

## Fatia implementada

Aviso publicado pelo fluxo existente → destinatário abre respostas → envia texto → professor abre conversa do destinatário e responde → aluno recarrega e vê retorno persistido. Web: após ativação coordenada, professor, aluno e família recebem o botão “Ver respostas / Responder”; notificações automáticas com source_type não recebem o botão. Cada conversa pertence a uma entrega individual: nem colegas da mesma turma veem a conversa alheia.

O componente usa RPCs reais; não salva respostas em localStorage nem em fixtures. Em falha de envio mantém o texto e permite repetir com a mesma chave idempotente. Só mostra “Resposta enviada” após confirmação do servidor. Se salvar funcionar mas a atualização da conversa falhar, informa envio concluído e pede reabrir, evitando reenviar involuntariamente. Texto é renderizado por textContent, sem HTML do usuário.

## Backend proposto e revisão necessária

Nova tabela `communication_replies` com RLS habilitada e sem grants diretos a anon/authenticated/service_role. Três RPCs permitem listar conversas do autor/gestão autorizada, consultar uma entrega autorizada e enviar resposta. Helper em schema privado, sem EXECUTE de aplicação. Os três novos EXECUTEs authenticated são novos pontos de acesso e precisam da revisão específica antes de produção. Não houve modificação de usuários, senhas, Auth ou importação.

Autorização revalida a entrega e o aluno específico dela, sem reutilizar a permissão agregada de leitura por qualquer filho. Exige perfil ativo, comunicado publicado/não retirado/não vencido, mesmo school_id da entrega e comunicado. Destinatário não lista outros destinatários. **Alcance administrativo:** `secretaria_can_manage_school` também permite gestores de escola/rede e administradores canônicos ler e enviar respostas; não é uma conversa exclusiva professor–destinatário. Não foram adicionados papéis ao helper canônico. Esse alcance aparece no modal e precisa de confirmação específica junto com os novos RPCs antes de produção. Respostas a notificações automáticas estão bloqueadas. Lock compartilhado no comunicado serializa o envio com retirada/exclusão. Chave única por entrega/autor/request_id evita duplicação; reutilizar chave com outro texto é erro.

Retirada/vencimento impede leitura e envio nesta primeira versão; republicar recupera a conversa. Não há edição/exclusão de respostas, anexos, notificações push/e-mail ou confirmação de leitura de cada resposta. A leitura existente continua referindo-se ao aviso original, não às respostas.

## Evidências e limites

- `node qa/fase3/run.mjs`: **27 PASS / 0 FAIL** nesta branch. Engloba os 24 casos de PR2 e três grupos de respostas/API/navegador.
- Paridade readonly: 12 funções da segurança + 6 dependências de comunicação, com hash/assinatura/ACL/GUC conferidos localmente antes dos testes. `reply-production-parity.json` e `local-parity.json`.
- API: conversa aluno→professor→aluno, idempotência, isolamento contra outra escola e contra colega da mesma turma, matrícula encerrada, parâmetros nulos, mensagem vazia, chave conflitante, ACL de tabela, retirada/republicação/vencimento.
- Chromium instalado no executor, via Playwright: componente real + renderer real do card do aluno, hospedados em página sintética com CSS real; backend PostgREST real isolado. Testa falha HTTP503 antes de salvar e perda da confirmação HTTP depois do commit, fechar/reabrir modal e repetir sem duplicar, resposta do professor, recarregar persistência, texto com markup sem execução, bloqueio da outra escola e largura de 390px sem overflow. `replies-browser.png` é evidência desse componente, não homologação visual da aplicação completa.
- O download adicional de Chromium retornou 403; não foi contornado. Foi usado o Chromium já instalado em `/usr/bin/chromium`. Para reproduzir, disponibilizar Playwright e Chromium nesse caminho; o teste falha se não estiverem disponíveis, não faz skip silencioso.
- `node --check app-pages.js`, `node --check communication-replies.js`, `git diff --check`; build **4275 arquivos**, operacional/SQL fora do dist.

A jornada avaliação docente→aluno→resultado permanece validada ponta a ponta na API sintética e pelo adaptador real de montagem web. Não se alega homologação completa das telas Avalia+.

## Desenvolvimento separado ainda necessário

O app Expo continua sem publicação/resolução/entrega reais de avaliação e sem resultados docentes preenchidos. A nova conversa ainda não foi portada para Expo: não declarar paridade web/app. A rota de família ganhou affordance condicionada ao gate; os dois modelos de vínculo e múltiplos filhos foram exercitados na API, sem navegação completa autenticada da família. Edição do aviso original também continua bloqueada/ausente na rota inspecionada. Estes pontos não são placeholders “prontos”: são pendências para próximas fatias.

Manter os PRs rascunhos. Revisar SQL primeiro e coordenar aplicação/backend + runtime; nenhum merge/deploy foi executado. Não publicar apenas a UI contra produção sem os RPCs aprovados.

## Correções após revisão independente

- Destinatário com `student_id` precisa ter vínculo com **aquele aluno**, matrícula atual na escola/escopo do comunicado e aluno ativo. Legado `student_guardians`: status ativo. Modelo institucional: `student_guardian_links.status=active`, `guardians.status=active`, `access_status=active`, profile e escola correspondentes. Bloqueado/não configurado não concede acesso. Os modelos não têm coluna de vencimento do vínculo; os testes de vencimento/futuro usam a matrícula.
- Professor autor precisa de registro docente ativo e autorização canônica para a turma. Perfil ativo sozinho não basta. Destinatários de equipe docente também exigem docente ativo. Gestão continua no escopo canônico descrito acima.
- Listagem do professor inclui `student_id` e `student_name`, e o botão mostra o aluno, distinguindo irmãos do mesmo responsável. Não muda destinatários nem readtracking do aviso original.
- SQL agora recusa deriva das seis funções de comunicação observadas (corpo, assinatura, configuração, ACL e EXECUTE). Isso não é certificação de todo o esquema. Nenhuma fixture deve ser instalada em produção.
- Chave/texto de envio incerto são mantidos em memória, separados por usuário e entrega, até confirmação. Fechar/reabrir modal reutiliza a chave; confirmação remove o pendente. Não há persistência do rascunho após recarregar a página: após reload, conferir a conversa antes de redigir um novo envio. Não se afirma deduplicação semântica de textos iguais enviados como novas mensagens.
- Gate de rollout **desligado por padrão**: `globalThis.RAIZES_COMMUNICATION_REPLIES_ENABLED` deve ser explicitamente true para renderizar botões/ativar o componente. Somente o host sintético ativa nesta branch. Ativação real depende de revisão/aplicação do backend e confirmação do alcance administrativo; este PR não faz deploy.

Regressões: dois filhos na mesma turma, revogação de apenas um vínculo mantendo o outro, geração de entregas com modelo novo sem legado ativo, vínculo/guardião/acesso inativo, escola errada, matrícula vencida/futura, aluno/professor/perfil inativos, nome do aluno por conversa, acesso administrativo explícito e repetição após commit com confirmação perdida.
