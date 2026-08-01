# MagicTouchFX

## Missao 016

`MagicTouchFX` e o componente universal de efeito magico pontual para toques, cliques e interacoes.

## Registro

- COMPONENTE UNIVERSAL: `MagicTouchFX`
- Versao: `1`
- Uso: reutilizavel em toda a plataforma.

## Requisitos atendidos

- executa exatamente na posicao do toque usando `clientX` e `clientY`;
- aceita videos transparentes;
- permite multiplas execucoes simultaneas;
- nao bloqueia a interacao porque usa `pointer-events: none`;
- calcula escala automaticamente a partir do tamanho do objeto tocado;
- possui fallback visual em CSS quando nenhum video for informado.

## API principal

```js
playMagicTouch({
  x: event.clientX,
  y: event.clientY
});
```

## API com objeto de referencia

```js
playMagicTouch({
  x: event.clientX,
  y: event.clientY,
  target: event.currentTarget,
  src: "assets/fx/magic-touch.webm",
  transparent: true
});
```

## Parametros

- `x`: posicao horizontal do toque em viewport.
- `y`: posicao vertical do toque em viewport.
- `target`: elemento usado para calcular escala automaticamente.
- `src`, `video` ou `videoSrc`: video transparente opcional.
- `poster`: poster opcional do video.
- `duration`: duracao do efeito.
- `scale`: multiplicador manual de escala.
- `minSize`: tamanho minimo.
- `maxSize`: tamanho maximo.
- `transparent`: indica video com alpha/transparencia real.
- `removableBackground`: indica video com fundo removivel por composicao visual.
- `blendMode`: modo de composicao CSS.

## Integracao no engine

O engine dispara o efeito no `pointerdown`, antes da logica de clique. Assim o feedback visual nasce no instante do toque e nao atrasa nem bloqueia a interacao.

Configuracao global:

```js
window.RaizesGameConfig = {
  magicTouchFX: {
    enabled: true,
    src: "assets/fx/magic-touch.webm",
    duration: 620,
    transparent: true
  }
};
```

Configuracao por jogo:

```js
window.RaizesGameConfig = {
  games: {
    "caixa-misteriosa": {
      magicTouchFX: {
        enabled: true,
        scale: 1.12
      }
    }
  }
};
```

