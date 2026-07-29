const platformAuth = {
  key: "raizes:demo-authenticated",
  curatorKey: "raizes:demo-curator",
  loginPage: "login.html",
};

const requirePlatformAuth = () => {
  if (typeof window === "undefined") {
    return;
  }

  const currentPath = `${window.location.pathname.split("/").pop() || "biblioteca.html"}${window.location.search}${window.location.hash}`;
  const publicPages = new Set(["universidade.html", "index.html", "login.html"]);
  if (publicPages.has(window.location.pathname.split("/").pop() || "biblioteca.html")) {
    return;
  }

  const isAuthenticated = localStorage.getItem(platformAuth.key) === "true";
  const isCuratorArea = currentPath.startsWith("curadoria.html");
  const isCurator = localStorage.getItem(platformAuth.curatorKey) === "true";
  if (isAuthenticated && (!isCuratorArea || isCurator)) {
    return;
  }

  document.documentElement.style.display = "none";
  window.location.replace(`${platformAuth.loginPage}?next=${encodeURIComponent(currentPath)}`);
};

requirePlatformAuth();

const ecosystemModules = [
  ["index.html", "Site"],
  ["plataforma.html", "Inicio"],
  ["aluno.html", "Aluno"],
  ["arvore.html", "Minha Arvore"],
  ["missao.html", "Missao do Dia"],
  ["jogos.html", "Jogos"],
  ["perfil.html", "Perfil"],
  ["biblioteca.html", "Biblioteca"],
  ["universidade.html", "Universidade"],
  ["book-viewer.html", "Book Viewer"],
  ["professor.html", "Professor"],
  ["avalia.html", "Avalia+"],
  ["banco-questoes.html", "Banco de Questoes"],
  ["secretaria.html", "Secretaria"],
  ["gestor.html", "Gestor"],
  ["familia.html", "Familia"],
];

const questionLegalClassifications = [
  "ITEM OFICIAL PUBLICAMENTE LIBERADO PELA INSTITUICAO RESPONSAVEL",
  "ITEM AUTORAL RAIZES E SABERES ALINHADO A MATRIZ DO SAEB",
  "ITEM ADAPTADO COM LICENCA COMPATIVEL",
  "ITEM EM ANALISE DE DIREITOS",
  "ITEM BLOQUEADO PARA PUBLICACAO",
];

const questionCurationStates = [
  "RASCUNHO",
  "COLETADO",
  "LICENCA EM ANALISE",
  "BLOQUEADO POR LICENCA",
  "AGUARDANDO REVISAO PEDAGOGICA",
  "EM REVISAO",
  "CORRECAO SOLICITADA",
  "APROVADO",
  "PUBLICADO",
  "HOMOLOGADO",
  "DESATUALIZADO",
  "ARQUIVADO",
  "REPROVADO",
];

const questionAccessRules = [
  ["Administrador nacional", "Acesso total, publica somente itens aprovados/homologados e audita fontes."],
  ["Gestor da rede", "Visualiza indicadores, avaliacoes salvas e uso por escola/rede."],
  ["Curador", "Cadastra fontes, analisa licencas e bloqueia itens com risco juridico."],
  ["Revisor pedagogico", "Revisa habilidade, descritor, gabarito, distratores e intervencao."],
  ["Professor", "Pesquisa itens publicados, monta avaliacoes e envia itens autorais para curadoria."],
  ["Aplicador", "Aplica avaliacoes atribuidas e registra data/status de aplicacao."],
  ["Visualizador", "Consulta metadados liberados, sem editar, publicar ou aplicar."],
];

const questionSourcesDemo = [
  {
    id: "fonte-rs-autoral",
    name: "Raizes e Saberes - Banco Demonstrativo Ficticio",
    origin: "Autoral",
    author: "Equipe Pedagogica Raizes e Saberes",
    license: "Uso interno demonstrativo",
    legalStatus: "Autorizado para demonstracao",
    curationStatus: "HOMOLOGADO",
  },
];

const demoQuestionBankItems = [
  {
    id: "RS-DEMO-LP2-001",
    title: "Localizar informacao explicita em bilhete",
    component: "Lingua Portuguesa",
    stage: "Ensino Fundamental - Anos Iniciais",
    year: "2o ano",
    unit: "Leitura/escuta",
    object: "Compreensao em leitura",
    skill: "EF02LP12",
    descriptor: "Matriz SAEB - localizar informacao explicita em texto curto",
    proficiency: "Basico",
    difficulty: "Facil",
    cognitiveProcess: "Localizar informacao",
    type: "Multipla escolha",
    resource: "Texto-base",
    estimatedTime: 4,
    accessibility: "Texto curto, linguagem simples e alternativas objetivas",
    originType: "Autoral",
    legalClassification: questionLegalClassifications[1],
    sourceId: "fonte-rs-autoral",
    author: "Equipe Pedagogica Raizes e Saberes",
    license: "Uso interno demonstrativo",
    createdAt: "2026-07-28",
    reviewedAt: "2026-07-28",
    version: "1.0",
    reviewer: "Revisao pedagogica demonstrativa",
    curationStatus: "HOMOLOGADO",
    publicationStatus: "PUBLICADO",
    statement: "Leia o bilhete e responda.",
    baseText: "Lia, leve seu caderno azul para a aula de leitura. Professora Ana.",
    alternatives: ["O caderno azul", "A mochila vermelha", "O livro de matematica", "A tesoura sem ponta"],
    correctAlternative: 0,
    justification: "O bilhete pede que Lia leve o caderno azul.",
    distractors: ["Mochila vermelha nao aparece no texto.", "Livro de matematica nao e solicitado.", "Tesoura sem ponta nao aparece no bilhete."],
    rightFeedback: "Voce localizou a informacao pedida no bilhete.",
    wrongFeedback: "Volte ao bilhete e procure o objeto que Lia deve levar.",
    intervention: "Reler bilhetes curtos destacando palavras-chave.",
    usedCount: 8,
    lastUsedClass: "2o Ano B",
  },
  {
    id: "RS-DEMO-MA2-001",
    title: "Resolver adicao com dezenas exatas",
    component: "Matematica",
    stage: "Ensino Fundamental - Anos Iniciais",
    year: "2o ano",
    unit: "Numeros",
    object: "Calculo de adicao",
    skill: "EF02MA05",
    descriptor: "Matriz SAEB - resolver problema envolvendo adicao",
    proficiency: "Basico",
    difficulty: "Facil",
    cognitiveProcess: "Resolver problema",
    type: "Multipla escolha",
    resource: "Texto-base",
    estimatedTime: 5,
    accessibility: "Numeros inteiros pequenos e enunciado direto",
    originType: "Autoral",
    legalClassification: questionLegalClassifications[1],
    sourceId: "fonte-rs-autoral",
    author: "Equipe Pedagogica Raizes e Saberes",
    license: "Uso interno demonstrativo",
    createdAt: "2026-07-28",
    reviewedAt: "2026-07-28",
    version: "1.0",
    reviewer: "Revisao pedagogica demonstrativa",
    curationStatus: "HOMOLOGADO",
    publicationStatus: "PUBLICADO",
    statement: "Em uma caixa havia 20 lapis. A professora colocou mais 10 lapis. Quantos lapis ficaram na caixa?",
    baseText: "",
    alternatives: ["10", "20", "30", "40"],
    correctAlternative: 2,
    justification: "20 + 10 = 30.",
    distractors: ["10 considera apenas a quantidade acrescentada.", "20 considera apenas a quantidade inicial.", "40 acrescenta uma dezena a mais."],
    rightFeedback: "Voce somou as dezenas corretamente.",
    wrongFeedback: "Monte a conta 20 + 10 e conte as dezenas.",
    intervention: "Usar material dourado ou quadro de dezenas para compor 20 + 10.",
    usedCount: 5,
    lastUsedClass: "2o Ano A",
  },
  {
    id: "RS-DEMO-LP5-001",
    title: "Inferir sentido de expressao em conto curto",
    component: "Lingua Portuguesa",
    stage: "Ensino Fundamental - Anos Iniciais",
    year: "5o ano",
    unit: "Leitura/escuta",
    object: "Estrategias de leitura",
    skill: "EF35LP04",
    descriptor: "Matriz SAEB - inferir sentido de palavra ou expressao",
    proficiency: "Adequado",
    difficulty: "Media",
    cognitiveProcess: "Inferir",
    type: "Multipla escolha",
    resource: "Texto-base",
    estimatedTime: 6,
    accessibility: "Texto curto, alternativas sem ambiguidade e contraste semantico",
    originType: "Autoral",
    legalClassification: questionLegalClassifications[1],
    sourceId: "fonte-rs-autoral",
    author: "Equipe Pedagogica Raizes e Saberes",
    license: "Uso interno demonstrativo",
    createdAt: "2026-07-28",
    reviewedAt: "2026-07-28",
    version: "1.0",
    reviewer: "Revisao pedagogica demonstrativa",
    curationStatus: "APROVADO",
    publicationStatus: "PUBLICADO",
    statement: "No trecho, o que significa a expressao destacada?",
    baseText: "Quando viu o resultado da feira de ciencias, Bia ficou com os olhos brilhando.",
    alternatives: ["Bia ficou com sono.", "Bia ficou muito animada.", "Bia ficou com medo.", "Bia ficou sem entender."],
    correctAlternative: 1,
    justification: "A expressao indica entusiasmo e alegria com o resultado.",
    distractors: ["Sono nao combina com o contexto de conquista.", "Medo nao aparece no texto.", "Nao ha indicio de duvida no trecho."],
    rightFeedback: "Voce usou o contexto para entender a expressao.",
    wrongFeedback: "Observe o que aconteceu antes da expressao e o sentimento esperado.",
    intervention: "Comparar expressoes figuradas com situacoes do cotidiano.",
    usedCount: 0,
    lastUsedClass: "",
  },
  {
    id: "RS-DEMO-MA5-001",
    title: "Ler grafico de barras simples",
    component: "Matematica",
    stage: "Ensino Fundamental - Anos Iniciais",
    year: "5o ano",
    unit: "Probabilidade e estatistica",
    object: "Leitura de grafico",
    skill: "EF05MA24",
    descriptor: "Matriz SAEB - ler informacoes em graficos e tabelas",
    proficiency: "Adequado",
    difficulty: "Media",
    cognitiveProcess: "Interpretar informacao",
    type: "Leitura de grafico",
    resource: "Grafico",
    estimatedTime: 7,
    accessibility: "Grafico descrito em texto alternativo e dados em tabela",
    originType: "Autoral",
    legalClassification: questionLegalClassifications[1],
    sourceId: "fonte-rs-autoral",
    author: "Equipe Pedagogica Raizes e Saberes",
    license: "Uso interno demonstrativo",
    createdAt: "2026-07-28",
    reviewedAt: "2026-07-28",
    version: "1.0",
    reviewer: "Revisao pedagogica demonstrativa",
    curationStatus: "AGUARDANDO REVISAO PEDAGOGICA",
    publicationStatus: "NAO PUBLICADO",
    statement: "A turma registrou os livros lidos no mes: aventura 12, poesia 8, conto 10. Qual tipo teve mais leituras?",
    baseText: "Dados demonstrativos em formato textual para representar um grafico de barras.",
    alternatives: ["Aventura", "Poesia", "Conto", "Todos tiveram a mesma quantidade"],
    correctAlternative: 0,
    justification: "Aventura tem 12 leituras, maior valor entre os dados.",
    distractors: ["Poesia tem 8, menor que 12.", "Conto tem 10, menor que 12.", "Os valores sao diferentes."],
    rightFeedback: "Voce comparou os valores do grafico corretamente.",
    wrongFeedback: "Compare os tres numeros e encontre o maior.",
    intervention: "Construir grafico com barras fisicas e ordenar os valores.",
    usedCount: 0,
    lastUsedClass: "",
  },
];

