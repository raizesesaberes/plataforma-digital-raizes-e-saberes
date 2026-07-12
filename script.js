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

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && videoModal && !videoModal.hidden) {
    closeVideoModal();
  }
});

syncHeader();
renderUniversityLive();
window.addEventListener("scroll", syncHeader, { passive: true });
syncLibrary();
