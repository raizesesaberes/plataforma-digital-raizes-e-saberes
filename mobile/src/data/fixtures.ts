import type { ComponentProps } from "react";
import type { Feather } from "@expo/vector-icons";

export type IconName = ComponentProps<typeof Feather>["name"];
export type DemoRole = "crescer" | "fundamental" | "professor";

export type ModuleKey =
  | "home"
  | "discoveries"
  | "activities"
  | "library"
  | "book"
  | "games"
  | "achievements"
  | "agenda"
  | "notifications"
  | "profile"
  | "family"
  | "classes"
  | "attendance"
  | "communication"
  | "diary"
  | "avalia"
  | "tracking";

export type ModuleItem = {
  key: ModuleKey;
  label: string;
  icon: IconName;
  description: string;
};

export type DemoProfile = {
  role: DemoRole;
  title: string;
  subtitle: string;
  userName: string;
  school: string;
  className: string;
  accent: "brand" | "child" | "blue" | "coral";
  homeTitle: string;
  homeIntro: string;
  modules: ModuleItem[];
  bottomTabs: ModuleKey[];
};

const commonModules = {
  agenda: { key: "agenda", label: "Agenda", icon: "calendar", description: "Semana, compromissos, eventos e avaliações." },
  notifications: { key: "notifications", label: "Notificações", icon: "bell", description: "Central de avisos, leituras e pendências." },
  profile: { key: "profile", label: "Perfil", icon: "user", description: "Identidade, escola, turma e preferências." }
} satisfies Record<string, ModuleItem>;

export const demoProfiles: Record<DemoRole, DemoProfile> = {
  crescer: {
    role: "crescer",
    title: "Raízes Crescer",
    subtitle: "Aluno Educação Infantil",
    userName: "Pedro Miguel",
    school: "Escola Municipal Raízes e Saberes",
    className: "Infantil 4 A",
    accent: "child",
    homeTitle: "Olá, Pedro Miguel!",
    homeIntro: "Hoje tem descobertas, leitura e uma missão preparada para você.",
    bottomTabs: ["home", "discoveries", "activities", "games", "profile"],
    modules: [
      { key: "discoveries", label: "Descobertas", icon: "compass", description: "Experiências guiadas para explorar o mundo." },
      { key: "activities", label: "Atividades", icon: "edit-3", description: "Atividades novas, em andamento e concluídas." },
      { key: "library", label: "Biblioteca", icon: "book-open", description: "Estante de histórias para ler e imaginar." },
      { key: "games", label: "Jogos", icon: "grid", description: "Brincadeiras para explorar, organizar e criar." },
      { key: "achievements", label: "Conquistas", icon: "award", description: "Medalhas, descobertas e progresso." },
      commonModules.agenda,
      commonModules.notifications,
      { key: "family", label: "Família", icon: "heart", description: "Resumo para responsáveis acompanharem a rotina." },
      commonModules.profile
    ]
  },
  fundamental: {
    role: "fundamental",
    title: "Ensino Fundamental / Ensino Médio",
    subtitle: "Ambiente do estudante",
    userName: "Pedro Henrique",
    school: "Escola Municipal Raízes e Saberes",
    className: "4º Ano A",
    accent: "blue",
    homeTitle: "Olá, Pedro!",
    homeIntro: "Veja o que precisa de atenção hoje e continue seus estudos com calma.",
    bottomTabs: ["home", "activities", "library", "agenda", "profile"],
    modules: [
      { key: "activities", label: "Atividades", icon: "check-square", description: "Tarefas e propostas pedagógicas." },
      { key: "library", label: "Biblioteca", icon: "book", description: "Livros disponíveis para sua escola." },
      { key: "avalia", label: "Avalia+", icon: "file-text", description: "Avaliações publicadas e resultados." },
      commonModules.agenda,
      commonModules.notifications,
      commonModules.profile
    ]
  },
  professor: {
    role: "professor",
    title: "Professor",
    subtitle: "Rotina docente",
    userName: "Professora Helena",
    school: "Escola Municipal Raízes e Saberes",
    className: "Infantil 4 A",
    accent: "brand",
    homeTitle: "Olá, Professora Helena",
    homeIntro: "Escola Municipal Raízes e Saberes · rotina de hoje",
    bottomTabs: ["home", "classes", "agenda", "tracking", "profile"],
    modules: [
      { key: "classes", label: "Minhas Turmas", icon: "users", description: "Turmas e alunos sob sua responsabilidade." },
      { key: "attendance", label: "Frequência", icon: "clipboard", description: "Registro rápido de presença." },
      { key: "communication", label: "Comunicação", icon: "message-square", description: "Recados para turma e aluno." },
      commonModules.agenda,
      { key: "diary", label: "Diário de Classe", icon: "file-text", description: "Registros pedagógicos da aula." },
      { key: "avalia", label: "Avalia+", icon: "bar-chart-2", description: "Atribuição e resultados." },
      { key: "tracking", label: "Acompanhamento", icon: "activity", description: "Indicadores da turma." },
      commonModules.notifications,
      commonModules.profile
    ]
  }
};

