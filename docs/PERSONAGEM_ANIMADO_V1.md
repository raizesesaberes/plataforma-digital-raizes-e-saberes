# Personagem Animado

## Missao 011

Suporte criado para personagens reativos em loop, com troca de estado sem recarregar a tela.

## Estados oficiais

- `idle`
- `looking`
- `pointing`
- `celebrating`
- `talking`

## Formatos aceitos

Cada estado pode ser substituido por uma nova versao sem alterar a logica do jogo:

- imagem estatica;
- video em loop;
- sprite;
- sequencia de frames.

## Configuracao

Os assets entram em `reactiveCharacters`:

```js
reactiveCharacters: {
  bia: {
    name: "Bia",
    version: "V1",
    states: {
      idle: { type: "image", src: "..." },
      looking: { type: "video", src: "...", loop: true },
      pointing: { type: "sprite", src: "...", steps: 8, frameMs: 90 },
      celebrating: { type: "sequence", frames: ["..."], frameMs: 100 },
      talking: { type: "video", src: "...", loop: true }
    }
  }
}
```

## Compatibilidade

O estado antigo `inviting` continua aceito como alias de `pointing`.
