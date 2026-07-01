import React from 'react';
import { EnvelopeSimple, Phone, InstagramLogo, FacebookLogo } from '@phosphor-icons/react';
import MarkdownView from '../../components/MarkdownView';
import { CONTACT_MD } from '../../legal/content';
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_PHONE_DISPLAY,
  SOCIAL_INSTAGRAM,
  SOCIAL_FACEBOOK,
} from '../../config/contact';

const ContactPage = () => (
  <div className="min-h-screen bg-stone-50">
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 p-6 bg-white rounded-2xl border border-stone-200 shadow-sm">
        <h1 className="font-heading text-2xl font-bold text-stone-900 mb-2">Contact Us</h1>
        <p className="text-stone-600 text-sm mb-4">
          Reach our team for bookings, salon listings, or account help.
        </p>
        <div className="mb-4 p-4 rounded-2xl border border-stone-200 bg-stone-50">
          <p className="text-xs uppercase tracking-wide text-stone-400 font-semibold mb-1">
            Business / Legal Entity
          </p>
          <p className="text-sm font-semibold text-stone-900">KALSOOM AKHTER</p>
          <p className="text-xs text-stone-500 mt-1">
            Registered operator of TrimiT.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Email Card */}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100 hover:border-orange-200 hover:shadow-sm transition-all text-center group"
          >
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-orange-100 text-orange-800 group-hover:scale-110 transition-transform">
              <EnvelopeSimple size={24} weight="duotone" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-900">Email Support</h2>
              <p className="text-sm text-stone-500 mt-1">{SUPPORT_EMAIL}</p>
            </div>
          </a>

          {/* Phone Card */}
          <a
            href={`tel:${SUPPORT_PHONE}`}
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100 hover:border-orange-200 hover:shadow-sm transition-all text-center group"
          >
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-800 group-hover:scale-110 transition-transform">
              <Phone size={24} weight="duotone" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-900">Call Us</h2>
              <p className="text-sm text-stone-500 mt-1">{SUPPORT_PHONE_DISPLAY}</p>
            </div>
          </a>

          {/* Instagram Card */}
          <a
            href={SOCIAL_INSTAGRAM}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100 hover:border-orange-200 hover:shadow-sm transition-all text-center group"
          >
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-pink-100 text-pink-600 group-hover:scale-110 transition-transform">
              <InstagramLogo size={24} weight="duotone" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-900">Instagram</h2>
              <p className="text-sm text-stone-500 mt-1">@trimit.online</p>
            </div>
          </a>

          {/* Facebook Card */}
          <a
            href={SOCIAL_FACEBOOK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100 hover:border-orange-200 hover:shadow-sm transition-all text-center group"
          >
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
              <FacebookLogo size={24} weight="duotone" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-900">Facebook</h2>
              <p className="text-sm text-stone-500 mt-1">Follow us</p>
            </div>
          </a>
        </div>
      </div>
      <MarkdownView content={CONTACT_MD} />
    </div>
  </div>
);

export default ContactPage;
