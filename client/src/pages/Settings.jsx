import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);

  const [notifyBudget, setNotifyBudget] = useState(true);
  const [notifyTx, setNotifyTx] = useState(true);
  const [notifyWeekly, setNotifyWeekly] = useState(true);
  const [notifyHighSpent, setNotifyHighSpent] = useState(true);
  const [ignoredPatterns, setIgnoredPatterns] = useState([]);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [prof, part, patterns] = await Promise.all([
        api.getProfile(),
        api.getPartnerCode(),
        api.getIgnoredPatterns()
      ]);
      setProfile(prof);
      setPartner(part);
      setDisplayName(prof.displayName || '');
      setEmail(prof.email || '');
      setEmailNotifications(prof.emailNotifications !== false);
      setNotifyBudget(prof.notify_budget_updates !== false);
      setNotifyTx(prof.notify_tx_updates !== false);
      setNotifyWeekly(prof.notify_weekly_summary !== false);
      setNotifyHighSpent(prof.notify_high_spending !== false);
      setIgnoredPatterns(patterns || []);
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
      await api.updateProfile({ 
        displayName, 
        email, 
        emailNotifications,
        notify_budget_updates: notifyBudget,
        notify_tx_updates: notifyTx,
        notify_weekly_summary: notifyWeekly,
        notify_high_spending: notifyHighSpent
      });
      showMsg('success', 'Profile updated successfully!');
    } catch (e) {
      showMsg('error', e.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  async function unMute(id) {
    if (!confirm('Un-ignore this pattern? Future texts matching this will be categorized by AI again.')) return;
    try {
      await api.deleteIgnoredPattern(id);
      setIgnoredPatterns(prev => prev.filter(p => p.id !== id));
      showMsg('success', 'Pattern un-ignored successfully!');
    } catch (e) {
      showMsg('error', 'Failed to remove pattern');
    }
  }

  async function copyCode() {
    if (!partner?.code) return;
    await navigator.clipboard.writeText(partner.code);
    showMsg('success', 'Invite code copied!');
  }

  async function joinPartner(e) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    
    // Explicit warning before overwriting context
    const confirmMessage = "⚠️ WARNING: Linking to a partner will ERASE this account's current budgets and transactions. You will ONLY see your partner's shared data.\n\nAre you sure you want to proceed?";
    if (!window.confirm(confirmMessage)) return;

    try {
      const res = await api.joinPartner(joinCode.trim());
      showMsg('success', `🎉 Linked to ${res.linkedTo?.displayName}! You now share the same budgets.`);
      setJoinCode('');
      await fetchAll();
    } catch (e) {
      showMsg('error', e.message || 'Invalid invite code');
    }
  }

  async function unlink() {
    if (!confirm('Unlink partner account? You will lose access to shared data.')) return;
    try {
      await api.unlinkPartner();
      showMsg('success', 'Partner unlinked successfully.');
      await fetchAll();
    } catch (e) {
      showMsg('error', 'Failed to unlink partner');
    }
  }

  async function deleteAccount() {
    const confirm1 = window.confirm("DANGER: Are you absolutely sure you want to delete your account? This action cannot be undone!");
    if (!confirm1) return;
    const confirm2 = window.confirm("If you are linked to a partner, your data will be safely transferred to them. Otherwise, all your financial records will be permanently erased.\n\nType 'DELETE' in the next prompt if you wish to proceed.");
    if (!confirm2) return;
    
    const finalCheck = window.prompt('Type DELETE to confirm:');
    if (finalCheck !== 'DELETE') {
      return showMsg('error', 'Account deletion cancelled.');
    }

    setSaving(true);
    try {
      await api.deleteAccount();
      logout();
    } catch (e) {
      showMsg('error', e.message || 'Failed to delete account');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page-enter">
        <div className="skeleton" style={{ height: 240, borderRadius: 16, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 240, borderRadius: 16 }} />
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
            <input className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="input-group">
            <label>Email Address</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>Used for email notifications</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input type="checkbox" id="emailNotif" className="toggle" checked={emailNotifications} onChange={e => setEmailNotifications(e.target.checked)} />
            <label htmlFor="emailNotif" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Email me when a transaction needs review</label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input type="checkbox" id="notifyBudget" className="toggle" checked={notifyBudget} onChange={e => setNotifyBudget(e.target.checked)} />
            <label htmlFor="notifyBudget" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Push Alert: When budget limits or titles change</label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input type="checkbox" id="notifyTx" className="toggle" checked={notifyTx} onChange={e => setNotifyTx(e.target.checked)} />
            <label htmlFor="notifyTx" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Push Alert: When transactions are manually modified</label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input type="checkbox" id="notifyWeekly" className="toggle" checked={notifyWeekly} onChange={e => setNotifyWeekly(e.target.checked)} />
            <label htmlFor="notifyWeekly" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Push Alert: Weekly spending summary on Sundays</label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input type="checkbox" id="notifyHighSpent" className="toggle" checked={notifyHighSpent} onChange={e => setNotifyHighSpent(e.target.checked)} />
            <label htmlFor="notifyHighSpent" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Push Alert: Emergency high spending velocity risk</label>
          </div>
          <div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : '💾 Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Ignored AI Patterns */}
      <div className="glass-card-static settings-section" style={{ padding: 24, marginBottom: 24 }}>
        <h2 className="settings-section-title">🤖 AI Transaction Exceptions</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
          Any incoming bank text messages matching these patterns will be permanently ignored by the AI and will not be recorded.
        </p>
        {ignoredPatterns.length === 0 ? (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>No excluded vendors... yet. (Add these directly from the Transactions page)</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Pattern</th>
                <th>Date Added</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {ignoredPatterns.map(p => (
                <tr key={p.id}>
                  <td data-label="Pattern" style={{ fontFamily: 'monospace', fontWeight: 600 }}>{p.pattern}</td>
                  <td data-label="Date">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td data-label="Action">
                    <button type="button" className="btn-ghost btn-sm" onClick={() => unMute(p.id)}>Un-hide</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Partner Linking */}
      <div className="glass-card-static settings-section" style={{ padding: 24, marginBottom: 24 }}>
        <h2 className="settings-section-title">🔗 Partner Account</h2>

        {partner?.isLinked ? (
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
            <button className="btn btn-danger btn-sm" onClick={unlink} style={{ marginTop: 16 }}>Unlink Partner</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <div className="settings-label">Your Invite Code</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <div className="settings-code-display">{partner?.code || '—'}</div>
                <button className="btn btn-secondary btn-sm" onClick={copyCode}>📋 Copy</button>
              </div>
              {partner?.partner && (
                <div className="settings-partner-status linked" style={{ marginTop: 12 }}>
                  <span>🤝</span>
                  <div style={{ fontSize: '0.85rem' }}>
                    <strong>{partner.partner.displayName}</strong> (@{partner.partner.username}) is linked
                  </div>
                </div>
              )}
              <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: 8 }}>
                Share this code with your partner so they can link their account and see your shared budgets.
              </p>
            </div>

            <div>
              <div className="settings-label">Join a Partner's Account</div>
              <form onSubmit={joinPartner} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
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

      {/* Danger Zone */}
      <div className="glass-card-static settings-section" style={{ padding: 24, marginBottom: 24, border: '1px solid rgba(239, 68, 68, 0.4)' }}>
        <h2 className="settings-section-title" style={{ color: '#ef4444' }}>⚠️ Danger Zone</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
          Permanently delete your account. If you are the Primary account owner linked to a partner, your budgets and transactions will be securely transferred to them so they don't lose the ledger. If you act alone, 100% of your data will be instantly erased.
        </p>
        <button className="btn btn-danger" onClick={deleteAccount} disabled={saving}>
          {saving ? 'Deleting...' : '🗑️ Delete Account'}
        </button>
      </div>

    </div>
  );
}
