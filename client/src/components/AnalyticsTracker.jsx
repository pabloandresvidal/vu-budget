import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const GA_ID = 'G-B64X83YKWZ';

export default function AnalyticsTracker() {
  const location = useLocation();

  // Load the gtag.js script once on mount
  useEffect(() => {
    if (window.GA_INITIALIZED) return;

    // 1. Inject the gtag.js script tag
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);

    // 2. Initialize the dataLayer and gtag function
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { send_page_view: false }); // We send page views manually on route change

    window.GA_INITIALIZED = true;
    console.log('[Analytics] Google Analytics initialized');
  }, []);

  // Send a pageview on every route change
  useEffect(() => {
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
        page_location: window.location.href,
        page_title: document.title,
      });
      console.log('[Analytics] Pageview:', location.pathname);
    }
  }, [location]);

  return null;
}
