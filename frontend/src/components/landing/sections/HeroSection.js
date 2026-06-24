import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Sparkle, Storefront, Users, ArrowRight, MagnifyingGlass, MapPin, Timer } from '@phosphor-icons/react';
import { LazyImage } from '../../ui/LazyImage';
import { LANDING_HERO } from '../../../lib/landingAssets';
import { HeroAccentIllustration } from '../LandingIllustrations';
import PhoneMockup from '../mockups/PhoneMockup';
import AnimatedCounter from '../AnimatedCounter';
import { JAMMU_CITY, explorePath } from '../../../config/jammu';
import { PROMO, isOfferActive } from '../../../config/promotions';

export default function HeroSection() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { scrollY } = useScroll();
  const bgScale = useTransform(scrollY, [0, 400], [1, 1.08]);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = LANDING_HERO.preloadHref;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(explorePath({ q: query.trim() }));
  };

  const stagger = {
    hidden: { opacity: 0, y: 20 },
    show: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.55 } }),
  };

  return (
    <section className="relative min-h-[88vh] sm:min-h-[94vh] flex items-center overflow-hidden">
      <motion.div className="absolute inset-0" style={{ scale: bgScale }}>
        <LazyImage
          src={LANDING_HERO.src}
          srcSet={LANDING_HERO.srcSet}
          sizes={LANDING_HERO.sizes}
          alt=""
          priority
          className="w-full h-full object-cover"
          wrapperClassName="absolute inset-0"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-stone-950/90 via-stone-900/75 to-orange-950/85 animate-gradient-shift" />
        <motion.div
          className="absolute inset-0 opacity-20"
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 30%, #fb923c 0%, transparent 50%), radial-gradient(circle at 80% 70%, #ea580c 0%, transparent 45%)',
            backgroundSize: '200% 200%',
          }}
        />
      </motion.div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-10 items-center">
          <div>
            <motion.div custom={0} initial="hidden" animate="show" variants={stagger}>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-dark text-orange-200 text-xs font-semibold tracking-widest uppercase">
                <Sparkle size={14} weight="fill" className="text-orange-300" />
                Salon booking in {JAMMU_CITY.region}
              </span>
            </motion.div>

            <motion.h1
              custom={1}
              initial="hidden"
              animate="show"
              variants={stagger}
              className="font-heading text-3xl sm:text-5xl md:text-6xl font-extrabold text-white leading-[1.05] tracking-tight mt-6 mb-5"
            >
              Book premium salons in{' '}
              <span className="text-orange-400">{JAMMU_CITY.label}</span> within minutes
            </motion.h1>

            <motion.p
              custom={2}
              initial="hidden"
              animate="show"
              variants={stagger}
              className="text-base sm:text-lg text-stone-200/95 max-w-xl leading-relaxed mb-6"
            >
              Discover verified salons, check live slots, and get instant appointment confirmation —
              haircut, beard grooming, spa, and bridal services across Jammu.
            </motion.p>

            <motion.form
              custom={3}
              initial="hidden"
              animate="show"
              variants={stagger}
              onSubmit={handleSearch}
              className="rounded-2xl glass-dark p-2 sm:p-2.5 flex flex-col sm:flex-row gap-2 mb-6 max-w-xl shadow-2xl"
            >
              <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
                <MagnifyingGlass size={20} className="text-orange-300 shrink-0" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Haircut, beard, spa..."
                  className="w-full bg-transparent text-white placeholder:text-stone-400 text-sm sm:text-base focus:outline-none"
                  aria-label="Search salons or services"
                />
              </div>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 sm:max-w-[140px]">
                <MapPin size={18} className="text-orange-300 shrink-0" />
                <span className="text-sm font-medium text-white">{JAMMU_CITY.label}</span>
              </div>
              <button
                type="submit"
                className="btn-primary shrink-0 px-6 py-3 text-sm sm:text-base"
                data-testid="hero-search-submit"
              >
                Search
              </button>
            </motion.form>

            <motion.div
              custom={4}
              initial="hidden"
              animate="show"
              variants={stagger}
              className="flex flex-wrap gap-2 mb-8 text-xs text-stone-300"
            >
              {['Verified listings', 'Live availability', 'Pay at salon'].map((badge) => (
                <span
                  key={badge}
                  className="px-3 py-1 rounded-full bg-white/10 border border-white/15"
                >
                  {badge}
                </span>
              ))}
              {isOfferActive() && (
                <span className="px-3 py-1 rounded-full bg-orange-500/30 border border-orange-400/40 text-orange-200 font-semibold flex items-center gap-1">
                  <Timer size={11} weight="fill" />
                  30 Days Free for Salons
                </span>
              )}
            </motion.div>

            <motion.div
              custom={5}
              initial="hidden"
              animate="show"
              variants={stagger}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Link
                to={explorePath()}
                data-testid="hero-get-started"
                className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base px-8 py-4 shadow-lg shadow-orange-900/40"
              >
                <Users size={22} weight="bold" />
                Find salons
                <ArrowRight size={20} weight="bold" />
              </Link>
              <Link
                to={PROMO.ctaPath}
                data-testid="hero-list-salon"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base px-8 py-4 rounded-full font-bold text-white bg-white/10 border border-white/25 backdrop-blur-md hover:bg-white/20 transition-all"
              >
                <Storefront size={22} weight="duotone" />
                {isOfferActive() ? PROMO.ctaLabel : 'List your salon free'}
              </Link>
            </motion.div>

            {isOfferActive() && (
              <motion.div
                custom={6}
                initial="hidden"
                animate="show"
                variants={stagger}
                className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl"
              >
                <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/25 backdrop-blur-sm">
                  <span className="text-xl shrink-0">✅</span>
                  <div>
                    <p className="text-sm font-bold text-white">Free for Customers</p>
                    <p className="text-xs text-stone-300 mt-0.5">Download & book salons. Always free.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-orange-500/15 border border-orange-400/25 backdrop-blur-sm">
                  <span className="text-xl shrink-0">🏪</span>
                  <div>
                    <p className="text-sm font-bold text-white">Free Onboarding for Salons</p>
                    <p className="text-xs text-stone-300 mt-0.5">₹0 setup. 30 days free trial. No credit card.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <motion.div
            className="relative hidden lg:block min-h-[420px]"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.85, delay: 0.2 }}
          >
            <div className="absolute -inset-8 bg-orange-500/25 rounded-full blur-3xl" />
            <HeroAccentIllustration className="relative z-10 w-[min(100%,340px)] mx-auto h-auto drop-shadow-2xl" />
            <PhoneMockup className="absolute right-0 top-8 z-20" />
            <motion.div
              className="absolute left-0 top-4 glass-dark rounded-2xl px-4 py-3 border border-white/15 z-20"
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3.2 }}
            >
              <p className="text-2xl font-heading font-bold text-white">
                <AnimatedCounter end={4.9} decimals={1} />
                <span className="text-orange-400">★</span>
              </p>
              <p className="text-xs text-stone-300">Average rating</p>
            </motion.div>
            <motion.div
              className="absolute left-4 bottom-16 glass-dark rounded-2xl px-4 py-3 border border-white/15 z-20"
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 3.8, delay: 0.5 }}
            >
              <p className="text-2xl font-heading font-bold text-white">
                <AnimatedCounter end={1000} suffix="+" />
              </p>
              <p className="text-xs text-stone-300">Bookings on TrimiT</p>
            </motion.div>
            <motion.div
              className="absolute right-4 bottom-8 glass-dark rounded-2xl px-4 py-3 border border-white/15 z-20"
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4.1, delay: 0.3 }}
            >
              <p className="text-lg font-heading font-bold text-emerald-400">24/7</p>
              <p className="text-xs text-stone-300">Online booking</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
