const platformAuth = {
  key: "raizes:demo-authenticated",
  loginPage: "login.html",
};

const requirePlatformAuth = () => {
  if (typeof window === "undefined") {
    return;
  }

  const isAuthenticated = localStorage.getItem(platformAuth.key) === "true";
  if (isAuthenticated) {
    return;
  }

  const currentPath = `${window.location.pathname.split("/").pop() || "biblioteca.html"}${window.location.search}${window.location.hash}`;
  document.documentElement.style.display = "none";
  window.location.replace(`${platformAuth.loginPage}?next=${encodeURIComponent(currentPath)}`);
};

requirePlatformAuth();

const ecosystemModules = [
  ["index.html", "🏠 Site"],
  ["aluno.html", "Aluno"],
  ["arvore.html", "Minha Arvore"],
  ["missao.html", "Missao do Dia"],
  ["jogos.html", "Jogos"],
  ["biblioteca.html", "Biblioteca"],
  ["universidade.html", "Universidade"],
  ["book-viewer.html", "Book Viewer"],
  ["professor.html", "Professor"],
  ["avalia.html", "Avalia+"],
  ["secretaria.html", "Secretaria"],
  ["gestor.html", "Gestor"],
  ["familia.html", "Familia"],
];

const masterBook001 = {
  id: "livro-mestre-001",
  title: "Educacao Infantil 2 anos",
  subtitle: "Livro do Aluno - Volume 1",
  catalogTitle: "Volume 1",
  level: "Infantil 2",
  type: "Livro do Aluno",
  collection: "Colecao Raizes e Saberes",
  totalPages: 126,
  basePath: "assets",
  cover: "assets/livro-mestre-001/pages/page-001.webp",
  catalogCover: "assets/biblioteca/RAIZES_INFANTIL2_VOL1_BIBLIOTECA.webp",
  href: "book-viewer.html?book=livro-mestre-001",
  thumb: (page) => `assets/livro-mestre-001/thumbs/page-${String(page).padStart(3, "0")}.webp`,
  page: (page) => `assets/livro-mestre-001/pages/page-${String(page).padStart(3, "0")}.webp`,
  summary: [
    ["Abertura", 1],
    ["Sumario", 10],
    ["Unidade 1 - Eu e meu mundo", 14],
    ["Unidade 2 - Historias e imaginacao", 34],
    ["Unidade 3 - Descobrindo o mundo", 56],
    ["Unidade 4 - Eu e os outros", 76],
    ["Projetos Integradores", 92],
    ["Atividades Extras", 93],
    ["Portfolio", 95],
    ["Certificado", 96],
  ],
};

const bookCatalog = [
  masterBook001,
  {
    id: "livro-002",
    title: "Educacao Infantil 2 anos",
    subtitle: "Livro do Aluno - Volume 2",
    catalogTitle: "Volume 2",
    level: "Infantil 2",
    type: "Livro do Aluno",
    collection: "Colecao Raizes e Saberes",
    totalPages: 124,
    basePath: "assets",
    cover: "assets/livro-002/pages/page-001.jpg",
    catalogCover: "assets/biblioteca/RAIZES_INFANTIL2_VOL2_BIBLIOTECA.webp",
    href: "book-viewer.html?book=livro-002",
    thumb: (page) => `assets/livro-002/thumbs/page-${String(page).padStart(3, "0")}.jpg`,
    page: (page) => `assets/livro-002/pages/page-${String(page).padStart(3, "0")}.jpg`,
    summary: [
      ["Boas-vindas", 1],
      ["Volume 2 - 2o semestre", 2],
      ["Unidade 3 - Cantigas e brincadeiras", 10],
      ["Convivencia e escola", 30],
      ["Rotina e descobertas", 50],
      ["Cores, tamanhos e comparacoes", 70],
      ["Caminhos e organizacao", 90],
      ["Descobrindo os seres vivos", 110],
    ],
  },
  {
    id: "laboratorio-sensorial-002",
    title: "Educacao Infantil 2 anos",
    subtitle: "Laboratorio Sensorial",
    catalogTitle: "Laboratorio Sensorial",
    level: "Infantil 2",
    type: "Laboratorio Sensorial",
    collection: "Colecao Raizes e Saberes",
    totalPages: 41,
    basePath: "assets",
    cover: "assets/laboratorio-sensorial-002/pages/page-001.jpg",
    catalogCover: "assets/biblioteca/RAIZES_LAB_SENSORIAL_INFANTIL2_BIBLIOTECA.webp",
    href: "book-viewer.html?book=laboratorio-sensorial-002",
    thumb: (page) => `assets/laboratorio-sensorial-002/thumbs/page-${String(page).padStart(3, "0")}.jpg`,
    page: (page) => `assets/laboratorio-sensorial-002/pages/page-${String(page).padStart(3, "0")}.jpg`,
    summary: [
      ["Apresentacao", 1],
      ["Missoes sensoriais", 2],
      ["Explorando os sentidos", 5],
      ["Sons e corpo", 10],
      ["Minhas conquistas", 20],
      ["Formas e materiais", 30],
      ["Registro final", 38],
      ["Certificado", 41],
    ],
  },
  {
    id: "livro-003",
    title: "Educacao Infantil 3 anos",
    subtitle: "Livro do Aluno - Volume 1",
    catalogTitle: "Volume 1",
    level: "Infantil 3",
    type: "Livro do Aluno",
    collection: "Colecao Raizes e Saberes",
    totalPages: 151,
    basePath: "assets",
    cover: "assets/livro-003/pages/page-001.jpg",
    catalogCover: "assets/biblioteca/RAIZES_INFANTIL3_VOL1_BIBLIOTECA.webp",
    href: "book-viewer.html?book=livro-003",
    thumb: (page) => `assets/livro-003/thumbs/page-${String(page).padStart(3, "0")}.jpg`,
    page: (page) => `assets/livro-003/pages/page-${String(page).padStart(3, "0")}.jpg`,
    summary: [
      ["Abertura", 1],
      ["Campos de experiencia", 8],
      ["Unidade 1 - Eu me comunico", 20],
      ["Brincadeiras e imaginacao", 60],
      ["Formas e descobertas", 100],
      ["Unidade 1 - Eu e minha familia", 120],
      ["Unidade 2 - Meu corpo e cuidados", 140],
      ["Encerramento", 151],
    ],
  },
  {
    id: "laboratorio-sensorial-003",
    title: "Educacao Infantil 3 anos",
    subtitle: "Laboratorio Sensorial",
    catalogTitle: "Laboratorio Sensorial",
    level: "Infantil 3",
    type: "Laboratorio Sensorial",
    collection: "Colecao Raizes e Saberes",
    totalPages: 47,
    basePath: "assets",
    cover: "assets/laboratorio-sensorial-003/pages/page-001.jpg",
    catalogCover: "assets/biblioteca/RAIZES_LAB_SENSORIAL_INFANTIL3_BIBLIOTECA.webp",
    href: "book-viewer.html?book=laboratorio-sensorial-003",
    thumb: (page) => `assets/laboratorio-sensorial-003/thumbs/page-${String(page).padStart(3, "0")}.jpg`,
    page: (page) => `assets/laboratorio-sensorial-003/pages/page-${String(page).padStart(3, "0")}.jpg`,
    summary: [
      ["Apresentacao", 1],
      ["Missoes sensoriais", 2],
      ["Explorando os sentidos", 5],
      ["Sons e corpo", 12],
      ["Formas e materiais", 22],
      ["Registro final", 40],
      ["Encerramento", 47],
    ],
  },
  {
    id: "livro-004",
    title: "Educacao Infantil 3 anos",
    subtitle: "Livro do Aluno - Volume 2",
    catalogTitle: "Volume 2",
    level: "Infantil 3",
    type: "Livro do Aluno",
    collection: "Colecao Raizes e Saberes",
    totalPages: 126,
    basePath: "assets",
    cover: "assets/livro-004/pages/page-001.jpg",
    catalogCover: "assets/biblioteca/RAIZES_INFANTIL3_VOL2_BIBLIOTECA.webp",
    href: "book-viewer.html?book=livro-004",
    thumb: (page) => `assets/livro-004/thumbs/page-${String(page).padStart(3, "0")}.jpg`,
    page: (page) => `assets/livro-004/pages/page-${String(page).padStart(3, "0")}.jpg`,
    summary: [
      ["Abertura", 1],
      ["Volume 2 - 2o semestre", 2],
      ["Unidade 3", 10],
      ["Atividades", 30],
      ["Experiencias", 50],
      ["Descobertas", 70],
      ["Projetos", 90],
      ["Encerramento", 126],
    ],
  },
  {
    id: "livro-005",
    title: "Educacao Infantil 4 anos",
    subtitle: "Livro do Aluno - Volume 1",
    catalogTitle: "Volume 1",
    level: "Infantil 4",
    type: "Livro do Aluno",
    collection: "Colecao Raizes e Saberes",
    totalPages: 142,
    basePath: "assets",
    cover: "assets/livro-005/pages/page-001.jpg",
    catalogCover: "assets/biblioteca/RAIZES_INFANTIL4_VOL1_BIBLIOTECA.webp",
    href: "book-viewer.html?book=livro-005",
    thumb: (page) => `assets/livro-005/thumbs/page-${String(page).padStart(3, "0")}.jpg`,
    page: (page) => `assets/livro-005/pages/page-${String(page).padStart(3, "0")}.jpg`,
    summary: [
      ["Abertura", 1],
      ["Volume 1 - 1o semestre", 2],
      ["Unidade 1", 10],
      ["Atividades", 30],
      ["Experiencias", 55],
      ["Descobertas", 80],
      ["Projetos", 110],
      ["Encerramento", 142],
    ],
  },
  {
    id: "livro-006",
    title: "Educacao Infantil 4 anos",
    subtitle: "Livro do Aluno - Volume 2",
    catalogTitle: "Volume 2",
    level: "Infantil 4",
    type: "Livro do Aluno",
    collection: "Colecao Raizes e Saberes",
    totalPages: 147,
    basePath: "assets",
    cover: "assets/livro-006/pages/page-001.jpg",
    catalogCover: "assets/biblioteca/RAIZES_INFANTIL4_VOL2_BIBLIOTECA.webp",
    href: "book-viewer.html?book=livro-006",
    thumb: (page) => `assets/livro-006/thumbs/page-${String(page).padStart(3, "0")}.jpg`,
    page: (page) => `assets/livro-006/pages/page-${String(page).padStart(3, "0")}.jpg`,
    summary: [
      ["Abertura", 1],
      ["Volume 2 - 2o semestre", 2],
      ["Unidade 3", 10],
      ["Atividades", 35],
      ["Experiencias", 65],
      ["Descobertas", 95],
      ["Projetos", 120],
      ["Encerramento", 147],
    ],
  },
  {
    id: "laboratorio-sensorial-004",
    title: "Educacao Infantil 4 anos",
    subtitle: "Laboratorio Sensorial",
    catalogTitle: "Laboratorio Sensorial",
    level: "Infantil 4",
    type: "Laboratorio Sensorial",
    collection: "Colecao Raizes e Saberes",
    totalPages: 57,
    basePath: "assets",
    cover: "assets/laboratorio-sensorial-004/pages/page-001.jpg",
    catalogCover: "assets/biblioteca/RAIZES_LAB_SENSORIAL_INFANTIL4_BIBLIOTECA.webp",
    href: "book-viewer.html?book=laboratorio-sensorial-004",
    thumb: (page) => `assets/laboratorio-sensorial-004/thumbs/page-${String(page).padStart(3, "0")}.jpg`,
    page: (page) => `assets/laboratorio-sensorial-004/pages/page-${String(page).padStart(3, "0")}.jpg`,
    summary: [
      ["Apresentacao", 1],
      ["Missoes sensoriais", 2],
      ["Explorando os sentidos", 8],
      ["Experimentacoes", 18],
      ["Criacoes", 32],
      ["Registro final", 48],
      ["Encerramento", 57],
    ],
  },
  {
    id: "livro-007",
    title: "Educacao Infantil 5 anos",
    subtitle: "Livro do Aluno - Volume 1",
    catalogTitle: "Volume 1",
    level: "Infantil 5",
    type: "Livro do Aluno",
    collection: "Colecao Raizes e Saberes",
    totalPages: 190,
    basePath: "assets",
    cover: "assets/livro-007/pages/page-001.jpg",
    catalogCover: "assets/biblioteca/RAIZES_INFANTIL5_VOL1_BIBLIOTECA.webp",
    href: "book-viewer.html?book=livro-007",
    thumb: (page) => `assets/livro-007/thumbs/page-${String(page).padStart(3, "0")}.jpg`,
    page: (page) => `assets/livro-007/pages/page-${String(page).padStart(3, "0")}.jpg`,
    summary: [
      ["Abertura", 1],
      ["Volume 1 - 1o semestre", 2],
      ["Unidade 1", 10],
      ["Atividades", 45],
      ["Experiencias", 85],
      ["Descobertas", 125],
      ["Projetos", 160],
      ["Encerramento", 190],
    ],
  },
  {
    id: "livro-008",
    title: "Educacao Infantil 5 anos",
    subtitle: "Livro do Aluno - Volume 2",
    catalogTitle: "Volume 2",
    level: "Infantil 5",
    type: "Livro do Aluno",
    collection: "Colecao Raizes e Saberes",
    totalPages: 169,
    basePath: "assets",
    cover: "assets/livro-008/pages/page-001.jpg",
    catalogCover: "assets/biblioteca/RAIZES_INFANTIL5_VOL2_BIBLIOTECA.webp",
    href: "book-viewer.html?book=livro-008",
    thumb: (page) => `assets/livro-008/thumbs/page-${String(page).padStart(3, "0")}.jpg`,
    page: (page) => `assets/livro-008/pages/page-${String(page).padStart(3, "0")}.jpg`,
    summary: [
      ["Abertura", 1],
      ["Volume 2 - 2o semestre", 2],
      ["Unidade 3", 10],
      ["Atividades", 40],
      ["Experiencias", 75],
      ["Descobertas", 110],
      ["Projetos", 140],
      ["Encerramento", 169],
    ],
  },
  {
    id: "laboratorio-sensorial-005",
    title: "Educacao Infantil 5 anos",
    subtitle: "Laboratorio Sensorial",
    catalogTitle: "Laboratorio Sensorial",
    level: "Infantil 5",
    type: "Laboratorio Sensorial",
    collection: "Colecao Raizes e Saberes",
    totalPages: 63,
    basePath: "assets",
    cover: "assets/laboratorio-sensorial-005/pages/page-001.jpg",
    catalogCover: "assets/biblioteca/RAIZES_LAB_SENSORIAL_INFANTIL5_BIBLIOTECA.webp",
    href: "book-viewer.html?book=laboratorio-sensorial-005",
    thumb: (page) => `assets/laboratorio-sensorial-005/thumbs/page-${String(page).padStart(3, "0")}.jpg`,
    page: (page) => `assets/laboratorio-sensorial-005/pages/page-${String(page).padStart(3, "0")}.jpg`,
    summary: [
      ["Apresentacao", 1],
      ["Missoes sensoriais", 2],
      ["Explorando os sentidos", 8],
      ["Experimentacoes", 20],
      ["Criacoes", 36],
      ["Registro final", 54],
      ["Encerramento", 63],
    ],
  },
];

