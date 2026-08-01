# MagicAmbienceLayer

## Missao 015

`MagicAmbienceLayer` e a camada universal de ambiencia visual para cenarios da plataforma.

## Objetivo

Adicionar atmosfera magica sobre qualquer cenario sem interferir na interacao, sem duplicar videos por tela e sem prender o efeito a um modulo especifico.

## Registro

- COMPONENTE UNIVERSAL: `MagicAmbienceLayer`
- Versao: `1`
- Uso: opcional, reutilizavel e controlado por tela.

## Recursos

- aceita videos transparentes;
- aceita videos com fundo removivel por composicao visual;
- permite ativar/desativar por tela;
- controla intensidade por opacidade;
- funciona sobre qualquer cenario renderizado no `game-stage`;
- pausa e remove `src` do video quando desativado para reduzir custo.

## Parametros

- `enabled`: ativa a camada.
- `src`, `video` ou `videoSrc`: video da ambiencia.
- `poster`: poster opcional do video.
- `intensity` ou `opacity`: opacidade visual entre `0` e `1`.
- `speed`: velocidade de reproducao do video.
- `transparent`: indica video com alpha/transparencia real.
- `removableBackground`: indica video com fundo removivel por composicao visual.
- `blendMode`: modo de composicao CSS.
- `variant`: variante visual CSS.

## Configuracao global

```js
window.RaizesGameConfig = {
  magicAmbienceLayer: {
    enabled: true,
    src: "assets/ambience/magic-dust.webm",
    intensity: 0.28,
    transparent: true,
    disabledScreens: ["intro", "final"]
  }
};
```

## Configuracao por jogo e tela

```js
window.RaizesGameConfig = {
  games: {
    "caixa-misteriosa": {
      magicAmbienceLayer: {
        src: "assets/ambience/soft-sparkles.webm",
        transparent: true,
        screens: {
          room: { enabled: true, intensity: 0.2 },
          hint: { enabled: true, intensity: 0.38 },
          choice: false
        }
      }
    }
  }
};
```

## API

```js
const layer = window.MagicAmbienceLayer.mount(document.querySelector("[data-game-stage]"), {
  enabled: true,
  src: "assets/ambience/magic-dust.webm",
  intensity: 0.32,
  transparent: true
});
```

```js
window.RSGameEngine.updateMagicAmbienceLayer({
  enabled: true,
  src: "assets/ambience/magic-dust.webm",
  intensity: 0.32,
  removableBackground: true
});
```

## Performance

A camada e renderizada uma unica vez por player. Ao trocar de tela, o engine apenas atualiza atributos, opacidade e video ativo. Quando desativada, o video e pausado e o `src` e removido.
