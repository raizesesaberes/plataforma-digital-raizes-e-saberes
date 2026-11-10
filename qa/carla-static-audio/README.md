# Carla: integração local de MP3 estáticos

## Checkpoint real

Base: `bc7de6c68a1155ebacc18edf1afa4b36bddf5449`, release previamente verificada. Branch isolada `feature/carla-static-audio-gated-20261110`. `main` não foi usado como base.

O candidato local admite **42 arquivos reais de P00–P06**, somando **4.941.913 bytes**. São seis arquivos P00 ouvidos e aprovados pelo usuário e 36 admitidos pelo padrão de voz do piloto com conferência individual de origem e testes técnicos. O registro está preenchido e habilita os controles desse conjunto ao executar o candidato local. `release.approvalRef` identifica admissão local, não afirma publicação.

**Não houve push, deploy ou alteração de produção por esta entrega.** O QA dos adaptadores em navegador ainda não foi executado; a transferência para o executor compatível está bloqueada. Nenhum lote posterior a P06 foi admitido automaticamente.

Cobertura parcial: cachorro, preguiça, borboleta, peixe e banana; as 14 falas comuns; a fala de três estrelas; a proposta do quiz específico e a explicação do caça-palavras específico. Restam 75 das 117 falas sem arquivo neste checkpoint. Os avisos da etapa, animação e painel do adulto distinguem disponibilidade parcial sem anunciar a plataforma completa.

## Contratos preservados

- `approved-copy.mjs`, `resolve.mjs`, catálogos, gravuras, snapshots, `coloring/narrator.mjs`, `coloring/counting.mjs` e bundles do Studio permanecem byte a byte iguais à base. Os dois hooks auditados do Player continuam iguais; o Studio não foi reconstruído.
- Colorir mantém `awaiting_licensed_audio`, licença pendente e `audio:null` no snapshot congelado. `validateSnapshot` e o bloqueio de áudio embarcado original permanecem intactos. Os arquivos usam registro separado.
- Não há mudanças nos motores, gabaritos, pontuação, progresso, autenticação, banco, avanço de 1,2 s do quiz/trilha ou prévia de 5 s da memória.
- Só dez conteúdos exatos dos jogos recebem roteiros. Memória relacional e outros conteúdos não herdam essas falas. Cada solicitação revalida SHA-256 do conteúdo e do texto.
- Texto e atividade funcionam sem áudio. Não há autoplay, TTS em tempo real, API de voz, envio de dados escolares, microfone, criação de chave ou novo serviço.

## Registro e qualidade

`mission-runtime/narration/asset-registry.mjs` contém apenas metadados públicos mínimos: voz/modelo, licença comercial confirmada com referência opaca, hashes, bytes, duração, caminhos, vínculos de conteúdo e modalidade de revisão. É congelado recursivamente.

- Fonte: texto e ID de geração/download conferidos no histórico de origem. `sourceTextVerified: true`, `sourceVerification: "generation_history"`, referência opaca. **Não houve transcrição independente do áudio**: `independentTranscription: false`.
- Todos os arquivos: hash, bytes, formato, duração e decodificação integral conferidos. Revisões de origem/técnicas privadas também verificaram silêncios, níveis e ausência de áudio PCM duplicado entre textos distintos.
- P00: modo `individual`, `listened: true`, `individualAuditoryQuality: "passed"`, referência pública `voice-pilot-20261110-p00`.
- P01–P05: modo `approved_voice_pilot + per_file_technical_and_source_checks`, `listened: false`, `individualAuditoryQuality: "not_assessed"`, referência ao piloto. O validador exige um asset real do piloto individualmente aprovado, com a mesma voz/modelo. Isso não transforma revisão técnica em julgamento auditivo individual.
- Ausência, incerteza de correspondência ou anomalia mantém o arquivo fora do registro até revisão.

Comprovantes, saldo, cobrança, conta, nomes de revisores, IDs da Space, IDs de geração e URLs privadas **não entram** no registro ou allowlist. O importador grava o mapa de referências somente na pasta privada externa ao repo. Os MP3 admitidos contêm apenas tag de encoder, sem outros metadados de arquivo ou stream.

Raiz: `mission-runtime/narration/audio/`. Cada MP3 tem o mesmo SHA-256 na allowlist e no registro. Os bytes canônicos não foram normalizados, reencodados ou alterados.

## Reprodução, acessibilidade e música

`static-player.mjs` exige clique/toque/tecla confiável, contexto permitido e asset admitido. Busca apenas o caminho exato na mesma origem, sem cookies/referrer, sem redirects; limita tamanho, verifica SHA-256 e só então reproduz os próprios bytes por Blob. Pausar, retomar, parar e tentar novamente são explícitos. Uma instância cancela a anterior; promises e carregamentos obsoletos não reiniciam áudio.

Os adaptadores param em mudança de atividade, item, tentativa, contexto, aba/ferramenta/modal, fechamento da ajuda, saída, revogação e ocultação/congelamento da página. O host envia interrupção síncrona e sem dados antes de remover o iframe. Nenhuma ação de áudio escreve no estado do jogo ou controla seu avanço.

Os controles têm botões semânticos, `role="group"`, rótulos específicos, status `aria-live="polite"`, foco visível, alvos de pelo menos 44 px, quebra de linha e movimento reduzido. Colorir inclui texto de áudio expansível. A revisão de explicação já explorada continua disponível sem mudar o avanço original.

Música: o usuário pausa a música no controle existente antes de ouvir Carla. Se iniciar música durante a narração, a voz para. Não há ducking, troca oculta de volume, rótulo, preferência ou patch adicional no bundle.

