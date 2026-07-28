const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-button]");
const nav = document.querySelector("[data-nav]");
const contactForm = document.querySelector("[data-contact-form]");
const librarySearch = document.querySelector("[data-library-search]");
const libraryFilters = document.querySelectorAll("[data-filter]");
const libraryCards = document.querySelectorAll("[data-library-grid] .library-card");
const libraryShelves = document.querySelectorAll("[data-library-shelf]");
const libraryEmpty = document.querySelector("[data-library-empty]");
const bookModal = document.querySelector("[data-book-modal]");
const bookButtons = document.querySelectorAll("[data-book-viewer]");
const bookModalCloseButtons = document.querySelectorAll("[data-book-modal-close]");
const videoModal = document.querySelector("[data-video-modal]");
const videoOpenButton = document.querySelector("[data-video-open]");
const videoCloseButton = document.querySelector("[data-video-close]");
const videoFrame = document.querySelector("[data-video-frame]");
const youtubeEmbedUrl =
  "https://www.youtube.com/embed/w4BPUg2x_O8?autoplay=1&rel=0&modestbranding=1";

const universityCourses = [
  {
    id: "formacao-docente-essencial",
    title: "Formacao Docente Essencial",
    trail: "Trilha de Formacao Docente",
    category: "docente",
    audience: "Professores",
    hours: 12,
    certificates: 186,
    progress: 68,
    publishedAt: "2026-07-11",
    status: "Publicado",
    featured: true,
    resources: {
      video: null,
      pdf: null,
      assessment: null,
      certificate: null,
    },
    lessons: [
      { id: "planejamento-pedagogico", title: "Planejamento pedagogico com intencionalidade" },
      { id: "rotinas-de-aula", title: "Rotinas de aula e organizacao do tempo" },
      { id: "praticas-de-avaliacao", title: "Praticas de avaliacao formativa" },
      { id: "recursos-digitais", title: "Recursos digitais em sala" },
    ],
    materials: ["Guia de planejamento", "Checklist de rotina", "Modelo de plano semanal"],
    assessments: ["Diagnostico inicial", "Atividade reflexiva", "Autoavaliacao final"],
  },
  {
    id: "gestao-pedagogica-em-rede",
    title: "Gestao Pedagogica em Rede",
    trail: "Trilha de Gestao",
    category: "gestao",
    audience: "Gestores",
    hours: 10,
    certificates: 94,
    progress: 42,
    publishedAt: "2026-07-10",
    status: "Em expansao",
    resources: {
      video: null,
      pdf: null,
      assessment: null,
      certificate: null,
    },
    lessons: [
      { id: "leitura-de-indicadores", title: "Leitura de indicadores educacionais" },
      { id: "reunioes-pedagogicas", title: "Reunioes pedagogicas orientadas por dados" },
      { id: "planos-de-intervencao", title: "Planos de intervencao e acompanhamento" },
    ],
    materials: ["Mapa de indicadores", "Roteiro de reuniao", "Plano de intervencao"],
    assessments: ["Estudo de caso", "Plano de acao", "Rubrica de acompanhamento"],
  },
  {
    id: "avaliacao-para-aprendizagem",
    title: "Avaliacao para Aprendizagem",
    trail: "Trilha Avalia+",
    category: "avaliacao",
    audience: "Professores e coordenadores",
    hours: 8,
    certificates: 72,
    progress: 24,
    publishedAt: "2026-07-09",
    status: "Em expansao",
    resources: {
      video: null,
      pdf: null,
      assessment: null,
      certificate: null,
    },
    lessons: [
      { id: "diagnostico-inicial", title: "Diagnostico inicial e escuta pedagogica" },
      { id: "rubricas", title: "Rubricas simples para acompanhar progresso" },
      { id: "devolutivas", title: "Devolutivas que orientam novas aprendizagens" },
    ],
    materials: ["Modelo de rubrica", "Ficha de devolutiva", "Guia de evidencias"],
    assessments: ["Quiz diagnostico", "Analise de evidencias", "Plano de recomposicao"],
  },
  {
    id: "tecnologias-educacionais",
    title: "Tecnologias Educacionais na Pratica",
    trail: "Trilha de Tecnologias Educacionais",
    category: "tecnologia",
    audience: "Professores e gestores",
    hours: 6,
    certificates: 0,
    progress: 0,
    publishedAt: "2026-07-12",
    status: "Em expansao",
    upcoming: true,
    resources: {
      video: null,
      pdf: null,
      assessment: null,
      certificate: null,
    },
    lessons: [
      { id: "ambientes-digitais", title: "Ambientes digitais de aprendizagem" },
      { id: "recursos-interativos", title: "Recursos interativos e acompanhamento" },
      { id: "boas-praticas", title: "Boas praticas para aulas mediadas por tecnologia" },
    ],
    materials: ["Curadoria de recursos", "Roteiro de aula digital"],
    assessments: ["Plano de uso pedagogico"],
  },
];

const universityTrails = [
  { title: "Formacao Docente", category: "docente", status: "Publicado", courses: 1 },
  { title: "Gestao Pedagogica", category: "gestao", status: "Em expansao", courses: 1 },
  { title: "Avalia+", category: "avaliacao", status: "Em expansao", courses: 1 },
  { title: "Tecnologias Educacionais", category: "tecnologia", status: "Em expansao", courses: 1 },
];

let activeUniversityFilter = "all";

const demoCourseProviders = [
  { id: "prov-demo-instituto", name: "Instituto Demonstrativo de Formacao", type: "Organizacao demonstrativa", highlighted: true },
  { id: "prov-demo-universidade", name: "Universidade Parceira Demonstrativa", type: "Ensino superior demonstrativo", highlighted: true },
  { id: "prov-demo-escola", name: "Escola Aberta Demonstrativa", type: "Projeto publico demonstrativo", highlighted: false },
  { id: "prov-demo-lab", name: "Laboratorio Educacional Demonstrativo", type: "Pesquisa e inovacao demonstrativa", highlighted: true },
];

