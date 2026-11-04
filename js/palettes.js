(() => {
  const palettes = [
    { id: 'morning-market', category: 'warm', tags: ['warmth', 'daily'], colors: ['#F7E7CE', '#E89A59', '#CE584B', '#5D7758', '#343F39'] },
    { id: 'blue-hour', category: 'cool', tags: ['calm', 'night'], colors: ['#E7E8EC', '#A8BDD0', '#6283A5', '#344E72', '#18283F'] },
    { id: 'soft-library', category: 'soft', tags: ['gentle', 'reading'], colors: ['#F3EFE6', '#D7C5B3', '#B38B79', '#97A58D', '#555F54'] },
    { id: 'soda-pop', category: 'vivid', tags: ['playful', 'retro'], colors: ['#FFF3B0', '#FF8D85', '#F74468', '#7575DE', '#242C65'] },
    { id: 'rainy-greenhouse', category: 'cool', tags: ['nature', 'quiet'], colors: ['#E7F0DC', '#AECDB1', '#6F9D8D', '#39786E', '#213D3E'] },
    { id: 'terracotta', category: 'warm', tags: ['earthy', 'texture'], colors: ['#FAEBD9', '#DCB895', '#C47D60', '#956E59', '#494639'] },
    { id: 'candy-cloud', category: 'soft', tags: ['dreamy', 'bright'], colors: ['#FFF2F3', '#EDCCD8', '#D2B5E8', '#A5C9DC', '#697D9E'] },
    { id: 'electric-city', category: 'vivid', tags: ['high-contrast', 'urban'], colors: ['#F6F1DD', '#C0F266', '#FC6F5C', '#7657D9', '#1E2135'] }
  ];
  const categories = window.ColorAtlasConfig.galleryCategories.map(id => ({ id }));
  window.ColorAtlasData = Object.freeze({ palettes, categories });
})();
