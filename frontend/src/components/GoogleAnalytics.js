import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const GA_ID = (process.env.REACT_APP_GA_MEASUREMENT_ID || '').trim();

/**
 * Optional GA4 page views. Set REACT_APP_GA_MEASUREMENT_ID in Vercel (e.g. G-XXXXXXXX).
 * Search Console performance data does not require this component.
 */
export default function GoogleAnalytics() {
  const location = useLocation();
  const initialized = useRef(false);

  useEffect(() => {
    if (!GA_ID) return undefined;

    const sendPageView = () => {
      if (typeof window.gtag === 'function') {
        window.gtag('config', GA_ID, {
          page_path: `${location.pathname}${location.search}`,
        });
      }
    };

    if (initialized.current) {
      sendPageView();
      return undefined;
    }

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    script.onload = sendPageView;
    document.head.appendChild(script);
    initialized.current = true;

    return undefined;
  }, [location.pathname, location.search]);

  return null;
}
