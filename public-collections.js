(() => {
  'use strict';
  const root = document.querySelector('[data-public-collections]');
  if (!root) return;
  const form = root.querySelector('[data-public-catalog-filters]');
  const grid = root.querySelector('[data-public-books-grid]');
  const status = root.querySelector('[data-public-catalog-status]');
  const empty = root.querySelector('[data-public-catalog-empty]');
  const dialog = root.querySelector('[data-public-book-dialog]');
  const detail = root.querySelector('[data-public-book-detail]');
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const audienceLabel = value => value === 'teacher' ? 'Professor' : 'Aluno';
  const volumeLabel = value => value ? `Volume ${value}` : 'Volume único';
  let catalog, lastTrigger, activeCollection = '';
  const panel = root.querySelector('[data-public-collection-panel]');
  const selectionStatus = root.querySelector('[data-public-selection-status]');
  const selectionHeading = root.querySelector('#collections-title');
  const scrollTo = element => requestAnimationFrame(() => requestAnimationFrame(() => {
    updateOffset();
    element.focus({preventScroll:true});
    element.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  }));
  const updateSelection = () => root.querySelectorAll('[data-public-explore]').forEach(button => {
    button.setAttribute('aria-expanded', String(button.dataset.publicExplore === activeCollection));
  });
  const header = document.querySelector('[data-header]');
  const updateOffset = () => root.style.setProperty('--public-header-offset', `${(header?.getBoundingClientRect().height || 130) + 44}px`);
  updateOffset();
  if (header && typeof ResizeObserver !== 'undefined') new ResizeObserver(updateOffset).observe(header);
  const collectionFor = book => catalog.collections.find(item => item.id === book.collectionId);
  const gradeLabel = book => collectionFor(book).stage === 'infantil' ? `${book.grade} anos` : `${book.grade}º ano`;
  const gradeKey = book => `${collectionFor(book).stage}:${book.grade}`;
  const meta = book => `${gradeLabel(book)} · ${volumeLabel(book.volume)} · ${audienceLabel(book.audience)}`;
  const cover = book => `<img src="${escape(book.cover.src)}" alt="Capa de ${escape(book.title)}" width="${book.cover.width}" height="${book.cover.height}" loading="lazy" decoding="async" />`;
  const validate = data => {
    if (data.version !== 1 || !Array.isArray(data.collections) || !Array.isArray(data.books)) throw Error('Invalid catalog');
    const collections = new Set(data.collections.map(item => item.id));
    const ids = new Set();
    for (const book of data.books) {
      if (!book.id || ids.has(book.id) || !collections.has(book.collectionId) || !book.title || !book.summary ||
          !['student','teacher'].includes(book.audience) || !Number.isInteger(book.grade) ||
          !/^assets\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(?:webp|png|jpe?g)$/.test(book.cover?.src || '') ||
          !(book.cover.width > 0 && book.cover.height > 0)) throw Error('Invalid book');
      ids.add(book.id);
    }
    return data;
  };
  const option = (value,label) => `<option value="${escape(value)}">${escape(label)}</option>`;
  const populateGrades = () => {
    const field = form.elements.grade, previous = field.value;
    const books = catalog.books.filter(book => !form.elements.collection.value || book.collectionId === form.elements.collection.value);
    const grades = new Map(books.map(book => [gradeKey(book),gradeLabel(book)]));
    field.innerHTML = option('','Todos') + [...grades].sort((a,b) => a[0].localeCompare(b[0], 'pt-BR', {numeric:true})).map(([key,label]) => option(key,label)).join('');
    field.value = grades.has(previous) ? previous : '';
  };
  const render = () => {
    if (!activeCollection) return;
    const f = form.elements;
    const query = normalize(f.search.value).trim();
    const books = catalog.books.filter(book =>
      book.collectionId === activeCollection &&
      (!f.grade.value || gradeKey(book) === f.grade.value) &&
      (!f.volume.value || (book.volume || 'single') === f.volume.value) &&
      (!f.audience.value || book.audience === f.audience.value) &&
      (!query || normalize(`${book.title} ${book.summary} ${collectionFor(book).title} ${meta(book)}`).includes(query)));
    status.textContent = catalog.books.length ? `${books.length} de ${catalog.books.filter(book => book.collectionId === activeCollection).length} livros` : 'As três coleções estão sendo preparadas para apresentação. Conheça as propostas acima ou fale com nossa equipe.';
    empty.hidden = books.length > 0 || !catalog.books.length;
    grid.innerHTML = books.map(book => `<article class="book-card public-book-card"><div class="public-book-cover">${cover(book)}</div><p class="public-book-meta">${escape(collectionFor(book).title)} · ${escape(meta(book))}</p><h4>${escape(book.title)}</h4><p class="public-book-summary">${escape(book.summary)}</p><button class="button secondary" type="button" data-public-book="${escape(book.id)}" aria-label="Ver detalhes de ${escape(book.title)}">Ver detalhes</button></article>`).join('');
  };
  const showBook = (book, trigger) => {
    lastTrigger = trigger;
    detail.innerHTML = `<article class="public-book-detail"><div class="public-book-cover">${cover(book)}</div><div><p class="eyebrow">${escape(collectionFor(book).title)}</p><h3 id="public-book-title">${escape(book.title)}</h3><p>${escape(book.summary)}</p><dl><dt>Ano ou idade</dt><dd>${escape(gradeLabel(book))}</dd><dt>Volume</dt><dd>${escape(volumeLabel(book.volume))}</dd><dt>Público</dt><dd>${audienceLabel(book.audience)}</dd></dl><a class="button primary" href="login.html?next=biblioteca.html">Acessar a plataforma</a><p>Entre para acessar os recursos disponíveis para sua escola e seu perfil.</p></div></article>`;
    dialog.showModal();
  };
  dialog.addEventListener('close', () => lastTrigger?.focus());
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]')].filter(element => !element.disabled && element.getClientRects().length);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first?.focus();
    }
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  const resetFilters = () => {
    for (const name of ['search', 'grade', 'volume', 'audience']) form.elements[name].value = '';
    populateGrades();
    const volumes = [...new Set(catalog.books.filter(book => book.collectionId === activeCollection).map(book => book.volume || 'single'))].sort();
    form.elements.volume.innerHTML = option('', 'Todos') + volumes.map(value => option(value, volumeLabel(value === 'single' ? '' : value))).join('');
  };
  const selectCollection = id => {
    const collection = catalog.collections.find(item => item.id === id);
    if (!collection) return;
    activeCollection = id;
    form.elements.collection.value = id;
    resetFilters();
    root.querySelector('[data-public-active-title]').textContent = collection.title;
    panel.hidden = false;
    selectionStatus.hidden = true;
    updateSelection(); render();
    scrollTo(root.querySelector('#livros-das-colecoes'));
  };
  root.addEventListener('click', event => {
    if (!catalog) return;
    const explore = event.target.closest('[data-public-explore]');
    if (explore) selectCollection(explore.dataset.publicExplore);
    if (event.target.closest('[data-public-back]')) {
      activeCollection = '';
      panel.hidden = true;
      grid.replaceChildren();
      selectionStatus.hidden = false;
      updateSelection();
      scrollTo(selectionHeading);
    }
    const trigger = event.target.closest('[data-public-book]');
    if (trigger) showBook(catalog.books.find(book => book.id === trigger.dataset.publicBook), trigger);
  });
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', event => { if (catalog && event.target.name !== 'collection') render(); });
  form.addEventListener('change', event => {
    if (!catalog) return;
    if (event.target.name === 'collection') selectCollection(event.target.value);
    else render();
  });
  form.addEventListener('reset', event => {
    event.preventDefault();
    if (catalog && activeCollection) { resetFilters(); render(); }
  });
  fetch('assets/colecoes/catalogo-oficial.json', {credentials:'same-origin'})
    .then(response => { if (!response.ok) throw Error('Catalog unavailable'); return response.json(); })
    .then(data => {
      catalog = validate(data);
      form.elements.collection.innerHTML += catalog.collections.map(item => option(item.id,item.title)).join('');
      root.querySelector('[data-public-collection-overview]').innerHTML = catalog.collections.map(item => {
        const sample = catalog.books.find(book => book.collectionId === item.id && book.audience === 'student');
        return `<article class="book-card public-collection-card"><div class="public-collection-preview">${sample ? cover(sample) : `<span>${escape(item.title)}</span>`}</div><p class="eyebrow">${escape(item.range)}</p><h3>${escape(item.title)}</h3><p>${escape(item.description)}</p><button class="button primary" type="button" data-public-explore="${escape(item.id)}" aria-controls="public-collection-books" aria-expanded="false">Explorar coleção</button></article>`;
      }).join('');
      selectionStatus.textContent = 'Selecione uma coleção para explorar seus livros.';
    }).catch(() => { selectionStatus.textContent = 'Não foi possível carregar os livros agora. Recarregue a página ou fale com nossa equipe.'; });
})();
