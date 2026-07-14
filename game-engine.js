(function () {
  const storageKey = "raizes:game-progress:v1";
  const atlasBase = "assets/games/caixa-misteriosa/";
  const asset = (path) => `${atlasBase}${path}`;

  const gameRepository = {
    games: {
      "caixa-misteriosa": {
        id: "caixa-misteriosa",
        type: "selection",
        title: "A Caixa Misteriosa",
        subtitle: "Sala das Descobertas",
        scenario: "Sala das Descobertas",
        character: "Leo, Sofia, Miguel e Bia",
        mascot: "Borboleta Bia",
        xp: 30,
        medal: "Pequeno Explorador",
        assets: {
          atlas: `${atlasBase}telas-assets.png`,
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
        subtitle: "Jardim das Descobertas",
        scenario: "Jardim das Descobertas",
        character: "Bia",
        mascot: "Pipo e Tico",
        xp: 35,
        medal: "Pequeno Organizador",
        assets: {
          atlas: "assets/games/organizando-cesta/atlas.png",
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
    complete(game, state) {
      return { ...state, xp: game.xp, medal: game.medal, completedAt: Date.now(), screen: "final" };
    },
    persist(game, state) {
      const records = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const duration = Math.max(1, Math.round(((state.completedAt || Date.now()) - state.startedAt) / 1000));
      const record = {
        gameId: game.id,
        title: game.title,
        completedExperience: true,
        durationSeconds: duration,
        xp: state.xp,
        medal: state.medal,
        progress: 100,
        rounds: state.completedRounds,
        attempts: state.attempts,
        completedAt: new Date(state.completedAt || Date.now()).toISOString(),
        supabaseReady: {
          table: "student_game_progress",
          fields: ["student_id", "game_id", "xp", "medal", "duration_seconds", "progress", "completed_at"],
        },
      };
      localStorage.setItem(storageKey, JSON.stringify([record, ...records.filter((item) => item.gameId !== game.id)].slice(0, 20)));
      this.syncSupabase(record);
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
      const records = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return records.find((item) => item.gameId === gameId) || null;
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
    }

    mount() {
      this.root.style.setProperty("--game-atlas", `url("${this.game.assets.atlas}")`);
      this.root.style.setProperty("--library-atlas", `url("${this.game.assets.library}")`);
      this.root.innerHTML = this.render();
      this.bind();
      this.go("intro");
    }

    render() {
      return `
        <section class="game-shell" aria-label="Motor de Jogos da Educacao Infantil">
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
          ${Object.values(gameRepository.games).map((game) => `
            <button class="${game.id === this.game.id ? "is-active" : ""}" type="button" data-game-select="${game.id}">
              <span>${game.type === "drag-drop" ? "Arrastar" : "Escolher"}</span>
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
        return `
          <section class="game-screen" data-screen="room" aria-label="Observando as frutas">
            <div class="game-scene game-scene-room" style="--screen:url('${this.game.assets.screens.room}')" aria-hidden="true"></div>
            ${components.particles(18)}
            <button class="game-primary-button game-observe-button" type="button" data-game-action="begin-drag">Organizar</button>
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
      if (this.game.type === "drag-drop") {
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
        const action = event.target.closest("[data-game-action]")?.dataset.gameAction;
        const card = event.target.closest("[data-choice-id]");
        const dragItem = event.target.closest("[data-drag-id]");
        const dropTarget = event.target.closest("[data-drop-id]");
        const speak = event.target.closest("[data-game-speak]");
        if (gameSelect) this.switchGame(gameSelect.dataset.gameSelect);
        if (action) this.handleAction(action, event.target.closest("button"));
        if (card) this.answer(card.dataset.choiceId, card);
        if (dragItem) this.selectDragItem(dragItem.dataset.dragId);
        if (dropTarget) this.dropSelectedItem(dropTarget.dataset.dropId);
        if (speak) audioPlayer.speak(decodeURIComponent(speak.dataset.gameSpeak), speak);
      });
      this.root.addEventListener("dragstart", (event) => {
        const dragItem = event.target.closest("[data-drag-id]");
        if (!dragItem) return;
        event.dataTransfer?.setData("text/plain", dragItem.dataset.dragId);
      });
      this.root.addEventListener("dragover", (event) => {
        if (event.target.closest("[data-drop-id]")) {
          event.preventDefault();
        }
      });
      this.root.addEventListener("drop", (event) => {
        const dropTarget = event.target.closest("[data-drop-id]");
        if (!dropTarget) return;
        event.preventDefault();
        const dragId = event.dataTransfer?.getData("text/plain");
        if (dragId) this.placeDragItem(dragId, dropTarget.dataset.dropId);
      });
      this.root.addEventListener("input", (event) => {
        const input = event.target.closest("[data-volume]");
        if (!input) return;
        audioPlayer.volumes[input.dataset.volume] = Number(input.value);
      });
    }

    switchGame(gameId) {
      this.game = gameRepository.getGame(gameId);
      this.state = progressController.create(this.game);
      this.record = rewardController.latest(this.game.id);
      this.root.innerHTML = this.render();
      this.updateRoundContent();
      this.go("intro");
    }

    handleAction(action, button) {
      if (action === "start") {
        audioPlayer.blip();
        this.go("room");
      }
      if (action === "begin-drag") {
        this.updateRoundContent();
        audioPlayer.speak(this.currentRound().narration, null);
        this.go("choice");
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
      const complete = round.items.every((entry) => this.state.placements[entry.id] === entry.targetId);
      if (complete) {
        this.state = { ...this.state, completedRounds: [round.id] };
        window.setTimeout(() => this.go("feedback"), 620);
      }
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