const demoCuratedCourses = [
  {
    id: "demo-avaliacao-formativa",
    title: "Avaliacao Formativa na Pratica",
    slug: "avaliacao-formativa-na-pratica",
    providerId: "prov-demo-instituto",
    area: "Educacao",
    theme: "Avaliacao",
    category: "Praticas pedagogicas",
    workloadHours: 20,
    modality: "Online",
    level: "Introdutorio",
    audience: "Professores e coordenadores",
    certificateAvailable: true,
    selfPaced: true,
    enrollmentStatus: "Inscricoes abertas",
    enrollmentDeadline: null,
    isFree: true,
    language: "pt-BR",
    rating: 4.8,
    reviewsCount: 124,
    accessCount: 1830,
    addedAt: "2026-07-20",
    lastVerifiedAt: "2026-07-26",
    verificationStatus: "verificado",
    status: "publicado",
    featured: true,
    imageUrl: "assets/universidade/video-planejamento.webp",
    courseUrl: "https://example.org/curso-demonstrativo-avaliacao-formativa",
    summary: "Curso demonstrativo para validar a apresentacao de criterios, carga horaria, certificado e acesso externo.",
    fullDescription: "Item de homologacao. Representa como a curadoria da Raizes e Saberes exibira cursos gratuitos mantidos por instituicoes externas, sem hospedar aulas ou materiais de terceiros.",
    objectives: ["Planejar instrumentos simples de acompanhamento", "Organizar devolutivas orientadas por evidencias", "Comparar cursos por criterios objetivos"],
    syllabus: ["Diagnostico inicial", "Rubricas", "Devolutivas", "Acompanhamento pedagogico"],
    requirements: "Acesso a internet e atuacao ou interesse na area educacional.",
    curatorNotes: "Demonstracao: substituir por dados reais apos validacao da curadoria.",
    tags: ["avaliacao", "professores", "certificado"],
    comments: ["Ficha clara e objetiva para comparar cursos.", "Gostei de ver a data de verificacao."],
  },
  {
    id: "demo-educacao-inclusiva",
    title: "Educacao Inclusiva e Acolhimento",
    slug: "educacao-inclusiva-e-acolhimento",
    providerId: "prov-demo-universidade",
    area: "Educacao",
    theme: "Inclusao",
    category: "Inclusao e diversidade",
    workloadHours: 30,
    modality: "Online",
    level: "Intermediario",
    audience: "Professores, gestores e equipes de apoio",
    certificateAvailable: true,
    selfPaced: false,
    enrollmentStatus: "Inscricoes abertas",
    enrollmentDeadline: "2026-08-30",
    isFree: true,
    language: "pt-BR",
    rating: 4.9,
    reviewsCount: 98,
    accessCount: 1510,
    addedAt: "2026-07-18",
    lastVerifiedAt: "2026-07-25",
    verificationStatus: "verificado",
    status: "publicado",
    featured: true,
    imageUrl: "assets/universidade/curso-educacao-inclusiva.webp",
    courseUrl: "https://example.org/curso-demonstrativo-educacao-inclusiva",
    summary: "Modelo de ficha para cursos gratuitos sobre acolhimento, adaptacoes e praticas inclusivas.",
    fullDescription: "Curso demonstrativo usado para validar a separacao entre informacoes oficiais, classificacao da curadoria e avaliacoes de usuarios.",
    objectives: ["Mapear barreiras de aprendizagem", "Planejar acolhimento escolar", "Selecionar praticas inclusivas"],
    syllabus: ["Direitos de aprendizagem", "Adaptacoes razoaveis", "Convivencia", "Acompanhamento"],
    requirements: "Nao ha requisitos obrigatorios.",
    curatorNotes: "Prioridade alta para curadoria inicial da area educacional.",
    tags: ["inclusao", "gestao", "certificado"],
    comments: ["A separacao de fontes ajuda bastante.", "Boa opcao para equipes escolares."],
  },
  {
    id: "demo-tecnologias-educacionais",
    title: "Tecnologias Educacionais para Rotinas de Aula",
    slug: "tecnologias-educacionais-para-rotinas-de-aula",
    providerId: "prov-demo-lab",
    area: "Educacao",
    theme: "Tecnologia",
    category: "Tecnologias educacionais",
    workloadHours: 12,
    modality: "Online",
    level: "Introdutorio",
    audience: "Professores",
    certificateAvailable: false,
    selfPaced: true,
    enrollmentStatus: "Inscricoes abertas",
    enrollmentDeadline: null,
    isFree: true,
    language: "pt-BR",
    rating: 4.6,
    reviewsCount: 76,
    accessCount: 1325,
    addedAt: "2026-07-23",
    lastVerifiedAt: "2026-07-24",
    verificationStatus: "verificado",
    status: "publicado",
    featured: false,
    imageUrl: "assets/universidade/video-tecnologias.webp",
    courseUrl: "https://example.org/curso-demonstrativo-tecnologias",
    summary: "Ficha demonstrativa para cursos curtos, autoinstrucionais e sem certificado.",
    fullDescription: "Mostra como a plataforma informa claramente quando um curso externo gratuito nao oferece certificado.",
    objectives: ["Selecionar ferramentas simples", "Integrar recursos digitais ao planejamento", "Registrar evidencias de aprendizagem"],
    syllabus: ["Ambientes digitais", "Recursos interativos", "Cuidados de uso", "Rotinas"],
    requirements: "Conhecimentos basicos de navegacao web.",
    curatorNotes: "Bom candidato para ranking de cursos autoinstrucionais.",
    tags: ["tecnologia", "autoinstrucional"],
    comments: ["Carga horaria facil de encaixar na rotina."],
  },
  {
    id: "demo-gestao-pedagogica",
    title: "Gestao Pedagogica Orientada por Indicadores",
    slug: "gestao-pedagogica-orientada-por-indicadores",
    providerId: "prov-demo-escola",
    area: "Educacao",
    theme: "Gestao",
    category: "Gestao escolar",
    workloadHours: 40,
    modality: "Hibrido",
    level: "Avancado",
    audience: "Gestores e coordenadores pedagogicos",
    certificateAvailable: true,
    selfPaced: false,
    enrollmentStatus: "Inscricoes encerradas",
    enrollmentDeadline: "2026-07-10",
    isFree: true,
    language: "pt-BR",
    rating: 4.7,
    reviewsCount: 54,
    accessCount: 890,
    addedAt: "2026-07-08",
    lastVerifiedAt: "2026-07-21",
    verificationStatus: "aguardando revisao",
    status: "inscricoes encerradas",
    featured: false,
    imageUrl: "assets/universidade/trilha-gestao.webp",
    courseUrl: "https://example.org/curso-demonstrativo-gestao",
    summary: "Demonstra cursos gratuitos com inscricoes encerradas, mantendo a ficha para comparacao e historico.",
    fullDescription: "A ficha permanece acessivel, mas o estado do curso informa que novas inscricoes nao estao abertas.",
    objectives: ["Ler indicadores escolares", "Priorizar intervencoes", "Acompanhar planos de acao"],
    syllabus: ["Indicadores", "Reunioes pedagogicas", "Plano de intervencao", "Monitoramento"],
    requirements: "Atuacao em gestao escolar ou coordenacao.",
    curatorNotes: "Exemplo de estado: inscricoes encerradas.",
    tags: ["gestao", "indicadores", "certificado"],
    comments: ["Importante manter estado de inscricao visivel."],
  },
  {
    id: "demo-socioemocional",
    title: "Convivencia e Aprendizagem Socioemocional",
    slug: "convivencia-e-aprendizagem-socioemocional",
    providerId: "prov-demo-universidade",
    area: "Educacao",
    theme: "Socioemocional",
    category: "Convivencia",
    workloadHours: 18,
    modality: "Online",
    level: "Introdutorio",
    audience: "Professores e orientadores",
    certificateAvailable: true,
    selfPaced: true,
    enrollmentStatus: "Inscricoes abertas",
    enrollmentDeadline: null,
    isFree: true,
    language: "pt-BR",
    rating: 4.5,
    reviewsCount: 43,
    accessCount: 710,
    addedAt: "2026-07-22",
    lastVerifiedAt: "2026-07-23",
    verificationStatus: "verificado",
    status: "publicado",
    featured: false,
    imageUrl: "assets/universidade/trilha-socioemocional.webp",
    courseUrl: "https://example.org/curso-demonstrativo-socioemocional",
    summary: "Exemplo de curso gratuito com certificado para profissionais da educacao.",
    fullDescription: "Demonstra como cursos relacionados podem aparecer no detalhe e em rankings tematicos.",
    objectives: ["Identificar necessidades de convivencia", "Planejar rodas de conversa", "Acompanhar clima escolar"],
    syllabus: ["Escuta", "Convivencia", "Mediacao", "Rotinas de cuidado"],
    requirements: "Nao ha requisitos obrigatorios.",
    curatorNotes: "Relacionar com trilhas futuras da Formacao Raizes.",
    tags: ["convivencia", "socioemocional", "certificado"],
    comments: ["Tema essencial para equipes escolares."],
  },
  {
    id: "demo-alfabetizacao",
    title: "Alfabetizacao e Letramento: Fundamentos",
    slug: "alfabetizacao-e-letramento-fundamentos",
    providerId: "prov-demo-instituto",
    area: "Educacao",
    theme: "Alfabetizacao",
    category: "Praticas pedagogicas",
    workloadHours: 25,
    modality: "Online",
    level: "Introdutorio",
    audience: "Professores da educacao infantil e anos iniciais",
    certificateAvailable: true,
    selfPaced: true,
    enrollmentStatus: "Inscricoes abertas",
    enrollmentDeadline: null,
    isFree: true,
    language: "pt-BR",
    rating: 4.4,
    reviewsCount: 67,
    accessCount: 980,
    addedAt: "2026-07-12",
    lastVerifiedAt: "2026-07-19",
    verificationStatus: "verificado",
    status: "publicado",
    featured: false,
    imageUrl: "assets/biblioteca/RAIZES_GUIA_ALFABETIZADOR_INFANTIL5_BIBLIOTECA.webp",
    courseUrl: "https://example.org/curso-demonstrativo-alfabetizacao",
    summary: "Curso demonstrativo para validar expansao por temas e publico recomendado.",
    fullDescription: "Mostra como o catalogo pode receber cursos de areas educacionais especificas sem misturar com conteudos proprios da plataforma.",
    objectives: ["Revisar fundamentos", "Selecionar estrategias", "Organizar acompanhamento"],
    syllabus: ["Consciencia fonologica", "Leitura", "Escrita", "Intervencoes"],
    requirements: "Atuacao ou interesse em alfabetizacao.",
    curatorNotes: "Exemplo de tema prioritario para busca.",
    tags: ["alfabetizacao", "professores", "certificado"],
    comments: ["Bom para validar filtros por publico."],
  },
];

const courseFilterConfig = [
  ["area", "Area", "basic"],
  ["theme", "Tema", "basic"],
  ["workload", "Carga horaria", "basic"],
  ["certificate", "Certificado", "basic"],
  ["providerId", "Instituicao", "advanced"],
  ["modality", "Modalidade", "advanced"],
  ["level", "Nivel", "advanced"],
  ["audience", "Publico", "advanced"],
  ["selfPaced", "Autoinstrucional", "advanced"],
  ["enrollment", "Situacao da inscricao", "advanced"],
  ["rating", "Avaliacao", "advanced"],
  ["added", "Data de inclusao", "advanced"],
  ["free", "Gratuidade", "advanced"],
];

let activeCourseFilters = {};
let visibleCourseLimit = 4;
let areAdvancedCourseFiltersVisible = false;

