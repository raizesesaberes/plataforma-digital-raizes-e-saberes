# UniversalLoader

## Registro

- COMPONENTE UNIVERSAL: `UniversalLoader`
- Versao: 1
- Missao: 020 - Loader Universal
- Uso: carregamento reutilizavel para experiencias, jogos, biblioteca, workspace e demais modulos da plataforma.

## Estrutura

```text
Loader Animation

Logo

Texto

Progress Bar
```

## Requisitos Atendidos

- Aceita video transparente.
- Aceita video com remocao de fundo via `removableBackground`.
- Permite trocar logotipo.
- Permite trocar mensagem.
- Permite barra de progresso opcional.
- Reutilizavel em toda a plataforma.

## API Global

```js
const loader = window.showUniversalLoader({
  video: "assets/fx/loader-magico.webm",
  logo: "logo-app.png",
  message: "Preparando sua experiencia...",
  progress: 12
});

window.updateUniversalLoader({
  message: "Carregando personagens...",
  progress: 64
});

window.hideUniversalLoader();
```

## Video Transparente

```js
window.showUniversalLoader({
  src: "assets/fx/loader-transparente.webm",
  transparent: true,
  message: "Abrindo Biblioteca Viva..."
});
```

## Video Com Fundo Removivel

```js
window.showUniversalLoader({
  src: "assets/fx/loader-com-fundo.mp4",
  removableBackground: true,
  blendMode: "screen",
  message: "Preparando a magia..."
});
```

## Barra Opcional

```js
window.showUniversalLoader({
  message: "Carregando...",
  showProgress: false
});
```

Quando `progress` nao e informado, a barra entra em modo indeterminado. Quando `progress` recebe um numero entre 0 e 100, a barra passa a representar o valor exato.

## Metodos

- `UniversalLoader.render(options)`: retorna o HTML do componente.
- `UniversalLoader.mount(container, options)`: monta em um container especifico.
- `UniversalLoader.show(options)`: monta no `document.body` ou no container informado.
- `UniversalLoader.update(node, options)`: atualiza mensagem, logo, video, estado e progresso.
- `UniversalLoader.setProgress(node, progress, message)`: atualiza progresso e mensagem.
- `UniversalLoader.hide(node, options)`: remove com transicao curta.

## Exposicoes Globais

- `window.UniversalLoader`
- `window.showUniversalLoader`
- `window.updateUniversalLoader`
- `window.hideUniversalLoader`
- `window.RaizesGameEngine.UniversalLoader`
- `window.RSGameEngine.showUniversalLoader`
- `window.RSGameEngine.updateUniversalLoader`
- `window.RSGameEngine.hideUniversalLoader`
