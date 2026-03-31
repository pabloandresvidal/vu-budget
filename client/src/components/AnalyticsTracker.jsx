import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';

export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    // Initialize GA once
    if (!window.GA_INITIALIZED) {
      ReactGA.initialize('G-B64X83YKWZ');
      window.GA_INITIALIZED = true;
    }
  }, []);

  useEffect(() => {
    if (window.GA_INITIALIZED) {
      // Send pageview with a custom path
      ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
    }
  }, [location]);

  return null;
}