const demoKnowledgeResourceTypes = [
  ["courses", "Cursos"],
  ["books", "Livros"],
  ["guides", "Guias"],
  ["booklets", "Cartilhas"],
  ["laws", "Legislacao"],
  ["articles", "Artigos"],
  ["videos", "Videos"],
  ["podcasts", "Podcasts"],
  ["events", "Eventos"],
  ["experts", "Especialistas"],
  ["faq", "Perguntas Frequentes"],
  ["tools", "Ferramentas"],
  ["paths", "Trilhas"],
  ["materials", "Materiais complementares"],
];

const demoKnowledgeCenters = [
  {
    id: "kc-educacao-inclusiva",
    title: "Educacao Inclusiva",
    slug: "educacao-inclusiva",
    shortDescription: "Praticas, cursos e referencias para acolher diferentes necessidades de aprendizagem.",
    fullDescription: "Centro demonstrativo preparado para organizar conhecimento sobre inclusao, acessibilidade pedagogica e acompanhamento escolar.",
    imageUrl: "assets/universidade/curso-educacao-inclusiva.webp",
    category: "Inclusao e diversidade",
    keywords: ["educacao inclusiva", "autismo", "acolhimento", "adaptacoes"],
    level: "Introdutorio a intermediario",
    audience: "Professores, gestores e equipes de apoio",
    color: "#07543d",
    icon: "IN",
    featured: true,
    status: "demonstracao",
    createdAt: "2026-07-27",
    updatedAt: "2026-07-27",
    relatedCourseIds: ["demo-educacao-inclusiva", "demo-socioemocional"],
    relatedCategories: ["Inclusao", "Convivencia", "Gestao escolar"],
  },
  {
    id: "kc-bncc",
    title: "BNCC",
    slug: "bncc",
    shortDescription: "Organizacao futura de guias, materiais e trilhas sobre fundamentos curriculares.",
    fullDescription: "Centro demonstrativo sem conteudos reais, criado para validar a arquitetura de temas estruturantes da Universidade.",
    imageUrl: "assets/universidade/material-pdf.webp",
    category: "Curriculo",
    keywords: ["bncc", "curriculo", "planejamento", "competencias"],
    level: "Introdutorio",
    audience: "Professores e coordenadores",
    color: "#0d6b4b",
    icon: "BN",
    featured: true,
    status: "demonstracao",
    createdAt: "2026-07-27",
    updatedAt: "2026-07-27",
    relatedCourseIds: ["demo-avaliacao-formativa", "demo-alfabetizacao"],
    relatedCategories: ["Curriculo", "Planejamento", "Avaliacao"],
  },
  {
    id: "kc-alfabetizacao",
    title: "Alfabetizacao",
    slug: "alfabetizacao",
    shortDescription: "Percursos futuros para fundamentos, praticas e acompanhamento da alfabetizacao.",
    fullDescription: "Centro demonstrativo preparado para receber cursos, guias e materiais complementares sobre alfabetizacao e letramento.",
    imageUrl: "assets/biblioteca/RAIZES_GUIA_ALFABETIZADOR_INFANTIL5_BIBLIOTECA.webp",
    category: "Praticas pedagogicas",
    keywords: ["alfabetizacao", "letramento", "leitura", "escrita"],
    level: "Introdutorio",
    audience: "Professores da educacao infantil e anos iniciais",
    color: "#3f6f34",
    icon: "AL",
    featured: true,
    status: "demonstracao",
    createdAt: "2026-07-27",
    updatedAt: "2026-07-27",
    relatedCourseIds: ["demo-alfabetizacao", "demo-avaliacao-formativa"],
    relatedCategories: ["Leitura", "Escrita", "Avaliacao"],
  },
  {
    id: "kc-tecnologias",
    title: "Tecnologias Educacionais",
    slug: "tecnologias-educacionais",
    shortDescription: "Recursos e percursos futuros para uso pedagogico de tecnologias na escola.",
    fullDescription: "Centro demonstrativo para validar descoberta por tema, cursos autoinstrucionais e materiais de apoio.",
    imageUrl: "assets/universidade/video-tecnologias.webp",
    category: "Tecnologia",
    keywords: ["tecnologia", "aula digital", "ferramentas", "recursos digitais"],
    level: "Introdutorio",
    audience: "Professores e gestores",
    color: "#1f6f73",
    icon: "TE",
    featured: false,
    status: "demonstracao",
    createdAt: "2026-07-27",
    updatedAt: "2026-07-27",
    relatedCourseIds: ["demo-tecnologias-educacionais"],
    relatedCategories: ["Ferramentas", "Videos", "Cursos"],
  },
  {
    id: "kc-gestao-escolar",
    title: "Gestao Escolar",
    slug: "gestao-escolar",
    shortDescription: "Temas futuros para indicadores, planejamento, lideranca e acompanhamento pedagogico.",
    fullDescription: "Centro demonstrativo preparado para organizar recursos por perfil de gestor, coordenador e equipe tecnica.",
    imageUrl: "assets/universidade/trilha-gestao.webp",
    category: "Gestao",
    keywords: ["gestao escolar", "indicadores", "lideranca", "planejamento"],
    level: "Intermediario",
    audience: "Gestores e coordenadores pedagogicos",
    color: "#745d21",
    icon: "GE",
    featured: false,
    status: "demonstracao",
    createdAt: "2026-07-27",
    updatedAt: "2026-07-27",
    relatedCourseIds: ["demo-gestao-pedagogica", "demo-avaliacao-formativa"],
    relatedCategories: ["Indicadores", "Avaliacao", "Lideranca"],
  },
  {
    id: "kc-avaliacao",
    title: "Avaliacao Formativa",
    slug: "avaliacao-formativa",
    shortDescription: "Organizacao futura de conteudos sobre diagnostico, devolutivas e acompanhamento.",
    fullDescription: "Centro demonstrativo para reunir cursos, trilhas, ferramentas e perguntas frequentes sobre avaliacao para aprendizagem.",
    imageUrl: "assets/universidade/video-planejamento.webp",
    category: "Avaliacao",
    keywords: ["avaliacao formativa", "diagnostico", "rubricas", "devolutivas"],
    level: "Introdutorio",
    audience: "Professores e coordenadores",
    color: "#7a812e",
    icon: "AV",
    featured: false,
    status: "demonstracao",
    createdAt: "2026-07-27",
    updatedAt: "2026-07-27",
    relatedCourseIds: ["demo-avaliacao-formativa", "demo-gestao-pedagogica"],
    relatedCategories: ["Rubricas", "Diagnostico", "Devolutivas"],
  },
];

const syncHeader = () => {
  if (!header) {
    return;
  }

  header.classList.toggle("is-scrolled", window.scrollY > 12);
};

if (menuButton) {
  menuButton.setAttribute("aria-expanded", "false");

  menuButton.addEventListener("click", () => {
    const isOpen = header.classList.toggle("is-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });
}

if (nav) {
  nav.addEventListener("click", (event) => {
    if (event.target.matches("a")) {
      header.classList.remove("is-open");
      menuButton?.setAttribute("aria-expanded", "false");
    }
  });
}

const screenButtons = document.querySelectorAll("[data-screen-target]");
const screenLinks = document.querySelectorAll("[data-screen-link]");
const screens = document.querySelectorAll("[data-screen]");

const showScreen = (screenName, shouldUpdateHash = true) => {
  if (!screens.length) {
    return;
  }

  const target = document.querySelector(`[data-screen="${screenName}"]`) || screens[0];
  const activeName = target.dataset.screen;

  screens.forEach((screen) => {
    screen.classList.toggle("is-active", screen === target);
  });

  screenButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.screenTarget === activeName);
  });

  if (shouldUpdateHash) {
    history.replaceState(null, "", `#${activeName}`);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
};

screenButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showScreen(button.dataset.screenTarget);
  });
});

screenLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    showScreen(link.dataset.screenLink);
  });
});

if (screens.length) {
  showScreen(window.location.hash.replace("#", "") || "biblioteca", false);

  window.addEventListener("hashchange", () => {
    showScreen(window.location.hash.replace("#", "") || "biblioteca", false);
  });
}

