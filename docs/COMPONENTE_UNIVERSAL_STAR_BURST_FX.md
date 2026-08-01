# StarBurstFX

## Missao 019

`StarBurstFX` e o componente universal de explosao de estrelas para feedbacks pontuais.

## Registro

- COMPONENTE UNIVERSAL: `StarBurstFX`
- Versao: `1`
- Uso: efeito reutilizavel em qualquer tela da plataforma.

## Requisitos atendidos

- reproduz em qualquer posicao da tela;
- aceita multiplas execucoes simultaneas;
- controla escala;
- controla intensidade;
- controla duracao;
- aceita videos transparentes;
- usa `pointer-events: none` para nao bloquear interacao;
- possui fallback visual em CSS quando nenhum video for informado.

## API principal

```js
playStarBurst({
  x,
  y,
  scale: 1,
  intensity: "medium"
});
```

## Parametros

- `x`: posicao horizontal em viewport.
- `y`: posicao vertical em viewport.
- `target`: elemento opcional usado como referencia de posicao.
- `scale`: escala visual do efeito.
- `intensity`: `low`, `medium`, `high` ou numero entre `0` e `1`.
- `duration`: duracao em milissegundos.
- `src`, `video` ou `videoSrc`: video transparente opcional.
- `poster`: poster opcional do video.
- `transparent`: indica video com alpha/transparencia real.
- `removableBackground`: indica video com fundo removivel por composicao visual.
- `blendMode`: modo de composicao CSS.

## Exemplo com video transparente

```js
playStarBurst({
  x: event.clientX,
  y: event.clientY,
  scale: 1.2,
  intensity: "high",
  duration: 900,
  src: "assets/fx/star-burst.webm",
  transparent: true
});
```

## Exposicao global

- `window.StarBurstFX`
- `window.playStarBurst(options)`
- `window.RSGameEngine.playStarBurst(options)`

