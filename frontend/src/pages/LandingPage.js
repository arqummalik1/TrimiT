import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Scissors, 
  MapPin, 
  Calendar, 
  CreditCard, 
  Star, 
  ArrowRight,
  Storefront,
  Users
} from '@phosphor-icons/react';
import { useAuthStore } from '../store/authStore';

const LandingPage = () => {
  const { isAuthenticated, profile } = useAuthStore();

  const features = [
    {
      icon: MapPin,
      title: 'Discover Nearby',
      description: 'Find the best salons near you with real-time location search',
    },
    {
      icon: Calendar,
      title: 'Easy Booking',
      description: 'Book your preferred time slot in seconds, no hassle',
    },
    {
      icon: CreditCard,
      title: 'Secure Payments',
      description: 'Pay online safely with multiple payment options',
    },
    {
      icon: Star,
      title: 'Verified Reviews',
      description: 'Read genuine reviews from real customers',
    },
  ];

  const getStartedLink = () => {
    return !isAuthenticated ? '/signup' : profile?.role === 'owner' ? '/owner/dashboard' : '/discover';
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1626383137804-ff908d2753a2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MTJ8MHwxfHNlYXJjaHw0fHxzYWxvbiUyMGludGVyaW9yJTIwd2FybSUyMGxpZ2h0aW5nfGVufDB8fHx8MTc3NTY3NzQzNnww&ixlib=rb-4.1.0&q=85)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-stone-900/60 via-stone-900/40 to-stone-900/80" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="uppercase text-xs tracking-[0.2em] font-bold text-orange-400 mb-4 block">
              Your Beauty Destination
            </span>
            <h1 className="font-heading text-5xl md:text-7xl font-extrabold text-white mb-6 leading-none tracking-tight">
              Book Your Perfect
              <br />
              <span className="text-orange-400">Salon Experience</span>
            </h1>
            <p className="text-lg md:text-xl text-stone-200 mb-8 max-w-2xl mx-auto leading-relaxed">
              Discover and book appointments at the best salons near you. 
              From haircuts to spa treatments, find it all in one place.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to={getStartedLink()}
                data-testid="hero-get-started"
                className="btn-primary flex items-center gap-2 text-lg px-8 py-4"
              >
                <Users size={24} />
                Find Salons
                <ArrowRight size={20} />
              </Link>
              <Link
                to="/signup?role=owner"
                data-testid="hero-list-salon"
                className="flex items-center gap-2 text-lg px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-full font-semibold hover:bg-white/20 transition-all border border-white/30"
              >
                <Storefront size={24} />
                List Your Salon
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-white/50 flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-white/80 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="uppercase text-xs tracking-[0.2em] font-bold text-orange-800 mb-4 block">
              Why Choose Us
            </span>
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-stone-900 mb-4">
              Everything You Need
            </h2>
            <p className="text-stone-500 text-lg max-w-2xl mx-auto">
              A seamless experience from discovery to booking, designed with your convenience in mind
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="card p-8 text-center group"
              >
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-orange-800 transition-colors">
                  <feature.icon 
                    size={32} 
                    weight="duotone" 
                    className="text-orange-800 group-hover:text-white transition-colors" 
                  />
                </div>
                <h3 className="font-heading text-xl font-bold text-stone-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-stone-500 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="py-24 px-4 bg-stone-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="uppercase text-xs tracking-[0.2em] font-bold text-orange-800 mb-4 block">
              Popular Services
            </span>
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-stone-900">
              What We Offer
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[
              { name: 'Haircut', image: 'https://images.unsplash.com/photo-1511920922889-5c35bfd95a7f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHwyfHxoYWlyJTIwc3R5bGlzdCUyMGN1dHRpbmclMjBoYWlyfGVufDB8fHx8MTc3NTY3NzQzNnww&ixlib=rb-4.1.0&q=85' },
              { name: 'Spa & Massage', image: 'https://images.unsplash.com/photo-1559185590-765cdc663325?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODh8MHwxfHNlYXJjaHw0fHxzcGElMjBtYXNzYWdlJTIwd2VsbG5lc3N8ZW58MHx8fHwxNzc1Njc3NDM2fDA&ixlib=rb-4.1.0&q=85' },
              { name: 'Beard Grooming', image: 'https://images.unsplash.com/photo-1629794138560-46d2815a6d79?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjh8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMG5hdHVyYWwlMjBsaWdodGluZ3xlbnwwfHx8fDE3NzU2Nzc0NDZ8MA&ixlib=rb-4.1.0&q=85' },
              { name: 'Facial Treatment', image: 'https://images.unsplash.com/photo-1679943350848-e58bad25c130?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjh8MHwxfHNlYXJjaHwyfHxwb3J0cmFpdCUyMG5hdHVyYWwlMjBsaWdodGluZ3xlbnwwfHx8fDE3NzU2Nzc0NDZ8MA&ixlib=rb-4.1.0&q=85' },
            ].map((service, index) => (
              <motion.div
                key={service.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="relative aspect-square rounded-3xl overflow-hidden group cursor-pointer"
              >
                <img 
                  src={service.image} 
                  alt={service.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="font-heading text-lg font-bold text-white">
                    {service.name}
                  </h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-orange-800">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Scissors size={64} weight="duotone" className="text-orange-200 mx-auto mb-6" />
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Look Your Best?
            </h2>
            <p className="text-orange-100 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of happy customers who trust TrimiT for their grooming needs
            </p>
            <Link
              to={getStartedLink()}
              data-testid="cta-get-started"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-orange-800 rounded-full font-bold text-lg hover:bg-orange-50 transition-colors"
            >
              Get Started Now
              <ArrowRight size={24} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-stone-900 text-stone-400">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-orange-800 rounded-lg flex items-center justify-center">
              <Scissors size={18} weight="bold" className="text-white" />
            </div>
            <span className="font-heading text-lg font-bold text-white">TrimiT</span>
          </div>
          <p className="text-sm">
            &copy; 2025 TrimiT. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