if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = new FormData(contactForm);
    const nome = data.get("nome") || "";
    const instituicao = data.get("instituicao") || "";
    const email = data.get("email") || "";
    const telefone = data.get("telefone") || "";
    const mensagem = data.get("mensagem") || "";

    const subject = "Solicitacao de demonstracao - Raizes e Saberes";
    const body = [
      `Nome: ${nome}`,
      `Escola ou instituicao: ${instituicao}`,
      `E-mail: ${email}`,
      `Telefone: ${telefone}`,
      "",
      "Mensagem:",
      mensagem,
    ].join("\n");

    window.location.href =
      `mailto:graficasantahelena@yahoo.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}

let activeLibraryFilter = "all";

const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const syncLibrary = () => {
  if (!libraryCards.length) {
    return;
  }

  const searchTerm = normalize(librarySearch?.value);
  let visibleCount = 0;

  libraryCards.forEach((card) => {
    const category = normalize(card.dataset.category);
    const title = normalize(card.dataset.title);
    const text = normalize(card.textContent);
    const matchesFilter = activeLibraryFilter === "all" || category.includes(activeLibraryFilter);
    const matchesSearch = !searchTerm || title.includes(searchTerm) || text.includes(searchTerm);
    const isVisible = matchesFilter && matchesSearch;

    card.classList.toggle("is-hidden", !isVisible);

    if (isVisible) {
      visibleCount += 1;
    }
  });

  libraryShelves.forEach((shelf) => {
    const hasVisibleCard = Array.from(shelf.querySelectorAll(".library-card")).some(
      (card) => !card.classList.contains("is-hidden")
    );

    shelf.classList.toggle("is-hidden", !hasVisibleCard);
  });

  if (libraryEmpty) {
    libraryEmpty.hidden = visibleCount > 0;
  }
};

if (librarySearch) {
  librarySearch.addEventListener("input", syncLibrary);
}

libraryFilters.forEach((filterButton) => {
  filterButton.addEventListener("click", () => {
    activeLibraryFilter = filterButton.dataset.filter || "all";

    libraryFilters.forEach((button) => {
      button.classList.toggle("is-active", button === filterButton);
    });

    syncLibrary();
  });
});

bookButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (bookModal) {
      bookModal.hidden = false;
    }
  });
});

bookModalCloseButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (bookModal) {
      bookModal.hidden = true;
    }
  });
});

if (bookModal) {
  bookModal.addEventListener("click", (event) => {
    if (event.target === bookModal) {
      bookModal.hidden = true;
    }
  });
}

const openVideoModal = () => {
  if (!videoModal) {
    return;
  }

  videoModal.hidden = false;
  document.body.classList.add("modal-open");

  if (videoFrame && !videoFrame.innerHTML) {
    videoFrame.innerHTML = `
      <iframe
        src="${youtubeEmbedUrl}"
        title="Video institucional Raizes e Saberes"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    `;
  }
};

const closeVideoModal = () => {
  if (!videoModal) {
    return;
  }

  videoModal.hidden = true;
  document.body.classList.remove("modal-open");

  if (videoFrame) {
    videoFrame.innerHTML = "";
  }
};

if (videoOpenButton) {
  videoOpenButton.addEventListener("click", openVideoModal);
}

if (videoCloseButton) {
  videoCloseButton.addEventListener("click", closeVideoModal);
}

if (videoModal) {
  videoModal.addEventListener("click", (event) => {
    if (event.target === videoModal) {
      closeVideoModal();
    }
  });
}

const getProviderName = (providerId) =>
  demoCourseProviders.find((provider) => provider.id === providerId)?.name || "Instituicao demonstrativa";

const getProviderType = (providerId) =>
  demoCourseProviders.find((provider) => provider.id === providerId)?.type || "Provedor demonstrativo";

const isDemoAuthenticated = () => localStorage.getItem(platformAuth.key) === "true";

const requestCatalogLogin = () => {
  const currentPath = `${window.location.pathname.split("/").pop() || "universidade.html"}${window.location.search}${window.location.hash}`;
  window.location.href = `${platformAuth.loginPage}?next=${encodeURIComponent(currentPath)}`;
};

const renderStars = (rating) => `
  <span class="rating-stars" aria-label="Avaliacao media ${rating.toFixed(1)} de 5">
    ${Array.from({ length: 5 }, (_, index) => `<i style="--fill:${Math.max(0, Math.min(1, rating - index))}"></i>`).join("")}
  </span>
`;

const compactDate = (value) => {
  if (!value) {
    return "Sem prazo";
  }
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const getCourseCuration = (course) => ({
  recommendedFor: course.curatorRecommendedFor || course.audience,
  strengths: course.curatorStrengths || [
    "Ficha adequada para comparacao rapida entre ofertas gratuitas.",
    course.certificateAvailable ? "Informa certificado disponivel." : "Deixa clara a ausencia de certificado.",
    course.selfPaced ? "Pode ser cursado no ritmo do profissional." : "Possui acompanhamento por turma ou prazo.",
  ],
  estimatedLevel: course.curatorEstimatedLevel || course.level,
  observations: course.curatorNotes || "Informacoes demonstrativas para homologacao visual.",
  updatedAt: course.lastVerifiedAt,
});

const getRatingDistribution = (course) => {
  const five = Math.max(1, Math.round(course.reviewsCount * Math.min(course.rating / 5, 0.9)));
  const four = Math.max(1, Math.round(course.reviewsCount * 0.16));
  const three = Math.max(0, Math.round(course.reviewsCount * 0.05));
  const two = Math.max(0, Math.round(course.reviewsCount * 0.02));
  const one = Math.max(0, course.reviewsCount - five - four - three - two);
  return [five, four, three, two, one];
};

const getFilterLabel = (key, value) => {
  const config = courseFilterConfig.find(([filterKey]) => filterKey === key);
  const option = getCourseFilterOptions(key).find(([optionValue]) => optionValue === value);
  return `${config?.[1] || key}: ${option?.[1] || value}`;
};

const getCourseFilterOptions = (key) => {
  if (key === "providerId") {
    return demoCourseProviders.map((provider) => [provider.id, provider.name]);
  }
  if (key === "workload") {
    return [["short", "Ate 15h"], ["medium", "16h a 30h"], ["long", "31h ou mais"]];
  }
  if (key === "certificate") {
    return [["yes", "Com certificado"], ["no", "Sem certificado"]];
  }
  if (key === "selfPaced") {
    return [["yes", "Autoinstrucional"], ["no", "Com turma ou prazo"]];
  }
  if (key === "enrollment") {
    return [["open", "Inscricao aberta"], ["closed", "Inscricao encerrada"]];
  }
  if (key === "added") {
    return [["recent", "Ultimos 15 dias"], ["older", "Mais antigos"]];
  }
  if (key === "rating") {
    return [["4.8", "4,8 ou mais"], ["4.5", "4,5 ou mais"]];
  }
  if (key === "free") {
    return [["free", "Gratuito"]];
  }

  const valueKey = {
    area: "area",
    theme: "theme",
    modality: "modality",
    level: "level",
    audience: "audience",
  }[key];

  return [...new Set(demoCuratedCourses.map((course) => course[valueKey]))]
    .filter(Boolean)
    .map((value) => [value, value]);
};

const matchesCourseFilter = (course, key, value) => {
  if (!value) {
    return true;
  }
  if (["area", "theme", "modality", "level", "audience", "providerId"].includes(key)) {
    return course[key] === value;
  }
  if (key === "workload") {
    return (
      (value === "short" && course.workloadHours <= 15) ||
      (value === "medium" && course.workloadHours > 15 && course.workloadHours <= 30) ||
      (value === "long" && course.workloadHours >= 31)
    );
  }
  if (key === "certificate") {
    return value === "yes" ? course.certificateAvailable : !course.certificateAvailable;
  }
  if (key === "selfPaced") {
    return value === "yes" ? course.selfPaced : !course.selfPaced;
  }
  if (key === "enrollment") {
    return value === "open" ? course.enrollmentStatus === "Inscricoes abertas" : course.enrollmentStatus !== "Inscricoes abertas";
  }
  if (key === "added") {
    return value === "recent" ? course.addedAt >= "2026-07-15" : course.addedAt < "2026-07-15";
  }
  if (key === "rating") {
    return course.rating >= Number(value);
  }
  if (key === "free") {
    return course.isFree;
  }
  return true;
};

const getFilteredDemoCourses = () => {
  const searchTerm = normalize(document.querySelector("[data-course-search]")?.value);
  const sortMode = document.querySelector("[data-course-sort]")?.value || "featured";
  const filtered = demoCuratedCourses.filter((course) => {
    const searchable = normalize([
      course.title,
      course.summary,
      course.theme,
      course.category,
      course.audience,
      getProviderName(course.providerId),
      ...course.tags,
    ].join(" "));
    const matchesSearch = !searchTerm || searchable.includes(searchTerm);
    return matchesSearch && Object.entries(activeCourseFilters).every(([key, value]) => matchesCourseFilter(course, key, value));
  });

  return filtered.sort((firstCourse, secondCourse) => {
    if (sortMode === "rating") {
      return secondCourse.rating - firstCourse.rating;
    }
    if (sortMode === "access") {
      return secondCourse.accessCount - firstCourse.accessCount;
    }
    if (sortMode === "recent") {
      return secondCourse.addedAt.localeCompare(firstCourse.addedAt);
    }
    if (sortMode === "hours") {
      return firstCourse.workloadHours - secondCourse.workloadHours;
    }
    return Number(secondCourse.featured) - Number(firstCourse.featured) || secondCourse.rating - firstCourse.rating;
  });
};

const renderCourseCard = (course) => `
  <article class="public-course-card" data-course-id="${course.id}">
    <figure>
      <img src="${course.imageUrl}" alt="Capa demonstrativa do curso ${course.title}" loading="lazy" />
      <span>Gratuito</span>
    </figure>
    <div class="course-card-body">
      <div class="course-card-topline">
        <span>${course.category}</span>
        <button type="button" data-auth-course-action="favorite" data-course-id="${course.id}" aria-label="Favoritar ${course.title}">Favoritar</button>
      </div>
      <h3>${course.title}</h3>
      <strong class="course-provider-name">${getProviderName(course.providerId)}</strong>
      <p>${course.summary}</p>
      <dl>
        <div><dt>Carga</dt><dd>${course.workloadHours}h</dd></div>
        <div><dt>Modalidade</dt><dd>${course.modality}</dd></div>
        <div><dt>Certificado</dt><dd>${course.certificateAvailable ? "Disponivel" : "Nao informado"}</dd></div>
        <div><dt>Inscricao</dt><dd>${course.enrollmentStatus}</dd></div>
      </dl>
      <div class="course-card-metrics">
        <span>${renderStars(course.rating)}<b>${course.rating.toFixed(1)}</b></span>
        <span>${course.reviewsCount} avaliacoes</span>
        <span>${course.accessCount.toLocaleString("pt-BR")} acessos</span>
      </div>
      <button type="button" data-open-course-detail="${course.id}">Ver detalhes</button>
    </div>
  </article>
