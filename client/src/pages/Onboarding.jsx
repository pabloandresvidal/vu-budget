import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export default function Onboarding() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (user?.onboarding_completed) {
    return <Navigate to="/" replace />;
  }

  async function selectFree() {
    setLoading(true);
    setError('');
    try {
      await api.completeOnboarding('free');
      window.location.href = '/'; 
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="auth-page" style={{ height: 'auto', minHeight: '100vh', padding: '40px 20px', display: 'block' }}>
      <div className="app-bg" />
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', marginBottom: '16px' }}>Choose your plan</h1>
        <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', marginBottom: '40px' }}>Select the tier that's right for you. Pro features are actively in development!</p>
        
        {error && <div className="auth-error" style={{ marginBottom: 24, margin: '0 auto', maxWidth: 400 }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'stretch' }}>
          
          {/* Free Tier */}
          <div className="glass-card-static" style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', border: '2px solid var(--primary-color)', padding: 32 }}>
            <h2 style={{ fontSize: '1.8rem', color: 'white', marginBottom: 8 }}>Starter</h2>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'white', marginBottom: 24 }}>$0<span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.5)', fontWeight: 400}}>/mo</span></div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: 12, color: 'rgba(255,255,255,0.8)', flex: 1 }}>
              <li>✅ Unlimited Budgets</li>
              <li>✅ AI Categorization</li>
              <li>✅ Push Notifications</li>
              <li>✅ Partner Linking Sync</li>
            </ul>
            <button className="btn btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }} onClick={selectFree} disabled={loading}>
              {loading ? 'Activating...' : 'Select Free'}
            </button>
          </div>

          {/* Premium Tier */}
          <div className="glass-card-static" style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', opacity: 0.6, padding: 32 }}>
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', alignSelf: 'flex-start', marginBottom: 16 }}>Coming Soon</div>
            <h2 style={{ fontSize: '1.8rem', color: 'white', marginBottom: 8 }}>Pro</h2>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'white', marginBottom: 24 }}>$4.99<span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.5)', fontWeight: 400}}>/mo</span></div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: 12, color: 'rgba(255,255,255,0.6)', flex: 1 }}>
              <li>✨ Everything in Starter</li>
              <li>✨ AI Financial Advisor</li>
              <li>✨ Custom App Themes</li>
              <li>✨ Export to CSV/PDF</li>
              <li>✨ Priority Support</li>
            </ul>
            <button className="btn btn-secondary" style={{ width: '100%', padding: '16px', fontSize: '1.1rem', cursor: 'not-allowed' }} disabled>
              In Development
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
