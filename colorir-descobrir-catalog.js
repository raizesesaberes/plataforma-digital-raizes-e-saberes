(function () {
  const storageKey = "raizes:colorir-descobrir:catalog:v2";
  const now = "2026-08-22T00:00:00.000Z";
  const jardimFigure = (ordem, titulo, curiosidade) => {
    const code = String(ordem).padStart(2, "0");
    const slug = titulo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const fileName = `PCD_JARDIM_${code}_${titulo}`;
    return {
      id: `${slug}-jardim`,
      codigoInterno: `PCD-JARDIM-${code}`,
      titulo,
      tema: "bichinhos-jardim",
      ordem,
      imagemBranca: `assets/colorir-descobrir/figuras/branco/${fileName}.png`,
      imagemColorida: "",
      imagemMascara: `assets/colorir-descobrir/figuras/mask/${fileName}_MASK.png`,
      audioCuriosidade: "",
      textoCuriosidade: curiosidade,
      musicaLoop: "",
      status: "publicado",
      createdAt: now,
      updatedAt: now,
    };
  };

  const defaultCatalog = {
    version: "COLORIR_DESCOBRIR_PROFILE_V1",
    engineBase: "PRINTABLE_ACTIVITY_ENGINE",
    profile: "COLORIR_DISCOVER_PROFILE",
    storageBasePath: "assets/colorir-descobrir",
    ageGroups: [
      { id: "livre", label: "Livre", age: "Crianca", segment: "Entretenimento educativo infantil", expectedTotal: 0 },
    ],
    themes: [
      { id: "bichinhos-jardim", titulo: "Bichinhos do Jardim", ordem: 1, status: "publicado", accent: "#35b779" },
      { id: "animais-fazenda", titulo: "Animais da Fazenda", ordem: 2, status: "rascunho", accent: "#f49b36" },
      { id: "fundo-mar", titulo: "Fundo do Mar", ordem: 3, status: "rascunho", accent: "#37a7d8" },
      { id: "nossa-natureza", titulo: "Nossa Natureza", ordem: 4, status: "rascunho", accent: "#7fb43f" },
      { id: "dinossauros", titulo: "Dinossauros", ordem: 5, status: "rascunho", accent: "#8a7bd1" },
      { id: "frutas-alimentos", titulo: "Frutas e Alimentos", ordem: 6, status: "rascunho", accent: "#e94f7b" },
      { id: "cultura-brasileira", titulo: "Cultura Brasileira", ordem: 7, status: "rascunho", accent: "#f2c230" },
      { id: "brinquedos-brincadeiras", titulo: "Brinquedos e Brincadeiras", ordem: 8, status: "rascunho", accent: "#2ea39a" },
    ],
    figures: [
      jardimFigure(1, "JOANINHA", "As joaninhas ajudam o jardim porque comem bichinhos bem pequenos que ficam nas folhas."),
      jardimFigure(2, "BORBOLETA", "As borboletas visitam flores e carregam pozinhos que ajudam novas plantas a nascerem."),
      jardimFigure(3, "ABELHA", "As abelhas visitam flores e ajudam o jardim a ficar cheio de vida."),
      jardimFigure(4, "CARACOL", "O caracol leva a casinha nas costas e gosta de lugares fresquinhos."),
      jardimFigure(5, "LAGARTA", "A lagarta come folhas e, depois de um tempo, pode virar uma borboleta."),
      jardimFigure(6, "FORMIGA", "As formigas trabalham juntas e conseguem carregar alimentos maiores que elas."),
      jardimFigure(7, "GRILO", "O grilo faz som esfregando as asinhas para conversar no jardim."),
      jardimFigure(8, "LIBELULA", "A libelula voa rapido e gosta de ficar perto da agua e das plantas."),
    ],
  };

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const normalizeStatus = (status) => (["publicado", "rascunho", "arquivado"].includes(status) ? status : "rascunho");
  const normalizeTheme = (theme = {}) => ({
    id: String(theme.id || theme.titulo || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    titulo: String(theme.titulo || "").trim(),
    ordem: Number(theme.ordem || 999),
    status: normalizeStatus(theme.status),
    accent: theme.accent || "#35b779",
  });
  const normalizeFigure = (figure = {}) => ({
    id: String(figure.id || figure.codigoInterno || figure.titulo || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    codigoInterno: String(figure.codigoInterno || "").trim(),
    titulo: String(figure.titulo || "").trim(),
    tema: String(figure.tema || "").trim(),
    ordem: Number(figure.ordem || 999),
    imagemBranca: figure.imagemBranca || "",
    imagemColorida: figure.imagemColorida || "",
    imagemMascara: figure.imagemMascara || figure.mask || "",
    audioCuriosidade: figure.audioCuriosidade || "",
    textoCuriosidade: figure.textoCuriosidade || "",
    musicaLoop: figure.musicaLoop || "",
    status: normalizeStatus(figure.status),
    createdAt: figure.createdAt || new Date().toISOString(),
    updatedAt: figure.updatedAt || new Date().toISOString(),
  });
  const normalizeCatalog = (catalog = {}) => ({
    ...defaultCatalog,
    ...catalog,
    themes: (catalog.themes || defaultCatalog.themes).map(normalizeTheme).filter((item) => item.id && item.titulo).sort((a, b) => a.ordem - b.ordem),
    figures: (catalog.figures || defaultCatalog.figures).map(normalizeFigure).filter((item) => item.id && item.titulo && item.tema).sort((a, b) => a.ordem - b.ordem),
  });

  const readLocalCatalog = () => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "null");
    } catch (error) {
      console.warn("Nao foi possivel ler o catalogo local do Pra Colorir e Descobrir.", error);
      return null;
    }
  };

  const writeLocalCatalog = (catalog) => {
    const normalized = normalizeCatalog(catalog);
    localStorage.setItem(storageKey, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent("raizes:colorir-descobrir-catalog", { detail: normalized }));
    return normalized;
  };

  const api = {
    profile: "COLORIR_DISCOVER_PROFILE",
    engineBase: "PRINTABLE_ACTIVITY_ENGINE",
    storageKey,
    defaultCatalog: clone(defaultCatalog),
    getCatalog() {
      return normalizeCatalog(readLocalCatalog() || defaultCatalog);
    },
    saveCatalog(catalog) {
      return writeLocalCatalog(catalog);
    },
    resetCatalog() {
      localStorage.removeItem(storageKey);
      return this.getCatalog();
    },
    getThemes({ includeDrafts = false } = {}) {
      return this.getCatalog().themes.filter((theme) => includeDrafts || theme.status === "publicado");
    },
    getFiguresByTheme(themeId, { includeDrafts = false } = {}) {
      return this.getCatalog().figures.filter((figure) => figure.tema === themeId && (includeDrafts || figure.status === "publicado"));
    },
    getFigure(figureId, { includeDrafts = false } = {}) {
      return this.getCatalog().figures.find((figure) => figure.id === figureId && (includeDrafts || figure.status === "publicado")) || null;
    },
    toPrintableActivity(figure) {
      const theme = this.getCatalog().themes.find((item) => item.id === figure.tema);
      return {
        id: figure.id,
        codigo: figure.codigoInterno,
        slug: figure.id,
        titulo: figure.titulo,
        segmento: "Entretenimento educativo infantil",
        etapa: "Area da Escola",
        faixaEtaria: "livre",
        idade: "Livre",
        descricao: figure.textoCuriosidade,
        objetivo: "",
        comandoCrianca: "Colorir livremente",
        orientacaoProfessor: "",
        camposExperiencia: [],
        direitosAprendizagem: [],
        tiposAtividade: ["Colorir livre"],
        materiais: ["Tela touch", "Canvas"],
        palavrasChave: [theme?.titulo || "", figure.titulo].filter(Boolean),
        arquivoOriginal: figure.imagemBranca,
        arquivoPng: figure.imagemBranca,
        arquivoMascara: figure.imagemMascara,
        arquivoPdf: "",
        miniatura: figure.imagemColorida || figure.imagemBranca,
        formato: "png",
        orientacaoPagina: "livre",
        largura: 1200,
        altura: 1200,
        versao: "1.0",
        status: String(figure.status || "").toUpperCase(),
        dataPublicacao: figure.createdAt,
        dataAtualizacao: figure.updatedAt,
        visualizacoes: 0,
        downloads: 0,
        impressoes: 0,
        createdAt: figure.createdAt,
        updatedAt: figure.updatedAt,
      };
    },
    printableActivities({ includeDrafts = false } = {}) {
      return this.getCatalog().figures.filter((figure) => includeDrafts || figure.status === "publicado").map((figure) => this.toPrintableActivity(figure));
    },
    upsertTheme(theme) {
      const catalog = this.getCatalog();
      const next = normalizeTheme(theme);
      if (!next.id || !next.titulo) return catalog;
      return writeLocalCatalog({
        ...catalog,
        themes: [next, ...catalog.themes.filter((item) => item.id !== next.id)],
      });
    },
    upsertFigure(figure) {
      const catalog = this.getCatalog();
      const next = normalizeFigure({ ...figure, updatedAt: new Date().toISOString() });
      if (!next.id || !next.titulo || !next.tema || !next.imagemBranca) return catalog;
      return writeLocalCatalog({
        ...catalog,
        figures: [next, ...catalog.figures.filter((item) => item.id !== next.id)],
      });
    },
  };

  window.RaizesColorirDescobrirCatalog = api;
})();
