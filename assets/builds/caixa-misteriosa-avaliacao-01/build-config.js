(() => {
  const base = "assets/builds/caixa-misteriosa-avaliacao-01/videos";

  window.RaizesGameConfig = {
    buildName: "CAIXA MISTERIOSA - BUILD DE AVALIACAO 01",
    games: {
      "caixa-misteriosa": {
        cinematicIntro: {
          enabled: true,
          version: "avaliacao-01",
          src: `${base}/intro.mp4`,
          poster: "assets/games/caixa-misteriosa/screens/screen-intro.png",
          fallback: "assets/games/caixa-misteriosa/screens/screen-intro.png",
          title: "A Caixa Misteriosa",
          skipLabel: "Pular introducao",
        },
        backgroundVideo: {
          room: {
            version: "avaliacao-01-room",
            src: `${base}/room-ambience.mp4`,
            poster: "assets/games/caixa-misteriosa/components/sala-descobertas-bg.png",
            fallback: "assets/games/caixa-misteriosa/components/sala-descobertas-bg.png",
          },
        },
        magicBox: {
          version: "avaliacao-01",
          animations: {
            idle: { type: "video", src: `${base}/box-idle.mp4` },
            breathing: { type: "video", src: `${base}/box-breathing.mp4` },
            touch: { type: "video", src: `${base}/box-touch.mp4` },
            shake: { type: "video", src: `${base}/box-shake.mp4` },
            glow: { type: "video", src: `${base}/box-glow.mp4` },
            anticipation: { type: "video", src: `${base}/box-anticipation.mp4` },
          },
        },
        magicGlowLayer: {
          enabled: true,
          active: true,
          src: `${base}/magic-glow.mp4`,
          transparent: true,
          removableBackground: true,
          intensity: 0.72,
          speed: 1,
          blendMode: "screen",
          activeStates: ["glow", "anticipation"],
        },
        reactiveCharacters: {
          bia: {
            name: "Borboleta Bia",
            version: "avaliacao-01",
            states: {
              idle: { type: "video", src: `${base}/bia-idle.mp4` },
              looking: { type: "video", src: `${base}/bia-looking.mp4` },
              pointing: { type: "video", src: `${base}/bia-pointing.mp4` },
              celebrating: { type: "video", src: `${base}/bia-celebrating.mp4` },
              talking: { type: "video", src: `${base}/bia-talking.mp4` },
            },
          },
        },
        victory: {
          message: "VOCE E UM PEQUENO EXPLORADOR!",
          continueHref: "caixa-misteriosa-build-01.html",
          continueLabel: "CONTINUAR",
          backHref: "index.html",
          backLabel: "VOLTAR AO SITE",
          characterAsset: {
            src: "assets/games/caixa-misteriosa/components/borboleta-bia-clean.png",
            alt: "Borboleta Bia",
          },
          medalAsset: {
            src: "assets/games/caixa-misteriosa/components/medal-pequeno-explorador-clean.png",
            alt: "Medalha Pequeno Explorador",
          },
          backgroundFx: {
            src: "assets/game-engine-2/assets/caixa-misteriosa/effects/confetti.png",
            alt: "Confetes",
          },
          victoryAnimation: {
            type: "video",
            src: `${base}/victory-animation.mp4`,
            loop: true,
          },
        },
        magicTouchFX: {
          enabled: true,
        },
        transitionFX: {
          enabled: false,
        },
      },
    },
    evaluationManifest: {
      name: "CAIXA MISTERIOSA - BUILD DE AVALIACAO 01",
      videos: [
        "intro.mp4",
        "room-ambience.mp4",
        "box-idle.mp4",
        "box-breathing.mp4",
        "box-touch.mp4",
        "box-shake.mp4",
        "box-glow.mp4",
        "box-anticipation.mp4",
        "magic-glow.mp4",
        "bia-idle.mp4",
        "bia-looking.mp4",
        "bia-pointing.mp4",
        "bia-celebrating.mp4",
        "bia-talking.mp4",
        "victory-animation.mp4",
      ],
      assets: [
        "assets/jogos/ei2/caixa-misteriosa/references/card-pena.png",
        "assets/jogos/ei2/caixa-misteriosa/references/card-algodao.png",
        "assets/jogos/ei2/caixa-misteriosa/references/card-esponja.png",
        "assets/jogos/ei2/caixa-misteriosa/references/card-flor.png",
        "assets/jogos/ei2/caixa-misteriosa/references/card-estrela.png",
        "assets/jogos/ei2/caixa-misteriosa/references/card-folha.png",
        "assets/jogos/ei2/caixa-misteriosa/references/card-bola.png",
        "assets/jogos/ei2/caixa-misteriosa/references/card-cubo.png",
        "assets/games/caixa-misteriosa/components/sala-descobertas-bg.png",
        "assets/games/caixa-misteriosa/components/borboleta-bia-clean.png",
        "assets/games/caixa-misteriosa/components/medal-pequeno-explorador-clean.png",
        "assets/game-engine-2/assets/caixa-misteriosa/reveal-fx/reveal-fx.png",
        "assets/game-engine-2/assets/caixa-misteriosa/effects/confetti.png",
        "assets/game-engine-2/assets/caixa-misteriosa/effects/stars.png",
      ],
    },
  };

  try {
    localStorage.removeItem("raizes:cinematic-intro-seen:v1:caixa-misteriosa:avaliacao-01");
  } catch (error) {}
})();
