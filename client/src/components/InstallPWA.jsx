import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function InstallPWA() {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // If the app is already installed/running in standalone PWA mode, do not show banner
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) return;

    // Check if the user dismissed it before
    const dismissed = localStorage.getItem('vu_pwa_dismissed');
    if (dismissed) return;

    // Detect iOS devices (Safari doesn't support beforeinstallprompt)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    
    if (isIosDevice) {
      setIsIOS(true);
      setShowInstall(true); // Manually trigger since the event will never fire on iOS
    }

    // Listen for the native install prompt event (Android / Chrome)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isIosDevice) {
        setShowInstall(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If installed successfully, hide the prompt
    window.addEventListener('appinstalled', () => {
      setShowInstall(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstall(false);
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setShowInstall(false);
    localStorage.setItem('vu_pwa_dismissed', 'true');
  };

  if (location.pathname === '/landing') return null;
  if (!showInstall) return null;

  return (
    <div className="pwa-install-banner" style={{ zIndex: 999999 }}>
      <div className="pwa-install-content">
        <div className="pwa-icon">📲</div>
        <div className="pwa-text">
          <strong>{isIOS ? 'Install VU Budget app' : 'Get the App'}</strong>
          {isIOS ? (
            <p style={{ marginTop: 4 }}>To install on iOS: tap the <strong>Share</strong> icon at the bottom of Safari and select <strong>"Add to Home Screen"</strong>.</p>
          ) : (
            <p>Add to your home screen for a fast, native app experience and notifications.</p>
          )}
        </div>
      </div>
      <div className="pwa-actions">
        {!isIOS && <button className="btn btn-primary btn-sm" onClick={handleInstallClick}>Install Now</button>}
        <button className="btn-ghost btn-sm" onClick={dismiss} style={{ marginLeft: '8px' }}>{isIOS ? 'Got it' : 'Not Now'}</button>
      </div>
    </div>
  );
}
