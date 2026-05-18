import React, { useState } from 'react';
import { ServiceIllustration } from './ServiceIllustrations';

const PUBLIC =
  (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';

/** Local service photos — stable paths for production builds */
export const SERVICE_IMAGE_PATHS = {
  haircut: `${PUBLIC}/images/services/haircut.jpg`,
  spa: `${PUBLIC}/images/services/spa.jpg`,
  beard: `${PUBLIC}/images/services/beard.jpg`,
  facial: `${PUBLIC}/images/services/facial.jpg`,
};

/**
 * Service card image with SVG fallback if the local asset fails to load.
 */
export function ServiceCardImage({ type, alt, className = '' }) {
  const [useFallback, setUseFallback] = useState(false);
  const src = SERVICE_IMAGE_PATHS[type];

  if (!src || useFallback) {
    return (
      <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-orange-50 to-stone-100 ${className}`}>
        <ServiceIllustration type={type} className="w-28 h-auto sm:w-32" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={300}
      height={360}
      loading="lazy"
      decoding="async"
      onError={() => setUseFallback(true)}
      className={`absolute inset-0 w-full h-full object-cover ${className}`}
    />
  );
}

export default ServiceCardImage;