const defaultBook = masterBook001;

const getActiveBook = () => {
  if (typeof window === "undefined") {
    return defaultBook;
  }
  const requestedBook = new URLSearchParams(window.location.search).get("book");
  return bookCatalog.find((book) => book.id === requestedBook) || defaultBook;
};

const activeBook = getActiveBook();

const getRecentBookIds = () => {
  try {
    return JSON.parse(localStorage.getItem("library:recentBooks") || "[]");
  } catch (error) {
    return [];
  }
};

const updateRecentBook = (bookId) => {
  try {
    const recentBookIds = getRecentBookIds().filter((recentBookId) => recentBookId !== bookId);
    localStorage.setItem("library:recentBooks", JSON.stringify([bookId, ...recentBookIds].slice(0, 4)));
  } catch (error) {
    // Reading history is a progressive enhancement for the static prototype.
  }
};

const buildRecentReadingCards = () => {
  const recentBookIds = getRecentBookIds();
  const visibleBooks = (recentBookIds.length ? recentBookIds : bookCatalog.map((book) => book.id))
    .map((bookId) => bookCatalog.find((book) => book.id === bookId))
    .filter(Boolean)
    .slice(0, 4);

  return visibleBooks
    .map((book) => {
      const lastPage = Number(localStorage.getItem(`${book.id}:lastPage`)) || 1;
      const progress = Math.round((lastPage / book.totalPages) * 100);
      return `
        <article class="reading-card">
          <img src="${book.catalogCover}" alt="${book.level} ${book.catalogTitle}" />
          <div>
            <h3>${book.catalogTitle}</h3>
            <p>${book.level}</p>
            <i style="--value:${progress}%"></i>
            <a class="mini-action" href="${book.href}">Continuar</a>
          </div>
        </article>
      `;
    })
    .join("");
};

const libraryBooks = [
  { src: "assets/biblioteca/RAIZES_INFANTIL2_VOL1_BIBLIOTECA.webp", year: "Infantil 2", title: "Volume 1", type: "Livro do Aluno", href: "book-viewer.html?book=livro-mestre-001", collection: "Educacao Infantil", publishedAt: "2026-07-01" },
  { src: "assets/biblioteca/RAIZES_INFANTIL2_VOL2_BIBLIOTECA.webp", year: "Infantil 2", title: "Volume 2", type: "Livro do Aluno", href: "book-viewer.html?book=livro-002", collection: "Educacao Infantil", publishedAt: "2026-07-01" },
  { src: "assets/biblioteca/RAIZES_LAB_SENSORIAL_INFANTIL2_BIBLIOTECA.webp", year: "Infantil 2", title: "Laboratorio Sensorial", type: "Material Sensorial", href: "book-viewer.html?book=laboratorio-sensorial-002", collection: "Laboratorio Sensorial", publishedAt: "2026-07-01" },
  { src: "assets/biblioteca/RAIZES_GUIA_ALFABETIZADOR_INFANTIL2_BIBLIOTECA.webp", year: "Infantil 2", title: "Guia do Alfabetizador", type: "Professor", href: "professor.html", collection: "Guias do Professor", publishedAt: "2026-07-08" },
  { src: "assets/biblioteca/RAIZES_INFANTIL3_VOL1_BIBLIOTECA.webp", year: "Infantil 3", title: "Volume 1", type: "Livro do Aluno", href: "book-viewer.html?book=livro-003", collection: "Educacao Infantil", publishedAt: "2026-07-09" },
  { src: "assets/biblioteca/RAIZES_INFANTIL3_VOL2_BIBLIOTECA.webp", year: "Infantil 3", title: "Volume 2", type: "Livro do Aluno", href: "book-viewer.html?book=livro-004", collection: "Educacao Infantil", publishedAt: "2026-07-09" },
  { src: "assets/biblioteca/RAIZES_LAB_SENSORIAL_INFANTIL3_BIBLIOTECA.webp", year: "Infantil 3", title: "Laboratorio Sensorial", type: "Material Sensorial", href: "book-viewer.html?book=laboratorio-sensorial-003", collection: "Laboratorio Sensorial", publishedAt: "2026-07-09" },
  { src: "assets/biblioteca/RAIZES_GUIA_ALFABETIZADOR_INFANTIL3_BIBLIOTECA.webp", year: "Infantil 3", title: "Guia do Alfabetizador", type: "Professor", href: "professor.html", collection: "Guias do Professor", publishedAt: "2026-07-09" },
  { src: "assets/biblioteca/RAIZES_INFANTIL4_VOL1_BIBLIOTECA.webp", year: "Infantil 4", title: "Volume 1", type: "Livro do Aluno", href: "book-viewer.html?book=livro-005", collection: "Educacao Infantil", publishedAt: "2026-07-10" },
  { src: "assets/biblioteca/RAIZES_INFANTIL4_VOL2_BIBLIOTECA.webp", year: "Infantil 4", title: "Volume 2", type: "Livro do Aluno", href: "book-viewer.html?book=livro-006", collection: "Educacao Infantil", publishedAt: "2026-07-10" },
  { src: "assets/biblioteca/RAIZES_LAB_SENSORIAL_INFANTIL4_BIBLIOTECA.webp", year: "Infantil 4", title: "Lab Sensorial", type: "Experiencias", href: "book-viewer.html?book=laboratorio-sensorial-004", collection: "Laboratorio Sensorial", publishedAt: "2026-07-10" },
  { src: "assets/biblioteca/RAIZES_GUIA_ALFABETIZADOR_INFANTIL4_BIBLIOTECA.webp", year: "Infantil 4", title: "Guia do Alfabetizador", type: "Professor", href: "professor.html", collection: "Guias do Professor", publishedAt: "2026-07-10" },
  { src: "assets/biblioteca/RAIZES_INFANTIL5_VOL1_BIBLIOTECA.webp", year: "Infantil 5", title: "Volume 1", type: "Livro do Aluno", href: "book-viewer.html?book=livro-007", collection: "Educacao Infantil", publishedAt: "2026-07-11" },
  { src: "assets/biblioteca/RAIZES_INFANTIL5_VOL2_BIBLIOTECA.webp", year: "Infantil 5", title: "Volume 2", type: "Livro do Aluno", href: "book-viewer.html?book=livro-008", collection: "Educacao Infantil", publishedAt: "2026-07-11" },
  { src: "assets/biblioteca/RAIZES_LAB_SENSORIAL_INFANTIL5_BIBLIOTECA.webp", year: "Infantil 5", title: "Lab Sensorial", type: "Experiencias", href: "book-viewer.html?book=laboratorio-sensorial-005", collection: "Laboratorio Sensorial", publishedAt: "2026-07-11" },
  { src: "assets/biblioteca/RAIZES_GUIA_ALFABETIZADOR_INFANTIL5_BIBLIOTECA.webp", year: "Infantil 5", title: "Guia do Alfabetizador", type: "Professor", href: "professor.html", collection: "Guias do Professor", publishedAt: "2026-07-11" },
  { src: "assets/colecoes/colecao-ensino-fundamental-provisorio.webp", year: "Fundamental", title: "Colecao Ensino Fundamental", type: "Acervo em expansao", href: "#acervo-completo", collection: "Ensino Fundamental", publishedAt: "2026-07-11", status: "Em expansao" },
  { src: "assets/colecoes/colecao-avalia-provisorio.webp", year: "Avalia+", title: "Colecao Avalia+", type: "Avaliacoes", href: "avalia.html", collection: "Avalia+", publishedAt: "2026-07-11", status: "Em expansao" },
];

const publishedMaterialsCount = libraryBooks.length;
const sortedLibraryBooks = [...libraryBooks].sort((firstBook, secondBook) => secondBook.publishedAt.localeCompare(firstBook.publishedAt));
const latestLibraryBooks = sortedLibraryBooks.slice(0, 4);
const featuredLibraryBook = sortedLibraryBooks.find((book) => book.href.startsWith("book-viewer.html")) || sortedLibraryBooks[0];
const countMaterialsByCollection = (collection) => libraryBooks.filter((book) => book.collection === collection).length;

const getSuggestedBook = (book) =>
  bookCatalog.find((candidate) => candidate.id !== book.id && candidate.level === book.level) ||
  bookCatalog.find((candidate) => candidate.id !== book.id && candidate.collection === book.collection) ||
  defaultBook;

const ecosystemConnections = {
  byBook: {
    "livro-005": {
      label: "Curso relacionado disponivel",
      title: "Educacao Inclusiva: Praticas que Acolhem",
      lesson: "Aula: acolhimento e inclusao na rotina",
      href: "universidade.html?lesson=educacao-inclusiva-acolhem#curso-relacionado",
    },
  },
  byLesson: {
    "educacao-inclusiva-acolhem": {
      label: "Material didatico relacionado",
      title: "Educacao Infantil 4 anos - Volume 1",
      description: "Livro do Aluno conectado a aula de inclusao e acolhimento.",
      href: "book-viewer.html?book=livro-005&page=20",
    },
  },
};

const getRelatedCourseForBook = (book) => ecosystemConnections.byBook[book.id];
const getRelatedMaterialForLesson = (lessonId = "educacao-inclusiva-acolhem") =>
  ecosystemConnections.byLesson[lessonId] || ecosystemConnections.byLesson["educacao-inclusiva-acolhem"];

const buildLatestMaterialsCards = () =>
  latestLibraryBooks
    .map(
      (book) => `
        <a class="latest-material-card" href="${book.href}">
          <img src="${book.src}" alt="${book.year} ${book.title}" loading="lazy" />
          <span>${book.year}</span>
          <strong>${book.title}</strong>
          <small>${book.type}</small>
        </a>
      `
    )
    .join("");

const buildFeaturedBookCard = () => `
  <aside class="featured-book-card">
    <span>Destaque da Semana</span>
    <img src="${featuredLibraryBook.src}" alt="${featuredLibraryBook.year} ${featuredLibraryBook.title}" loading="lazy" />
    <h2>${featuredLibraryBook.title}</h2>
    <p>${featuredLibraryBook.year} &middot; ${featuredLibraryBook.type}</p>
    <a href="${featuredLibraryBook.href}">Abrir destaque</a>
  </aside>
`;

const suggestedBook = getSuggestedBook(activeBook);
const relatedCourse = getRelatedCourseForBook(activeBook);
const relatedMaterial = getRelatedMaterialForLesson(
  typeof window === "undefined" ? undefined : new URLSearchParams(window.location.search).get("lesson")
);

