# Reveal Stage

## Missao 013

`Reveal Stage` e o palco reutilizavel de revelacao da Caixa Misteriosa.

## Ordem obrigatoria das camadas

1. Magic Box
2. Reveal FX
3. Objeto
4. Glow Overlay

## Regra principal

O objeto e inserido dinamicamente no slot `data-reveal-object-layer`.

A animacao nunca deve conter o objeto. O `Reveal FX` e o `Glow Overlay` permanecem reutilizaveis para qualquer item.

## API do engine

- `setRevealStageObject(object)`
- `clearRevealStageObject()`

Exemplo:

```js
engine.setRevealStageObject({
  src: "assets/game-engine-2/assets/caixa-misteriosa/objects/feather.png",
  alt: "Pena"
});
```

## DOM

- `data-reveal-stage`
- `data-reveal-stage-layer="magic-box"`
- `data-reveal-stage-layer="reveal-fx"`
- `data-reveal-stage-layer="object"`
- `data-reveal-stage-layer="glow-overlay"`
