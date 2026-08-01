# TransitionFX

## Missao 014

`TransitionFX` e o componente universal de transicao entre telas do ecossistema.

## Objetivo

Permitir a reproducao opcional de uma transicao antes de qualquer mudanca de tela, sem prender o efeito a um jogo, modulo ou experiencia especifica.

## Registro

- COMPONENTE UNIVERSAL: `TransitionFX`
- Versao: `1`
- Uso: opcional e reutilizavel em qualquer modulo.

## Parametros

- `enabled`: ativa ou desativa a transicao.
- `duration`: duracao total em milissegundos.
- `speed`: velocidade de reproducao do video.
- `changeAt`: ponto da animacao em que a tela muda, entre `0.1` e `0.9`.
- `src`, `video` ou `videoSrc`: arquivo de video da transicao.
- `poster`: imagem inicial opcional do video.
- `transparent`: indica video com transparencia real.
- `removableBackground`: indica video com fundo removivel por composicao visual.
- `background`: cor base do fallback.
- `variant`: variante visual CSS.

## Contrato de camada

1. A transicao aparece sobre a tela atual.
2. A troca de tela ocorre durante a cobertura visual da transicao.
3. A transicao some e revela a nova tela.

## API

```js
window.showTransitionFX({
  enabled: true,
  duration: 650,
  speed: 1.2,
  src: "assets/transitions/magic-swipe.webm",
  transparent: true
});
```

Dentro do engine:

```js
engine.go("choice", {
  transition: {
    enabled: true,
    duration: 720,
    speed: 1
  }
});
```

## Configuracao por modulo

```js
window.RaizesGameConfig = {
  transitionFX: {
    enabled: true,
    duration: 520,
    speed: 1
  }
};
```

Tambem e possivel configurar por jogo:

```js
window.RaizesGameConfig = {
  games: {
    "caixa-misteriosa": {
      transitionFX: {
        enabled: true,
        src: "assets/transitions/reveal.webm",
        transparent: true
      }
    }
  }
};
```

## Compatibilidade

O componente aceita:

- video com alpha/transparencia real;
- video com fundo removivel usando composicao visual;
- fallback CSS quando nenhum video for informado;
- falha de video com retorno automatico para o fallback.

