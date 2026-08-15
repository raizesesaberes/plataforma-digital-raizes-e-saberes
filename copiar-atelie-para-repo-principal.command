#!/bin/bash
set -euo pipefail

ORIGEM="/Users/danielhenrique/.codex/worktrees/7ea1/plataforma digital raizes e saberes"
DESTINO="/Users/danielhenrique/Documents/plataforma digital raizes e saberes"

echo "Copiando arquivos finais do Atelie da Bia para o repositorio principal..."

cp "$ORIGEM/game-engine.js" "$DESTINO/game-engine.js"
cp "$ORIGEM/game-engine.css" "$DESTINO/game-engine.css"

mkdir -p "$DESTINO/assets/games/atelie-bia/golden-master"

cp "$ORIGEM/assets/games/atelie-bia/golden-master/JOANINHA_MASK_ANTENAS.png" "$DESTINO/assets/games/atelie-bia/golden-master/JOANINHA_MASK_ANTENAS.png"
cp "$ORIGEM/assets/games/atelie-bia/golden-master/JOANINHA_MASK_ASAS.png" "$DESTINO/assets/games/atelie-bia/golden-master/JOANINHA_MASK_ASAS.png"
cp "$ORIGEM/assets/games/atelie-bia/golden-master/JOANINHA_MASK_CABECA.png" "$DESTINO/assets/games/atelie-bia/golden-master/JOANINHA_MASK_CABECA.png"
cp "$ORIGEM/assets/games/atelie-bia/golden-master/JOANINHA_MASK_CORPO.png" "$DESTINO/assets/games/atelie-bia/golden-master/JOANINHA_MASK_CORPO.png"
cp "$ORIGEM/assets/games/atelie-bia/golden-master/JOANINHA_MASK_CORPO_PERNAS.png" "$DESTINO/assets/games/atelie-bia/golden-master/JOANINHA_MASK_CORPO_PERNAS.png"
cp "$ORIGEM/assets/games/atelie-bia/golden-master/JOANINHA_MASK_PERNAS_ANTENAS.png" "$DESTINO/assets/games/atelie-bia/golden-master/JOANINHA_MASK_PERNAS_ANTENAS.png"
cp "$ORIGEM/assets/games/atelie-bia/golden-master/JOANINHA_MASK_PINTINHAS.png" "$DESTINO/assets/games/atelie-bia/golden-master/JOANINHA_MASK_PINTINHAS.png"

cp "$ORIGEM/assets/games/atelie-bia/golden-master/JOANINHA_PARTE_ANTENAS.png" "$DESTINO/assets/games/atelie-bia/golden-master/JOANINHA_PARTE_ANTENAS.png"
cp "$ORIGEM/assets/games/atelie-bia/golden-master/JOANINHA_PARTE_ASAS.png" "$DESTINO/assets/games/atelie-bia/golden-master/JOANINHA_PARTE_ASAS.png"
cp "$ORIGEM/assets/games/atelie-bia/golden-master/JOANINHA_PARTE_CABECA.png" "$DESTINO/assets/games/atelie-bia/golden-master/JOANINHA_PARTE_CABECA.png"
cp "$ORIGEM/assets/games/atelie-bia/golden-master/JOANINHA_PARTE_CORPO.png" "$DESTINO/assets/games/atelie-bia/golden-master/JOANINHA_PARTE_CORPO.png"
cp "$ORIGEM/assets/games/atelie-bia/golden-master/JOANINHA_PARTE_CORPO_PERNAS.png" "$DESTINO/assets/games/atelie-bia/golden-master/JOANINHA_PARTE_CORPO_PERNAS.png"
cp "$ORIGEM/assets/games/atelie-bia/golden-master/JOANINHA_PARTE_PERNAS_ANTENAS.png" "$DESTINO/assets/games/atelie-bia/golden-master/JOANINHA_PARTE_PERNAS_ANTENAS.png"
cp "$ORIGEM/assets/games/atelie-bia/golden-master/JOANINHA_PARTE_PINTINHAS.png" "$DESTINO/assets/games/atelie-bia/golden-master/JOANINHA_PARTE_PINTINHAS.png"

echo ""
echo "Pronto. Agora abra o GitHub Desktop no repositorio principal e faca commit/push como antes."
echo "Pasta atualizada: $DESTINO"
echo ""
read -n 1 -s -r -p "Pressione qualquer tecla para fechar..."
