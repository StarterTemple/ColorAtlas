(() => {
  const hero = document.querySelector('.field-hero');
  const canvas = document.getElementById('fieldCanvas');
  if (!hero || !canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;
  const config = window.ColorAtlasConfig.landing;
  const presets = config.presets;
  const modesContainer = document.getElementById('fieldModes');
  const samplesContainer = document.getElementById('fieldSamples');
  const renderModes = () => {
    modesContainer.replaceChildren(...presets.map((entry, index) => {
      const button = document.createElement('button');
      const chip = document.createElement('span');
      button.type = 'button';
      button.className = 'field-mode';
      button.dataset.fieldMode = String(index);
      button.setAttribute('aria-label', `${String(index + 1).padStart(2, '0')} / ${entry.name}`);
      chip.className = 'field-mode-chip';
      chip.style.backgroundColor = entry.colors[0];
      button.append(chip, document.createTextNode(String(index + 1).padStart(2, '0')));
      return button;
    }));
  };
  const renderSamples = colors => {
    samplesContainer.replaceChildren(...colors.map(hex => {
      const button = document.createElement('button');
      const swatch = document.createElement('span');
      const caption = document.createElement('small');
      button.type = 'button';
      button.className = 'field-sample';
      button.dataset.hex = hex;
      button.setAttribute('aria-label', window.ColorAtlasI18n.t('field.addSample', { hex }));
      swatch.style.backgroundColor = hex;
      caption.textContent = hex;
      button.append(swatch, caption);
      return button;
    }));
  };
  renderModes();
  const modes = [...modesContainer.querySelectorAll('[data-field-mode]')];
  const coordinate = document.getElementById('fieldCoordinate');
  const readout = document.getElementById('fieldLabel');
  const readoutNumber = document.getElementById('fieldIndex');
  const progress = document.getElementById('fieldProgress');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let width = 1;
  let height = 1;
  let running = false;
  let visible = true;
  let frame = 0;
  let last = 0;
  let pointer = { x: .74, y: .46, active: false };
  let smoothPointer = { x: .74, y: .46 };
  let ripples = [];
  let lastManual = 0;
  const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const resize = () => {
    const rect = hero.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    const scale = Math.min(config.maxPixelRatio, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    draw(0);
  };
  const setPalette = index => {
    if (!presets[index]) return;
    current = index;
    const colors = presets[index].colors;
    hero.style.setProperty('--field-primary', colors[0]);
    hero.style.setProperty('--field-secondary', colors[1]);
    if (readout) readout.textContent = presets[index].name;
    if (readoutNumber) readoutNumber.textContent = String(index + 1).padStart(2, '0');
    modes.forEach((el, i) => {
      el.classList.toggle('is-active', i === index);
      el.setAttribute('aria-pressed', String(i === index));
    });
    renderSamples(colors);
    if (reduced.matches) draw(0);
  };
  const radial = (x, y, radius, color, opacity) => {
    const [r, g, b] = rgb(color);
    const gradient = ctx.createRadialGradient(x, y, 1, x, y, radius);
    gradient.addColorStop(0, `rgba(${r},${g},${b},${opacity})`);
    gradient.addColorStop(.31, `rgba(${r},${g},${b},${opacity * .65})`);
    gradient.addColorStop(.73, `rgba(${r},${g},${b},${opacity * .15})`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  };
  const draw = time => {
    const motion = reduced.matches ? 0 : time * .00038;
    ctx.fillStyle = config.canvasBackground;
    ctx.fillRect(0, 0, width, height);
    smoothPointer.x += (pointer.x - smoothPointer.x) * .035;
    smoothPointer.y += (pointer.y - smoothPointer.y) * .035;
    const colors = presets[current].colors;
    const spread = Math.max(width * .22, height * .42);
    const centerX = width * (width < 700 ? .72 : .75);
    const centerY = height * .48;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 8; i++) {
      const phase = i * Math.PI * 2 / 8;
      const waveX = Math.sin(motion * (1.1 + i * .083) + phase) * width * .16;
      const waveY = Math.cos(motion * (1.3 + i * .075) + phase * 1.4) * height * .27;
      const px = centerX + Math.cos(phase * 1.3) * width * .115 + waveX + (smoothPointer.x - .5) * width * .10;
      const py = centerY + Math.sin(phase * .85) * height * .18 + waveY + (smoothPointer.y - .5) * height * .12;
      radial(px, py, spread * (.69 + .1 * Math.sin(phase)), colors[i % colors.length], .48);
    }
    ctx.restore();
    const fade = ctx.createLinearGradient(0, 0, width, 0);
    fade.addColorStop(0, `${config.canvasBackground}ff`);
    fade.addColorStop(.22, `${config.canvasBackground}d8`);
    fade.addColorStop(.55, `${config.canvasBackground}33`);
    fade.addColorStop(1, `${config.canvasBackground}00`);
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.lineWidth = 1;
    for (let i = 0; i < 22; i++) {
      const y = height * (.15 + i * .031);
      const line = Math.sin(motion * .7 + i * .38) * (reduced.matches ? 0 : 20);
      ctx.strokeStyle = `rgba(229,233,255,${.012 + (i % 4) * .006})`;
      ctx.beginPath();
      ctx.moveTo(width * .53, y + line);
      ctx.bezierCurveTo(width * .69, y + line + 32, width * .81, y + line - 42, width, y + line + 9);
      ctx.stroke();
    }
    for (const ripple of ripples) {
      const age = (time - ripple.time) / 1350;
      if (age < 0 || age > 1) continue;
      ctx.strokeStyle = `rgba(255,255,255,${(1 - age) * .32})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, 12 + age * Math.min(width, height) * .29, 0, Math.PI * 2);
      ctx.stroke();
    }
    ripples = ripples.filter(ripple => time - ripple.time < 1350);
    ctx.restore();
  };
  const animate = time => {
    frame = 0;
    if (!running || document.hidden || !visible || reduced.matches) return;
    if (time - last > 30) {
      last = time;
      draw(time);
    }
    frame = requestAnimationFrame(animate);
  };
  const updateRunning = () => {
    running = visible && !document.hidden && !reduced.matches;
    if (!running && frame) cancelAnimationFrame(frame);
    if (!running) frame = 0;
    if (running && !frame) frame = requestAnimationFrame(animate);
    if (reduced.matches) draw(0);
  };
  let scrollQueued = false;
  const updateScroll = () => {
    scrollQueued = false;
    const rect = hero.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height)));
    if (progress) progress.style.width = `${(p * 100).toFixed(2)}%`;
    if (!reduced.matches) hero.style.setProperty('--field-breathe', (1 + p * .12).toFixed(3));
  };
  const requestScroll = () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(updateScroll);
  };
  modes.forEach(button => button.addEventListener('click', () => {
    lastManual = Date.now();
    setPalette(Number(button.dataset.fieldMode));
  }));
  samplesContainer.addEventListener('click', event => {
    const button = event.target.closest('.field-sample[data-hex]');
    if (!button) return;
    const input = document.getElementById('hexInput');
    const form = document.getElementById('hexForm');
    if (!input || !form) return;
    input.value = button.dataset.hex;
    form.requestSubmit();
    document.getElementById('studio')?.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth' });
  });
  hero.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || reduced.matches) return;
    const rect = hero.getBoundingClientRect();
    pointer = { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)), active: true };
    if (coordinate) coordinate.textContent = `X ${(pointer.x * 100).toFixed(1)} / Y ${(pointer.y * 100).toFixed(1)}`;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { pointer = { x: .74, y: .46, active: false }; });
  hero.addEventListener('pointerdown', event => {
    if (event.target.closest('a, button, select, input')) return;
    const rect = hero.getBoundingClientRect();
    ripples.push({ x: event.clientX - rect.left, y: event.clientY - rect.top, time: performance.now() });
  });
  window.addEventListener('scroll', requestScroll, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', updateRunning);
  reduced.addEventListener('change', updateRunning);
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    updateRunning();
  }).observe(hero);
  window.setInterval(() => {
    if (visible && !document.hidden && !reduced.matches && Date.now() - lastManual > config.manualHoldMs) setPalette((current + 1) % presets.length);
  }, config.autoRotateMs);
  document.addEventListener('coloratlas:languagechange', () => samplesContainer.querySelectorAll('[data-hex]').forEach(el => el.setAttribute('aria-label', window.ColorAtlasI18n.t('field.addSample', { hex: el.dataset.hex }))));
  setPalette(0);
  resize();
  updateScroll();
  updateRunning();
})();