const collectionShowcaseCards = [
  {
    title: "Educacao Infantil",
    count: `${countMaterialsByCollection("Educacao Infantil")} livros`,
    description: "Colecao completa para a Educacao Infantil, com atividades ludicas, experiencias sensoriais e guias para cada etapa.",
    icon: "⌂",
    href: "#acervo-completo",
    covers: [
      "assets/biblioteca/RAIZES_INFANTIL2_VOL1_BIBLIOTECA.webp",
      "assets/biblioteca/RAIZES_INFANTIL3_VOL2_BIBLIOTECA.webp",
      "assets/biblioteca/RAIZES_INFANTIL4_VOL1_BIBLIOTECA.webp",
      "assets/biblioteca/RAIZES_INFANTIL5_VOL2_BIBLIOTECA.webp",
    ],
  },
  {
    title: "Laboratorio Sensorial",
    count: `${countMaterialsByCollection("Laboratorio Sensorial")} livros`,
    description: "Experiencias praticas para explorar sentidos, natureza, materiais, criatividade e registros pedagogicos.",
    icon: "◎",
    href: "#acervo-completo",
    covers: [
      "assets/biblioteca/RAIZES_LAB_SENSORIAL_INFANTIL2_BIBLIOTECA.webp",
      "assets/biblioteca/RAIZES_LAB_SENSORIAL_INFANTIL3_BIBLIOTECA.webp",
      "assets/biblioteca/RAIZES_LAB_SENSORIAL_INFANTIL4_BIBLIOTECA.webp",
      "assets/biblioteca/RAIZES_LAB_SENSORIAL_INFANTIL5_BIBLIOTECA.webp",
    ],
  },
  {
    title: "Guias do Professor",
    count: `${countMaterialsByCollection("Guias do Professor")} guias`,
    description: "Materiais de apoio para planejamento, mediacao das propostas e acompanhamento do desenvolvimento infantil.",
    icon: "♙",
    href: "#acervo-completo",
    covers: [
      "assets/biblioteca/RAIZES_GUIA_ALFABETIZADOR_INFANTIL2_BIBLIOTECA.webp",
      "assets/biblioteca/RAIZES_GUIA_ALFABETIZADOR_INFANTIL3_BIBLIOTECA.webp",
      "assets/biblioteca/RAIZES_GUIA_ALFABETIZADOR_INFANTIL4_BIBLIOTECA.webp",
      "assets/biblioteca/RAIZES_GUIA_ALFABETIZADOR_INFANTIL5_BIBLIOTECA.webp",
    ],
  },
  {
    title: "Ensino Fundamental",
    count: `${countMaterialsByCollection("Ensino Fundamental")} colecao`,
    description: "Colecao alinhada a BNCC do 1o ao 9o ano, com trilhas integradas para ampliar repertorio e autonomia.",
    icon: "▣",
    href: "#acervo-completo",
    coverGroup: "assets/colecoes/colecao-ensino-fundamental-provisorio.webp",
    status: "Em expansao",
  },
  {
    title: "Avalia+",
    count: `${countMaterialsByCollection("Avalia+")} colecao`,
    description: "Avaliacoes diagnosticas, formativas e somativas para acompanhar resultados e orientar intervencoes.",
    icon: "✓",
    href: "avalia.html",
    coverGroup: "assets/colecoes/colecao-avalia-provisorio.webp",
    status: "Em expansao",
  },
  {
    title: "Materiais Complementares",
    count: "Em expansao",
    description: "Recursos adicionais para enriquecer o ensino: atividades, projetos, jogos, videos e sequencias de apoio.",
    icon: "▤",
    href: "#acervo-completo",
    coverGroup: "assets/colecoes/colecao-materiais-complementares-provisorio.webp",
    status: "Em expansao",
  },
];

const collectionShowcaseCardsHtml = collectionShowcaseCards
  .map(
    (collection) => `
      <article class="collection-showcase-card">
        <div class="collection-cover-stack" aria-hidden="true">
          ${
            collection.coverGroup
              ? `<img class="collection-cover-group" src="${collection.coverGroup}" alt="" loading="lazy" />`
              : collection.covers.map((cover) => `<img src="${cover}" alt="" loading="lazy" />`).join("")
          }
        </div>
        <div class="collection-card-body">
          <span class="collection-icon">${collection.icon}</span>
          <div>
            <h3>${collection.title}</h3>
            ${collection.status ? `<span class="collection-status">${collection.status}</span>` : ""}
            <p class="collection-count">📖 ${collection.count}</p>
            <p class="collection-description">${collection.description}</p>
            <a class="collection-action" href="${collection.href}">Explorar Colecao <span>›</span></a>
          </div>
        </div>
      </article>
    `
  )
  .join("");

const libraryBookCards = sortedLibraryBooks
  .map(
    (book) => `
      <article class="library-book-card">
        <img src="${book.src}" alt="${book.year} ${book.title}" loading="lazy" />
        <div>
          <span>${book.year}</span>
          <strong>${book.title}</strong>
          <small>${book.status || book.type}</small>
          <a href="${book.href}">Abrir</a>
        </div>
      </article>
    `
  )
  .join("");

const routeKeyByHref = {
  "aluno.html": "aluno",
  "arvore.html": "arvore",
  "missao.html": "missao",
  "jogos.html": "jogos",
  "biblioteca.html": "biblioteca",
  "universidade.html": "universidade",
  "book-viewer.html": "viewer",
  "professor.html": "professor",
  "avalia.html": "avalia",
  "secretaria.html": "secretaria",
  "gestor.html": "gestor",
  "familia.html": "familia",
};

const ecosystemModuleLinks = (activeKey) =>
  ecosystemModules
    .map(([href, label]) => {
      const isActive = routeKeyByHref[href] === activeKey;
      return `<a class="${isActive ? "is-active" : ""}" href="${href}">${label}</a>`;
    })
    .join("");

const knowledgeTreeStages = [
  { key: "seed", level: 1, label: "Semente", xpRange: "0 - 199 XP", minXp: 0, maxXp: 199, asset: "assets/knowledge-tree/stage-seed.webp", description: "Tudo comeca com uma pequena semente de curiosidade." },
  { key: "sprout", level: 2, label: "Broto", xpRange: "200 - 499 XP", minXp: 200, maxXp: 499, asset: "assets/knowledge-tree/stage-sprout.webp", description: "Voce esta aprendendo e sua arvore comeca a crescer." },
  { key: "leaves", level: 3, label: "Folhas", xpRange: "500 - 999 XP", minXp: 500, maxXp: 999, asset: "assets/knowledge-tree/stage-leaves.webp", description: "Seu conhecimento se fortalece e novas possibilidades surgem." },
  { key: "flowers", level: 4, label: "Flores", xpRange: "1000 - 1999 XP", minXp: 1000, maxXp: 1999, asset: "assets/knowledge-tree/stage-flowers.webp", description: "Voce domina novos conteudos e suas conquistas florescem." },
  { key: "fruits", level: 5, label: "Frutos", xpRange: "2000+ XP", minXp: 2000, maxXp: 2999, asset: "assets/knowledge-tree/stage-fruits.webp", description: "Seu esforco da frutos e inspira outros ao seu redor." },
  { key: "complete", level: 6, label: "Completa", xpRange: "3000+ XP", minXp: 3000, maxXp: 5000, asset: "assets/knowledge-tree/stage-complete.webp", description: "Arvore mestre: dedicacao, conquistas e inspiracao para a comunidade." },
];

const knowledgeTreeBadges = [
  { key: "explorer", label: "Explorador", asset: "assets/knowledge-tree/medal-explorer.webp", alt: "Medalha Explorador" },
  { key: "scholar", label: "Estudioso", asset: "assets/knowledge-tree/medal-scholar.webp", alt: "Medalha Estudioso" },
  { key: "discoverer", label: "Descobridor", asset: "assets/knowledge-tree/medal-discoverer.webp", alt: "Medalha Descobridor" },
  { key: "focus", label: "Foco", asset: "assets/knowledge-tree/medal-focus.webp", alt: "Medalha Foco" },
  { key: "champion", label: "Campeao", asset: "assets/knowledge-tree/medal-champion.webp", alt: "Medalha Campeao" },
];

const knowledgeTreeFixtures = {
  pedro: {
    student: "Pedro",
    xp: 125,
    level: 1,
    booksCompleted: 1,
    activitiesCompleted: 4,
    missionsCompleted: 2,
    medals: ["explorer"],
    specialAchievements: [],
  },
  growing: {
    student: "Ana Clara",
    xp: 720,
    level: 3,
    booksCompleted: 3,
    activitiesCompleted: 16,
    missionsCompleted: 8,
    medals: ["explorer", "scholar", "discoverer"],
    specialAchievements: [],
  },
  complete: {
    student: "Turma Raizes",
    xp: 3200,
    level: 6,
    booksCompleted: 12,
    activitiesCompleted: 48,
    missionsCompleted: 24,
    medals: ["explorer", "scholar", "discoverer", "focus", "champion"],
    specialAchievements: ["community"],
  },
  empty: {
    student: "Novo aluno",
    xp: 0,
    level: 1,
    booksCompleted: 0,
    activitiesCompleted: 0,
    missionsCompleted: 0,
    medals: [],
    specialAchievements: [],
  },
};

const getKnowledgeTreeStage = (xp = 0) =>
  [...knowledgeTreeStages].reverse().find((stage) => xp >= stage.minXp) || knowledgeTreeStages[0];

const getKnowledgeTreeProgress = (stage, xp = 0) => {
  if (stage.key === "complete") {
    return 100;
  }
  return Math.round(((xp - stage.minXp) / Math.max(stage.maxXp - stage.minXp, 1)) * 100);
};

const createKnowledgeTreeState = (data) => {
  const stage = getKnowledgeTreeStage(data.xp);
  const nextStage = knowledgeTreeStages.find((item) => item.minXp > data.xp) || null;
  return {
    ...data,
    stage,
    nextStage,
    progress: Math.max(0, Math.min(100, getKnowledgeTreeProgress(stage, data.xp))),
    earnedBadges: knowledgeTreeBadges.filter((badge) => data.medals.includes(badge.key)),
    leaves: Math.min(24, Math.max(1, data.activitiesCompleted + Math.floor(data.xp / 80))),
    flowers: Math.min(12, data.booksCompleted),
    fruits: Math.min(12, data.missionsCompleted),
  };
};

const knowledgeTreeImg = (src, alt, className = "") =>
  `<img${className ? ` class="${className}"` : ""} src="${src}" alt="${alt}" loading="lazy" decoding="async" />`;

const renderKnowledgeTreeProgress = (state, label = "Progresso da arvore") => `
  <div class="knowledge-tree-progress" role="group" aria-label="${label}">
    <div><strong>Nivel ${state.stage.level}</strong><span>${state.stage.xpRange}</span></div>
    <i role="progressbar" aria-label="${label}" aria-valuenow="${state.progress}" aria-valuemin="0" aria-valuemax="100">
      <span style="width:${state.progress}%"></span>
    </i>
    <small>${state.xp} XP${state.nextStage ? ` · proximo estagio em ${state.nextStage.minXp} XP` : " · arvore completa"}</small>
  </div>
`;

const renderKnowledgeTreeStage = (state, variant = "default") => `
  <figure class="knowledge-tree-stage is-${variant}" data-tree-stage="${state.stage.key}">
    ${knowledgeTreeImg(state.stage.asset, `Arvore Viva no estado ${state.stage.label}`, "knowledge-tree-art")}
    <figcaption>
      <strong>${state.stage.label}</strong>
      <span>${state.stage.description}</span>
    </figcaption>
  </figure>
`;

const renderKnowledgeTreeBadgeLayer = (state) => `
  <div class="knowledge-tree-badges" aria-label="Medalhas aplicadas na arvore">
    ${state.earnedBadges.length
      ? state.earnedBadges.map((badge) => `<span>${knowledgeTreeImg(badge.asset, badge.alt)}<small>${badge.label}</small></span>`).join("")
      : "<em>Nenhuma medalha aplicada ainda</em>"}
  </div>
`;

const renderKnowledgeTreeSeasonLayer = (state) => `
  <div class="knowledge-tree-season" aria-hidden="true">
    <span>${state.leaves} folhas</span>
    <span>${state.flowers} flores</span>
    <span>${state.fruits} frutos</span>
  </div>
`;

const renderKnowledgeTreeCompact = (data, className = "") => {
  const state = createKnowledgeTreeState(data);
  return `
    <article class="knowledge-tree compact ${className}" aria-label="Arvore Viva compacta de ${state.student}">
      ${renderKnowledgeTreeStage(state, "compact")}
      ${renderKnowledgeTreeProgress(state, "Progresso compacto da Arvore Viva")}
    </article>
  `;
};

const renderKnowledgeTreeLibrary = (data) => {
  const state = createKnowledgeTreeState(data);
  return `
    <article class="knowledge-tree library" aria-label="Arvore Viva integrada a Biblioteca">
      ${renderKnowledgeTreeStage(state, "library")}
      <div>
        <h3>Progresso de leitura</h3>
        ${renderKnowledgeTreeProgress(state, "Progresso de leitura da Arvore Viva")}
        <ul>
          <li><strong>${state.booksCompleted}</strong><span>livros concluidos</span></li>
          <li><strong>${state.missionsCompleted}</strong><span>missoes concluidas</span></li>
        </ul>
      </div>
    </article>
  `;
};

const renderKnowledgeTreeMission = (mission, data) => {
  const state = createKnowledgeTreeState(data);
  return `
    <article class="knowledge-tree mission" aria-label="Arvore Viva na Missao do Dia">
      ${renderKnowledgeTreeStage(state, "mission")}
      <div>
        <span>Missao do Dia</span>
        <h3>${mission.title}</h3>
        <p>${mission.description}</p>
        <strong>+${mission.rewardXp} XP para sua arvore</strong>
        <a href="${mission.href}">${mission.actionLabel}</a>
      </div>
    </article>
  `;
};

