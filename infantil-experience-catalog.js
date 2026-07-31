(function (root, factory) {
  const catalog = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = catalog;
  }

  root.RaizesInfantilExperiences = catalog;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  const COLLECTION = "RAIZES_E_SABERES";
  const INFANTIL_AGE_GROUPS = ["EI2", "EI3", "EI4", "EI5"];
  const INFANTIL_VOLUMES = ["V1", "V2"];
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

  const experienceDefinitions = INFANTIL_AGE_GROUPS.flatMap((ageGroup) =>
    INFANTIL_VOLUMES.map((volume) => ({
      id: `RS-${ageGroup}-${volume}-EXP-001`,
      title: `Laboratorio de experiencias ${ageGroup} ${volume}`,
      ageGroup,
      volume,
      semester: semesterByVolume(volume),
      collection: COLLECTION,
      openingAssetCode: `RS-${ageGroup}-${volume}-001`,
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
      status: "draft",
    }))
  );

  const pilotExperience = experienceDefinitions.find((experience) => experience.id === "RS-EI4-V1-EXP-001");
  if (pilotExperience) {
    Object.assign(pilotExperience, {
      title: "A Caixa Misteriosa",
      description: "Experiencia audiovisual de investigacao sensorial: a crianca observa a proposta, escuta pistas e antecipa o que pode estar dentro da caixa.",
      objective: "Estimular observacao, escuta atenta, formulacao de hipoteses e ampliacao de vocabulario a partir de pistas sensoriais.",
      fieldOfExperience: "Escuta, fala, pensamento e imaginacao; espacos, tempos, quantidades, relacoes e transformacoes.",
      experienceType: "video-guided-exploration",
      bookId: "livro-005",
      bookTitle: "Educacao Infantil 4 anos - Volume 1",
      pages: [18, 19, 20, 21],
      activityTitle: "Sala das Descobertas",
      coverAssetCode: "RS-EI4-V1-001",
      openingAssetCode: "RS-EI4-V1-001",
      duration: 72,
      availability: "in-production",
      status: "review",
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
    });
  }

  const getExperienceAsset = (code) => experienceAssets.find((asset) => asset.code === code);
  const getAssetsByAgeGroup = (ageGroup) => experienceAssets.filter((asset) => asset.ageGroup === ageGroup);
  const getAssetsByVolume = (ageGroup, volume) =>
    experienceAssets.filter((asset) => asset.ageGroup === ageGroup && asset.volume === volume);
  const getSharedInfantilAssets = () => experienceAssets.filter((asset) => asset.sharedScope === "collection");
  const getExperienceDefinition = (id) => experienceDefinitions.find((experience) => experience.id === id);
  const getExperiencesByVolume = (ageGroup, volume) =>
    experienceDefinitions.filter((experience) => experience.ageGroup === ageGroup && experience.volume === volume);

  return {
    COLLECTION,
    INFANTIL_AGE_GROUPS,
    INFANTIL_VOLUMES,
    EXPERIENCE_STATES,
    ASSET_BASE_PATH,
    experienceAssets,
    experienceDefinitions,
    getExperienceAsset,
    getAssetsByAgeGroup,
    getAssetsByVolume,
    getSharedInfantilAssets,
    getExperienceDefinition,
    getExperiencesByVolume,
  };
});
