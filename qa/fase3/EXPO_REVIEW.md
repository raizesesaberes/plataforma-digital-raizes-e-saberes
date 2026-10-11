# Expo — avaliações reais, resultados e comunicação

Branch `review/fase3-expo-real-journeys`, dependente de PR4 (que inclui PR2/3). Sem código de contratos neste diff. Integração com PR1 existe somente na worktree/branch local descrita em `INTEGRATION_REVIEW.md`.

## Implementado

- Rota Avalia+ docente: consulta turmas vinculadas e catálogo autorizado da turma, seleciona questões, monta avaliação persistida, lista avaliações próprias salvas, publica para a turma e consulta resultados reais por aplicação/aluno. Retira o caminho que apenas mudava estado local ao publicar. Não fabrica zeros de resultado enquanto a consulta está pendente/falha.
- Aluno: abre aplicação autorizada, informa token quando exigido, inicia ou retoma tentativa, salva alternativa/texto, recarrega respostas persistidas, entrega e vê nota retornada pelo servidor ou “aguardando correção”. Não confunde tentativas de aplicações diferentes da mesma avaliação. Corrige `score_percentage` e estado graded no adaptador anterior.
- Perda de confirmação de publicar/iniciar/salvar/entregar: consulta o estado persistido antes de confirmar sucesso. Não repete mutação automaticamente. Recuperação só para falha de transporte/5xx, nunca mascara 403/validação como sucesso. Montagem sem confirmação bloqueia nova montagem até o usuário conferir/selecionar uma avaliação salva.
- Recados de aluno/responsável e conversas do docente: lista real, destinatário e filho identificados, respostas/retorno persistidos, texto pendente + chave por usuário/entrega mantidos em memória ao fechar/reabrir. Edição/versões/readtracking usam os RPCs do PR4. Não há nova SQL nesta branch.
- Cards do novo módulo usam recibo da versão atual. Entregas legadas cujo vínculo com aquele filho foi revogado são excluídas após 403 individual; 404/5xx continuam como erro, não lista vazia. Resumos antigos ainda presentes na home/compositor ficam explicitamente rotulados **históricos**, sem alegar leitura da versão atual.
- Rotas existentes de Auth, login, senhas, importações, perfil e App.tsx preservadas. Usa Expo/React Native e tokens de cor/raio/espaçamento existentes, sem nova stack de UI. O preset Babel do Expo 57.0.11, já transitivo e travado no lockfile, foi declarado diretamente em devDependencies para corrigir a exportação com pnpm; nenhuma versão existente foi trocada.

## Gates de rollout

Todos desligados por ausência ou valor diferente de `true`:

- `EXPO_PUBLIC_FASE3_ASSESSMENTS`: requer PR2 revisado/aplicado e compatibilidade de backend validada.
- `EXPO_PUBLIC_FASE3_REPLIES`: requer PR3 revisado/aplicado.
- `EXPO_PUBLIC_FASE3_NOTICE_EDITING`: requer PR4 revisado/aplicado.

Gate bloqueia ações antes da requisição. Backend ausente com gate ligado produz erro explícito. Nenhum gate foi ativado em build de produção; o host QA passa gates por props e sessões **sintéticas**, sem mudar Auth da aplicação.

## Matriz de evidências

