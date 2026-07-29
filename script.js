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
  { id: "prov-evg", name: "EV.G - Escola Virtual.Gov", type: "Plataforma publica federal", highlighted: true },
  { id: "prov-ufrgs-lumina", name: "Lumina/UFRGS", type: "Universidade federal publica", highlighted: true },
  { id: "prov-ifsul-mundi", name: "Mundi/IFSul", type: "Instituto federal publico", highlighted: true },
  { id: "prov-uema-eskada", name: "ESKADA/UEMA", type: "Universidade estadual publica", highlighted: true },
];

const demoCuratedCourses = [
  {
    id: "real-docencia-plural",
    title: "Docencia Plural - Formacao em Interculturalidade e Bilinguismo",
    slug: "docencia-plural-interculturalidade-bilinguismo",
    providerId: "prov-evg",
    area: "Educacao",
    theme: "Educacao Inclusiva",
    category: "Inclusao e diversidade",
    knowledgeCenter: "Educacao Inclusiva",
    relatedTrail: "Formacao Docente",
    workloadHours: 40,
    workloadLabel: "40h",
    modality: "Online",
    level: "Intermediario",
    audience: "Professores, formadores e gestores educacionais",
    certificateAvailable: true,
    certificateLabel: "Certificado Enap informado pela EV.G",
    selfPaced: true,
    enrollmentStatus: "Inscricoes abertas",
    enrollmentDeadline: null,
    isFree: true,
    language: "pt-BR",
    rating: 4.6,
    reviewsCount: 48,
    accessCount: 0,
    addedAt: "2026-07-29",
    lastVerifiedAt: "2026-07-29",
    verificationStatus: "link oficial testado",
    status: "publicado",
    featured: true,
    imageUrl: "assets/universidade/curso-educacao-inclusiva.webp",
    courseUrl: "https://www.escolavirtual.gov.br/curso/918",
    summary: "Curso aberto e gratuito da EV.G sobre docencia em contextos linguisticos e culturais diversos.",
    fullDescription: "A pagina oficial informa curso aberto, gratuito e com certificado, voltado a professores e equipes educacionais que atuam em contextos plurais.",
    objectives: ["Compreender contextos linguisticos e culturais diversos", "Apoiar uma docencia plural", "Relacionar interculturalidade e educacao linguistica"],
    syllabus: ["Fronteiras linguisticas e culturais", "Interculturalidade", "Fenomenos linguisticos", "Gestao de linguas na escola"],
    requirements: "Curso aberto. A inscricao e realizada no ambiente oficial da EV.G.",
    curatorRecommendedFor: "Professores e gestores que buscam referencias para diversidade linguistica, cultural e inclusao.",
    curatorStrengths: ["Instituicao publica reconhecida", "Carga horaria e certificado informados oficialmente", "Tema aderente a Educacao Inclusiva"],
    curatorEstimatedLevel: "Intermediario",
    curatorNotes: "Usar como primeiro exemplo da narrativa de curadoria: a Raizes organiza a descoberta e direciona para a instituicao ofertante.",
    tags: ["educacao inclusiva", "bilinguismo", "formacao docente", "certificado"],
    comments: [],
  },
  {
    id: "real-aprender-valor",
    title: "Formacao de Professores do Programa Aprender Valor",
    slug: "formacao-professores-programa-aprender-valor",
    providerId: "prov-evg",
    area: "Educacao",
    theme: "Educacao Financeira",
    category: "Educacao financeira",
    knowledgeCenter: "BNCC",
    relatedTrail: "Formacao Docente",
    workloadHours: 40,
    workloadLabel: "40h",
    modality: "Online",
    level: "Introdutorio",
    audience: "Professores da educacao basica",
    certificateAvailable: true,
    certificateLabel: "Certificado Enap informado pela EV.G",
    selfPaced: true,
    enrollmentStatus: "Inscricoes abertas",
    enrollmentDeadline: null,
    isFree: true,
    language: "pt-BR",
    rating: 4.1,
    reviewsCount: 263,
    accessCount: 0,
    addedAt: "2026-07-29",
    lastVerifiedAt: "2026-07-29",
    verificationStatus: "link oficial testado",
    status: "publicado",
    featured: true,
    imageUrl: "assets/universidade/trilha-praticas-pedagogicas.webp",
    courseUrl: "https://www.escolavirtual.gov.br/curso/1072",
    summary: "Curso gratuito da EV.G para professores interessados em educacao financeira na escola.",
    fullDescription: "A pagina oficial apresenta curso aberto, gratuito e com certificado para docentes que desejam implementar o Programa Aprender Valor em sala de aula.",
    objectives: ["Conhecer o Programa Aprender Valor", "Planejar projetos pedagogicos contextualizados", "Integrar educacao financeira ao curriculo"],
    syllabus: ["Introducao ao Aprender Valor", "Aprender Valor na sala de aula"],
    requirements: "Curso aberto. A inscricao e realizada no ambiente oficial da EV.G.",
    curatorRecommendedFor: "Professores da educacao basica e coordenadores que organizam projetos interdisciplinares.",
    curatorStrengths: ["Oferta de instituicao publica", "Certificado e carga horaria confirmados", "Boa conexao com BNCC e projetos escolares"],
    curatorEstimatedLevel: "Introdutorio",
    curatorNotes: "Bom curso para demonstrar busca por tema, detalhe do curso e redirecionamento externo confiavel.",
    tags: ["educacao financeira", "bncc", "professores", "certificado"],
    comments: [],
  },
  {
    id: "real-alimentacao-saudavel-escola",
    title: "Alimentacao Saudavel na Escola - Edicao 2023",
    slug: "alimentacao-saudavel-na-escola-ufrgs",
    providerId: "prov-ufrgs-lumina",
    area: "Educacao",
    theme: "Educacao Alimentar",
    category: "Saude e escola",
    knowledgeCenter: "Educacao Infantil",
    relatedTrail: "Gestao Pedagogica",
    workloadHours: 0,
    workloadLabel: "Nao informada na ficha aberta",
    modality: "Online",
    level: "Introdutorio",
    audience: "Profissionais da educacao, nutricao e comunidade escolar",
    certificateAvailable: false,
    certificateLabel: "Pagina oficial informa que nao oferece certificado",
    selfPaced: true,
    enrollmentStatus: "Disponivel no Lumina",
    enrollmentDeadline: null,
    isFree: true,
    language: "pt-BR",
    rating: 0,
    reviewsCount: 0,
    accessCount: 0,
    addedAt: "2026-07-29",
    lastVerifiedAt: "2026-07-29",
    verificationStatus: "link oficial testado",
    status: "publicado",
    featured: false,
    imageUrl: "assets/universidade/material-pdf.webp",
    courseUrl: "https://lumina.ufrgs.br/course/view.php?id=221",
    summary: "Curso do Lumina/UFRGS sobre promocao da alimentacao saudavel no ambiente escolar.",
    fullDescription: "A pagina oficial descreve uma formacao voltada a profissionais e interessados na promocao da alimentacao saudavel na escola, sem certificado informado para esta edicao.",
    objectives: ["Sensibilizar para a educacao alimentar e nutricional", "Relacionar alimentacao escolar e aprendizagem", "Apoiar acoes de promocao da saude na escola"],
    syllabus: ["Promocao da alimentacao saudavel", "Educacao alimentar e nutricional", "Avaliacao"],
    requirements: "Nao ha pre-requisitos informados na pagina oficial.",
    curatorRecommendedFor: "Gestores, coordenadores e professores que trabalham projetos de saude, alimentacao e rotina escolar.",
    curatorStrengths: ["Instituicao federal reconhecida", "Tema com aplicacao direta na escola", "Certificado sinalizado com transparencia"],
    curatorEstimatedLevel: "Introdutorio",
    curatorNotes: "Manter a etiqueta de certificado ausente para demonstrar transparencia da curadoria.",
    tags: ["alimentacao escolar", "saude", "educacao infantil", "sem certificado"],
    comments: [],
  },
  {
    id: "real-inclusao-acessibilidade-ifsul",
    title: "Inclusao e Acessibilidade na Educacao",
    slug: "inclusao-acessibilidade-educacao-ifsul",
    providerId: "prov-ifsul-mundi",
    area: "Educacao",
    theme: "Educacao Inclusiva",
    category: "Inclusao e diversidade",
    knowledgeCenter: "Educacao Inclusiva",
    relatedTrail: "Formacao Docente",
    workloadHours: 30,
    workloadLabel: "30h",
    modality: "Online",
    level: "Basico",
    audience: "Educadores e profissionais interessados em inclusao",
    certificateAvailable: true,
    certificateLabel: "Plataforma Mundi informa cursos livres com certificado",
    selfPaced: true,
    enrollmentStatus: "Disponivel na plataforma Mundi",
    enrollmentDeadline: null,
    isFree: true,
    language: "pt-BR",
    rating: 0,
    reviewsCount: 0,
    accessCount: 0,
    addedAt: "2026-07-29",
    lastVerifiedAt: "2026-07-29",
    verificationStatus: "link oficial testado",
    status: "publicado",
    featured: true,
    imageUrl: "assets/universidade/trilha-inclusao-diversidade.webp",
    courseUrl: "https://mundi.ifsul.edu.br/portal/inclusao-e-acessibilidade-na-educacao.php",
    summary: "Curso MOOC do IFSul sobre necessidades educacionais, acessibilidade e adaptacoes pedagogicas.",
    fullDescription: "A pagina oficial do Mundi/IFSul informa curso de 30h, nivel basico e pre-requisito nenhum, com foco em inclusao e acessibilidade na educacao.",
    objectives: ["Diferenciar necessidades educacionais", "Reconhecer aspectos de acessibilidade", "Adaptar atividades pedagogicas ao contexto"],
    syllabus: ["Necessidades especiais", "Inclusao e acessibilidade", "Atendimento educacional especializado"],
    requirements: "Nenhum pre-requisito informado na pagina oficial.",
    curatorRecommendedFor: "Professores e equipes de apoio que precisam de uma introducao pratica a inclusao.",
    curatorStrengths: ["Instituto federal reconhecido", "Carga horaria clara", "Tema prioritario para escolas"],
    curatorEstimatedLevel: "Basico",
    curatorNotes: "Excelente curso para demonstrar diversidade de instituicoes publicas e Centro de Conhecimento de Educacao Inclusiva.",
    tags: ["educacao inclusiva", "acessibilidade", "ifsul", "certificado"],
    comments: [],
  },
  {
    id: "real-alfabetizacao-letramento-tecnologias",
    title: "Alfabetizacao, Letramento e Tecnologias Digitais",
    slug: "alfabetizacao-letramento-tecnologias-digitais-uema",
    providerId: "prov-uema-eskada",
    area: "Educacao",
    theme: "Alfabetizacao",
    category: "Praticas pedagogicas",
    knowledgeCenter: "Alfabetizacao",
    relatedTrail: "Tecnologias Educacionais",
    workloadHours: 0,
    workloadLabel: "Nao informada na ficha aberta",
    modality: "Online",
    level: "Introdutorio",
    audience: "Professores e interessados em alfabetizacao",
    certificateAvailable: true,
    certificateLabel: "Curso gratuito na plataforma ESKADA; certificado requer verificacao da plataforma",
    selfPaced: true,
    enrollmentStatus: "Disponivel na ESKADA",
    enrollmentDeadline: null,
    isFree: true,
    language: "pt-BR",
    rating: 0,
    reviewsCount: 0,
    accessCount: 0,
    addedAt: "2026-07-29",
    lastVerifiedAt: "2026-07-29",
    verificationStatus: "link oficial testado",
    status: "publicado",
    featured: true,
    imageUrl: "assets/biblioteca/RAIZES_GUIA_ALFABETIZADOR_INFANTIL5_BIBLIOTECA.webp",
    courseUrl: "https://eskadauema.com/course/view.php?id=94",
    summary: "Curso gratuito da ESKADA/UEMA que conecta alfabetizacao, letramento e tecnologias digitais.",
    fullDescription: "A pagina oficial da ESKADA apresenta o curso como gratuito e direciona o usuario para o ambiente oficial da Universidade Estadual do Maranhao.",
    objectives: ["Relacionar alfabetizacao e letramento", "Explorar tecnologias digitais no ensino", "Apoiar praticas pedagogicas de professores"],
    syllabus: ["Alfabetizacao", "Letramento", "Tecnologias digitais aplicadas ao ensino"],
    requirements: "Acesso ao ambiente oficial da ESKADA/UEMA.",
    curatorRecommendedFor: "Professores dos anos iniciais e equipes que buscam integrar tecnologia ao processo de alfabetizacao.",
    curatorStrengths: ["Universidade estadual publica", "Tema central para a Universidade", "Boa ponte entre alfabetizacao e tecnologia educacional"],
    curatorEstimatedLevel: "Introdutorio",
    curatorNotes: "Manter em destaque para demonstrar diversidade institucional e percurso por Centro de Conhecimento.",
    tags: ["alfabetizacao", "letramento", "tecnologia", "uema"],
    comments: [],
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
const initialCourseLimit = 5;
let visibleCourseLimit = initialCourseLimit;
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
    status: "com cursos reais",
    createdAt: "2026-07-27",
    updatedAt: "2026-07-29",
    relatedCourseIds: ["real-docencia-plural", "real-inclusao-acessibilidade-ifsul"],
    relatedCategories: ["Inclusao", "Convivencia", "Gestao escolar"],
  },
  {
    id: "kc-bncc",
    title: "BNCC",
    slug: "bncc",
    shortDescription: "Cursos e referencias para curriculo, projetos escolares e formacao docente.",
    fullDescription: "Centro preparado para organizar cursos reais e materiais sobre fundamentos curriculares, projetos escolares e praticas alinhadas a escola.",
    imageUrl: "assets/universidade/material-pdf.webp",
    category: "Curriculo",
    keywords: ["bncc", "curriculo", "planejamento", "competencias"],
    level: "Introdutorio",
    audience: "Professores e coordenadores",
    color: "#0d6b4b",
    icon: "BN",
    featured: true,
    status: "com cursos reais",
    createdAt: "2026-07-27",
    updatedAt: "2026-07-29",
    relatedCourseIds: ["real-aprender-valor"],
    relatedCategories: ["Curriculo", "Planejamento", "Avaliacao"],
  },
  {
    id: "kc-alfabetizacao",
    title: "Alfabetizacao",
    slug: "alfabetizacao",
    shortDescription: "Percursos para fundamentos, praticas e tecnologias ligadas a alfabetizacao.",
    fullDescription: "Centro preparado para organizar cursos, guias e materiais complementares sobre alfabetizacao, letramento e tecnologias digitais.",
    imageUrl: "assets/biblioteca/RAIZES_GUIA_ALFABETIZADOR_INFANTIL5_BIBLIOTECA.webp",
    category: "Praticas pedagogicas",
    keywords: ["alfabetizacao", "letramento", "leitura", "escrita"],
    level: "Introdutorio",
    audience: "Professores da educacao infantil e anos iniciais",
    color: "#3f6f34",
    icon: "AL",
    featured: true,
    status: "com cursos reais",
    createdAt: "2026-07-27",
    updatedAt: "2026-07-29",
    relatedCourseIds: ["real-alfabetizacao-letramento-tecnologias"],
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
    status: "com cursos reais",
    createdAt: "2026-07-27",
    updatedAt: "2026-07-29",
    relatedCourseIds: ["real-alfabetizacao-letramento-tecnologias"],
    relatedCategories: ["Ferramentas", "Videos", "Cursos"],
  },
  {
    id: "kc-gestao-escolar",
    title: "Gestao Escolar",
    slug: "gestao-escolar",
    shortDescription: "Temas para planejamento, rotina escolar, projetos e acompanhamento pedagogico.",
    fullDescription: "Centro preparado para organizar recursos por perfil de gestor, coordenador e equipe tecnica.",
    imageUrl: "assets/universidade/trilha-gestao.webp",
    category: "Gestao",
    keywords: ["gestao escolar", "indicadores", "lideranca", "planejamento"],
    level: "Intermediario",
    audience: "Gestores e coordenadores pedagogicos",
    color: "#745d21",
    icon: "GE",
    featured: false,
    status: "com curso real",
    createdAt: "2026-07-27",
    updatedAt: "2026-07-29",
    relatedCourseIds: ["real-alimentacao-saudavel-escola", "real-aprender-valor"],
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
    status: "preparado",
    createdAt: "2026-07-27",
    updatedAt: "2026-07-29",
    relatedCourseIds: ["real-aprender-valor"],
    relatedCategories: ["Rubricas", "Diagnostico", "Devolutivas"],
  },
];

