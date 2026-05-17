/** Build optimized Unsplash URLs (WebP, sized) — faster than full-resolution q=85 JPG. */
function unsplash(id, { w = 1200, q = 72 } = {}) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=${q}`;
}

export const LANDING_HERO = {
  src: unsplash('photo-1626383137804-ff908d2753a2', { w: 1920, q: 75 }),
  srcSet: `${unsplash('photo-1626383137804-ff908d2753a2', { w: 960, q: 72 })} 960w, ${unsplash('photo-1626383137804-ff908d2753a2', { w: 1600, q: 75 })} 1600w, ${unsplash('photo-1626383137804-ff908d2753a2', { w: 1920, q: 75 })} 1920w`,
  sizes: '100vw',
  preloadHref: unsplash('photo-1626383137804-ff908d2753a2', { w: 1200, q: 72 }),
};