const renderKnowledgeTreeLegend = () => `
  <section class="knowledge-tree-card knowledge-tree-legend" aria-labelledby="knowledge-tree-legend-title">
    <h2 id="knowledge-tree-legend-title">Elementos da Arvore</h2>
    <article>${knowledgeTreeImg("assets/knowledge-tree/icon-leaf.webp", "", "")}<div><strong>Folhas</strong><p>Conteudos estudados e atividades concluidas.</p></div></article>
    <article>${knowledgeTreeImg("assets/knowledge-tree/icon-flower.webp", "", "")}<div><strong>Flores</strong><p>Dominio de habilidades e novos aprendizados.</p></div></article>
    <article>${knowledgeTreeImg("assets/knowledge-tree/icon-fruit.webp", "", "")}<div><strong>Frutos</strong><p>Grandes conquistas e conclusao de missoes.</p></div></article>
    <article>${knowledgeTreeImg("assets/knowledge-tree/icon-medal.webp", "", "")}<div><strong>Medalhas</strong><p>Reconhecimentos especiais obtidos em desafios.</p></div></article>
  </section>
`;

const renderKnowledgeTreeFull = (data) => {
  const state = createKnowledgeTreeState(data);
  return `
    <div class="knowledge-tree-full" aria-label="Minha Arvore Viva completa">
      <section class="knowledge-tree-hero">
        <div>
          <span>Asset 010</span>
          <h1>Arvore do Conhecimento</h1>
          <p>Seu aprendizado cresce. Sua arvore floresce. Seu futuro se transforma.</p>
        </div>
        <aside><strong>⭐</strong><p>Cada conquista alimenta sua arvore e aproxima voce de grandes descobertas.</p></aside>
      </section>

      <section class="knowledge-tree-levels" aria-label="Estados oficiais de evolucao">
        ${knowledgeTreeStages.map((stage) => {
          const stageState = createKnowledgeTreeState({ ...state, xp: stage.minXp, medals: [] });
          return `<article class="${stage.key === state.stage.key ? "is-current" : ""}">
            <strong>Nivel ${stage.level}</strong>
            <span>${stage.xpRange}</span>
            ${renderKnowledgeTreeStage(stageState, "timeline")}
          </article>`;
        }).join("")}
      </section>

      <section class="knowledge-tree-detail-grid">
        ${renderKnowledgeTreeLegend()}
        <section class="knowledge-tree-card">
          <h2>Evolucao Visual Ligada ao XP</h2>
          ${knowledgeTreeStages.slice(0, 5).map((stage) => {
            const stageState = createKnowledgeTreeState({ ...state, xp: stage.minXp, medals: [] });
            return `<article class="knowledge-tree-xp-row">
              ${knowledgeTreeImg(stage.asset, "", "")}
              <div><strong>Nivel ${stage.level}</strong><i><span style="width:${stage.key === state.stage.key ? state.progress : stage.minXp <= state.xp ? 100 : 0}%"></span></i></div>
              <small>${stage.xpRange}</small>
            </article>`;
          }).join("")}
        </section>
        <section class="knowledge-tree-card knowledge-tree-medal-tree">
          <h2>Medalhas Aplicadas na Arvore</h2>
          ${knowledgeTreeImg("assets/knowledge-tree/tree-complete-medals.webp", "Arvore completa com medalhas aplicadas", "knowledge-tree-master-art")}
          ${renderKnowledgeTreeBadgeLayer(state)}
        </section>
        <section class="knowledge-tree-card">
          <h2>Integracao com Livros Concluidos</h2>
          ${renderKnowledgeTreeLibrary(state)}
        </section>
        <section class="knowledge-tree-card">
          <h2>Integracao com Missoes Digitais</h2>
          ${renderKnowledgeTreeMission({ title: "Encontre as Cores", description: "Missao concluida adiciona XP, folhas e medalhas.", rewardXp: 25, href: "#", actionLabel: "Continuar missao" }, state)}
        </section>
      </section>

      <section class="knowledge-tree-bottom-grid">
        <article class="knowledge-tree-card"><h2>Como sua arvore cresce</h2><p>Leia livros, complete atividades, participe de missoes digitais, ganhe XP e acompanhe sua arvore florescer.</p></article>
        <article class="knowledge-tree-card"><h2>Beneficios</h2><p>Motiva, engaja, desenvolve autonomia, valoriza conquistas e conecta o aluno a comunidade.</p></article>
        <article class="knowledge-tree-card"><h2>Cores e Significados</h2><div class="knowledge-tree-colors"><span>Crescimento</span><span>Alegria</span><span>Imaginacao</span><span>Confianca</span><span>Energia</span></div></article>
      </section>
    </div>
  `;
};

const missionFixtures = {
  colorMatch001: {
    id: "color-match-001",
    code: "Missao 001",
    type: "choice",
    status: "correct",
    title: "Encontre as Cores",
    subtitle: "Uma nova aventura para aprender brincando!",
    instruction: "Toque na cor igual ao objeto!",
    prompt: "Qual cor combina com a maca?",
    image: "assets/missao/apple.webp",
    introImage: "assets/missao/hero-pedro.webp",
    resultImage: "assets/missao/result-pedro.webp",
    audioLabel: "Ouvir instrucao",
    hint: "Observe a cor principal do objeto.",
    reward: {
      xp: 20,
      medal: "Pequeno Explorador",
      medalImage: "assets/missao/medal-explorer.webp",
      starImage: "assets/missao/star-xp.webp",
      tree: { ...knowledgeTreeFixtures.pedro, xp: 145, missionsCompleted: 3, medals: ["explorer"] },
    },
    options: [
      { id: "red", label: "Vermelho", value: "red", image: "assets/missao/paint-red.webp", isCorrect: true },
      { id: "blue", label: "Azul", value: "blue", image: "assets/missao/paint-blue.webp", isCorrect: false },
      { id: "yellow", label: "Amarelo", value: "yellow", image: "assets/missao/paint-yellow.webp", isCorrect: false },
      { id: "green", label: "Verde", value: "green", image: "assets/missao/paint-green.webp", isCorrect: false },
    ],
    nextMission: {
      title: "Sons da Natureza",
      href: "#proxima-missao",
    },
  },
};

const missionEngine = {
  getInitialState(mission) {
    return {
      missionId: mission.id,
      status: mission.status || "available",
      selectedOptionId: mission.status === "correct" || mission.status === "completed" ? mission.options.find((option) => option.isCorrect)?.id : null,
      attempts: mission.status === "correct" || mission.status === "completed" ? 1 : 0,
      progress: mission.status === "completed" ? 100 : mission.status === "correct" ? 85 : mission.status === "in-progress" ? 45 : 0,
      reward: mission.status === "correct" || mission.status === "completed" ? mission.reward : null,
    };
  },
  answer(mission, currentState, optionId) {
    const option = mission.options.find((item) => item.id === optionId);
    const isCorrect = Boolean(option?.isCorrect);
    return {
      ...currentState,
      selectedOptionId: optionId,
      attempts: currentState.attempts + 1,
      status: isCorrect ? "correct" : "incorrect",
      progress: isCorrect ? 85 : Math.max(currentState.progress, 45),
      reward: isCorrect ? mission.reward : null,
    };
  },
  complete(mission, currentState) {
    return {
      ...currentState,
      status: "completed",
      progress: 100,
      reward: mission.reward,
    };
  },
  hint(currentState) {
    return {
      ...currentState,
      status: "hint",
      progress: Math.max(currentState.progress, 25),
    };
  },
};

const missionStateLabel = {
  available: "Missao disponivel",
  "in-progress": "Missao em andamento",
  correct: "Resposta correta",
  incorrect: "Resposta incorreta",
  hint: "Dica disponivel",
  completed: "Missao concluida",
  reward: "Recompensa liberada",
  next: "Proxima missao",
};

const missionImg = (src, alt, className = "") =>
  `<img${className ? ` class="${className}"` : ""} src="${src}" alt="${alt}" loading="lazy" decoding="async" />`;

const renderMissionProgress = (mission, state) => `
  <div class="mission-progress" role="group" aria-label="Progresso da missao">
    <div><strong>${mission.code}</strong><span>${missionStateLabel[state.status] || missionStateLabel.available}</span></div>
    <i role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${state.progress}" aria-label="Progresso da Missao do Dia"><span style="width:${state.progress}%"></span></i>
  </div>
`;

const renderAudioButton = (mission) => `
  <button class="mission-audio-button" type="button" data-mission-audio aria-label="${mission.audioLabel}">Som</button>
`;

const renderMissionOption = (option, state) => {
  const isSelected = state.selectedOptionId === option.id;
  const resultClass = isSelected ? (option.isCorrect ? " is-correct" : " is-incorrect") : "";
  return `
    <button class="mission-option${isSelected ? " is-selected" : ""}${resultClass}" type="button" data-mission-option="${option.id}" aria-label="${option.label}">
      ${missionImg(option.image, option.label)}
      <span>${option.label}</span>
    </button>
  `;
};

const renderMissionQuestion = (mission, state) => `
  <section class="mission-question" aria-labelledby="mission-question-title">
    <div class="mission-code">${mission.code}</div>
    <div class="mission-question-title">
      <h2 id="mission-question-title">${mission.title}</h2>
      ${renderAudioButton(mission)}
    </div>
    <p>${mission.instruction}</p>
    <figure>
      ${missionImg(mission.image, mission.prompt, "mission-object")}
      <figcaption>${mission.prompt}</figcaption>
    </figure>
    <div class="mission-options" role="group" aria-label="Opcoes de resposta">
      ${mission.options.map((option) => renderMissionOption(option, state)).join("")}
    </div>
  </section>
`;

const renderMissionReward = (mission, state) => `
  <section class="mission-reward" aria-label="Recompensas da missao">
    <article>${missionImg(mission.reward.starImage, "", "")}<strong>+${mission.reward.xp} XP</strong></article>
    <article>${missionImg(mission.reward.medalImage, "", "")}<div><span>Medalha conquistada!</span><strong>${mission.reward.medal}</strong></div></article>
    ${renderKnowledgeTreeCompact(mission.reward.tree, "mission-tree-reward")}
  </section>
`;

const renderMissionResult = (mission, state) => {
  const isPositive = state.status === "correct" || state.status === "completed";
  const title = isPositive ? "Muito bem!" : state.status === "hint" ? "Uma dica para voce!" : "Tente novamente";
  const message = isPositive ? "Voce encontrou a cor certa!" : state.status === "hint" ? mission.hint : "Observe a cor do objeto e escolha de novo.";
  return `
    <aside class="mission-result is-${state.status}" aria-live="polite">
      <div class="mission-result-ribbon">${title}</div>
      ${missionImg(mission.resultImage, "", "mission-result-art")}
      <p>${message}</p>
      ${isPositive ? renderMissionReward(mission, state) : ""}
      <div class="mission-result-actions">
        <a href="aluno.html">⌂ Voltar ao meu painel</a>
        <button type="button" data-mission-reset>↻ Tentar novamente</button>
      </div>
    </aside>
  `;
};

const renderMissionToolbar = (mission, state) => `
  <section class="mission-toolbar" aria-label="Ferramentas da missao">
    ${renderMissionProgress(mission, state)}
    <button type="button" data-mission-hint>💡 Dica</button>
    <button type="button" data-mission-complete>⭐ Concluir</button>
  </section>
`;

const renderMissionCard = (mission) => `
  <section class="mission-card" aria-label="Apresentacao da Missao do Dia">
    <div class="mission-card-ribbon">Missao do Dia</div>
    ${missionImg(mission.introImage, "", "mission-card-art")}
    <article class="mission-card-note">
      <h2>Vamos aprender juntos!</h2>
      <p>Ao completar a missao, voce ganha estrelas, XP e conquistas especiais!</p>
    </article>
  </section>
`;

const renderMissionPlayer = (mission) => {
  const state = missionEngine.getInitialState(mission);
  return `
    <div class="mission-module" data-mission-player data-mission-id="${mission.id}" data-mission-state='${JSON.stringify(state)}'>
      <header class="mission-header">
        <div><span>⭐</span><strong>Missao do Dia</strong><small>${mission.subtitle}</small></div>
        <aside class="mission-xp-chip"><span>⭐</span><strong>${studentDashboardData.profile.xp} XP</strong><small>${studentDashboardData.profile.level}</small>${studentLazyImg(studentDashboardData.profile.avatar, "", "")}</aside>
      </header>
      ${renderMissionToolbar(mission, state)}
      <div class="mission-layout">
        ${renderMissionCard(mission)}
        <main class="mission-player-panel">
          ${renderMissionQuestion(mission, state)}
        </main>
        ${renderMissionResult(mission, state)}
      </div>
    </div>
  `;
};