| Jornada/condição | Estado | Evidência |
|---|---|---|
| Catálogo da turma → montagem → publicação → aluno → resposta → entrega → resultados | PASS sintético | Adaptador real e componentes Expo/React Native Web contra PostgREST/Postgres real |
| Publicação, início, resposta e entrega com HTTP503 após commit | PASS | Reconciliação API com IDs/contagens/nota; publicação e entrega também no navegador |
| Reabrir/recarregar conserva respostas/resultado | PASS | Navegador Expo; resposta selecionada reaparece antes da entrega |
| Recado → resposta aluno → professor → retorno | PASS | Navegador Expo, inclusive perda do ack e reabertura sem duplicata |
| Edição → versão 2 → leitura dessa versão | PASS | Navegador Expo; sem botão de edição para destinatário |
| Responsável com filho revogado e outro vínculo válido | PASS | Sessão família no Expo abre entrega válida e responde; SQL PR3 testa ambos modelos/revogações |
| Outra escola inicia/lê resultado de aplicação alheia | NEGADO | API real com JWT de outro aluno/docente; UI não oferece aplicação alheia |
| Gate desligado | PASS | Nenhuma chamada de avaliação, nenhuma ação de início |
| Gate ligado/backend404 | PASS | “Serviço indisponível”; não mostra “sem avaliações” como se a consulta tivesse funcionado |
| Integração PR1+PR2/3/4 | PASS local na ordem documentada | 29 testes; ordem inversa bloqueada pelo preflight, sem modificar hashes |
| Login completo, todas as telas da app shell e homologação visual humana | NÃO EXECUTADO | Harness usa os componentes reais com entrada QA separada |
| iOS/Android nativos, push/store/deploy | NÃO EXECUTADO | Nenhum emulador/APK/IPA/publicação |

Suite agregada: **30 PASS / 0 FAIL**. A última entrada inclui testes de serviço e a sequência de navegador Expo. `expo-browser.png` mostra o componente real na viewport de 390px, não uma homologação visual completa.

## Reprodução segura

```sh
# Dependências já existentes no lockfile mobile; cache em diretório gravável.
cd mobile
XDG_DATA_HOME=/tmp/fase3-pnpm-data XDG_CACHE_HOME=/tmp/fase3-pnpm-cache pnpm install --store-dir /tmp/fase3-pnpm-store --frozen-lockfile
cd ..
mobile/node_modules/.bin/tsc --noEmit -p mobile/tsconfig.json
node qa/fase3/build-expo-preview.mjs
node qa/fase3/run.mjs
```

Build QA em `/tmp/rs-fase3-expo-dist`, entrada `qa/fase3/ExpoHarness.tsx`; gateway escuta apenas `127.0.0.1:58137` e aponta exclusivamente para o Docker sintético. O runner exige Playwright e Chromium instalado; não faz skip silencioso. Ao terminar remove containers. `integration-run.mjs` requer checkout composto com os SQLs do PR1; não roda numa branch que não os contém.

## Limites que permanecem

Esta fatia valida o caso textual de múltipla escolha; resposta aberta tem formulário/RPC mas correção humana, mídia, matemática rica e acessibilidade nativa ainda precisam de casos próprios. Catálogo limitado à primeira página de 100 questões. Publicação usa turma e disponibilidade imediata; configurações avançadas, paginação, nova tentativa/reaplicação por UI e autoria de atividades fora do Avalia+ permanecem pendentes. Métricas de outros módulos antigos não foram homologadas por esta entrega. Não anunciar conclusão integral da FASE3.

Respostas têm o alcance administrativo canônico (gestão escolar/de rede/admin) explicitado na interface; aprovação desse alcance e dos SQLs permanece separada. Rascunhos incertos são memória local, não persistem após reiniciar a app. Nenhum dado ou usuário real foi consultado/alterado, nenhuma mensagem externa enviada, nenhum merge em main/deploy/instalação SQL ocorreu.

## Build e revisão de componentes

Typecheck passou. A exportação web da **App.tsx real**, com seus imports/rotas, passou após declarar o preset Babel já travado: 417 módulos e 56 assets, sem servir a aplicação nem autenticar usuários. O teste funcional usa separadamente os componentes reais no harness Expo; exportar a app completa não equivale a testar seu login/navegação completa.

Checklist React aplicado: componentes separados, hooks incondicionais, estado reiniciado por identidade de sessão, chave estável por aplicação/entrega, ações bloqueadas durante gravação, status acessível e strings de usuário renderizadas como Text. Erro de atualização da conversa depois de um envio confirmado mantém a confirmação e pede atualizar; não induz reenviar uma resposta já recebida. A regressão de adaptador também distingue duas atribuições (turma/aluno) da mesma avaliação, sem copiar a nota de uma para outra.
