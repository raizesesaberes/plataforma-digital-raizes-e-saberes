# COMPONENTE UNIVERSAL

## Victory Screen

Versao: 1

## Objetivo

`VictoryScreen` e o componente universal de conclusao/vitoria das experiencias e jogos. Ele separa animacoes, efeitos e conteudo para que cada experiencia reutilize a mesma estrutura sem recriar tela final.

## Ordem das camadas

1. Background FX
2. Victory Animation
3. Medalha
4. XP
5. Mensagem
6. Personagem
7. Botoes

## Responsabilidade do Codex

O Codex preenche apenas:

- medalha;
- XP;
- personagem;
- mensagem.

As animacoes sao independentes e ficam em slots proprios:

- `data-victory-slot="background-fx"`
- `data-victory-slot="victory-animation"`
- `data-victory-slot="medal"`

## Implementacao

- Componente: `window.VictoryScreen`
- Versao exportada: `VictoryScreen.version = "1"`
- Marcador DOM: `data-universal-component="VictoryScreen"`
- Marcador de versao: `data-component-version="1"`