Safari/iOS: se houver bloqueio de gesto após o carregamento, os bytes já verificados são mantidos para um segundo toque em **Tentar iniciar narração**, que chama `play()` diretamente. Mudança de contexto descarta esse estado. Fluxo coberto por simulação; Safari real ainda não testado.

Registro vazio continua totalmente inerte. Os testes usam uma fixture vazia explícita para manter essa garantia depois da admissão de arquivos reais. Nenhuma fixture ou mídia fictícia entra no runtime publicado.

## CSP autorizada

Arquivo: `mission-runtime/studio/index.html`, meta `Content-Security-Policy`. A única alteração expressamente autorizada foi acrescentar **`media-src 'self' blob:`**. Teste compara o arquivo inteiro com a base e admite exclusivamente essa adição.

`connect-src`, `script-src`, demais diretivas e origens são os mesmos. Não libera ElevenLabs, API externa, scripts Blob, mídia `data:` ou execução inline. O build recusa assets de jogos sem a diretiva exata. Não existe fallback para reproduzir uma URL sem verificar os bytes.

## Evidências e limites

- `evidence/unit.log`: **157 testes** passam. Incluem fixtures de mídia/DOM, estados de carregamento, corridas, revogação, gesto semelhante ao Safari, registro vazio, privacidade, arquivo/allowlist, 40 arquivos reais de Colorir passando pelo hash do controlador antes de mídia simulada e os dez conteúdos canônicos de jogos em testes locais de apresentação. Esses últimos não são execução do motor ou UI real.
- `evidence/regression-unit.log`: **92 regressões** da base passam. Preservação dos snapshots, validações e bundles conferida.
- `evidence/asset-validation.json`: 42 arquivos conferidos, incluindo ffprobe e **decodificação integral com ffmpeg**.
- `evidence/build.log`: **5.612 arquivos** verificados no build; QA, fixtures, scripts de importação e registros privados excluídos.
- Ensaio independente no Chrome 157 headless do iMac: os seis P00 reais passaram em hash → Blob → reprodução com tempo avançando → pausa, sob a CSP exata, sem violações. Controle negativo sem `media-src` bloqueou a mídia. Reprodução silenciada, sem avaliação auditiva por este executor. Esse ensaio não usou os adaptadores da nova branch.
- `tests/carla-static-audio/engine-gates.mjs` e `ui-browser.mjs`: preparados, **ainda não executados**. Chrome nesta nuvem foi impedido por erro de socket, inclusive na execução ampliada autorizada. Nenhuma repetição para contornar a restrição.
- Pendentes: UI real com o código final, fluxo entre iframes, celular físico, Safari/iOS real, leitor de tela e QA autenticado de produção. A suíte simulada não substitui esses testes.

## Transferência e publicação

O CLI Vercel confirmou branches de produção `main` (plataforma) e `service/enem-ingestion-worker` (segundo projeto), distintas da feature. Git read ampliado no iMac confirmou release `bc7de6c`; checkout existente estava limpo em `50c479a` e não foi alterado.

O bundle preparatório foi salvo na Library, mas o helper de materialização exige Python moderno e o Mac oferece Python 3.9. O helper não foi modificado. A nuvem não tem credenciais de push Git. O primeiro `create_blob` pelo conector foi recusado por exigir autorização específica do repo, antes de qualquer criação. Depois da confirmação explícita do usuário para enviar código e áudios a esse repo, a repetição única do primeiro create_blob foi aceita. A transferência da árvore pela branch isolada está em andamento; não houve deploy de produção.

Antes de publicar: obter a autorização específica de upload, transferir para novo worktree sem alterar os existentes, conferir base/árvore, rodar os testes de navegador no Chrome isolado, repetir verificações da versão final e só então avaliar publicação. A admissão local dos MP3 não declara esses passos concluídos.

## Comandos locais

```sh
# Importação explícita e cumulativa. A pasta privada deve ficar fora do repo.
node scripts/import-reviewed-carla-batches.mjs /pasta/privada P00,P01,P02,P03,P04,P05,P06 carla-local-p00-p06-20261110
node scripts/validate-carla-audio.mjs --inspect-media
node --test tests/carla-static-audio/unit.mjs tests/carla-static-audio/ui-unit.mjs tests/carla-static-audio/release.mjs
node --test tests/carla-guidance/unit.mjs tests/mission-institutional/unit.mjs tests/app-web/edition-library.test.mjs tests/app-web/hosting-target.test.mjs tests/app-web/login-return.test.mjs tests/app-web/runtime-overrides.test.mjs tests/app-web/validation-artifact.test.mjs tests/app-web/web-session.test.mjs
node scripts/build-static-web.mjs
# Pendentes em executor compatível, sem usar o browser pessoal:
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs CHROMIUM_PATH=/path/to/chrome node tests/carla-static-audio/engine-gates.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs CHROMIUM_PATH=/path/to/chrome node tests/carla-static-audio/ui-browser.mjs
```

## Corrida de cancelamento corrigida

Um Ouvir anterior que ainda aguardava SHA-256 podia vencer Parar/Pausar/Retomar. Os dois adaptadores agora invalidam essa intenção pendente antes do comando mais recente; o stop público de Colorir também faz isso. Sete testes com digest atrasado cobrem os comandos nos dois adaptadores e o stop público. Não há nova reprodução depois da interrupção.

Durante a transferência autorizada, 28 blobs foram aceitos, mas o upload de um MP3 P03 foi recusado por falta de autorização específica alegada pela ferramenta. Nenhum commit ou branch remoto foi criado. Os uploads foram interrompidos; antes de retomada, os resultados de operações paralelas potencialmente concluídas precisam ser reconciliados por leitura.
