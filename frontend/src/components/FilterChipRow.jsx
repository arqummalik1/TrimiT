import { salonTypeLabel } from '../lib/genderServe';

export function FilterChipRow({ options, value, onChange, testIDPrefix = 'chip' }) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            data-testid={`${testIDPrefix}-${opt.value}`}
            onClick={() => onChange(opt.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              active
                ? 'bg-orange-800 text-white border-orange-800'
                : 'bg-white text-stone-700 border-stone-200 hover:border-orange-300'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function SalonTypeBadge({ genderServe = 'unisex' }) {
  const label = salonTypeLabel(genderServe);
  return (
    <span
      data-testid={`salon-type-${genderServe}`}
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-stone-100 text-stone-600 border border-stone-200"
    >
      {label}
    </span>
  );
}
