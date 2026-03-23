import { useState, useEffect } from 'react';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    // Listen for the native install prompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Determine if we should show the banner (e.g. they haven't dismissed it recently)
      const dismissed = localStorage.getItem('vu_pwa_dismissed');
      if (!dismissed) {
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

  if (!showInstall) return null;

  return (
    <div className="pwa-install-banner">
      <div className="pwa-install-content">
        <div className="pwa-icon">📲</div>
        <div className="pwa-text">
          <strong>Install VU Budget</strong>
          <p>Add to your home screen for a seamless, full-screen experience and instant notifications.</p>
        </div>
      </div>
      <div className="pwa-actions">
        <button className="btn btn-primary btn-sm" onClick={handleInstallClick}>Install</button>
        <button className="btn-ghost btn-sm" onClick={dismiss} style={{ marginLeft: '8px' }}>Not Now</button>
      </div>
    </div>
  );
}
