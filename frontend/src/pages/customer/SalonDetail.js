import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Star, 
  Clock, 
  Phone, 
  ArrowLeft,
  Scissors,
  Timer,
  CurrencyInr,
  User,
  CalendarCheck
} from '@phosphor-icons/react';
import api from '../../lib/api';
import { formatPrice, formatDate } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { ENABLE_SUBSCRIPTION_ENFORCEMENT } from '../../lib/featureFlags';
import { groupServicesByCategory } from '../../lib/serviceCategories';

const SalonDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const { data: salon, isLoading, error } = useQuery({
    queryKey: ['salon', id],
    queryFn: async () => {
      const response = await api.get(`/salons/${id}`);
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="aspect-[21/9] bg-stone-200 rounded-2xl mb-8" />
            <div className="h-10 bg-stone-200 rounded mb-4" />
            <div className="h-6 bg-stone-200 rounded w-1/2 mb-8" />
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-stone-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !salon) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-8">
        <div className="text-center">
          <Scissors size={64} weight="duotone" className="mx-auto text-stone-300 mb-4" />
          <h2 className="font-heading text-2xl font-bold text-stone-700 mb-2">
            Salon Not Found
          </h2>
          <p className="text-stone-500 mb-6">
            The salon you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/explore" className="btn-primary">
            Back to Explore
          </Link>
        </div>
      </div>
    );
  }

  const defaultImage = 'https://images.unsplash.com/photo-1626383137804-ff908d2753a2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MTJ8MHwxfHNlYXJjaHw0fHxzYWxvbiUyMGludGVyaW9yJTIwd2FybSUyMGxpZ2h0aW5nfGVufDB8fHx8MTc3NTY3NzQzNnww&ixlib=rb-4.1.0&q=85';

  const bookTarget = (serviceId) =>
    isAuthenticated
      ? `/booking/${salon.id}/${serviceId}`
      : `/login?redirect=${encodeURIComponent(`/booking/${salon.id}/${serviceId}`)}`;

  const serviceSections = groupServicesByCategory(
    salon.services ?? [],
    salon.service_categories ?? [],
  );

  return (
    <div className="min-h-screen bg-stone-50 pb-24" data-testid="salon-detail">
      {!isAuthenticated && (
        <motion.div className="sticky top-16 z-30 bg-orange-800 text-white px-4 py-3 text-center text-sm">
          <Link to="/signup" className="font-bold underline underline-offset-2">
            Sign up free
          </Link>{' '}
          to book at {salon.name}
        </motion.div>
      )}
      {/* Hero Image */}
      <div className="relative h-[40vh] min-h-[300px]">
        <img
          src={salon.images?.[0] || defaultImage}
          alt={salon.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-stone-900/30 to-transparent" />
        
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          data-testid="back-btn"
          className="absolute top-4 left-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors"
        >
          <ArrowLeft size={20} className="text-stone-700" />
        </button>

        {/* Salon Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3 mb-2">
                {salon.avg_rating > 0 && (
                  <div className="flex items-center gap-1 bg-emerald-500 px-2.5 py-1 rounded-lg">
                    <Star size={16} weight="fill" className="text-white" />
                    <span className="text-sm font-bold text-white">
                      {salon.avg_rating}
                    </span>
                    <span className="text-xs text-emerald-100">
                      ({salon.review_count} reviews)
                    </span>
                  </div>
                )}
              </div>
              <h1 className="font-heading text-3xl md:text-4xl font-bold text-white mb-2">
                {salon.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-stone-200">
                <span className="flex items-center gap-1.5">
                  <MapPin size={18} weight="bold" />
                  {salon.address}, {salon.city}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={18} weight="bold" />
                  {salon.opening_time} - {salon.closing_time}
                </span>
                <a 
                  href={`tel:${salon.phone}`}
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <Phone size={18} weight="bold" />
                  {salon.phone}
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {ENABLE_SUBSCRIPTION_ENFORCEMENT && salon.subscription_active === false && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <span className="text-lg">🔒</span>
            <p className="text-sm font-medium">
              This salon is currently unavailable for booking. Please check back later.
            </p>
          </div>
        )}

        {/* Description */}
        {salon.description && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <p className="text-stone-600 leading-relaxed">{salon.description}</p>
          </motion.div>
        )}

        {/* Services */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="font-heading text-2xl font-bold text-stone-900 mb-6">
            Services
          </h2>

          {serviceSections.length > 0 ? (
            <div className="space-y-8">
              {serviceSections.map((section) => (
                <div key={section.categoryId ?? section.title}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-4">
                    {section.title}
                  </h3>
                  <div className="space-y-4">
                    {section.data.map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className={`rounded-2xl p-5 transition-all duration-300 ${
                    service.is_on_offer 
                      ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-300 shadow-lg' 
                      : 'bg-white border border-stone-200 hover:shadow-lg'
                  }`}
                >
                  {/* Offer Badge */}
                  {service.is_on_offer && service.discount_percentage && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-orange-600 to-red-600 text-white text-xs font-bold rounded-full">
                        🔥 {service.discount_percentage}% OFF
                      </span>
                      {service.offer_end_date && (
                        <span className="text-xs text-orange-700">
                          Ends {new Date(service.offer_end_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    {service.image_url && (
                      <img
                        src={service.image_url}
                        alt={service.name}
                        loading="lazy"
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover mr-4 flex-shrink-0 border border-stone-200"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-heading text-lg font-bold text-stone-900 mb-1">
                        {service.name}
                      </h3>
                      {service.description && (
                        <p className="text-sm text-stone-500 mb-3">
                          {service.description}
                        </p>
                      )}
                      
                      {/* Offer Tagline */}
                      {service.is_on_offer && service.offer_tagline && (
                        <p className="text-xs text-orange-700 italic mb-3">
                          🏷 {service.offer_tagline}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1.5 text-stone-600">
                          <Timer size={16} weight="bold" />
                          {service.duration} mins
                        </span>
                        <span className="flex items-center gap-2">
                          {service.is_on_offer && service.original_price ? (
                            <>
                              <span className="text-stone-400 line-through text-sm">
                                {formatPrice(service.original_price)}
                              </span>
                              <span className="font-bold text-orange-800 text-lg">
                                {formatPrice(service.price)}
                              </span>
                            </>
                          ) : (
                            <span className="font-semibold text-orange-800">
                              {formatPrice(service.price)}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                    {ENABLE_SUBSCRIPTION_ENFORCEMENT && salon.subscription_active === false ? (
                      <button
                        type="button"
                        disabled
                        data-testid={`book-service-${service.id}`}
                        className="text-sm px-5 py-2.5 flex items-center gap-2 rounded-full font-semibold bg-stone-200 text-stone-400 cursor-not-allowed"
                      >
                        <CalendarCheck size={18} />
                        Unavailable
                      </button>
                    ) : (
                      <Link
                        to={bookTarget(service.id)}
                        data-testid={`book-service-${service.id}`}
                        className={`text-sm px-5 py-2.5 flex items-center gap-2 rounded-full font-semibold transition-all ${
                          service.is_on_offer
                            ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-700 hover:to-red-700'
                            : 'btn-primary'
                        }`}
                      >
                        <CalendarCheck size={18} />
                        {isAuthenticated ? 'Book now' : 'Sign in to book'}
                      </Link>
                    )}
                  </div>
                </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
              <Scissors size={48} weight="duotone" className="mx-auto text-stone-300 mb-3" />
              <p className="text-stone-500">No services available at the moment</p>
            </div>
          )}
        </motion.div>

        {/* Reviews */}
        {salon.reviews?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-12"
          >
            <h2 className="font-heading text-2xl font-bold text-stone-900 mb-6">
              Reviews
            </h2>
            <div className="space-y-4">
              {salon.reviews.map((review, index) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  className="bg-white rounded-2xl border border-stone-200 p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center">
                      <User size={20} className="text-stone-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-stone-900">
                          {review.users?.name || 'Anonymous'}
                        </span>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              weight={i < review.rating ? 'fill' : 'regular'}
                              className={i < review.rating ? 'text-amber-400' : 'text-stone-300'}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-stone-600 text-sm">{review.comment}</p>
                      )}
                      <span className="text-xs text-stone-400 mt-2 block">
                        {formatDate(review.created_at)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SalonDetail;