`;

const renderCompactCourseList = (courses) =>
  courses.map((course) => `<button type="button" data-open-course-detail="${course.id}"><strong>${course.title}</strong><span>${getProviderName(course.providerId)} - ${course.workloadHours}h - ${course.rating.toFixed(1)}</span></button>`).join("");

const renderMiniCourseCards = (courses) =>
  courses
    .map(
      (course) => `
        <article class="mini-course-card">
          <img src="${course.imageUrl}" alt="Capa demonstrativa do curso ${course.title}" loading="lazy" />
          <div>
            <span>Gratuito</span>
            <h4>${course.title}</h4>
            <p>${getProviderName(course.providerId)}</p>
            <div>${renderStars(course.rating)}<strong>${course.rating.toFixed(1)}</strong></div>
            <button type="button" data-open-course-detail="${course.id}">Ver detalhes</button>
          </div>
        </article>
      `
    )
    .join("");

const getKnowledgeCenterCourses = (center) =>
  center.relatedCourseIds
    .map((courseId) => demoCuratedCourses.find((course) => course.id === courseId))
    .filter(Boolean);

const getKnowledgeCenterResourceCount = (center) => {
  const courses = getKnowledgeCenterCourses(center).length;
  const preparedBlocks = 8;
  return courses + preparedBlocks;
};

const renderKnowledgeCenterCards = () => {
  const target = document.querySelector("[data-knowledge-centers]");
  if (!target) {
    return;
  }

  target.innerHTML = demoKnowledgeCenters
    .map(
      (center) => `
        <article class="knowledge-center-card" style="--center-color:${center.color}">
          <img src="${center.imageUrl}" alt="Imagem demonstrativa do centro ${center.title}" loading="lazy" />
          <div>
            <span>${center.icon}</span>
            <h3>${center.title}</h3>
            <p>${center.shortDescription}</p>
            <small>${getKnowledgeCenterResourceCount(center)} recursos preparados</small>
            <div>${center.relatedCategories.map((category) => `<b>${category}</b>`).join("")}</div>
            <button type="button" data-open-knowledge-center="${center.id}">Explorar</button>
          </div>
        </article>
      `
    )
    .join("");
};

const renderPreparedResourceBlocks = (center) => {
  const courses = getKnowledgeCenterCourses(center);
  const demoBlocks = {
    courses,
    paths: [
      ["Professor", "Percurso demonstrativo para estudo individual e aplicacao em sala.", courses.length],
      ["Coordenador", "Percurso demonstrativo para orientar planejamento e acompanhamento.", courses.length],
      ["Gestor", "Percurso demonstrativo para decisao pedagogica e leitura de indicadores.", courses.length],
      ["Familia", "Percurso demonstrativo para comunicacao e apoio ao estudante.", 0],
      ["Administrador Escolar", "Percurso demonstrativo para organizacao institucional.", 0],
    ],
    faq: [
      ["Este centro possui conteudo real?", "Nao. Os dados atuais sao demonstrativos e servem para homologar a estrutura."],
      ["Os cursos sao da Raizes e Saberes?", "Nao. Cursos externos pertencem as instituicoes ofertantes; a Universidade organiza a descoberta."],
      ["A curadoria substitui a instituicao?", "Nao. A curadoria classifica e contextualiza informacoes para facilitar a busca."],
    ],
  };
  const preparedLabels = demoKnowledgeResourceTypes
    .filter(([type]) => !["courses", "paths", "faq"].includes(type))
    .map(([, label]) => label);

  return `
    ${
      courses.length
        ? `
          <section class="knowledge-resource-block">
            <header><span>Cursos</span><strong>${courses.length} cursos demonstrativos</strong></header>
            <div class="knowledge-course-grid">${courses.map(renderCourseCard).join("")}</div>
          </section>
        `
        : ""
    }
    <section class="knowledge-resource-block">
      <header><span>Trilhas</span><strong>Trilhas recomendadas</strong></header>
      <div class="knowledge-path-grid">
        ${demoBlocks.paths
          .map(
            ([name, description, count]) => `
              <article>
                <strong>${name}</strong>
                <p>${description}</p>
                <span>${count} curso${count === 1 ? "" : "s"}</span>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
    <section class="knowledge-resource-block">
      <header><span>Perguntas Frequentes</span><strong>FAQ demonstrativo</strong></header>
      <div class="knowledge-faq-list">
        ${demoBlocks.faq
          .map(
            ([question, answer]) => `
              <details>
                <summary>${question}</summary>
                <p>${answer}</p>
              </details>
            `
          )
          .join("")}
      </div>
    </section>
    <section class="knowledge-resource-block is-prepared">
      <header><span>Estruturas preparadas</span><strong>Sem conteudo real nesta fase</strong></header>
      <p>Blocos reservados para: ${preparedLabels.join(", ")}. Eles serao exibidos individualmente quando houver conteudo curado.</p>
    </section>
  `;
};

const renderKnowledgeCenterDetail = (centerId) => {
  const center = demoKnowledgeCenters.find((item) => item.id === centerId || item.slug === centerId);
  const detail = document.querySelector("[data-knowledge-center-detail]");
  if (!center || !detail) {
    return;
  }

  const courses = getKnowledgeCenterCourses(center);
  detail.hidden = false;
  detail.innerHTML = `
    <header class="knowledge-center-hero" style="--center-color:${center.color}">
      <img src="${center.imageUrl}" alt="Imagem demonstrativa do centro ${center.title}" />
      <div>
        <span>Centro de Conhecimento</span>
        <h2>${center.title}</h2>
        <p>${center.fullDescription}</p>
        <dl>
          <div><dt>Recursos</dt><dd>${getKnowledgeCenterResourceCount(center)}</dd></div>
          <div><dt>Nivel</dt><dd>${center.level}</dd></div>
          <div><dt>Publico</dt><dd>${center.audience}</dd></div>
        </dl>
        <div>${center.relatedCategories.map((category) => `<b>${category}</b>`).join("")}</div>
        <a href="#conteudo-${center.slug}">Explorar conteudo</a>
      </div>
    </header>
    <section class="knowledge-curation-summary">
      <span>Resumo da Curadoria</span>
      <h3>Visao demonstrativa do tema</h3>
      <p>Este resumo sera produzido futuramente pela equipe Raizes e Saberes. Nesta homologacao, o texto demonstra como o centro apresentara contexto, criterios de organizacao e caminhos de estudo para o tema ${center.title}.</p>
    </section>
    <div class="knowledge-resource-list" id="conteudo-${center.slug}">
      ${renderPreparedResourceBlocks(center)}
    </div>
  `;
  detail.scrollIntoView({ behavior: "smooth", block: "start" });
};

const renderSmartDiscovery = () => {
  const panel = document.querySelector("[data-smart-discovery]");
  const searchTerm = normalize(document.querySelector("[data-course-search]")?.value);
  if (!panel) {
    return;
  }
  if (!searchTerm) {
    panel.hidden = true;
    panel.innerHTML = "";
    return;
  }

  const centerMatches = demoKnowledgeCenters.filter((center) =>
    normalize([center.title, center.shortDescription, center.category, center.audience, ...center.keywords].join(" ")).includes(searchTerm)
  );
  const courseMatches = demoCuratedCourses.filter((course) =>
    normalize([course.title, course.theme, course.category, getProviderName(course.providerId), ...course.tags].join(" ")).includes(searchTerm)
  );
  const providerMatches = demoCourseProviders.filter((provider) => normalize(provider.name).includes(searchTerm));
  const pathMatches = demoKnowledgeCenters.filter((center) => normalize(center.audience).includes(searchTerm));

  panel.hidden = false;
  panel.innerHTML = `
    <header><span>Busca inteligente preparada</span><strong>Resultados organizados por tipo</strong></header>
    <div>
      <article><h3>Centros</h3>${centerMatches.length ? centerMatches.map((center) => `<button type="button" data-open-knowledge-center="${center.id}">${center.title}</button>`).join("") : "<p>Nenhum centro encontrado.</p>"}</article>
      <article><h3>Cursos</h3>${courseMatches.length ? renderCompactCourseList(courseMatches.slice(0, 4)) : "<p>Nenhum curso encontrado.</p>"}</article>
      <article><h3>Instituicoes</h3>${providerMatches.length ? providerMatches.map((provider) => `<p>${provider.name}</p>`).join("") : "<p>Nenhuma instituicao encontrada.</p>"}</article>
      <article><h3>Trilhas e materiais</h3>${pathMatches.length ? pathMatches.map((center) => `<p>${center.title} - estrutura preparada</p>`).join("") : "<p>Estrutura preparada para materiais futuros.</p>"}</article>
    </div>
  `;
};

const renderCourseDetail = (courseId) => {
  const course = demoCuratedCourses.find((item) => item.id === courseId) || demoCuratedCourses[0];
  const detail = document.querySelector("[data-course-detail]");
  if (!detail || !course) {
    return;
  }
  const viewKey = `catalog:detail-view:${course.id}`;
  const previousViews = Number(localStorage.getItem(viewKey) || "0");
  localStorage.setItem(viewKey, String(previousViews + 1));

  const related = demoCuratedCourses
    .filter((item) => item.id !== course.id && (item.theme === course.theme || item.area === course.area))
    .slice(0, 3);
  const curation = getCourseCuration(course);
  const distribution = getRatingDistribution(course);
  const maxDistribution = Math.max(...distribution, 1);

  detail.hidden = false;
  detail.innerHTML = `
    <header class="course-detail-hero">
      <img src="${course.imageUrl}" alt="Capa demonstrativa do curso ${course.title}" />
      <div>
        <span>Ficha demonstrativa - ${course.verificationStatus}</span>
        <h2>${course.title}</h2>
        <p>${getProviderName(course.providerId)}</p>
        <div class="course-detail-badges">
          <strong>Gratuito</strong>
          <span>${renderStars(course.rating)} ${course.rating.toFixed(1)} (${course.reviewsCount} avaliacoes)</span>
          <span>${course.workloadHours}h</span>
          <span>${course.modality}</span>
          <span>${course.certificateAvailable ? "Certificado disponivel" : "Sem certificado informado"}</span>
        </div>
        <div class="course-detail-actions">
          <a href="${course.courseUrl}" target="_blank" rel="noopener" data-external-course="${course.id}">Acessar curso na instituicao</a>
          <button type="button" data-auth-course-action="favorite" data-course-id="${course.id}">Salvar</button>
          <button type="button" data-auth-course-action="review" data-course-id="${course.id}">Avaliar</button>
        </div>
      </div>
    </header>
    <aside class="course-transparency-note">
      Este curso e oferecido e administrado pela instituicao indicada. A Universidade Raizes e Saberes organiza as informacoes e direciona o usuario para o ambiente oficial do curso.
    </aside>
    <div class="course-detail-grid">
      <section>
        <h3>Informacoes oficiais da instituicao</h3>
        <p><strong>Instituicao responsavel:</strong> ${getProviderName(course.providerId)} (${getProviderType(course.providerId)})</p>
        <p><strong>Descricao:</strong> ${course.fullDescription}</p>
        <p><strong>Objetivos:</strong></p>
        <ul>${course.objectives.map((item) => `<li>${item}</li>`).join("")}</ul>
        <p><strong>Conteudos abordados:</strong></p>
        <ul>${course.syllabus.map((item) => `<li>${item}</li>`).join("")}</ul>
        <p><strong>Publico recomendado:</strong> ${course.audience}</p>
        <p><strong>Requisitos:</strong> ${course.requirements}</p>
      </section>
      <aside>
        <h3>Dados do curso</h3>
        <dl>
          <div><dt>Area</dt><dd>${course.area}</dd></div>
          <div><dt>Tema</dt><dd>${course.theme}</dd></div>
          <div><dt>Carga horaria</dt><dd>${course.workloadHours}h</dd></div>
          <div><dt>Modalidade</dt><dd>${course.modality}</dd></div>
          <div><dt>Nivel</dt><dd>${course.level}</dd></div>
          <div><dt>Idioma</dt><dd>${course.language}</dd></div>
          <div><dt>Certificado</dt><dd>${course.certificateAvailable ? "Sim" : "Nao"}</dd></div>
          <div><dt>Gratuidade</dt><dd>${course.isFree ? "Gratuito" : "Nao gratuito"}</dd></div>
          <div><dt>Inscricao</dt><dd>${course.enrollmentStatus}</dd></div>
          <div><dt>Ultima verificacao</dt><dd>${compactDate(course.lastVerifiedAt)}</dd></div>
        </dl>
      </aside>
      <section class="curation-analysis-block">
        <h3>Analise da curadoria Raizes e Saberes</h3>
        <p><strong>Para quem e recomendado:</strong> ${curation.recommendedFor}</p>
        <p><strong>Principais pontos positivos:</strong></p>
        <ul>${curation.strengths.map((item) => `<li>${item}</li>`).join("")}</ul>
        <p><strong>Nivel estimado:</strong> ${curation.estimatedLevel}</p>
        <p><strong>Observacoes:</strong> ${curation.observations}</p>
        <p><strong>Atualizacao das informacoes:</strong> ${compactDate(curation.updatedAt)}</p>
      </section>
      <section>
        <h3>Comunidade</h3>
        <div class="detail-rating"><strong>${course.rating.toFixed(1)}</strong><span>${renderStars(course.rating)}</span><small>${course.reviewsCount} avaliacoes</small></div>
        <div class="rating-distribution">
          ${distribution.map((count, index) => `<span><b>${5 - index}</b><i><em style="width:${Math.round((count / maxDistribution) * 100)}%"></em></i><small>${count}</small></span>`).join("")}
        </div>
        <div class="detail-comments">${course.comments.map((comment) => `<blockquote>${comment}</blockquote>`).join("")}</div>
        <div class="course-progress-actions">
          <button type="button" data-auth-course-action="review" data-course-id="${course.id}">Avaliar</button>
          <button type="button" data-auth-course-action="favorite" data-course-id="${course.id}">Favoritar</button>
          <button type="button" data-auth-course-action="started" data-course-id="${course.id}">Informar que iniciei</button>
          <button type="button" data-auth-course-action="completed" data-course-id="${course.id}">Informar conclusao</button>
        </div>
      </section>
      <section>
        <h3>Cursos relacionados</h3>
        <div class="related-course-list">${related.length ? renderMiniCourseCards(related) : "<p>Nenhum curso relacionado nesta demonstracao.</p>"}</div>
      </section>
    </div>
  `;
  detail.scrollIntoView({ behavior: "smooth", block: "start" });
};

const renderCourseCatalog = () => {
  const catalog = document.querySelector("[data-course-catalog]");
  if (!catalog) {
    return;
  }

  const filtersTarget = document.querySelector("[data-course-filters]");
  if (filtersTarget && !filtersTarget.innerHTML) {
    filtersTarget.innerHTML = courseFilterConfig
      .map(([key, label, group]) => `
        <label data-filter-group="${group}">
          <span>${label}</span>
          <select data-course-filter="${key}">
            <option value="">Todos</option>
            ${getCourseFilterOptions(key).map(([value, optionLabel]) => `<option value="${value}">${optionLabel}</option>`).join("")}
          </select>
        </label>
      `)
      .join("");
  }
  document.querySelector("[data-filter-panel]")?.classList.toggle("show-advanced", areAdvancedCourseFiltersVisible);

  const themeTarget = document.querySelector("[data-quick-themes]");
  if (themeTarget && !themeTarget.innerHTML) {
    themeTarget.innerHTML = [
      ["", "Todos"],
      ...getCourseFilterOptions("theme"),
    ]
      .map(([value, label]) => `<button type="button" class="${activeCourseFilters.theme === value || (!value && !activeCourseFilters.theme) ? "is-active" : ""}" data-quick-theme="${value}">${label}</button>`)
      .join("");
  } else if (themeTarget) {
    themeTarget.querySelectorAll("[data-quick-theme]").forEach((button) => {
      button.classList.toggle("is-active", activeCourseFilters.theme === button.dataset.quickTheme || (!button.dataset.quickTheme && !activeCourseFilters.theme));
    });
  }

  document.querySelectorAll("[data-course-filter]").forEach((filter) => {
    filter.value = activeCourseFilters[filter.dataset.courseFilter] || "";
  });

  const courses = getFilteredDemoCourses();
  const visibleCourses = courses.slice(0, visibleCourseLimit);
  const totalAccess = demoCuratedCourses.reduce((sum, course) => sum + course.accessCount, 0);

  const kpis = document.querySelector("[data-catalog-kpis]");
  if (kpis) {
    kpis.innerHTML = `
      <span><strong>${demoCuratedCourses.length}</strong><small>cursos demo</small></span>
      <span><strong>${demoCourseProviders.length}</strong><small>instituicoes</small></span>
      <span><strong>${totalAccess.toLocaleString("pt-BR")}</strong><small>acessos demo</small></span>
    `;
  }

  const resultCount = document.querySelector("[data-course-result-count]");
  if (resultCount) {
    resultCount.textContent = `${courses.length} curso${courses.length === 1 ? "" : "s"} encontrado${courses.length === 1 ? "" : "s"}`;
  }

  const activeFilterRow = document.querySelector("[data-active-course-filters]");
  if (activeFilterRow) {
    const chips = Object.entries(activeCourseFilters);
    activeFilterRow.innerHTML = chips.length
      ? chips.map(([key, value]) => `<button type="button" data-remove-course-filter="${key}">${getFilterLabel(key, value)} <span>remover</span></button>`).join("")
      : `<span>Nenhum filtro ativo alem da busca.</span>`;
  }

  const results = document.querySelector("[data-course-results]");
  if (results) {
    results.innerHTML = visibleCourses.length ? visibleCourses.map(renderCourseCard).join("") : `<article class="catalog-empty">Nenhum curso encontrado para os filtros selecionados.</article>`;
  }

  const loadMore = document.querySelector("[data-course-load-more]");
  if (loadMore) {
    loadMore.hidden = visibleCourseLimit >= courses.length;
  }

  document.querySelector("[data-featured-courses]").innerHTML = renderMiniCourseCards(demoCuratedCourses.filter((course) => course.featured));
  document.querySelector("[data-featured-providers]").innerHTML = demoCourseProviders
    .filter((provider) => provider.highlighted)
    .map((provider) => `<article><strong>${provider.name}</strong><span>${provider.type}</span></article>`)
    .join("");
  document.querySelector("[data-most-accessed]").innerHTML = renderCompactCourseList([...demoCuratedCourses].sort((a, b) => b.accessCount - a.accessCount).slice(0, 3));
  document.querySelector("[data-best-rated]").innerHTML = renderCompactCourseList([...demoCuratedCourses].sort((a, b) => b.rating - a.rating).slice(0, 3));
  document.querySelector("[data-recent-courses]").innerHTML = renderCompactCourseList([...demoCuratedCourses].sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, 3));
  document.querySelector("[data-certificate-courses]").innerHTML = renderCompactCourseList(demoCuratedCourses.filter((course) => course.certificateAvailable).slice(0, 3));
};