// Supabase-ready fallback view model. Replace this object with fetched records when the backend is connected.
const studentDashboardData = {
  tree: knowledgeTreeFixtures.pedro,
  profile: {
    name: "Pedro",
    greeting: "Que alegria ter voce aqui hoje!",
    avatar: "assets/aluno/avatar-pedro.webp",
    xp: 125,
    level: "Nivel 1",
    notifications: 3,
    progress: 24,
    heroArt: "assets/aluno/hero-arvore-livro.webp",
  },
  dailyMission: {
    code: "Missao 012",
    title: "A Caixa Misteriosa",
    description: "Ouca a dica, descubra o objeto e ganhe XP!",
    image: "assets/games/caixa-misteriosa/telas-assets.png",
    href: "jogos.html",
  },
  currentBook: {
    title: "Linguagem",
    subtitle: "Educacao Infantil 2 anos",
    progress: 45,
    cover: "assets/aluno/livro-linguagem.webp",
    href: "book-viewer.html?book=livro-mestre-001",
  },
  library: [
    { title: "Linguagem", cover: "assets/aluno/livro-biblioteca-linguagem.webp", href: "book-viewer.html?book=livro-mestre-001" },
    { title: "Matematica", cover: "assets/aluno/livro-biblioteca-matematica.webp", href: "book-viewer.html?book=livro-002" },
    { title: "Natureza e Sociedade", cover: "assets/aluno/livro-biblioteca-natureza.webp", href: "book-viewer.html?book=laboratorio-sensorial-002" },
    { title: "Caderno de Atividades", cover: "assets/aluno/livro-biblioteca-caderno.webp", href: "biblioteca.html" },
  ],
  xpGoal: {
    current: 125,
    target: 200,
    level: "Nivel 1",
    image: "assets/aluno/bau-xp.webp",
    nextText: "Conquiste mais 75 XP para alcancar o Nivel 2!",
  },
  medals: [
    { title: "Pequeno Explorador", image: "assets/aluno/medalha-explorador.webp" },
    { title: "Leitor Iniciante", image: "assets/aluno/medalha-leitor.webp" },
    { title: "Curioso por Natureza", image: "assets/aluno/medalha-curioso.webp" },
  ],
  evolution: {
    title: "Voce esta indo muito bem!",
    labels: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"],
    values: [22, 34, 48, 51, 62, 70, 86],
  },
  quickAccess: [
    { label: "Continuar Leitura", detail: "Retome onde parou", icon: "📖", href: "book-viewer.html?book=livro-mestre-001" },
    { label: "Minha Arvore", detail: "Veja seu crescimento", icon: "🌱", href: "arvore.html" },
    { label: "Jogos Digitais", detail: "Acesse as descobertas", icon: "▶", href: "jogos.html" },
    { label: "Explorar Biblioteca", detail: "Descubra novos livros", icon: "📚", href: "biblioteca.html" },
  ],
};

const studentLazyImg = (src, alt, className = "") =>
  `<img${className ? ` class="${className}"` : ""} src="${src}" alt="${alt}" loading="lazy" decoding="async" />`;

// Reusable student dashboard components. Each renderer receives data only, ready for Supabase records.
const renderStudentHero = ({ profile, tree }) => `
  <section class="student-hero" aria-label="Resumo do aluno">
    <div class="student-hero-copy">
      ${studentLazyImg(profile.avatar, "", "student-avatar")}
      <div>
        <h1>Ola, ${profile.name}! 👋</h1>
        <p>${profile.greeting}</p>
      </div>
    </div>
    ${studentLazyImg(profile.heroArt, "", "student-hero-art")}
    <div class="student-status">
      <span class="student-bell" aria-label="${profile.notifications} notificacoes">🔔<b>${profile.notifications}</b></span>
      <span class="student-xp-pill">⭐ <strong>${profile.xp} XP</strong><small>${profile.level}</small></span>
      ${renderKnowledgeTreeCompact(tree, "student-tree-widget")}
    </div>
  </section>
`;

const renderStudentMission = (mission) => `
  <section class="student-card student-mission-card" aria-labelledby="student-mission-title">
    <div class="student-card-head"><h2 id="student-mission-title">⭐ Missao do Dia</h2></div>
    <article>
      <div><small>${mission.code}</small><strong>${mission.title}</strong><p>${mission.description}</p></div>
      ${studentLazyImg(mission.image, "", "student-mission-art")}
    </article>
    <a class="student-primary-action" href="${mission.href}">Iniciar Missao <span>›</span></a>
  </section>
`;

const renderStudentCurrentBook = (book) => `
  <section class="student-card student-current-book" aria-labelledby="student-book-title">
    <div class="student-card-head"><h2 id="student-book-title">📖 Livro em andamento</h2></div>
    <article>
      ${studentLazyImg(book.cover, book.title, "student-book-cover")}
      <div>
        <h3>${book.title}</h3>
        <p>${book.subtitle}</p>
        <strong>${book.progress}% concluido</strong>
        <i><span style="width:${book.progress}%"></span></i>
      </div>
    </article>
    <a class="student-primary-action" href="${book.href}">Continuar Leitura <span>›</span></a>
  </section>
`;

const renderStudentLibrary = (books) => `
  <section class="student-card student-library-card" aria-labelledby="student-library-title">
    <div class="student-card-head"><h2 id="student-library-title">📚 Biblioteca</h2><a href="biblioteca.html">Ver tudo</a></div>
    <div class="student-book-strip">
      ${books.map((book) => `<a href="${book.href}" aria-label="Abrir ${book.title}">${studentLazyImg(book.cover, book.title)}</a>`).join("")}
    </div>
  </section>
`;

const renderStudentEvolution = (evolution) => {
  const points = evolution.values.map((value, index) => `${44 + index * 64},${126 - value}`).join(" ");
  const dots = evolution.values
    .map((value, index) => `<circle cx="${44 + index * 64}" cy="${126 - value}" r="5"></circle>`)
    .join("");
  const labels = evolution.labels.map((label) => `<span>${label}</span>`).join("");

  return `
    <section class="student-card student-evolution-card" aria-labelledby="student-evolution-title">
      <div class="student-card-head"><h2 id="student-evolution-title">↗ Minha Evolucao</h2></div>
      <p>${evolution.title}</p>
      <div class="student-chart" aria-hidden="true">
        <svg viewBox="0 0 440 150" role="img">
          <defs><linearGradient id="student-chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#8bcf6a" stop-opacity=".34" /><stop offset="1" stop-color="#8bcf6a" stop-opacity="0" /></linearGradient></defs>
          <polygon points="44,126 ${points} 428,126" fill="url(#student-chart-fill)"></polygon>
          <polyline points="${points}" fill="none" stroke="#0d6b4b" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></polyline>
          ${dots}
          <path d="M421 37l7 14 15 2-11 10 3 15-14-8-14 8 3-15-11-10 15-2z" fill="#f6c431" stroke="#d7a928" stroke-width="2"></path>
        </svg>
        <div>${labels}</div>
      </div>
    </section>
  `;
};

const renderStudentXp = (xpGoal) => {
  const percentage = Math.round((xpGoal.current / xpGoal.target) * 100);
  return `
    <section class="student-card student-xp-card" aria-labelledby="student-xp-title">
      <div class="student-card-head"><h2 id="student-xp-title">⭐ XP e Proximo Objetivo</h2></div>
      <article>
        <div><strong>${xpGoal.current} XP</strong><small>${xpGoal.level}</small></div>
        ${studentLazyImg(xpGoal.image, "", "student-xp-art")}
      </article>
      <div class="student-progress-line"><i><span style="width:${percentage}%"></span></i><b>${xpGoal.current} / ${xpGoal.target} XP</b></div>
      <p><strong>Proximo objetivo</strong>${xpGoal.nextText}</p>
    </section>
  `;
};

const renderStudentMedals = (medals) => `
  <section class="student-card student-medals-card" aria-labelledby="student-medals-title">
    <div class="student-card-head"><h2 id="student-medals-title">🏅 Medalhas</h2><a href="#conquistas">Ver todas</a></div>
    <div>
      ${medals
        .map((medal) => `<article>${studentLazyImg(medal.image, "", "student-medal-art")}<strong>${medal.title}</strong></article>`)
        .join("")}
    </div>
  </section>
`;

const renderStudentQuickAccess = (items) => `
  <section class="student-quick-grid" aria-label="Acessos rapidos">
    ${items
      .map((item) => `<a class="student-quick-card" href="${item.href}"><span>${item.icon}</span><strong>${item.label}</strong><small>${item.detail}</small></a>`)
      .join("")}
  </section>
`;

