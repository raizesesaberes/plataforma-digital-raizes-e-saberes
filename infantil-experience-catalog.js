(function (root, factory) {
  const catalog = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = catalog;
  }

  root.RaizesInfantilExperiences = catalog;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  const COLLECTION = "RAIZES_E_SABERES";
  const COLLECTION_CODE = "RS-EI";
  const SEGMENT = "educacao-infantil";
  const DEFAULT_PUBLIC_BASE_URL = "https://app.raizesesaberes.com.br";
  const INFANTIL_AGE_GROUPS = ["EI2", "EI3", "EI4", "EI5"];
  const INFANTIL_VOLUMES = ["V1", "V2"];
  const EDITORIAL_STATUSES = ["planned", "in_production", "review", "approved", "published", "archived"];
  const INTERACTIVE_ACTIVITY_TYPE_REGISTRY = {
    select_option: {
      label: "Selecionar opcao",
      component: "option-selector",
      completionRules: ["correct_answer", "all_correct_answers"],
      requiredFields: ["question.options", "question.correctAnswer"],
      supportsKeyboard: true,
    },
    tap_objects: {
      label: "Tocar objetos",
      component: "object-tapper",
      completionRules: ["correct_selection"],
      requiredFields: ["scene.objects", "selection.correctObjectIds"],
      supportsKeyboard: true,
    },
    drag_and_drop: {
      label: "Arrastar e soltar",
      component: "drop-zone-matcher",
      completionRules: ["all_items_placed"],
      requiredFields: ["draggables", "dropTargets"],
      supportsKeyboard: true,
      keyboardAlternative: "select_item_then_target",
    },
    match_pairs: {
      label: "Relacionar pares",
      component: "pair-matcher",
      completionRules: ["all_pairs_matched"],
      requiredFields: ["pairs"],
      supportsKeyboard: true,
    },
    sort_sequence: {
      label: "Ordenar sequencia",
      component: "sequence-sorter",
      completionRules: ["correct_order"],
      requiredFields: ["sequence.items", "sequence.correctOrder"],
      supportsKeyboard: true,
    },
    classify: {
      label: "Classificar",
      component: "category-classifier",
      completionRules: ["all_items_classified"],
      requiredFields: ["categories", "items"],
      supportsKeyboard: true,
    },
    complete_word: {
      label: "Completar palavra",
      component: "word-completer",
      completionRules: ["word_completed"],
      requiredFields: ["word.prompt", "word.answer", "word.choices"],
      supportsKeyboard: true,
    },
    trace_path: {
      label: "Tracar caminho",
      component: "path-tracer",
      completionRules: ["path_completed"],
      requiredFields: ["path.points"],
      supportsKeyboard: true,
    },
    memory_game: {
      label: "Jogo da memoria",
      component: "memory-cards",
      completionRules: ["all_pairs_matched"],
      requiredFields: ["memory.cards"],
      supportsKeyboard: true,
    },
    count_and_select: {
      label: "Contar e selecionar",
      component: "count-and-select",
      completionRules: ["correct_answer"],
      requiredFields: ["scene.objects", "question.options", "question.correctAnswer"],
      supportsKeyboard: true,
    },
  };
  const INTERACTIVE_ACTIVITY_TYPES = Object.keys(INTERACTIVE_ACTIVITY_TYPE_REGISTRY);
  const INTERACTIVE_ACTIVITY_STATES = [
    "not_started",
    "ready",
    "playing_intro",
    "presenting_question",
    "waiting_answer",
    "checking_answer",
    "correct",
    "incorrect",
    "completed",
    "paused",
    "error",
  ];
  const ASSET_BASE_PATH = "assets/experiencias/infantil";
  const EXPERIENCE_STATES = {
    unavailable: {
      label: "Indisponivel",
      message: "Esta experiencia ainda nao esta disponivel para abertura.",
    },
    "in-production": {
      label: "Em producao",
      message: "Video definitivo em producao. A reproducao usa um ativo provisorio identificado.",
    },
    available: {
      label: "Disponivel",
      message: "Experiencia pronta para reproduzir.",
    },
    loading: {
      label: "Carregando",
      message: "Preparando o video da experiencia.",
    },
    running: {
      label: "Em execucao",
      message: "Experiencia em reproducao.",
    },
    paused: {
      label: "Pausada",
      message: "Experiencia pausada.",
    },
    completed: {
      label: "Concluida",
      message: "Experiencia concluida neste dispositivo.",
    },
    error: {
      label: "Erro de carregamento",
      message: "Nao foi possivel carregar o video. Verifique o arquivo e tente novamente.",
    },
  };

  const padAssetNumber = (number) => String(number).padStart(3, "0");
  const ageSlug = (ageGroup) => ageGroup.toLowerCase();
  const volumeSlug = (volume) => (volume === "V1" ? "volume-1" : "volume-2");
  const semesterByVolume = (volume) => (volume === "V1" ? "1" : "2");
  const semesterNumberByVolume = (volume) => (volume === "V1" ? 1 : 2);
  const volumeNumber = (volume) => (volume === "V1" ? "1" : "2");
  const officialBookId = (ageGroup, volume) => {
    const age = Number(ageGroup.replace("EI", ""));
    if (age === 4) return volume === "V1" ? "livro-005" : "livro-006";
    if (age === 5) return volume === "V1" ? "livro-007" : "livro-008";
    return `livro-ei${age}-${volume.toLowerCase()}`;
  };
  const officialTeacherBookId = (ageGroup, volume) => {
    const age = Number(ageGroup.replace("EI", ""));
    if (age === 4) return volume === "V1" ? "guia-professor-004-v1" : "guia-professor-004-v2";
    if (age === 5) return volume === "V1" ? "guia-professor-005-v1" : "guia-professor-005-v2";
    return `guia-professor-ei${age}-${volume.toLowerCase()}`;
  };

  const assetFile = (ageGroup, volume, folder, extension, number = 1) =>
    `${ASSET_BASE_PATH}/${ageSlug(ageGroup)}/${volumeSlug(volume)}/${folder}/rs-${ageGroup.toLowerCase()}-${volume.toLowerCase()}-${padAssetNumber(number)}.${extension}`;

  const sharedCollectionFile = (folder, filename) => `${ASSET_BASE_PATH}/compartilhados/${folder}/${filename}`;
  const sharedAgeFile = (ageGroup, filename) => `${ASSET_BASE_PATH}/${ageSlug(ageGroup)}/compartilhados/${filename}`;

  const createVolumeAsset = ({ ageGroup, volume, number, title, folder, assetType, fileType, category, tags = [], status = "awaiting-upload", duration }) => ({
    code: `RS-${ageGroup}-${volume}-${padAssetNumber(number)}`,
    title,
    filePath: assetFile(ageGroup, volume, folder, fileType, number),
    assetType,
    fileType,
    category,
    ageGroup,
    volume,
    sharedScope: "exclusive",
    duration,
    tags: [COLLECTION, ageGroup, volume, ...tags],
    status,
  });

  const createSharedAgeAsset = ({ ageGroup, number, title, fileName, assetType, fileType, category, tags = [], status = "awaiting-upload" }) => ({
    code: `RS-${ageGroup}-C-${padAssetNumber(number)}`,
    title,
    filePath: sharedAgeFile(ageGroup, fileName),
    assetType,
    fileType,
    category,
    ageGroup,
    sharedScope: "age-group",
    tags: [COLLECTION, ageGroup, "compartilhado", ...tags],
    status,
  });

  const sharedInfantilAssets = [
    {
      code: "RS-EI-C-001",
      title: "Estrelas de recompensa da Educacao Infantil",
      filePath: sharedCollectionFile("efeitos", "rs-ei-c-001-estrelas-recompensa.json"),
      assetType: "lottie",
      fileType: "json",
      category: "success",
      sharedScope: "collection",
      tags: [COLLECTION, "educacao-infantil", "recompensa", "estrelas"],
      status: "awaiting-upload",
    },
    {
      code: "RS-EI-C-002",
      title: "Confetes universais da Educacao Infantil",
      filePath: sharedCollectionFile("efeitos", "rs-ei-c-002-confetes.json"),
      assetType: "lottie",
      fileType: "json",
      category: "completion",
      sharedScope: "collection",
      tags: [COLLECTION, "educacao-infantil", "confetes", "conclusao"],
      status: "awaiting-upload",
    },
    {
      code: "RS-EI-C-003",
      title: "Som universal de acerto",
      filePath: sharedCollectionFile("audios", "rs-ei-c-003-acerto.mp3"),
      assetType: "audio",
      fileType: "mp3",
      category: "success",
      sharedScope: "collection",
      tags: [COLLECTION, "educacao-infantil", "audio", "acerto"],
      status: "awaiting-upload",
    },
    {
      code: "RS-EI-C-004",
      title: "Som universal de nova tentativa",
      filePath: sharedCollectionFile("audios", "rs-ei-c-004-tentar-novamente.mp3"),
      assetType: "audio",
      fileType: "mp3",
      category: "retry",
      sharedScope: "collection",
      tags: [COLLECTION, "educacao-infantil", "audio", "retry"],
      status: "awaiting-upload",
    },
  ];

  const sharedAgeAssets = INFANTIL_AGE_GROUPS.flatMap((ageGroup, index) => [
    createSharedAgeAsset({
      ageGroup,
      number: 1,
      title: `Personagem guia compartilhado ${ageGroup}`,
      fileName: `rs-${ageGroup.toLowerCase()}-c-001-personagem-guia.webp`,
      assetType: "image",
      fileType: "webp",
      category: "character",
      tags: ["personagem", `infantil-${index + 2}`],
    }),
    createSharedAgeAsset({
      ageGroup,
      number: 2,
      title: `Trilha ambiente compartilhada ${ageGroup}`,
      fileName: `rs-${ageGroup.toLowerCase()}-c-002-trilha-ambiente.mp3`,
      assetType: "audio",
      fileType: "mp3",
      category: "ambient",
      tags: ["trilha", "ambiente"],
    }),
  ]);

  const volumeAssets = INFANTIL_AGE_GROUPS.flatMap((ageGroup) =>
    INFANTIL_VOLUMES.flatMap((volume) => [
      createVolumeAsset({
        ageGroup,
        volume,
        number: 1,
        title: `Video de abertura ${ageGroup} ${volume}`,
        folder: "videos",
        assetType: "video",
        fileType: "mp4",
        category: "opening",
        tags: ["video", "abertura"],
      }),
      createVolumeAsset({
        ageGroup,
        volume,
        number: 2,
        title: `Audio de instrucao ${ageGroup} ${volume}`,
        folder: "audios",
        assetType: "audio",
        fileType: "mp3",
        category: "instruction",
        tags: ["audio", "instrucao"],
      }),
      createVolumeAsset({
        ageGroup,
        volume,
        number: 3,
        title: `Tela de conclusao ${ageGroup} ${volume}`,
        folder: "images",
        assetType: "image",
        fileType: "webp",
        category: "completion",
        tags: ["conclusao", "feedback"],
      }),
    ])
  );

  const pilotVideoAsset = volumeAssets.find((asset) => asset.code === "RS-EI4-V1-001");
  if (pilotVideoAsset) {
    Object.assign(pilotVideoAsset, {
      title: "A Caixa Misteriosa - video definitivo",
      filePath: `${ASSET_BASE_PATH}/ei4/volume-1/videos/rs-ei4-v1-001-caixa-misteriosa.mp4`,
      provisionalFilePath: "assets/video/RS-020-video-institucional.mp4",
      coverPath: "assets/games/caixa-misteriosa/screens/screen-intro.png",
      assetType: "video",
      fileType: "mp4",
      category: "opening",
      sharedScope: "exclusive",
      duration: 72,
      tags: [COLLECTION, "EI4", "V1", "caixa-misteriosa", "provisorio", "video"],
      status: "review",
      availability: "in-production",
      note: "Arquivo definitivo ainda nao enviado. Usando MP4 institucional como ativo provisorio para homologacao do player.",
    });
  }

  const experienceAssets = [...sharedInfantilAssets, ...sharedAgeAssets, ...volumeAssets];

  const officialBooks = INFANTIL_AGE_GROUPS.flatMap((ageGroup) =>
    INFANTIL_VOLUMES.map((volume) => {
      const age = ageGroup.replace("EI", "");
      const bookId = officialBookId(ageGroup, volume);
      const isExistingBook = ["EI4", "EI5"].includes(ageGroup);
      return {
        bookId,
        id: bookId,
        collectionCode: COLLECTION_CODE,
        collection: COLLECTION,
        segment: SEGMENT,
        ageGroup,
        volume,
        semester: semesterNumberByVolume(volume),
        title: `Educacao Infantil - ${age} anos`,
        subtitle: `Volume ${volumeNumber(volume)} - ${semesterNumberByVolume(volume)}o semestre`,
        catalogTitle: `${age} anos - Volume ${volumeNumber(volume)}`,
        coverAsset: isExistingBook
          ? `assets/biblioteca/RAIZES_INFANTIL${age}_VOL${volumeNumber(volume)}_BIBLIOTECA.jpg`
          : "assets/biblioteca/RAIZES_INFANTIL4_VOL1_BIBLIOTECA.jpg",
        viewerHref: `book-viewer.html?book=${bookId}`,
        libraryHref: `biblioteca.html?book=${bookId}`,
        totalPages: ageGroup === "EI5" ? (volume === "V1" ? 128 : 155) : (volume === "V1" ? 120 : 122),
        teacherBookId: officialTeacherBookId(ageGroup, volume),
        status: isExistingBook ? "available" : "planned",
        units: [
          {
            code: `${ageGroup}-${volume}-U1`,
            title: volume === "V1" ? "Unidade 1 - Sala das Descobertas" : "Unidade 4 - Novas Descobertas",
            description: "Percurso editorial vinculado as primeiras experiencias digitais deste volume.",
            pageStart: 10,
            pageEnd: volume === "V1" ? 40 : 42,
            status: isExistingBook ? "available" : "planned",
          },
        ],
      };
    })
  );

  const experienceDefinitions = INFANTIL_AGE_GROUPS.flatMap((ageGroup) =>
    INFANTIL_VOLUMES.map((volume) => ({
      id: `RS-${ageGroup}-${volume}-EXP-001`,
      title: `Laboratorio de experiencias ${ageGroup} ${volume}`,
      description: "Experiencia em preparacao para receber curadoria editorial, video e atividade vinculada ao livro.",
      ageGroup,
      volume,
      semester: semesterByVolume(volume),
      collection: COLLECTION,
      collectionCode: COLLECTION_CODE,
      segment: SEGMENT,
      code: `RS-${ageGroup}-${volume}-EXP-001`,
      bookId: officialBookId(ageGroup, volume),
      bookTitle: `Educacao Infantil ${ageGroup.replace("EI", "")} anos - ${volume === "V1" ? "Volume 1" : "Volume 2"}`,
      unitCode: `${ageGroup}-${volume}-U1`,
      unitTitle: volume === "V1" ? "Unidade 1" : "Unidade 4",
      unit: volume === "V1" ? "Unidade 1" : "Unidade 4",
      sequenceCode: `${ageGroup}-${volume}-SEQ-001`,
      sequenceTitle: "Primeira experiencia digital do volume",
      pages: [],
      pageStart: null,
      pageEnd: null,
      activityTitle: "Atividade em curadoria",
      activityDescription: "Atividade aguardando vinculo editorial definitivo.",
      studentInstruction: "Aguarde a liberacao desta experiencia pela equipe editorial.",
      pedagogicalObjective: "Aguardar cadastro pedagogico definitivo.",
      objective: "Aguardar cadastro pedagogico definitivo.",
      experienceFields: ["Campo de experiencia em curadoria"],
      fieldOfExperience: "Campo de experiencia em curadoria.",
      bnccCodes: [],
      bnccSkills: [],
      materials: [],
      relatedExperienceCodes: [],
      keywords: [ageGroup, volume, "educacao infantil", "experiencia digital"],
      experienceType: "video-guided-exploration",
      openingAssetCode: `RS-${ageGroup}-${volume}-001`,
      resources: [
        {
          type: "video",
          assetCode: `RS-${ageGroup}-${volume}-001`,
          role: "opening",
        },
      ],
      instructionAudioCode: `RS-${ageGroup}-${volume}-002`,
      instructions: "Ouvir a orientacao, observar a cena e concluir a interacao proposta para o volume.",
      interaction: {
        type: "guided-exploration",
        engine: "raizes-infantil-experience-engine",
        estimatedRounds: 3,
        targetAgeGroup: ageGroup,
      },
      successAssetCode: "RS-EI-C-003",
      retryAssetCode: "RS-EI-C-004",
      completionAssetCode: `RS-${ageGroup}-${volume}-003`,
      reward: {
        xp: 20,
        stars: 3,
      },
      status: "planned",
      editorialStatus: "planned",
      availability: "unavailable",
    }))
  );

  const pilotExperience = experienceDefinitions.find((experience) => experience.id === "RS-EI4-V1-EXP-001");
  if (pilotExperience) {
    Object.assign(pilotExperience, {
      title: "A Caixa Misteriosa",
      description: "Experiencia audiovisual de investigacao sensorial: a crianca observa a proposta, escuta pistas e antecipa o que pode estar dentro da caixa.",
      objective: "Estimular observacao, escuta atenta, formulacao de hipoteses e ampliacao de vocabulario a partir de pistas sensoriais.",
      pedagogicalObjective: "Estimular observacao, escuta atenta, formulacao de hipoteses e ampliacao de vocabulario a partir de pistas sensoriais.",
      fieldOfExperience: "Escuta, fala, pensamento e imaginacao; espacos, tempos, quantidades, relacoes e transformacoes.",
      experienceFields: ["Escuta, fala, pensamento e imaginacao", "Espacos, tempos, quantidades, relacoes e transformacoes"],
      experienceType: "video-guided-exploration",
      bookId: "livro-005",
      bookTitle: "Educacao Infantil 4 anos - Volume 1",
      pages: [18, 19, 20, 21],
      pageStart: 18,
      pageEnd: 21,
      unitCode: "EI4-V1-U1",
      unitTitle: "Unidade 1 - Sala das Descobertas",
      unit: "Unidade 1 - Sala das Descobertas",
      sequenceCode: "EI4-V1-SEQ-001",
      sequenceTitle: "Investigar, levantar hipoteses e registrar descobertas",
      activityTitle: "A Caixa Misteriosa",
      activityDescription: "Atividade do Livro do Aluno em que a crianca observa pistas, antecipa possibilidades e registra descobertas.",
      studentInstruction: "Assista ao video, observe as pistas da caixa e depois volte ao livro para registrar sua descoberta.",
      bnccCodes: ["EI03EF01", "EI03EO04", "EI03ET01"],
      bnccSkills: ["EI03EF01", "EI03EO04", "EI03ET01"],
      materials: ["Livro do Aluno nas paginas 18 a 21", "Caixa com objetos sensoriais", "Cartoes de pistas", "Registro coletivo da descoberta"],
      relatedExperienceCodes: ["RS-EI4-V2-EXP-001", "RS-EI5-V1-EXP-001"],
      keywords: ["caixa misteriosa", "pistas", "sentidos", "hipoteses", "oralidade", "investigacao", "infantil 4", "volume 1"],
      coverAssetCode: "RS-EI4-V1-001",
      openingAssetCode: "RS-EI4-V1-001",
      resources: [
        { type: "video", assetCode: "RS-EI4-V1-001", role: "opening" },
        { type: "interactive", activityCode: "RS-EI4-V1-INT-001", role: "main" },
        { type: "interactive", activityCode: "RS-EI4-V1-INT-002", role: "support" },
        { type: "interactive", activityCode: "RS-EI4-V1-INT-003", role: "support" },
        { type: "interactive", activityCode: "RS-EI4-V1-INT-004", role: "support" },
        { type: "interactive", activityCode: "RS-EI4-V1-INT-005", role: "support" },
        { type: "interactive", activityCode: "RS-EI4-V1-INT-006", role: "support" },
        { type: "interactive", activityCode: "RS-EI4-V1-INT-007", role: "support" },
        { type: "interactive", activityCode: "RS-EI4-V1-INT-008", role: "support" },
        { type: "interactive", activityCode: "RS-EI4-V1-INT-009", role: "support" },
        { type: "interactive", activityCode: "RS-EI4-V1-INT-010", role: "support" },
        { type: "audio", assetCode: "RS-EI4-V1-002", role: "support" },
        { type: "lottie", assetCode: "RS-EI-C-001", role: "reward" },
        { type: "image", assetCode: "RS-EI4-V1-003", role: "completion" },
      ],
      duration: 72,
      availability: "available",
      status: "published",
      editorialStatus: "published",
      sharedAssetCodes: ["RS-EI-C-001", "RS-EI-C-002", "RS-EI-C-003", "RS-EI-C-004", "RS-EI4-C-001"],
      instructions: "Assista ao video, observe as pistas apresentadas e converse sobre o que poderia estar dentro da caixa. Ao final, retome a pagina do livro e registre a descoberta com a turma.",
      interaction: {
        type: "video-player",
        engine: "raizes-infantil-experience-player",
        controls: ["play", "pause", "restart", "mute", "fullscreen", "close"],
        followUp: "Retomar a atividade nas paginas 18 a 21 do Livro do Aluno.",
      },
      reward: {
        xp: 20,
        stars: 3,
      },
      completionRule: {
        type: "interactive_activity_completed",
        activityCode: "RS-EI4-V1-INT-001",
      },
      teacherGuidance: {
        teacherBookId: "guia-professor-004-v1",
        pages: [45, 46],
        mediation: "Conduzir a escuta das hipoteses das criancas antes de revelar pistas.",
        preparation: "Separar uma caixa fechada e objetos com texturas, sons ou cheiros reconheciveis.",
        materials: ["Caixa", "Objetos sensoriais", "Cartoes de pistas", "Livro do Professor"],
        observationPoints: ["Participacao oral", "Escuta dos colegas", "Relacao entre pista e hipotese"],
        assessmentSuggestions: ["Registrar falas espontaneas e comparar as hipoteses antes/depois do video."],
      },
    });
  }

  const interactiveActivityDefinitions = [
    {
      code: "RS-EI4-V1-INT-001",
      experienceCode: "RS-EI4-V1-EXP-001",
      bookId: "livro-005",
      pageStart: 18,
      pageEnd: 21,
      type: "count_and_select",
      title: "AS JOANINHAS QUE VOARAM",
      instruction: "OBSERVE E RESPONDA.",
      narrationText: "HAVIA CINCO JOANINHAS. DUAS JOANINHAS VOARAM. QUANTAS JOANINHAS RESTARAM?",
      openingResource: {
        type: "video",
        assetCode: "RS-EI4-V1-001",
      },
      scene: {
        background: "garden",
        objects: [
          {
            id: "ladybug-1",
            type: "animated_object",
            asset: "css:ladybug",
            x: 16,
            y: 58,
            width: 12,
            height: 12,
            initialState: "visible",
            animation: { type: "stay" },
            accessibilityLabel: "JOANINHA 1",
          },
          {
            id: "ladybug-2",
            type: "animated_object",
            asset: "css:ladybug",
            x: 32,
            y: 44,
            width: 12,
            height: 12,
            initialState: "visible",
            animation: { type: "fly_away", trigger: "start", delay: 280 },
            accessibilityLabel: "JOANINHA 2",
          },
          {
            id: "ladybug-3",
            type: "animated_object",
            asset: "css:ladybug",
            x: 48,
            y: 60,
            width: 12,
            height: 12,
            initialState: "visible",
            animation: { type: "stay" },
            accessibilityLabel: "JOANINHA 3",
          },
          {
            id: "ladybug-4",
            type: "animated_object",
            asset: "css:ladybug",
            x: 64,
            y: 46,
            width: 12,
            height: 12,
            initialState: "visible",
            animation: { type: "fly_away", trigger: "start", delay: 520 },
            accessibilityLabel: "JOANINHA 4",
          },
          {
            id: "ladybug-5",
            type: "animated_object",
            asset: "css:ladybug",
            x: 78,
            y: 58,
            width: 12,
            height: 12,
            initialState: "visible",
            animation: { type: "stay" },
            accessibilityLabel: "JOANINHA 5",
          },
        ],
      },
      question: {
        context: "HAVIA 5 JOANINHAS. 2 JOANINHAS VOARAM.",
        text: "QUANTAS JOANINHAS RESTARAM?",
        options: [2, 3, 5],
        correctAnswer: 3,
      },
      feedback: {
        correct: {
          message: "MUITO BEM!",
          audioAsset: "RS-EI-C-003",
        },
        incorrect: {
          message: "VAMOS OBSERVAR NOVAMENTE?",
          audioAsset: "RS-EI-C-004",
        },
      },
      completionRule: {
        type: "correct_answer",
      },
      maxAttempts: null,
      supportedStates: INTERACTIVE_ACTIVITY_STATES,
      status: "published",
    },
    {
      code: "RS-EI4-V1-INT-002",
      experienceCode: "RS-EI4-V1-EXP-001",
      bookId: "livro-005",
      pageStart: 18,
      pageEnd: 21,
      type: "select_option",
      title: "QUAL NUMERAL MOSTRA A QUANTIDADE?",
      instruction: "OBSERVE E ESCOLHA.",
      question: {
        context: "CONTE AS JOANINHAS QUE FICARAM.",
        text: "QUAL NUMERAL REPRESENTA A QUANTIDADE?",
        options: [1, 3, 4],
        correctAnswer: 3,
        shuffle: false,
      },
      feedback: {
        correct: { message: "MUITO BEM!", audioAsset: "RS-EI-C-003" },
        incorrect: { message: "CONTE COM CALMA E TENTE DE NOVO.", audioAsset: "RS-EI-C-004" },
      },
      completionRule: { type: "correct_answer" },
      status: "published",
    },
    {
      code: "RS-EI4-V1-INT-003",
      experienceCode: "RS-EI4-V1-EXP-001",
      bookId: "livro-005",
      pageStart: 18,
      pageEnd: 21,
      type: "tap_objects",
      title: "TOQUE NAS JOANINHAS",
      instruction: "TOQUE NAS 3 JOANINHAS QUE FICARAM.",
      scene: {
        background: "garden",
        objects: [
          { id: "bug-a", type: "animated_object", asset: "css:ladybug", x: 24, y: 55, width: 12, height: 12, accessibilityLabel: "JOANINHA" },
          { id: "bug-b", type: "animated_object", asset: "css:ladybug", x: 50, y: 46, width: 12, height: 12, accessibilityLabel: "JOANINHA" },
          { id: "bug-c", type: "animated_object", asset: "css:ladybug", x: 74, y: 57, width: 12, height: 12, accessibilityLabel: "JOANINHA" },
          { id: "leaf-a", type: "text", asset: "css:leaf", x: 38, y: 72, width: 12, height: 10, accessibilityLabel: "FOLHA" },
        ],
      },
      selection: {
        requiredCount: 3,
        correctObjectIds: ["bug-a", "bug-b", "bug-c"],
        mode: "multiple",
        autoConfirm: false,
      },
      question: { text: "TOQUE NAS JOANINHAS.", options: ["CONFIRMAR"], correctAnswer: "CONFIRMAR" },
      feedback: {
        correct: { message: "VOCE ENCONTROU AS 3!", audioAsset: "RS-EI-C-003" },
        incorrect: { message: "PROCURE SOMENTE AS JOANINHAS.", audioAsset: "RS-EI-C-004" },
      },
      completionRule: { type: "correct_selection" },
      status: "published",
    },
    {
      code: "RS-EI4-V1-INT-004",
      experienceCode: "RS-EI4-V1-EXP-001",
      bookId: "livro-005",
      pageStart: 18,
      pageEnd: 21,
      type: "drag_and_drop",
      title: "LEVE O NUMERAL A QUANTIDADE",
      instruction: "ESCOLHA O NUMERAL E O LUGAR CERTO.",
      draggables: [
        { id: "num-3", label: "3", accessibilityLabel: "NUMERAL 3" },
        { id: "num-5", label: "5", accessibilityLabel: "NUMERAL 5" },
      ],
      dropTargets: [
        { id: "target-restaram", label: "JOANINHAS QUE FICARAM", accepts: ["num-3"] },
      ],
      feedback: {
        correct: { message: "ENCAIXOU!", audioAsset: "RS-EI-C-003" },
        incorrect: { message: "ESCOLHA O NUMERAL QUE MOSTRA 3.", audioAsset: "RS-EI-C-004" },
      },
      completionRule: { type: "all_items_placed" },
      status: "published",
    },
    {
      code: "RS-EI4-V1-INT-005",
      experienceCode: "RS-EI4-V1-EXP-001",
      bookId: "livro-005",
      pageStart: 18,
      pageEnd: 21,
      type: "match_pairs",
      title: "LIGUE NUMERO E QUANTIDADE",
      instruction: "FORME OS PARES.",
      pairs: [
        { id: "pair-3", left: { id: "n3", label: "3" }, right: { id: "q3", label: "3 JOANINHAS" } },
        { id: "pair-5", left: { id: "n5", label: "5" }, right: { id: "q5", label: "5 JOANINHAS" } },
      ],
      feedback: {
        correct: { message: "PARES CERTOS!", audioAsset: "RS-EI-C-003" },
        incorrect: { message: "OBSERVE O NUMERO E A QUANTIDADE.", audioAsset: "RS-EI-C-004" },
      },
      completionRule: { type: "all_pairs_matched" },
      status: "published",
    },
    {
      code: "RS-EI4-V1-INT-006",
      experienceCode: "RS-EI4-V1-EXP-001",
      bookId: "livro-005",
      pageStart: 18,
      pageEnd: 21,
      type: "sort_sequence",
      title: "ORDEM DA DESCOBERTA",
      instruction: "COLOQUE NA ORDEM.",
      sequence: {
        items: [
          { id: "first", label: "5 JOANINHAS" },
          { id: "second", label: "2 VOARAM" },
          { id: "third", label: "3 FICARAM" },
        ],
        correctOrder: ["first", "second", "third"],
        initialOrder: ["second", "first", "third"],
      },
      feedback: {
        correct: { message: "A ORDEM FICOU CERTA!", audioAsset: "RS-EI-C-003" },
        incorrect: { message: "O QUE ACONTECEU PRIMEIRO?", audioAsset: "RS-EI-C-004" },
      },
      completionRule: { type: "correct_order" },
      status: "published",
    },
    {
      code: "RS-EI4-V1-INT-007",
      experienceCode: "RS-EI4-V1-EXP-001",
      bookId: "livro-005",
      pageStart: 18,
      pageEnd: 21,
      type: "classify",
      title: "SEPARE OS ELEMENTOS",
      instruction: "COLOQUE CADA ITEM NO GRUPO CERTO.",
      categories: [
        { id: "animals", label: "ANIMAIS" },
        { id: "numbers", label: "NUMEROS" },
      ],
      items: [
        { id: "ladybug", label: "JOANINHA", category: "animals" },
        { id: "number-3", label: "3", category: "numbers" },
        { id: "number-5", label: "5", category: "numbers" },
      ],
      feedback: {
        correct: { message: "TUDO NO GRUPO CERTO!", audioAsset: "RS-EI-C-003" },
        incorrect: { message: "ESCOLHA O GRUPO COM ATENCAO.", audioAsset: "RS-EI-C-004" },
      },
      completionRule: { type: "all_items_classified" },
      status: "published",
    },
    {
      code: "RS-EI4-V1-INT-008",
      experienceCode: "RS-EI4-V1-EXP-001",
      bookId: "livro-005",
      pageStart: 18,
      pageEnd: 21,
      type: "complete_word",
      title: "COMPLETE A PALAVRA",
      instruction: "ESCOLHA A LETRA QUE FALTA.",
      word: {
        prompt: "JOANINH_",
        answer: "A",
        choices: ["A", "O", "E"],
      },
      feedback: {
        correct: { message: "VOCE COMPLETOU A PALAVRA!", audioAsset: "RS-EI-C-003" },
        incorrect: { message: "OUCA A PALAVRA E TENTE DE NOVO.", audioAsset: "RS-EI-C-004" },
      },
      completionRule: { type: "word_completed" },
      status: "published",
    },
    {
      code: "RS-EI4-V1-INT-009",
      experienceCode: "RS-EI4-V1-EXP-001",
      bookId: "livro-005",
      pageStart: 18,
      pageEnd: 21,
      type: "trace_path",
      title: "CAMINHO ATE A FOLHA",
      instruction: "TOQUE NOS PONTOS EM ORDEM.",
      path: {
        tolerance: 18,
        points: [
          { id: "p1", label: "1", x: 18, y: 68 },
          { id: "p2", label: "2", x: 42, y: 52 },
          { id: "p3", label: "3", x: 68, y: 60 },
        ],
      },
      feedback: {
        correct: { message: "CAMINHO COMPLETO!", audioAsset: "RS-EI-C-003" },
        incorrect: { message: "SIGA A ORDEM DOS PONTOS.", audioAsset: "RS-EI-C-004" },
      },
      completionRule: { type: "path_completed" },
      status: "published",
    },
    {
      code: "RS-EI4-V1-INT-010",
      experienceCode: "RS-EI4-V1-EXP-001",
      bookId: "livro-005",
      pageStart: 18,
      pageEnd: 21,
      type: "memory_game",
      title: "MEMORIA DAS QUANTIDADES",
      instruction: "ENCONTRE OS PARES.",
      memory: {
        cards: [
          { id: "m3a", pairId: "m3", label: "3" },
          { id: "m3b", pairId: "m3", label: "3 JOANINHAS" },
          { id: "m5a", pairId: "m5", label: "5" },
          { id: "m5b", pairId: "m5", label: "5 JOANINHAS" },
        ],
      },
      feedback: {
        correct: { message: "PAR ENCONTRADO!", audioAsset: "RS-EI-C-003" },
        incorrect: { message: "OBSERVE E TENTE OUTRO PAR.", audioAsset: "RS-EI-C-004" },
      },
      completionRule: { type: "all_pairs_matched" },
      status: "published",
    },
  ];

  const getExperienceAsset = (code) => experienceAssets.find((asset) => asset.code === code);
  const getOfficialBook = (bookId) => officialBooks.find((book) => book.bookId === bookId || book.id === bookId);
  const getAssetsByAgeGroup = (ageGroup) => experienceAssets.filter((asset) => asset.ageGroup === ageGroup);
  const getAssetsByVolume = (ageGroup, volume) =>
    experienceAssets.filter((asset) => asset.ageGroup === ageGroup && asset.volume === volume);
  const getSharedInfantilAssets = () => experienceAssets.filter((asset) => asset.sharedScope === "collection");
  const getExperienceDefinition = (id) => experienceDefinitions.find((experience) => experience.id === id);
  const getExperiencesByBook = (bookId) => experienceDefinitions.filter((experience) => experience.bookId === bookId);
  const getExperiencesByPage = (bookId, page) => {
    const pageNumber = Number(page);
    return getExperiencesByBook(bookId).filter((experience) =>
      Number.isInteger(pageNumber) &&
      Number(experience.pageStart || experience.pages?.[0] || 0) <= pageNumber &&
      Number(experience.pageEnd || experience.pages?.[experience.pages.length - 1] || 0) >= pageNumber
    );
  };
  const getBookUnits = (bookId) => {
    const book = getOfficialBook(bookId);
    const declaredUnits = book?.units || [];
    const unitMap = new Map(declaredUnits.map((unit) => [unit.code, { ...unit, experiences: [] }]));
    getExperiencesByBook(bookId).forEach((experience) => {
      const code = experience.unitCode || "unidade-sem-codigo";
      if (!unitMap.has(code)) {
        unitMap.set(code, {
          code,
          title: experience.unitTitle || experience.unit || "Unidade em curadoria",
          description: "Unidade criada a partir dos vinculos editoriais das experiencias.",
          status: "planned",
          experiences: [],
        });
      }
      unitMap.get(code).experiences.push(experience);
    });
    return [...unitMap.values()];
  };
  const getExperiencesByVolume = (ageGroup, volume) =>
    experienceDefinitions.filter((experience) => experience.ageGroup === ageGroup && experience.volume === volume);
  const getExperiencePublicUrl = (code, baseUrl) => {
    const base = String(baseUrl || (typeof root !== "undefined" && root.RAIZES_EXPERIENCE_PUBLIC_BASE_URL) || DEFAULT_PUBLIC_BASE_URL).replace(/\/+$/, "");
    return `${base}/biblioteca.html?experience=${encodeURIComponent(code)}`;
  };
  const getExperienceQrPayload = (code, baseUrl) => getExperiencePublicUrl(code, baseUrl);
  const getInteractiveActivityDefinition = (code) => interactiveActivityDefinitions.find((activity) => activity.code === code);
  const getInteractiveActivitiesByExperience = (experienceCode) =>
    interactiveActivityDefinitions.filter((activity) => activity.experienceCode === experienceCode);
  const getInteractiveActivitiesByBook = (bookId) =>
    interactiveActivityDefinitions.filter((activity) => activity.bookId === bookId);

  return {
    COLLECTION,
    COLLECTION_CODE,
    SEGMENT,
    INFANTIL_AGE_GROUPS,
    INFANTIL_VOLUMES,
    INTERACTIVE_ACTIVITY_TYPE_REGISTRY,
    EDITORIAL_STATUSES,
    INTERACTIVE_ACTIVITY_TYPES,
    INTERACTIVE_ACTIVITY_STATES,
    EXPERIENCE_STATES,
    DEFAULT_PUBLIC_BASE_URL,
    ASSET_BASE_PATH,
    officialBooks,
    experienceAssets,
    experienceDefinitions,
    interactiveActivityDefinitions,
    getExperienceAsset,
    getOfficialBook,
    getAssetsByAgeGroup,
    getAssetsByVolume,
    getSharedInfantilAssets,
    getExperienceDefinition,
    getExperiencesByBook,
    getExperiencesByPage,
    getBookUnits,
    getExperiencesByVolume,
    getExperiencePublicUrl,
    getExperienceQrPayload,
    getInteractiveActivityDefinition,
    getInteractiveActivitiesByExperience,
    getInteractiveActivitiesByBook,
  };
});
