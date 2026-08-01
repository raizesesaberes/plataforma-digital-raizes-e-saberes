# LivingObject

## Registro

- COMPONENTE UNIVERSAL: `LivingObject`
- Versao: 1
- Missao: 022 - Living Object System
- Uso: microanimacoes leves para objetos exibidos em cartas de escolha.

## Objetivo

`LivingObject` aplica vida visual discreta aos objetos dentro das cartas, sem criar videos individuais e sem alterar a mecanica pedagogica existente.

## Estados

Estados oficiais:

- `idle`
- `hover`
- `pressed`
- `selected`
- `celebrating`
- `disabled`

## Perfis De Movimento

Perfis reutilizaveis:

- `float`
- `sway`
- `pulse`
- `shine`
- `bounce`
- `sparkle`
- `breathe`
- `static`

Todos os movimentos usam `transform` e `opacity`, com amplitudes pequenas para manter a tela calma.

## Configuracao Oficial

```js
const objectAnimationProfiles = {
  pena: {
    idle: ["float", "sway"],
    selected: ["float", "sparkle"]
  },
  algodao: {
    idle: ["breathe"],
    selected: ["pulse", "sparkle"]
  },
  esponja: {
    idle: ["pulse"],
    selected: ["bounce", "sparkle"]
  },
  flor: {
    idle: ["sway"],
    selected: ["pulse", "sparkle"]
  },
  estrela: {
    idle: ["shine"],
    selected: ["sparkle", "pulse"]
  },
  folha: {
    idle: ["sway"],
    selected: ["float", "sparkle"]
  },
  bola: {
    idle: ["breathe"],
    selected: ["bounce", "sparkle"]
  },
  cubo: {
    idle: ["shine"],
    selected: ["pulse", "sparkle"]
  }
};
```

## API Sugerida

```js
const objectHtml = window.LivingObject.render({
  id: "pena",
  image: "assets/objects/pena.png",
  label: "PENA",
  animationProfile: "float"
});
```

Com carta:

```js
const cardHtml = window.LivingCard.render({
  objectId: "pena",
  image: "assets/objects/pena.png",
  text: "PENA",
  data: { "choice-id": "pena" }
});
```

## Comportamento Com LivingCard

- `idle`: objeto com movimento extremamente suave.
- `hover`: carta cresce levemente e objeto reage sem depender de hover em touch.
- `pressed`: carta afunda, dispara `MagicTouchFX` e som curto.
- `selected`: carta sobe, objeto aumenta, outras cartas perdem opacidade, dispara `StarBurstFX` e brilho dourado curto.
- `correct`: objeto entra em `celebrating`.
- `disabled`: movimento reduzido.

## Acessibilidade E Desempenho

- Respeita `prefers-reduced-motion`.
- Reduz movimentos mais fortes em dispositivos com `saveData` ou poucos nucleos.
- Usa `transform` e `opacity`.
- Nao usa videos por objeto.
- Mantem area de toque da carta.
- Evita animacoes que prejudiquem leitura.

## Integracao Atual

Aplicado nas cartas de escolha existentes:

- `data-choice-id`
- `data-audio-choice-id`
- `data-pattern-choice-id`

As dicas, textos, IDs, respostas corretas e fluxo pedagogico foram preservados.

## Caixa Misteriosa

Para `EI2-E012-D-J01`, os cards completos homologados ficam em:

- `assets/jogos/ei2/caixa-misteriosa/references/card-pena.png`
- `assets/jogos/ei2/caixa-misteriosa/references/card-algodao.png`
- `assets/jogos/ei2/caixa-misteriosa/references/card-esponja.png`
- `assets/jogos/ei2/caixa-misteriosa/references/card-flor.png`
- `assets/jogos/ei2/caixa-misteriosa/references/card-estrela.png`
- `assets/jogos/ei2/caixa-misteriosa/references/card-folha.png`
- `assets/jogos/ei2/caixa-misteriosa/references/card-bola.png`
- `assets/jogos/ei2/caixa-misteriosa/references/card-cubo.png`

Os objetos separados permanecem em `assets/jogos/ei2/caixa-misteriosa/objects/` como fallback e compatibilidade com o modo `LivingObject` tradicional.

## Exposicoes Globais

- `window.objectAnimationProfiles`
- `window.LivingObject`
- `window.RaizesGameEngine.LivingObject`
- `window.RSGameEngine.renderLivingObject`
- `window.RSGameEngine.setLivingObjectState`
