# CAIXA MISTERIOSA - BUILD DE AVALIACAO 01

## URL

`http://127.0.0.1:4178/caixa-misteriosa-build-01.html`

## Sequencia prevista

Tela inicial -> iniciar -> instrucao -> toque na caixa -> abertura -> dica -> escolha dos cards -> feedback -> proxima descoberta -> 3 rodadas -> tela final -> jogar novamente / continuar / voltar ao site.

## Videos utilizados

- `assets/builds/caixa-misteriosa-avaliacao-01/videos/intro.mp4`
- `assets/builds/caixa-misteriosa-avaliacao-01/videos/room-ambience.mp4`
- `assets/builds/caixa-misteriosa-avaliacao-01/videos/box-idle.mp4`
- `assets/builds/caixa-misteriosa-avaliacao-01/videos/box-breathing.mp4`
- `assets/builds/caixa-misteriosa-avaliacao-01/videos/box-touch.mp4`
- `assets/builds/caixa-misteriosa-avaliacao-01/videos/box-shake.mp4`
- `assets/builds/caixa-misteriosa-avaliacao-01/videos/box-glow.mp4`
- `assets/builds/caixa-misteriosa-avaliacao-01/videos/box-anticipation.mp4`
- `assets/builds/caixa-misteriosa-avaliacao-01/videos/magic-glow.mp4`
- `assets/builds/caixa-misteriosa-avaliacao-01/videos/bia-idle.mp4`
- `assets/builds/caixa-misteriosa-avaliacao-01/videos/bia-looking.mp4`
- `assets/builds/caixa-misteriosa-avaliacao-01/videos/bia-pointing.mp4`
- `assets/builds/caixa-misteriosa-avaliacao-01/videos/bia-celebrating.mp4`
- `assets/builds/caixa-misteriosa-avaliacao-01/videos/bia-talking.mp4`
- `assets/builds/caixa-misteriosa-avaliacao-01/videos/victory-animation.mp4`

## Assets utilizados

- Cards completos: `assets/jogos/ei2/caixa-misteriosa/references/card-*.png`
- Objetos PNG de fallback: `assets/jogos/ei2/caixa-misteriosa/objects/*.png`
- Cenario base: `assets/games/caixa-misteriosa/components/sala-descobertas-bg.png`
- Borboleta Bia: `assets/games/caixa-misteriosa/components/borboleta-bia-clean.png`
- Medalha: `assets/games/caixa-misteriosa/components/medal-pequeno-explorador-clean.png`
- Reveal FX: `assets/game-engine-2/assets/caixa-misteriosa/reveal-fx/reveal-fx.png`
- Efeitos: `assets/game-engine-2/assets/caixa-misteriosa/effects/confetti.png` e `assets/game-engine-2/assets/caixa-misteriosa/effects/stars.png`
- Botoes atuais do motor: `assets/game-engine-2/assets/caixa-misteriosa/buttons/*.png`

## Materiais fora da build

Nenhum material foi descartado intencionalmente. Onde nao havia encaixe direto para um MP4 especifico de toque/estrela, a build manteve o fallback estavel ja implementado no motor para preservar jogabilidade.

## Erros encontrados

- O fluxo autenticado de `jogos.html` redireciona para login; por isso foi criada uma pagina de avaliacao direta, sem `app-pages.js`.
- Nao havia `ffmpeg`/`ffprobe` disponivel no ambiente, entao a classificacao dos MP4s foi feita pelo conjunto entregue e pelo uso mais estavel em cada estado.
- A tentativa de gravar video com `screencapture -v -V 35` falhou no macOS com `capture error A operacao nao pode ser concluida`, indicando bloqueio/permissao de captura de tela no ambiente.

## Limitacoes de desempenho

- A build carrega 15 videos MP4. Em maquinas mais fracas, Safari pode atrasar o primeiro autoplay ate os metadados carregarem.
- Todos os videos foram configurados como `muted`, `playsinline` e `preload="metadata"` para maximizar compatibilidade no Safari.
- A intro e os videos de estado usam fallback visual em PNG caso o video demore a iniciar.

## Evidencias

- Captura inicial: `docs/evidencias/caixa-misteriosa-build-01-inicial.png`
- Captura escolhas: `docs/evidencias/caixa-misteriosa-build-01-escolhas.png`
- Captura final: `docs/evidencias/caixa-misteriosa-build-01-final.png`
- Video de ponta a ponta: nao gerado neste ambiente por bloqueio de captura de tela do macOS.
- Validacao jogavel: fluxo completo testado no navegador integrado ate a tela final com `+20 XP`, medalha, `CONTINUAR`, `JOGAR NOVAMENTE` e `VOLTAR AO SITE`.
