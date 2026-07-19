(function () {
  const storageKey = "raizes:game-progress:v1";
  const atlasBase = "assets/games/caixa-misteriosa/";
  const asset = (path) => `${atlasBase}${path}`;
  const jardimBase = "assets/games/jardim-descobertas/";
  const jardimAsset = (path) => `${jardimBase}${path}`;
  const ponteBase = "assets/games/construindo-ponte/";
  const ponteAsset = (path) => `${ponteBase}${path}`;
  const formasBase = "assets/games/formas-casa/";
  const formasAsset = (path) => `${formasBase}${path}`;
  const caminhoBase = "assets/games/caminho-bia/";
  const caminhoAsset = (path) => `${caminhoBase}${path}`;
  const atelieBase = "assets/games/atelie-bia/";
  const atelieAsset = (path) => `${atelieBase}${path}`;
  const rotinaBase = "assets/games/rotina-pipo/";
  const rotinaAsset = (path) => `${rotinaBase}${path}`;
  const festaBase = "assets/games/grande-festa/";
  const festaAsset = (path) => `${festaBase}${path}`;

  const gameRepository = {
    games: {
      "caixa-misteriosa": {
        id: "caixa-misteriosa",
        type: "selection",
        title: "A Caixa Misteriosa",
        category: "Descobertas",
        subtitle: "Sala das Descobertas",
        scenario: "Sala das Descobertas",
        character: "Leo, Sofia, Miguel e Bia",
        mascot: "Borboleta Bia",
        xp: 20,
        medal: "Pequeno Explorador",
        unlock: { order: 1, unlocked: true, requires: null },
        assets: {
          atlas: `${atlasBase}telas-assets.png`,
          card: asset("screens/screen-intro.png"),
          flow: `${atlasBase}fluxo-assets.png`,
          library: `${atlasBase}biblioteca-assets.png`,
          scenarios: `${atlasBase}cenarios-oficiais.png`,
          screens: {
            intro: asset("screens/screen-intro.png"),
            room: asset("screens/screen-room.png"),
            hint: asset("screens/screen-hint.png"),
            choice: asset("screens/screen-choice.png"),
            feedback: asset("screens/screen-feedback.png"),
            final: asset("screens/screen-final.png"),
          },
          boxes: {
            closed: asset("boxes/box-closed.png"),
            glowing: asset("boxes/box-glowing.png"),
            open: asset("boxes/box-open.png"),
          },
        },
        audio: {
          narration: 0.9,
          effects: 0.75,
          music: 0.35,
        },
        rounds: [
          {
            id: "macio",
            hint: "E bem macio.",
            narration: "Escute a dica: e bem macio. Qual objeto pode estar na caixa?",
            correctId: "algodao",
            choices: [
              { id: "pena", label: "Pena", color: "#ef8b21", image: asset("objects/feather.png") },
              { id: "algodao", label: "Algodao", color: "#6aa351", image: asset("objects/cotton.png") },
              { id: "esponja", label: "Esponja", color: "#4b9cc4", image: asset("objects/sponge.png") },
            ],
          },
          {
            id: "leve",
            hint: "E leve e flutua.",
            narration: "Agora a dica e: e leve e flutua.",
            correctId: "pena",
            choices: [
              { id: "bola", label: "Bola", color: "#4b9cc4", image: asset("objects/ball.png") },
              { id: "pena", label: "Pena", color: "#ef8b21", image: asset("objects/feather.png") },
              { id: "cubo", label: "Cubo", color: "#6aa351", image: asset("objects/cube.png") },
            ],
          },
          {
            id: "brilha",
            hint: "Brilha como uma conquista.",
            narration: "Ultima dica: brilha como uma conquista.",
            correctId: "estrela",
            choices: [
              { id: "flor", label: "Flor", color: "#6aa351", image: asset("objects/flower.png") },
              { id: "estrela", label: "Estrela", color: "#ef8b21", image: asset("objects/star.png") },
              { id: "folha", label: "Folha", color: "#4b9cc4", image: asset("objects/leaf.png") },
            ],
          },
        ],
      },
      "organizando-cesta": {
        id: "organizando-cesta",
        type: "drag-drop",
        title: "Organizando a Cesta",
        category: "Matematica",
        subtitle: "Jardim das Descobertas",
        scenario: "Jardim das Descobertas",
        character: "Bia",
        mascot: "Pipo e Tico",
        xp: 20,
        medal: "Pequeno Organizador",
        unlock: { order: 2, unlocked: true, requires: "caixa-misteriosa" },
        assets: {
          atlas: "assets/games/organizando-cesta/atlas.png",
          card: "assets/games/organizando-cesta/screens/screen-intro.png",
          flow: "assets/games/organizando-cesta/atlas.png",
          library: "assets/games/organizando-cesta/atlas.png",
          scenarios: "assets/games/organizando-cesta/atlas.png",
          screens: {
            intro: "assets/games/organizando-cesta/screens/screen-intro.png",
            room: "assets/games/organizando-cesta/screens/screen-observe.png",
            choice: "assets/games/organizando-cesta/screens/screen-organize.png",
            feedback: "assets/games/organizando-cesta/screens/screen-feedback.png",
            final: "assets/games/organizando-cesta/screens/screen-final.png",
          },
        },
        audio: {
          narration: 0.9,
          effects: 0.75,
          music: 0.35,
        },
        rounds: [
          {
            id: "frutas",
            hint: "Arraste cada fruta para o cesto correspondente.",
            narration: "Observe as frutas. Depois arraste cada fruta para o cesto certo.",
            items: [
              { id: "apple", label: "Maca", image: "assets/games/organizando-cesta/objects/apple.png", targetId: "apple" },
              { id: "banana", label: "Banana", image: "assets/games/organizando-cesta/objects/banana.png", targetId: "banana" },
              { id: "grape", label: "Uva", image: "assets/games/organizando-cesta/objects/grape.png", targetId: "grape" },
            ],
            targets: [
              { id: "apple", label: "Cesto da maca", image: "assets/games/organizando-cesta/baskets/basket-empty.png", completeImage: "assets/games/organizando-cesta/baskets/basket-apple.png" },
              { id: "banana", label: "Cesto da banana", image: "assets/games/organizando-cesta/baskets/basket-empty.png", completeImage: "assets/games/organizando-cesta/baskets/basket-banana.png" },
              { id: "grape", label: "Cesto da uva", image: "assets/games/organizando-cesta/baskets/basket-empty.png", completeImage: "assets/games/organizando-cesta/baskets/basket-complete.png" },
            ],
          },
        ],
      },
      "jardim-descobertas": {
        id: "jardim-descobertas",
        type: "find",
        title: "O Jardim das Descobertas",
        category: "Exploracao",
        subtitle: "Exploracao do Jardim",
        scenario: "Jardim das Descobertas",
        character: "Bia",
        mascot: "Pipo e Tito",
        xp: 20,
        medal: "Pequeno Observador",
        unlock: { order: 3, unlocked: true, requires: "organizando-cesta" },
        assets: {
          atlas: jardimAsset("atlas.png"),
          card: jardimAsset("screens/screen-intro.png"),
          flow: jardimAsset("atlas.png"),
          library: jardimAsset("atlas.png"),
          scenarios: jardimAsset("atlas.png"),
          screens: {
            intro: jardimAsset("screens/screen-intro.png"),
            room: jardimAsset("screens/screen-explore.png"),
            choice: jardimAsset("screens/screen-explore.png"),
            feedback: jardimAsset("screens/screen-final.png"),
            final: jardimAsset("screens/screen-final.png"),
          },
        },
        audio: {
          narration: 0.9,
          effects: 0.75,
          music: 0.35,
        },
        rounds: [
          {
            id: "folha",
            hint: "Encontre a folha.",
            narration: "Observe o jardim e encontre a folha.",
            correctId: "folha",
            choices: [
              { id: "folha", label: "Folha", color: "#6aa351", image: jardimAsset("objects/leaf.png") },
              { id: "flor", label: "Flor", color: "#ef8b21", image: jardimAsset("objects/flower.png") },
              { id: "caracol", label: "Caracol", color: "#4b9cc4", image: jardimAsset("objects/snail.png") },
            ],
          },
          {
            id: "flor",
            hint: "Encontre a flor.",
            narration: "Agora encontre a flor colorida.",
            correctId: "flor",
            choices: [
              { id: "passarinho", label: "Passarinho", color: "#4b9cc4", image: jardimAsset("objects/bird.png") },
              { id: "flor", label: "Flor", color: "#ef8b21", image: jardimAsset("objects/flower.png") },
              { id: "gotinha", label: "Gotinha", color: "#6aa351", image: jardimAsset("objects/drop.png") },
            ],
          },
          {
            id: "caracol",
            hint: "Encontre o caracol.",
            narration: "Procure com atencao e encontre o caracol.",
            correctId: "caracol",
            choices: [
              { id: "gotinha", label: "Gotinha", color: "#4b9cc4", image: jardimAsset("objects/drop.png") },
              { id: "folha", label: "Folha", color: "#6aa351", image: jardimAsset("objects/leaf.png") },
              { id: "caracol", label: "Caracol", color: "#ef8b21", image: jardimAsset("objects/snail.png") },
            ],
          },
          {
            id: "gotinha",
            hint: "Encontre a gotinha.",
            narration: "Encontre a gotinha no jardim.",
            correctId: "gotinha",
            choices: [
              { id: "flor", label: "Flor", color: "#ef8b21", image: jardimAsset("objects/flower.png") },
              { id: "gotinha", label: "Gotinha", color: "#4b9cc4", image: jardimAsset("objects/drop.png") },
              { id: "passarinho", label: "Passarinho", color: "#6aa351", image: jardimAsset("objects/bird.png") },
            ],
          },
          {
            id: "passarinho",
            hint: "Encontre o passarinho.",
            narration: "Para terminar, encontre o passarinho.",
            correctId: "passarinho",
            choices: [
              { id: "passarinho", label: "Passarinho", color: "#4b9cc4", image: jardimAsset("objects/bird.png") },
              { id: "folha", label: "Folha", color: "#6aa351", image: jardimAsset("objects/leaf.png") },
              { id: "caracol", label: "Caracol", color: "#ef8b21", image: jardimAsset("objects/snail.png") },
            ],
          },
        ],
      },
      "construindo-ponte": {
        id: "construindo-ponte",
        type: "snap",
        title: "Construindo a Ponte",
        category: "Construcao",
        subtitle: "Sistema de Encaixe",
        scenario: "Jardim das Descobertas",
        character: "Tito",
        mascot: "Bia e Pipo",
        xp: 20,
        medal: "Pequeno Construtor",
        unlock: { order: 4, unlocked: true, requires: "jardim-descobertas" },
        assets: {
          atlas: ponteAsset("atlas.png"),
          card: ponteAsset("screens/screen-intro.png"),
          flow: ponteAsset("atlas.png"),
          library: ponteAsset("atlas.png"),
          scenarios: ponteAsset("atlas.png"),
          screens: {
            intro: ponteAsset("screens/screen-intro.png"),
            room: ponteAsset("screens/screen-materials.png"),
            choice: ponteAsset("screens/screen-build.png"),
            feedback: ponteAsset("screens/screen-feedback.png"),
            final: ponteAsset("screens/screen-final.png"),
          },
        },
        audio: {
          narration: 0.9,
          effects: 0.75,
          music: 0.35,
        },
        rounds: [
          {
            id: "ponte",
            hint: "Encaixe os gravetos nos espacos da ponte.",
            narration: "Vamos ajudar o Tito a atravessar. Encaixe cada graveto no lugar certo da ponte.",
            snap: {
              tolerance: 72,
              emptyState: "Ponte vazia",
              partialState: "Ponte parcial",
              completeState: "Ponte completa",
              pieces: [
                { id: "log-top", label: "Graveto de cima", image: ponteAsset("pieces/log-horizontal.png"), targetId: "slot-top" },
                { id: "log-middle", label: "Graveto do meio", image: ponteAsset("pieces/log-short.png"), targetId: "slot-middle" },
                { id: "log-left", label: "Graveto diagonal", image: ponteAsset("pieces/log-diagonal-left.png"), targetId: "slot-left" },
                { id: "log-right", label: "Graveto vertical", image: ponteAsset("pieces/log-vertical.png"), targetId: "slot-right" },
                { id: "log-end", label: "Graveto final", image: ponteAsset("pieces/log-vertical-2.png"), targetId: "slot-end" },
              ],
              slots: [
                { id: "slot-top", label: "Encaixe de cima", x: 31, y: 36, width: 36, height: 10 },
                { id: "slot-middle", label: "Encaixe do meio", x: 31, y: 54, width: 36, height: 10 },
                { id: "slot-left", label: "Encaixe diagonal esquerdo", x: 42, y: 45, width: 18, height: 12, rotate: -32 },
                { id: "slot-right", label: "Encaixe vertical direito", x: 67, y: 43, width: 10, height: 24, rotate: 90 },
                { id: "slot-end", label: "Encaixe final", x: 78, y: 43, width: 10, height: 24, rotate: 90 },
              ],
            },
          },
        ],
      },
      "formas-casa": {
        id: "formas-casa",
        type: "drag-drop",
        title: "As Formas da Casa",
        category: "Formas",
        subtitle: "Montagem da Casa",
        scenario: "Jardim das Descobertas",
        character: "Ana",
        mascot: "Bia e Pipo",
        xp: 20,
        medal: "Pequeno Construtor de Formas",
        unlock: { order: 6, unlocked: true, requires: "busca-criterios" },
        assets: {
          atlas: formasAsset("atlas.png"),
          card: formasAsset("screens/screen-intro.png"),
          flow: formasAsset("atlas.png"),
          library: formasAsset("atlas.png"),
          scenarios: formasAsset("atlas.png"),
          screens: {
            intro: formasAsset("screens/screen-intro.png"),
            room: formasAsset("screens/screen-observe.png"),
            choice: formasAsset("screens/screen-build.png"),
            feedback: formasAsset("screens/screen-build.png"),
            final: formasAsset("screens/screen-final.png"),
          },
        },
        audio: {
          narration: 0.9,
          effects: 0.75,
          music: 0.35,
        },
        rounds: [
          {
            id: "casa-formas",
            layout: "shape-house",
            hint: "Arraste cada forma para montar a casa.",
            narration: "Vamos descobrir onde cada forma fica. Monte a casa com quadrado, triangulo, retangulo e circulo.",
            items: [
              { id: "square", label: "Quadrado", image: formasAsset("shapes/square.png"), targetId: "window-left" },
              { id: "triangle", label: "Triangulo", image: formasAsset("shapes/triangle.png"), targetId: "roof" },
              { id: "rectangle", label: "Retangulo", image: formasAsset("shapes/rectangle.png"), targetId: "window-right" },
              { id: "circle", label: "Circulo", image: formasAsset("shapes/circle.png"), targetId: "attic" },
            ],
            targets: [
              { id: "roof", label: "Telhado triangular", image: formasAsset("shapes/triangle.png"), x: 52, y: 18, width: 34, height: 24 },
              { id: "attic", label: "Janela circular", image: formasAsset("shapes/circle.png"), x: 53, y: 38, width: 13, height: 13 },
              { id: "window-left", label: "Janela quadrada", image: formasAsset("shapes/square.png"), x: 38, y: 59, width: 13, height: 16 },
              { id: "window-right", label: "Janela retangular", image: formasAsset("shapes/rectangle.png"), x: 69, y: 58, width: 13, height: 17 },
            ],
          },
        ],
      },
      "busca-criterios": {
        id: "busca-criterios",
        type: "criteria",
        title: "Descobrindo por Critérios",
        category: "Critérios",
        subtitle: "Busca e Classificacao",
        scenario: "Jardim das Descobertas",
        character: "Bia",
        mascot: "Borboleta Bia",
        xp: 20,
        medal: "Pequeno Investigador",
        unlock: { order: 5, unlocked: true, requires: "construindo-ponte" },
        assets: {
          atlas: jardimAsset("atlas.png"),
          card: jardimAsset("screens/screen-explore.png"),
          flow: jardimAsset("atlas.png"),
          library: jardimAsset("atlas.png"),
          scenarios: jardimAsset("atlas.png"),
          screens: {
            intro: jardimAsset("screens/screen-intro.png"),
            room: jardimAsset("screens/screen-explore.png"),
            choice: jardimAsset("screens/screen-explore.png"),
            feedback: jardimAsset("screens/screen-final.png"),
            final: jardimAsset("screens/screen-final.png"),
          },
        },
        audio: {
          narration: 0.9,
          effects: 0.75,
          music: 0.35,
        },
        rounds: [
          {
            id: "natureza",
            hint: "Encontre os elementos da natureza.",
            narration: "Procure os elementos da natureza: folha, flor e gotinha.",
            required: 3,
            choices: [
              { id: "folha", label: "Folha", image: jardimAsset("objects/leaf.png"), correct: true },
              { id: "flor", label: "Flor", image: jardimAsset("objects/flower.png"), correct: true },
              { id: "gotinha", label: "Gotinha", image: jardimAsset("objects/drop.png"), correct: true },
              { id: "passarinho", label: "Passarinho", image: jardimAsset("objects/bird.png"), correct: false },
              { id: "caracol", label: "Caracol", image: jardimAsset("objects/snail.png"), correct: false },
            ],
          },
        ],
      },
      "caminho-bia": {
        id: "caminho-bia",
        type: "path-follow",
        title: "O Caminho da Bia",
        category: "Percurso",
        subtitle: "Path Following",
        scenario: "Jardim das Descobertas",
        character: "Bia",
        mascot: "Tito e Pipo",
        xp: 20,
        medal: "Pequeno Explorador de Caminhos",
        unlock: { order: 7, unlocked: true, requires: "formas-casa" },
        assets: {
          atlas: caminhoAsset("atlas.png"),
          card: caminhoAsset("screens/screen-intro.png"),
          flow: caminhoAsset("atlas.png"),
          library: caminhoAsset("atlas.png"),
          scenarios: caminhoAsset("atlas.png"),
          screens: {
            intro: caminhoAsset("screens/screen-intro.png"),
            room: caminhoAsset("screens/screen-path.png"),
            choice: caminhoAsset("screens/screen-path.png"),
            feedback: caminhoAsset("screens/screen-feedback.png"),
            final: caminhoAsset("screens/screen-final.png"),
          },
        },
        audio: {
          narration: 0.9,
          effects: 0.75,
          music: 0.35,
        },
        rounds: [
          {
            id: "percurso-flores",
            hint: "Siga o caminho com o dedo para levar a Bia ate o Tito.",
            narration: "Siga o caminho com o dedo. Passe pelos pontos ate chegar na casinha do Tito.",
            path: {
              tolerance: 88,
              points: [
                { id: "p1", x: 24, y: 78 },
                { id: "p2", x: 31, y: 63 },
                { id: "p3", x: 43, y: 49 },
                { id: "p4", x: 57, y: 40 },
                { id: "p5", x: 70, y: 30 },
                { id: "p6", x: 83, y: 22 },
              ],
            },
          },
        ],
      },
      "atelie-bia": {
        id: "atelie-bia",
        type: "creative-canvas",
        title: "O Atelie da Bia",
        category: "Criatividade",
        subtitle: "Canvas Criativo",
        scenario: "Atelie de Artes",
        character: "Bia",
        mascot: "Pipo",
        xp: 20,
        medal: "Pequeno Artista da Natureza",
        unlock: { order: 8, unlocked: true, requires: "caminho-bia" },
        assets: {
          atlas: atelieAsset("atlas.png"),
          card: atelieAsset("screens/screen-intro.png"),
          flow: atelieAsset("atlas.png"),
          library: atelieAsset("atlas.png"),
          scenarios: atelieAsset("atlas.png"),
          screens: {
            intro: atelieAsset("screens/screen-intro.png"),
            room: atelieAsset("screens/screen-materials.png"),
            choice: atelieAsset("screens/screen-canvas.png"),
            feedback: atelieAsset("screens/screen-canvas.png"),
            final: atelieAsset("screens/screen-final.png"),
          },
        },
        audio: {
          narration: 0.9,
          effects: 0.75,
          music: 0.35,
        },
        rounds: [
          {
            id: "obra-natureza",
            hint: "Crie uma obra com elementos da natureza.",
            narration: "Solte, mova e reorganize os elementos como quiser. Toda criacao e especial.",
            canvas: {
              minElements: 1,
              elements: [
                { id: "leaf-green", label: "Folha verde", image: atelieAsset("elements/leaf-green.png") },
                { id: "leaf-brown", label: "Folha marrom", image: atelieAsset("elements/leaf-brown.png") },
                { id: "flower-yellow", label: "Flor amarela", image: atelieAsset("elements/flower-yellow.png") },
                { id: "flower-pink", label: "Flor rosa", image: atelieAsset("elements/flower-pink.png") },
                { id: "twig", label: "Galho", image: atelieAsset("elements/twig.png") },
                { id: "acorn", label: "Semente", image: atelieAsset("elements/acorn.png") },
              ],
            },
          },
        ],
      },
      "rotina-pipo": {
        id: "rotina-pipo",
        type: "timeline-sequence",
        title: "A Rotina do Pipo",
        category: "Cuidado",
        subtitle: "Sequencia Temporal",
        scenario: "Sala das Descobertas",
        character: "Ana e Bia",
        mascot: "Pipo",
        xp: 20,
        medal: "Pequeno Cuidador",
        unlock: { order: 9, unlocked: true, requires: "atelie-bia" },
        assets: {
          atlas: rotinaAsset("atlas.png"),
          card: rotinaAsset("screens/screen-intro.png"),
          flow: rotinaAsset("atlas.png"),
          library: rotinaAsset("atlas.png"),
          scenarios: rotinaAsset("atlas.png"),
          screens: {
            intro: rotinaAsset("screens/screen-intro.png"),
            room: rotinaAsset("screens/screen-routine.png"),
            choice: rotinaAsset("screens/screen-sequence.png"),
            feedback: rotinaAsset("screens/screen-sequence.png"),
            final: rotinaAsset("screens/screen-final.png"),
          },
        },
        audio: {
          narration: 0.9,
          effects: 0.75,
          music: 0.35,
        },
        rounds: [
          {
            id: "rotina-cuidados",
            hint: "Organize a rotina do Pipo.",
            narration: "Arraste os cartoes para montar a rotina. Cada tentativa ajuda a completar a sequencia.",
            timeline: {
              tolerance: 92,
              positivePrompt: "Muito bem! A rotina esta ficando organizada.",
              slots: [
                { id: "step-1", label: "1", x: 18, y: 30 },
                { id: "step-2", label: "2", x: 38, y: 30 },
                { id: "step-3", label: "3", x: 58, y: 30 },
                { id: "step-4", label: "4", x: 78, y: 30 },
              ],
              cards: [
                { id: "wash-hands", label: "Lavar as maos", image: rotinaAsset("cards/wash-hands.png"), targetId: "step-1" },
                { id: "snack", label: "Lanche", image: rotinaAsset("cards/snack.png"), targetId: "step-2" },
                { id: "brush-teeth", label: "Escovar os dentes", image: rotinaAsset("cards/brush-teeth.png"), targetId: "step-3" },
                { id: "drink-water", label: "Beber agua", image: rotinaAsset("cards/drink-water.png"), targetId: "step-4" },
              ],
            },
          },
        ],
      },
      "grande-festa": {
        id: "grande-festa",
        type: "journey-celebration",
        title: "A Grande Festa das Descobertas",
        category: "Volume 1",
        subtitle: "Encerramento do Volume 1",
        scenario: "Mapa da Festa",
        character: "Ana, Bia, Pipo, Tito e Tico",
        mascot: "Bia e Pipo",
        xp: 50,
        medal: "Grande Explorador das Descobertas",
        permanentMedal: true,
        volume: "volume-1",
        unlock: { order: 10, unlocked: true, requires: "rotina-pipo" },
        assets: {
          atlas: festaAsset("atlas.png"),
          card: festaAsset("screens/screen-intro.png"),
          flow: festaAsset("atlas.png"),
          library: festaAsset("atlas.png"),
          scenarios: festaAsset("atlas.png"),
          screens: {
            intro: festaAsset("screens/screen-intro.png"),
            room: festaAsset("screens/screen-map.png"),
            choice: festaAsset("screens/screen-explore.png"),
            feedback: festaAsset("screens/screen-explore.png"),
            final: festaAsset("screens/screen-final.png"),
          },
        },
        audio: {
          narration: 0.9,
          effects: 0.75,
          music: 0.35,
        },
        rounds: [
          {
            id: "celebracao-volume-1",
            hint: "Visite os portais e complete a Arvore das Lembrancas.",
            narration: "Escolha um portal da festa para lembrar nossas descobertas. Toque nos objetos e complete a arvore.",
            celebration: {
              completePrompt: "Que festa linda! A Arvore das Lembrancas esta completa.",
              portals: [
                { id: "escola", label: "Escola das Descobertas", image: festaAsset("portals/escola.png"), x: 27, y: 30 },
                { id: "jardim", label: "Jardim das Descobertas", image: festaAsset("portals/jardim.png"), x: 67, y: 30 },
                { id: "arvore", label: "Arvore das Historias", image: festaAsset("portals/arvore.png"), x: 27, y: 66 },
                { id: "casinha", label: "Casinha do Tito", image: festaAsset("portals/casinha.png"), x: 67, y: 66 },
              ],
              memories: [
                { id: "caixa", label: "Caixa Misteriosa", image: festaAsset("objects/caixa.png") },
                { id: "cesta", label: "Cesta", image: festaAsset("objects/cesta.png") },
                { id: "ponte", label: "Ponte", image: festaAsset("objects/ponte.png") },
                { id: "atelie", label: "Atelie", image: festaAsset("objects/atelie.png") },
                { id: "flores", label: "Flores", image: festaAsset("objects/flores.png") },
                { id: "rotina", label: "Rotina", image: festaAsset("objects/rotina.png") },
              ],
            },
          },
        ],
      },
    },
    getGame(id) {
      return this.games[id] || this.games["caixa-misteriosa"];
    },
  };

  const progressController = {
    create(game) {
      return {
        gameId: game.id,
        screen: "intro",
        roundIndex: 0,
        completedRounds: [],
        placements: {},
        selectedDragId: null,
        snapPlacements: {},
        selectedSnapId: null,
        criteriaFound: [],
        pathProgress: 0,
        pathDrawing: false,
        canvasItems: [],
        selectedCanvasId: null,
        canvasSequence: 0,
        timelinePlacements: {},
        selectedTimelineId: null,
        journeyVisited: [],
        journeyCompleted: [],
        journeyActivePortal: null,
        xp: 0,
        medal: null,
        startedAt: Date.now(),
        completedAt: null,
        attempts: 0,
      };
    },
    place(state, dragId, dropId) {
      return {
        ...state,
        placements: { ...state.placements, [dragId]: dropId },
        selectedDragId: null,
        attempts: state.attempts + 1,
      };
    },
    snap(state, pieceId, slotId) {
      return {
        ...state,
        snapPlacements: { ...state.snapPlacements, [pieceId]: slotId },
        selectedSnapId: null,
        attempts: state.attempts + 1,
      };
    },
    nextRound(game, state) {
      const round = game.rounds[state.roundIndex];
      const completedRounds = [...new Set([...state.completedRounds, round.id])];
      if (state.roundIndex >= game.rounds.length - 1) {
        return { ...state, completedRounds, screen: "final", completedAt: Date.now() };
      }
      return { ...state, completedRounds, roundIndex: state.roundIndex + 1, screen: "room" };
    },
  };

  const rewardController = {
    records() {
      try {
        return JSON.parse(localStorage.getItem(storageKey) || "[]");
      } catch (error) {
        console.warn("Nao foi possivel ler progresso dos jogos.", error);
        return [];
      }
    },
    summary() {
      const records = this.records();
      const latestByGame = Object.values(gameRepository.games).map((game) => records.find((item) => item.gameId === game.id)).filter(Boolean);
      const totalXp = latestByGame.reduce((total, item) => total + (Number(item.xp) || 0), 0);
      const medals = latestByGame.map((item) => item.medal).filter(Boolean);
      const completed = latestByGame.length;
      const totalGames = Object.keys(gameRepository.games).length;
      return {
        records: latestByGame,
        totalXp,
        medals,
        completed,
        totalGames,
        percent: totalGames ? Math.round((completed / totalGames) * 100) : 0,
        streak: completed ? Math.min(7, completed + 1) : 0,
        lastActivity: latestByGame[0]?.completedAt || null,
      };
    },
    complete(game, state) {
      return { ...state, xp: game.xp, medal: game.medal, completedAt: Date.now(), screen: "final" };
    },
    persist(game, state) {
      const records = this.records();
      const duration = Math.max(1, Math.round(((state.completedAt || Date.now()) - state.startedAt) / 1000));
      const record = {
        gameId: game.id,
        title: game.title,
        completedExperience: true,
        durationSeconds: duration,
        xp: state.xp,
        medal: state.medal,
        permanentMedal: Boolean(game.permanentMedal),
        volume: game.volume || null,
        progress: 100,
        rounds: state.completedRounds,
        attempts: state.attempts,
        journey: game.type === "journey-celebration" ? {
          visitedPortals: state.journeyVisited,
          completedMemories: state.journeyCompleted,
        } : null,
        completedAt: new Date(state.completedAt || Date.now()).toISOString(),
        supabaseReady: {
          table: "student_game_progress",
          fields: ["student_id", "game_id", "xp", "medal", "duration_seconds", "progress", "completed_at", "payload"],
        },
      };
      localStorage.setItem(storageKey, JSON.stringify([record, ...records.filter((item) => item.gameId !== game.id)].slice(0, 20)));
      this.syncSupabase(record);
      window.dispatchEvent(new CustomEvent("raizes:game-progress", { detail: record }));
      return record;
    },
    syncSupabase(record) {
      const client = window.supabase;
      if (!client?.from) return;
      client
        .from("student_game_progress")
        .insert({
          game_id: record.gameId,
          xp: record.xp,
          medal: record.medal,
          permanent_medal: record.permanentMedal,
          volume: record.volume,
          duration_seconds: record.durationSeconds,
          progress: record.progress,
          completed_at: record.completedAt,
          payload: record,
        })
        .then(({ error }) => {
          if (error) {
            console.warn("Nao foi possivel sincronizar progresso do jogo.", error);
          }
        });
    },
    latest(gameId) {
      return this.records().find((item) => item.gameId === gameId) || null;
    },
  };

  const audioPlayer = {
    volumes: { narration: 0.9, effects: 0.75, music: 0.35 },
    speak(text, button) {
      if (!("speechSynthesis" in window)) {
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "pt-BR";
      utterance.rate = 0.86;
      utterance.volume = this.volumes.narration;
      button?.classList.add("is-playing");
      utterance.onend = () => button?.classList.remove("is-playing");
      window.speechSynthesis.speak(utterance);
    },
    blip(kind = "effects") {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        return;
      }
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = kind === "success" ? 720 : 260;
      gain.gain.value = this.volumes.effects * 0.08;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
      oscillator.stop(context.currentTime + 0.24);
    },
  };

  const components = {
    objectImage(src, alt) {
      return `<img class="game-object" src="${src}" alt="${alt}" loading="eager" decoding="async" />`;
    },
    particles(count = 26) {
      return `<div class="game-particles" aria-hidden="true">${Array.from({ length: count }, (_, index) => {
        const x = 18 + ((index * 19) % 66);
        const y = 28 + ((index * 29) % 46);
        return `<i style="--x:${x}%;--y:${y}%;--d:${(index % 9) * 120}ms"></i>`;
      }).join("")}</div>`;
    },
    confetti(count = 42) {
      const colors = ["#f45b45", "#f6c431", "#40a5d8", "#6dbf3a", "#b86adf"];
      return `<div class="game-confetti" aria-hidden="true">${Array.from({ length: count }, (_, index) => {
        const x = 4 + ((index * 11) % 92);
        return `<i style="--x:${x}%;--d:${(index % 12) * 110}ms;--c:${colors[index % colors.length]}"></i>`;
      }).join("")}</div>`;
    },
    audioButton(label, text) {
      return `<button class="game-audio-button" type="button" data-game-speak="${encodeURIComponent(text)}" aria-label="${label}" title="${label}">🔊</button>`;
    },
  };

  class GameEngine {
    constructor(root, gameId) {
      this.root = root;
      this.game = gameRepository.getGame(gameId);
      this.state = progressController.create(this.game);
      this.record = rewardController.latest(this.game.id);
      this.mode = root.dataset.gameId ? "player" : "hub";
    }

    mount() {
      this.root.style.setProperty("--game-atlas", `url("${this.game.assets.atlas}")`);
      this.root.style.setProperty("--library-atlas", `url("${this.game.assets.library}")`);
      this.root.innerHTML = this.render();
      this.bind();
      if (this.mode === "player") {
        this.go("intro");
      }
    }

    render() {
      if (this.mode === "hub") {
        return this.renderHub();
      }
      return this.renderPlayer();
    }

    renderHub() {
      const summary = rewardController.summary();
      return `
        <section class="game-shell game-hub-shell" aria-label="Hub Oficial dos Jogos Digitais">
          <header class="game-hub-header">
            <div>
              <span>Jogos Educativos</span>
              <h1>Escolha sua proxima descoberta</h1>
            </div>
            <aside class="game-hub-stats" aria-label="Progresso do aluno nos jogos">
              <strong>${summary.totalXp} XP</strong>
              <span>${summary.completed}/${summary.totalGames} jogos concluidos</span>
              <i><b style="width:${summary.percent}%"></b></i>
            </aside>
          </header>
          <div class="game-hub-grid">
            ${Object.values(gameRepository.games)
              .sort((a, b) => a.unlock.order - b.unlock.order)
              .map((game) => this.renderHubCard(game))
              .join("")}
          </div>
          <section class="game-student-sync" aria-label="Resumo sincronizado do aluno">
            <article><strong>Minhas Medalhas</strong><span>${summary.medals.length ? summary.medals.join(" · ") : "Complete um jogo para conquistar a primeira medalha."}</span></article>
            <article><strong>Meu Progresso</strong><span>${summary.percent}% da experiencia inicial concluida</span></article>
            <article><strong>Dias consecutivos</strong><span>${summary.streak} dias</span></article>
            <article><strong>Ultima atividade</strong><span>${summary.lastActivity ? new Date(summary.lastActivity).toLocaleDateString("pt-BR") : "Nenhuma atividade concluida"}</span></article>
          </section>
        </section>
      `;
    }

    renderHubCard(game) {
      const record = rewardController.latest(game.id);
      const progress = record?.progress || 0;
      const locked = game.unlock && game.unlock.unlocked === false;
      return `
        <article class="game-hub-card${locked ? " is-locked" : ""}">
          <img src="${game.assets.card || game.assets.screens.intro}" alt="${game.title}" loading="lazy" decoding="async" />
          <div class="game-hub-card-body">
            <span>${game.category}</span>
            <h2>${game.title}</h2>
            <p>${game.medal}</p>
            <div class="game-card-meta">
              <strong>⭐ ${game.xp} XP</strong>
              <strong>🏅 ${record?.medal || game.medal}</strong>
            </div>
            <i class="game-card-progress"><b style="width:${progress}%"></b></i>
            <button class="game-primary-button" type="button" data-game-play="${game.id}" ${locked ? "disabled" : ""}>${locked ? "Bloqueado" : "Jogar"}</button>
          </div>
        </article>
      `;
    }

    renderPlayer() {
      return `
        <section class="game-shell" aria-label="Motor Oficial dos Jogos Digitais">
          ${this.renderGamePicker()}
          ${this.renderTopbar()}
          <div class="game-layout">
            <main class="game-stage" data-game-stage>
              ${this.renderIntroScreen()}
              ${this.renderRoomScreen()}
              ${this.renderHintScreen()}
              ${this.renderChoiceScreen()}
              ${this.renderFeedbackScreen()}
              ${this.renderFinalScreen()}
            </main>
            <aside class="game-panel" aria-label="Painel do jogo">
              ${this.renderRoundPanel()}
              ${this.renderAudioPanel()}
            </aside>
          </div>
        </section>
      `;
    }

    renderGamePicker() {
      return `
        <nav class="game-picker" aria-label="Jogos digitais disponiveis">
          <button type="button" data-game-back>
            <span>Hub</span>
            <strong>Jogos Educativos</strong>
          </button>
          ${Object.values(gameRepository.games).sort((a, b) => a.unlock.order - b.unlock.order).map((game) => `
            <button class="${game.id === this.game.id ? "is-active" : ""}" type="button" data-game-select="${game.id}">
              <span>${game.category}</span>
              <strong>${game.title}</strong>
            </button>
          `).join("")}
        </nav>
      `;
    }

    renderTopbar() {
      const completed = this.record ? "Concluido" : "Pronto para jogar";
      return `
        <header class="game-topbar">
          <div class="game-title-block">
            <span class="game-brand-mark">RS</span>
            <div><h1>${this.game.title}</h1><span>${this.game.subtitle} · ${this.game.scenario}</span></div>
          </div>
          <div class="game-status" aria-label="Status do aluno">
            <span data-game-xp>⭐ ${this.record?.xp || 0} XP</span>
            <span data-game-medal>🏅 ${this.record?.medal || "Sem medalha"}</span>
            <span>${completed}</span>
          </div>
        </header>
      `;
    }

    renderIntroScreen() {
      return `
        <section class="game-screen" data-screen="intro" aria-label="Boas-vindas">
          <div class="game-scene game-scene-intro" style="--screen:url('${this.game.assets.screens.intro}')" aria-hidden="true"></div>
          ${components.particles(18)}
          <div class="game-hero-copy">
            <button class="game-primary-button game-start-button" type="button" data-game-action="start" aria-label="Comecar A Caixa Misteriosa">▶ Comecar</button>
          </div>
        </section>
      `;
    }

    renderRoomScreen() {
      if (this.game.type === "drag-drop") {
        const round = this.currentRound();
        return `
          <section class="game-screen" data-screen="room" aria-label="${round.layout === "shape-house" ? "Observando as formas" : "Observando as frutas"}">
            <div class="game-scene game-scene-room" style="--screen:url('${this.game.assets.screens.room}')" aria-hidden="true"></div>
            ${components.particles(18)}
            <button class="game-primary-button game-observe-button" type="button" data-game-action="begin-drag">${round.layout === "shape-house" ? "Montar" : "Organizar"}</button>
          </section>
        `;
      }
      if (this.game.type === "snap") {
        return `
          <section class="game-screen" data-screen="room" aria-label="Conhecendo os materiais">
            <div class="game-scene game-scene-room" style="--screen:url('${this.game.assets.screens.room}')" aria-hidden="true"></div>
            ${components.particles(16)}
            <article class="garden-prompt snap-prompt">
              ${components.audioButton("Ouvir instrucao", this.currentRound().narration)}
              <strong data-hint-text>${this.currentRound().hint}</strong>
            </article>
            <button class="game-primary-button game-observe-button" type="button" data-game-action="begin-snap">Construir</button>
          </section>
        `;
      }
      if (this.game.type === "criteria") {
        return `
          <section class="game-screen" data-screen="room" aria-label="Busca por criterios">
            <div class="game-scene game-scene-room" style="--screen:url('${this.game.assets.screens.room}')" aria-hidden="true"></div>
            ${components.particles(18)}
            <article class="garden-prompt">
              ${components.audioButton("Ouvir criterio", this.currentRound().narration)}
              <strong data-hint-text>${this.currentRound().hint}</strong>
            </article>
            <button class="game-primary-button game-observe-button" type="button" data-game-action="begin-criteria">Buscar</button>
          </section>
        `;
      }
      if (this.game.type === "path-follow") {
        return `
          <section class="game-screen" data-screen="room" aria-label="Percurso da Bia">
            <div class="game-scene game-scene-room" style="--screen:url('${this.game.assets.screens.room}')" aria-hidden="true"></div>
            ${components.particles(18)}
            <article class="garden-prompt">
              ${components.audioButton("Ouvir instrucao", this.currentRound().narration)}
              <strong data-hint-text>${this.currentRound().hint}</strong>
            </article>
            <button class="game-primary-button game-observe-button" type="button" data-game-action="begin-path">Seguir</button>
          </section>
        `;
      }
      if (this.game.type === "creative-canvas") {
        return `
          <section class="game-screen" data-screen="room" aria-label="Escolha dos materiais">
            <div class="game-scene game-scene-room" style="--screen:url('${this.game.assets.screens.room}')" aria-hidden="true"></div>
            ${components.particles(18)}
            <article class="garden-prompt">
              ${components.audioButton("Ouvir instrucao", this.currentRound().narration)}
              <strong data-hint-text>${this.currentRound().hint}</strong>
            </article>
            <button class="game-primary-button game-observe-button" type="button" data-game-action="begin-canvas">Criar</button>
          </section>
        `;
      }
      if (this.game.type === "timeline-sequence") {
        return `
          <section class="game-screen" data-screen="room" aria-label="Conhecendo a rotina">
            <div class="game-scene game-scene-room" style="--screen:url('${this.game.assets.screens.room}')" aria-hidden="true"></div>
            ${components.particles(18)}
            <article class="garden-prompt">
              ${components.audioButton("Ouvir instrucao", this.currentRound().narration)}
              <strong data-hint-text>${this.currentRound().hint}</strong>
            </article>
            <button class="game-primary-button game-observe-button" type="button" data-game-action="begin-timeline">Organizar</button>
          </section>
        `;
      }
      if (this.game.type === "journey-celebration") {
        return `
          <section class="game-screen" data-screen="room" aria-label="Mapa da festa">
            <div class="game-scene game-scene-room" style="--screen:url('${this.game.assets.screens.room}')" aria-hidden="true"></div>
            ${components.particles(24)}
            <article class="garden-prompt">
              ${components.audioButton("Ouvir instrucao", this.currentRound().narration)}
              <strong data-hint-text>${this.currentRound().hint}</strong>
            </article>
            <article class="journey-map-panel">
              <div class="journey-map" data-journey-map></div>
              <div class="journey-legend">
                <span><i></i> Disponivel</span>
                <span><i></i> Visitado</span>
                <span><i></i> Concluido</span>
              </div>
            </article>
          </section>
        `;
      }
      if (this.game.type === "find") {
        return `
          <section class="game-screen" data-screen="room" aria-label="Exploracao do jardim">
            <div class="game-scene game-scene-room" style="--screen:url('${this.game.assets.screens.room}')" aria-hidden="true"></div>
            ${components.particles(24)}
            <article class="garden-prompt">
              ${components.audioButton("Ouvir instrucao", this.currentRound().narration)}
              <strong data-hint-text>${this.currentRound().hint}</strong>
            </article>
            <button class="game-primary-button game-observe-button" type="button" data-game-action="choose">Explorar</button>
          </section>
        `;
      }
      return `
        <section class="game-screen" data-screen="room" aria-label="Sala das Descobertas">
          <div class="game-scene game-scene-room" style="--screen:url('${this.game.assets.screens.room}')" aria-hidden="true"></div>
          ${components.particles(30)}
          <button class="discovery-box is-glowing" type="button" data-game-action="open-box" aria-label="Abrir caixa misteriosa" style="--box:url('${this.game.assets.boxes.glowing}');--box-open:url('${this.game.assets.boxes.open}')"></button>
        </section>
      `;
    }

    renderHintScreen() {
      if (this.game.type === "drag-drop" || this.game.type === "find" || this.game.type === "snap" || this.game.type === "criteria" || this.game.type === "path-follow" || this.game.type === "creative-canvas" || this.game.type === "timeline-sequence" || this.game.type === "journey-celebration") {
        return "";
      }
      const round = this.currentRound();
      return `
        <section class="game-screen" data-screen="hint" aria-label="Dica narrada">
          <div class="game-scene game-scene-hint" style="--screen:url('${this.game.assets.screens.hint}')" aria-hidden="true"></div>
          <article class="hint-card">
            <p data-hint-text>${round.hint}</p>
            ${components.audioButton("Repetir dica", round.narration)}
          </article>
          <button class="game-primary-button" type="button" data-game-action="choose">Escolher</button>
        </section>
      `;
    }

    renderChoiceScreen() {
      if (this.game.type === "drag-drop") {
        const round = this.currentRound();
        if (round.layout === "shape-house") {
          return `
            <section class="game-screen" data-screen="choice" aria-label="Montagem da casa com formas">
              <div class="game-scene game-scene-choice" style="--screen:url('${this.game.assets.screens.choice}')" aria-hidden="true"></div>
              <article class="shape-house-panel">
                <h2>${round.hint}</h2>
                <div class="snap-state" data-house-state>Casa vazia</div>
                <div class="shape-house-board" data-shape-house-board></div>
                <div class="shape-house-tray" data-drag-item-tray></div>
              </article>
            </section>
          `;
        }
        return `
          <section class="game-screen" data-screen="choice" aria-label="Organizacao da cesta">
            <div class="game-scene game-scene-choice" style="--screen:url('${this.game.assets.screens.choice}')" aria-hidden="true"></div>
            <article class="drag-panel">
              <h2>Arraste cada fruta para o cesto certo.</h2>
              <div class="drop-zone-grid" data-drop-zone-grid></div>
              <div class="drag-item-tray" data-drag-item-tray></div>
            </article>
          </section>
        `;
      }
      if (this.game.type === "snap") {
        return `
          <section class="game-screen" data-screen="choice" aria-label="Construcao da ponte por encaixe">
            <div class="game-scene game-scene-choice" style="--screen:url('${this.game.assets.screens.choice}')" aria-hidden="true"></div>
            <article class="snap-panel">
              <h2>${this.currentRound().hint}</h2>
              <div class="snap-state" data-snap-state>Ponte vazia</div>
              <div class="snap-board" data-snap-board></div>
              <div class="snap-tray" data-snap-tray></div>
            </article>
          </section>
        `;
      }
      if (this.game.type === "criteria") {
        return `
          <section class="game-screen" data-screen="choice" aria-label="Escolha por criterios">
            <div class="game-scene game-scene-choice" style="--screen:url('${this.game.assets.screens.choice}')" aria-hidden="true"></div>
            <article class="criteria-panel">
              <h2>${this.currentRound().hint}</h2>
              <div class="criteria-progress" data-criteria-progress>0/${this.currentRound().required}</div>
              <div class="criteria-grid" data-criteria-grid></div>
            </article>
          </section>
        `;
      }
      if (this.game.type === "path-follow") {
        return `
          <section class="game-screen" data-screen="choice" aria-label="Seguir caminho">
            <div class="game-scene game-scene-choice" style="--screen:url('${this.game.assets.screens.choice}')" aria-hidden="true"></div>
            <article class="path-panel">
              <h2>${this.currentRound().hint}</h2>
              <div class="path-progress"><i><b data-path-progress style="width:0%"></b></i><span data-path-progress-label>0%</span></div>
              <div class="path-board" data-path-board></div>
            </article>
          </section>
        `;
      }
      if (this.game.type === "creative-canvas") {
        return `
          <section class="game-screen" data-screen="choice" aria-label="Canvas criativo">
            <div class="game-scene game-scene-choice" style="--screen:url('${this.game.assets.screens.choice}')" aria-hidden="true"></div>
            <article class="creative-panel">
              <h2>${this.currentRound().hint}</h2>
              <div class="creative-layout">
                <div class="creative-palette" data-creative-palette></div>
                <div class="creative-canvas" data-creative-canvas></div>
                <div class="creative-tools">
                  <button type="button" data-game-action="add-canvas-element">Adicionar elementos</button>
                  <button type="button" data-game-action="reorganize-canvas">Reorganizar</button>
                  <button type="button" data-game-action="clear-canvas">Limpar</button>
                  <button type="button" data-game-action="finish-canvas">Finalizar</button>
                </div>
              </div>
            </article>
          </section>
        `;
      }
      if (this.game.type === "timeline-sequence") {
        return `
          <section class="game-screen" data-screen="choice" aria-label="Sequencia temporal">
            <div class="game-scene game-scene-choice" style="--screen:url('${this.game.assets.screens.choice}')" aria-hidden="true"></div>
            <article class="timeline-panel">
              <h2>${this.currentRound().hint}</h2>
              <div class="timeline-feedback" data-timeline-feedback>${this.currentRound().timeline.positivePrompt}</div>
              <div class="timeline-board" data-timeline-board></div>
              <div class="timeline-card-tray" data-timeline-card-tray></div>
            </article>
          </section>
        `;
      }
      if (this.game.type === "journey-celebration") {
        return `
          <section class="game-screen" data-screen="choice" aria-label="Exploracao dos cenarios">
            <div class="game-scene game-scene-choice" style="--screen:url('${this.game.assets.screens.choice}')" aria-hidden="true"></div>
            <article class="journey-explore-panel">
              <h2 data-journey-title>Vamos relembrar todas as nossas aventuras!</h2>
              <div class="journey-objects" data-journey-objects></div>
              <div class="memory-tree" data-memory-tree></div>
              <div class="journey-actions">
                <button class="game-secondary-button" type="button" data-game-action="journey-map">Voltar ao mapa</button>
                <button class="game-primary-button journey-finish-button" type="button" data-game-action="finish-journey">Celebrar</button>
              </div>
            </article>
          </section>
        `;
      }
      if (this.game.type === "find") {
        return `
          <section class="game-screen" data-screen="choice" aria-label="Encontrar elementos do jardim">
            <div class="game-scene game-scene-choice" style="--screen:url('${this.game.assets.screens.choice}')" aria-hidden="true"></div>
            <article class="choice-panel garden-choice-panel">
              <h2 data-choice-title>${this.currentRound().hint}</h2>
              <div class="choice-cards" data-choice-cards></div>
            </article>
          </section>
        `;
      }
      return `
        <section class="game-screen" data-screen="choice" aria-label="Escolha do objeto">
          <div class="game-scene game-scene-choice" style="--screen:url('${this.game.assets.screens.choice}')" aria-hidden="true"></div>
          <article class="choice-panel">
            <h2>Qual sera o objeto da nossa caixa?</h2>
            <div class="choice-cards" data-choice-cards></div>
          </article>
        </section>
      `;
    }

    renderFeedbackScreen() {
      return `
        <section class="game-screen" data-screen="feedback" aria-label="Feedback positivo">
          <div class="game-scene game-scene-feedback" style="--screen:url('${this.game.assets.screens.feedback}')" aria-hidden="true"></div>
          ${components.confetti()}
          <article class="feedback-panel">
            <button class="game-primary-button" type="button" data-game-action="next-round">Continuar</button>
          </article>
        </section>
      `;
    }

    renderFinalScreen() {
      return `
        <section class="game-screen" data-screen="final" aria-label="Medalha e XP">
          <div class="game-scene game-scene-final" style="--screen:url('${this.game.assets.screens.final}')" aria-hidden="true"></div>
          ${components.confetti(54)}
          <article class="final-panel">
            <span class="xp-counter" data-xp-counter>⭐ +0 XP</span>
            <div class="final-actions">
              <button class="game-primary-button game-restart-button" type="button" data-game-action="restart" aria-label="Jogar novamente">↻ Jogar novamente</button>
              <a class="game-secondary-button" href="aluno.html">Voltar ao menu</a>
            </div>
          </article>
        </section>
      `;
    }

    renderRoundPanel() {
      return `
        <section>
          <h2>Rodadas configuradas</h2>
          <ul class="round-list" data-round-list>
            ${this.game.rounds.map((round, index) => `<li data-round-id="${round.id}"><b>${index + 1}</b><span>${round.hint}</span></li>`).join("")}
          </ul>
        </section>
      `;
    }

    renderAudioPanel() {
      return `
        <section class="game-audio-panel" aria-label="Controle de audio">
          <h2>Audio</h2>
          ${["narration", "effects", "music"].map((key) => `
            <div class="audio-row">
              <label>${key === "narration" ? "Narracao" : key === "effects" ? "Efeitos" : "Musica ambiente"}
                <input type="range" min="0" max="1" step="0.05" value="${this.game.audio[key]}" data-volume="${key}" />
              </label>
            </div>
          `).join("")}
          <div class="game-asset-strip" aria-label="Pranchas oficiais integradas">
            <img src="${this.game.assets.scenarios}" alt="Biblioteca de cenarios oficiais" />
            <img src="${this.game.assets.flow}" alt="Fluxo visual homologado do jogo" />
            <img src="${this.game.assets.library}" alt="Biblioteca oficial de objetos e efeitos" />
          </div>
        </section>
      `;
    }

    currentRound() {
      return this.game.rounds[this.state.roundIndex];
    }

    bind() {
      if (this.bound) return;
      this.bound = true;
      this.root.addEventListener("click", (event) => {
        const gameSelect = event.target.closest("[data-game-select]");
        const gamePlay = event.target.closest("[data-game-play]");
        const gameBack = event.target.closest("[data-game-back]");
        const action = event.target.closest("[data-game-action]")?.dataset.gameAction;
        const card = event.target.closest("[data-choice-id]");
        const criteria = event.target.closest("[data-criteria-id]");
        const pathPoint = event.target.closest("[data-path-point-id]");
        const creativeElement = event.target.closest("[data-creative-element-id]");
        const canvasItem = event.target.closest("[data-canvas-item-id]");
        const removeCanvas = event.target.closest("[data-remove-canvas-id]");
        const timelineCard = event.target.closest("[data-timeline-card-id]");
        const timelineSlot = event.target.closest("[data-timeline-slot-id]");
        const journeyPortal = event.target.closest("[data-journey-portal-id]");
        const journeyObject = event.target.closest("[data-journey-object-id]");
        const dragItem = event.target.closest("[data-drag-id]");
        const dropTarget = event.target.closest("[data-drop-id]");
        const shapeBoard = event.target.closest("[data-shape-house-board]");
        const snapPiece = event.target.closest("[data-snap-piece-id]");
        const snapSlot = event.target.closest("[data-snap-slot-id]");
        const snapBoard = event.target.closest("[data-snap-board]");
        const speak = event.target.closest("[data-game-speak]");
        if (gamePlay) this.openGame(gamePlay.dataset.gamePlay);
        if (gameSelect) this.openGame(gameSelect.dataset.gameSelect);
        if (gameBack) this.openHub();
        if (action) this.handleAction(action, event.target.closest("button"));
        if (card) this.answer(card.dataset.choiceId, card);
        if (criteria) this.answerCriteria(criteria.dataset.criteriaId, criteria);
        if (pathPoint) this.advancePath(pathPoint.dataset.pathPointId, pathPoint);
        if (creativeElement) this.addCanvasItem(creativeElement.dataset.creativeElementId);
        if (removeCanvas) {
          this.removeCanvasItem(removeCanvas.dataset.removeCanvasId);
        } else if (canvasItem) {
          this.selectCanvasItem(canvasItem.dataset.canvasItemId);
        }
        if (timelineCard) this.selectTimelineCard(timelineCard.dataset.timelineCardId);
        if (timelineSlot) this.placeSelectedTimelineCard(timelineSlot.dataset.timelineSlotId);
        if (journeyPortal) this.visitJourneyPortal(journeyPortal.dataset.journeyPortalId);
        if (journeyObject) this.collectJourneyMemory(journeyObject.dataset.journeyObjectId);
        if (dragItem) this.selectDragItem(dragItem.dataset.dragId);
        if (dropTarget) this.dropSelectedItem(dropTarget.dataset.dropId);
        if (snapPiece) this.selectSnapPiece(snapPiece.dataset.snapPieceId);
        if (snapSlot) this.snapSelectedPiece(snapSlot.dataset.snapSlotId);
        if (speak) audioPlayer.speak(decodeURIComponent(speak.dataset.gameSpeak), speak);
      });
      this.root.addEventListener("dragstart", (event) => {
        const dragItem = event.target.closest("[data-drag-id]");
        const snapPiece = event.target.closest("[data-snap-piece-id]");
        const creativeElement = event.target.closest("[data-creative-element-id]");
        const canvasItem = event.target.closest("[data-canvas-item-id]");
        const timelineCard = event.target.closest("[data-timeline-card-id]");
        if (dragItem) {
          event.dataTransfer?.setData("text/plain", dragItem.dataset.dragId);
          event.dataTransfer?.setData("application/x-raizes-drag", dragItem.dataset.dragId);
        }
        if (snapPiece) {
          event.dataTransfer?.setData("text/plain", snapPiece.dataset.snapPieceId);
          event.dataTransfer?.setData("application/x-raizes-snap", snapPiece.dataset.snapPieceId);
        }
        if (creativeElement) {
          event.dataTransfer?.setData("application/x-raizes-creative", creativeElement.dataset.creativeElementId);
        }
        if (canvasItem) {
          event.dataTransfer?.setData("application/x-raizes-canvas-item", canvasItem.dataset.canvasItemId);
        }
        if (timelineCard) {
          event.dataTransfer?.setData("text/plain", timelineCard.dataset.timelineCardId);
          event.dataTransfer?.setData("application/x-raizes-timeline", timelineCard.dataset.timelineCardId);
        }
      });
      this.root.addEventListener("dragover", (event) => {
        if (event.target.closest("[data-drop-id]") || event.target.closest("[data-shape-house-board]") || event.target.closest("[data-snap-slot-id]") || event.target.closest("[data-snap-board]") || event.target.closest("[data-creative-canvas]") || event.target.closest("[data-timeline-slot-id]") || event.target.closest("[data-timeline-board]")) {
          event.preventDefault();
        }
      });
      this.root.addEventListener("drop", (event) => {
        const dropTarget = event.target.closest("[data-drop-id]");
        const shapeBoard = event.target.closest("[data-shape-house-board]");
        const snapSlot = event.target.closest("[data-snap-slot-id]");
        const snapBoard = event.target.closest("[data-snap-board]");
        const creativeCanvas = event.target.closest("[data-creative-canvas]");
        const timelineSlot = event.target.closest("[data-timeline-slot-id]");
        const timelineBoard = event.target.closest("[data-timeline-board]");
        if (!dropTarget && !shapeBoard && !snapSlot && !snapBoard && !creativeCanvas && !timelineSlot && !timelineBoard) return;
        event.preventDefault();
        const snapId = event.dataTransfer?.getData("application/x-raizes-snap");
        const creativeId = event.dataTransfer?.getData("application/x-raizes-creative");
        const canvasItemId = event.dataTransfer?.getData("application/x-raizes-canvas-item");
        const dragId = event.dataTransfer?.getData("application/x-raizes-drag") || event.dataTransfer?.getData("text/plain");
        const timelineId = event.dataTransfer?.getData("application/x-raizes-timeline") || (this.game.type === "timeline-sequence" ? event.dataTransfer?.getData("text/plain") : "");
        if ((timelineSlot || timelineBoard) && timelineId) {
          const nearest = timelineSlot || this.findNearestTimelineSlot(event.clientX, event.clientY);
          this.placeTimelineCard(timelineId, nearest?.dataset.timelineSlotId);
          return;
        }
        if (creativeCanvas && creativeId) {
          this.addCanvasItem(creativeId, event.clientX, event.clientY);
          return;
        }
        if (creativeCanvas && canvasItemId) {
          this.moveCanvasItem(canvasItemId, event.clientX, event.clientY);
          return;
        }
        if (snapSlot && snapId) {
          this.snapPiece(snapId, snapSlot.dataset.snapSlotId, snapSlot);
          return;
        }
        if (snapBoard && snapId) {
          const nearestSlot = this.findNearestSnapSlot(event.clientX, event.clientY);
          if (nearestSlot) this.snapPiece(snapId, nearestSlot.dataset.snapSlotId, nearestSlot);
          return;
        }
        if (shapeBoard && dragId) {
          const nearestDrop = this.findNearestDropTarget(event.clientX, event.clientY);
          if (nearestDrop) this.placeDragItem(dragId, nearestDrop.dataset.dropId);
          return;
        }
        if (dropTarget && dragId) this.placeDragItem(dragId, dropTarget.dataset.dropId);
      });
      this.root.addEventListener("pointerdown", (event) => {
        const board = event.target.closest("[data-path-board]");
        if (!board) return;
        this.state = { ...this.state, pathDrawing: true };
        this.advanceNearestPathPoint(event.clientX, event.clientY);
      });
      this.root.addEventListener("pointermove", (event) => {
        if (!this.state.pathDrawing) return;
        if (!event.target.closest("[data-path-board]")) return;
        this.advanceNearestPathPoint(event.clientX, event.clientY);
      });
      this.root.addEventListener("pointerup", () => {
        if (this.state.pathDrawing) this.state = { ...this.state, pathDrawing: false };
      });
      this.root.addEventListener("input", (event) => {
        const input = event.target.closest("[data-volume]");
        if (!input) return;
        audioPlayer.volumes[input.dataset.volume] = Number(input.value);
      });
    }

    openGame(gameId) {
      this.mode = "player";
      this.game = gameRepository.getGame(gameId);
      this.state = progressController.create(this.game);
      this.record = rewardController.latest(this.game.id);
      this.root.style.setProperty("--game-atlas", `url("${this.game.assets.atlas}")`);
      this.root.style.setProperty("--library-atlas", `url("${this.game.assets.library}")`);
      this.root.innerHTML = this.render();
      this.updateRoundContent();
      this.go("intro");
    }

    openHub() {
      this.mode = "hub";
      this.root.innerHTML = this.render();
    }

    handleAction(action, button) {
      if (action === "start") {
        audioPlayer.blip();
        this.updateRoundContent();
        this.go("room");
        if (this.game.type === "find") {
          audioPlayer.speak(this.currentRound().narration, null);
        }
        if (this.game.type === "journey-celebration") {
          audioPlayer.speak(this.currentRound().narration, null);
        }
      }
      if (action === "begin-drag") {
        this.updateRoundContent();
        audioPlayer.speak(this.currentRound().narration, null);
        this.go("choice");
      }
      if (action === "begin-snap") {
        this.updateRoundContent();
        audioPlayer.speak(this.currentRound().narration, null);
        this.go("choice");
      }
      if (action === "begin-criteria") {
        this.updateRoundContent();
        audioPlayer.speak(this.currentRound().narration, null);
        this.go("choice");
      }
      if (action === "begin-path") {
        this.updateRoundContent();
        audioPlayer.speak(this.currentRound().narration, null);
        this.go("choice");
      }
      if (action === "begin-canvas") {
        this.updateRoundContent();
        audioPlayer.speak(this.currentRound().narration, null);
        this.go("choice");
      }
      if (action === "begin-timeline") {
        this.updateRoundContent();
        audioPlayer.speak(this.currentRound().narration, null);
        this.go("choice");
      }
      if (action === "finish-journey") {
        this.finishJourney();
      }
      if (action === "journey-map") {
        this.updateRoundContent();
        this.go("room");
      }
      if (action === "add-canvas-element") {
        const first = this.currentRound().canvas.elements[0];
        if (first) this.addCanvasItem(first.id);
      }
      if (action === "reorganize-canvas") {
        this.reorganizeCanvas();
      }
      if (action === "clear-canvas") {
        this.state = { ...this.state, canvasItems: [], selectedCanvasId: null };
        this.syncCanvas();
      }
      if (action === "finish-canvas") {
        this.finishCanvas();
      }
      if (action === "open-box") {
        button?.classList.add("is-opening");
        audioPlayer.blip("success");
        window.setTimeout(() => {
          this.updateRoundContent();
          this.go("hint");
          audioPlayer.speak(this.currentRound().narration, this.root.querySelector("[data-game-speak]"));
        }, 680);
      }
      if (action === "choose") {
        this.updateRoundContent();
        this.go("choice");
      }
      if (action === "next-round") {
        this.state = progressController.nextRound(this.game, this.state);
        if (this.state.screen === "final") {
          this.finish();
        } else {
          this.updateRoundContent();
          this.go("room");
        }
      }
      if (action === "restart") {
        this.state = progressController.create(this.game);
        this.updateRoundContent();
        this.go("intro");
      }
    }

    answer(choiceId, card) {
      const round = this.currentRound();
      this.state = { ...this.state, attempts: this.state.attempts + 1 };
      if (choiceId !== round.correctId) {
        card.classList.add("is-wrong");
        audioPlayer.blip();
        audioPlayer.speak("Tente novamente. Ouca a dica com carinho.", null);
        return;
      }
      card.classList.add("is-correct");
      audioPlayer.blip("success");
      window.setTimeout(() => this.go("feedback"), 520);
    }

    answerCriteria(choiceId, card) {
      if (this.game.type !== "criteria") return;
      const round = this.currentRound();
      const choice = round.choices.find((entry) => entry.id === choiceId);
      this.state = { ...this.state, attempts: this.state.attempts + 1 };
      if (!choice?.correct) {
        card.classList.add("is-wrong");
        audioPlayer.blip();
        audioPlayer.speak("Esse nao combina com o criterio. Tente outro.", null);
        window.setTimeout(() => card.classList.remove("is-wrong"), 620);
        return;
      }
      const found = [...new Set([...this.state.criteriaFound, choiceId])];
      this.state = { ...this.state, criteriaFound: found };
      card.classList.add("is-correct");
      audioPlayer.blip("success");
      this.syncCriteria();
      if (found.length >= round.required) {
        this.state = { ...this.state, completedRounds: [round.id] };
        window.setTimeout(() => this.go("feedback"), 620);
      }
    }

    advancePath(pointId, point) {
      if (this.game.type !== "path-follow") return;
      const points = this.currentRound().path.points;
      const expected = points[this.state.pathProgress];
      if (!expected || expected.id !== pointId) {
        point?.classList.add("is-wrong");
        audioPlayer.blip();
        window.setTimeout(() => point?.classList.remove("is-wrong"), 420);
        return;
      }
      this.state = { ...this.state, pathProgress: this.state.pathProgress + 1, attempts: this.state.attempts + 1 };
      point?.classList.add("is-done");
      audioPlayer.blip("success");
      this.syncPath();
      if (this.state.pathProgress >= points.length) {
        this.state = { ...this.state, completedRounds: [this.currentRound().id], pathDrawing: false };
        this.root.querySelector("[data-path-board]")?.classList.add("is-complete");
        window.setTimeout(() => this.go("feedback"), 740);
      }
    }

    advanceNearestPathPoint(clientX, clientY) {
      if (this.game.type !== "path-follow") return;
      const tolerance = this.currentRound().path?.tolerance || 80;
      const expected = this.currentRound().path.points[this.state.pathProgress];
      if (!expected) return;
      const point = this.root.querySelector(`[data-path-point-id="${expected.id}"]`);
      if (!point) return;
      const box = point.getBoundingClientRect();
      const distance = Math.hypot(box.left + box.width / 2 - clientX, box.top + box.height / 2 - clientY);
      if (distance <= tolerance) this.advancePath(expected.id, point);
    }

    selectTimelineCard(cardId) {
      if (this.game.type !== "timeline-sequence") return;
      const alreadyPlaced = Object.values(this.state.timelinePlacements).includes(cardId);
      if (alreadyPlaced) return;
      this.state = { ...this.state, selectedTimelineId: this.state.selectedTimelineId === cardId ? null : cardId };
      this.syncTimeline();
    }

    placeSelectedTimelineCard(slotId) {
      if (!this.state.selectedTimelineId) return;
      this.placeTimelineCard(this.state.selectedTimelineId, slotId);
    }

    nextTimelineSlot() {
      const timeline = this.currentRound().timeline;
      return timeline.slots.find((slot) => !this.state.timelinePlacements[slot.id]) || null;
    }

    findNearestTimelineSlot(clientX, clientY) {
      const tolerance = this.currentRound().timeline?.tolerance || 90;
      const slots = [...this.root.querySelectorAll("[data-timeline-slot-id]")];
      return slots.reduce((nearest, slot) => {
        const box = slot.getBoundingClientRect();
        const centerX = box.left + box.width / 2;
        const centerY = box.top + box.height / 2;
        const distance = Math.hypot(centerX - clientX, centerY - clientY);
        if (distance > tolerance) return nearest;
        if (!nearest || distance < nearest.distance) return { slot, distance };
        return nearest;
      }, null)?.slot || null;
    }

    placeTimelineCard(cardId, requestedSlotId) {
      if (this.game.type !== "timeline-sequence") return;
      const round = this.currentRound();
      const timeline = round.timeline;
      const chosenCard = timeline.cards.find((card) => card.id === cardId);
      if (!chosenCard || Object.values(this.state.timelinePlacements).includes(cardId)) return;
      const requestedSlot = timeline.slots.find((slot) => slot.id === requestedSlotId);
      const nextSlot = this.nextTimelineSlot();
      const targetSlot = requestedSlot && !this.state.timelinePlacements[requestedSlot.id] ? requestedSlot : nextSlot;
      if (!targetSlot) return;
      const expectedCard = timeline.cards.find((card) => card.targetId === targetSlot.id && !Object.values(this.state.timelinePlacements).includes(card.id));
      const cardToPlace = expectedCard || chosenCard;
      this.state = {
        ...this.state,
        timelinePlacements: { ...this.state.timelinePlacements, [targetSlot.id]: cardToPlace.id },
        selectedTimelineId: null,
        attempts: this.state.attempts + 1,
      };
      audioPlayer.blip("success");
      this.syncTimeline();
      const slotNode = this.root.querySelector(`[data-timeline-slot-id="${targetSlot.id}"]`);
      slotNode?.classList.add("is-snapped");
      window.setTimeout(() => slotNode?.classList.remove("is-snapped"), 760);
      const feedback = this.root.querySelector("[data-timeline-feedback]");
      if (feedback) feedback.textContent = timeline.positivePrompt;
      const complete = timeline.slots.every((slot) => Boolean(this.state.timelinePlacements[slot.id]));
      if (complete) {
        this.state = { ...this.state, completedRounds: [round.id] };
        this.root.querySelector("[data-timeline-board]")?.classList.add("is-complete");
        window.setTimeout(() => this.go("feedback"), 900);
      }
    }

    visitJourneyPortal(portalId) {
      if (this.game.type !== "journey-celebration") return;
      const portal = this.currentRound().celebration.portals.find((entry) => entry.id === portalId);
      if (!portal) return;
      this.state = {
        ...this.state,
        journeyActivePortal: portalId,
        journeyVisited: [...new Set([...this.state.journeyVisited, portalId])],
        attempts: this.state.attempts + 1,
      };
      audioPlayer.blip("success");
      this.updateRoundContent();
      this.go("choice");
      audioPlayer.speak(`Vamos visitar ${portal.label} e lembrar nossas descobertas.`, null);
    }

    collectJourneyMemory(memoryId) {
      if (this.game.type !== "journey-celebration") return;
      const round = this.currentRound();
      const memory = round.celebration.memories.find((entry) => entry.id === memoryId);
      if (!memory || this.state.journeyCompleted.includes(memoryId)) return;
      const activePortal = this.state.journeyActivePortal || round.celebration.portals[0]?.id;
      const nextVisited = activePortal ? [...new Set([...this.state.journeyVisited, activePortal])] : this.state.journeyVisited;
      this.state = {
        ...this.state,
        journeyActivePortal: activePortal,
        journeyVisited: nextVisited,
        journeyCompleted: [...new Set([...this.state.journeyCompleted, memoryId])],
        attempts: this.state.attempts + 1,
      };
      audioPlayer.blip("success");
      this.updateRoundContent();
      const allCollected = round.celebration.memories.every((entry) => this.state.journeyCompleted.includes(entry.id));
      if (allCollected) {
        this.root.querySelector("[data-memory-tree]")?.classList.add("is-complete");
      }
    }

    finishJourney() {
      if (this.game.type !== "journey-celebration") return;
      const round = this.currentRound();
      if (!this.state.journeyCompleted.length) {
        this.collectJourneyMemory(round.celebration.memories[0]?.id);
      }
      this.state = {
        ...this.state,
        journeyVisited: round.celebration.portals.map((portal) => portal.id),
        journeyCompleted: round.celebration.memories.map((memory) => memory.id),
        completedRounds: [round.id],
      };
      this.updateRoundContent();
      this.go("feedback");
    }

    canvasCoordinates(clientX, clientY) {
      const canvas = this.root.querySelector("[data-creative-canvas]");
      if (!canvas) return { x: 50, y: 50 };
      if (typeof clientX !== "number" || typeof clientY !== "number") {
        const index = this.state.canvasItems.length;
        return { x: 28 + (index * 17) % 46, y: 34 + (index * 13) % 34 };
      }
      const box = canvas.getBoundingClientRect();
      return {
        x: Math.max(8, Math.min(92, ((clientX - box.left) / box.width) * 100)),
        y: Math.max(8, Math.min(92, ((clientY - box.top) / box.height) * 100)),
      };
    }

    addCanvasItem(elementId, clientX, clientY) {
      if (this.game.type !== "creative-canvas") return;
      const element = this.currentRound().canvas.elements.find((entry) => entry.id === elementId);
      if (!element) return;
      const point = this.canvasCoordinates(clientX, clientY);
      const sequence = this.state.canvasSequence + 1;
      const item = {
        id: `${element.id}-${Date.now()}-${sequence}`,
        elementId: element.id,
        x: point.x,
        y: point.y,
        scale: 0.92 + (sequence % 4) * 0.08,
        rotate: ((sequence % 7) - 3) * 8,
      };
      this.state = {
        ...this.state,
        canvasItems: [...this.state.canvasItems, item],
        selectedCanvasId: item.id,
        canvasSequence: sequence,
        attempts: this.state.attempts + 1,
      };
      audioPlayer.blip("success");
      this.syncCanvas();
    }

    selectCanvasItem(itemId) {
      if (this.game.type !== "creative-canvas") return;
      this.state = { ...this.state, selectedCanvasId: this.state.selectedCanvasId === itemId ? null : itemId };
      this.syncCanvas();
    }

    moveCanvasItem(itemId, clientX, clientY) {
      if (this.game.type !== "creative-canvas") return;
      const point = this.canvasCoordinates(clientX, clientY);
      this.state = {
        ...this.state,
        canvasItems: this.state.canvasItems.map((item) => (item.id === itemId ? { ...item, x: point.x, y: point.y } : item)),
        selectedCanvasId: itemId,
        attempts: this.state.attempts + 1,
      };
      audioPlayer.blip("success");
      this.syncCanvas();
    }

    removeCanvasItem(itemId) {
      if (this.game.type !== "creative-canvas") return;
      this.state = {
        ...this.state,
        canvasItems: this.state.canvasItems.filter((item) => item.id !== itemId),
        selectedCanvasId: this.state.selectedCanvasId === itemId ? null : this.state.selectedCanvasId,
      };
      audioPlayer.blip();
      this.syncCanvas();
    }

    reorganizeCanvas() {
      if (this.game.type !== "creative-canvas") return;
      this.state = {
        ...this.state,
        canvasItems: this.state.canvasItems.map((item, index) => ({
          ...item,
          x: 22 + (index * 19) % 58,
          y: 28 + (index * 17) % 44,
          rotate: ((index % 5) - 2) * 10,
        })),
      };
      audioPlayer.blip("success");
      this.syncCanvas();
    }

    finishCanvas() {
      if (this.game.type !== "creative-canvas") return;
      const round = this.currentRound();
      if (!this.state.canvasItems.length) {
        this.addCanvasItem(round.canvas.elements[0]?.id);
      }
      this.state = { ...this.state, completedRounds: [round.id] };
      this.go("feedback");
    }

    selectDragItem(dragId) {
      if (this.game.type !== "drag-drop") return;
      const alreadyPlaced = Boolean(this.state.placements[dragId]);
      if (alreadyPlaced) return;
      this.state = { ...this.state, selectedDragId: this.state.selectedDragId === dragId ? null : dragId };
      this.syncDragDrop();
    }

    dropSelectedItem(dropId) {
      if (!this.state.selectedDragId) return;
      this.placeDragItem(this.state.selectedDragId, dropId);
    }

    placeDragItem(dragId, dropId) {
      if (this.game.type !== "drag-drop") return;
      const round = this.currentRound();
      const item = round.items.find((entry) => entry.id === dragId);
      if (!item || this.state.placements[dragId]) return;
      if (item.targetId !== dropId) {
        audioPlayer.blip();
        this.root.querySelector(`[data-drop-id="${dropId}"]`)?.classList.add("is-wrong");
        window.setTimeout(() => this.root.querySelector(`[data-drop-id="${dropId}"]`)?.classList.remove("is-wrong"), 520);
        return;
      }
      this.state = progressController.place(this.state, dragId, dropId);
      audioPlayer.blip("success");
      this.syncDragDrop();
      const filledDrop = this.root.querySelector(`[data-drop-id="${dropId}"]`);
      filledDrop?.classList.add("is-snapped");
      window.setTimeout(() => filledDrop?.classList.remove("is-snapped"), 700);
      const complete = round.items.every((entry) => this.state.placements[entry.id] === entry.targetId);
      if (complete) {
        this.state = { ...this.state, completedRounds: [round.id] };
        this.root.querySelector("[data-shape-house-board]")?.classList.add("is-complete");
        window.setTimeout(() => this.go("feedback"), 620);
      }
    }

    findNearestDropTarget(clientX, clientY) {
      const tolerance = 82;
      const drops = [...this.root.querySelectorAll("[data-drop-id]")];
      return drops.reduce((nearest, drop) => {
        const box = drop.getBoundingClientRect();
        const centerX = box.left + box.width / 2;
        const centerY = box.top + box.height / 2;
        const distance = Math.hypot(centerX - clientX, centerY - clientY);
        if (distance > tolerance) return nearest;
        if (!nearest || distance < nearest.distance) return { drop, distance };
        return nearest;
      }, null)?.drop || null;
    }

    selectSnapPiece(pieceId) {
      if (this.game.type !== "snap") return;
      if (this.state.snapPlacements[pieceId]) return;
      this.state = { ...this.state, selectedSnapId: this.state.selectedSnapId === pieceId ? null : pieceId };
      this.syncSnap();
    }

    snapSelectedPiece(slotId) {
      if (!this.state.selectedSnapId) return;
      const slot = this.root.querySelector(`[data-snap-slot-id="${slotId}"]`);
      this.snapPiece(this.state.selectedSnapId, slotId, slot);
    }

    snapPiece(pieceId, slotId, slotElement) {
      if (this.game.type !== "snap") return;
      const round = this.currentRound();
      const snap = round.snap;
      const piece = snap.pieces.find((entry) => entry.id === pieceId);
      const slot = snap.slots.find((entry) => entry.id === slotId);
      if (!piece || !slot || this.state.snapPlacements[pieceId]) return;
      if (piece.targetId !== slotId) {
        audioPlayer.blip();
        slotElement?.classList.add("is-wrong");
        window.setTimeout(() => slotElement?.classList.remove("is-wrong"), 520);
        return;
      }
      this.state = progressController.snap(this.state, pieceId, slotId);
      audioPlayer.blip("success");
      this.syncSnap();
      const placedNode = this.root.querySelector(`[data-snap-slot-id="${slotId}"]`);
      placedNode?.classList.add("is-snapped");
      window.setTimeout(() => placedNode?.classList.remove("is-snapped"), 760);
      const complete = snap.pieces.every((entry) => this.state.snapPlacements[entry.id] === entry.targetId);
      if (complete) {
        this.state = { ...this.state, completedRounds: [round.id] };
        this.root.querySelector("[data-snap-board]")?.classList.add("is-complete");
        window.setTimeout(() => this.go("feedback"), 980);
      }
    }

    findNearestSnapSlot(clientX, clientY) {
      const tolerance = this.currentRound().snap?.tolerance || 64;
      const slots = [...this.root.querySelectorAll("[data-snap-slot-id]")];
      return slots.reduce((nearest, slot) => {
        const box = slot.getBoundingClientRect();
        const centerX = box.left + box.width / 2;
        const centerY = box.top + box.height / 2;
        const distance = Math.hypot(centerX - clientX, centerY - clientY);
        if (distance > tolerance) return nearest;
        if (!nearest || distance < nearest.distance) return { slot, distance };
        return nearest;
      }, null)?.slot || null;
    }

    finish() {
      this.state = rewardController.complete(this.game, this.state);
      this.record = rewardController.persist(this.game, this.state);
      this.go("final");
      this.animateXp();
      this.root.querySelector("[data-game-xp]").textContent = `⭐ ${this.state.xp} XP`;
      this.root.querySelector("[data-game-medal]").textContent = `🏅 ${this.state.medal}`;
    }

    go(screen) {
      this.state.screen = screen;
      this.root.querySelectorAll("[data-screen]").forEach((item) => {
        item.classList.toggle("is-active", item.dataset.screen === screen);
      });
      this.syncRounds();
    }

    updateRoundContent() {
      const round = this.currentRound();
      if (this.game.type === "drag-drop") {
        if (round.layout === "shape-house") {
          const board = this.root.querySelector("[data-shape-house-board]");
          const tray = this.root.querySelector("[data-drag-item-tray]");
          const stateLabel = this.root.querySelector("[data-house-state]");
          const placedCount = round.items.filter((item) => this.state.placements[item.id] === item.targetId).length;
          if (stateLabel) {
            stateLabel.textContent = placedCount === 0 ? "Casa vazia" : placedCount === round.items.length ? "Casa completa" : `Casa parcial ${placedCount}/${round.items.length}`;
          }
          if (board) {
            board.innerHTML = round.targets.map((target) => {
              const placedItem = round.items.find((item) => this.state.placements[item.id] === target.id);
              const image = placedItem ? target.completeImage || placedItem.image || target.image : "";
              return `
                <button class="shape-house-slot${placedItem ? " is-filled" : ""}" type="button" data-drop-id="${target.id}" aria-label="${target.label}" style="--shape-x:${target.x}%;--shape-y:${target.y}%;--shape-w:${target.width}%;--shape-h:${target.height}%">
                  ${image ? `<img src="${image}" alt="" loading="eager" decoding="async" />` : ""}
                </button>
              `;
            }).join("");
          }
          if (tray) {
            tray.innerHTML = round.items.map((item) => {
              const placed = Boolean(this.state.placements[item.id]);
              return `
                <button class="drag-item shape-drag-item${placed ? " is-placed" : ""}${this.state.selectedDragId === item.id ? " is-selected" : ""}" type="button" draggable="${placed ? "false" : "true"}" data-drag-id="${item.id}" aria-label="${item.label}">
                  <img src="${item.image}" alt="" loading="eager" decoding="async" />
                  <span>${item.label}</span>
                </button>
              `;
            }).join("");
          }
          return;
        }
        const dropGrid = this.root.querySelector("[data-drop-zone-grid]");
        const tray = this.root.querySelector("[data-drag-item-tray]");
        if (dropGrid) {
          dropGrid.innerHTML = round.targets.map((target) => {
            const placedItem = round.items.find((item) => this.state.placements[item.id] === target.id);
            const image = placedItem ? target.completeImage || placedItem.image : target.image;
            return `
              <button class="drop-zone" type="button" data-drop-id="${target.id}" aria-label="${target.label}">
                <img src="${image}" alt="" loading="eager" decoding="async" />
                <span>${target.label}</span>
              </button>
            `;
          }).join("");
        }
        if (tray) {
          tray.innerHTML = round.items.map((item) => {
            const placed = Boolean(this.state.placements[item.id]);
            return `
              <button class="drag-item${placed ? " is-placed" : ""}${this.state.selectedDragId === item.id ? " is-selected" : ""}" type="button" draggable="${placed ? "false" : "true"}" data-drag-id="${item.id}" aria-label="${item.label}">
                <img src="${item.image}" alt="" loading="eager" decoding="async" />
                <span>${item.label}</span>
              </button>
            `;
          }).join("");
        }
        return;
      }
      if (this.game.type === "snap") {
        const board = this.root.querySelector("[data-snap-board]");
        const tray = this.root.querySelector("[data-snap-tray]");
        const stateLabel = this.root.querySelector("[data-snap-state]");
        const snap = round.snap;
        const placedCount = snap.pieces.filter((piece) => this.state.snapPlacements[piece.id] === piece.targetId).length;
        const bridgeState = placedCount === 0 ? snap.emptyState : placedCount === snap.pieces.length ? snap.completeState : snap.partialState;
        if (stateLabel) stateLabel.textContent = bridgeState;
        if (board) {
          board.innerHTML = snap.slots.map((slot) => {
            const piece = snap.pieces.find((entry) => this.state.snapPlacements[entry.id] === slot.id);
            return `
              <button class="snap-slot${piece ? " is-filled" : ""}" type="button" data-snap-slot-id="${slot.id}" aria-label="${slot.label}" style="--slot-x:${slot.x}%;--slot-y:${slot.y}%;--slot-w:${slot.width}%;--slot-h:${slot.height}%;--slot-r:${slot.rotate || 0}deg">
                ${piece ? `<img src="${piece.image}" alt="" loading="eager" decoding="async" />` : ""}
              </button>
            `;
          }).join("");
        }
        if (tray) {
          tray.innerHTML = snap.pieces.map((piece) => {
            const placed = Boolean(this.state.snapPlacements[piece.id]);
            return `
              <button class="snap-piece${placed ? " is-placed" : ""}${this.state.selectedSnapId === piece.id ? " is-selected" : ""}" type="button" draggable="${placed ? "false" : "true"}" data-snap-piece-id="${piece.id}" aria-label="${piece.label}">
                <img src="${piece.image}" alt="" loading="eager" decoding="async" />
                <span>${piece.label}</span>
              </button>
            `;
          }).join("");
        }
        return;
      }
      if (this.game.type === "criteria") {
        const grid = this.root.querySelector("[data-criteria-grid]");
        const progress = this.root.querySelector("[data-criteria-progress]");
        if (progress) progress.textContent = `${this.state.criteriaFound.length}/${round.required}`;
        if (grid) {
          grid.innerHTML = round.choices.map((choice) => {
            const found = this.state.criteriaFound.includes(choice.id);
            return `
              <button class="criteria-card${found ? " is-correct" : ""}" type="button" data-criteria-id="${choice.id}" aria-label="${choice.label}">
                <img src="${choice.image}" alt="" loading="eager" decoding="async" />
                <span>${choice.label}</span>
              </button>
            `;
          }).join("");
        }
        return;
      }
      if (this.game.type === "path-follow") {
        const board = this.root.querySelector("[data-path-board]");
        const progress = this.root.querySelector("[data-path-progress]");
        const label = this.root.querySelector("[data-path-progress-label]");
        const points = round.path.points;
        const percent = Math.round((this.state.pathProgress / points.length) * 100);
        if (progress) progress.style.width = `${percent}%`;
        if (label) label.textContent = `${percent}%`;
        if (board) {
          board.innerHTML = `
            <svg class="path-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polyline points="${points.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
            </svg>
            ${points.map((point, index) => `
              <button class="path-point${index < this.state.pathProgress ? " is-done" : ""}${index === this.state.pathProgress ? " is-current" : ""}" type="button" data-path-point-id="${point.id}" aria-label="Ponto ${index + 1}" style="--path-x:${point.x}%;--path-y:${point.y}%"></button>
            `).join("")}
          `;
        }
        return;
      }
      if (this.game.type === "creative-canvas") {
        const palette = this.root.querySelector("[data-creative-palette]");
        const canvas = this.root.querySelector("[data-creative-canvas]");
        const elements = round.canvas.elements;
        if (palette) {
          palette.innerHTML = elements.map((element) => `
            <button class="creative-element" type="button" draggable="true" data-creative-element-id="${element.id}" aria-label="${element.label}">
              <img src="${element.image}" alt="" loading="eager" decoding="async" />
              <span>${element.label}</span>
            </button>
          `).join("");
        }
        if (canvas) {
          canvas.innerHTML = this.state.canvasItems.map((item) => {
            const element = elements.find((entry) => entry.id === item.elementId);
            if (!element) return "";
            return `
              <div class="canvas-item${this.state.selectedCanvasId === item.id ? " is-selected" : ""}" role="button" tabindex="0" draggable="true" data-canvas-item-id="${item.id}" style="--canvas-x:${item.x}%;--canvas-y:${item.y}%;--canvas-r:${item.rotate}deg;--canvas-s:${item.scale}" aria-label="${element.label}">
                <img src="${element.image}" alt="" loading="eager" decoding="async" />
                <span>${element.label}</span>
                <button class="canvas-remove" type="button" data-remove-canvas-id="${item.id}" aria-label="Remover ${element.label}">×</button>
              </div>
            `;
          }).join("");
        }
        return;
      }
      if (this.game.type === "timeline-sequence") {
        const board = this.root.querySelector("[data-timeline-board]");
        const tray = this.root.querySelector("[data-timeline-card-tray]");
        const timeline = round.timeline;
        const placedCount = timeline.slots.filter((slot) => this.state.timelinePlacements[slot.id]).length;
        if (board) {
          board.style.setProperty("--timeline-progress", `${Math.round((placedCount / timeline.slots.length) * 76)}%`);
          board.innerHTML = `
            <div class="timeline-line" aria-hidden="true"></div>
            ${timeline.slots.map((slot, index) => {
              const cardId = this.state.timelinePlacements[slot.id];
              const card = timeline.cards.find((entry) => entry.id === cardId);
              return `
                <button class="timeline-slot${card ? " is-filled" : ""}" type="button" data-timeline-slot-id="${slot.id}" aria-label="Etapa ${index + 1}" style="--timeline-x:${slot.x}%;--timeline-y:${slot.y}%">
                  <b>${index + 1}º</b>
                  ${card ? `<img src="${card.image}" alt="" loading="eager" decoding="async" /><span>${card.label}</span>` : ""}
                </button>
              `;
            }).join("")}
          `;
        }
        if (tray) {
          tray.innerHTML = timeline.cards.map((card) => {
            const placed = Object.values(this.state.timelinePlacements).includes(card.id);
            return `
              <button class="timeline-card${placed ? " is-placed" : ""}${this.state.selectedTimelineId === card.id ? " is-selected" : ""}" type="button" draggable="${placed ? "false" : "true"}" data-timeline-card-id="${card.id}" aria-label="${card.label}">
                <img src="${card.image}" alt="" loading="eager" decoding="async" />
                <span>${card.label}</span>
              </button>
            `;
          }).join("");
        }
        return;
      }
      if (this.game.type === "journey-celebration") {
        const journey = round.celebration;
        const map = this.root.querySelector("[data-journey-map]");
        const objects = this.root.querySelector("[data-journey-objects]");
        const tree = this.root.querySelector("[data-memory-tree]");
        const title = this.root.querySelector("[data-journey-title]");
        const activePortal = journey.portals.find((portal) => portal.id === this.state.journeyActivePortal);
        if (title) title.textContent = activePortal ? `Explorando: ${activePortal.label}` : "Vamos relembrar todas as nossas aventuras!";
        if (map) {
          map.innerHTML = journey.portals.map((portal, index) => {
            const visited = this.state.journeyVisited.includes(portal.id);
            const completed = visited && this.state.journeyCompleted.length >= Math.ceil(((index + 1) / journey.portals.length) * journey.memories.length);
            return `
              <button class="journey-portal${visited ? " is-visited" : ""}${completed ? " is-complete" : ""}${this.state.journeyActivePortal === portal.id ? " is-active" : ""}" type="button" data-journey-portal-id="${portal.id}" aria-label="${portal.label}" style="--portal-x:${portal.x}%;--portal-y:${portal.y}%">
                <img src="${portal.image}" alt="" loading="eager" decoding="async" />
                <span>${portal.label}</span>
              </button>
            `;
          }).join("");
        }
        if (objects) {
          objects.innerHTML = journey.memories.map((memory) => {
            const collected = this.state.journeyCompleted.includes(memory.id);
            return `
              <button class="journey-object${collected ? " is-collected" : ""}" type="button" data-journey-object-id="${memory.id}" aria-label="${memory.label}">
                <img src="${memory.image}" alt="" loading="eager" decoding="async" />
                <span>${memory.label}</span>
              </button>
            `;
          }).join("");
        }
        if (tree) {
          const total = journey.memories.length;
          const collected = this.state.journeyCompleted.length;
          tree.style.setProperty("--memory-progress", `${Math.round((collected / total) * 100)}%`);
          tree.innerHTML = `
            <strong>Arvore das Lembrancas</strong>
            <div class="memory-tree-stage" aria-label="${collected} de ${total} lembrancas">
              ${journey.memories.map((memory, index) => `
                <span class="memory-leaf${index < collected ? " is-grown" : ""}">
                  <img src="${memory.image}" alt="" loading="eager" decoding="async" />
                </span>
              `).join("")}
            </div>
            <small>${collected}/${total} lembrancas</small>
          `;
        }
        return;
      }
      const hint = this.root.querySelector("[data-hint-text]");
      if (hint) hint.textContent = round.hint;
      const speak = this.root.querySelector("[data-game-speak]");
      if (speak) speak.dataset.gameSpeak = encodeURIComponent(round.narration);
      const cards = this.root.querySelector("[data-choice-cards]");
      if (cards) {
        cards.innerHTML = round.choices.map((choice) => `
          <button class="game-card" type="button" data-choice-id="${choice.id}" style="--card-color:${choice.color}" aria-label="${choice.label}">
            ${components.objectImage(choice.image, choice.label)}
            <span>${choice.label}</span>
          </button>
        `).join("");
      }
    }

    syncDragDrop() {
      this.updateRoundContent();
    }

    syncSnap() {
      this.updateRoundContent();
    }

    syncCriteria() {
      this.updateRoundContent();
    }

    syncPath() {
      this.updateRoundContent();
    }

    syncCanvas() {
      this.updateRoundContent();
    }

    syncTimeline() {
      this.updateRoundContent();
    }

    syncRounds() {
      this.root.querySelectorAll("[data-round-id]").forEach((item) => {
        item.classList.toggle("is-done", this.state.completedRounds.includes(item.dataset.roundId));
      });
    }

    animateXp() {
      const counter = this.root.querySelector("[data-xp-counter]");
      if (!counter) return;
      let value = 0;
      const step = Math.max(1, Math.ceil(this.game.xp / 24));
      const timer = window.setInterval(() => {
        value = Math.min(this.game.xp, value + step);
        counter.textContent = `⭐ +${value} XP`;
        if (value >= this.game.xp) window.clearInterval(timer);
      }, 42);
    }
  }

  window.RaizesGameEngine = { GameEngine, gameRepository, progressController, rewardController, audioPlayer };

  const mountAll = () => {
    document.querySelectorAll("[data-game-engine]").forEach((root) => {
      const engine = new GameEngine(root, root.dataset.gameId || "caixa-misteriosa");
      engine.mount();
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountAll);
  } else {
    mountAll();
  }
})();