const savedAssessmentDemo = [
  { title: "Diagnostico 2o ano - leitura e numeros", status: "Rascunho", items: 2, className: "2o Ano A", date: "2026-08-05" },
  { title: "Simulado 5o ano - LP e Matematica", status: "Pronto para aplicar", items: 8, className: "5o Ano B", date: "2026-08-12" },
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
  {
    id: "avalia-portugues-2ano",
    title: "AVALIA+ PORTUGUÊS",
    subtitle: "LÍNGUA PORTUGUESA - 2º ANO",
    catalogTitle: "AVALIA+ PORTUGUÊS",
    level: "2º Ano",
    type: "Livro do Aluno",
    collection: "Avalia+",
    stage: "Ensino Fundamental - Anos Iniciais",
    component: "Língua Portuguesa",
    totalPages: 160,
    basePath: "assets",
    cover: "assets/avalia-portugues-2ano/pages/page-001.jpg",
    catalogCover: "assets/biblioteca/RAIZES_AVALIA_PORTUGUES_2ANO_BIBLIOTECA.jpg",
    pdf: "assets/avalia-portugues-2ano/pdf/2-anos-portugues-reduzida.pdf",
    href: "book-viewer.html?book=avalia-portugues-2ano",
    thumb: (page) => `assets/avalia-portugues-2ano/thumbs/page-${String(page).padStart(3, "0")}.jpg`,
    page: (page) => `assets/avalia-portugues-2ano/pages/page-${String(page).padStart(3, "0")}.jpg`,
    summary: [
      ["Capa", 1],
      ["Apresentacao", 2],
      ["Orientacoes de uso", 6],
      ["Unidades", 12],
      ["Avaliacoes", 42],
      ["Simulados", 86],
      ["Revisao", 118],
      ["Recomposicao", 134],
      ["Producao escrita", 150],
    ],
  },
  {
    id: "avalia-matematica-2ano",
    title: "AVALIA+ MATEMÁTICA",
    subtitle: "MATEMÁTICA - 2º ANO",
    catalogTitle: "AVALIA+ MATEMÁTICA",
    level: "2º Ano",
    type: "Livro do Aluno",
    collection: "Avalia+",
    stage: "Ensino Fundamental - Anos Iniciais",
    component: "Matemática",
    totalPages: 56,
    basePath: "assets",
    cover: "assets/avalia-matematica-2ano/pages/page-001.jpg",
    catalogCover: "assets/biblioteca/RAIZES_AVALIA_MATEMATICA_2ANO_BIBLIOTECA.jpg",
    pdf: "assets/avalia-matematica-2ano/pdf/2-anos-matematica-reduzida.pdf",
    href: "book-viewer.html?book=avalia-matematica-2ano",
    thumb: (page) => `assets/avalia-matematica-2ano/thumbs/page-${String(page).padStart(3, "0")}.jpg`,
    page: (page) => `assets/avalia-matematica-2ano/pages/page-${String(page).padStart(3, "0")}.jpg`,
    summary: [
      ["Capa", 1],
      ["Apresentacao", 2],
      ["Orientacoes de uso", 6],
      ["Unidades", 10],
      ["Avaliacoes", 20],
      ["Simulados", 34],
      ["Revisao", 46],
      ["Encerramento", 56],
    ],
  },
  {
    id: "avalia-matematica-6ano",
    title: "AVALIA+ MATEMÁTICA",
    subtitle: "MATEMÁTICA - 6º ANO",
    catalogTitle: "AVALIA+ MATEMÁTICA",
    level: "6º Ano",
    type: "Livro do Aluno",
    collection: "Avalia+",
    stage: "Ensino Fundamental - Anos Finais",
    component: "Matemática",
    totalPages: 13,
    basePath: "assets",
    cover: "assets/avalia-matematica-6ano/pages/page-001.jpg",
    catalogCover: "assets/biblioteca/RAIZES_AVALIA_MATEMATICA_6ANO_BIBLIOTECA.jpg",
    pdf: "assets/avalia-matematica-6ano/pdf/6-anos-matematica.pdf",
    href: "book-viewer.html?book=avalia-matematica-6ano",
    thumb: (page) => `assets/avalia-matematica-6ano/thumbs/page-${String(page).padStart(3, "0")}.jpg`,
    page: (page) => `assets/avalia-matematica-6ano/pages/page-${String(page).padStart(3, "0")}.jpg`,
    summary: [
      ["Capa", 1],
      ["Apresentacao", 2],
      ["Orientacoes de uso", 3],
      ["Atividades", 5],
      ["Simulado", 9],
      ["Encerramento", 13],
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
  {
    src: "assets/biblioteca/RAIZES_AVALIA_PORTUGUES_2ANO_BIBLIOTECA.jpg",
    year: "2º Ano",
    title: "AVALIA+ PORTUGUÊS",
    type: "Livro do Aluno",
    component: "LÍNGUA PORTUGUESA",
    pages: "160 PÁGINAS",
    href: "book-viewer.html?book=avalia-portugues-2ano",
    downloadHref: "assets/avalia-portugues-2ano/pdf/2-anos-portugues-reduzida.pdf",
    collection: "Avalia+",
    stage: "Ensino Fundamental - Anos Iniciais",
    hierarchy: "Ensino Fundamental > 2º Ano > Língua Portuguesa > Avalia+ > Livro do Aluno",
    publishedAt: "2026-07-28",
    actionLabel: "Ler Agora",
    searchTerms: "Avalia+ Português Portugues Língua Portuguesa Lingua Portuguesa 2º Ano 2o Ano Ensino Fundamental Livro do Aluno Aluno Avalia",
  },
  {
    src: "assets/biblioteca/RAIZES_AVALIA_MATEMATICA_2ANO_BIBLIOTECA.jpg",
    year: "2º Ano",
    title: "AVALIA+ MATEMÁTICA",
    type: "Livro do Aluno",
    component: "MATEMÁTICA",
    pages: "56 PÁGINAS",
    href: "book-viewer.html?book=avalia-matematica-2ano",
    downloadHref: "assets/avalia-matematica-2ano/pdf/2-anos-matematica-reduzida.pdf",
    collection: "Avalia+",
    stage: "Ensino Fundamental - Anos Iniciais",
    hierarchy: "Ensino Fundamental > 2º Ano > Matemática > Avalia+ > Livro do Aluno",
    publishedAt: "2026-07-29",
    actionLabel: "Ler Agora",
    searchTerms: "Avalia+ Matemática Matematica 2º Ano 2o Ano Ensino Fundamental Livro do Aluno Aluno Avalia",
  },
  {
    src: "assets/biblioteca/RAIZES_AVALIA_MATEMATICA_6ANO_BIBLIOTECA.jpg",
    year: "6º Ano",
    title: "AVALIA+ MATEMÁTICA",
    type: "Livro do Aluno",
    component: "MATEMÁTICA",
    pages: "13 PÁGINAS",
    href: "book-viewer.html?book=avalia-matematica-6ano",
    downloadHref: "assets/avalia-matematica-6ano/pdf/6-anos-matematica.pdf",
    collection: "Avalia+",
    stage: "Ensino Fundamental - Anos Finais",
    hierarchy: "Ensino Fundamental > 6º Ano > Matemática > Avalia+ > Livro do Aluno",
    publishedAt: "2026-07-29",
    actionLabel: "Ler Agora",
    searchTerms: "Avalia+ Matemática Matematica 6º Ano 6o Ano Ensino Fundamental Anos Finais Livro do Aluno Aluno Avalia",
  },
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
    count: `${countMaterialsByCollection("Avalia+")} materiais`,
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
          ${book.component ? `<small>${book.component}</small>` : ""}
          ${book.pages ? `<small>${book.pages}</small>` : ""}
          ${book.searchTerms || book.hierarchy ? `<span hidden>${[book.searchTerms, book.hierarchy, book.stage].filter(Boolean).join(" ")}</span>` : ""}
          <a href="${book.href}">${book.actionLabel || "Abrir"}</a>
          ${book.downloadHref ? `<a href="${book.downloadHref}" download>Baixar PDF</a>` : ""}
        </div>
      </article>
    `
  )
  .join("");

const routeKeyByHref = {
  "plataforma.html": "plataforma",
  "aluno.html": "aluno",
  "arvore.html": "arvore",
  "missao.html": "missao",
  "jogos.html": "jogos",
  "perfil.html": "perfil",
  "biblioteca.html": "biblioteca",
  "universidade.html": "universidade",
  "curadoria.html": "curadoria",
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
    avatar: "assets/aluno/oficial-avatar-aluno.png",
    xp: 125,
    level: "Nivel 1",
    notifications: 3,
    progress: 24,
    heroArt: "assets/aluno/oficial-hero-aluno.png",
  },
  dailyMission: {
    code: "Missao 012",
    title: "A Caixa Misteriosa",
    description: "Ouca a dica, descubra o objeto e ganhe XP!",
    image: "assets/aluno/oficial-card-missao.png",
    href: "jogos.html",
  },
  currentBook: {
    title: "Linguagem",
    subtitle: "Educacao Infantil 2 anos",
    progress: 45,
    cover: "assets/biblioteca/RAIZES_INFANTIL2_VOL1_BIBLIOTECA.webp",
    href: "book-viewer.html?book=livro-mestre-001",
  },
  libraryBanner: "assets/aluno/oficial-biblioteca-banner-v2.png",
  library: [
    { title: "Linguagem", cover: "assets/biblioteca/RAIZES_INFANTIL2_VOL1_BIBLIOTECA.webp", href: "book-viewer.html?book=livro-mestre-001" },
    { title: "Matematica", cover: "assets/biblioteca/RAIZES_INFANTIL2_VOL2_BIBLIOTECA.webp", href: "book-viewer.html?book=livro-002" },
    { title: "Natureza e Sociedade", cover: "assets/biblioteca/RAIZES_LAB_SENSORIAL_INFANTIL2_BIBLIOTECA.webp", href: "book-viewer.html?book=laboratorio-sensorial-002" },
    { title: "Caderno de Atividades", cover: "assets/biblioteca/RAIZES_INFANTIL3_VOL1_BIBLIOTECA.webp", href: "biblioteca.html" },
  ],
  xpGoal: {
    current: 125,
    target: 200,
    level: "Nivel 1",
    image: "assets/aluno/oficial-bau-xp.png",
    nextText: "Conquiste mais 75 XP para alcancar o Nivel 2!",
  },
  medals: [
    { title: "Pequeno Explorador", image: "assets/aluno/oficial-medalha-explorador.png" },
    { title: "Leitor Iniciante", image: "assets/aluno/oficial-medalha-leitor.png" },
    { title: "Curioso por Natureza", image: "assets/aluno/oficial-medalha-curioso.png" },
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
  `<img${className ? ` class="${className}"` : ""} src="${src}" alt="${alt}" loading="lazy" decoding="async" onerror="this.hidden=true" />`;

const studentGameStorageKey = "raizes:game-progress:v1";
const studentGameCatalog = [
  { id: "caixa-misteriosa", title: "A Caixa Misteriosa", medal: "Pequeno Explorador", image: "assets/games/caixa-misteriosa/rewards/medal-pequeno-explorador.png" },
  { id: "organizando-cesta", title: "Organizando a Cesta", medal: "Pequeno Organizador", image: "assets/game-engine-2/assets/organizando-cesta/medals/glowing.png" },
  { id: "jardim-descobertas", title: "O Jardim das Descobertas", medal: "Pequeno Observador", image: "assets/games/jardim-descobertas/rewards/medal-jardim.png" },
  { id: "construindo-ponte", title: "Construindo a Ponte", medal: "Pequeno Construtor", image: "assets/games/construindo-ponte/rewards/medal-pequeno-construtor.png" },
  { id: "busca-criterios", title: "Descobrindo por Critérios", medal: "Pequeno Investigador", image: "assets/games/caixa-misteriosa/rewards/medal-pequeno-explorador.png" },
  { id: "formas-casa", title: "As Formas da Casa", medal: "Pequeno Construtor de Formas", image: "assets/games/formas-casa/rewards/medal-formas.png" },
  { id: "caminho-bia", title: "O Caminho da Bia", medal: "Pequeno Explorador de Caminhos", image: "assets/games/caminho-bia/rewards/medal-caminhos.png" },
  { id: "atelie-bia", title: "O Atelie da Bia", medal: "Pequeno Artista da Natureza", image: "assets/games/atelie-bia/rewards/medal-artista.png" },
  { id: "rotina-pipo", title: "A Rotina do Pipo", medal: "Pequeno Cuidador", image: "assets/games/rotina-pipo/rewards/medal-cuidador.png" },
  { id: "grande-festa", title: "A Grande Festa das Descobertas", medal: "Grande Explorador das Descobertas", image: "assets/games/grande-festa/rewards/medal-grande-explorador.png" },
  { id: "de-quem-e-este-som", title: "De Quem e Este Som?", medal: "Pequeno Ouvinte", image: "assets/games/de-quem-e-este-som/rewards/medal-pequeno-ouvinte.png" },
  { id: "sequencia-pipo", title: "A Sequencia do Pipo", medal: "Pequeno Matematico", image: "assets/games/sequencia-pipo/rewards/medal-pequeno-matematico.png" },
  { id: "jardim-vivo", title: "O Jardim Vivo", medal: "Pequeno Observador da Natureza", image: "assets/games/jardim-vivo/rewards/medal-observador-natureza.png" },
  { id: "teatro-bia", title: "O Teatro da Bia", medal: "Pequeno Artista", image: "assets/games/teatro-bia/rewards/medal-pequeno-artista.png" },
  { id: "caminho-escola", title: "O Caminho da Escola", medal: "Explorador de Caminhos", image: "assets/games/caminho-escola/rewards/medal-explorador-caminhos.png" },
  { id: "grande-festa-v2", title: "A Grande Festa das Descobertas - Volume 2", medal: "Grande Explorador das Descobertas", image: "assets/games/grande-festa-v2/rewards/medal-volume-2.png" },
];

const readStudentGameRecords = () => {
  try {
    return JSON.parse(localStorage.getItem(studentGameStorageKey) || "[]");
  } catch (error) {
    console.warn("Nao foi possivel ler progresso dos jogos.", error);
    return [];
  }
};

const getStudentGameSummary = () => {
  const records = readStudentGameRecords();
  const completed = studentGameCatalog
    .map((game) => {
      const record = records.find((item) => item.gameId === game.id);
      return record ? { ...game, ...record, image: game.image } : null;
    })
    .filter(Boolean);
  const totalXp = completed.reduce((total, item) => total + (Number(item.xp) || 0), 0);
  const lastActivity = completed
    .map((item) => item.completedAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  return {
    completed,
    totalXp,
    completedCount: completed.length,
    totalGames: studentGameCatalog.length,
    percent: Math.round((completed.length / studentGameCatalog.length) * 100),
    streak: completed.length ? Math.min(7, completed.length + 1) : 0,
    lastActivity,
  };
};

const createStudentDashboardView = () => {
  const gameSummary = getStudentGameSummary();
  const xp = studentDashboardData.profile.xp + gameSummary.totalXp;
  return {
    ...studentDashboardData,
    gameSummary,
    profile: { ...studentDashboardData.profile, xp, progress: Math.max(studentDashboardData.profile.progress, gameSummary.percent) },
    xpGoal: {
      ...studentDashboardData.xpGoal,
      current: xp,
      nextText: xp >= studentDashboardData.xpGoal.target ? "Voce alcancou o objetivo atual. Continue jogando para ampliar suas conquistas!" : `Conquiste mais ${studentDashboardData.xpGoal.target - xp} XP para alcancar o Nivel 2!`,
    },
    medals: studentDashboardData.medals,
  };
};

const renderStudentProfilePage = () => {
  return `
    <main class="student-profile-page">
      <section class="student-profile-static-map" aria-label="Perfil do aluno Pedro">
        <img
          src="assets/aluno/perfil-aluno-dashboard.png"
          alt="Perfil do aluno Pedro com medalhas, progresso, conquistas e jogos concluidos"
          loading="eager"
          decoding="async"
          onerror="this.hidden=true"
        />
        ${studentProfileHotspots.map((hotspot) => `<a class="profile-hotspot ${hotspot.className}" href="${hotspot.href}" aria-label="${hotspot.label}"></a>`).join("")}
      </section>
    </main>
  `;
};

const studentProfileHotspots = [
  { className: "profile-hotspot-avatar", href: "perfil.html", label: "Abrir detalhes do perfil de Pedro" },
  { className: "profile-hotspot-xp-top", href: "perfil.html", label: "Abrir historico de XP" },
  { className: "profile-hotspot-tree-top", href: "arvore.html", label: "Abrir Minha Arvore" },
  { className: "profile-hotspot-streak-top", href: "missao.html", label: "Abrir sequencia diaria" },
  { className: "profile-hotspot-medal-organizador", href: "perfil.html", label: "Abrir conquista Pequeno Organizador" },
  { className: "profile-hotspot-medal-construtor", href: "perfil.html", label: "Abrir conquista Pequeno Construtor" },
  { className: "profile-hotspot-medal-caminhos", href: "perfil.html", label: "Abrir conquista Pequeno Explorador de Caminhos" },
  { className: "profile-hotspot-medal-explorador", href: "perfil.html", label: "Abrir conquista Pequeno Explorador" },
  { className: "profile-hotspot-medal-leitor", href: "book-viewer.html?book=livro-mestre-001", label: "Abrir conquista Leitor Iniciante" },
  { className: "profile-hotspot-medal-natureza", href: "perfil.html", label: "Abrir conquista Curioso por Natureza" },
  { className: "profile-hotspot-xp-panel", href: "perfil.html", label: "Abrir painel de XP e proximo nivel" },
  { className: "profile-hotspot-last-activity", href: "book-viewer.html?book=livro-mestre-001", label: "Abrir ultima atividade Leitura Linguagem" },
  { className: "profile-hotspot-games-summary", href: "jogos.html", label: "Abrir jogos concluidos" },
  { className: "profile-hotspot-xp-summary", href: "perfil.html", label: "Abrir XP total" },
  { className: "profile-hotspot-achievements-summary", href: "perfil.html", label: "Abrir conquistas" },
  { className: "profile-hotspot-game-caixa", href: "jogos.html", label: "Abrir jogo A Caixa Misteriosa" },
  { className: "profile-hotspot-game-cesta", href: "jogos.html", label: "Abrir jogo Organizando a Cesta" },
  { className: "profile-hotspot-game-jardim", href: "jogos.html", label: "Abrir jogo Jardim das Descobertas" },
  { className: "profile-hotspot-game-ponte", href: "jogos.html", label: "Abrir jogo Construindo a Ponte" },
  { className: "profile-hotspot-game-cores", href: "jogos.html", label: "Abrir jogo As Cores do Jardim" },
];

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

const renderStudentLibrary = (books, banner) => `
  <section class="student-card student-library-card" aria-labelledby="student-library-title">
    <div class="student-card-head"><h2 id="student-library-title">📚 Biblioteca</h2><a href="biblioteca.html">Ver tudo</a></div>
    <a class="student-library-banner" href="biblioteca.html" aria-label="Abrir Biblioteca">${studentLazyImg(banner, "Banner da Biblioteca")}</a>
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

const renderStudentPresentationDashboard = () => `
  <div class="student-dashboard student-presentation-mode" data-student-dashboard>
    <section class="student-presentation-dashboard" aria-label="Dashboard do Aluno">
      <img
        src="assets/aluno/oficial-dashboard-aluno.png"
        alt="Dashboard oficial do aluno com saudacao, missoes, livro em andamento, evolucao, XP e biblioteca"
        loading="eager"
        decoding="async"
        onerror="this.hidden=true"
      />
    </section>
    <div class="student-grid student-restored-grid">
      ${renderStudentMedals(studentDashboardView.medals)}
    </div>
    ${renderStudentQuickAccess(studentDashboardView.quickAccess)}
  </div>
`;

const professorSoonLabels = {
  perfil: "Perfil da Professora",
  xp: "Historico de XP",
  turmas: "Turmas da Professora",
  atividades: "Atividades",
  planejamento: "Planejamento",
  aulas: "Proximas Aulas",
  correcoes: "Relatorios de Correcao",
};

const professorDashboardHotspots = [
  { className: "professor-hotspot-avatar", href: "professor.html?soon=perfil", label: "Abrir perfil da Professora Helena" },
  { className: "professor-hotspot-turmas-top", href: "professor.html?soon=turmas", label: "Abrir turmas ativas" },
  { className: "professor-hotspot-planejadas-top", href: "professor.html?soon=atividades", label: "Abrir atividades planejadas" },
  { className: "professor-hotspot-concluidas-top", href: "professor.html?soon=atividades", label: "Abrir atividades concluidas" },
  { className: "professor-hotspot-xp-top", href: "professor.html?soon=xp", label: "Abrir XP da professora" },
  { className: "professor-hotspot-turma-a", href: "professor.html?soon=turmas", label: "Abrir turma Infantil 5 anos A" },
  { className: "professor-hotspot-turma-b", href: "professor.html?soon=turmas", label: "Abrir turma Infantil 5 anos B" },
  { className: "professor-hotspot-turma-4a", href: "professor.html?soon=turmas", label: "Abrir turma 4 Ano A" },
  { className: "professor-hotspot-turma-2a", href: "professor.html?soon=turmas", label: "Abrir turma 2 Ano A" },
  { className: "professor-hotspot-turma-3b", href: "professor.html?soon=turmas", label: "Abrir turma 3 Ano B" },
  { className: "professor-hotspot-seg", href: "professor.html?soon=planejamento", label: "Abrir planejamento de segunda-feira" },
  { className: "professor-hotspot-ter", href: "professor.html?soon=planejamento", label: "Abrir planejamento de terca-feira" },
  { className: "professor-hotspot-qua", href: "professor.html?soon=planejamento", label: "Abrir planejamento de quarta-feira" },
  { className: "professor-hotspot-qui", href: "professor.html?soon=planejamento", label: "Abrir planejamento de quinta-feira" },
  { className: "professor-hotspot-sex", href: "professor.html?soon=planejamento", label: "Abrir planejamento de sexta-feira" },
  { className: "professor-hotspot-aula-1", href: "professor.html?soon=aulas", label: "Abrir aula de Linguagem" },
  { className: "professor-hotspot-aula-2", href: "professor.html?soon=aulas", label: "Abrir aula de Matematica" },
  { className: "professor-hotspot-aula-3", href: "professor.html?soon=aulas", label: "Abrir aula de Ciencias" },
  { className: "professor-hotspot-aula-4", href: "professor.html?soon=aulas", label: "Abrir aula de Historia" },
  { className: "professor-hotspot-aula-5", href: "professor.html?soon=aulas", label: "Abrir aula de Projeto" },
  { className: "professor-hotspot-pendente-corrigir", href: "professor.html?soon=atividades", label: "Abrir atividades para corrigir" },
  { className: "professor-hotspot-pendente-revisar", href: "professor.html?soon=atividades", label: "Abrir atividades para revisar" },
  { className: "professor-hotspot-pendente-devolutivas", href: "professor.html?soon=atividades", label: "Abrir devolutivas para enviar" },
  { className: "professor-hotspot-pendente-publicar", href: "professor.html?soon=atividades", label: "Abrir atividades para publicar" },
  { className: "professor-hotspot-correcoes", href: "professor.html?soon=correcoes", label: "Abrir relatorios de correcao" },
  { className: "professor-hotspot-book-1", href: "book-viewer.html?book=livro-007", label: "Abrir Educacao Infantil 5 anos Volume 1" },
  { className: "professor-hotspot-book-2", href: "book-viewer.html?book=livro-008", label: "Abrir Educacao Infantil 5 anos Volume 2" },
  { className: "professor-hotspot-book-3", href: "book-viewer.html?book=avalia-portugues-2ano", label: "Abrir Lingua Portuguesa 2 Ano Volume 1" },
  { className: "professor-hotspot-book-4", href: "book-viewer.html?book=avalia-matematica-2ano", label: "Abrir Matematica 2 Ano Volume 1" },
  { className: "professor-hotspot-book-5", href: "book-viewer.html?book=livro-003", label: "Abrir Natureza e Sociedade 3 Ano Volume 1" },
  { className: "professor-hotspot-bncc", href: "biblioteca.html", label: "Abrir conteudos alinhados a BNCC" },
];

const renderProfessorSoon = (key) => {
  const title = professorSoonLabels[key] || "Modulo em breve";
  return `
    <section class="coming-soon-panel">
      <span>Em breve</span>
      <h1>${title}</h1>
      <p>Este recurso ja esta previsto no Ecossistema Raizes e Saberes e sera liberado nas proximas etapas.</p>
      <a href="professor.html">Voltar ao Painel do Professor</a>
    </section>
  `;
};

const renderProfessorDashboard = () => {
  const params = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const soon = params.get("soon");
  if (soon) return renderProfessorSoon(soon);
  return `
    <section class="professor-dashboard" aria-label="Painel da Professora Helena">
      <img
        src="assets/professor/professor-dashboard.png"
        alt="Painel da Professora Helena com turmas, planejamento, proximas aulas, atividades, correcoes e biblioteca integrada"
        loading="eager"
        decoding="async"
        onerror="this.hidden=true"
      />
      ${professorDashboardHotspots.map((hotspot) => `<a class="professor-hotspot ${hotspot.className}" href="${hotspot.href}" aria-label="${hotspot.label}"></a>`).join("")}
    </section>
  `;
};

const familySoonLabels = {
  filhos: "Acompanhamento dos Filhos",
  frequencia: "Historico de Frequencia",
  aprendizagem: "Evolucao da Aprendizagem",
  alertas: "Alertas e Comunicados",
  eventos: "Agenda da Familia",
  materiais: "Materiais da Escola",
};

const familyDashboardHotspots = [
  { className: "family-hotspot-avatar", href: "familia.html?soon=filhos", label: "Abrir perfil da responsavel Ana Paula" },
  { className: "family-hotspot-filhos-top", href: "familia.html?soon=filhos", label: "Abrir filhos cadastrados" },
  { className: "family-hotspot-frequencia-top", href: "familia.html?soon=frequencia", label: "Abrir frequencia media" },
  { className: "family-hotspot-tarefas-top", href: "familia.html?soon=alertas", label: "Abrir tarefas acompanhadas" },
  { className: "family-hotspot-participacao-top", href: "familia.html?soon=filhos", label: "Abrir participacao da familia" },
  { className: "family-hotspot-pedro", href: "aluno.html", label: "Abrir painel do aluno Pedro Silva" },
  { className: "family-hotspot-maria", href: "aluno.html", label: "Abrir painel da aluna Maria Silva" },
  { className: "family-hotspot-frequencia", href: "familia.html?soon=frequencia", label: "Abrir historico de frequencia" },
  { className: "family-hotspot-aprendizagem", href: "familia.html?soon=aprendizagem", label: "Abrir evolucao da aprendizagem" },
  { className: "family-hotspot-alerta-reuniao", href: "familia.html?soon=alertas", label: "Abrir alerta Reuniao de Pais e Mestres" },
  { className: "family-hotspot-alerta-atividades", href: "familia.html?soon=alertas", label: "Abrir atividades para casa" },
  { className: "family-hotspot-alerta-comunicado", href: "familia.html?soon=alertas", label: "Abrir comunicado da escola" },
  { className: "family-hotspot-evento-passeio", href: "familia.html?soon=eventos", label: "Abrir evento Passeio Pedagogico" },
  { className: "family-hotspot-evento-avaliacao", href: "familia.html?soon=eventos", label: "Abrir evento Avaliacao Bimestral" },
  { className: "family-hotspot-evento-reuniao", href: "familia.html?soon=eventos", label: "Abrir evento Reuniao de Pais e Mestres" },
  { className: "family-hotspot-book-1", href: "book-viewer.html?book=livro-008", label: "Abrir Lingua Portuguesa 5 anos Volume 2" },
  { className: "family-hotspot-book-2", href: "book-viewer.html?book=livro-008", label: "Abrir Matematica 5 anos Volume 2" },
  { className: "family-hotspot-book-3", href: "book-viewer.html?book=laboratorio-sensorial-005", label: "Abrir Natureza e Sociedade 5 anos Volume 2" },
  { className: "family-hotspot-book-4", href: "book-viewer.html?book=livro-008", label: "Abrir Historia 5 anos Volume 2" },
  { className: "family-hotspot-leitura", href: "book-viewer.html?book=livro-008", label: "Abrir Leitura em Familia" },
  { className: "family-hotspot-materiais", href: "familia.html?soon=materiais", label: "Abrir materiais da escola" },
];

const renderFamilySoon = (key) => {
  const title = familySoonLabels[key] || "Modulo em breve";
  return `
    <section class="coming-soon-panel">
      <span>Em breve</span>
      <h1>${title}</h1>
      <p>Este recurso da area da Familia ja esta planejado e sera liberado nas proximas etapas.</p>
      <a href="familia.html">Voltar ao Painel da Familia</a>
    </section>
  `;
};

const renderFamilyDashboard = () => {
  const params = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const soon = params.get("soon");
  if (soon) return renderFamilySoon(soon);
  return `
    <section class="family-dashboard" aria-label="Painel da Familia Ana Paula">
      <img
        src="assets/familia/familia-dashboard.png"
        alt="Painel da Familia de Ana Paula com filhos, frequencia, aprendizagem, alertas, eventos e biblioteca"
        loading="eager"
        decoding="async"
        onerror="this.hidden=true"
      />
      ${familyDashboardHotspots.map((hotspot) => `<a class="family-hotspot ${hotspot.className}" href="${hotspot.href}" aria-label="${hotspot.label}"></a>`).join("")}
    </section>
  `;
};

const studentDashboardView = createStudentDashboardView();
const homeOfficialAsset = (name) => `assets/home-official/${name}.png`;

const ecosystemHomeStats = {
  xp: studentDashboardView.profile.xp,
  medals: studentDashboardView.medals.length,
  trainingHours: 120,
  certificates: 8,
  booksRead: Math.max(1, getRecentBookIds().length || studentDashboardView.tree.booksCompleted),
  gamesCompleted: studentDashboardView.gameSummary.completedCount,
};

const ecosystemHomeResources = [
  {
    title: "Biblioteca",
    description: `${publishedMaterialsCount} materiais, colecoes e livros digitais.`,
    icon: homeOfficialAsset("icon_biblioteca"),
    href: "biblioteca.html",
    tone: "green",
  },
  {
    title: "Universidade",
    description: "Cursos, trilhas, formacoes e certificados.",
    icon: homeOfficialAsset("icon_universidade"),
    href: "universidade.html",
    tone: "purple",
  },
  {
    title: "Jogos Educativos",
    description: `${studentGameCatalog.length} jogos com XP e medalhas.`,
    icon: homeOfficialAsset("icon_jogos"),
    href: "jogos.html",
    tone: "orange",
  },
  {
    title: "Avalia+",
    description: "Diagnosticos, relatorios e intervencoes.",
    icon: homeOfficialAsset("icon_avalia"),
    href: "avalia.html",
    tone: "blue",
  },
  {
    title: "Banco de Questoes",
    description: `${demoQuestionBankItems.length} itens demonstrativos homologados.`,
    icon: homeOfficialAsset("icon_banco_questoes"),
    href: "banco-questoes.html",
    tone: "teal",
  },
  {
    title: "Laboratorios",
    description: `${countMaterialsByCollection("Laboratorio Sensorial")} materiais sensoriais integrados.`,
    icon: homeOfficialAsset("icon_laboratorios"),
    href: "biblioteca.html#acervo-completo",
    tone: "mint",
  },
];

const ecosystemHomeJourney = [
  {
    label: "Livro",
    title: masterBook001.catalogTitle,
    detail: masterBook001.level,
    progress: 65,
    image: homeOfficialAsset("continue-card-livro"),
    href: masterBook001.href,
    action: "Continuar leitura",
    tone: "green",
  },
  {
    label: "Curso",
    title: "BNCC na Pratica",
    detail: "20h",
    progress: 40,
    image: homeOfficialAsset("continue-card-curso"),
    href: "universidade.html#formacao-raizes",
    action: "Continuar curso",
    tone: "purple",
  },
  {
    label: "Simulado",
    title: savedAssessmentDemo[1]?.title || "Simulado",
    detail: savedAssessmentDemo[1]?.className || "Lingua Portuguesa",
    progress: 30,
    image: homeOfficialAsset("continue-card-simulado"),
    href: "banco-questoes.html",
    action: "Continuar simulado",
    tone: "blue",
  },
  {
    label: "Jogo",
    title: studentDashboardView.dailyMission.title,
    detail: "Jogo educativo",
    progress: Math.max(75, studentDashboardView.gameSummary.percent),
    image: homeOfficialAsset("continue-card-jogos"),
    href: "jogos.html",
    action: "Continuar jogando",
    tone: "orange",
  },
];

const ecosystemHomeIndicators = [
  { value: ecosystemHomeStats.xp, label: "XP" },
  { value: ecosystemHomeStats.medals, label: "Medalhas" },
  { value: `${ecosystemHomeStats.trainingHours}h`, label: "Horas de formacao" },
  { value: ecosystemHomeStats.certificates, label: "Certificados" },
  { value: ecosystemHomeStats.booksRead, label: "Livros lidos" },
  { value: ecosystemHomeStats.gamesCompleted, label: "Jogos concluidos" },
];

const renderHomeSectionHeader = (title, action = "") => `
  <div class="ecosystem-section-head">
    <h2>${title}</h2>
    ${action}
  </div>
`;

const homePresentationHotspots = [
  { className: "hotspot-resource-library", href: "biblioteca.html", label: "Abrir Biblioteca Digital" },
  { className: "hotspot-resource-university", href: "universidade.html", label: "Abrir Universidade" },
  { className: "hotspot-resource-games", href: "jogos.html", label: "Abrir Jogos Educativos" },
  { className: "hotspot-resource-avalia", href: "avalia.html", label: "Abrir Avalia+" },
  { className: "hotspot-resource-bank", href: "banco-questoes.html", label: "Abrir Banco de Questoes" },
  { className: "hotspot-resource-labs", href: "biblioteca.html#acervo-completo", label: "Abrir Laboratorios" },
  { className: "hotspot-mission-reading", href: masterBook001.href, label: "Abrir missao de leitura diaria" },
  { className: "hotspot-mission-training", href: "universidade.html#formacao-raizes", label: "Abrir formacao em andamento" },
  { className: "hotspot-mission-avalia", href: "banco-questoes.html", label: "Abrir questoes recomendadas" },
  { className: "hotspot-mission-games", href: "jogos.html", label: "Abrir jogos recomendados" },
  { className: "hotspot-mission-all", href: "missao.html", label: "Ver todas as missoes" },
  { className: "hotspot-activity-course", href: "universidade.html#formacao-raizes", label: "Abrir historico do curso Avaliacao Diagnostica" },
  { className: "hotspot-activity-medal", href: "perfil.html", label: "Abrir medalhas e conquistas" },
  { className: "hotspot-activity-reading", href: masterBook001.href, label: "Abrir leitura do Volume 1" },
  { className: "hotspot-activity-history", href: "perfil.html", label: "Ver historico completo" },
  { className: "hotspot-training-bncc", href: "universidade.html#formacao-raizes", label: "Abrir curso BNCC na Pratica" },
  { className: "hotspot-training-diagnostic", href: "universidade.html#formacao-raizes", label: "Abrir curso Avaliacao Diagnostica" },
  { className: "hotspot-training-saeb", href: "universidade.html#formacao-raizes", label: "Abrir curso SAEB Matematica" },
  { className: "hotspot-training-hours", href: "universidade.html", label: "Abrir relatorio de formacao" },
  { className: "hotspot-training-certificates", href: "universidade.html#formacao-raizes", label: "Ver certificados" },
  { className: "hotspot-training-literacy", href: "universidade.html#catalogo", label: "Abrir trilha Alfabetizacao" },
  { className: "hotspot-training-intervention", href: "universidade.html#formacao-raizes", label: "Abrir curso Intervencao Pedagogica" },
  { className: "hotspot-training-book", href: "biblioteca.html", label: "Abrir livro Praticas Pedagogicas" },
];

const renderHomePresentationHotspots = () =>
  homePresentationHotspots
    .map((hotspot) => `<a class="home-hotspot ${hotspot.className}" href="${hotspot.href}" aria-label="${hotspot.label}"></a>`)
    .join("");

const renderEcosystemHome = () => {
  return `
    <div class="ecosystem-home">
      <section class="ecosystem-hero">
        <div class="ecosystem-hero-copy">
          <span>Bem-vindo ao</span>
          <h1>Ecossistema Raizes e Saberes</h1>
          <p>Tudo o que voce precisa para ensinar, aprender e transformar a educacao em uma unica jornada.</p>
          <div class="ecosystem-hero-actions">
            ${ecosystemHomeResources.slice(0, 5).map((item) => `<a class="is-${item.tone}" href="${item.href}">${item.title}</a>`).join("")}
          </div>
        </div>
        <div class="ecosystem-hero-stage" aria-hidden="true">
          <img class="hero-static-art" src="assets/brand/RS-001-HeroMockup.webp" alt="" loading="eager" onerror="this.hidden=true" />
        </div>
      </section>

      <main class="ecosystem-home-main">
        ${renderHomeSectionHeader("Continue de onde parou")}
        <section class="journey-grid">
          ${ecosystemHomeJourney
            .map(
              (item) => `
                <article class="journey-card is-${item.tone}">
                  <img class="journey-art" src="${item.image}" alt="" loading="lazy" onerror="this.hidden=true" />
                  <div>
                    <span>${item.label}</span>
                    <h3>${item.title}</h3>
                    <p>${item.detail}</p>
                    <i><b style="width:${item.progress}%"></b></i>
                    <small>${item.progress}%</small>
                    <a href="${item.href}">${item.action}</a>
                  </div>
                </article>
              `
            )
            .join("")}
        </section>

        <section class="home-presentation-panel">
          <div class="home-static-map">
            <img
              src="assets/d1cbda35-0da3-4dcc-90c1-44395cebd20c.png"
              alt="Recursos do Ecossistema, Painel de Formacao, Central de Missoes e Atividades Recentes"
              loading="eager"
              onerror="this.hidden=true"
            />
            ${renderHomePresentationHotspots()}
          </div>
        </section>

        <section class="ecosystem-news">
          ${renderHomeSectionHeader("Novidades e destaques")}
          <div>
            <a href="universidade.html#formacao-raizes"><strong>Novo curso disponivel!</strong><span>Planejamento por Habilidades</span></a>
            <a href="avalia.html"><strong>Live hoje as 19h</strong><span>Avaliacao e intervencao</span></a>
            <a href="jogos.html"><strong>Novo jogo lancado!</strong><span>Organizando a Cesta</span></a>
            <a href="universidade.html"><strong>Webinar ao vivo</strong><span>BNCC e praticas na sala de aula</span></a>
          </div>
        </section>
      </main>

      <section class="ecosystem-smart-footer" aria-label="Indicadores do ecossistema">
        ${ecosystemHomeIndicators.map((item) => `<article><strong>${item.value}</strong><span>${item.label}</span></article>`).join("")}
      </section>
    </div>
  `;
};

const modules = {
  plataforma: {
    title: "Home do Ecossistema",
    subtitle: "Central de Comando Raizes e Saberes",
    code: "HOME-ECO-001",
    html: renderEcosystemHome(),
  },
  aluno: {
    title: "Dashboard do Aluno",
    subtitle: "Home principal do aluno",
    code: "PLAT-V2-005",
    html: renderStudentPresentationDashboard(),
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
    title: "Jogos Educativos",
    subtitle: "Hub oficial dos jogos digitais",
    code: "GAME-ENGINE-2.0",
    html: `
      <div class="screen-title">
        <p>GAME-ENGINE-2.0</p>
        <h1>Jogos Educativos</h1>
        <span>Escolha uma experiencia, conquiste XP e acompanhe suas medalhas.</span>
      </div>
      <div class="game-engine" data-game-engine></div>
    `,
  },
  perfil: {
    title: "Perfil",
    subtitle: "Progresso e conquistas do aluno",
    code: "ALUNO-PERFIL",
    html: renderStudentProfilePage(),
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
    subtitle: "Catalogo publico de cursos gratuitos",
    code: "MS-008",
    html: `
      <div class="university-catalog-platform" data-course-catalog>
        <section class="university-public-hero" id="universidade">
          <div>
            <span>Universidade Raizes e Saberes</span>
            <h1>Descubra cursos gratuitos confiaveis para sua formacao profissional.</h1>
            <p>Um nucleo publico de curadoria para pesquisar, comparar e acessar cursos gratuitos oferecidos por instituicoes externas.</p>
            <div class="university-hero-actions">
              <a href="#catalogo" data-catalog-section="catalogo">Encontrar cursos gratuitos</a>
              <a href="#formacao-raizes" data-catalog-section="formacao-raizes">Formacao Raizes e Saberes</a>
            </div>
          </div>
          <img src="assets/universidade/banner-principal.webp" alt="" />
        </section>

        <nav class="university-gateway" aria-label="Areas da Universidade">
          <a href="#formacao-raizes" data-catalog-section="formacao-raizes">
            <strong>Formacao Raizes e Saberes</strong>
            <span>Cursos proprios, trilhas, assessorias, encontros, historico e certificados em preparacao.</span>
          </a>
          <a href="#catalogo" data-catalog-section="catalogo" class="is-primary">
            <strong>Encontre Cursos Gratuitos</strong>
            <span>Catalogo publico com busca, filtros, rankings, comparacao e acesso ao curso na instituicao.</span>
          </a>
        </nav>

        <section class="university-prep-panel" id="formacao-raizes">
          <div>
            <span>Area institucional</span>
            <h2>Formacao Raizes e Saberes</h2>
            <p>Espaco reservado para o LMS proprio da plataforma: cursos internos, formacao continuada, implantacao das colecoes, assessorias, webinarios, encontros, certificados e historico formativo.</p>
          </div>
          <ul>
            <li>Cursos proprios em preparacao</li>
            <li>Historico e certificados internos futuros</li>
            <li>Sem emissao de certificados nesta fase</li>
          </ul>
        </section>

        <section class="knowledge-center-shell" id="centros-conhecimento">
          <header class="knowledge-center-head">
            <div>
              <span>Motor de descoberta do conhecimento</span>
              <h2>Centros de Conhecimento</h2>
              <p>Temas preparados para reunir cursos reais selecionados, livros, guias, legislacao, videos, especialistas, eventos e ferramentas em uma unica pagina de assunto.</p>
            </div>
          </header>
          <div class="knowledge-category-grid" data-knowledge-categories></div>
          <div class="knowledge-center-grid" data-knowledge-centers></div>
        </section>

        <section class="knowledge-center-detail" id="centro-conhecimento" data-knowledge-center-detail hidden></section>

        <section class="course-catalog-shell" id="catalogo">
          <header class="catalog-head">
            <div>
              <span>Catalogo publico gratuito</span>
              <h2>Encontre cursos gratuitos</h2>
              <p>Cursos reais selecionados para apresentacao, com curadoria da Raizes e Saberes e acesso ao ambiente oficial da instituicao ofertante.</p>
            </div>
          </header>

          <div class="catalog-tools">
            <label class="catalog-search">
              <span>Busca</span>
              <input type="search" data-course-search placeholder="Buscar por curso, tema, instituicao ou publico" />
            </label>
            <div class="catalog-sort">
              <span>Ordenar</span>
              <select data-course-sort>
                <option value="featured">Destaques da curadoria</option>
                <option value="rating">Mais bem avaliados</option>
                <option value="access">Mais acessados</option>
                <option value="recent">Adicionados recentemente</option>
                <option value="hours">Menor carga horaria</option>
              </select>
            </div>
          </div>

          <section class="smart-discovery-panel" data-smart-discovery hidden></section>

          <div class="catalog-quick-themes" aria-label="Temas rapidos" data-quick-themes></div>

          <section class="catalog-showcase" aria-label="Cursos em destaque">
            <div class="catalog-section-head">
              <div><span>Cursos em destaque</span><h3>Selecao da curadoria</h3></div>
              <div class="catalog-kpis" data-catalog-kpis></div>
            </div>
            <div class="showcase-course-grid" data-featured-courses></div>
          </section>

          <section class="catalog-ranking-grid" aria-label="Rankings">
            <article><h3>Mais acessados</h3><div data-most-accessed></div></article>
            <article><h3>Mais bem avaliados</h3><div data-best-rated></div></article>
            <article><h3>Adicionados recentemente</h3><div data-recent-courses></div></article>
            <article><h3>Com certificado</h3><div data-certificate-courses></div></article>
          </section>

          <section class="catalog-provider-strip">
            <div class="catalog-section-head"><div><span>Instituicoes em destaque</span><h3>Ofertantes publicos reconhecidos</h3></div></div>
            <div data-featured-providers></div>
          </section>

          <div class="catalog-full-head">
            <div>
              <span>Catalogo completo</span>
              <h3>Filtre e compare cursos gratuitos</h3>
            </div>
            <button class="mobile-filter-open" type="button" data-open-mobile-filters>Filtros</button>
          </div>

          <div class="catalog-layout">
            <aside class="catalog-filters" aria-label="Filtros do catalogo" data-filter-panel>
              <div class="catalog-filter-panel-head">
                <strong>Filtros</strong>
                <button type="button" data-close-mobile-filters aria-label="Fechar filtros">Fechar</button>
              </div>
              <div data-course-filters></div>
              <button class="more-filters-button" type="button" data-toggle-more-filters aria-expanded="false">Mais filtros</button>
              <button type="button" data-clear-course-filters>Limpar filtros</button>
            </aside>
            <div class="catalog-results">
              <div class="active-filter-row" data-active-course-filters></div>
              <div class="catalog-result-head"><strong data-course-result-count></strong><span data-course-demo-note>Cursos reais selecionados para apresentacao.</span></div>
              <div class="catalog-loading" data-course-loading aria-hidden="true">
                <span></span><span></span><span></span>
              </div>
              <div class="course-card-grid-public" data-course-results></div>
              <button class="catalog-load-more" type="button" data-course-load-more>Carregar mais</button>
            </div>
          </div>
        </section>

        <section class="course-detail-panel" id="detalhes" data-course-detail hidden></section>

        <section class="curation-admin-panel" id="administracao">
          <header>
            <span>Administracao e curadoria</span>
            <h2>Estrutura inicial para gestao do catalogo</h2>
          </header>
          <div class="admin-action-grid">
            <article>Cadastrar instituicao</article>
            <article>Cadastrar e editar curso</article>
            <article>Publicar e despublicar</article>
            <article>Verificar link oficial</article>
            <article>Adicionar categorias e tags</article>
            <article>Destacar ou arquivar curso</article>
            <article>Registrar notas internas</article>
            <article>Atualizar informacoes verificadas</article>
            <article>Validar certificado externo enviado</article>
          </div>
        </section>

        <section class="catalog-data-panel" id="estrutura-dados">
          <header>
            <span>Base escalavel</span>
            <h2>Entidades preparadas para a proxima fase</h2>
          </header>
          <div class="data-table-list">
            <code>course_providers</code><code>curated_courses</code><code>course_categories</code><code>course_tags</code><code>course_tag_relations</code><code>course_reviews</code><code>course_favorites</code><code>course_clicks</code><code>course_verifications</code><code>learning_paths</code><code>learning_path_courses</code>
          </div>
        </section>
      </div>
    `,
  },
  curadoria: {
    title: "Central de Curadoria",
    subtitle: "Operacao interna da Universidade",
    code: "ADM-UNI",
    html: `
      <div class="curation-console">
        <section class="curation-hero" id="dashboard">
          <div>
            <span>Area administrativa protegida</span>
            <h1>Central de Curadoria da Universidade</h1>
            <p>Ambiente interno demonstrativo para administrar instituicoes, cursos, Centros de Conhecimento e recursos editoriais da Universidade Raizes e Saberes.</p>
          </div>
          <aside>
            <strong>Ultima atualizacao</strong>
            <span>28/07/2026 - 09h40</span>
            <small>Dados demonstrativos para homologacao operacional.</small>
          </aside>
        </section>

        <section class="curation-metric-grid" aria-label="Indicadores da curadoria">
          <article><span>Instituicoes cadastradas</span><strong>24</strong></article>
          <article><span>Cursos cadastrados</span><strong>186</strong></article>
          <article><span>Centros de Conhecimento</span><strong>18</strong></article>
          <article><span>Materiais</span><strong>342</strong></article>
          <article><span>Livros</span><strong>64</strong></article>
          <article><span>Videos</span><strong>128</strong></article>
          <article><span>Eventos</span><strong>17</strong></article>
          <article><span>Especialistas</span><strong>42</strong></article>
          <article><span>Links pendentes</span><strong>31</strong></article>
          <article><span>Aguardando revisao</span><strong>46</strong></article>
          <article><span>Cursos publicados</span><strong>118</strong></article>
          <article><span>Cursos arquivados</span><strong>22</strong></article>
          <article><span>Usuarios curadores</span><strong>8</strong></article>
        </section>

        <div class="curation-layout">
          <section class="curation-panel span-2">
            <header><span>Atividades recentes</span><h2>Historico operacional</h2></header>
            <div class="curation-activity-list">
              <article><strong>Curso atualizado</strong><span>Mariana Curadora - alterou carga horaria - hoje, 09h12</span></article>
              <article><strong>Link verificado</strong><span>Equipe Editorial - marcou URL como valida - hoje, 08h44</span></article>
              <article><strong>Centro relacionado</strong><span>Rafael Curador - adicionou curso a Educacao Inclusiva - ontem, 17h20</span></article>
              <article><strong>Tag mesclada</strong><span>Coord. Curadoria - unificou tags alfabetizacao/letramento - ontem, 15h02</span></article>
            </div>
          </section>

          <section class="curation-panel">
            <header><span>Status editorial</span><h2>Fluxo padrao</h2></header>
            <div class="editorial-status-list">
              <span>Rascunho</span><span>Em revisao</span><span>Aguardando publicacao</span><span>Publicado</span><span>Arquivado</span><span>Link quebrado</span><span>Revisao necessaria</span>
            </div>
          </section>

          <section class="curation-panel span-3" id="lotes">
            <header><span>Lotes de Curadoria</span><h2>Esteira automatizada controlada pelo Codex</h2></header>
            <div class="batch-runtime-state" data-curation-state role="status">Carregando lote EDU-001...</div>
            <div class="batch-summary-grid" data-batch-summary aria-live="polite">
              <article><strong>Lote EDU-001</strong><span>Primeiro lote real - Educacao</span><small>25 cursos encontrados · 22 importados · 3 descartados · 0 publicados</small></article>
              <article><strong>Status</strong><span>Aguardando revisao</span><small>Publicacao bloqueada ate aprovacao da equipe.</small></article>
              <article><strong>Alertas</strong><span>9 alertas de metadados</span><small>Carga horaria, URL individual ou classificacao exigem revisao.</small></article>
              <article><strong>Duplicidades</strong><span>1 possivel duplicidade</span><small>Curso similar localizado por titulo e instituicao.</small></article>
            </div>
            <div class="batch-toolbar" data-batch-toolbar>
              <label><span>Filtro</span><select data-batch-filter><option value="all">Todos os itens</option><option value="alerts">Somente alertas</option><option value="duplicates">Possivel duplicidade</option><option value="approved">Aprovados</option><option value="published">Publicados</option></select></label>
              <label><span>Observacao do curador</span><input data-curator-note placeholder="Registrar observacao antes da acao" /></label>
            </div>
            <div class="batch-actions" data-batch-actions>
              <button type="button" data-batch-refresh>Atualizar lote</button>
              <button type="button" data-batch-approve-selected>Aprovar selecionados</button>
              <button type="button" data-batch-reject-selected>Rejeitar selecionados</button>
              <button type="button" data-batch-correction-selected>Solicitar correcao</button>
              <button type="button" data-batch-publish-selected>Publicar aprovado selecionado</button>
              <button type="button" data-batch-unpublish-selected>Despublicar selecionado</button>
            </div>
            <div class="batch-review-table" data-batch-items></div>
            <aside class="batch-course-detail" data-batch-detail hidden></aside>
          </section>

          <section class="curation-panel span-3" id="instituicoes">
            <header><span>Instituicoes</span><h2>Cadastro completo</h2></header>
            <form class="curation-form">
              <label><span>Nome</span><input value="Instituto Demonstrativo de Formacao" /></label>
              <label><span>Sigla</span><input value="IDF" /></label>
              <label><span>Tipo</span><select><option>Organizacao demonstrativa</option><option>Universidade</option><option>Orgao publico</option></select></label>
              <label><span>Pais</span><input value="Brasil" /></label>
              <label><span>Estado</span><input value="SP" /></label>
              <label><span>Cidade</span><input value="Sao Paulo" /></label>
              <label><span>Site oficial</span><input value="https://example.org" /></label>
              <label><span>Logotipo</span><input value="logo-demonstrativo.webp" /></label>
              <label><span>Imagem</span><input value="capa-instituicao-demo.webp" /></label>
              <label><span>Contato</span><input value="curadoria@example.org" /></label>
              <label><span>Status</span><select><option>Ativo</option><option>Em revisao</option><option>Arquivado</option></select></label>
              <label><span>Ultima verificacao</span><input value="28/07/2026" /></label>
              <label><span>Responsavel</span><input value="Equipe Curadoria" /></label>
              <label><span>Categorias</span><input value="Educacao, Formacao continuada" /></label>
              <label><span>Tags</span><input value="demo, curso gratuito, professores" /></label>
              <label class="span-2"><span>Descricao</span><textarea>Registro demonstrativo para validar cadastro editorial de instituicoes.</textarea></label>
              <label><span>Observacoes</span><textarea>Sem conteudo real nesta fase.</textarea></label>
            </form>
          </section>

          <section class="curation-panel span-3" id="cursos">
            <header><span>Cursos</span><h2>Formulario editorial</h2></header>
            <form class="curation-form">
              <label><span>Titulo</span><input value="Avaliacao Formativa na Pratica" /></label>
              <label><span>Instituicao</span><input value="Instituto Demonstrativo de Formacao" /></label>
              <label><span>Carga horaria</span><input value="20h" /></label>
              <label><span>Categoria</span><input value="Praticas pedagogicas" /></label>
              <label><span>Tema</span><input value="Avaliacao" /></label>
              <label><span>Nivel</span><select><option>Introdutorio</option><option>Intermediario</option><option>Avancado</option></select></label>
              <label><span>Idioma</span><input value="pt-BR" /></label>
              <label><span>Modalidade</span><select><option>Online</option><option>Hibrido</option><option>Presencial</option></select></label>
              <label><span>Certificado</span><select><option>Disponivel</option><option>Nao informado</option></select></label>
              <label><span>URL oficial</span><input value="https://example.org/curso-demonstrativo" /></label>
              <label><span>Prazo</span><input value="Sem prazo" /></label>
              <label><span>Status</span><select><option>Em revisao</option><option>Publicado</option><option>Arquivado</option></select></label>
              <label><span>Tags</span><input value="avaliacao, rubricas, professores" /></label>
              <label><span>Centro de Conhecimento</span><input value="Avaliacao Formativa" /></label>
              <label><span>Trilhas relacionadas</span><input value="Professor, Coordenador" /></label>
              <label><span>Ultima revisao</span><input value="28/07/2026" /></label>
              <label class="span-2"><span>Descricao curta</span><textarea>Ficha demonstrativa para validar curadoria editorial de cursos gratuitos.</textarea></label>
              <label><span>Descricao completa</span><textarea>Conteudo demonstrativo. Curso real sera cadastrado apos verificacao manual.</textarea></label>
              <label><span>Observacoes da Curadoria</span><textarea>Validar link oficial antes de publicar.</textarea></label>
              <label class="span-3"><span>Historico de alteracoes</span><textarea>28/07/2026 - Criado por Curadoria Demo. 28/07/2026 - Status alterado para Em revisao.</textarea></label>
            </form>
          </section>

          <section class="curation-panel span-2" id="centros">
            <header><span>Centros de Conhecimento</span><h2>Gerenciamento</h2></header>
            <div class="curation-action-grid">
              <article>Criar Centro</article><article>Editar Centro</article><article>Arquivar</article><article>Relacionar cursos</article><article>Relacionar materiais</article><article>Relacionar especialistas</article><article>Relacionar legislacao</article><article>Relacionar eventos</article><article>Relacionar trilhas</article>
            </div>
          </section>

          <section class="curation-panel" id="tags">
            <header><span>Tags e categorias</span><h2>Taxonomia</h2></header>
            <div class="curation-action-grid single">
              <article>Criar tag</article><article>Editar tag</article><article>Mesclar tags</article><article>Excluir tag</article><article>Relacionamentos</article><article>Criar categoria</article><article>Editar categoria</article>
            </div>
          </section>

          <section class="curation-panel span-3" id="trilhas">
            <header><span>Trilhas</span><h2>Editor visual demonstrativo</h2></header>
            <div class="trail-editor-demo">
              <article><span>01</span><strong>Resumo</strong><small>20 min - Professor</small></article>
              <article><span>02</span><strong>Livro</strong><small>2h - leitura</small></article>
              <article><span>03</span><strong>Curso</strong><small>20h - online</small></article>
              <article><span>04</span><strong>Video</strong><small>15 min</small></article>
              <article><span>05</span><strong>Guia</strong><small>40 min</small></article>
              <article><span>06</span><strong>Conclusao</strong><small>10 min</small></article>
            </div>
            <div class="curation-action-row"><button type="button">Adicionar etapa</button><button type="button">Mover</button><button type="button">Ordenar</button><button type="button">Definir perfil</button></div>
          </section>

          <section class="curation-panel span-3" id="recursos">
            <header><span>Recursos</span><h2>Cadastros preparados</h2></header>
            <div class="resource-admin-grid">
              <article><strong>Materiais</strong><span>PDF, Guia, Cartilha, Modelo, Checklist, Manual, Ferramenta, Link externo</span></article>
              <article><strong>Legislacao</strong><span>Lei, Decreto, Resolucao, Parecer, Nota Tecnica, Manual</span></article>
              <article><strong>Livros</strong><span>Titulo, autor, capa, descricao, temas, status</span></article>
              <article><strong>Videos</strong><span>Titulo, URL, duracao, transcricao futura, status</span></article>
              <article><strong>Podcasts</strong><span>Episodio, audio, duracao, apresentador, status</span></article>
              <article><strong>Especialistas</strong><span>Foto, nome, especialidade, instituicao, biografia, links</span></article>
              <article><strong>Eventos</strong><span>Nome, data, formato, inscricao, status, materiais</span></article>
            </div>
          </section>

          <section class="curation-panel span-2" id="verificacao">
            <header><span>Verificacao</span><h2>Conferencia editorial</h2></header>
            <div class="verification-table">
              <article><strong>Curso demonstrativo</strong><span>Link valido</span><small>Responsavel: Marina - proxima revisao 12/08/2026</small></article>
              <article><strong>Instituicao demonstrativa</strong><span>Revisao necessaria</span><small>Responsavel: Rafael - proxima revisao 05/08/2026</small></article>
              <article><strong>Material futuro</strong><span>Link pendente</span><small>Responsavel: Equipe - proxima revisao 01/08/2026</small></article>
            </div>
          </section>

          <section class="curation-panel">
            <header><span>Auditoria</span><h2>Historico</h2></header>
            <div class="audit-list">
              <article><strong>Quem criou</strong><span>Curadoria Demo</span></article>
              <article><strong>Quem alterou</strong><span>Coord. Curadoria</span></article>
              <article><strong>Quando alterou</strong><span>28/07/2026 09h40</span></article>
              <article><strong>O que alterou</strong><span>Status, tags, relacionamento com centro</span></article>
            </div>
          </section>
        </div>
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
    subtitle: "Painel da Professora Helena",
    code: "MS-003",
    html: renderProfessorDashboard(),
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
        <section class="panel span-2 digital-results-panel" data-digital-results>
          <div class="panel-head"><h2>Aplicacoes Digitais</h2><span data-digital-results-summary>Sem dados</span></div>
          <div class="digital-results-grid" data-digital-results-grid></div>
          <div class="digital-results-detail" data-digital-results-detail></div>
        </section>
        <section class="panel"><h2>Desempenho por Disciplina</h2><div class="bar-list blue-bars"><p>Lingua Portuguesa<i style="--value:78%"></i></p><p>Matematica<i style="--value:71%"></i></p><p>Ciencias<i style="--value:69%"></i></p><p>Historia<i style="--value:66%"></i></p><p>Geografia<i style="--value:65%"></i></p></div></section>
        <section class="panel chart-card"><h2>Niveis de Aprendizagem</h2><div class="donut">18.742</div><ul class="legend"><li>Adequado 68,4%</li><li>Basico 24,8%</li><li>Critico 6,8%</li></ul></section>
        <section class="panel span-2"><h2>Diagnosticos</h2><table><tr><td>EF04LP01</td><td>82,1%</td><td>Adequado</td></tr><tr><td>EF04MA05</td><td>71,4%</td><td>Basico</td></tr><tr><td>EF04CI03</td><td>68,7%</td><td>Basico</td></tr></table></section>
        <section class="panel"><h2>Atividades Recentes</h2><ul class="clean-list"><li>Avaliacao de Matematica</li><li>Diagnostico de Leitura</li><li>Avaliacao de Ciencias</li></ul></section>
      </div>
    `,
  },
  bancoQuestoes: {
    title: "Banco de Questoes",
    subtitle: "Banco inteligente de questoes, atividades e avaliacoes",
    code: "MS-004-BQ",
    html: `
      <div class="dashboard-head blue">
        <div>
          <p>MS-004-BQ</p>
          <h1>Banco Inteligente de Questoes</h1>
          <span>Itens autorais, adaptados e oficiais com origem, licenca, curadoria e historico de uso.</span>
        </div>
      </div>
      <section class="question-bank" data-question-bank>
        <div class="qb-notice" role="note">
          <strong>Regra de publicacao</strong>
          <span>Nenhum conteudo externo e publicado automaticamente. Materiais sem licenca aberta ficam bloqueados ou servem apenas como referencia pedagogica para itens novos e autorais.</span>
        </div>
        <div class="metric-row qb-metrics">
          <article>Itens demonstrativos<strong data-qb-total>0</strong><span>Base ficticia autoral</span></article>
          <article>Publicados<strong data-qb-published>0</strong><span>Com curadoria concluida</span></article>
          <article>Em revisao<strong data-qb-review>0</strong><span>Sem publicacao automatica</span></article>
          <article>No carrinho<strong data-qb-cart-count>0</strong><span>Avaliacao em montagem</span></article>
        </div>
        <div class="qb-layout">
          <aside class="panel qb-filters" aria-label="Filtros do banco de questoes">
            <div class="panel-head"><h2>Pesquisa e filtros</h2><button type="button" data-qb-clear>Limpar</button></div>
            <label><span>Buscar</span><input type="search" data-qb-search placeholder="Codigo, habilidade, enunciado..." /></label>
            <label><span>Etapa</span><select data-qb-filter="stage"><option value="">Todas</option></select></label>
            <label><span>Ano</span><select data-qb-filter="year"><option value="">Todos</option></select></label>
            <label><span>Componente curricular</span><select data-qb-filter="component"><option value="">Todos</option></select></label>
            <label><span>Habilidade BNCC</span><select data-qb-filter="skill"><option value="">Todas</option></select></label>
            <label><span>Matriz ou descritor</span><select data-qb-filter="descriptor"><option value="">Todos</option></select></label>
            <label><span>Unidade tematica</span><select data-qb-filter="unit"><option value="">Todas</option></select></label>
            <label><span>Objeto de conhecimento</span><select data-qb-filter="object"><option value="">Todos</option></select></label>
            <label><span>Dificuldade</span><select data-qb-filter="difficulty"><option value="">Todas</option></select></label>
            <label><span>Nivel de proficiencia</span><select data-qb-filter="proficiency"><option value="">Todos</option></select></label>
            <label><span>Tipo de questao</span><select data-qb-filter="type"><option value="">Todos</option></select></label>
            <label><span>Recurso utilizado</span><select data-qb-filter="resource"><option value="">Todos</option></select></label>
            <label><span>Origem</span><select data-qb-filter="originType"><option value="">Todas</option></select></label>
            <label><span>Status de revisao</span><select data-qb-filter="curationStatus"><option value="">Todos</option></select></label>
            <label><span>Acessibilidade</span><select data-qb-filter="accessibility"><option value="">Todas</option></select></label>
            <label><span>Uso</span><select data-qb-used><option value="">Todas</option><option value="used">Ja utilizadas</option><option value="unused">Ineditas para a turma</option></select></label>
          </aside>
          <main class="qb-results">
            <div class="qb-toolbar">
              <div><strong data-qb-result-count>0 itens</strong><span>Filtros combinaveis e resposta local rapida.</span></div>
              <select data-qb-sort aria-label="Ordenar questoes">
                <option value="recent">Ultima revisao</option>
                <option value="difficulty">Dificuldade</option>
                <option value="skill">Habilidade</option>
                <option value="year">Ano</option>
                <option value="code">Codigo</option>
                <option value="time">Tempo estimado</option>
              </select>
            </div>
            <div class="qb-state" data-qb-loading>Carregando banco demonstrativo...</div>
            <div class="qb-state error" data-qb-error hidden>Nao foi possivel carregar os itens demonstrativos.</div>
            <div class="qb-grid" data-qb-grid></div>
            <div class="qb-state" data-qb-empty hidden>Nenhuma questao encontrada com os filtros atuais.</div>
            <section class="panel qb-detail" data-qb-detail aria-live="polite"></section>
            <section class="panel qb-builder">
              <div class="panel-head"><h2>Construtor de Avaliacoes</h2><button type="button" data-qb-save-draft>Salvar rascunho</button></div>
              <div class="qb-builder-grid">
                <label><span>Titulo</span><input data-qb-assessment-title value="Avaliacao diagnostica demonstrativa" /></label>
                <label><span>Turma</span><select><option>2o Ano A</option><option>5o Ano B</option></select></label>
                <label><span>Componente curricular</span><select data-qb-assessment-component><option>Lingua Portuguesa</option><option>Matematica</option></select></label>
                <label><span>Ano escolar</span><select data-qb-assessment-year><option>2o ano</option><option>5o ano</option></select></label>
                <label><span>Data de aplicacao</span><input type="date" value="2026-08-05" /></label>
                <label><span>Capa</span><select><option>Raizes e Saberes - padrao</option><option>Sem capa</option></select></label>
                <label class="span-2"><span>Orientacoes</span><textarea>Leia com atencao e marque apenas uma alternativa por questao.</textarea></label>
                <label><span>Inicio digital</span><input type="datetime-local" data-qb-available-from /></label>
                <label><span>Prazo final</span><input type="datetime-local" data-qb-due-at /></label>
                <label><span>Tempo limite</span><input type="number" min="5" step="5" value="50" data-qb-time-limit /></label>
                <label><span>Tentativas</span><input type="number" min="1" step="1" value="1" data-qb-max-attempts /></label>
                <label><span>Resultado</span><select data-qb-result-mode><option value="immediate">Imediato</option><option value="score_only">Somente nota</option><option value="after_due">Apos o prazo</option><option value="manual">Liberacao manual</option><option value="hidden">Oculto</option></select></label>
                <label><span>Embaralhar</span><select data-qb-shuffle><option value="none">Nao embaralhar</option><option value="questions">Questoes</option><option value="all">Questoes e alternativas</option></select></label>
              </div>
              <div class="qb-builder-actions">
                <button type="button" data-qb-preview-local>Previa rapida - nao salva</button>
                <button type="button" data-qb-preview="student">Pre-visualizar avaliacao</button>
                <button type="button" data-qb-preview="teacher">Visualizar gabarito do professor</button>
                <button type="button">Duplicar</button>
                <button type="button">Gerar versoes</button>
                <button type="button" data-qb-publish-digital>Aplicar digitalmente</button>
                <button type="button">Preparar PDF futuro</button>
              </div>
            </section>
            <section class="panel qb-saved">
              <div class="panel-head"><h2>Avaliacoes salvas</h2><a href="#avaliacoes">Ver historico</a></div>
              <div data-qb-saved></div>
            </section>
            <section class="panel qb-access">
              <div class="panel-head"><h2>Controle de acesso</h2><a href="#perfis">Perfis</a></div>
              <div data-qb-access></div>
            </section>
          </main>
          <aside class="panel qb-cart" aria-label="Carrinho da avaliacao">
            <div class="panel-head"><h2>Avaliacao</h2><button type="button" data-qb-clear-cart>Limpar</button></div>
            <div class="qb-selection-status" data-qb-selection-status aria-live="polite"></div>
            <div class="qb-cart-list" data-qb-cart-list></div>
            <div class="qb-cart-summary"><strong data-qb-cart-time>0 min</strong><span>tempo estimado</span></div>
            <div class="qb-preview" data-qb-preview-panel hidden></div>
            <button type="button" class="qb-primary-action" data-qb-generate>Gerar avaliacao</button>
          </aside>
        </div>
      </section>
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
    html: renderFamilyDashboard(),
  },
};

const environments = {
  plataforma: {
    label: "Ecossistema",
    profile: "Central de Comando",
    search: "Buscar livros, cursos, jogos, colecoes e mais...",
    user: "Helena<br />Professora",
    avatar: "assets/universidade/avatar-ana-carolina.webp",
    profileImage: "logo-sidebar-dark.png",
    nav: [
      ["plataforma", "Inicio", "plataforma.html"],
      ["biblioteca", "Biblioteca", "biblioteca.html"],
      ["universidade", "Universidade", "universidade.html"],
      ["jogos", "Jogos Educativos", "jogos.html"],
      ["avalia", "Avalia+", "avalia.html"],
      ["bancoQuestoes", "Banco de Questoes", "banco-questoes.html"],
      ["professor", "Professor", "professor.html"],
      ["aluno", "Aluno", "aluno.html"],
      ["familia", "Familia", "familia.html"],
      ["secretaria", "Secretaria", "secretaria.html"],
      ["gestor", "Gestor", "gestor.html"],
      ["arvore", "Minha Arvore", "arvore.html"],
      ["missao", "Missao do Dia", "missao.html"],
    ],
    mobile: [
      ["plataforma", "Inicio", "plataforma.html"],
      ["biblioteca", "Biblioteca", "biblioteca.html"],
      ["universidade", "Universidade", "universidade.html"],
      ["jogos", "Jogos", "jogos.html"],
      ["avalia", "Mais", "avalia.html"],
    ],
  },
  aluno: {
    label: "Aluno",
    profile: "Aprendizagem",
    search: "Buscar livros, missoes, atividades...",
    user: `Pedro<br />Nivel 1 - ${studentDashboardView.profile.xp} XP`,
    avatar: "assets/aluno/oficial-avatar-aluno.png",
    profileImage: "logo-sidebar-dark.png",
    nav: [
      ["aluno", "🏠 Inicio", "aluno.html"],
      ["biblioteca", "📚 Biblioteca", "biblioteca.html"],
      ["jogos", "🎮 Jogos", "jogos.html"],
      ["conquistas", "🏆 Conquistas", "#conquistas"],
      ["perfil", "👤 Perfil", "perfil.html"],
    ],
    mobile: [
      ["aluno", "🏠 Inicio", "aluno.html"],
      ["biblioteca", "📚 Biblioteca", "biblioteca.html"],
      ["jogos", "🎮 Jogos", "jogos.html"],
      ["conquistas", "🏆 Conquistas", "#conquistas"],
      ["perfil", "👤 Perfil", "perfil.html"],
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
      ["heading", "Formacao Raizes e Saberes", "#"],
      ["universidade", "Inicio", "universidade.html#formacao-raizes"],
      ["trilhas", "Trilhas de Aprendizagem", "#formacao-raizes"],
      ["cursos", "Meus Cursos", "#formacao-raizes"],
      ["certificados", "Certificados", "#formacao-raizes"],
      ["videoaulas", "Videoaulas", "#formacao-raizes"],
      ["avaliacoes", "Avaliacoes", "#formacao-raizes"],
      ["eventos", "Eventos", "#formacao-raizes"],
      ["historico", "Historico Formativo", "#formacao-raizes"],
      ["centros", "Centros de Conhecimento", "#centros-conhecimento"],
      ["heading", "Catalogo Gratuito", "#"],
      ["encontrar", "Encontrar Cursos", "#catalogo"],
      ["categorias", "Categorias", "#catalogo"],
      ["instituicoes", "Instituicoes", "#catalogo"],
      ["rankings", "Rankings", "#catalogo"],
      ["favoritos", "Favoritos", "#catalogo"],
      ["acessados", "Cursos Acessados", "#catalogo"],
    ],
    mobile: [
      ["universidade", "Inicio", "universidade.html"],
      ["trilhas", "Trilhas", "#"],
      ["cursos", "Meus Cursos", "#"],
      ["certificados", "Certificados", "#"],
      ["biblioteca", "Biblioteca", "biblioteca.html"],
    ],
  },
  curadoria: {
    label: "Central de Curadoria",
    profile: "Administracao da Universidade",
    search: "Buscar conteudos, cursos, instituicoes, logs...",
    user: "Equipe Curadoria<br />Acesso administrativo",
    profileImage: "logo-sidebar-dark.png",
    nav: [
      ["curadoria", "Dashboard", "curadoria.html#dashboard"],
      ["lotes", "Lotes de Curadoria", "#lotes"],
      ["instituicoes", "Instituicoes", "#instituicoes"],
      ["cursos", "Cursos", "#cursos"],
      ["centros", "Centros de Conhecimento", "#centros"],
      ["categorias", "Categorias", "#tags"],
      ["tags", "Tags", "#tags"],
      ["trilhas", "Trilhas", "#trilhas"],
      ["materiais", "Materiais", "#recursos"],
      ["legislacao", "Legislacao", "#recursos"],
      ["livros", "Livros", "#recursos"],
      ["videos", "Videos", "#recursos"],
      ["podcasts", "Podcasts", "#recursos"],
      ["eventos", "Eventos", "#recursos"],
      ["especialistas", "Especialistas", "#recursos"],
      ["usuarios", "Usuarios", "#dashboard"],
      ["relatorios", "Relatorios", "#dashboard"],
      ["configuracoes", "Configuracoes", "#dashboard"],
      ["logs", "Logs", "#verificacao"],
    ],
    mobile: [
      ["curadoria", "Dashboard", "curadoria.html"],
      ["instituicoes", "Instituicoes", "#instituicoes"],
      ["cursos", "Cursos", "#cursos"],
      ["centros", "Centros", "#centros"],
      ["logs", "Logs", "#verificacao"],
    ],
  },
  professor: {
    label: "Painel do Professor",
    profile: "Professor",
    search: "Buscar turmas, alunos, atividades, livros...",
    user: "Professora Helena<br />Ver perfil",
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
      ["bancoQuestoes", "Banco de Questoes", "banco-questoes.html"],
    ],
    mobile: [
      ["avalia", "Inicio", "avalia.html"],
      ["diagnosticos", "Diagnosticos", "#"],
      ["turmas", "Turmas", "#"],
      ["bancoQuestoes", "Banco", "banco-questoes.html"],
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
  plataforma: "plataforma",
  aluno: "aluno",
  arvore: "aluno",
  missao: "aluno",
  jogos: "aluno",
  perfil: "aluno",
  biblioteca: "biblioteca",
  viewer: "biblioteca",
  universidade: "universidade",
  curadoria: "curadoria",
  professor: "professor",
  avalia: "avalia",
  bancoQuestoes: "avalia",
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

const digitalAssessmentStorageKey = "raizes:digital-assessments";
const digitalStudentProfile = {
  id: "student-demo-pedro",
  name: "Pedro Silva",
  classId: "2ano-a",
  className: "2o Ano A",
};

const readDigitalAssessmentState = () => {
  try {
    const state = JSON.parse(localStorage.getItem(digitalAssessmentStorageKey) || "{}");
    return { assignments: [], attempts: [], notifications: [], ...state };
  } catch (error) {
    return { assignments: [], attempts: [], notifications: [] };
  }
};

const writeDigitalAssessmentState = (state) => {
  localStorage.setItem(digitalAssessmentStorageKey, JSON.stringify(state));
};

const digitalStatusLabel = (assignment, attempt) => {
  if (!attempt) return "NAO INICIADA";
  if (attempt.status === "EM_ANDAMENTO") return "EM ANDAMENTO";
  if (attempt.status === "CORRIGIDA") return "CORRIGIDA";
  if (attempt.status === "ENVIADA") return "ENVIADA";
  return attempt.status || assignment.status || "DISPONIVEL";
};

const digitalResultVisibility = (assignment, attempt) => {
  if (!attempt || attempt.status !== "CORRIGIDA") return "hidden";
  if (assignment.resultReleaseMode === "hidden" || assignment.resultReleaseMode === "manual") return "hidden";
  if (assignment.resultReleaseMode === "after_due" && assignment.dueAt && Date.now() < new Date(assignment.dueAt).getTime()) return "hidden";
  if (assignment.resultReleaseMode === "score_only") return "score_only";
  return "commented";
};

const getDigitalAssignmentForStudent = () => {
  const state = readDigitalAssessmentState();
  const assignments = state.assignments.filter(
    (assignment) =>
      assignment.status !== "ARQUIVADA" &&
      (assignment.studentId === digitalStudentProfile.id || assignment.classId === digitalStudentProfile.classId)
  );
  return { state, assignments };
};

const publishDigitalAssessmentDemo = (payload) => {
  const state = readDigitalAssessmentState();
  const assignmentId = `assign-${Date.now()}`;
  const assessmentId = payload.assessmentId || `assessment-${Date.now()}`;
  const assignment = {
    id: assignmentId,
    assessmentId,
    title: payload.title,
    component: payload.component,
    year: payload.year,
    teacher: "Prof. Marcos Silva",
    classId: "2ano-a",
    className: payload.className || "2o Ano A",
    status: "DISPONIVEL",
    availableFrom: payload.availableFrom || new Date().toISOString(),
    dueAt: payload.dueAt || new Date(Date.now() + 7 * 86400000).toISOString(),
    timeLimitMinutes: Number(payload.timeLimitMinutes || 50),
    maxAttempts: Number(payload.maxAttempts || 1),
    shuffleQuestions: payload.shuffleQuestions,
    shuffleAlternatives: payload.shuffleAlternatives,
    resultReleaseMode: payload.resultReleaseMode || "immediate",
    totalPoints: payload.questions.reduce((sum, question) => sum + Number(question.points || 1), 0),
    questions: payload.questions,
    publishedAt: new Date().toISOString(),
  };
  state.assignments = [assignment, ...state.assignments.filter((item) => item.assessmentId !== assessmentId)];
  state.notifications.unshift({
    id: `notification-${Date.now()}`,
    type: "avaliacao_disponivel",
    message: `${assignment.title} disponivel para ${assignment.className}.`,
    createdAt: new Date().toISOString(),
  });
  writeDigitalAssessmentState(state);
  return assignment;
};

const scoreDigitalAttempt = (assignment, attempt) => {
  let objectiveScore = 0;
  let answered = 0;
  const responses = { ...attempt.responses };
  assignment.questions.forEach((question) => {
    const response = responses[question.id] || {};
    const selectedIndex = Number(response.selectedIndex);
    const isAnswered = Number.isInteger(selectedIndex);
    const isCorrect = isAnswered && selectedIndex === Number(question.correctAlternative);
    if (isAnswered) answered += 1;
    if (isCorrect) objectiveScore += Number(question.points || 1);
    responses[question.id] = {
      ...response,
      isCorrect,
      automaticScore: isCorrect ? Number(question.points || 1) : 0,
      answeredAt: response.answeredAt || new Date().toISOString(),
    };
  });
  const percentage = assignment.totalPoints ? Math.round((objectiveScore / assignment.totalPoints) * 10000) / 100 : 0;
  return {
    ...attempt,
    responses,
    answered,
    objectiveScore,
    manualScore: attempt.manualScore || 0,
    totalScore: objectiveScore + Number(attempt.manualScore || 0),
    percentage,
    status: "CORRIGIDA",
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

const initDigitalStudentAssessments = () => {
  const root = document.querySelector("[data-digital-student-app]");
  if (!root) return;
  const list = root.querySelector("[data-digital-student-list]");
  const count = root.querySelector("[data-digital-student-count]");
  const stage = root.querySelector("[data-digital-attempt-stage]");
  let activeAssignmentId = null;
  let activeQuestionIndex = 0;

  const renderCards = () => {
    const { state, assignments } = getDigitalAssignmentForStudent();
    count.textContent = `${assignments.length} ${assignments.length === 1 ? "disponivel" : "disponiveis"}`;
    list.innerHTML = assignments.length
      ? assignments
          .map((assignment) => {
            const attempt = state.attempts.find((item) => item.assignmentId === assignment.id && item.studentId === digitalStudentProfile.id);
            const action = !attempt ? "Iniciar" : attempt.status === "EM_ANDAMENTO" ? "Continuar" : "Ver resultado";
            return `
              <article class="digital-assessment-card">
                <div><strong>${htmlEscape(assignment.title)}</strong><span>${htmlEscape(assignment.component)} · ${htmlEscape(assignment.teacher)} · ${assignment.questions.length} questoes</span></div>
                <small>${htmlEscape(assignment.className)} · prazo ${htmlEscape(new Date(assignment.dueAt).toLocaleString("pt-BR"))} · ${assignment.timeLimitMinutes} min · ${assignment.maxAttempts} tentativa</small>
                <mark>${digitalStatusLabel(assignment, attempt)}</mark>
                <button type="button" data-digital-open="${assignment.id}">${action}</button>
              </article>
            `;
          })
          .join("")
      : `<div class="qb-state">Nenhuma avaliacao digital disponivel para sua turma.</div>`;
  };

  const getOrCreateAttempt = (assignment) => {
    const state = readDigitalAssessmentState();
    let attempt = state.attempts.find((item) => item.assignmentId === assignment.id && item.studentId === digitalStudentProfile.id);
    if (!attempt) {
      attempt = {
        id: `attempt-${Date.now()}`,
        assignmentId: assignment.id,
        assessmentId: assignment.assessmentId,
        studentId: digitalStudentProfile.id,
        studentName: digitalStudentProfile.name,
        classId: digitalStudentProfile.classId,
        className: digitalStudentProfile.className,
        attemptNumber: 1,
        status: "EM_ANDAMENTO",
        startedAt: new Date().toISOString(),
        lastSavedAt: new Date().toISOString(),
        elapsedSeconds: 0,
        responses: {},
      };
      state.attempts.push(attempt);
      writeDigitalAssessmentState(state);
    }
    return attempt;
  };

  const renderAttempt = (assignment, attempt) => {
    const question = assignment.questions[activeQuestionIndex];
    if (!question) return;
    const response = attempt.responses[question.id] || {};
    const resultVisibility = digitalResultVisibility(assignment, attempt);
    const answeredCount = assignment.questions.filter((item) => Number.isInteger(Number(attempt.responses[item.id]?.selectedIndex))).length;
    stage.hidden = false;
    stage.innerHTML = `
      <div class="digital-attempt-head">
        <div><strong>${htmlEscape(assignment.title)}</strong><span>${activeQuestionIndex + 1}/${assignment.questions.length} · ${answeredCount} respondidas · ${assignment.timeLimitMinutes} min</span></div>
        <button type="button" data-digital-close>Fechar</button>
      </div>
      ${
        attempt.status === "CORRIGIDA" && resultVisibility !== "hidden"
          ? `<div class="digital-result-card"><strong>Resultado liberado</strong><span>Nota ${attempt.totalScore}/${assignment.totalPoints} · ${attempt.percentage}%</span><p>${attempt.answered} respostas registradas. Revise as habilidades indicadas pelo professor.</p></div>`
          : attempt.status === "CORRIGIDA"
            ? `<div class="digital-result-card"><strong>Avaliacao entregue</strong><span>Resultado aguardando liberacao do professor.</span></div>`
          : ""
      }
      <article class="digital-question-player">
        ${question.baseText ? `<blockquote>${htmlEscape(question.baseText)}</blockquote>` : ""}
        <h3>${htmlEscape(question.statement)}</h3>
        <div class="digital-options">
          ${question.alternatives
            .map(
              (alternative, index) => `
                <label>
                  <input type="radio" name="digital-answer" value="${index}" ${Number(response.selectedIndex) === index ? "checked" : ""} ${attempt.status !== "EM_ANDAMENTO" ? "disabled" : ""} />
                  <span><b>${String.fromCharCode(65 + index)}</b>${htmlEscape(alternative)}</span>
                </label>
              `
            )
            .join("")}
        </div>
        ${
          attempt.status === "CORRIGIDA" && resultVisibility === "commented"
            ? `<p class="digital-feedback"><strong>${response.isCorrect ? "Acerto" : "Erro"}</strong> · Habilidade ${htmlEscape(question.skill)} · ${htmlEscape(question.justification || "Resultado corrigido automaticamente.")}</p>`
            : attempt.status === "CORRIGIDA" && resultVisibility === "score_only"
              ? `<p class="digital-feedback"><strong>Nota registrada.</strong> O gabarito permanece oculto nesta configuracao.</p>`
            : ""
        }
      </article>
      <div class="digital-attempt-actions">
        <button type="button" data-digital-prev ${activeQuestionIndex === 0 ? "disabled" : ""}>Anterior</button>
        <button type="button" data-digital-next ${activeQuestionIndex === assignment.questions.length - 1 ? "disabled" : ""}>Proxima</button>
        <button type="button" data-digital-submit ${attempt.status !== "EM_ANDAMENTO" ? "disabled" : ""}>Entregar avaliacao</button>
      </div>
    `;
  };

  root.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const state = readDigitalAssessmentState();
    if (button.dataset.digitalOpen) {
      activeAssignmentId = button.dataset.digitalOpen;
      activeQuestionIndex = 0;
      const assignment = state.assignments.find((item) => item.id === activeAssignmentId);
      if (!assignment) return;
      const attempt = getOrCreateAttempt(assignment);
      renderAttempt(assignment, attempt);
      renderCards();
    }
    const assignment = state.assignments.find((item) => item.id === activeAssignmentId);
    const attemptIndex = state.attempts.findIndex((item) => item.assignmentId === activeAssignmentId && item.studentId === digitalStudentProfile.id);
    const attempt = state.attempts[attemptIndex];
    if (!assignment || !attempt) return;
    if (button.hasAttribute("data-digital-close")) stage.hidden = true;
    if (button.hasAttribute("data-digital-prev")) activeQuestionIndex = Math.max(0, activeQuestionIndex - 1);
    if (button.hasAttribute("data-digital-next")) activeQuestionIndex = Math.min(assignment.questions.length - 1, activeQuestionIndex + 1);
    if (button.hasAttribute("data-digital-submit") && window.confirm("Entregar avaliacao agora?")) {
      state.attempts[attemptIndex] = scoreDigitalAttempt(assignment, attempt);
      state.notifications.unshift({ id: `notification-${Date.now()}`, type: "avaliacao_entregue", message: `${digitalStudentProfile.name} entregou ${assignment.title}.`, createdAt: new Date().toISOString() });
      writeDigitalAssessmentState(state);
    }
    renderAttempt(assignment, readDigitalAssessmentState().attempts[attemptIndex]);
    renderCards();
  });

  root.addEventListener("change", (event) => {
    if (!event.target.matches("input[name='digital-answer']")) return;
    const state = readDigitalAssessmentState();
    const assignment = state.assignments.find((item) => item.id === activeAssignmentId);
    const attempt = state.attempts.find((item) => item.assignmentId === activeAssignmentId && item.studentId === digitalStudentProfile.id);
    const question = assignment?.questions[activeQuestionIndex];
    if (!assignment || !attempt || !question || attempt.status !== "EM_ANDAMENTO") return;
    attempt.responses[question.id] = { selectedIndex: Number(event.target.value), answeredAt: new Date().toISOString() };
    attempt.lastSavedAt = new Date().toISOString();
    writeDigitalAssessmentState(state);
    renderCards();
  });

  renderCards();
};

const initDigitalResultsPanel = () => {
  const root = document.querySelector("[data-digital-results]");
  if (!root) return;
  const grid = root.querySelector("[data-digital-results-grid]");
  const summary = root.querySelector("[data-digital-results-summary]");
  const detail = root.querySelector("[data-digital-results-detail]");
  const state = readDigitalAssessmentState();
  const assignments = state.assignments;
  const attempts = state.attempts;
  summary.textContent = `${assignments.length} aplicacoes · ${attempts.length} tentativas`;
  grid.innerHTML = assignments.length
    ? assignments
        .map((assignment) => {
          const related = attempts.filter((attempt) => attempt.assignmentId === assignment.id);
          const delivered = related.filter((attempt) => attempt.status === "CORRIGIDA" || attempt.status === "ENVIADA").length;
          const average = related.length ? Math.round(related.reduce((sum, attempt) => sum + Number(attempt.percentage || 0), 0) / related.length) : 0;
          return `<article><strong>${htmlEscape(assignment.title)}</strong><span>${htmlEscape(assignment.className)} · ${related.length} iniciadas · ${delivered} entregues</span><b>${average}%</b><button type="button" data-result-assignment="${assignment.id}">Ver respostas</button></article>`;
        })
        .join("")
    : `<div class="qb-state">Publique uma avaliacao no Banco de Questoes para acompanhar resultados aqui.</div>`;
  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-result-assignment]");
    if (!button) return;
    const assignment = assignments.find((item) => item.id === button.dataset.resultAssignment);
    const related = attempts.filter((attempt) => attempt.assignmentId === assignment.id);
    detail.innerHTML = `
      <h3>${htmlEscape(assignment.title)}</h3>
      <table>
        <tr><th>Aluno</th><th>Status</th><th>Acertos</th><th>Nota</th><th>%</th><th>Tempo</th></tr>
        ${related
          .map((attempt) => `<tr><td>${htmlEscape(attempt.studentName)}</td><td>${htmlEscape(attempt.status)}</td><td>${Object.values(attempt.responses || {}).filter((response) => response.isCorrect).length}</td><td>${attempt.totalScore || 0}/${assignment.totalPoints}</td><td>${attempt.percentage || 0}%</td><td>${Math.round((attempt.elapsedSeconds || 0) / 60)} min</td></tr>`)
          .join("")}
      </table>
      <div class="digital-skill-report">${assignment.questions.map((question) => `<span>${htmlEscape(question.skill)} · ${htmlEscape(question.descriptor || "Descritor")}</span>`).join("")}</div>
    `;
  });
};

const initQuestionBank = () => {
  const root = document.querySelector("[data-question-bank]");
  if (!root) {
    return;
  }

  const grid = root.querySelector("[data-qb-grid]");
  const detail = root.querySelector("[data-qb-detail]");
  const search = root.querySelector("[data-qb-search]");
  const filters = [...root.querySelectorAll("[data-qb-filter]")];
  const usedFilter = root.querySelector("[data-qb-used]");
  const sort = root.querySelector("[data-qb-sort]");
  const loading = root.querySelector("[data-qb-loading]");
  const errorNode = root.querySelector("[data-qb-error]");
  const empty = root.querySelector("[data-qb-empty]");
  const cartList = root.querySelector("[data-qb-cart-list]");
  const cartTime = root.querySelector("[data-qb-cart-time]");
  const saved = root.querySelector("[data-qb-saved]");
  const access = root.querySelector("[data-qb-access]");
  const selectionStatus = root.querySelector("[data-qb-selection-status]");
  const previewPanel = root.querySelector("[data-qb-preview-panel]");
  const titleInput = root.querySelector("[data-qb-assessment-title]");
  const builderFields = [...root.querySelectorAll(".qb-builder input, .qb-builder select, .qb-builder textarea")];
  let questions = [];
  let assessments = [];
  let selectedId = null;
  let activeAssessmentId = null;
  let cart = [];
  let cartPoints = {};
  let mode = questionBankDataService.mode();
  const cartStorageKey = "raizes:question-bank-cart";
  const draftStorageKey = "raizes:question-bank-draft";
  let didAttemptLoginResume = false;
  try {
    const savedDraft = JSON.parse(localStorage.getItem(draftStorageKey) || "null");
    cart = Array.isArray(savedDraft?.cart) ? savedDraft.cart : JSON.parse(localStorage.getItem(cartStorageKey) || "[]");
    cartPoints = savedDraft?.points || {};
  } catch (error) {
    cart = [];
    cartPoints = {};
  }

  const uniq = (key) => [...new Set(demoQuestionBankItems.map((item) => item[key]).filter(Boolean))].sort();
  const localDevNotice = () =>
    mode === "fallback"
      ? "Modo desenvolvimento: Supabase nao configurado; usando seed local somente como fallback."
      : (() => {
          const context = getSupabaseUserContext();
          if (context.userId && allowedAssessmentRoles.includes(context.role)) {
            return `Professor autenticado no Supabase Auth. Perfil: ${context.role}.`;
          }
          if (context.userId) {
            return `Sessao Supabase ativa, mas perfil ${context.role || "sem perfil"} nao pode salvar avaliacoes.`;
          }
          return "Modo demonstracao: leitura conectada ao Supabase real, mas salvamento exige login do professor.";
        })();

  const populateFilterOptions = () => {
    filters.forEach((select) => {
      const key = select.dataset.qbFilter;
      const current = select.value;
      select.querySelectorAll("option:not(:first-child)").forEach((option) => option.remove());
      [...new Set(questions.map((item) => item[key]).filter(Boolean))]
        .sort()
        .forEach((value) => {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = value;
          select.append(option);
        });
      const pendingValue = select.dataset.pendingValue;
      const nextValue = pendingValue || current;
      select.value = [...select.options].some((option) => option.value === nextValue) ? nextValue : "";
      delete select.dataset.pendingValue;
    });
  };

  const itemById = (id) => questions.find((item) => item.id === id || item.uuid === id);
  const shortText = (value, limit = 150) => {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > limit ? `${text.slice(0, limit - 1)}...` : text;
  };
  const isSelected = (id) => cart.includes(id);
  const optionLabel = (index) => String.fromCharCode(65 + index);
  const setSelectionStatus = (message, tone = "info") => {
    if (!selectionStatus) return;
    selectionStatus.textContent = message || "";
    selectionStatus.dataset.tone = tone;
    selectionStatus.hidden = !message;
  };
  const getBuilderDraft = () => ({
    title: titleInput?.value || "",
    instructions: root.querySelector(".qb-builder textarea")?.value || "",
    date: root.querySelector(".qb-builder input[type='date']")?.value || "",
    className: root.querySelectorAll(".qb-builder select")[0]?.value || "",
    cover: root.querySelectorAll(".qb-builder select")[3]?.value || "",
    component: root.querySelector("[data-qb-assessment-component]")?.value || "",
    year: root.querySelector("[data-qb-assessment-year]")?.value || "",
  });
  const getFilterDraft = () => ({
    search: search.value,
    used: usedFilter.value,
    sort: sort.value,
    filters: Object.fromEntries(filters.map((select) => [select.dataset.qbFilter, select.value])),
  });
  const syncPointInputs = () => {
    cartList?.querySelectorAll("[data-qb-points]").forEach((input) => {
      cartPoints[input.dataset.qbPoints] = Number(input.value || 1);
    });
  };
  const saveDraftSnapshot = (reason = "autosave") => {
    syncPointInputs();
    localStorage.setItem(
      draftStorageKey,
      JSON.stringify({
        reason,
        cart,
        points: cartPoints,
        selectedId,
        activeAssessmentId,
        builder: getBuilderDraft(),
        filters: getFilterDraft(),
        savedAt: new Date().toISOString(),
      })
    );
    localStorage.setItem(cartStorageKey, JSON.stringify(cart));
  };
  const restoreDraftSnapshot = () => {
    let draft = null;
    try {
      draft = JSON.parse(localStorage.getItem(draftStorageKey) || "null");
    } catch (error) {
      draft = null;
    }
    if (!draft) return false;
    cart = Array.isArray(draft.cart) ? draft.cart : cart;
    cartPoints = draft.points || {};
    selectedId = draft.selectedId || selectedId;
    activeAssessmentId = draft.activeAssessmentId || activeAssessmentId;
    if (draft.builder) {
      if (titleInput) titleInput.value = draft.builder.title || titleInput.value;
      const textarea = root.querySelector(".qb-builder textarea");
      if (textarea) textarea.value = draft.builder.instructions || textarea.value;
      const dateInput = root.querySelector(".qb-builder input[type='date']");
      if (dateInput) dateInput.value = draft.builder.date || dateInput.value;
      const classSelect = root.querySelectorAll(".qb-builder select")[0];
      if (classSelect && draft.builder.className) classSelect.value = draft.builder.className;
      const coverSelect = root.querySelectorAll(".qb-builder select")[3];
      if (coverSelect && draft.builder.cover) coverSelect.value = draft.builder.cover;
      const componentSelect = root.querySelector("[data-qb-assessment-component]");
      if (componentSelect && draft.builder.component) componentSelect.value = draft.builder.component;
      const yearSelect = root.querySelector("[data-qb-assessment-year]");
      if (yearSelect && draft.builder.year) yearSelect.value = draft.builder.year;
    }
    if (draft.filters) {
      search.value = draft.filters.search || "";
      usedFilter.value = draft.filters.used || "";
      sort.value = draft.filters.sort || sort.value;
      filters.forEach((select) => {
        select.dataset.pendingValue = draft.filters.filters?.[select.dataset.qbFilter] || "";
      });
    }
    return true;
  };
  const showSessionRequired = (message = "Entre novamente para salvar a avaliacao no Supabase.") => {
    if (!selectionStatus) return;
    saveDraftSnapshot("login-required");
    const nextPath = `${window.location.pathname || "/banco-questoes.html"}?qbResume=1${window.location.hash || ""}`;
    const next = encodeURIComponent(nextPath);
    selectionStatus.innerHTML = `${htmlEscape(message)} <a href="login.html?auth=supabase&next=${next}">Entrar novamente</a> <a href="login.html?auth=supabase&demo=1&next=${next}">Entrar em modo demonstracao</a>`;
    selectionStatus.dataset.tone = "error";
    selectionStatus.hidden = false;
  };
  const installSupabaseSessionListener = () => {
    if (mode !== "supabase") return;
    const refreshIfNeeded = () => {
      const session = getStoredSupabaseSession();
      if (session && isStoredSessionExpired(session, 180)) {
        refreshStoredSupabaseSession().catch(() => {});
      }
    };
    window.addEventListener("storage", (event) => {
      if (event.key === supabaseSessionStorageKey) {
        refresh().catch(() => {});
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) refreshIfNeeded();
    });
    window.setInterval(refreshIfNeeded, 4 * 60 * 1000);
    refreshIfNeeded();
  };

  const matchesSearch = (item) => {
    const term = search.value.trim().toLowerCase();
    if (!term) {
      return true;
    }
    return [
      item.id,
      item.title,
      item.component,
      item.skill,
      item.descriptor,
      item.statement,
      item.baseText,
      item.legalClassification,
    ]
      .join(" ")
      .toLowerCase()
      .includes(term);
  };

  const getFilteredItems = () => {
    const filterValues = Object.fromEntries(filters.map((select) => [select.dataset.qbFilter, select.value]));
    const usedValue = usedFilter.value;
    const items = questions.filter((item) => {
      const fieldMatches = Object.entries(filterValues).every(([key, value]) => !value || item[key] === value);
      const useMatches = !usedValue || (usedValue === "used" ? item.usedCount > 0 : item.usedCount === 0);
      return fieldMatches && useMatches && matchesSearch(item);
    });
    return items.sort((a, b) => {
      if (sort.value === "difficulty") {
        return a.difficulty.localeCompare(b.difficulty);
      }
      if (sort.value === "skill") {
        return a.skill.localeCompare(b.skill) || a.id.localeCompare(b.id);
      }
      if (sort.value === "year") {
        return a.year.localeCompare(b.year) || a.id.localeCompare(b.id);
      }
      if (sort.value === "code") {
        return a.id.localeCompare(b.id);
      }
      if (sort.value === "time") {
        return a.estimatedTime - b.estimatedTime;
      }
      return b.reviewedAt.localeCompare(a.reviewedAt);
    });
  };

  const renderMetrics = (items) => {
    root.querySelector("[data-qb-total]").textContent = questions.length;
    root.querySelector("[data-qb-published]").textContent = questions.filter((item) => item.publicationStatus === "PUBLICADO").length;
    root.querySelector("[data-qb-review]").textContent = questions.filter((item) => !["HOMOLOGADO", "APROVADO"].includes(item.curationStatus)).length;
    root.querySelectorAll("[data-qb-cart-count]").forEach((node) => {
      node.textContent = cart.length;
    });
    root.querySelector("[data-qb-result-count]").textContent = `${items.length} ${items.length === 1 ? "item" : "itens"}`;
  };

  const renderQuestionMiniature = (item, { showAnswer = false } = {}) => `
    <div class="qb-miniature" aria-label="Miniatura pedagogica da questao ${htmlEscape(item.id)}">
      <div class="qb-mini-head"><strong>${htmlEscape(item.id)}</strong><span>${htmlEscape(item.resource || "Texto")}</span></div>
      ${item.baseText ? `<blockquote>${htmlEscape(shortText(item.baseText, 130))}</blockquote>` : ""}
      <p>${htmlEscape(shortText(item.statement, 170))}</p>
      <ol>
        ${item.alternatives
          .slice(0, 4)
          .map(
            (alternative, index) =>
              `<li class="${showAnswer && index === item.correctAlternative ? "is-correct" : ""}"><b>${optionLabel(index)}</b><span>${htmlEscape(shortText(alternative, 80))}</span></li>`
          )
          .join("")}
      </ol>
    </div>
  `;

  const renderCard = (item) => `
    <article class="qb-card ${item.id === selectedId ? "is-focused" : ""} ${isSelected(item.id) ? "is-selected" : ""}" data-qb-card="${htmlEscape(item.id)}">
      <div class="qb-card-top">
        <span>${htmlEscape(item.id)}</span>
        <mark>${item.publicationStatus === "PUBLICADO" ? "Publicada" : htmlEscape(item.publicationStatus)}</mark>
      </div>
      <h3>${htmlEscape(shortText(item.statement || item.title, 110))}</h3>
      <p>${htmlEscape(item.component)} &middot; ${htmlEscape(item.year)} &middot; ${htmlEscape(item.skill)}</p>
      <p class="qb-card-descriptor">${htmlEscape(shortText(item.descriptor || item.object || item.unit, 130))}</p>
      ${renderQuestionMiniature(item)}
      <div class="qb-tags"><span>${htmlEscape(item.type)}</span><span>${htmlEscape(item.difficulty)}</span><span>${htmlEscape(item.proficiency)}</span><span>${item.estimatedTime} min</span><span>${htmlEscape(item.resource)}</span></div>
      <div class="qb-card-actions">
        <button type="button" data-qb-view="${item.id}" aria-label="Ver questao ${htmlEscape(item.id)}">Ver questao</button>
        <button type="button" data-qb-add="${item.id}" class="${isSelected(item.id) ? "is-selected" : ""}" aria-pressed="${isSelected(item.id)}" ${item.publicationStatus !== "PUBLICADO" || isSelected(item.id) ? "disabled" : ""}>${isSelected(item.id) ? "Selecionada" : "Selecionar"}</button>
      </div>
    </article>
  `;

  const renderDetail = async () => {
    const item = itemById(selectedId) || questions[0];
    if (!item) {
      detail.innerHTML = `<div class="qb-state">Selecione uma questao para ver os detalhes.</div>`;
      return;
    }
    let history = [];
    try {
      history = await questionBankDataService.getCurationHistory(item.uuid || item.id);
    } catch (error) {
      history = [];
    }
    detail.innerHTML = `
      <div class="panel-head">
        <h2>Visualizacao da questao</h2>
        <button type="button" data-qb-add="${item.id}" class="${isSelected(item.id) ? "is-selected" : ""}" aria-pressed="${isSelected(item.id)}" ${item.publicationStatus !== "PUBLICADO" || isSelected(item.id) ? "disabled" : ""}>${isSelected(item.id) ? "Selecionada" : "Selecionar esta questao"}</button>
      </div>
      <div class="qb-proof-page">
        <div class="qb-proof-header">
          <strong>${htmlEscape(item.id)}</strong>
          <span>${htmlEscape(item.component)} &middot; ${htmlEscape(item.year)} &middot; ${item.estimatedTime} min</span>
        </div>
        ${item.baseText ? `<blockquote>${htmlEscape(item.baseText)}</blockquote>` : ""}
        <h3>${htmlEscape(item.statement)}</h3>
        <ol class="qb-alternatives">
          ${item.alternatives.map((alternative, index) => `<li class="${index === item.correctAlternative ? "is-correct" : ""}"><b>${optionLabel(index)}</b> ${htmlEscape(alternative)}${index === item.correctAlternative ? " <em>Gabarito</em>" : ""}</li>`).join("")}
        </ol>
      </div>
      <div class="qb-detail-grid">
        <div class="qb-detail-meta">
          <span><b>BNCC</b>${htmlEscape(item.skill)}</span>
          <span><b>Matriz ou descritor</b>${htmlEscape(item.descriptor)}</span>
          <span><b>Objeto</b>${htmlEscape(item.object)}</span>
          <span><b>Dificuldade</b>${htmlEscape(item.difficulty)}</span>
          <span><b>Tempo estimado</b>${item.estimatedTime} min</span>
          <span><b>Fonte e licenca</b>${htmlEscape(`${item.sourceName}. ${item.license}. ${item.legalStatus || ""}`)}</span>
        </div>
        <div class="qb-trace">
          <article><strong>Justificativa pedagogica</strong><p>${htmlEscape(item.justification)}</p></article>
          <article><strong>Analise dos distratores</strong><p>${htmlEscape(item.distractors.join(" "))}</p></article>
          <article><strong>Intervencao</strong><p>${htmlEscape(item.intervention)}</p></article>
          <article><strong>Historico</strong><p>Versao ${htmlEscape(item.version)}. Revisado por ${htmlEscape(item.reviewer)} em ${htmlEscape(item.reviewedAt)}. ${htmlEscape(history[0]?.comment || "Historico de curadoria disponivel apos carga remota.")}</p></article>
        </div>
      </div>
    `;
    if (mode === "supabase" && item.uuid) {
      questionBankDataService.registerUsage(item.uuid, null, "visualizada").catch(() => {});
    }
  };

  const saveOrder = async () => {
    if (!activeAssessmentId) return;
    try {
      await questionBankDataService.reorderQuestions(
        activeAssessmentId,
        cart.map((id) => itemById(id)?.uuid || id)
      );
    } catch (error) {
      if (String(error.message || "").includes("Sessao Supabase ausente") || String(error.message || "").includes("Sessao expirada")) {
        showSessionRequired("Ordem preservada localmente. Entre novamente para sincronizar no Supabase.");
        return;
      }
      throw error;
    }
  };

  const moveCartItem = async (id, direction) => {
    const index = cart.indexOf(id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= cart.length) {
      return;
    }
    [cart[index], cart[nextIndex]] = [cart[nextIndex], cart[index]];
    await saveOrder();
  };

  const renderCart = () => {
    const items = cart.map(itemById).filter(Boolean);
    localStorage.setItem(cartStorageKey, JSON.stringify(items.map((item) => item.id)));
    cartList.innerHTML = items.length
      ? items
          .map(
            (item, index) => `
              <article class="qb-cart-item">
                <span>${index + 1}</span>
                <div>
                  <strong>${htmlEscape(item.id)}</strong>
                  <p>${htmlEscape(shortText(item.statement, 92))}</p>
                  <small>${htmlEscape(item.component)} &middot; ${htmlEscape(item.skill)} &middot; ${item.estimatedTime} min</small>
                  <div class="qb-cart-mini">${item.alternatives.slice(0, 4).map((alternative, optionIndex) => `<i>${optionLabel(optionIndex)} ${htmlEscape(shortText(alternative, 34))}</i>`).join("")}</div>
                </div>
                <input type="number" min="0" step="0.5" value="${cartPoints[item.id] ?? 1}" data-qb-points="${item.id}" aria-label="Pontuacao da questao ${item.id}" />
                <button type="button" data-qb-view="${item.id}" aria-label="Ver ${item.id}">Ver</button>
                <button type="button" data-qb-up="${item.id}" aria-label="Mover ${item.id} para cima">^</button>
                <button type="button" data-qb-down="${item.id}" aria-label="Mover ${item.id} para baixo">v</button>
                <button type="button" data-qb-remove="${item.id}" aria-label="Remover ${item.id}">Remover</button>
              </article>
            `
          )
          .join("")
      : `<div class="qb-state">Selecione questoes publicadas para montar uma avaliacao.</div>`;
    cartTime.textContent = `${items.reduce((sum, item) => sum + item.estimatedTime, 0)} min`;
    root.querySelectorAll("[data-qb-cart-count]").forEach((node) => {
      node.textContent = cart.length;
    });
  };

  const renderPreview = (kind = "student", options = {}) => {
    const items = cart.map(itemById).filter(Boolean);
    if (!previewPanel || !items.length) {
      if (previewPanel) previewPanel.hidden = true;
      return;
    }
    const isTeacher = kind === "teacher";
    const isAnswerSheet = kind === "answers";
    const isLocalPreview = options.local === true;
    const totalTime = items.reduce((sum, item) => sum + item.estimatedTime, 0);
    const totalPoints = items.reduce((sum, item) => sum + Number(cartPoints[item.id] ?? 1), 0);
    const assessmentTitle = titleInput?.value || "Avaliacao";
    const component = root.querySelector("[data-qb-assessment-component]")?.value || "";
    const year = root.querySelector("[data-qb-assessment-year]")?.value || "";
    const className = root.querySelectorAll(".qb-builder select")[0]?.value || "";
    const applicationDate = root.querySelector(".qb-builder input[type='date']")?.value || "";
    const versionCode = activeAssessmentId ? String(activeAssessmentId).slice(0, 8) : `LOCAL-${Date.now().toString().slice(-6)}`;
    if (previewPanel.parentElement !== document.body) {
      document.body.append(previewPanel);
    }
    previewPanel.hidden = false;
    previewPanel.innerHTML = `
      <div class="panel-head">
        <h2>${isLocalPreview ? "Previa rapida - nao salva" : isTeacher ? "Gabarito do professor" : isAnswerSheet ? "Folha de respostas" : "Previa da avaliacao"}</h2>
        ${
          isLocalPreview
            ? ""
            : `<button type="button" data-qb-print="${isTeacher ? "teacher" : isAnswerSheet ? "answers" : "student"}">${isTeacher ? "Gerar PDF do gabarito" : isAnswerSheet ? "Gerar folha de respostas" : "Gerar PDF do aluno"}</button>
               ${isTeacher ? `<button type="button" data-qb-print="answers">Gerar folha de respostas</button>` : ""}`
        }
        <button type="button" data-qb-close-preview>Fechar</button>
      </div>
      <div class="qb-preview-sheet" data-qb-print-area="${isTeacher ? "teacher" : isAnswerSheet ? "answers" : "student"}">
        ${isLocalPreview ? `<div class="qb-local-preview-warning">Esta e uma previa local. Entre para salvar, gerar PDF e acessar o gabarito oficial.</div>` : ""}
        <header class="qb-preview-cover">
          <strong>${isTeacher ? "GABARITO DO PROFESSOR" : isAnswerSheet ? "FOLHA DE RESPOSTAS" : "CADERNO DO ALUNO"}</strong>
          <span>RAIZES E SABERES EDUCACIONAL</span>
          <small>${isTeacher ? "AVALIA+ - GABARITO E ORIENTACOES DE CORRECAO" : isAnswerSheet ? "AVALIA+ - REGISTRO DE RESPOSTAS" : "AVALIA+ - AVALIACAO DA APRENDIZAGEM"}</small>
        </header>
        ${
          isTeacher
            ? `<div class="qb-preview-meta">
                <span><b>AVALIACAO:</b> ${htmlEscape(assessmentTitle)}</span>
                <span><b>COMPONENTE:</b> ${htmlEscape(component)}</span>
                <span><b>ANO/TURMA:</b> ${htmlEscape(`${year} ${className}`.trim())}</span>
                <span><b>PROFESSOR(A):</b> Prof. Marcos Silva</span>
                <span><b>DATA DE APLICACAO:</b> ${htmlEscape(applicationDate || "____/____/______")}</span>
                <span><b>TOTAL DE QUESTOES:</b> ${items.length}</span>
                <span><b>VALOR TOTAL:</b> ${totalPoints}</span>
                <span><b>CODIGO DA AVALIACAO:</b> ${htmlEscape(activeAssessmentId || "Aguardando salvamento")}</span>
                <span><b>VERSAO:</b> ${htmlEscape(versionCode)}</span>
                <span><b>USO DO PROFESSOR</b></span>
              </div>
              <table class="qb-answer-summary">
                <thead><tr><th>Questao</th><th>Resposta</th><th>Valor</th><th>Habilidade</th><th>Descritor</th></tr></thead>
                <tbody>${items
                  .map((item, index) => `<tr><td>${index + 1}</td><td>${optionLabel(item.correctAlternative)}</td><td>${htmlEscape(cartPoints[item.id] ?? 1)}</td><td>${htmlEscape(item.skill)}</td><td>${htmlEscape(shortText(item.descriptor, 80))}</td></tr>`)
                  .join("")}</tbody>
              </table>`
            : `<div class="qb-preview-meta">
                <span><b>ESCOLA:</b> ________________________________________________</span>
                <span><b>ESTUDANTE:</b> _____________________________________________</span>
                <span><b>TURMA:</b> ${htmlEscape(className)}</span>
                <span><b>TURNO:</b> __________________</span>
                <span><b>PROFESSOR(A):</b> Prof. Marcos Silva</span>
                <span><b>COMPONENTE CURRICULAR:</b> ${htmlEscape(component)}</span>
                <span><b>ANO:</b> ${htmlEscape(year)}</span>
                <span><b>DATA:</b> ${htmlEscape(applicationDate || "____/____/______")}</span>
                <span><b>AVALIACAO:</b> ${htmlEscape(assessmentTitle)}</span>
                <span><b>VALOR:</b> ${totalPoints}</span>
                <span><b>NOTA:</b> __________________</span>
              </div>`
        }
        ${
          isAnswerSheet
            ? `<table class="qb-answer-sheet"><tbody>${items
                .map(
                  (item, index) =>
                    `<tr><td>${index + 1}</td><td>A ( )</td><td>B ( )</td><td>C ( )</td><td>D ( )</td><td>Valor ${htmlEscape(cartPoints[item.id] ?? 1)}</td></tr>`
                )
                .join("")}</tbody></table>`
            : ""
        }
        <p>${htmlEscape(root.querySelector(".qb-builder textarea")?.value || "Leia com atencao e marque apenas uma alternativa por questao.")}</p>
        ${isAnswerSheet ? "" : items
          .map(
            (item, index) => `
              <article>
                <h3>${index + 1}. ${htmlEscape(item.statement)}</h3>
                ${item.baseText ? `<blockquote>${htmlEscape(item.baseText)}</blockquote>` : ""}
                <ol class="qb-alternatives">
                  ${item.alternatives
                    .map((alternative, optionIndex) => `<li class="${isTeacher && optionIndex === item.correctAlternative ? "is-correct" : ""}"><b>${optionLabel(optionIndex)}</b> ${htmlEscape(alternative)}</li>`)
                    .join("")}
                </ol>
                ${
                  isTeacher
                    ? `<p><strong>Gabarito:</strong> ${optionLabel(item.correctAlternative)} &middot; ${htmlEscape(item.justification)}<br><strong>Habilidade:</strong> ${htmlEscape(item.skill)}<br><strong>Descritor:</strong> ${htmlEscape(item.descriptor)}<br><strong>Distratores:</strong> ${htmlEscape(item.distractors.join(" "))}<br><strong>Orientacao de correcao:</strong> ${htmlEscape(item.intervention || "Retomar a habilidade indicada com atividade de recomposicao.")}</p>`
                    : `<p>${item.estimatedTime} min &middot; ${htmlEscape(item.component)} &middot; ${htmlEscape(item.skill)} &middot; Valor ${htmlEscape(cartPoints[item.id] ?? 1)}</p>`
                }
                <footer>Pagina simulada ${index + 1} de ${items.length} &middot; Versao ${htmlEscape(versionCode)}</footer>
              </article>
            `
          )
          .join("")}
        <footer class="qb-preview-footer">RAIZES E SABERES EDUCACIONAL &middot; ${items.length} questoes &middot; ${totalTime} min &middot; Versao ${htmlEscape(versionCode)}</footer>
      </div>
    `;
    previewPanel.setAttribute("tabindex", "-1");
    window.setTimeout(() => {
      previewPanel.focus({ preventScroll: true });
      previewPanel.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 0);
  };

  const renderSaved = () => {
    saved.innerHTML = assessments.length
      ? assessments
          .map((assessment) => `<article><strong>${htmlEscape(assessment.title)}</strong><span>${htmlEscape(assessment.status)} &middot; ${assessment.items} itens &middot; ${htmlEscape(assessment.className)} &middot; ${htmlEscape(assessment.date)}</span><button type="button" data-qb-open-assessment="${assessment.id}">Abrir</button><button type="button" data-qb-duplicate-assessment="${assessment.id}">Duplicar</button><button type="button" data-qb-archive-assessment="${assessment.id}">Arquivar</button></article>`)
          .join("")
      : `<div class="qb-state">Nenhuma avaliacao salva encontrada.</div>`;
  };

  const renderAccess = () => {
    access.innerHTML = questionAccessRules.map(([role, rule]) => `<article><strong>${role}</strong><span>${rule}</span></article>`).join("");
  };

  const render = async () => {
    const items = getFilteredItems();
    loading.hidden = true;
    errorNode.hidden = true;
    grid.innerHTML = items.map(renderCard).join("");
    empty.hidden = items.length > 0;
    renderMetrics(items);
    await renderDetail();
    renderCart();
    renderSaved();
    renderAccess();
  };

  const setError = (message) => {
    loading.hidden = true;
    errorNode.hidden = false;
    errorNode.textContent = message;
  };

  const assessmentPayloadFromBuilder = () => ({
    title: titleInput?.value?.trim() || "Avaliacao sem titulo",
    description: root.querySelector(".qb-builder textarea")?.value || "",
    instructions: root.querySelector(".qb-builder textarea")?.value || "",
    component: root.querySelector("[data-qb-assessment-component]")?.value || "",
    school_year: root.querySelector("[data-qb-assessment-year]")?.value || "",
    class_name: root.querySelectorAll(".qb-builder select")[0]?.value || "",
    cover_template: root.querySelectorAll(".qb-builder select")[3]?.value || "Raizes e Saberes - padrao",
    application_date: root.querySelector(".qb-builder input[type='date']")?.value || null,
  });

  const ensureAssessment = async () => {
    if (activeAssessmentId) {
      return questionBankDataService.updateAssessment(activeAssessmentId, assessmentPayloadFromBuilder());
    }
    const assessment = await questionBankDataService.createAssessment(assessmentPayloadFromBuilder());
    activeAssessmentId = assessment.id;
    return assessment;
  };

  const syncCartToAssessment = async () => {
    if (!cart.length) return null;
    syncPointInputs();
    const assessment = await ensureAssessment();
    const remote = await questionBankDataService.getAssessmentById(assessment.id);
    const remoteIds = new Set(
      (remote?.questions || []).map((entry) => entry.question?.code || entry.question_id).filter(Boolean)
    );
    for (const id of cart) {
      const item = itemById(id);
      if (!item) continue;
      if (!remoteIds.has(item.id) && !remoteIds.has(item.uuid)) {
        await questionBankDataService.addQuestionToAssessment(assessment.id, item.uuid || item.id, Number(cartPoints[item.id] ?? 1));
      } else {
        await questionBankDataService.updateQuestionPoints(assessment.id, item.uuid || item.id, Number(cartPoints[item.id] ?? 1));
      }
    }
    await questionBankDataService.reorderQuestions(
      assessment.id,
      cart.map((id) => itemById(id)?.uuid || id)
    );
    return questionBankDataService.getAssessmentById(assessment.id);
  };

  const ensureSavedForPreview = async () => {
    if (!cart.length) {
      setSelectionStatus("Selecione questoes antes de salvar ou pre-visualizar.", "error");
      return null;
    }
    if (mode !== "supabase") {
      return null;
    }
    try {
      return await syncCartToAssessment();
    } catch (error) {
      const message = String(error.message || "");
      if (message.includes("Sessao Supabase ausente") || message.includes("Sessao expirada") || message.includes("row-level security")) {
        showSessionRequired("Selecao preservada. Entre novamente para salvar e liberar a pre-visualizacao oficial.");
        return null;
      }
      throw error;
    }
  };

  const printPreview = (kind) => {
    const items = cart.map(itemById).filter(Boolean);
    if (!items.length) {
      setSelectionStatus("Selecione questoes antes de gerar PDF.", "error");
      return;
    }
    renderPreview(kind);
    window.setTimeout(() => window.print(), 80);
  };

  previewPanel?.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.hasAttribute("data-qb-close-preview")) {
      previewPanel.hidden = true;
    }
    if (button.dataset.qbPrint) {
      printPreview(button.dataset.qbPrint);
    }
  });

  const publishCurrentAssessmentDigitally = async () => {
    syncPointInputs();
    const items = cart.map(itemById).filter(Boolean);
    if (!items.length) {
      setSelectionStatus("Selecione questoes antes de aplicar digitalmente.", "error");
      return null;
    }
    let savedAssessment = null;
    if (mode === "supabase") {
      try {
        savedAssessment = await syncCartToAssessment();
      } catch (error) {
        const message = String(error.message || "");
        if (message.includes("Sessao Supabase ausente") || message.includes("Sessao expirada") || message.includes("row-level security")) {
          showSessionRequired("Selecao preservada. Entre novamente para salvar antes da aplicacao digital oficial.");
          return null;
        }
        throw error;
      }
    }
    const shuffle = root.querySelector("[data-qb-shuffle]")?.value || "none";
    const assignment = publishDigitalAssessmentDemo({
      assessmentId: savedAssessment?.id || activeAssessmentId,
      title: titleInput?.value?.trim() || "Avaliacao digital",
      component: root.querySelector("[data-qb-assessment-component]")?.value || "",
      year: root.querySelector("[data-qb-assessment-year]")?.value || "",
      className: root.querySelectorAll(".qb-builder select")[0]?.value || "2o Ano A",
      availableFrom: root.querySelector("[data-qb-available-from]")?.value ? new Date(root.querySelector("[data-qb-available-from]").value).toISOString() : new Date().toISOString(),
      dueAt: root.querySelector("[data-qb-due-at]")?.value ? new Date(root.querySelector("[data-qb-due-at]").value).toISOString() : new Date(Date.now() + 7 * 86400000).toISOString(),
      timeLimitMinutes: root.querySelector("[data-qb-time-limit]")?.value || 50,
      maxAttempts: root.querySelector("[data-qb-max-attempts]")?.value || 1,
      resultReleaseMode: root.querySelector("[data-qb-result-mode]")?.value || "immediate",
      shuffleQuestions: shuffle === "questions" || shuffle === "all",
      shuffleAlternatives: shuffle === "all",
      questions: items.map((item) => ({
        id: item.id,
        uuid: item.uuid,
        statement: item.statement,
        baseText: item.baseText,
        alternatives: item.alternatives,
        correctAlternative: item.correctAlternative,
        points: Number(cartPoints[item.id] ?? 1),
        skill: item.skill,
        descriptor: item.descriptor,
        component: item.component,
        justification: item.justification,
        intervention: item.intervention,
      })),
    });
    setSelectionStatus(`Avaliacao publicada para ${assignment.className}. Aluno ja pode responder em Minhas Avaliacoes.`, "success");
    return assignment;
  };

  const selectQuestion = (id) => {
    const item = itemById(id);
    if (!item) return;
    selectedId = item.id;
    if (item.publicationStatus !== "PUBLICADO") {
      setSelectionStatus(`${item.id} indisponivel para selecao.`, "error");
      return;
    }
    if (cart.includes(item.id)) {
      setSelectionStatus(`${item.id} ja esta selecionada.`, "info");
      return;
    }
    cart.push(item.id);
    cartPoints[item.id] = cartPoints[item.id] ?? 1;
    saveDraftSnapshot("question-selected");
    setSelectionStatus(`${item.id} selecionada para a avaliacao.`, "success");
  };

  const refresh = async () => {
    loading.hidden = false;
    errorNode.hidden = true;
    mode = questionBankDataService.mode();
    try {
      questions = await questionBankDataService.listQuestions();
      assessments = await questionBankDataService.listAssessments();
      selectedId = selectedId || questions[0]?.id;
      cart = activeAssessmentId
        ? (await questionBankDataService.getAssessmentById(activeAssessmentId))?.questions?.map((entry) => entry.question?.code || entry.question_id) || cart
        : cart.filter((id) => itemById(id));
      populateFilterOptions();
      root.querySelector(".qb-notice span").textContent = localDevNotice();
      await render();
      await attemptLoginResume();
    } catch (error) {
      questions = mode === "fallback" ? await questionBankDataService.listQuestions() : [];
      assessments = [];
      populateFilterOptions();
      await render();
      setError(error.message);
    }
  };

  const attemptLoginResume = async () => {
    const params = new URLSearchParams(window.location.search);
    if (didAttemptLoginResume || params.get("qbResume") !== "1") return;
    didAttemptLoginResume = true;
    restoreDraftSnapshot();
    cart = cart.filter((id) => itemById(id));
    await render();
    try {
      const savedAssessment = await ensureSavedForPreview();
      if (savedAssessment) {
        assessments = await questionBankDataService.listAssessments();
        activeAssessmentId = savedAssessment.id;
        saveDraftSnapshot("login-resumed-saved");
        renderPreview("student");
        setSelectionStatus(`Avaliacao salva e pre-visualizacao oficial liberada. ID ${savedAssessment.id}.`, "success");
        params.delete("qbResume");
        const nextSearch = params.toString();
        window.history.replaceState(null, "", `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`);
        await render();
      }
    } catch (error) {
      showSessionRequired("Login concluido, mas a sessao ainda nao autorizou o salvamento. Entre novamente com perfil professor.");
    }
  };

  root.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) {
      return;
    }
    try {
      if (button.dataset.qbView) {
        selectedId = button.dataset.qbView;
      }
      if (button.dataset.qbAdd) {
        button.textContent = "Selecionando";
        selectQuestion(button.dataset.qbAdd);
      }
      if (button.dataset.qbRemove) {
        const item = itemById(button.dataset.qbRemove);
        let needsRemoteSync = false;
        cart = cart.filter((id) => id !== button.dataset.qbRemove);
        delete cartPoints[button.dataset.qbRemove];
        saveDraftSnapshot("question-removed");
        if (activeAssessmentId && item) {
          try {
            await questionBankDataService.removeQuestionFromAssessment(activeAssessmentId, item.uuid || item.id);
          } catch (error) {
            const message = String(error.message || "");
            if (message.includes("Sessao Supabase ausente") || message.includes("Sessao expirada")) {
              showSessionRequired("Questao removida localmente. Entre novamente para sincronizar no Supabase.");
              needsRemoteSync = true;
            } else {
              throw error;
            }
          }
        }
        if (!needsRemoteSync) {
          setSelectionStatus(`${button.dataset.qbRemove} removida da avaliacao.`, "info");
        }
      }
      if (button.dataset.qbUp) {
        await moveCartItem(button.dataset.qbUp, -1);
        saveDraftSnapshot("question-reordered");
      }
      if (button.dataset.qbDown) {
        await moveCartItem(button.dataset.qbDown, 1);
        saveDraftSnapshot("question-reordered");
      }
      if (button.hasAttribute("data-qb-clear")) {
        search.value = "";
        filters.forEach((select) => {
          select.value = "";
        });
        usedFilter.value = "";
      }
      if (button.hasAttribute("data-qb-clear-cart")) {
        cart = [];
        cartPoints = {};
        activeAssessmentId = null;
        saveDraftSnapshot("cart-cleared");
        previewPanel.hidden = true;
        setSelectionStatus("Carrinho limpo.", "info");
      }
      if (button.hasAttribute("data-qb-save-draft")) {
        const savedAssessment = await ensureSavedForPreview();
        if (savedAssessment) {
          assessments = await questionBankDataService.listAssessments();
          setSelectionStatus("Rascunho salvo com as questoes selecionadas.", "success");
        }
      }
      if (button.dataset.qbPreview) {
        const savedAssessment = await ensureSavedForPreview();
        if (savedAssessment || mode !== "supabase") {
          renderPreview(button.dataset.qbPreview);
        }
      }
      if (button.hasAttribute("data-qb-preview-local")) {
        saveDraftSnapshot("local-preview");
        renderPreview("student", { local: true });
        setSelectionStatus("Previa local aberta sem salvar no Supabase.", "info");
      }
      if (button.hasAttribute("data-qb-close-preview")) {
        previewPanel.hidden = true;
      }
      if (button.dataset.qbPrint) {
        printPreview(button.dataset.qbPrint);
      }
      if (button.hasAttribute("data-qb-generate")) {
        const savedAssessment = await ensureSavedForPreview();
        if (savedAssessment || mode !== "supabase") {
          assessments = await questionBankDataService.listAssessments();
          renderPreview("student");
          setSelectionStatus("Avaliacao salva e aberta em pre-visualizacao.", "success");
        }
      }
      if (button.hasAttribute("data-qb-publish-digital")) {
        await publishCurrentAssessmentDigitally();
      }
      if (button.dataset.qbOpenAssessment) {
        const assessment = await questionBankDataService.getAssessmentById(button.dataset.qbOpenAssessment);
        activeAssessmentId = assessment.id;
        titleInput.value = assessment.title;
        root.querySelector(".qb-builder textarea").value = assessment.instructions || assessment.description || "";
        root.querySelector(".qb-builder input[type='date']").value = assessment.date === "Sem data" ? "" : assessment.date;
        root.querySelector("[data-qb-assessment-component]").value = assessment.component || root.querySelector("[data-qb-assessment-component]").value;
        root.querySelector("[data-qb-assessment-year]").value = assessment.year || root.querySelector("[data-qb-assessment-year]").value;
        cart = assessment.questions.map((entry) => entry.question?.code || entry.question_id).filter(Boolean);
        cartPoints = Object.fromEntries(
          assessment.questions
            .map((entry) => [entry.question?.code || entry.question_id, entry.points || 1])
            .filter(([id]) => Boolean(id))
        );
        saveDraftSnapshot("assessment-opened");
      }
      if (button.dataset.qbDuplicateAssessment) {
        await questionBankDataService.duplicateAssessment(button.dataset.qbDuplicateAssessment);
        assessments = await questionBankDataService.listAssessments();
      }
      if (button.dataset.qbArchiveAssessment) {
        await questionBankDataService.archiveAssessment(button.dataset.qbArchiveAssessment);
        assessments = await questionBankDataService.listAssessments();
      }
      await render();
    } catch (error) {
      setError(error.message);
    }
  });

  [search, usedFilter, sort, ...filters].forEach((control) => {
    control.addEventListener("input", () => {
      saveDraftSnapshot("filters-changed");
      render();
    });
    control.addEventListener("change", () => {
      saveDraftSnapshot("filters-changed");
      render();
    });
  });

  builderFields.forEach((control) => {
    control.addEventListener("change", () => {
      saveDraftSnapshot("builder-changed");
      if (activeAssessmentId) {
        ensureAssessment().catch((error) => setError(error.message));
      }
    });
    control.addEventListener("input", () => saveDraftSnapshot("builder-changed"));
  });

  cartList.addEventListener("input", (event) => {
    if (event.target.matches("[data-qb-points]")) {
      cartPoints[event.target.dataset.qbPoints] = Number(event.target.value || 1);
      saveDraftSnapshot("points-changed");
    }
  });

  restoreDraftSnapshot();
  installSupabaseSessionListener();
  refresh();
};

const htmlEscape = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const getSupabaseConfig = () => window.RAIZES_SUPABASE || {};
const supabaseSessionStorageKey = "raizes:supabase-auth-session";
const allowedAssessmentRoles = ["admin", "professor"];

const decodeJwtPayload = (token) => {
  try {
    const [, payload] = String(token || "").split(".");
    if (!payload) return {};
    return JSON.parse(atob(payload.replaceAll("-", "+").replaceAll("_", "/")));
  } catch (error) {
    return {};
  }
};

const getStoredSupabaseSession = () => {
  try {
    return JSON.parse(localStorage.getItem(supabaseSessionStorageKey) || "null");
  } catch (error) {
    return null;
  }
};

const storeSupabaseSession = (session) => {
  if (!session?.access_token) return;
  localStorage.setItem(
    supabaseSessionStorageKey,
    JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token || getStoredSupabaseSession()?.refresh_token || "",
      expires_at: session.expires_at || Math.floor(Date.now() / 1000) + Number(session.expires_in || 3600),
      token_type: session.token_type || "bearer",
      user: session.user || getStoredSupabaseSession()?.user || null,
    })
  );
  localStorage.setItem("raizes:supabase-access-token", session.access_token);
};

const clearSupabaseSession = () => {
  localStorage.removeItem(supabaseSessionStorageKey);
  localStorage.removeItem("raizes:supabase-access-token");
};

const isStoredSessionExpired = (session, skewSeconds = 60) =>
  !session?.access_token || Number(session.expires_at || 0) <= Math.floor(Date.now() / 1000) + skewSeconds;

const refreshStoredSupabaseSession = async () => {
  const config = getSupabaseConfig();
  const session = getStoredSupabaseSession();
  const baseUrl = config.url?.replace(/\/$/, "");
  if (!baseUrl || !config.anonKey || !session?.refresh_token) {
    return null;
  }
  const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  if (!response.ok) {
    clearSupabaseSession();
    return null;
  }
  const nextSession = await response.json();
  storeSupabaseSession(nextSession);
  return getStoredSupabaseSession();
};

const getSupabaseAccessToken = (config = getSupabaseConfig()) =>
  getStoredSupabaseSession()?.access_token ||
  config.accessToken ||
  localStorage.getItem("raizes:supabase-access-token") ||
  config.anonKey;

const getSupabaseUserContext = () => {
  const config = getSupabaseConfig();
  const token = getSupabaseAccessToken(config);
  const payload = decodeJwtPayload(token);
  const appMetadata = payload.app_metadata || {};
  return {
    token,
    userId: payload.sub || null,
    role:
      appMetadata.question_bank_role ||
      appMetadata.app_role ||
      appMetadata.role ||
      payload.question_bank_role ||
      payload.app_role ||
      (payload.role === "service_role" ? "service_role" : "anonymous"),
  };
};

const resolveSupabaseUserContext = async ({ requireAuthenticated = false, allowedRoles = [] } = {}) => {
  let session = getStoredSupabaseSession();
  if (session && isStoredSessionExpired(session)) {
    session = await refreshStoredSupabaseSession();
  }
  const config = getSupabaseConfig();
  const token = session?.access_token || config.accessToken || localStorage.getItem("raizes:supabase-access-token") || config.anonKey;
  const payload = decodeJwtPayload(token);
  const appMetadata = payload.app_metadata || {};
  const role =
    appMetadata.question_bank_role ||
    appMetadata.app_role ||
    appMetadata.role ||
    payload.question_bank_role ||
    payload.app_role ||
    (payload.role === "service_role" ? "service_role" : "anonymous");
  const context = {
    token,
    userId: payload.sub || null,
    role,
    expiresAt: payload.exp || session?.expires_at || null,
    hasRefreshToken: Boolean(session?.refresh_token),
  };
  if (!requireAuthenticated) {
    return context;
  }
  if (!context.userId || !context.token || String(context.token).startsWith("sb_")) {
    throw new Error("Sessao Supabase ausente. Entre novamente para salvar a avaliacao.");
  }
  if (allowedRoles.length && !allowedRoles.includes(context.role)) {
    throw new Error("Seu perfil nao tem permissao para salvar avaliacoes neste modulo.");
  }
  return context;
};

const mapSupabaseError = (response, body) => {
  const text = body ? ` - ${body}` : "";
  if (response.status === 401) return `Sessao expirada ou token ausente.${text}`;
  if (response.status === 403) return `Usuario sem permissao para esta acao.${text}`;
  if (response.status === 404) return `Tabela, rota ou registro inexistente no Supabase.${text}`;
  if (body?.includes("PGRST205") || body?.includes("Could not find the table")) {
    return `Tabela inexistente ou migration nao aplicada no Supabase.${text}`;
  }
  return `Falha Supabase ${response.status} ${response.statusText}${text}`;
};

const createSupabaseRestClient = () => {
  const config = getSupabaseConfig();
  const baseUrl = config.url?.replace(/\/$/, "");
  const context = getSupabaseUserContext();
  const isConfigured = Boolean(baseUrl && config.anonKey);
  const isLocalDevelopment =
    config.allowLocalFallback === true ||
    ["localhost", "127.0.0.1", ""].includes(window.location.hostname) ||
    window.location.protocol === "file:";
  const canUseFallback = !isConfigured && isLocalDevelopment;

  const request = async (table, params = "", options = {}) => {
    if (!isConfigured) {
      throw new Error("Supabase nao configurado. Crie supabase-config.js com URL e anon key publica.");
    }
    const requestContext = await resolveSupabaseUserContext({
      requireAuthenticated: options.requireAuthenticated === true,
      allowedRoles: options.allowedRoles || [],
    });
    const authHeaders =
      requestContext.token && !String(requestContext.token).startsWith("sb_")
        ? { Authorization: `Bearer ${requestContext.token}` }
        : {};
    const response = await fetch(`${baseUrl}/rest/v1/${table}${params}`, {
      ...options,
      headers: {
        apikey: config.anonKey,
        ...authHeaders,
        "Content-Type": "application/json",
        Prefer: options.prefer || "return=representation",
        ...(options.headers || {}),
      },
    });
    if (response.status === 401 && options.retryOnAuth !== false) {
      const refreshed = await refreshStoredSupabaseSession();
      if (refreshed?.access_token) {
        return request(table, params, { ...options, retryOnAuth: false });
      }
    }
    if (!response.ok) {
      const body = await response.text();
      throw new Error(mapSupabaseError(response, body));
    }
    if (response.status === 204) return null;
    return response.json();
  };

  const getContext = (options) => resolveSupabaseUserContext(options);

  return { isConfigured, canUseFallback, request, context, getContext };
};

const questionBankFallbackStore = {
  questions: demoQuestionBankItems.map((item) => ({ ...item })),
  assessments: savedAssessmentDemo.map((assessment, index) => ({
    id: `demo-assessment-${index + 1}`,
    ...assessment,
    title: assessment.title,
    description: "Avaliacao demonstrativa local.",
    component: index === 0 ? "Lingua Portuguesa" : "Matematica",
    year: index === 0 ? "2o ano" : "5o ano",
    instructions: "Leia com atencao e marque apenas uma alternativa por questao.",
    questions: [],
  })),
};

const mapQuestionFromSupabase = (row) => {
  const alternatives = [...(row.alternatives || [])].sort((a, b) => a.position - b.position);
  const correctIndex = alternatives.findIndex((alternative) => alternative.is_correct);
  return {
    id: row.code,
    uuid: row.id,
    title: row.internal_title,
    component: row.component,
    stage: row.stage,
    year: row.school_year,
    unit: row.thematic_unit || "",
    object: row.knowledge_object || "",
    skill: row.bncc_skill || "",
    descriptor: row.reference_matrix || "",
    proficiency: row.proficiency_level || "",
    difficulty: row.difficulty || "",
    cognitiveProcess: row.cognitive_process || "",
    type: row.question_type,
    resource: row.media?.[0]?.media_type || (row.base_text ? "Texto-base" : "Texto-base"),
    estimatedTime: row.estimated_minutes || 0,
    accessibility: row.accessibility_notes || "",
    originType: row.source?.source_type || "Autoral",
    legalClassification: row.legal_classification,
    sourceId: row.source_id,
    sourceName: row.source?.name || "Conteudo autoral Raizes e Saberes",
    author: row.author_name,
    license: row.license?.name || row.source?.license?.name || "Uso interno demonstrativo Raizes e Saberes",
    legalStatus: row.source?.legal_status || "",
    createdAt: row.created_at,
    reviewedAt: row.last_reviewed_at || row.updated_at || row.created_at,
    version: row.version,
    reviewer: row.reviewer_name || "Revisao pendente",
    curationStatus: row.curation_status,
    publicationStatus: row.publication_status,
    statement: row.statement,
    baseText: row.base_text || "",
    alternatives: alternatives.map((alternative) => alternative.body),
    alternativeRows: alternatives,
    correctAlternative: correctIndex >= 0 ? correctIndex : 0,
    justification: row.justification || "",
    distractors: alternatives.flatMap((alternative) => (alternative.distractor || []).map((entry) => entry.analysis)),
    rightFeedback: row.success_feedback || "",
    wrongFeedback: row.error_feedback || "",
    intervention: row.recommended_intervention || "",
    usedCount: row.usage_count || 0,
    lastUsedClass: row.last_used_class || "",
    raw: row,
  };
};

const mapAssessmentFromSupabase = (row) => ({
  id: row.id,
  title: row.title,
  status: row.status,
  items: row.questions?.length || row.question_count || 0,
  className: row.class_name || "Sem turma",
  date: row.application_date || "Sem data",
  description: row.description || "",
  component: row.component || "",
  year: row.school_year || "",
  instructions: row.instructions || "",
  questions: [...(row.questions || [])].sort((a, b) => a.position - b.position),
  raw: row,
});

const questionBankDataService = (() => {
  const client = () => createSupabaseRestClient();
  const questionSelect =
    "*,source:question_sources(*,license:question_licenses(*)),license:question_licenses(*),alternatives:question_alternatives(*,distractor:question_distractor_analyses(*)),media:question_media(*)";
  const assessmentSelect = "*,questions:assessment_questions(*,question:question_items(code,internal_title,estimated_minutes,publication_status,curation_status))";

  const fallback = {
    async listQuestions() {
      return questionBankFallbackStore.questions;
    },
    async getQuestionById(id) {
      return questionBankFallbackStore.questions.find((item) => item.id === id || item.uuid === id);
    },
    async listAlternatives(questionId) {
      return (await this.getQuestionById(questionId))?.alternatives || [];
    },
    async listSources() {
      return questionSourcesDemo;
    },
    async listLicenses() {
      return [{ id: "demo-license", name: "Uso interno demonstrativo Raizes e Saberes" }];
    },
    async listAssessments() {
      return questionBankFallbackStore.assessments;
    },
    async getAssessmentById(id) {
      return questionBankFallbackStore.assessments.find((assessment) => assessment.id === id);
    },
    async createAssessment(payload) {
      const assessment = {
        id: `demo-assessment-${Date.now()}`,
        status: "RASCUNHO",
        items: 0,
        className: payload.class_name || "Turma demonstrativa",
        date: payload.application_date || "",
        questions: [],
        ...payload,
        year: payload.school_year,
      };
      questionBankFallbackStore.assessments.unshift(assessment);
      return assessment;
    },
    async updateAssessment(id, payload) {
      const assessment = questionBankFallbackStore.assessments.find((entry) => entry.id === id);
      Object.assign(assessment, payload, { year: payload.school_year || assessment.year });
      return assessment;
    },
    async archiveAssessment(id) {
      return this.updateAssessment(id, { status: "ARQUIVADA", archived_at: new Date().toISOString() });
    },
    async duplicateAssessment(id) {
      const assessment = await this.getAssessmentById(id);
      return this.createAssessment({ ...assessment, title: `${assessment.title} - copia`, duplicated_from_id: id });
    },
    async addQuestionToAssessment(assessmentId, questionId, points = 1) {
      const assessment = await this.getAssessmentById(assessmentId);
      const question = await this.getQuestionById(questionId);
      if (!assessment || !question || question.publicationStatus !== "PUBLICADO") return null;
      assessment.questions.push({ id: `${assessmentId}-${questionId}`, question_id: question.uuid || question.id, position: assessment.questions.length + 1, points, question });
      assessment.items = assessment.questions.length;
      return assessment.questions.at(-1);
    },
    async removeQuestionFromAssessment(assessmentId, questionId) {
      const assessment = await this.getAssessmentById(assessmentId);
      assessment.questions = assessment.questions.filter((entry) => entry.question_id !== questionId && entry.question?.id !== questionId);
      assessment.items = assessment.questions.length;
      return assessment;
    },
    async reorderQuestions(assessmentId, orderedQuestionIds) {
      const assessment = await this.getAssessmentById(assessmentId);
      assessment.questions = orderedQuestionIds
        .map((id, index) => ({ ...assessment.questions.find((entry) => entry.question_id === id || entry.question?.id === id), position: index + 1 }))
        .filter((entry) => entry.question_id || entry.question);
      return assessment.questions;
    },
    async updateQuestionPoints(assessmentId, questionId, points = 1) {
      const assessment = await this.getAssessmentById(assessmentId);
      const entry = assessment?.questions.find((item) => item.question_id === questionId || item.question?.id === questionId || item.question?.uuid === questionId);
      if (entry) entry.points = points;
      return entry || null;
    },
    async registerUsage() {
      return null;
    },
    async getCurationHistory(questionId) {
      return [{ comment: "Historico local demonstrativo.", question_id: questionId, created_at: new Date().toISOString() }];
    },
  };

  const remote = {
    async listQuestions() {
      const { request } = client();
      const rows = await request("question_items", `?select=${questionSelect}&order=last_reviewed_at.desc.nullslast&order=created_at.desc`);
      return rows.map(mapQuestionFromSupabase);
    },
    async getQuestionById(id) {
      const { request } = client();
      const column = String(id).startsWith("RS-") ? "code" : "id";
      const rows = await request("question_items", `?${column}=eq.${encodeURIComponent(id)}&select=${questionSelect}&limit=1`);
      return rows[0] ? mapQuestionFromSupabase(rows[0]) : null;
    },
    async listAlternatives(questionId) {
      const { request } = client();
      return request("question_alternatives", `?question_id=eq.${encodeURIComponent(questionId)}&select=*,distractor:question_distractor_analyses(*)&order=position.asc`);
    },
    async listSources() {
      const { request } = client();
      return request("question_sources", "?select=*,license:question_licenses(*)&order=name.asc");
    },
    async listLicenses() {
      const { request } = client();
      return request("question_licenses", "?select=*&order=name.asc");
    },
    async listAssessments() {
      const { request } = client();
      try {
        const rows = await request("assessments", `?select=${assessmentSelect}&status=neq.ARQUIVADA&order=updated_at.desc`);
        return rows.map(mapAssessmentFromSupabase);
      } catch (error) {
        if (String(error.message || "").includes("Sessao expirada")) {
          return [];
        }
        throw error;
      }
    },
    async getAssessmentById(id) {
      const { request } = client();
      const rows = await request("assessments", `?id=eq.${encodeURIComponent(id)}&select=${assessmentSelect}&limit=1`);
      return rows[0] ? mapAssessmentFromSupabase(rows[0]) : null;
    },
    async createAssessment(payload) {
      const { request, getContext } = client();
      const context = await getContext({ requireAuthenticated: true, allowedRoles: allowedAssessmentRoles });
      const [row] = await request("assessments", "", {
        method: "POST",
        requireAuthenticated: true,
        allowedRoles: allowedAssessmentRoles,
        body: JSON.stringify({
          owner_user_id: context.userId,
          owner_role: context.role,
          status: "RASCUNHO",
          ...payload,
        }),
      });
      return mapAssessmentFromSupabase(row);
    },
    async updateAssessment(id, payload) {
      const { request } = client();
      const [row] = await request("assessments", `?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        requireAuthenticated: true,
        allowedRoles: allowedAssessmentRoles,
        body: JSON.stringify({ ...payload, updated_at: new Date().toISOString() }),
      });
      return mapAssessmentFromSupabase(row);
    },
    async archiveAssessment(id) {
      return this.updateAssessment(id, { status: "ARQUIVADA", archived_at: new Date().toISOString() });
    },
    async duplicateAssessment(id) {
      const assessment = await this.getAssessmentById(id);
      const copy = await this.createAssessment({
        title: `${assessment.title} - copia`,
        description: assessment.description,
        component: assessment.component,
        school_year: assessment.year,
        class_name: assessment.className,
        instructions: assessment.instructions,
        application_date: assessment.date === "Sem data" ? null : assessment.date,
        duplicated_from_id: id,
      });
      for (const item of assessment.questions) {
        await this.addQuestionToAssessment(copy.id, item.question_id, item.points);
      }
      return this.getAssessmentById(copy.id);
    },
    async addQuestionToAssessment(assessmentId, questionId, points = 1) {
      const { request } = client();
      await resolveSupabaseUserContext({ requireAuthenticated: true, allowedRoles: allowedAssessmentRoles });
      const current = await request("assessment_questions", `?assessment_id=eq.${encodeURIComponent(assessmentId)}&select=position&order=position.desc&limit=1`, {
        requireAuthenticated: true,
        allowedRoles: allowedAssessmentRoles,
      });
      const nextPosition = (current[0]?.position || 0) + 1;
      const question = await this.getQuestionById(questionId);
      const [row] = await request("assessment_questions", "", {
        method: "POST",
        requireAuthenticated: true,
        allowedRoles: allowedAssessmentRoles,
        body: JSON.stringify({
          assessment_id: assessmentId,
          question_id: question.uuid || questionId,
          position: nextPosition,
          points,
          version_snapshot: question.raw || {},
        }),
      });
      await this.registerUsage(question.uuid || questionId, assessmentId, "adicionada_em_avaliacao");
      return row;
    },
    async removeQuestionFromAssessment(assessmentId, questionId) {
      const { request } = client();
      await request("assessment_questions", `?assessment_id=eq.${encodeURIComponent(assessmentId)}&question_id=eq.${encodeURIComponent(questionId)}`, {
        method: "DELETE",
        requireAuthenticated: true,
        allowedRoles: allowedAssessmentRoles,
        prefer: "return=minimal",
      });
      return this.getAssessmentById(assessmentId);
    },
    async reorderQuestions(assessmentId, orderedQuestionIds) {
      const { request } = client();
      await resolveSupabaseUserContext({ requireAuthenticated: true, allowedRoles: allowedAssessmentRoles });
      for (const [index, questionId] of orderedQuestionIds.entries()) {
        await request("assessment_questions", `?assessment_id=eq.${encodeURIComponent(assessmentId)}&question_id=eq.${encodeURIComponent(questionId)}`, {
          method: "PATCH",
          requireAuthenticated: true,
          allowedRoles: allowedAssessmentRoles,
          body: JSON.stringify({ position: index + 1 }),
        });
      }
      return this.getAssessmentById(assessmentId);
    },
    async updateQuestionPoints(assessmentId, questionId, points = 1) {
      const { request } = client();
      await request("assessment_questions", `?assessment_id=eq.${encodeURIComponent(assessmentId)}&question_id=eq.${encodeURIComponent(questionId)}`, {
        method: "PATCH",
        requireAuthenticated: true,
        allowedRoles: allowedAssessmentRoles,
        body: JSON.stringify({ points }),
      });
      return this.getAssessmentById(assessmentId);
    },
    async registerUsage(questionId, assessmentId, usageType = "visualizada") {
      const { request, getContext } = client();
      const context = await getContext();
      if (!context.userId || context.role === "anonymous") return null;
      return request("question_usage_logs", "", {
        method: "POST",
        body: JSON.stringify({
          question_id: questionId,
          assessment_id: assessmentId || null,
          user_id: context.userId,
          user_role: context.role,
          usage_type: usageType,
          metadata: { module: "banco-questoes" },
        }),
      });
    },
    async getCurationHistory(questionId) {
      const question = await this.getQuestionById(questionId);
      const { request } = client();
      return request("question_curation_history", `?question_id=eq.${encodeURIComponent(question.uuid || questionId)}&select=*&order=created_at.desc&limit=8`);
    },
  };

  const productionMissingConfig = {
    async listQuestions() {
      throw new Error("Banco de Questoes sem conexao Supabase em ambiente de producao. Configure supabase-config.js com URL e anon key publica.");
    },
  };
  const active = () => {
    const currentClient = client();
    if (currentClient.isConfigured) return remote;
    if (currentClient.canUseFallback) return fallback;
    return productionMissingConfig;
  };
  return {
    mode: () => {
      const currentClient = client();
      if (currentClient.isConfigured) return "supabase";
      return currentClient.canUseFallback ? "fallback" : "missing-config";
    },
    listQuestions: (...args) => active().listQuestions(...args),
    getQuestionById: (...args) => active().getQuestionById(...args),
    listAlternatives: (...args) => active().listAlternatives(...args),
    listSources: (...args) => active().listSources(...args),
    listLicenses: (...args) => active().listLicenses(...args),
    listAssessments: (...args) => active().listAssessments(...args),
    getAssessmentById: (...args) => active().getAssessmentById(...args),
    createAssessment: (...args) => active().createAssessment(...args),
    updateAssessment: (...args) => active().updateAssessment(...args),
    archiveAssessment: (...args) => active().archiveAssessment(...args),
    duplicateAssessment: (...args) => active().duplicateAssessment(...args),
    addQuestionToAssessment: (...args) => active().addQuestionToAssessment(...args),
    removeQuestionFromAssessment: (...args) => active().removeQuestionFromAssessment(...args),
    reorderQuestions: (...args) => active().reorderQuestions(...args),
    updateQuestionPoints: (...args) => active().updateQuestionPoints(...args),
    registerUsage: (...args) => active().registerUsage(...args),
    getCurationHistory: (...args) => active().getCurationHistory(...args),
  };
})();

