# LivingCard

## Registro

- COMPONENTE UNIVERSAL: `LivingCard`
- Versao: 1
- Missao: 021 - Living Card System
- Uso: carta reutilizavel para jogos, experiencias, atividades, escolhas, objetos e cards interativos.

## Objetivo

`LivingCard` e a estrutura oficial para qualquer carta interativa da plataforma.

O conteudo permanece dinamico:

- imagem;
- texto;
- HTML interno quando necessario;
- atributos `data-*` usados pelos jogos.

## Estados

Estados oficiais:

- `idle`
- `hover`
- `pressed`
- `selected`
- `correct`
- `disabled`

Cada estado controla:

- escala;
- sombra;
- brilho;
- borda;
- animacao;
- efeito sonoro;
- `MagicTouchFX`;
- `StarBurstFX`.
- `LivingObject`, quando houver objeto dentro da carta.

## API Basica

```js
const html = window.LivingCard.render({
  image: "assets/objeto.png",
  text: "Objeto",
  data: { "choice-id": "objeto-1" }
});
```

## Mudar Estado

```js
window.LivingCard.setState(cardElement, "selected");
window.LivingCard.setState(cardElement, "correct");
window.LivingCard.setState(cardElement, "disabled");
```

## Estado Customizado

```js
window.LivingCard.render({
  image: "assets/estrela.png",
  text: "Estrela",
  states: {
    correct: {
      scale: 1.08,
      shadow: "0 0 36px rgba(255, 214, 67, 0.58)",
      glow: 0.72,
      border: "#62bd3a",
      animation: "living-card-correct",
      sound: "success",
      magicTouch: true,
      starBurst: { intensity: "high", scale: 1.1 }
    }
  }
});
```

## Integracao Com FX

`LivingCard` consome os componentes ja registrados:

- `LivingObject`
- `MagicTouchFX`
- `StarBurstFX`

Nenhum efeito e redesenhado dentro da carta. A carta apenas orquestra os componentes universais.

Quando recebe `objectId`, `image` e `text`, a carta cria automaticamente um `LivingObject` interno. O estado `correct` da carta e traduzido para `celebrating` no objeto.

Quando recebe `cardImage`, a carta usa uma arte completa de card como camada visual oficial e preserva o rótulo em HTML. Esse modo foi habilitado para a Caixa Misteriosa depois da homologacao dos cards completos.

## Exposicoes Globais

- `window.LivingCard`
- `window.RaizesGameEngine.LivingCard`
- `window.RSGameEngine.renderLivingCard`
- `window.RSGameEngine.setLivingCardState`

## Integracao Atual

O componente ja foi aplicado nas cartas de escolha dos jogos:

- cartas comuns por `data-choice-id`;
- cartas de audio por `data-audio-choice-id`;
- cartas de padrao por `data-pattern-choice-id`.

As classes antigas foram preservadas para compatibilidade visual e funcional.
