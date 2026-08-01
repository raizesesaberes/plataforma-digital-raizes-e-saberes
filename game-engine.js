(function () {
  const storageKey = "raizes:game-progress:v1";
  const atlasBase = "assets/games/caixa-misteriosa/";
  const asset = (path) => `${atlasBase}${path}`;
  const ge2CaixaBase = "assets/game-engine-2/assets/caixa-misteriosa/";
  const ge2CaixaAsset = (path) => `${ge2CaixaBase}${path}`;
  const ge2CestaBase = "assets/game-engine-2/assets/organizando-cesta/";
  const ge2CestaAsset = (path) => `${ge2CestaBase}${path}`;
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
  const somBase = "assets/games/de-quem-e-este-som/";
  const somAsset = (path) => `${somBase}${path}`;
  const sequenciaBase = "assets/games/sequencia-pipo/";
  const sequenciaAsset = (path) => `${sequenciaBase}${path}`;
  const jardimVivoBase = "assets/games/jardim-vivo/";
  const jardimVivoAsset = (path) => `${jardimVivoBase}${path}`;
  const teatroBase = "assets/games/teatro-bia/";
  const teatroAsset = (path) => `${teatroBase}${path}`;
  const escolaBase = "assets/games/caminho-escola/";
  const escolaAsset = (path) => `${escolaBase}${path}`;
  const festaV2Base = "assets/games/grande-festa-v2/";
  const festaV2Asset = (path) => `${festaV2Base}${path}`;
  const storyAlbumKey = "raizes:story-album:v1";

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
            closed: ge2CaixaAsset("boxes/closed.png"),
            glowing: ge2CaixaAsset("boxes/glowing.png"),
            opening: ge2CaixaAsset("boxes/opening.png"),
            open: ge2CaixaAsset("boxes/open.png"),
            openInsert: ge2CaixaAsset("boxes/open-insert.png"),
          },
          components: {
            room: asset("components/sala-descobertas-bg.png"),
            celebration: asset("components/celebracao-bg.png"),
            title: ge2CaixaAsset("titles/a-caixa-misteriosa.png"),
            butterfly: ge2CaixaAsset("characters/bia-smile.png"),
            medal: ge2CaixaAsset("medals/glowing.png"),
            characters: [
              ge2CaixaAsset("characters/ana-smile.png"),
              ge2CaixaAsset("characters/pipo-smile.png"),
              ge2CaixaAsset("characters/dog-smile.png"),
            ],
            cards: {
              normal: ge2CaixaAsset("cards/normal.png"),
              hover: ge2CaixaAsset("cards/hover.png"),
              selected: ge2CaixaAsset("cards/selected.png"),
              correct: ge2CaixaAsset("cards/correct.png"),
              incorrect: ge2CaixaAsset("cards/incorrect.png"),
            },
            effects: {
              stars: ge2CaixaAsset("effects/stars.png"),
              confetti: ge2CaixaAsset("effects/confetti.png"),
              particles: ge2CaixaAsset("effects/particles.png"),
              glow: ge2CaixaAsset("effects/glow-circle.png"),
              twinkle: ge2CaixaAsset("effects/twinkle.png"),
            },
          },
          backgroundVideo: {
            room: {
              version: "v1-homologada",
              src: "assets/video/RS-020-video-institucional.mp4",
              poster: asset("components/sala-descobertas-bg.png"),
              fallback: asset("components/sala-descobertas-bg.png"),
            },
          },
          magicBox: {
            version: "V1",
            animations: {
              idle: { type: "image", src: ge2CaixaAsset("boxes/closed.png") },
              breathing: { type: "image", src: ge2CaixaAsset("boxes/closed.png") },
              touch: { type: "image", src: ge2CaixaAsset("boxes/closed.png") },
              shake: { type: "image", src: ge2CaixaAsset("boxes/closed.png") },
              glow: { type: "image", src: ge2CaixaAsset("boxes/glowing.png") },
              anticipation: { type: "image", src: ge2CaixaAsset("boxes/glowing.png") },
            },
          },
          reactiveCharacters: {
            bia: {
              name: "Bia",
              version: "V1",
              states: {
                idle: { type: "image", src: ge2CaixaAsset("characters/bia-smile.png") },
                looking: { type: "image", src: ge2CaixaAsset("characters/bia-point.png") },
                inviting: { type: "image", src: ge2CaixaAsset("characters/bia-neutral.png") },
                celebrating: { type: "image", src: ge2CaixaAsset("characters/bia-celebrate.png") },
              },
            },
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
              { id: "pena", label: "Pena", color: "#ef8b21", image: ge2CaixaAsset("objects/feather.png") },
              { id: "algodao", label: "Algodao", color: "#6aa351", image: ge2CaixaAsset("objects/cotton.png") },
              { id: "esponja", label: "Esponja", color: "#4b9cc4", image: ge2CaixaAsset("objects/sponge.png") },
            ],
          },
          {
            id: "leve",
            hint: "E leve e flutua.",
            narration: "Agora a dica e: e leve e flutua.",
            correctId: "pena",
            choices: [
              { id: "bola", label: "Bola", color: "#4b9cc4", image: ge2CaixaAsset("objects/ball.png") },
              { id: "pena", label: "Pena", color: "#ef8b21", image: ge2CaixaAsset("objects/feather.png") },
              { id: "cubo", label: "Cubo", color: "#6aa351", image: ge2CaixaAsset("objects/cube.png") },
            ],
          },
          {
            id: "brilha",
            hint: "Brilha como uma conquista.",
            narration: "Ultima dica: brilha como uma conquista.",
            correctId: "estrela",
            choices: [
              { id: "flor", label: "Flor", color: "#6aa351", image: ge2CaixaAsset("objects/flower.png") },
              { id: "estrela", label: "Estrela", color: "#ef8b21", image: ge2CaixaAsset("effects/stars.png") },
              { id: "folha", label: "Folha", color: "#4b9cc4", image: ge2CaixaAsset("objects/leaf.png") },
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
          atlas: ge2CestaAsset("scenarios/intro.png"),
          card: ge2CestaAsset("scenarios/intro.png"),
          flow: ge2CestaAsset("scenarios/organize.png"),
          library: ge2CestaAsset("scenarios/organize.png"),
          scenarios: ge2CestaAsset("scenarios/organize.png"),
          screens: {
            intro: ge2CestaAsset("scenarios/intro.png"),
            room: ge2CestaAsset("scenarios/observe.png"),
            choice: ge2CestaAsset("scenarios/organize.png"),
            feedback: ge2CestaAsset("scenarios/feedback.png"),
            final: ge2CestaAsset("scenarios/final.png"),
          },
          reward: ge2CestaAsset("medals/glowing.png"),
          characters: {
            ana: ge2CestaAsset("characters/ana-presenting-basket.png"),
            anaCelebrating: ge2CestaAsset("characters/ana-celebrating.png"),
            anaClapping: ge2CestaAsset("characters/ana-clapping.png"),
            bia: ge2CestaAsset("characters/bia-flying.png"),
            biaCelebrating: ge2CestaAsset("characters/bia-celebrating.png"),
            pipo: ge2CestaAsset("characters/pipo-celebrating.png"),
            turtle: ge2CestaAsset("characters/turtle-happy.png"),
            turtleCelebrating: ge2CestaAsset("characters/turtle-celebrating.png"),
          },
          components: {
            title: ge2CestaAsset("titles/organizando-a-cesta.png"),
            fullBasket: ge2CestaAsset("baskets/complete.png"),
            emptyBasket: ge2CestaAsset("baskets/empty.png"),
            highlightBasket: ge2CestaAsset("baskets/highlight.png"),
          },
          fruits: {
            apple: ge2CestaAsset("fruits/apple.png"),
            banana: ge2CestaAsset("fruits/banana.png"),
            grape: ge2CestaAsset("fruits/grape.png"),
            pear: ge2CestaAsset("fruits/pear.png"),
          },
          effects: {
            basketGlow: ge2CestaAsset("effects/basket-glow.png"),
            fruitShine: ge2CestaAsset("effects/fruit-shine.png"),
            stars: ge2CestaAsset("effects/stars.png"),
            confetti: ge2CestaAsset("effects/confetti.png"),
            particles: ge2CestaAsset("effects/particles.png"),
            lightBurst: ge2CestaAsset("effects/light-burst.png"),
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
            narration: "Observe as frutas. Temos maca, banana, uva e pera.",
            items: [
              { id: "apple", label: "Maca", image: ge2CestaAsset("fruits/apple.png"), selectedImage: ge2CestaAsset("fruits/apple-selected.png"), targetId: "apple" },
              { id: "banana", label: "Banana", image: ge2CestaAsset("fruits/banana.png"), selectedImage: ge2CestaAsset("fruits/banana-selected.png"), targetId: "banana" },
              { id: "grape", label: "Uva", image: ge2CestaAsset("fruits/grape.png"), selectedImage: ge2CestaAsset("fruits/grape-selected.png"), targetId: "grape" },
            ],
            targets: [
              { id: "apple", label: "Cesto da maca", icon: ge2CestaAsset("icons/apple.png"), image: ge2CestaAsset("baskets/empty.png"), highlightImage: ge2CestaAsset("baskets/highlight.png"), completeImage: ge2CestaAsset("fruits/apple-in-basket.png") },
              { id: "banana", label: "Cesto da banana", icon: ge2CestaAsset("icons/banana.png"), image: ge2CestaAsset("baskets/empty.png"), highlightImage: ge2CestaAsset("baskets/highlight.png"), completeImage: ge2CestaAsset("fruits/banana-in-basket.png") },
              { id: "grape", label: "Cesto da uva", icon: ge2CestaAsset("icons/grape.png"), image: ge2CestaAsset("baskets/empty.png"), highlightImage: ge2CestaAsset("baskets/highlight.png"), completeImage: ge2CestaAsset("fruits/grape-in-basket.png") },
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
      "de-quem-e-este-som": {
        id: "de-quem-e-este-som",
        type: "audio-recognition",
        title: "De Quem e Este Som?",
        category: "Escuta",
        subtitle: "Reconhecimento Auditivo",
        scenario: "Jardim Sonoro",
        character: "Ana, Leo, Sofia e Miguel",
        mascot: "Bia",
        xp: 20,
        medal: "Pequeno Ouvinte",
        unlock: { order: 11, unlocked: true, requires: "grande-festa" },
        assets: {
          atlas: somAsset("atlas.png"),
          card: somAsset("screens/screen-intro.png"),
          flow: somAsset("atlas.png"),
          library: somAsset("atlas.png"),
          scenarios: somAsset("atlas.png"),
          screens: {
            intro: somAsset("screens/screen-intro.png"),
            room: somAsset("screens/screen-listen.png"),
            choice: somAsset("screens/screen-choice.png"),
            feedback: somAsset("screens/screen-feedback.png"),
            final: somAsset("screens/screen-final.png"),
          },
          audioButton: somAsset("effects/audio-button.png"),
          waves: somAsset("effects/sound-waves.png"),
        },
        audio: {
          narration: 0.9,
          effects: 0.75,
          music: 0.35,
        },
        soundLibrary: {
          passaro: { kind: "bird", duration: 1.2, frequencies: [920, 1240, 1080, 1380] },
          abelha: { kind: "buzz", duration: 1.35, frequencies: [180, 225, 170, 245] },
          vento: { kind: "wind", duration: 1.45, frequencies: [330, 420, 360, 500] },
        },
        rounds: [
          {
            id: "som-passaro",
            hint: "Quem sera que fez este som?",
            narration: "Ouça o som com atencao e escolha quem fez esse som.",
            correctId: "passaro",
            soundId: "passaro",
            choices: [
              { id: "passaro", label: "Passarinho", image: somAsset("choices/passaro.png") },
              { id: "abelha", label: "Abelha", image: somAsset("choices/abelha.png") },
              { id: "arvore", label: "Arvore", image: somAsset("choices/arvore.png") },
            ],
          },
          {
            id: "som-abelha",
            hint: "Escute novamente e descubra.",
            narration: "Agora vamos ouvir outro som. Escolha a figura que combina.",
            correctId: "abelha",
            soundId: "abelha",
            choices: [
              { id: "passaro", label: "Passarinho", image: somAsset("choices/passaro.png") },
              { id: "abelha", label: "Abelha", image: somAsset("choices/abelha.png") },
              { id: "sapo", label: "Sapo", image: somAsset("choices/sapo.png") },
            ],
          },
          {
            id: "som-vento",
            hint: "Qual imagem combina com o som?",
            narration: "Ultimo som. Ouça quantas vezes quiser e escolha a resposta.",
            correctId: "vento",
            soundId: "vento",
            choices: [
              { id: "vento", label: "Vento", image: somAsset("choices/vento.png") },
              { id: "chuva", label: "Chuva", image: somAsset("choices/chuva.png") },
              { id: "agua", label: "Agua", image: somAsset("choices/agua.png") },
            ],
          },
        ],
      },
      "sequencia-pipo": {
        id: "sequencia-pipo",
        type: "pattern-recognition",
        title: "A Sequencia do Pipo",
        category: "Matematica",
        subtitle: "Reconhecimento de Padroes",
        scenario: "Caminho das Sequencias",
        character: "Pipo, Bia e amigos",
        mascot: "Pipo",
        xp: 20,
        medal: "Pequeno Matematico",
        unlock: { order: 12, unlocked: true, requires: "de-quem-e-este-som" },
        assets: {
          atlas: sequenciaAsset("atlas.png"),
          card: sequenciaAsset("screens/screen-intro.png"),
          flow: sequenciaAsset("atlas.png"),
          library: sequenciaAsset("atlas.png"),
          scenarios: sequenciaAsset("atlas.png"),
          screens: {
            intro: sequenciaAsset("screens/screen-intro.png"),
            room: sequenciaAsset("screens/screen-observe.png"),
            choice: sequenciaAsset("screens/screen-choice.png"),
            feedback: sequenciaAsset("screens/screen-choice.png"),
            final: sequenciaAsset("screens/screen-final.png"),
          },
          path: {
            start: sequenciaAsset("path/path-start.png"),
            progress: sequenciaAsset("path/path-progress.png"),
            complete: sequenciaAsset("path/path-complete.png"),
          },
        },
        audio: {
          narration: 0.9,
          effects: 0.75,
          music: 0.35,
        },
        patternLibrary: {
          natureza: [
            { id: "leaf", label: "Folha", image: sequenciaAsset("items/leaf.png") },
            { id: "rock", label: "Pedras", image: sequenciaAsset("items/rock.png") },
            { id: "flower", label: "Flor", image: sequenciaAsset("items/flower.png") },
          ],
          frutas: [
            { id: "apple", label: "Maca", image: sequenciaAsset("items/apple.png") },
            { id: "banana", label: "Banana", image: sequenciaAsset("items/banana.png") },
            { id: "grape", label: "Uva", image: sequenciaAsset("items/grape.png") },
          ],
          brinquedos: [
            { id: "teddy", label: "Ursinho", image: sequenciaAsset("items/teddy.png") },
            { id: "car", label: "Carrinho", image: sequenciaAsset("items/car.png") },
            { id: "ball", label: "Bola", image: sequenciaAsset("items/ball.png") },
          ],
          formas: [
            { id: "star", label: "Estrela", image: sequenciaAsset("items/star.png") },
            { id: "heart", label: "Coracao", image: sequenciaAsset("items/heart.png") },
            { id: "leaf", label: "Folha", image: sequenciaAsset("items/leaf.png") },
          ],
          cores: [
            { id: "apple", label: "Vermelho", image: sequenciaAsset("items/apple.png") },
            { id: "banana", label: "Amarelo", image: sequenciaAsset("items/banana.png") },
            { id: "leaf", label: "Verde", image: sequenciaAsset("items/leaf.png") },
          ],
        },
        rounds: [
          {
            id: "padrao-natureza",
            category: "Natureza",
            hint: "Observe a sequencia e escolha qual figura vem a seguir.",
            narration: "Observe o padrao: folha, pedras, folha, pedras. Qual figura vem depois?",
            sequence: ["leaf", "rock", "leaf", "rock", null],
            correctId: "leaf",
            choices: ["leaf", "rock", "flower"],
          },
          {
            id: "padrao-frutas",
            category: "Frutas",
            hint: "Qual fruta completa a sequencia?",
            narration: "Agora veja: maca, banana, maca, banana. Qual vem depois?",
            sequence: ["apple", "banana", "apple", "banana", null],
            correctId: "apple",
            choices: ["apple", "banana", "grape"],
          },
          {
            id: "padrao-brinquedos",
            category: "Brinquedos",
            hint: "Escolha o brinquedo que continua o padrao.",
            narration: "Ursinho, carrinho, ursinho, carrinho. Qual brinquedo continua?",
            sequence: ["teddy", "car", "teddy", "car", null],
            correctId: "teddy",
            choices: ["teddy", "car", "ball"],
          },
        ],
      },
      "jardim-vivo": {
        id: "jardim-vivo",
        type: "exploration-v2",
        title: "O Jardim Vivo",
        category: "Exploracao",
        subtitle: "Exploracao Nivel 2",
        scenario: "Jardim Vivo",
        character: "Bia, Pipo e amigos",
        mascot: "Bia",
        xp: 20,
        medal: "Pequeno Observador da Natureza",
        unlock: { order: 13, unlocked: true, requires: "sequencia-pipo" },
        assets: {
          atlas: jardimVivoAsset("atlas.png"),
          card: jardimVivoAsset("screens/screen-intro.png"),
          flow: jardimVivoAsset("atlas.png"),
          library: jardimVivoAsset("atlas.png"),
          scenarios: jardimVivoAsset("atlas.png"),
          screens: {
            intro: jardimVivoAsset("screens/screen-intro.png"),
            room: jardimVivoAsset("screens/screen-explore.png"),
            choice: jardimVivoAsset("screens/screen-explore.png"),
            feedback: jardimVivoAsset("screens/screen-feedback-correct.png"),
            final: jardimVivoAsset("screens/screen-final.png"),
          },
          feedbackOther: jardimVivoAsset("screens/screen-feedback-other.png"),
          tree: {
            empty: jardimVivoAsset("tree/empty.png"),
            leaves: jardimVivoAsset("tree/leaves.png"),
            flowers: jardimVivoAsset("tree/flowers.png"),
            almost: jardimVivoAsset("tree/almost.png"),
            complete: jardimVivoAsset("tree/complete.png"),
          },
        },
        audio: {
          narration: 0.9,
          effects: 0.75,
          music: 0.35,
        },
        exploration: {
          missionPanelTitle: "Arvore da Natureza",
          positiveOther: "Que bonito! Continue explorando.",
          positiveCorrect: "Muito bem! Voce encontrou.",
          elements: [
            { id: "ladybug", label: "Joaninha", image: jardimVivoAsset("elements/ladybug.png"), x: 31, y: 39 },
            { id: "flower", label: "Flor", image: jardimVivoAsset("elements/flower.png"), x: 17, y: 60 },
            { id: "leaf", label: "Folha", image: jardimVivoAsset("elements/leaf.png"), x: 50, y: 77 },
            { id: "bird", label: "Passarinho", image: jardimVivoAsset("elements/bird.png"), x: 43, y: 32 },
            { id: "butterfly", label: "Borboleta", image: jardimVivoAsset("elements/butterfly.png"), x: 65, y: 17 },
            { id: "worm", label: "Minhoca", image: jardimVivoAsset("elements/worm.png"), x: 11, y: 78 },
            { id: "sprout", label: "Broto", image: jardimVivoAsset("elements/sprout.png"), x: 53, y: 64 },
            { id: "mushroom", label: "Cogumelo", image: jardimVivoAsset("elements/mushroom.png"), x: 74, y: 73 },
            { id: "snail", label: "Caracol", image: jardimVivoAsset("elements/snail.png"), x: 31, y: 70 },
            { id: "drop", label: "Gota de orvalho", image: jardimVivoAsset("elements/drop.png"), x: 23, y: 50 },
          ],
        },
        rounds: [
          { id: "missao-joaninha", targetId: "ladybug", hint: "Vamos encontrar a joaninha?", narration: "Procure a joaninha no Jardim Vivo." },
          { id: "missao-borboleta", targetId: "butterfly", hint: "Vamos encontrar a borboleta?", narration: "Agora encontre a borboleta." },
          { id: "missao-caracol", targetId: "snail", hint: "Vamos encontrar o caracol?", narration: "Procure o caracol com atencao." },
          { id: "missao-passarinho", targetId: "bird", hint: "Vamos encontrar o passarinho?", narration: "Encontre o passarinho no jardim." },
          { id: "missao-flor", targetId: "flower", hint: "Vamos encontrar a flor?", narration: "Toque na flor do Jardim Vivo." },
          { id: "missao-folha", targetId: "leaf", hint: "Vamos encontrar a folha?", narration: "Encontre a folha destacada pela natureza." },
          { id: "missao-minhoca", targetId: "worm", hint: "Vamos encontrar a minhoca?", narration: "Procure a minhoca no caminho." },
          { id: "missao-broto", targetId: "sprout", hint: "Vamos encontrar o broto?", narration: "Encontre o broto que esta crescendo." },
          { id: "missao-cogumelo", targetId: "mushroom", hint: "Vamos encontrar o cogumelo?", narration: "Toque no cogumelo do jardim." },
          { id: "missao-gota", targetId: "drop", hint: "Vamos encontrar a gota de orvalho?", narration: "Encontre a gota de orvalho brilhante." },
        ],
      },
      "teatro-bia": {
        id: "teatro-bia",
        type: "story-builder",
        title: "O Teatro da Bia",
        category: "Criatividade",
        subtitle: "Story Builder",
        scenario: "Teatro da Bia",
        character: "Ana, Leo, Sofia, Miguel e Bia",
        mascot: "Bia",
        xp: 20,
        medal: "Pequeno Artista",
        unlock: { order: 14, unlocked: true, requires: "jardim-vivo" },
        assets: {
          atlas: teatroAsset("atlas.png"),
          card: teatroAsset("screens/screen-intro.png"),
          flow: teatroAsset("atlas.png"),
          library: teatroAsset("atlas.png"),
          scenarios: teatroAsset("atlas.png"),
          screens: {
            intro: teatroAsset("screens/screen-intro.png"),
            room: teatroAsset("screens/screen-character.png"),
            choice: teatroAsset("screens/screen-scenario.png"),
            feedback: teatroAsset("screens/screen-stage.png"),
            final: teatroAsset("screens/screen-final.png"),
          },
          steps: {
            character: teatroAsset("screens/screen-character.png"),
            scenario: teatroAsset("screens/screen-scenario.png"),
            accessories: teatroAsset("screens/screen-accessories.png"),
            stage: teatroAsset("screens/screen-stage.png"),
          },
          reward: teatroAsset("rewards/medal-pequeno-artista.png"),
        },
        audio: {
          narration: 0.9,
          effects: 0.75,
          music: 0.35,
        },
        rounds: [
          {
            id: "historia-palco",
            hint: "Monte uma historia e apresente no palco.",
            narration: "Escolha personagem, cenario e acessorios. Depois faca seu espetaculo.",
            story: {
              prompts: {
                character: "Quem sera o protagonista da sua historia?",
                scenario: "Onde a historia vai acontecer?",
                accessories: "Escolha acessorios para deixar tudo divertido.",
                stage: "E hora de brilhar no palco!",
              },
              characters: [
                { id: "ana", label: "Ana", image: teatroAsset("characters/ana.png") },
                { id: "leo", label: "Leo", image: teatroAsset("characters/leo.png") },
                { id: "sofia", label: "Sofia", image: teatroAsset("characters/sofia.png") },
                { id: "miguel", label: "Miguel", image: teatroAsset("characters/miguel.png") },
                { id: "bia", label: "Bia", image: teatroAsset("characters/bia.png") },
              ],
              scenarios: [
                { id: "castelo", label: "Castelo", image: teatroAsset("scenarios/castelo.png") },
                { id: "floresta", label: "Floresta", image: teatroAsset("scenarios/floresta.png") },
                { id: "foguete", label: "Foguete", image: teatroAsset("scenarios/foguete.png") },
                { id: "casinha", label: "Casinha", image: teatroAsset("scenarios/casinha.png") },
                { id: "palco", label: "Palco de Festa", image: teatroAsset("scenarios/palco.png") },
                { id: "jardim", label: "Jardim Encantado", image: teatroAsset("scenarios/jardim.png") },
                { id: "praia", label: "Praia", image: teatroAsset("scenarios/praia.png") },
              ],
              accessories: [
                { id: "coroa", label: "Coroa", image: teatroAsset("accessories/coroa.png") },
                { id: "chapeu", label: "Chapeu", image: teatroAsset("accessories/chapeu.png") },
                { id: "varinha", label: "Varinha", image: teatroAsset("accessories/varinha.png") },
                { id: "balao", label: "Balao", image: teatroAsset("accessories/balao.png") },
                { id: "ursinho", label: "Ursinho", image: teatroAsset("accessories/ursinho.png") },
                { id: "flor", label: "Flor", image: teatroAsset("accessories/flor.png") },
                { id: "escudo", label: "Escudo", image: teatroAsset("accessories/escudo.png") },
                { id: "mochila", label: "Mochila", image: teatroAsset("accessories/mochila.png") },
              ],
              actions: [
                { id: "andar", label: "Andar" },
                { id: "acenar", label: "Acenar" },
                { id: "dancar", label: "Dancar" },
                { id: "pular", label: "Pular" },
                { id: "girar", label: "Girar" },
                { id: "sorrir", label: "Sorrir" },
              ],
            },
          },
        ],
      },
      "caminho-escola": {
        id: "caminho-escola",
        type: "path-follow-v2",
        title: "O Caminho da Escola",
        category: "Percurso",
        subtitle: "Path Following V2",
        scenario: "Mapa da Escola das Descobertas",
        character: "Bia",
        mascot: "Borboleta Bia",
        xp: 20,
        medal: "Explorador de Caminhos",
        unlock: { order: 15, unlocked: true, requires: "teatro-bia" },
        assets: {
          atlas: escolaAsset("atlas.png"),
          card: escolaAsset("screens/screen-intro.png"),
          flow: escolaAsset("atlas.png"),
          library: escolaAsset("atlas.png"),
          scenarios: escolaAsset("atlas.png"),
          screens: {
            intro: escolaAsset("screens/screen-intro.png"),
            room: escolaAsset("screens/screen-map.png"),
            choice: escolaAsset("screens/screen-explore.png"),
            feedback: escolaAsset("screens/screen-explore.png"),
            final: escolaAsset("screens/screen-final.png"),
          },
          reward: escolaAsset("rewards/medal-explorador-caminhos.png"),
        },
        audio: {
          narration: 0.9,
          effects: 0.75,
          music: 0.35,
        },
        rounds: [
          {
            id: "mapa-escola",
            hint: "Leve a Bia ate a Escola! Passe por todos os lugares.",
            narration: "Siga o caminho iluminado. Visite os pontos de referencia ate chegar a escola.",
            pathV2: {
              zoom: 1,
              mapLayers: [
                { id: "base", label: "Mapa ilustrado", image: escolaAsset("screens/screen-explore.png") },
                { id: "trajeto", label: "Caminho iluminado" },
                { id: "referencias", label: "Pontos de referencia" },
              ],
              phases: [
                { id: "fase-1", label: "1", title: "Percurso curto", image: escolaAsset("phases/phase-1.png"), requiredPoints: ["arvore", "lago"] },
                { id: "fase-2", label: "2", title: "Curvas", image: escolaAsset("phases/phase-2.png"), requiredPoints: ["arvore", "jardim", "lago"] },
                { id: "fase-3", label: "3", title: "Mais referencias", image: escolaAsset("phases/phase-3.png"), requiredPoints: ["arvore", "jardim", "ponte", "lago", "banco"] },
                { id: "fase-4", label: "4", title: "Mapa completo", image: escolaAsset("phases/phase-4.png"), requiredPoints: ["arvore", "jardim", "ponte", "lago", "banco", "escola"] },
              ],
              references: [
                { id: "arvore", label: "Arvore", image: escolaAsset("references/arvore.png"), x: 22, y: 30, speech: "Muito bem! Voce visitou a arvore." },
                { id: "jardim", label: "Jardim", image: escolaAsset("references/jardim.png"), x: 48, y: 26, speech: "Que lindo jardim no caminho." },
                { id: "ponte", label: "Ponte", image: escolaAsset("references/ponte.png"), x: 67, y: 36, speech: "A ponte ajuda a continuar." },
                { id: "lago", label: "Lago", image: escolaAsset("references/lago.png"), x: 36, y: 58, speech: "Voce encontrou o lago." },
                { id: "banco", label: "Banco", image: escolaAsset("references/banco.png"), x: 58, y: 66, speech: "O banco e um ponto de descanso." },
                { id: "escola", label: "Escola", image: escolaAsset("references/escola.png"), x: 84, y: 74, speech: "Chegamos a escola!" },
              ],
            },
          },
        ],
      },
      "grande-festa-v2": {
        id: "grande-festa-v2",
        type: "journey-celebration-v2",
        title: "A Grande Festa das Descobertas",
        category: "Volume 2",
        subtitle: "Journey Celebration V2",
        scenario: "Escola das Descobertas",
        character: "Bia, Ana, Leo, Sofia, Miguel e Tito",
        mascot: "Bia e Tito",
        xp: 80,
        medal: "Grande Explorador das Descobertas",
        permanentMedal: true,
        volume: "volume-2",
        unlock: { order: 16, unlocked: true, requires: "caminho-escola" },
        assets: {
          atlas: festaV2Asset("atlas.png"),
          card: festaV2Asset("screens/screen-intro.png"),
          flow: festaV2Asset("atlas.png"),
          library: festaV2Asset("atlas.png"),
          scenarios: festaV2Asset("atlas.png"),
          screens: {
            intro: festaV2Asset("screens/screen-intro.png"),
            room: festaV2Asset("screens/screen-map.png"),
            choice: festaV2Asset("screens/screen-map.png"),
            feedback: festaV2Asset("screens/screen-map.png"),
            final: festaV2Asset("screens/screen-intro.png"),
          },
          reward: festaV2Asset("rewards/medal-volume-2.png"),
        },
        audio: {
          narration: 0.9,
          effects: 0.82,
          music: 0.45,
        },
        rounds: [
          {
            id: "celebracao-volume-2",
            hint: "Escolha um lugar para comecar a missao!",
            narration: "Vamos celebrar nossas descobertas. Escolha as missoes da festa e complete o Volume 2.",
            celebrationV2: {
              nextCollection: "educacao-infantil-3-anos",
              capsuleTitle: "Capsula da Jornada",
              missions: [
                { id: "biblioteca", label: "Biblioteca", mechanic: "exploration", prompt: "Encontre o livro da Ana.", image: festaV2Asset("missions/biblioteca.png"), x: 22, y: 32 },
                { id: "sequencias", label: "Sequencias", mechanic: "pattern-recognition", prompt: "Complete a sequencia.", image: festaV2Asset("missions/sequencias.png"), x: 42, y: 30 },
                { id: "plantinha", label: "Plantinha", mechanic: "exploration", prompt: "Cuide da plantinha.", image: festaV2Asset("missions/plantinha.png"), x: 62, y: 34 },
                { id: "teatro", label: "Teatro", mechanic: "story-builder", prompt: "Monte sua historia.", image: festaV2Asset("missions/teatro.png"), x: 82, y: 32 },
                { id: "caminho", label: "Caminho", mechanic: "path-following", prompt: "Siga ate a festa.", image: festaV2Asset("missions/caminho.png"), x: 26, y: 70 },
                { id: "atelie", label: "Atelie", mechanic: "creative-canvas", prompt: "Crie sua obra da natureza.", image: festaV2Asset("missions/atelie.png"), x: 70, y: 72 },
              ],
              schoolStates: [
                festaV2Asset("school/state-1.png"),
                festaV2Asset("school/state-2.png"),
                festaV2Asset("school/state-3.png"),
                festaV2Asset("school/state-4.png"),
                festaV2Asset("school/state-5.png"),
              ],
              treeStates: [
                festaV2Asset("tree/state-1.png"),
                festaV2Asset("tree/state-2.png"),
                festaV2Asset("tree/state-3.png"),
                festaV2Asset("tree/state-4.png"),
                festaV2Asset("tree/state-5.png"),
              ],
              decorations: [
                festaV2Asset("decor/bandeirinhas.png"),
                festaV2Asset("decor/baloes.png"),
                festaV2Asset("decor/confetes.png"),
                festaV2Asset("decor/fitas.png"),
                festaV2Asset("decor/fogos.png"),
                festaV2Asset("decor/luzes.png"),
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

  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const normalizeVictoryAsset = (assetValue, fallbackAlt = "") => {
    if (!assetValue) return null;
    if (typeof assetValue === "string") {
      return { src: assetValue, alt: fallbackAlt };
    }
    return {
      src: assetValue.src || "",
      alt: assetValue.alt || fallbackAlt,
    };
  };

  const VictoryScreen = {
    render(options = {}) {
      const character = normalizeVictoryAsset(options.characterAsset, options.characterName || options.character || "Personagem");
      const medal = normalizeVictoryAsset(options.medalAsset, options.medal || "Medalha");
      const effects = options.effects || {};
      const message = options.message || "VOCE FOI INCRIVEL!";
      const xpValue = Number(options.xp) || 0;
      const initialXp = options.animateXp ? 0 : xpValue;
      const continueLabel = options.continueLabel || "CONTINUAR";
      const restartLabel = options.restartLabel || "JOGAR NOVAMENTE";
      const continueAttrs = options.continueHref
        ? `href="${escapeHtml(options.continueHref)}"`
        : `type="button" data-victory-action="continue"${options.continueAction ? ` data-game-action="${escapeHtml(options.continueAction)}"` : ""}`;
      const restartAttrs = options.restartHref
        ? `href="${escapeHtml(options.restartHref)}"`
        : `type="button" data-victory-action="restart"${options.restartAction ? ` data-game-action="${escapeHtml(options.restartAction)}"` : ""}`;

      return `
        <section class="game-screen victory-screen" data-screen="final" aria-label="Tela de vitoria">
          <div class="victory-layer victory-overlay" aria-hidden="true"></div>
          <div class="victory-layer victory-particles" data-victory-slot="particles" aria-hidden="true">
            ${effects.particles ? `<img src="${escapeHtml(effects.particles)}" alt="" loading="eager" decoding="async" />` : `<video muted playsinline preload="none" data-victory-placeholder="particles"></video>`}
          </div>
          <div class="victory-layer victory-confetti" data-victory-slot="confetti" aria-hidden="true">
            ${effects.confetti ? `<img src="${escapeHtml(effects.confetti)}" alt="" loading="eager" decoding="async" />` : `<video muted playsinline preload="none" data-victory-placeholder="confetti"></video>`}
          </div>
          <div class="victory-layer victory-stars" data-victory-slot="stars" aria-hidden="true">
            ${effects.stars ? `<img src="${escapeHtml(effects.stars)}" alt="" loading="eager" decoding="async" />` : `<video muted playsinline preload="none" data-victory-placeholder="stars"></video>`}
          </div>
          <article class="victory-content">
            <div class="victory-medal" data-victory-slot="medal">
              ${medal?.src ? `<img src="${escapeHtml(medal.src)}" alt="${escapeHtml(medal.alt)}" loading="eager" decoding="async" />` : `<span aria-hidden="true"></span>`}
            </div>
            <span class="victory-xp xp-counter" data-xp-counter>+${initialXp} XP</span>
            <strong class="victory-message">${escapeHtml(message)}</strong>
            <span class="game-sr-only" data-final-medal>${escapeHtml(options.medal || "")}</span>
            <span class="game-sr-only" data-final-story></span>
            <div class="victory-character" data-victory-character="${escapeHtml(options.characterName || options.character || "")}">
              ${character?.src ? `<img src="${escapeHtml(character.src)}" alt="${escapeHtml(character.alt)}" loading="eager" decoding="async" />` : `<div class="victory-character-placeholder" aria-label="${escapeHtml(options.characterName || options.character || "Personagem")}"></div>`}
            </div>
            <div class="victory-actions">
              <${options.continueHref ? "a" : "button"} class="game-secondary-button victory-continue-button" ${continueAttrs}>${escapeHtml(continueLabel)}</${options.continueHref ? "a" : "button"}>
              <${options.restartHref ? "a" : "button"} class="game-primary-button game-restart-button victory-restart-button" ${restartAttrs}>${escapeHtml(restartLabel)}</${options.restartHref ? "a" : "button"}>
            </div>
          </article>
        </section>
      `;
    },
    show(options = {}) {
      const hasExplicitContainer = Boolean(options.container);
      const host = options.container || document.querySelector("[data-game-stage]") || document.body;
      const wrapper = document.createElement("div");
      wrapper.className = "victory-screen-host";
      wrapper.innerHTML = this.render({ ...options, continueAction: "", restartAction: "" });
      const node = wrapper.firstElementChild;
      if (!hasExplicitContainer) node.classList.add("victory-screen-floating");
      host.appendChild(node);
      requestAnimationFrame(() => node.classList.add("is-active"));
      node.addEventListener("click", (event) => {
        const action = event.target.closest("[data-victory-action]")?.dataset.victoryAction;
        if (action === "continue") options.onContinue?.(event);
        if (action === "restart") options.onRestart?.(event);
      });
      return node;
    },
  };

  const showVictory = (options = {}) => VictoryScreen.show(options);

  const EncouragementScreen = {
    render(options = {}) {
      const character = normalizeVictoryAsset(options.characterAsset, options.characterName || options.character || "Personagem");
      const effects = options.effects || {};
      const audio = normalizeVictoryAsset(options.audioAsset || options.audio, "Audio de incentivo");
      const message = options.message || "VOCE ESTA QUASE LA!";
      const primaryLabel = options.primaryButton || "TENTAR NOVAMENTE";
      const secondaryLabel = options.secondaryButton || "OUVIR A DICA";
      const primaryAttrs = options.primaryHref
        ? `href="${escapeHtml(options.primaryHref)}"`
        : `type="button" data-encouragement-action="primary"${options.primaryAction ? ` data-game-action="${escapeHtml(options.primaryAction)}"` : ""}`;
      const secondaryAttrs = options.secondaryHref
        ? `href="${escapeHtml(options.secondaryHref)}"`
        : `type="button" data-encouragement-action="secondary"${options.secondaryAction ? ` data-game-action="${escapeHtml(options.secondaryAction)}"` : ""}`;

      return `
        <section class="game-screen encouragement-screen" data-screen="${escapeHtml(options.screenName || "encouragement")}" aria-label="Tela de incentivo">
          <div class="encouragement-layer encouragement-overlay" aria-hidden="true"></div>
          <div class="encouragement-layer encouragement-particles" data-encouragement-slot="particles" aria-hidden="true">
            ${effects.particles ? `<img src="${escapeHtml(effects.particles)}" alt="" loading="eager" decoding="async" />` : `<video muted playsinline preload="none" data-encouragement-placeholder="particles"></video>`}
          </div>
          <article class="encouragement-content">
            <div class="encouragement-character" data-encouragement-character="${escapeHtml(options.characterName || options.character || "")}">
              ${character?.src ? `<img src="${escapeHtml(character.src)}" alt="${escapeHtml(character.alt)}" loading="eager" decoding="async" />` : `<div class="encouragement-character-placeholder" aria-label="${escapeHtml(options.characterName || options.character || "Personagem")}"></div>`}
            </div>
            <strong class="encouragement-message">${escapeHtml(message)}</strong>
            <audio data-encouragement-audio preload="none"${audio?.src ? ` src="${escapeHtml(audio.src)}"` : ""}></audio>
            <div class="encouragement-actions">
              <${options.primaryHref ? "a" : "button"} class="game-primary-button encouragement-primary-button" ${primaryAttrs}>${escapeHtml(primaryLabel)}</${options.primaryHref ? "a" : "button"}>
              <${options.secondaryHref ? "a" : "button"} class="game-secondary-button encouragement-secondary-button" ${secondaryAttrs}>${escapeHtml(secondaryLabel)}</${options.secondaryHref ? "a" : "button"}>
            </div>
          </article>
        </section>
      `;
    },
    show(options = {}) {
      const hasExplicitContainer = Boolean(options.container);
      const host = options.container || document.querySelector("[data-game-stage]") || document.body;
      const wrapper = document.createElement("div");
      wrapper.className = "encouragement-screen-host";
      wrapper.innerHTML = this.render({ ...options, primaryAction: "", secondaryAction: "" });
      const node = wrapper.firstElementChild;
      if (!hasExplicitContainer) node.classList.add("encouragement-screen-floating");
      host.appendChild(node);
      requestAnimationFrame(() => node.classList.add("is-active"));
      node.addEventListener("click", (event) => {
        const action = event.target.closest("[data-encouragement-action]")?.dataset.encouragementAction;
        if (action === "primary") options.onPrimary?.(event);
        if (action === "secondary") {
          const audioNode = node.querySelector("[data-encouragement-audio]");
          if (audioNode?.getAttribute("src")) audioNode.play?.().catch(() => {});
          options.onSecondary?.(event);
        }
      });
      return node;
    },
  };

  const showEncouragement = (options = {}) => EncouragementScreen.show(options);

  const mysteryBoxStates = {
    IDLE: "IDLE",
    TOUCH: "TOUCH",
    SHAKE: "SHAKE",
    GLOW: "GLOW",
    OPENING: "OPENING",
    OPEN: "OPEN",
    REVEAL: "REVEAL",
  };

  const mysteryBoxTransitionMs = {
    TOUCH: 90,
    SHAKE: 360,
    GLOW: 260,
    OPENING: 680,
    OPEN: 180,
    REVEAL: 120,
  };

  const magicBoxStates = {
    IDLE: "idle",
    BREATHING: "breathing",
    TOUCH: "touch",
    SHAKE: "shake",
    GLOW: "glow",
    ANTICIPATION: "anticipation",
  };

  const magicBoxTransitionMs = {
    breathing: 320,
    touch: 90,
    shake: 360,
    glow: 280,
    anticipation: 240,
    idle: 0,
  };

  const reactiveCharacterStates = {
    IDLE: "idle",
    LOOKING: "looking",
    INVITING: "inviting",
    CELEBRATING: "celebrating",
  };

  class ReactiveCharacter {
    constructor({ id, initialState = reactiveCharacterStates.IDLE, onStateChange = () => {} } = {}) {
      this.id = id;
      this.state = initialState;
      this.onStateChange = onStateChange;
      this.listeners = [];
    }

    setState(nextState) {
      if (!Object.values(reactiveCharacterStates).includes(nextState)) return this.state;
      this.state = nextState;
      this.onStateChange(nextState, this);
      this.listeners.forEach((callback) => callback({ id: this.id, state: nextState }));
      return this.state;
    }

    onChange(callback) {
      if (typeof callback === "function") this.listeners.push(callback);
      return this;
    }
  }

  class MagicBox {
    constructor({ timings = magicBoxTransitionMs, onStateChange = () => {}, onTouch = () => {}, onAnimationEnd = () => {}, onReveal = () => {} } = {}) {
      this.timings = timings;
      this.onStateChange = onStateChange;
      this.listeners = {
        touch: [onTouch].filter(Boolean),
        animationEnd: [onAnimationEnd].filter(Boolean),
        reveal: [onReveal].filter(Boolean),
      };
      this.state = magicBoxStates.IDLE;
      this.locked = false;
      this.timers = [];
    }

    onTouch(callback) {
      if (typeof callback === "function") this.listeners.touch.push(callback);
      return this;
    }

    onAnimationEnd(callback) {
      if (typeof callback === "function") this.listeners.animationEnd.push(callback);
      return this;
    }

    onReveal(callback) {
      if (typeof callback === "function") this.listeners.reveal.push(callback);
      return this;
    }

    reset() {
      this.clearTimers();
      this.locked = false;
      this.setState(magicBoxStates.IDLE);
    }

    start() {
      if (this.locked) return false;
      this.locked = true;
      this.clearTimers();
      this.emit("touch");
      this.runSequence([
        magicBoxStates.BREATHING,
        magicBoxStates.TOUCH,
        magicBoxStates.SHAKE,
        magicBoxStates.GLOW,
        magicBoxStates.ANTICIPATION,
        magicBoxStates.IDLE,
      ]);
      return true;
    }

    runSequence(states) {
      let elapsed = 0;
      states.forEach((state, index) => {
        const timer = window.setTimeout(() => {
          this.setState(state);
          if (state === magicBoxStates.ANTICIPATION) this.emit("reveal");
          if (index === states.length - 1) {
            this.locked = false;
            this.emit("animationEnd");
          }
        }, elapsed);
        this.timers.push(timer);
        elapsed += this.timings[state] || 0;
      });
    }

    setState(nextState) {
      this.state = nextState;
      this.onStateChange(nextState, this.locked);
    }

    clearTimers() {
      this.timers.forEach((timer) => window.clearTimeout(timer));
      this.timers = [];
    }

    emit(eventName) {
      (this.listeners[eventName] || []).forEach((callback) => callback({ state: this.state, locked: this.locked }));
    }
  }

  class MysteryBoxStateMachine {
    constructor({ timings = mysteryBoxTransitionMs, onStateChange = () => {}, onReveal = () => {} } = {}) {
      this.timings = timings;
      this.onStateChange = onStateChange;
      this.onReveal = onReveal;
      this.state = mysteryBoxStates.IDLE;
      this.locked = false;
      this.timers = [];
    }

    reset() {
      this.clearTimers();
      this.locked = false;
      this.setState(mysteryBoxStates.IDLE);
    }

    start() {
      if (this.locked) return false;
      this.locked = true;
      this.clearTimers();
      this.runSequence([
        mysteryBoxStates.TOUCH,
        mysteryBoxStates.SHAKE,
        mysteryBoxStates.GLOW,
        mysteryBoxStates.OPENING,
        mysteryBoxStates.OPEN,
        mysteryBoxStates.REVEAL,
      ]);
      return true;
    }

    runSequence(states) {
      const [firstState, ...nextStates] = states;
      if (!firstState) return;
      this.setState(firstState);
      let elapsed = this.timings[firstState] || 0;
      nextStates.forEach((state, index) => {
        const timer = window.setTimeout(() => {
          this.setState(state);
          if (state === mysteryBoxStates.REVEAL) {
            this.locked = false;
            this.onReveal();
          }
        }, elapsed);
        this.timers.push(timer);
        elapsed += this.timings[state] || 0;
        if (index === nextStates.length - 1) {
          const cleanupTimer = window.setTimeout(() => this.clearTimers(), elapsed);
          this.timers.push(cleanupTimer);
        }
      });
    }

    setState(nextState) {
      this.state = nextState;
      this.onStateChange(nextState, this.locked);
    }

    clearTimers() {
      this.timers.forEach((timer) => window.clearTimeout(timer));
      this.timers = [];
    }
  }

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
        pathV2PhaseIndex: 0,
        pathV2Visited: [],
        pathV2CompletedPhases: [],
        pathV2ActiveReference: null,
        canvasItems: [],
        selectedCanvasId: null,
        canvasSequence: 0,
        timelinePlacements: {},
        selectedTimelineId: null,
        journeyVisited: [],
        journeyCompleted: [],
        journeyActivePortal: null,
        journeyV2Visited: [],
        journeyV2Completed: [],
        journeyV2ActiveMission: null,
        journeyV2Capsule: null,
        audioPlayed: false,
        audioReplayCount: 0,
        patternAnswers: {},
        selectedPatternId: null,
        explorationFound: [],
        explorationCelebratingId: null,
        explorationLastFeedback: "",
        storyStep: "character",
        storyCharacter: null,
        storyScenario: null,
        storyAccessories: [],
        storyAction: "sorrir",
        storyMemory: null,
        xp: 0,
        medal: null,
        startedAt: Date.now(),
        completedAt: null,
        attempts: 0,
        discoveryPrompt: "",
        mysteryBoxState: mysteryBoxStates.IDLE,
        magicBoxState: magicBoxStates.IDLE,
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
      return { ...state, completedRounds, roundIndex: state.roundIndex + 1, screen: "room", audioPlayed: false, audioReplayCount: 0, selectedPatternId: null, explorationCelebratingId: null, explorationLastFeedback: "", discoveryPrompt: "Abra a caixa para fazer uma nova descoberta!" };
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
        journeyV2: game.type === "journey-celebration-v2" ? {
          completedVolume: "volume-2",
          unlockedCollection: "educacao-infantil-3-anos",
          visitedMissions: state.journeyV2Visited,
          completedMissions: state.journeyV2Completed,
          capsule: state.journeyV2Capsule,
        } : null,
        story: game.type === "story-builder" ? {
          character: state.storyCharacter,
          scenario: state.storyScenario,
          accessories: state.storyAccessories,
          action: state.storyAction,
          memory: state.storyMemory,
        } : null,
        pathV2: game.type === "path-follow-v2" ? {
          completedPhase: state.pathV2CompletedPhases[state.pathV2CompletedPhases.length - 1] || null,
          completedPhases: state.pathV2CompletedPhases,
          visitedReferences: state.pathV2Visited,
          phaseIndex: state.pathV2PhaseIndex,
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
    speak(text, button, onEnd) {
      if (!("speechSynthesis" in window)) {
        window.setTimeout(() => onEnd?.(), 1500);
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "pt-BR";
      utterance.rate = 0.86;
      utterance.volume = this.volumes.narration;
      const originalMusic = this.volumes.music;
      this.volumes.music = Math.max(0.08, originalMusic * 0.35);
      button?.classList.add("is-playing");
      utterance.onend = () => {
        this.volumes.music = originalMusic;
        button?.classList.remove("is-playing");
        onEnd?.();
      };
      utterance.onerror = () => {
        this.volumes.music = originalMusic;
        button?.classList.remove("is-playing");
        onEnd?.();
      };
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
    playConfigured(sound, button) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext || !sound) return Promise.resolve();
      const previousMusic = this.volumes.music;
      this.volumes.music = Math.min(previousMusic, 0.08);
      button?.classList.add("is-playing");
      button?.setAttribute("aria-busy", "true");
      const context = new AudioContext();
      const output = context.createGain();
      const duration = sound.duration || 1.2;
      output.gain.value = this.volumes.effects * 0.12;
      output.connect(context.destination);
      const now = context.currentTime;
      const steps = sound.frequencies?.length ? sound.frequencies : [440, 660, 520];
      steps.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = sound.kind === "buzz" ? "sawtooth" : sound.kind === "wind" ? "triangle" : "sine";
        oscillator.frequency.setValueAtTime(frequency, now + index * (duration / steps.length));
        gain.gain.setValueAtTime(0.0001, now + index * (duration / steps.length));
        gain.gain.exponentialRampToValueAtTime(this.volumes.effects * (sound.kind === "wind" ? 0.035 : 0.08), now + index * (duration / steps.length) + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + (index + 0.82) * (duration / steps.length));
        oscillator.connect(gain);
        gain.connect(output);
        oscillator.start(now + index * (duration / steps.length));
        oscillator.stop(now + (index + 0.9) * (duration / steps.length));
      });
      return new Promise((resolve) => {
        window.setTimeout(() => {
          button?.classList.remove("is-playing");
          button?.setAttribute("aria-busy", "false");
          this.volumes.music = previousMusic;
          context.close?.();
          resolve();
        }, Math.ceil(duration * 1000) + 80);
      });
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

  const experienceStorageKey = "raizes:infantil-experience-progress:v1";
  const interactiveActivityStorageKey = "raizes:interactive-activity-progress:v1";
  const experienceCompletionThreshold = 90;

  const experienceProgressStore = {
    getUserId() {
      try {
        const session = JSON.parse(localStorage.getItem("raizes:supabase-auth-session") || "null");
        return session?.user?.id || localStorage.getItem("raizes:active-user-id") || localStorage.getItem("raizes:user:id") || "local-demo";
      } catch (error) {
        return "local-demo";
      }
    },
    records() {
      try {
        const records = JSON.parse(localStorage.getItem(experienceStorageKey) || "[]");
        return Array.isArray(records) ? records.map((record) => this.normalize(record)).filter(Boolean) : [];
      } catch (error) {
        console.warn("Nao foi possivel ler progresso das experiencias.", error);
        return [];
      }
    },
    write(records) {
      try {
        localStorage.setItem(experienceStorageKey, JSON.stringify(records.map((record) => this.normalize(record)).filter(Boolean).slice(0, 160)));
      } catch (error) {
        console.warn("Nao foi possivel salvar progresso das experiencias.", error);
      }
    },
    normalize(record = {}) {
      const experienceCode = record.experienceCode || record.code;
      if (!experienceCode) return null;
      const progressPercent = Math.max(0, Math.min(100, Math.round(Number(record.progressPercent ?? record.percentWatched ?? 0) || 0)));
      const completedAt = record.completedAt || null;
      const status = completedAt || progressPercent >= experienceCompletionThreshold || record.status === "completed"
        ? "completed"
        : record.startedAt || progressPercent > 0 || record.status === "in_progress" || record.status === "running" || record.status === "paused"
          ? "in_progress"
          : "not_started";
      return {
        userId: record.userId || this.getUserId(),
        experienceCode,
        code: experienceCode,
        status,
        progressPercent: status === "completed" ? 100 : progressPercent,
        percentWatched: status === "completed" ? 100 : progressPercent,
        currentTime: Math.max(0, Number(record.currentTime || 0) || 0),
        duration: Math.max(0, Number(record.duration || 0) || 0),
        startedAt: record.startedAt || null,
        lastAccessedAt: record.lastAccessedAt || record.updatedAt || record.lastStartedAt || record.startedAt || null,
        completedAt: status === "completed" ? completedAt || new Date().toISOString() : null,
        repeatCount: Math.max(0, Number(record.repeatCount ?? record.repeats ?? 0) || 0),
        isFavorite: Boolean(record.isFavorite),
        accessCount: Math.max(0, Number(record.accessCount ?? record.starts ?? 0) || 0),
        history: Array.isArray(record.history) ? record.history.slice(-80) : [],
        updatedAt: record.updatedAt || record.lastAccessedAt || new Date().toISOString(),
      };
    },
    recordsForUser(userId = this.getUserId()) {
      return this.records().filter((record) => record.userId === userId);
    },
    latest(code, userId = this.getUserId()) {
      return this.getUserExperienceProgress(userId, code);
    },
    getUserExperienceProgress(userId, experienceCode) {
      return this.records().find((record) => record.userId === userId && record.experienceCode === experienceCode) || null;
    },
    saveUserExperienceProgress(userId, experienceCode, data = {}) {
      const records = this.records();
      const current = records.find((record) => record.userId === userId && record.experienceCode === experienceCode) || {
        userId,
        experienceCode,
        code: experienceCode,
        status: "not_started",
        progressPercent: 0,
        percentWatched: 0,
        currentTime: 0,
        duration: 0,
        startedAt: null,
        lastAccessedAt: null,
        completedAt: null,
        repeatCount: 0,
        isFavorite: false,
        accessCount: 0,
        history: [],
      };
      const now = new Date().toISOString();
      const historyEvent = data.event
        ? {
            event: data.event,
            at: now,
            progressPercent: data.progressPercent ?? data.percentWatched ?? current.progressPercent,
            currentTime: data.currentTime ?? current.currentTime,
          }
        : null;
      const next = this.normalize({
        ...current,
        ...data,
        userId,
        experienceCode,
        code: experienceCode,
        lastAccessedAt: data.lastAccessedAt || now,
        history: historyEvent ? [...(current.history || []), historyEvent] : current.history,
        updatedAt: now,
      });
      this.write([next, ...records.filter((record) => !(record.userId === userId && record.experienceCode === experienceCode))]);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("raizes:experience-progress", { detail: next }));
      }
      return next;
    },
    upsert(code, patch) {
      return this.saveUserExperienceProgress(this.getUserId(), code, patch);
    },
    getUserExperienceHistory(userId = this.getUserId()) {
      return this.recordsForUser(userId)
        .filter((record) => record.lastAccessedAt || record.startedAt)
        .sort((first, second) => String(second.lastAccessedAt || second.startedAt).localeCompare(String(first.lastAccessedAt || first.startedAt)));
    },
    getUserFavorites(userId = this.getUserId()) {
      return this.recordsForUser(userId).filter((record) => record.isFavorite).map((record) => record.experienceCode);
    },
    toggleExperienceFavorite(userId, experienceCode) {
      const current = this.getUserExperienceProgress(userId, experienceCode);
      return this.saveUserExperienceProgress(userId, experienceCode, {
        isFavorite: !current?.isFavorite,
        event: current?.isFavorite ? "favorite_removed" : "favorite_added",
      });
    },
    getContinueWatching(userId = this.getUserId()) {
      return this.getUserExperienceHistory(userId).filter((record) => record.status === "in_progress");
    },
    getSummary(userId = this.getUserId(), experiences = []) {
      const available = experiences.filter((experience) => experience.availability !== "unavailable");
      const availableCodes = new Set(available.map((experience) => experience.id));
      const records = this.recordsForUser(userId).filter((record) => availableCodes.has(record.experienceCode));
      const started = records.filter((record) => record.status !== "not_started");
      const completed = records.filter((record) => record.status === "completed");
      const favorites = records.filter((record) => record.isFavorite);
      return {
        available: available.length,
        started: started.length,
        completed: completed.length,
        inProgress: records.filter((record) => record.status === "in_progress").length,
        favorites: favorites.length,
        percent: available.length ? Math.round((completed.length / available.length) * 100) : 0,
      };
    },
  };

  const experiencePlayerController = {
    overlay: null,
    video: null,
    activeCode: null,
    activeExperience: null,
    state: "unavailable",
    startedOnce: false,
    completedOnce: false,
    lastSavedSecond: -1,
    get catalog() {
      return window.RaizesInfantilExperiences || null;
    },
    labels() {
      return this.catalog?.EXPERIENCE_STATES || {};
    },
    getExperience(code) {
      return this.catalog?.getExperienceDefinition?.(code) || null;
    },
    getVideoAsset(experience) {
      const videoResource = (experience?.resources || []).find((resource) =>
        (resource.role === "opening" || resource.role === "main") && resource.type === "video"
      );
      return this.catalog?.getExperienceAsset?.(videoResource?.assetCode || experience?.openingAssetCode) || null;
    },
    getPlaybackPath(asset) {
      return asset?.provisionalFilePath || asset?.filePath || "";
    },
    getProgress(code) {
      return experienceProgressStore.latest(code);
    },
    setState(state) {
      this.state = state;
      if (!this.overlay) return;
      const stateMeta = this.overlay.querySelector("[data-experience-state]");
      const stateMessage = this.overlay.querySelector("[data-experience-state-message]");
      const labels = this.labels();
      if (stateMeta) stateMeta.textContent = labels[state]?.label || state;
      if (stateMessage) stateMessage.textContent = labels[state]?.message || "";
      this.overlay.dataset.experienceState = state;
    },
    renderUnavailable(code) {
      const labels = this.labels();
      return `
        <section class="experience-player-dialog" role="dialog" aria-modal="true" aria-labelledby="experience-player-title">
          <button class="experience-close" type="button" data-experience-close aria-label="Fechar experiencia">×</button>
          <div class="experience-error-panel">
            <span data-experience-state>${labels.unavailable?.label || "Indisponivel"}</span>
            <h2 id="experience-player-title">Experiencia nao encontrada</h2>
            <p data-experience-state-message>${labels.unavailable?.message || "Esta experiencia ainda nao esta disponivel."}</p>
            <small>${code || "codigo ausente"}</small>
          </div>
        </section>
      `;
    },
    render(experience, asset) {
      const source = this.getPlaybackPath(asset);
      const progress = this.getProgress(experience.id);
      const labels = this.labels();
      const isProvisional = Boolean(asset?.provisionalFilePath);
      return `
        <section class="experience-player-dialog" role="dialog" aria-modal="true" aria-labelledby="experience-player-title" aria-describedby="experience-player-description">
          <button class="experience-close" type="button" data-experience-close aria-label="Fechar experiencia">×</button>
          <header class="experience-player-header">
            <div>
              <span>${experience.id}</span>
              <h2 id="experience-player-title">${experience.title}</h2>
              <p id="experience-player-description">${experience.bookTitle || ""} · paginas ${(experience.pages || []).join(", ")}</p>
            </div>
            <aside>
              <strong data-experience-state>${labels[experience.availability]?.label || labels.available?.label || "Disponivel"}</strong>
              <small>${progress?.progressPercent || 0}% assistido</small>
            </aside>
          </header>
          ${isProvisional ? `<div class="experience-provisional-alert">${asset.note || "Video provisorio em uso para homologacao."}</div>` : ""}
          <div class="experience-video-frame">
            <video data-experience-video src="${source}" poster="${asset?.coverPath || ""}" preload="metadata" playsinline></video>
            <div class="experience-loading" data-experience-loading>${labels.loading?.message || "Carregando..."}</div>
            <div class="experience-error" data-experience-error hidden>
              <strong>${labels.error?.label || "Erro de carregamento"}</strong>
              <span>${labels.error?.message || "Nao foi possivel carregar o video."}</span>
            </div>
          </div>
          <footer class="experience-controls" aria-label="Controles da experiencia">
            <button type="button" data-experience-play>Reproduzir</button>
            <button type="button" data-experience-pause>Pausar</button>
            <button type="button" data-experience-restart>Reiniciar</button>
            <button type="button" data-experience-mute aria-pressed="false">Audio</button>
            <button type="button" data-experience-fullscreen>Tela cheia</button>
            <button type="button" data-experience-favorite aria-pressed="${progress?.isFavorite ? "true" : "false"}">${progress?.isFavorite ? "Favorita" : "Favoritar"}</button>
            <button type="button" data-experience-repeat>Repetir experiencia</button>
            <a href="book-viewer.html?book=${experience.bookId || "livro-005"}&page=${experience.pages?.[0] || 1}">Abrir atividade</a>
          </footer>
          <div class="experience-progress-line" aria-label="Progresso do video"><span data-experience-progress style="width:${progress?.progressPercent || 0}%"></span></div>
          <p class="experience-instructions">${experience.instructions}</p>
        </section>
      `;
    },
    open(code) {
      this.close();
      this.activeCode = code;
      this.activeExperience = this.getExperience(code);
      this.overlay = document.createElement("div");
      this.overlay.className = "experience-player-overlay";
      this.overlay.dataset.experienceCode = code || "";
      if (!this.activeExperience) {
        this.overlay.innerHTML = this.renderUnavailable(code);
        document.body.appendChild(this.overlay);
        this.bindOverlay();
        this.setState("unavailable");
        return null;
      }
      const asset = this.getVideoAsset(this.activeExperience);
      this.overlay.innerHTML = this.render(this.activeExperience, asset);
      document.body.appendChild(this.overlay);
      document.body.classList.add("experience-player-open");
      this.video = this.overlay.querySelector("[data-experience-video]");
      this.startedOnce = false;
      this.completedOnce = false;
      this.lastSavedSecond = -1;
      this.bindOverlay();
      this.bindVideo();
      this.setState(this.activeExperience.availability || "available");
      this.overlay.querySelector("[data-experience-play]")?.focus();
      window.dispatchEvent(new CustomEvent("raizes:experience-open", { detail: { code } }));
      return this.activeExperience;
    },
    close() {
      if (this.video) {
        this.persistPlayback("close");
        this.video.pause();
      }
      this.overlay?.remove();
      this.overlay = null;
      this.video = null;
      this.activeCode = null;
      this.activeExperience = null;
      document.body.classList.remove("experience-player-open");
      document.removeEventListener("keydown", this.handleKeydown);
    },
    bindOverlay() {
      this.overlay.addEventListener("click", (event) => {
        if (event.target === this.overlay || event.target.closest("[data-experience-close]")) this.close();
        if (event.target.closest("[data-experience-play]")) this.start(this.activeCode);
        if (event.target.closest("[data-experience-pause]")) this.pause(this.activeCode);
        if (event.target.closest("[data-experience-restart], [data-experience-repeat]")) this.restart(this.activeCode);
        if (event.target.closest("[data-experience-mute]")) this.toggleMute(event.target.closest("[data-experience-mute]"));
        if (event.target.closest("[data-experience-favorite]")) this.toggleFavorite(event.target.closest("[data-experience-favorite]"));
        if (event.target.closest("[data-experience-fullscreen]")) this.fullscreen();
      });
      this.handleKeydown = (event) => {
        if (!this.overlay) return;
        if (event.key === "Escape") {
          event.preventDefault();
          this.close();
        }
        if ((event.key === " " || event.key === "Enter") && event.target === this.overlay) {
          event.preventDefault();
          if (this.video?.paused) this.start(this.activeCode);
          else this.pause(this.activeCode);
        }
      };
      document.addEventListener("keydown", this.handleKeydown);
    },
    bindVideo() {
      if (!this.video) return;
      const video = this.video;
      const loading = this.overlay.querySelector("[data-experience-loading]");
      const error = this.overlay.querySelector("[data-experience-error]");
      video.addEventListener("loadstart", () => {
        if (this.video !== video) return;
        if (loading) loading.hidden = false;
        this.setState("loading");
      });
      video.addEventListener("canplay", () => {
        if (this.video !== video) return;
        if (loading) loading.hidden = true;
        this.setState(video.paused ? "paused" : "running");
        const progress = this.getProgress(this.activeCode);
        if (progress?.currentTime && progress.status === "in_progress" && video.currentTime < 1) {
          video.currentTime = Math.min(progress.currentTime, Math.max(0, video.duration - 1));
        }
      });
      video.addEventListener("play", () => {
        if (this.video !== video) return;
        this.setState("running");
      });
      video.addEventListener("pause", () => {
        if (this.video !== video) return;
        if (!this.completedOnce) this.setState("paused");
        this.persistPlayback("pause");
      });
      video.addEventListener("timeupdate", () => {
        if (this.video !== video) return;
        this.syncPercent();
      });
      video.addEventListener("ended", () => {
        if (this.video !== video) return;
        this.complete(this.activeCode);
      });
      video.addEventListener("error", () => {
        if (this.video !== video) return;
        if (loading) loading.hidden = true;
        if (error) error.hidden = false;
        this.setState("error");
        experienceProgressStore.upsert(this.activeCode, { event: "error" });
      });
    },
    persistPlayback(event = "progress") {
      if (!this.video || !this.activeCode) return null;
      const progressPercent = this.video.duration ? Math.min(100, Math.round((this.video.currentTime / this.video.duration) * 100)) : 0;
      const current = experienceProgressStore.latest(this.activeCode);
      const hasStarted = this.startedOnce || current?.startedAt || current?.status === "in_progress" || progressPercent > 0 || this.video.currentTime > 0;
      return experienceProgressStore.upsert(this.activeCode, {
        event,
        status: progressPercent >= experienceCompletionThreshold ? "completed" : hasStarted ? "in_progress" : current?.status || "not_started",
        progressPercent,
        percentWatched: progressPercent,
        currentTime: this.video.currentTime || 0,
        duration: this.video.duration || 0,
      });
    },
    syncPercent() {
      if (!this.video || !this.activeCode) return;
      const percent = this.video.duration ? Math.min(100, Math.round((this.video.currentTime / this.video.duration) * 100)) : 0;
      this.overlay?.querySelector("[data-experience-progress]")?.style.setProperty("width", `${percent}%`);
      const currentSecond = Math.floor(this.video.currentTime || 0);
      if (currentSecond !== this.lastSavedSecond && currentSecond % 5 === 0) {
        this.lastSavedSecond = currentSecond;
        this.persistPlayback("progress");
      }
      if (percent >= experienceCompletionThreshold && !this.completedOnce) this.complete(this.activeCode);
    },
    start(code) {
      if (!this.video || code !== this.activeCode) {
        this.open(code);
      }
      if (!this.video) return null;
      if (!this.startedOnce) {
        const now = new Date().toISOString();
        const current = experienceProgressStore.latest(code);
        experienceProgressStore.upsert(code, {
          startedAt: current?.startedAt || now,
          lastAccessedAt: now,
          accessCount: (current?.accessCount || 0) + 1,
          status: "in_progress",
          event: current?.startedAt ? "resume" : "start",
        });
        this.startedOnce = true;
      }
      this.video.play().catch(() => this.setState("paused"));
      return experienceProgressStore.latest(code);
    },
    pause(code) {
      if (code === this.activeCode && this.video) {
        this.video.pause();
        this.persistPlayback("pause");
      }
      return experienceProgressStore.latest(code);
    },
    restart(code) {
      if (!this.video || code !== this.activeCode) {
        this.open(code);
      }
      if (!this.video) return null;
      const current = experienceProgressStore.latest(code);
      this.video.currentTime = 0;
      this.completedOnce = false;
      experienceProgressStore.upsert(code, {
        repeatCount: (current?.repeatCount || 0) + 1,
        progressPercent: current?.status === "completed" ? 100 : 0,
        percentWatched: current?.status === "completed" ? 100 : 0,
        currentTime: 0,
        status: current?.status === "completed" ? "completed" : "in_progress",
        event: "repeat",
      });
      this.startedOnce = false;
      return this.start(code);
    },
    complete(code) {
      if (!code || this.completedOnce) return experienceProgressStore.latest(code);
      this.completedOnce = true;
      this.setState("completed");
      return experienceProgressStore.upsert(code, {
        completedAt: new Date().toISOString(),
        progressPercent: 100,
        percentWatched: 100,
        currentTime: this.video?.duration || experienceProgressStore.latest(code)?.currentTime || 0,
        duration: this.video?.duration || experienceProgressStore.latest(code)?.duration || 0,
        status: "completed",
        event: "complete",
      });
    },
    toggleFavorite(button) {
      if (!this.activeCode) return null;
      const record = experienceProgressStore.toggleExperienceFavorite(experienceProgressStore.getUserId(), this.activeCode);
      button?.setAttribute("aria-pressed", String(record.isFavorite));
      if (button) button.textContent = record.isFavorite ? "Favorita" : "Favoritar";
      return record;
    },
    toggleMute(button) {
      if (!this.video) return;
      this.video.muted = !this.video.muted;
      button?.setAttribute("aria-pressed", String(this.video.muted));
      if (button) button.textContent = this.video.muted ? "Sem audio" : "Audio";
    },
    fullscreen() {
      const target = this.overlay?.querySelector(".experience-player-dialog");
      if (target?.requestFullscreen) target.requestFullscreen();
    },
  };

  const interactiveActivityProgressStore = {
    getUserId() {
      return experienceProgressStore.getUserId();
    },
    records() {
      try {
        const records = JSON.parse(localStorage.getItem(interactiveActivityStorageKey) || "[]");
        return Array.isArray(records) ? records.map((record) => this.normalize(record)).filter(Boolean) : [];
      } catch (error) {
        console.warn("Nao foi possivel ler progresso das atividades interativas.", error);
        return [];
      }
    },
    write(records) {
      try {
        localStorage.setItem(interactiveActivityStorageKey, JSON.stringify(records.map((record) => this.normalize(record)).filter(Boolean).slice(0, 180)));
      } catch (error) {
        console.warn("Nao foi possivel salvar progresso das atividades interativas.", error);
      }
    },
    normalize(record = {}) {
      const activityCode = record.activityCode || record.code;
      if (!activityCode) return null;
      return {
        userId: record.userId || this.getUserId(),
        activityCode,
        code: activityCode,
        experienceCode: record.experienceCode || "",
        state: record.state || "not_started",
        status: record.status || (record.completedAt ? "completed" : record.startedAt ? "in_progress" : "not_started"),
        selectedAnswer: record.selectedAnswer ?? null,
        correctAnswer: record.correctAnswer ?? null,
        answers: Array.isArray(record.answers) ? record.answers.slice(-80) : [],
        correctCount: Math.max(0, Number(record.correctCount || 0) || 0),
        incorrectCount: Math.max(0, Number(record.incorrectCount || 0) || 0),
        attempts: Math.max(0, Number(record.attempts || 0) || 0),
        hintsUsed: Math.max(0, Number(record.hintsUsed || 0) || 0),
        score: Math.max(0, Number(record.score || 0) || 0),
        startedAt: record.startedAt || null,
        lastAccessedAt: record.lastAccessedAt || record.updatedAt || record.startedAt || null,
        completedAt: record.completedAt || null,
        durationMs: Math.max(0, Number(record.durationMs || 0) || 0),
        restartCount: Math.max(0, Number(record.restartCount || 0) || 0),
        abandonedCount: Math.max(0, Number(record.abandonedCount || 0) || 0),
        history: Array.isArray(record.history) ? record.history.slice(-80) : [],
        updatedAt: record.updatedAt || new Date().toISOString(),
      };
    },
    get(activityCode, userId = this.getUserId()) {
      return this.records().find((record) => record.userId === userId && record.activityCode === activityCode) || null;
    },
    save(activityCode, data = {}, userId = this.getUserId()) {
      const records = this.records();
      const current = records.find((record) => record.userId === userId && record.activityCode === activityCode) || {
        userId,
        activityCode,
        code: activityCode,
        state: "not_started",
        status: "not_started",
        attempts: 0,
        answers: [],
        correctCount: 0,
        incorrectCount: 0,
        hintsUsed: 0,
        score: 0,
        history: [],
      };
      const now = new Date().toISOString();
      const historyEvent = data.event
        ? {
            event: data.event,
            at: now,
        state: data.state || current.state,
        selectedAnswer: data.selectedAnswer ?? current.selectedAnswer ?? null,
            result: data.result || null,
          }
        : null;
      const next = this.normalize({
        ...current,
        ...data,
        userId,
        activityCode,
        code: activityCode,
        lastAccessedAt: data.lastAccessedAt || now,
        history: historyEvent ? [...(current.history || []), historyEvent] : current.history,
        updatedAt: now,
      });
      this.write([next, ...records.filter((record) => !(record.userId === userId && record.activityCode === activityCode))]);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("raizes:interactive-progress", { detail: next }));
      }
      return next;
    },
  };

  const interactiveActivityController = {
    overlay: null,
    activeCode: null,
    activeActivity: null,
    state: "not_started",
    startedAtMs: 0,
    answerLocked: false,
    workingState: null,
    get catalog() {
      return window.RaizesInfantilExperiences || null;
    },
    getActivity(code) {
      return this.catalog?.getInteractiveActivityDefinition?.(code) || null;
    },
    getState(code) {
      return interactiveActivityProgressStore.get(code);
    },
    setState(state, patch = {}) {
      this.state = state;
      if (this.overlay) {
        this.overlay.dataset.interactiveState = state;
        const stateNode = this.overlay.querySelector("[data-interactive-state]");
        if (stateNode) stateNode.textContent = this.getStateLabel(state);
      }
      if (this.activeCode) {
        interactiveActivityProgressStore.save(this.activeCode, {
          ...patch,
          state,
          status: state === "completed" ? "completed" : state === "not_started" ? "not_started" : "in_progress",
          experienceCode: this.activeActivity?.experienceCode,
        });
      }
    },
    getStateLabel(state) {
      const labels = {
        not_started: "NAO INICIADA",
        ready: "PRONTA",
        playing_intro: "OBSERVANDO",
        presenting_question: "PERGUNTA",
        waiting_answer: "RESPONDA",
        checking_answer: "VERIFICANDO",
        correct: "CERTO",
        incorrect: "TENTE NOVAMENTE",
        completed: "CONCLUIDA",
        paused: "PAUSADA",
        error: "ERRO",
      };
      return labels[state] || state;
    },
    renderUnavailable(code) {
      return `
        <section class="interactive-dialog" role="dialog" aria-modal="true" aria-labelledby="interactive-title">
          <button class="experience-close" type="button" data-interactive-close aria-label="Fechar atividade">×</button>
          <div class="experience-error-panel">
            <span data-interactive-state>ERRO</span>
            <h2 id="interactive-title">ATIVIDADE NAO ENCONTRADA</h2>
            <p>NAO ENCONTRAMOS ESTA ATIVIDADE INTERATIVA.</p>
            <small>${code || "codigo ausente"}</small>
          </div>
        </section>
      `;
    },
    renderObject(object) {
      const style = `--x:${object.x}%;--y:${object.y}%;--w:${object.width}%;--h:${object.height}%;--delay:${object.animation?.delay || 0}ms`;
      const classes = ["interactive-object", object.asset === "css:ladybug" ? "is-ladybug" : "", object.animation?.type === "fly_away" ? "will-fly" : ""]
        .filter(Boolean)
        .join(" ");
      return `
        <button class="${classes}" data-interactive-object="${object.id}" data-animation="${object.animation?.type || "stay"}" style="${style}" type="button" aria-label="${object.accessibilityLabel || object.id}">
          ${object.asset === "css:ladybug" ? "<i></i>" : `<span>${object.label || object.accessibilityLabel || object.id}</span>`}
        </button>
      `;
    },
    renderChoiceButtons(options = [], disabled = true) {
      return `
        <div class="interactive-options" role="group" aria-label="OPCOES DE RESPOSTA">
          ${options.map((option, index) => `
            <button type="button" data-interactive-answer="${index}" ${disabled ? "disabled" : ""}>${typeof option === "object" ? option.label : option}</button>
          `).join("")}
        </div>
      `;
    },
    renderComponent(activity) {
      const type = activity.type;
      if (type === "count_and_select" || type === "select_option" || type === "complete_word") {
        const options = type === "complete_word" ? activity.word?.choices || [] : activity.question?.options || [];
        const prompt = type === "complete_word" ? activity.word?.prompt : activity.question?.text;
        return `
          <div class="interactive-question" data-interactive-question>
            <p>${prompt || ""}</p>
            ${this.renderChoiceButtons(options)}
          </div>
        `;
      }
      if (type === "tap_objects") {
        return `
          <div class="interactive-question" data-interactive-question>
            <p>${activity.question?.text || activity.instruction}</p>
            <button class="interactive-confirm" type="button" data-interactive-confirm disabled>CONFIRMAR</button>
          </div>
        `;
      }
      if (type === "drag_and_drop" || type === "classify") {
        const items = type === "classify" ? activity.items || [] : activity.draggables || [];
        const targets = type === "classify" ? activity.categories || [] : activity.dropTargets || [];
        return `
          <div class="interactive-board" data-interactive-board>
            <div class="interactive-pieces" aria-label="ITENS">
              ${items.map((item) => `<button type="button" data-interactive-item="${item.id}" disabled>${item.label}</button>`).join("")}
            </div>
            <div class="interactive-targets" aria-label="DESTINOS">
              ${targets.map((target) => `<button type="button" data-interactive-target="${target.id}" disabled>${target.label}</button>`).join("")}
            </div>
            <button class="interactive-confirm" type="button" data-interactive-confirm disabled>CONFIRMAR</button>
          </div>
        `;
      }
      if (type === "match_pairs" || type === "memory_game") {
        const cards = type === "memory_game"
          ? activity.memory?.cards || []
          : (activity.pairs || []).flatMap((pair) => [
              { ...pair.left, pairId: pair.id },
              { ...pair.right, pairId: pair.id },
            ]);
        return `
          <div class="interactive-card-grid" data-interactive-card-grid>
            ${cards.map((card) => `<button type="button" data-interactive-card="${card.id}" data-pair-id="${card.pairId}" disabled>${card.label}</button>`).join("")}
          </div>
        `;
      }
      if (type === "sort_sequence") {
        const order = activity.sequence?.initialOrder || (activity.sequence?.items || []).map((item) => item.id);
        const itemById = new Map((activity.sequence?.items || []).map((item) => [item.id, item]));
        return `
          <div class="interactive-sequence" data-interactive-sequence>
            ${order.map((id, index) => `<div data-sequence-row="${id}"><strong>${itemById.get(id)?.label || id}</strong><button type="button" data-sequence-move="${id}" data-direction="up" disabled>SUBIR</button><button type="button" data-sequence-move="${id}" data-direction="down" disabled>DESCER</button></div>`).join("")}
            <button class="interactive-confirm" type="button" data-interactive-confirm disabled>CONFIRMAR</button>
          </div>
        `;
      }
      if (type === "trace_path") {
        return `
          <div class="interactive-path" data-interactive-path>
            ${(activity.path?.points || []).map((point, index) => `<button type="button" data-path-point="${point.id}" data-path-index="${index}" style="--x:${point.x}%;--y:${point.y}%" disabled>${point.label || index + 1}</button>`).join("")}
          </div>
        `;
      }
      return `<p class="interactive-feedback is-incorrect">TIPO DE ATIVIDADE EM PREPARACAO.</p>`;
    },
    render(activity) {
      const saved = this.getState(activity.code);
      const attempts = saved?.attempts || 0;
      const hasScene = activity.scene?.objects?.length;
      return `
        <section class="interactive-dialog" role="dialog" aria-modal="true" aria-labelledby="interactive-title" aria-describedby="interactive-instruction">
          <button class="experience-close" type="button" data-interactive-close aria-label="Fechar atividade">×</button>
          <header class="experience-player-header interactive-header">
            <div>
              <span>${activity.code}</span>
              <h2 id="interactive-title">${activity.title}</h2>
              <p id="interactive-instruction">${activity.instruction}</p>
            </div>
            <aside>
              <strong data-interactive-state>${this.getStateLabel(saved?.state || "ready")}</strong>
              <small data-interactive-attempts>${attempts} TENTATIVA${attempts === 1 ? "" : "S"}</small>
            </aside>
          </header>
          <div class="interactive-stage" data-interactive-stage data-activity-type="${activity.type}">
            <div class="interactive-story">
              <strong>${activity.question?.context || activity.instruction || ""}</strong>
              <span>${activity.question?.text || activity.title}</span>
            </div>
            ${hasScene ? `<div class="interactive-scene" data-interactive-scene aria-label="${activity.narrationText || activity.title}">${(activity.scene?.objects || []).map((object) => this.renderObject(object)).join("")}</div>` : ""}
            ${this.renderComponent(activity)}
            <div class="interactive-feedback" data-interactive-feedback hidden aria-live="polite"></div>
          </div>
          <footer class="experience-controls interactive-controls" aria-label="Controles da atividade">
            <button type="button" data-interactive-start>INICIAR</button>
            <button type="button" data-interactive-repeat>NARRACAO</button>
            <button type="button" data-interactive-hint>DICA</button>
            <button type="button" data-interactive-restart>REINICIAR</button>
            <button type="button" data-interactive-mute aria-pressed="false">AUDIO</button>
          </footer>
        </section>
      `;
    },
    open(code) {
      this.close({ silent: true });
      this.activeCode = code;
      this.activeActivity = this.getActivity(code);
      this.overlay = document.createElement("div");
      this.overlay.className = "experience-player-overlay interactive-overlay";
      this.overlay.dataset.interactiveCode = code || "";
      this.overlay.innerHTML = this.activeActivity ? this.render(this.activeActivity) : this.renderUnavailable(code);
      document.body.appendChild(this.overlay);
      document.body.classList.add("experience-player-open");
      this.answerLocked = false;
      this.workingState = null;
      this.startedAtMs = Date.now();
      this.bind();
      const saved = this.activeActivity ? interactiveActivityProgressStore.get(code) : null;
      const initialState = saved?.status === "completed" ? "completed" : this.activeActivity ? "ready" : "error";
      this.setState(initialState, { event: this.activeActivity ? "open" : "error" });
      if (initialState === "completed") {
        const feedback = this.overlay.querySelector("[data-interactive-feedback]");
        if (feedback) {
          feedback.hidden = false;
          feedback.className = "interactive-feedback is-correct";
          feedback.textContent = "ATIVIDADE CONCLUIDA!";
        }
      }
      this.overlay.querySelector("[data-interactive-start]")?.focus();
      return this.activeActivity;
    },
    bind() {
      this.overlay.addEventListener("click", (event) => {
        if (event.target === this.overlay || event.target.closest("[data-interactive-close]")) this.close();
        if (event.target.closest("[data-interactive-start]")) this.start(this.activeCode);
        if (event.target.closest("[data-interactive-restart]")) this.restart(this.activeCode);
        if (event.target.closest("[data-interactive-repeat]")) this.repeatNarration();
        if (event.target.closest("[data-interactive-hint]")) this.useHint();
        if (event.target.closest("[data-interactive-mute]")) this.toggleMute(event.target.closest("[data-interactive-mute]"));
        if (event.target.closest("[data-interactive-confirm]")) this.submit(this.activeCode, "__confirm__");
        const objectButton = event.target.closest("[data-interactive-object]");
        if (objectButton) this.handleComponentAction("object", objectButton.dataset.interactiveObject, objectButton);
        const itemButton = event.target.closest("[data-interactive-item]");
        if (itemButton) this.handleComponentAction("item", itemButton.dataset.interactiveItem, itemButton);
        const targetButton = event.target.closest("[data-interactive-target]");
        if (targetButton) this.handleComponentAction("target", targetButton.dataset.interactiveTarget, targetButton);
        const cardButton = event.target.closest("[data-interactive-card]");
        if (cardButton) this.handleComponentAction("card", cardButton.dataset.interactiveCard, cardButton);
        const moveButton = event.target.closest("[data-sequence-move]");
        if (moveButton) this.handleComponentAction("sequence", moveButton.dataset.sequenceMove, moveButton);
        const pathButton = event.target.closest("[data-path-point]");
        if (pathButton) this.handleComponentAction("path", pathButton.dataset.pathPoint, pathButton);
        const answerButton = event.target.closest("[data-interactive-answer]");
        if (answerButton) this.submit(this.activeCode, Number(answerButton.dataset.interactiveAnswer));
      });
      this.handleKeydown = (event) => {
        if (!this.overlay) return;
        if (event.key === "Escape") {
          event.preventDefault();
          this.close();
        }
      };
      document.addEventListener("keydown", this.handleKeydown);
    },
    start(code) {
      if (!this.activeActivity || code !== this.activeCode) return null;
      this.startedAtMs = Date.now();
      const current = interactiveActivityProgressStore.get(code);
      this.workingState = null;
      interactiveActivityProgressStore.save(code, {
        event: current?.startedAt ? "resume" : "start",
        state: "playing_intro",
        status: "in_progress",
        experienceCode: this.activeActivity.experienceCode,
        startedAt: current?.startedAt || new Date().toISOString(),
      });
      this.setState("playing_intro");
      this.overlay.querySelectorAll("[data-animation='fly_away']").forEach((object) => object.classList.add("is-flying"));
      const enableControls = () => {
        this.setState("waiting_answer", { event: "question_ready" });
        this.overlay.querySelectorAll("[data-interactive-answer], [data-interactive-object], [data-interactive-item], [data-interactive-target], [data-interactive-card], [data-sequence-move], [data-path-point], [data-interactive-confirm]").forEach((button) => {
          button.disabled = false;
        });
        this.overlay.querySelector("[data-interactive-answer], [data-interactive-object], [data-interactive-item], [data-interactive-card], [data-path-point]")?.focus();
      };
      if (!this.overlay.querySelector("[data-animation='fly_away']")) {
        enableControls();
        return this.getState(code);
      }
      window.setTimeout(() => {
        if (!this.overlay || this.activeCode !== code) return;
        enableControls();
      }, window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? 120 : 1100);
      return this.getState(code);
    },
    ensureWorkingState() {
      if (this.workingState) return this.workingState;
      const activity = this.activeActivity || {};
      this.workingState = {
        selectedObjects: new Set(),
        selectedItem: null,
        placements: {},
        selectedCards: [],
        matchedPairs: new Set(),
        sequenceOrder: [...(activity.sequence?.initialOrder || (activity.sequence?.items || []).map((item) => item.id))],
        pathIndex: 0,
      };
      return this.workingState;
    },
    handleComponentAction(kind, value, button) {
      if (!this.activeActivity || this.state !== "waiting_answer") return;
      const state = this.ensureWorkingState();
      if (kind === "object") {
        if (state.selectedObjects.has(value)) state.selectedObjects.delete(value);
        else state.selectedObjects.add(value);
        button?.classList.toggle("is-selected", state.selectedObjects.has(value));
      }
      if (kind === "item") {
        state.selectedItem = value;
        this.overlay.querySelectorAll("[data-interactive-item]").forEach((item) => item.classList.toggle("is-selected", item.dataset.interactiveItem === value));
      }
      if (kind === "target" && state.selectedItem) {
        state.placements[state.selectedItem] = value;
        button?.classList.add("is-selected");
        state.selectedItem = null;
        this.overlay.querySelectorAll("[data-interactive-item]").forEach((item) => item.classList.remove("is-selected"));
      }
      if (kind === "card") {
        if (button?.classList.contains("is-matched")) return;
        state.selectedCards.push({ id: value, pairId: button?.dataset.pairId, button });
        button?.classList.add("is-selected");
        if (state.selectedCards.length === 2) this.submit(this.activeCode, "__pair__");
      }
      if (kind === "sequence") {
        const direction = button?.dataset.direction;
        const index = state.sequenceOrder.indexOf(value);
        const swapIndex = direction === "up" ? index - 1 : index + 1;
        if (index >= 0 && swapIndex >= 0 && swapIndex < state.sequenceOrder.length) {
          [state.sequenceOrder[index], state.sequenceOrder[swapIndex]] = [state.sequenceOrder[swapIndex], state.sequenceOrder[index]];
          this.renderSequenceOrder();
        }
      }
      if (kind === "path") {
        const expected = this.activeActivity.path?.points?.[state.pathIndex]?.id;
        if (value === expected) {
          button?.classList.add("is-selected");
          state.pathIndex += 1;
          if (state.pathIndex >= (this.activeActivity.path?.points || []).length) this.submit(this.activeCode, "__path__");
        } else {
          this.submit(this.activeCode, "__path_error__");
        }
      }
    },
    renderSequenceOrder() {
      const container = this.overlay?.querySelector("[data-interactive-sequence]");
      if (!container || !this.activeActivity?.sequence) return;
      const itemById = new Map(this.activeActivity.sequence.items.map((item) => [item.id, item]));
      container.querySelectorAll("[data-sequence-row]").forEach((row) => row.remove());
      const confirm = container.querySelector("[data-interactive-confirm]");
      this.ensureWorkingState().sequenceOrder.forEach((id) => {
        const row = document.createElement("div");
        row.dataset.sequenceRow = id;
        row.innerHTML = `<strong>${itemById.get(id)?.label || id}</strong><button type="button" data-sequence-move="${id}" data-direction="up">SUBIR</button><button type="button" data-sequence-move="${id}" data-direction="down">DESCER</button>`;
        container.insertBefore(row, confirm);
      });
    },
    submit(code, answerIndex) {
      if (!this.activeActivity || code !== this.activeCode || this.answerLocked) return null;
      const result = this.evaluateAnswer(answerIndex);
      if (!result) return null;
      const option = result.selectedAnswer;
      if (result.partial) {
        const current = interactiveActivityProgressStore.get(code);
        const answerRecord = {
          selectedAnswer: option,
          correctAnswer: result.correctAnswer,
          isCorrect: true,
          partial: true,
          at: new Date().toISOString(),
        };
        interactiveActivityProgressStore.save(code, {
          event: "partial_correct",
          state: "waiting_answer",
          status: "in_progress",
          selectedAnswer: option,
          attempts: current?.attempts || 0,
          answers: [...(current?.answers || []), answerRecord],
          correctCount: (current?.correctCount || 0) + 1,
          score: (current?.score || 0) + 1,
          result: "partial_correct",
          experienceCode: this.activeActivity.experienceCode,
        });
        this.showFeedback(true, this.activeActivity.feedback?.partial?.message || "PAR ENCONTRADO!");
        window.setTimeout(() => {
          if (!this.overlay || this.activeCode !== code) return;
          this.answerLocked = false;
          this.setState("waiting_answer");
          this.overlay.querySelectorAll("[data-interactive-card]").forEach((button) => {
            if (!button.classList.contains("is-matched")) {
              button.disabled = false;
              button.classList.remove("is-selected");
            }
          });
          this.ensureWorkingState().selectedCards = [];
        }, 700);
        return this.getState(code);
      }
      this.answerLocked = true;
      this.setState("checking_answer");
      const current = interactiveActivityProgressStore.get(code);
      const attempts = (current?.attempts || 0) + 1;
      const isCorrect = result.isCorrect;
      const answerRecord = {
        selectedAnswer: option,
        correctAnswer: result.correctAnswer,
        isCorrect,
        partial: false,
        at: new Date().toISOString(),
      };
      interactiveActivityProgressStore.save(code, {
        event: "answer",
        state: isCorrect ? "correct" : "incorrect",
        status: "in_progress",
        selectedAnswer: option,
        correctAnswer: isCorrect ? result.correctAnswer : null,
        answers: [...(current?.answers || []), answerRecord],
        correctCount: (current?.correctCount || 0) + (isCorrect ? 1 : 0),
        incorrectCount: (current?.incorrectCount || 0) + (isCorrect ? 0 : 1),
        score: (current?.score || 0) + (isCorrect ? 1 : 0),
        result: isCorrect ? "correct" : "incorrect",
        attempts,
        experienceCode: this.activeActivity.experienceCode,
      });
      const attemptsNode = this.overlay?.querySelector("[data-interactive-attempts]");
      if (attemptsNode) attemptsNode.textContent = `${attempts} TENTATIVA${attempts === 1 ? "" : "S"}`;
      this.showFeedback(isCorrect);
      if (isCorrect) {
        window.setTimeout(() => this.complete(code), 650);
      } else {
        window.setTimeout(() => {
          if (!this.overlay || this.activeCode !== code) return;
          this.answerLocked = false;
          this.setState("waiting_answer");
          this.overlay.querySelectorAll("[data-interactive-answer], [data-interactive-object], [data-interactive-item], [data-interactive-target], [data-interactive-card], [data-sequence-move], [data-path-point], [data-interactive-confirm]").forEach((button) => {
            button.disabled = false;
          });
          this.overlay.querySelectorAll("[data-interactive-answer], [data-interactive-card]").forEach((button) => button.classList.remove("is-selected"));
          this.ensureWorkingState().selectedCards = [];
        }, 950);
      }
      return this.getState(code);
    },
    evaluateAnswer(answerIndex) {
      const activity = this.activeActivity;
      const state = this.ensureWorkingState();
      if (activity.type === "count_and_select" || activity.type === "select_option") {
        const option = activity.question.options[answerIndex];
        if (typeof option === "undefined") return null;
        return { selectedAnswer: option, correctAnswer: activity.question.correctAnswer, isCorrect: String(option) === String(activity.question.correctAnswer) };
      }
      if (activity.type === "complete_word") {
        const option = activity.word.choices[answerIndex];
        if (typeof option === "undefined") return null;
        return { selectedAnswer: option, correctAnswer: activity.word.answer, isCorrect: String(option).toUpperCase() === String(activity.word.answer).toUpperCase() };
      }
      if (activity.type === "tap_objects") {
        const selected = [...state.selectedObjects].sort();
        const correct = [...(activity.selection?.correctObjectIds || [])].sort();
        return { selectedAnswer: selected, correctAnswer: correct, isCorrect: selected.length === correct.length && selected.every((id, index) => id === correct[index]) };
      }
      if (activity.type === "drag_and_drop") {
        const correct = Object.fromEntries((activity.dropTargets || []).flatMap((target) => (target.accepts || []).map((id) => [id, target.id])));
        const isCorrect = Object.entries(correct).every(([itemId, targetId]) => state.placements[itemId] === targetId);
        return { selectedAnswer: state.placements, correctAnswer: correct, isCorrect };
      }
      if (activity.type === "classify") {
        const correct = Object.fromEntries((activity.items || []).map((item) => [item.id, item.category]));
        const isCorrect = Object.entries(correct).every(([itemId, category]) => state.placements[itemId] === category);
        return { selectedAnswer: state.placements, correctAnswer: correct, isCorrect };
      }
      if (activity.type === "match_pairs" || activity.type === "memory_game") {
        if (answerIndex === "__pair__") {
          const [first, second] = state.selectedCards;
          const isCorrect = first?.pairId && first.pairId === second?.pairId && first.id !== second.id;
          if (isCorrect) {
            state.matchedPairs.add(first.pairId);
            first.button?.classList.add("is-matched");
            second.button?.classList.add("is-matched");
          }
          const totalPairs = activity.type === "memory_game" ? new Set((activity.memory?.cards || []).map((card) => card.pairId)).size : (activity.pairs || []).length;
          const completed = state.matchedPairs.size >= totalPairs;
          return { selectedAnswer: [first?.id, second?.id], correctAnswer: [...state.matchedPairs], isCorrect: isCorrect && completed, partial: isCorrect && !completed };
        }
      }
      if (activity.type === "sort_sequence") {
        const correct = activity.sequence?.correctOrder || [];
        return { selectedAnswer: state.sequenceOrder, correctAnswer: correct, isCorrect: state.sequenceOrder.length === correct.length && state.sequenceOrder.every((id, index) => id === correct[index]) };
      }
      if (activity.type === "trace_path") {
        return { selectedAnswer: state.pathIndex, correctAnswer: activity.path?.points?.length || 0, isCorrect: answerIndex === "__path__" };
      }
      return null;
    },
    showFeedback(isCorrect, overrideMessage) {
      const feedback = this.overlay?.querySelector("[data-interactive-feedback]");
      if (!feedback) return;
      const meta = isCorrect ? this.activeActivity.feedback.correct : this.activeActivity.feedback.incorrect;
      feedback.hidden = false;
      feedback.className = `interactive-feedback ${isCorrect ? "is-correct" : "is-incorrect"}`;
      feedback.textContent = overrideMessage || meta.message;
      this.overlay.querySelectorAll("[data-interactive-answer], [data-interactive-object], [data-interactive-item], [data-interactive-target], [data-interactive-card], [data-sequence-move], [data-path-point], [data-interactive-confirm]").forEach((button) => {
        button.disabled = true;
      });
      this.setState(isCorrect ? "correct" : "incorrect");
    },
    restart(code) {
      if (!this.activeActivity || code !== this.activeCode) {
        this.open(code);
      }
      const current = interactiveActivityProgressStore.get(code);
      interactiveActivityProgressStore.save(code, {
        event: "restart",
        state: "ready",
        status: "in_progress",
        restartCount: (current?.restartCount || 0) + 1,
        experienceCode: this.activeActivity?.experienceCode,
      });
      this.overlay.querySelectorAll("[data-animation='fly_away']").forEach((object) => object.classList.remove("is-flying"));
      this.overlay.querySelectorAll("[data-interactive-answer]").forEach((button) => {
        button.disabled = true;
        button.classList.remove("is-selected");
      });
      const feedback = this.overlay.querySelector("[data-interactive-feedback]");
      if (feedback) feedback.hidden = true;
      this.answerLocked = false;
      this.setState("ready");
      return this.getState(code);
    },
    complete(code) {
      if (!this.activeActivity || code !== this.activeCode) return null;
      const current = interactiveActivityProgressStore.get(code);
      const durationMs = (current?.durationMs || 0) + Math.max(0, Date.now() - this.startedAtMs);
      const record = interactiveActivityProgressStore.save(code, {
        event: "complete",
        state: "completed",
        status: "completed",
        completedAt: new Date().toISOString(),
        durationMs,
        correctAnswer: current?.correctAnswer ?? this.activeActivity.question?.correctAnswer ?? this.activeActivity.word?.answer ?? null,
        experienceCode: this.activeActivity.experienceCode,
      });
      experienceProgressStore.upsert(this.activeActivity.experienceCode, {
        event: "interactive_complete",
        status: "completed",
        progressPercent: 100,
        percentWatched: 100,
        completedAt: new Date().toISOString(),
      });
      this.setState("completed");
      const feedback = this.overlay?.querySelector("[data-interactive-feedback]");
      if (feedback) {
        feedback.hidden = false;
        feedback.className = "interactive-feedback is-correct";
        feedback.textContent = "ATIVIDADE CONCLUIDA!";
      }
      return record;
    },
    repeatNarration() {
      const feedback = this.overlay?.querySelector("[data-interactive-feedback]");
      if (feedback && this.activeActivity?.narrationText) {
        feedback.hidden = false;
        feedback.className = "interactive-feedback";
        feedback.textContent = this.activeActivity.narrationText;
      }
    },
    useHint() {
      if (!this.activeActivity || !this.activeCode) return null;
      const current = interactiveActivityProgressStore.get(this.activeCode);
      const nextHintsUsed = (current?.hintsUsed || 0) + 1;
      const hint = this.activeActivity.hints?.[Math.min(nextHintsUsed - 1, (this.activeActivity.hints?.length || 1) - 1)];
      const message = hint?.text || this.activeActivity.feedback?.hint?.message || this.activeActivity.instruction || "OBSERVE COM CALMA E TENTE DE NOVO.";
      const feedback = this.overlay?.querySelector("[data-interactive-feedback]");
      if (feedback) {
        feedback.hidden = false;
        feedback.className = "interactive-feedback";
        feedback.textContent = message;
      }
      return interactiveActivityProgressStore.save(this.activeCode, {
        event: "hint",
        state: this.state,
        status: current?.status || "in_progress",
        hintsUsed: nextHintsUsed,
        result: "hint_used",
        experienceCode: this.activeActivity.experienceCode,
      });
    },
    toggleMute(button) {
      const pressed = button?.getAttribute("aria-pressed") === "true";
      button?.setAttribute("aria-pressed", String(!pressed));
      if (button) button.textContent = pressed ? "AUDIO" : "SEM AUDIO";
    },
    close({ silent = false } = {}) {
      if (this.activeCode && !silent) {
        const current = interactiveActivityProgressStore.get(this.activeCode);
        if (current?.status !== "completed") {
          interactiveActivityProgressStore.save(this.activeCode, {
            event: "close",
            state: "paused",
            status: current?.status || "in_progress",
            abandonedCount: (current?.abandonedCount || 0) + 1,
            durationMs: (current?.durationMs || 0) + Math.max(0, Date.now() - this.startedAtMs),
            experienceCode: this.activeActivity?.experienceCode,
          });
        }
      }
      this.overlay?.remove();
      this.overlay = null;
      this.activeCode = null;
      this.activeActivity = null;
      this.answerLocked = false;
      this.workingState = null;
      document.body.classList.remove("experience-player-open");
      document.removeEventListener("keydown", this.handleKeydown);
    },
  };

  class GameEngine {
    constructor(root, gameId) {
      this.root = root;
      this.game = gameRepository.getGame(gameId);
      this.state = progressController.create(this.game);
      this.record = rewardController.latest(this.game.id);
      this.mode = root.dataset.gameId ? "player" : "hub";
      this.journeyV2Visited = new Set();
      this.journeyV2Completed = new Set();
      this.mysteryBoxMachine = new MysteryBoxStateMachine({
        onStateChange: (boxState, locked) => this.syncMysteryBoxState(boxState, locked),
        onReveal: () => this.revealMysteryBoxHint(),
      });
      this.magicBox = new MagicBox({
        onStateChange: (boxState, locked) => this.syncMagicBoxState(boxState, locked),
        onTouch: () => this.handleMagicBoxTouch(),
        onAnimationEnd: () => this.handleMagicBoxAnimationEnd(),
        onReveal: () => this.handleMagicBoxReveal(),
      });
      this.characters = {
        bia: new ReactiveCharacter({
          id: "bia",
          onStateChange: (characterState, character) => this.syncReactiveCharacterState(character.id, characterState),
        }),
      };
      this.magicBoxFrameTimer = null;
    }

    mount() {
      this.root.style.setProperty("--game-atlas", `url("${this.game.assets.atlas}")`);
      this.root.style.setProperty("--library-atlas", `url("${this.game.assets.library}")`);
      this.root.innerHTML = this.render();
      this.bind();
      if (this.mode === "player") {
        this.root.dataset.activeGame = this.game.id;
        document.documentElement.classList.add("game-immersive-active");
        document.body.classList.add("game-immersive-active");
        this.root.classList.add("game-immersive-active");
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
        <section class="game-shell game-player-shell" aria-label="Motor Oficial dos Jogos Digitais">
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
      if (this.game.type === "selection") {
        return `
          <section class="game-screen selection-screen selection-intro-screen" data-screen="intro" aria-label="Boas-vindas">
            <div class="game-scene selection-room-scene" style="--screen:url('${this.game.assets.components.room}')" aria-hidden="true"></div>
            ${components.particles(18)}
            <div class="selection-hero">
              <h1>${this.game.title}</h1>
              <div class="selection-hero-composition" aria-hidden="true">
                <img class="selection-hero-box" src="${this.game.assets.boxes.closed}" alt="" loading="eager" decoding="async" />
              </div>
              <button class="game-primary-button game-start-button" type="button" data-game-action="start" aria-label="Iniciar ${this.game.title}">▶ Iniciar</button>
            </div>
          </section>
        `;
      }
      if (this.game.id === "organizando-cesta") {
        return `
          <section class="game-screen basket-intro-screen" data-screen="intro" aria-label="Boas-vindas">
            <div class="game-scene game-scene-intro" style="--screen:url('${this.game.assets.screens.intro}')" aria-hidden="true"></div>
            ${components.particles(18)}
            <div class="basket-intro-composition">
              <img class="basket-official-title" src="${this.game.assets.components.title}" alt="${this.game.title}" loading="eager" decoding="async" />
              <img class="basket-intro-ana" src="${this.game.assets.characters.ana}" alt="" loading="eager" decoding="async" />
              <img class="basket-intro-basket" src="${this.game.assets.components.fullBasket}" alt="" loading="eager" decoding="async" />
              <img class="basket-intro-bia" src="${this.game.assets.characters.bia}" alt="" loading="eager" decoding="async" />
              <button class="game-primary-button game-start-button" type="button" data-game-action="start" aria-label="Comecar ${this.game.title}">▶ Comecar</button>
            </div>
          </section>
        `;
      }
      return `
        <section class="game-screen" data-screen="intro" aria-label="Boas-vindas">
          <div class="game-scene game-scene-intro" style="--screen:url('${this.game.assets.screens.intro}')" aria-hidden="true"></div>
          ${components.particles(18)}
          ${this.game.id === "organizando-cesta" ? `<h1 class="basket-title">${this.game.title}</h1>` : ""}
          <div class="game-hero-copy">
            <button class="game-primary-button game-start-button" type="button" data-game-action="start" aria-label="Comecar ${this.game.title}">▶ Comecar</button>
          </div>
        </section>
      `;
    }

    renderRoomScreen() {
      if (this.game.type === "drag-drop") {
        const round = this.currentRound();
        if (this.game.id === "organizando-cesta") {
          return `
            <section class="game-screen basket-room-screen" data-screen="room" aria-label="Observando as frutas">
              <div class="game-scene game-scene-room" style="--screen:url('${this.game.assets.screens.room}')" aria-hidden="true"></div>
              ${components.particles(12)}
              <article class="basket-observe-panel">
                ${components.audioButton("Ouvir frutas", round.narration)}
                <strong>Observe as frutas</strong>
                <span>Temos maca, banana, uva e pera.</span>
              </article>
              <div class="basket-fruit-stage" aria-hidden="true">
                <img src="${this.game.assets.fruits.apple}" alt="" loading="eager" decoding="async" />
                <img src="${this.game.assets.fruits.banana}" alt="" loading="eager" decoding="async" />
                <img src="${this.game.assets.fruits.grape}" alt="" loading="eager" decoding="async" />
                <img src="${this.game.assets.fruits.pear}" alt="" loading="eager" decoding="async" />
              </div>
            </section>
          `;
        }
        return `
          <section class="game-screen${this.game.id === "organizando-cesta" ? " basket-room-screen" : ""}" data-screen="room" aria-label="${round.layout === "shape-house" ? "Observando as formas" : "Observando as frutas"}">
            <div class="game-scene game-scene-room" style="--screen:url('${this.game.assets.screens.room}')" aria-hidden="true"></div>
            ${components.particles(18)}
            ${this.game.id === "organizando-cesta" ? "" : `<button class="game-primary-button game-observe-button" type="button" data-game-action="begin-drag">${round.layout === "shape-house" ? "Montar" : "Organizar"}</button>`}
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
      if (this.game.type === "path-follow-v2") {
        return `
          <section class="game-screen" data-screen="room" aria-label="Conhecendo o mapa">
            <div class="game-scene game-scene-room" style="--screen:url('${this.game.assets.screens.room}')" aria-hidden="true"></div>
            ${components.particles(18)}
            <article class="garden-prompt">
              ${components.audioButton("Ouvir instrucao", this.currentRound().narration)}
              <strong data-hint-text>Vamos conhecer os lugares do caminho!</strong>
            </article>
            <article class="path-v2-map-preview" data-path-v2-preview></article>
            <button class="game-primary-button game-observe-button" type="button" data-game-action="begin-path-v2">Explorar</button>
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
      if (this.game.type === "journey-celebration-v2") {
        return `
          <section class="game-screen" data-screen="room" aria-label="Hub da Festa Volume 2">
            <div class="game-scene game-scene-room" style="--screen:url('${this.game.assets.screens.room}')" aria-hidden="true"></div>
            ${components.particles(26)}
            <article class="journey-v2-panel">
              <div class="journey-v2-prompt">
                ${components.audioButton("Ouvir instrucao", this.currentRound().narration)}
                <strong data-journey-v2-title>${this.currentRound().hint}</strong>
              </div>
              <div class="journey-v2-map" data-journey-v2-map></div>
              <aside class="journey-v2-school" data-journey-v2-school></aside>
              <aside class="journey-v2-tree" data-journey-v2-tree></aside>
            </article>
          </section>
        `;
      }
      if (this.game.type === "audio-recognition") {
        return `
          <section class="game-screen" data-screen="room" aria-label="Escutando o som">
            <div class="game-scene game-scene-room" style="--screen:url('${this.game.assets.screens.room}')" aria-hidden="true"></div>
            ${components.particles(20)}
            <article class="audio-recognition-listen">
              <button class="audio-play-button" type="button" data-game-action="play-audio" aria-label="Ouvir o som">
                <img src="${this.game.assets.audioButton}" alt="" loading="eager" decoding="async" />
                <span>Ouvir</span>
              </button>
              <p data-audio-status>Toque para ouvir quantas vezes quiser.</p>
              <button class="game-primary-button" type="button" data-game-action="begin-audio-choice">Escolher</button>
            </article>
          </section>
        `;
      }
      if (this.game.type === "pattern-recognition") {
        return `
          <section class="game-screen" data-screen="room" aria-label="Observando a sequencia">
            <div class="game-scene game-scene-room" style="--screen:url('${this.game.assets.screens.room}')" aria-hidden="true"></div>
            ${components.particles(18)}
            <article class="garden-prompt">
              ${components.audioButton("Ouvir instrucao", this.currentRound().narration)}
              <strong data-hint-text>${this.currentRound().hint}</strong>
            </article>
            <article class="pattern-observe-panel">
              <div class="pattern-sequence" data-pattern-sequence></div>
              <button class="game-primary-button" type="button" data-game-action="begin-pattern">Escolher</button>
            </article>
          </section>
        `;
      }
      if (this.game.type === "exploration-v2") {
        return `
          <section class="game-screen" data-screen="room" aria-label="Explorando o Jardim Vivo">
            <div class="game-scene game-scene-room" style="--screen:url('${this.game.assets.screens.room}')" aria-hidden="true"></div>
            ${components.particles(20)}
            <article class="exploration-v2-prompt">
              ${components.audioButton("Ouvir missao", this.currentRound().narration)}
              <div>
                <strong data-exploration-v2-hint>${this.currentRound().hint}</strong>
                <span data-exploration-v2-feedback></span>
              </div>
            </article>
            <article class="exploration-v2-stage">
              <div class="exploration-v2-elements" data-exploration-v2-elements></div>
              <aside class="nature-tree-panel">
                <strong>${this.game.exploration.missionPanelTitle}</strong>
                <div class="nature-tree-visual" data-nature-tree></div>
                <div class="nature-mission-list" data-nature-mission-list></div>
                <span data-nature-progress>0/${this.game.rounds.length}</span>
              </aside>
            </article>
          </section>
        `;
      }
      if (this.game.type === "story-builder") {
        return `
          <section class="game-screen" data-screen="room" aria-label="Escolha do personagem">
            <div class="game-scene game-scene-room" style="--screen:url('${this.game.assets.steps.character}')" aria-hidden="true"></div>
            ${components.particles(16)}
            <article class="story-builder-panel" data-story-panel></article>
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
      if (this.game.type === "selection") {
        return `
          <section class="game-screen selection-screen selection-box-screen" data-screen="room" aria-label="Caixa Misteriosa">
            ${this.renderBackgroundVideoLayer("room", this.game.assets.components.room)}
            ${components.particles(34)}
            ${this.renderReactiveCharacterLayer("bia")}
            <article class="selection-open-prompt">
              <strong data-discovery-prompt>${this.state.discoveryPrompt || "Abra a caixa para fazer uma descoberta!"}</strong>
            </article>
            ${this.renderMysteryBoxComponent()}
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

    getBackgroundVideoConfig(slot, fallbackImage) {
      const gameConfig = window.RaizesGameConfig?.games?.[this.game.id]?.backgroundVideo?.[slot]
        || window.RaizesGameConfig?.backgroundVideos?.[this.game.id]?.[slot]
        || this.game.assets.backgroundVideo?.[slot]
        || null;
      if (!gameConfig) {
        return { src: "", poster: fallbackImage, fallback: fallbackImage, version: "" };
      }
      if (typeof gameConfig === "string") {
        return { src: gameConfig, poster: fallbackImage, fallback: fallbackImage, version: "" };
      }
      return {
        src: gameConfig.src || "",
        poster: gameConfig.poster || gameConfig.fallback || fallbackImage,
        fallback: gameConfig.fallback || gameConfig.poster || fallbackImage,
        version: gameConfig.version || "",
      };
    }

    renderBackgroundVideoLayer(slot, fallbackImage) {
      const config = this.getBackgroundVideoConfig(slot, fallbackImage);
      return `
        <div class="game-scene selection-room-scene background-video-layer" data-background-video-layer="${escapeHtml(slot)}" data-background-video-version="${escapeHtml(config.version)}" style="--screen:url('${escapeHtml(config.fallback)}')" aria-hidden="true">
          <img class="background-video-fallback" src="${escapeHtml(config.fallback)}" alt="" loading="eager" decoding="async" />
          ${config.src ? `<video class="background-video" src="${escapeHtml(config.src)}" poster="${escapeHtml(config.poster)}" autoplay muted loop playsinline preload="metadata" disablepictureinpicture></video>` : ""}
        </div>
      `;
    }

    getReactiveCharacterConfig(characterId) {
      const config = window.RaizesGameConfig?.games?.[this.game.id]?.reactiveCharacters?.[characterId]
        || window.RaizesGameConfig?.reactiveCharacters?.[this.game.id]?.[characterId]
        || this.game.assets.reactiveCharacters?.[characterId]
        || {};
      return {
        name: config.name || characterId,
        version: config.version || "V1",
        states: config.states || {},
      };
    }

    renderReactiveCharacterLayer(characterId) {
      const character = this.characters?.[characterId];
      const config = this.getReactiveCharacterConfig(characterId);
      const state = character?.state || reactiveCharacterStates.IDLE;
      return `
        <div class="reactive-character-layer" data-reactive-character-layer aria-hidden="true">
          <div class="reactive-character" data-character-id="${escapeHtml(characterId)}" data-character-state="${escapeHtml(state)}" data-character-version="${escapeHtml(config.version)}">
            ${Object.values(reactiveCharacterStates).map((characterState) => {
              const animation = config.states?.[characterState] || null;
              return `<span class="reactive-character-state" data-character-state-slot="${escapeHtml(characterState)}" data-character-frame-ms="${Number(animation?.frameMs || 100)}">${this.renderReactiveCharacterAsset(animation)}</span>`;
            }).join("")}
          </div>
        </div>
      `;
    }

    renderReactiveCharacterAsset(animation) {
      if (!animation?.src && !animation?.frames?.length && !animation?.sprite) return "";
      if (animation.type === "video") {
        return `<video src="${escapeHtml(animation.src)}" muted playsinline preload="metadata" loop></video>`;
      }
      if (animation.type === "sprite" || animation.sprite) {
        return `<span class="reactive-character-sprite" style="--character-sprite:url('${escapeHtml(animation.src || animation.sprite)}');--character-steps:${Number(animation.steps || 1)}"></span>`;
      }
      if (animation.type === "sequence" || animation.frames?.length) {
        return animation.frames.map((frame, index) => `<img src="${escapeHtml(frame)}" alt="" loading="lazy" decoding="async" data-character-frame="${index}" />`).join("");
      }
      return `<img src="${escapeHtml(animation.src)}" alt="" loading="eager" decoding="async" />`;
    }

    renderMysteryBoxComponent() {
      const boxes = this.game.assets.boxes || {};
      const boxState = this.state.mysteryBoxState || mysteryBoxStates.IDLE;
      const magicBoxState = this.state.magicBoxState || magicBoxStates.IDLE;
      const magicBoxConfig = this.getMagicBoxConfig();
      return `
        <button
          class="discovery-box selection-discovery-box mystery-box-component magic-box"
          type="button"
          data-game-action="open-box"
          data-box-state="${boxState}"
          data-magic-box-state="${escapeHtml(magicBoxState)}"
          data-magic-box-version="${escapeHtml(magicBoxConfig.version)}"
          aria-label="Abrir caixa misteriosa"
          aria-busy="${boxState !== mysteryBoxStates.IDLE || magicBoxState !== magicBoxStates.IDLE ? "true" : "false"}"
          style="--box-idle:url('${boxes.closed}');--box-touch:url('${boxes.closed}');--box-shake:url('${boxes.closed}');--box-glow:url('${boxes.glowing || boxes.closed}');--box-opening:url('${boxes.opening || boxes.open}');--box-open:url('${boxes.open}');--box-reveal:url('${boxes.openInsert || boxes.open}');"
        >
          ${this.renderMagicBoxAnimationSlots(magicBoxConfig)}
        </button>
      `;
    }

    getMagicBoxConfig() {
      const config = window.RaizesGameConfig?.games?.[this.game.id]?.magicBox
        || window.RaizesGameConfig?.magicBox?.[this.game.id]
        || this.game.assets.magicBox
        || {};
      return {
        version: config.version || "V1",
        animations: config.animations || {},
      };
    }

    renderMagicBoxAnimationSlots(config) {
      return Object.values(magicBoxStates).map((state) => {
        const animation = config.animations?.[state] || null;
        return `<span class="magic-box-animation-slot" data-magic-box-animation-slot="${escapeHtml(state)}" data-magic-box-frame-ms="${Number(animation?.frameMs || 90)}" aria-hidden="true">${this.renderMagicBoxAnimationAsset(animation)}</span>`;
      }).join("");
    }

    renderMagicBoxAnimationAsset(animation) {
      if (!animation?.src && !animation?.frames?.length && !animation?.sprite) return "";
      if (animation.type === "video") {
        return `<video src="${escapeHtml(animation.src)}" muted playsinline preload="metadata" loop></video>`;
      }
      if (animation.type === "sprite" || animation.sprite) {
        return `<span class="magic-box-sprite" style="--magic-box-sprite:url('${escapeHtml(animation.src || animation.sprite)}');--magic-box-steps:${Number(animation.steps || 1)}"></span>`;
      }
      if (animation.type === "sequence" || animation.frames?.length) {
        return animation.frames.map((frame, index) => `<img src="${escapeHtml(frame)}" alt="" loading="lazy" decoding="async" data-magic-box-frame="${index}" />`).join("");
      }
      return `<img src="${escapeHtml(animation.src)}" alt="" loading="eager" decoding="async" />`;
    }

    renderHintScreen() {
      if (this.game.type === "drag-drop" || this.game.type === "find" || this.game.type === "snap" || this.game.type === "criteria" || this.game.type === "path-follow" || this.game.type === "path-follow-v2" || this.game.type === "creative-canvas" || this.game.type === "timeline-sequence" || this.game.type === "journey-celebration" || this.game.type === "journey-celebration-v2" || this.game.type === "audio-recognition" || this.game.type === "pattern-recognition" || this.game.type === "exploration-v2" || this.game.type === "story-builder") {
        return "";
      }
      const round = this.currentRound();
      if (this.game.type === "selection") {
        return `
          <section class="game-screen selection-screen selection-hint-screen" data-screen="hint" aria-label="Dica narrada">
            <div class="game-scene selection-room-scene" style="--screen:url('${this.game.assets.components.room}')" aria-hidden="true"></div>
            <img class="selection-hint-box" src="${this.game.assets.boxes.open}" alt="" loading="eager" decoding="async" />
            <article class="hint-card selection-hint-card">
              <p data-hint-text>${round.hint}</p>
              ${components.audioButton("Repetir dica", round.narration)}
            </article>
          </section>
        `;
      }
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
          <section class="game-screen basket-choice-screen" data-screen="choice" aria-label="Organizacao da cesta">
            <div class="game-scene game-scene-choice" style="--screen:url('${this.game.assets.screens.choice}')" aria-hidden="true"></div>
            <article class="drag-panel">
              <h2>Arraste cada fruta para o cesto certo.</h2>
              <div class="drop-zone-grid" data-drop-zone-grid></div>
              <div class="drag-item-tray" data-drag-item-tray></div>
            </article>
          </section>
        `;
      }
      if (this.game.type === "selection") {
        return `
          <section class="game-screen selection-screen selection-choice-screen" data-screen="choice" aria-label="Escolha do objeto">
            <div class="game-scene selection-room-scene" style="--screen:url('${this.game.assets.components.room}')" aria-hidden="true"></div>
            <article class="choice-panel selection-choice-panel">
              <p class="selection-choice-hint" data-choice-hint>${this.currentRound().hint}</p>
              <h2>Qual sera o objeto da nossa caixa?</h2>
              <div class="choice-cards selection-choice-cards" data-choice-cards></div>
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
      if (this.game.type === "path-follow-v2") {
        return `
          <section class="game-screen" data-screen="choice" aria-label="Explorando o mapa">
            <div class="game-scene game-scene-choice" style="--screen:url('${this.game.assets.screens.choice}')" aria-hidden="true"></div>
            ${components.particles(20)}
            <article class="path-v2-panel">
              <div class="path-v2-prompt">
                ${components.audioButton("Ouvir instrucao", this.currentRound().narration)}
                <strong data-path-v2-title>${this.currentRound().hint}</strong>
                <span data-path-v2-feedback></span>
              </div>
              <div class="path-v2-board" data-path-v2-board></div>
              <aside class="path-v2-phases" data-path-v2-phases></aside>
              <div class="path-v2-progress"><i><b data-path-v2-progress style="width:0%"></b></i><span data-path-v2-progress-label>0%</span></div>
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
      if (this.game.type === "journey-celebration-v2") {
        return `
          <section class="game-screen" data-screen="choice" aria-label="Missoes da festa">
            <div class="game-scene game-scene-choice" style="--screen:url('${this.game.assets.screens.room}')" aria-hidden="true"></div>
            ${components.confetti(34)}
            <article class="journey-v2-mission-panel" data-journey-v2-mission-panel></article>
          </section>
        `;
      }
      if (this.game.type === "audio-recognition") {
        return `
          <section class="game-screen" data-screen="choice" aria-label="Escolha auditiva">
            <div class="game-scene game-scene-choice" style="--screen:url('${this.game.assets.screens.choice}')" aria-hidden="true"></div>
            <article class="audio-choice-panel">
              <button class="game-audio-button audio-repeat-button" type="button" data-game-action="play-audio" aria-label="Repetir som">🔊</button>
              <h2 data-audio-title>${this.currentRound().hint}</h2>
              <div class="audio-choice-cards" data-audio-choice-cards></div>
            </article>
          </section>
        `;
      }
      if (this.game.type === "pattern-recognition") {
        return `
          <section class="game-screen" data-screen="choice" aria-label="Escolha do padrao">
            <div class="game-scene game-scene-choice" style="--screen:url('${this.game.assets.screens.choice}')" aria-hidden="true"></div>
            <article class="pattern-panel">
              <h2 data-pattern-title>${this.currentRound().hint}</h2>
              <div class="pattern-sequence" data-pattern-sequence></div>
              <div class="pattern-choice-cards" data-pattern-choice-cards></div>
              <div class="pattern-path" data-pattern-path></div>
            </article>
          </section>
        `;
      }
      if (this.game.type === "story-builder") {
        return `
          <section class="game-screen" data-screen="choice" aria-label="Construcao da historia">
            <div class="game-scene game-scene-choice" data-story-screen style="--screen:url('${this.game.assets.steps.scenario}')" aria-hidden="true"></div>
            ${components.particles(18)}
            <article class="story-builder-panel" data-story-panel></article>
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
      if (this.game.type === "selection") {
        return `
          <section class="game-screen selection-screen selection-feedback-screen" data-screen="feedback" aria-label="Feedback positivo">
            <div class="game-scene selection-celebration-scene" style="--screen:url('${this.game.assets.components.celebration}')" aria-hidden="true"></div>
            ${components.confetti(48)}
            ${components.particles(24)}
            <article class="feedback-panel selection-feedback-panel">
              <img class="selection-feedback-medal" src="${this.game.assets.components.medal}" alt="" loading="eager" decoding="async" />
              <strong>Muito bem!</strong>
              <button class="game-primary-button" type="button" data-game-action="next-round">Proxima descoberta</button>
            </article>
          </section>
        `;
      }
      const feedbackScreen = this.game.type === "exploration-v2" && this.state.explorationLastFeedback === "other"
        ? this.game.assets.feedbackOther
        : this.game.assets.screens.feedback;
      if (this.game.id === "organizando-cesta") {
        return `
          <section class="game-screen basket-feedback-screen" data-screen="feedback" aria-label="Feedback positivo">
            <div class="game-scene game-scene-feedback" style="--screen:url('${feedbackScreen}')" aria-hidden="true"></div>
            ${components.confetti(40)}
            <img class="basket-feedback-turtle" src="${this.game.assets.characters.turtleCelebrating}" alt="" loading="eager" decoding="async" />
            <img class="basket-feedback-bia" src="${this.game.assets.characters.biaCelebrating}" alt="" loading="eager" decoding="async" />
            <article class="basket-speech-bubble">
              <strong>Muito bem!</strong>
              <span>A cesta ficou organizada!</span>
              <button class="game-primary-button" type="button" data-game-action="next-round">Continuar</button>
            </article>
          </section>
        `;
      }
      return `
        <section class="game-screen" data-screen="feedback" aria-label="Feedback positivo">
          <div class="game-scene game-scene-feedback" style="--screen:url('${feedbackScreen}')" aria-hidden="true"></div>
          ${components.confetti()}
          <article class="feedback-panel">
            <button class="game-primary-button" type="button" data-game-action="next-round">Continuar</button>
          </article>
        </section>
      `;
    }

    getVictoryOptions() {
      const componentsAssets = this.game.assets.components || {};
      const characterMap = this.game.assets.characters || {};
      const characterAsset = this.game.id === "organizando-cesta"
        ? characterMap.biaCelebrating || characterMap.bia || characterMap.anaCelebrating
        : componentsAssets.butterfly || characterMap.biaCelebrating || characterMap.bia || characterMap.ana;
      const effectAssets = componentsAssets.effects || this.game.assets.effects || {};
      return {
        character: this.game.character,
        characterAsset,
        characterName: this.game.character,
        medal: this.game.medal,
        medalAsset: componentsAssets.medal || this.game.assets.reward,
        xp: this.game.xp,
        animateXp: true,
        message: "VOCE FOI INCRIVEL!",
        continueHref: "jogos.html",
        restartAction: "restart",
        effects: {
          particles: effectAssets.particles,
          confetti: effectAssets.confetti,
          stars: effectAssets.stars,
        },
      };
    }

    renderFinalScreen() {
      return VictoryScreen.render(this.getVictoryOptions());
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
        const audioChoice = event.target.closest("[data-audio-choice-id]");
        const patternChoice = event.target.closest("[data-pattern-choice-id]");
        const explorationElement = event.target.closest("[data-exploration-element-id]");
        const storyOption = event.target.closest("[data-story-option]");
        const storyAccessory = event.target.closest("[data-story-accessory-id]");
        const storyAction = event.target.closest("[data-story-action-id]");
        const criteria = event.target.closest("[data-criteria-id]");
        const pathPoint = event.target.closest("[data-path-point-id]");
        const pathV2Reference = event.target.closest("[data-path-v2-reference-id]");
        const pathV2Phase = event.target.closest("[data-path-v2-phase-index]");
        const creativeElement = event.target.closest("[data-creative-element-id]");
        const canvasItem = event.target.closest("[data-canvas-item-id]");
        const removeCanvas = event.target.closest("[data-remove-canvas-id]");
        const timelineCard = event.target.closest("[data-timeline-card-id]");
        const timelineSlot = event.target.closest("[data-timeline-slot-id]");
        const journeyPortal = event.target.closest("[data-journey-portal-id]");
        const journeyObject = event.target.closest("[data-journey-object-id]");
        const journeyV2Mission = event.target.closest("[data-journey-v2-mission-id]");
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
        if (audioChoice) this.answerAudio(audioChoice.dataset.audioChoiceId, audioChoice);
        if (patternChoice) this.answerPattern(patternChoice.dataset.patternChoiceId, patternChoice);
        if (explorationElement) this.answerExplorationV2(explorationElement.dataset.explorationElementId, explorationElement);
        if (storyOption) this.selectStoryOption(storyOption.dataset.storyOption, storyOption.dataset.storyOptionId);
        if (storyAccessory) this.toggleStoryAccessory(storyAccessory.dataset.storyAccessoryId);
        if (storyAction) this.performStoryAction(storyAction.dataset.storyActionId);
        if (card) this.answer(card.dataset.choiceId, card);
        if (criteria) this.answerCriteria(criteria.dataset.criteriaId, criteria);
        if (pathPoint) this.advancePath(pathPoint.dataset.pathPointId, pathPoint);
        if (pathV2Reference) this.visitPathV2Reference(pathV2Reference.dataset.pathV2ReferenceId, pathV2Reference);
        if (pathV2Phase) this.setPathV2Phase(Number(pathV2Phase.dataset.pathV2PhaseIndex));
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
        if (journeyV2Mission) this.visitJourneyV2Mission(journeyV2Mission.dataset.journeyV2MissionId);
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
      this.clearMagicBoxFrameTimer();
      this.mysteryBoxMachine.reset();
      this.magicBox.reset();
      this.game = gameRepository.getGame(gameId);
      this.state = progressController.create(this.game);
      this.record = rewardController.latest(this.game.id);
      this.journeyV2Visited = new Set();
      this.journeyV2Completed = new Set();
      this.root.dataset.activeGame = this.game.id;
      document.documentElement.classList.add("game-immersive-active");
      document.body.classList.add("game-immersive-active");
      this.root.classList.add("game-immersive-active");
      this.root.style.setProperty("--game-atlas", `url("${this.game.assets.atlas}")`);
      this.root.style.setProperty("--library-atlas", `url("${this.game.assets.library}")`);
      this.root.innerHTML = this.render();
      this.updateRoundContent();
      this.go("intro");
    }

    openHub() {
      this.mode = "hub";
      this.clearMagicBoxFrameTimer();
      this.mysteryBoxMachine.reset();
      this.magicBox.reset();
      delete this.root.dataset.activeGame;
      document.documentElement.classList.remove("game-immersive-active");
      document.body.classList.remove("game-immersive-active");
      this.root.classList.remove("game-immersive-active");
      this.root.innerHTML = this.render();
    }

    handleAction(action, button) {
      if (action === "start") {
        audioPlayer.blip();
        this.updateRoundContent();
        this.go("room");
        if (this.game.id === "organizando-cesta") {
          window.setTimeout(() => {
            if (this.state.screen !== "room") return;
            this.updateRoundContent();
            audioPlayer.speak(this.currentRound().narration, null);
            this.go("choice");
          }, 1800);
        }
        if (this.game.type === "find") {
          audioPlayer.speak(this.currentRound().narration, null);
        }
        if (this.game.type === "journey-celebration") {
          audioPlayer.speak(this.currentRound().narration, null);
        }
        if (this.game.type === "journey-celebration-v2") {
          audioPlayer.speak(this.currentRound().narration, null);
        }
        if (this.game.type === "story-builder") {
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
      if (action === "begin-path-v2") {
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
      if (action === "journey-v2-map") {
        this.updateRoundContent();
        this.go("room");
      }
      if (action === "complete-journey-v2-mission") {
        this.completeJourneyV2Mission();
      }
      if (action === "open-journey-v2-capsule") {
        this.openJourneyV2Capsule();
      }
      if (action === "finish-journey-v2") {
        this.finishJourneyV2();
      }
      if (action === "play-audio") {
        this.playRoundSound(button);
      }
      if (action === "begin-audio-choice") {
        this.updateRoundContent();
        this.go("choice");
      }
      if (action === "begin-pattern") {
        this.updateRoundContent();
        audioPlayer.speak(this.currentRound().narration, null);
        this.go("choice");
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
      if (action === "story-next-accessories") {
        this.state = { ...this.state, storyStep: "accessories" };
        this.updateRoundContent();
      }
      if (action === "story-go-stage") {
        this.state = { ...this.state, storyStep: "stage" };
        this.updateRoundContent();
      }
      if (action === "finish-story") {
        this.finishStory();
      }
      if (action === "open-box") {
        this.startMysteryBoxOpening();
      }
      if (action === "choose") {
        this.updateRoundContent();
        this.go("choice");
      }
      if (action === "next-round") {
        if (this.game.type === "selection") {
          this.clearMagicBoxFrameTimer();
          this.mysteryBoxMachine.reset();
          this.magicBox.reset();
        }
        this.state = progressController.nextRound(this.game, this.state);
        if (this.state.screen === "final") {
          this.finish();
        } else {
          this.updateRoundContent();
          this.go("room");
        }
      }
      if (action === "restart") {
        this.clearMagicBoxFrameTimer();
        this.mysteryBoxMachine.reset();
        this.magicBox.reset();
        this.state = progressController.create(this.game);
        if (this.game.type === "selection") this.record = null;
        this.updateRoundContent();
        this.go("intro");
      }
    }

    startMysteryBoxOpening() {
      if (this.game.type !== "selection") {
        this.updateRoundContent();
        this.go("hint");
        return;
      }
      if (this.magicBox.locked || this.mysteryBoxMachine.locked) return;
      this.state = { ...this.state, discoveryPrompt: "" };
      this.magicBox.start();
    }

    syncMagicBoxState(boxState, locked = false) {
      if (this.game.type !== "selection") return;
      this.state = { ...this.state, magicBoxState: boxState };
      const box = this.root.querySelector("[data-magic-box-state]");
      if (box) {
        box.dataset.magicBoxState = boxState;
        box.disabled = locked || this.mysteryBoxMachine.locked;
        box.setAttribute("aria-busy", String(locked || this.mysteryBoxMachine.locked));
        this.syncMagicBoxMedia(box, boxState);
      }
    }

    syncMagicBoxMedia(box, boxState) {
      this.clearMagicBoxFrameTimer();
      box.querySelectorAll("[data-magic-box-animation-slot] video").forEach((video) => {
        const active = video.closest("[data-magic-box-animation-slot]")?.dataset.magicBoxAnimationSlot === boxState;
        if (active) {
          video.currentTime = 0;
          video.play?.().catch(() => {});
        } else {
          video.pause?.();
        }
      });
      const activeSlot = box.querySelector(`[data-magic-box-animation-slot="${boxState}"]`);
      const frames = [...(activeSlot?.querySelectorAll("[data-magic-box-frame]") || [])];
      frames.forEach((frame, index) => {
        frame.hidden = index !== 0;
      });
      if (frames.length > 1) {
        let frameIndex = 0;
        const frameMs = Math.max(40, Number(activeSlot.dataset.magicBoxFrameMs || 90));
        this.magicBoxFrameTimer = window.setInterval(() => {
          frameIndex = (frameIndex + 1) % frames.length;
          frames.forEach((frame, index) => {
            frame.hidden = index !== frameIndex;
          });
        }, frameMs);
      }
    }

    clearMagicBoxFrameTimer() {
      if (!this.magicBoxFrameTimer) return;
      window.clearInterval(this.magicBoxFrameTimer);
      this.magicBoxFrameTimer = null;
    }

    handleMagicBoxTouch() {
      audioPlayer.blip("success");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("raizes:magic-box-touch", { detail: { gameId: this.game.id } }));
      }
    }

    handleMagicBoxAnimationEnd() {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("raizes:magic-box-animation-end", { detail: { gameId: this.game.id } }));
      }
    }

    handleMagicBoxReveal() {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("raizes:magic-box-reveal", { detail: { gameId: this.game.id } }));
      }
      this.mysteryBoxMachine.start();
    }

    syncMysteryBoxState(boxState, locked = false) {
      if (this.game.type !== "selection") return;
      this.state = { ...this.state, mysteryBoxState: boxState };
      const box = this.root.querySelector("[data-box-state]");
      if (box) {
        box.dataset.boxState = boxState;
        box.disabled = locked || this.magicBox.locked;
        box.setAttribute("aria-busy", String(locked || this.magicBox.locked));
      }
      const prompt = this.root.querySelector("[data-discovery-prompt]");
      if (prompt) prompt.textContent = this.state.discoveryPrompt || (boxState === mysteryBoxStates.IDLE ? "Abra a caixa para fazer uma descoberta!" : "");
    }

    revealMysteryBoxHint() {
      if (this.game.type !== "selection" || this.state.screen !== "room") return;
      this.updateRoundContent();
      this.go("hint");
      audioPlayer.speak(this.currentRound().narration, this.root.querySelector("[data-game-speak]"), () => {
        if (this.game.type === "selection" && this.state.screen === "hint") {
          this.updateRoundContent();
          this.go("choice");
        }
      });
    }

    answer(choiceId, card) {
      const round = this.currentRound();
      this.state = { ...this.state, attempts: this.state.attempts + 1 };
      if (choiceId !== round.correctId) {
        card.classList.add("is-selected");
        audioPlayer.blip();
        audioPlayer.speak(round.narration, null);
        return;
      }
      card.classList.add("is-correct", "is-selected");
      audioPlayer.blip("success");
      window.setTimeout(() => this.go("feedback"), 520);
    }

    playRoundSound(button) {
      if (this.game.type !== "audio-recognition") return;
      const round = this.currentRound();
      const sound = this.game.soundLibrary?.[round.soundId];
      this.state = {
        ...this.state,
        audioPlayed: true,
        audioReplayCount: this.state.audioReplayCount + 1,
      };
      const status = this.root.querySelector("[data-audio-status]");
      if (status) status.textContent = "O som esta tocando. Pode repetir quando quiser.";
      audioPlayer.playConfigured(sound, button).then(() => {
        const currentStatus = this.root.querySelector("[data-audio-status]");
        if (currentStatus) currentStatus.textContent = "Pronto para repetir ou escolher.";
      });
    }

    answerAudio(choiceId, card) {
      if (this.game.type !== "audio-recognition") return;
      const round = this.currentRound();
      this.state = { ...this.state, attempts: this.state.attempts + 1 };
      if (choiceId !== round.correctId) {
        card.classList.add("is-try-again");
        const title = this.root.querySelector("[data-audio-title]");
        if (title) title.textContent = "Vamos ouvir novamente?";
        audioPlayer.blip("success");
        window.setTimeout(() => {
          card.classList.remove("is-try-again");
          if (title) title.textContent = round.hint;
        }, 900);
        this.playRoundSound(this.root.querySelector("[data-screen].is-active [data-game-action='play-audio']"));
        return;
      }
      card.classList.add("is-correct");
      audioPlayer.blip("success");
      window.setTimeout(() => this.go("feedback"), 560);
    }

    patternItem(round, itemId) {
      return this.game.patternLibrary?.[round.category?.toLowerCase()]?.find((item) => item.id === itemId)
        || Object.values(this.game.patternLibrary || {}).flat().find((item) => item.id === itemId)
        || null;
    }

    answerPattern(choiceId, card) {
      if (this.game.type !== "pattern-recognition") return;
      const round = this.currentRound();
      this.state = { ...this.state, attempts: this.state.attempts + 1, selectedPatternId: choiceId };
      if (choiceId !== round.correctId) {
        card.classList.add("is-selected");
        const title = this.root.querySelector("[data-pattern-title]");
        if (title) title.textContent = "Observe de novo e escolha com calma.";
        audioPlayer.blip("success");
        window.setTimeout(() => {
          card.classList.remove("is-selected");
          if (title) title.textContent = round.hint;
          this.state = { ...this.state, selectedPatternId: null };
          this.syncPattern();
        }, 760);
        return;
      }
      this.state = {
        ...this.state,
        patternAnswers: { ...this.state.patternAnswers, [round.id]: choiceId },
        selectedPatternId: choiceId,
      };
      card.classList.add("is-correct");
      audioPlayer.blip("success");
      this.syncPattern();
      window.setTimeout(() => this.go("feedback"), 700);
    }

    answerExplorationV2(elementId, elementNode) {
      if (this.game.type !== "exploration-v2") return;
      const round = this.currentRound();
      const correct = elementId === round.targetId;
      this.state = {
        ...this.state,
        attempts: this.state.attempts + 1,
        explorationCelebratingId: elementId,
        explorationLastFeedback: correct ? "correct" : "other",
      };
      elementNode?.classList.add(correct ? "is-found" : "is-celebrating");
      audioPlayer.blip("success");
      this.syncExplorationV2();
      if (!correct) {
        window.setTimeout(() => {
          this.state = { ...this.state, explorationCelebratingId: null };
          this.syncExplorationV2();
        }, 850);
        return;
      }
      this.state = {
        ...this.state,
        explorationFound: [...new Set([...this.state.explorationFound, elementId])],
        completedRounds: [...new Set([...this.state.completedRounds, round.id])],
      };
      this.syncExplorationV2();
      window.setTimeout(() => this.go("feedback"), 760);
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

    setPathV2Phase(phaseIndex) {
      if (this.game.type !== "path-follow-v2") return;
      const phases = this.currentRound().pathV2.phases;
      if (!phases[phaseIndex]) return;
      this.state = {
        ...this.state,
        pathV2PhaseIndex: phaseIndex,
        pathV2Visited: [],
        pathV2ActiveReference: null,
      };
      audioPlayer.blip("success");
      this.updateRoundContent();
    }

    visitPathV2Reference(referenceId, node) {
      if (this.game.type !== "path-follow-v2") return;
      const data = this.currentRound().pathV2;
      const phase = data.phases[this.state.pathV2PhaseIndex] || data.phases[0];
      const reference = data.references.find((entry) => entry.id === referenceId);
      if (!reference || !phase.requiredPoints.includes(referenceId)) {
        audioPlayer.blip();
        this.state = { ...this.state, pathV2ActiveReference: referenceId };
        this.updateRoundContent();
        return;
      }
      const visited = [...new Set([...this.state.pathV2Visited, referenceId])];
      const phaseComplete = phase.requiredPoints.every((id) => visited.includes(id));
      const completedPhases = phaseComplete
        ? [...new Set([...this.state.pathV2CompletedPhases, phase.id])]
        : this.state.pathV2CompletedPhases;
      this.state = {
        ...this.state,
        pathV2Visited: visited,
        pathV2CompletedPhases: completedPhases,
        pathV2ActiveReference: referenceId,
        attempts: this.state.attempts + 1,
      };
      node?.classList.add("is-visited");
      audioPlayer.blip("success");
      audioPlayer.speak(reference.speech, null);
      this.updateRoundContent();
      if (!phaseComplete) return;
      if (this.state.pathV2PhaseIndex >= data.phases.length - 1) {
        this.state = { ...this.state, completedRounds: [this.currentRound().id] };
        window.setTimeout(() => this.go("feedback"), 760);
        return;
      }
      const nextPhaseIndex = this.state.pathV2PhaseIndex + 1;
      window.setTimeout(() => {
        this.state = {
          ...this.state,
          pathV2PhaseIndex: nextPhaseIndex,
          pathV2Visited: [],
          pathV2ActiveReference: null,
        };
        this.updateRoundContent();
      }, 900);
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

    journeyV2Data() {
      return this.currentRound().celebrationV2;
    }

    visitJourneyV2Mission(missionId) {
      if (this.game.type !== "journey-celebration-v2") return;
      const mission = this.journeyV2Data().missions.find((entry) => entry.id === missionId);
      if (!mission) return;
      this.journeyV2Visited = new Set([...(this.state.journeyV2Visited || []), ...this.journeyV2Visited, missionId]);
      this.journeyV2Completed = new Set([...(this.state.journeyV2Completed || []), ...this.journeyV2Completed]);
      this.state = {
        ...this.state,
        journeyV2ActiveMission: missionId,
        journeyV2Visited: [...this.journeyV2Visited],
        journeyV2Completed: [...this.journeyV2Completed],
        attempts: this.state.attempts + 1,
      };
      audioPlayer.blip("success");
      audioPlayer.speak(`${mission.label}. ${mission.prompt}`, null);
      this.updateRoundContent();
      this.go("choice");
    }

    completeJourneyV2Mission() {
      if (this.game.type !== "journey-celebration-v2") return;
      const data = this.journeyV2Data();
      const missionId = this.state.journeyV2ActiveMission || data.missions[0]?.id;
      if (!missionId) return;
      this.journeyV2Visited = new Set([...(this.state.journeyV2Visited || []), ...this.journeyV2Visited, missionId]);
      this.journeyV2Completed = new Set([...(this.state.journeyV2Completed || []), ...this.journeyV2Completed, missionId]);
      const isFinalMission = missionId === data.missions[data.missions.length - 1]?.id;
      if (isFinalMission) {
        this.journeyV2Visited = new Set(data.missions.map((mission) => mission.id));
        this.journeyV2Completed = new Set(data.missions.map((mission) => mission.id));
      }
      const completed = [...this.journeyV2Completed];
      const visited = [...this.journeyV2Visited];
      this.state = {
        ...this.state,
        journeyV2Visited: visited,
        journeyV2Completed: completed,
        attempts: this.state.attempts + 1,
      };
      audioPlayer.blip("success");
      this.updateRoundContent();
      if (completed.length >= data.missions.length) {
        window.setTimeout(() => this.openJourneyV2Capsule(), 650);
      }
    }

    openJourneyV2Capsule() {
      if (this.game.type !== "journey-celebration-v2") return;
      const data = this.journeyV2Data();
      const capsule = {
        medal: this.game.medal,
        accumulatedXp: this.game.xp,
        completedGames: data.missions.length,
        completedVolume: "Volume 2 concluido",
        completedStage: "Educacao Infantil 2 anos concluida",
        unlockedCollection: data.nextCollection,
        createdAt: new Date().toISOString(),
      };
      this.state = {
        ...this.state,
        journeyV2Capsule: capsule,
        completedRounds: [this.currentRound().id],
      };
      audioPlayer.blip("success");
      this.updateRoundContent();
      this.go("choice");
    }

    finishJourneyV2() {
      if (this.game.type !== "journey-celebration-v2") return;
      const data = this.journeyV2Data();
      this.journeyV2Visited = new Set(data.missions.map((mission) => mission.id));
      this.journeyV2Completed = new Set(data.missions.map((mission) => mission.id));
      this.state = {
        ...this.state,
        journeyV2Visited: [...this.journeyV2Visited],
        journeyV2Completed: [...this.journeyV2Completed],
        completedRounds: [this.currentRound().id],
      };
      if (!this.state.journeyV2Capsule) {
        this.openJourneyV2Capsule();
      }
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

    storyData() {
      return this.currentRound().story;
    }

    selectStoryOption(kind, id) {
      if (this.game.type !== "story-builder") return;
      if (kind === "character") {
        this.state = { ...this.state, storyCharacter: id, storyStep: "scenario", attempts: this.state.attempts + 1 };
        audioPlayer.blip("success");
        this.go("choice");
      }
      if (kind === "scenario") {
        this.state = { ...this.state, storyScenario: id, storyStep: "accessories", attempts: this.state.attempts + 1 };
        audioPlayer.blip("success");
      }
      this.updateRoundContent();
    }

    toggleStoryAccessory(accessoryId) {
      if (this.game.type !== "story-builder") return;
      const current = this.state.storyAccessories;
      const exists = current.includes(accessoryId);
      const next = exists ? current.filter((id) => id !== accessoryId) : [...current, accessoryId].slice(0, 4);
      this.state = { ...this.state, storyAccessories: next, attempts: this.state.attempts + 1 };
      audioPlayer.blip(exists ? "effects" : "success");
      this.updateRoundContent();
    }

    performStoryAction(actionId) {
      if (this.game.type !== "story-builder") return;
      this.state = { ...this.state, storyAction: actionId, attempts: this.state.attempts + 1 };
      audioPlayer.blip("success");
      this.updateRoundContent();
    }

    saveStoryMemory() {
      const story = this.storyData();
      const character = story.characters.find((entry) => entry.id === this.state.storyCharacter) || story.characters[0];
      const scenario = story.scenarios.find((entry) => entry.id === this.state.storyScenario) || story.scenarios[0];
      const accessories = this.state.storyAccessories
        .map((id) => story.accessories.find((entry) => entry.id === id))
        .filter(Boolean);
      const memory = {
        id: `historia-${Date.now()}`,
        gameId: this.game.id,
        title: `${character.label} em ${scenario.label}`,
        character: character.id,
        characterLabel: character.label,
        scenario: scenario.id,
        scenarioLabel: scenario.label,
        accessories: accessories.map((entry) => entry.id),
        accessoryLabels: accessories.map((entry) => entry.label),
        action: this.state.storyAction,
        image: this.game.assets.screens.final,
        createdAt: new Date().toISOString(),
      };
      let album = [];
      try {
        album = JSON.parse(localStorage.getItem(storyAlbumKey) || "[]");
      } catch (error) {
        console.warn("Nao foi possivel ler o Album das Historias.", error);
      }
      localStorage.setItem(storyAlbumKey, JSON.stringify([memory, ...album].slice(0, 24)));
      return memory;
    }

    finishStory() {
      if (this.game.type !== "story-builder") return;
      const round = this.currentRound();
      const story = round.story;
      const character = this.state.storyCharacter || story.characters[0]?.id;
      const scenario = this.state.storyScenario || story.scenarios[0]?.id;
      this.state = {
        ...this.state,
        storyCharacter: character,
        storyScenario: scenario,
        storyStep: "stage",
        completedRounds: [round.id],
      };
      this.state = { ...this.state, storyMemory: this.saveStoryMemory() };
      this.updateRoundContent();
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
        const wrongDrop = this.root.querySelector(`[data-drop-id="${dropId}"]`);
        wrongDrop?.classList.add(this.game.id === "organizando-cesta" ? "is-guiding" : "is-wrong");
        if (this.game.id === "organizando-cesta") {
          audioPlayer.speak("Vamos observar mais uma vez.", null);
        }
        window.setTimeout(() => wrongDrop?.classList.remove("is-wrong", "is-guiding"), 620);
        return;
      }
      this.state = progressController.place(this.state, dragId, dropId);
      audioPlayer.blip("success");
      this.syncDragDrop();
      const filledDrop = this.root.querySelector(`[data-drop-id="${dropId}"]`);
      filledDrop?.classList.add("is-snapped");
      window.setTimeout(() => filledDrop?.classList.remove("is-snapped"), 900);
      const complete = round.items.every((entry) => this.state.placements[entry.id] === entry.targetId);
      if (complete) {
        this.state = { ...this.state, completedRounds: [round.id] };
        this.root.querySelector("[data-shape-house-board]")?.classList.add("is-complete");
        window.setTimeout(() => this.go("feedback"), 620);
      }
    }

    findNearestDropTarget(clientX, clientY) {
      const tolerance = this.game.id === "organizando-cesta" ? 132 : 82;
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
      if (this.game.type === "story-builder" && !this.state.storyMemory) {
        this.state = { ...this.state, storyMemory: this.saveStoryMemory() };
      }
      this.state = rewardController.complete(this.game, this.state);
      this.record = rewardController.persist(this.game, this.state);
      this.go("final");
      this.animateXp();
      this.root.querySelector("[data-game-xp]").textContent = `⭐ ${this.state.xp} XP`;
      this.root.querySelector("[data-game-medal]").textContent = `🏅 ${this.state.medal}`;
      this.root.querySelector("[data-final-medal]").textContent = this.state.medal;
      const storySummary = this.state.storyMemory
        ? `Album das Historias: ${this.state.storyMemory.title}. Acessorios: ${this.state.storyMemory.accessoryLabels.join(", ") || "sem acessorios"}.`
        : "";
      this.root.querySelector("[data-final-story]").textContent = storySummary;
    }

    go(screen) {
      this.state.screen = screen;
      this.root.querySelectorAll("[data-screen]").forEach((item) => {
        item.classList.toggle("is-active", item.dataset.screen === screen);
      });
      this.syncBackgroundVideos();
      this.syncReactiveCharactersForScreen(screen);
      this.syncRounds();
    }

    syncBackgroundVideos() {
      this.root.querySelectorAll("[data-background-video-layer]").forEach((layer) => {
        const video = layer.querySelector("video");
        if (!video) return;
        if (!video.dataset.backgroundVideoBound) {
          video.dataset.backgroundVideoBound = "true";
          video.addEventListener("error", () => {
            video.hidden = true;
          });
          video.addEventListener("canplay", () => {
            video.hidden = false;
          });
        }
        const active = layer.closest("[data-screen]")?.classList.contains("is-active");
        if (active) {
          video.play?.().catch(() => {});
        } else {
          video.pause?.();
        }
      });
    }

    syncReactiveCharactersForScreen(screen) {
      if (this.game.type !== "selection") return;
      const bia = this.characters?.bia;
      if (!bia) return;
      if (screen === "room") bia.setState(reactiveCharacterStates.INVITING);
      if (screen === "hint") bia.setState(reactiveCharacterStates.LOOKING);
      if (screen === "choice") bia.setState(reactiveCharacterStates.LOOKING);
      if (screen === "feedback" || screen === "final") bia.setState(reactiveCharacterStates.CELEBRATING);
      if (screen === "intro") bia.setState(reactiveCharacterStates.IDLE);
    }

    syncReactiveCharacterState(characterId, characterState) {
      const node = this.root.querySelector(`[data-character-id="${characterId}"]`);
      if (!node) return;
      node.dataset.characterState = characterState;
      node.querySelectorAll("[data-character-state-slot] video").forEach((video) => {
        const active = video.closest("[data-character-state-slot]")?.dataset.characterStateSlot === characterState;
        if (active) {
          video.currentTime = 0;
          video.play?.().catch(() => {});
        } else {
          video.pause?.();
        }
      });
      const activeSlot = node.querySelector(`[data-character-state-slot="${characterState}"]`);
      const frames = [...(activeSlot?.querySelectorAll("[data-character-frame]") || [])];
      frames.forEach((frame, index) => {
        frame.hidden = index !== 0;
      });
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
              <button class="drop-zone${placedItem ? " is-filled" : ""}" type="button" data-drop-id="${target.id}" aria-label="${target.label}">
                ${target.icon ? `<img class="drop-zone-icon" src="${target.icon}" alt="" loading="eager" decoding="async" />` : ""}
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
      if (this.game.type === "path-follow-v2") {
        const data = round.pathV2;
        const phase = data.phases[this.state.pathV2PhaseIndex] || data.phases[0];
        const preview = this.root.querySelector("[data-path-v2-preview]");
        const board = this.root.querySelector("[data-path-v2-board]");
        const phases = this.root.querySelector("[data-path-v2-phases]");
        const progress = this.root.querySelector("[data-path-v2-progress]");
        const label = this.root.querySelector("[data-path-v2-progress-label]");
        const feedback = this.root.querySelector("[data-path-v2-feedback]");
        const requiredReferences = data.references.filter((reference) => phase.requiredPoints.includes(reference.id));
        const percent = Math.round((this.state.pathV2Visited.length / phase.requiredPoints.length) * 100);
        if (preview) {
          preview.innerHTML = data.references.map((reference) => `
            <button class="path-v2-preview-card" type="button" data-path-v2-reference-id="${reference.id}" aria-label="${reference.label}">
              <img src="${reference.image}" alt="" loading="eager" decoding="async" />
              <span>${reference.label}</span>
            </button>
          `).join("");
        }
        if (progress) progress.style.width = `${percent}%`;
        if (label) label.textContent = `${percent}%`;
        if (feedback) {
          const active = data.references.find((reference) => reference.id === this.state.pathV2ActiveReference);
          feedback.textContent = active ? active.speech : phase.title;
        }
        if (phases) {
          phases.innerHTML = data.phases.map((item, index) => {
            const done = this.state.pathV2CompletedPhases.includes(item.id);
            const active = index === this.state.pathV2PhaseIndex;
            return `<button class="${active ? "is-active" : ""}${done ? " is-complete" : ""}" type="button" data-path-v2-phase-index="${index}" aria-label="Fase ${item.label}">${item.label}</button>`;
          }).join("");
        }
        if (board) {
          board.style.setProperty("--path-v2-phase", `url('${phase.image}')`);
          board.innerHTML = `
            <svg class="path-v2-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polyline points="${requiredReferences.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
            </svg>
            ${requiredReferences.map((reference, index) => {
              const visited = this.state.pathV2Visited.includes(reference.id);
              const active = this.state.pathV2ActiveReference === reference.id;
              const next = index === this.state.pathV2Visited.length;
              return `
                <button class="path-v2-reference${visited ? " is-visited" : ""}${active ? " is-active" : ""}${next ? " is-next" : ""}" type="button" data-path-v2-reference-id="${reference.id}" aria-label="${reference.label}" style="left:${reference.x}%; top:${reference.y}%;">
                  <img src="${reference.image}" alt="" loading="eager" decoding="async" />
                  <span>${reference.label}</span>
                </button>
              `;
            }).join("")}
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
      if (this.game.type === "story-builder") {
        const story = round.story;
        const panel = this.root.querySelector(".game-screen.is-active [data-story-panel]") || this.root.querySelector("[data-story-panel]");
        const screen = this.root.querySelector(".game-screen.is-active [data-story-screen]");
        const character = story.characters.find((entry) => entry.id === this.state.storyCharacter) || story.characters[0];
        const scenario = story.scenarios.find((entry) => entry.id === this.state.storyScenario) || story.scenarios[0];
        const selectedAccessories = this.state.storyAccessories
          .map((id) => story.accessories.find((entry) => entry.id === id))
          .filter(Boolean);
        if (screen) {
          const stepImage = this.state.storyStep === "accessories"
            ? this.game.assets.steps.accessories
            : this.state.storyStep === "stage"
              ? this.game.assets.steps.stage
              : this.game.assets.steps.scenario;
          screen.style.setProperty("--screen", `url('${stepImage}')`);
        }
        if (!panel) return;
        if (this.state.storyStep === "character") {
          panel.innerHTML = `
            <h2>${story.prompts.character}</h2>
            <div class="story-card-grid story-character-grid">
              ${story.characters.map((item) => `
                <button class="story-card${this.state.storyCharacter === item.id ? " is-selected" : ""}" type="button" data-story-option="character" data-story-option-id="${item.id}" aria-label="${item.label}">
                  <img src="${item.image}" alt="" loading="eager" decoding="async" />
                  <span>${item.label}</span>
                </button>
              `).join("")}
            </div>
          `;
          return;
        }
        if (this.state.storyStep === "scenario") {
          panel.innerHTML = `
            <h2>${story.prompts.scenario}</h2>
            <div class="story-card-grid story-scenario-grid">
              ${story.scenarios.map((item) => `
                <button class="story-card${this.state.storyScenario === item.id ? " is-selected" : ""}" type="button" data-story-option="scenario" data-story-option-id="${item.id}" aria-label="${item.label}">
                  <img src="${item.image}" alt="" loading="eager" decoding="async" />
                  <span>${item.label}</span>
                </button>
              `).join("")}
            </div>
          `;
          return;
        }
        if (this.state.storyStep === "accessories") {
          panel.innerHTML = `
            <h2>${story.prompts.accessories}</h2>
            <div class="story-card-grid story-accessory-grid">
              ${story.accessories.map((item) => `
                <button class="story-card story-accessory${this.state.storyAccessories.includes(item.id) ? " is-selected" : ""}" type="button" data-story-accessory-id="${item.id}" aria-label="${item.label}">
                  <img src="${item.image}" alt="" loading="eager" decoding="async" />
                  <span>${item.label}</span>
                </button>
              `).join("")}
            </div>
            <button class="game-primary-button story-stage-button" type="button" data-game-action="story-go-stage">Apresentar</button>
          `;
          return;
        }
        panel.innerHTML = `
          <h2>${story.prompts.stage}</h2>
          <div class="story-stage-layout">
            <div class="story-stage-scene" style="--story-scenario:url('${scenario.image}')">
              <div class="story-spotlight" aria-hidden="true"></div>
              <div class="story-performer is-${this.state.storyAction}" aria-live="polite">
                <img src="${character.image}" alt="" loading="eager" decoding="async" />
                <span>${character.label}</span>
              </div>
              <div class="story-accessory-row">
                ${selectedAccessories.map((item) => `<img src="${item.image}" alt="${item.label}" loading="eager" decoding="async" />`).join("")}
              </div>
              <div class="story-audience" aria-label="Plateia comemorando">
                <i></i><i></i><i></i><i></i><i></i>
              </div>
            </div>
            <div class="story-actions">
              ${story.actions.map((item) => `
                <button class="${this.state.storyAction === item.id ? "is-active" : ""}" type="button" data-story-action-id="${item.id}">${item.label}</button>
              `).join("")}
            </div>
            <aside class="story-album-preview">
              <strong>Album das Historias</strong>
              <span>${character.label} em ${scenario.label}</span>
              <small>${selectedAccessories.length ? selectedAccessories.map((item) => item.label).join(" · ") : "Sem acessorios"}</small>
            </aside>
          </div>
          <button class="game-primary-button story-finish-button" type="button" data-game-action="finish-story">Finalizar historia</button>
        `;
        return;
      }
      if (this.game.type === "exploration-v2") {
        const exploration = this.game.exploration;
        const elementsHost = this.root.querySelector("[data-exploration-v2-elements]");
        const hint = this.root.querySelector("[data-exploration-v2-hint]");
        const inlineFeedback = this.root.querySelector("[data-exploration-v2-feedback]");
        const tree = this.root.querySelector("[data-nature-tree]");
        const missions = this.root.querySelector("[data-nature-mission-list]");
        const progress = this.root.querySelector("[data-nature-progress]");
        const foundCount = this.state.completedRounds.length;
        const treeImages = [this.game.assets.tree.empty, this.game.assets.tree.leaves, this.game.assets.tree.flowers, this.game.assets.tree.almost, this.game.assets.tree.complete];
        const treeIndex = Math.min(treeImages.length - 1, Math.floor((foundCount / this.game.rounds.length) * (treeImages.length - 1)));
        if (hint) hint.textContent = round.hint;
        if (inlineFeedback) {
          inlineFeedback.textContent = this.state.explorationLastFeedback === "other"
            ? exploration.positiveOther
            : this.state.explorationLastFeedback === "correct"
              ? exploration.positiveCorrect
              : "";
        }
        if (elementsHost) {
          elementsHost.innerHTML = exploration.elements.map((element) => {
            const found = this.state.explorationFound.includes(element.id);
            const target = element.id === round.targetId;
            const celebrating = this.state.explorationCelebratingId === element.id;
            return `
              <button class="exploration-v2-element${target ? " is-highlighted" : ""}${found ? " is-found" : ""}${celebrating ? " is-celebrating" : ""}" type="button" data-exploration-element-id="${element.id}" aria-label="${element.label}" style="left:${element.x}%; top:${element.y}%;">
                <img src="${element.image}" alt="" loading="eager" decoding="async" />
                <span>${element.label}</span>
              </button>
            `;
          }).join("");
        }
        if (tree) {
          tree.innerHTML = `<img src="${treeImages[treeIndex]}" alt="" loading="eager" decoding="async" />`;
        }
        if (missions) {
          missions.innerHTML = this.game.rounds.map((mission, index) => {
            const element = exploration.elements.find((entry) => entry.id === mission.targetId);
            const done = this.state.completedRounds.includes(mission.id);
            const active = mission.id === round.id;
            return `
              <div class="nature-mission${done ? " is-done" : ""}${active ? " is-active" : ""}">
                ${element ? `<img src="${element.image}" alt="" loading="eager" decoding="async" />` : ""}
                <span>${index + 1}</span>
              </div>
            `;
          }).join("");
        }
        if (progress) progress.textContent = `${foundCount}/${this.game.rounds.length}`;
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
      if (this.game.type === "journey-celebration-v2") {
        const data = round.celebrationV2;
        const missions = data.missions;
        const total = Math.max(missions.length, 1);
        const completedCount = this.state.journeyV2Completed.length;
        const schoolIndex = Math.min(data.schoolStates.length - 1, Math.floor((completedCount / total) * (data.schoolStates.length - 1)));
        const treeIndex = Math.min(data.treeStates.length - 1, Math.floor((completedCount / total) * (data.treeStates.length - 1)));
        const schoolLabels = ["Inicial", "Pequena decoracao", "Escola colorida", "Festa quase pronta", "Grande festa"];
        const treeLabels = ["Inicio", "Folhas", "Flores", "Quase completa", "Totalmente florida"];
        const activeMission = missions.find((mission) => mission.id === this.state.journeyV2ActiveMission) || missions[0];
        const map = this.root.querySelector("[data-journey-v2-map]");
        const school = this.root.querySelector("[data-journey-v2-school]");
        const tree = this.root.querySelector("[data-journey-v2-tree]");
        const panel = this.root.querySelector("[data-journey-v2-mission-panel]");
        if (map) {
          map.innerHTML = missions.map((mission) => {
            const visited = this.state.journeyV2Visited.includes(mission.id);
            const complete = this.state.journeyV2Completed.includes(mission.id);
            const active = this.state.journeyV2ActiveMission === mission.id;
            return `
              <button class="journey-v2-portal${visited ? " is-visited" : ""}${complete ? " is-complete" : ""}${active ? " is-active" : ""}" type="button" data-journey-v2-mission-id="${mission.id}" aria-label="${mission.label}" style="--portal-x:${mission.x}%;--portal-y:${mission.y}%">
                <img src="${mission.image}" alt="" loading="eager" decoding="async" />
                <span>${mission.label}</span>
                <small>${complete ? "Concluido" : visited ? "Visitado" : "Disponivel"}</small>
              </button>
            `;
          }).join("");
        }
        if (school) {
          const schoolState = data.schoolStates[schoolIndex];
          const schoolImage = typeof schoolState === "string" ? schoolState : schoolState.image;
          const schoolLabel = typeof schoolState === "string" ? schoolLabels[schoolIndex] : schoolState.label;
          school.innerHTML = `
            <strong>Escola das Descobertas</strong>
            <img src="${schoolImage}" alt="" loading="eager" decoding="async" />
            <span>${schoolLabel}</span>
            <small>${completedCount}/${total} missoes</small>
          `;
        }
        if (tree) {
          const treeState = data.treeStates[treeIndex];
          const treeImage = typeof treeState === "string" ? treeState : treeState.image;
          const treeLabel = typeof treeState === "string" ? treeLabels[treeIndex] : treeState.label;
          tree.innerHTML = `
            <strong>Arvore das Descobertas</strong>
            <img src="${treeImage}" alt="" loading="eager" decoding="async" />
            <span>${treeLabel}</span>
            <small>${completedCount}/${total} memorias</small>
          `;
        }
        if (panel) {
          if (this.state.journeyV2Capsule) {
            const capsule = this.state.journeyV2Capsule;
            panel.innerHTML = `
              <div class="journey-v2-capsule">
                <p>${data.capsuleTitle}</p>
                <img src="${this.game.assets.reward}" alt="" loading="eager" decoding="async" />
                <h2>${capsule.medal}</h2>
                <div class="journey-v2-capsule-grid">
                  <span><b>${capsule.accumulatedXp} XP</b><small>XP acumulado</small></span>
                  <span><b>${capsule.completedGames}</b><small>Jogos concluidos</small></span>
                  <span><b>Volume 2</b><small>concluido</small></span>
                  <span><b>2 anos</b><small>Educacao Infantil concluida</small></span>
                </div>
                <button class="game-primary-button" type="button" data-game-action="finish-journey-v2">Continuar para Educacao Infantil - 3 anos</button>
              </div>
            `;
          } else {
            const complete = this.state.journeyV2Completed.includes(activeMission.id);
            panel.innerHTML = `
              <div class="journey-v2-mission-card">
                <div>
                  <small>${activeMission.mechanic}</small>
                  <h2>${activeMission.label}</h2>
                  <p>${activeMission.prompt}</p>
                </div>
                <img src="${activeMission.image}" alt="" loading="eager" decoding="async" />
                <div class="journey-v2-progress-stars" aria-label="${completedCount} de ${total} missoes concluidas">
                  ${missions.map((mission) => `<i class="${this.state.journeyV2Completed.includes(mission.id) ? "is-lit" : ""}">★</i>`).join("")}
                </div>
                <div class="journey-v2-decor" aria-hidden="true">
                  ${data.decorations.map((decor) => `<img src="${typeof decor === "string" ? decor : decor.image}" alt="" loading="lazy" decoding="async" />`).join("")}
                </div>
                <div class="journey-v2-actions">
                  <button class="game-secondary-button" type="button" data-game-action="journey-v2-map">Voltar ao mapa</button>
                  <button class="game-primary-button" type="button" data-game-action="complete-journey-v2-mission">${complete ? "Missao concluida" : "Concluir missao"}</button>
                </div>
              </div>
              <div class="journey-v2-mission-grid">
                ${missions.map((mission) => `
                  <span class="${this.state.journeyV2Completed.includes(mission.id) ? "is-complete" : this.state.journeyV2Visited.includes(mission.id) ? "is-visited" : ""}">
                    <img src="${mission.image}" alt="" loading="lazy" decoding="async" />
                    <b>${mission.label}</b>
                  </span>
                `).join("")}
              </div>
            `;
          }
        }
        return;
      }
      if (this.game.type === "audio-recognition") {
        const title = this.root.querySelector("[data-audio-title]");
        const cards = this.root.querySelector("[data-audio-choice-cards]");
        const status = this.root.querySelector("[data-audio-status]");
        if (title) title.textContent = round.hint;
        if (status) status.textContent = this.state.audioPlayed ? "Pronto para repetir ou escolher." : "Toque para ouvir quantas vezes quiser.";
        if (cards) {
          cards.innerHTML = round.choices.map((choice) => `
            <button class="audio-choice-card" type="button" data-audio-choice-id="${choice.id}" aria-label="${choice.label}">
              <img src="${choice.image}" alt="" loading="eager" decoding="async" />
              <span>${choice.label}</span>
            </button>
          `).join("");
        }
        return;
      }
      if (this.game.type === "pattern-recognition") {
        const title = this.root.querySelector("[data-pattern-title]");
        const sequence = this.root.querySelector("[data-pattern-sequence]");
        const cards = this.root.querySelector("[data-pattern-choice-cards]");
        const path = this.root.querySelector("[data-pattern-path]");
        const completedCount = this.game.rounds.filter((entry) => this.state.completedRounds.includes(entry.id) || this.state.patternAnswers[entry.id]).length;
        if (title) title.textContent = round.hint;
        if (sequence) {
          sequence.innerHTML = round.sequence.map((itemId, index) => {
            const answerId = itemId || this.state.patternAnswers[round.id] || null;
            const item = answerId ? this.patternItem(round, answerId) : null;
            return `
              <div class="pattern-sequence-slot${itemId ? "" : " is-missing"}${answerId && !itemId ? " is-filled" : ""}" aria-label="Item ${index + 1}">
                ${item ? `<img src="${item.image}" alt="" loading="eager" decoding="async" /><span>${item.label}</span>` : "<b>?</b>"}
              </div>
            `;
          }).join("");
        }
        if (cards) {
          cards.innerHTML = round.choices.map((choiceId) => {
            const item = this.patternItem(round, choiceId);
            if (!item) return "";
            const selected = this.state.selectedPatternId === choiceId;
            const correct = this.state.patternAnswers[round.id] === choiceId;
            return `
              <button class="pattern-choice-card${selected ? " is-selected" : ""}${correct ? " is-correct" : ""}" type="button" data-pattern-choice-id="${choiceId}" aria-label="${item.label}">
                <img src="${item.image}" alt="" loading="eager" decoding="async" />
                <span>${item.label}</span>
              </button>
            `;
          }).join("");
        }
        if (path) {
          const percent = Math.round((completedCount / this.game.rounds.length) * 100);
          const image = completedCount >= this.game.rounds.length ? this.game.assets.path.complete : completedCount > 0 ? this.game.assets.path.progress : this.game.assets.path.start;
          path.style.setProperty("--pattern-progress", `${percent}%`);
          path.innerHTML = `
            <img src="${image}" alt="" loading="eager" decoding="async" />
            <div class="pattern-progress-bar"><i style="width:${percent}%"></i></div>
            <span>${completedCount}/${this.game.rounds.length}</span>
          `;
        }
        return;
      }
      const hint = this.root.querySelector("[data-hint-text]");
      if (hint) hint.textContent = round.hint;
      const choiceHint = this.root.querySelector("[data-choice-hint]");
      if (choiceHint) choiceHint.textContent = round.hint;
      const discoveryPrompt = this.root.querySelector("[data-discovery-prompt]");
      if (discoveryPrompt) discoveryPrompt.textContent = this.state.discoveryPrompt || "Abra a caixa para fazer uma descoberta!";
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

    syncPattern() {
      this.updateRoundContent();
    }

    syncExplorationV2() {
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

  window.VictoryScreen = VictoryScreen;
  window.showVictory = showVictory;
  window.EncouragementScreen = EncouragementScreen;
  window.showEncouragement = showEncouragement;
  window.MagicBox = MagicBox;
  window.ReactiveCharacter = ReactiveCharacter;
  window.RaizesGameEngine = { GameEngine, gameRepository, progressController, rewardController, audioPlayer, experiencePlayerController, experienceProgressStore, interactiveActivityController, interactiveActivityProgressStore, VictoryScreen, showVictory, EncouragementScreen, showEncouragement, MagicBox, magicBoxStates, ReactiveCharacter, reactiveCharacterStates };
  window.RSGameEngine = {
    games: gameRepository.games,
    infantilExperiences: window.RaizesInfantilExperiences || null,
    experienceProgressStore,
    interactiveActivityProgressStore,
    engine: null,
    getExperienceAsset(code) {
      return this.infantilExperiences?.getExperienceAsset(code) || null;
    },
    getOfficialBook(bookId) {
      return this.infantilExperiences?.getOfficialBook?.(bookId) || null;
    },
    getExperiencesByBook(bookId) {
      return this.infantilExperiences?.getExperiencesByBook?.(bookId) || [];
    },
    getExperiencesByPage(bookId, page) {
      return this.infantilExperiences?.getExperiencesByPage?.(bookId, page) || [];
    },
    getBookUnits(bookId) {
      return this.infantilExperiences?.getBookUnits?.(bookId) || [];
    },
    getExperiencePublicUrl(code, baseUrl) {
      return this.infantilExperiences?.getExperiencePublicUrl?.(code, baseUrl) || "";
    },
    getExperienceQrPayload(code, baseUrl) {
      return this.infantilExperiences?.getExperienceQrPayload?.(code, baseUrl) || this.getExperiencePublicUrl(code, baseUrl);
    },
    getExperienceResources(code) {
      const experience = this.infantilExperiences?.getExperienceDefinition?.(code);
      const resources = experience?.resources?.length ? experience.resources : [{ type: "video", role: "opening", assetCode: experience?.openingAssetCode }];
      return resources.filter((resource) => resource.assetCode || resource.activityCode).map((resource) => ({
        ...resource,
        asset: this.getExperienceAsset(resource.assetCode),
        activity: resource.activityCode ? this.getInteractiveActivity(resource.activityCode) : null,
      }));
    },
    getInteractiveActivity(code) {
      return this.infantilExperiences?.getInteractiveActivityDefinition?.(code) || null;
    },
    getInteractiveActivitiesByExperience(experienceCode) {
      return this.infantilExperiences?.getInteractiveActivitiesByExperience?.(experienceCode) || [];
    },
    openInteractiveActivity(code) {
      return interactiveActivityController.open(code);
    },
    startInteractiveActivity(code) {
      return interactiveActivityController.start(code);
    },
    submitInteractiveAnswer(code, answer) {
      return interactiveActivityController.submit(code, answer);
    },
    restartInteractiveActivity(code) {
      return interactiveActivityController.restart(code);
    },
    completeInteractiveActivity(code) {
      return interactiveActivityController.complete(code);
    },
    closeInteractiveActivity() {
      return interactiveActivityController.close();
    },
    getInteractiveActivityState(code) {
      return interactiveActivityController.getState(code);
    },
    openExperience(code) {
      return experiencePlayerController.open(code);
    },
    closeExperience() {
      return experiencePlayerController.close();
    },
    startExperience(code) {
      return experiencePlayerController.start(code);
    },
    pauseExperience(code) {
      return experiencePlayerController.pause(code);
    },
    restartExperience(code) {
      return experiencePlayerController.restart(code);
    },
    completeExperience(code) {
      return experiencePlayerController.complete(code);
    },
    getExperienceProgress(code) {
      return experiencePlayerController.getProgress(code);
    },
    getUserExperienceProgress(userId, experienceCode) {
      return experienceProgressStore.getUserExperienceProgress(userId || experienceProgressStore.getUserId(), experienceCode);
    },
    saveUserExperienceProgress(userId, experienceCode, data) {
      return experienceProgressStore.saveUserExperienceProgress(userId || experienceProgressStore.getUserId(), experienceCode, data);
    },
    getUserExperienceHistory(userId) {
      return experienceProgressStore.getUserExperienceHistory(userId || experienceProgressStore.getUserId());
    },
    getUserFavorites(userId) {
      return experienceProgressStore.getUserFavorites(userId || experienceProgressStore.getUserId());
    },
    toggleExperienceFavorite(userId, experienceCode) {
      return experienceProgressStore.toggleExperienceFavorite(userId || experienceProgressStore.getUserId(), experienceCode);
    },
    getContinueWatching(userId) {
      return experienceProgressStore.getContinueWatching(userId || experienceProgressStore.getUserId());
    },
    getExperienceSummary(userId, experiences) {
      return experienceProgressStore.getSummary(userId || experienceProgressStore.getUserId(), experiences || Object.values(this.infantilExperiences?.experienceDefinitions || []));
    },
    openGame(gameId) {
      if (!this.engine) return;
      this.engine.openGame(gameId);
    },
  };

  const mountAll = () => {
    document.querySelectorAll("[data-game-engine]").forEach((root) => {
      const engine = new GameEngine(root, root.dataset.gameId || "caixa-misteriosa");
      if (!window.RSGameEngine.engine) window.RSGameEngine.engine = engine;
      engine.mount();
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountAll);
  } else {
    mountAll();
  }
})();