const modules = {
  aluno: {
    title: "Dashboard do Aluno",
    subtitle: "Home principal do aluno",
    code: "PLAT-V2-005",
    html: `
      <div class="student-dashboard" data-student-dashboard>
        <div class="student-skeleton" aria-hidden="true"></div>
        ${renderStudentHero(studentDashboardData)}
        <div class="student-grid">
          ${renderStudentMission(studentDashboardData.dailyMission)}
          ${renderStudentCurrentBook(studentDashboardData.currentBook)}
          ${renderStudentLibrary(studentDashboardData.library)}
          ${renderStudentEvolution(studentDashboardData.evolution)}
          ${renderStudentXp(studentDashboardData.xpGoal)}
          ${renderStudentMedals(studentDashboardData.medals)}
        </div>
        ${renderStudentQuickAccess(studentDashboardData.quickAccess)}
      </div>
    `,
  },
  arvore: {
    title: "Minha Arvore",
    subtitle: "Asset 010 - Arvore Viva",
    code: "PLAT-V2-006",
    html: renderKnowledgeTreeFull(knowledgeTreeFixtures.growing),
  },
  missao: {
    title: "Missao do Dia",
    subtitle: "Uma nova aventura para aprender brincando",
    code: "PLAT-V2-007",
    html: renderMissionPlayer(missionFixtures.colorMatch001),
  },
  jogos: {
    title: "Jogos Digitais",
    subtitle: "Motor de jogos da Educacao Infantil",
    code: "GAME-ENGINE-1.0",
    html: `
      <div class="screen-title">
        <p>GAME-ENGINE-1.0</p>
        <h1>A Caixa Misteriosa</h1>
        <span>Motor reutilizavel por configuracao para a biblioteca de jogos digitais.</span>
      </div>
      <div class="game-engine" data-game-engine data-game-id="caixa-misteriosa"></div>
      <section class="wide-panel">
        <div class="panel-head"><h2>Estrutura reutilizavel</h2><a>Sem alterar logica principal</a></div>
        <div class="class-grid">
          <article>GameRepository<span>Registra jogos e assets homologados</span></article>
          <article>ProgressController<span>Controla telas, rodadas e tempo</span></article>
          <article>RewardController<span>Persiste XP, medalhas e progresso</span></article>
          <article>AudioPlayer<span>Narracao, efeitos e volumes independentes</span></article>
        </div>
        <pre style="white-space:pre-wrap;margin:16px 0 0;padding:16px;border-radius:8px;background:#f8fbf1;color:#123827;font-weight:800;line-height:1.55">Novo jogo por configuracao:
{
  id: "sons-da-natureza",
  title: "Sons da Natureza",
  scenario: "Bosque",
  mascot: "Tito",
  rounds: [{ hint, narration, correctId, choices }],
  xp: 25,
  medal: "Guardiao da Natureza",
  assets: { atlas, library, scenarios }
}</pre>
      </section>
    `,
  },
  biblioteca: {
    title: "Biblioteca Digital",
    subtitle: "Sua jornada de conhecimento comeca aqui",
    code: "MS-001",
    html: `
      <div class="screen-title">
        <p>MS-001</p>
        <h1>Biblioteca Digital</h1>
        <span>Sua jornada de conhecimento comeca aqui</span>
      </div>
      <div class="library-grid">
        <section class="wide-panel">
          <div class="panel-head"><h2>Continuar Leitura</h2><a href="book-viewer.html">Ver todos</a></div>
          <div class="reading-row">
            ${buildRecentReadingCards()}
          </div>
        </section>
        <aside class="quick-card"><h2>Biblioteca Viva</h2><a>${publishedMaterialsCount} materiais publicados</a><a>Novidades da Semana</a><a>Destaque Curado</a><a>Colecoes em Expansao</a></aside>
        <section class="wide-panel living-library-panel">
          <div class="panel-head"><h2>Novidades da Semana</h2><a>${latestLibraryBooks.length} publicados</a></div>
          <div class="latest-materials-grid">
            ${buildLatestMaterialsCards()}
          </div>
        </section>
        ${buildFeaturedBookCard()}
        <section class="wide-panel">
          <div class="panel-head"><h2>Colecoes</h2><a>Ver todos</a></div>
          <div class="collection-showcase-grid">
            ${collectionShowcaseCardsHtml}
          </div>
        </section>
        <aside class="ecosystem-video-card">
          <span>🎬</span>
          <h2>Conheca o Ecossistema</h2>
          <p>Assista ao video institucional e veja como os modulos se conectam em uma experiencia unica.</p>
          <a href="index.html#video-institucional">Assistir video</a>
        </aside>
        <section class="wide-panel recent-books library-catalog-panel" id="acervo-completo">
          <div class="panel-head"><h2>Ultimos Materiais</h2><a>${publishedMaterialsCount} materiais</a></div>
          <div class="library-catalog">${libraryBookCards}</div>
        </section>
      </div>
    `,
  },
  universidade: {
    title: "Universidade Raizes e Saberes",
    subtitle: "Formacao que transforma",
    code: "MS-008",
    html: `
      <div class="university-platform" data-university-platform>
        <section class="university-platform-hero">
          <div>
            <span>Universidade Raizes e Saberes</span>
            <h1>Bem-vinda de volta, Ana Carolina!</h1>
            <p>Seu aprendizado transforma voce, sua escola e o futuro.</p>
            <button type="button" data-complete-university-lesson>Continuar Aprendendo</button>
          </div>
          <img class="university-hero-art" src="assets/universidade/banner-principal.webp" alt="" aria-hidden="true" />
        </section>

        <aside class="university-progress-card">
          <h2>Seu Progresso Geral</h2>
          <div class="university-progress-ring"><strong>78%</strong></div>
          <p>Voce esta indo <strong>muito bem!</strong></p>
          <i><span style="width: 78%"></span></i>
          <small>12 cursos concluidos</small>
        </aside>

        <aside class="university-achievement-card">
          <article><span><img src="assets/universidade/icone-certificado.webp" alt="" /></span><strong>7</strong><small>Certificados Conquistados</small><a href="#">Ver certificados</a></article>
          <article><span><img src="assets/universidade/icone-horas.webp" alt="" /></span><strong>120 h</strong><small>Horas de Formacao</small><a href="#">Ver historico</a></article>
        </aside>

        <section class="university-card university-trails-card span-2">
          <div class="university-card-head"><h2>Trilhas de Aprendizagem</h2><a href="#">Ver todas</a></div>
          <div class="university-trail-strip">
            <article><img src="assets/universidade/trilha-praticas-pedagogicas.webp" alt="" /><strong>Praticas Pedagogicas</strong><small>12 cursos</small></article>
            <article><img src="assets/universidade/trilha-inclusao-diversidade.webp" alt="" /><strong>Inclusao e Diversidade</strong><small>10 cursos</small></article>
            <article><img src="assets/universidade/trilha-tecnologias.webp" alt="" /><strong>Tecnologias Educacionais</strong><small>8 cursos</small></article>
            <article><img src="assets/universidade/trilha-gestao.webp" alt="" /><strong>Gestao Escolar e Lideranca</strong><small>9 cursos</small></article>
            <article><img src="assets/universidade/trilha-socioemocional.webp" alt="" /><strong>Socioemocional e Convivencia</strong><small>7 cursos</small></article>
          </div>
        </section>

        <section class="university-card university-current-course" id="curso-relacionado">
          <div class="university-card-head"><h2>Meus Cursos em Andamento</h2><a href="#">Ver todos</a></div>
          <div class="current-course-body">
            <img class="course-portrait" src="assets/universidade/curso-educacao-inclusiva.webp" alt="" />
            <div>
              <h3>Educacao Inclusiva: Praticas que Acolhem</h3>
              <div class="course-progress-line"><i><span style="width: 65%"></span></i><strong>65%</strong></div>
              <button type="button" data-complete-university-lesson>Continuar Curso</button>
              <aside class="ecosystem-link-panel university-material-link">
                <span>📚 ${relatedMaterial.label}</span>
                <strong>${relatedMaterial.title}</strong>
                <p>${relatedMaterial.description}</p>
                <a href="${relatedMaterial.href}">Abrir no Book Viewer</a>
              </aside>
            </div>
          </div>
        </section>

        <section class="university-card university-next-courses">
          <div class="university-card-head"><h2>Proximos Cursos</h2></div>
          <article><strong>Avaliacao Formativa na Pratica</strong><small>Inicio: 15/06/2025</small><span>□</span></article>
          <article><strong>Neurociencia e Aprendizagem</strong><small>Inicio: 22/06/2025</small><span>□</span></article>
          <a href="#">Ver agenda completa</a>
        </section>

        <section class="university-card university-teacher-card">
          <div class="university-card-head"><h2>Professor em Destaque</h2></div>
          <div class="teacher-highlight">
            <img src="assets/universidade/professor-ricardo-mendes.webp" alt="" />
            <div><strong>Prof. Ricardo Mendes</strong><p>Doutor em Educacao. Especialista em praticas inovadoras e gestao pedagogica.</p><a href="#">Ver perfil</a></div>
          </div>
        </section>

        <section class="university-card university-video-card span-2">
          <div class="university-card-head"><h2>Videoaulas em Destaque</h2><a href="#">Ver todas</a></div>
          <div class="university-video-grid">
            <article><img src="assets/universidade/video-acolhimento.webp" alt="" /><strong>Acolhimento e Escuta Ativa na Escola</strong></article>
            <article><img src="assets/universidade/video-planejamento.webp" alt="" /><strong>Planejamento com Foco na Aprendizagem</strong></article>
            <article><img src="assets/universidade/video-tecnologias.webp" alt="" /><strong>Tecnologias que Transformam</strong></article>
          </div>
        </section>

        <section class="university-card university-materials-card">
          <div class="university-card-head"><h2>Materiais Complementares</h2><a href="#">Ver todos</a></div>
          <article><img src="assets/universidade/material-pdf.webp" alt="" /><strong>Guia Pratico da BNCC</strong><small>PDF - 2.4 MB</small></article>
          <article><img src="assets/universidade/material-checklist.webp" alt="" /><strong>Checklist de Planejamento</strong><small>PDF - 1.1 MB</small></article>
          <article><img src="assets/universidade/material-doc.webp" alt="" /><strong>Modelo de Plano de Aula</strong><small>DOCX - 880 KB</small></article>
        </section>

        <section class="university-card university-assessments-card">
          <div class="university-card-head"><h2>Avaliacoes</h2><a href="#">Ver todas</a></div>
          <article><strong>Avaliacao: Inclusao Escolar</strong><small>Concluida</small><span class="done">✓</span></article>
          <article><strong>Avaliacao: Metodologias Ativas</strong><small>Em andamento</small><span></span></article>
          <article><strong>Avaliacao: Gestao da Sala de Aula</strong><small>Pendente</small><span></span></article>
        </section>
      </div>
    `,
  },
  viewer: {
    title: "Book Viewer",
    subtitle: `${activeBook.title} - ${activeBook.subtitle}`,
    code: "MS-002",
    html: `
      <div class="book-reader" data-book-reader data-total-pages="${activeBook.totalPages}">
        <header class="reader-header">
          <a class="reader-back" href="biblioteca.html">&larr; Biblioteca</a>
          <div>
            <p>${activeBook.collection}</p>
            <h1>${activeBook.title}</h1>
            <span>${activeBook.subtitle}</span>
          </div>
          <div class="reader-progress" aria-label="Progresso de leitura">
            <strong data-progress-label>1%</strong>
            <i><span data-progress-bar style="width: 1%"></span></i>
          </div>
        </header>

        <div class="reader-layout">
          <aside class="page-rail reader-rail" aria-label="Miniaturas das paginas">
            <div class="rail-title"><h2>Paginas</h2><span data-page-count>1/${activeBook.totalPages}</span></div>
            <div class="thumbnail-list" data-thumbnail-list></div>
          </aside>

          <section class="book-stage" data-book-stage aria-live="polite">
            <button class="reader-turn previous" type="button" data-prev-page aria-label="Pagina anterior">&lsaquo;</button>
            <figure class="reader-page" data-reader-page style="--zoom: 1">
              <img data-page-image src="${activeBook.page(1)}" alt="${activeBook.title} pagina 1" loading="eager" />
            </figure>
            <button class="reader-turn next" type="button" data-next-page aria-label="Proxima pagina">&rsaquo;</button>
          </section>

          <aside class="summary-rail reader-summary" aria-label="Sumario do livro">
            <div class="rail-title"><h2>Sumario</h2><button type="button" data-bookmark-page>&#9734; Marcar</button></div>
            <div class="summary-list" data-summary-list></div>
          </aside>
        </div>

        <div class="viewer-controls reader-controls">
          <button type="button" data-zoom-out aria-label="Reduzir zoom">&minus;</button>
          <span data-zoom-label>100%</span>
          <button type="button" data-zoom-in aria-label="Aumentar zoom">+</button>
          <button type="button" data-prev-page aria-label="Pagina anterior">&lsaquo;</button>
          <strong data-page-label>1 / ${activeBook.totalPages}</strong>
          <button type="button" data-next-page aria-label="Proxima pagina">&rsaquo;</button>
          <button type="button" data-fullscreen-reader aria-label="Tela cheia">[]</button>
        </div>
        <section class="continue-exploring-panel">
          <div>
            <span>Continue Explorando</span>
            <h2>${suggestedBook.catalogTitle}</h2>
            <p>${suggestedBook.level} &middot; ${suggestedBook.type}</p>
          </div>
          <a href="${suggestedBook.href}">Abrir sugestao</a>
        </section>
        ${
          relatedCourse
            ? `
              <section class="ecosystem-link-panel reader-course-link">
                <div>
                  <span>🎓 ${relatedCourse.label}</span>
                  <h2>${relatedCourse.title}</h2>
                  <p>${relatedCourse.lesson}</p>
                </div>
                <a href="${relatedCourse.href}">Abrir aula</a>
              </section>
            `
            : ""
        }
      </div>
    `,
  },
  professor: {
    title: "Painel do Professor",
    subtitle: "Que bom te ver por aqui. Vamos transformar o dia dos nossos alunos.",
    code: "MS-003",
    html: `
      <div class="dashboard-head"><div><p>MS-003</p><h1>Ola, Professor Marcos!</h1><span>Que bom te ver por aqui. Vamos transformar o dia dos nossos alunos.</span></div></div>
      <div class="teacher-layout">
        <section class="panel"><div class="panel-head"><h2>Minhas Turmas</h2><a>Ver todas</a></div><div class="class-grid"><article>4º Ano A<span>28 alunos</span></article><article>5º Ano B<span>27 alunos</span></article><article>6º Ano A<span>30 alunos</span></article><article>3º Ano C<span>25 alunos</span></article></div></section>
        <section class="panel span-2"><div class="panel-head"><h2>Planejamento Semanal</h2><a>Ver semana completa</a></div><div class="week-grid"><article>Seg 20<strong>Matematica</strong><span>8h - 9h40</span></article><article>Ter 21<strong>Portugues</strong><span>8h - 9h40</span></article><article class="today">Qua 22<strong>Geografia</strong><span>8h - 9h40</span></article><article>Qui 23<strong>Ciencias</strong><span>10h - 11h40</span></article><article>Sex 24<strong>Ed. Fisica</strong><span>10h - 11h40</span></article></div></section>
        <section class="panel"><h2>Proximas Aulas</h2><ul class="clean-list"><li>Geografia <span>Hoje - 8h00</span></li><li>Arte <span>Hoje - 10h00</span></li><li>Matematica <span>Amanha - 8h00</span></li></ul></section>
        <section class="panel"><h2>Atividades Pendentes</h2><ul class="clean-list"><li>Atividade de Matematica <span>15 entregas</span></li><li>Leitura e Interpretacao <span>8 entregas</span></li><li>Experimento: Ciclo da Agua <span>12 entregas</span></li></ul></section>
        <section class="panel chart-card"><h2>Correcoes</h2><div class="donut">68%</div><strong>24</strong><span>Atividades para corrigir</span></section>
        <section class="panel book-mini"><h2>Biblioteca Integrada</h2><img src="assets/biblioteca/RAIZES_INFANTIL5_VOL1_BIBLIOTECA.webp" alt="" /><div><strong>Ciencias</strong><span>4º Ano</span><button>Continuar leitura</button></div></section>
      </div>
    `,
  },
  avalia: {
    title: "Avalia+",
    subtitle: "Inteligencia em avaliacao",
    code: "MS-004",
    html: `
      <div class="dashboard-head blue"><div><p>MS-004</p><h1>AVALIA+</h1><span>Inteligencia em avaliacao</span></div></div>
      <div class="metric-row"><article>Participacoes<strong>18.742</strong><span>95,4%</span></article><article>Desempenho Medio<strong>72,6%</strong><span>▲ 6,3 p.p.</span></article><article>Acertos<strong>16.842</strong><span>▲ 8,7%</span></article><article>Aprendizado Adequado<strong>68,4%</strong><span>▲ 7,1 p.p.</span></article><article>Atencao Especial<strong>24,8%</strong><span>▼ 3,2 p.p.</span></article><article>Critico<strong>6,8%</strong><span>▼ 3,9 p.p.</span></article></div>
      <div class="analytics-grid">
        <section class="panel span-2"><h2>Evolucao da Aprendizagem</h2><div class="line-chart blue-line"></div></section>
        <section class="panel"><h2>Desempenho por Disciplina</h2><div class="bar-list blue-bars"><p>Lingua Portuguesa<i style="--value:78%"></i></p><p>Matematica<i style="--value:71%"></i></p><p>Ciencias<i style="--value:69%"></i></p><p>Historia<i style="--value:66%"></i></p><p>Geografia<i style="--value:65%"></i></p></div></section>
        <section class="panel chart-card"><h2>Niveis de Aprendizagem</h2><div class="donut">18.742</div><ul class="legend"><li>Adequado 68,4%</li><li>Basico 24,8%</li><li>Critico 6,8%</li></ul></section>
        <section class="panel span-2"><h2>Diagnosticos</h2><table><tr><td>EF04LP01</td><td>82,1%</td><td>Adequado</td></tr><tr><td>EF04MA05</td><td>71,4%</td><td>Basico</td></tr><tr><td>EF04CI03</td><td>68,7%</td><td>Basico</td></tr></table></section>
        <section class="panel"><h2>Atividades Recentes</h2><ul class="clean-list"><li>Avaliacao de Matematica</li><li>Diagnostico de Leitura</li><li>Avaliacao de Ciencias</li></ul></section>
      </div>
    `,
  },
  secretaria: {
    title: "Secretaria Municipal",
    subtitle: "Acompanhe os principais indicadores da educacao municipal",
    code: "MS-005",
    html: `
      <div class="dashboard-head"><div><p>MS-005</p><h1>Visao Geral da Rede</h1><span>Acompanhe os principais indicadores da educacao municipal</span></div></div>
      <div class="metric-row"><article>Estudantes<strong>24.875</strong><span>95,2%</span></article><article>Escolas<strong>58</strong><span>100%</span></article><article>Professores<strong>1.482</strong><span>97,5%</span></article><article>Desempenho Medio<strong>72,6%</strong><span>▲ 6,3 p.p.</span></article><article>Frequencia Media<strong>94,1%</strong><span>▲ 2,4 p.p.</span></article><article>IDEB Projetado<strong>6,1</strong><span>▲ 0,3</span></article></div>
      <div class="analytics-grid secretaria-grid">
        <section class="panel span-2"><h2>Evolucao do Desempenho da Rede</h2><div class="line-chart"></div></section>
        <section class="panel"><h2>Desempenho por Etapa de Ensino</h2><div class="bar-list"><p>Educacao Infantil<i style="--value:86%"></i></p><p>Anos Iniciais<i style="--value:74%"></i></p><p>Anos Finais<i style="--value:67%"></i></p><p>Ensino Medio<i style="--value:61%"></i></p></div></section>
        <section class="panel map-card"><h2>IDEB por Escola</h2><div class="map-shape"></div></section>
        <section class="panel"><h2>Ranking de Escolas</h2><ol class="rank-list"><li>EM Professor Olavo Bilac <span>86,9%</span></li><li>EMEF Monteiro Lobato <span>83,2%</span></li><li>EM Vereador Joao Lima <span>80,7%</span></li></ol></section>
        <section class="panel chart-card"><h2>Frequencia da Rede</h2><div class="donut">94,1%</div></section>
        <section class="panel"><h2>Alertas e Acompanhamentos</h2><ul class="clean-list"><li>5 escolas com desempenho abaixo de 50%</li><li>12 escolas com frequencia abaixo de 85%</li><li>8 escolas com queda no desempenho</li></ul></section>
      </div>
    `,
  },
  gestor: {
    title: "Gestor Escolar",
    subtitle: "Escola Municipal Joao da Silva",
    code: "MS-006",
    html: `
      <div class="dashboard-head"><div><p>MS-006</p><h1>Painel do Gestor Escolar</h1><span>Escola Municipal Joao da Silva</span></div></div>
      <div class="metric-row"><article>Estudantes<strong>582</strong><span>Ativos</span></article><article>Turmas<strong>23</strong><span>Ativas</span></article><article>Professores<strong>41</strong><span>Ativos</span></article><article>Desempenho Medio<strong>72,6%</strong><span>▲ 6,3 p.p.</span></article><article>Frequencia Media<strong>94,1%</strong><span>▲ 2,4 p.p.</span></article><article>Avalia+ Participacao<strong>92,3%</strong><span>▲ 4,1 p.p.</span></article></div>
      <div class="analytics-grid">
        <section class="panel"><h2>Desempenho por Etapa</h2><div class="column-chart"></div></section>
        <section class="panel"><h2>Desempenho por Turma</h2><div class="bar-list"><p>6º Ano A<i style="--value:76%"></i></p><p>6º Ano B<i style="--value:72%"></i></p><p>7º Ano A<i style="--value:69%"></i></p><p>8º Ano A<i style="--value:74%"></i></p></div></section>
        <section class="panel chart-card"><h2>Frequencia por Turma</h2><div class="donut">94,1%</div></section>
        <section class="panel"><h2>Alertas Pedagogicos</h2><ul class="clean-list"><li>5 turmas com desempenho abaixo de 60%</li><li>12 estudantes com baixa frequencia</li><li>3 atividades atrasadas</li></ul></section>
        <section class="panel span-2"><h2>Biblioteca Digital</h2><div class="book-strip small"><img src="assets/biblioteca/RAIZES_INFANTIL3_VOL1_BIBLIOTECA.webp" alt="" /><img src="assets/biblioteca/RAIZES_INFANTIL4_VOL1_BIBLIOTECA.webp" alt="" /><img src="assets/biblioteca/RAIZES_INFANTIL5_VOL1_BIBLIOTECA.webp" alt="" /></div></section>
        <section class="panel"><h2>Atalhos Rapidos</h2><div class="shortcut-grid"><button>Lancar Frequencia</button><button>Registrar Atividade</button><button>Plano de Aula</button><button>Relatorios</button></div></section>
      </div>
    `,
  },
  familia: {
    title: "Painel da Familia",
    subtitle: "Acompanhe a jornada escolar dos seus filhos",
    code: "MS-007",
    html: `
      <div class="dashboard-head family"><div><p>MS-007</p><h1>Ola, Ana Paula!</h1><span>Acompanhe a jornada escolar dos seus filhos</span></div></div>
      <div class="family-grid">
        <section class="panel span-2"><div class="panel-head"><h2>Meus Filhos</h2><a>Ver todos</a></div><div class="child-row"><article><span>Pedro Silva</span><strong>95,2%</strong><i style="--value:95%"></i></article><article><span>Maria Silva</span><strong>92,1%</strong><i style="--value:92%"></i></article></div></section>
        <section class="family-banner">Acompanhe cada conquista.<br />Participe de cada passo.</section>
        <section class="panel chart-card"><h2>Frequencia dos Filhos</h2><div class="donut">93,6%</div></section>
        <section class="panel span-2"><h2>Evolucao da Aprendizagem</h2><div class="bar-list"><p>Lingua Portuguesa<i style="--value:85%"></i></p><p>Matematica<i style="--value:92%"></i></p><p>Ciencias<i style="--value:80%"></i></p><p>Historia<i style="--value:78%"></i></p></div></section>
        <section class="panel"><h2>Alertas Importantes</h2><ul class="clean-list"><li>Reuniao de Pais e Mestres</li><li>Entrega de atividades</li><li>Comunicado da escola</li></ul></section>
        <section class="panel"><h2>Proximos Eventos</h2><ul class="clean-list"><li>Passeio Pedagogico</li><li>Avaliacao de Matematica</li><li>Entrega de Boletins</li></ul></section>
      </div>
    `,
  },
};