const demoKnowledgeCategories = [
  ["infantil", "Educacao Infantil", "Base para praticas, acolhimento e desenvolvimento integral.", "EI", "#3f6f34", 18],
  ["fundamental", "Ensino Fundamental", "Percursos futuros por areas, habilidades e recomposicao.", "EF", "#07543d", 12],
  ["inclusao", "Inclusao", "Conhecimento organizado para acessibilidade, autismo e diversidade.", "IN", "#0d6b4b", 16],
  ["avaliacao", "Avaliacao", "Diagnostico, rubricas, devolutivas e acompanhamento.", "AV", "#7a812e", 14],
  ["tecnologia", "Tecnologia", "Recursos digitais, ferramentas e boas praticas.", "TE", "#1f6f73", 10],
  ["gestao", "Gestao", "Indicadores, lideranca pedagogica e planejamento.", "GE", "#745d21", 13],
  ["alfabetizacao", "Alfabetizacao", "Leitura, escrita, letramento e fundamentos.", "AL", "#3f6f34", 11],
  ["bncc", "BNCC", "Curriculo, competencias, planejamento e referencias.", "BN", "#0d6b4b", 9],
];

const learningLevels = [
  ["beginner", "Iniciante", "Primeiros conceitos e vocabulario essencial.", "#2e7d32"],
  ["intermediate", "Intermediario", "Aplicacao pedagogica e conexao entre recursos.", "#c49a1f"],
  ["advanced", "Avancado", "Aprofundamento, especializacao e multiplicacao.", "#a34d3f"],
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
  demoCourseProviders.find((provider) => provider.id === providerId)?.name || "Instituicao ofertante";

const getProviderType = (providerId) =>
  demoCourseProviders.find((provider) => provider.id === providerId)?.type || "Instituicao ofertante";

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

const getCourseWorkloadLabel = (course) => course.workloadLabel || (course.workloadHours ? `${course.workloadHours}h` : "Nao informada");

const getCourseRatingLabel = (course) =>
  course.reviewsCount > 0 ? `${renderStars(course.rating)}<b>${course.rating.toFixed(1)}</b>` : "<span>Sem avaliacoes na plataforma</span>";

const getCourseCuration = (course) => ({
  recommendedFor: course.curatorRecommendedFor || course.audience,
  strengths: course.curatorStrengths || [
    "Ficha adequada para comparacao rapida entre ofertas gratuitas.",
    course.certificateAvailable ? "Informa certificado disponivel." : "Deixa clara a ausencia de certificado.",
    course.selfPaced ? "Pode ser cursado no ritmo do profissional." : "Possui acompanhamento por turma ou prazo.",
  ],
  estimatedLevel: course.curatorEstimatedLevel || course.level,
  observations: course.curatorNotes || "Informacoes organizadas pela curadoria Raizes e Saberes.",
  updatedAt: course.lastVerifiedAt,
});

const getRatingDistribution = (course) => {
  if (!course.reviewsCount) {
    return [0, 0, 0, 0, 0];
  }
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
      (value === "short" && course.workloadHours > 0 && course.workloadHours <= 15) ||
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
      return (firstCourse.workloadHours || 999) - (secondCourse.workloadHours || 999);
    }
    return Number(secondCourse.featured) - Number(firstCourse.featured) || secondCourse.rating - firstCourse.rating;
  });
};

