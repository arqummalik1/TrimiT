import React, { useState } from 'react';

/**
 * Image with skeleton placeholder and lazy loading (except priority hero).
 */
export function LazyImage({
  src,
  alt,
  className = '',
  wrapperClassName = '',
  priority = false,
  sizes,
  srcSet,
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={`relative overflow-hidden ${wrapperClassName}`}>
      {!loaded && !error ? (
        <div
          className="absolute inset-0 bg-gradient-to-br from-stone-200 via-stone-100 to-stone-200 animate-pulse"
          aria-hidden
        />
      ) : null}
      {error ? (
        <div className="absolute inset-0 bg-stone-200 flex items-center justify-center text-stone-400 text-xs">
          Image unavailable
        </div>
      ) : null}
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`${className} transition-opacity duration-500 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}

export default LazyImage;
