import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  MagnifyingGlass, 
  MapPin, 
  Star, 
  Clock, 
  Funnel,
  List,
  MapTrifold,
  NavigationArrow
} from '@phosphor-icons/react';
import api from '../../lib/api';
import { formatPrice } from '../../lib/utils';

const CustomerHome = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          setLocationError('Unable to get your location. Showing all salons.');
        }
      );
    }
  }, []);

  // Fetch salons
  const { data: salons, isLoading } = useQuery({
    queryKey: ['salons', searchQuery, userLocation],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (userLocation) {
        params.append('lat', userLocation.lat);
        params.append('lng', userLocation.lng);
        params.append('radius', 50);
      }
      const response = await api.get(`/api/salons?${params.toString()}`);
      return response.data;
    },
  });

  return (
    <div className="min-h-screen bg-stone-50 pb-12">
      {/* Hero Search Section */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-stone-900 mb-2">
              Find Your Perfect Salon
            </h1>
            <p className="text-stone-500 mb-6">
              {userLocation 
                ? 'Showing salons near you' 
                : locationError || 'Allow location access to see nearby salons'}
            </p>

            {/* Search Bar */}
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[280px] relative">
                <MagnifyingGlass 
                  size={20} 
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" 
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="search-input"
                  placeholder="Search salons by name..."
                  className="w-full pl-12 pr-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800 transition-colors"
                />
              </div>
              
              {/* View Toggle */}
              <div className="flex bg-stone-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('list')}
                  data-testid="view-list"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  <List size={18} />
                  List
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  data-testid="view-map"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    viewMode === 'map'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  <MapTrifold size={18} />
                  Map
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="aspect-[4/3] bg-stone-200 rounded-xl mb-4" />
                <div className="h-6 bg-stone-200 rounded mb-2" />
                <div className="h-4 bg-stone-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : viewMode === 'list' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-stagger">
            {salons?.length > 0 ? (
              salons.map((salon) => (
                <SalonCard key={salon.id} salon={salon} />
              ))
            ) : (
              <div className="col-span-full text-center py-16">
                <MapPin size={64} weight="duotone" className="mx-auto text-stone-300 mb-4" />
                <h3 className="font-heading text-xl font-bold text-stone-700 mb-2">
                  No salons found
                </h3>
                <p className="text-stone-500">
                  Try adjusting your search or check back later
                </p>
              </div>
            )}
          </div>
        ) : (
          <MapView salons={salons || []} userLocation={userLocation} />
        )}
      </div>
    </div>
  );
};

const SalonCard = ({ salon }) => {
  const defaultImage = 'https://images.unsplash.com/photo-1626383137804-ff908d2753a2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MTJ8MHwxfHNlYXJjaHw0fHxzYWxvbiUyMGludGVyaW9yJTIwd2FybSUyMGxpZ2h0aW5nfGVufDB8fHx8MTc3NTY3NzQzNnww&ixlib=rb-4.1.0&q=85';
  
  const lowestPrice = salon.services?.length > 0 
    ? Math.min(...salon.services.map(s => s.price))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Link 
        to={`/salon/${salon.id}`}
        data-testid={`salon-card-${salon.id}`}
        className="block bg-white rounded-2xl overflow-hidden border border-stone-200 hover:shadow-xl transition-all duration-300"
      >
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={salon.images?.[0] || defaultImage}
            alt={salon.name}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          />
          {salon.distance && (
            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-medium text-stone-700">
              <NavigationArrow size={14} weight="bold" />
              {salon.distance} km
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-heading text-lg font-bold text-stone-900 line-clamp-1">
              {salon.name}
            </h3>
            {salon.avg_rating > 0 && (
              <div className="flex items-center gap-1 bg-emerald-100 px-2 py-1 rounded-lg">
                <Star size={14} weight="fill" className="text-emerald-700" />
                <span className="text-sm font-semibold text-emerald-800">
                  {salon.avg_rating}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-stone-500 text-sm mb-3">
            <MapPin size={16} weight="bold" />
            <span className="line-clamp-1">{salon.address}, {salon.city}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-stone-500 text-sm">
              <Clock size={16} weight="bold" />
              <span>{salon.opening_time} - {salon.closing_time}</span>
            </div>
            {lowestPrice && (
              <span className="text-orange-800 font-semibold">
                From {formatPrice(lowestPrice)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

const MapView = ({ salons, userLocation }) => {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="aspect-[16/9] bg-stone-100 flex items-center justify-center">
        <div className="text-center p-8">
          <MapTrifold size={64} weight="duotone" className="mx-auto text-stone-400 mb-4" />
          <h3 className="font-heading text-xl font-bold text-stone-700 mb-2">
            Map View Coming Soon
          </h3>
          <p className="text-stone-500 max-w-md mx-auto">
            Google Maps integration requires an API key. Please provide your Google Maps API key to enable this feature.
          </p>
          {salons.length > 0 && (
            <p className="text-sm text-stone-400 mt-4">
              {salons.length} salons found in your area
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerHome;