const renderCourseCard = (course) => `
  <article class="public-course-card" data-course-id="${course.id}">
    <figure>
      <img src="${course.imageUrl}" alt="Capa institucional do curso ${course.title}" loading="lazy" />
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
        <div><dt>Carga</dt><dd>${getCourseWorkloadLabel(course)}</dd></div>
        <div><dt>Modalidade</dt><dd>${course.modality}</dd></div>
        <div><dt>Certificado</dt><dd>${course.certificateAvailable ? "Informado" : "Nao oferece"}</dd></div>
        <div><dt>Inscricao</dt><dd>${course.enrollmentStatus}</dd></div>
      </dl>
      <div class="course-card-metrics">
        <span>${getCourseRatingLabel(course)}</span>
        <span>${course.reviewsCount ? `${course.reviewsCount} avaliacoes oficiais` : "Sem avaliacoes locais"}</span>
        <span>${course.accessCount.toLocaleString("pt-BR")} acessos pela plataforma</span>
      </div>
      <button type="button" data-open-course-detail="${course.id}">Ver detalhes</button>
    </div>
  </article>
`;

const renderCompactCourseList = (courses) =>
  courses.map((course) => `<button type="button" data-open-course-detail="${course.id}"><strong>${course.title}</strong><span>${getProviderName(course.providerId)} - ${getCourseWorkloadLabel(course)} - ${course.reviewsCount ? course.rating.toFixed(1) : "sem avaliacao local"}</span></button>`).join("");

