(() => {
  const Color = window.ColorAtlasColor;
  const Data = window.ColorAtlasData;
  const Config = window.ColorAtlasConfig;
  const Generator = window.ColorAtlasGenerator;
  const Extract = window.ColorAtlasExtract;
  const $ = id => document.getElementById(id);
  const t = (key, params) => window.ColorAtlasI18n.t(key, params);
  const paletteName = item => t(`palette.${item.id}.title`);
  const paletteDescription = item => t(`palette.${item.id}.description`);
  const translateLocale = (locale, key) => window.ColorAtlasI18n.translate(locale, key);
  const gallerySearchText = item => [
    item.id,
    item.category,
    ...item.tags,
    ...window.ColorAtlasI18n.supported.flatMap(locale => [
      translateLocale(locale, `palette.${item.id}.title`),
      translateLocale(locale, `palette.${item.id}.description`),
      ...item.tags.map(tag => translateLocale(locale, `tag.${tag}`))
    ])
  ].join(' ').toLocaleLowerCase();
  const state = { seeds: [...Config.defaultColors], generated: [], extracted: [], filter: 'all', variation: 0, preview: null, previewMode: 'ui', imageMeta: null, toastTimer: null };
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const escape = str => String(str).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const showToast = text => {
    const el = $('toast');
    el.textContent = text;
    el.classList.add('visible');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => el.classList.remove('visible'), Config.feedback.toastDuration);
  };
  const setStatus = text => { $('inputStatus').textContent = text; };
  const copyText = async (value, success = t('app.copySuccess')) => {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(value);
      else {
        const field = document.createElement('textarea');
        field.value = value;
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        const ok = document.execCommand('copy');
        field.remove();
        if (!ok) throw new Error('copy failed');
      }
      showToast(success);
    } catch { showToast(t('app.copyError')); }
  };
  const addSeed = (hex, silent = false) => {
    const normalized = Color.normalizeHex(hex);
    if (!normalized) { setStatus(t('app.invalidHex')); return false; }
    if (state.seeds.includes(normalized)) { if (!silent) setStatus(t('app.duplicate', { hex: normalized })); return false; }
    state.seeds.push(normalized);
    state.variation = 0;
    renderSeeds();
    regenerate();
    if (!silent) setStatus(t('app.added', { hex: normalized }));
    return true;
  };
  const renderSeeds = () => {
    $('seedCount').textContent = state.seeds.length;
    $('seedList').innerHTML = state.seeds.length ? state.seeds.map(hex => `<div class="seed-chip"><button class="seed-color" type="button" style="background:${hex}" data-hex="${hex}" data-action="copy" aria-label="${escape(t('app.copyHex', { hex }))}" title="${escape(t('app.copyHex', { hex }))}"></button><button class="seed-hex" data-action="copy" data-hex="${hex}" type="button" title="${escape(t('app.copyHex', { hex }))}">${hex}</button><button class="seed-remove" data-action="remove" data-hex="${hex}" type="button" aria-label="${escape(t('app.removeHex', { hex }))}">${icon('x')}</button></div>`).join('') : `<div class="seed-empty">${escape(t('app.emptySeeds'))}</div>`;
  };
  const renderPalette = (palette, index) => {
    const anchors = new Map(palette.adjustments.map(entry => [entry.actual, entry.original]));
    const swatches = palette.colors.map(hex => {
      const original = anchors.get(hex);
      const changed = original && original !== hex;
      const label = changed ? t('app.adjustFrom', { original, actual: hex }) : t('app.copyHex', { hex });
      const marker = original ? `<span class="strip-lock${changed ? ' strip-adjusted' : ''}" aria-hidden="true"></span>` : '';
      return `<button type="button" class="strip-swatch" style="background:${hex}" data-action="copy" data-hex="${hex}" title="${label}" aria-label="${label}">${marker}</button>`;
    }).join('');
    const adjusted = palette.adjustments.filter(item => item.actual !== item.original);
    const note = adjusted.length ? `<div class="palette-adjustment">${adjusted.map(item => `<span title="${escape(t('app.adjustTitle', { original: item.original, actual: item.actual }))}"><i style="background:${item.original}"></i><i style="background:${item.actual}"></i>${item.original} → ${item.actual}</span>`).join('')}</div>` : '';
    return `<article class="palette-card" style="--card-index:${index}"><div class="palette-body"><div class="palette-title-row"><div><h4>${escape(t(`strategy.${palette.id}.title`))}</h4><span class="palette-en">${escape(translateLocale('en', `strategy.${palette.id}.title`))}</span></div><span class="palette-id">0${index + 1}</span></div><p class="palette-description">${escape(t(`strategy.${palette.id}.description`))}</p></div><div class="color-strip">${swatches}</div>${note}<div class="palette-card-footer"><button type="button" data-action="preview" data-index="${index}">${escape(t('app.preview'))} ${icon('arrow')}</button><button type="button" data-action="copyall" data-index="${index}">${escape(t('app.copyAll'))} ${icon('copy')}</button></div></article>`;
  };
  const regenerate = () => {
    const preferredSize = Number($('paletteSize').value);
    const specificity = Number($('colorFidelity').value);
    const actualSize = state.seeds.length ? Math.max(preferredSize, state.seeds.length + 1) : preferredSize;
    $('sizeValue').textContent = actualSize === preferredSize ? t('app.size', { count: preferredSize }) : t('app.sizeExpanded', { count: actualSize });
    $('fidelityValue').textContent = `${specificity}%`;
    $('fidelityHint').textContent = specificity === Config.fidelity.max ? t('app.fidelityExact') : specificity === Config.fidelity.min ? t('app.fidelityFlexible', { delta: Config.fidelity.maximumDelta.toFixed(3) }) : t('app.fidelityBetween', { delta: Generator.fidelityToDelta(specificity).toFixed(3) });
    $('anchorLegend').textContent = specificity === Config.fidelity.max ? t('app.legendExact') : t('app.legendAdjusted');
    $('colorFidelity').style.setProperty('--range-progress', `${100 * (specificity - Config.fidelity.min) / (Config.fidelity.max - Config.fidelity.min)}%`);
    state.generated = Generator.palettesFor(state.seeds, preferredSize, state.variation, specificity);
    $('resultsGrid').innerHTML = state.generated.length ? state.generated.map(renderPalette).join('') : `<div class="seed-empty">${escape(t('app.resultsPrompt'))}</div>`;
    $('resultsSummary').textContent = state.seeds.length ? t('app.resultsSummary', { count: state.seeds.length, fidelity: specificity, strategies: Generator.strategies.length }) : t('app.resultsEmpty');
  };
  const renderFilters = () => {
    $('categoryFilters').innerHTML = Data.categories.map(category => `<button type="button" class="filter-button${state.filter === category.id ? ' active' : ''}" data-filter="${category.id}" aria-pressed="${state.filter === category.id}">${escape(t(`category.${category.id}`))}</button>`).join('');
  };
  const renderGallery = () => {
    const query = $('gallerySearch').value.trim().toLocaleLowerCase();
    const visible = Data.palettes.filter(item => (state.filter === 'all' || item.category === state.filter) && gallerySearchText(item).includes(query));
    $('galleryGrid').innerHTML = visible.map(item => `<article class="gallery-card"><div class="gallery-swatches">${item.colors.map(hex => `<button type="button" class="gallery-swatch" style="background:${hex};color:${Color.readableInk(hex)}" data-hex="${hex}" data-action="copy" title="${escape(t('app.copyHex', { hex }))}" aria-label="${escape(t('app.copyHex', { hex }))}"><span>${hex}</span></button>`).join('')}</div><div class="gallery-card-inner"><div class="gallery-card-head"><div><h3>${escape(paletteName(item))}</h3><div class="gallery-card-en">${escape(window.ColorAtlasI18n.locale === 'en' ? t(`category.${item.category}`) : translateLocale('en', `palette.${item.id}.title`))}</div></div>${icon('spark')}</div><p>${escape(paletteDescription(item))}</p><div class="gallery-tags">${item.tags.map(tag => `<span>${escape(t(`tag.${tag}`))}</span>`).join('')}</div><div class="gallery-actions"><button type="button" data-action="adopt" data-id="${item.id}">${escape(t('app.galleryAdoptToast'))} ${icon('arrow')}</button><button type="button" data-action="preview" data-id="${item.id}">${escape(t('app.preview'))} ${icon('arrow')}</button></div></div></article>`).join('');
    $('galleryEmpty').hidden = Boolean(visible.length);
  };
  const renderPreview = () => {
    const item = state.preview;
    if (!item) return;
    const roles = Generator.assignRoles(item.colors);
    const accentInk = Color.readableInk(roles.accent);
    const stage = $('previewStage');
    if (state.previewMode === 'ui') {
      stage.innerHTML = `<div class="mock-website" style="background:${roles.background};color:${roles.ink}"><div class="mock-top"><span>${escape(t('preview.mockUiLabel'))}</span><span class="mock-top-links"><span>${escape(t('app.uiDiscover'))}</span><span>${escape(t('app.uiAbout'))}</span><span>${escape(t('app.uiContact'))}</span></span></div><div class="mock-main"><div><h3>${escape(t('app.uiHeadline'))}</h3><p>${escape(t('app.uiBody'))}</p><button style="background:${roles.accent};color:${accentInk}">${escape(t('app.uiExplore'))}</button></div><div class="mock-visual" style="background:${roles.other}"><span style="background:${roles.accent}"></span><span style="background:${roles.ink}"></span><span style="background:${roles.background}"></span></div></div></div>`;
    } else {
      stage.innerHTML = `<div class="mock-poster" style="background:${roles.other}"><div class="poster-page" style="background:${roles.background};color:${roles.ink}"><div class="poster-top"><span>${escape(t('preview.mockPosterLabel'))}</span><span>№ 0${Math.min(item.colors.length, 9)}</span></div><span class="poster-circle" style="background:${roles.accent}"></span><span class="poster-bar" style="background:${roles.other}"></span><h3>${escape(t('app.posterTitle'))}</h3><div class="poster-bottom">${escape(t('preview.mockPosterFooter'))}</div></div></div>`;
    }
    $('previewHexes').innerHTML = item.colors.map(hex => `<span style="background:${hex}" title="${hex}"></span>`).join('');
    $('previewTitle').textContent = t('app.previewTitle', { name: item.offsets ? t(`strategy.${item.id}.title`) : paletteName(item) });
    document.querySelectorAll('[data-preview-mode]').forEach(button => button.classList.toggle('active', button.dataset.previewMode === state.previewMode));
  };
  const openPreview = item => {
    state.preview = item;
    state.previewMode = 'ui';
    renderPreview();
    const dialog = $('previewDialog');
    if (!dialog.open) dialog.showModal();
  };
  const handleImage = async file => {
    if (!file) return;
    setStatus(t('app.imageWorking'));
    $('uploadTrigger').disabled = true;
    try {
      const result = await Extract.extract(file, Config.extractor.representativeColors);
      state.extracted = result.colors;
      state.imageMeta = { width: result.width, height: result.height, count: result.colors.length };
      $('imagePreview').src = result.preview;
      $('imageMeta').textContent = t('app.imageMeta', { width: result.width, height: result.height, count: result.colors.length });
      $('extractedColors').innerHTML = result.colors.map(hex => `<button type="button" class="extract-chip" style="background:${hex}" data-action="addExtracted" data-hex="${hex}" title="${escape(t('app.extractAdd', { hex }))}" aria-label="${escape(t('app.extractAdd', { hex }))}"></button>`).join('');
      $('imageResult').hidden = false;
      setStatus(t('app.imageDone', { count: result.colors.length }));
      showToast(t('app.imageSuccess'));
    } catch (error) { setStatus(error.message || t('app.imageError')); showToast(error.message || t('app.imageError')); }
    finally { $('uploadTrigger').disabled = false; }
  };
  const renderAbout = () => {
    const list = $('aboutSteps');
    list.replaceChildren(...Config.aboutSteps.map((step, index) => {
      const item = document.createElement('li');
      item.className = 'about-flow-step';
      const numeral = document.createElement('span');
      numeral.className = 'about-flow-index';
      numeral.textContent = String(index + 1).padStart(2, '0');
      const text = document.createElement('div');
      text.className = 'about-flow-copy';
      const title = document.createElement('strong');
      title.textContent = t(`about.flow.${step}.title`);
      const description = document.createElement('p');
      description.textContent = t(`about.flow.${step}.description`);
      const marker = document.createElement('span');
      marker.className = 'about-flow-marker';
      marker.setAttribute('aria-hidden', 'true');
      text.append(title, description);
      item.append(numeral, text, marker);
      return item;
    }));
  };
  const applySettings = () => {
    $('nativeColor').value = Config.initialColor;
    $('hexInput').placeholder = Config.initialColor;
    for (const [id, bounds] of [['paletteSize', Config.paletteSize], ['colorFidelity', Config.fidelity]]) {
      const control = $(id);
      control.min = String(bounds.min);
      control.max = String(bounds.max);
      control.value = String(bounds.default);
    }
    $('paletteSizeMin').textContent = Config.paletteSize.min;
    $('paletteSizeMax').textContent = Config.paletteSize.max;
    $('siteYear').textContent = Config.site.publishedYear;
    $('studioIntro').textContent = t('studio.intro', { count: Generator.strategies.length });
    $('galleryIntro').textContent = t('gallery.intro', { count: Data.palettes.length });
  };
  const init = () => {
    applySettings();
    renderAbout();
    renderSeeds();
    regenerate();
    renderFilters();
    renderGallery();
    $('hexForm').addEventListener('submit', event => {
      event.preventDefault();
      if (addSeed($('hexInput').value)) $('hexInput').value = '';
    });
    $('nativeColor').addEventListener('input', event => { $('hexInput').value = event.target.value.toUpperCase(); });
    $('nativeColor').addEventListener('change', event => addSeed(event.target.value));
    $('seedList').addEventListener('click', event => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      if (button.dataset.action === 'copy') copyText(button.dataset.hex, t('app.copiedHex', { hex: button.dataset.hex }));
      if (button.dataset.action === 'remove') {
        state.seeds = state.seeds.filter(hex => hex !== button.dataset.hex);
        state.variation = 0;
        renderSeeds(); regenerate(); setStatus(t('app.removed', { hex: button.dataset.hex }));
      }
    });
    $('clearSeeds').addEventListener('click', () => { state.seeds = []; state.variation = 0; renderSeeds(); regenerate(); setStatus(t('app.cleared')); });
    $('paletteSize').addEventListener('input', regenerate);
    $('colorFidelity').addEventListener('input', regenerate);
    $('generate').addEventListener('click', () => { if (!state.seeds.length) { setStatus(t('app.noSeed')); return; } state.variation++; regenerate(); showToast(t('app.generated')); });
    $('regenerate').addEventListener('click', () => { if (!state.seeds.length) { setStatus(t('app.noSeed')); return; } state.variation++; regenerate(); showToast(t('app.updated')); });
    $('resultsGrid').addEventListener('click', event => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      if (button.dataset.action === 'copy') return copyText(button.dataset.hex, t('app.copiedHex', { hex: button.dataset.hex }));
      const item = state.generated[Number(button.dataset.index)];
      if (!item) return;
      if (button.dataset.action === 'preview') openPreview(item);
      if (button.dataset.action === 'copyall') copyText(item.colors.join(', '), t('app.copiedAll'));
    });
    $('categoryFilters').addEventListener('click', event => {
      const button = event.target.closest('button[data-filter]');
      if (!button) return;
      state.filter = button.dataset.filter;
      renderFilters(); renderGallery();
    });
    $('gallerySearch').addEventListener('input', renderGallery);
    $('galleryGrid').addEventListener('click', event => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      if (button.dataset.action === 'copy') return copyText(button.dataset.hex, t('app.copiedHex', { hex: button.dataset.hex }));
      const item = Data.palettes.find(item => item.id === button.dataset.id);
      if (!item) return;
      if (button.dataset.action === 'preview') openPreview(item);
      if (button.dataset.action === 'adopt') {
        let count = 0;
        for (const hex of item.colors) if (addSeed(hex, true)) count++;
        setStatus(t('app.galleryAdopted', { name: paletteName(item), count }));
        document.getElementById('studio').scrollIntoView({ behavior: 'smooth' });
        showToast(t('app.galleryAdoptToast'));
      }
    });
    $('screenPick').addEventListener('click', async () => {
      if (!window.isSecureContext || !('EyeDropper' in window)) {
        setStatus(t('app.eyeUnavailable'));
        showToast(t('app.eyeUnavailableToast'));
        return;
      }
      try {
        const result = await new window.EyeDropper().open();
        addSeed(result.sRGBHex);
      } catch (error) {
        if (error.name !== 'AbortError') { setStatus(t('app.eyeFailed')); showToast(t('app.eyeFailedToast')); }
      }
    });
    $('uploadTrigger').addEventListener('click', () => $('imageInput').click());
    $('imageInput').addEventListener('change', event => { handleImage(event.target.files[0]); event.target.value = ''; });
    $('dropZone').addEventListener('click', () => $('imageInput').click());
    $('dropZone').addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); $('imageInput').click(); } });
    const dropZone = $('dropZone');
    dropZone.addEventListener('dragover', event => { event.preventDefault(); dropZone.classList.add('dragging'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging'));
    dropZone.addEventListener('drop', event => {
      event.preventDefault(); dropZone.classList.remove('dragging');
      handleImage([...event.dataTransfer.files].find(file => file.type.startsWith('image/')));
    });
    document.addEventListener('paste', event => {
      const item = [...(event.clipboardData?.items || [])].find(item => item.type.startsWith('image/'));
      if (item) { event.preventDefault(); handleImage(item.getAsFile()); }
    });
    $('extractedColors').addEventListener('click', event => {
      const button = event.target.closest('button[data-action="addExtracted"]');
      if (button) addSeed(button.dataset.hex);
    });
    $('useExtracted').addEventListener('click', () => {
      let count = 0;
      for (const hex of state.extracted) if (addSeed(hex, true)) count++;
      setStatus(t('app.addedCount', { count }));
      showToast(t('app.extractedAdded'));
    });
    $('closePreview').addEventListener('click', () => $('previewDialog').close());
    $('previewDialog').addEventListener('click', event => {
      if (event.target === $('previewDialog')) $('previewDialog').close();
    });
    document.querySelectorAll('[data-preview-mode]').forEach(button => button.addEventListener('click', () => { state.previewMode = button.dataset.previewMode; renderPreview(); }));
    $('copyPreview').addEventListener('click', () => { if (state.preview) copyText(state.preview.colors.join(', '), t('app.copiedAll')); });
    document.addEventListener('coloratlas:languagechange', () => {
      renderSeeds(); regenerate(); renderFilters(); renderGallery(); renderAbout();
      $('studioIntro').textContent = t('studio.intro', { count: Generator.strategies.length });
      $('galleryIntro').textContent = t('gallery.intro', { count: Data.palettes.length });
      if (state.preview) renderPreview();
      setStatus(t('app.statusDefault'));
      if (state.imageMeta) $('imageMeta').textContent = t('app.imageMeta', state.imageMeta);
      if (state.extracted.length) {
        $('extractedColors').querySelectorAll('[data-hex]').forEach(button => {
          button.title = t('app.extractAdd', { hex: button.dataset.hex });
          button.setAttribute('aria-label', button.title);
        });
      }
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
