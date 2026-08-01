# SmartButton

## Missao 018

`SmartButton` e o componente universal de botao animavel da plataforma.

## Registro

- COMPONENTE UNIVERSAL: `SmartButton`
- Versao: `1`
- Uso: botoes com visual substituivel e texto HTML preservado.

## Estados oficiais

- `idle`
- `hover`
- `pressed`
- `disabled`

## Regra principal

O texto permanece em HTML dentro de `.smart-button-label`.

A animacao fica totalmente separada dentro de `.smart-button-media` e dos slots `data-smart-button-state-slot`.

## Recursos

- aceita imagem por estado;
- aceita video por estado;
- aceita sprite por estado;
- possui brilho independente em `.smart-button-glow`;
- mantem o botao nativo clicavel;
- nao bloqueia interacao nas camadas visuais;
- pode ser usado como `<button>` ou `<a>`.

## Exemplo

```js
SmartButton.render({
  label: "Iniciar",
  action: "start",
  className: "game-primary-button game-start-button",
  states: {
    idle: { type: "image", src: "assets/buttons/start-normal.png" },
    hover: { type: "image", src: "assets/buttons/start-hover.png" },
    pressed: { type: "image", src: "assets/buttons/start-pressed.png" },
    disabled: { type: "image", src: "assets/buttons/start-disabled.png" }
  },
  glow: {
    image: "assets/effects/glow-circle.png",
    intensity: 0.34
  }
});
```

## Midias aceitas

Imagem:

```js
idle: { type: "image", src: "assets/buttons/button.png" }
```

Video:

```js
hover: { type: "video", src: "assets/buttons/button-hover.webm", transparent: true }
```

Sprite:

```js
pressed: {
  type: "sprite",
  src: "assets/buttons/button-pressed-sprite.png",
  steps: 8,
  frameMs: 70
}
```

## Integracao atual

O botao `Iniciar` da Caixa Misteriosa ja usa `SmartButton`, mantendo `data-game-action="start"` para preservar a logica existente.