const renderMiniCourseCards = (courses) =>
  courses
    .map(
      (course) => `
        <article class="mini-course-card">
          <img src="${course.imageUrl}" alt="Capa institucional do curso ${course.title}" loading="lazy" />
          <div>
            <span>Gratuito</span>
            <h4>${course.title}</h4>
            <p>${getProviderName(course.providerId)}</p>
            <div>${course.reviewsCount ? `${renderStars(course.rating)}<strong>${course.rating.toFixed(1)}</strong>` : "<strong>Sem avaliacao local</strong>"}</div>
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

const renderKnowledgeCategoryCards = () => {
  const target = document.querySelector("[data-knowledge-categories]");
  if (!target) {
    return;
  }

  target.innerHTML = demoKnowledgeCategories
    .map(
      ([id, title, description, icon, color, count]) => `
        <article style="--category-color:${color}" data-knowledge-category="${id}">
          <span>${icon}</span>
          <strong>${title}</strong>
          <p>${description}</p>
          <small>${count} conteudos preparados</small>
        </article>
      `
    )
    .join("");
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
          <img src="${center.imageUrl}" alt="Imagem do centro ${center.title}" loading="lazy" />
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

const getKnowledgeJourney = (center) => [
  ["Conceito", "Entenda o tema", "25 min", "preparado"],
  ["Contexto", "Conheca referencias e criterios", "35 min", "preparado"],
  ["Curso", getKnowledgeCenterCourses(center)[0]?.title || "Curso introdutorio", getKnowledgeCenterCourses(center)[0] ? getCourseWorkloadLabel(getKnowledgeCenterCourses(center)[0]) : "disponivel", "disponivel"],
  ["Materiais", "Baixe materiais de apoio", "40 min", "futuro"],
  ["Video", "Assista exemplos comentados", "15 min", "futuro"],
  ["Aprofundamento", "Avance para aplicacoes praticas", "1h", "preparado"],
  ["Comunidade", "Compare experiencias e duvidas", "20 min", "futuro"],
  ["Continuar", "Receba recomendacoes relacionadas", "continuo", "preparado"],
];

const getKnowledgeLearningPaths = (center) => {
  const courses = getKnowledgeCenterCourses(center);
  const primaryCourse = courses[0];
  const secondaryCourse = courses[1] || courses[0];
  return [
    {
      name: "Professor da Educacao Infantil",
      description: "Percurso para compreender o tema e aplicar em planejamento de aula.",
      progress: 35,
      steps: [
        ["Resumo", "Leitura guiada", "20 min", "preparado"],
        ["Livro", "Referencia futura", "2h de leitura", "futuro"],
        ["Curso", primaryCourse?.title || "Curso introdutorio", primaryCourse ? getCourseWorkloadLabel(primaryCourse) : "disponivel", "disponivel"],
        ["Video", "Exemplo comentado", "15 min", "futuro"],
        ["Guia", "Roteiro pratico", "40 min", "futuro"],
        ["Conclusao", "Autoavaliacao preparada", "10 min", "preparado"],
      ],
    },
    {
      name: "Coordenador Pedagogico",
      description: "Percurso para orientar equipes e organizar acompanhamento.",
      progress: 20,
      steps: [
        ["Resumo", "Panorama do tema", "25 min", "preparado"],
        ["Curso", secondaryCourse?.title || "Curso de aprofundamento", secondaryCourse ? getCourseWorkloadLabel(secondaryCourse) : "disponivel", "disponivel"],
        ["Legislacao", "Estrutura futura", "30 min", "futuro"],
        ["Material", "Instrumento de apoio", "45 min", "futuro"],
        ["Evento", "Encontro futuro", "1h", "futuro"],
      ],
    },
    {
      name: "Gestor Escolar",
      description: "Percurso para decisao institucional, indicadores e comunicacao.",
      progress: 15,
      steps: [
        ["Diagnostico", "Leitura inicial", "20 min", "preparado"],
        ["Curso", primaryCourse?.title || "Curso relacionado", `${primaryCourse?.workloadHours || 2}h`, "disponivel"],
        ["Ferramenta", "Painel futuro", "30 min", "futuro"],
        ["Guia", "Procedimento institucional", "40 min", "futuro"],
        ["Conclusao", "Plano de continuidade", "25 min", "preparado"],
      ],
    },
  ];
};

const getPathTotalTime = (steps) =>
  steps
    .map(([, , time]) => time)
    .join(" + ");

const renderLearningMap = (center) => `
  <section class="knowledge-learning-map">
    <header><span>Mapa do Conhecimento</span><strong>Roteiro visual de aprendizagem</strong></header>
    <div>
      ${getKnowledgeJourney(center)
        .map(
          ([type, title, time, status], index) => `
            <article class="is-${status}">
              <i>${String(index + 1).padStart(2, "0")}</i>
              <span>${type}</span>
              <strong>${title}</strong>
              <small>${time} - ${status}</small>
            </article>
          `
        )
        .join("")}
    </div>
  </section>
`;

const renderLearningLevels = (center) => {
  const courses = getKnowledgeCenterCourses(center);
  return `
    <section class="knowledge-levels-panel">
      <header><span>Niveis</span><strong>Conteudos organizados por maturidade</strong></header>
      <div>
        ${learningLevels
          .map(
            ([key, label, description, color], index) => `
              <article style="--level-color:${color}">
                <span>${label}</span>
                <p>${description}</p>
                <strong>${index === 0 ? courses.length : index === 1 ? 2 : 1} recursos preparados</strong>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
};

const renderModernLearningPaths = (center) => `
  <section class="knowledge-modern-paths">
    <header><span>Trilhas de Aprendizagem</span><strong>Percursos por perfil</strong></header>
    <div>
      ${getKnowledgeLearningPaths(center)
        .map(
          (path) => `
            <article>
              <div class="path-head">
                <div><h3>${path.name}</h3><p>${path.description}</p></div>
                <strong>${path.progress}%</strong>
              </div>
              <div class="path-progress"><i style="width:${path.progress}%"></i></div>
              <small>Tempo estimado: ${getPathTotalTime(path.steps)}</small>
              <ol>
                ${path.steps
                  .map(
                    ([type, title, time, status]) => `
                      <li class="is-${status}">
                        <span>${type.slice(0, 2).toUpperCase()}</span>
                        <div><strong>${title}</strong><small>${type} - ${time} - ${status}</small></div>
                      </li>
                    `
                  )
                  .join("")}
              </ol>
            </article>
          `
        )
        .join("")}
    </div>
  </section>
`;

const renderKnowledgeRecommendations = (center) => {
  const recommendations = demoKnowledgeCenters
    .filter((item) => item.id !== center.id && (item.category === center.category || item.relatedCategories.some((category) => center.relatedCategories.includes(category))))
    .slice(0, 3);

  return `
    <section class="knowledge-recommendations">
      <header><span>Voce tambem pode aprender</span><strong>Recomendacoes por tema, categoria e tags</strong></header>
      <div>${recommendations.length ? recommendations.map((item) => `<button type="button" data-open-knowledge-center="${item.id}"><strong>${item.title}</strong><span>${item.shortDescription}</span></button>`).join("") : "<p>Novas recomendacoes aparecerao quando houver mais centros relacionados.</p>"}</div>
    </section>
  `;
};

const renderKnowledgeSeoShare = (center) => `
  <section class="knowledge-seo-share">
    <article>
      <span>SEO preparado</span>
      <dl>
        <div><dt>Slug</dt><dd>${center.slug}</dd></div>
        <div><dt>Title</dt><dd>${center.title} | Universidade Raizes e Saberes</dd></div>
        <div><dt>Description</dt><dd>${center.shortDescription}</dd></div>
        <div><dt>Keywords</dt><dd>${center.keywords.join(", ")}</dd></div>
        <div><dt>Canonical</dt><dd>universidade.html#centro-${center.slug}</dd></div>
        <div><dt>JSON-LD</dt><dd>Estrutura preparada para WebPage e BreadcrumbList.</dd></div>
      </dl>
    </article>
    <article>
      <span>Compartilhamento preparado</span>
      <div class="share-action-grid">
        <button type="button" data-share-placeholder="center">Compartilhar Centro</button>
        <button type="button" data-share-placeholder="copy">Copiar link</button>
        <button type="button" data-share-placeholder="qr">QR Code</button>
      </div>
    </article>
  </section>
`;

const renderGuidedExperience = (center) => `
  ${renderLearningMap(center)}
  ${renderLearningLevels(center)}
  ${renderModernLearningPaths(center)}
  ${renderKnowledgeRecommendations(center)}
  ${renderKnowledgeSeoShare(center)}
`;

const renderPreparedResourceBlocks = (center) => {
  const courses = getKnowledgeCenterCourses(center);
  const demoBlocks = {
    courses,
    paths: [
      ["Professor", "Percurso para estudo individual e aplicacao em sala.", courses.length],
      ["Coordenador", "Percurso para orientar planejamento e acompanhamento.", courses.length],
      ["Gestor", "Percurso para decisao pedagogica e leitura de indicadores.", courses.length],
      ["Familia", "Percurso futuro para comunicacao e apoio ao estudante.", 0],
      ["Administrador Escolar", "Percurso futuro para organizacao institucional.", 0],
    ],
    faq: [
      ["Este centro possui conteudo real?", "Sim. Os cursos exibidos nesta apresentacao sao ofertas reais de instituicoes externas reconhecidas."],
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
            <header><span>Cursos</span><strong>${courses.length} curso${courses.length === 1 ? "" : "s"} real${courses.length === 1 ? "" : "is"} selecionado${courses.length === 1 ? "" : "s"}</strong></header>
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
      <header><span>Perguntas Frequentes</span><strong>FAQ da curadoria</strong></header>
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
      <header><span>Estruturas preparadas</span><strong>Conteudos futuros</strong></header>
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
      <img src="${center.imageUrl}" alt="Imagem do centro ${center.title}" />
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
      <h3>Visao da curadoria</h3>
      <p>Este centro organiza cursos gratuitos de instituicoes reconhecidas e ajuda o professor a encontrar uma formacao adequada antes de seguir para o ambiente oficial do curso.</p>
    </section>
    ${renderGuidedExperience(center)}
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
  const materialMatches = demoKnowledgeCenters.filter((center) => normalize([center.title, center.category, ...center.keywords].join(" ")).includes(searchTerm));

  panel.hidden = false;
  panel.innerHTML = `
    <header><span>Busca inteligente preparada</span><strong>Resultados organizados por tipo</strong></header>
    <div>
      <article><h3>Centros</h3>${centerMatches.length ? centerMatches.map((center) => `<button type="button" data-open-knowledge-center="${center.id}">${center.title}</button>`).join("") : "<p>Nenhum centro encontrado.</p>"}</article>
      <article><h3>Cursos</h3>${courseMatches.length ? renderCompactCourseList(courseMatches.slice(0, 4)) : "<p>Nenhum curso encontrado.</p>"}</article>
      <article><h3>Trilhas</h3>${pathMatches.length ? pathMatches.map((center) => `<p>${center.title} - trilhas por perfil preparadas</p>`).join("") : "<p>Nenhuma trilha encontrada.</p>"}</article>
      <article><h3>Materiais</h3>${materialMatches.length ? materialMatches.map((center) => `<p>${center.title} - materiais futuros preparados</p>`).join("") : "<p>Estrutura preparada para materiais futuros.</p>"}</article>
      <article><h3>Instituicoes</h3>${providerMatches.length ? providerMatches.map((provider) => `<p>${provider.name}</p>`).join("") : "<p>Nenhuma instituicao encontrada.</p>"}</article>
      <article><h3>Especialistas</h3><p>Estrutura preparada para especialistas demonstrativos.</p></article>
      <article><h3>Eventos</h3><p>Estrutura preparada para eventos demonstrativos.</p></article>
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
      <img src="${course.imageUrl}" alt="Capa institucional do curso ${course.title}" />
      <div>
        <span>Ficha de curadoria - ${course.verificationStatus}</span>
        <h2>${course.title}</h2>
        <p>${getProviderName(course.providerId)}</p>
        <div class="course-detail-badges">
          <strong>Gratuito</strong>
          <span>${course.reviewsCount ? `${renderStars(course.rating)} ${course.rating.toFixed(1)} (${course.reviewsCount} avaliacoes oficiais)` : "Sem avaliacao local"}</span>
          <span>${getCourseWorkloadLabel(course)}</span>
          <span>${course.modality}</span>
          <span>${course.certificateLabel || (course.certificateAvailable ? "Certificado informado" : "Sem certificado informado")}</span>
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
          <div><dt>Carga horaria</dt><dd>${getCourseWorkloadLabel(course)}</dd></div>
          <div><dt>Modalidade</dt><dd>${course.modality}</dd></div>
          <div><dt>Nivel</dt><dd>${course.level}</dd></div>
          <div><dt>Idioma</dt><dd>${course.language}</dd></div>
          <div><dt>Certificado</dt><dd>${course.certificateLabel || (course.certificateAvailable ? "Sim" : "Nao")}</dd></div>
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
        <div class="detail-rating"><strong>${course.reviewsCount ? course.rating.toFixed(1) : "-"}</strong><span>${course.reviewsCount ? renderStars(course.rating) : "Sem avaliacoes locais"}</span><small>${course.reviewsCount ? `${course.reviewsCount} avaliacoes oficiais` : "A comunidade da plataforma ainda nao avaliou este curso"}</small></div>
        <div class="rating-distribution">
          ${distribution.map((count, index) => `<span><b>${5 - index}</b><i><em style="width:${Math.round((count / maxDistribution) * 100)}%"></em></i><small>${count}</small></span>`).join("")}
        </div>
        <div class="detail-comments">${course.comments.length ? course.comments.map((comment) => `<blockquote>${comment}</blockquote>`).join("") : "<p>Sem comentarios da comunidade nesta apresentacao.</p>"}</div>
        <div class="course-progress-actions">
          <button type="button" data-auth-course-action="review" data-course-id="${course.id}">Avaliar</button>
          <button type="button" data-auth-course-action="favorite" data-course-id="${course.id}">Favoritar</button>
          <button type="button" data-auth-course-action="started" data-course-id="${course.id}">Informar que iniciei</button>
          <button type="button" data-auth-course-action="completed" data-course-id="${course.id}">Informar conclusao</button>
        </div>
      </section>
      <section>
        <h3>Cursos relacionados</h3>
        <div class="related-course-list">${related.length ? renderMiniCourseCards(related) : "<p>Nenhum curso relacionado nesta selecao.</p>"}</div>
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
      <span><strong>${demoCuratedCourses.length}</strong><small>cursos reais</small></span>
      <span><strong>${demoCourseProviders.length}</strong><small>instituicoes</small></span>
      <span><strong>${totalAccess.toLocaleString("pt-BR")}</strong><small>acessos pela plataforma</small></span>
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
  visibleCourseLimit = initialCourseLimit;
  renderSmartDiscovery();
  renderCourseCatalog();
});

document.querySelector("[data-course-sort]")?.addEventListener("change", () => {
  visibleCourseLimit = initialCourseLimit;
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
  visibleCourseLimit = initialCourseLimit;
  renderCourseCatalog();
});

document.querySelector("[data-clear-course-filters]")?.addEventListener("click", () => {
  activeCourseFilters = {};
  visibleCourseLimit = initialCourseLimit;
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
  visibleCourseLimit += initialCourseLimit;
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
    visibleCourseLimit = initialCourseLimit;
    renderCourseCatalog();
    return;
  }

  const removeFilter = event.target.closest?.("[data-remove-course-filter]");
  if (removeFilter) {
    delete activeCourseFilters[removeFilter.dataset.removeCourseFilter];
    visibleCourseLimit = initialCourseLimit;
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
renderKnowledgeCategoryCards();
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
