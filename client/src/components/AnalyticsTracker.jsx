import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const GA_ID = 'G-B64X83YKWZ';

export default function AnalyticsTracker() {
  const location = useLocation();

  // Send a pageview on every SPA route change
  useEffect(() => {
    if (typeof window.gtag === 'function') {
      window.gtag('config', GA_ID, {
        page_path: location.pathname + location.search,
        page_location: window.location.href,
      });
    }
  }, [location]);

  return null;
}