const environments = {
  aluno: {
    label: "Aluno",
    profile: "Aprendizagem",
    search: "Buscar livros, missoes, atividades...",
    user: "Pedro<br />Nivel 1 - 125 XP",
    avatar: "assets/aluno/avatar-pedro.webp",
    profileImage: "logo-sidebar-dark.png",
    nav: [
      ["aluno", "Inicio", "aluno.html"],
      ["arvore", "Minha Arvore", "arvore.html"],
      ["biblioteca", "Biblioteca", "biblioteca.html"],
      ["missao", "Missao do Dia", "missao.html"],
      ["jogos", "Jogos Digitais", "jogos.html"],
      ["conquistas", "Minhas Conquistas", "#conquistas"],
      ["atividades", "Atividades", "#atividades"],
      ["mensagens", "Mensagens", "#mensagens"],
      ["configuracoes", "Configuracoes", "#configuracoes"],
    ],
    mobile: [
      ["aluno", "Inicio", "aluno.html"],
      ["arvore", "Arvore", "arvore.html"],
      ["biblioteca", "Biblioteca", "biblioteca.html"],
      ["missao", "Missao", "missao.html"],
      ["jogos", "Jogos", "jogos.html"],
      ["conquistas", "Conquistas", "#conquistas"],
    ],
  },
  biblioteca: {
    label: "Biblioteca Digital",
    profile: "Acervo Educacional",
    search: "Buscar livros, colecoes, disciplinas...",
    user: "Ola, Professor<br />Marcos Silva",
    nav: [
      ["biblioteca", "Biblioteca Digital", "biblioteca.html"],
      ["viewer", "Book Viewer", "book-viewer.html"],
      ["recentes", "Livros Recentes", "#"],
      ["favoritos", "Favoritos", "#"],
      ["colecoes", "Colecoes", "#"],
    ],
    mobile: [
      ["biblioteca", "Biblioteca", "biblioteca.html"],
      ["viewer", "Livro", "book-viewer.html"],
      ["recentes", "Recentes", "#"],
      ["favoritos", "Favoritos", "#"],
      ["colecoes", "Colecoes", "#"],
    ],
  },
  universidade: {
    label: "Universidade",
    profile: "Formacao que Transforma",
    search: "Buscar cursos, trilhas, temas...",
    user: "Ana Carolina<br />Nivel 3 - 1.250 XP",
    avatar: "assets/universidade/avatar-ana-carolina.webp",
    profileImage: "logo-sidebar-dark.png",
    nav: [
      ["universidade", "Inicio", "universidade.html"],
      ["trilhas", "Trilhas de Aprendizagem", "#"],
      ["cursos", "Meus Cursos", "#"],
      ["certificados", "Certificados", "#"],
      ["biblioteca", "Biblioteca", "biblioteca.html"],
      ["videoaulas", "Videoaulas", "#"],
      ["avaliacoes", "Avaliacoes", "#"],
      ["comunidade", "Comunidade", "#"],
      ["eventos", "Eventos", "#"],
      ["favoritos", "Favoritos", "#"],
    ],
    mobile: [
      ["universidade", "Inicio", "universidade.html"],
      ["trilhas", "Trilhas", "#"],
      ["cursos", "Meus Cursos", "#"],
      ["certificados", "Certificados", "#"],
      ["biblioteca", "Biblioteca", "biblioteca.html"],
    ],
  },
  professor: {
    label: "Painel do Professor",
    profile: "Professor",
    search: "Buscar turmas, alunos, atividades, livros...",
    user: "Prof. Marcos Silva<br />Ver perfil",
    nav: [
      ["professor", "Inicio", "professor.html"],
      ["turmas", "Turmas", "#"],
      ["planejamento", "Planejamento", "#"],
      ["aulas", "Aulas", "#"],
      ["atividades", "Atividades", "#"],
      ["avaliacoes", "Avaliacoes", "#"],
      ["correcoes", "Correcoes", "#"],
      ["biblioteca", "Biblioteca Digital", "biblioteca.html"],
      ["mensagens", "Mensagens", "#"],
      ["relatorios", "Relatorios", "#"],
    ],
    mobile: [
      ["professor", "Inicio", "professor.html"],
      ["turmas", "Turmas", "#"],
      ["atividades", "Atividades", "#"],
      ["biblioteca", "Biblioteca", "biblioteca.html"],
      ["mensagens", "Mais", "#"],
    ],
  },
  avalia: {
    label: "Avalia+",
    profile: "Inteligencia em Avaliacao",
    search: "Buscar diagnosticos, disciplinas, turmas...",
    user: "Prof. Marcos Silva<br />Gestor Escolar",
    nav: [
      ["avalia", "Visao Geral", "avalia.html"],
      ["diagnosticos", "Diagnosticos", "#"],
      ["evolucao", "Evolucao", "#"],
      ["comparativos", "Comparativos", "#"],
      ["turmas", "Turmas", "#"],
      ["escolas", "Escolas", "#"],
      ["disciplinas", "Disciplinas", "#"],
      ["relatorios", "Relatorios", "#"],
      ["banco", "Banco de Itens", "#"],
    ],
    mobile: [
      ["avalia", "Inicio", "avalia.html"],
      ["diagnosticos", "Diagnosticos", "#"],
      ["turmas", "Turmas", "#"],
      ["relatorios", "Relatorios", "#"],
      ["mais", "Mais", "#"],
    ],
  },
  secretaria: {
    label: "Secretaria Municipal",
    profile: "Gestao 2025 - 2028",
    search: "Buscar escolas, indicadores, relatorios...",
    user: "Secretaria Ana Paula<br />Secretaria de Educacao",
    nav: [
      ["secretaria", "Visao Geral da Rede", "secretaria.html"],
      ["escolas", "Escolas", "#"],
      ["indicadores", "Indicadores", "#"],
      ["desempenho", "Desempenho", "#"],
      ["avalia", "Avalia+", "avalia.html"],
      ["frequencia", "Frequencia", "#"],
      ["ideb", "IDEB", "#"],
      ["relatorios", "Relatorios", "#"],
      ["comparativos", "Comparativos", "#"],
      ["planejamento", "Planejamento", "#"],
    ],
    mobile: [
      ["secretaria", "Inicio", "secretaria.html"],
      ["indicadores", "Indicadores", "#"],
      ["escolas", "Escolas", "#"],
      ["avalia", "Avalia+", "avalia.html"],
      ["mais", "Mais", "#"],
    ],
  },
  gestor: {
    label: "Gestor Escolar",
    profile: "EM Joao da Silva",
    search: "Buscar alunos, professores, turmas...",
    user: "Carlos Oliveira<br />Gestor Escolar",
    nav: [
      ["gestor", "Visao Geral", "gestor.html"],
      ["turmas", "Turmas", "#"],
      ["desempenho", "Desempenho", "#"],
      ["frequencia", "Frequencia", "#"],
      ["avalia", "Avalia+", "avalia.html"],
      ["professores", "Professores", "#"],
      ["alunos", "Alunos", "#"],
      ["planejamento", "Planejamento", "#"],
      ["comunicados", "Comunicados", "#"],
      ["agenda", "Agenda", "#"],
      ["relatorios", "Relatorios", "#"],
    ],
    mobile: [
      ["gestor", "Inicio", "gestor.html"],
      ["turmas", "Turmas", "#"],
      ["desempenho", "Desempenho", "#"],
      ["relatorios", "Relatorios", "#"],
      ["mais", "Mais", "#"],
    ],
  },
  familia: {
    label: "Painel da Familia",
    profile: "Responsavel",
    search: "Buscar comunicados, atividades, agenda...",
    user: "Ana Paula Silva<br />Responsavel",
    nav: [
      ["familia", "Inicio", "familia.html"],
      ["filhos", "Meus Filhos", "#"],
      ["frequencia", "Frequencia", "#"],
      ["atividades", "Atividades", "#"],
      ["avaliacoes", "Avaliacoes", "#"],
      ["biblioteca", "Biblioteca Digital", "biblioteca.html"],
      ["agenda", "Agenda Escolar", "#"],
      ["comunicados", "Comunicados", "#"],
      ["mensagens", "Mensagens", "#"],
      ["financeiro", "Financeiro", "#"],
    ],
    mobile: [
      ["familia", "Inicio", "familia.html"],
      ["filhos", "Filhos", "#"],
      ["atividades", "Atividades", "#"],
      ["mensagens", "Mensagens", "#"],
      ["mais", "Mais", "#"],
    ],
  },
};

