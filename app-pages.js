const platformAuth = {
  key: "raizes:demo-authenticated",
  curatorKey: "raizes:demo-curator",
  loginPage: "login.html",
};

const platformSessionKey = "raizes:supabase-auth-session";
const platformRoles = {
  professor: ["professor", "teacher"],
  aluno: ["aluno", "student"],
  escola: ["escola", "school"],
  educacao_infantil: ["educacao_infantil", "educacao-infantil", "educacaoinfantil", "infantil", "early_childhood"],
  gestor: ["gestor", "gestor_escolar", "manager"],
  coordenador: ["coordenador", "coordenador_pedagogico", "coordinator"],
  admin: ["admin", "administrador", "administrador_nacional"],
};
const platformRoleHome = {
  professor: "/professor",
  aluno: "/aluno",
  escola: "/escola",
  educacao_infantil: "/educacao-infantil",
  gestor: "gestor.html",
  coordenador: "/professor",
  admin: "/admin",
};
const routeAccessRules = {
  admin: ["admin"],
  escolaColetiva: ["escola", "aluno"],
  educacaoInfantil: ["educacao_infantil"],
  professor: ["professor", "gestor", "coordenador", "admin"],
  professorTurma: ["professor", "gestor", "coordenador", "admin"],
  professorAluno: ["professor", "gestor", "coordenador", "admin"],
  aluno: ["aluno"],
  alunoAtividades: ["aluno"],
  alunoAtividade: ["aluno"],
  arvore: ["aluno"],
  missao: ["aluno"],
  jogos: ["aluno"],
  perfil: ["aluno"],
  biblioteca: ["aluno", "professor", "gestor", "coordenador", "admin"],
  familia: ["aluno", "admin"],
  motorAtividade: ["aluno"],
  universidade: ["professor", "gestor", "coordenador", "admin"],
  adminAtividades: ["gestor", "coordenador", "admin"],
  avalia: ["professor", "gestor", "coordenador", "admin"],
  bancoQuestoes: ["professor", "gestor", "coordenador", "admin"],
  secretaria: ["gestor", "coordenador", "admin"],
  gestor: ["gestor", "coordenador", "admin"],
};
const protectedRouteKeyByPage = {
  "professor.html": "professor",
  "professor-turma.html": "professorTurma",
  "professor-aluno.html": "professorAluno",
  "admin.html": "admin",
  "escola.html": "escolaColetiva",
  "educacao-infantil.html": "educacaoInfantil",
  "aluno.html": "aluno",
  "aluno-atividades.html": "alunoAtividades",
  "aluno-atividade.html": "alunoAtividade",
  "aluno-atividade.html": "alunoAtividade",
  "arvore.html": "arvore",
  "missao.html": "missao",
  "jogos.html": "jogos",
  "perfil.html": "perfil",
  "biblioteca.html": "biblioteca",
  "familia.html": "familia",
  "motor-atividade.html": "motorAtividade",
  "universidade.html": "universidade",
  "avalia.html": "avalia",
  "banco-questoes.html": "bancoQuestoes",
  "admin-atividades.html": "adminAtividades",
  "secretaria.html": "secretaria",
  "gestor.html": "gestor",
  professor: "professor",
  "professor/turma": "professorTurma",
  "professor/alunos": "professorAluno",
  admin: "admin",
  escola: "escolaColetiva",
  "educacao-infantil": "educacaoInfantil",
  aluno: "aluno",
  "aluno/atividades": "alunoAtividades",
  "aluno/atividade": "alunoAtividade",
};
const studentAllowedRouteKeys = new Set(["aluno", "alunoAtividades", "alunoAtividade", "missao", "arvore", "biblioteca", "jogos", "perfil", "familia", "escolaColetiva", "viewer", "motorAtividade"]);
const decodePlatformJwtPayload = (token) => {
  try {
    const [, payload] = String(token || "").split(".");
    if (!payload) return {};
    return JSON.parse(atob(payload.replaceAll("-", "+").replaceAll("_", "/")));
  } catch (error) {
    return {};
  }
};
const normalizePlatformRole = (role) => {
  const normalized = String(role || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return Object.keys(platformRoles).find((key) => platformRoles[key].includes(normalized)) || normalized;
};
const getPlatformSession = () => {
  try {
    const session = JSON.parse(localStorage.getItem(platformSessionKey) || "null");
    const payload = decodePlatformJwtPayload(session?.access_token || localStorage.getItem("raizes:supabase-access-token") || "");
    const metadata = payload.app_metadata || {};
    const userMetadata = payload.user_metadata || session?.user?.user_metadata || {};
    const role = normalizePlatformRole(
      metadata.platform_role ||
        metadata.app_role ||
        metadata.role ||
        metadata.question_bank_role ||
        payload.platform_role ||
        payload.app_role ||
        userMetadata.platform_role ||
        userMetadata.role ||
        session?.platform_role ||
        session?.question_bank_role
    );
    return {
      userId: payload.sub || session?.user?.id || null,
      email: payload.email || session?.user?.email || "",
      name: userMetadata.full_name || userMetadata.name || session?.user?.email || "",
      role,
      expiresAt: payload.exp || session?.expires_at || 0,
    };
  } catch (error) {
    return { userId: null, email: "", name: "", role: "", expiresAt: 0 };
  }
};
const hasValidPlatformSession = () => {
  const session = getPlatformSession();
  return Boolean(session.userId && session.role && Number(session.expiresAt || 0) > Math.floor(Date.now() / 1000) + 60);
};
const getCurrentPlatformRole = () => {
  const session = getPlatformSession();
  if (hasValidPlatformSession()) {
    return session.role;
  }
  return "";
};
const clearPlatformSession = () => {
  try {
    localStorage.removeItem(platformSessionKey);
    localStorage.removeItem("raizes:supabase-access-token");
    localStorage.removeItem(platformAuth.key);
    localStorage.removeItem(platformAuth.curatorKey);
    Object.keys(localStorage)
      .filter((key) => key.startsWith("sb-") || key.includes("supabase.auth.token"))
      .forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    return null;
  }
  return null;
};
const signOutPlatformSession = async () => {
  const session = getPlatformSession();
  const storedSession = (() => {
    try {
      return JSON.parse(localStorage.getItem(platformSessionKey) || "null");
    } catch (error) {
      return null;
    }
  })();
  try {
    if (window.supabase?.auth?.signOut) {
      await window.supabase.auth.signOut();
    } else if (storedSession?.access_token && window.RAIZES_SUPABASE?.url && window.RAIZES_SUPABASE?.anonKey) {
      await fetch(`${window.RAIZES_SUPABASE.url.replace(/\/$/, "")}/auth/v1/logout`, {
        method: "POST",
        headers: {
          apikey: window.RAIZES_SUPABASE.anonKey,
          Authorization: `Bearer ${storedSession.access_token}`,
        },
      });
    }
  } catch (error) {
    // A limpeza local abaixo garante que o navegador nao reaproveite a sessao.
  }
  clearPlatformSession();
  window.location.replace("/login.html?logout=1");
  return session;
};
const canAccessPlatformRoute = (routeKey, role) => {
  if (role === "admin") return true;
  const allowed = routeAccessRules[routeKey];
  if (!allowed) return true;
  return allowed.includes(role);
};
const getRoleHome = (role) => platformRoleHome[role] || "plataforma.html";
const getCurrentPageName = () => window.location.pathname.replace(/^\/+/, "").replace(/\/$/, "") || "biblioteca.html";
const getProtectedRouteKeyForPath = () => {
  const normalizedPath = getCurrentPageName();
  if (normalizedPath.startsWith("professor/alunos/")) return "professorAluno";
  if (normalizedPath.startsWith("aluno/atividade/")) return "alunoAtividade";
  return protectedRouteKeyByPage[normalizedPath] || protectedRouteKeyByPage[`${normalizedPath}.html`] || "";
};
const normalizeRequestedPath = (path) => {
  const value = String(path || "").replace(/^\/+/, "");
  if (!value) return "plataforma.html";
  if (value.startsWith("professor/")) return value;
  if (value.startsWith("aluno/")) return value;
  return value.endsWith(".html") ? value : `${value}.html`;
};

const requirePlatformAuth = () => {
  if (typeof window === "undefined") {
    return;
  }

  const rawPath = window.location.pathname.replace(/^\//, "");
  const currentPath = `${normalizeRequestedPath(rawPath || getCurrentPageName())}${window.location.search}${window.location.hash}`;
  const publicPages = new Set(["universidade.html", "universidade", "index.html", "index", "login.html", "login"]);
  if (publicPages.has(getCurrentPageName())) {
    return;
  }

  const protectedRouteKey = getProtectedRouteKeyForPath();
  const currentRole = getCurrentPlatformRole();
  if (protectedRouteKey) {
    if (!currentRole) {
      document.documentElement.style.display = "none";
      window.location.replace(`${platformAuth.loginPage}?next=${encodeURIComponent(currentPath)}&auth=supabase&reason=role`);
      return;
    }
    if (!canAccessPlatformRoute(protectedRouteKey, currentRole)) {
      document.documentElement.style.display = "none";
      window.location.replace(getRoleHome(currentRole));
      return;
    }
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
  ["admin.html", "Admin / TI"],
  ["escola.html", "Escola"],
  ["educacao-infantil.html", "Educacao Infantil"],
  ["aluno.html", "Aluno"],
  ["arvore.html", "Minha Arvore"],
  ["missao.html", "Missao do Dia"],
  ["jogos.html", "Jogos"],
  ["perfil.html", "Perfil"],
  ["biblioteca.html", "Biblioteca"],
  ["universidade.html", "Universidade"],
  ["book-viewer.html", "Book Viewer"],
  ["professor.html", "Professor"],
  ["atividades.html", "Atividades Imprimiveis"],
  ["motor-atividade.html", "Motor de Atividades"],
  ["admin-atividades.html", "Admin Atividades"],
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

const legacyInfantilBookCatalog = [
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
  {
    id: "avalia-portugues-6ano",
    title: "AVALIA+ PORTUGUÊS",
    subtitle: "LÍNGUA PORTUGUESA - 6º ANO",
    catalogTitle: "AVALIA+ PORTUGUÊS",
    level: "6º Ano",
    type: "Livro do Aluno",
    collection: "Avalia+",
    stage: "Ensino Fundamental - Anos Finais",
    component: "Língua Portuguesa",
    totalPages: 19,
    basePath: "assets",
    cover: "assets/avalia-portugues-6ano/pages/page-001.jpg",
    catalogCover: "assets/biblioteca/RAIZES_AVALIA_PORTUGUES_6ANO_BIBLIOTECA.jpg",
    pdf: "assets/avalia-portugues-6ano/pdf/6-anos-portugues.pdf",
    href: "book-viewer.html?book=avalia-portugues-6ano",
    thumb: (page) => `assets/avalia-portugues-6ano/thumbs/page-${String(page).padStart(3, "0")}.jpg`,
    page: (page) => `assets/avalia-portugues-6ano/pages/page-${String(page).padStart(3, "0")}.jpg`,
    summary: [
      ["Capa", 1],
      ["Apresentacao", 2],
      ["Orientacoes de uso", 3],
      ["Atividades", 5],
      ["Simulado", 12],
      ["Encerramento", 19],
    ],
  },
];

const renewedInfantilBooks = [
  {
    id: "livro-005",
    title: "Educacao Infantil 4 anos",
    subtitle: "Livro do Aluno - Volume 1",
    catalogTitle: "Volume 1",
    level: "Infantil 4",
    type: "Livro do Aluno",
    collection: "Colecao Raizes e Saberes",
    totalPages: 120,
    basePath: "assets",
    cover: "assets/livro-005/pages/page-001.jpg",
    catalogCover: "assets/biblioteca/RAIZES_INFANTIL4_VOL1_BIBLIOTECA.jpg",
    pdf: "assets/livro-005/pdf/infantil-4-volume-1.pdf",
    href: "book-viewer.html?book=livro-005",
    thumb: (page) => `assets/livro-005/thumbs/page-${String(page).padStart(3, "0")}.jpg`,
    page: (page) => `assets/livro-005/pages/page-${String(page).padStart(3, "0")}.jpg`,
    summary: [
      ["Capa", 1],
      ["Apresentacao", 2],
      ["Volume 1 - 1o semestre", 3],
      ["Atividades", 10],
      ["Projetos", 60],
      ["Encerramento", 120],
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
    totalPages: 122,
    basePath: "assets",
    cover: "assets/livro-006/pages/page-001.jpg",
    catalogCover: "assets/biblioteca/RAIZES_INFANTIL4_VOL2_BIBLIOTECA.jpg",
    pdf: "assets/livro-006/pdf/infantil-4-volume-2.pdf",
    href: "book-viewer.html?book=livro-006",
    thumb: (page) => `assets/livro-006/thumbs/page-${String(page).padStart(3, "0")}.jpg`,
    page: (page) => `assets/livro-006/pages/page-${String(page).padStart(3, "0")}.jpg`,
    summary: [
      ["Capa", 1],
      ["Apresentacao", 2],
      ["Volume 2 - 2o semestre", 3],
      ["Atividades", 10],
      ["Projetos", 60],
      ["Encerramento", 122],
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
    totalPages: 128,
    basePath: "assets",
    cover: "assets/livro-007/pages/page-001.jpg",
    catalogCover: "assets/biblioteca/RAIZES_INFANTIL5_VOL1_BIBLIOTECA.jpg",
    pdf: "assets/livro-007/pdf/infantil-5-volume-1.pdf",
    href: "book-viewer.html?book=livro-007",
    thumb: (page) => `assets/livro-007/thumbs/page-${String(page).padStart(3, "0")}.jpg`,
    page: (page) => `assets/livro-007/pages/page-${String(page).padStart(3, "0")}.jpg`,
    summary: [
      ["Capa", 1],
      ["Apresentacao", 2],
      ["Volume 1 - 1o semestre", 3],
      ["Atividades", 10],
      ["Projetos", 64],
      ["Encerramento", 128],
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
    totalPages: 155,
    basePath: "assets",
    cover: "assets/livro-008/pages/page-001.jpg",
    catalogCover: "assets/biblioteca/RAIZES_INFANTIL5_VOL2_BIBLIOTECA.jpg",
    pdf: "assets/livro-008/pdf/infantil-5-volume-2.pdf",
    href: "book-viewer.html?book=livro-008",
    thumb: (page) => `assets/livro-008/thumbs/page-${String(page).padStart(3, "0")}.jpg`,
    page: (page) => `assets/livro-008/pages/page-${String(page).padStart(3, "0")}.jpg`,
    summary: [
      ["Capa", 1],
      ["Apresentacao", 2],
      ["Volume 2 - 2o semestre", 3],
      ["Atividades", 10],
      ["Projetos", 78],
      ["Encerramento", 155],
    ],
  },
];

const renewedProfessorGuideBooks = [
  {
    id: "guia-professor-004-v1",
    title: "Guia do Professor - Educacao Infantil 4 anos",
    subtitle: "Volume 1",
    catalogTitle: "Guia do Professor - Volume 1",
    level: "Infantil 4",
    type: "Guia do Professor",
    collection: "Colecao Raizes e Saberes",
    totalPages: 93,
    basePath: "assets",
    cover: "assets/guia-professor-004-v1/pages/page-001.jpg",
    catalogCover: "assets/biblioteca/RAIZES_GUIA_PROFESSOR_INFANTIL4_VOL1_BIBLIOTECA.jpg",
    pdf: "assets/guia-professor-004-v1/pdf/guia-professor-infantil-4-volume-1.pdf",
    href: "book-viewer.html?book=guia-professor-004-v1",
    thumb: (page) => `assets/guia-professor-004-v1/thumbs/page-${String(page).padStart(3, "0")}.jpg`,
    page: (page) => `assets/guia-professor-004-v1/pages/page-${String(page).padStart(3, "0")}.jpg`,
    summary: [
      ["Capa", 1],
      ["Apresentacao", 2],
      ["Orientacoes pedagogicas", 5],
      ["Planejamento", 20],
      ["Atividades", 45],
      ["Encerramento", 93],
    ],
  },
  {
    id: "guia-professor-004-v2",
    title: "Guia do Professor - Educacao Infantil 4 anos",
    subtitle: "Volume 2",
    catalogTitle: "Guia do Professor - Volume 2",
    level: "Infantil 4",
    type: "Guia do Professor",
    collection: "Colecao Raizes e Saberes",
    totalPages: 93,
    basePath: "assets",
    cover: "assets/guia-professor-004-v2/pages/page-001.jpg",
    catalogCover: "assets/biblioteca/RAIZES_GUIA_PROFESSOR_INFANTIL4_VOL2_BIBLIOTECA.jpg",
    pdf: "assets/guia-professor-004-v2/pdf/guia-professor-infantil-4-volume-2.pdf",
    href: "book-viewer.html?book=guia-professor-004-v2",
    thumb: (page) => `assets/guia-professor-004-v2/thumbs/page-${String(page).padStart(3, "0")}.jpg`,
    page: (page) => `assets/guia-professor-004-v2/pages/page-${String(page).padStart(3, "0")}.jpg`,
    summary: [
      ["Capa", 1],
      ["Apresentacao", 2],
      ["Orientacoes pedagogicas", 5],
      ["Planejamento", 20],
      ["Atividades", 45],
      ["Encerramento", 93],
    ],
  },
  {
    id: "guia-professor-005-v1",
    title: "Guia do Professor - Educacao Infantil 5 anos",
    subtitle: "Volume 1",
    catalogTitle: "Guia do Professor - Volume 1",
    level: "Infantil 5",
    type: "Guia do Professor",
    collection: "Colecao Raizes e Saberes",
    totalPages: 99,
    basePath: "assets",
    cover: "assets/guia-professor-005-v1/pages/page-001.jpg",
    catalogCover: "assets/biblioteca/RAIZES_GUIA_PROFESSOR_INFANTIL5_VOL1_BIBLIOTECA.jpg",
    pdf: "assets/guia-professor-005-v1/pdf/guia-professor-infantil-5-volume-1.pdf",
    href: "book-viewer.html?book=guia-professor-005-v1",
    thumb: (page) => `assets/guia-professor-005-v1/thumbs/page-${String(page).padStart(3, "0")}.jpg`,
    page: (page) => `assets/guia-professor-005-v1/pages/page-${String(page).padStart(3, "0")}.jpg`,
    summary: [
      ["Capa", 1],
      ["Apresentacao", 2],
      ["Orientacoes pedagogicas", 5],
      ["Planejamento", 22],
      ["Atividades", 50],
      ["Encerramento", 99],
    ],
  },
  {
    id: "guia-professor-005-v2",
    title: "Guia do Professor - Educacao Infantil 5 anos",
    subtitle: "Volume 2",
    catalogTitle: "Guia do Professor - Volume 2",
    level: "Infantil 5",
    type: "Guia do Professor",
    collection: "Colecao Raizes e Saberes",
    totalPages: 113,
    basePath: "assets",
    cover: "assets/guia-professor-005-v2/pages/page-001.jpg",
    catalogCover: "assets/biblioteca/RAIZES_GUIA_PROFESSOR_INFANTIL5_VOL2_BIBLIOTECA.jpg",
    pdf: "assets/guia-professor-005-v2/pdf/guia-professor-infantil-5-volume-2.pdf",
    href: "book-viewer.html?book=guia-professor-005-v2",
    thumb: (page) => `assets/guia-professor-005-v2/thumbs/page-${String(page).padStart(3, "0")}.jpg`,
    page: (page) => `assets/guia-professor-005-v2/pages/page-${String(page).padStart(3, "0")}.jpg`,
    summary: [
      ["Capa", 1],
      ["Apresentacao", 2],
      ["Orientacoes pedagogicas", 5],
      ["Planejamento", 25],
      ["Atividades", 55],
      ["Encerramento", 113],
    ],
  },
];

const bookCatalog = [
  ...renewedInfantilBooks,
  ...renewedProfessorGuideBooks,
  ...legacyInfantilBookCatalog.filter((book) => book.collection === "Avalia+"),
];

const defaultBook = renewedInfantilBooks[0];

const getActiveBook = () => {
  if (typeof window === "undefined") {
    return defaultBook;
  }
  const requestedBook = new URLSearchParams(window.location.search).get("book");
  return bookCatalog.find((book) => book.id === requestedBook) || defaultBook;
};

const activeBook = getActiveBook();

const createLibraryAssetFallback = ({ title = "Biblioteca Viva", note = "CAPA EM ATUALIZACAO", page = "" } = {}) => {
  const fallback = document.createElement("div");
  fallback.className = "library-asset-fallback";
  fallback.setAttribute("role", "img");
  fallback.setAttribute("aria-label", page ? `Miniatura da pagina ${page} indisponivel` : `${title} - ${note}`);
  fallback.innerHTML = page
    ? `<strong>${page}</strong><span>MINIATURA INDISPONIVEL</span>`
    : `<span>Biblioteca Viva</span><strong>${title}</strong><small>${note}</small>`;
  return fallback;
};

const replaceBrokenImage = (image, fallback) => {
  if (!image || image.dataset.assetFallbackApplied === "true") {
    return;
  }
  image.dataset.assetFallbackApplied = "true";
  image.hidden = true;
  image.insertAdjacentElement("afterend", fallback);
};

const initLibraryAssetFallbacks = () => {
  document.querySelectorAll(".library-2-hero img, .library-2-card img, .library-book-card img, .reader-book-profile img").forEach((image) => {
    image.addEventListener("error", () => {
      replaceBrokenImage(
        image,
        createLibraryAssetFallback({
          title: image.alt || image.closest("[data-book-id]")?.querySelector("h3, strong")?.textContent || "Livro",
        })
      );
    });
  });
};

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

const legacyLibraryBooks = [
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
    collection: "Avalia+",
    stage: "Ensino Fundamental - Anos Finais",
    hierarchy: "Ensino Fundamental > 6º Ano > Matemática > Avalia+ > Livro do Aluno",
    publishedAt: "2026-07-29",
    actionLabel: "Ler Agora",
    searchTerms: "Avalia+ Matemática Matematica 6º Ano 6o Ano Ensino Fundamental Anos Finais Livro do Aluno Aluno Avalia",
  },
  {
    src: "assets/biblioteca/RAIZES_AVALIA_PORTUGUES_6ANO_BIBLIOTECA.jpg",
    year: "6º Ano",
    title: "AVALIA+ PORTUGUÊS",
    type: "Livro do Aluno",
    component: "LÍNGUA PORTUGUESA",
    pages: "19 PÁGINAS",
    href: "book-viewer.html?book=avalia-portugues-6ano",
    collection: "Avalia+",
    stage: "Ensino Fundamental - Anos Finais",
    hierarchy: "Ensino Fundamental > 6º Ano > Língua Portuguesa > Avalia+ > Livro do Aluno",
    publishedAt: "2026-07-29",
    actionLabel: "Ler Agora",
    searchTerms: "Avalia+ Português Portugues Língua Portuguesa Lingua Portuguesa 6º Ano 6o Ano Ensino Fundamental Anos Finais Livro do Aluno Aluno Avalia",
  },
  { src: "assets/colecoes/colecao-ensino-fundamental-provisorio.webp", year: "Fundamental", title: "Colecao Ensino Fundamental", type: "Acervo em expansao", href: "#acervo-completo", collection: "Ensino Fundamental", publishedAt: "2026-07-11", status: "Em expansao" },
  { src: "assets/colecoes/colecao-avalia-provisorio.webp", year: "Avalia+", title: "Colecao Avalia+", type: "Avaliacoes", href: "avalia.html", collection: "Avalia+", publishedAt: "2026-07-11", status: "Em expansao" },
];

const renewedInfantilLibraryBooks = [
  {
    src: "assets/biblioteca/RAIZES_INFANTIL4_VOL1_BIBLIOTECA.jpg",
    year: "Infantil 4",
    title: "Volume 1",
    type: "Livro do Aluno",
    component: "EDUCACAO INFANTIL",
    pages: "120 PAGINAS",
    href: "book-viewer.html?book=livro-005",
    collection: "Educacao Infantil",
    stage: "Educacao Infantil",
    hierarchy: "Educacao Infantil > 4 anos > Livro do Aluno > Volume 1",
    publishedAt: "2026-07-30",
    actionLabel: "Ler Agora",
    searchTerms: "Educacao Infantil Educação Infantil Infantil 4 anos 4 Anos Livro do Aluno Volume 1 Primeiro Semestre",
  },
  {
    src: "assets/biblioteca/RAIZES_INFANTIL4_VOL2_BIBLIOTECA.jpg",
    year: "Infantil 4",
    title: "Volume 2",
    type: "Livro do Aluno",
    component: "EDUCACAO INFANTIL",
    pages: "122 PAGINAS",
    href: "book-viewer.html?book=livro-006",
    collection: "Educacao Infantil",
    stage: "Educacao Infantil",
    hierarchy: "Educacao Infantil > 4 anos > Livro do Aluno > Volume 2",
    publishedAt: "2026-07-30",
    actionLabel: "Ler Agora",
    searchTerms: "Educacao Infantil Educação Infantil Infantil 4 anos 4 Anos Livro do Aluno Volume 2 Segundo Semestre",
  },
  {
    src: "assets/biblioteca/RAIZES_INFANTIL5_VOL1_BIBLIOTECA.jpg",
    year: "Infantil 5",
    title: "Volume 1",
    type: "Livro do Aluno",
    component: "EDUCACAO INFANTIL",
    pages: "128 PAGINAS",
    href: "book-viewer.html?book=livro-007",
    collection: "Educacao Infantil",
    stage: "Educacao Infantil",
    hierarchy: "Educacao Infantil > 5 anos > Livro do Aluno > Volume 1",
    publishedAt: "2026-07-30",
    actionLabel: "Ler Agora",
    searchTerms: "Educacao Infantil Educação Infantil Infantil 5 anos 5 Anos Livro do Aluno Volume 1 Primeiro Semestre",
  },
  {
    src: "assets/biblioteca/RAIZES_INFANTIL5_VOL2_BIBLIOTECA.jpg",
    year: "Infantil 5",
    title: "Volume 2",
    type: "Livro do Aluno",
    component: "EDUCACAO INFANTIL",
    pages: "155 PAGINAS",
    href: "book-viewer.html?book=livro-008",
    collection: "Educacao Infantil",
    stage: "Educacao Infantil",
    hierarchy: "Educacao Infantil > 5 anos > Livro do Aluno > Volume 2",
    publishedAt: "2026-07-30",
    actionLabel: "Ler Agora",
    searchTerms: "Educacao Infantil Educação Infantil Infantil 5 anos 5 Anos Livro do Aluno Volume 2 Segundo Semestre",
  },
];

const renewedProfessorGuideLibraryBooks = [
  {
    src: "assets/biblioteca/RAIZES_GUIA_PROFESSOR_INFANTIL4_VOL1_BIBLIOTECA.jpg",
    year: "Infantil 4",
    title: "Guia do Professor - Volume 1",
    type: "Guia do Professor",
    component: "EDUCACAO INFANTIL",
    pages: "93 PAGINAS",
    href: "book-viewer.html?book=guia-professor-004-v1",
    collection: "Educacao Infantil",
    stage: "Educacao Infantil",
    hierarchy: "Educacao Infantil > 4 anos > Guia do Professor > Volume 1",
    publishedAt: "2026-07-31",
    actionLabel: "Ler Agora",
    searchTerms: "Educacao Infantil Educação Infantil Infantil 4 anos 4 Anos Guia do Professor Professor Volume 1 Primeiro Semestre",
  },
  {
    src: "assets/biblioteca/RAIZES_GUIA_PROFESSOR_INFANTIL4_VOL2_BIBLIOTECA.jpg",
    year: "Infantil 4",
    title: "Guia do Professor - Volume 2",
    type: "Guia do Professor",
    component: "EDUCACAO INFANTIL",
    pages: "93 PAGINAS",
    href: "book-viewer.html?book=guia-professor-004-v2",
    collection: "Educacao Infantil",
    stage: "Educacao Infantil",
    hierarchy: "Educacao Infantil > 4 anos > Guia do Professor > Volume 2",
    publishedAt: "2026-07-31",
    actionLabel: "Ler Agora",
    searchTerms: "Educacao Infantil Educação Infantil Infantil 4 anos 4 Anos Guia do Professor Professor Volume 2 Segundo Semestre",
  },
  {
    src: "assets/biblioteca/RAIZES_GUIA_PROFESSOR_INFANTIL5_VOL1_BIBLIOTECA.jpg",
    year: "Infantil 5",
    title: "Guia do Professor - Volume 1",
    type: "Guia do Professor",
    component: "EDUCACAO INFANTIL",
    pages: "99 PAGINAS",
    href: "book-viewer.html?book=guia-professor-005-v1",
    collection: "Educacao Infantil",
    stage: "Educacao Infantil",
    hierarchy: "Educacao Infantil > 5 anos > Guia do Professor > Volume 1",
    publishedAt: "2026-07-31",
    actionLabel: "Ler Agora",
    searchTerms: "Educacao Infantil Educação Infantil Infantil 5 anos 5 Anos Guia do Professor Professor Volume 1 Primeiro Semestre",
  },
  {
    src: "assets/biblioteca/RAIZES_GUIA_PROFESSOR_INFANTIL5_VOL2_BIBLIOTECA.jpg",
    year: "Infantil 5",
    title: "Guia do Professor - Volume 2",
    type: "Guia do Professor",
    component: "EDUCACAO INFANTIL",
    pages: "113 PAGINAS",
    href: "book-viewer.html?book=guia-professor-005-v2",
    collection: "Educacao Infantil",
    stage: "Educacao Infantil",
    hierarchy: "Educacao Infantil > 5 anos > Guia do Professor > Volume 2",
    publishedAt: "2026-07-31",
    actionLabel: "Ler Agora",
    searchTerms: "Educacao Infantil Educação Infantil Infantil 5 anos 5 Anos Guia do Professor Professor Volume 2 Segundo Semestre",
  },
];

const libraryBooks = [
  ...renewedInfantilLibraryBooks,
  ...renewedProfessorGuideLibraryBooks,
  ...legacyLibraryBooks.filter(
    (book) => !["Educacao Infantil", "Laboratorio Sensorial", "Guias do Professor"].includes(book.collection)
  ),
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
    description: "Colecao renovada para a Educacao Infantil, iniciando pelos Livros do Aluno de 4 e 5 anos.",
    icon: "⌂",
    href: "#acervo-completo",
    covers: [
      "assets/biblioteca/RAIZES_INFANTIL4_VOL1_BIBLIOTECA.jpg",
      "assets/biblioteca/RAIZES_INFANTIL4_VOL2_BIBLIOTECA.jpg",
      "assets/biblioteca/RAIZES_INFANTIL5_VOL1_BIBLIOTECA.jpg",
      "assets/biblioteca/RAIZES_INFANTIL5_VOL2_BIBLIOTECA.jpg",
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
      <article class="library-book-card" data-library-book-card data-book-href="${book.href}" data-book-collection="${book.collection || ""}" data-book-type="${book.type || ""}">
        <img src="${book.src}" alt="${book.year} ${book.title}" loading="lazy" />
        <div>
          <span>${book.year}</span>
          <strong>${book.title}</strong>
          <small>${book.status || book.type}</small>
          ${book.component ? `<small>${book.component}</small>` : ""}
          ${book.pages ? `<small>${book.pages}</small>` : ""}
          ${book.searchTerms || book.hierarchy ? `<span hidden>${[book.searchTerms, book.hierarchy, book.stage].filter(Boolean).join(" ")}</span>` : ""}
          <a href="${book.href}">${book.actionLabel || "Abrir"}</a>
        </div>
      </article>
    `
  )
  .join("");

const getBookIdFromHref = (href = "") => new URLSearchParams((href.split("?")[1] || "").split("#")[0]).get("book") || "";
const getCatalogBookFromLibraryBook = (book) => bookCatalog.find((candidate) => candidate.id === getBookIdFromHref(book.href));
const getReadingProgress = (bookId, totalPages = 1) => {
  if (typeof localStorage === "undefined") {
    return 0;
  }
  const lastPage = Number(localStorage.getItem(`${bookId}:lastPage`)) || 0;
  return Math.max(0, Math.min(100, Math.round((lastPage / totalPages) * 100)));
};
const getLibraryFavorites = () => {
  if (typeof localStorage === "undefined") {
    return [];
  }
  try {
    return JSON.parse(localStorage.getItem("library:favorites") || "[]");
  } catch (error) {
    return [];
  }
};
const isFavoriteBook = (bookId) => getLibraryFavorites().includes(bookId);
const withCatalogBook = (books) =>
  books
    .map((libraryBook) => ({ libraryBook, catalogBook: getCatalogBookFromLibraryBook(libraryBook) }))
    .filter((item) => item.catalogBook);
const libraryShelfCard = ({ libraryBook, catalogBook }, label = "Ler Agora") => {
  const progress = getReadingProgress(catalogBook.id, catalogBook.totalPages);
  const isFavorite = isFavoriteBook(catalogBook.id);
  return `
    <article class="library-2-card" data-library-book-card data-book-id="${catalogBook.id}" data-book-href="${libraryBook.href}" data-book-collection="${libraryBook.collection || ""}" data-book-type="${libraryBook.type || ""}">
      <img src="${libraryBook.src}" alt="${libraryBook.year} ${libraryBook.title}" loading="lazy" />
      <div>
        <span>${libraryBook.year}</span>
        <h3>${libraryBook.title}</h3>
        <p>${libraryBook.type} &middot; ${libraryBook.pages || `${catalogBook.totalPages} paginas`}</p>
        <i style="--value:${progress}%"><b style="width:${progress}%"></b></i>
        <small>${progress ? `${progress}% lido` : "Novo na biblioteca"}</small>
        <a href="${libraryBook.href}">${label}</a>
        <button type="button" data-toggle-book-favorite="${catalogBook.id}" aria-pressed="${isFavorite ? "true" : "false"}">${isFavorite ? "Favorito" : "Favoritar"}</button>
      </div>
    </article>
  `;
};
const buildBookCarousel = (title, subtitle, books, label = "Ler Agora") => `
  <section class="wide-panel library-2-shelf">
    <div class="panel-head"><h2>${title}</h2><a>${subtitle}</a></div>
    <div class="library-2-rail">
      ${withCatalogBook(books).map((item) => libraryShelfCard(item, label)).join("")}
    </div>
  </section>
`;
const allReadableBooks = sortedLibraryBooks.filter((book) => book.href.startsWith("book-viewer.html"));
const libraryContinueBooks = withCatalogBook(allReadableBooks)
  .filter(({ catalogBook }) => getReadingProgress(catalogBook.id, catalogBook.totalPages) > 0)
  .sort((first, second) => getReadingProgress(second.catalogBook.id, second.catalogBook.totalPages) - getReadingProgress(first.catalogBook.id, first.catalogBook.totalPages))
  .slice(0, 6);
const libraryFavoriteBooks = withCatalogBook(allReadableBooks).filter(({ catalogBook }) => isFavoriteBook(catalogBook.id));
const libraryRecommendedBooks = allReadableBooks.filter((book) => book.collection === "Educacao Infantil").slice(0, 8);
const libraryTeacherBooks = allReadableBooks.filter((book) => book.type === "Guia do Professor").slice(0, 4);
const libraryFeaturedBook = getCatalogBookFromLibraryBook(featuredLibraryBook) || defaultBook;
const libraryFeaturedProgress = getReadingProgress(libraryFeaturedBook.id, libraryFeaturedBook.totalPages);
const library2HeroHtml = `
  <section class="library-2-hero">
    <div>
      <span>Biblioteca Viva 2.0</span>
      <h1>${featuredLibraryBook.title}</h1>
      <p>${featuredLibraryBook.year} &middot; ${featuredLibraryBook.type} &middot; ${featuredLibraryBook.pages || `${libraryFeaturedBook.totalPages} paginas`}</p>
      <div class="library-2-hero-actions">
        <a href="${featuredLibraryBook.href}">Ler destaque</a>
        <a href="#acervo-completo">Ver acervo</a>
      </div>
      <div class="library-2-progress"><i style="--value:${libraryFeaturedProgress}%"><b style="width:${libraryFeaturedProgress}%"></b></i><strong>${libraryFeaturedProgress}%</strong><small>progresso salvo neste dispositivo</small></div>
    </div>
    <img src="${featuredLibraryBook.src}" alt="${featuredLibraryBook.year} ${featuredLibraryBook.title}" loading="eager" />
  </section>
`;
const library2StatsHtml = `
  <section class="library-2-stats" aria-label="Indicadores da Biblioteca Viva">
    <article><strong>${publishedMaterialsCount}</strong><span>materiais</span></article>
    <article><strong>${libraryFavoriteBooks.length}</strong><span>favoritos</span></article>
    <article><strong>${libraryContinueBooks.length}</strong><span>em leitura</span></article>
    <article><strong>${Math.max(120, libraryContinueBooks.length * 35)}</strong><span>XP de leitura</span></article>
  </section>
`;
const infantilExperienceCatalog = typeof window === "undefined" ? null : window.RaizesInfantilExperiences;
const featuredInfantilExperience = infantilExperienceCatalog?.getExperienceDefinition?.("RS-EI4-V1-EXP-001");
const getExperiencePlaybackAsset = (experience) =>
  experience ? infantilExperienceCatalog?.getExperienceAsset?.(experience.openingAssetCode) : null;
const buildFeaturedExperiencePanel = () => {
  if (!featuredInfantilExperience) {
    return "";
  }
  const asset = getExperiencePlaybackAsset(featuredInfantilExperience);
  const progress = typeof window === "undefined" ? null : window.RSGameEngine?.getExperienceProgress?.(featuredInfantilExperience.id);
  const state = infantilExperienceCatalog?.EXPERIENCE_STATES?.[featuredInfantilExperience.availability] || infantilExperienceCatalog?.EXPERIENCE_STATES?.available;
  const pages = featuredInfantilExperience.pages || [];
  return `
    <section class="wide-panel library-experience-panel" aria-labelledby="library-experience-title" data-library-experience="${featuredInfantilExperience.id}">
      <div class="library-experience-media">
        <img src="${asset?.coverPath || featuredLibraryBook.src}" alt="${featuredInfantilExperience.title}" loading="lazy" />
        <span>${featuredInfantilExperience.id}</span>
      </div>
      <div class="library-experience-content">
        <div class="panel-head">
          <h2 id="library-experience-title">Experiencia digital vinculada</h2>
          <a href="book-viewer.html?book=${featuredInfantilExperience.bookId}&page=${pages[0] || 1}">Paginas ${pages.join(", ")}</a>
        </div>
        <span class="library-experience-status">${state?.label || "Disponivel"}</span>
        <h3>${featuredInfantilExperience.title}</h3>
        <p>${featuredInfantilExperience.description}</p>
        <dl>
          <div><dt>Livro</dt><dd>${featuredInfantilExperience.bookTitle}</dd></div>
          <div><dt>Objetivo</dt><dd>${featuredInfantilExperience.objective}</dd></div>
          <div><dt>Campo</dt><dd>${featuredInfantilExperience.fieldOfExperience}</dd></div>
          <div><dt>Progresso</dt><dd>${progress?.percentWatched || 0}% assistido</dd></div>
        </dl>
        ${asset?.provisionalFilePath ? `<p class="library-experience-note">${asset.note}</p>` : ""}
        <div class="library-experience-actions">
          <button type="button" data-open-experience="${featuredInfantilExperience.id}">Viver esta experiencia</button>
          <a href="book-viewer.html?book=${featuredInfantilExperience.bookId}&page=${pages[0] || 1}">Localizar atividade</a>
        </div>
      </div>
    </section>
  `;
};

const getInfantilExperienceAsset = (experience) =>
  experience ? infantilExperienceCatalog?.getExperienceAsset?.(experience.coverAssetCode || experience.openingAssetCode) : null;
const getInfantilUserId = () =>
  typeof window === "undefined" ? "local-demo" : window.RSGameEngine?.experienceProgressStore?.getUserId?.() || "local-demo";
const getInfantilExperienceProgress = (experienceId) =>
  typeof window === "undefined" ? null : window.RSGameEngine?.getExperienceProgress?.(experienceId) || null;
const getInfantilExperienceStatus = (experience) => {
  const progress = getInfantilExperienceProgress(experience.id);
  if (progress?.status === "completed" || progress?.progressPercent >= 90 || progress?.percentWatched >= 90) {
    return { key: "completed", label: "Concluida", percent: 100 };
  }
  if (progress?.status === "in_progress" || progress?.startedAt || progress?.progressPercent > 0 || progress?.percentWatched > 0) {
    return { key: "in-progress", label: "Em andamento", percent: Math.max(1, progress.progressPercent ?? progress.percentWatched ?? 1) };
  }
  return { key: "not-started", label: experience.availability === "unavailable" ? "Indisponivel" : "Nao iniciada", percent: 0 };
};
const getInfantilExperienceAction = (status) =>
  status.key === "completed" ? "Viver novamente" : status.key === "in-progress" ? "Continuar experiencia" : "Viver esta experiencia";
const getInfantilExperienceSearch = (experience) =>
  [
    experience.id,
    experience.title,
    experience.description,
    experience.ageGroup,
    experience.volume,
    experience.unit,
    experience.unitCode,
    experience.unitTitle,
    experience.activityTitle,
    experience.sequenceTitle,
    experience.bookTitle,
    experience.objective,
    experience.pedagogicalObjective,
    experience.fieldOfExperience,
    experience.experienceType,
    experience.pageStart,
    experience.pageEnd,
    ...(experience.bnccSkills || []),
    ...(experience.bnccCodes || []),
    ...(experience.keywords || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
const getInfantilExperienceUrl = (experienceId) => `biblioteca.html?experience=${encodeURIComponent(experienceId)}`;
const allInfantilExperiences = infantilExperienceCatalog?.experienceDefinitions || [];
const officialInfantilBooks = infantilExperienceCatalog?.officialBooks || [];
const availableInfantilExperiences = allInfantilExperiences.filter((experience) => experience.availability === "available" && experience.status === "published");
const featuredPremiumExperience = featuredInfantilExperience || availableInfantilExperiences[0] || allInfantilExperiences[0];
const getOfficialInfantilBook = (bookId) => infantilExperienceCatalog?.getOfficialBook?.(bookId) || officialInfantilBooks.find((book) => book.bookId === bookId || book.id === bookId);
const getExperienceOfficialBook = (experience) => getOfficialInfantilBook(experience?.bookId);
const getExperiencePagesLabel = (experience) => {
  if (experience?.pageStart && experience?.pageEnd) {
    return experience.pageStart === experience.pageEnd ? `Pagina ${experience.pageStart}` : `Paginas ${experience.pageStart} a ${experience.pageEnd}`;
  }
  return experience?.pages?.length ? `Paginas ${experience.pages.join(", ")}` : "Paginas em curadoria";
};
const getBookLibraryUrl = (bookId, page) =>
  `biblioteca.html?book=${encodeURIComponent(bookId)}${page ? `&page=${encodeURIComponent(page)}` : ""}`;
const getBookViewerUrl = (bookId, page) =>
  `book-viewer.html?book=${encodeURIComponent(bookId)}${page ? `&page=${encodeURIComponent(page)}` : ""}`;
const getBookExperiences = (bookId) => infantilExperienceCatalog?.getExperiencesByBook?.(bookId) || allInfantilExperiences.filter((experience) => experience.bookId === bookId);
const getBookPageExperiences = (bookId, page) =>
  page ? infantilExperienceCatalog?.getExperiencesByPage?.(bookId, page) || [] : [];
const getBookUnits = (bookId) => infantilExperienceCatalog?.getBookUnits?.(bookId) || [];
const getExperiencePublicUrl = (code) => infantilExperienceCatalog?.getExperiencePublicUrl?.(code) || `https://app.raizesesaberes.com.br/biblioteca.html?experience=${encodeURIComponent(code)}`;
const getExperienceQrPayload = (code) => infantilExperienceCatalog?.getExperienceQrPayload?.(code) || getExperiencePublicUrl(code);
const getExperienceEditorialLocation = (experience) => {
  const book = getExperienceOfficialBook(experience);
  return {
    book,
    bookTitle: book?.title || experience.bookTitle || "Livro em curadoria",
    volume: book?.volume || experience.volume,
    semester: book?.semester || experience.semester,
    unit: experience.unitTitle || experience.unit || "Unidade em curadoria",
    pages: getExperiencePagesLabel(experience),
    activity: experience.activityTitle || experience.title,
  };
};
const getExperienceResources = (experience) =>
  (experience.resources?.length ? experience.resources : [{ type: "video", assetCode: experience.openingAssetCode, role: "opening" }])
    .map((resource) => ({
      ...resource,
      asset: resource.assetCode ? infantilExperienceCatalog?.getExperienceAsset?.(resource.assetCode) : null,
      activity: resource.activityCode ? infantilExperienceCatalog?.getInteractiveActivityDefinition?.(resource.activityCode) : null,
    }))
    .filter((resource) => resource.assetCode || resource.activityCode);
const renderExperienceResourceActions = (experience, resources) => {
  const hasVideo = resources.some((resource) => resource.type === "video");
  const interactiveResources = resources.filter((resource) => resource.type === "interactive" && resource.activityCode);
  return `
    <div class="bv-profile-actions">
      ${hasVideo ? `<button type="button" data-open-experience="${experience.id}">ASSISTIR HISTORIA</button>` : ""}
      ${interactiveResources.map((resource) => `<button type="button" data-open-interactive-activity="${resource.activityCode}">REALIZAR ATIVIDADE</button>`).join("")}
      ${interactiveResources.map((resource) => `<button type="button" data-open-interactive-activity="${resource.activityCode}" data-interactive-repeat-entry>REPETIR</button>`).join("")}
    </div>
  `;
};
const getProgressSummaryForExperiences = (experiences) =>
  window.RSGameEngine?.getExperienceSummary?.(getInfantilUserId(), experiences) || {
    available: experiences.filter((experience) => experience.availability === "available" && experience.status === "published").length,
    started: 0,
    completed: 0,
    inProgress: 0,
    favorites: 0,
    percent: 0,
  };
const renderExperienceOfficialCard = (experience, { compact = false } = {}) => {
  const asset = getInfantilExperienceAsset(experience);
  const status = getInfantilExperienceStatus(experience);
  const progress = getInfantilExperienceProgress(experience.id);
  const isFavorite = Boolean(progress?.isFavorite);
  const location = getExperienceEditorialLocation(experience);
  const duration = experience.duration ? `${experience.duration}s` : "Em curadoria";
  return `
    <article class="bv-experience-card ${compact ? "is-compact" : ""} ${isFavorite ? "is-favorite" : ""}" data-bv-experience-card data-experience-code="${experience.id}" data-age-group="${experience.ageGroup}" data-volume="${experience.volume}" data-unit="${experience.unit || ""}" data-type="${experience.experienceType || ""}" data-status="${status.key}" data-favorite="${isFavorite ? "true" : "false"}" data-recent="${progress?.lastAccessedAt || ""}" data-search="${getInfantilExperienceSearch(experience)}">
      <a class="bv-experience-cover" href="${getInfantilExperienceUrl(experience.id)}" aria-label="Abrir perfil da experiencia ${experience.title}">
        <img src="${asset?.coverPath || "assets/biblioteca/RAIZES_INFANTIL4_VOL1_BIBLIOTECA.jpg"}" alt="${experience.title}" loading="lazy" />
        <span>${status.label}</span>
      </a>
      <button class="bv-favorite-button" type="button" data-bv-toggle-favorite="${experience.id}" aria-pressed="${isFavorite ? "true" : "false"}">${isFavorite ? "Favorita" : "Favoritar"}</button>
      <div class="bv-experience-body">
        <div class="bv-card-meta">
          <span>${experience.ageGroup.replace("EI", "")} anos</span>
          <span>${experience.volume.replace("V", "Volume ")}</span>
          <span>${duration}</span>
        </div>
        <h3><a href="${getInfantilExperienceUrl(experience.id)}">${experience.title}</a></h3>
        <p>${experience.objective}</p>
        <small>Livro: ${location.bookTitle} · ${location.unit} · ${location.pages}</small>
        <small>Atividade: ${location.activity}</small>
        <div class="bv-card-progress" aria-label="Progresso de ${experience.title}">
          <i><b style="width:${status.percent}%"></b></i>
          <strong>${status.percent}%</strong>
        </div>
        <a class="bv-card-action" href="${getInfantilExperienceUrl(experience.id)}">${getInfantilExperienceAction(status)}</a>
      </div>
    </article>
  `;
};
const renderPremiumLibraryHierarchy = () =>
  infantilExperienceCatalog.INFANTIL_AGE_GROUPS.map((ageGroup) => {
    const experiencesByAge = allInfantilExperiences.filter((experience) => experience.ageGroup === ageGroup);
    return `
      <article class="bv-age-column" data-bv-age-column="${ageGroup}">
        <button type="button" data-bv-filter-age="${ageGroup}">${ageGroup.replace("EI", "")} anos</button>
        ${infantilExperienceCatalog.INFANTIL_VOLUMES.map((volume) => {
          const volumeExperiences = experiencesByAge.filter((experience) => experience.volume === volume);
          return `
            <div class="bv-volume-node">
              <button type="button" data-bv-filter-volume="${volume}">${volume.replace("V", "Volume ")}</button>
              ${volumeExperiences.map((experience) => `
                <a href="${getInfantilExperienceUrl(experience.id)}">
                  <strong>${experience.unit || "Unidade"}</strong>
                  <span>${experience.title}</span>
                </a>
              `).join("")}
            </div>
          `;
        }).join("")}
      </article>
    `;
  }).join("");

const renderBookNotFoundPage = (bookId) => `
  <div class="bv-premium">
    <section class="bv-section">
      <div class="panel-head"><h2>Livro nao encontrado</h2><a>Biblioteca Viva</a></div>
      <p class="bv-empty-state">Nao encontramos o livro ${bookId || ""} no catalogo oficial da colecao.</p>
      <div class="bv-profile-actions"><a class="bv-card-action" href="biblioteca.html">Voltar para a Biblioteca</a></div>
    </section>
  </div>
`;

const renderBookUnit = (unit, requestedPage) => {
  const unitExperiences = unit.experiences || [];
  const publishedExperiences = unitExperiences.filter((experience) => experience.availability === "available" && experience.status === "published");
  const summary = getProgressSummaryForExperiences(unitExperiences);
  const pageExperiences = requestedPage
    ? unitExperiences.filter((experience) => getBookPageExperiences(experience.bookId, requestedPage).some((item) => item.id === experience.id))
    : [];
  const isPageMatch = pageExperiences.length > 0;
  const stateLabel = publishedExperiences.length ? "Disponivel" : unitExperiences.length ? "Em producao" : "Planejada";
  return `
    <details class="bv-book-unit" ${isPageMatch || !requestedPage ? "open" : ""} data-bv-book-unit="${unit.code}">
      <summary>
        <span>${unit.code}</span>
        <strong>${unit.title}</strong>
        <small>${stateLabel} · ${unitExperiences.length} experiencia${unitExperiences.length === 1 ? "" : "s"} · ${summary.percent}% concluido</small>
      </summary>
      <div class="bv-book-unit-body">
        <p>${unit.description || "Unidade vinculada ao percurso editorial do livro."}</p>
        <div class="bv-profile-progress">
          <i><b style="width:${summary.percent}%"></b></i>
          <strong>${summary.percent}%</strong>
          <span>${summary.completed} concluidas</span>
          <span>${summary.available} disponiveis</span>
        </div>
        ${unitExperiences.length ? `
          <div class="bv-experience-grid">
            ${unitExperiences.map((experience) => renderExperienceOfficialCard(experience)).join("")}
          </div>
        ` : `<p class="bv-empty-state">Esta unidade ainda nao possui experiencias publicadas para o aluno.</p>`}
      </div>
    </details>
  `;
};

const renderBookPage = (book, requestedPage) => {
  if (!book) return renderBookNotFoundPage(new URLSearchParams(window.location.search).get("book"));
  const bookExperiences = getBookExperiences(book.bookId);
  const publishedExperiences = bookExperiences.filter((experience) => experience.availability === "available" && experience.status === "published");
  const pageExperiences = requestedPage ? getBookPageExperiences(book.bookId, requestedPage) : [];
  const units = getBookUnits(book.bookId);
  const summary = getProgressSummaryForExperiences(bookExperiences);
  const continueRecord = window.RSGameEngine?.getContinueWatching?.(getInfantilUserId())?.find((record) =>
    bookExperiences.some((experience) => experience.id === record.experienceCode)
  );
  const continueExperience = continueRecord
    ? bookExperiences.find((experience) => experience.id === continueRecord.experienceCode)
    : publishedExperiences[0];
  const highlightExperience = pageExperiences.find((experience) => experience.availability === "available" && experience.status === "published") || pageExperiences[0] || continueExperience;
  return `
    <div class="bv-premium bv-book-page" data-bv-premium data-bv-book-page="${book.bookId}">
      <nav class="bv-profile-breadcrumb" aria-label="Caminho do livro">
        <a href="biblioteca.html">Biblioteca Viva</a>
        <span>Educacao Infantil</span>
        <span>${book.ageGroup.replace("EI", "")} anos</span>
        <strong>${book.subtitle}</strong>
      </nav>

      <section class="bv-book-hero">
        <figure>
          <img src="${book.coverAsset || featuredLibraryBook.src}" alt="${book.title}" />
        </figure>
        <div>
          <span>${book.collectionCode} · ${book.segment}</span>
          <h1>${book.title}</h1>
          <p>${book.subtitle}</p>
          <div class="bv-card-meta">
            <span>${book.ageGroup.replace("EI", "")} anos</span>
            <span>${book.volume.replace("V", "Volume ")}</span>
            <span>${book.semester}o semestre</span>
            <span>${book.status === "available" ? "Disponivel" : "Planejado"}</span>
          </div>
          <div class="bv-profile-progress">
            <i><b style="width:${summary.percent}%"></b></i>
            <strong>${summary.percent}%</strong>
            <span>${summary.completed} concluidas</span>
            <span>${summary.available} disponiveis</span>
          </div>
          <div class="bv-profile-actions">
            ${continueExperience ? `<a class="bv-card-action" href="${getInfantilExperienceUrl(continueExperience.id)}">${getInfantilExperienceStatus(continueExperience).key === "in-progress" ? "Continuar percurso" : "Abrir primeira experiencia"}</a>` : ""}
            <a class="bv-card-action is-secondary" href="${getBookViewerUrl(book.bookId, requestedPage || 1)}">Abrir livro digital</a>
          </div>
        </div>
      </section>

      <section class="bv-progress-panel" aria-label="Progresso do livro">
        <article><strong>${units.length}</strong><span>unidades</span></article>
        <article><strong>${bookExperiences.length}</strong><span>experiencias</span></article>
        <article><strong>${summary.started}</strong><span>iniciadas</span></article>
        <article><strong>${summary.completed}</strong><span>concluidas</span></article>
        <article><strong>${summary.available}</strong><span>disponiveis</span></article>
      </section>

      ${requestedPage ? `
        <section class="bv-section bv-page-match">
          <div class="panel-head"><h2>Pagina ${requestedPage}</h2><a>${pageExperiences.length ? `${pageExperiences.length} experiencia${pageExperiences.length === 1 ? "" : "s"}` : "sem experiencia"}</a></div>
          ${pageExperiences.length ? `
            <p>A Biblioteca localizou os recursos digitais vinculados a esta pagina do livro.</p>
            <div class="bv-experience-grid">
              ${pageExperiences.map((experience, index) => renderExperienceOfficialCard(experience, { compact: index > 0 })).join("")}
            </div>
          ` : `<p class="bv-empty-state">Ainda nao existe experiencia digital vinculada a pagina ${requestedPage} deste livro.</p>`}
        </section>
      ` : ""}

      ${highlightExperience ? `
        <section class="bv-section">
          <div class="panel-head"><h2>Experiencia principal</h2><a>${getExperiencePagesLabel(highlightExperience)}</a></div>
          <div class="bv-experience-grid">
            ${renderExperienceOfficialCard(highlightExperience)}
          </div>
        </section>
      ` : ""}

      <section class="bv-section">
        <div class="panel-head"><h2>Unidades do livro</h2><a>${book.catalogTitle || book.subtitle}</a></div>
        <div class="bv-book-units">
          ${units.map((unit) => renderBookUnit(unit, requestedPage)).join("")}
        </div>
      </section>
    </div>
  `;
};

const renderPremiumLibraryHome = () => {
  const userId = getInfantilUserId();
  const summary = window.RSGameEngine?.getExperienceSummary?.(userId, allInfantilExperiences) || {
    available: availableInfantilExperiences.length,
    started: 0,
    completed: 0,
    inProgress: 0,
    favorites: 0,
    percent: 0,
  };
  const historyRecords = window.RSGameEngine?.getUserExperienceHistory?.(userId) || [];
  const continueRecords = window.RSGameEngine?.getContinueWatching?.(userId) || [];
  const favoriteCodes = window.RSGameEngine?.getUserFavorites?.(userId) || [];
  const continueExperiences = continueRecords
    .map((record) => allInfantilExperiences.find((experience) => experience.id === record.experienceCode))
    .filter(Boolean)
    .slice(0, 3);
  const favoriteExperiences = favoriteCodes
    .map((code) => allInfantilExperiences.find((experience) => experience.id === code))
    .filter(Boolean)
    .slice(0, 4);
  const recent = historyRecords
    .map((record) => ({ experience: allInfantilExperiences.find((experience) => experience.id === record.experienceCode), progress: record }))
    .filter((item) => item.experience)
    .slice(0, 4);
  const lastExperience = recent[0]?.experience || featuredPremiumExperience;
  const heroAsset = getInfantilExperienceAsset(featuredPremiumExperience);
  const featuredBook = getExperienceOfficialBook(featuredPremiumExperience) || officialInfantilBooks[0];
  const relatedRecommendations = (lastExperience.relatedExperienceCodes || [])
    .map((code) => allInfantilExperiences.find((experience) => experience.id === code))
    .filter((experience) => experience && experience.availability !== "unavailable");
  const recommended = [
    ...relatedRecommendations,
    ...availableInfantilExperiences.filter((experience) =>
      experience.id !== lastExperience.id &&
      experience.ageGroup === lastExperience.ageGroup &&
      experience.volume === lastExperience.volume &&
      getInfantilExperienceStatus(experience).key !== "completed"
    ),
    ...availableInfantilExperiences.filter((experience) =>
      experience.id !== lastExperience.id &&
      experience.ageGroup === lastExperience.ageGroup &&
      getInfantilExperienceStatus(experience).key !== "completed"
    ),
    featuredPremiumExperience,
  ]
    .filter(Boolean)
    .filter((experience, index, list) => list.findIndex((item) => item.id === experience.id) === index)
    .slice(0, 6);
  const continueList = continueExperiences.length ? continueExperiences : [featuredPremiumExperience];
  return `
    <div class="bv-premium" data-bv-premium>
      <section class="bv-hero">
        <div class="bv-hero-copy">
          <span>Biblioteca Viva Premium</span>
          <h1>Ola, Pedro. Sua proxima descoberta esta pronta.</h1>
          <p>Livros, videos, jogos e atividades organizados por idade, volume e unidade para voce nunca se perder.</p>
          <div class="bv-hero-actions">
            <a href="${getInfantilExperienceUrl((continueExperiences[0] || featuredPremiumExperience).id)}">${continueExperiences.length ? "Continuar experiencia" : "Comecar jornada"}</a>
            <button type="button" data-bv-focus-search>Buscar</button>
          </div>
        </div>
        <a class="bv-hero-feature" href="${getInfantilExperienceUrl(featuredPremiumExperience.id)}">
          <img src="${heroAsset?.coverPath || featuredLibraryBook.src}" alt="${featuredPremiumExperience.title}" />
          <span>Destaque da semana</span>
          <strong>${featuredPremiumExperience.title}</strong>
          <small>${featuredPremiumExperience.bookTitle}</small>
        </a>
      </section>

      <section class="bv-progress-panel" aria-label="Progresso visual da Biblioteca Viva">
        <article data-bv-summary="percent"><strong>${summary.percent}%</strong><span>concluido</span><i><b style="width:${summary.percent}%"></b></i></article>
        <article data-bv-summary="started"><strong>${summary.started}</strong><span>iniciadas</span></article>
        <article data-bv-summary="completed"><strong>${summary.completed}</strong><span>concluidas</span></article>
        <article data-bv-summary="inProgress"><strong>${summary.inProgress}</strong><span>em andamento</span></article>
        <article data-bv-summary="favorites"><strong>${summary.favorites}</strong><span>favoritas</span></article>
        <article data-bv-summary="available"><strong>${summary.available}</strong><span>disponiveis</span></article>
      </section>

      <section class="bv-control-panel" aria-label="Busca e filtros da Biblioteca Viva">
        <label class="bv-search"><span>Buscar experiencia</span><input data-bv-search type="search" placeholder="Titulo, codigo, idade, volume, unidade, habilidade..." /></label>
        <div class="bv-filter-row" aria-label="Filtros por faixa etaria">
          <button type="button" data-bv-filter-age="all" class="is-active">Todas</button>
          ${infantilExperienceCatalog.INFANTIL_AGE_GROUPS.map((ageGroup) => `<button type="button" data-bv-filter-age="${ageGroup}">${ageGroup.replace("EI", "")} anos</button>`).join("")}
        </div>
        <div class="bv-filter-row" aria-label="Filtros por volume e status">
          <button type="button" data-bv-filter-volume="all" class="is-active">Todos volumes</button>
          ${infantilExperienceCatalog.INFANTIL_VOLUMES.map((volume) => `<button type="button" data-bv-filter-volume="${volume}">${volume.replace("V", "Volume ")}</button>`).join("")}
          <button type="button" data-bv-filter-status="completed">Concluidas</button>
          <button type="button" data-bv-filter-status="in-progress">Em andamento</button>
          <button type="button" data-bv-filter-status="favorite">Favoritas</button>
          <button type="button" data-bv-filter-status="recent">Recentes</button>
        </div>
      </section>

      <section class="bv-section bv-continue">
        <div class="panel-head"><h2>Continuar de onde parou</h2><a href="${featuredBook ? getBookLibraryUrl(featuredBook.bookId) : featuredLibraryBook.href}">Abrir livro</a></div>
        <div class="bv-continue-grid">
          ${continueList.map((experience) => renderExperienceOfficialCard(experience)).join("")}
          <article class="bv-reading-card">
            <img src="${featuredBook?.coverAsset || featuredLibraryBook.src}" alt="${featuredBook?.title || featuredLibraryBook.title}" />
            <div><span>Leitura vinculada</span><h3>${featuredBook?.title || featuredLibraryBook.title}</h3><p>${featuredBook?.subtitle || `${featuredLibraryBook.year} · ${featuredLibraryBook.type}`}</p><a href="${featuredBook ? getBookLibraryUrl(featuredBook.bookId) : featuredLibraryBook.href}">Continuar leitura</a></div>
          </article>
        </div>
      </section>

      <section class="bv-section">
        <div class="panel-head"><h2>Experiencias recomendadas</h2><a>${recommended.length} itens</a></div>
        <div class="bv-experience-grid" data-bv-results>
          ${recommended.map((experience) => renderExperienceOfficialCard(experience)).join("")}
        </div>
        <p class="bv-empty-state" data-bv-empty hidden>Nenhuma experiencia encontrada com estes filtros.</p>
      </section>

      <section class="bv-section bv-two-columns">
        <div>
          <div class="panel-head"><h2>Ultimas acessadas</h2><a>recentes</a></div>
          <div class="bv-mini-list">
            ${(recent.length ? recent.map(({ experience }) => experience) : [featuredPremiumExperience]).map((experience) => renderExperienceOfficialCard(experience, { compact: true })).join("")}
          </div>
        </div>
        <div>
          <div class="panel-head"><h2>Favoritos</h2><a>${favoriteExperiences.length} salvos</a></div>
          <div class="bv-mini-list">
            ${favoriteExperiences.length ? favoriteExperiences.map((experience) => renderExperienceOfficialCard(experience, { compact: true })).join("") : `<p class="bv-empty-state">Toque em Favoritar para guardar suas experiencias preferidas.</p>`}
          </div>
        </div>
      </section>

      <section class="bv-section">
        <div class="panel-head"><h2>Navegacao por colecao</h2><a>Educacao Infantil</a></div>
        <div class="bv-breadcrumb-map" aria-label="Educacao Infantil organizada por idade, volume, unidade e experiencia">
          <strong>Educacao Infantil</strong>
          <span>↓</span>
          <div class="bv-age-map">${renderPremiumLibraryHierarchy()}</div>
        </div>
      </section>
    </div>
  `;
};
const renderExperienceProfilePage = (experience) => {
  const asset = getInfantilExperienceAsset(experience);
  const related = (experience.relatedExperienceCodes || [])
    .map((code) => infantilExperienceCatalog?.getExperienceDefinition?.(code))
    .filter(Boolean);
  const status = getInfantilExperienceStatus(experience);
  const progress = getInfantilExperienceProgress(experience.id);
  const primaryAction = getInfantilExperienceAction(status);
  const lastAccessed = progress?.lastAccessedAt ? new Date(progress.lastAccessedAt).toLocaleDateString("pt-BR") : "Ainda nao acessada";
  const location = getExperienceEditorialLocation(experience);
  const resources = getExperienceResources(experience);
  const publicUrl = getExperiencePublicUrl(experience.id);
  const qrPayload = getExperienceQrPayload(experience.id);
  return `
    <div class="bv-profile" data-bv-profile="${experience.id}">
      <nav class="bv-profile-breadcrumb" aria-label="Caminho da experiencia">
        <a href="biblioteca.html">Biblioteca Viva</a>
        <a href="${location.book ? getBookLibraryUrl(location.book.bookId) : "biblioteca.html"}">${location.bookTitle}</a>
        <span>${experience.ageGroup.replace("EI", "")} anos</span>
        <span>${experience.volume.replace("V", "Volume ")}</span>
        <span>${location.unit}</span>
        <strong>${experience.title}</strong>
      </nav>
      <section class="bv-profile-hero">
        <div>
          <span>${experience.id}</span>
          <h1>${experience.title}</h1>
          <p>${experience.description}</p>
          <div class="bv-card-meta">
            <span>${experience.ageGroup.replace("EI", "")} anos</span>
            <span>${experience.volume.replace("V", "Volume ")}</span>
            <span>${experience.duration || 0}s</span>
            <span>${status.label}</span>
          </div>
          <div class="bv-profile-progress">
            <i><b style="width:${status.percent}%"></b></i>
            <strong>${status.percent}%</strong>
            <span>Ultimo acesso: ${lastAccessed}</span>
            <span>Repeticoes: ${progress?.repeatCount || 0}</span>
          </div>
          <div class="bv-profile-actions">
            <button type="button" data-open-experience="${experience.id}">${primaryAction}</button>
            ${resources.filter((resource) => resource.type === "interactive" && resource.activityCode).map((resource) => `<button type="button" data-open-interactive-activity="${resource.activityCode}">REALIZAR ATIVIDADE</button>`).join("")}
            <button type="button" data-bv-toggle-favorite="${experience.id}" aria-pressed="${progress?.isFavorite ? "true" : "false"}">${progress?.isFavorite ? "Favorita" : "Favoritar"}</button>
          </div>
        </div>
        <figure>
          <img src="${asset?.coverPath || featuredLibraryBook.src}" alt="${experience.title}" />
          <figcaption>${experience.unit || "Unidade em curadoria"}</figcaption>
        </figure>
      </section>
      <section class="bv-profile-grid">
        <article><h2>Localizacao editorial</h2><p>Livro: ${location.bookTitle}</p><p>${location.volume?.replace("V", "Volume ")} · ${location.unit} · ${location.pages}</p><p>Atividade: ${location.activity}</p><a href="${getBookLibraryUrl(experience.bookId, experience.pageStart || experience.pages?.[0] || 1)}">Ver no percurso do livro</a></article>
        <article><h2>Atividade original</h2><p>${experience.activityDescription || experience.description}</p><p>${experience.sequenceTitle || ""}</p><a href="${getBookViewerUrl(experience.bookId || "livro-005", experience.pageStart || experience.pages?.[0] || 1)}">Abrir paginas no livro digital</a></article>
        <article><h2>Comando para o aluno</h2><p>${experience.studentInstruction || experience.instructions}</p></article>
        <article><h2>Objetivo pedagogico</h2><p>${experience.pedagogicalObjective || experience.objective}</p></article>
        <article><h2>Campos de experiencia</h2><ul>${(experience.experienceFields?.length ? experience.experienceFields : [experience.fieldOfExperience || "Em curadoria"]).map((field) => `<li>${field}</li>`).join("")}</ul></article>
        <article><h2>Habilidades BNCC</h2><ul>${((experience.bnccCodes?.length ? experience.bnccCodes : experience.bnccSkills)?.length ? (experience.bnccCodes?.length ? experience.bnccCodes : experience.bnccSkills) : ["Em curadoria"]).map((skill) => `<li>${skill}</li>`).join("")}</ul></article>
        <article><h2>Recursos digitais</h2><ul>${resources.map((resource) => `<li>${resource.role} · ${resource.type} · ${resource.activity?.title || resource.asset?.title || resource.activityCode || resource.assetCode}</li>`).join("")}</ul>${renderExperienceResourceActions(experience, resources)}</article>
        <article><h2>Materiais complementares</h2><ul>${(experience.materials?.length ? experience.materials : ["Materiais em curadoria"]).map((material) => `<li>${material}</li>`).join("")}</ul></article>
        <article><h2>URL publica e QR Code</h2><p>${publicUrl}</p><small>Payload QR: ${qrPayload}</small></article>
        <article><h2>Livro do Professor</h2><p>${experience.teacherGuidance?.teacherBookId || "Vinculo em preparacao"}</p><ul>${(experience.teacherGuidance?.materials || ["Orientacoes em curadoria"]).map((item) => `<li>${item}</li>`).join("")}</ul></article>
        <article><h2>Historico resumido</h2><ul>${(progress?.history?.length ? progress.history.slice(-4).reverse().map((item) => `${item.event} · ${new Date(item.at).toLocaleDateString("pt-BR")} · ${item.progressPercent || 0}%`) : ["Sem historico para esta experiencia"]).map((item) => `<li>${item}</li>`).join("")}</ul></article>
      </section>
      <section class="bv-section">
        <div class="panel-head"><h2>Experiencias relacionadas</h2><a>${related.length || "em curadoria"}</a></div>
        <div class="bv-experience-grid">
          ${(related.length ? related : allInfantilExperiences.filter((candidate) => candidate.id !== experience.id).slice(0, 3)).map((item) => renderExperienceOfficialCard(item)).join("")}
        </div>
      </section>
    </div>
  `;
};
const renderPremiumLibrary = () => {
  if (!infantilExperienceCatalog || !featuredPremiumExperience) {
    return `
      <section class="bv-section">
        <div class="panel-head"><h2>Biblioteca Viva</h2><a>catalogo carregando</a></div>
        <p class="bv-empty-state">O catalogo de experiencias infantis precisa ser carregado antes da Biblioteca Viva Premium.</p>
      </section>
    `;
  }
  const params = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const requestedExperience = params.get("experience");
  const requestedBook = params.get("book");
  const requestedPage = Number(params.get("page")) || null;
  const experience = requestedExperience ? infantilExperienceCatalog?.getExperienceDefinition?.(requestedExperience) : null;
  if (requestedExperience) {
    return experience ? renderExperienceProfilePage(experience) : `
      <section class="bv-section">
        <div class="panel-head"><h2>Experiencia nao encontrada</h2><a>${requestedExperience}</a></div>
        <p class="bv-empty-state">Esta experiencia ainda nao existe no catalogo oficial.</p>
      </section>
    `;
  }
  if (requestedBook) {
    return renderBookPage(getOfficialInfantilBook(requestedBook), requestedPage);
  }
  return renderPremiumLibraryHome();
};
const library2TeacherPanel = `
  <section class="wide-panel library-2-ops">
    <div class="panel-head"><h2>Professor e Familia</h2><a>acompanhamento</a></div>
    <div class="library-2-ops-grid">
      <article>
        <span>Professor</span>
        <h3>Indique livros para turmas</h3>
        <p>Selecione materiais, acompanhe progresso e conecte o guia do professor ao planejamento semanal.</p>
        <a href="professor.html">Abrir painel do professor</a>
      </article>
      <article>
        <span>Familia</span>
        <h3>Acompanhe a leitura em casa</h3>
        <p>Veja livros iniciados, progresso, conquistas e proximas recomendacoes para cada estudante.</p>
        <a href="familia.html">Abrir painel da familia</a>
      </article>
      <article>
        <span>Universidade</span>
        <h3>Materiais ligados aos cursos</h3>
        <p>Use a formacao docente para sugerir livros, guias e trilhas de leitura relacionadas.</p>
        <a href="universidade.html">Abrir Universidade</a>
      </article>
    </div>
  </section>
`;

const routeKeyByHref = {
  "plataforma.html": "plataforma",
  "aluno.html": "aluno",
  "aluno-atividades.html": "alunoAtividades",
  "arvore.html": "arvore",
  "missao.html": "missao",
  "jogos.html": "jogos",
  "perfil.html": "perfil",
  "biblioteca.html": "biblioteca",
  "universidade.html": "universidade",
  "curadoria.html": "curadoria",
  "book-viewer.html": "viewer",
  "admin.html": "admin",
  "escola.html": "escolaColetiva",
  "educacao-infantil.html": "educacaoInfantil",
  "professor.html": "professor",
  "professor-turma.html": "professorTurma",
  "professor-aluno.html": "professorAluno",
  "atividades.html": "atividades",
  "motor-atividade.html": "motorAtividade",
  "admin-atividades.html": "adminAtividades",
  "avalia.html": "avalia",
  "secretaria.html": "secretaria",
  "gestor.html": "gestor",
  "familia.html": "familia",
};

const ecosystemModuleLinks = (activeKey, environmentKey = "") => {
  const modulesForEnvironment =
    environmentKey === "aluno"
      ? [
          ["aluno.html", "Inicio"],
          ["missao.html", "Missao do Dia"],
          ["arvore.html", "Minha Arvore"],
          ["biblioteca.html", "Biblioteca"],
          ["jogos.html", "Jogar e Descobrir"],
          ["perfil.html", "Perfil"],
          ["familia.html", "Familia"],
        ]
      : ecosystemModules;
  return modulesForEnvironment
    .map(([href, label]) => {
      const isActive = routeKeyByHref[href] === activeKey;
      return `<a class="${isActive ? "is-active" : ""}" href="${href}">${label}</a>`;
    })
    .join("");
};

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

const pilotProfiles = {
  teacher: {
    id: "teacher-pilot-helena",
    role: "professor",
    name: "Helena Martins",
    displayName: "Professora Helena",
    greeting: "OLA, PROFESSORA HELENA!",
  },
  class: {
    id: "infantil-4a",
    name: "Infantil 4 A",
    shift: "Manha",
  },
  student: {
    id: "student-demo-pedro",
    role: "aluno",
    name: "Pedro",
    fullName: "Pedro Henrique",
    avatar: "assets/aluno/oficial-avatar-aluno.png",
    classId: "infantil-4a",
    className: "Infantil 4 A",
    pendingActivities: 3,
    completedActivities: 4,
    progress: 24,
  },
};

// Supabase-ready fallback view model. Replace this object with fetched records when the backend is connected.
const studentDashboardData = {
  tree: knowledgeTreeFixtures.pedro,
  profile: {
    name: pilotProfiles.student.name,
    greeting: "Que alegria ter voce aqui hoje!",
    avatar: pilotProfiles.student.avatar,
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
    title: "Volume 1",
    subtitle: "Educacao Infantil 4 anos",
    progress: 45,
    cover: "assets/biblioteca/RAIZES_INFANTIL4_VOL1_BIBLIOTECA.jpg",
    href: "book-viewer.html?book=livro-005",
  },
  libraryBanner: "assets/aluno/oficial-biblioteca-banner-v2.png",
  library: [
    { title: "Infantil 4 - Volume 1", cover: "assets/biblioteca/RAIZES_INFANTIL4_VOL1_BIBLIOTECA.jpg", href: "book-viewer.html?book=livro-005" },
    { title: "Infantil 4 - Volume 2", cover: "assets/biblioteca/RAIZES_INFANTIL4_VOL2_BIBLIOTECA.jpg", href: "book-viewer.html?book=livro-006" },
    { title: "Infantil 5 - Volume 1", cover: "assets/biblioteca/RAIZES_INFANTIL5_VOL1_BIBLIOTECA.jpg", href: "book-viewer.html?book=livro-007" },
    { title: "Infantil 5 - Volume 2", cover: "assets/biblioteca/RAIZES_INFANTIL5_VOL2_BIBLIOTECA.jpg", href: "book-viewer.html?book=livro-008" },
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
    { label: "Continuar Leitura", detail: "Retome onde parou", icon: "📖", href: "book-viewer.html?book=livro-005" },
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

const profileAccessConfig = {
  aluno: {
    logoAlt: "Raizes e Saberes Educacional",
    eyebrow: "Ambiente do aluno",
    name: "Pedro",
    search: "Buscar livros, jogos, atividades...",
    homeHref: "aluno.html",
    quickTitle: "Acessos rapidos",
    quick: [
      { label: "Continuar atividade", href: "aluno-atividades.html", tone: "green" },
      { label: "Ver minha arvore", href: "arvore.html", tone: "green" },
      { label: "Abrir livro", href: "biblioteca.html", tone: "blue" },
      { label: "Jogar", href: "jogos.html", tone: "purple" },
      { label: "Meu perfil", href: "perfil.html", tone: "teal" },
    ],
    tabs: [
      { label: "Inicio", href: "aluno.html" },
      { label: "Missao do Dia", href: "missao.html" },
      { label: "Minha Arvore", href: "arvore.html" },
      { label: "Biblioteca", href: "biblioteca.html" },
      { label: "Jogos", href: "jogos.html" },
      { label: "Perfil", href: "perfil.html" },
      { label: "Familia", href: "familia.html" },
      { label: "Atividades", href: "aluno-atividades.html" },
    ],
  },
  professor: {
    logoAlt: "Raizes e Saberes Educacional",
    eyebrow: "Ambiente professor",
    name: "Professora Helena",
    search: "Buscar conteudos, alunos, turmas, experiencias...",
    homeHref: "professor.html",
    quickTitle: "Acessos rapidos",
    quick: [
      { label: "Atribuir atividade", href: "atividades.html", tone: "green" },
      { label: "Abrir minha turma", href: "professor-turma.html", tone: "green" },
      { label: "Criar planejamento", href: "professor.html?view=planejamentos", tone: "blue" },
      { label: "Ver producoes", href: "professor-aluno.html?id=pedro", tone: "purple" },
      { label: "Abrir biblioteca", href: "biblioteca.html", tone: "orange" },
      { label: "Ver relatorios", href: "professor.html?view=relatorios", tone: "teal" },
    ],
    tabs: [
      { label: "Inicio", href: "professor.html" },
      { label: "Minha Turma", href: "professor-turma.html" },
      { label: "Alunos", href: "professor-aluno.html?id=pedro" },
      { label: "Biblioteca", href: "biblioteca.html" },
      { label: "Atividades", href: "atividades.html" },
      { label: "Experiencias", href: "biblioteca.html#acervo-completo" },
      { label: "Jogos", href: "jogos.html" },
      { label: "Planejamentos", href: "professor.html?view=planejamentos" },
      { label: "Avaliacoes", href: "avalia.html" },
      { label: "Relatorios", href: "professor.html?view=relatorios" },
      { label: "Universidade", href: "universidade.html" },
    ],
  },
};

const profileConstructionCopy = {
  aluno: {
    familia: ["Familia", "Este espaco vai receber comunicados e acompanhamento familiar assim que a proxima etapa for liberada."],
  },
  professor: {
    planejamentos: ["Planejamentos", "Este modulo esta reservado para o planejamento pedagogico completo da professora."],
    relatorios: ["Relatorios", "Este modulo esta reservado para indicadores, devolutivas e acompanhamento da turma."],
    avaliacoes: ["Avaliacoes", "Este modulo esta reservado para rotinas de avaliacao e acompanhamento."],
    mensagens: ["Mensagens", "Este modulo esta reservado para comunicados e devolutivas."],
  },
};

const getProfileViewParam = () => {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("view") || "";
};

const renderProfileTopTabs = (role) => {
  const config = profileAccessConfig[role];
  return `
    <nav class="profile-top-tabs" aria-label="Abas de navegacao ${config.eyebrow}">
      ${config.tabs.map((tab, index) => `<a class="${index === 0 ? "is-active" : ""}" href="${tab.href}">${tab.label}</a>`).join("")}
    </nav>
  `;
};

const renderProfileSidebar = (role) => {
  const config = profileAccessConfig[role];
  return `
    <aside class="profile-access-sidebar" aria-label="${config.quickTitle}">
      <a class="profile-access-logo" href="${config.homeHref}" aria-label="Voltar ao inicio">
        <img src="logo-app.png" alt="${config.logoAlt}" loading="eager" decoding="async" onerror="this.hidden=true" />
      </a>
      <div class="profile-access-identity">
        <span>${config.eyebrow}</span>
        <strong>${config.name}</strong>
      </div>
      <div class="profile-quick-links">
        <h2>${config.quickTitle}</h2>
        ${config.quick.map((item) => `<a class="profile-quick-link is-${item.tone}" href="${item.href}">${item.label}</a>`).join("")}
      </div>
      <button class="profile-sidebar-logout" type="button" data-platform-logout>Sair</button>
    </aside>
  `;
};

const renderProfileHeader = (role) => {
  const config = profileAccessConfig[role];
  return `
    <header class="profile-access-header" aria-label="Navegacao principal">
      <label class="profile-access-search">
        <span>Buscar</span>
        <input type="search" placeholder="${config.search}" />
      </label>
      ${renderProfileTopTabs(role)}
    </header>
  `;
};

const renderProfileConstructionState = (role) => {
  const view = getProfileViewParam();
  const copy = profileConstructionCopy[role]?.[view];
  if (!copy) return "";
  const config = profileAccessConfig[role];
  return `
    <section class="profile-construction-state" aria-label="${copy[0]} em construcao">
      <span>Em construcao</span>
      <h2>${copy[0]}</h2>
      <p>${copy[1]}</p>
      <a href="${config.homeHref}">Voltar ao inicio</a>
    </section>
  `;
};

const renderProfileShell = (role, content) => `
  <section class="profile-platform-page ${role === "professor" ? "professor-profile-page" : "student-profile-page"}">
    <div class="profile-platform-intro">
      <div>
        <span>${profileAccessConfig[role].eyebrow}</span>
        <h1>${profileAccessConfig[role].name}</h1>
      </div>
      <div class="profile-platform-quick" aria-label="${profileAccessConfig[role].quickTitle}">
        ${profileAccessConfig[role].quick.map((item) => `<a class="profile-quick-link is-${item.tone}" href="${item.href}">${item.label}</a>`).join("")}
      </div>
    </div>
    ${renderProfileConstructionState(role)}
    ${content}
  </section>
`;

const renderStudentProfilePage = () => {
  const content = `
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
  `;
  return renderProfileShell("aluno", content);
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
  { className: "profile-hotspot-medal-leitor", href: "book-viewer.html?book=livro-005", label: "Abrir conquista Leitor Iniciante" },
  { className: "profile-hotspot-medal-natureza", href: "perfil.html", label: "Abrir conquista Curioso por Natureza" },
  { className: "profile-hotspot-xp-panel", href: "perfil.html", label: "Abrir painel de XP e proximo nivel" },
  { className: "profile-hotspot-last-activity", href: "book-viewer.html?book=livro-005", label: "Abrir ultima atividade Leitura Linguagem" },
  { className: "profile-hotspot-games-summary", href: "jogos.html", label: "Abrir jogos concluidos" },
  { className: "profile-hotspot-xp-summary", href: "perfil.html", label: "Abrir XP total" },
  { className: "profile-hotspot-achievements-summary", href: "perfil.html", label: "Abrir conquistas" },
  { className: "profile-hotspot-game-caixa", href: "jogos.html", label: "Abrir jogo A Caixa Misteriosa" },
  { className: "profile-hotspot-game-cesta", href: "jogos.html", label: "Abrir jogo Organizando a Cesta" },
  { className: "profile-hotspot-game-jardim", href: "jogos.html", label: "Abrir jogo Jardim das Descobertas" },
  { className: "profile-hotspot-game-ponte", href: "jogos.html", label: "Abrir jogo Construindo a Ponte" },
  { className: "profile-hotspot-game-cores", href: "jogos.html", label: "Abrir jogo As Cores do Jardim" },
];

const professorProfileHotspots = [
  { className: "professor-hotspot-avatar", href: "professor.html", label: "Abrir perfil da professora Helena" },
  { className: "professor-hotspot-turmas-top", href: "professor-turma.html", label: "Abrir minhas turmas" },
  { className: "professor-hotspot-planejadas-top", href: "atividades.html", label: "Abrir atividades planejadas" },
  { className: "professor-hotspot-concluidas-top", href: "professor.html?view=relatorios", label: "Abrir atividades concluidas" },
  { className: "professor-hotspot-xp-top", href: "universidade.html", label: "Abrir formacao e XP" },
  { className: "professor-hotspot-turma-a", href: "professor-turma.html", label: "Abrir Infantil 5 anos A" },
  { className: "professor-hotspot-turma-b", href: "professor-turma.html", label: "Abrir Infantil 5 anos B" },
  { className: "professor-hotspot-turma-4a", href: "professor-turma.html", label: "Abrir 4 Ano A" },
  { className: "professor-hotspot-turma-2a", href: "professor-turma.html", label: "Abrir 2 Ano A" },
  { className: "professor-hotspot-turma-3b", href: "professor-turma.html", label: "Abrir 3 Ano B" },
  { className: "professor-hotspot-seg", href: "professor.html?view=planejamentos", label: "Abrir planejamento de segunda" },
  { className: "professor-hotspot-ter", href: "professor.html?view=planejamentos", label: "Abrir planejamento de terca" },
  { className: "professor-hotspot-qua", href: "professor.html?view=planejamentos", label: "Abrir planejamento de quarta" },
  { className: "professor-hotspot-qui", href: "professor.html?view=planejamentos", label: "Abrir planejamento de quinta" },
  { className: "professor-hotspot-sex", href: "professor.html?view=planejamentos", label: "Abrir planejamento de sexta" },
  { className: "professor-hotspot-aula-1", href: "biblioteca.html", label: "Abrir aula de Linguagem" },
  { className: "professor-hotspot-aula-2", href: "biblioteca.html", label: "Abrir aula de Matematica" },
  { className: "professor-hotspot-aula-3", href: "biblioteca.html", label: "Abrir aula de Ciencias" },
  { className: "professor-hotspot-aula-4", href: "biblioteca.html", label: "Abrir aula de Historia" },
  { className: "professor-hotspot-aula-5", href: "biblioteca.html", label: "Abrir aula de Projeto" },
  { className: "professor-hotspot-pendente-corrigir", href: "professor.html?view=avaliacoes", label: "Abrir atividades para corrigir" },
  { className: "professor-hotspot-pendente-revisar", href: "atividades.html", label: "Abrir atividades para revisar" },
  { className: "professor-hotspot-pendente-devolutivas", href: "professor.html?view=mensagens", label: "Abrir devolutivas" },
  { className: "professor-hotspot-pendente-publicar", href: "atividades.html", label: "Abrir atividades para publicar" },
  { className: "professor-hotspot-correcoes", href: "professor.html?view=relatorios", label: "Abrir correcoes" },
  { className: "professor-hotspot-book-1", href: "book-viewer.html?book=livro-001", label: "Abrir livro integrado 1" },
  { className: "professor-hotspot-book-2", href: "book-viewer.html?book=livro-002", label: "Abrir livro integrado 2" },
  { className: "professor-hotspot-book-3", href: "book-viewer.html?book=livro-003", label: "Abrir livro integrado 3" },
  { className: "professor-hotspot-book-4", href: "book-viewer.html?book=livro-004", label: "Abrir livro integrado 4" },
  { className: "professor-hotspot-book-5", href: "book-viewer.html?book=livro-005", label: "Abrir livro integrado 5" },
  { className: "professor-hotspot-bncc", href: "universidade.html", label: "Abrir conteudos alinhados a BNCC" },
];

const renderProfessorProfilePage = () => {
  const content = `
    <section class="professor-dashboard" aria-label="Perfil da Professora Helena">
      <img
        src="assets/professor/professor-dashboard.png"
        alt="Perfil da Professora Helena com turmas, planejamento semanal, proximas aulas, atividades pendentes, correcoes e biblioteca integrada"
        loading="eager"
        decoding="async"
        onerror="this.hidden=true"
      />
      ${professorProfileHotspots.map((hotspot) => `<a class="professor-hotspot ${hotspot.className}" href="${hotspot.href}" aria-label="${hotspot.label}"></a>`).join("")}
    </section>
  `;
  return renderProfileShell("professor", content);
};

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
      ${renderStudentUniversalActivities()}
      ${renderUniversalActivityStudentPortfolio()}
    </div>
    ${renderStudentQuickAccess(studentDashboardView.quickAccess)}
  </div>
`;

const teacherWorkspaceNav = [
  ["heading", "Minhas Turmas"],
  ["inicio", "Inicio", "home"],
  ["turmas", "Minhas Turmas", "users"],
  ["heading", "Conteudos"],
  ["biblioteca", "Biblioteca Viva", "book"],
  ["atividades", "Atividades Imprimiveis", "doc"],
  ["experiencias", "Experiencias", "flask"],
  ["jogos", "Jogos", "game"],
  ["heading", "Trabalho Pedagogico"],
  ["planejamentos", "Planejamentos", "calendar"],
  ["avaliacoes", "Avaliacoes", "check"],
  ["relatorios", "Relatorios", "chart"],
  ["heading", "Formacao"],
  ["universidade", "Universidade", "cap"],
  ["heading", "Sistema"],
  ["configuracoes", "Configuracoes", "gear"],
];

const teacherWorkspaceClasses = [
  { id: pilotProfiles.class.id, name: pilotProfiles.class.name, students: 1, progress: pilotProfiles.student.progress, next: "Atividades de Pedro", alert: `${pilotProfiles.student.pendingActivities} atividades pendentes` },
];

const teacherWorkspaceLessons = [
  { time: "07:30", title: "Acompanhamento de Pedro", className: pilotProfiles.class.name, status: "pronta", resource: "Motor Universal" },
];

const teacherWorkspaceStudents = [
  {
    id: pilotProfiles.student.id,
    name: pilotProfiles.student.name,
    fullName: pilotProfiles.student.fullName,
    className: pilotProfiles.student.className,
    avatar: pilotProfiles.student.avatar,
    progress: pilotProfiles.student.progress,
    pendingActivities: pilotProfiles.student.pendingActivities,
    completedActivities: pilotProfiles.student.completedActivities,
    note: "piloto real",
  },
];

const teacherWorkspaceTasks = [
  { label: "Atividades pendentes na turma", count: pilotProfiles.student.pendingActivities, view: "turmas" },
  { label: "Producoes concluidas", count: pilotProfiles.student.completedActivities, view: "relatorios" },
];

const getTeacherBibliotecaResources = () => {
  const catalog = typeof window === "undefined" ? null : window.RaizesInfantilExperiences;
  const books = (catalog?.officialBooks || []).filter((book) => book.status === "available").slice(0, 4);
  const experiences = (catalog?.experienceDefinitions || []).filter((experience) => experience.status === "published").slice(0, 4);
  const activities = (catalog?.interactiveActivityDefinitions || []).slice(0, 6);
  return { books, experiences, activities };
};

const renderTeacherCard = () => `
  <article class="tw-teacher-card">
    <img src="logo-sidebar-dark.png" alt="Raizes e Saberes" onerror="this.hidden=true" />
    <div><span>Professora</span><strong>${pilotProfiles.teacher.displayName}</strong><small>Educacao Infantil</small></div>
  </article>
`;

const getTeacherFirstName = () => {
  const session = getPlatformSession();
  const candidate = session.role === "professor" ? session.name || session.email : pilotProfiles.teacher.displayName;
  const normalized = String(candidate || "").trim();
  if (!normalized || normalized.includes("@")) {
    return normalized.toLowerCase().includes("helena") ? "Helena" : pilotProfiles.teacher.name.split(/\s+/)[0];
  }
  return normalized.replace(/^professora\s+/i, "").split(/\s+/)[0] || pilotProfiles.teacher.name.split(/\s+/)[0];
};

const renderTeacherSidebar = (activeView = "inicio") => `
  <aside class="tw-sidebar" aria-label="Ambiente da professora">
    ${renderTeacherCard()}
    <nav aria-label="Menu do professor">
      ${teacherWorkspaceNav
        .map(([key, label, icon]) =>
          key === "heading"
            ? `<strong class="tw-nav-heading">${label}</strong>`
            : `<button type="button" class="${key === activeView ? "is-active" : ""}" data-teacher-view="${key}"><i data-icon="${icon || "dot"}"></i><span>${label}</span></button>`
        )
        .join("")}
    </nav>
    <button class="platform-logout-button" type="button" data-platform-logout><i data-icon="logout"></i><span>SAIR</span></button>
  </aside>
`;

const renderTeacherTopbar = () => `
  <header class="tw-topbar" aria-label="Acoes do professor">
    <label><span>Pesquisar</span><input type="search" data-teacher-search placeholder="Buscar conteudos, alunos, turmas..." /></label>
    <div class="tw-top-actions" aria-label="Acoes rapidas">
      <button type="button" data-teacher-view="notificacoes" aria-label="Notificacoes"><i data-icon="bell"></i><b hidden>0</b></button>
      <button type="button" data-teacher-view="mensagens" aria-label="Mensagens"><i data-icon="mail"></i><b hidden>0</b></button>
      <button type="button" data-teacher-view="perfil" class="tw-user-chip"><span>${getTeacherFirstName()}</span></button>
    </div>
  </header>
`;

const renderPlanningCard = (lesson) => `
  <article class="tw-planning-card" data-teacher-search-item>
    <span>${lesson.time}</span>
    <strong>${lesson.title}</strong>
    <small>${lesson.className} · ${lesson.resource}</small>
    <em>${lesson.status}</em>
  </article>
`;

const renderClassCard = (classItem) => `
  <article class="tw-class-card" data-teacher-search-item>
    <div><strong>${classItem.name}</strong><span>Turma vinculada</span></div>
    <small>Os indicadores reais da turma aparecerao aqui quando houver dados publicados.</small>
  </article>
`;

const renderStudentCard = (student) => `
  <article class="tw-student-card" data-teacher-search-item data-student-id="${printableEscape(student.id)}">
    ${student.avatar ? `<img class="tw-student-avatar" src="${printableEscape(student.avatar)}" alt="" loading="lazy" />` : `<span>${student.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>`}
    <div><strong>${student.name}</strong><small>${student.className} · ${student.pendingActivities} pendentes · ${student.completedActivities} concluidas</small></div>
    <a href="professor-aluno.html?id=${encodeURIComponent(student.id)}">Abrir</a>
  </article>
`;

const renderLessonCard = (lesson) => `
  <article class="tw-lesson-card" data-teacher-search-item>
    <span>${lesson.time}</span>
    <div><strong>${lesson.title}</strong><small>${lesson.className}</small></div>
    <button type="button" data-teacher-view="planejamentos">Abrir</button>
  </article>
`;

const renderRecommendationCard = (item) => `
  <article class="tw-recommendation-card" data-teacher-search-item>
    <span>${item.type}</span>
    <strong>${item.title}</strong>
    <small>${item.detail}</small>
    <button type="button" data-teacher-view="${item.view}">${item.action}</button>
  </article>
`;

const renderResourceCard = (resource) => `
  <article class="tw-resource-card" data-teacher-search-item>
    ${resource.cover ? `<img src="${resource.cover}" alt="" loading="lazy" />` : `<span>${resource.kind}</span>`}
    <div><strong>${resource.title}</strong><small>${resource.detail}</small></div>
    <button type="button" data-teacher-view="${resource.view || "biblioteca"}">Usar</button>
  </article>
`;

const printableEscape = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const printableNormalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const printableAllowedRoles = ["professor", "coordenador", "coordenador_pedagogico", "gestor", "gestor_escolar", "admin", "administrador", "administrador_nacional"];
const printableAdminRoles = ["coordenador", "coordenador_pedagogico", "gestor", "gestor_escolar", "admin", "administrador", "administrador_nacional"];

const getPrintableUserRole = () => {
  try {
    const session = JSON.parse(localStorage.getItem("raizes:supabase-auth-session") || "null");
    const token = session?.access_token || localStorage.getItem("raizes:supabase-access-token") || "";
    const [, payload] = String(token).split(".");
    const decoded = payload ? JSON.parse(atob(payload.replaceAll("-", "+").replaceAll("_", "/"))) : {};
    const metadata = decoded.app_metadata || {};
    return String(metadata.printable_activities_role || metadata.question_bank_role || metadata.app_role || metadata.role || decoded.app_role || "").toLowerCase();
  } catch (error) {
    return "";
  }
};

const canAccessPrintableActivities = ({ admin = false } = {}) => {
  const role = getPrintableUserRole();
  if (role) return (admin ? printableAdminRoles : printableAllowedRoles).includes(role);
  const isDemoAuthenticated = typeof localStorage !== "undefined" && localStorage.getItem(platformAuth.key) === "true";
  const isCurator = typeof localStorage !== "undefined" && localStorage.getItem(platformAuth.curatorKey) === "true";
  return admin ? isCurator : isDemoAuthenticated;
};

const printableActivitiesDataService = (() => {
  const catalog = () => window.RaizesPrintableActivitiesCatalog || { ageGroups: [], bnccFields: [], activities: [] };
  const all = () => (catalog().activities || []).map((item) => ({ visualizacoes: 0, downloads: 0, impressoes: 0, ...item }));
  const visible = ({ admin = false } = {}) => (admin ? all() : all().filter((item) => String(item.status || "").toUpperCase() === "PUBLICADO"));
  const storageKey = "raizes:printable-activities:user-state";
  const readUserState = () => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{"favorites":[],"recent":[],"metrics":[]}');
    } catch (error) {
      return { favorites: [], recent: [], metrics: [] };
    }
  };
  const writeUserState = (state) => localStorage.setItem(storageKey, JSON.stringify({ favorites: [], recent: [], metrics: [], ...state }));
  return {
    list: visible,
    getByCode(code, options) {
      return visible(options).find((item) => item.codigo === code || item.slug === code || item.id === code);
    },
    ageGroups: () => catalog().ageGroups || [],
    bnccFields: () => catalog().bnccFields || [],
    facets(items) {
      const unique = (values) => [...new Set(values.flat().filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
      return {
        fields: unique(items.map((item) => item.camposExperiencia || [])),
        types: unique(items.map((item) => item.tiposAtividade || [])),
        materials: unique(items.map((item) => item.materiais || [])),
      };
    },
    state: readUserState,
    toggleFavorite(code) {
      const state = readUserState();
      const exists = state.favorites.includes(code);
      state.favorites = exists ? state.favorites.filter((item) => item !== code) : [code, ...state.favorites];
      writeUserState(state);
      return !exists;
    },
    markRecent(code) {
      const state = readUserState();
      state.recent = [code, ...state.recent.filter((item) => item !== code)].slice(0, 12);
      writeUserState(state);
    },
    metric(type, payload = {}) {
      try {
        const state = readUserState();
        state.metrics = [...(state.metrics || []), { type, payload, at: new Date().toISOString() }].slice(-80);
        writeUserState(state);
      } catch (error) {
        return null;
      }
      return null;
    },
  };
})();

const getPrintableParams = () => new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);

const printableIncludes = (item, query) => {
  if (!query) return true;
  const haystack = [
    item.codigo,
    item.titulo,
    item.tema,
    item.objetivo,
    item.orientacaoProfessor,
    item.descricao,
    item.comandoCrianca,
    ...(item.materiais || []),
    ...(item.palavrasChave || []),
    ...(item.tiposAtividade || []),
    ...(item.camposExperiencia || []),
  ].join(" ");
  return printableNormalize(haystack).includes(printableNormalize(query));
};

const getPrintableFilteredItems = ({ admin = false } = {}) => {
  const params = getPrintableParams();
  const items = printableActivitiesDataService.list({ admin });
  const query = params.get("q") || "";
  const age = params.get("faixa") || "";
  const field = params.get("campo") || "";
  const type = params.get("tipo") || "";
  const material = params.get("material") || "";
  const favoriteOnly = params.get("favoritos") === "1";
  const userState = printableActivitiesDataService.state();
  const filtered = items.filter((item) => {
    const matchesFavorite = !favoriteOnly || userState.favorites.includes(item.codigo);
    return (
      matchesFavorite &&
      printableIncludes(item, query) &&
      (!age || item.faixaEtaria === age) &&
      (!field || (item.camposExperiencia || []).includes(field)) &&
      (!type || (item.tiposAtividade || []).includes(type)) &&
      (!material || (item.materiais || []).includes(material))
    );
  });
  const sort = params.get("ordem") || "relevancia";
  return filtered.sort((a, b) => {
    if (sort === "codigo") return String(a.codigo).localeCompare(String(b.codigo), "pt-BR");
    if (sort === "titulo") return String(a.titulo).localeCompare(String(b.titulo), "pt-BR");
    if (sort === "recentes") return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    if (sort === "atualizadas") return String(b.updatedAt || b.dataAtualizacao || "").localeCompare(String(a.updatedAt || a.dataAtualizacao || ""));
    if (sort === "visualizadas") return Number(b.visualizacoes || 0) - Number(a.visualizacoes || 0);
    if (sort === "baixadas") return Number(b.downloads || 0) - Number(a.downloads || 0);
    return 0;
  });
};

const renderPrintableAgeCards = ({ admin = false } = {}) => {
  const items = printableActivitiesDataService.list({ admin });
  return `
    <section class="pa-age-grid" aria-label="Faixas etarias">
      ${printableActivitiesDataService
        .ageGroups()
        .map((group) => {
          const count = items.filter((item) => item.faixaEtaria === group.id).length;
          const label = count ? `${count} ATIVIDADES DISPONIVEIS` : "ATIVIDADES EM PRODUCAO";
          return `<button class="pa-age-card" type="button" data-pa-filter-faixa="${group.id}"><span>${group.label}</span><strong>${group.age.toUpperCase()}</strong><small>${label}</small></button>`;
        })
        .join("")}
    </section>
  `;
};

const renderPrintableFilters = ({ admin = false } = {}) => {
  const params = getPrintableParams();
  const items = printableActivitiesDataService.list({ admin });
  const facets = printableActivitiesDataService.facets(items);
  const option = (value, label, selected) => `<option value="${printableEscape(value)}" ${value === selected ? "selected" : ""}>${printableEscape(label || value)}</option>`;
  const options = (values, selected) => `<option value="">Todos</option>${values.map((value) => option(value, value, selected)).join("")}`;
  return `
    <form class="pa-filters" data-pa-filters>
      <label class="pa-search"><span>Pesquisa</span><input name="q" type="search" value="${printableEscape(params.get("q") || "")}" placeholder="PESQUISE PELO CODIGO, TITULO, TEMA, OBJETIVO, MATERIAL OU PALAVRA-CHAVE" /></label>
      <details class="pa-filter-panel" open>
        <summary>Filtros</summary>
        <div>
          <label><span>Faixa etaria</span><select name="faixa">${options(printableActivitiesDataService.ageGroups().map((group) => group.id), params.get("faixa") || "")}</select></label>
          ${facets.fields.length ? `<label><span>Campo BNCC</span><select name="campo">${options(facets.fields, params.get("campo") || "")}</select></label>` : ""}
          ${facets.types.length ? `<label><span>Tipo</span><select name="tipo">${options(facets.types, params.get("tipo") || "")}</select></label>` : ""}
          ${facets.materials.length ? `<label><span>Material</span><select name="material">${options(facets.materials, params.get("material") || "")}</select></label>` : ""}
          <label><span>Ordenacao</span><select name="ordem">
            ${[
              ["relevancia", "Relevancia"],
              ["codigo", "Codigo"],
              ["titulo", "Titulo"],
              ["recentes", "Adicionadas recentemente"],
              ["atualizadas", "Atualizadas recentemente"],
              ["visualizadas", "Mais visualizadas"],
              ["baixadas", "Mais baixadas"],
            ].map(([value, label]) => option(value, label, params.get("ordem") || "relevancia")).join("")}
          </select></label>
          <label class="pa-check"><input name="favoritos" type="checkbox" value="1" ${params.get("favoritos") === "1" ? "checked" : ""} /><span>Somente favoritos</span></label>
          <button type="button" data-pa-clear>Limpar filtros</button>
        </div>
      </details>
    </form>
  `;
};

const renderPrintableActivityCard = (item) => {
  const userState = printableActivitiesDataService.state();
  const isFavorite = userState.favorites.includes(item.codigo);
  const thumb = item.miniatura || item.arquivoPng || item.arquivoOriginal || "";
  return `
    <article class="pa-card" data-teacher-search-item>
      <div class="pa-thumb">
        ${thumb ? `<img src="${printableEscape(thumb)}" alt="Miniatura da atividade ${printableEscape(item.codigo)}" loading="lazy" decoding="async" />` : `<span>SEM MINIATURA</span>`}
      </div>
      <div class="pa-card-body">
        <mark>${printableEscape(item.codigo)}</mark>
        <h3>${printableEscape(item.titulo || "Titulo pendente")}</h3>
        <p>${printableEscape(item.idade || item.faixaEtaria || "Idade pendente")} · ${printableEscape((item.tiposAtividade || [])[0] || "Tipo pendente")}</p>
        <small>${printableEscape((item.camposExperiencia || []).join(", ") || "Campo de experiencia pendente")}</small>
        <small><b>Materiais:</b> ${printableEscape((item.materiais || []).slice(0, 3).join(", ") || "pendentes")}</small>
      </div>
      <footer>
        <a href="atividades.html?codigo=${encodeURIComponent(item.codigo)}${window.location.search ? `&voltar=${encodeURIComponent(window.location.search)}` : ""}" data-pa-view="${printableEscape(item.codigo)}">Visualizar</a>
        <button type="button" data-ua-assign="${printableEscape(item.codigo)}">Indicar atividade</button>
        <a href="${printableEscape(item.arquivoOriginal || "#")}" download data-pa-download="${printableEscape(item.codigo)}" aria-disabled="${item.arquivoOriginal ? "false" : "true"}">Baixar</a>
        <button type="button" data-pa-print="${printableEscape(item.codigo)}">Imprimir</button>
        <button type="button" data-pa-favorite="${printableEscape(item.codigo)}" aria-pressed="${isFavorite}">${isFavorite ? "Favorito" : "Favoritar"}</button>
      </footer>
    </article>
  `;
};

const renderPrintableMainPage = ({ admin = false } = {}) => {
  if (!canAccessPrintableActivities({ admin })) {
    return `<section class="pa-shell"><div class="pa-empty"><h1>Acesso restrito</h1><p>Este modulo e exclusivo para professor, coordenador, gestor escolar e administrador.</p><a href="login.html?next=${encodeURIComponent(window.location.pathname.split("/").pop() + window.location.search)}">Entrar com perfil autorizado</a></div></section>`;
  }
  const params = getPrintableParams();
  const items = getPrintableFilteredItems({ admin });
  const total = printableActivitiesDataService.list({ admin }).length;
  const hasQuery = Boolean([...params.keys()].length);
  return `
    <section class="pa-shell" data-printable-app="${admin ? "admin" : "teacher"}">
      <header class="pa-hero">
        <span>${admin ? "Conteudos > Atividades Imprimiveis" : "Area do Professor"}</span>
        <h1>${admin ? "Atividades Imprimiveis" : "Banco de Atividades Imprimiveis"}</h1>
        <p>Atividades exclusivas para apoiar o planejamento e as experiencias da Educacao Infantil.</p>
        ${admin ? `<a href="README_IMPORTACAO_ATIVIDADES.md">README de importacao</a>` : ""}
      </header>
      ${renderPrintableAgeCards({ admin })}
      ${renderPrintableFilters({ admin })}
      ${renderUniversalActivityAssignDialog()}
      <div class="pa-status" role="status">${total ? `${items.length} de ${total} atividades` : "Nenhuma atividade cadastrada ainda. Estrutura pronta para receber o pacote EI2."}</div>
      ${
        admin
          ? `<section class="pa-admin-actions">
              <a href="data/atividades-imprimiveis/modelos/manifest.json">Modelo JSON</a>
              <a href="data/atividades-imprimiveis/modelos/manifest.csv">Modelo CSV</a>
              <code>node scripts/import-printable-activities.mjs --source CAMINHO --dry-run</code>
            </section>`
          : ""
      }
      <section class="pa-grid" aria-label="Atividades imprimiveis">
        ${
          items.length
            ? items.map(renderPrintableActivityCard).join("")
            : `<article class="pa-empty"><h2>${hasQuery ? "Nenhum resultado encontrado" : "Banco vazio"}</h2><p>${hasQuery ? "Ajuste a pesquisa ou limpe os filtros." : "Nenhuma atividade real foi cadastrada nesta etapa."}</p></article>`
        }
      </section>
    </section>
  `;
};

const renderPrintableDetailPage = ({ admin = false } = {}) => {
  const code = getPrintableParams().get("codigo");
  const item = printableActivitiesDataService.getByCode(code, { admin });
  if (!item) {
    return `<section class="pa-shell"><div class="pa-empty"><h1>Atividade nao encontrada</h1><p>O codigo informado nao existe ou nao esta publicado para este perfil.</p><a href="atividades.html">Voltar ao banco</a></div></section>`;
  }
  printableActivitiesDataService.markRecent(item.codigo);
  printableActivitiesDataService.metric("visualizacao", { codigo: item.codigo });
  const preview = item.arquivoPng || item.miniatura || item.arquivoOriginal || "";
  const back = getPrintableParams().get("voltar") || "";
  return `
    <section class="pa-shell pa-detail" data-printable-app>
      ${renderUniversalActivityAssignDialog()}
      <header class="pa-hero">
        <span>${printableEscape(item.codigo)} · versao ${printableEscape(item.versao || "1.0")}</span>
        <h1>${printableEscape(item.titulo || "Titulo pendente")}</h1>
        <p>${printableEscape(item.faixaEtaria || "Faixa etaria pendente")} · ${printableEscape(item.idade || "")} · ${printableEscape(item.status || "status pendente")}</p>
        <a href="atividades.html${printableEscape(back)}">Voltar aos resultados</a>
      </header>
      <div class="pa-detail-grid">
        <section class="pa-preview">
          ${preview ? `<img src="${printableEscape(preview)}" alt="Visualizacao ampliada da atividade ${printableEscape(item.codigo)}" />` : `<div class="pa-empty"><h2>Arquivo pendente</h2><p>A atividade ainda nao possui arquivo valido associado.</p></div>`}
          <div>
            <button type="button" data-ua-assign="${printableEscape(item.codigo)}">Indicar atividade</button>
            <a href="${printableEscape(item.arquivoOriginal || "#")}" download data-pa-download="${printableEscape(item.codigo)}">Baixar</a>
            <button type="button" data-pa-print="${printableEscape(item.codigo)}">Imprimir</button>
            <button type="button" data-pa-favorite="${printableEscape(item.codigo)}">Favoritar</button>
          </div>
        </section>
        <aside class="pa-meta">
          ${[
            ["Codigo oficial", item.codigo],
            ["Faixa etaria", item.faixaEtaria],
            ["Idade", item.idade],
            ["Versao", item.versao],
            ["Status", item.status],
            ["Publicacao", item.dataPublicacao || "pendente"],
            ["Atualizacao", item.dataAtualizacao || item.updatedAt || "pendente"],
            ["Objetivo", item.objetivo],
            ["Campos de experiencias", (item.camposExperiencia || []).join(", ")],
            ["Direitos de aprendizagem", (item.direitosAprendizagem || []).join(", ")],
            ["Tipo de atividade", (item.tiposAtividade || []).join(", ")],
            ["Materiais", (item.materiais || []).join(", ")],
            ["Orientacao ao professor", item.orientacaoProfessor],
            ["Palavras-chave", (item.palavrasChave || []).join(", ")],
          ].map(([label, value]) => `<article><strong>${printableEscape(label)}</strong><span>${printableEscape(value || "pendente")}</span></article>`).join("")}
        </aside>
      </div>
    </section>
  `;
};

const renderPrintableActivitiesPage = ({ admin = false } = {}) =>
  getPrintableParams().get("codigo") ? renderPrintableDetailPage({ admin }) : renderPrintableMainPage({ admin });

const universalActivityEngineVersion = "1.0.0";
const universalActivityStorageKey = "raizes:universal-activity-engine:v1";
const universalActivityStudentProfile = {
  id: pilotProfiles.student.id,
  name: pilotProfiles.student.fullName,
  classId: pilotProfiles.student.classId,
  className: pilotProfiles.student.className,
};

const universalActivityTeacherProfile = {
  id: pilotProfiles.teacher.id,
  name: pilotProfiles.teacher.displayName,
};

const universalActivityToolProfiles = {
  ei2: ["pincel", "dedo", "rolinho", "esponja", "algodao", "papel", "barbante", "bolinhas", "borracha"],
  ei3: ["pincel", "dedo", "rolinho", "esponja", "algodao", "papel", "barbante", "bolinhas", "borracha", "giz", "carimbo", "adesivos", "formas"],
  ei4: ["pincel", "dedo", "rolinho", "esponja", "algodao", "papel", "barbante", "bolinhas", "borracha", "giz", "carimbo", "adesivos", "formas", "lapis", "tracos", "montagem", "arrastar"],
  ei5: ["pincel", "dedo", "rolinho", "esponja", "algodao", "papel", "barbante", "bolinhas", "borracha", "giz", "carimbo", "adesivos", "formas", "lapis", "tracos", "montagem", "arrastar", "letras_moveis", "numeros", "ordenacao", "ligacao"],
};

const universalActivityToolLabels = {
  pincel: "Pincel",
  dedo: "Dedo",
  rolinho: "Rolinho",
  esponja: "Esponja",
  algodao: "Algodao",
  papel: "Papel",
  barbante: "Barbante",
  bolinhas: "Bolinhas",
  borracha: "Borracha",
};

const universalActivityDemoClasses = [
  {
    id: pilotProfiles.class.id,
    name: pilotProfiles.class.name,
    students: [
      { id: pilotProfiles.student.id, name: pilotProfiles.student.fullName },
    ],
  },
];

const readUniversalActivityState = () => {
  try {
    return JSON.parse(localStorage.getItem(universalActivityStorageKey) || '{"assignments":[],"submissions":[],"metrics":[]}');
  } catch (error) {
    return { assignments: [], submissions: [], metrics: [] };
  }
};

const writeUniversalActivityState = (state) => {
  localStorage.setItem(universalActivityStorageKey, JSON.stringify({ assignments: [], submissions: [], portfolioRefs: [], metrics: [], ...state }));
};

const getUniversalActivityByCode = (code) => printableActivitiesDataService.getByCode(code, { admin: true });

const getUniversalActivityClass = (classId) => universalActivityDemoClasses.find((item) => item.id === classId) || universalActivityDemoClasses[0];

const getUniversalActivityTools = (activity, assignment) => {
  const profileKey = assignment?.toolProfile || activity?.perfilFerramentas || activity?.faixaEtaria || "ei2";
  const profileTools = universalActivityToolProfiles[profileKey] || universalActivityToolProfiles.ei2;
  const allowed = activity?.ferramentasPermitidas?.length ? activity.ferramentasPermitidas : profileTools;
  return allowed.filter((tool) => universalActivityToolProfiles.ei5.includes(tool));
};

const getUniversalActivitySuggestedTools = (activity) => {
  if (activity?.ferramentasSugeridas?.length) return activity.ferramentasSugeridas;
  const text = printableNormalize([activity?.titulo, activity?.objetivo, activity?.comandoCrianca, ...(activity?.materiais || [])].join(" "));
  const suggestions = [
    ["algodao", "algodao"],
    ["esponja", "esponja"],
    ["rolinho", "rolinho"],
    ["dedo", "dedo"],
    ["barbante", "barbante"],
    ["bolinhas", "bolinha"],
    ["papel", "papel"],
  ];
  return suggestions.filter(([, term]) => text.includes(term)).map(([tool]) => tool);
};

const syncUniversalActivityPortfolio = (submission) => {
  if (submission.status !== "COMPLETED") return;
  const state = readUniversalActivityState();
  const refId = `portfolio-${submission.submissionId}`;
  const portfolioRef = {
    refId,
    submissionId: submission.submissionId,
    assignmentId: submission.assignmentId,
    activityCode: submission.activityCode,
    studentId: submission.studentId,
    classId: submission.classId,
    completedAt: submission.completedAt,
  };
  state.portfolioRefs = [portfolioRef, ...(state.portfolioRefs || []).filter((item) => item.refId !== refId)];
  writeUniversalActivityState(state);
};

const getUniversalActivityPortfolioForStudent = (studentId = universalActivityStudentProfile.id) => {
  const state = readUniversalActivityState();
  const refs = state.portfolioRefs || [];
  return refs
    .filter((ref) => ref.studentId === studentId)
    .map((ref) => ({
      ref,
      submission: state.submissions.find((submission) => submission.submissionId === ref.submissionId),
      assignment: state.assignments.find((assignment) => assignment.assignmentId === ref.assignmentId),
      activity: getUniversalActivityByCode(ref.activityCode),
    }))
    .filter((item) => item.submission);
};

const createUniversalActivityAssignment = ({ activityCode, classId, studentIds, instructions, dueDate, toolProfile, mode }) => {
  const state = readUniversalActivityState();
  const classInfo = getUniversalActivityClass(classId);
  const assignment = {
    assignmentId: `ua-${Date.now()}`,
    activityCode,
    teacherId: universalActivityTeacherProfile.id,
    teacherName: universalActivityTeacherProfile.name,
    classId,
    className: classInfo.name,
    studentIds,
    assignedAt: new Date().toISOString(),
    dueDate: dueDate || "",
    instructions: instructions || "",
    toolProfile: toolProfile || "ei2",
    mode: mode || "livre",
    status: "PUBLICADA",
  };
  state.assignments = [assignment, ...state.assignments.filter((item) => item.assignmentId !== assignment.assignmentId)];
  writeUniversalActivityState(state);
  return assignment;
};

const getUniversalActivityAssignmentsForStudent = (studentId = universalActivityStudentProfile.id) => {
  const state = readUniversalActivityState();
  return state.assignments.filter((assignment) => assignment.status !== "ARQUIVADA" && assignment.studentIds.includes(studentId));
};

const getUniversalActivitySubmission = (assignmentId, studentId = universalActivityStudentProfile.id) => {
  const state = readUniversalActivityState();
  return state.submissions.find((item) => item.assignmentId === assignmentId && item.studentId === studentId) || null;
};

const upsertUniversalActivitySubmission = (submission) => {
  const state = readUniversalActivityState();
  const index = state.submissions.findIndex((item) => item.submissionId === submission.submissionId);
  if (index >= 0) state.submissions[index] = submission;
  else state.submissions.unshift(submission);
  writeUniversalActivityState(state);
  return submission;
};

const getOrCreateUniversalActivitySubmission = (assignment) => {
  const existing = getUniversalActivitySubmission(assignment.assignmentId);
  if (existing) return existing;
  const submission = {
    submissionId: `uas-${assignment.assignmentId}-${universalActivityStudentProfile.id}`,
    assignmentId: assignment.assignmentId,
    activityCode: assignment.activityCode,
    studentId: universalActivityStudentProfile.id,
    studentName: universalActivityStudentProfile.name,
    classId: assignment.classId,
    className: assignment.className,
    teacherId: assignment.teacherId,
    teacherName: assignment.teacherName,
    status: "NOT_STARTED",
    startedAt: "",
    lastSavedAt: "",
    completedAt: "",
    engineVersion: universalActivityEngineVersion,
    canvasData: { strokes: [] },
    objectsData: [],
    preview: "",
    finalArtwork: "",
  };
  return upsertUniversalActivitySubmission(submission);
};

const getUniversalActivityStudentStatus = (assignment) => {
  const submission = getUniversalActivitySubmission(assignment.assignmentId);
  if (!submission || submission.status === "NOT_STARTED") return "NOVA";
  if (submission.status === "COMPLETED") return "CONCLUIDA";
  return "EM ANDAMENTO";
};

const seedUniversalActivityTechnicalAssignments = () => {
  const state = readUniversalActivityState();
  if (state.assignments.some((item) => item.seededBy === "technical-pilot-v1")) return;
  const codes = ["RS-EI2-ATI-001", "RS-EI2-ATI-004", "RS-EI2-ATI-028"].filter((code) => getUniversalActivityByCode(code));
  const seeded = codes.map((code, index) => ({
    assignmentId: `ua-pilot-${String(index + 1).padStart(2, "0")}`,
    activityCode: code,
    teacherId: universalActivityTeacherProfile.id,
    teacherName: universalActivityTeacherProfile.name,
    classId: universalActivityStudentProfile.classId,
    className: universalActivityStudentProfile.className,
    studentIds: [universalActivityStudentProfile.id],
    assignedAt: new Date().toISOString(),
    dueDate: "",
    instructions: index === 0 ? "Use pintura livre para testar o motor." : index === 1 ? "Teste colagem de algodao." : "Combine formas e pintura livre.",
    toolProfile: "ei2",
    mode: index === 0 ? "livre" : "sugerido",
    status: "PUBLICADA",
    seededBy: "technical-pilot-v1",
  }));
  writeUniversalActivityState({ ...state, assignments: [...seeded, ...state.assignments] });
};

const renderUniversalActivityAssignDialog = () => `
  <dialog class="ua-dialog" data-ua-assign-dialog>
    <form method="dialog" class="ua-assign-form" data-ua-assign-form>
      <header><span>Motor Universal</span><h2>Indicar atividade</h2><button type="button" data-ua-close-dialog aria-label="Fechar">×</button></header>
      <input type="hidden" name="activityCode" />
      <label><span>Destino</span><select name="scope"><option value="class">Turma inteira</option><option value="group">Grupo de alunos</option><option value="student">Aluno individual</option></select></label>
      <label><span>Turma</span><select name="classId">${universalActivityDemoClasses.map((item) => `<option value="${printableEscape(item.id)}">${printableEscape(item.name)}</option>`).join("")}</select></label>
      <fieldset data-ua-students><legend>Alunos</legend></fieldset>
      <label><span>Orientacao opcional</span><textarea name="instructions" rows="3" placeholder="Ex.: use pintura com dedo e cole bolinhas no desenho."></textarea></label>
      <label><span>Prazo opcional</span><input name="dueDate" type="date" /></label>
      <label><span>Perfil de ferramentas</span><select name="toolProfile"><option value="ei2">EI2</option><option value="ei3">EI3</option><option value="ei4">EI4</option><option value="ei5">EI5</option></select></label>
      <label><span>Modo</span><select name="mode"><option value="livre">Modo livre</option><option value="sugerido">Modo sugerido</option></select></label>
      <footer><button type="button" data-ua-close-dialog>Cancelar</button><button type="submit">Publicar atividade</button></footer>
    </form>
  </dialog>
`;

const renderStudentUniversalActivities = () => {
  seedUniversalActivityTechnicalAssignments();
  const assignments = getUniversalActivityAssignmentsForStudent();
  return `
    <section class="student-card ua-student-list" aria-labelledby="student-activities-title" data-ua-student-list>
      <div class="student-card-head"><h2 id="student-activities-title">Minhas Atividades</h2></div>
      <div class="ua-student-grid">
        ${
          assignments.length
            ? assignments
                .map((assignment) => {
                  const activity = getUniversalActivityByCode(assignment.activityCode);
                  const submission = getUniversalActivitySubmission(assignment.assignmentId);
                  const status = getUniversalActivityStudentStatus(assignment);
                  return `
                    <article class="ua-student-card">
                      <img src="${printableEscape(activity?.miniatura || activity?.arquivoA4 || "")}" alt="Atividade ${printableEscape(assignment.activityCode)}" loading="lazy" />
                      <div>
                        <mark>${printableEscape(assignment.activityCode)}</mark>
                        <strong>${printableEscape(activity?.titulo || assignment.activityCode)}</strong>
                        <small>Enviada em ${new Date(assignment.assignedAt).toLocaleDateString("pt-BR")}${assignment.dueDate ? ` · prazo ${new Date(assignment.dueDate).toLocaleDateString("pt-BR")}` : ""}</small>
                        <span>${status}</span>
                      </div>
                      <a href="motor-atividade.html?assignment=${encodeURIComponent(assignment.assignmentId)}">${status === "CONCLUIDA" ? "Ver minha atividade" : submission ? "Continuar" : "Comecar"}</a>
                    </article>
                  `;
                })
                .join("")
            : `<p class="ua-empty">Nenhuma atividade indicada para voce ainda.</p>`
        }
      </div>
    </section>
  `;
};

const renderUniversalActivityStudentPortfolio = (studentId = universalActivityStudentProfile.id) => {
  const items = getUniversalActivityPortfolioForStudent(studentId);
  return `
    <section class="student-card ua-portfolio" aria-labelledby="student-portfolio-title" data-ua-portfolio>
      <div class="student-card-head"><h2 id="student-portfolio-title">Portfolio Digital</h2><span>${items.length} registros</span></div>
      <div class="ua-portfolio-grid">
        ${
          items.length
            ? items
                .map(({ submission, activity, assignment }) => `
                  <article>
                    <img src="${printableEscape(submission.finalArtwork || submission.preview || activity?.miniatura || "")}" alt="Portfolio ${printableEscape(activity?.titulo || submission.activityCode)}" loading="lazy" />
                    <div>
                      <mark>${printableEscape(submission.activityCode)}</mark>
                      <strong>${printableEscape(activity?.titulo || submission.activityCode)}</strong>
                      <small>${printableEscape(assignment?.className || submission.className)} · concluida em ${new Date(submission.completedAt).toLocaleDateString("pt-BR")}</small>
                    </div>
                  </article>
                `)
                .join("")
            : `<p class="ua-empty">As atividades concluidas aparecerao aqui automaticamente.</p>`
        }
      </div>
    </section>
  `;
};

const renderUniversalActivityTeacherPortfolio = () => {
  const state = readUniversalActivityState();
  const refs = state.portfolioRefs || [];
  const studentIds = [...new Set(refs.map((ref) => ref.studentId))];
  const findStudent = (studentId) =>
    universalActivityDemoClasses.flatMap((item) => item.students.map((student) => ({ ...student, className: item.name }))).find((student) => student.id === studentId);
  return `
    <section class="tw-board ua-portfolio-teacher">
      <div class="tw-section-head"><h2>Portfolio Digital</h2><span>${refs.length} atividades concluidas</span></div>
      ${
        studentIds.length
          ? studentIds
              .map((studentId) => {
                const student = findStudent(studentId);
                const items = getUniversalActivityPortfolioForStudent(studentId);
                return `
                  <article>
                    <header><strong>${printableEscape(student?.name || studentId)}</strong><small>${printableEscape(student?.className || "")} · ${items.length} registros</small></header>
                    <div>
                      ${items
                        .map(({ submission, activity }) => `
                          <figure>
                            <img src="${printableEscape(submission.finalArtwork || submission.preview || activity?.miniatura || "")}" alt="Atividade ${printableEscape(submission.activityCode)}" loading="lazy" />
                            <figcaption>${printableEscape(submission.activityCode)}</figcaption>
                          </figure>
                        `)
                        .join("")}
                    </div>
                  </article>
                `;
              })
              .join("")
          : `<p class="ua-empty">Nenhuma atividade concluida no portfolio ainda.</p>`
      }
    </section>
  `;
};

const renderUniversalActivityTeacherDeliveries = () => {
  const state = readUniversalActivityState();
  const assignments = state.assignments.filter((assignment) => assignment.status !== "ARQUIVADA");
  return `
    <section class="tw-board ua-deliveries" data-ua-deliveries>
      <div class="tw-section-head"><h2>Atividades Indicadas</h2><button type="button" data-teacher-view="atividades">Indicar nova</button></div>
      ${
        assignments.length
          ? assignments
              .map((assignment) => {
                const activity = getUniversalActivityByCode(assignment.activityCode);
                const submissions = state.submissions.filter((submission) => submission.assignmentId === assignment.assignmentId);
                const completed = submissions.filter((submission) => submission.status === "COMPLETED").length;
                const progress = submissions.filter((submission) => submission.status === "IN_PROGRESS").length;
                const notStarted = Math.max(0, assignment.studentIds.length - completed - progress);
                return `
                  <article class="ua-delivery-card">
                    <div><mark>${printableEscape(assignment.activityCode)}</mark><strong>${printableEscape(activity?.titulo || assignment.activityCode)}</strong><small>${printableEscape(assignment.className)} · ${assignment.studentIds.length} alunos</small></div>
                    <div class="ua-delivery-metrics"><span>${completed} concluidas</span><span>${progress} em andamento</span><span>${notStarted} nao iniciadas</span></div>
                    <button type="button" data-ua-open-delivery="${printableEscape(assignment.assignmentId)}">Ver entregas</button>
                  </article>
                `;
              })
              .join("")
          : `<p class="ua-empty">Nenhuma atividade indicada ainda.</p>`
      }
      <div class="ua-delivery-detail" data-ua-delivery-detail></div>
    </section>
  `;
};

const renderUniversalActivityMotorPage = () => {
  seedUniversalActivityTechnicalAssignments();
  const assignmentId = getPrintableParams().get("assignment");
  const state = readUniversalActivityState();
  const assignment = state.assignments.find((item) => item.assignmentId === assignmentId);
  if (!assignment || !assignment.studentIds.includes(universalActivityStudentProfile.id)) {
    return `<section class="ua-motor-shell"><div class="pa-empty"><h1>Atividade nao encontrada</h1><p>Esta atividade nao esta atribuida ao aluno atual.</p><a href="aluno.html">Voltar</a></div></section>`;
  }
  const activity = getUniversalActivityByCode(assignment.activityCode);
  if (!activity) {
    return `<section class="ua-motor-shell"><div class="pa-empty"><h1>Base nao encontrada</h1><p>O codigo ${printableEscape(assignment.activityCode)} nao existe no Banco de Atividades.</p><a href="aluno.html">Voltar</a></div></section>`;
  }
  getOrCreateUniversalActivitySubmission(assignment);
  const tools = getUniversalActivityTools(activity, assignment);
  const suggestedTools = assignment.mode === "sugerido" ? getUniversalActivitySuggestedTools(activity).filter((tool) => tools.includes(tool)) : [];
  const colors = ["#0b7a34", "#e53935", "#1e88e5", "#fdd835", "#fb8c00", "#8e24aa", "#111111", "#ffffff"];
  return `
    <section class="ua-motor-shell" data-ua-engine data-assignment-id="${printableEscape(assignment.assignmentId)}">
      <header class="ua-motor-head">
        <a href="aluno.html">Voltar</a>
        <div><span>${printableEscape(activity.codigo)}</span><h1>${printableEscape(activity.titulo)}</h1><small>${printableEscape(assignment.instructions || "Crie do seu jeito.")}</small></div>
        <button type="button" data-ua-complete>Concluir</button>
      </header>
      <main class="ua-motor-layout">
        <aside class="ua-tools" aria-label="Ferramentas">
          ${tools.map((tool) => `<button type="button" data-ua-tool="${tool}" class="${[tool === "pincel" ? "is-active" : "", suggestedTools.includes(tool) ? "is-suggested" : ""].filter(Boolean).join(" ")}"><span>${universalActivityToolLabels[tool] || tool}</span></button>`).join("")}
        </aside>
        <section class="ua-stage-wrap">
          <div class="ua-stage" data-ua-stage>
            <img src="${printableEscape(activity.arquivoA4 || activity.arquivoOriginal)}" alt="Atividade base ${printableEscape(activity.codigo)}" data-ua-base />
            <canvas data-ua-canvas width="1600" height="1131"></canvas>
            <div class="ua-object-layer" data-ua-object-layer></div>
          </div>
        </section>
        <aside class="ua-controls" aria-label="Controles">
          <div class="ua-palette">${colors.map((color, index) => `<button type="button" data-ua-color="${color}" style="--ua-color:${color}" aria-label="Cor ${index + 1}" class="${index === 0 ? "is-active" : ""}"></button>`).join("")}</div>
          <label><span>Espessura</span><input type="range" min="6" max="44" value="16" data-ua-size /></label>
          <button type="button" data-ua-undo>Desfazer</button>
          <button type="button" data-ua-redo>Refazer</button>
          <button type="button" data-ua-clear>Limpar</button>
          <button type="button" data-ua-save>Salvar</button>
          <output data-ua-save-status>Salvo automaticamente</output>
        </aside>
      </main>
    </section>
  `;
};

const premiumIcon = (name) => `<i class="premium-icon" data-icon="${name}"></i>`;

const renderPremiumEmpty = (title, text = "", tone = "green") => `
  <div class="premium-empty is-${tone}">
    <strong>${title}</strong>
    ${text ? `<span>${text}</span>` : ""}
  </div>
`;

const renderTeacherQuickActions = () => `
  <section class="teacher-side-card teacher-quick-actions" aria-label="Acessos rapidos">
    <h2>Acessos Rapidos</h2>
    ${[
      { label: "ATRIBUIR ATIVIDADE", icon: "clipboard", view: "atividades", tone: "green" },
      { label: "ABRIR MINHA TURMA", icon: "users", view: "turmas", tone: "lime" },
      { label: "CRIAR PLANEJAMENTO", icon: "doc", view: "planejamentos", tone: "blue" },
      { label: "VER PRODUCOES", icon: "portfolio", view: "alunos", tone: "purple" },
      { label: "ABRIR BIBLIOTECA", icon: "book", view: "biblioteca", tone: "orange" },
      { label: "VER RELATORIOS", icon: "chart", view: "relatorios", tone: "teal" },
    ]
      .map((item) => `<button type="button" class="quick-action is-${item.tone}" data-teacher-view="${item.view}">${premiumIcon(item.icon)}<span>${item.label}</span></button>`)
      .join("")}
  </section>
`;

const renderTeacherSideRail = () => `
  <aside class="teacher-right-rail" aria-label="Resumo do professor">
    ${renderTeacherQuickActions()}
    <section class="teacher-side-card">
      <h2>Hoje</h2>
      ${renderPremiumEmpty("SEM COMPROMISSOS PARA HOJE", "Sua agenda pedagogica aparecera aqui quando houver eventos.", "blue")}
    </section>
    <section class="teacher-side-card is-clickable" data-teacher-view="notificacoes">
      <h2>Notificacoes</h2>
      ${renderPremiumEmpty("NENHUMA NOTIFICACAO NOVA", "Avisos importantes ficarao organizados neste painel.", "red")}
    </section>
    <section class="teacher-side-card is-clickable" data-teacher-view="calendario">
      <h2>Proximos compromissos</h2>
      ${renderPremiumEmpty("SEM COMPROMISSOS AGENDADOS", "Quando sua rotina for publicada, os proximos itens aparecerao aqui.", "blue")}
    </section>
    <section class="teacher-side-card is-clickable" data-teacher-view="mensagens">
      <h2>Mensagens</h2>
      ${renderPremiumEmpty("NENHUMA MENSAGEM NOVA", "As conversas da escola e das familias aparecerao aqui.", "teal")}
    </section>
  </aside>
`;

const renderTeacherMetricCard = ({ title, text, icon, tone, view }) => `
  <button type="button" class="teacher-metric-card is-${tone}" data-teacher-view="${view}" data-teacher-search-item>
    ${premiumIcon(icon)}
    <span>${title}</span>
    <strong>${text}</strong>
  </button>
`;

const renderTeacherContentCard = ({ title, detail, icon, tone, view }) => `
  <button type="button" class="teacher-content-card is-${tone}" data-teacher-view="${view}" data-teacher-search-item>
    ${premiumIcon(icon)}
    <strong>${title}</strong>
    <small>${detail}</small>
  </button>
`;

const renderTeacherPlanningStrip = () => `
  <section class="teacher-premium-section">
    <h2>Planejamento</h2>
    <div class="teacher-planning-grid">
      ${[
        { title: "Planejamento da semana", detail: "Sua organizacao semanal aparecera aqui.", icon: "calendar", tone: "green", view: "planejamentos" },
        { title: "Proximas experiencias", detail: "Novas experiencias chegam em breve.", icon: "star", tone: "blue", view: "experiencias" },
        { title: "Avaliacoes", detail: "Nenhuma correcao pendente no momento.", icon: "check", tone: "purple", view: "avaliacoes" },
      ].map(renderTeacherContentCard).join("")}
    </div>
  </section>
`;

const renderTeacherPremiumHome = () => `
  <section class="teacher-premium-layout" data-teacher-home>
    <main class="teacher-premium-main">
      <section class="teacher-premium-hero">
        <div>
          <span>Bom dia,</span>
          <h1>PROFESSORA ${getTeacherFirstName().toUpperCase()}</h1>
          <p>Organize sua rotina, acompanhe sua turma e prepare novas experiencias.</p>
        </div>
        <div class="teacher-hero-art" aria-hidden="true">
          <img src="assets/professor/professor-dashboard.png" alt="" loading="eager" onerror="this.hidden=true" />
        </div>
      </section>

      <section class="teacher-class-feature" data-teacher-search-item>
        ${premiumIcon("users")}
        <div>
          <span>Minhas Turmas</span>
          <strong>${pilotProfiles.class.name}</strong>
          <small>Os indicadores reais da turma serao exibidos quando publicados.</small>
          <button type="button" data-teacher-view="turmas">ABRIR TURMA</button>
        </div>
      </section>

      <section class="teacher-premium-section">
        <h2>Acompanhamento</h2>
        <div class="teacher-metric-grid">
          ${[
            { title: "Atividades pendentes", text: "NENHUMA PENDENCIA NO MOMENTO", icon: "clipboard", tone: "orange", view: "atividades" },
            { title: "Producoes recebidas", text: "SUAS PRODUCOES RECEBIDAS APARECERAO AQUI", icon: "portfolio", tone: "purple", view: "alunos" },
            { title: "Alunos em acompanhamento", text: "ACOMPANHAMENTO REAL EM PREPARACAO", icon: "users", tone: "green", view: "turmas" },
            { title: "Proximas acoes", text: "SEM ACOES PROGRAMADAS AGORA", icon: "heart", tone: "red", view: "planejamentos" },
          ].map(renderTeacherMetricCard).join("")}
        </div>
      </section>

      <section class="teacher-premium-section">
        <h2>Conteudos</h2>
        <div class="teacher-content-grid">
          ${[
            { title: "Biblioteca Viva", detail: "Explorar conteudos", icon: "book", tone: "green", view: "biblioteca" },
            { title: "Atividades Imprimiveis", detail: "Ver atividades", icon: "doc", tone: "purple", view: "atividades" },
            { title: "Experiencias", detail: "Explorar experiencias", icon: "flask", tone: "teal", view: "experiencias" },
            { title: "Jogos", detail: "Ver jogos", icon: "game", tone: "orange", view: "jogos" },
          ].map(renderTeacherContentCard).join("")}
        </div>
      </section>

      ${renderTeacherPlanningStrip()}
      <main class="tw-content" data-teacher-content hidden>${renderTeacherWorkspaceView("inicio")}</main>
    </main>
    ${renderTeacherSideRail()}
  </section>
`;

const renderTeacherPilotHome = () => `
  <section class="teacher-workspace teacher-pilot" data-teacher-workspace>
    ${renderTeacherSidebar("inicio")}
    <div class="tw-main">
      ${renderTeacherTopbar()}
      ${renderTeacherPremiumHome()}
    </div>
  </section>
`;

const renderTeacherClassPage = () => `
  <section class="teacher-workspace teacher-pilot" data-teacher-workspace>
    ${renderTeacherSidebar("turmas")}
    <div class="tw-main">
      ${renderTeacherTopbar()}
      <section class="tw-hero">
        <div>
          <span>MINHAS TURMAS</span>
          <h1>${pilotProfiles.class.name}</h1>
          <p>Alunos reais vinculados a ${pilotProfiles.teacher.displayName} nesta etapa piloto.</p>
        </div>
      </section>
      <main class="tw-content">
        <section class="tw-board">
          <div class="tw-section-head"><h2>Alunos</h2><span>1 vinculo ativo</span></div>
          ${teacherWorkspaceStudents.map(renderStudentCard).join("")}
        </section>
      </main>
    </div>
  </section>
`;

const renderTeacherStudentPage = () => {
  const student = teacherWorkspaceStudents.find((item) => item.id === getPrintableParams().get("id")) || teacherWorkspaceStudents[0];
  return `
    <section class="teacher-workspace teacher-pilot" data-teacher-workspace>
      ${renderTeacherSidebar("turmas")}
      <div class="tw-main">
        ${renderTeacherTopbar()}
        <section class="tw-hero">
          <div>
            <span>${student.className}</span>
            <h1>${student.name.toUpperCase()}</h1>
            <p>Ficha individual do aluno para acompanhamento de atividades, producoes e historico.</p>
          </div>
          <div class="tw-hero-metrics">
            <article><strong>${student.pendingActivities}</strong><span>pendentes</span></article>
            <article><strong>${student.completedActivities}</strong><span>concluidas</span></article>
            <article><strong>${student.progress}%</strong><span>progresso</span></article>
          </div>
        </section>
        <section class="tw-recommendations">
          ${["VISAO GERAL", "MISSOES / ATIVIDADES", "PRODUCOES", "PROGRESSO", "HISTORICO"]
            .map((title) => `<article class="tw-recommendation-card"><span>Pedro</span><strong>${title}</strong><small>Estrutura preparada para dados reais do aluno.</small></article>`)
            .join("")}
        </section>
        <main class="tw-content">
          <section class="tw-board">
            <div class="tw-section-head"><h2>Atribuicao</h2><button type="button" data-teacher-open-url="atividades.html">ATRIBUIR ATIVIDADE</button></div>
            <p class="tw-muted">A tela de selecao usa o banco de atividades e o Motor Universal compartilhado. A gravacao completa da atribuicao sera aprofundada na proxima etapa.</p>
          </section>
          ${renderUniversalActivityTeacherDeliveries()}
          ${renderUniversalActivityTeacherPortfolio()}
        </main>
      </div>
    </section>
  `;
};

const studentPremiumNav = [
  ["aluno.html", "Inicio", "home"],
  ["missao.html", "Missao do Dia", "star"],
  ["arvore.html", "Minha Arvore", "tree"],
  ["biblioteca.html", "Biblioteca", "book"],
  ["jogos.html", "Jogar e Descobrir", "game"],
  ["perfil.html", "Perfil", "user"],
  ["familia.html", "Familia", "family"],
];

const renderStudentPremiumSidebar = () => `
  <aside class="student-premium-sidebar" aria-label="Menu do aluno">
    <a class="student-premium-logo" href="aluno.html" aria-label="Raizes e Saberes">
      <img src="logo-sidebar-dark.png" alt="Raizes e Saberes" onerror="this.hidden=true" />
    </a>
    <nav>
      ${studentPremiumNav
        .map(([href, label, icon], index) => `<a class="${index === 0 ? "is-active" : ""}" href="${href}">${premiumIcon(icon)}<span>${label}</span></a>`)
        .join("")}
    </nav>
    <button class="student-premium-logout" type="button" data-platform-logout>${premiumIcon("logout")}<span>SAIR</span></button>
  </aside>
`;

const renderStudentPremiumTopbar = () => `
  <header class="student-premium-topbar">
    <label><span>Buscar</span><input type="search" placeholder="Buscar livros, jogos, atividades..." /></label>
    <div>
      <a href="perfil.html" aria-label="Abrir perfil">${studentLazyImg(pilotProfiles.student.avatar, "", "student-top-avatar")}<strong>${getStudentFirstName()}</strong></a>
    </div>
  </header>
`;

const renderStudentQuickRail = () => `
  <aside class="student-right-rail" aria-label="Atalhos e recados do aluno">
    <section class="student-side-card student-shortcuts">
      <h2>Meus Atalhos</h2>
      ${[
        ["missao.html", "Continuar Atividade", "play", "green"],
        ["arvore.html", "Ver Minha Arvore", "tree", "lime"],
        ["biblioteca.html", "Abrir Livro", "book", "blue"],
        ["jogos.html", "Jogar", "game", "purple"],
        ["perfil.html", "Meu Perfil", "user", "teal"],
      ]
        .map(([href, label, icon, tone]) => `<a class="student-shortcut is-${tone}" href="${href}">${premiumIcon(icon)}<span>${label}</span><b>›</b></a>`)
        .join("")}
    </section>
    <section class="student-side-card">
      <h2>Minhas Conquistas</h2>
      <div class="student-medal-placeholders" aria-hidden="true"><span></span><span></span><span></span></div>
      <p>Continue explorando e ganhe novas conquistas!</p>
    </section>
    <section class="student-side-card is-pink">
      <h2>Recado da Professora</h2>
      ${renderPremiumEmpty("QUANDO SUA PROFESSORA ENVIAR UM RECADO, ELE APARECERA AQUI.", "", "pink")}
    </section>
    <section class="student-side-card is-warm">
      <h2>Proxima Missao</h2>
      ${renderPremiumEmpty("SUA PROXIMA MISSAO APARECERA AQUI.", "Fique ligado!", "orange")}
    </section>
  </aside>
`;

const renderStudentPremiumCard = ({ title, text, href, icon, tone, cta }) => `
  <a class="student-premium-card is-${tone}" href="${href}" data-student-search-item>
    ${premiumIcon(icon)}
    <div><strong>${title}</strong><p>${text}</p></div>
    <span>${cta}</span>
  </a>
`;

const renderStudentSimpleDashboard = () => `
  <section class="student-premium-workspace" data-student-dashboard>
    ${renderStudentPremiumSidebar()}
    <main class="student-premium-main">
      ${renderStudentPremiumTopbar()}
      <div class="student-premium-grid">
        <main class="student-center">
          <section class="student-premium-hero">
            <div>
              <h1>OLA, ${getStudentFirstName().toUpperCase()}!</h1>
              <p>Vamos descobrir coisas novas hoje?</p>
            </div>
            ${studentLazyImg("assets/aluno/oficial-hero-aluno.png", "", "student-hero-art")}
          </section>

          <section class="student-mission-card is-mission">
            <div class="student-card-art is-green" aria-hidden="true"></div>
            <div>
              <span>Missao do Dia</span>
              <strong>SUA NOVA MISSAO</strong>
              <p>Suas novas descobertas vao aparecer aqui quando a professora preparar algo especial para voce.</p>
              <a href="missao.html">COMECAR</a>
            </div>
          </section>

          <section class="student-mission-card is-continue">
            <div class="student-card-art is-purple" aria-hidden="true"></div>
            <div>
              <span>Continuar</span>
              <strong>VOCE NAO TEM NENHUMA ATIVIDADE EM ANDAMENTO.</strong>
              <p>Quando comecar algo novo, voce podera continuar por aqui.</p>
              <a href="missao.html">CONTINUAR</a>
            </div>
          </section>

          <section class="student-premium-card-grid" aria-label="Areas principais do aluno">
            ${[
              { title: "Minha Arvore", text: "Continue aprendendo e veja sua arvore crescer.", href: "arvore.html", icon: "tree", tone: "green", cta: "VER" },
              { title: "Meus Livros", text: "Explore seus livros favoritos.", href: "biblioteca.html", icon: "book", tone: "blue", cta: "ABRIR" },
              { title: "Jogar e Descobrir", text: "Jogos divertidos para aprender brincando.", href: "jogos.html", icon: "game", tone: "purple", cta: "JOGAR" },
            ].map(renderStudentPremiumCard).join("")}
          </section>
        </main>
        ${renderStudentQuickRail()}
      </div>
    </main>
  </section>
`;

const renderStudentActivitiesPage = () => `
  <div class="student-dashboard student-pedro-home" data-student-dashboard>
    <section class="student-pedro-hero">
      <div><span>MINHAS ATIVIDADES</span><h1>OLA, PEDRO!</h1></div>
      ${studentLazyImg(pilotProfiles.student.avatar, "", "student-avatar")}
      <button class="student-logout-button" type="button" data-platform-logout>SAIR</button>
    </section>
    ${renderStudentUniversalActivities()}
  </div>
`;

const getStudentFirstName = () => {
  const session = getPlatformSession();
  const candidate = session.role === "aluno" ? session.name || session.email : pilotProfiles.student.name;
  const normalized = String(candidate || "").trim();
  if (!normalized || normalized.includes("@")) {
    return normalized.toLowerCase().includes("pedro") ? "Pedro" : pilotProfiles.student.name;
  }
  return normalized.split(/\s+/)[0] || pilotProfiles.student.name;
};

const renderTeacherWorkspaceView = (view) => {
  const { books, experiences, activities } = getTeacherBibliotecaResources();
  const resourceCards = [
    ...books.map((book) => ({ kind: "Livro", title: book.title, detail: `${book.subtitle} · ${book.ageGroup.replace("EI", "")} anos`, cover: book.coverAsset, view: "biblioteca" })),
    ...experiences.map((experience) => ({ kind: "Exp", title: experience.title, detail: `${experience.unitTitle || experience.unit} · ${experience.pageStart || ""}-${experience.pageEnd || ""}`, view: "experiencias" })),
    ...activities.slice(0, 3).map((activity) => ({ kind: "Ativ", title: activity.title, detail: activity.type, view: "experiencias" })),
  ];
  const viewMap = {
    inicio: `
      <section class="tw-overview-grid">
        <div class="tw-column">
          <div class="tw-section-head"><h2>Aulas de hoje</h2><button type="button" data-teacher-view="planejamentos">Ver semana</button></div>
          ${renderPremiumEmpty("SEM AULAS PUBLICADAS PARA HOJE", "Quando houver planejamento real, ele aparecera aqui.", "green")}
        </div>
        <div class="tw-column">
          <div class="tw-section-head"><h2>Pendencias</h2><button type="button" data-teacher-view="avaliacoes">Corrigir</button></div>
          ${renderPremiumEmpty("NENHUMA PENDENCIA NO MOMENTO", "As pendencias reais serao exibidas quando a turma tiver registros.", "orange")}
        </div>
        <div class="tw-column">
          <div class="tw-section-head"><h2>Turmas</h2><button type="button" data-teacher-view="turmas">Abrir</button></div>
          ${teacherWorkspaceClasses.map(renderClassCard).join("")}
        </div>
      </section>
    `,
    notificacoes: `
      <section class="tw-board">
        <div class="tw-section-head"><h2>Notificacoes</h2><button type="button" data-teacher-view="inicio">Voltar</button></div>
        ${renderPremiumEmpty("NENHUMA NOTIFICACAO NOVA", "Avisos da plataforma aparecerao aqui quando forem enviados.", "red")}
      </section>
    `,
    calendario: `
      <section class="tw-board">
        <div class="tw-section-head"><h2>Calendario</h2><button type="button" data-teacher-view="planejamentos">Planejar</button></div>
        ${renderPremiumEmpty("SEM COMPROMISSOS PARA HOJE", "Sua agenda pedagogica aparecera aqui quando houver eventos.", "blue")}
      </section>
    `,
    mensagens: `
      <section class="tw-board">
        <div class="tw-section-head"><h2>Mensagens</h2><button type="button" data-teacher-view="inicio">Voltar</button></div>
        ${renderPremiumEmpty("NENHUMA MENSAGEM NOVA", "As conversas da escola e das familias aparecerao aqui.", "teal")}
      </section>
    `,
    acesso: `
      <section class="tw-board tw-card-grid">
        ${[
          { title: "Abrir Biblioteca Viva", detail: "Livros, experiencias e atividades", view: "biblioteca" },
          { title: "Corrigir avaliacoes", detail: "Nenhuma correcao pendente no momento", view: "avaliacoes" },
          { title: "Ver relatorios", detail: "Relatorios reais aparecerao aqui", view: "relatorios" },
        ].map((item) => renderRecommendationCard({ type: "Atalho", title: item.title, detail: item.detail, view: item.view, action: "Abrir" })).join("")}
      </section>
    `,
    perfil: `
      <section class="tw-board tw-card-grid">
        ${renderTeacherCard()}
        <article class="tw-metric-card"><span>Agenda</span><strong>Manha e tarde</strong><small>Educacao Infantil</small></article>
        <article class="tw-metric-card"><span>Turmas</span><strong>${pilotProfiles.class.name}</strong><small>Turma piloto vinculada</small></article>
      </section>
    `,
    planejamentos: `
      <section class="tw-board">
        <div class="tw-section-head"><h2>Planejamentos</h2><button type="button">Novo plano</button></div>
        ${teacherWorkspaceLessons.map(renderPlanningCard).join("")}
      </section>
    `,
    turmas: `
      <section class="tw-board tw-card-grid">
        ${teacherWorkspaceClasses.map(renderClassCard).join("")}
      </section>
    `,
    alunos: `
      <section class="tw-board">
        <div class="tw-section-head"><h2>Alunos</h2><button type="button">Adicionar observacao</button></div>
        ${teacherWorkspaceStudents.map(renderStudentCard).join("")}
      </section>
      ${renderUniversalActivityTeacherPortfolio()}
    `,
    biblioteca: `
      <section class="tw-board">
        <div class="tw-section-head"><h2>Biblioteca Viva</h2><span>${books.length} livros oficiais</span></div>
        <div class="tw-resource-grid">${resourceCards.filter((item) => item.kind === "Livro").map(renderResourceCard).join("")}</div>
      </section>
    `,
    atividades: `
      <section class="tw-board">
        <div class="tw-section-head"><h2>Atividades Imprimiveis</h2><button type="button" data-teacher-open-url="atividades.html">Abrir banco</button></div>
        <div class="tw-card-grid">
          <article class="tw-recommendation-card" data-teacher-search-item>
            <span>Atividades Imprimiveis</span>
            <strong>Banco de Atividades Imprimiveis</strong>
            <small>Encontre, visualize e imprima atividades organizadas por faixa etaria, objetivo e campo de experiencias.</small>
            <button type="button" data-teacher-open-url="atividades.html">Abrir</button>
          </article>
          ${renderPrintableAgeCards()}
        </div>
      </section>
    `,
    favoritos: `
      <section class="tw-board">
        <div class="tw-section-head"><h2>Favoritos</h2><button type="button" data-teacher-open-url="atividades.html?favoritos=1">Ver atividades favoritas</button></div>
        <div class="tw-card-grid">
          <article class="tw-metric-card"><span>Biblioteca Viva</span><strong>Favoritos digitais</strong><small>Livros e experiencias continuam no modulo Biblioteca Viva.</small></article>
          <article class="tw-metric-card"><span>Imprimiveis</span><strong>${printableActivitiesDataService.state().favorites.length}</strong><small>atividades salvas localmente neste dispositivo</small></article>
        </div>
      </section>
    `,
    experiencias: `
      <section class="tw-board">
        <div class="tw-section-head"><h2>Experiencias e atividades</h2><span>${experiences.length} experiencias · ${activities.length} atividades</span></div>
        <div class="tw-resource-grid">${resourceCards.filter((item) => item.kind !== "Livro").map(renderResourceCard).join("")}</div>
      </section>
    `,
    jogos: `
      <section class="tw-board tw-placeholder"><h2>Jogos</h2><p>Jogos pedagogicos serao organizados aqui, usando o mesmo workspace.</p></section>
    `,
    avaliacoes: `
      <section class="tw-board">
        <div class="tw-section-head"><h2>Avaliacoes</h2><button type="button" data-teacher-view="inicio">Voltar</button></div>
        ${renderPremiumEmpty("NENHUMA AVALIACAO PENDENTE", "As avaliacoes reais aparecerao aqui quando forem publicadas.", "purple")}
      </section>
    `,
    relatorios: `
      ${renderUniversalActivityTeacherDeliveries()}
      <section class="tw-board">
        <div class="tw-section-head"><h2>Relatorios</h2><button type="button" data-teacher-view="inicio">Voltar</button></div>
        ${renderPremiumEmpty("RELATORIOS EM PREPARACAO", "Indicadores reais de progresso serao exibidos quando houver dados suficientes.", "blue")}
      </section>
    `,
    universidade: `
      <section class="tw-board tw-placeholder"><h2>Universidade</h2><p>Formacao docente, trilhas e certificados abrirao neste painel.</p></section>
    `,
    configuracoes: `
      <section class="tw-board tw-placeholder"><h2>Configuracoes</h2><p>Preferencias do workspace, notificacoes e atalhos ficarao aqui.</p></section>
    `,
  };
  return viewMap[view] || viewMap.inicio;
};

const adminFeatureRegistry = [
  { key: "plataforma", label: "Plataforma", area: "Visao geral", status: "PUBLICADO", href: "plataforma.html", roles: { admin: true, professor: true, aluno: true } },
  { key: "professor", label: "Ambiente Professor", area: "Usuarios e acessos", status: "HOMOLOGADO", href: "professor.html", roles: { admin: true, professor: true, aluno: false } },
  { key: "aluno", label: "Ambiente Aluno", area: "Usuarios e acessos", status: "HOMOLOGADO", href: "aluno.html", roles: { admin: true, professor: false, aluno: true } },
  { key: "biblioteca", label: "Biblioteca Viva", area: "Conteudos", status: "PUBLICADO", href: "biblioteca.html", roles: { admin: true, professor: true, aluno: true } },
  { key: "atividades", label: "Atividades Imprimiveis", area: "Conteudos", status: "EM TESTE", href: "admin-atividades.html", roles: { admin: true, professor: true, aluno: false } },
  { key: "experiencias", label: "Experiencias Digitais", area: "Conteudos", status: "EM TESTE", href: "biblioteca.html#acervo-completo", roles: { admin: true, professor: true, aluno: true } },
  { key: "jogos", label: "Jogos", area: "Conteudos", status: "EM DESENVOLVIMENTO", href: "jogos.html", roles: { admin: true, professor: true, aluno: true } },
  { key: "planejamentos", label: "Planejamentos", area: "Gestao pedagogica", status: "EM DESENVOLVIMENTO", href: "professor.html", roles: { admin: true, professor: true, aluno: false } },
  { key: "avaliacoes", label: "Avalia+", area: "Conteudos", status: "EM TESTE", href: "avalia.html", roles: { admin: true, professor: true, aluno: false } },
  { key: "banco", label: "Banco de Questoes", area: "Conteudos", status: "EM TESTE", href: "banco-questoes.html", roles: { admin: true, professor: true, aluno: false } },
  { key: "universidade", label: "Universidade", area: "Conteudos", status: "EM TESTE", href: "universidade.html", roles: { admin: true, professor: true, aluno: false } },
  { key: "bookViewer", label: "Book Viewer", area: "Motores", status: "HOMOLOGADO", href: "book-viewer.html", roles: { admin: true, professor: true, aluno: true } },
  { key: "motorUniversal", label: "Motor Universal de Atividades", area: "Motores", status: "EM DESENVOLVIMENTO", href: "motor-atividade.html", roles: { admin: true, professor: false, aluno: true } },
  { key: "motorJogos", label: "Motor de Jogos", area: "Motores", status: "EM DESENVOLVIMENTO", href: "jogos.html", roles: { admin: true, professor: true, aluno: true } },
  { key: "pintura", label: "Pintura / Desenho", area: "Motores", status: "EM DESENVOLVIMENTO", href: "motor-atividade.html", roles: { admin: true, professor: false, aluno: true } },
  { key: "arrastar", label: "Arrastar e Soltar", area: "Motores", status: "EM DESENVOLVIMENTO", href: "motor-atividade.html", roles: { admin: true, professor: false, aluno: true } },
  { key: "pareamento", label: "Pareamento", area: "Motores", status: "EM DESENVOLVIMENTO", href: "motor-atividade.html", roles: { admin: true, professor: false, aluno: true } },
  { key: "audioVideo", label: "Audio / Video Interativo", area: "Motores", status: "EM DESENVOLVIMENTO", href: "biblioteca.html", roles: { admin: true, professor: true, aluno: true } },
  { key: "atribuicoes", label: "Atribuicoes", area: "Gestao pedagogica", status: "EM DESENVOLVIMENTO", href: "professor.html", roles: { admin: true, professor: true, aluno: false } },
  { key: "producoes", label: "Producoes dos Alunos", area: "Gestao pedagogica", status: "EM DESENVOLVIMENTO", href: "professor.html", roles: { admin: true, professor: true, aluno: false } },
  { key: "relatorios", label: "Relatorios", area: "Gestao pedagogica", status: "EM DESENVOLVIMENTO", href: "professor.html", roles: { admin: true, professor: true, aluno: false } },
  { key: "adminAtividades", label: "Admin de Atividades", area: "Sistema / TI", status: "EM TESTE", href: "admin-atividades.html", roles: { admin: true, professor: false, aluno: false } },
];

const adminWorkspaceNav = [
  ["heading", "Visao geral"],
  ["inicio", "Inicio"],
  ["plataforma", "Painel da Plataforma"],
  ["status", "Status dos Modulos"],
  ["heading", "Usuarios e acessos"],
  ["usuarios", "Usuarios"],
  ["professores", "Professores"],
  ["alunos", "Alunos"],
  ["gestores", "Gestores"],
  ["escolas", "Escolas"],
  ["turmas", "Turmas"],
  ["permissoes", "Perfis e Permissoes"],
  ["heading", "Conteudos"],
  ["biblioteca", "Biblioteca Viva"],
  ["atividades", "Atividades Imprimiveis"],
  ["experiencias", "Experiencias Digitais"],
  ["jogos", "Jogos"],
  ["planejamentos", "Planejamentos"],
  ["avaliacoes", "Avaliacoes"],
  ["banco", "Banco de Questoes"],
  ["universidade", "Universidade"],
  ["heading", "Motores"],
  ["bookViewer", "Book Viewer"],
  ["motorUniversal", "Motor Universal"],
  ["motorJogos", "Motor de Jogos"],
  ["pintura", "Pintura / Desenho"],
  ["arrastar", "Arrastar e Soltar"],
  ["pareamento", "Pareamento"],
  ["audioVideo", "Audio / Video Interativo"],
  ["outrosMotores", "Outros Motores"],
  ["heading", "Gestao pedagogica"],
  ["atribuicoes", "Atribuicoes"],
  ["missoes", "Missoes"],
  ["producoes", "Producoes dos Alunos"],
  ["progresso", "Progresso"],
  ["relatorios", "Relatorios"],
  ["conquistas", "Conquistas / Gamificacao"],
  ["heading", "Comunicacao"],
  ["mensagens", "Mensagens"],
  ["notificacoes", "Notificacoes"],
  ["familia", "Familia"],
  ["heading", "Sistema / TI"],
  ["adminAtividades", "Admin de Atividades"],
  ["assets", "Assets / Arquivos"],
  ["configuracoes", "Configuracoes"],
  ["logs", "Logs"],
];

const adminPlatformTabs = [
  { label: "Site", href: "index.html", status: "publico" },
  { label: "Inicio", href: "plataforma.html", status: "pronto" },
  { label: "Admin / TI", view: "inicio", status: "ativo" },
  { label: "Escola", href: "escola.html", status: "homologar" },
  { label: "Educacao Infantil", href: "educacao-infantil.html", status: "homologar" },
  { label: "Aluno", href: "aluno.html", status: "homologar" },
  { label: "Minha Arvore", href: "arvore.html", status: "pronto" },
  { label: "Missao do Dia", href: "missao.html", status: "pronto" },
  { label: "Jogos", href: "jogos.html", status: "teste" },
  { label: "Perfil", href: "perfil.html", status: "pronto" },
  { label: "Biblioteca", href: "biblioteca.html", status: "pronto" },
  { label: "Aluno & Familia", href: "familia.html", status: "homologar" },
  { label: "Universidade", href: "universidade.html", status: "teste" },
  { label: "Book Viewer", href: "book-viewer.html", status: "homologado" },
  { label: "Professor", href: "professor.html", status: "homologar" },
  { label: "Minha Turma", href: "professor-turma.html", status: "pronto" },
  { label: "Aluno Pedro", href: "professor-aluno.html?id=pedro", status: "pronto" },
  { label: "Atividades Imprimiveis", href: "atividades.html", status: "teste" },
  { label: "Motor de Atividades", href: "motor-atividade.html", status: "construcao" },
  { label: "Admin Atividades", href: "admin-atividades.html", status: "ti" },
  { label: "Avalia+", href: "avalia.html", status: "teste" },
  { label: "Banco de Questoes", href: "banco-questoes.html", status: "teste" },
  { label: "Secretaria", href: "secretaria.html", status: "gestao" },
  { label: "Gestor", href: "gestor.html", status: "gestao" },
];

const getAdminFeature = (key) => adminFeatureRegistry.find((item) => item.key === key);
const getAdminFeatureStatusClass = (status) =>
  `is-${String(status || "em-desenvolvimento").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")}`;
const getAdminFeaturePolicy = (key) => getAdminFeature(key)?.roles || { admin: true, professor: false, aluno: false };

const renderAdminPlatformTabs = (active = "inicio") => `
  <nav class="admin-platform-tabs" aria-label="Todas as abas da plataforma">
    ${adminPlatformTabs
      .map((tab) => {
        const isActive = tab.view === active || (!tab.view && tab.href === "admin.html" && active === "inicio");
        const attrs = tab.view ? `href="#${tab.view}" data-admin-view="${tab.view}"` : `href="${tab.href}"`;
        return `<a ${attrs} class="${isActive ? "is-active" : ""}" data-status="${tab.status}">${tab.label}</a>`;
      })
      .join("")}
  </nav>
`;

const renderAdminHomologationHub = () => `
  <section class="admin-board admin-homologation-hub" aria-label="Homologacao de ambientes">
    <div class="admin-section-head">
      <h2>Homologacao professor e aluno</h2>
      <span>Atalhos para conferir as correcoes visuais e funcionais</span>
    </div>
    <div class="admin-feature-grid">
      ${[
        { label: "Home do Professor", area: "Professor", status: "HOMOLOGAR", href: "professor.html" },
        { label: "Turma da Professora", area: "Professor", status: "PRONTO", href: "professor-turma.html" },
        { label: "Aluno Pedro visto pela professora", area: "Professor", status: "PRONTO", href: "professor-aluno.html?id=pedro" },
        { label: "Home do Aluno", area: "Aluno", status: "HOMOLOGAR", href: "aluno.html" },
        { label: "Atividades do Aluno", area: "Aluno", status: "PRONTO", href: "aluno-atividades.html" },
        { label: "Missao, arvore e jogos", area: "Aluno", status: "PRONTO", href: "missao.html" },
      ].map(renderAdminFeatureCard).join("")}
    </div>
  </section>
`;

const renderAdminFeatureCard = (item) => `
  <article class="admin-feature-card" data-admin-search-item>
    <div>
      <span>${item.area}</span>
      <strong>${item.label}</strong>
      <small class="${getAdminFeatureStatusClass(item.status)}">${item.status}</small>
    </div>
    <a href="${item.href}">Abrir</a>
  </article>
`;

const renderAdminSidebar = (active = "inicio") => `
  <aside class="admin-sidebar">
    <div class="admin-id-card">
      <span>ADMIN / TI</span>
      <strong>Raizes e Saberes</strong>
      <small>${getPlatformSession().email || "admin.ti@raizesesaberes.com.br"}</small>
    </div>
    <nav aria-label="Menu Admin">
      ${adminWorkspaceNav
        .map(([key, label]) =>
          key === "heading"
            ? `<strong class="tw-nav-heading">${label}</strong>`
            : `<button type="button" data-admin-view="${key}" class="${key === active ? "is-active" : ""}">${label}</button>`
        )
        .join("")}
      <button class="platform-logout-button" type="button" data-platform-logout>SAIR</button>
    </nav>
  </aside>
`;

const renderAdminPermissionMatrix = () => `
  <section class="admin-board">
    <div class="admin-section-head">
      <h2>Liberacao por perfil</h2>
      <span>Registro central preparado para feature flags</span>
    </div>
    <div class="admin-permission-table" role="table" aria-label="Liberacao de funcionalidades por perfil">
      <div role="row"><strong>Funcionalidade</strong><strong>Admin</strong><strong>Professor</strong><strong>Aluno</strong></div>
      ${adminFeatureRegistry
        .map((item) => {
          const policy = getAdminFeaturePolicy(item.key);
          return `<div role="row"><span>${item.label}</span><b>${policy.admin ? "SIM" : "NAO"}</b><b>${policy.professor ? "SIM" : "NAO"}</b><b>${policy.aluno ? "SIM" : "NAO"}</b></div>`;
        })
        .join("")}
    </div>
  </section>
`;

const renderAdminWorkspaceView = (view = "inicio") => {
  const feature = getAdminFeature(view);
  const byArea = (area) => adminFeatureRegistry.filter((item) => item.area === area);
  const development = adminFeatureRegistry.filter((item) => item.status === "EM DESENVOLVIMENTO");
  const homologated = adminFeatureRegistry.filter((item) => item.status === "HOMOLOGADO" || item.status === "PUBLICADO");
  const viewMap = {
    inicio: `
      <section class="admin-home-grid" aria-label="Areas principais do Admin">
        ${["PLATAFORMA", "USUARIOS", "CONTEUDOS", "MOTORES", "GESTAO PEDAGOGICA", "EM DESENVOLVIMENTO", "HOMOLOGADOS", "STATUS DO SISTEMA"]
          .map(
            (title) => `
              <article class="admin-home-card" data-admin-search-item>
                <span>QG da Plataforma</span>
                <strong>${title}</strong>
                <p>Area preparada para diagnostico, homologacao e liberacao controlada por perfil.</p>
              </article>
            `
          )
          .join("")}
      </section>
      ${renderAdminHomologationHub()}
      ${renderAdminPermissionMatrix()}
    `,
    plataforma: `
      <section class="admin-board">
        <div class="admin-section-head"><h2>Painel da Plataforma</h2><span>Fluxo oficial de desenvolvimento</span></div>
        <div class="admin-flow">
          ${["Construir", "Disponibilizar no Admin/TI", "Testar", "Homologar", "Liberar por perfil", "Publicar"].map((step) => `<article>${step}</article>`).join("")}
        </div>
      </section>
    `,
    status: `
      <section class="admin-board">
        <div class="admin-section-head"><h2>Status dos Modulos</h2><span>Estados encontrados no projeto</span></div>
        <div class="admin-feature-grid">${adminFeatureRegistry.map(renderAdminFeatureCard).join("")}</div>
      </section>
    `,
    usuarios: `
      <section class="admin-board admin-empty-state">
        <h2>Usuarios</h2>
        <p>Helena e Pedro usam usuarios reais do Supabase Auth. O usuario Admin/TI deve existir no Supabase com app_metadata.platform_role = admin antes do login real.</p>
      </section>
      ${renderAdminPermissionMatrix()}
    `,
    professores: `<section class="admin-board admin-empty-state"><h2>Professores</h2><p>Ambiente da Professora Helena reaproveitado para regressao e validacao pedagogica.</p><a href="professor.html">Abrir ambiente professor</a></section>`,
    alunos: `<section class="admin-board admin-empty-state"><h2>Alunos</h2><p>Ambiente do aluno Pedro reaproveitado para regressao e validacao infantil.</p><a href="aluno.html">Abrir ambiente aluno</a></section>`,
    familia: `<section class="admin-board admin-empty-state"><h2>Familia</h2><p>Aba registrada para acompanhar a futura area da familia. Como a rota protegida hoje pertence ao aluno, o Admin/TI mantem este espaco como homologacao interna sem acesso indevido.</p></section>`,
    permissoes: renderAdminPermissionMatrix(),
    biblioteca: `<section class="admin-board"><div class="admin-section-head"><h2>Conteudos</h2><span>Biblioteca e materiais existentes</span></div><div class="admin-feature-grid">${byArea("Conteudos").map(renderAdminFeatureCard).join("")}</div></section>`,
    atividades: `<section class="admin-board admin-empty-state"><h2>Atividades Imprimiveis</h2><p>Modulo administrativo existente reaproveitado. Use-o para curadoria e homologacao dos imprimiveis.</p><a href="admin-atividades.html">Abrir Admin de Atividades</a></section>`,
    motores: `<section class="admin-board"><div class="admin-section-head"><h2>Motores</h2><span>Sem duplicar engines existentes</span></div><div class="admin-feature-grid">${byArea("Motores").map(renderAdminFeatureCard).join("")}</div></section>`,
    emDesenvolvimento: `<section class="admin-board"><div class="admin-section-head"><h2>Em desenvolvimento</h2><span>Acesso restrito ao Admin/TI</span></div><div class="admin-feature-grid">${development.map(renderAdminFeatureCard).join("")}</div></section>`,
    homologados: `<section class="admin-board"><div class="admin-section-head"><h2>Homologados e publicados</h2><span>Disponiveis conforme perfil</span></div><div class="admin-feature-grid">${homologated.map(renderAdminFeatureCard).join("")}</div></section>`,
    logs: `<section class="admin-board admin-empty-state"><h2>Logs</h2><p>Espaco reservado para backend seguro, Edge Function ou servico server-side. Nenhum segredo e exposto no frontend.</p></section>`,
    configuracoes: `<section class="admin-board admin-empty-state"><h2>Configuracoes</h2><p>Controle tecnico preparado para proximas etapas sem armazenar tokens, senhas ou service role no frontend.</p></section>`,
  };
  if (feature) {
    return `<section class="admin-board admin-empty-state"><h2>${feature.label}</h2><p>Status atual: ${feature.status}. Modulo existente reaproveitado no QG sem criar tela duplicada.</p><a href="${feature.href}">Abrir modulo</a></section>`;
  }
  return viewMap[view] || `<section class="admin-board admin-empty-state"><h2>${adminWorkspaceNav.find(([key]) => key === view)?.[1] || "Modulo"}</h2><p>Estrutura reservada para desenvolvimento futuro e liberacao segura por perfil.</p></section>`;
};

const renderAdminDashboard = () => `
  <section class="admin-workspace" data-admin-workspace>
    ${renderAdminSidebar("inicio")}
    <main class="admin-main">
      <header class="admin-topbar">
        <label><span>Busca Admin</span><input type="search" placeholder="Buscar modulos, usuarios, status..." data-admin-search /></label>
        <button type="button" data-admin-view="status">Status</button>
        <button type="button" data-admin-view="permissoes">Permissoes</button>
        <button type="button" data-platform-logout>SAIR</button>
      </header>
      ${renderAdminPlatformTabs("inicio")}
      <section class="admin-hero">
        <div>
          <span>QG DA PLATAFORMA</span>
          <h1>RAIZES E SABERES EDUCACIONAL</h1>
          <p>Ambiente ADMIN / TI para acompanhar construcao, homologacao, liberacao por perfil e operacao tecnica da plataforma.</p>
        </div>
        <div class="admin-hero-badges">
          <span>LOGIN UNICO</span>
          <span>SUPABASE AUTH</span>
          <span>PLATFORM_ROLE</span>
        </div>
      </section>
      <section class="admin-content" data-admin-content>${renderAdminWorkspaceView("inicio")}</section>
    </main>
  </section>
`;

const initAdminWorkspace = () => {
  const workspace = document.querySelector("[data-admin-workspace]");
  if (!workspace) return;
  const content = workspace.querySelector("[data-admin-content]");
  const activate = (view) => {
    workspace.querySelectorAll("[data-admin-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.adminView === view));
    if (content) content.innerHTML = renderAdminWorkspaceView(view);
  };
  workspace.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-admin-view]");
    if (!button) return;
    event.preventDefault();
    activate(button.dataset.adminView || "inicio");
  });
  workspace.querySelector("[data-admin-search]")?.addEventListener("input", (event) => {
    const term = String(event.target.value || "").trim().toLowerCase();
    workspace.querySelectorAll("[data-admin-search-item]").forEach((item) => {
      item.hidden = term ? !item.textContent.toLowerCase().includes(term) : false;
    });
  });
};

const schoolCollectiveData = {
  institution: {
    school_id: "school-demo-descobertas",
    school_name: "Escola das Descobertas",
    education_stage: "Educacao Infantil",
    municipality_name: "Municipio das Descobertas",
    school_logo: "",
  },
  defaultAge: "4",
  ages: {
    2: {
      label: "2 anos",
      icon: "seed",
      accent: "green",
      challenge: null,
      games: [],
      books: [],
      suggestions: [],
      info: [],
    },
    3: {
      label: "3 anos",
      icon: "butterfly",
      accent: "purple",
      challenge: {
        title: "Pequenos exploradores",
        description: "Observe imagens, cores e sons com a turma.",
        href: "jogos.html?idade=3",
        image: "assets/home-official/banner_jardim.png",
      },
      games: [
        { title: "Caixa Misteriosa", description: "Descubra objetos por pistas.", href: "jogos.html", image: "assets/games/caixa-misteriosa/screens/screen-intro.png" },
        { title: "Rotina do Pipo", description: "Organize momentos do dia.", href: "jogos.html", image: "assets/games/rotina-pipo/screens/screen-intro.png" },
      ],
      books: [
        { title: "Infantil 3", volume: "Volume 1", href: "book-viewer.html?book=livro-001", image: "assets/_legacy-root/RAIZES_INFANTIL3_VOL1_BIBLIOTECA.webp" },
      ],
      suggestions: [
        { type: "PARA LER", title: "Historia curta em roda.", cta: "LER", href: "biblioteca.html", tone: "pink" },
      ],
      info: [
        { type: "LEMBRETE", title: "Trazer garrafinha", message: "Amanha teremos atividade no patio.", tone: "green" },
      ],
    },
    4: {
      label: "4 anos",
      icon: "leaf",
      accent: "green",
      challenge: {
        title: "As cores do nosso jardim",
        description: "Encontre as cores e complete a descoberta!",
        href: "jogos.html?desafio=jardim-cores&idade=4",
        image: "assets/home-official/banner_jardim.png",
      },
      games: [
        { title: "Jogo das Cores", description: "Descubra e combine as cores do jardim.", href: "jogos.html", image: "assets/games/atelie-bia/screens/screen-intro.png" },
        { title: "Formas Divertidas", description: "Aprenda brincando com as formas.", href: "jogos.html", image: "assets/games/formas-casa/screens/screen-intro.png" },
        { title: "Jardim das Descobertas", description: "Explore, encontre e aprenda com a natureza.", href: "jogos.html", image: "assets/games/jardim-descobertas/screens/screen-intro.png" },
      ],
      books: [
        { title: "Infantil 4", volume: "Volume 1", href: "book-viewer.html?book=livro-001", image: "assets/biblioteca/RAIZES_INFANTIL4_VOL1_BIBLIOTECA.jpg" },
        { title: "Infantil 4", volume: "Volume 2", href: "book-viewer.html?book=livro-002", image: "assets/biblioteca/RAIZES_INFANTIL4_VOL2_BIBLIOTECA.jpg" },
        { title: "Infantil 5", volume: "Volume 1", href: "book-viewer.html?book=livro-003", image: "assets/biblioteca/RAIZES_INFANTIL5_VOL1_BIBLIOTECA.jpg" },
      ],
      suggestions: [
        { type: "PARA LER", title: "Leia com sua familia a historia do jardim.", cta: "LER AGORA", href: "book-viewer.html?book=livro-001", tone: "pink" },
        { type: "VAMOS PRATICAR?", title: "Jogue novamente o jogo das cores.", cta: "JOGAR", href: "jogos.html", tone: "purple" },
        { type: "LEMBRETE", title: "Amanha vamos usar folhas secas.", cta: "", href: "", tone: "orange" },
      ],
      info: [
        { type: "COMUNICADO", title: "Reuniao de familias", message: "Sexta-feira as 18h.", tone: "orange" },
        { type: "EVENTO", title: "Semana da leitura", message: "24 a 28 de agosto.", tone: "green" },
        { type: "LEMBRETE", title: "Identificacao", message: "Nao esqueca de identificar os materiais.", tone: "green" },
      ],
    },
    5: {
      label: "5 anos",
      icon: "flower",
      accent: "orange",
      challenge: {
        title: "Missao dos pequenos cientistas",
        description: "Observe, compare e conte o que descobriu.",
        href: "jogos.html?idade=5",
        image: "assets/home-official/banner_alfabetizacao.png",
      },
      games: [
        { title: "Construindo a Ponte", description: "Resolva desafios em equipe.", href: "jogos.html", image: "assets/games/construindo-ponte/screens/screen-intro.png" },
        { title: "Caminho da Escola", description: "Siga pistas e complete o percurso.", href: "jogos.html", image: "assets/games/caminho-escola/screens/screen-intro.png" },
      ],
      books: [
        { title: "Infantil 5", volume: "Volume 1", href: "book-viewer.html?book=livro-004", image: "assets/biblioteca/RAIZES_INFANTIL5_VOL1_BIBLIOTECA.jpg" },
        { title: "Infantil 5", volume: "Volume 2", href: "book-viewer.html?book=livro-005", image: "assets/biblioteca/RAIZES_INFANTIL5_VOL2_BIBLIOTECA.jpg" },
      ],
      suggestions: [
        { type: "ESTUDO", title: "Prepare uma observacao sobre o jardim.", cta: "VER", href: "jogos.html", tone: "green" },
      ],
      info: [
        { type: "EVENTO", title: "Mostra das descobertas", message: "Exposicao coletiva na sexta.", tone: "green" },
      ],
    },
  },
};

const schoolIconMap = {
  seed: "2",
  butterfly: "3",
  leaf: "4",
  flower: "5",
  home: "IN",
  game: "G",
  star: "*",
  book: "B",
  user: "EU",
  exit: "S",
};

const renderSchoolIcon = (key) => `<span class="school-icon school-icon-${key}" aria-hidden="true">${schoolIconMap[key] || "."}</span>`;

const renderSchoolEmpty = (title, message = "Assim que a escola publicar, este espaco sera atualizado.") => `
  <div class="school-empty">
    <strong>${title}</strong>
    <span>${message}</span>
  </div>
`;

const renderSchoolChallenge = (ageData) => {
  if (!ageData.challenge) return renderSchoolEmpty("NOVO DESAFIO EM PREPARACAO.", "A equipe pedagogica ainda nao publicou um desafio para esta idade.");
  const challenge = ageData.challenge;
  return `
    <article class="school-challenge-card">
      <div>
        <span>${renderSchoolIcon("star")} DESAFIO DO DIA</span>
        <h2>${challenge.title}</h2>
        <p>${challenge.description}</p>
        <a class="school-primary-action" href="${challenge.href}"><span aria-hidden="true">PLAY</span> COMECAR DESAFIO</a>
      </div>
      <img src="${challenge.image}" alt="" loading="lazy" onerror="this.hidden=true" />
    </article>
  `;
};

const renderSchoolGames = (ageData) => {
  if (!ageData.games.length) return renderSchoolEmpty("NOVOS JOGOS CHEGAM EM BREVE.", "A curadoria ainda nao liberou jogos para esta idade.");
  return ageData.games
    .map(
      (game) => `
        <article class="school-game-card">
          <img src="${game.image}" alt="" loading="lazy" onerror="this.hidden=true" />
          <strong>${game.title}</strong>
          <p>${game.description}</p>
          <a href="${game.href}">${renderSchoolIcon("game")} JOGAR</a>
        </article>
      `
    )
    .join("");
};

const renderSchoolBooks = (ageData) => {
  if (!ageData.books.length) return renderSchoolEmpty("NOVAS LEITURAS CHEGAM EM BREVE.", "A biblioteca coletiva sera atualizada pela equipe.");
  return ageData.books
    .map(
      (book) => `
        <article class="school-book-card">
          <img src="${book.image}" alt="" loading="lazy" onerror="this.hidden=true" />
          <strong>${book.title}</strong>
          <span>${book.volume}</span>
          <a href="${book.href}">${renderSchoolIcon("book")} LER</a>
        </article>
      `
    )
    .join("");
};

const renderSchoolSuggestions = (ageData) => {
  if (!ageData.suggestions.length) return renderSchoolEmpty("NENHUMA NOVA SUGESTAO DA PROFESSORA.", "Quando uma professora publicar sugestoes, elas aparecerao aqui.");
  return ageData.suggestions
    .map(
      (item) => `
        <article class="school-suggestion-card is-${item.tone}">
          <span>${item.type}</span>
          <p>${item.title}</p>
          ${item.href ? `<a href="${item.href}">${item.cta || "ABRIR"}</a>` : ""}
        </article>
      `
    )
    .join("");
};

const renderSchoolInfo = (ageData) => {
  if (!ageData.info.length) return renderSchoolEmpty("NENHUM NOVO COMUNICADO DA ESCOLA.", "A escola ainda nao publicou informacoes para esta idade.");
  return ageData.info
    .map(
      (item) => `
        <article class="school-info-card is-${item.tone}">
          <span>${item.type}</span>
          <strong>${item.title}</strong>
          <p>${item.message}</p>
        </article>
      `
    )
    .join("");
};

const renderSchoolInstitutionalDashboard = () => {
  const { institution, ages } = schoolCollectiveData;
  const activeAge = ages[schoolCollectiveData.defaultAge] || Object.values(ages)[0];
  return `
    <section class="school-institutional" data-school-institutional>
      <header class="school-context-strip">
        <div>
          <span>Acesso Escola</span>
          <h1>${institution.school_name}</h1>
          <p>${institution.education_stage} - ${institution.municipality_name}</p>
        </div>
        <div class="school-logo-slot">
          ${institution.school_logo ? `<img src="${institution.school_logo}" alt="Logomarca da escola" />` : `<span>LOGOMARCA<br>DA ESCOLA</span>`}
        </div>
      </header>
      <section class="school-institutional-hero">
        <div>
          <span>O que esta acontecendo na minha escola?</span>
          <h2>Informacoes, comunicados e proximos acontecimentos em um so lugar.</h2>
          <p>Este ambiente concentra a identidade institucional da unidade, comunicados, eventos, lembretes e sugestoes publicadas pela equipe escolar.</p>
          <a href="educacao-infantil.html">Entrar na Educacao Infantil</a>
        </div>
        <img src="assets/home-official/banner_jardim.png" alt="" onerror="this.hidden=true" />
      </section>
      <div class="school-institutional-grid">
        <section class="school-panel school-info-panel">
          <div class="school-panel-head"><h2>Informacoes da Escola</h2></div>
          <div class="school-info-grid">${renderSchoolInfo(activeAge)}</div>
        </section>
        <section class="school-panel school-suggestions-panel">
          <div class="school-panel-head"><h2>Sugestoes da Professora</h2></div>
          <div class="school-suggestion-list">${renderSchoolSuggestions(activeAge)}</div>
        </section>
        <section class="school-panel school-access-panel">
          <div class="school-panel-head"><h2>Ambientes Vinculados</h2></div>
          <article>
            <strong>Educacao Infantil</strong>
            <p>Ambiente coletivo pedagogico para desafios, jogos, leitura e experiencias por idade.</p>
            <a href="educacao-infantil.html">Espaco Educacao Infantil</a>
          </article>
        </section>
      </div>
    </section>
  `;
};

const renderEarlyChildhoodDashboard = () => {
  const { institution, ages, defaultAge } = schoolCollectiveData;
  const activeAge = ages[defaultAge] || Object.values(ages)[0];
  return `
    <section class="school-collective" data-school-collective data-active-age="${defaultAge}">
      <header class="school-context-strip">
        <div>
          <span>Acesso Educacao Infantil</span>
          <h1>Educacao Infantil</h1>
          <p>${institution.school_name} - ${institution.municipality_name}</p>
        </div>
        <div class="school-logo-slot">
          ${institution.school_logo ? `<img src="${institution.school_logo}" alt="Logomarca da escola" />` : `<span>LOGOMARCA<br>DA ESCOLA</span>`}
        </div>
      </header>
      <main class="school-dashboard-grid">
        <section class="school-welcome-card">
          <div>
            <h2>Bem-vindos a ${institution.school_name}!</h2>
            <p>Escolha sua idade e comece uma nova descoberta.</p>
          </div>
          <img src="assets/home-official/hero_children.png" alt="" onerror="this.hidden=true" />
        </section>
        <section id="desafio-do-dia" class="school-live-slot" data-school-slot="challenge">${renderSchoolChallenge(activeAge)}</section>
        <section class="school-age-filter" aria-label="Escolha a idade">
          ${Object.entries(ages)
            .map(
              ([age, item]) => `
                <button class="is-${item.accent} ${age === defaultAge ? "is-active" : ""}" type="button" data-school-age="${age}">
                  ${renderSchoolIcon(item.icon)}
                  <strong>${item.label}</strong>
                </button>
              `
            )
            .join("")}
        </section>
        <section class="school-panel school-games-panel">
          <div class="school-panel-head">
            <h2>${renderSchoolIcon("game")} Jogar e Descobrir</h2>
            <a data-school-link="games" href="jogos.html?idade=${defaultAge}">VER TODOS &gt;</a>
          </div>
          <div class="school-game-grid" data-school-slot="games">${renderSchoolGames(activeAge)}</div>
        </section>
        <section class="school-panel school-library-panel">
          <div class="school-panel-head">
            <h2>${renderSchoolIcon("book")} Biblioteca Viva</h2>
            <a data-school-link="books" href="biblioteca.html?idade=${defaultAge}">VER TODOS &gt;</a>
          </div>
          <div class="school-book-grid" data-school-slot="books">${renderSchoolBooks(activeAge)}</div>
        </section>
        <aside class="school-panel school-suggestions-panel">
          <div class="school-panel-head">
            <h2>Sugestoes da Professora</h2>
          </div>
          <div class="school-suggestion-list" data-school-slot="suggestions">${renderSchoolSuggestions(activeAge)}</div>
        </aside>
        <section class="school-panel school-info-panel">
          <div class="school-panel-head">
            <h2>Informacoes da Escola</h2>
          </div>
          <div class="school-info-grid" data-school-slot="info">${renderSchoolInfo(activeAge)}</div>
        </section>
        <figure class="school-illustration" aria-hidden="true">
          <img src="assets/home-official/banner_jardim.png" alt="" onerror="this.hidden=true" />
        </figure>
      </main>
    </section>
  `;
};

const initSchoolCollectiveDashboard = () => {
  const root = document.querySelector("[data-school-collective]");
  if (!root) return;
  const slots = {
    challenge: root.querySelector('[data-school-slot="challenge"]'),
    games: root.querySelector('[data-school-slot="games"]'),
    books: root.querySelector('[data-school-slot="books"]'),
    suggestions: root.querySelector('[data-school-slot="suggestions"]'),
    info: root.querySelector('[data-school-slot="info"]'),
  };
  const renderAge = (age) => {
    const ageData = schoolCollectiveData.ages[age] || schoolCollectiveData.ages[schoolCollectiveData.defaultAge];
    root.dataset.activeAge = age;
    root.querySelectorAll("[data-school-age]").forEach((button) => button.classList.toggle("is-active", button.dataset.schoolAge === age));
    if (slots.challenge) slots.challenge.innerHTML = renderSchoolChallenge(ageData);
    if (slots.games) slots.games.innerHTML = renderSchoolGames(ageData);
    if (slots.books) slots.books.innerHTML = renderSchoolBooks(ageData);
    if (slots.suggestions) slots.suggestions.innerHTML = renderSchoolSuggestions(ageData);
    if (slots.info) slots.info.innerHTML = renderSchoolInfo(ageData);
    root.querySelector('[data-school-link="games"]')?.setAttribute("href", `jogos.html?idade=${age}`);
    root.querySelector('[data-school-link="books"]')?.setAttribute("href", `biblioteca.html?idade=${age}`);
  };
  root.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-school-age]");
    if (!button) return;
    event.preventDefault();
    renderAge(button.dataset.schoolAge || schoolCollectiveData.defaultAge);
  });
};

const renderProfessorDashboard = () => {
  return renderProfessorProfilePage();
};

const familyAreaData = {
  student: {
    id: pilotProfiles.student.id,
    name: pilotProfiles.student.name,
    fullName: pilotProfiles.student.fullName,
    avatar: pilotProfiles.student.avatar,
    school: "Escola Raizes e Saberes",
    className: pilotProfiles.student.className,
    ageGroup: "Infantil 4 anos",
    shift: pilotProfiles.class.shift,
    schoolYear: "2026",
  },
  teacher: pilotProfiles.teacher.displayName,
  messages: [],
  bookActivities: [],
  onlineActivities: [],
  agenda: [],
  attendance: null,
  progress: {
    xp: getStudentGameSummary().totalXp,
    level: getStudentGameSummary().totalXp ? studentDashboardData.profile.level : "",
    percent: getStudentGameSummary().percent,
    achievements: studentDashboardData.medals,
    completedActivities: getStudentGameSummary().completedCount,
  },
  weekly: [],
  scheduleNotices: [],
};

const familyWeekDays = [
  ["seg", "SEG", "Segunda"],
  ["ter", "TER", "Terca"],
  ["qua", "QUA", "Quarta"],
  ["qui", "QUI", "Quinta"],
  ["sex", "SEX", "Sexta"],
];

const familyScheduleSlots = [
  ["1", "Horario 1"],
  ["2", "Horario 2"],
  ["3", "Horario 3"],
  ["4", "Horario 4"],
  ["5", "Horario 5"],
];

const familyScheduleStorageKey = () => `raizes:family-weekly-schedule:${familyAreaData.student.id || pilotProfiles.student.id}:v1`;
const familyNoticeStorageKey = () => `raizes:family-schedule-notices:${familyAreaData.student.id || pilotProfiles.student.id}:v1`;
const familyReadJsonList = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch (error) {
    return [];
  }
};
const familyWriteJsonList = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Nao foi possivel salvar a rotina semanal.", error);
  }
};
const familyIsoDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const familyMondayForDate = (date = new Date()) => {
  const current = new Date(date);
  const day = current.getDay() || 7;
  current.setDate(current.getDate() - day + 1);
  current.setHours(0, 0, 0, 0);
  return current;
};
const familyDateFromIso = (iso) => {
  const [year, month, day] = String(iso || "").split("-").map(Number);
  return year && month && day ? new Date(year, month - 1, day) : familyMondayForDate();
};
const familyWeekStartIso = () => familyIsoDate(familyMondayForDate());

const familyAreaViews = [
  ["inicio", "Inicio"],
  ["atividades", "Atividades"],
  ["agenda", "Agenda"],
  ["acompanhamento", "Acompanhamento"],
  ["perfil", "Perfil"],
];

const getFamilyView = () => {
  if (typeof window === "undefined") return "inicio";
  const view = new URLSearchParams(window.location.search).get("view") || "inicio";
  return familyAreaViews.some(([key]) => key === view) ? view : "inicio";
};

const renderFamilyEmpty = (title, text = "") => `
  <div class="family-empty-state">
    <strong>${title}</strong>
    ${text ? `<p>${text}</p>` : ""}
  </div>
`;

const renderFamilyMessageList = () =>
  familyAreaData.messages.length
    ? familyAreaData.messages
        .map((message) => `<article class="family-list-card family-message-card"><img src="assets/universidade/avatar-ana-carolina.webp" alt="" onerror="this.hidden=true" /><span>${message.origin}</span><strong>${message.title}</strong><p>${message.text}</p><small>${message.date}</small></article>`)
        .join("")
    : renderFamilyEmpty("NENHUM NOVO RECADO NO MOMENTO.");

const renderFamilyBookActivities = () =>
  familyAreaData.bookActivities.length
    ? familyAreaData.bookActivities
        .map(
          (activity) => `
            <article class="family-activity-card">
              <span>Livro</span>
              <strong>${activity.title}</strong>
              <dl>
                <div><dt>Livro</dt><dd>${activity.book}</dd></div>
                <div><dt>Volume</dt><dd>${activity.volume}</dd></div>
                <div><dt>Paginas</dt><dd>${activity.pages}</dd></div>
                <div><dt>Prazo</dt><dd>${activity.due || "Sem prazo informado"}</dd></div>
              </dl>
              <p>${activity.orientation}</p>
              <button type="button">Ver detalhes</button>
            </article>
          `
        )
        .join("")
    : renderFamilyEmpty("NENHUMA ATIVIDADE NO LIVRO PUBLICADA.");

const renderFamilyOnlineActivities = (filter = "todas") => {
  const filtered = familyAreaData.onlineActivities.filter((activity) => {
    if (filter === "pendentes") return ["NOVA", "EM ANDAMENTO"].includes(activity.status);
    if (filter === "concluidas") return ["CONCLUIDA", "ENVIADA"].includes(activity.status);
    return true;
  });
  return filtered.length
    ? filtered
        .map(
          (activity) => `
            <article class="family-activity-card">
              <span>${activity.status}</span>
              <strong>${activity.title}</strong>
              <p>${activity.instructions}</p>
              ${
                ["CONCLUIDA", "ENVIADA"].includes(activity.status)
                  ? `<button type="button" disabled>Atividade concluida</button>`
                  : `<a href="aluno-atividade.html?id=${activity.id}">Fazer atividade</a>`
              }
            </article>
          `
        )
        .join("")
    : renderFamilyEmpty("NAO HA ATIVIDADES ONLINE PENDENTES.");
};

const renderFamilyAgenda = () =>
  familyAreaData.agenda.length
    ? familyAreaData.agenda.map((item) => `<article class="family-list-card"><span>${item.date}</span><strong>${item.title}</strong><p>${item.detail}</p></article>`).join("")
    : renderFamilyEmpty("NENHUM COMPROMISSO PROGRAMADO.");

const getFamilyWeekRange = (weekStartIso = familyWeekStartIso()) => {
  if (typeof Date === "undefined") return "Semana atual";
  const monday = familyDateFromIso(weekStartIso);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const months = ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return `${String(monday.getDate()).padStart(2, "0")} a ${String(friday.getDate()).padStart(2, "0")} de ${months[friday.getMonth()]}`;
};

const getFamilyWeekDates = (weekStartIso = familyWeekStartIso()) => {
  const monday = familyDateFromIso(weekStartIso);
  return familyWeekDays.reduce((dates, [dayKey], index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    dates[dayKey] = familyIsoDate(date);
    return dates;
  }, {});
};

const getFamilyRoutineRecords = () => familyReadJsonList(familyScheduleStorageKey());
const getFamilyNoticeRecords = () => [...familyAreaData.scheduleNotices, ...familyReadJsonList(familyNoticeStorageKey())];
const getFamilyRoutineRecord = (dayKey, slotKey) =>
  getFamilyRoutineRecords().find((item) => item.day_of_week === dayKey && String(item.slot_index) === String(slotKey));
const getFamilyNoticeRecord = (specificDate, slotKey) =>
  getFamilyNoticeRecords().find((item) => item.specific_date === specificDate && String(item.slot_index) === String(slotKey));

const renderFamilyWeekCell = (dayKey, slotKey, specificDate = "") => {
  const routine = getFamilyRoutineRecord(dayKey, slotKey);
  const notice = getFamilyNoticeRecord(specificDate, slotKey);
  if (!routine && !notice) {
    return `<div class="family-week-cell is-empty" data-day="${dayKey}" data-slot="${slotKey}" data-date="${specificDate}"><span>Sem registro</span><button type="button" data-edit-routine data-day="${dayKey}" data-slot="${slotKey}">Editar horario</button></div>`;
  }
  return `
    <div class="family-week-cell" data-day="${dayKey}" data-slot="${slotKey}" data-date="${specificDate}">
      ${
        routine
          ? `<div class="family-week-routine">
              <small>${routine.start_time || ""}</small>
              <strong>${routine.subject_or_activity || routine.title || ""}</strong>
              ${routine.optional_note || routine.note ? `<p>${routine.optional_note || routine.note}</p>` : ""}
              <button type="button" data-edit-routine data-day="${dayKey}" data-slot="${slotKey}">Editar horario</button>
            </div>`
          : `<div class="family-week-routine is-missing"><span>Rotina nao cadastrada</span><button type="button" data-edit-routine data-day="${dayKey}" data-slot="${slotKey}">Editar horario</button></div>`
      }
      ${
        notice
          ? `<button type="button" class="family-week-notice" data-notice-detail title="${notice.message || notice.title}">
              <em data-source="professor">Escola</em>
              <strong>${notice.title}</strong>
              ${notice.message ? `<p>${notice.message}</p>` : ""}
            </button>`
          : ""
      }
    </div>
  `;
};

const renderFamilyWeeklyBoard = (weekStartIso = familyWeekStartIso()) => {
  const weekDates = getFamilyWeekDates(weekStartIso);
  return `
  <section class="family-panel family-week-panel">
    <div class="family-section-head family-week-head">
      <div>
        <h2>Minha Semana</h2>
        <span>${getFamilyWeekRange(weekStartIso)}</span>
      </div>
      <div class="family-week-actions" aria-label="Controles de semana">
        <button type="button" data-week-move="-1">Semana anterior</button>
        <button type="button" data-week-today>Hoje</button>
        <button type="button" data-week-move="1">Proxima semana</button>
      </div>
    </div>
    <div class="family-week-grid" aria-label="Quadro semanal" data-week-start="${weekStartIso}">
      <div class="family-week-corner">Horario</div>
      ${familyWeekDays.map(([, short]) => `<div class="family-week-day">${short}</div>`).join("")}
      ${familyScheduleSlots
        .map(
          ([slotKey, slotLabel]) => `
            <div class="family-week-slot">${slotLabel}</div>
            ${familyWeekDays.map(([dayKey]) => renderFamilyWeekCell(dayKey, slotKey, weekDates[dayKey])).join("")}
          `
        )
        .join("")}
    </div>
    <div class="family-week-mobile">
      ${familyWeekDays
        .map(
          ([dayKey, short, full]) => `
            <article>
              <h3>${full}</h3>
              ${familyScheduleSlots.map(([slotKey, slotLabel]) => `<div><b>${slotLabel}</b>${renderFamilyWeekCell(dayKey, slotKey, weekDates[dayKey])}</div>`).join("")}
            </article>
          `
        )
        .join("")}
    </div>
  </section>
`;
};

const renderFamilyProgressSummary = () => {
  const { progress } = familyAreaData;
  return `
    <section class="family-panel family-summary-panel">
      <div class="family-section-head"><h2>Acompanhamento</h2><span>Resumo</span></div>
      <dl>
        <div><dt>Frequencia</dt><dd>${familyAreaData.attendance?.summary || "Sem registro publicado"}</dd></div>
        <div><dt>XP</dt><dd>${progress.xp ? `${progress.xp} XP` : "0 XP"}</dd></div>
        <div><dt>Nivel</dt><dd>${progress.level || "Sem registro"}</dd></div>
        <div><dt>Concluidas</dt><dd>${progress.completedActivities || 0}</dd></div>
      </dl>
      <div class="family-tree-mini">
        <span>Minha Arvore</span>
        <i><b style="width:${progress.percent || 0}%"></b></i>
        <strong>${progress.percent || 0}%</strong>
      </div>
      <a class="family-primary-link" href="familia.html?view=acompanhamento">Ver acompanhamento</a>
    </section>
  `;
};

const renderFamilyProgress = (compact = false) => {
  const { progress } = familyAreaData;
  return `
    <section class="family-progress-grid">
      <article class="family-metric-card"><span>Frequencia</span><strong>${familyAreaData.attendance?.summary || "Sem registro publicado"}</strong><small>Somente consulta</small></article>
      <article class="family-metric-card"><span>XP</span><strong>${progress.xp ? `${progress.xp} XP` : "Sem registro"}</strong><small>${progress.level || "Nivel nao publicado"}</small></article>
      <article class="family-metric-card"><span>Atividades concluidas</span><strong>${progress.completedActivities || 0}</strong><small>Historico do aluno</small></article>
      <article class="family-tree-card">
        <span>Minha Arvore</span>
        <strong>${progress.percent || 0}%</strong>
        <i><b style="width:${progress.percent || 0}%"></b></i>
        <small>Progresso registrado</small>
      </article>
    </section>
    ${
      compact
        ? ""
        : `<section class="family-panel">
            <div class="family-section-head"><h2>Conquistas</h2><span>Acompanhamento</span></div>
            ${
              progress.achievements?.length
                ? `<div class="family-achievement-list">${progress.achievements.map((item) => `<article><img src="${item.image}" alt="" onerror="this.hidden=true" /><strong>${item.title}</strong></article>`).join("")}</div>`
                : renderFamilyEmpty("SUAS CONQUISTAS APARECERAO AQUI.")
            }
          </section>`
    }
  `;
};

const renderFamilyProfile = () => {
  const { student } = familyAreaData;
  return `
    <section class="family-profile-card">
      <img src="${student.avatar}" alt="" onerror="this.hidden=true" />
      <div>
        <span>Aluno</span>
        <h2>${student.fullName}</h2>
        <dl>
          <div><dt>Escola</dt><dd>${student.school}</dd></div>
          <div><dt>Turma</dt><dd>${student.className}</dd></div>
          <div><dt>Faixa etaria</dt><dd>${student.ageGroup}</dd></div>
          <div><dt>Turno</dt><dd>${student.shift}</dd></div>
          <div><dt>Ano letivo</dt><dd>${student.schoolYear}</dd></div>
        </dl>
      </div>
    </section>
  `;
};

const renderFamilyHomeView = () => `
  <section class="family-home-grid">
    <div class="family-panel family-home-card">
      <div class="family-section-head"><h2>Recados da professora</h2><span>${familyAreaData.teacher}</span></div>
      ${renderFamilyMessageList()}
    </div>
    <div class="family-panel family-home-card">
      <div class="family-section-head"><h2>Atividades online</h2><span>Aluno</span></div>
      ${renderFamilyOnlineActivities("pendentes")}
    </div>
    <div class="family-panel family-home-card">
      <div class="family-section-head"><h2>Atividades no livro</h2><span>Orientacoes</span></div>
      ${renderFamilyBookActivities()}
    </div>
    ${renderFamilyWeeklyBoard()}
    ${renderFamilyProgressSummary()}
  </section>
`;

const renderFamilyActivitiesView = () => `
  <section class="family-panel">
    <div class="family-section-head"><h2>Atividades</h2><span>Livro e online</span></div>
    <div class="family-filter-row" role="group" aria-label="Filtros de atividades">
      <button type="button" data-family-filter="todas" class="is-active">Todas</button>
      <button type="button" data-family-filter="pendentes">Pendentes</button>
      <button type="button" data-family-filter="concluidas">Concluidas</button>
    </div>
    <div class="family-activity-columns">
      <section><h3>Atividades no livro</h3>${renderFamilyBookActivities()}</section>
      <section><h3>Atividades online</h3><div data-family-online-list>${renderFamilyOnlineActivities("todas")}</div></section>
    </div>
  </section>
`;

const renderFamilyView = (view) => {
  const views = {
    inicio: renderFamilyHomeView(),
    atividades: renderFamilyActivitiesView(),
    agenda: `<section class="family-panel"><div class="family-section-head"><h2>Agenda</h2><span>Somente consulta</span></div>${renderFamilyAgenda()}</section>`,
    acompanhamento: renderFamilyProgress(),
    perfil: renderFamilyProfile(),
  };
  return views[view] || views.inicio;
};

const renderFamilyRoutineModal = () => `
  <div class="family-routine-modal" data-routine-modal hidden>
    <form class="family-routine-dialog" data-routine-form>
      <div class="family-section-head">
        <h2>Editar horario</h2>
        <span data-routine-label>Rotina semanal</span>
      </div>
      <input type="hidden" name="day_of_week" />
      <input type="hidden" name="slot_index" />
      <label>
        <span>Horario</span>
        <input name="start_time" type="time" />
      </label>
      <label>
        <span>Aula / atividade</span>
        <input name="subject_or_activity" type="text" maxlength="42" placeholder="Ex.: Artes" required />
      </label>
      <label>
        <span>Observacao opcional</span>
        <textarea name="optional_note" maxlength="90" rows="2" placeholder="Material, combinados ou observacao curta"></textarea>
      </label>
      <div>
        <button type="submit">Salvar</button>
        <button type="button" data-routine-cancel>Cancelar</button>
      </div>
    </form>
  </div>
`;

const renderFamilyDashboard = () => {
  const view = getFamilyView();
  const { student } = familyAreaData;
  const weekStartIso = familyWeekStartIso();
  return `
    <main class="family-v1" data-family-area data-week-start="${weekStartIso}">
      <aside class="family-v1-sidebar">
        <a class="family-v1-logo" href="familia.html"><img src="logo-app.png" alt="Raizes e Saberes Educacional" onerror="this.hidden=true" /></a>
        <div class="family-v1-person">
          <img src="${student.avatar}" alt="" onerror="this.hidden=true" />
          <span>Familia do</span>
          <strong>${student.name}</strong>
          <small>${student.className}</small>
        </div>
        <nav aria-label="Area Aluno e Familia">
          ${familyAreaViews.map(([key, label]) => `<a class="${key === view ? "is-active" : ""}" href="familia.html?view=${key}">${label}</a>`).join("")}
          <a class="family-nav-secondary" href="escola.html">Area da Escola</a>
          <a class="family-nav-secondary" href="index.html">Site</a>
          <button type="button" data-platform-logout>Sair</button>
        </nav>
      </aside>
      <section class="family-v1-main">
        <header class="family-v1-hero">
          <div>
            <span>Area Aluno & Familia</span>
            <h1>Ola, familia do ${student.name}!</h1>
            <p>Acompanhe a rotina, as atividades e as conquistas.</p>
          </div>
          <div class="family-hero-actions" aria-label="Acessos da familia">
            <a href="escola.html">Area da Escola</a>
            <a href="index.html">Ir para o site</a>
          </div>
        </header>
        <section class="family-v1-content" data-family-content>${renderFamilyView(view)}</section>
      </section>
      <nav class="family-v1-mobile" aria-label="Navegacao mobile">
        ${familyAreaViews.map(([key, label]) => `<a class="${key === view ? "is-active" : ""}" href="familia.html?view=${key}">${label}</a>`).join("")}
      </nav>
      ${renderFamilyRoutineModal()}
    </main>
  `;
};

const initFamilyArea = () => {
  const area = document.querySelector("[data-family-area]");
  if (!area) return;
  const renderWeek = (weekStartIso = area.dataset.weekStart || familyWeekStartIso()) => {
    area.dataset.weekStart = weekStartIso;
    const panel = area.querySelector(".family-week-panel");
    if (panel) {
      panel.outerHTML = renderFamilyWeeklyBoard(weekStartIso);
    }
  };
  const openRoutineModal = (dayKey, slotKey) => {
    const modal = area.querySelector("[data-routine-modal]");
    const form = area.querySelector("[data-routine-form]");
    if (!modal || !form) return;
    const routine = getFamilyRoutineRecord(dayKey, slotKey);
    const dayLabel = familyWeekDays.find(([key]) => key === dayKey)?.[2] || dayKey;
    form.elements.day_of_week.value = dayKey;
    form.elements.slot_index.value = slotKey;
    form.elements.start_time.value = routine?.start_time || "";
    form.elements.subject_or_activity.value = routine?.subject_or_activity || routine?.title || "";
    form.elements.optional_note.value = routine?.optional_note || routine?.note || "";
    const label = modal.querySelector("[data-routine-label]");
    if (label) label.textContent = `${dayLabel} - horario ${slotKey}`;
    modal.hidden = false;
    form.elements.start_time.focus();
  };
  const closeRoutineModal = () => {
    const modal = area.querySelector("[data-routine-modal]");
    if (modal) modal.hidden = true;
  };
  area.addEventListener("click", (event) => {
    const filterButton = event.target.closest?.("[data-family-filter]");
    if (filterButton) {
      area.querySelectorAll("[data-family-filter]").forEach((button) => button.classList.toggle("is-active", button === filterButton));
      const list = area.querySelector("[data-family-online-list]");
      if (list) list.innerHTML = renderFamilyOnlineActivities(filterButton.dataset.familyFilter || "todas");
      return;
    }
    const editButton = event.target.closest?.("[data-edit-routine]");
    if (editButton) {
      event.preventDefault();
      openRoutineModal(editButton.dataset.day, editButton.dataset.slot);
      return;
    }
    const cancelButton = event.target.closest?.("[data-routine-cancel]");
    if (cancelButton) {
      event.preventDefault();
      closeRoutineModal();
      return;
    }
    const noticeButton = event.target.closest?.("[data-notice-detail]");
    if (noticeButton) {
      event.preventDefault();
      noticeButton.classList.toggle("is-expanded");
      return;
    }
    const weekMoveButton = event.target.closest?.("[data-week-move]");
    if (weekMoveButton) {
      const current = familyDateFromIso(area.dataset.weekStart || familyWeekStartIso());
      current.setDate(current.getDate() + Number(weekMoveButton.dataset.weekMove || 0) * 7);
      renderWeek(familyIsoDate(current));
      return;
    }
    const todayButton = event.target.closest?.("[data-week-today]");
    if (todayButton) {
      renderWeek(familyWeekStartIso());
    }
  });
  area.querySelector("[data-routine-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const dayKey = form.elements.day_of_week.value;
    const slotKey = form.elements.slot_index.value;
    const current = getFamilyRoutineRecords().filter((item) => !(item.day_of_week === dayKey && String(item.slot_index) === String(slotKey)));
    const subject = String(form.elements.subject_or_activity.value || "").trim();
    if (subject) {
      current.push({
        id: `routine-${dayKey}-${slotKey}`,
        student_id: familyAreaData.student.id,
        day_of_week: dayKey,
        slot_index: Number(slotKey),
        start_time: form.elements.start_time.value || "",
        subject_or_activity: subject,
        optional_note: String(form.elements.optional_note.value || "").trim(),
        created_by: "familia",
        updated_by: getPlatformSession().userId || "local-family",
        updated_at: new Date().toISOString(),
      });
    }
    familyWriteJsonList(familyScheduleStorageKey(), current);
    closeRoutineModal();
    renderWeek(area.dataset.weekStart || familyWeekStartIso());
  });
};

const getFamilyActivityById = (id) => familyAreaData.onlineActivities.find((activity) => activity.id === id);

const renderStudentOnlineActivityFocus = () => {
  const params = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const id = params.get("id") || params.get("activity") || "";
  const activity = getFamilyActivityById(id);
  return `
    <main class="student-focus-activity" data-student-focus-activity>
      <header>
        <a href="familia.html?view=atividades">Sair da atividade</a>
        <span>Modo foco</span>
      </header>
      <section class="student-focus-card">
        <span>Atividade online</span>
        <h1>${activity?.title || "Atividade em preparacao"}</h1>
        <p>${activity?.instructions || "Quando a professora disponibilizar uma atividade online, ela abrira aqui em modo foco com instrucoes simples para a crianca."}</p>
        <div class="student-focus-engine">
          <strong>Motor da atividade</strong>
          <p>${activity?.engine ? "Motor configurado para esta atividade." : "Motor ainda nao publicado para esta atividade."}</p>
        </div>
        <div class="student-focus-actions">
          <button type="button" disabled>Salvar</button>
          <button type="button" disabled>Concluir</button>
          <button type="button" disabled>Enviar</button>
        </div>
      </section>
    </main>
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
    title: defaultBook.catalogTitle,
    detail: defaultBook.level,
    progress: 65,
    image: homeOfficialAsset("continue-card-livro"),
    href: defaultBook.href,
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
  { className: "hotspot-mission-reading", href: defaultBook.href, label: "Abrir missao de leitura diaria" },
  { className: "hotspot-mission-training", href: "universidade.html#formacao-raizes", label: "Abrir formacao em andamento" },
  { className: "hotspot-mission-avalia", href: "banco-questoes.html", label: "Abrir questoes recomendadas" },
  { className: "hotspot-mission-games", href: "jogos.html", label: "Abrir jogos recomendados" },
  { className: "hotspot-mission-all", href: "missao.html", label: "Ver todas as missoes" },
  { className: "hotspot-activity-course", href: "universidade.html#formacao-raizes", label: "Abrir historico do curso Avaliacao Diagnostica" },
  { className: "hotspot-activity-medal", href: "perfil.html", label: "Abrir medalhas e conquistas" },
  { className: "hotspot-activity-reading", href: defaultBook.href, label: "Abrir leitura do Volume 1" },
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
  admin: {
    title: "Admin / TI",
    subtitle: "QG da Plataforma",
    code: "ADMIN-TI",
    html: renderAdminDashboard(),
  },
  escolaColetiva: {
    title: "Acesso Escola",
    subtitle: "Institucional e Comunicacao",
    code: "ESCOLA-INSTITUCIONAL-V1",
    html: renderSchoolInstitutionalDashboard(),
  },
  educacaoInfantil: {
    title: "Educacao Infantil",
    subtitle: "Ambiente coletivo pedagogico",
    code: "EDUCACAO-INFANTIL-V1",
    html: renderEarlyChildhoodDashboard(),
  },
  aluno: {
    title: "Dashboard do Aluno",
    subtitle: "Home principal do aluno",
    code: "PLAT-V2-005",
    html: renderStudentProfilePage(),
  },
  alunoAtividades: {
    title: "Minhas Atividades",
    subtitle: "Atividades atribuidas ao aluno",
    code: "ALUNO-ATIVIDADES",
    html: renderStudentActivitiesPage(),
  },
  alunoAtividade: {
    title: "Atividade Online",
    subtitle: "Modo foco do aluno",
    code: "ALUNO-FOCO",
    html: renderStudentOnlineActivityFocus(),
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
    title: "Jogar e Descobrir",
    subtitle: "Hub oficial dos jogos digitais",
    code: "GAME-ENGINE-2.0",
    html: `
      <div class="screen-title">
        <p>GAME-ENGINE-2.0</p>
        <h1>Jogar e Descobrir</h1>
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
    title: "Biblioteca Viva 2.0",
    subtitle: "Leitura, acompanhamento e aprendizagem integrados",
    code: "MS-001",
    html: `
      <div class="screen-title">
        <p>MS-001</p>
        <h1>Biblioteca Viva</h1>
        <span>Experiencias, livros, videos e atividades organizados para aprender sem se perder.</span>
      </div>
      ${renderPremiumLibrary()}
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
        <section class="reader-book-profile" aria-label="Metadados do livro">
          <img src="${activeBook.catalogCover || activeBook.cover}" alt="${activeBook.title}" />
          <div>
            <span>${activeBook.level}</span>
            <h2>${activeBook.catalogTitle || activeBook.title}</h2>
            <p>${activeBook.type} &middot; ${activeBook.totalPages} paginas &middot; ${activeBook.collection}</p>
            <div class="reader-meta-grid">
              <strong>Ultima pagina salva <b data-last-page-meta>1</b></strong>
              <strong>Favorito <b data-favorite-meta>Nao</b></strong>
              <strong>XP de leitura <b data-xp-meta>0</b></strong>
              <strong>Historico <b data-history-meta>0 acessos</b></strong>
            </div>
          </div>
          <button type="button" data-reader-favorite aria-pressed="false">Favoritar</button>
        </section>
        <nav class="reader-tabs" aria-label="Ferramentas do livro">
          <button type="button" class="is-active" data-reader-tab="sumario" aria-selected="true">Indice</button>
          <button type="button" data-reader-tab="busca" aria-selected="false">Busca</button>
          <button type="button" data-reader-tab="pergunte" aria-selected="false">Pergunte ao Livro</button>
          <button type="button" data-reader-tab="conquistas" aria-selected="false">Conquistas</button>
        </nav>

        <div class="reader-layout">
          <aside class="page-rail reader-rail" aria-label="Miniaturas das paginas">
            <div class="rail-title"><h2>Paginas</h2><span data-page-count>1/${activeBook.totalPages}</span></div>
            <div class="thumbnail-list" data-thumbnail-list></div>
          </aside>

          <section class="book-stage" data-book-stage aria-live="polite">
            <button class="reader-turn previous" type="button" data-prev-page aria-label="Pagina anterior">&lsaquo;</button>
            <figure class="reader-page" data-reader-page style="--zoom: 1">
              <img data-page-image src="${activeBook.page(1)}" alt="${activeBook.title} pagina 1" loading="eager" />
              <figcaption class="reader-page-error" data-page-error hidden>
                <strong>NAO FOI POSSIVEL CARREGAR ESTA PAGINA</strong>
                <span data-page-error-detail></span>
                <div>
                  <button type="button" data-page-error-retry>TENTAR NOVAMENTE</button>
                  <button type="button" data-prev-page>PAGINA ANTERIOR</button>
                  <button type="button" data-next-page>PROXIMA PAGINA</button>
                </div>
              </figcaption>
            </figure>
            <button class="reader-turn next" type="button" data-next-page aria-label="Proxima pagina">&rsaquo;</button>
          </section>

          <aside class="summary-rail reader-summary" aria-label="Sumario do livro">
            <div class="rail-title"><h2>Sumario</h2><button type="button" data-bookmark-page>&#9734; Marcar</button></div>
            <div class="summary-list" data-summary-list></div>
            <div class="reader-tool-panel" data-reader-panel="busca" hidden>
              <label>Buscar no livro
                <input type="search" data-book-search placeholder="Digite tema, unidade ou pagina" />
              </label>
              <div class="reader-search-results" data-book-search-results></div>
            </div>
            <div class="reader-tool-panel" data-reader-panel="pergunte" hidden>
              <h3>Pergunte ao Livro</h3>
              <p>Espaco preparado para futura IA com base no conteudo do PDF. Nesta versao, a busca usa metadados, sumario e paginas renderizadas.</p>
              <textarea data-ask-book-input placeholder="Ex.: quais atividades trabalham linguagem oral?"></textarea>
              <button type="button" data-ask-book-button>Preparar pergunta</button>
              <output data-ask-book-output>Integre o motor de IA ao Supabase/Storage para responder com citacoes do PDF.</output>
            </div>
            <div class="reader-tool-panel" data-reader-panel="conquistas" hidden>
              <h3>Conquistas de leitura</h3>
              <div class="reader-achievement-list">
                <article><strong>Primeira pagina</strong><span data-achievement-start>Pendente</span></article>
                <article><strong>Metade do livro</strong><span data-achievement-half>Pendente</span></article>
                <article><strong>Livro concluido</strong><span data-achievement-finish>Pendente</span></article>
              </div>
            </div>
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
  professorTurma: {
    title: "Minha Turma",
    subtitle: "Turma vinculada a Professora Helena",
    code: "PROF-TURMA",
    html: renderTeacherClassPage(),
  },
  professorAluno: {
    title: "Pedro",
    subtitle: "Ficha individual do aluno",
    code: "PROF-ALUNO",
    html: renderTeacherStudentPage(),
  },
  atividades: {
    title: "Banco de Atividades Imprimiveis",
    subtitle: "Atividades exclusivas para a Educacao Infantil",
    code: "PRINTABLE-ACTIVITIES-001",
    html: renderPrintableActivitiesPage(),
  },
  motorAtividade: {
    title: "Motor Universal de Atividades",
    subtitle: "Atividade digital do aluno",
    code: "UNIVERSAL-ACTIVITY-ENGINE",
    html: renderUniversalActivityMotorPage(),
  },
  adminAtividades: {
    title: "Admin Atividades Imprimiveis",
    subtitle: "Conteudos > Atividades Imprimiveis",
    code: "PRINTABLE-ACTIVITIES-ADMIN",
    html: renderPrintableActivitiesPage({ admin: true }),
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
        <section class="panel span-2"><h2>Biblioteca Digital</h2><div class="book-strip small"><img src="assets/biblioteca/RAIZES_INFANTIL4_VOL1_BIBLIOTECA.jpg" alt="" /><img src="assets/biblioteca/RAIZES_INFANTIL4_VOL2_BIBLIOTECA.jpg" alt="" /><img src="assets/biblioteca/RAIZES_INFANTIL5_VOL1_BIBLIOTECA.jpg" alt="" /></div></section>
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
      ["atividades", "Atividades Imprimiveis", "atividades.html"],
      ["aluno", "Aluno", "aluno.html"],
      ["escolaColetiva", "Escola", "escola.html"],
      ["educacaoInfantil", "Educacao Infantil", "educacao-infantil.html"],
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
    label: "Espaco do Aluno",
    profile: "Pedro",
    search: "Buscar livros, missoes, atividades...",
    user: `${getStudentFirstName()}<br />Aluno`,
    avatar: "assets/aluno/oficial-avatar-aluno.png",
    profileImage: "logo-sidebar-dark.png",
    nav: [
      ["aluno", "INICIO", "aluno.html"],
      ["missao", "MISSAO DO DIA", "missao.html"],
      ["arvore", "MINHA ARVORE", "arvore.html"],
      ["biblioteca", "BIBLIOTECA", "biblioteca.html"],
      ["jogos", "JOGAR E DESCOBRIR", "jogos.html"],
      ["perfil", "PERFIL", "perfil.html"],
      ["familia", "FAMILIA", "familia.html"],
      ["logout", "SAIR", "#"],
    ],
    mobile: [
      ["aluno", "INICIO", "aluno.html"],
      ["missao", "MISSAO", "missao.html"],
      ["arvore", "ARVORE", "arvore.html"],
      ["biblioteca", "BIBLIOTECA", "biblioteca.html"],
      ["jogos", "JOGAR", "jogos.html"],
      ["perfil", "PERFIL", "perfil.html"],
      ["familia", "FAMILIA", "familia.html"],
      ["logout", "SAIR", "#"],
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
      ["adminAtividades", "Conteudos > Atividades Imprimiveis", "admin-atividades.html"],
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
    label: "Workspace Pedagogico",
    profile: "Ambiente do Professor",
    search: "Buscar no workspace pedagogico...",
    user: "Professora Helena<br />Ver perfil",
    nav: [
      ["professor", "Inicio", "professor.html"],
      ["turmas", "Minhas Turmas", "#"],
      ["biblioteca", "Biblioteca Viva", "#"],
      ["atividades", "Atividades Imprimiveis", "atividades.html"],
      ["planejamentos", "Planejamentos", "#"],
      ["favoritos", "Favoritos", "atividades.html?favoritos=1"],
      ["relatorios", "Relatorios", "#"],
      ["alunos", "Alunos", "#"],
      ["experiencias", "Experiencias", "#"],
      ["jogos", "Jogos", "#"],
      ["avaliacoes", "Avaliacoes", "#"],
      ["universidade", "Universidade", "#"],
      ["configuracoes", "Configuracoes", "#"],
    ],
    mobile: [
      ["professor", "Inicio", "professor.html"],
      ["turmas", "Turmas", "#"],
      ["atividades", "Atividades", "atividades.html"],
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
    label: "Aluno & Familia",
    profile: "Acompanhamento do aluno",
    search: "Buscar recados, atividades e agenda...",
    user: "Familia do Pedro<br />Responsavel",
    nav: [
      ["familia", "Inicio", "familia.html"],
      ["atividades", "Atividades", "familia.html?view=atividades"],
      ["agenda", "Agenda", "familia.html?view=agenda"],
      ["acompanhamento", "Acompanhamento", "familia.html?view=acompanhamento"],
      ["perfil", "Perfil", "familia.html?view=perfil"],
      ["logout", "Sair", "#"],
    ],
    mobile: [
      ["familia", "Inicio", "familia.html"],
      ["atividades", "Atividades", "familia.html?view=atividades"],
      ["agenda", "Agenda", "familia.html?view=agenda"],
      ["acompanhamento", "Acomp.", "familia.html?view=acompanhamento"],
      ["perfil", "Perfil", "familia.html?view=perfil"],
    ],
  },
};

const moduleEnvironment = {
  plataforma: "plataforma",
  admin: "admin",
  escolaColetiva: "plataforma",
  educacaoInfantil: "plataforma",
  aluno: "aluno",
  alunoAtividades: "aluno",
  alunoAtividade: "aluno",
  arvore: "aluno",
  missao: "aluno",
  jogos: "aluno",
  perfil: "aluno",
  biblioteca: "biblioteca",
  viewer: "biblioteca",
  universidade: "universidade",
  curadoria: "curadoria",
  professor: "professor",
  professorTurma: "professor",
  professorAluno: "professor",
  atividades: "professor",
  motorAtividade: "aluno",
  adminAtividades: "curadoria",
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
  const pageError = reader.querySelector("[data-page-error]");
  const pageErrorDetail = reader.querySelector("[data-page-error-detail]");
  const thumbnailList = reader.querySelector("[data-thumbnail-list]");
  const summaryList = reader.querySelector("[data-summary-list]");
  const pageLabel = reader.querySelector("[data-page-label]");
  const pageCount = reader.querySelector("[data-page-count]");
  const progressLabel = reader.querySelector("[data-progress-label]");
  const progressBar = reader.querySelector("[data-progress-bar]");
  const zoomLabel = reader.querySelector("[data-zoom-label]");
  const bookmarkButton = reader.querySelector("[data-bookmark-page]");
  const stage = reader.querySelector("[data-book-stage]");
  const favoriteButton = reader.querySelector("[data-reader-favorite]");
  const favoriteMeta = reader.querySelector("[data-favorite-meta]");
  const lastPageMeta = reader.querySelector("[data-last-page-meta]");
  const xpMeta = reader.querySelector("[data-xp-meta]");
  const historyMeta = reader.querySelector("[data-history-meta]");
  const searchInput = reader.querySelector("[data-book-search]");
  const searchResults = reader.querySelector("[data-book-search-results]");
  const askInput = reader.querySelector("[data-ask-book-input]");
  const askOutput = reader.querySelector("[data-ask-book-output]");
  const pageTemplate = document.createDocumentFragment();

  const readerParams = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const hasRequestedPage = readerParams.has("page");
  const requestedPage = hasRequestedPage ? Number(readerParams.get("page")) || 1 : 1;
  const lastPageStorageKey = `library:reading:${book.id}:lastPage`;
  const legacyLastPageStorageKey = `${book.id}:lastPage`;
  const getSavedLastPage = () =>
    Number(localStorage.getItem(lastPageStorageKey)) || Number(localStorage.getItem(legacyLastPageStorageKey)) || 0;
  let page = clamp(requestedPage, 1, book.totalPages);
  let zoom = 1;
  let bookmarkedPage = Number(localStorage.getItem(storageKey)) || 0;
  let lastReadPage = getSavedLastPage();
  const preloadedPages = new Set();
  updateRecentBook(book.id);
  const readHistoryKey = "library:readingHistory";
  const favoritesKey = "library:favorites";
  const getJsonList = (key) => {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch (error) {
      return [];
    }
  };
  const setJsonList = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };
  const syncReadingHistory = () => {
    const history = getJsonList(readHistoryKey).filter((item) => item.bookId !== book.id);
    const nextHistory = [
      {
        bookId: book.id,
        title: book.title,
        subtitle: book.subtitle,
        page,
        totalPages: book.totalPages,
        progress: Math.round((page / book.totalPages) * 100),
        updatedAt: new Date().toISOString(),
      },
      ...history,
    ].slice(0, 20);
    setJsonList(readHistoryKey, nextHistory);
    if (historyMeta) {
      historyMeta.textContent = `${nextHistory.length} acessos`;
    }
  };
  const syncFavoriteButton = () => {
    const favorites = getJsonList(favoritesKey);
    const isFavorite = favorites.includes(book.id);
    if (favoriteButton) {
      favoriteButton.setAttribute("aria-pressed", String(isFavorite));
      favoriteButton.textContent = isFavorite ? "Favorito" : "Favoritar";
      favoriteButton.classList.toggle("is-active", isFavorite);
    }
    if (favoriteMeta) {
      favoriteMeta.textContent = isFavorite ? "Sim" : "Nao";
    }
  };
  const toggleFavorite = () => {
    const favorites = getJsonList(favoritesKey);
    const nextFavorites = favorites.includes(book.id)
      ? favorites.filter((favoriteId) => favoriteId !== book.id)
      : [book.id, ...favorites].slice(0, 40);
    setJsonList(favoritesKey, nextFavorites);
    syncFavoriteButton();
  };
  const updateReaderStats = () => {
    const progress = Math.round((page / book.totalPages) * 100);
    if (lastPageMeta) {
      lastPageMeta.textContent = `${page}/${book.totalPages}`;
    }
    if (xpMeta) {
      xpMeta.textContent = String(Math.max(10, progress * 2));
    }
    reader.querySelector("[data-achievement-start]").textContent = page >= 1 ? "Conquistado" : "Pendente";
    reader.querySelector("[data-achievement-half]").textContent = progress >= 50 ? "Conquistado" : "Pendente";
    reader.querySelector("[data-achievement-finish]").textContent = progress >= 100 ? "Conquistado" : "Pendente";
  };

  for (let currentPage = 1; currentPage <= book.totalPages; currentPage += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.gotoPage = String(currentPage);
    button.setAttribute("aria-label", `Abrir pagina ${currentPage}`);
    button.innerHTML = `<img src="${book.thumb(currentPage)}" alt="Miniatura da pagina ${currentPage}" loading="lazy" /><span>${currentPage}</span>`;
    pageTemplate.appendChild(button);
  }
  thumbnailList.appendChild(pageTemplate);

  thumbnailList.addEventListener(
    "error",
    (event) => {
      const thumbImage = event.target.closest?.("img");
      const thumbButton = thumbImage?.closest("[data-goto-page]");
      if (!thumbImage || !thumbButton) {
        return;
      }
      replaceBrokenImage(thumbImage, createLibraryAssetFallback({ page: thumbButton.dataset.gotoPage }));
    },
    true
  );

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
    const pageAssetPath = book.page(page);
    pageFrame.classList.add("is-loading");
    pageFrame.classList.remove("has-page-error");
    if (pageError) {
      pageError.hidden = true;
    }
    image.classList.add("is-loading");
    image.hidden = false;
    image.src = pageAssetPath;
    image.alt = `${book.title} pagina ${page}`;

    const progress = Math.round((page / book.totalPages) * 100);
    pageLabel.textContent = `${page} / ${book.totalPages}`;
    pageCount.textContent = `${page}/${book.totalPages}`;
    progressLabel.textContent = `${progress}%`;
    progressBar.style.width = `${progress}%`;
    localStorage.setItem(lastPageStorageKey, String(page));
    localStorage.setItem(legacyLastPageStorageKey, String(page));
    localStorage.setItem("library:lastActiveBook", book.id);
    lastReadPage = page;
    syncReadingHistory();
    updateReaderStats();
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
      return;
    }
    if (target.matches("[data-reader-favorite]")) {
      toggleFavorite();
      return;
    }
    if (target.dataset.readerTab) {
      reader.querySelectorAll("[data-reader-tab]").forEach((tab) => {
        tab.classList.toggle("is-active", tab === target);
        tab.setAttribute("aria-selected", String(tab === target));
      });
      const activeTab = target.dataset.readerTab;
      reader.querySelector(".summary-list").hidden = activeTab !== "sumario";
      reader.querySelectorAll("[data-reader-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.readerPanel !== activeTab;
      });
      return;
    }
    if (target.matches("[data-page-error-retry]")) {
      renderPage(page);
      return;
    }
    if (target.matches("[data-ask-book-button]") && askOutput) {
      const question = askInput?.value.trim();
      askOutput.value = question
        ? `Pergunta preparada: "${question}". A proxima etapa conecta este campo ao indice vetorial do PDF.`
        : "Digite uma pergunta para preparar a consulta ao livro.";
    }
  });

  searchInput?.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
      searchResults.innerHTML = "";
      return;
    }
    const summaryMatches = book.summary
      .filter(([label, summaryPage]) => `${label} ${summaryPage} ${book.title} ${book.subtitle}`.toLowerCase().includes(query))
      .slice(0, 8);
    searchResults.innerHTML = summaryMatches.length
      ? summaryMatches
          .map(
            ([label, summaryPage]) => `
              <button type="button" data-goto-page="${summaryPage}">
                <strong>${label}</strong>
                <span>Pagina ${summaryPage}</span>
              </button>
            `
          )
          .join("")
      : `<p>Nenhum resultado no indice demonstrativo. A busca textual completa sera ativada com a IA do PDF.</p>`;
  });

  const isTextInput = (target) =>
    target?.matches?.("input, textarea, select, [contenteditable='true'], [contenteditable='']");

  document.addEventListener("keydown", (event) => {
    if (!reader.isConnected) {
      return;
    }
    if (isTextInput(event.target) && event.key !== "Escape") {
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      renderPage(page - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      renderPage(page + 1);
    }
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setZoom(zoom + 0.1);
    }
    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      setZoom(zoom - 0.1);
    }
    if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      if (stage?.requestFullscreen) {
        stage.requestFullscreen();
      }
    }
    if (event.key === "/") {
      event.preventDefault();
      reader.querySelector('[data-reader-tab="busca"]')?.click();
      searchInput?.focus();
    }
    if (event.key === "Escape" && document.fullscreenElement) {
      document.exitFullscreen?.();
    }
  });

  image.addEventListener("load", () => {
    image.classList.remove("is-loading");
    pageFrame.classList.remove("is-loading");
    pageFrame.classList.remove("has-page-error");
    if (pageError) {
      pageError.hidden = true;
    }
  });

  image.addEventListener("error", () => {
    const failedPath = image.getAttribute("src") || "";
    console.error("Erro ao carregar pagina do livro", {
      bookId: book.id,
      page,
      assetPath: failedPath,
    });
    image.classList.remove("is-loading");
    pageFrame.classList.remove("is-loading");
    pageFrame.classList.add("has-page-error");
    image.hidden = true;
    if (pageError) {
      pageError.hidden = false;
    }
    if (pageErrorDetail) {
      pageErrorDetail.textContent = `${book.id} - pagina ${page}`;
    }
  });

  if (hasRequestedPage) {
    page = clamp(requestedPage, 1, book.totalPages);
  } else if (bookmarkedPage) {
    page = clamp(bookmarkedPage, 1, book.totalPages);
  } else if (lastReadPage) {
    page = clamp(lastReadPage, 1, book.totalPages);
  }
  setZoom(1);
  syncFavoriteButton();
  renderPage(page);
};

const initLibrarySearch = () => {
  const searchInput = document.querySelector(".app-search input");
  const catalogCards = [...document.querySelectorAll("[data-library-book-card]")];
  const emptyState = document.querySelector("[data-library-empty]");
  const clearButton = document.querySelector("[data-clear-library-search]");
  if (!searchInput || !catalogCards.length) {
    return;
  }

  const syncSearch = () => {
    const query = searchInput.value.trim().toLowerCase().replace(/\s+/g, " ");
    const terms = query.split(/\s+/).filter(Boolean);
    let visibleCards = 0;
    catalogCards.forEach((card) => {
      const searchableText = card.textContent.toLowerCase().replace(/\s+/g, " ");
      const phraseMatch = searchableText.includes(query);
      const termMatch = terms.every((term) => searchableText.includes(term));
      const hasNumberTerm = terms.some((term) => /^\d+$/.test(term));
      card.hidden = terms.length > 0 && !(phraseMatch || (!hasNumberTerm && termMatch));
      if (!card.hidden) {
        visibleCards += 1;
      }
    });
    if (emptyState) {
      emptyState.hidden = !(terms.length > 0 && visibleCards === 0);
    }
  };

  searchInput.addEventListener("input", syncSearch);

  clearButton?.addEventListener("click", () => {
    searchInput.value = "";
    syncSearch();
    searchInput.focus();
  });

  document.querySelectorAll("[data-toggle-book-favorite]").forEach((button) => {
    button.addEventListener("click", () => {
      const bookId = button.dataset.toggleBookFavorite;
      const favorites = getLibraryFavorites();
      const nextFavorites = favorites.includes(bookId)
        ? favorites.filter((favoriteId) => favoriteId !== bookId)
        : [bookId, ...favorites].slice(0, 40);
      localStorage.setItem("library:favorites", JSON.stringify(nextFavorites));
      document.querySelectorAll(`[data-toggle-book-favorite="${bookId}"]`).forEach((favoriteButton) => {
        const isFavorite = nextFavorites.includes(bookId);
        favoriteButton.setAttribute("aria-pressed", String(isFavorite));
        favoriteButton.textContent = isFavorite ? "Favorito" : "Favoritar";
      });
    });
  });
};

const initLibraryExperiences = () => {
  document.querySelectorAll("[data-open-experience]").forEach((button) => {
    button.addEventListener("click", () => {
      const code = button.dataset.openExperience;
      if (!window.RSGameEngine?.openExperience) {
        console.warn("Player de experiencias indisponivel.", { code });
        return;
      }
      window.RSGameEngine.openExperience(code);
    });
  });

  document.querySelectorAll("[data-open-interactive-activity]").forEach((button) => {
    button.addEventListener("click", () => {
      const code = button.dataset.openInteractiveActivity;
      if (!window.RSGameEngine?.openInteractiveActivity) {
        console.warn("Motor de atividades interativas indisponivel.", { code });
        return;
      }
      window.RSGameEngine.openInteractiveActivity(code);
    });
  });

  const profile = document.querySelector("[data-bv-profile]");
  if (profile?.dataset.bvProfile && window.RSGameEngine?.saveUserExperienceProgress) {
    window.RSGameEngine.saveUserExperienceProgress(getInfantilUserId(), profile.dataset.bvProfile, {
      event: "profile_open",
      lastAccessedAt: new Date().toISOString(),
    });
  }

  const syncFavoriteControls = (code, isFavorite) => {
    document.querySelectorAll(`[data-bv-toggle-favorite="${code}"]`).forEach((favoriteButton) => {
      favoriteButton.setAttribute("aria-pressed", String(isFavorite));
      favoriteButton.textContent = isFavorite ? "Favorita" : "Favoritar";
    });
    document.querySelectorAll(`[data-experience-code="${code}"]`).forEach((card) => {
      card.dataset.favorite = String(isFavorite);
      card.classList.toggle("is-favorite", isFavorite);
    });
  };

  document.querySelectorAll("[data-bv-toggle-favorite]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const code = button.dataset.bvToggleFavorite;
      const record = window.RSGameEngine?.toggleExperienceFavorite?.(getInfantilUserId(), code);
      if (!record) return;
      syncFavoriteControls(code, record.isFavorite);
    });
  });

  window.addEventListener("raizes:experience-progress", (event) => {
    if (event.detail?.experienceCode && typeof event.detail.isFavorite === "boolean") {
      syncFavoriteControls(event.detail.experienceCode, event.detail.isFavorite);
    }
  });
};

const initPremiumLibrary = () => {
  const root = document.querySelector("[data-bv-premium]");
  if (!root) {
    return;
  }
  const state = { age: "all", volume: "all", status: "all", query: "" };
  const cards = [...root.querySelectorAll("[data-bv-experience-card]")];
  const empty = root.querySelector("[data-bv-empty]");
  const search = root.querySelector("[data-bv-search]");

  const syncButtons = () => {
    root.querySelectorAll("[data-bv-filter-age]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.bvFilterAge === state.age);
    });
    root.querySelectorAll("[data-bv-filter-volume]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.bvFilterVolume === state.volume);
    });
    root.querySelectorAll("[data-bv-filter-status]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.bvFilterStatus === state.status);
    });
  };

  const sync = () => {
    let visible = 0;
    const terms = state.query.toLowerCase().split(/\s+/).filter(Boolean);
    cards.forEach((card) => {
      const matchesAge = state.age === "all" || card.dataset.ageGroup === state.age;
      const matchesVolume = state.volume === "all" || card.dataset.volume === state.volume;
      const matchesStatus =
        state.status === "all" ||
        card.dataset.status === state.status ||
        (state.status === "favorite" && card.dataset.favorite === "true") ||
        (state.status === "recent" && Boolean(card.dataset.recent));
      const haystack = card.dataset.search || card.textContent.toLowerCase();
      const matchesQuery = terms.every((term) => haystack.includes(term));
      card.hidden = !(matchesAge && matchesVolume && matchesStatus && matchesQuery);
      if (!card.hidden && card.closest("[data-bv-results]")) {
        visible += 1;
      }
    });
    if (empty) {
      empty.hidden = visible > 0;
    }
    syncButtons();
  };

  const syncSummary = () => {
    const summary = window.RSGameEngine?.getExperienceSummary?.(getInfantilUserId(), allInfantilExperiences);
    if (!summary) return;
    Object.entries(summary).forEach(([key, value]) => {
      const node = root.querySelector(`[data-bv-summary="${key}"] strong`);
      if (node) node.textContent = key === "percent" ? `${value}%` : String(value);
      const bar = root.querySelector(`[data-bv-summary="${key}"] i b`);
      if (bar) bar.style.width = `${summary.percent}%`;
    });
  };

  const syncCardProgress = (record) => {
    const status = record.status === "completed" ? "completed" : record.status === "in_progress" ? "in-progress" : "not-started";
    const label = status === "completed" ? "Concluida" : status === "in-progress" ? "Em andamento" : "Nao iniciada";
    const action = status === "completed" ? "Viver novamente" : status === "in-progress" ? "Continuar experiencia" : "Viver esta experiencia";
    document.querySelectorAll(`[data-experience-code="${record.experienceCode}"]`).forEach((card) => {
      card.dataset.status = status;
      card.dataset.favorite = String(record.isFavorite);
      card.dataset.recent = record.lastAccessedAt || "";
      card.classList.toggle("is-favorite", record.isFavorite);
      const badge = card.querySelector(".bv-experience-cover span");
      const bar = card.querySelector(".bv-card-progress b");
      const percent = card.querySelector(".bv-card-progress strong");
      const actionLink = card.querySelector(".bv-card-action");
      const favorite = card.querySelector("[data-bv-toggle-favorite]");
      if (badge) badge.textContent = label;
      if (bar) bar.style.width = `${record.progressPercent}%`;
      if (percent) percent.textContent = `${record.progressPercent}%`;
      if (actionLink) actionLink.textContent = action;
      if (favorite) {
        favorite.setAttribute("aria-pressed", String(record.isFavorite));
        favorite.textContent = record.isFavorite ? "Favorita" : "Favoritar";
      }
    });
    syncSummary();
    sync();
  };

  search?.addEventListener("input", () => {
    state.query = search.value.trim();
    sync();
  });

  root.addEventListener("click", (event) => {
    const focusSearch = event.target.closest("[data-bv-focus-search]");
    const age = event.target.closest("[data-bv-filter-age]");
    const volume = event.target.closest("[data-bv-filter-volume]");
    const status = event.target.closest("[data-bv-filter-status]");
    if (focusSearch) {
      search?.focus();
      return;
    }
    if (age) {
      state.age = age.dataset.bvFilterAge;
      sync();
      return;
    }
    if (volume) {
      state.volume = volume.dataset.bvFilterVolume;
      sync();
      return;
    }
    if (status) {
      state.status = state.status === status.dataset.bvFilterStatus ? "all" : status.dataset.bvFilterStatus;
      sync();
    }
  });

  window.addEventListener("raizes:experience-progress", (event) => {
    if (event.detail?.experienceCode) syncCardProgress(event.detail);
  });

  sync();
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
    selectionStatus.innerHTML = `${htmlEscape(message)} <a href="login.html?auth=supabase&next=${next}">Entrar novamente</a>`;
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

const initTeacherWorkspace = () => {
  const workspace = document.querySelector("[data-teacher-workspace]");
  if (!workspace) return;
  const content = workspace.querySelector("[data-teacher-content]");
  const home = workspace.querySelector("[data-teacher-home]");
  const search = workspace.querySelector("[data-teacher-search]");

  const openView = (view) => {
    if (!content) return;
    if (view === "inicio") {
      content.hidden = true;
      if (home) home.hidden = false;
    } else {
      content.hidden = false;
      if (home) home.hidden = true;
    }
    content.innerHTML = renderTeacherWorkspaceView(view);
    workspace.querySelectorAll("[data-teacher-view]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.teacherView === view);
    });
    initUniversalActivityTeacherDeliveries();
    if (search) search.value = "";
  };

  workspace.addEventListener("click", (event) => {
    const urlButton = event.target.closest("[data-teacher-open-url]");
    if (urlButton) {
      window.location.href = urlButton.dataset.teacherOpenUrl;
      return;
    }
    const button = event.target.closest("[data-teacher-view]");
    if (!button) return;
    event.preventDefault();
    openView(button.dataset.teacherView || "inicio");
  });

  search?.addEventListener("input", () => {
    const query = search.value.trim().toLowerCase();
    content?.querySelectorAll("[data-teacher-search-item]").forEach((item) => {
      item.hidden = Boolean(query) && !item.textContent.toLowerCase().includes(query);
    });
  });
};

const initPrintableActivities = () => {
  const root = document.querySelector("[data-printable-app]");
  if (!root) return;
  let debounceTimer = null;
  const updateUrlFromForm = () => {
    const form = root.querySelector("[data-pa-filters]");
    if (!form) return;
    const data = new FormData(form);
    const params = new URLSearchParams();
    for (const [key, value] of data.entries()) {
      if (String(value || "").trim()) params.set(key, value);
    }
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
    window.history.replaceState({}, "", next);
    const admin = root.dataset.printableApp === "admin";
    root.outerHTML = renderPrintableMainPage({ admin });
    initPrintableActivities();
  };
  root.addEventListener("input", (event) => {
    if (!event.target.closest("[data-pa-filters]")) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updateUrlFromForm, 180);
  });
  root.addEventListener("change", (event) => {
    if (event.target.closest("[data-pa-filters]")) updateUrlFromForm();
  });
  root.addEventListener("click", (event) => {
    const ageButton = event.target.closest("[data-pa-filter-faixa]");
    if (ageButton) {
      const params = getPrintableParams();
      params.set("faixa", ageButton.dataset.paFilterFaixa);
      window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
      const admin = root.dataset.printableApp === "admin";
      root.outerHTML = renderPrintableMainPage({ admin });
      initPrintableActivities();
      return;
    }
    if (event.target.closest("[data-pa-clear]")) {
      window.history.replaceState({}, "", window.location.pathname);
      const admin = root.dataset.printableApp === "admin";
      root.outerHTML = renderPrintableMainPage({ admin });
      initPrintableActivities();
      return;
    }
    const favorite = event.target.closest("[data-pa-favorite]");
    if (favorite) {
      const isFavorite = printableActivitiesDataService.toggleFavorite(favorite.dataset.paFavorite);
      printableActivitiesDataService.metric("favorito", { codigo: favorite.dataset.paFavorite, active: isFavorite });
      favorite.textContent = isFavorite ? "Favorito" : "Favoritar";
      favorite.setAttribute("aria-pressed", String(isFavorite));
      return;
    }
    const printButton = event.target.closest("[data-pa-print]");
    if (printButton) {
      const item = printableActivitiesDataService.getByCode(printButton.dataset.paPrint, { admin: root.dataset.printableApp === "admin" });
      const printableFile = item?.arquivoA4 || item?.arquivoOriginal;
      if (!printableFile) return;
      printableActivitiesDataService.metric("impressao", { codigo: item.codigo });
      const printWindow = window.open("", "_blank", "noopener,noreferrer");
      if (!printWindow) return;
      printWindow.document.write(`
        <!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>${printableEscape(item.codigo)}</title>
        <style>
          @page{size:A4 ${item.orientacaoPagina === "paisagem" ? "landscape" : "portrait"};margin:0}
          html,body{margin:0;width:100%;min-height:100%;background:#fff}
          body{display:grid;place-items:center}
          .sheet{width:${item.orientacaoPagina === "paisagem" ? "297mm" : "210mm"};height:${item.orientacaoPagina === "paisagem" ? "210mm" : "297mm"};display:grid;place-items:center;overflow:hidden;break-after:page;background:#fff}
          img,iframe{display:block;width:100%;height:100%;object-fit:contain;border:0}
          @media screen{body{min-height:100vh;background:#eef3ef}.sheet{box-shadow:0 12px 30px rgba(0,0,0,.16)}}
        </style></head>
        <body><main class="sheet">${String(item.formato).toLowerCase() === "pdf" ? `<iframe src="${printableEscape(printableFile)}" title="${printableEscape(item.codigo)}"></iframe>` : `<img src="${printableEscape(printableFile)}" alt="${printableEscape(item.codigo)}" />`}</main><script>window.onload=()=>setTimeout(()=>window.print(),250);<\/script></body></html>
      `);
      printWindow.document.close();
      return;
    }
    const download = event.target.closest("[data-pa-download]");
    if (download) {
      printableActivitiesDataService.metric("download", { codigo: download.dataset.paDownload });
    }
    const view = event.target.closest("[data-pa-view]");
    if (view) {
      printableActivitiesDataService.metric("visualizacao_card", { codigo: view.dataset.paView });
    }
  });
};

const initUniversalActivityAssignmentUi = () => {
  const dialog = document.querySelector("[data-ua-assign-dialog]");
  if (!dialog) return;
  const form = dialog.querySelector("[data-ua-assign-form]");
  const classSelect = form?.querySelector("[name='classId']");
  const scopeSelect = form?.querySelector("[name='scope']");
  const studentFieldset = form?.querySelector("[data-ua-students]");
  const renderStudents = () => {
    const classInfo = getUniversalActivityClass(classSelect?.value);
    const scope = scopeSelect?.value || "class";
    studentFieldset.innerHTML = `<legend>Alunos</legend>${classInfo.students
      .map((student, index) => {
        const checked = scope === "class" || (scope === "student" && index === 0) ? "checked" : "";
        const type = scope === "student" ? "radio" : "checkbox";
        return `<label><input type="${type}" name="studentIds" value="${printableEscape(student.id)}" ${checked} ${scope === "class" ? "disabled" : ""} /><span>${printableEscape(student.name)}</span></label>`;
      })
      .join("")}`;
  };
  document.addEventListener("click", (event) => {
    const assign = event.target.closest("[data-ua-assign]");
    if (!assign) return;
    form.activityCode.value = assign.dataset.uaAssign;
    renderStudents();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  });
  dialog.addEventListener("click", (event) => {
    if (event.target.closest("[data-ua-close-dialog]")) dialog.close?.();
  });
  classSelect?.addEventListener("change", renderStudents);
  scopeSelect?.addEventListener("change", renderStudents);
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const classInfo = getUniversalActivityClass(String(data.get("classId") || ""));
    const scope = String(data.get("scope") || "class");
    const studentIds =
      scope === "class"
        ? classInfo.students.map((student) => student.id)
        : data.getAll("studentIds").map(String).filter(Boolean);
    if (!studentIds.length) {
      window.alert("Selecione pelo menos um aluno.");
      return;
    }
    createUniversalActivityAssignment({
      activityCode: String(data.get("activityCode") || ""),
      classId: classInfo.id,
      studentIds,
      instructions: String(data.get("instructions") || ""),
      dueDate: String(data.get("dueDate") || ""),
      toolProfile: String(data.get("toolProfile") || "ei2"),
      mode: String(data.get("mode") || "livre"),
    });
    dialog.close?.();
    window.alert("Atividade indicada com sucesso.");
  });
  renderStudents();
};

const renderUniversalDeliveryDetail = (assignmentId, target) => {
  const state = readUniversalActivityState();
  const assignment = state.assignments.find((item) => item.assignmentId === assignmentId);
  if (!assignment || !target) return;
  const activity = getUniversalActivityByCode(assignment.activityCode);
  const classInfo = getUniversalActivityClass(assignment.classId);
  const selectedStudentId = target.dataset.uaSelectedStudent || "";
  const selectedStudent = classInfo.students.find((student) => student.id === selectedStudentId);
  const selectedSubmission = selectedStudent
    ? state.submissions.find((item) => item.assignmentId === assignment.assignmentId && item.studentId === selectedStudent.id)
    : null;
  const selectedStatus = selectedSubmission?.status === "COMPLETED" ? "CONCLUIDA" : selectedSubmission?.status === "IN_PROGRESS" ? "EM ANDAMENTO" : "NAO INICIOU";
  target.innerHTML = `
    <section class="ua-delivery-open">
      <header><span>${printableEscape(assignment.activityCode)}</span><h3>Entregas</h3><small>${printableEscape(activity?.titulo || assignment.activityCode)} · ${printableEscape(assignment.className)}</small></header>
      ${classInfo.students
        .filter((student) => assignment.studentIds.includes(student.id))
        .map((student) => {
          const submission = state.submissions.find((item) => item.assignmentId === assignment.assignmentId && item.studentId === student.id);
          const status = submission?.status === "COMPLETED" ? "CONCLUIDA" : submission?.status === "IN_PROGRESS" ? "EM ANDAMENTO" : "NAO INICIOU";
          return `
            <article>
              <strong>${printableEscape(student.name)}</strong>
              <span>${status}</span>
              ${submission?.finalArtwork || submission?.preview ? `<img src="${printableEscape(submission.finalArtwork || submission.preview)}" alt="Producao de ${printableEscape(student.name)}" />` : `<small>Sem producao salva.</small>`}
              <small>Envio: ${new Date(assignment.assignedAt).toLocaleString("pt-BR")} · Inicio: ${submission?.startedAt ? new Date(submission.startedAt).toLocaleString("pt-BR") : "pendente"} · Ultima edicao: ${submission?.lastSavedAt ? new Date(submission.lastSavedAt).toLocaleString("pt-BR") : "pendente"} · Conclusao: ${submission?.completedAt ? new Date(submission.completedAt).toLocaleString("pt-BR") : "pendente"}</small>
              <button type="button" data-ua-open-student-delivery="${printableEscape(student.id)}">Abrir detalhes</button>
            </article>
          `;
        })
        .join("")}
      ${
        selectedStudent
          ? `<aside class="ua-delivery-student-detail">
              <h4>${printableEscape(selectedStudent.name)}</h4>
              <dl>
                <div><dt>Status</dt><dd>${selectedStatus}</dd></div>
                <div><dt>Codigo</dt><dd>${printableEscape(assignment.activityCode)}</dd></div>
                <div><dt>Titulo</dt><dd>${printableEscape(activity?.titulo || assignment.activityCode)}</dd></div>
                <div><dt>Turma</dt><dd>${printableEscape(assignment.className)}</dd></div>
                <div><dt>Professor</dt><dd>${printableEscape(assignment.teacherName)}</dd></div>
                <div><dt>Envio</dt><dd>${new Date(assignment.assignedAt).toLocaleString("pt-BR")}</dd></div>
                <div><dt>Inicio</dt><dd>${selectedSubmission?.startedAt ? new Date(selectedSubmission.startedAt).toLocaleString("pt-BR") : "pendente"}</dd></div>
                <div><dt>Ultima edicao</dt><dd>${selectedSubmission?.lastSavedAt ? new Date(selectedSubmission.lastSavedAt).toLocaleString("pt-BR") : "pendente"}</dd></div>
                <div><dt>Conclusao</dt><dd>${selectedSubmission?.completedAt ? new Date(selectedSubmission.completedAt).toLocaleString("pt-BR") : "pendente"}</dd></div>
              </dl>
              ${selectedSubmission?.finalArtwork || selectedSubmission?.preview ? `<img src="${printableEscape(selectedSubmission.finalArtwork || selectedSubmission.preview)}" alt="Producao final de ${printableEscape(selectedStudent.name)}" />` : `<p class="ua-empty">Este aluno ainda nao salvou producao.</p>`}
            </aside>`
          : ""
      }
    </section>
  `;
};

const initUniversalActivityTeacherDeliveries = () => {
  const root = document.querySelector("[data-ua-deliveries]");
  if (!root) return;
  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-ua-open-delivery]");
    const studentButton = event.target.closest("[data-ua-open-student-delivery]");
    const target = root.querySelector("[data-ua-delivery-detail]");
    if (studentButton && target) {
      target.dataset.uaSelectedStudent = studentButton.dataset.uaOpenStudentDelivery;
      renderUniversalDeliveryDetail(target.dataset.uaAssignmentId, target);
      return;
    }
    if (!button || !target) return;
    target.dataset.uaAssignmentId = button.dataset.uaOpenDelivery;
    target.dataset.uaSelectedStudent = "";
    renderUniversalDeliveryDetail(button.dataset.uaOpenDelivery, target);
  });
};

const initUniversalActivityEngine = () => {
  const root = document.querySelector("[data-ua-engine]");
  if (!root) return;
  const assignmentId = root.dataset.assignmentId;
  const state = readUniversalActivityState();
  const assignment = state.assignments.find((item) => item.assignmentId === assignmentId);
  if (!assignment) return;
  const activity = getUniversalActivityByCode(assignment.activityCode);
  let submission = getOrCreateUniversalActivitySubmission(assignment);
  const canvas = root.querySelector("[data-ua-canvas]");
  const ctx = canvas.getContext("2d");
  const stage = root.querySelector("[data-ua-stage]");
  const objectLayer = root.querySelector("[data-ua-object-layer]");
  const saveStatus = root.querySelector("[data-ua-save-status]");
  let activeTool = "pincel";
  let activeColor = "#0b7a34";
  let activeSize = 16;
  let drawing = false;
  let currentStroke = null;
  let selectedObject = null;
  let activeObjectId = null;
  let undoStack = [];
  let redoStack = [];

  const snapshot = () => JSON.stringify({ strokes: submission.canvasData?.strokes || [], objects: submission.objectsData || [] });
  const restoreSnapshot = (text) => {
    const parsed = JSON.parse(text);
    submission.canvasData = { strokes: parsed.strokes || [] };
    submission.objectsData = parsed.objects || [];
    drawAll();
  };
  const pushUndo = () => {
    undoStack.push(snapshot());
    if (undoStack.length > 30) undoStack.shift();
    redoStack = [];
  };
  const normalizedPoint = (event) => {
    const rect = canvas.getBoundingClientRect();
    const source = event.touches?.[0] || event.changedTouches?.[0] || event;
    return {
      x: Math.max(0, Math.min(1, (source.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (source.clientY - rect.top) / rect.height)),
    };
  };
  const drawStroke = (stroke) => {
    const points = stroke.points || [];
    if (points.length < 1) return;
    ctx.save();
    if (stroke.tool === "borracha") ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = stroke.opacity ?? 0.9;
    ctx.strokeStyle = stroke.tool === "borracha" ? "rgba(0,0,0,1)" : stroke.color;
    ctx.lineWidth = (stroke.size || 16) * (stroke.tool === "dedo" ? 1.8 : stroke.tool === "rolinho" ? 2.4 : stroke.tool === "esponja" ? 1.6 : 1);
    ctx.lineCap = stroke.tool === "rolinho" ? "square" : "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    points.forEach((point, index) => {
      const x = point.x * canvas.width;
      const y = point.y * canvas.height;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      if (stroke.tool === "esponja" && index % 2 === 0) {
        ctx.moveTo(x + 0.1, y + 0.1);
        ctx.arc(x, y, ctx.lineWidth * 0.38, 0, Math.PI * 2);
      }
    });
    ctx.stroke();
    ctx.restore();
  };
  const renderObjects = () => {
    objectLayer.innerHTML = (submission.objectsData || [])
      .map((object) => `<button type="button" class="ua-collage-object is-${object.kind}" data-object-id="${object.id}" style="left:${object.x * 100}%;top:${object.y * 100}%;width:${object.size * 100}%;height:${object.size * 100}%;--ua-color:${object.color || activeColor};transform:rotate(${object.rotation || 0}deg)" aria-label="${object.kind}"></button>`)
      .join("");
  };
  const drawAll = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    (submission.canvasData?.strokes || []).forEach(drawStroke);
    renderObjects();
  };
  const ensureImageReady = (image) => {
    if (!image || (image.complete && image.naturalWidth)) return Promise.resolve();
    return new Promise((resolve) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    });
  };
  const saveSubmission = async ({ complete = false } = {}) => {
    const now = new Date().toISOString();
    submission.status = complete ? "COMPLETED" : submission.status === "NOT_STARTED" ? "IN_PROGRESS" : submission.status;
    submission.startedAt = submission.startedAt || now;
    submission.lastSavedAt = now;
    if (complete) submission.completedAt = now;
    submission.engineVersion = universalActivityEngineVersion;
    submission.preview = canvas.toDataURL("image/png", 0.82);
    if (complete) {
      const composed = document.createElement("canvas");
      composed.width = canvas.width;
      composed.height = canvas.height;
      const cctx = composed.getContext("2d");
      const base = root.querySelector("[data-ua-base]");
      await ensureImageReady(base);
      if (base?.naturalWidth) cctx.drawImage(base, 0, 0, composed.width, composed.height);
      cctx.drawImage(canvas, 0, 0);
      for (const object of submission.objectsData || []) {
        cctx.save();
        cctx.translate(object.x * composed.width, object.y * composed.height);
        cctx.rotate(((object.rotation || 0) * Math.PI) / 180);
        cctx.fillStyle = object.color || activeColor;
        const size = object.size * composed.width;
        if (object.kind === "algodao") {
          cctx.fillStyle = "#f7f7f2";
          cctx.beginPath();
          cctx.arc(0, 0, size / 2, 0, Math.PI * 2);
          cctx.fill();
        } else if (object.kind === "barbante") {
          cctx.strokeStyle = "#8d6e63";
          cctx.lineWidth = Math.max(8, size / 5);
          cctx.beginPath();
          cctx.moveTo(-size / 2, 0);
          cctx.lineTo(size / 2, 0);
          cctx.stroke();
        } else {
          cctx.beginPath();
          cctx.arc(0, 0, size / 2, 0, Math.PI * 2);
          cctx.fill();
        }
        cctx.restore();
      }
      submission.finalArtwork = composed.toDataURL("image/png", 0.9);
    }
    upsertUniversalActivitySubmission(submission);
    if (complete) syncUniversalActivityPortfolio(submission);
    if (saveStatus) saveStatus.textContent = complete ? "Concluida" : `Salvo ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  };
  const addObject = (point) => {
    pushUndo();
    const kind = activeTool;
    submission.objectsData = [
      ...(submission.objectsData || []),
      { id: `obj-${Date.now()}`, kind, x: point.x, y: point.y, size: kind === "barbante" ? 0.12 : 0.055, color: kind === "algodao" ? "#f7f7f2" : activeColor, rotation: kind === "barbante" ? -8 : 0 },
    ];
    activeObjectId = submission.objectsData.at(-1)?.id || null;
    drawAll();
    saveSubmission();
  };
  const removeObjectAt = (point) => {
    const objects = submission.objectsData || [];
    let index = -1;
    for (let i = objects.length - 1; i >= 0; i -= 1) {
      const object = objects[i];
      if (Math.abs(object.x - point.x) < object.size && Math.abs(object.y - point.y) < object.size) {
        index = i;
        break;
      }
    }
    if (index >= 0) {
      pushUndo();
      objects.splice(index, 1);
      submission.objectsData = objects;
      drawAll();
      saveSubmission();
      return true;
    }
    return false;
  };
  const start = (event) => {
    event.preventDefault();
    const point = normalizedPoint(event);
    if (["algodao", "papel", "barbante", "bolinhas"].includes(activeTool)) {
      addObject(point);
      return;
    }
    if (activeTool === "borracha" && removeObjectAt(point)) return;
    pushUndo();
    drawing = true;
    currentStroke = { tool: activeTool, color: activeColor, size: activeSize, opacity: activeTool === "dedo" ? 0.72 : 0.9, points: [point] };
  };
  const move = (event) => {
    if (!drawing || !currentStroke) return;
    event.preventDefault();
    currentStroke.points.push(normalizedPoint(event));
    drawAll();
    drawStroke(currentStroke);
  };
  const end = () => {
    if (!drawing || !currentStroke) return;
    drawing = false;
    submission.canvasData = { strokes: [...(submission.canvasData?.strokes || []), currentStroke] };
    currentStroke = null;
    drawAll();
    saveSubmission();
  };
  stage.addEventListener("pointerdown", start);
  stage.addEventListener("pointermove", move);
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);
  objectLayer.addEventListener("pointerdown", (event) => {
    const objectButton = event.target.closest("[data-object-id]");
    if (!objectButton) return;
    event.stopPropagation();
    const object = submission.objectsData.find((item) => item.id === objectButton.dataset.objectId);
    if (!object) return;
    if (activeTool === "borracha") {
      pushUndo();
      submission.objectsData = submission.objectsData.filter((item) => item.id !== object.id);
      activeObjectId = null;
      drawAll();
      saveSubmission();
      return;
    }
    selectedObject = { id: object.id };
    activeObjectId = object.id;
    pushUndo();
  });
  objectLayer.addEventListener("pointermove", (event) => {
    if (!selectedObject) return;
    event.preventDefault();
    const point = normalizedPoint(event);
    const object = submission.objectsData.find((item) => item.id === selectedObject.id);
    if (object) {
      object.x = point.x;
      object.y = point.y;
      drawAll();
    }
  });
  objectLayer.addEventListener("pointerup", () => {
    if (selectedObject) saveSubmission();
    selectedObject = null;
  });
  window.addEventListener("pointerup", () => {
    if (selectedObject) saveSubmission();
    selectedObject = null;
  });
  root.addEventListener("click", async (event) => {
    const tool = event.target.closest("[data-ua-tool]");
    if (tool) {
      activeTool = tool.dataset.uaTool;
      root.querySelectorAll("[data-ua-tool]").forEach((button) => button.classList.toggle("is-active", button === tool));
    }
    const color = event.target.closest("[data-ua-color]");
    if (color) {
      activeColor = color.dataset.uaColor;
      root.querySelectorAll("[data-ua-color]").forEach((button) => button.classList.toggle("is-active", button === color));
    }
    if (event.target.closest("[data-ua-undo]") && undoStack.length) {
      redoStack.push(snapshot());
      restoreSnapshot(undoStack.pop());
      saveSubmission();
    }
    if (event.target.closest("[data-ua-redo]") && redoStack.length) {
      undoStack.push(snapshot());
      restoreSnapshot(redoStack.pop());
      saveSubmission();
    }
    if (event.target.closest("[data-ua-clear]") && window.confirm("Limpar sua producao? A atividade original sera mantida.")) {
      pushUndo();
      submission.canvasData = { strokes: [] };
      submission.objectsData = [];
      drawAll();
      saveSubmission();
    }
    if (event.target.closest("[data-ua-save]")) saveSubmission();
    if (event.target.closest("[data-ua-complete]") && window.confirm("Concluir atividade agora?")) {
      await saveSubmission({ complete: true });
      window.location.href = "aluno.html";
    }
  });
  root.querySelector("[data-ua-size]")?.addEventListener("input", (event) => {
    activeSize = Number(event.target.value || 16);
    const object = (submission.objectsData || []).find((item) => item.id === activeObjectId);
    if (object) {
      object.size = Math.max(0.035, Math.min(0.18, activeSize / 260));
      drawAll();
      saveSubmission();
    }
  });
  drawAll();
  saveSubmission();
  window.setInterval(() => saveSubmission(), 12000);
};

let platformLogoutInitialized = false;
const initPlatformLogout = () => {
  if (platformLogoutInitialized) return;
  platformLogoutInitialized = true;
  document.addEventListener("click", async (event) => {
    const button = event.target.closest?.("[data-platform-logout]");
    if (!button) return;
    event.preventDefault();
    button.disabled = true;
    button.textContent = "SAINDO...";
    await signOutPlatformSession();
  });
};

const renderAppPage = () => {
  const mount = document.querySelector("[data-app-page]");
  if (!mount) {
    return;
  }

  const activeKey = mount.dataset.appPage || "biblioteca";
  const activeModule = modules[activeKey] || modules.biblioteca;
  const currentRole = getCurrentPlatformRole();
  if (currentRole === "aluno" && !studentAllowedRouteKeys.has(activeKey)) {
    document.documentElement.style.display = "none";
    window.location.replace(getRoleHome(currentRole));
    return;
  }
  let environmentKey = moduleEnvironment[activeKey] || activeKey;
  if (currentRole === "aluno" && studentAllowedRouteKeys.has(activeKey)) {
    environmentKey = "aluno";
  }
  const environment = environments[environmentKey] || environments.biblioteca;
  if (currentRole && !canAccessPlatformRoute(activeKey, currentRole)) {
    document.documentElement.style.display = "none";
    window.location.replace(getRoleHome(currentRole));
    return;
  }
  document.title = `${activeModule.title} | Raizes e Saberes`;

  if (["professorTurma", "professorAluno"].includes(activeKey)) {
    mount.innerHTML = activeModule.html;
    initPlatformLogout();
    requestAnimationFrame(() => {
      document.querySelector(".teacher-workspace")?.classList.add("is-mounted");
    });
    initTeacherWorkspace();
    initUniversalActivityAssignmentUi();
    initUniversalActivityTeacherDeliveries();
    return;
  }

  if (activeKey === "admin") {
    mount.innerHTML = activeModule.html;
    initPlatformLogout();
    requestAnimationFrame(() => {
      document.querySelector(".admin-workspace")?.classList.add("is-mounted");
    });
    initAdminWorkspace();
    return;
  }

  if (activeKey === "familia") {
    mount.innerHTML = activeModule.html;
    initPlatformLogout();
    initFamilyArea();
    return;
  }

  if (activeKey === "alunoAtividade") {
    mount.innerHTML = activeModule.html;
    initPlatformLogout();
    return;
  }

  const nav = environment.nav
    .map(([key, label, href]) =>
      key === "heading"
        ? `<strong class="app-nav-heading">${label}</strong>`
        : key === "logout"
          ? `<button class="app-nav-logout" type="button" data-platform-logout>${label}</button>`
        : `<a class="${key === activeKey ? "is-active" : ""}" href="${href}">${label}</a>`
    )
    .join("");
  const mobileNav = environment.mobile
    .map(([key, label, href]) =>
      key === "logout"
        ? `<button class="mobile-logout-button" type="button" data-platform-logout>${label}</button>`
        : `<a class="${key === activeKey ? "is-active" : ""}" href="${href}">${label}</a>`
    )
    .join("");
  const shellHomeHref = environmentKey === "aluno" ? "aluno.html" : "plataforma.html";
  const shellLogoHref = environmentKey === "aluno" ? "aluno.html" : "index.html";

  mount.innerHTML = `
    <div class="app-shell" data-environment="${environmentKey}" data-active-module="${activeKey}">
      <aside class="app-sidebar" aria-label="Navegacao principal">
        <a class="sidebar-logo" href="${shellLogoHref}" aria-label="Raizes e Saberes">
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
          <a class="icon-button menu-toggle" href="${shellHomeHref}" aria-label="Inicio">☰</a>
          <label class="app-search"><span>Pesquisar</span><input type="search" placeholder="${environment.search}" /></label>
          <button class="top-filter" type="button">Filtros</button>
          <nav class="module-switcher" aria-label="Modulos do Ecossistema">${ecosystemModuleLinks(activeKey, environmentKey)}</nav>
          <div class="top-actions" aria-label="Acoes"><span class="notif">3</span><span class="notif">2</span><div class="user-chip">${environment.avatar ? `<img src="${environment.avatar}" alt="" />` : `<span>MS</span>`}<strong>${environment.user}</strong></div></div>
        </header>
        <section class="screen is-active route-screen" data-route-screen="${activeKey}">${activeModule.html}</section>
      </main>
    </div>
    <nav class="mobile-tabbar" aria-label="Navegacao mobile">${mobileNav}</nav>
  `;

  requestAnimationFrame(() => {
    document.querySelector(".route-screen")?.classList.add("is-mounted");
    document.querySelector("[data-student-dashboard]")?.classList.add("is-mounted");
  });

  initPlatformLogout();
  initSchoolCollectiveDashboard();
  initBookReader();
  initLibrarySearch();
  initLibraryExperiences();
  initPremiumLibrary();
  initLibraryAssetFallbacks();
  initMissionPlayer();
  initQuestionBank();
  initDigitalStudentAssessments();
  initDigitalResultsPanel();
  initCurationBatches();
  initTeacherWorkspace();
  initPrintableActivities();
  initUniversalActivityAssignmentUi();
  initUniversalActivityTeacherDeliveries();
  initUniversalActivityEngine();
};

renderAppPage();
