#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const projectRoot = path.resolve(__dirname, "..");
const appPagesPath = path.join(projectRoot, "app-pages.js");

const source = `${fs.readFileSync(appPagesPath, "utf8")}
globalThis.__libraryAudit = { bookCatalog, libraryBooks };`;

const storage = new Map();
const sandbox = {
  console,
  URLSearchParams,
  Image: class {},
  localStorage: {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  },
  document: {
    documentElement: { style: {} },
    fullscreenElement: null,
    exitFullscreen: () => {},
    addEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    createDocumentFragment: () => ({ appendChild: () => {} }),
    createElement: () => ({
      className: "",
      dataset: {},
      style: { setProperty: () => {} },
      setAttribute: () => {},
      addEventListener: () => {},
      appendChild: () => {},
      insertAdjacentElement: () => {},
      closest: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
    }),
  },
  window: {
    location: {
      pathname: "/biblioteca.html",
      search: "",
      hash: "",
      replace: () => {},
    },
    addEventListener: () => {},
  },
  requestAnimationFrame: () => {},
};

sandbox.globalThis = sandbox;
sandbox.window.window = sandbox.window;

vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: appPagesPath });

const { bookCatalog = [], libraryBooks = [] } = sandbox.__libraryAudit || {};
const errors = [];
const warnings = [];
const seenIds = new Set();

const exists = (assetPath) => fs.existsSync(path.join(projectRoot, assetPath));
const addError = (book, message) => errors.push(`${book?.id || "sem-id"}: ${message}`);
const addWarning = (book, message) => warnings.push(`${book?.id || "sem-id"}: ${message}`);

for (const book of bookCatalog) {
  if (!book.id) addError(book, "ID ausente");
  if (seenIds.has(book.id)) addError(book, "ID duplicado");
  seenIds.add(book.id);

  if (!book.title) addError(book, "titulo ausente");
  if (!book.cover) addError(book, "capa ausente");
  if (!book.href) addError(book, "rota href ausente");
  if (!Number.isInteger(book.totalPages) || book.totalPages < 1) addError(book, "totalPages invalido");
  if (typeof book.page !== "function") addError(book, "funcao page ausente");
  if (typeof book.thumb !== "function") addError(book, "funcao thumb ausente");

  if (book.cover && !exists(book.cover)) addError(book, `capa inexistente: ${book.cover}`);
  if (book.catalogCover && !exists(book.catalogCover)) addWarning(book, `catalogCover inexistente: ${book.catalogCover}`);
  if (book.pdf && !exists(book.pdf)) addError(book, `PDF declarado inexistente: ${book.pdf}`);

  if (typeof book.page === "function" && book.totalPages) {
    const firstPage = book.page(1);
    const lastPage = book.page(book.totalPages);
    if (!exists(firstPage)) addError(book, `pagina 1 inexistente: ${firstPage}`);
    if (!exists(lastPage)) addError(book, `ultima pagina inexistente: ${lastPage}`);
  }

  if (typeof book.thumb === "function" && book.totalPages) {
    const firstThumb = book.thumb(1);
    const lastThumb = book.thumb(book.totalPages);
    if (!exists(firstThumb)) addError(book, `miniatura 1 inexistente: ${firstThumb}`);
    if (!exists(lastThumb)) addError(book, `ultima miniatura inexistente: ${lastThumb}`);
  }
}

for (const libraryBook of libraryBooks) {
  if (!libraryBook.href) addError(libraryBook, `card sem rota: ${libraryBook.title || "sem titulo"}`);
  if (!libraryBook.src) addError(libraryBook, `card sem capa: ${libraryBook.title || "sem titulo"}`);
  if (libraryBook.src && !exists(libraryBook.src)) addWarning(libraryBook, `capa do card inexistente: ${libraryBook.src}`);
  if ("downloadHref" in libraryBook) addError(libraryBook, `downloadHref presente em registro ativo: ${libraryBook.title || libraryBook.href}`);
}

const report = {
  activeBooks: bookCatalog.length,
  libraryCards: libraryBooks.length,
  errors: errors.length,
  warnings: warnings.length,
};

console.log("VALIDACAO DO CATALOGO DA BIBLIOTECA VIVA");
console.log(JSON.stringify(report, null, 2));

if (warnings.length) {
  console.log("\nAVISOS");
  warnings.forEach((warning) => console.log(`- ${warning}`));
}

if (errors.length) {
  console.error("\nERROS");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log("\nAPROVADO: catalogo ativo sem erros bloqueantes.");
}
