(function () {
  const appSelector = "[data-colorir-descobrir-app]";
  const soundPreferenceKey = "raizes:colorir-descobrir:sound:v1";
  const defaultPalette = [
    ["#e53935", "Vermelho"],
    ["#1e88e5", "Azul"],
    ["#fdd835", "Amarelo"],
    ["#43a047", "Verde"],
    ["#fb8c00", "Laranja"],
    ["#8e24aa", "Roxo"],
    ["#ec407a", "Rosa"],
    ["#795548", "Marrom"],
    ["#111111", "Preto"],
    ["#ffffff", "Branco"],
  ];
  const tools = {
    dedo: { label: "Dedo", size: 16, alpha: 0.9, lineCap: "round" },
    pincel: { label: "Pincel", size: 28, alpha: 0.88, lineCap: "round" },
    rolinho: { label: "Rolinho", size: 46, alpha: 0.74, lineCap: "square" },
    esponja: { label: "Esponja", size: 38, alpha: 0.38, lineCap: "round" },
    borracha: { label: "Apagar", size: 36, alpha: 1, lineCap: "round", eraser: true },
  };

  const state = {
    root: null,
    view: "home",
    themeId: "",
    figure: null,
    color: defaultPalette[0][0],
    tool: "pincel",
    canvas: null,
    ctx: null,
    image: null,
    maskImage: null,
    maskReady: false,
    drawing: false,
    lastPoint: null,
    undo: [],
    redo: [],
    muted: localStorage.getItem(soundPreferenceKey) === "off",
    curiosityAudio: null,
    musicAudio: null,
    audioContext: null,
    ambientTimer: null,
    speech: null,
    introPlayedFor: "",
  };

  const catalogApi = () => window.RaizesColorirDescobrirCatalog;
  const html = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const dataUrlSafe = (value) => String(value || "").replace(/"/g, "%22");

  const getCatalog = () => catalogApi()?.getCatalog?.() || { themes: [], figures: [] };
  const getPublishedThemes = () => catalogApi()?.getThemes?.() || [];
  const getFiguresByTheme = (themeId) => catalogApi()?.getFiguresByTheme?.(themeId) || [];
  const getTheme = (themeId) => getCatalog().themes.find((theme) => theme.id === themeId) || null;

  const stopSpeech = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    state.speech = null;
  };

  const stopAudio = () => {
    state.curiosityAudio?.pause();
    state.musicAudio?.pause();
    state.musicAudio = null;
    stopSpeech();
    if (state.ambientTimer) clearInterval(state.ambientTimer);
    state.ambientTimer = null;
    state.audioContext?.close?.().catch(() => {});
    state.audioContext = null;
  };

  const setMusicVolume = (volume) => {
    if (state.musicAudio) state.musicAudio.volume = state.muted ? 0 : volume;
  };

  const playAmbientFallback = () => {
    if (state.muted || state.audioContext) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    state.audioContext = context;
    const playNote = (frequency, delay) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.0001, context.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + delay + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + delay + 0.7);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(context.currentTime + delay);
      oscillator.stop(context.currentTime + delay + 0.75);
    };
    const loop = () => {
      if (state.muted || !state.audioContext) return;
      [523.25, 659.25, 783.99, 659.25].forEach((note, index) => playNote(note, index * 0.42));
    };
    loop();
    state.ambientTimer = setInterval(loop, 2600);
  };

  const startMusic = (figure) => {
    if (state.muted) return;
    if (figure?.musicaLoop) {
      state.musicAudio?.pause();
      state.musicAudio = new Audio(figure.musicaLoop);
      state.musicAudio.loop = true;
      state.musicAudio.volume = 0.18;
      state.musicAudio.play().catch(() => playAmbientFallback());
      return;
    }
    playAmbientFallback();
  };

  const playCuriosity = (figure, onDone = () => {}) => {
    state.curiosityAudio?.pause();
    stopSpeech();
    if (state.muted) {
      onDone();
      return;
    }
    setMusicVolume(0.05);
    const finish = () => {
      setMusicVolume(0.18);
      onDone();
    };
    if (figure.audioCuriosidade) {
      const audio = new Audio(figure.audioCuriosidade);
      state.curiosityAudio = audio;
      audio.volume = 0.85;
      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch(finish);
      return;
    }
    if (window.speechSynthesis && figure.textoCuriosidade) {
      const utterance = new SpeechSynthesisUtterance(figure.textoCuriosidade);
      utterance.lang = "pt-BR";
      utterance.rate = 0.95;
      utterance.pitch = 1.15;
      utterance.onend = finish;
      utterance.onerror = finish;
      state.speech = utterance;
      window.speechSynthesis.speak(utterance);
      return;
    }
    setTimeout(finish, 700);
  };

  const renderHome = () => {
    const themes = getPublishedThemes();
    return `
      <section class="pcd-shell pcd-home" data-pcd-view="home">
        <header class="pcd-hero">
          <a class="pcd-back" href="educacao-infantil.html">VOLTAR</a>
          <div>
            <h1>PRA COLORIR E DESCOBRIR</h1>
            <p>ESCOLHA UMA AVENTURA, DESCUBRA COISAS INCRIVEIS E DEIXE TUDO CHEIO DE CORES!</p>
          </div>
        </header>
        ${themes.length ? `
          <div class="pcd-theme-grid">
            ${themes.map((theme) => `
              <button class="pcd-theme-card" type="button" data-pcd-theme="${theme.id}" style="--pcd-accent:${theme.accent || "#35b779"}">
                <span></span>
                <strong>${html(theme.titulo).toUpperCase()}</strong>
              </button>
            `).join("")}
          </div>
        ` : `
          <div class="pcd-empty">
            <strong>NOVAS DESCOBERTAS ESTAO CHEGANDO!</strong>
            <p>Assim que a escola publicar os primeiros pacotes, eles aparecem aqui.</p>
          </div>
        `}
      </section>
    `;
  };

  const renderTheme = (themeId) => {
    const theme = getTheme(themeId);
    const figures = getFiguresByTheme(themeId);
    return `
      <section class="pcd-shell pcd-selection" data-pcd-view="theme">
        <header class="pcd-topline">
          <button class="pcd-back" type="button" data-pcd-home>ESCOLHER OUTRO TEMA</button>
          <div>
            <span>${html(theme?.titulo || "Descobertas").toUpperCase()}</span>
            <h1>ESCOLHA UMA FIGURA</h1>
          </div>
        </header>
        ${figures.length ? `
          <div class="pcd-figure-grid">
            ${figures.map((figure) => `
              <button class="pcd-figure-card" type="button" data-pcd-figure="${figure.id}">
                <img src="${dataUrlSafe(figure.imagemColorida || figure.imagemBranca)}" alt="${html(figure.titulo)}" loading="lazy" onerror="this.hidden=true" />
                <strong>${html(figure.titulo).toUpperCase()}</strong>
                <span>COLORIR</span>
              </button>
            `).join("")}
          </div>
        ` : `
          <div class="pcd-empty">
            <strong>NOVAS DESCOBERTAS ESTAO CHEGANDO!</strong>
            <p>Este tema ja esta preparado para receber figuras.</p>
          </div>
        `}
      </section>
    `;
  };

  const renderIntro = (figure) => `
    <section class="pcd-shell pcd-intro" data-pcd-view="intro">
      <header class="pcd-topline">
        <button class="pcd-back" type="button" data-pcd-theme-back>VOLTAR</button>
        <button class="pcd-sound" type="button" data-pcd-sound>${state.muted ? "SOM OFF" : "SOM"}</button>
      </header>
      <div class="pcd-intro-scene">
        <img src="${dataUrlSafe(figure.imagemColorida || figure.imagemBranca)}" alt="${html(figure.titulo)}" onerror="this.hidden=true" />
        <div>
          <span>UMA DESCOBERTA</span>
          <h1>${html(figure.titulo).toUpperCase()}</h1>
          <p>${html(figure.textoCuriosidade || "Vamos descobrir cores novas brincando.")}</p>
          <button type="button" data-pcd-start-paint>COMEÇAR A DESCOBERTA</button>
        </div>
      </div>
    </section>
  `;

  const renderPaint = (figure) => `
    <section class="pcd-painter" data-pcd-view="paint">
      <header class="pcd-paint-header">
        <button type="button" data-pcd-theme-back>VOLTAR</button>
        <strong>${html(figure.titulo).toUpperCase()}</strong>
        <button type="button" data-pcd-sound>${state.muted ? "SOM OFF" : "SOM"}</button>
      </header>
      <main class="pcd-paint-main">
        <aside class="pcd-tools" aria-label="Ferramentas">
          <div class="pcd-swatches">
            ${defaultPalette.map(([color, label]) => `<button type="button" data-pcd-color="${color}" class="${color === state.color ? "is-active" : ""}" style="--swatch:${color}" aria-label="${label}"></button>`).join("")}
          </div>
          <div class="pcd-tool-grid">
            ${Object.entries(tools).map(([key, tool]) => `<button type="button" data-pcd-tool="${key}" class="${key === state.tool ? "is-active" : ""}">${tool.label}</button>`).join("")}
          </div>
        </aside>
        <div class="pcd-canvas-wrap">
          <img class="pcd-base-image" src="${dataUrlSafe(figure.imagemBranca)}" alt="${html(figure.titulo)} para colorir" draggable="false" />
          <canvas class="pcd-canvas" data-pcd-canvas width="1200" height="1200"></canvas>
          <img class="pcd-outline-image" src="${dataUrlSafe(figure.imagemBranca)}" alt="" draggable="false" aria-hidden="true" />
          ${figure.imagemMascara ? `<img class="pcd-mask-preload" src="${dataUrlSafe(figure.imagemMascara)}" alt="" draggable="false" aria-hidden="true" data-pcd-mask />` : ""}
        </div>
        <aside class="pcd-actions" aria-label="Acoes">
          <button type="button" data-pcd-undo>DESFAZER</button>
          <button type="button" data-pcd-redo>REFAZER</button>
          <button type="button" data-pcd-clear>LIMPAR</button>
          <button type="button" data-pcd-save>SALVAR MINHA ARTE</button>
          <button type="button" data-pcd-print="blank">IMPRIMIR PARA COLORIR</button>
          <button type="button" data-pcd-print="official">IMPRIMIR COLORIDA</button>
          <button type="button" data-pcd-print="mine">IMPRIMIR MINHA ARTE</button>
          <button type="button" data-pcd-theme-back>COLORIR OUTRA DESCOBERTA</button>
          <button type="button" data-pcd-home>ESCOLHER OUTRO TEMA</button>
        </aside>
      </main>
    </section>
  `;

  const mount = (markup) => {
    state.root.innerHTML = markup;
  };

  const showHome = () => {
    stopAudio();
    state.view = "home";
    state.themeId = "";
    state.figure = null;
    mount(renderHome());
  };

  const showTheme = (themeId) => {
    stopAudio();
    state.view = "theme";
    state.themeId = themeId;
    state.figure = null;
    mount(renderTheme(themeId));
  };

  const showIntro = (figureId) => {
    const figure = catalogApi()?.getFigure?.(figureId) || null;
    if (!figure) return;
    stopAudio();
    state.view = "intro";
    state.figure = figure;
    mount(renderIntro(figure));
  };

  const snapshot = () => {
    if (!state.canvas) return;
    state.undo.push(state.canvas.toDataURL("image/png"));
    state.undo = state.undo.slice(-24);
    state.redo = [];
  };

  const restore = (dataUrl) => {
    const image = new Image();
    image.onload = () => {
      state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
      state.ctx.drawImage(image, 0, 0);
    };
    image.src = dataUrl;
  };

  const getPoint = (event) => {
    const rect = state.canvas.getBoundingClientRect();
    const pointer = event.touches?.[0] || event;
    return {
      x: ((pointer.clientX - rect.left) / rect.width) * state.canvas.width,
      y: ((pointer.clientY - rect.top) / rect.height) * state.canvas.height,
    };
  };

  const drawTo = (point) => {
    const tool = tools[state.tool] || tools.pincel;
    const ctx = state.ctx;
    ctx.save();
    ctx.globalCompositeOperation = tool.eraser ? "destination-out" : "source-over";
    ctx.globalAlpha = tool.alpha;
    ctx.strokeStyle = state.color;
    ctx.lineWidth = tool.size;
    ctx.lineCap = tool.lineCap;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(state.lastPoint.x, state.lastPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    if (state.tool === "esponja") {
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.arc(point.x + (Math.random() - 0.5) * tool.size, point.y + (Math.random() - 0.5) * tool.size, Math.max(3, tool.size * Math.random() * 0.22), 0, Math.PI * 2);
        ctx.fillStyle = state.color;
        ctx.fill();
      }
    }
    ctx.restore();
    state.lastPoint = point;
    applyMask();
  };

  const applyMask = () => {
    if (!state.ctx || !state.canvas || !state.maskReady || !state.maskImage) return;
    state.ctx.save();
    state.ctx.globalCompositeOperation = "destination-in";
    state.ctx.globalAlpha = 1;
    state.ctx.drawImage(state.maskImage, 0, 0, state.canvas.width, state.canvas.height);
    state.ctx.restore();
  };

  const bindCanvas = () => {
    state.canvas = state.root.querySelector("[data-pcd-canvas]");
    state.ctx = state.canvas?.getContext("2d");
    if (!state.canvas || !state.ctx) return;
    state.maskImage = null;
    state.maskReady = false;
    if (state.figure?.imagemMascara) {
      const mask = new Image();
      mask.onload = () => {
        state.maskImage = mask;
        state.maskReady = true;
        applyMask();
      };
      mask.onerror = () => {
        state.maskImage = null;
        state.maskReady = false;
      };
      mask.src = state.figure.imagemMascara;
    }
    const start = (event) => {
      event.preventDefault();
      snapshot();
      state.drawing = true;
      state.lastPoint = getPoint(event);
      drawTo(state.lastPoint);
    };
    const move = (event) => {
      if (!state.drawing) return;
      event.preventDefault();
      drawTo(getPoint(event));
    };
    const end = () => {
      state.drawing = false;
      state.lastPoint = null;
    };
    state.canvas.addEventListener("pointerdown", start);
    state.canvas.addEventListener("pointermove", move);
    state.canvas.addEventListener("pointerup", end);
    state.canvas.addEventListener("pointerleave", end);
    state.canvas.addEventListener("touchstart", start, { passive: false });
    state.canvas.addEventListener("touchmove", move, { passive: false });
    state.canvas.addEventListener("touchend", end);
  };

  const showPaint = () => {
    if (!state.figure) return;
    state.view = "paint";
    mount(renderPaint(state.figure));
    bindCanvas();
    startMusic(state.figure);
  };

  const composeArt = (mode = "mine") =>
    new Promise((resolve) => {
      const figure = state.figure;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const base = new Image();
      const official = new Image();
      base.crossOrigin = "anonymous";
      official.crossOrigin = "anonymous";
      const finishWith = (img) => {
        const width = img.naturalWidth || state.canvas?.width || 1200;
        const height = img.naturalHeight || state.canvas?.height || 1200;
        canvas.width = width;
        canvas.height = height;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        if (mode === "mine" && state.canvas) {
          ctx.drawImage(state.canvas, 0, 0, width, height);
          ctx.drawImage(base, 0, 0, width, height);
        }
        resolve(canvas.toDataURL("image/png"));
      };
      base.onload = () => {
        if (mode === "official" && figure.imagemColorida) {
          official.onload = () => finishWith(official);
          official.onerror = () => finishWith(base);
          official.src = figure.imagemColorida;
          return;
        }
        finishWith(base);
      };
      base.onerror = () => resolve("");
      base.src = figure.imagemBranca;
    });

  const saveArt = async () => {
    const dataUrl = await composeArt("mine");
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.download = `${state.figure.id}-minha-arte.png`;
    link.href = dataUrl;
    link.click();
  };

  const printImage = async (mode) => {
    const dataUrl = await composeArt(mode);
    if (!dataUrl) return;
    const frame = document.createElement("iframe");
    frame.className = "pcd-print-frame";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    doc.open();
    doc.write(`<html><head><title>Imprimir</title><style>html,body{margin:0;background:#fff}body{display:grid;place-items:center;min-height:100vh}img{max-width:96vw;max-height:96vh;object-fit:contain}@page{margin:10mm}</style></head><body><img src="${dataUrl}" alt=""></body></html>`);
    doc.close();
    setTimeout(() => {
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(() => frame.remove(), 1000);
    }, 250);
  };

  const toggleSound = () => {
    state.muted = !state.muted;
    localStorage.setItem(soundPreferenceKey, state.muted ? "off" : "on");
    state.root.querySelectorAll("[data-pcd-sound]").forEach((button) => {
      button.textContent = state.muted ? "SOM OFF" : "SOM";
    });
    if (state.muted) stopAudio();
    else if (state.view === "paint" && state.figure) startMusic(state.figure);
  };

  const init = () => {
    state.root = document.querySelector(appSelector);
    if (!state.root || !catalogApi()) return;
    showHome();
    state.root.addEventListener("click", (event) => {
      const themeButton = event.target.closest("[data-pcd-theme]");
      const figureButton = event.target.closest("[data-pcd-figure]");
      const colorButton = event.target.closest("[data-pcd-color]");
      const toolButton = event.target.closest("[data-pcd-tool]");
      const printButton = event.target.closest("[data-pcd-print]");
      if (themeButton) showTheme(themeButton.dataset.pcdTheme);
      if (figureButton) showIntro(figureButton.dataset.pcdFigure);
      if (event.target.closest("[data-pcd-home]")) showHome();
      if (event.target.closest("[data-pcd-theme-back]")) showTheme(state.themeId);
      if (event.target.closest("[data-pcd-sound]")) toggleSound();
      if (event.target.closest("[data-pcd-start-paint]")) {
        startMusic(state.figure);
        if (state.introPlayedFor === state.figure.id) {
          showPaint();
        } else {
          state.introPlayedFor = state.figure.id;
          playCuriosity(state.figure, showPaint);
        }
      }
      if (colorButton) {
        state.color = colorButton.dataset.pcdColor;
        state.root.querySelectorAll("[data-pcd-color]").forEach((button) => button.classList.toggle("is-active", button === colorButton));
      }
      if (toolButton) {
        state.tool = toolButton.dataset.pcdTool;
        state.root.querySelectorAll("[data-pcd-tool]").forEach((button) => button.classList.toggle("is-active", button === toolButton));
      }
      if (event.target.closest("[data-pcd-undo]") && state.undo.length) {
        state.redo.push(state.canvas.toDataURL("image/png"));
        restore(state.undo.pop());
      }
      if (event.target.closest("[data-pcd-redo]") && state.redo.length) {
        state.undo.push(state.canvas.toDataURL("image/png"));
        restore(state.redo.pop());
      }
      if (event.target.closest("[data-pcd-clear]") && state.ctx) {
        snapshot();
        state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
      }
      if (event.target.closest("[data-pcd-save]")) saveArt();
      if (printButton) printImage(printButton.dataset.pcdPrint);
    });
  };

  window.initColorirDescobrir = init;
  window.renderColorirDescobrirApp = () => `<div class="pcd-app" data-colorir-descobrir-app></div>`;
  window.addEventListener("beforeunload", stopAudio);
})();