const getFeaturedUniversityCourse = () =>
  universityCourses.find((course) => course.featured) ||
  [...universityCourses].sort((firstCourse, secondCourse) => secondCourse.publishedAt.localeCompare(firstCourse.publishedAt))[0];

const getLatestUniversityCourses = () =>
  [...universityCourses]
    .sort((firstCourse, secondCourse) => secondCourse.publishedAt.localeCompare(firstCourse.publishedAt))
    .slice(0, 3);

const getVisibleUniversityCourses = () => {
  const searchTerm = normalize(document.querySelector("[data-university-search]")?.value);
  return universityCourses.filter((course) => {
    const matchesCategory = activeUniversityFilter === "all" || course.category === activeUniversityFilter;
    const searchableText = normalize(
      [
        course.title,
        course.trail,
        course.audience,
        course.status,
        ...course.lessons.map((lesson) => lesson.title),
        ...course.materials,
        ...course.assessments,
      ].join(" ")
    );
    return matchesCategory && (!searchTerm || searchableText.includes(searchTerm));
  });
};

const getUniversityLessonPosition = (lessonId) => {
  for (const course of universityCourses) {
    const lessonIndex = course.lessons.findIndex((lesson) => lesson.id === lessonId);
    if (lessonIndex >= 0) {
      return { course, lessonIndex };
    }
  }

  return { course: getFeaturedUniversityCourse(), lessonIndex: -1 };
};

