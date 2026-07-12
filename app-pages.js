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

const modules = {
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
          <div class="university-hero-art" aria-hidden="true">
            <span class="art-tree"></span>
            <span class="art-books"></span>
            <span class="art-cap"></span>
          </div>
        </section>

        <aside class="university-progress-card">
          <h2>Seu Progresso Geral</h2>
          <div class="university-progress-ring"><strong>78%</strong></div>
          <p>Voce esta indo <strong>muito bem!</strong></p>
          <i><span style="width: 78%"></span></i>
          <small>12 cursos concluidos</small>
        </aside>

        <aside class="university-achievement-card">
          <article><span>🏅</span><strong>7</strong><small>Certificados Conquistados</small><a href="#">Ver certificados</a></article>
          <article><span>◷</span><strong>120 h</strong><small>Horas de Formacao</small><a href="#">Ver historico</a></article>
        </aside>

        <section class="university-card university-trails-card span-2">
          <div class="university-card-head"><h2>Trilhas de Aprendizagem</h2><a href="#">Ver todas</a></div>
          <div class="university-trail-strip">
            <article><span>📗</span><strong>Praticas Pedagogicas</strong><small>12 cursos</small></article>
            <article><span>🙌</span><strong>Inclusao e Diversidade</strong><small>10 cursos</small></article>
            <article><span>💻</span><strong>Tecnologias Educacionais</strong><small>8 cursos</small></article>
            <article><span>👥</span><strong>Gestao Escolar e Lideranca</strong><small>9 cursos</small></article>
            <article><span>💛</span><strong>Socioemocional e Convivencia</strong><small>7 cursos</small></article>
          </div>
        </section>

        <section class="university-card university-current-course">
          <div class="university-card-head"><h2>Meus Cursos em Andamento</h2><a href="#">Ver todos</a></div>
          <div class="current-course-body">
            <div class="course-portrait" aria-hidden="true"><span></span></div>
            <div>
              <h3>Educacao Inclusiva: Praticas que Acolhem</h3>
              <div class="course-progress-line"><i><span style="width: 65%"></span></i><strong>65%</strong></div>
              <button type="button" data-complete-university-lesson>Continuar Curso</button>
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
            <span aria-hidden="true"></span>
            <div><strong>Prof. Ricardo Mendes</strong><p>Doutor em Educacao. Especialista em praticas inovadoras e gestao pedagogica.</p><a href="#">Ver perfil</a></div>
          </div>
        </section>

        <section class="university-card university-video-card span-2">
          <div class="university-card-head"><h2>Videoaulas em Destaque</h2><a href="#">Ver todas</a></div>
          <div class="university-video-grid">
            <article><span>▶</span><strong>Acolhimento e Escuta Ativa na Escola</strong><small>10:45</small></article>
            <article><span>▶</span><strong>Planejamento com Foco na Aprendizagem</strong><small>22:10</small></article>
            <article><span>▶</span><strong>Tecnologias que Transformam</strong><small>16:50</small></article>
          </div>
        </section>

        <section class="university-card university-materials-card">
          <div class="university-card-head"><h2>Materiais Complementares</h2><a href="#">Ver todos</a></div>
          <article><span class="pdf">PDF</span><strong>Guia Pratico da BNCC</strong><small>PDF - 2.4 MB</small></article>
          <article><span class="sheet">✓</span><strong>Checklist de Planejamento</strong><small>PDF - 1.1 MB</small></article>
          <article><span class="doc">W</span><strong>Modelo de Plano de Aula</strong><small>DOCX - 880 KB</small></article>
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

  let page = 1;
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

  if (bookmarkedPage) {
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
    <div class="app-shell" data-environment="${environmentKey}">
      <aside class="app-sidebar" aria-label="Navegacao principal">
        <a class="sidebar-logo" href="index.html" aria-label="Raizes e Saberes">
          <img src="logo-sidebar-dark.png" alt="Raizes e Saberes Ecossistema Educacional" onerror="this.hidden=true; this.nextElementSibling.hidden=false;" />
          <span class="sidebar-logo-fallback" hidden><strong>Raizes e Saberes</strong><em>Ecossistema Educacional</em></span>
        </a>
        <div class="environment-label">${environment.label}</div>
        <nav class="app-nav" aria-label="Master Screens">${nav}</nav>
        <section class="sidebar-profile">
          <img src="logo-app.png" alt="" onerror="this.hidden=true;" />
          <div><strong>${environment.label}</strong><span>${environment.profile}</span></div>
        </section>
      </aside>
      <main class="app-main">
        <header class="app-topbar">
          <a class="icon-button menu-toggle" href="biblioteca.html" aria-label="Inicio">☰</a>
          <label class="app-search"><span>Pesquisar</span><input type="search" placeholder="${environment.search}" /></label>
          <button class="top-filter" type="button">Filtros</button>
          <nav class="module-switcher" aria-label="Modulos do Ecossistema">${ecosystemModuleLinks(activeKey)}</nav>
          <div class="top-actions" aria-label="Acoes"><span class="notif">3</span><span class="notif">2</span><div class="user-chip"><span>MS</span><strong>${environment.user}</strong></div></div>
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
};

renderAppPage();
