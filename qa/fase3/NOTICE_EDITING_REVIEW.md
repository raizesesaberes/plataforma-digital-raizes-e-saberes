# Edição versionada de avisos — revisão separada

Branch `review/fase3-notice-editing`, dependente de PR3 e PR2 atualizados. Não contém contratos/FASE2. SQL em `supabase/review/fase3_notice_editing.sql`, **não instalado em produção**. Os três novos EXECUTEs authenticated, duas tabelas e coluna de versão precisam de revisão específica. Nada altera Auth, senhas, importações ou turmas reais.

## Jornada e autorização

Professor abre “Editar / Ver versões”, lê a versão atual, altera título/texto e salva via RPC real. O destinatário abre “Ver versão / Confirmar leitura”, consulta a versão e o histórico, e confirma explicitamente a leitura daquela versão. Reabrir consulta o servidor; não há persistência simulada em estado local.

`communication_edit_notice` permite autor docente ativo com autorização canônica da turma ou gestão autorizada por `secretaria_can_manage_school`, sempre com perfil ativo. O alcance de gestão inclui escola/rede e administradores canônicos e requer confirmação conjunta antes de produção. Apenas comunicados manuais publicados/ativos podem ser editados. Rascunhos, retirados, excluídos, vencidos e notificações automáticas não são editados nesta fatia.

O RPC não aceita alterações de destinatários, turma, escola, tipo, data/vencimento, status, links ou anexos. Não chama geração de entregas. O preflight fixa seis dependências observadas e o helper de respostas revisado do PR3; recusa triggers de usuário inesperados na tabela de comunicados. Isso não é atestação completa do esquema.

## Histórico e leituras

- `content_revision` começa em 1. Na primeira edição, guarda o texto vigente e a evidência de leituras legadas da versão inicial. Não reconstrói alterações anteriores à instalação.
- `communication_revisions` guarda título, texto, editor, timestamp e chave da alteração; não apaga respostas nem as leituras anteriores.
- `communication_revision_reads` registra confirmação explícita por entrega/versão. A leitura legada do aviso continua existindo; não significa leitura da versão editada. A interface explica a distinção e o modal docente mostra a contagem confirmada da versão atual.
- Um destinatário precisa continuar autorizado para o aluno específico da entrega, pelos guards do PR3, para consultar texto/histórico e confirmar leitura. O autor/gestor pode consultar; não pode confirmar leitura em nome do destinatário.
- Lock da linha do comunicado serializa edição com retirada e novas confirmações. Uma confirmação de versão obsoleta é rejeitada. Duas edições concorrentes da mesma versão não se sobrescrevem: uma vence e a outra recebe conflito.
- Chave idempotente por comunicado/editor permite repetir uma edição com confirmação HTTP perdida. Reutilização com conteúdo diferente é rejeitada. UI retém payload incerto somente em memória e o reaproveita ao fechar/reabrir. Recarregar a página não recupera rascunhos.

## Gate e integração

`globalThis.RAIZES_NOTICE_EDITING_ENABLED` é falso por ausência. Apenas o host de teste o ativa. Botões e componente permanecem desligados até revisão/aplicação do backend e ativação coordenada. Não instalar fixtures de QA. Script adicional: `notice-editing.js`, carregado em professor/aluno/família. Três inserções pequenas no renderer existente; visual geral preservado. Após salvar, o servidor confirma a versão; reabrir consulta o histórico e recarregar a lista atualiza os cartões existentes.

## Evidência e limites

`node qa/fase3/run.mjs`: **29 PASS / 0 FAIL**. Suite PostgreSQL17/PostgREST isolada, incluindo edição → histórico → destinatário → confirmação da versão → contagem docente; entregas e respostas preservadas; conflito concorrente; reenvio idempotente; rejeição de outros perfis/escolas, docente inativo, retirado/vencido, conteúdo inválido e acesso direto às tabelas.

`notice-browser.mjs`: Chromium instalado, componente real em host sintético com API real. Simula commit seguido de HTTP503, fecha/reabre e repete sem gerar versão extra; destinatário lê/confirma e recarrega; histórico preservado, markup tratado como texto e outra escola negada. Não é teste completo de navegação de todas as páginas nem homologação humana/nativa.

Expo continua pendente: não afirmar paridade web/app, publicação de app nativo ou conclusão integral da FASE3. Nenhuma mensagem externa, dado de aluno real, deploy ou alteração de main.

Verificações adicionais: `node --check` nos scripts alterados, `git diff --check`; build estático com **4276 arquivos**, QA/SQL fora do dist. Conflito usa `PT409` explícito: o código genérico de serialização provocava repetição no PostgREST, comprovada pela regressão que antes não concluía e agora recebe HTTP409. Novas funções usam JIT desativado e chamadas sintéticas têm limite de 30 segundos para não mascarar travamentos.

## Correção incremental de estado nas listas

Com o gate ativo, o carregamento da caixa busca a versão autorizada antes de mapear/renderizar: a partir da versão 2, `readAt` e o estado LIDO/NÃO LIDO refletem o recibo dessa versão. O contador deriva dos avisos efetivamente carregados na lista (limites existentes de 50/60), sem reaproveitar o total legado do RPC. Filtros por leitura são aplicados após essa reconciliação. Falha ao consultar versões mostra erro, não uma lista falsamente lida. Os atalhos de leitura legada não aparecem para versões editadas; confirmação é feita no modal versionado.

Sumários docentes usam o contador da versão atual. Se a versão não estiver acessível (por exemplo, aviso retirado), mostram Indisponível, sem fabricar zero nem apresentar leitura histórica como atual. Ao fechar o modal após salvar/confirmar, a página recarrega dados do servidor. O SQL não mudou.

Regressão adicional usa os **renderers e mappers reais**: ler versão 1 → editar → cartão NÃO LIDO/versão 2 e contador pendente → confirmar versão 2 → LIDO; o sumário docente acompanha 1 → 0 → 1. Ver `notice-renderer.mjs`.