const getNextUniversityLesson = () => {
  const lastCompletedLesson = localStorage.getItem("university:lastCompletedLesson");
  const { course, lessonIndex } = getUniversityLessonPosition(lastCompletedLesson);
  const nextLesson = course.lessons[lessonIndex + 1] || course.lessons[0];
  return { course, lesson: nextLesson };
};

const renderUniversityLive = () => {
  const courseWeekCard = document.querySelector("[data-university-course-week]");
  if (!courseWeekCard) {
    return;
  }

  const featuredCourse = getFeaturedUniversityCourse();
  const latestCourses = getLatestUniversityCourses();
  const visibleCourses = getVisibleUniversityCourses();
  const activeCourses = visibleCourses.filter((course) => !course.upcoming);
  const upcomingCourses = universityCourses.filter((course) => course.upcoming || course.status === "Em expansao").slice(0, 4);
  const totalHours = universityCourses.reduce((sum, course) => sum + course.hours, 0);
  const totalCertificates = universityCourses.reduce((sum, course) => sum + course.certificates, 0);
  const expansionTrails = universityTrails.filter((trail) => trail.status === "Em expansao").length;
  const nextLesson = getNextUniversityLesson();

  document.querySelector("[data-university-featured-title]").textContent = featuredCourse.trail;
  document.querySelector("[data-university-featured-meta]").textContent =
    `${featuredCourse.lessons.length} aulas - ${featuredCourse.hours}h de formacao`;
  document.querySelector("[data-university-progress]").textContent = `${featuredCourse.progress}%`;

  const lessonList = document.querySelector("[data-university-lessons]");
  if (lessonList) {
    lessonList.innerHTML = featuredCourse.lessons
      .slice(0, 3)
      .map((lesson) => `<span>${lesson.title}</span>`)
      .join("");
  }

  courseWeekCard.innerHTML = `
    <span class="live-label">Destaque do Curso da Semana</span>
    <h3>${featuredCourse.title}</h3>
    <p>${featuredCourse.trail} - ${featuredCourse.hours}h - ${featuredCourse.audience}</p>
    <div class="premium-progress"><i style="--value:${featuredCourse.progress}%"></i><strong>${featuredCourse.progress}%</strong></div>
    <div class="course-resource-row">
      <span>Video</span>
      <span>PDF</span>
      <span>Avaliacao</span>
      <span>Certificado</span>
    </div>
    <a href="#contato">Ver curso</a>
  `;

  const newCourseList = document.querySelector("[data-university-new-courses]");
  if (newCourseList) {
    newCourseList.innerHTML = latestCourses
      .map(
        (course) => `
          <article>
            <div>
              <strong>${course.title}</strong>
              <span>${course.trail} - ${course.hours}h</span>
            </div>
            ${course.status === "Em expansao" ? `<small>Em expansao</small>` : ""}
          </article>
        `
      )
      .join("");
  }

  const newCourseCount = document.querySelector("[data-university-new-count]");
  if (newCourseCount) {
    newCourseCount.textContent = `${latestCourses.length} publicados`;
  }

  const stats = document.querySelector("[data-university-stats]");
  if (stats) {
    stats.innerHTML = `
      <span><strong>${universityCourses.length}</strong><small>cursos</small></span>
      <span><strong>${totalHours}h</strong><small>formacao</small></span>
      <span><strong>${totalCertificates}</strong><small>certificados</small></span>
      <span><strong>${expansionTrails}</strong><small>trilhas em expansao</small></span>
      <div class="trail-expansion-list">
        ${universityTrails
          .filter((trail) => trail.status === "Em expansao")
          .map((trail) => `<small>${trail.title}<b>Em expansao</b></small>`)
          .join("")}
      </div>
    `;
  }

  const continueCard = document.querySelector("[data-university-continue]");
  if (continueCard) {
    continueCard.querySelector("h3").textContent = nextLesson.lesson.title;
    continueCard.querySelector("p").textContent = `${nextLesson.course.trail} - proxima aula sugerida automaticamente.`;
  }

  const trailCount = document.querySelector("[data-university-trail-count]");
  if (trailCount) {
    trailCount.textContent = `${universityTrails.length} trilhas`;
  }

  const trailList = document.querySelector("[data-university-trails]");
  if (trailList) {
    trailList.innerHTML = universityTrails
      .map(
        (trail) => `
          <article data-category="${trail.category}">
            <span>${trail.courses} curso</span>
            <strong>${trail.title}</strong>
            ${trail.status === "Em expansao" ? `<small>Em expansao</small>` : `<small>Publicado</small>`}
          </article>
        `
      )
      .join("");
  }

  const activeCourseCount = document.querySelector("[data-university-active-count]");
  if (activeCourseCount) {
    activeCourseCount.textContent = `${activeCourses.length} cursos`;
  }

  const activeCourseGrid = document.querySelector("[data-university-active-courses]");
  if (activeCourseGrid) {
    activeCourseGrid.innerHTML = activeCourses
      .map(
        (course) => `
          <article>
            <span>${course.trail}</span>
            <h4>${course.title}</h4>
            <p>${course.audience} - ${course.hours}h</p>
            <div class="premium-progress"><i style="--value:${course.progress}%"></i><strong>${course.progress}%</strong></div>
            <button type="button" data-complete-university-lesson>Continuar Aprendendo</button>
          </article>
        `
      )
      .join("");
  }

  const upcomingList = document.querySelector("[data-university-upcoming]");
  if (upcomingList) {
    upcomingList.innerHTML = upcomingCourses
      .map(
        (course) => `
          <article>
            <strong>${course.title}</strong>
            <span>${course.trail}</span>
            <small>${course.status}</small>
          </article>
        `
      )
      .join("");
  }

  const certificateCard = document.querySelector("[data-university-certificates]");
  if (certificateCard) {
    certificateCard.innerHTML = `
      <strong>${totalCertificates}</strong>
      <span>certificados emitidos</span>
      <p>Certificados preparados para emissao por curso, trilha e carga horaria.</p>
    `;
  }

  const videoGrid = document.querySelector("[data-university-videos]");
  if (videoGrid) {
    videoGrid.innerHTML = activeCourses
      .flatMap((course) => course.lessons.slice(0, 2).map((lesson) => ({ course, lesson })))
      .slice(0, 4)
      .map(
        ({ course, lesson }) => `
          <article>
            <span></span>
            <div>
              <strong>${lesson.title}</strong>
              <small>${course.title}</small>
            </div>
          </article>
        `
      )
      .join("");
  }

  const resourceList = document.querySelector("[data-university-resources]");
  if (resourceList) {
    resourceList.innerHTML = activeCourses
      .flatMap((course) => course.materials.map((material) => ({ course, material })))
      .slice(0, 5)
      .map(({ course, material }) => `<article><strong>${material}</strong><span>${course.title}</span></article>`)
      .join("");
  }

  const assessmentList = document.querySelector("[data-university-assessments]");
  if (assessmentList) {
    assessmentList.innerHTML = activeCourses
      .flatMap((course) => course.assessments.map((assessment) => ({ course, assessment })))
      .slice(0, 5)
      .map(({ course, assessment }) => `<article><strong>${assessment}</strong><span>${course.trail}</span></article>`)
      .join("");
  }
};

