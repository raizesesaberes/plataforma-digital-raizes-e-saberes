(() => {
  const root = document.querySelector("[data-premium-chapter]");
  if (!root) return;

  const rounds = [
    {
      hint: "É BEM MACIO",
      question: "QUAL SERA O OBJETO DA CAIXA?",
      correctId: "algodao",
      successTitle: "PARABENS, VOCE ACERTOU!",
      successImage: "assets/builds/caixa-misteriosa-premium-01/png/card_algodao_premium_crop.png",
      successAlt: "Algodao",
      choices: [
        ["bola", "BOLA", "assets/builds/caixa-misteriosa-premium-01/png/card_bola_premium_crop.png"],
        ["cubo", "CUBO", "assets/builds/caixa-misteriosa-premium-01/png/card_cubo_premium_crop.png"],
        ["algodao", "ALGODAO", "assets/builds/caixa-misteriosa-premium-01/png/card_algodao_premium_crop.png"],
      ],
    },
    {
      hint: "É LEVE E FLUTUA",
      question: "QUAL SERA O OBJETO DA CAIXA?",
      correctId: "pena",
      successTitle: "VOCE ACERTOU!",
      successImage: "assets/builds/caixa-misteriosa-premium-01/png/card_pena_premium_crop.png",
      successAlt: "Pena",
      choices: [
        ["flor", "FLOR", "assets/builds/caixa-misteriosa-premium-01/png/card_flor_premium_crop.png"],
        ["pena", "PENA", "assets/builds/caixa-misteriosa-premium-01/png/card_pena_premium_crop.png"],
        ["esponja", "ESPONJA", "assets/builds/caixa-misteriosa-premium-01/png/card_esponja_premium_crop.png"],
      ],
    },
    {
      hint: "BRILHA COMO UMA CONQUISTA",
      question: "QUAL SERA O OBJETO DA CAIXA?",
      correctId: "estrela",
      successTitle: "VOCE ACERTOU!",
      successImage: "assets/builds/caixa-misteriosa-premium-01/png/card_estrela_premium_crop.png",
      successAlt: "Estrela",
      choices: [
        ["estrela", "ESTRELA", "assets/builds/caixa-misteriosa-premium-01/png/card_estrela_premium_crop.png"],
        ["folha", "FOLHA", "assets/builds/caixa-misteriosa-premium-01/png/card_folha_premium_crop.png"],
        ["flor", "FLOR", "assets/builds/caixa-misteriosa-premium-01/png/card_flor_premium_crop.png"],
      ],
    },
  ];

  const qs = (selector) => root.querySelector(selector);
  const qsa = (selector) => Array.from(root.querySelectorAll(selector));
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const state = { roundIndex: 0, locked: true, openingReady: false, sceneBoxReady: false };
  const openingScenes = [
    "assets/builds/caixa-misteriosa-premium-01/videos/9k6XOiV-UlozZTSyeEDEX_video_0.mp4",
    "assets/builds/caixa-misteriosa-premium-01/videos/qUZnfWGxlAMfmh-TvB4YS_video_0.mp4",
  ];
  const postIntroScene = "assets/builds/caixa-misteriosa-premium-01/videos/wScAhtsi_Gxw8Wmmi1uH1_video_0.mp4";
  const discoveryScenes = [
    "assets/builds/caixa-misteriosa-premium-01/videos/BCo6YvvLU2PmMfND_b_4v_video_0.mp4",
    "assets/builds/caixa-misteriosa-premium-01/videos/bls5a3oOCNusVPiGJIfrO_video_0.mp4",
    "assets/builds/caixa-misteriosa-premium-01/videos/URhMToaei3JpQG1PD3oas_video_0.mp4",
  ];
  const correctCottonScenes = [
    "assets/builds/caixa-misteriosa-premium-01/videos/Hh-6tytYNKGPrmAK8EJ_g_video_0.mp4",
    "assets/builds/caixa-misteriosa-premium-01/videos/1jy891KtSNoTXHJMDoRci_video_0.mp4",
    "assets/builds/caixa-misteriosa-premium-01/videos/c9UROclf_gw-tw2PCeKzM_video_0.mp4",
  ];
  const finalVictoryScenes = [
    "assets/builds/caixa-misteriosa-premium-01/videos/Hh-6tytYNKGPrmAK8EJ_g_video_0.mp4",
    "assets/builds/caixa-misteriosa-premium-01/videos/c8lMyZ7f2_S1UDihV5kuc_video_0.mp4",
    "assets/builds/caixa-misteriosa-premium-01/videos/ByCgmsdpl5z7iWWTx13Bj_video_0.mp4",
  ];
  const scoreSceneVideo = "assets/builds/caixa-misteriosa-premium-01/videos/D_gYXzwTrkNrZ8icCmXPu_video_0.mp4";

  const refs = {
    openingLayer: qs("[data-opening-sequence]"),
    openingVideo: qs("[data-opening-video]"),
    sceneCommand: qs("[data-scene-command]"),
    sceneBoxButton: qs("[data-scene-box-touch]"),
    finalCommand: qs("[data-final-command]"),
    finalMedalButton: qs("[data-final-medal-touch]"),
    successStage: qs("[data-success-stage]"),
    successTitle: qs("[data-success-title]"),
    successCardImage: qs("[data-success-card-image]"),
    scoreStage: qs("[data-score-stage]"),
    scoreStars: qs("[data-score-stars]"),
    scoreXp: qs("[data-score-xp]"),
    scoreTime: qs("[data-score-time]"),
    logo: qs(".premium-logo"),
    startButton: qs("[data-premium-start]"),
    introLayer: qs("[data-premium-intro-layer]"),
    introVideo: qs("[data-premium-intro-video]"),
    box: qs("[data-premium-box]"),
    boxButton: qs("[data-box-touch]"),
    bia: qs("[data-premium-bia]"),
    balloon: qs("[data-premium-balloon]"),
    hintPanel: qs("[data-hint-panel]"),
    hintText: qs("[data-hint-text]"),
    hearHint: qs("[data-hear-hint]"),
    cardStage: qs("[data-card-stage]"),
    feedbackPanel: qs("[data-feedback-panel]"),
    feedbackMessage: qs("[data-feedback-message]"),
    feedbackActions: qs("[data-feedback-actions]"),
    victoryScreen: qs("[data-victory-screen]"),
    victoryVideo: qs("[data-victory-video]"),
    fxLayer: qs("[data-fx-layer]"),
  };

  const loopingVideos = qsa("[data-premium-loop]");
  const previewMode = new URLSearchParams(window.location.search).get("reset");
  if (previewMode === "cena-04-pontuacao") {
    state.locked = true;
    window.setTimeout(() => showScoreScene(), 0);
  } else {
    setMode("tela-01-abertura");
    playOpeningSequence();
  }

  function setMode(mode) {
    root.dataset.mode = mode;
  }

  function createFx(className, x, y) {
    const fx = document.createElement("span");
    fx.className = className;
    fx.style.left = `${x}px`;
    fx.style.top = `${y}px`;
    refs.fxLayer.appendChild(fx);
    window.setTimeout(() => fx.remove(), 900);
  }

  function playMagicTouch(event) {
    const x = event?.clientX ?? window.innerWidth / 2;
    const y = event?.clientY ?? window.innerHeight / 2;
    createFx("premium-magic-touch", x, y);
  }

  function playStarBurst(target) {
    const rect = target.getBoundingClientRect();
    createFx("premium-star-burst", rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  function playVideo(video, { loop = false, timeout = 900 } = {}) {
    if (!video) return sleep(timeout);
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        video.removeEventListener("ended", finish);
        video.removeEventListener("error", finish);
        resolve();
      };
      video.loop = loop;
      video.currentTime = 0;
      video.addEventListener("ended", finish);
      video.addEventListener("error", finish);
      video.play?.().catch(() => window.setTimeout(finish, timeout));
      window.setTimeout(finish, timeout);
    });
  }

  function setOpeningSource(src) {
    refs.openingVideo.src = src;
    refs.openingVideo.load();
  }

  function playOpeningClip(src, { fallback = 12000 } = {}) {
    const video = refs.openingVideo;
    if (!video) return sleep(fallback);
    setOpeningSource(src);
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        video.removeEventListener("ended", finish);
        video.removeEventListener("error", finish);
        resolve();
      };
      video.loop = false;
      video.addEventListener("ended", finish);
      video.addEventListener("error", finish);
      video.play?.().catch(() => window.setTimeout(finish, fallback));
      window.setTimeout(finish, fallback);
    });
  }

  async function holdOpeningFinalFrame(src) {
    const video = refs.openingVideo;
    if (!video) return;
    setOpeningSource(src);
    await new Promise((resolve) => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        resolve();
        return;
      }
      video.addEventListener("loadedmetadata", resolve, { once: true });
      video.addEventListener("error", resolve, { once: true });
      window.setTimeout(resolve, 1800);
    });
    const loopStart = Number.isFinite(video.duration) && video.duration > 2 ? video.duration - 2 : 0;
    const enforceLoop = () => {
      if (video.currentTime < loopStart) return;
      if (video.duration - video.currentTime <= 0.12) video.currentTime = loopStart;
    };
    video.currentTime = loopStart;
    video.loop = false;
    video.addEventListener("timeupdate", enforceLoop);
    video.play?.().catch(() => {});
    state.openingReady = true;
    state.locked = false;
    root.classList.add("is-opening-ready");
    refs.startButton?.classList.remove("is-hidden");
  }

  async function playOpeningSequence() {
    refs.startButton?.classList.add("is-hidden");
    refs.sceneCommand?.classList.remove("is-visible");
    refs.sceneBoxButton?.classList.remove("is-ready");
    refs.finalCommand?.classList.remove("is-visible");
    refs.finalMedalButton?.classList.remove("is-ready");
    refs.scoreStage?.classList.remove("is-visible", "is-counting", "is-complete");
    refs.successStage?.classList.remove("is-visible");
    loopingVideos.forEach((video) => video.pause?.());
    await playOpeningClip(openingScenes[0]);
    await playOpeningClip(openingScenes[1]);
    await holdOpeningFinalFrame(openingScenes[1]);
  }

  async function playPostIntroScene() {
    setMode("sequencia-02-pos-introducao");
    root.classList.remove("is-opening-ready");
    refs.startButton?.classList.add("is-hidden");
    refs.openingLayer?.classList.remove("is-hidden");
    refs.sceneCommand?.classList.remove("is-visible");
    refs.sceneBoxButton?.classList.remove("is-ready");
    refs.finalCommand?.classList.remove("is-visible");
    refs.finalMedalButton?.classList.remove("is-ready");
    refs.scoreStage?.classList.remove("is-visible", "is-counting", "is-complete");
    refs.successStage?.classList.remove("is-visible");
    state.sceneBoxReady = false;
    await playOpeningClip(postIntroScene);
    await holdPostIntroFrame(postIntroScene);
  }

  async function holdPostIntroFrame(src) {
    const video = refs.openingVideo;
    if (!video) return;
    setOpeningSource(src);
    await new Promise((resolve) => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        resolve();
        return;
      }
      video.addEventListener("loadedmetadata", resolve, { once: true });
      video.addEventListener("error", resolve, { once: true });
      window.setTimeout(resolve, 1800);
    });
    const loopStart = Number.isFinite(video.duration) && video.duration > 2 ? video.duration - 2 : 0;
    const enforceLoop = () => {
      if (root.dataset.mode !== "sequencia-02-pos-introducao") return;
      if (video.currentTime < loopStart) return;
      if (video.duration - video.currentTime <= 0.12) video.currentTime = loopStart;
    };
    video.currentTime = loopStart;
    video.loop = false;
    video.addEventListener("timeupdate", enforceLoop);
    video.play?.().catch(() => {});
    refs.sceneCommand?.classList.add("is-visible");
    refs.sceneBoxButton?.classList.add("is-ready");
    state.sceneBoxReady = true;
    state.locked = false;
  }

  async function playDiscoverySequence() {
    setMode("sequencia-03-descoberta");
    refs.sceneCommand?.classList.remove("is-visible");
    refs.sceneBoxButton?.classList.remove("is-ready");
    refs.finalCommand?.classList.remove("is-visible");
    refs.finalMedalButton?.classList.remove("is-ready");
    refs.scoreStage?.classList.remove("is-visible", "is-counting", "is-complete");
    refs.successStage?.classList.remove("is-visible");
    state.sceneBoxReady = false;
    await playOpeningClip(discoveryScenes[0]);
    await playOpeningClip(discoveryScenes[1]);
    await playOpeningClip(discoveryScenes[2]);
    await holdDiscoveryFinalFrame(discoveryScenes[2]);
  }

  async function holdDiscoveryFinalFrame(src) {
    const video = refs.openingVideo;
    if (!video) return;
    setOpeningSource(src);
    await new Promise((resolve) => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        resolve();
        return;
      }
      video.addEventListener("loadedmetadata", resolve, { once: true });
      video.addEventListener("error", resolve, { once: true });
      window.setTimeout(resolve, 1800);
    });
    const loopStart = Number.isFinite(video.duration) && video.duration > 2 ? video.duration - 2 : 0;
    const enforceLoop = () => {
      if (root.dataset.mode !== "sequencia-03-descoberta") return;
      if (video.currentTime < loopStart) return;
      if (video.duration - video.currentTime <= 0.12) video.currentTime = loopStart;
    };
    video.currentTime = loopStart;
    video.loop = false;
    video.addEventListener("timeupdate", enforceLoop);
    video.play?.().catch(() => {});
    showCards({ keepCurrentMode: true });
    state.locked = false;
  }

  async function playCorrectCottonSequence() {
    const round = rounds[state.roundIndex];
    setMode("sequencia-04-acerto-algodao");
    refs.cardStage.classList.remove("is-visible");
    refs.feedbackPanel.classList.remove("is-visible");
    refs.successStage?.classList.remove("is-visible");
    refs.finalCommand?.classList.remove("is-visible");
    refs.finalMedalButton?.classList.remove("is-ready");
    refs.scoreStage?.classList.remove("is-visible", "is-counting", "is-complete");
    if (refs.successTitle) refs.successTitle.textContent = round.successTitle || "VOCE ACERTOU!";
    if (refs.successCardImage) {
      refs.successCardImage.src = round.successImage;
      refs.successCardImage.alt = round.successAlt || "";
    }
    refs.openingLayer?.classList.remove("is-hidden");
    await playOpeningClip(correctCottonScenes[0]);
    await playOpeningClip(correctCottonScenes[1]);
    await playOpeningClip(correctCottonScenes[2]);
    await holdCorrectCottonFinalFrame(correctCottonScenes[2]);
  }

  async function holdCorrectCottonFinalFrame(src) {
    const video = refs.openingVideo;
    if (!video) return;
    setOpeningSource(src);
    await new Promise((resolve) => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        resolve();
        return;
      }
      video.addEventListener("loadedmetadata", resolve, { once: true });
      video.addEventListener("error", resolve, { once: true });
      window.setTimeout(resolve, 1800);
    });
    const loopStart = Number.isFinite(video.duration) && video.duration > 2 ? video.duration - 2 : 0;
    const enforceLoop = () => {
      if (root.dataset.mode !== "sequencia-04-acerto-algodao") return;
      if (video.currentTime < loopStart) return;
      if (video.duration - video.currentTime <= 0.12) video.currentTime = loopStart;
    };
    video.currentTime = loopStart;
    video.loop = false;
    video.addEventListener("timeupdate", enforceLoop);
    video.play?.().catch(() => {});
    refs.successStage?.classList.add("is-visible");
  }

  async function playFinalVictorySequence() {
    setMode("sequencia-final-vitoria");
    hideRoundUi();
    setBalloon("", false);
    refs.successStage?.classList.remove("is-visible");
    refs.sceneCommand?.classList.remove("is-visible");
    refs.sceneBoxButton?.classList.remove("is-ready");
    refs.finalCommand?.classList.remove("is-visible");
    refs.finalMedalButton?.classList.remove("is-ready");
    refs.scoreStage?.classList.remove("is-visible", "is-counting", "is-complete");
    refs.openingLayer?.classList.remove("is-hidden");
    await playOpeningClip(finalVictoryScenes[0]);
    await playOpeningClip(finalVictoryScenes[1]);
    await playOpeningClip(finalVictoryScenes[2]);
    await holdFinalVictoryFrame(finalVictoryScenes[2]);
  }

  async function holdFinalVictoryFrame(src) {
    const video = refs.openingVideo;
    if (!video) return;
    setOpeningSource(src);
    await new Promise((resolve) => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        resolve();
        return;
      }
      video.addEventListener("loadedmetadata", resolve, { once: true });
      video.addEventListener("error", resolve, { once: true });
      window.setTimeout(resolve, 1800);
    });
    const loopStart = Number.isFinite(video.duration) && video.duration > 2 ? video.duration - 2 : 0;
    const enforceLoop = () => {
      if (root.dataset.mode !== "sequencia-final-vitoria") return;
      if (video.currentTime < loopStart) return;
      if (video.duration - video.currentTime <= 0.12) video.currentTime = loopStart;
    };
    video.currentTime = loopStart;
    video.loop = false;
    video.addEventListener("timeupdate", enforceLoop);
    video.play?.().catch(() => {});
    refs.finalCommand?.classList.add("is-visible");
    refs.finalMedalButton?.classList.add("is-ready");
    state.locked = false;
  }

  function switchBoxVideo(name) {
    qsa("[data-box-video]").forEach((video) => {
      const active = video.dataset.boxVideo === name;
      video.classList.toggle("is-active", active);
      if (!active) video.pause?.();
    });
    const activeVideo = qs(`[data-box-video="${name}"]`);
    activeVideo?.play?.().catch(() => {});
    return activeVideo;
  }

  function switchBiaVideo(name, options = {}) {
    qsa("[data-bia-video]").forEach((video) => {
      const active = video.dataset.biaVideo === name;
      video.classList.toggle("is-active", active);
      if (!active) video.pause?.();
    });
    const activeVideo = qs(`[data-bia-video="${name}"]`);
    activeVideo?.play?.().catch(() => {});
    if (!options.once) return activeVideo;
    return playVideo(activeVideo, { timeout: options.timeout || 1200 });
  }

  function setBalloon(text, visible = true) {
    refs.balloon.textContent = text;
    refs.balloon.classList.toggle("is-visible", visible);
  }

  function hideRoundUi() {
    refs.hintPanel.classList.remove("is-visible");
    refs.cardStage.classList.remove("is-visible");
    refs.feedbackPanel.classList.remove("is-visible");
    refs.feedbackActions.innerHTML = "";
    refs.cardStage.innerHTML = "";
  }

  async function enterBoxScene() {
    setMode("sequencia-02-pos-introducao");
    refs.introLayer.classList.remove("is-active");
    refs.introVideo.pause?.();
    loopingVideos.forEach((video) => video.play?.().catch(() => {}));
    await sleep(700);
    root.classList.add("is-box-ready");
    await sleep(700);
    refs.box.classList.add("is-ready");
    switchBoxVideo("idle");
    await sleep(1000);
    refs.bia.classList.add("is-ready");
    switchBiaVideo("idle");
    await sleep(1000);
    await switchBiaVideo("speaking", { once: true, timeout: 1200 });
    setBalloon("TOQUE NA CAIXA PARA FAZER UMA DESCOBERTA!");
    await sleep(1000);
    refs.box.classList.add("is-clickable");
    state.locked = false;
  }

  async function playIntroAfterStart(event) {
    if (state.locked || !state.openingReady) return;
    state.locked = true;
    setMode("sequencia-02-pos-introducao");
    playMagicTouch(event);
    refs.startButton.classList.add("is-hidden");
    await playPostIntroScene();
  }

  async function handleSceneBoxTouch(event) {
    if (state.locked || !state.sceneBoxReady) return;
    playMagicTouch(event);
    state.locked = true;
    state.sceneBoxReady = false;
    refs.sceneBoxButton?.classList.remove("is-ready");
    refs.sceneCommand?.classList.remove("is-visible");
    await playDiscoverySequence();
  }

  async function playBoxOpening(event) {
    if (state.locked || !refs.box.classList.contains("is-clickable")) return;
    state.locked = true;
    refs.box.classList.remove("is-clickable");
    setBalloon("", false);
    hideRoundUi();
    playMagicTouch(event);
    setMode("tela-04-toque-caixa");
    await playVideo(switchBoxVideo("touch"), { timeout: 900 });
    setMode("tela-05-reacao-caixa-01");
    await playVideo(switchBoxVideo("shake"), { timeout: 1100 });
    setMode("tela-06-reacao-caixa-02");
    await playVideo(switchBoxVideo("glow"), { timeout: 1200 });
    setMode("tela-07-abertura-caixa");
    await playVideo(switchBoxVideo("opening"), { timeout: 1500 });
    setMode("tela-08-explicacao-bia");
    await switchBiaVideo("talking", { once: true, timeout: 1100 });
    setBalloon("VAMOS DESCOBRIR O QUE E ISSO? OUCA A DICA!");
    showHintPanel();
    await sleep(1000);
    showCards();
    state.locked = false;
  }

  function showHintPanel() {
    const round = rounds[state.roundIndex];
    refs.hintText.textContent = round.hint;
    refs.hintPanel.classList.add("is-visible");
  }

  function showCards(options = {}) {
    const round = rounds[state.roundIndex];
    if (!options.keepCurrentMode) setMode("tela-09-opcoes-resposta");
    refs.hintPanel.classList.remove("is-visible");
    setBalloon("", false);
    refs.cardStage.innerHTML = `
      <h2 class="premium-question">
        <span>${round.hint}</span>
        <small>${round.question}</small>
      </h2>
      <div class="premium-card-grid">
        ${round.choices.map(([id, label, src]) => `
      <button class="premium-card" type="button" data-card-id="${id}" aria-label="${label}">
        <img src="${src}" alt="${label}" />
        <span>${label}</span>
      </button>
        `).join("")}
      </div>
    `;
    refs.cardStage.classList.add("is-visible");
  }

  function showFeedback(message, actions) {
    refs.feedbackMessage.textContent = message;
    refs.feedbackActions.innerHTML = actions.map((action) => {
      const attr = action.kind === "next" ? "data-next-round" : action.kind === "retry" ? "data-retry-round" : "data-hear-hint";
      return `<button class="premium-action-button" type="button" ${attr}>${action.label}</button>`;
    }).join("");
    refs.feedbackPanel.classList.add("is-visible");
  }

  async function handleChoice(card) {
    if (state.locked) return;
    state.locked = true;
    const id = card.dataset.cardId;
    const round = rounds[state.roundIndex];
    playMagicTouch();
    card.classList.add("is-selected");

    if (id === round.correctId) {
      playStarBurst(card);
      await playCorrectCottonSequence();
      state.locked = false;
      return;
    }

    setMode("tela-10b-resposta-incorreta");
    card.classList.add("is-retry");
    await sleep(520);
    card.classList.remove("is-selected", "is-retry");
    await switchBiaVideo("encouraging", { once: true, timeout: 1200 });
    showFeedback("VAMOS DESCOBRIR JUNTOS?", [
      { kind: "hint", label: "OUVIR DICA" },
      { kind: "retry", label: "TENTAR NOVAMENTE" },
    ]);
    state.locked = false;
  }

  async function nextRound() {
    if (state.locked) return;
    state.locked = true;
    refs.feedbackPanel.classList.remove("is-visible");
    refs.hintPanel.classList.remove("is-visible");
    refs.cardStage.classList.remove("is-visible");
    refs.successStage?.classList.remove("is-visible");
    refs.finalCommand?.classList.remove("is-visible");
    refs.finalMedalButton?.classList.remove("is-ready");
    refs.scoreStage?.classList.remove("is-visible", "is-counting", "is-complete");
    state.roundIndex += 1;
    if (state.roundIndex >= rounds.length) {
      await playFinalVictorySequence();
      return;
    }
    refs.openingLayer?.classList.remove("is-hidden");
    await playPostIntroScene();
  }

  function retryRound() {
    setMode("tela-09-opcoes-resposta");
    refs.feedbackPanel.classList.remove("is-visible");
    refs.cardStage.querySelectorAll(".premium-card").forEach((card) => card.classList.remove("is-selected", "is-retry"));
  }

  async function showVictory() {
    setMode("tela-11-vitoria");
    hideRoundUi();
    setBalloon("", false);
    refs.victoryScreen.classList.add("is-visible");
    await playVideo(refs.victoryVideo, { timeout: 1800 });
    await switchBiaVideo("celebrating", { once: true, timeout: 1300 });
    refs.victoryScreen.classList.add("is-complete");
    state.locked = false;
  }

  function restart() {
    window.location.reload();
  }

  function formatElapsed(seconds) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
    const rest = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${rest}`;
  }

  function emitScoreStar() {
    if (!refs.scoreStars) return;
    const star = document.createElement("span");
    star.className = "premium-score-star";
    star.style.left = `${48 + Math.random() * 33}%`;
    star.style.top = `${39 + Math.random() * 26}%`;
    star.style.animationDelay = `${Math.random() * 120}ms`;
    refs.scoreStars.appendChild(star);
    window.setTimeout(() => star.remove(), 950);
  }

  function animateScoreCounter() {
    refs.scoreXp.textContent = "+0";
    refs.scoreTime.textContent = "00:00";
    refs.scoreStars.innerHTML = "";
    const duration = 2200;
    const targetXp = 120;
    const targetSeconds = 105;
    let lastStar = 0;

    return new Promise((resolve) => {
      const startedAt = performance.now();
      const frame = (now) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        refs.scoreXp.textContent = `+${Math.round(targetXp * eased)}`;
        refs.scoreTime.textContent = formatElapsed(targetSeconds * eased);

        if (now - lastStar > 115 && progress < 1) {
          emitScoreStar();
          lastStar = now;
        }

        if (progress < 1) {
          requestAnimationFrame(frame);
          return;
        }

        refs.scoreXp.textContent = "+120";
        refs.scoreTime.textContent = "01:45";
        resolve();
      };
      requestAnimationFrame(frame);
    });
  }

  async function showScoreScene() {
    setMode("sequencia-final-score");
    refs.openingLayer?.classList.remove("is-hidden");
    refs.finalCommand?.classList.remove("is-visible");
    refs.finalMedalButton?.classList.remove("is-ready");
    refs.successStage?.classList.remove("is-visible");
    hideRoundUi();
    setOpeningSource(scoreSceneVideo);
    refs.openingVideo.loop = true;
    refs.openingVideo.play?.().catch(() => {});
    refs.scoreStage?.classList.add("is-visible", "is-counting");
    await sleep(260);
    await animateScoreCounter();
    refs.scoreStage?.classList.remove("is-counting");
    refs.scoreStage?.classList.add("is-complete");
    state.locked = false;
  }

  async function handleFinalMedalTouch(event) {
    if (state.locked || root.dataset.mode !== "sequencia-final-vitoria") return;
    playMagicTouch(event);
    state.locked = true;
    refs.finalCommand?.classList.remove("is-visible");
    refs.finalMedalButton?.classList.remove("is-ready");
    await showScoreScene();
  }

  refs.startButton?.addEventListener("click", playIntroAfterStart);
  refs.sceneBoxButton?.addEventListener("click", handleSceneBoxTouch);
  refs.finalMedalButton?.addEventListener("click", handleFinalMedalTouch);
  refs.boxButton?.addEventListener("click", playBoxOpening);
  refs.cardStage?.addEventListener("click", (event) => {
    const card = event.target.closest("[data-card-id]");
    if (card) handleChoice(card);
  });
  root.addEventListener("click", (event) => {
    if (event.target.closest("[data-hear-hint]")) {
      switchBiaVideo("speaking", { once: true, timeout: 1100 });
      showHintPanel();
    }
    if (event.target.closest("[data-retry-round]")) retryRound();
    if (event.target.closest("[data-next-round]")) nextRound();
    if (event.target.closest("[data-restart]")) restart();
    if (event.target.closest("[data-score-restart]")) restart();
    if (event.target.closest("[data-score-home]")) window.location.href = "index.html";
  });

  window.setTimeout(() => {
    switchBiaVideo("idle");
  }, 1500);

  window.setTimeout(() => {
    if (root.dataset.mode !== "tela-01-inicial") return;
    switchBiaVideo("speaking", { once: true, timeout: 1000 });
    setBalloon("VAMOS BRINCAR DE DESCOBRIR?");
  }, 4000);
})();
