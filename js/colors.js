(() => {
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const normalizeHex = value => {
    const raw = String(value ?? '').trim().replace(/^#/, '');
    if (/^[0-9a-f]{3}$/i.test(raw)) return '#' + [...raw].map(x => x + x).join('').toUpperCase();
    if (/^[0-9a-f]{6}$/i.test(raw)) return '#' + raw.toUpperCase();
    return null;
  };
  const toRgb = hex => {
    const value = normalizeHex(hex);
    if (!value) return null;
    return [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16) / 255);
  };
  const toHex = rgb => '#' + rgb.map(v => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  const linearize = v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  const delinearize = v => v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(v, 0) ** (1 / 2.4) - 0.055;
  const rgbToLab = rgb => {
    const [r, g, b] = rgb.map(linearize);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  };
  const labToRgb = lab => {
    const [L, a, b] = lab;
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map(delinearize);
  };
  const hexToLab = hex => rgbToLab(toRgb(hex));
  const labToLch = lab => ({ L: lab[0], C: Math.hypot(lab[1], lab[2]), h: ((Math.atan2(lab[2], lab[1]) * 180 / Math.PI) + 360) % 360 });
  const lchToLab = ({ L, C, h }) => [L, C * Math.cos(h * Math.PI / 180), C * Math.sin(h * Math.PI / 180)];
  const hexToLch = hex => labToLch(hexToLab(hex));
  const inGamut = rgb => rgb.every(v => Number.isFinite(v) && v >= -0.00001 && v <= 1.00001);
  const fromLch = (L, C, h) => {
    const targetL = clamp(L, 0.001, 0.999);
    let low = 0;
    let high = clamp(C, 0, 0.4);
    let rgb = labToRgb(lchToLab({ L: targetL, C: high, h }));
    if (inGamut(rgb)) return toHex(rgb);
    for (let i = 0; i < 22; i++) {
      const mid = (low + high) / 2;
      const sample = labToRgb(lchToLab({ L: targetL, C: mid, h }));
      if (inGamut(sample)) { low = mid; rgb = sample; } else high = mid;
    }
    return toHex(labToRgb(lchToLab({ L: targetL, C: low, h })));
  };
  const distance = (one, two) => Math.hypot(one[0] - two[0], one[1] - two[1], one[2] - two[2]);
  const luminance = hex => {
    const [r, g, b] = toRgb(hex).map(linearize);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a, b) => {
    const light = luminance(a);
    const dark = luminance(b);
    return (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
  };
  const readableInk = background => {
    const { darkInk, lightInk } = window.ColorAtlasConfig.readability;
    return contrast(background, darkInk) >= contrast(background, lightInk) ? darkInk : lightInk;
  };
  window.ColorAtlasColor = Object.freeze({ clamp, normalizeHex, toRgb, toHex, rgbToLab, labToRgb, hexToLab, hexToLch, fromLch, distance, contrast, readableInk });
})();
