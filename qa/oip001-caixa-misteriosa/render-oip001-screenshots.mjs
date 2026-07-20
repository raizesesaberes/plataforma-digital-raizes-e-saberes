import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9331 + Math.floor(Math.random() * 1000);
const profile = `/private/tmp/oip001-chrome-profile-${process.pid}`;
const baseUrl = `http://127.0.0.1:4180/jogos.html?oip001=${Date.now()}`;

const chromeProcess = spawn(chrome, [
  "--headless=new",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-gpu",
  "--hide-scrollbars",
  "--mute-audio",
  "--disable-extensions",
  "--disable-dev-shm-usage",
  "--remote-debugging-address=127.0.0.1",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

let chromeError = "";
chromeProcess.stderr.on("data", (chunk) => {
  chromeError += chunk.toString();
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getJson = (url) => new Promise((resolve, reject) => {
  http.get(url, (response) => {
    let body = "";
    response.setEncoding("utf8");
    response.on("data", (chunk) => { body += chunk; });
    response.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  }).on("error", reject);
});

let version;
for (let attempt = 0; attempt < 30; attempt += 1) {
  try {
    version = await getJson(`http://127.0.0.1:${port}/json/version`);
    break;
  } catch {
    await sleep(250);
  }
}
if (!version?.webSocketDebuggerUrl) throw new Error(`Chrome CDP nao iniciou. ${chromeError.slice(0, 1000)}`);

const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

let id = 0;
const pending = new Map();
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
});

const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const message = { id: ++id, method, params };
  if (sessionId) message.sessionId = sessionId;
  pending.set(message.id, { resolve, reject });
  ws.send(JSON.stringify(message));
});

const { targetId } = await send("Target.createTarget", { url: baseUrl });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);
await sleep(1200);

const evalJs = async (expression) => {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  }, sessionId);
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};

const waitFor = async (selector) => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const found = await evalJs(`!!document.querySelector(${JSON.stringify(selector)})`);
    if (found) return;
    await sleep(125);
  }
  throw new Error(`Selector nao encontrado: ${selector}`);
};

const click = async (selector) => {
  await evalJs(`document.querySelector(${JSON.stringify(selector)}).click()`);
  await sleep(250);
};

const shot = async (name) => {
  const result = await send("Page.captureScreenshot", { format: "png", fromSurface: true }, sessionId);
  await fs.writeFile(path.join(__dirname, name), Buffer.from(result.data, "base64"));
};

await send("Emulation.setDeviceMetricsOverride", {
  width: 1280,
  height: 720,
  deviceScaleFactor: 1,
  mobile: false,
}, sessionId);

await evalJs(`localStorage.clear(); window.RSGameEngine.openGame("caixa-misteriosa")`);
await waitFor(".selection-intro-screen.is-active");
await shot("01-tela-inicial.png");

await click(".selection-intro-screen .btn-primary");
await waitFor(".selection-box-screen.is-active");
await shot("02-caixa.png");

await click(".selection-discovery-box");
await waitFor(".selection-hint-screen.is-active");
await shot("03-dica.png");
await sleep(2300);
await waitFor(".selection-choice-screen.is-active");
await shot("04-escolha.png");

const chooseCorrect = async () => {
  const choiceId = await evalJs(`window.RSGameEngine.engine.round.options.find((option) => option.correct).id`);
  await click(`[data-action="answer"][data-choice-id="${choiceId}"]`);
};

await chooseCorrect();
await waitFor(".selection-feedback-screen.is-active");
await click('.selection-feedback-panel [data-action="continue"]');

for (let index = 0; index < 2; index += 1) {
  await waitFor(".selection-box-screen.is-active");
  await click(".selection-discovery-box");
  await waitFor(".selection-choice-screen.is-active");
  await chooseCorrect();
  await waitFor(".selection-feedback-screen.is-active");
  await click('.selection-feedback-panel [data-action="continue"]');
}

await waitFor(".selection-final-screen.is-active");
await shot("05-tela-final.png");

const validation = await evalJs(`({
  screen: document.querySelector(".game-screen.is-active")?.dataset.screen,
  immersive: document.body.classList.contains("game-immersive-active"),
  xp: document.querySelector("[data-xp-counter]")?.textContent,
  medal: document.querySelector("[data-final-medal]")?.textContent,
  hidden: {
    sidebar: getComputedStyle(document.querySelector(".app-sidebar")).display,
    topbar: getComputedStyle(document.querySelector(".app-topbar")).display,
    panel: getComputedStyle(document.querySelector(".game-panel")).display
  },
  brokenImages: [...document.querySelectorAll(".game-screen.is-active img")]
    .filter((img) => img.complete && img.naturalWidth === 0)
    .map((img) => img.src)
})`);

const { targetId: mobileTargetId } = await send("Target.createTarget", { url: `${baseUrl}&mobile=1` });
const { sessionId: mobileSessionId } = await send("Target.attachToTarget", { targetId: mobileTargetId, flatten: true });
await send("Page.enable", {}, mobileSessionId);
await send("Runtime.enable", {}, mobileSessionId);
await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
}, mobileSessionId);
await sleep(900);
await send("Runtime.evaluate", {
  expression: `localStorage.clear(); window.RSGameEngine.openGame("caixa-misteriosa")`,
  awaitPromise: true,
  returnByValue: true,
}, mobileSessionId);
await sleep(800);
const mobileShot = await send("Page.captureScreenshot", { format: "png", fromSurface: true }, mobileSessionId);
await fs.writeFile(path.join(__dirname, "06-mobile-inicial.png"), Buffer.from(mobileShot.data, "base64"));

const mobileValidation = await send("Runtime.evaluate", {
  expression: `({
    width: innerWidth,
    height: innerHeight,
    immersive: document.body.classList.contains("game-immersive-active"),
    brokenImages: [...document.querySelectorAll(".game-screen.is-active img")]
      .filter((img) => img.complete && img.naturalWidth === 0)
      .map((img) => img.src)
  })`,
  awaitPromise: true,
  returnByValue: true,
}, mobileSessionId);

ws.close();
chromeProcess.kill("SIGTERM");

console.log(JSON.stringify({ desktop: validation, mobile: mobileValidation.result.value }, null, 2));
