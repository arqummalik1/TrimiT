import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Scissors,
  Sparkle,
  UsersThree,
  CheckCircle,
} from '@phosphor-icons/react';
import { BUSINESS_TYPE_PICKER_OPTIONS } from '../../lib/genderServe';

const ICON_MAP = {
  cut: Scissors,
  sparkles: Sparkle,
  people: UsersThree,
};

const ChooseBusinessTypePage = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  const handleContinue = () => {
    if (!selected) return;
    navigate('/owner/salon', { state: { gender_serve: selected } });
  };

  return (
    <div className="min-h-screen bg-stone-50 py-8" data-testid="choose-business-type">
      <div className="max-w-lg mx-auto px-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-700 mb-6"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-heading text-3xl font-bold text-stone-900 mb-2">
            What type of business?
          </h1>
          <p className="text-stone-500 mb-8">
            Choose one to continue. You can update this later in settings.
          </p>

          <div className="space-y-4 mb-8">
            {BUSINESS_TYPE_PICKER_OPTIONS.map((opt) => {
              const active = selected === opt.value;
              const Icon = ICON_MAP[opt.icon];
              return (
                <button
                  key={opt.value}
                  type="button"
                  data-testid={`business-type-${opt.value}`}
                  onClick={() => setSelected(opt.value)}
                  className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all ${
                    active
                      ? 'border-orange-800 bg-orange-50'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div
                    className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                      active ? 'bg-orange-100' : 'bg-stone-100'
                    }`}
                  >
                    <Icon
                      size={28}
                      weight="duotone"
                      className={active ? 'text-orange-800' : 'text-stone-500'}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-semibold text-lg ${
                        active ? 'text-orange-900' : 'text-stone-900'
                      }`}
                    >
                      {opt.title}
                    </p>
                    <p className="text-sm text-stone-500">{opt.subtitle}</p>
                  </div>
                  {active ? (
                    <CheckCircle size={24} weight="fill" className="text-orange-800 shrink-0" />
                  ) : (
                    <span className="w-6 h-6 rounded-full border-2 border-stone-300 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            data-testid="business-type-continue"
            disabled={!selected}
            onClick={handleContinue}
            className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
            <ArrowRight size={20} />
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default ChooseBusinessTypePage;