document.addEventListener("click", (event) => {
  if (!event.target.matches("[data-complete-university-lesson]")) {
    return;
  }

  const nextLesson = getNextUniversityLesson();
  localStorage.setItem("university:lastCompletedLesson", nextLesson.lesson.id);
  renderUniversityLive();
});

document.querySelector("[data-university-search]")?.addEventListener("input", renderUniversityLive);

document.querySelectorAll("[data-university-filter]").forEach((filterButton) => {
  filterButton.addEventListener("click", () => {
    activeUniversityFilter = filterButton.dataset.universityFilter || "all";
    document.querySelectorAll("[data-university-filter]").forEach((button) => {
      button.classList.toggle("is-active", button === filterButton);
    });
    renderUniversityLive();
  });
});

document.querySelector("[data-course-search]")?.addEventListener("input", () => {
  visibleCourseLimit = 4;
  renderSmartDiscovery();
  renderCourseCatalog();
});

document.querySelector("[data-course-sort]")?.addEventListener("change", () => {
  visibleCourseLimit = 4;
  renderCourseCatalog();
});

document.addEventListener("change", (event) => {
  const filter = event.target.closest?.("[data-course-filter]");
  if (!filter) {
    return;
  }

  const key = filter.dataset.courseFilter;
  if (filter.value) {
    activeCourseFilters[key] = filter.value;
  } else {
    delete activeCourseFilters[key];
  }
  visibleCourseLimit = 4;
  renderCourseCatalog();
});

document.querySelector("[data-clear-course-filters]")?.addEventListener("click", () => {
  activeCourseFilters = {};
  visibleCourseLimit = 4;
  document.querySelectorAll("[data-course-filter]").forEach((filter) => {
    filter.value = "";
  });
  const search = document.querySelector("[data-course-search]");
  if (search) {
    search.value = "";
  }
  renderSmartDiscovery();
  renderCourseCatalog();
});

document.querySelector("[data-toggle-more-filters]")?.addEventListener("click", (event) => {
  areAdvancedCourseFiltersVisible = !areAdvancedCourseFiltersVisible;
  event.currentTarget.setAttribute("aria-expanded", String(areAdvancedCourseFiltersVisible));
  event.currentTarget.textContent = areAdvancedCourseFiltersVisible ? "Menos filtros" : "Mais filtros";
  renderCourseCatalog();
});

document.querySelector("[data-open-mobile-filters]")?.addEventListener("click", () => {
  document.querySelector("[data-filter-panel]")?.classList.add("is-mobile-open");
  document.body.classList.add("modal-open");
});

document.querySelector("[data-close-mobile-filters]")?.addEventListener("click", () => {
  document.querySelector("[data-filter-panel]")?.classList.remove("is-mobile-open");
  document.body.classList.remove("modal-open");
});

document.querySelector("[data-course-load-more]")?.addEventListener("click", () => {
  visibleCourseLimit += 4;
  renderCourseCatalog();
});

document.addEventListener("click", (event) => {
  const knowledgeButton = event.target.closest?.("[data-open-knowledge-center]");
  if (knowledgeButton) {
    const center = demoKnowledgeCenters.find((item) => item.id === knowledgeButton.dataset.openKnowledgeCenter);
    renderKnowledgeCenterDetail(knowledgeButton.dataset.openKnowledgeCenter);
    if (center) {
      history.replaceState(null, "", `#centro-${center.slug}`);
    }
    return;
  }

  const quickTheme = event.target.closest?.("[data-quick-theme]");
  if (quickTheme) {
    const theme = quickTheme.dataset.quickTheme;
    if (theme) {
      activeCourseFilters.theme = theme;
    } else {
      delete activeCourseFilters.theme;
    }
    visibleCourseLimit = 4;
    renderCourseCatalog();
    return;
  }

  const removeFilter = event.target.closest?.("[data-remove-course-filter]");
  if (removeFilter) {
    delete activeCourseFilters[removeFilter.dataset.removeCourseFilter];
    visibleCourseLimit = 4;
    renderCourseCatalog();
    return;
  }

  const detailButton = event.target.closest?.("[data-open-course-detail]");
  if (detailButton) {
    renderCourseDetail(detailButton.dataset.openCourseDetail);
    const course = demoCuratedCourses.find((item) => item.id === detailButton.dataset.openCourseDetail);
    history.replaceState(null, "", `#curso-${course?.slug || detailButton.dataset.openCourseDetail}`);
    return;
  }

  const authAction = event.target.closest?.("[data-auth-course-action]");
  if (authAction) {
    if (!isDemoAuthenticated()) {
      requestCatalogLogin();
      return;
    }
    const actionKey = `catalog:${authAction.dataset.authCourseAction}:${authAction.dataset.courseId}`;
    localStorage.setItem(actionKey, new Date().toISOString());
    authAction.textContent = "Registrado";
    authAction.disabled = true;
    return;
  }

  const externalLink = event.target.closest?.("[data-external-course]");
  if (externalLink) {
    const courseId = externalLink.dataset.externalCourse;
    const clickKey = `catalog:external-click:${courseId}`;
    const previousCount = Number(localStorage.getItem(clickKey) || "0");
    localStorage.setItem(clickKey, String(previousCount + 1));
    const logKey = "catalog:external-click-log";
    const previousLog = JSON.parse(localStorage.getItem(logKey) || "[]");
    previousLog.push({
      courseId,
      clickedAt: new Date().toISOString(),
      user: isDemoAuthenticated() ? "demo-authenticated-user" : null,
    });
    localStorage.setItem(logKey, JSON.stringify(previousLog.slice(-50)));
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && videoModal && !videoModal.hidden) {
    closeVideoModal();
  }
});

syncHeader();
renderUniversityLive();
renderKnowledgeCenterCards();
renderCourseCatalog();
renderSmartDiscovery();
if (window.location.hash.startsWith("#curso-")) {
  const slug = window.location.hash.replace("#curso-", "");
  const course = demoCuratedCourses.find((item) => item.slug === slug || item.id === slug);
  if (course) {
    renderCourseDetail(course.id);
  }
}
if (window.location.hash.startsWith("#centro-")) {
  const slug = window.location.hash.replace("#centro-", "");
  const center = demoKnowledgeCenters.find((item) => item.slug === slug || item.id === slug);
  if (center) {
    renderKnowledgeCenterDetail(center.id);
  }
}
window.addEventListener("scroll", syncHeader, { passive: true });
syncLibrary();
