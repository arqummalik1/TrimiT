import React from 'react';
import HeroSection from '../components/landing/sections/HeroSection';
import TrustStripSection from '../components/landing/sections/TrustStripSection';
import FeaturedSalonsSection from '../components/landing/sections/FeaturedSalonsSection';
import TrendingServicesSection from '../components/landing/sections/TrendingServicesSection';
import LocalSeoSections from '../components/landing/sections/LocalSeoSections';
import WhyTrimitSection from '../components/landing/sections/WhyTrimitSection';
import HowItWorksSection from '../components/landing/sections/HowItWorksSection';
import OffersSection from '../components/landing/sections/OffersSection';
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
    <FeaturedSalonsSection />
    <TrendingServicesSection />
    <LocalSeoSections />
    <WhyTrimitSection />
    <HowItWorksSection />
    <OffersSection />
    <FeaturedSalonsSection
      title="Nearby salons"
      subtitle="Discover salons near you across Jammu &amp; Kashmir — enable location for best results."
      sort="distance"
    />
    <OwnerGrowthSection />
    <SocialProofSection />
    <AppDownloadSection />
    <FaqSection />
    <SeoContentSection />
    <BlogPreviewSection />
    <FinalCtaSection />
    <StickyMobileCta />
  </div>
);

export default LandingPage;
