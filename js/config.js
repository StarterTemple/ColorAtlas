(() => {
  const settings = {
    site: { name: 'Color Atlas', publishedYear: new Date().getFullYear() },
    languages: [
      { id: 'zh-Hant', label: '繁中' },
      { id: 'en', label: 'EN' },
      { id: 'zh-Hans', label: '简中' }
    ],
    defaultLanguage: 'zh-Hant',
    defaultColors: ['#6D80A6', '#E5A17F'],
    initialColor: '#6D80A6',
    paletteSize: { min: 4, max: 8, default: 5 },
    fidelity: { min: 50, max: 100, default: 85, maximumDelta: 0.12 },
    extractor: { representativeColors: 7, analysisMaxSide: 360, maxSamples: 6500, alphaThreshold: 180, clusterMultiplier: 3, minimumClusters: 12, iterations: 14, minimumSeparation: 0.085, previewQuality: 0.84 },
    readability: { darkInk: '#141716', lightInk: '#FFFFFF', textContrast: 4.5 },
    feedback: { toastDuration: 2600 },
    landing: {
      autoRotateMs: 9000,
      manualHoldMs: 22000,
      maxPixelRatio: 1.6,
      canvasBackground: '#090A0F',
      presets: [
        { id: 'spectrum', name: 'SPECTRUM', colors: ['#C2E53B', '#7169FF', '#F24B7E', '#31BAD6', '#F8B457'] },
        { id: 'ultraviolet', name: 'ULTRAVIOLET', colors: ['#DE69F5', '#634BFF', '#EFA4DA', '#3C90DB', '#B9F1FC'] },
        { id: 'phase-shift', name: 'PHASE SHIFT', colors: ['#40DAEC', '#215EFF', '#40F2B3', '#CDFF55', '#AC76F3'] },
        { id: 'afterglow', name: 'AFTERGLOW', colors: ['#FFAA42', '#FD4F66', '#FFD94C', '#A456F6', '#FC9270'] }
      ]
    },
    aboutSteps: ['format', 'content', 'render'],
    galleryCategories: ['all', 'warm', 'cool', 'soft', 'vivid']
  };
  window.ColorAtlasConfig = Object.freeze(settings);
})();
