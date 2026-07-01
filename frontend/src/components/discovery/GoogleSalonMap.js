import React, { useEffect, useRef, useState } from 'react';
import { MapTrifold } from '@phosphor-icons/react';
import { loadGoogleMaps } from '../../lib/googleMaps';
import { JAMMU_CITY } from '../../config/jammu';

/**
 * Real Google map for customer salon discovery (web). Reuses the same
 * `loadGoogleMaps` loader + GOOGLE_MAPS_API_KEY the owner LocationPicker
 * already uses — so no new key is needed. Drops a marker per salon with valid
 * coordinates; tapping a marker shows the salon name + a link to its page.
 *
 * Falls back to a friendly message if the Maps key isn't configured.
 */
export default function GoogleSalonMap({ salons = [], userLocation }) {
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const infoRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  // Init map once.
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !mapDivRef.current) return;
        const center = userLocation
          ? { lat: userLocation.lat, lng: userLocation.lng }
          : { lat: JAMMU_CITY.lat, lng: JAMMU_CITY.lng };
        mapRef.current = new maps.Map(mapDivRef.current, {
          center,
          zoom: 12,
          disableDefaultUI: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });
        infoRef.current = new maps.InfoWindow();
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (Re)draw markers whenever salons change and the map is ready.
  useEffect(() => {
    if (status !== 'ready' || !window.google || !mapRef.current) return;
    const maps = window.google.maps;

    // Clear old markers.
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new maps.LatLngBounds();
    let plotted = 0;

    salons.forEach((salon) => {
      const lat = Number(salon.latitude);
      const lng = Number(salon.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return;

      const marker = new maps.Marker({
        position: { lat, lng },
        map: mapRef.current,
        title: salon.name,
      });
      marker.addListener('click', () => {
        const html = `
          <div style="min-width:160px">
            <div style="font-weight:700;margin-bottom:4px">${escapeHtml(salon.name)}</div>
            <div style="color:#78716c;font-size:12px;margin-bottom:6px">${escapeHtml(
              [salon.address, salon.city].filter(Boolean).join(', ')
            )}</div>
            <a href="/salon/${salon.id}" style="color:#9a3412;font-weight:600;font-size:13px">View salon →</a>
          </div>`;
        infoRef.current.setContent(html);
        infoRef.current.open(mapRef.current, marker);
      });
      markersRef.current.push(marker);
      bounds.extend({ lat, lng });
      plotted += 1;
    });

    if (userLocation) bounds.extend({ lat: userLocation.lat, lng: userLocation.lng });

    if (plotted > 0) {
      mapRef.current.fitBounds(bounds);
      // Avoid over-zoom when there's a single marker.
      const listener = maps.event.addListenerOnce(mapRef.current, 'idle', () => {
        if (mapRef.current.getZoom() > 15) mapRef.current.setZoom(15);
      });
      return () => maps.event.removeListener(listener);
    }
  }, [salons, userLocation, status]);

  if (status === 'error') {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="aspect-[16/9] bg-stone-100 flex items-center justify-center">
          <div className="text-center p-8">
            <MapTrifold size={56} weight="duotone" className="mx-auto text-stone-400 mb-3" />
            <h3 className="font-heading text-lg font-bold text-stone-700 mb-1">Map unavailable</h3>
            <p className="text-stone-500 text-sm max-w-md mx-auto">
              We couldn't load the map right now. You can still browse salons in list view.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div ref={mapDivRef} className="w-full aspect-[16/9] min-h-[360px]" />
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-100">
          <div className="h-8 w-8 rounded-full border-2 border-orange-700 border-t-transparent animate-spin" />
        </div>
      )}
    </div>
  );
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
