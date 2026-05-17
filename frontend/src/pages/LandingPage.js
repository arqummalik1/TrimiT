import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPin,
  Calendar,
  CreditCard,
  Star,
  ArrowRight,
  Storefront,
  Users,
  Sparkle,
  Clock,
  ShieldCheck,
} from '@phosphor-icons/react';
import { useAuthStore } from '../store/authStore';
import StoreDownloadLinks from '../components/StoreDownloadLinks';
import TrimitLogo from '../components/brand/TrimitLogo';
import { LazyImage } from '../components/ui/LazyImage';
import { LANDING_HERO } from '../lib/landingAssets';
import { HeroAccentIllustration, StepIllustration } from '../components/landing/LandingIllustrations';
import { ServiceIllustration } from '../components/landing/ServiceIllustrations';

const features = [
  {
    icon: MapPin,
    title: 'Discover Nearby',
    description: 'Find top-rated salons around you with smart location search.',
    accent: 'from-orange-50 to-amber-50',
  },
  {
    icon: Calendar,
    title: 'Easy Booking',
    description: 'Pick a slot in seconds — live availability, no phone tag.',
    accent: 'from-stone-50 to-orange-50/80',
  },
  {
    icon: CreditCard,
    title: 'Secure Payments',
    description: 'Pay in-app with confidence when online pay is enabled.',
    accent: 'from-emerald-50/80 to-stone-50',
  },
  {
    icon: Star,
    title: 'Verified Reviews',
    description: 'Real feedback from customers who actually visited.',
    accent: 'from-amber-50 to-orange-50',
  },
];

const services = [
  {
    name: 'Haircut & styling',
    icon: Sparkle,
    illustration: 'haircut',
    gradient: 'from-amber-100 via-orange-50 to-stone-100',
    ring: 'ring-orange-200/60',
  },
  {
    name: 'Spa & wellness',
    icon: Clock,
    illustration: 'spa',
    gradient: 'from-stone-100 via-rose-50 to-orange-50',
    ring: 'ring-stone-200/80',
  },
  {
    name: 'Beard grooming',
    icon: ShieldCheck,
    illustration: 'beard',
    gradient: 'from-orange-100 via-amber-50 to-stone-50',
    ring: 'ring-amber-200/60',
  },
  {
    name: 'Skin & facial',
    icon: Star,
    illustration: 'facial',
    gradient: 'from-rose-50 via-orange-50 to-amber-50',
    ring: 'ring-rose-200/50',
  },
];

const steps = [
  { n: 1, title: 'Discover', text: 'Browse salons, services, and reviews near you.' },
  { n: 2, title: 'Book', text: 'Choose a time slot that fits your schedule.' },
  { n: 3, title: 'Enjoy', text: 'Show up, get the service, rate your experience.' },
];

const stats = [
  { value: '30 min', label: 'Average booking time' },
  { value: '24/7', label: 'Book anytime' },
  { value: '100%', label: 'Salon-verified listings' },
];

