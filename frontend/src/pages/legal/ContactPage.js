import React from 'react';
import { EnvelopeSimple, Phone } from '@phosphor-icons/react';
import MarkdownView from '../../components/MarkdownView';
import { CONTACT_MD } from '../../legal/content';
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_PHONE_DISPLAY,
} from '../../config/contact';

const ContactPage = () => (
  <div className="min-h-screen bg-stone-50">
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 p-6 bg-white rounded-2xl border border-stone-200 shadow-sm">
        <h1 className="font-heading text-2xl font-bold text-stone-900 mb-2">Contact Us</h1>
        <p className="text-stone-600 text-sm mb-4">
          Reach our team for bookings, salon listings, or account help.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-800 text-white font-medium hover:bg-orange-900 transition-colors"
          >
            <EnvelopeSimple size={20} weight="bold" />
            {SUPPORT_EMAIL}
          </a>
          <a
            href={`tel:${SUPPORT_PHONE}`}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-stone-200 text-stone-800 font-medium hover:bg-stone-50 transition-colors"
          >
            <Phone size={20} weight="bold" />
            {SUPPORT_PHONE_DISPLAY}
          </a>
        </div>
      </div>
      <MarkdownView content={CONTACT_MD} />
    </div>
  </div>
);

export default ContactPage;
