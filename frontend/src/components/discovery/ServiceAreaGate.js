/**
 * ServiceAreaGate (web) — shown when a visitor's shared location is OUTSIDE
 * every active service area. Instead of "No salons found", it clearly says
 * TrimiT isn't live in their city yet and captures them as a waitlist lead
 * (visible to the founder in the admin dashboard "Notify Me" screen).
 *
 * Mirrors the mobile ServiceAreaGate. Animated pin uses Tailwind only.
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, NavigationArrow, BellRinging, CheckCircle } from '@phosphor-icons/react';
import { serviceabilityService } from '../../services/serviceabilityService';
import { getApiErrorMessage } from '../../lib/utils';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ServiceAreaGate({ result, coords }) {
  const nearest = result?.nearest_area || null;
  const launchingSoon = !!nearest?.launching_soon;
  const activeAreas = result?.active_areas || [];

  const servesText =
    activeAreas.length === 1
      ? `TrimiT is currently live in ${activeAreas[0]}.`
      : activeAreas.length > 1
      ? `TrimiT is currently live in ${activeAreas.slice(0, -1).join(', ')} and ${
          activeAreas[activeAreas.length - 1]
        }.`
      : 'TrimiT is launching in new cities soon.';

  const headline =
    launchingSoon && nearest?.name
      ? `Launching soon in ${nearest.name}!`
      : "We're not in your area yet";

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [serverError, setServerError] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError('');
    setServerError('');
    setStatus('loading');
    try {
      await serviceabilityService.joinWaitlist({
        email: trimmed,
        name: name.trim() || undefined,
        lat: coords?.lat,
        lng: coords?.lng,
        area_label: nearest?.name,
      });
      setStatus('success');
    } catch (err) {
      setServerError(getApiErrorMessage(err, 'Could not add you to the waitlist. Please try again.'));
      setStatus('idle');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto text-center py-12 px-4"
    >
      {/* Animated pin */}
      <div className="relative mx-auto mb-6 flex h-28 w-28 items-center justify-center">
        <span className="absolute inline-flex h-20 w-20 rounded-full bg-orange-400/30 animate-ping" />
        <span className="absolute inline-flex h-14 w-14 rounded-full bg-orange-400/20" />
        <MapPin size={56} weight="fill" className="relative text-orange-700" />
      </div>

      <h2 className="font-heading text-2xl font-bold text-stone-900 mb-2">{headline}</h2>
      <p className="text-stone-500 mb-4">{servesText}</p>

      {typeof result?.nearest_distance_km === 'number' && nearest?.name && (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-sm text-stone-600 mb-8">
          <NavigationArrow size={14} weight="bold" className="text-orange-700" />
          Nearest city: {nearest.name} · ~{Math.round(result.nearest_distance_km)} km away
        </div>
      )}

      {status === 'success' ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <CheckCircle size={44} weight="fill" className="mx-auto text-emerald-600 mb-2" />
          <h3 className="font-heading text-lg font-bold text-stone-900">You're on the list! 🎉</h3>
          <p className="text-stone-600 text-sm mt-1">
            We'll email you the moment TrimiT reaches your area.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="text-left">
          <p className="text-sm font-semibold text-stone-700 text-center mb-4">
            Want TrimiT in your city? Get notified the moment we launch near you.
          </p>
          <label className="block text-sm font-medium text-stone-600 mb-1">Name (optional)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full mb-3 px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800"
          />
          <label className="block text-sm font-medium text-stone-600 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError('');
            }}
            placeholder="you@example.com"
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 ${
              emailError ? 'border-red-400' : 'border-stone-200 focus:border-orange-800'
            }`}
          />
          {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
          {serverError && <p className="text-red-500 text-sm mt-2 text-center">{serverError}</p>}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="btn-primary w-full mt-4 py-3 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <BellRinging size={18} weight="bold" />
            {status === 'loading' ? 'Adding you…' : 'Notify me at launch'}
          </button>
        </form>
      )}
    </motion.div>
  );
}
