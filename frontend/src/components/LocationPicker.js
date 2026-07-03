import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, MagnifyingGlass, CrosshairSimple, Warning } from '@phosphor-icons/react';
import { loadGoogleMaps, getGoogleMapsKey } from '../lib/googleMaps';

/**
 * Web equivalent of the mobile LocationPickerModal.
 * - Interactive Google Map with a draggable marker
 * - Click the map to move the pin
 * - "Use my location" (browser geolocation)
 * - Address search (geocoding) + reverse-geocoded address label
 *
 * Props:
 *   latitude, longitude  : current coords (numbers)
 *   onChange(lat, lng)   : called whenever the pin moves
 *   onAddressResolved({ address, city }) : optional, called after geocode/reverse-geocode
 */
export default function LocationPicker({ latitude, longitude, onChange, onAddressResolved }) {
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [addressLabel, setAddressLabel] = useState('');
  const [searchError, setSearchError] = useState(null);

  const emitChange = useCallback(
    (lat, lng) => {
      if (typeof onChange === 'function') onChange(lat, lng);
    },
    [onChange]
  );

  const reverseGeocode = useCallback(
    (lat, lng) => {
      if (!geocoderRef.current) return;
      geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          setAddressLabel(results[0].formatted_address);
          if (typeof onAddressResolved === 'function') {
            const comps = results[0].address_components || [];
            const city =
              comps.find((c) => c.types.includes('locality'))?.long_name ||
              comps.find((c) => c.types.includes('administrative_area_level_2'))?.long_name ||
              '';
            onAddressResolved({ address: results[0].formatted_address, city });
          }
        }
      });
    },
    [onAddressResolved]
  );

  const placePin = useCallback(
    (lat, lng, recenter = false) => {
      if (markerRef.current) markerRef.current.setPosition({ lat, lng });
      if (recenter && mapRef.current) mapRef.current.panTo({ lat, lng });
      emitChange(lat, lng);
      reverseGeocode(lat, lng);
    },
    [emitChange, reverseGeocode]
  );

  // Init map once Google Maps is loaded
  useEffect(() => {
    let cancelled = false;
    // Default map center BEFORE a pin is placed = Jammu (our launch city). This
    // is only the starting camera; the salon's stored location is set only when
    // the owner clicks/drags the pin (which fires onChange).
    const initLat = Number.isFinite(latitude) ? latitude : 32.7266;
    const initLng = Number.isFinite(longitude) ? longitude : 74.857;

    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !mapDivRef.current) return;
        const map = new maps.Map(mapDivRef.current, {
          center: { lat: initLat, lng: initLng },
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
        });
        const marker = new maps.Marker({
          position: { lat: initLat, lng: initLng },
          map,
          draggable: true,
        });
        const geocoder = new maps.Geocoder();
        mapRef.current = map;
        markerRef.current = marker;
        geocoderRef.current = geocoder;

        map.addListener('click', (e) => {
          placePin(e.latLng.lat(), e.latLng.lng());
        });
        marker.addListener('dragend', (e) => {
          placePin(e.latLng.lat(), e.latLng.lng());
        });

        setReady(true);
        reverseGeocode(initLat, initLng);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || 'Could not load the map');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (e) => {
    e?.preventDefault?.();
    const q = search.trim();
    if (!q || !geocoderRef.current) return;
    setSearching(true);
    setSearchError(null);
    geocoderRef.current.geocode({ address: q }, (results, status) => {
      setSearching(false);
      if (status === 'OK' && results && results[0]) {
        const loc = results[0].geometry.location;
        const lat = loc.lat();
        const lng = loc.lng();
        if (mapRef.current) mapRef.current.setZoom(16);
        placePin(lat, lng, true);
        setAddressLabel(results[0].formatted_address);
      } else {
        setSearchError('Address not found. Try a different search.');
      }
    });
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setSearchError('Geolocation is not supported by this browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        placePin(pos.coords.latitude, pos.coords.longitude, true);
        if (mapRef.current) mapRef.current.setZoom(16);
      },
      () => {
        setLocating(false);
        setSearchError('Could not get your location. Please allow location access.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (!getGoogleMapsKey()) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm flex items-center gap-2">
        <Warning size={18} /> Map unavailable — Google Maps key not configured.
      </div>
    );
  }

  return (
    <div>
      {/* Search row */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSearchError(null); }}
            placeholder="Search address or area..."
            className="w-full pl-10 pr-3 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800"
          />
        </div>
        <button
          type="submit"
          disabled={searching || !search.trim()}
          className="px-4 py-3 rounded-xl bg-orange-800 text-white font-semibold disabled:opacity-50"
        >
          {searching ? '…' : 'Find'}
        </button>
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={locating}
          title="Use my location"
          className="px-3 py-3 rounded-xl border border-stone-200 text-orange-800 hover:bg-stone-50 disabled:opacity-50"
        >
          <CrosshairSimple size={20} />
        </button>
      </form>

      {searchError && (
        <p className="text-sm text-red-600 mb-2 flex items-center gap-1"><Warning size={14} /> {searchError}</p>
      )}

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border border-stone-200">
        <div ref={mapDivRef} className="w-full h-72 bg-stone-100" />
        {!ready && !loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-50/70 text-stone-500 text-sm">
            Loading map…
          </div>
        )}
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-50 text-red-600 text-sm px-4 text-center">
            {loadError}
          </div>
        )}
      </div>

      {/* Footer: tap hint + coords + resolved address */}
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="text-xs text-stone-500">
          <p>Tap the map or drag the pin to set your exact location.</p>
          {addressLabel && <p className="mt-1 text-stone-600">{addressLabel}</p>}
        </div>
        <div className="flex items-center gap-1 text-xs text-stone-700 shrink-0 tabular-nums">
          <MapPin size={14} className="text-orange-800" weight="fill" />
          {Number.isFinite(latitude) ? latitude.toFixed(5) : '—'},{' '}
          {Number.isFinite(longitude) ? longitude.toFixed(5) : '—'}
        </div>
      </div>
    </div>
  );
}
