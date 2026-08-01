# Reveal FX

## Missao 009

A camada `Reveal FX` foi preparada para separar o efeito magico da caixa e do objeto revelado.

## Ordem obrigatoria no Reveal Stage

1. Magic Box
2. Reveal FX
3. Objeto
4. Glow Overlay

O objeto sempre aparece acima do efeito. O `Reveal FX` nunca deve conter o objeto revelado, para permitir reutilizacao com qualquer item.

## Assets

- Biblioteca de referencias: `assets/referencias/reveal-fx/reveal_fx.png`
- Game engine: `assets/game-engine-2/assets/caixa-misteriosa/reveal-fx/reveal-fx.png`
- Prancha de referencia para IA: `reference/reveal_fx_ref.png`

## Integracao

Na tela de dica da Caixa Misteriosa, o engine renderiza:

- `.selection-reveal-stage`
- `.selection-reveal-box-layer`
- `.selection-reveal-fx-layer`
- `.selection-reveal-object-layer`
- `.selection-reveal-glow-layer`

Essa estrutura garante a composicao independente: caixa embaixo, efeito no meio, objeto dinamico acima do efeito e brilho de acabamento sobre o objeto.
