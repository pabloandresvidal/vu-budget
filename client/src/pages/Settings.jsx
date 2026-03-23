import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function Settings() {
  const [profile, setProfile] = useState(null);
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [prof, part] = await Promise.all([
        api('/api/settings/profile'),
        api('/api/partner/code')
      ]);
      setProfile(prof);
      setPartner(part);
      setDisplayName(prof.displayName || '');
      setEmail(prof.email || '');
      setEmailNotifications(prof.emailNotifications);
    } catch (e) {
      showMsg('error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  function showMsg(type, text) {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: '', text: '' }), 4000);
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/api/settings/profile', {
        method: 'PUT',
        body: JSON.stringify({ displayName, email, emailNotifications })
      });
      showMsg('success', 'Profile updated successfully!');
    } catch (e) {
      showMsg('error', e.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  async function copyCode() {
    if (!partner?.code) return;
    await navigator.clipboard.writeText(partner.code);
    showMsg('success', 'Invite code copied!');
  }

  async function regenerateCode() {
    if (!confirm('Regenerate invite code? Your partner will need the new code to re-link.')) return;
    try {
      await api('/api/partner/code/regenerate', { method: 'POST' });
      await fetchAll();
      showMsg('success', 'New invite code generated!');
    } catch (e) {
      showMsg('error', 'Failed to regenerate code');
    }
  }

  async function joinPartner(e) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    try {
      const res = await api('/api/partner/join', {
        method: 'POST',
        body: JSON.stringify({ code: joinCode.trim() })
      });
      showMsg('success', `Linked to ${res.linkedTo?.displayName}! You now share the same budgets.`);
      setJoinCode('');
      await fetchAll();
    } catch (e) {
      showMsg('error', e.message || 'Invalid invite code');
    }
  }

  async function unlink() {
    if (!confirm('Unlink partner account? You will lose access to shared data.')) return;
    try {
      await api('/api/partner/unlink', { method: 'DELETE' });
      showMsg('success', 'Partner unlinked successfully.');
      await fetchAll();
    } catch (e) {
      showMsg('error', 'Failed to unlink partner');
    }
  }

  if (loading) {
    return (
      <div className="page-enter">
        <div className="skeleton" style={{ height: 200, borderRadius: 16, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your profile, partner, and notifications</p>
        </div>
      </div>

      {msg.text && (
        <div className={`settings-alert ${msg.type}`} style={{ marginBottom: 24 }}>
          {msg.type === 'success' ? '✅' : '❌'} {msg.text}
        </div>
      )}

      {/* Profile */}
      <div className="glass-card-static settings-section" style={{ padding: 24, marginBottom: 24 }}>
        <h2 className="settings-section-title">👤 Profile</h2>
        <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="input-group">
            <label>Display Name</label>
            <input
              className="input"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="input-group">
            <label>Email Address</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
              Used for email notifications when transactions need review
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="checkbox"
              id="emailNotif"
              className="toggle"
              checked={emailNotifications}
              onChange={e => setEmailNotifications(e.target.checked)}
            />
            <label htmlFor="emailNotif" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
              Email me when a transaction needs review
            </label>
          </div>
          <div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : '💾 Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Partner Linking */}
      <div className="glass-card-static settings-section" style={{ padding: 24, marginBottom: 24 }}>
        <h2 className="settings-section-title">🔗 Partner Account</h2>

        {partner?.isLinked ? (
          /* Already linked to someone */
          <div>
            <div className="settings-partner-status linked">
              <span style={{ fontSize: '1.5rem' }}>✅</span>
              <div>
                <div style={{ fontWeight: 600 }}>Linked to {partner.linkedTo?.displayName}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                  You share budgets, transactions, and analytics
                </div>
              </div>
            </div>
            <button className="btn btn-danger btn-sm" onClick={unlink} style={{ marginTop: 16 }}>
              Unlink Partner
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Your invite code */}
            <div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Your Invite Code
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="settings-code-display">
                  {partner?.code || '—'}
                </div>
                <button className="btn btn-secondary btn-sm" onClick={copyCode}>📋 Copy</button>
              </div>
              {partner?.partner && (
                <div className="settings-partner-status linked" style={{ marginTop: 12 }}>
                  <span>🤝</span>
                  <div style={{ fontSize: '0.85rem' }}>
                    <strong>{partner.partner.displayName}</strong> is linked to your account
                  </div>
                </div>
              )}
              <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: 8 }}>
                Share this code with your partner so they can link their account and see your shared budgets.
              </p>
            </div>

            {/* Join with a code */}
            <div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Join a Partner's Account
              </div>
              <form onSubmit={joinPartner} style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter invite code (e.g. A1B2C3D4)"
                  maxLength={8}
                  style={{ flex: 1, letterSpacing: '0.15em', fontWeight: 700 }}
                />
                <button type="submit" className="btn btn-primary">Join</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
