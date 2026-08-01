# Intro Cinematografica

## Missao 012

Suporte criado para uma introducao opcional antes da tela inicial do jogo.

## Comportamento

- Reproduz automaticamente apenas na primeira entrada da experiencia.
- Permite pular a introducao.
- Ao finalizar ou pular, abre automaticamente a tela inicial do jogo.
- Enquanto a introducao toca, o engine inicia o carregamento dos assets do jogo.

## Configuracao

```js
cinematicIntro: {
  version: "V1",
  enabled: true,
  src: "assets/video/intro.mp4",
  poster: "assets/experiencia/poster.png",
  fallback: "assets/experiencia/poster.png",
  title: "A Caixa Misteriosa",
  skipLabel: "Pular introducao"
}
```

## Persistencia

A exibicao unica e controlada por `localStorage`, usando a chave:

`raizes:cinematic-intro-seen:v1:{gameId}:{version}`

Ao trocar a `version`, a introducao pode ser exibida novamente uma vez.

## Fluxo

1. Player monta o jogo.
2. Engine inicia pre-carregamento de assets.
3. Se a intro existe e ainda nao foi vista, abre `data-screen="cinematic-intro"`.
4. Ao terminar ou pular, marca como vista.
5. Engine abre `data-screen="intro"`.
