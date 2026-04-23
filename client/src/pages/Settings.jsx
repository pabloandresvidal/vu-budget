import { useState, useEffect } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCurrency, CURRENCIES } from '../context/CurrencyContext';

export default function Settings() {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { currency, setCurrency, formatCurrency } = useCurrency();
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

  // Webhook config state
  const [webhooks, setWebhooks] = useState([]);
  const [webhookLoading, setWebhookLoading] = useState(true);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(null);
  const [webhookForm, setWebhookForm] = useState({ name: '', headerName: 'X-SMS-Body' });
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [copied, setCopied] = useState(null);

  // Passkey state
  const [passkeys, setPasskeys] = useState([]);
  const [passkeyLoading, setPasskeyLoading] = useState(true);
  const [passkeyAdding, setPasskeyAdding] = useState(false);
  const [passkeyNameInput, setPasskeyNameInput] = useState('');
  const [renamingPasskey, setRenamingPasskey] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // Webhook log state
  const [webhookLog, setWebhookLog] = useState([]);
  const [webhookLogTotal, setWebhookLogTotal] = useState(0);
  const [logTab, setLogTab] = useState('all'); // 'all' | 'transactions'
  const [logLoading, setLogLoading] = useState(false);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { loadWebhookLog(); }, [logTab]);

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

    // Load webhooks
    loadWebhooks();
    loadWebhookLog();
    loadPasskeys();
  }

  async function loadWebhooks() {
    setWebhookLoading(true);
    try {
      const data = await api.getWebhooks();
      setWebhooks(data);
    } catch (err) { console.error(err); }
    finally { setWebhookLoading(false); }
  }

  async function loadWebhookLog() {
    setLogLoading(true);
    try {
      const data = logTab === 'transactions'
        ? await api.getWebhookTransactions()
        : await api.getWebhookLog();
      setWebhookLog(data.logs || []);
      setWebhookLogTotal(data.total || 0);
    } catch (err) { console.error(err); }
    finally { setLogLoading(false); }
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

  // ── Webhook handlers ──
  function openCreateWebhook() {
    setEditingWebhook(null);
    setWebhookForm({ name: '', headerName: 'X-SMS-Body' });
    setShowWebhookModal(true);
  }

  function openEditWebhook(wh) {
    setEditingWebhook(wh);
    setWebhookForm({ name: wh.name, headerName: wh.headerName });
    setShowWebhookModal(true);
  }

  async function handleSaveWebhook(e) {
    e.preventDefault();
    setWebhookSaving(true);
    try {
      if (editingWebhook) {
        await api.updateWebhook(editingWebhook.id, webhookForm);
      } else {
        await api.createWebhook(webhookForm);
      }
      setShowWebhookModal(false);
      loadWebhooks();
    } catch (err) { alert(err.message); }
    finally { setWebhookSaving(false); }
  }

  async function handleToggleWebhook(wh) {
    try {
      await api.updateWebhook(wh.id, { isActive: !wh.isActive });
      loadWebhooks();
    } catch (err) { alert(err.message); }
  }

  async function handleDeleteWebhook(id) {
    if (!confirm('Delete this webhook configuration?')) return;
    try {
      await api.deleteWebhook(id);
      loadWebhooks();
    } catch (err) { alert(err.message); }
  }

  async function handleRegenerateToken(id) {
    if (!confirm('Regenerate secret token? The old token will stop working.')) return;
    try {
      await api.regenerateToken(id);
      loadWebhooks();
    } catch (err) { alert(err.message); }
  }

  function copyToClipboard(text, id) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  // ── Passkey handlers ──
  async function loadPasskeys() {
    setPasskeyLoading(true);
    try {
      const data = await api.getPasskeys();
      setPasskeys(data);
    } catch (err) { console.error(err); }
    finally { setPasskeyLoading(false); }
  }

  async function handleAddPasskey() {
    setPasskeyAdding(true);
    setMsg({ type: '', text: '' });
    try {
      const options = await api.getPasskeyRegisterOptions();
      const regResponse = await startRegistration({ optionsJSON: options });
      await api.verifyPasskeyRegistration(regResponse, passkeyNameInput || 'Passkey');
      setPasskeyNameInput('');
      showMsg('success', 'Passkey registered successfully! You can now use it to sign in.');
      loadPasskeys();
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        showMsg('error', 'Passkey registration was cancelled.');
      } else {
        showMsg('error', err.message || 'Failed to register passkey');
      }
    } finally {
      setPasskeyAdding(false);
    }
  }

  async function handleDeletePasskey(id) {
    if (!confirm('Delete this passkey? You will no longer be able to sign in with it.')) return;
    try {
      await api.deletePasskey(id);
      showMsg('success', 'Passkey deleted.');
      loadPasskeys();
    } catch (err) {
      showMsg('error', err.message || 'Failed to delete passkey');
    }
  }

  async function handleRenamePasskey(id) {
    if (!renameValue.trim()) return;
    try {
      await api.renamePasskey(id, renameValue.trim());
      setRenamingPasskey(null);
      setRenameValue('');
      loadPasskeys();
    } catch (err) {
      showMsg('error', err.message || 'Failed to rename passkey');
    }
  }

  const supportsPasskeys = typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined';

  function getFullWebhookUrl(wh) {
    const base = window.location.origin;
    return `${base}${wh.webhookUrl}`;
  }

  function getStatusBadge(status) {
    switch (status) {
      case 'processed': return <span className="badge badge-success">Processed</span>;
      case 'ignored_pattern': return <span className="badge badge-warning">Ignored (Rule)</span>;
      case 'ignored_payment': return <span className="badge badge-info">Payment</span>;
      case 'error': return <span className="badge badge-danger">Error</span>;
      default: return <span className="badge">{status}</span>;
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
          <p className="page-subtitle">Manage your profile, webhooks, partner, and notifications</p>
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

      {/* Appearance */}
      <div className="glass-card-static settings-section" style={{ padding: 24, marginBottom: 24 }}>
        <h2 className="settings-section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 8 }}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          Appearance
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Dark Mode</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Toggle between light and dark themes</div>
          </div>
          <input
            type="checkbox"
            id="themeToggle"
            className="toggle"
            checked={theme === 'dark'}
            onChange={toggleTheme}
          />
        </div>

        {/* Currency Selector */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--glass-border)' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>💱 Currency</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Choose how amounts are displayed throughout the app</div>
          </div>
          <select
            className="input"
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            style={{ width: 200, textAlign: 'left' }}
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Passkeys */}
      <div className="glass-card-static settings-section" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--glass-border)' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>🔑 Passkeys</h2>
        </div>

        {!supportsPasskeys ? (
          <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            ⚠️ Your browser doesn't support passkeys. Try using a modern browser like Chrome, Safari, or Edge.
          </div>
        ) : (
          <>
            <div style={{ padding: '12px 16px', marginBottom: 16, borderLeft: '3px solid var(--accent-primary)', background: 'var(--glass-bg)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--text-primary)' }}>What are passkeys?</strong> Passkeys let you sign in using your device's biometrics (Face ID, Touch ID, fingerprint) or PIN — no password needed. They're phishing-resistant and more secure than passwords.
              </div>
            </div>

            {/* Add passkey */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>Passkey Name (optional)</label>
                <input
                  className="input"
                  value={passkeyNameInput}
                  onChange={e => setPasskeyNameInput(e.target.value)}
                  placeholder='e.g. "MacBook Pro", "iPhone"'
                  disabled={passkeyAdding}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleAddPasskey}
                disabled={passkeyAdding}
                style={{ whiteSpace: 'nowrap' }}
              >
                {passkeyAdding ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="spinner-sm" />
                    Registering…
                  </span>
                ) : '+ Add Passkey'}
              </button>
            </div>

            {/* Passkey list */}
            {passkeyLoading ? (
              <div className="skeleton" style={{ height: 80 }} />
            ) : passkeys.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                No passkeys registered yet. Add one above to enable passwordless sign-in.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {passkeys.map(pk => (
                  <div key={pk.id} style={{ padding: 14, background: 'var(--glass-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '1.3rem' }}>
                          {pk.deviceType === 'multiDevice' ? '☁️' : '🔐'}
                        </span>
                        <div>
                          {renamingPasskey === pk.id ? (
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <input
                                className="input"
                                value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleRenamePasskey(pk.id)}
                                style={{ padding: '4px 8px', fontSize: '0.85rem', width: 160 }}
                                autoFocus
                              />
                              <button className="btn-ghost btn-sm" onClick={() => handleRenamePasskey(pk.id)}>✓</button>
                              <button className="btn-ghost btn-sm" onClick={() => { setRenamingPasskey(null); setRenameValue(''); }}>✕</button>
                            </div>
                          ) : (
                            <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{pk.name}</div>
                          )}
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                            {pk.deviceType === 'multiDevice' ? 'Synced passkey' : 'Device-bound'}
                            {pk.backedUp && ' • Backed up'}
                            {' • Added '}
                            {new Date(pk.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setRenamingPasskey(pk.id); setRenameValue(pk.name); }}>✏️ Rename</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeletePasskey(pk.id)}>🗑️ Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Webhook Configuration */}
      <div className="glass-card-static settings-section" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--glass-border)' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>⚙️ Webhook Configuration</h2>
          <button className="btn btn-primary btn-sm" onClick={openCreateWebhook}>+ New Webhook</button>
        </div>

        {/* Info banner */}
        <div style={{ padding: '12px 16px', marginBottom: 16, borderLeft: '3px solid var(--accent-primary)', background: 'var(--glass-bg)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text-primary)' }}>How it works:</strong> Configure your SMS forwarding service to send bank notification texts to the webhook URL below. The SMS content should be sent in the configured HTTP header.
          </div>
        </div>

        {webhookLoading ? (
          <div className="skeleton" style={{ height: 80 }} />
        ) : webhooks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
            No webhooks configured yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {webhooks.map(wh => (
              <div key={wh.id} style={{ padding: 16, background: 'var(--glass-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>{wh.name}</h3>
                    <span className={`badge ${wh.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {wh.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <input type="checkbox" className="toggle" checked={wh.isActive} onChange={() => handleToggleWebhook(wh)} />
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Webhook URL</div>
                  <div className="webhook-url">
                    <code>{getFullWebhookUrl(wh)}</code>
                    <button className="btn-ghost btn-sm" onClick={() => copyToClipboard(getFullWebhookUrl(wh), `url-${wh.id}`)}>
                      {copied === `url-${wh.id}` ? '✓' : '📋'}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>SMS Header</div>
                  <div className="webhook-url">
                    <code>{wh.headerName}</code>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEditWebhook(wh)}>✏️ Edit</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleRegenerateToken(wh.id)}>🔄 Regenerate Token</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteWebhook(wh.id)}>🗑️ Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Webhook Log */}
      <div className="glass-card-static settings-section" style={{ padding: 24, marginBottom: 24 }}>
        <h2 className="settings-section-title">📡 Webhook Log</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
          View all incoming webhook messages and which ones were processed as transactions.
        </p>

        {/* Log Tabs */}
        <div className="tabs" style={{ maxWidth: 400, marginBottom: 16 }}>
          <div className={`tab${logTab === 'all' ? ' active' : ''}`} onClick={() => setLogTab('all')}>
            All Messages ({webhookLogTotal})
          </div>
          <div className={`tab${logTab === 'transactions' ? ' active' : ''}`} onClick={() => setLogTab('transactions')}>
            Budget Transactions
          </div>
        </div>

        {logLoading ? (
          <div style={{ padding: 16 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 40, marginBottom: 4 }} />)}
          </div>
        ) : webhookLog.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
            No webhook messages yet.
          </div>
        ) : (
          <div style={{ overflow: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>SMS Content</th>
                  {logTab === 'all' ? <th>Status</th> : <th>Budget</th>}
                  {logTab === 'all' && <th>Detail</th>}
                  {logTab === 'transactions' && <th>Amount</th>}
                </tr>
              </thead>
              <tbody>
                {webhookLog.map(log => (
                  <tr key={log.id}>
                    <td data-label="Date" style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {new Date(log.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                        {new Date(log.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td data-label="SMS" style={{ maxWidth: 300 }}>
                      <div style={{ fontSize: '0.82rem', lineHeight: 1.4, wordBreak: 'break-word', maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.rawSms || '—'}
                      </div>
                    </td>
                    {logTab === 'all' ? (
                      <td data-label="Status">{getStatusBadge(log.status)}</td>
                    ) : (
                      <td data-label="Budget">
                        {log.budgetTitle ? (
                          <span className="badge badge-success">{log.budgetTitle}</span>
                        ) : (
                          <span className="badge badge-warning">Uncategorized</span>
                        )}
                      </td>
                    )}
                    {logTab === 'all' && (
                      <td data-label="Detail" style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                        {log.matchedPattern && <span title="Matched pattern">🔇 {log.matchedPattern}</span>}
                        {log.vendor && <span>{log.vendor} • {formatCurrency(log.amount)}</span>}
                      </td>
                    )}
                    {logTab === 'transactions' && (
                      <td data-label="Amount" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                        {formatCurrency(log.amount)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

      {/* Webhook Modal */}
      {showWebhookModal && (
        <div className="modal-overlay" onClick={() => setShowWebhookModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingWebhook ? 'Edit Webhook' : 'New Webhook'}</h2>
              <button className="btn-ghost btn-icon" onClick={() => setShowWebhookModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveWebhook}>
              <div className="modal-body">
                <div className="input-group">
                  <label>Name</label>
                  <input className="input" value={webhookForm.name}
                    onChange={e => setWebhookForm({...webhookForm, name: e.target.value})}
                    placeholder="e.g. Bank of America SMS" required autoFocus />
                </div>
                <div className="input-group">
                  <label>SMS Header Name</label>
                  <input className="input" value={webhookForm.headerName}
                    onChange={e => setWebhookForm({...webhookForm, headerName: e.target.value})}
                    placeholder="e.g. X-SMS-Body" />
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                    The HTTP header that contains the SMS text. Default: X-SMS-Body
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowWebhookModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={webhookSaving}>
                  {webhookSaving ? 'Saving...' : editingWebhook ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
