import React from 'react';
import { motion } from 'framer-motion';
import { DeviceMobile, GooglePlayLogo } from '@phosphor-icons/react';
import PhoneMockup from '../mockups/PhoneMockup';
import { DOWNLOAD_APP_URL } from '../../../config/storeLinks';

export default function AppDownloadSection() {
  return (
    <section className="py-16 sm:py-20 px-4 bg-white border-y border-stone-100">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        <div className="text-center md:text-left">
          <DeviceMobile size={36} weight="duotone" className="text-orange-800 mx-auto md:mx-0 mb-4" />
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-stone-900 mb-4">
            Get TrimiT on Android
          </h2>
          <p className="text-stone-600 leading-relaxed mb-8 max-w-md mx-auto md:mx-0">
            Book appointments faster in Jammu, manage bookings, and receive real-time updates from
            the mobile app. iOS support is coming soon.
          </p>
          <a
            href={DOWNLOAD_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-orange-800 text-white font-semibold hover:bg-orange-900 transition-colors shadow-md"
            data-testid="landing-download-android"
          >
            <GooglePlayLogo size={24} weight="fill" />
            Download for Android
          </a>
        </div>
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <PhoneMockup />
        </motion.div>
      </div>
    </section>
  );
}