export const demoCollections = {
  books: [
    {
      title: "O Jardim das Letras",
      category: "Histórias",
      description: "Uma caminhada colorida para encontrar letras escondidas.",
      mark: "Aa",
      tone: "leaf"
    },
    {
      title: "A Casa das Formas",
      category: "Descobertas",
      description: "Portas, janelas e telhados viram formas para brincar.",
      mark: "△",
      tone: "sun"
    },
    {
      title: "Histórias da Nossa Escola",
      category: "Nossa turma",
      description: "Pequenas aventuras inspiradas na rotina da turma.",
      mark: "✦",
      tone: "sky"
    },
    {
      title: "Bichinhos do Quintal",
      category: "Natureza",
      description: "Observe pequenos amigos e descubra onde eles vivem.",
      mark: "☘",
      tone: "mint"
    }
  ],
  games: [
    {
      title: "A Caixa Misteriosa",
      action: "Jogar",
      description: "Abra a caixa, observe as pistas e descubra o segredo.",
      mark: "?",
      tag: "Descobrir"
    },
    {
      title: "Organizando a Cesta",
      action: "Jogar",
      description: "Separe frutas, cores e formas em uma brincadeira rápida.",
      mark: "◌",
      tag: "Organizar"
    },
    {
      title: "O Jardim das Descobertas",
      action: "Jogar",
      description: "Passeie pelo jardim e encontre pequenas surpresas.",
      mark: "✿",
      tag: "Explorar"
    },
    {
      title: "O Ateliê da Bia",
      action: "Jogar",
      description: "Misture cores e crie uma cena cheia de imaginação.",
      mark: "✎",
      tag: "Criar"
    }
  ],
  activities: [
    {
      title: "Traços e cores",
      status: "Nova",
      action: "Começar",
      description: "Desenhe caminhos coloridos com calma e imaginação.",
      mark: "✎",
      progress: 0
    },
    {
      title: "Sequência de histórias",
      status: "Em andamento",
      action: "Continuar",
      description: "Organize as cenas e conte o que acontece primeiro.",
      mark: "▣",
      progress: 55
    },
    {
      title: "Contagem no parque",
      status: "Concluída",
      action: "Ver",
      description: "Conte brinquedos, árvores e amigos no parque.",
      mark: "✓",
      progress: 100
    }
  ],
  achievements: {
    level: "Explorador alegre",
    progress: 68,
    celebration: "Você está indo muito bem!",
    medals: [
      {
        title: "Primeira descoberta",
        description: "Você começou sua jornada de exploração.",
        mark: "★",
        earned: true,
        message: "Que começo bonito!"
      },
      {
        title: "Amigo dos livros",
        description: "Você visitou a biblioteca e escolheu histórias.",
        mark: "◆",
        earned: true,
        message: "Histórias também são aventuras."
      },
      {
        title: "Explorador da natureza",
        description: "Uma medalha para quem observa o mundo com carinho.",
        mark: "☘",
        earned: false,
        message: "Continue explorando!"
      },
      {
        title: "Brinquei e aprendi",
        description: "Uma conquista para novas brincadeiras completas.",
        mark: "✿",
        earned: false,
        message: "Logo ela pode aparecer aqui."
      }
    ],
    wins: [
      {
        title: "Primeira descoberta",
        description: "Você abriu uma aventura e começou a observar melhor.",
        mark: "★",
        earned: true,
        message: "Você deu o primeiro passo."
      },
      {
        title: "Amigo dos livros",
        description: "Você encontrou histórias para imaginar e conversar.",
        mark: "◆",
        earned: true,
        message: "Ler deixa a imaginação maior."
      },
      {
        title: "Explorador da natureza",
        description: "Observe sons, cores e bichinhos ao seu redor.",
        mark: "☘",
        earned: false,
        message: "Continue explorando!"
      },
      {
        title: "Brinquei e aprendi",
        description: "Cada jogo ajuda você a descobrir algo novo.",
        mark: "✿",
        earned: false,
        message: "Mais uma brincadeira e você chega lá."
      }
    ]
  },
  agenda: {
    weekDays: [
      { short: "Seg", day: "09", label: "segunda" },
      { short: "Ter", day: "10", label: "terça" },
      { short: "Qua", day: "11", label: "quarta", isToday: true },
      { short: "Qui", day: "12", label: "quinta" },
      { short: "Sex", day: "13", label: "sexta" }
    ],
    today: [
      {
        type: "Atividade",
        title: "Roda de histórias",
        day: "Hoje",
        time: "09:00",
        description: "Vamos ouvir uma história e contar o que descobrimos.",
        action: "Ver"
      },
      {
        type: "Evento",
        title: "Brincar no jardim",
        day: "Hoje",
        time: "15:00",
        description: "Um momento ao ar livre com a turma.",
        action: "Ver"
      }
    ],
    upcoming: [
      {
        type: "Avaliação",
        title: "Avaliação disponível",
        day: "Quinta",
        time: "Até 17:00",
        description: "Uma proposta curta para fazer com calma.",
        action: "Abrir"
      },
      {
        type: "Lembrete",
        title: "Trazer garrafinha",
        day: "Sexta",
        time: "Manhã",
        description: "A turma vai cuidar da hidratação durante as brincadeiras.",
        action: "Ver"
      },
      {
        type: "Avaliação",
        title: "Prazo da avaliação",
        day: "Sexta",
        time: "18:00",
        description: "Último dia para concluir a atividade enviada.",
        action: "Ver"
      }
    ]
  },
  childNotifications: [
    {
      type: "Recado",
      title: "Novo recado da turma",
      summary: "Você recebeu um novo recado.",
      origin: "Professora Helena",
      time: "Hoje",
      unread: true,
      message: "Tem um recado carinhoso esperando por você e sua família.",
      action: "Ver recado"
    },
    {
      type: "Agenda",
      title: "Evento chegando",
      summary: "Tem uma novidade na sua semana.",
      origin: "Agenda da turma",
      time: "Amanhã",
      unread: true,
      message: "A turma tem um momento especial preparado para esta semana.",
      action: "Ver na agenda"
    },
    {
      type: "Avaliação",
      title: "Avaliação disponível",
      summary: "Uma atividade de avaliação já pode ser aberta.",
      origin: "Avalia+",
      time: "Esta semana",
      unread: false,
      message: "Quando for a hora, faça com calma e peça ajuda se precisar.",
      action: "Ver avaliação"
    },
    {
      type: "Atividade",
      title: "Atividade nova",
      summary: "Uma proposta divertida chegou para você.",
      origin: "Atividades",
      time: "Ontem",
      unread: false,
      message: "Você pode escolher um bom momento para brincar e aprender.",
      action: "Ver atividade"
    }
  ],
  childProfile: {
    avatar: "PM",
    name: "Pedro Miguel",
    className: "Infantil 4 A",
    school: "Escola Municipal Raízes e Saberes",
    teacher: "Professora Helena",
    level: "Explorador alegre",
    message: "Este é o seu cantinho no Raízes Crescer.",
    progress: [
      { label: "Atividades concluídas", value: "7", mark: "✓" },
      { label: "Livros explorados", value: "5", mark: "Aa" },
      { label: "Conquistas", value: "4", mark: "★" },
      { label: "Nível", value: "Alegre", mark: "✿" }
    ],
    preferences: [
      { title: "Som", description: "Brincadeiras com sons suaves.", mark: "♪" },
      { title: "Acessibilidade", description: "Textos grandes e leitura confortável.", mark: "Aa" },
      { title: "Notificações", description: "Novidades importantes para acompanhar.", mark: "!" }
    ]
  },
  familyCrescer: {
    children: [
      { name: "Pedro Miguel", className: "Infantil 4 A", school: "Escola Municipal Raízes e Saberes", avatar: "PM", selected: true },
      { name: "Pedro Henrique", className: "4º Ano A", school: "Escola Municipal Raízes e Saberes", avatar: "PH", selected: false }
    ],
    daySummary: "Dia tranquilo, com roda de histórias, jardim e atividade de cores.",
    attendance: [
      { label: "Presença", value: "18", helper: "dias presentes" },
      { label: "Faltas", value: "1", helper: "no período" },
      { label: "Justificadas", value: "1", helper: "registrada" }
    ],
    week: [
      { day: "Seg", title: "Roda de histórias", time: "09:00", note: "Leitura com a turma" },
      { day: "Ter", title: "Atividade de cores", time: "10:30", note: "Traços e pintura" },
      { day: "Qua", title: "Brincar no jardim", time: "15:00", note: "Momento ao ar livre" },
      { day: "Qui", title: "Música e movimento", time: "09:40", note: "Expressão corporal" },
      { day: "Sex", title: "Enviar garrafinha", time: "Manhã", note: "Lembrete da turma" }
    ],
    messages: [
      { title: "Roda de histórias amanhã", origin: "Professora Helena", date: "Hoje", unread: true },
      { title: "Lembrete da garrafinha", origin: "Secretaria escolar", date: "Ontem", unread: false }
    ],
    agenda: [
      { type: "Evento", title: "Dia de brincar no jardim", date: "Quarta", time: "15:00" },
      { type: "Lembrete", title: "Trazer garrafinha", date: "Sexta", time: "Manhã" }
    ],
    notifications: [
      { type: "Recado", title: "Novo recado da turma", unread: true },
      { type: "Agenda", title: "Evento chegando", unread: true },
      { type: "Atividade", title: "Atividade nova", unread: false }
    ]
  },
  fundamental: {
    today: [
      { type: "Atividade", title: "Leitura orientada", meta: "Língua Portuguesa · hoje", mark: "✓" },
      { type: "Avaliação", title: "Avalia+ de Matemática", meta: "Prazo: sexta-feira", mark: "A+" },
      { type: "Agenda", title: "Entrega do diário de leitura", meta: "Amanhã · 10:00", mark: "◷" },
      { type: "Recado", title: "Novo aviso da escola", meta: "1 mensagem não vista", mark: "!" }
    ],
    continue: {
      title: "Continue de onde parou",
      item: "Livro: Caminhos da Água",
      description: "Você parou no capítulo 3. Retome a leitura quando estiver pronto.",
      progress: 62,
      action: "Continuar leitura"
    },
    avalia: {
      title: "Avaliação disponível",
      subject: "Matemática",
      deadline: "Entrega até sexta-feira",
      action: "Ver avaliação"
    },
    assessments: [
      {
        title: "Avalia+ de Matemática",
        subject: "Matemática",
        questions: 5,
        deadline: "Entrega até sexta-feira",
        state: "Disponível",
        action: "Começar",
        answered: 0,
        score: null,
        statement: "Observe a situação e escolha a alternativa que representa a fração indicada.",
        options: ["1/2", "1/3", "2/5", "3/4"],
        skills: ["EF04MA09", "EF04MA10"]
      },
      {
        title: "Leitura e interpretação",
        subject: "Língua Portuguesa",
        questions: 4,
        deadline: "Hoje",
        state: "Em andamento",
        action: "Continuar",
        answered: 3,
        score: null,
        statement: "Leia o trecho indicado e marque a ideia principal apresentada no texto.",
        options: ["Personagem principal", "Ideia central", "Local da história", "Título do texto"],
        skills: ["EF04LP03", "EF04LP15"]
      },
      {
        title: "Ciências: ciclo da água",
        subject: "Ciências",
        questions: 5,
        deadline: "Concluída ontem",
        state: "Concluída",
        action: "Ver resultado",
        answered: 5,
        score: 80,
        statement: "Acompanhe o caminho da água na natureza e identifique as etapas do ciclo.",
        options: ["Evaporação", "Multiplicação", "Narração", "Pontuação"],
        skills: ["EF04CI02", "EF04CI03"]
      }
    ],
    agenda: {
      weekDays: [
        { short: "Seg", day: "09", summary: "Leitura" },
        { short: "Ter", day: "10", summary: "Atividade" },
        { short: "Qua", day: "11", summary: "Hoje", isToday: true },
        { short: "Qui", day: "12", summary: "Avalia+" },
        { short: "Sex", day: "13", summary: "Evento" }
      ],
      filters: ["Tudo", "Atividades", "Avaliações", "Eventos"],
      items: [
        {
          type: "Atividade",
          title: "Interpretar texto",
          subject: "Língua Portuguesa",
          date: "Hoje",
          time: "09:30",
          due: "Entrega hoje",
          description: "Leia o trecho indicado e organize as ideias principais antes de responder.",
          action: "Ver atividade",
          actionTarget: "activities",
          isToday: true,
          priority: true,
          mark: "✓"
        },
        {
          type: "Avaliação",
          title: "Avaliação disponível",
          subject: "Matemática",
          date: "Hoje",
          time: "14:00",
          due: "Prazo até sexta-feira",
          description: "Avalia+ de Matemática disponível para iniciar quando estiver preparado.",
          action: "Ver avaliação",
          actionTarget: "avalia",
          isToday: true,
          priority: true,
          mark: "A+"
        },
        {
          type: "Lembrete",
          title: "Diário de leitura",
          subject: "Biblioteca",
          date: "Amanhã",
          time: "10:00",
          due: "Registro semanal",
          description: "Separe alguns minutos para atualizar o registro da leitura em andamento.",
          action: "Ver detalhes",
          actionTarget: "detail",
          isToday: false,
          priority: false,
          mark: "!"
        },
        {
          type: "Evento",
          title: "Feira de ciências da turma",
          subject: "Ciências",
          date: "Sexta-feira",
          time: "15:30",
          due: "Evento escolar",
          description: "Apresentação dos trabalhos da turma com experiências e observações.",
          action: "Ver detalhes",
          actionTarget: "detail",
          isToday: false,
          priority: false,
          mark: "◷"
        }
      ]
    },
    library: {
      title: "Da sua biblioteca",
      item: "Caminhos da Água",
      description: "Leitura em andamento para esta semana.",
      action: "Abrir biblioteca"
    },
    bookCategories: ["Literatura", "Ciências", "História", "Cultura"],
    books: [
      {
        title: "Caminhos da Água",
        category: "Ciências",
        description: "Uma leitura sobre rios, chuva e consumo consciente.",
        progress: 62,
        page: "18 de 30",
        cover: "CA",
        tone: "blue",
        sample:
          "A água passa por rios, nuvens e casas. Observar esse caminho ajuda a cuidar melhor do planeta e das pessoas ao nosso redor."
      },
      {
        title: "Contos do Brasil",
        category: "Literatura",
        description: "Narrativas curtas para ampliar repertório de leitura.",
        progress: 20,
        page: "6 de 28",
        cover: "CB",
        tone: "green",
        sample:
          "Cada conto guarda um jeito de falar, lembrar e imaginar. Ler histórias também é conhecer diferentes formas de viver."
      },
      {
        title: "Pequenas Histórias da Cidade",
        category: "História",
        description: "Mudanças nos bairros e memórias de moradores.",
        progress: 0,
        page: "1 de 24",
        cover: "HC",
        tone: "gold",
        sample:
          "As ruas contam histórias. Algumas aparecem em fotografias antigas; outras vivem nas conversas de quem conhece bem o bairro."
      },
      {
        title: "Arte e Cultura Popular",
        category: "Cultura",
        description: "Cores, festas e expressões culturais brasileiras.",
        progress: 0,
        page: "1 de 22",
        cover: "AC",
        tone: "coral",
        sample:
          "A cultura aparece nas músicas, nos desenhos, nas festas e nos objetos feitos por muitas mãos ao longo do tempo."
      }
    ],
    progress: [
      { label: "Atividades concluídas", value: "8/12" },
      { label: "Leitura da semana", value: "62%" },
      { label: "Avalia+", value: "1 aberta" }
    ],
    priorityActivities: [
      {
        title: "Interpretar texto",
        subject: "Língua Portuguesa",
        state: "Em andamento",
        due: "Hoje",
        progress: 60,
        orientation: "Leia o texto com atenção e responda às perguntas principais.",
        action: "Continuar"
      },
      {
        title: "Problemas com frações",
        subject: "Matemática",
        state: "Nova",
        due: "Sexta",
        progress: 0,
        orientation: "Resolva as situações usando desenhos e contas simples.",
        action: "Começar"
      },
      {
        title: "Mapa do bairro",
        subject: "Geografia",
        state: "Prazo próximo",
        due: "Amanhã",
        progress: 25,
        orientation: "Observe os pontos de referência e organize o caminho pedido.",
        action: "Continuar"
      },
      {
        title: "Diário de leitura",
        subject: "Língua Portuguesa",
        state: "Concluída",
        due: "Ontem",
        progress: 100,
        orientation: "Registro entregue para acompanhamento da professora.",
        action: "Ver atividade"
      }
    ],
    quickActions: [
      { key: "activities", label: "Atividades", description: "Ver propostas e entregas.", mark: "✓" },
      { key: "library", label: "Biblioteca", description: "Continuar leituras.", mark: "B" },
      { key: "avalia", label: "Avalia+", description: "Avaliações disponíveis.", mark: "A+" },
      { key: "agenda", label: "Agenda", description: "Compromissos da semana.", mark: "◷" }
    ],
    notifications: {
      unread: 2,
      title: "Notificações",
      description: "Há avisos recentes para acompanhar."
    },
    notificationFilters: ["Tudo", "Recados", "Agenda", "Avalia+"],
    notificationItems: [
      {
        type: "Recado",
        title: "Novo aviso da escola",
        summary: "Há um novo recado importante para acompanhar.",
        origin: "Secretaria escolar",
        time: "Hoje · 08:20",
        unread: true,
        message: "A escola enviou um comunicado geral para orientar a rotina desta semana.",
        action: "Ver recado",
        actionTarget: "detail",
        mark: "!"
      },
      {
        type: "Agenda",
        title: "Compromisso atualizado",
        summary: "Um item da sua agenda foi atualizado.",
        origin: "Agenda da turma",
        time: "Hoje · 09:10",
        unread: true,
        message: "Confira os compromissos de hoje e os próximos prazos da semana.",
        action: "Ver na agenda",
        actionTarget: "agenda",
        mark: "◷"
      },
      {
        type: "Avalia+",
        title: "Avaliação disponível",
        summary: "Há uma nova avaliação disponível para iniciar.",
        origin: "Avalia+",
        time: "Ontem",
        unread: false,
        message: "A avaliação de Matemática está disponível. Faça com calma quando estiver preparado.",
        action: "Ver avaliação",
        actionTarget: "avalia",
        mark: "A+"
      },
      {
        type: "Atividade",
        title: "Atividade para continuar",
        summary: "Uma atividade em andamento espera por você.",
        origin: "Atividades",
        time: "Esta semana",
        unread: false,
        message: "Continue a atividade de leitura para avançar no planejamento da semana.",
        action: "Ver atividade",
        actionTarget: "activities",
        mark: "✓"
      }
    ],
    profile: {
      avatar: "PH",
      name: "Pedro Henrique",
      className: "4º Ano A",
      school: "Escola Municipal Raízes e Saberes",
      teacher: "Professora Helena",
      institutionLabel: "Aluno do Ensino Fundamental",
      message: "Veja suas informações e acompanhe seu progresso.",
      progress: [
        { label: "Atividades concluídas", value: "8", helper: "de 12 propostas", mark: "✓" },
        { label: "Livros em leitura", value: "2", helper: "1 em andamento", mark: "B" },
        { label: "Avaliações concluídas", value: "3", helper: "1 disponível", mark: "A+" },
        { label: "Presença", value: "94%", helper: "no período", mark: "◷" }
      ],
      studies: [
        { title: "Atividades", description: "Continue propostas e entregas.", target: "activities", mark: "✓" },
        { title: "Biblioteca", description: "Retome suas leituras.", target: "library", mark: "B" },
        { title: "Avalia+", description: "Veja avaliações e resultados.", target: "avalia", mark: "A+" }
      ],
      settings: [
        { title: "Notificações", description: "Avisos e novidades do app.", target: "notifications", mark: "!" },
        { title: "Acessibilidade", description: "Texto, contraste e apoio de áudio.", target: "accessibility", mark: "Aa" },
        { title: "Som", description: "Preferência visual para alertas sonoros.", target: "sound", mark: "♪" }
      ],
      accessibility: [
        { title: "Texto confortável", description: "Opção visual para leitura com fonte maior.", mark: "Aa" },
        { title: "Contraste", description: "Preferência visual para destacar textos e botões.", mark: "◐" },
        { title: "Áudio de apoio", description: "Preparado para recursos de leitura guiada.", mark: "♪" }
      ]
    }
  },
  teacher: {
    today: [
      { type: "Chamada", title: "Infantil 4 A", meta: "08:00 · 22 alunos", mark: "✓", target: "attendance" },
      { type: "Aula", title: "Roda de histórias", meta: "Registrar no diário", mark: "D", target: "diary" },
      { type: "Recado", title: "Famílias com mensagem nova", meta: "2 leituras pendentes", mark: "!", target: "communication" },
      { type: "Avalia+", title: "Resultados para revisar", meta: "Infantil 5 A", mark: "A+", target: "avalia" }
    ],
    nextClass: {
      className: "Infantil 4 A",
      time: "08:00",
      students: "22 alunos",
      subject: "Roda de histórias e coordenação",
      room: "Sala Jardim",
      action: "Abrir turma"
    },
    quickActions: [
      { label: "Fazer chamada", description: "Registrar presença da turma.", mark: "✓", target: "attendance" },
      { label: "Enviar recado", description: "Comunicar turma ou estudante.", mark: "✉", target: "communication" },
      { label: "Registrar aula", description: "Atualizar o Diário de Classe.", mark: "D", target: "diary" },
      { label: "Abrir Avalia+", description: "Ver avaliações e resultados.", mark: "A+", target: "avalia" }
    ],
    classes: [
      {
        className: "Infantil 2 A",
        stage: "Educação Infantil",
        schedule: "Segunda · 07:30",
        students: "18 alunos",
        studentCount: 18,
        routine: "Acolhida, música e exploração sensorial",
        nextCommitment: "Roda de música",
        status: "Rotina preparada",
        room: "Sala Girassol",
        studentsList: [
          { name: "Ana Clara", state: "Presença regular" },
          { name: "Benício Lima", state: "Acompanhar adaptação" },
          { name: "Lívia Santos", state: "Participativa" }
        ]
      },
      {
        className: "Infantil 3 A",
        stage: "Educação Infantil",
        schedule: "Terça · 09:10",
        students: "19 alunos",
        studentCount: 19,
        routine: "Histórias, movimento e coordenação",
        nextCommitment: "Circuito motor",
        status: "Recado enviado",
        room: "Sala Ipê",
        studentsList: [
          { name: "Davi Rocha", state: "Ativo na rotina" },
          { name: "Helena Martins", state: "Recado lido" },
          { name: "Miguel Alves", state: "Acompanhar atividade" }
        ]
      },
      {
        className: "Infantil 4 A",
        stage: "Educação Infantil",
        schedule: "Hoje · 08:00",
        students: "22 alunos",
        studentCount: 22,
        routine: "Roda de histórias e coordenação",
        nextCommitment: "Chamada e registro do diário",
        status: "Chamada aberta",
        room: "Sala Jardim",
        studentsList: [
          { name: "Pedro Miguel", state: "Presença prevista" },
          { name: "Laura Beatriz", state: "Atividade em andamento" },
          { name: "João Pedro", state: "Recado pendente" }
        ]
      },
      {
        className: "Infantil 5 A",
        stage: "Educação Infantil",
        schedule: "Hoje · 13:30",
        students: "20 alunos",
        studentCount: 20,
        routine: "Ateliê de cores e leitura compartilhada",
        nextCommitment: "Planejamento da semana",
        status: "Planejamento pronto",
        room: "Sala Araucária",
        studentsList: [
          { name: "Manuela Costa", state: "Participativa" },
          { name: "Rafael Souza", state: "Avalia+ publicado" },
          { name: "Sofia Ribeiro", state: "Registro atualizado" }
        ]
      },
      {
        className: "5º Ano A",
        stage: "Ensino Fundamental",
        schedule: "Quarta · 10:20",
        students: "27 alunos",
        studentCount: 27,
        routine: "Leitura, resolução de problemas e Avalia+",
        nextCommitment: "Avaliação diagnóstica",
        status: "Avalia+ publicado",
        room: "Sala 5",
        studentsList: [
          { name: "Pedro Henrique", state: "Avaliação disponível" },
          { name: "Marina Lopes", state: "Leitura em andamento" },
          { name: "Caio Fernandes", state: "Acompanhar frequência" }
        ]
      }
    ],
    agenda: [
      {
        id: "teacher-agenda-1",
        title: "Roda de histórias",
        type: "Aula",
        day: "Hoje",
        date: "13 de setembro",
        time: "08:00",
        className: "Infantil 4 A",
        description: "Acolhida, leitura compartilhada e registro rápido no Diário de Classe.",
        action: "Registrar aula",
        actionTarget: "diary",
        status: "Preparada",
        mark: "A"
      },
      {
        id: "teacher-agenda-2",
        title: "Ateliê de cores",
        type: "Atividade",
        day: "Hoje",
        date: "13 de setembro",
        time: "13:30",
        className: "Infantil 5 A",
        description: "Organizar materiais para a proposta de cores e formas da tarde.",
        action: "Ver turma",
        actionTarget: "classes",
        status: "Confirmada",
        mark: "✓"
      },
      {
        id: "teacher-agenda-3",
        title: "Avalia+ diagnóstica",
        type: "Avaliação",
        day: "Ter",
        date: "15 de setembro",
        time: "10:20",
        className: "5º Ano A",
        description: "Acompanhar a avaliação diagnóstica publicada para a turma.",
        action: "Abrir Avalia+",
        actionTarget: "avalia",
        status: "Publicada",
        mark: "A+"
      },
      {
        id: "teacher-agenda-4",
        title: "Reunião pedagógica",
        type: "Evento",
        day: "Qui",
        date: "17 de setembro",
        time: "11:30",
        className: "Coordenação",
        description: "Alinhamento semanal sobre rotina, registros e próximos eventos.",
        action: "Ver detalhes",
        actionTarget: "detail",
        status: "Escola",
        mark: "E"
      },
      {
        id: "teacher-agenda-5",
        title: "Separar materiais do jardim",
        type: "Lembrete",
        day: "Sex",
        date: "18 de setembro",
        time: "14:40",
        className: "Infantil 4 A",
        description: "Separar livros, folhas e materiais para a exploração no jardim.",
        action: "Ver detalhes",
        actionTarget: "detail",
        status: "Lembrete",
        mark: "!"
      }
    ],
    communication: [
      {
        title: "Roda de histórias amanhã",
        audience: "Infantil 4 A",
        type: "Turma",
        date: "Hoje · 09:20",
        summary: "Lembrete sobre a roda de histórias e o livro que será usado.",
        message: "Amanhã teremos roda de histórias. Envie o livro combinado na mochila, se estiver disponível.",
        status: "Publicado"
      },
      {
        title: "Atividade de leitura",
        audience: "Pedro Miguel",
        type: "Aluno",
        date: "Ontem · 16:10",
        summary: "Acompanhamento individual sobre a atividade de leitura.",
        message: "Pedro participou bem da leitura guiada. Vamos continuar observando o ritmo nas próximas propostas.",
        status: "Publicado"
      },
      {
        title: "Combinado da tarde",
        audience: "Infantil 5 A",
        type: "Turma",
        date: "12 de setembro",
        summary: "Aviso retirado depois da atualização da agenda.",
        message: "O combinado da tarde foi atualizado na agenda da turma.",
        status: "Retirado"
      }
    ],
    avalia: {
      title: "Avalia+",
      summary: "2 avaliações em andamento",
      detail: "Resultados recentes disponíveis para Infantil 5 A.",
      action: "Abrir Avalia+"
    },
    tracking: [
      { label: "Frequência média", value: "94%", helper: "últimos 30 dias" },
      { label: "Participação", value: "87%", helper: "atividades recentes" },
      { label: "Diário", value: "3", helper: "registros na semana" }
    ],
    notifications: {
      unread: 3,
      title: "Notificações",
      description: "Avisos pedagógicos e recados para acompanhar."
    },
    modules: {
      classes: [
        { title: "Infantil 4 A", subtitle: "22 alunos · chamada aberta", badge: "Hoje" },
        { title: "Infantil 5 A", subtitle: "20 alunos · planejamento pronto", badge: "13:30" },
        { title: "1º Ano A", subtitle: "24 alunos · próxima aula amanhã", badge: "Amanhã" }
      ],
      attendance: [
        { title: "Chamada de hoje", subtitle: "Infantil 4 A · 08:00", badge: "Aberta" },
        { title: "Pendências de justificativa", subtitle: "2 registros para revisar", badge: "Atenção" },
        { title: "Histórico da semana", subtitle: "Resumo das presenças recentes", badge: "Ver" }
      ],
      communication: [
        { title: "Mensagem para turma", subtitle: "Enviar recado para Infantil 4 A", badge: "Novo" },
        { title: "Mensagem individual", subtitle: "Comunicação com família específica", badge: "Seguro" },
        { title: "Recados recentes", subtitle: "Leituras e respostas acompanhadas", badge: "2" }
      ],
      agenda: [
        { title: "Roda de histórias", subtitle: "Hoje · 08:00 · Infantil 4 A", badge: "Hoje" },
        { title: "Reunião pedagógica", subtitle: "Hoje · 11:30", badge: "Escola" },
        { title: "Ateliê de cores", subtitle: "Hoje · 13:30 · Infantil 5 A", badge: "Turma" }
      ],
      diary: {
        current: {
          date: "13 de setembro",
          content: "Roda de histórias, leitura compartilhada e números até 20.",
          record: "A turma participou bem da roda de conversa e precisou de apoio na organização dos materiais.",
          planned: "Roda de histórias e coordenação motora fina",
          attendance: { present: 21, absent: 1, justified: 0 },
          activities: ["Leitura compartilhada", "Atividade de Matemática", "Exploração no jardim", "Coordenação motora"]
        },
        recent: [
          {
            id: "diario-1",
            date: "12 de setembro",
            className: "Infantil 4 A",
            title: "Ateliê de cores",
            summary: "Exploração de cores primárias com registros coletivos e conversa final.",
            state: "Concluído"
          },
          {
            id: "diario-2",
            date: "11 de setembro",
            className: "Infantil 5 A",
            title: "Planejamento da semana",
            summary: "Organização dos materiais para leitura, matemática e brincadeiras de movimento.",
            state: "Rascunho"
          },
          {
            id: "diario-3",
            date: "10 de setembro",
            className: "1º Ano A",
            title: "Leitura orientada",
            summary: "Leitura em pequenos grupos e retomada das hipóteses de escrita.",
            state: "Concluído"
          }
        ]
      },
      avalia: {
        assessments: [
          {
            id: "avalia-prof-1",
            title: "Leitura e interpretação",
            subject: "Língua Portuguesa",
            questions: 5,
            className: "",
            state: "Disponível",
            action: "Aplicar avaliação",
            description: "Avaliação curta para observar leitura, escuta e compreensão de pequenos textos.",
            skills: [
              { code: "EF15LP03", percent: "75%" },
              { code: "EF15LP04", percent: "68%" }
            ],
            availableFrom: "13 de setembro",
            dueDate: "20 de setembro",
            assigned: 0,
            completed: 0,
            average: "",
            attention: "Questões de inferência",
            success: "Identificação de personagens",
            students: []
          },
          {
            id: "avalia-prof-2",
            title: "Números e problemas",
            subject: "Matemática",
            questions: 8,
            className: "Infantil 5 A",
            state: "Em andamento",
            action: "Ver resultados",
            description: "Atividade avaliativa para acompanhar contagem, comparação e resolução de situações simples.",
            skills: [
              { code: "EF01MA02", percent: "72%" },
              { code: "EF01MA06", percent: "61%" }
            ],
            availableFrom: "10 de setembro",
            dueDate: "18 de setembro",
            assigned: 20,
            completed: 15,
            average: "74%",
            attention: "Problemas com duas etapas",
            success: "Contagem e comparação",
            students: [
              { name: "Pedro Miguel", state: "Concluída", score: "80%", correct: 6, wrong: 2 },
              { name: "Marina Lopes", state: "Concluída", score: "75%", correct: 6, wrong: 2 },
              { name: "Caio Fernandes", state: "Não concluída", score: "0%", correct: 0, wrong: 0 }
            ]
          },
          {
            id: "avalia-prof-3",
            title: "Ciências no jardim",
            subject: "Ciências",
            questions: 6,
            className: "Infantil 4 A",
            state: "Encerrada",
            action: "Ver resultados",
            description: "Registro avaliativo sobre observação da natureza e cuidado com o espaço coletivo.",
            skills: [
              { code: "EF02CI04", percent: "82%" },
              { code: "EF02CI05", percent: "77%" }
            ],
            availableFrom: "1 de setembro",
            dueDate: "8 de setembro",
            assigned: 22,
            completed: 18,
            average: "79%",
            attention: "Registro de hipóteses",
            success: "Observação de características",
            students: [
              { name: "Pedro Miguel", state: "Concluída", score: "83%", correct: 5, wrong: 1 },
              { name: "Laura Beatriz", state: "Concluída", score: "67%", correct: 4, wrong: 2 },
              { name: "João Pedro", state: "Concluída", score: "83%", correct: 5, wrong: 1 }
            ]
          },
          {
            id: "avalia-prof-4",
            title: "Sons e palavras",
            subject: "Linguagem",
            questions: 4,
            className: "Infantil 4 A",
            state: "Aplicada",
            action: "Acompanhar",
            description: "Proposta breve para observar escuta, associação de sons e ampliação de vocabulário.",
            skills: [
              { code: "EF15LP10", percent: "70%" },
              { code: "EF15LP11", percent: "65%" }
            ],
            availableFrom: "13 de setembro",
            dueDate: "17 de setembro",
            assigned: 22,
            completed: 6,
            average: "71%",
            attention: "Associação entre som e imagem",
            success: "Escuta atenta",
            students: [
              { name: "Pedro Miguel", state: "Concluída", score: "75%", correct: 3, wrong: 1 },
              { name: "Laura Beatriz", state: "Não concluída", score: "0%", correct: 0, wrong: 0 },
              { name: "João Pedro", state: "Concluída", score: "75%", correct: 3, wrong: 1 }
            ]
          }
        ]
      },
      tracking: [
        { title: "Frequência", subtitle: "94% nos últimos 30 dias", badge: "Estável" },
        { title: "Avalia+", subtitle: "87% de participação recente", badge: "Acompanhar" },
        { title: "Diário de Classe", subtitle: "3 registros na semana", badge: "Atual" }
      ],
      notifications: [
        {
          id: "teacher-notification-message",
          type: "Comunicação",
          mark: "✉",
          title: "Novo recado",
          summary: "Recado publicado para Infantil 4 A.",
          context: "Infantil 4 A",
          date: "Hoje · 09:20",
          message: "Há um novo recado de turma para acompanhar na área de Comunicação.",
          action: "Ver recado",
          actionTarget: "communication",
          unread: true
        },
        {
          id: "teacher-notification-agenda",
          type: "Agenda",
          mark: "○",
          title: "Compromisso da agenda",
          summary: "Roda de histórias confirmada para a manhã.",
          context: "Infantil 4 A",
          date: "Hoje · 08:00",
          message: "A agenda da turma tem um compromisso ativo para organizar a rotina do dia.",
          action: "Ver na agenda",
          actionTarget: "agenda",
          unread: true
        },
        {
          id: "teacher-notification-avalia",
          type: "Avalia+",
          mark: "A+",
          title: "Avaliação concluída",
          summary: "Resultados recentes disponíveis para Infantil 5 A.",
          context: "Infantil 5 A",
          date: "Hoje · 10:20",
          message: "A avaliação diagnóstica já tem participação para acompanhar com calma.",
          action: "Ver avaliação",
          actionTarget: "avalia",
          unread: true
        },
        {
          id: "teacher-notification-attendance",
          type: "Alertas",
          mark: "!",
          title: "Alerta de frequência",
          summary: "A frequência desta turma merece acompanhamento.",
          context: "Infantil 4 A",
          date: "Ontem · 16:30",
          message: "Observe os próximos registros de presença antes de qualquer encaminhamento pedagógico.",
          action: "Ver frequência",
          actionTarget: "attendance",
          unread: false
        },
        {
          id: "teacher-notification-diary",
          type: "Alertas",
          mark: "D",
          title: "Registro de Diário pendente",
          summary: "Ainda não há registro de Diário para hoje.",
          context: "Infantil 4 A",
          date: "Hoje · 11:10",
          message: "Você pode registrar a aula de hoje com um resumo objetivo da rotina da turma.",
          action: "Abrir Diário",
          actionTarget: "diary",
          unread: false
        }
      ],
      profile: [
        { title: "Professora Helena", subtitle: "Infantil 4 A · Infantil 5 A · 1º Ano A", badge: "Docente" },
        { title: "Escola", subtitle: "Escola Municipal Raízes e Saberes", badge: "Ativa" },
        { title: "Preferências", subtitle: "Notificações e acessibilidade", badge: "Ajustar" }
      ]
    }
  },
  notifications: [
    { title: "Recado da turma", category: "Comunicado", unread: true },
    { title: "Evento na agenda", category: "Agenda", unread: true },
    { title: "Avaliação publicada", category: "Avalia+", unread: false }
  ],
  week: ["Roda de conversa", "Biblioteca", "Atividade de coordenação", "Experiência guiada"]
};
