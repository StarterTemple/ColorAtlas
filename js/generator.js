(() => {
  const Color = window.ColorAtlasColor;
  const strategies = window.ColorAtlasStrategies;
  const clamp = Color.clamp;
  const fidelity = window.ColorAtlasConfig.fidelity;
  const readability = window.ColorAtlasConfig.readability;
  const fidelityToDelta = specificity => fidelity.maximumDelta * (fidelity.max - clamp(Number(specificity) || fidelity.max, fidelity.min, fidelity.max)) / (fidelity.max - fidelity.min);
  const tuneAnchors = (originals, strategy, specificity) => {
    const maximumDelta = fidelityToDelta(specificity);
    if (maximumDelta <= 0) return originals.map(original => ({ original, actual: original, delta: 0 }));
    const source = originals.map(Color.hexToLab);
    const centroid = [0, 1, 2].map(axis => source.reduce((sum, lab) => sum + lab[axis], 0) / source.length);
    const actuals = new Set();
    return originals.map((original, index) => {
      const lab = source[index];
      const lch = Color.hexToLch(original);
      const fraction = maximumDelta / fidelity.maximumDelta;
      const mix = source.length > 1 ? 0.35 * fraction : 0;
      const targetL = lab[0] + (strategy.idealLightness - lab[0]) * 0.26 * fraction;
      const targetC = lch.C + (strategy.chroma - lch.C) * 0.19 * fraction;
      const targetHex = Color.fromLch(clamp(targetL, 0.12, 0.92), clamp(targetC, 0, 0.32), lch.h);
      const target = Color.hexToLab(targetHex).map((v, axis) => v * (1 - mix) + centroid[axis] * mix);
      const distance = Color.distance(lab, target);
      const scale = distance > maximumDelta ? maximumDelta / distance : 1;
      const proposal = lab.map((v, axis) => v + (target[axis] - v) * scale);
      let candidate = Color.toHex(Color.labToRgb(proposal));
      let measured = Color.distance(lab, Color.hexToLab(candidate));
      for (let step = 0; step < 18 && measured > maximumDelta + 0.001; step++) {
        const t = (maximumDelta / measured) * (0.97 - step * 0.008);
        candidate = Color.toHex(Color.labToRgb(lab.map((v, axis) => v + (Color.hexToLab(candidate)[axis] - v) * t)));
        measured = Color.distance(lab, Color.hexToLab(candidate));
      }
      if (actuals.has(candidate)) {
        candidate = original;
        measured = 0;
      }
      actuals.add(candidate);
      return { original, actual: candidate, delta: Number(measured.toFixed(4)) };
    });
  };
  const arrange = (hexes, mapping) => [...hexes].sort((a, b) => {
    const light = Color.hexToLch(b).L - Color.hexToLch(a).L;
    if (Math.abs(light) > 0.012) return light;
    if (mapping.has(a) !== mapping.has(b)) return mapping.has(a) ? -1 : 1;
    return a.localeCompare(b);
  });
  const assignRoles = colors => {
    const ordered = [...colors].sort((a, b) => Color.hexToLch(a).L - Color.hexToLch(b).L);
    const background = ordered[ordered.length - 1];
    const darkest = ordered[0];
    const ink = Color.contrast(background, darkest) >= readability.textContrast ? darkest : Color.readableInk(background);
    const chromatic = [...colors].sort((a, b) => Color.hexToLch(b).C - Color.hexToLch(a).C);
    const accent = chromatic.find(c => c !== background && c !== ink) || chromatic[0];
    const other = chromatic.find(c => c !== accent && c !== background && c !== ink) || ordered[Math.floor(ordered.length / 2)];
    return { background, ink, accent, other, contrast: Color.contrast(background, ink) };
  };
  const palettesFor = (anchors, requestedCount = window.ColorAtlasConfig.paletteSize.default, variation = 0, specificity = fidelity.max) => {
    const fixed = [...new Set(anchors.map(Color.normalizeHex).filter(Boolean))];
    if (!fixed.length) return [];
    const count = Math.max(Math.round(requestedCount) || window.ColorAtlasConfig.paletteSize.default, fixed.length + 1);
    return strategies.map(strategy => {
      const adjustments = tuneAnchors(fixed, strategy, specificity);
      const chosen = adjustments.map(item => item.actual);
      const reference = chosen.map(Color.hexToLch);
      const base = reference[0];
      const neutralHue = base.h;
      const paper = Color.fromLch(strategy.paper, 0.014, neutralHue);
      const ink = Color.fromLch(strategy.ink, 0.018, neutralHue);
      const available = count - chosen.length;
      if (available >= 2 && !chosen.some(hex => Color.hexToLch(hex).L >= 0.88)) chosen.push(paper);
      if (count - chosen.length >= 2 && !chosen.some(hex => Color.hexToLch(hex).L <= 0.3)) chosen.push(ink);
      const pool = [];
      reference.forEach((origin, sourceIndex) => {
        strategy.offsets.forEach((offset, offsetIndex) => {
          strategy.lightness.forEach((L, lightIndex) => {
            const C = strategy.chroma * (lightIndex === 2 ? 0.82 : 1) * (origin.C < 0.035 ? 0.84 : 1);
            const h = (origin.h + offset + ((variation % 13) - 6) * 2.9 + sourceIndex * 3 + 1080) % 360;
            pool.push({ hex: Color.fromLch(L, C, h), rank: offsetIndex * 3 + lightIndex + sourceIndex, L });
          });
        });
      });
      while (chosen.length < count) {
        const chosenLabs = chosen.map(Color.hexToLab);
        const anchorLabs = adjustments.map(item => Color.hexToLab(item.actual));
        const candidates = pool.filter(candidate => !chosen.includes(candidate.hex)).map(candidate => {
          const lab = Color.hexToLab(candidate.hex);
          const nearest = Math.min(...chosenLabs.map(existing => Color.distance(existing, lab)));
          const anchorDistance = Math.min(...anchorLabs.map(existing => Color.distance(existing, lab)));
          const preferredDistance = strategy.preferredDistance;
          const score = Math.min(nearest, 0.16) * 1.65 - Math.abs(anchorDistance - preferredDistance) * 0.85 - Math.abs(lab[0] - strategy.idealLightness) * 0.18 - candidate.rank * 0.0075 + Math.sin(candidate.rank * 2.4 + variation * 2.9) * 0.015;
          return { ...candidate, score, nearest };
        }).sort((a, b) => b.score - a.score);
        const choice = candidates.find(candidate => candidate.nearest > 0.055) || candidates[0];
        if (!choice) break;
        chosen.push(choice.hex);
      }
      const mapping = new Map(adjustments.map(item => [item.actual, item.original]));
      const colors = arrange([...new Set(chosen)], mapping);
      return { ...strategy, colors, locked: adjustments.map(item => item.actual), adjustments, specificity, roles: assignRoles(colors) };
    });
  };
  window.ColorAtlasGenerator = Object.freeze({ palettesFor, assignRoles, strategies, fidelityToDelta });
})();