const initCurationBatches = () => {
  const root = document.querySelector("[data-route-screen='curadoria'] [data-batch-summary]")?.closest("#lotes");
  if (!root) return;

  const stateNode = root.querySelector("[data-curation-state]");
  const summaryNode = root.querySelector("[data-batch-summary]");
  const itemsNode = root.querySelector("[data-batch-items]");
  const detailNode = root.querySelector("[data-batch-detail]");
  const filterNode = root.querySelector("[data-batch-filter]");
  const noteNode = root.querySelector("[data-curator-note]");
  const batchCode = "EDU-001";
  const config = window.RAIZES_SUPABASE || {};
  const token = config.accessToken || localStorage.getItem("raizes:supabase-access-token") || config.anonKey;
  let batch = null;
  let items = [];
  let selectedIds = new Set();

  const setState = (message, tone = "info") => {
    if (!stateNode) return;
    stateNode.textContent = message;
    stateNode.dataset.tone = tone;
  };

  const api = async (table, params = "", options = {}) => {
    if (!config.url || !config.anonKey) {
      throw new Error("Supabase nao configurado. Defina SUPABASE_URL e SUPABASE_ANON_KEY no ambiente e exponha somente valores publicos em supabase-config.js.");
    }
    const baseUrl = config.url.replace(/\/$/, "");
    const authHeaders = token && !String(token).startsWith("sb_") ? { Authorization: `Bearer ${token}` } : {};
    const response = await fetch(`${baseUrl}/rest/v1/${table}${params}`, {
      ...options,
      headers: {
        apikey: config.anonKey,
        ...authHeaders,
        "Content-Type": "application/json",
        Prefer: options.prefer || "return=representation",
        ...(options.headers || {}),
      },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${response.status} ${response.statusText}${body ? ` - ${body}` : ""}`);
    }
    if (response.status === 204) return null;
    return response.json();
  };

  const loadBatch = async () => {
    setState("Carregando lote EDU-001...", "loading");
    const batches = await api("curation_batches", `?batch_code=eq.${encodeURIComponent(batchCode)}&select=*`);
    if (!batches.length) {
      batch = null;
      items = [];
      render();
      setState("Nenhum registro encontrado para o lote EDU-001.", "empty");
      return;
    }
    batch = batches[0];
    items = await api(
      "curation_batch_items",
      `?batch_id=eq.${batch.id}&select=*,course:curated_courses(*,provider:course_providers(name,acronym),category:course_categories(name,slug))&order=created_at.asc`
    );
    render();
    setState(`Lote ${batch.batch_code} carregado do Supabase real. ${items.length} itens encontrados.`, "success");
  };

  const confidenceLabel = (item) => {
    const confidence = item.confidence || {};
    const parts = ["url", "workload", "certificate", "classification"]
      .map((key) => `${key}: ${confidence[key] || item.course?.[`${key}_confidence`] || "NAO_CONFIRMADA"}`);
    return parts.join(" · ");
  };

  const hasAlert = (item) => {
    const confidence = item.confidence || {};
    return Object.values(confidence).includes("NAO_CONFIRMADA") || Object.values(confidence).includes("MEDIA") || Boolean(item.discard_reason);
  };

  const isDuplicateCandidate = (item) => {
    const title = `${item.normalized_title || ""} ${item.course?.theme || ""}`.toLowerCase();
    return title.includes("metodologias ativas") || item.issue_type === "POSSIBLE_DUPLICATE";
  };

  const filteredItems = () => {
    const filter = filterNode?.value || "all";
    if (filter === "alerts") return items.filter(hasAlert);
    if (filter === "duplicates") return items.filter(isDuplicateCandidate);
    if (filter === "approved") return items.filter((item) => item.status === "APROVADO" || item.course?.status === "APROVADO");
    if (filter === "published") return items.filter((item) => item.status === "PUBLICADO" || item.course?.status === "PUBLICADO");
    return items;
  };

  const renderSummary = () => {
    if (!batch) {
      summaryNode.innerHTML = "";
      return;
    }
    const imported = items.filter((item) => item.course_id).length;
    const published = items.filter((item) => item.status === "PUBLICADO" || item.course?.status === "PUBLICADO").length;
    const alerts = items.filter(hasAlert).length;
    const duplicates = items.filter(isDuplicateCandidate).length;
    summaryNode.innerHTML = `
      <article><strong>${htmlEscape(batch.batch_code)}</strong><span>${htmlEscape(batch.title)}</span><small>${batch.found_count} encontrados · ${imported} importados · ${batch.discarded_count} descartados · ${published} publicados</small></article>
      <article><strong>Status</strong><span>${htmlEscape(batch.status)}</span><small>Publicacao controlada por item aprovado.</small></article>
      <article><strong>Alertas</strong><span>${alerts} alertas de metadados</span><small>Use o filtro para revisar campos pendentes.</small></article>
      <article><strong>Duplicidades</strong><span>${duplicates} possiveis relacoes</span><small>Decisao editorial exigida antes de destacar.</small></article>
    `;
  };

  const renderItems = () => {
    const visible = filteredItems();
    if (!visible.length) {
      itemsNode.innerHTML = `<div class="batch-empty-state">Nenhum item corresponde ao filtro atual.</div>`;
      return;
    }
    itemsNode.innerHTML = visible
      .map((item) => {
        const course = item.course || {};
        const provider = course.provider?.acronym || course.provider?.name || item.provider_name || "Instituicao pendente";
        const category = course.category?.name || course.knowledge_center || "Categoria pendente";
        const checked = selectedIds.has(item.id) ? "checked" : "";
        const workload = course.workload_text || (course.workload_hours ? `${course.workload_hours}h` : "Carga nao confirmada");
        return `
          <article class="${hasAlert(item) ? "has-alert" : ""}">
            <label class="batch-select"><input type="checkbox" data-batch-select="${item.id}" ${checked} /><span>Selecionar</span></label>
            <div>
              <strong>${htmlEscape(item.normalized_title)}</strong>
              <span>${htmlEscape(provider)} · ${htmlEscape(category)} · ${htmlEscape(workload)} · ${htmlEscape(course.certificate_text || "Certificado em revisao")}</span>
              <small>Centro: ${htmlEscape(course.knowledge_center || category)} · Status: ${htmlEscape(item.status)} · ${htmlEscape(confidenceLabel(item))}</small>
            </div>
            <div class="batch-row-actions">
              <button type="button" data-batch-view="${item.id}">Ficha</button>
              <button type="button" data-batch-approve="${item.id}">Aprovar</button>
              <button type="button" data-batch-correction="${item.id}">Correcao</button>
              <button type="button" data-batch-reject="${item.id}">Rejeitar</button>
            </div>
          </article>
        `;
      })
      .join("");
  };

  const renderDetail = (item) => {
    if (!detailNode || !item) return;
    const course = item.course || {};
    detailNode.hidden = false;
    detailNode.innerHTML = `
      <header><span>Ficha completa</span><h3>${htmlEscape(item.normalized_title)}</h3></header>
      <div class="batch-detail-grid">
        <article><strong>Instituicao</strong><span>${htmlEscape(course.provider?.name || item.provider_name || "Pendente")}</span></article>
        <article><strong>Categoria</strong><span>${htmlEscape(course.category?.name || "Pendente")}</span></article>
        <article><strong>Centro</strong><span>${htmlEscape(course.knowledge_center || "Pendente")}</span></article>
        <article><strong>URL oficial</strong><a href="${htmlEscape(course.official_url || item.source_url)}" target="_blank" rel="noopener">Abrir origem</a></article>
        <article><strong>Coleta</strong><span>${htmlEscape(batch?.verification_date || item.created_at || "Pendente")}</span></article>
        <article><strong>Status</strong><span>${htmlEscape(item.status)}</span></article>
        <article class="span-2"><strong>Confianca</strong><span>${htmlEscape(confidenceLabel(item))}</span></article>
        <article class="span-2"><strong>Observacao da curadoria</strong><span>${htmlEscape(course.curator_notes || item.action_required || "Sem observacao registrada.")}</span></article>
      </div>
    `;
  };

  const render = () => {
    renderSummary();
    renderItems();
  };

  const logAction = async (item, action, previousStatus, newStatus, note) => {
    await api("curation_logs", "", {
      method: "POST",
      body: JSON.stringify({
        batch_id: batch.id,
        entity_table: "curation_batch_items",
        entity_id: item.id,
        action,
        previous_status: previousStatus,
        new_status: newStatus,
        details: { note: note || null, course_id: item.course_id || null },
      }),
    });
  };

  const updateItemStatus = async (itemId, status) => {
    const item = items.find((entry) => entry.id === itemId);
    if (!item) return;
    const note = noteNode?.value?.trim() || "";
    const previousStatus = item.status;
    await api("curation_batch_items", `?id=eq.${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ status, action_required: note || item.action_required, updated_at: new Date().toISOString() }),
    });
    if (item.course_id) {
      await api("curated_courses", `?id=eq.${item.course_id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          pipeline_status: status,
          curator_notes: note || item.course?.curator_notes,
          updated_at: new Date().toISOString(),
        }),
      });
    }
    await logAction(item, `CURATION_ITEM_${status}`, previousStatus, status, note);
  };

  const runSelected = async (status, onlyOne = false) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) {
      setState("Selecione pelo menos um item para executar a acao.", "error");
      return;
    }
    if (onlyOne && ids.length !== 1) {
      setState("Selecione exatamente um item para publicacao/despublicacao controlada.", "error");
      return;
    }
    setState("Registrando acao editorial no Supabase...", "loading");
    for (const id of ids) {
      await updateItemStatus(id, status);
    }
    selectedIds = new Set();
    await loadBatch();
  };

  root.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    try {
      if (button.hasAttribute("data-batch-refresh")) await loadBatch();
      if (button.dataset.batchView) renderDetail(items.find((item) => item.id === button.dataset.batchView));
      if (button.dataset.batchApprove) {
        await updateItemStatus(button.dataset.batchApprove, "APROVADO");
        await loadBatch();
      }
      if (button.dataset.batchCorrection) {
        await updateItemStatus(button.dataset.batchCorrection, "REVISAO_NECESSARIA");
        await loadBatch();
      }
      if (button.dataset.batchReject) {
        await updateItemStatus(button.dataset.batchReject, "REJEITADO");
        await loadBatch();
      }
      if (button.hasAttribute("data-batch-approve-selected")) await runSelected("APROVADO");
      if (button.hasAttribute("data-batch-reject-selected")) await runSelected("REJEITADO");
      if (button.hasAttribute("data-batch-correction-selected")) await runSelected("REVISAO_NECESSARIA");
      if (button.hasAttribute("data-batch-publish-selected")) await runSelected("PUBLICADO", true);
      if (button.hasAttribute("data-batch-unpublish-selected")) await runSelected("REVISAO_NECESSARIA", true);
    } catch (error) {
      setState(`Erro de permissao ou conexao: ${error.message}`, "error");
    }
  });

  root.addEventListener("change", (event) => {
    if (event.target.matches("[data-batch-select]")) {
      if (event.target.checked) selectedIds.add(event.target.dataset.batchSelect);
      else selectedIds.delete(event.target.dataset.batchSelect);
    }
    if (event.target.matches("[data-batch-filter]")) {
      renderItems();
    }
  });

  loadBatch().catch((error) => {
    summaryNode.innerHTML = "";
    itemsNode.innerHTML = `<div class="batch-empty-state">A Central de Curadoria ainda nao esta conectada ao Supabase real.</div>`;
    setState(error.message, "error");
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
    .map(([key, label, href]) =>
      key === "heading"
        ? `<strong class="app-nav-heading">${label}</strong>`
        : `<a class="${key === activeKey ? "is-active" : ""}" href="${href}">${label}</a>`
    )
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
          <a class="icon-button menu-toggle" href="plataforma.html" aria-label="Inicio">☰</a>
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
  initQuestionBank();
  initDigitalStudentAssessments();
  initDigitalResultsPanel();
  initCurationBatches();
};

renderAppPage();