const moduleEnvironment = {
  aluno: "aluno",
  arvore: "aluno",
  missao: "aluno",
  jogos: "aluno",
  biblioteca: "biblioteca",
  viewer: "biblioteca",
  universidade: "universidade",
  professor: "professor",
  avalia: "avalia",
  secretaria: "secretaria",
  gestor: "gestor",
  familia: "familia",
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const initBookReader = () => {
  const reader = document.querySelector("[data-book-reader]");
  if (!reader) {
    return;
  }

  const book = activeBook;
  const storageKey = `${book.id}:bookmark`;
  const image = reader.querySelector("[data-page-image]");
  const pageFrame = reader.querySelector("[data-reader-page]");
  const thumbnailList = reader.querySelector("[data-thumbnail-list]");
  const summaryList = reader.querySelector("[data-summary-list]");
  const pageLabel = reader.querySelector("[data-page-label]");
  const pageCount = reader.querySelector("[data-page-count]");
  const progressLabel = reader.querySelector("[data-progress-label]");
  const progressBar = reader.querySelector("[data-progress-bar]");
  const zoomLabel = reader.querySelector("[data-zoom-label]");
  const bookmarkButton = reader.querySelector("[data-bookmark-page]");
  const stage = reader.querySelector("[data-book-stage]");
  const pageTemplate = document.createDocumentFragment();

  const readerParams = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const hasRequestedPage = readerParams.has("page");
  const requestedPage = hasRequestedPage ? Number(readerParams.get("page")) || 1 : 1;
  let page = clamp(requestedPage, 1, book.totalPages);
  let zoom = 1;
  let bookmarkedPage = Number(localStorage.getItem(storageKey)) || 0;
  const preloadedPages = new Set();
  updateRecentBook(book.id);

  for (let currentPage = 1; currentPage <= book.totalPages; currentPage += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.gotoPage = String(currentPage);
    button.setAttribute("aria-label", `Abrir pagina ${currentPage}`);
    button.innerHTML = `<img src="${book.thumb(currentPage)}" alt="" loading="lazy" /><span>${currentPage}</span>`;
    pageTemplate.appendChild(button);
  }
  thumbnailList.appendChild(pageTemplate);

  summaryList.innerHTML = book.summary
    .map(
      ([label, summaryPage]) => `
        <button type="button" data-goto-page="${summaryPage}">
          <strong>${label}</strong>
          <span>${summaryPage}</span>
        </button>
      `
    )
    .join("");

  const preload = (targetPage) => {
    if (targetPage < 1 || targetPage > book.totalPages || preloadedPages.has(targetPage)) {
      return;
    }
    const preloadImage = new Image();
    preloadImage.src = book.page(targetPage);
    preloadedPages.add(targetPage);
  };

  const updateBookmark = () => {
    if (!bookmarkButton) {
      return;
    }
    const isCurrent = bookmarkedPage === page;
    bookmarkButton.classList.toggle("is-active", isCurrent);
    bookmarkButton.innerHTML = `${isCurrent ? "*" : "&#9734;"} ${isCurrent ? "Marcado" : "Marcar"}`;
  };

  const updateActiveItems = () => {
    reader.querySelectorAll("[data-goto-page]").forEach((button) => {
      const targetPage = Number(button.dataset.gotoPage);
      const isExact = targetPage === page;
      const isSummary = button.closest(".summary-list");
      const nextSummaryPage = isSummary
        ? book.summary.find(([, summaryPage]) => summaryPage > targetPage)?.[1] || book.totalPages + 1
        : targetPage + 1;
      const isInSection = isSummary && page >= targetPage && page < nextSummaryPage;
      button.classList.toggle("is-active", isExact || isInSection);
    });
  };

  const renderPage = (nextPage) => {
    page = clamp(nextPage, 1, book.totalPages);
    image.classList.add("is-loading");
    image.src = book.page(page);
    image.alt = `${book.title} pagina ${page}`;

    const progress = Math.round((page / book.totalPages) * 100);
    pageLabel.textContent = `${page} / ${book.totalPages}`;
    pageCount.textContent = `${page}/${book.totalPages}`;
    progressLabel.textContent = `${progress}%`;
    progressBar.style.width = `${progress}%`;
    localStorage.setItem(`${book.id}:lastPage`, String(page));
    updateActiveItems();
    updateBookmark();
    preload(page + 1);
    preload(page + 2);
    preload(page - 1);
  };

  const setZoom = (nextZoom) => {
    zoom = clamp(nextZoom, 0.75, 1.65);
    pageFrame.style.setProperty("--zoom", zoom.toFixed(2));
    zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
  };

  reader.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) {
      return;
    }
    if (target.dataset.gotoPage) {
      renderPage(Number(target.dataset.gotoPage));
      return;
    }
    if (target.matches("[data-prev-page]")) {
      renderPage(page - 1);
      return;
    }
    if (target.matches("[data-next-page]")) {
      renderPage(page + 1);
      return;
    }
    if (target.matches("[data-zoom-out]")) {
      setZoom(zoom - 0.1);
      return;
    }
    if (target.matches("[data-zoom-in]")) {
      setZoom(zoom + 0.1);
      return;
    }
    if (target.matches("[data-bookmark-page]")) {
      bookmarkedPage = bookmarkedPage === page ? 0 : page;
      if (bookmarkedPage) {
        localStorage.setItem(storageKey, String(bookmarkedPage));
      } else {
        localStorage.removeItem(storageKey);
      }
      updateBookmark();
      return;
    }
    if (target.matches("[data-fullscreen-reader]") && stage?.requestFullscreen) {
      stage.requestFullscreen();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!reader.isConnected) {
      return;
    }
    if (event.key === "ArrowLeft") {
      renderPage(page - 1);
    }
    if (event.key === "ArrowRight") {
      renderPage(page + 1);
    }
  });

  image.addEventListener("load", () => {
    image.classList.remove("is-loading");
  });

  if (bookmarkedPage && !hasRequestedPage) {
    page = clamp(bookmarkedPage, 1, book.totalPages);
  }
  setZoom(1);
  renderPage(page);
};

const initLibrarySearch = () => {
  const searchInput = document.querySelector(".app-search input");
  const catalogCards = [...document.querySelectorAll(".library-book-card")];
  if (!searchInput || !catalogCards.length) {
    return;
  }

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase().replace(/\s+/g, " ");
    const terms = query.split(/\s+/).filter(Boolean);
    catalogCards.forEach((card) => {
      const searchableText = card.textContent.toLowerCase().replace(/\s+/g, " ");
      const phraseMatch = searchableText.includes(query);
      const termMatch = terms.every((term) => searchableText.includes(term));
      const hasNumberTerm = terms.some((term) => /^\d+$/.test(term));
      card.hidden = terms.length > 0 && !(phraseMatch || (!hasNumberTerm && termMatch));
    });
  });
};

const getMissionById = (missionId) =>
  Object.values(missionFixtures).find((mission) => mission.id === missionId) || missionFixtures.colorMatch001;

const initMissionPlayer = () => {
  const player = document.querySelector("[data-mission-player]");
  if (!player) {
    return;
  }

  const mission = getMissionById(player.dataset.missionId);
  const playerPanel = player.querySelector(".mission-player-panel");
  let state = missionEngine.getInitialState(mission);

  try {
    state = { ...state, ...JSON.parse(player.dataset.missionState || "{}") };
  } catch (error) {
    state = missionEngine.getInitialState(mission);
  }

  const sync = () => {
    player.dataset.missionState = JSON.stringify(state);
    player.querySelector(".mission-toolbar").outerHTML = renderMissionToolbar(mission, state);
    playerPanel.innerHTML = renderMissionQuestion(mission, state);
    player.querySelector(".mission-result").outerHTML = renderMissionResult(mission, state);
    bind();
  };

  const setState = (nextState) => {
    state = nextState;
    sync();
  };

  const bind = () => {
    player.querySelectorAll("[data-mission-option]").forEach((button) => {
      button.addEventListener("click", () => {
        setState(missionEngine.answer(mission, state, button.dataset.missionOption));
      });
    });

    player.querySelector("[data-mission-hint]")?.addEventListener("click", () => {
      setState(missionEngine.hint(state));
    });

    player.querySelector("[data-mission-complete]")?.addEventListener("click", () => {
      setState(missionEngine.complete(mission, state));
    });

    player.querySelector("[data-mission-reset]")?.addEventListener("click", () => {
      setState({ ...missionEngine.getInitialState(mission), status: "in-progress", progress: 35 });
    });

    player.querySelector("[data-mission-audio]")?.addEventListener("click", (event) => {
      event.currentTarget.classList.add("is-playing");
      window.setTimeout(() => event.currentTarget.classList.remove("is-playing"), 620);
    });
  };

  bind();
};

const renderAppPage = () => {
  const mount = document.querySelector("[data-app-page]");
  if (!mount) {
    return;
  }

  const activeKey = mount.dataset.appPage || "biblioteca";
  const activeModule = modules[activeKey] || modules.biblioteca;
  const environmentKey = moduleEnvironment[activeKey] || activeKey;
  const environment = environments[environmentKey] || environments.biblioteca;
  document.title = `${activeModule.title} | Raizes e Saberes`;

  const nav = environment.nav
    .map(([key, label, href]) => `<a class="${key === activeKey ? "is-active" : ""}" href="${href}">${label}</a>`)
    .join("");
  const mobileNav = environment.mobile
    .map(([key, label, href]) => `<a class="${key === activeKey ? "is-active" : ""}" href="${href}">${label}</a>`)
    .join("");

  mount.innerHTML = `
    <div class="app-shell" data-environment="${environmentKey}" data-active-module="${activeKey}">
      <aside class="app-sidebar" aria-label="Navegacao principal">
        <a class="sidebar-logo" href="index.html" aria-label="Raizes e Saberes">
          <img src="logo-sidebar-dark.png" alt="Raizes e Saberes Ecossistema Educacional" onerror="this.hidden=true; this.nextElementSibling.hidden=false;" />
          <span class="sidebar-logo-fallback" hidden><strong>Raizes e Saberes</strong><em>Ecossistema Educacional</em></span>
        </a>
        <div class="environment-label">${environment.label}</div>
        <nav class="app-nav" aria-label="Master Screens">${nav}</nav>
        <section class="sidebar-profile">
          <img src="${environment.profileImage || "logo-app.png"}" alt="" onerror="this.hidden=true;" />
          <div><strong>${environment.label}</strong><span>${environment.profile}</span></div>
        </section>
      </aside>
      <main class="app-main">
        <header class="app-topbar">
          <a class="icon-button menu-toggle" href="biblioteca.html" aria-label="Inicio">☰</a>
          <label class="app-search"><span>Pesquisar</span><input type="search" placeholder="${environment.search}" /></label>
          <button class="top-filter" type="button">Filtros</button>
          <nav class="module-switcher" aria-label="Modulos do Ecossistema">${ecosystemModuleLinks(activeKey)}</nav>
          <div class="top-actions" aria-label="Acoes"><span class="notif">3</span><span class="notif">2</span><div class="user-chip">${environment.avatar ? `<img src="${environment.avatar}" alt="" />` : `<span>MS</span>`}<strong>${environment.user}</strong></div></div>
        </header>
        <section class="screen is-active route-screen" data-route-screen="${activeKey}">${activeModule.html}</section>
      </main>
    </div>
    <nav class="mobile-tabbar" aria-label="Navegacao mobile">${mobileNav}</nav>
  `;

  requestAnimationFrame(() => {
    document.querySelector(".route-screen")?.classList.add("is-mounted");
  });

  initBookReader();
  initLibrarySearch();
  initMissionPlayer();
};

renderAppPage();
