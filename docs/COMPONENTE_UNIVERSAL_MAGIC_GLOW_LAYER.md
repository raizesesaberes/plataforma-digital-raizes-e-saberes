# MagicGlowLayer

## Missao 017

`MagicGlowLayer` e a camada independente de brilho da caixa.

## Registro

- COMPONENTE UNIVERSAL: `MagicGlowLayer`
- Versao: `1`
- Uso: camada sobre a Magic Box, sem substituir a caixa fisica.

## Regra principal

A caixa fisica continua sendo um componente separado. O brilho e uma camada independente, posicionada acima da caixa, para permitir trocar apenas o efeito futuramente.

## Recursos

- troca facil de video por configuracao;
- controle de intensidade por opacidade;
- ativacao/desativacao;
- controle de velocidade;
- suporte a video transparente;
- suporte a video com fundo removivel por composicao visual;
- fallback em imagem ou CSS.

## Parametros

- `enabled`: ativa ou desativa a camada.
- `active`: liga o brilho naquele momento.
- `src`, `video` ou `videoSrc`: video do brilho.
- `image` ou `imageSrc`: imagem de brilho opcional.
- `poster`: poster opcional do video.
- `intensity` ou `opacity`: intensidade visual entre `0` e `1`.
- `speed`: velocidade de reproducao do video.
- `transparent`: indica video com alpha/transparencia real.
- `removableBackground`: indica video com fundo removivel por composicao visual.
- `blendMode`: modo de composicao CSS.
- `activeStates`: estados da caixa que ligam o brilho automaticamente.

## Configuracao por jogo

```js
window.RaizesGameConfig = {
  games: {
    "caixa-misteriosa": {
      magicGlowLayer: {
        enabled: true,
        src: "assets/fx/box-glow.webm",
        intensity: 0.72,
        speed: 1.15,
        transparent: true,
        activeStates: ["glow", "anticipation"]
      }
    }
  }
};
```

## API manual

```js
window.RSGameEngine.updateMagicGlowLayer({
  active: true,
  src: "assets/fx/box-glow.webm",
  intensity: 0.82,
  speed: 1.2,
  transparent: true
});
```

## Contrato de composicao

1. Magic Box fisica.
2. Slots de animacao da caixa.
3. `MagicGlowLayer` acima da caixa.

Assim o brilho pode evoluir sem redesenhar ou alterar o componente da caixa.
