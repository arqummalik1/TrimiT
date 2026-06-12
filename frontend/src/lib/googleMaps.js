import { getEnv } from '../config/env';

/** Lazily load the Google Maps JS API once. Resolves window.google.maps. */
let loadPromise = null;

export function getGoogleMapsKey() {
  return getEnv('GOOGLE_MAPS_API_KEY');
}

export function loadGoogleMaps() {
  if (typeof window !== 'undefined' && window.google && window.google.maps) {
    return Promise.resolve(window.google.maps);
  }
  if (loadPromise) return loadPromise;

  const key = getGoogleMapsKey();
  if (!key) {
    return Promise.reject(new Error('Google Maps API key not configured'));
  }

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('trimit-gmaps');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google.maps));
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'trimit-gmaps';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google && window.google.maps) resolve(window.google.maps);
      else reject(new Error('Google Maps loaded but unavailable'));
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load Google Maps'));
    };
    document.body.appendChild(script);
  });
  return loadPromise;
}
