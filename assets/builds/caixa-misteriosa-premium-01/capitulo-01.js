(() => {
  const root = document.querySelector("[data-premium-chapter]");
  if (!root) return;

  const rounds = [
    {
      hint: "E bem macio.",
      correctId: "algodao",
      choices: [
        ["pena", "PENA", "assets/jogos/ei2/caixa-misteriosa/references/card-pena.png"],
        ["algodao", "ALGODAO", "assets/jogos/ei2/caixa-misteriosa/references/card-algodao.png"],
        ["esponja", "ESPONJA", "assets/jogos/ei2/caixa-misteriosa/references/card-esponja.png"],
      ],
    },
    {
      hint: "E leve e flutua.",
      correctId: "pena",
      choices: [
        ["bola", "BOLA", "assets/jogos/ei2/caixa-misteriosa/references/card-bola.png"],
        ["pena", "PENA", "assets/jogos/ei2/caixa-misteriosa/references/card-pena.png"],
        ["cubo", "CUBO", "assets/jogos/ei2/caixa-misteriosa/references/card-cubo.png"],
      ],
    },
    {
      hint: "Brilha como uma conquista.",
      correctId: "estrela",
      choices: [
        ["flor", "FLOR", "assets/jogos/ei2/caixa-misteriosa/references/card-flor.png"],
        ["estrela", "ESTRELA", "assets/jogos/ei2/caixa-misteriosa/references/card-estrela.png"],
        ["folha", "FOLHA", "assets/jogos/ei2/caixa-misteriosa/references/card-folha.png"],
      ],
    },
  ];

  const qs = (selector) => root.querySelector(selector);
  const qsa = (selector) => Array.from(root.querySelectorAll(selector));
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const state = { roundIndex: 0, locked: false };

  const refs = {
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
  loopingVideos.forEach((video) => video.play?.().catch(() => {}));

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
    setMode("chapter-02-box-scene");
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
    if (state.locked) return;
    state.locked = true;
    playMagicTouch(event);
    refs.startButton.classList.add("is-hidden");
    refs.logo.classList.add("is-exiting");
    await sleep(500);
    refs.introLayer.classList.add("is-active");
    loopingVideos.forEach((video) => video.pause?.());
    await playVideo(refs.introVideo, { timeout: 5000 });
    await sleep(300);
    await enterBoxScene();
  }

  async function playBoxOpening(event) {
    if (state.locked || !refs.box.classList.contains("is-clickable")) return;
    state.locked = true;
    refs.box.classList.remove("is-clickable");
    setBalloon("", false);
    hideRoundUi();
    playMagicTouch(event);
    await playVideo(switchBoxVideo("touch"), { timeout: 900 });
    await playVideo(switchBoxVideo("shake"), { timeout: 1100 });
    await playVideo(switchBoxVideo("glow"), { timeout: 1200 });
    await playVideo(switchBoxVideo("opening"), { timeout: 1500 });
    await switchBiaVideo("talking", { once: true, timeout: 1100 });
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

  function showCards() {
    const round = rounds[state.roundIndex];
    refs.cardStage.innerHTML = round.choices.map(([id, label, src]) => `
      <button class="premium-card" type="button" data-card-id="${id}" aria-label="${label}">
        <img src="${src}" alt="${label}" />
      </button>
    `).join("");
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
      await switchBiaVideo("celebrating", { once: true, timeout: 1300 });
      showFeedback("MUITO BEM!", [{ kind: "next", label: "PROXIMA DESCOBERTA" }]);
      state.locked = false;
      return;
    }

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
    state.roundIndex += 1;
    if (state.roundIndex >= rounds.length) {
      await showVictory();
      return;
    }
    await sleep(450);
    switchBoxVideo("idle");
    refs.box.classList.add("is-clickable");
    setBalloon("TOQUE NA CAIXA PARA FAZER UMA DESCOBERTA!");
    state.locked = false;
  }

  function retryRound() {
    refs.feedbackPanel.classList.remove("is-visible");
    refs.cardStage.querySelectorAll(".premium-card").forEach((card) => card.classList.remove("is-selected", "is-retry"));
  }

  async function showVictory() {
    setMode("chapter-05-victory");
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

  refs.startButton?.addEventListener("click", playIntroAfterStart);
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
  });

  window.setTimeout(() => {
    switchBiaVideo("idle");
  }, 1500);

  window.setTimeout(() => {
    switchBiaVideo("speaking", { once: true, timeout: 1000 });
    setBalloon("VAMOS BRINCAR DE DESCOBRIR?");
  }, 4000);
})();
