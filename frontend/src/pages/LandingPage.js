import React from 'react';
import HeroSection from '../components/landing/sections/HeroSection';
import TrustStripSection from '../components/landing/sections/TrustStripSection';
import MarketAudienceSection from '../components/landing/sections/MarketAudienceSection';
import FeaturedSalonsSection from '../components/landing/sections/FeaturedSalonsSection';
import TrendingServicesSection from '../components/landing/sections/TrendingServicesSection';
import LocalSeoSections from '../components/landing/sections/LocalSeoSections';
import WhyTrimitSection from '../components/landing/sections/WhyTrimitSection';
import HowItWorksSection from '../components/landing/sections/HowItWorksSection';
import OffersSection from '../components/landing/sections/OffersSection';
import PaymentTrustSection from '../components/landing/sections/PaymentTrustSection';
import OwnerGrowthSection from '../components/landing/sections/OwnerGrowthSection';
import SocialProofSection from '../components/landing/sections/SocialProofSection';
import AppDownloadSection from '../components/landing/sections/AppDownloadSection';
import FaqSection from '../components/landing/sections/FaqSection';
import SeoContentSection from '../components/landing/sections/SeoContentSection';
import BlogPreviewSection from '../components/landing/sections/BlogPreviewSection';
import FinalCtaSection from '../components/landing/sections/FinalCtaSection';
import StickyMobileCta from '../components/landing/StickyMobileCta';

const LandingPage = () => (
  <div className="min-h-screen bg-stone-50 pb-20 md:pb-0">
    <HeroSection />
    <TrustStripSection />
    <MarketAudienceSection />
    <FeaturedSalonsSection
      title="Top rated in Jammu"
      subtitle="Men's salons, beauty parlours, and unisex studios with live slots — book in minutes."
    />
    <TrendingServicesSection />
    <LocalSeoSections />
    <WhyTrimitSection />
    <HowItWorksSection />
    <OffersSection />
    <PaymentTrustSection />
    <FeaturedSalonsSection
      title="Men's salons nearby"
      subtitle="Haircuts, beard grooming, and men's packages — verified listings in Jammu."
      gender_serve="men"
      sectionId="featured-men"
      eyebrow="Men's grooming"
    />
    <FeaturedSalonsSection
      title="Beauty parlours in Jammu"
      subtitle="Facials, threading, waxing, and hair styling — book women's beauty parlours online."
      gender_serve="women"
      sectionId="featured-women"
      eyebrow="Beauty parlours"
    />
    <FeaturedSalonsSection
      title="Nearby businesses"
      subtitle="Discover salons and beauty parlours near you across Jammu & Kashmir — enable location for best results."
      sort="distance"
      sectionId="featured-nearby"
      eyebrow="Near you"
    />
    <OwnerGrowthSection />
    <SocialProofSection />
    <AppDownloadSection />
    <FaqSection title="Salons, beauty parlours & booking in Jammu — FAQs" />
    <SeoContentSection />
    <BlogPreviewSection />
    <FinalCtaSection />
    <StickyMobileCta />
  </div>
);

export default LandingPage;