const LandingPage = () => {
  const { isAuthenticated, profile } = useAuthStore();

  const getStartedLink = () => {
    if (!isAuthenticated) return '/signup';
    return profile?.role === 'owner' ? '/owner/dashboard' : '/discover';
  };

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = LANDING_HERO.preloadHref;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Hero */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <LazyImage
            src={LANDING_HERO.src}
            srcSet={LANDING_HERO.srcSet}
            sizes={LANDING_HERO.sizes}
            alt=""
            priority
            className="w-full h-full object-cover"
            wrapperClassName="absolute inset-0"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-stone-950/85 via-stone-900/70 to-orange-950/80" />
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 30%, #fb923c 0%, transparent 45%), radial-gradient(circle at 80% 70%, #ea580c 0%, transparent 40%)',
            }}
          />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <TrimitLogo
                variant="icon-text"
                tone="dark"
                asLink={false}
                iconClassName="h-11 w-11 sm:h-12 sm:w-12"
                className="mb-6"
              />
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-orange-200 text-xs font-semibold tracking-widest uppercase mb-5">
                <Sparkle size={14} weight="fill" />
                Premium salon booking
              </span>
              <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-[1.05] tracking-tight mb-6">
                Book your perfect
                <span className="block text-orange-400 mt-1">salon experience</span>
              </h1>
              <p className="text-lg text-stone-200/95 max-w-xl leading-relaxed mb-8">
                Discover salons, reserve your slot, and manage appointments — one elegant app for
                customers and owners across India.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to={getStartedLink()}
                  data-testid="hero-get-started"
                  className="btn-primary inline-flex items-center justify-center gap-2 text-base sm:text-lg px-8 py-4 shadow-lg shadow-orange-900/30"
                >
                  <Users size={22} weight="bold" />
                  Find salons
                  <ArrowRight size={20} weight="bold" />
                </Link>
                <Link
                  to="/signup?role=owner"
                  data-testid="hero-list-salon"
                  className="inline-flex items-center justify-center gap-2 text-base sm:text-lg px-8 py-4 rounded-full font-semibold text-white bg-white/10 border border-white/25 backdrop-blur-md hover:bg-white/20 transition-all"
                >
                  <Storefront size={22} weight="duotone" />
                  List your salon
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="hidden lg:flex justify-center"
            >
              <div className="relative">
                <div className="absolute -inset-4 bg-orange-500/20 rounded-full blur-3xl" />
                <HeroAccentIllustration className="w-[min(100%,380px)] h-auto drop-shadow-2xl" />
              </div>
            </motion.div>
          </div>
        </div>

        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2.2 }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-white/40 flex justify-center pt-2">
            <div className="w-1 h-2 rounded-full bg-white/80" />
          </div>
        </motion.div>
      </section>

      {/* Stats strip */}
      <section className="relative z-20 -mt-8 mx-4 sm:mx-6 lg:mx-8 max-w-6xl lg:mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white rounded-2xl shadow-xl shadow-stone-900/5 border border-stone-200/80 p-6 sm:p-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center sm:text-left sm:px-4 sm:border-r sm:border-stone-100 last:border-0">
              <p className="font-heading text-2xl sm:text-3xl font-bold text-orange-800">{s.value}</p>
              <p className="text-sm text-stone-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 bg-white mt-12">
        <motion.div className="max-w-6xl mx-auto text-center mb-16">
          <span className="text-xs font-bold tracking-[0.2em] uppercase text-orange-800">Why TrimiT</span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-stone-900 mt-3 mb-4">
            Everything you need
          </h2>
          <p className="text-stone-500 text-lg max-w-2xl mx-auto">
            A polished journey from discovery to booking — built for speed and trust.
          </p>
        </motion.div>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`rounded-2xl border border-stone-200/80 p-8 bg-gradient-to-br ${f.accent} hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}
            >
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-5 ring-1 ring-stone-200/60">
                <f.icon size={28} weight="duotone" className="text-orange-800" />
              </div>
              <h3 className="font-heading text-lg font-bold text-stone-900 mb-2">{f.title}</h3>
              <p className="text-stone-600 text-sm leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* What we offer — premium inline illustrations (fast, no external images) */}
      <section className="py-24 px-4 bg-stone-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-orange-800">Services</span>
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-stone-900 mt-3">What we offer</h2>
            <p className="text-stone-500 mt-3 max-w-xl mx-auto">
              From quick trims to full spa days — book the experience that fits you.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {services.map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className={`relative aspect-[4/5] rounded-3xl overflow-hidden bg-gradient-to-br ${s.gradient} ring-1 ${s.ring} group hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}
              >
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/50 blur-2xl group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute -left-4 bottom-20 w-20 h-20 rounded-full bg-orange-200/30 blur-xl" />
                <motion.div className="relative h-full flex flex-col">
                  <div className="flex items-center p-4 sm:p-5 pb-0">
                    <div className="w-11 h-11 rounded-xl bg-white/95 shadow-md flex items-center justify-center ring-1 ring-white/80">
                      <s.icon size={22} weight="duotone" className="text-orange-800" />
                    </div>
                  </div>
                  <div className="flex-1 flex items-center justify-center px-3 py-2 min-h-[120px]">
                    <ServiceIllustration
                      type={s.illustration}
                      className="w-full h-full max-h-[min(52vw,200px)] drop-shadow-sm group-hover:scale-[1.03] transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4 sm:p-5 pt-2 bg-gradient-to-t from-white/80 via-white/50 to-transparent">
                    <h3 className="font-heading text-base sm:text-lg font-bold text-stone-900 leading-snug">
                      {s.name}
                    </h3>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 bg-white border-y border-stone-100">
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-16">
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-orange-800">How it works</span>
            <h2 className="font-heading text-4xl font-bold text-stone-900 mt-3">Three simple steps</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-10">
            {steps.map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <StepIllustration step={step.n} className="w-28 h-28 mx-auto mb-6" />
                <span className="text-xs font-bold text-orange-800">Step {step.n}</span>
                <h3 className="font-heading text-xl font-bold text-stone-900 mt-2 mb-2">{step.title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed max-w-xs mx-auto">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* For salons */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto rounded-3xl bg-gradient-to-r from-stone-900 to-orange-950 p-10 sm:p-14 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1 text-center md:text-left">
            <TrimitLogo variant="icon" tone="dark" asLink={false} iconClassName="h-14 w-14 mb-6" showWordmark={false} />
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-4">Grow your salon</h2>
            <p className="text-stone-300 leading-relaxed">
              Owners get a dedicated dashboard for bookings, services, and schedules — all in one place.
            </p>
          </div>
          <Link
            to="/signup?role=owner"
            className="shrink-0 inline-flex items-center gap-2 px-8 py-4 bg-white text-orange-900 rounded-full font-bold hover:bg-orange-50 transition-colors"
          >
            Partner with us
            <ArrowRight size={20} weight="bold" />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 bg-orange-800">
        <div className="max-w-4xl mx-auto text-center">
          <TrimitLogo
            variant="icon"
            asLink={false}
            tone="dark"
            iconClassName="h-16 w-16 mx-auto mb-6"
            showWordmark={false}
          />
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-white mb-6">Ready to look your best?</h2>
          <p className="text-orange-100 text-lg mb-8 max-w-2xl mx-auto">
            Join customers and salon owners who book smarter with TrimiT.
          </p>
          <Link
            to={getStartedLink()}
            data-testid="cta-get-started"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-orange-800 rounded-full font-bold text-lg hover:bg-orange-50 transition-colors shadow-lg"
          >
            Get started now
            <ArrowRight size={24} weight="bold" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-stone-900 text-stone-400">
        <div className="max-w-6xl mx-auto text-center">
          <TrimitLogo
            variant="icon-text"
            tone="dark"
            asLink
            iconClassName="h-9 w-9"
            className="justify-center mb-6"
          />
          <p className="text-sm font-medium text-stone-300 mb-4">Get the app</p>
          <StoreDownloadLinks variant="dark" />
          <p className="text-sm mt-8">&copy; {new Date().getFullYear()} TrimiT. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
