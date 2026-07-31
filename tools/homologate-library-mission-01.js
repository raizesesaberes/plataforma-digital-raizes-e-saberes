#!/usr/bin/env node

const { chromium, firefox, webkit } = require("playwright");

const baseUrl = process.env.LIBRARY_BASE_URL || "http://localhost:4173";
const widths = [1920, 1440, 1366, 1280, 1024, 768, 430, 390, 360];
const booksToOpen = ["livro-005", "guia-professor-004-v1", "avalia-portugues-2ano", "avalia-matematica-6ano"];
const results = [];

const pass = (name, detail = "") => results.push({ name, status: "APROVADO", detail });
const warn = (name, detail = "") => results.push({ name, status: "APROVADO COM RESSALVA", detail });
const fail = (name, detail = "") => results.push({ name, status: "REPROVADO", detail });

const assert = (name, condition, detail = "") => (condition ? pass(name, detail) : fail(name, detail));

(async () => {
  let browser;
  let engine = "chromium";
  for (const candidate of [
    ["chromium", chromium],
    [
      "google-chrome",
      {
        launch: (options) =>
          chromium.launch({
            ...options,
            executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          }),
      },
    ],
    ["firefox", firefox],
    ["webkit", webkit],
  ]) {
    try {
      browser = await candidate[1].launch({ headless: true });
      engine = candidate[0];
      break;
    } catch (error) {
      results.push({
        name: `inicializacao ${candidate[0]}`,
        status: "APROVADO COM RESSALVA",
        detail: error.message.split("\n")[0],
      });
    }
  }
  if (!browser) {
    throw new Error("Nenhum navegador Playwright headless iniciou neste ambiente.");
  }
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await context.addInitScript(() => {
    localStorage.setItem("raizes:demo-authenticated", "true");
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto(`${baseUrl}/biblioteca.html?fresh=mission-01-tests`, { waitUntil: "load" });
  assert("abertura da Biblioteca", await page.locator(".library-2-hero").count() === 1);

  await page.locator(".app-search input").fill("Guia do Professor");
  await page.waitForTimeout(100);
  const resultCount = await page.locator("[data-library-book-card]:visible").count();
  assert("busca com resultado", resultCount > 0, `${resultCount} cards visiveis`);

  await page.locator(".app-search input").fill("zzzzzz-sem-livro");
  await page.waitForTimeout(100);
  assert("busca sem resultado", await page.locator("[data-library-empty]:visible").count() === 1);

  await page.locator("[data-clear-library-search]").click();
  await page.waitForTimeout(100);
  const restoredCount = await page.locator("[data-library-book-card]:visible").count();
  assert("limpeza da busca", restoredCount >= 14, `${restoredCount} cards visiveis`);

  const overflowResults = [];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseUrl}/biblioteca.html?fresh=overflow-${width}`, { waitUntil: "load" });
    const overflow = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
    overflowResults.push(overflow);
  }
  const overflowing = overflowResults.filter((item) => item.overflow);
  assert(
    "overflow nas larguras solicitadas",
    overflowing.length === 0,
    overflowing.length ? JSON.stringify(overflowing) : JSON.stringify(overflowResults)
  );

  await page.setViewportSize({ width: 1366, height: 900 });

  for (const bookId of booksToOpen) {
    await page.goto(`${baseUrl}/book-viewer.html?book=${bookId}&fresh=open-${bookId}`, { waitUntil: "load" });
    const totalPages = Number(await page.locator("[data-book-reader]").getAttribute("data-total-pages"));
    const thumbs = await page.locator("[data-thumbnail-list] [data-goto-page]").count();
    assert(`abertura do livro ${bookId}`, totalPages > 0 && thumbs === totalPages, `${thumbs}/${totalPages} miniaturas`);
  }

  await page.goto(`${baseUrl}/book-viewer.html?book=livro-005&fresh=reader-flow`, { waitUntil: "load" });
  await page.locator(".reader-controls [data-next-page]").click();
  await page.waitForTimeout(80);
  assert("navegacao proxima pagina", (await page.locator("[data-page-label]").textContent()).trim().startsWith("2 /"));
  await page.locator(".reader-controls [data-prev-page]").click();
  await page.waitForTimeout(80);
  assert("navegacao pagina anterior", (await page.locator("[data-page-label]").textContent()).trim().startsWith("1 /"));

  await page.locator('[data-thumbnail-list] [data-goto-page="5"]').click();
  await page.waitForTimeout(80);
  assert("navegacao por miniatura", (await page.locator("[data-page-label]").textContent()).trim().startsWith("5 /"));

  await page.locator('[data-summary-list] [data-goto-page="10"]').click();
  await page.waitForTimeout(80);
  assert("navegacao pelo indice", (await page.locator("[data-page-label]").textContent()).trim().startsWith("10 /"));

  await page.locator("[data-zoom-in]").click();
  assert("zoom", (await page.locator("[data-zoom-label]").textContent()).trim() !== "100%");

  await page.locator("[data-reader-favorite]").click();
  assert("favorito", await page.locator("[data-reader-favorite][aria-pressed='true']").count() === 1);

  await page.locator("[data-bookmark-page]").click();
  assert("marcador", await page.locator("[data-bookmark-page].is-active").count() === 1);

  await page.locator('[data-thumbnail-list] [data-goto-page="12"]').click();
  await page.waitForTimeout(80);
  await page.evaluate(() => localStorage.removeItem("livro-005:bookmark"));
  await page.goto(`${baseUrl}/book-viewer.html?book=livro-005&fresh=resume-last-page`, { waitUntil: "load" });
  assert("retomada da ultima pagina", (await page.locator("[data-page-label]").textContent()).trim().startsWith("12 /"));

  await page.goto(`${baseUrl}/book-viewer.html?book=livro-005&page=3&fresh=url-priority`, { waitUntil: "load" });
  assert("prioridade da pagina na URL", (await page.locator("[data-page-label]").textContent()).trim().startsWith("3 /"));

  await page.locator("[data-fullscreen-reader]").click();
  const fullscreenAttempted = await page.evaluate(() => Boolean(document.fullscreenElement) || Boolean(document.fullscreenEnabled));
  if (fullscreenAttempted) pass("tela cheia", "botao acionado em ambiente headless");
  else warn("tela cheia", "API de fullscreen indisponivel no ambiente headless");

  await page.evaluate(() => {
    const cardImage = document.querySelector(".reader-book-profile img");
    cardImage.dispatchEvent(new Event("error"));
  });
  assert("tratamento de capa ausente", await page.locator(".reader-book-profile .library-asset-fallback").count() === 1);

  await page.evaluate(() => {
    const thumb = document.querySelector("[data-thumbnail-list] img");
    thumb.dispatchEvent(new Event("error", { bubbles: true }));
  });
  assert("tratamento de miniatura ausente", await page.locator(".thumbnail-list .library-asset-fallback").count() === 1);

  await page.evaluate(() => {
    const image = document.querySelector("[data-page-image]");
    image.src = "assets/inexistente/page-999.jpg";
    image.dispatchEvent(new Event("error"));
  });
  assert("tratamento de pagina ausente", await page.locator("[data-page-error]:visible").count() === 1);

  await page.goto(`${baseUrl}/book-viewer.html?book=livro-005&fresh=keyboard`, { waitUntil: "load" });
  const beforeKeyboardPage = Number(((await page.locator("[data-page-label]").textContent()) || "1").split("/")[0].trim());
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(80);
  const afterRight = (await page.locator("[data-page-label]").textContent()).trim();
  const afterKeyboardPage = Number(afterRight.split("/")[0].trim());
  await page.keyboard.press("+");
  await page.keyboard.press("/");
  const focusedSearch = await page.evaluate(() => document.activeElement?.matches("[data-book-search]"));
  assert(
    "teste basico de teclado",
    afterKeyboardPage === beforeKeyboardPage + 1 && focusedSearch,
    `${beforeKeyboardPage} -> ${afterRight}; busca focada=${focusedSearch}`
  );

  await browser.close();

  const blockingFailures = results.filter((result) => result.status === "REPROVADO");
  console.log(JSON.stringify({ baseUrl, engine, results, consoleErrors }, null, 2));
  if (blockingFailures.length) {
    process.exitCode = 1;
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
