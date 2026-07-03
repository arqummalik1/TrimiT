import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MagnifyingGlass, MapPin, NavigationArrow } from '@phosphor-icons/react';
import SalonCard from '../salon/SalonCard';
import { usePublicSalons } from '../../hooks/usePublicSalons';
import { JAMMU_CITY } from '../../config/jammu';
import { useServiceability } from '../../hooks/useServiceability';
import ServiceAreaGate from './ServiceAreaGate';
import ServiceCityNotice from './ServiceCityNotice';

export default function SalonDiscoveryView({
  title = 'Explore salons in Jammu',
  subtitle,
  showLocationButton = true,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const initialLat = parseFloat(searchParams.get('lat')) || JAMMU_CITY.lat;
  const initialLng = parseFloat(searchParams.get('lng')) || JAMMU_CITY.lng;

  const [searchQuery, setSearchQuery] = useState(initialQ);
  const [coords, setCoords] = useState({ lat: initialLat, lng: initialLng });
  const [locationLabel, setLocationLabel] = useState(JAMMU_CITY.label);
  // Only gate when the visitor actively shared their real location (not the
  // default Jammu center used for SEO/browsing).
  const [sharedLocation, setSharedLocation] = useState(false);

  useEffect(() => {
    setSearchQuery(initialQ);
  }, [initialQ]);

  const { data: salons, isLoading, error, refetch, isFetching } = usePublicSalons({
    search: searchQuery,
    lat: coords.lat,
    lng: coords.lng,
    limit: 24,
  });

  const { data: serviceability } = useServiceability(
    sharedLocation ? coords : null
  );
  const isOutOfArea = sharedLocation && serviceability?.serviceable === false;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (searchQuery) next.set('q', searchQuery);
    else next.delete('q');
    next.set('lat', String(coords.lat));
    next.set('lng', String(coords.lng));
    setSearchParams(next, { replace: true });
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLabel('Near you');
        setSharedLocation(true);
        const next = new URLSearchParams(searchParams);
        next.set('lat', String(pos.coords.latitude));
        next.set('lng', String(pos.coords.longitude));
        setSearchParams(next, { replace: true });
      },
      () => setLocationLabel(JAMMU_CITY.label)
    );
  };

  return (
    <motion.div className="min-h-screen bg-stone-50 pb-24">
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-stone-900 mb-2">
              {title}
            </h1>
            <p className="text-stone-500 mb-6">
              {subtitle ||
                `Showing salons near ${locationLabel} — book online with instant confirmation.`}
            </p>
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <MagnifyingGlass
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="search-input"
                  placeholder="Search salons, haircut, beard, spa..."
                  className="w-full pl-12 pr-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800"
                />
              </div>
              {showLocationButton && (
                <button
                  type="button"
                  onClick={useMyLocation}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-stone-200 text-stone-700 font-medium hover:bg-stone-50"
                >
                  <NavigationArrow size={18} weight="bold" />
                  Use my location
                </button>
              )}
              <button type="submit" className="btn-primary px-8 py-3">
                Search
              </button>
            </form>
            <p className="flex items-center gap-1.5 text-sm text-stone-500 mt-3">
              <MapPin size={16} weight="fill" className="text-orange-800" />
              {locationLabel} · {JAMMU_CITY.region}
            </p>
            <ServiceCityNotice className="mt-4" />
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {isOutOfArea && serviceability ? (
          <ServiceAreaGate result={serviceability} coords={coords} />
        ) : (
        <>
        {error && (
          <div className="text-center py-12 px-4">
            <p className="text-stone-700 font-medium mb-1">Could not load salons</p>
            <p className="text-stone-500 text-sm mb-4 max-w-md mx-auto">
              Check your connection, or try again. Browsing salons does not require signing in.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="btn-primary text-sm disabled:opacity-60"
            >
              {isFetching ? 'Loading…' : 'Try again'}
            </button>
          </div>
        )}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-[4/3] rounded-2xl bg-stone-200 animate-pulse" />
            ))}
          </div>
        ) : salons?.length > 0 ? (
          <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-stagger">
            {salons.map((salon) => (
              <SalonCard key={salon.id} salon={salon} />
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <MapPin size={64} weight="duotone" className="mx-auto text-stone-300 mb-4" />
            <h2 className="font-heading text-xl font-bold text-stone-700 mb-2">No salons found</h2>
            <p className="text-stone-500">Try a different search or check back as new salons join.</p>
          </div>
        )}
        </>
        )}
      </div>
    </motion.div>
  );
}
