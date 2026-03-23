import { useState, useEffect } from 'react';
import { api } from '../utils/api';

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
}

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', totalAmount: '', autoReset: false, carryOver: false });
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);

  useEffect(() => { loadBudgets(); }, []);

  async function loadBudgets() {
    try {
      const data = await api.getBudgets();
      setBudgets(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditing(null);
    setForm({ title: '', description: '', totalAmount: '', autoReset: false, carryOver: false });
    setShowModal(true);
  }

  function openEdit(b) {
    setEditing(b);
    setForm({ title: b.title, description: b.description || '', totalAmount: String(b.totalAmount), autoReset: !!b.autoReset, carryOver: !!b.carryOver });
    setShowModal(true);
    setMenuOpen(null);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { title: form.title, description: form.description, totalAmount: Number(form.totalAmount), autoReset: form.autoReset, carryOver: form.carryOver };
      if (editing) {
        await api.updateBudget(editing.id, payload);
      } else {
        await api.createBudget(payload);
      }
      setShowModal(false);
      loadBudgets();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this budget? Transactions will become uncategorized.')) return;
    try {
      await api.deleteBudget(id);
      loadBudgets();
    } catch (err) { alert(err.message); }
    setMenuOpen(null);
  }

  if (loading) {
    return (
      <div>
        <div className="page-header"><h1 className="page-title">Budgets</h1></div>
        <div className="budget-grid">
          {[1,2,3].map(i => <div key={i} className="glass-card-static budget-card"><div className="skeleton" style={{height:120}} /></div>)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Budgets</h1>
          <p className="page-subtitle">Manage your spending categories</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Budget</button>
      </div>

      {budgets.length === 0 ? (
        <div className="glass-card-static empty-state">
          <div className="empty-state-icon">💰</div>
          <div className="empty-state-text">No budgets yet. Create your first budget to start tracking.</div>
          <button className="btn btn-primary" onClick={openCreate}>Create Budget</button>
        </div>
      ) : (
        <div className="budget-grid">
          {budgets.map(b => {
            const pct = b.totalAmount > 0 ? Math.min((b.spentAmount / b.totalAmount) * 100, 100) : 0;
            const isOver = b.spentAmount > b.totalAmount;
            return (
              <div key={b.id} className="glass-card budget-card">
                <div className="budget-card-header">
                  <div>
                    <div className="budget-title">{b.title}</div>
                    {b.description && <div className="budget-desc">{b.description}</div>}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                      {b.autoReset && <span className="badge badge-info" style={{fontSize: '0.65rem'}}>Auto-Resets</span>}
                      {b.carryOver && <span className="badge badge-success" style={{fontSize: '0.65rem'}}>Carries Over</span>}
                    </div>
                  </div>
                  <div className="actions-menu">
                    <button className="btn-ghost btn-icon" onClick={() => setMenuOpen(menuOpen === b.id ? null : b.id)}>⋮</button>
                    {menuOpen === b.id && (
                      <div className="actions-dropdown">
                        <button onClick={() => openEdit(b)}>✏️ Edit</button>
                        <button className="danger" onClick={() => handleDelete(b.id)}>🗑️ Delete</button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="budget-amount" style={{ color: isOver ? '#fca5a5' : '#6ee7b7' }}>
                  {formatCurrency(b.remaining)} <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 400 }}>remaining</span>
                </div>

                <div className="budget-progress">
                  <div className="budget-progress-bar">
                    <div className={`budget-progress-fill${isOver ? ' over' : ''}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="budget-progress-labels">
                    <span>{formatCurrency(b.spentAmount)} spent</span>
                    <span>{formatCurrency(b.totalAmount)} total</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Edit Budget' : 'New Budget'}</h2>
              <button className="btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="input-group">
                  <label>Title</label>
                  <input className="input" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                    placeholder="e.g. Groceries" required autoFocus />
                </div>
                <div className="input-group">
                  <label>Description</label>
                  <input className="input" value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                    placeholder="Optional description" />
                </div>
                <div className="input-group">
                  <label>Budget Amount ($)</label>
                  <input className="input" type="number" step="0.01" min="0" value={form.totalAmount}
                    onChange={e => setForm({...form, totalAmount: e.target.value})}
                    placeholder="e.g. 500.00" required />
                </div>
                <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={form.autoReset} onChange={e => setForm({...form, autoReset: e.target.checked})} />
                    Auto-reset monthly
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={form.carryOver} onChange={e => setForm({...form, carryOver: e.target.checked})} />
                    Carry-over balance
                  </label>
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
