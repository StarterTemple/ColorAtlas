(() => {
  const Color = window.ColorAtlasColor;
  const settings = window.ColorAtlasConfig.extractor;
  const extract = async (file, desired = settings.representativeColors) => {
    if (!file || !file.type.startsWith('image/')) throw new Error(window.ColorAtlasI18n.t('extract.invalidFile'));
    const objectUrl = URL.createObjectURL(file);
    let image;
    try {
      image = new Image();
      image.src = objectUrl;
      await image.decode();
      if (!image.naturalWidth || !image.naturalHeight) throw new Error(window.ColorAtlasI18n.t('extract.invalidSize'));
      const scale = Math.min(1, settings.analysisMaxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error(window.ColorAtlasI18n.t('extract.noCanvas'));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const step = Math.max(1, Math.ceil(Math.sqrt(canvas.width * canvas.height / settings.maxSamples)));
      const points = [];
      for (let y = 0; y < canvas.height; y += step) {
        for (let x = 0; x < canvas.width; x += step) {
          const i = (y * canvas.width + x) * 4;
          if (pixels[i + 3] < settings.alphaThreshold) continue;
          points.push(Color.rgbToLab([pixels[i] / 255, pixels[i + 1] / 255, pixels[i + 2] / 255]));
        }
      }
      if (!points.length) throw new Error(window.ColorAtlasI18n.t('extract.noPixels'));
      const clusterCount = Math.min(Math.max(desired * settings.clusterMultiplier, settings.minimumClusters), points.length);
      const centers = [points[Math.floor(points.length * 0.47)].slice()];
      for (let k = 1; k < clusterCount; k++) {
        let winner = points[0];
        let farthest = -1;
        for (let i = k % 3; i < points.length; i += 3) {
          const distance = Math.min(...centers.map(center => Color.distance(center, points[i])));
          const salience = 0.85 + Math.hypot(points[i][1], points[i][2]) * 0.8;
          if (distance * salience > farthest) { winner = points[i]; farthest = distance * salience; }
        }
        centers.push(winner.slice());
      }
      let sizes = [];
      for (let iteration = 0; iteration < settings.iterations; iteration++) {
        const sums = centers.map(() => [0, 0, 0]);
        sizes = centers.map(() => 0);
        for (const point of points) {
          let best = 0;
          let score = Infinity;
          for (let j = 0; j < centers.length; j++) {
            const d = Color.distance(point, centers[j]);
            if (d < score) { score = d; best = j; }
          }
          sizes[best]++;
          sums[best][0] += point[0];
          sums[best][1] += point[1];
          sums[best][2] += point[2];
        }
        centers.forEach((center, i) => {
          if (sizes[i]) centers[i] = sums[i].map(value => value / sizes[i]);
        });
      }
      const ranked = centers.map((lab, i) => ({ lab, hex: Color.toHex(Color.labToRgb(lab)), coverage: sizes[i] / points.length }))
        .sort((a, b) => b.coverage - a.coverage);
      const picked = [];
      for (const candidate of ranked) {
        if (picked.every(existing => Color.distance(candidate.lab, existing.lab) > settings.minimumSeparation)) picked.push(candidate);
        if (picked.length >= desired) break;
      }
      for (const candidate of ranked) {
        if (picked.length >= desired) break;
        if (picked.every(existing => existing.hex !== candidate.hex)) picked.push(candidate);
      }
      return { colors: picked.map(p => p.hex), preview: canvas.toDataURL('image/jpeg', settings.previewQuality), width: image.naturalWidth, height: image.naturalHeight };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };
  window.ColorAtlasExtract = Object.freeze({ extract });
})();
