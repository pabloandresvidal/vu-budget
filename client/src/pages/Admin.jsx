import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function Admin() {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', headerName: 'X-SMS-Body' });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(null);

  useEffect(() => { loadWebhooks(); }, []);

  async function loadWebhooks() {
    try {
      const data = await api.getWebhooks();
      setWebhooks(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', headerName: 'X-SMS-Body' });
    setShowModal(true);
  }

  function openEdit(wh) {
    setEditing(wh);
    setForm({ name: wh.name, headerName: wh.headerName });
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.updateWebhook(editing.id, form);
      } else {
        await api.createWebhook(form);
      }
      setShowModal(false);
      loadWebhooks();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  async function handleToggle(wh) {
    try {
      await api.updateWebhook(wh.id, { isActive: !wh.isActive });
      loadWebhooks();
    } catch (err) { alert(err.message); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this webhook configuration?')) return;
    try {
      await api.deleteWebhook(id);
      loadWebhooks();
    } catch (err) { alert(err.message); }
  }

  async function handleRegenerate(id) {
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

  function getFullWebhookUrl(wh) {
    const base = window.location.origin;
    return `${base}${wh.webhookUrl}`;
  }

  if (loading) {
    return (
      <div>
        <div className="page-header"><h1 className="page-title">Webhook Configuration</h1></div>
        {[1,2].map(i => <div key={i} className="glass-card-static" style={{ padding: 24, marginBottom: 16 }}><div className="skeleton" style={{ height: 80 }} /></div>)}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Webhook Configuration</h1>
          <p className="page-subtitle">Set up SMS forwarding endpoints for bank notifications</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Webhook</button>
      </div>

      {/* Info banner */}
      <div className="glass-card-static" style={{ padding: '16px 20px', marginBottom: 24, borderLeft: '3px solid var(--accent-primary)' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-primary)' }}>How it works:</strong> Configure your SMS forwarding service to send bank notification texts to the webhook URL below. The SMS content should be sent in the configured HTTP header. Each incoming SMS will be automatically parsed and categorized by AI.
        </div>
      </div>

      {webhooks.length === 0 ? (
        <div className="glass-card-static empty-state">
          <div className="empty-state-icon">⚙️</div>
          <div className="empty-state-text">No webhooks configured yet.</div>
          <button className="btn btn-primary" onClick={openCreate}>Create Webhook</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {webhooks.map(wh => (
            <div key={wh.id} className="glass-card-static webhook-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{wh.name}</h3>
                  <span className={`badge ${wh.isActive ? 'badge-success' : 'badge-danger'}`}>
                    {wh.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input type="checkbox" className="toggle" checked={wh.isActive} onChange={() => handleToggle(wh)} />
                </div>
              </div>

              {/* Webhook URL */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Webhook URL</div>
                <div className="webhook-url">
                  <code>{getFullWebhookUrl(wh)}</code>
                  <button className="btn-ghost btn-sm" onClick={() => copyToClipboard(getFullWebhookUrl(wh), `url-${wh.id}`)}>
                    {copied === `url-${wh.id}` ? '✓' : '📋'}
                  </button>
                </div>
              </div>

              {/* Header Name */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>SMS Header</div>
                <div className="webhook-url">
                  <code>{wh.headerName}</code>
                </div>
              </div>

              {/* Secret Token */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Secret Token</div>
                <div className="webhook-url">
                  <code>{wh.secretToken}</code>
                  <button className="btn-ghost btn-sm" onClick={() => copyToClipboard(wh.secretToken, `token-${wh.id}`)}>
                    {copied === `token-${wh.id}` ? '✓' : '📋'}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(wh)}>✏️ Edit</button>
                <button className="btn btn-secondary btn-sm" onClick={() => handleRegenerate(wh.id)}>🔄 Regenerate Token</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(wh.id)}>🗑️ Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Edit Webhook' : 'New Webhook'}</h2>
              <button className="btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="input-group">
                  <label>Name</label>
                  <input className="input" value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="e.g. Bank of America SMS" required autoFocus />
                </div>
                <div className="input-group">
                  <label>SMS Header Name</label>
                  <input className="input" value={form.headerName}
                    onChange={e => setForm({...form, headerName: e.target.value})}
                    placeholder="e.g. X-SMS-Body" />
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                    The HTTP header that contains the SMS text. Default: X-SMS-Body
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
