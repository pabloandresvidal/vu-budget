import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    // Make sure gtag exists (initialized in index.html)
    if (typeof window.gtag === 'function') {
      window.gtag('config', 'G-B64X83YKWZ', {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);

  return null;
}
