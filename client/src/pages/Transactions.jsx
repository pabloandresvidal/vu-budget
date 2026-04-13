import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';
import { useCurrency } from '../context/CurrencyContext';

export default function Transactions() {
  const { formatCurrency } = useCurrency();
  const [searchParams] = useSearchParams();
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(searchParams.get('tab') === 'pending' ? 'pending' : 'all');
  const [editingTx, setEditingTx] = useState(null);
  const [editForm, setEditForm] = useState({ budgetId: '', percentage: '100', vendor: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [filterBudget, setFilterBudget] = useState(searchParams.get('budgetId') || '');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [tab, filterBudget]);

  async function loadData() {
    setLoading(true);
    try {
      const [bData] = await Promise.all([api.getBudgets()]);
      setBudgets(bData);

      if (tab === 'pending') {
        const pending = await api.getPendingTransactions();
        setTransactions(pending);
      } else {
        const params = {};
        if (filterBudget) params.budgetId = filterBudget;
        const data = await api.getTransactions(params);
        setTransactions(data.transactions);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function openEdit(tx) {
    setEditingTx(tx);
    setEditForm({
      budgetId: tx.budgetId || '',
      percentage: String(tx.percentage),
      vendor: tx.vendor || '',
      description: tx.description || '',
    });
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateTransaction(editingTx.id, {
        budgetId: editForm.budgetId ? Number(editForm.budgetId) : null,
        percentage: Number(editForm.percentage),
        vendor: editForm.vendor,
        description: editForm.description,
      });
      setEditingTx(null);
      loadData();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this transaction?')) return;
    try {
      await api.deleteTransaction(id);
      loadData();
    } catch (err) { alert(err.message); }
  }

  async function muteVendor(vendor) {
    if (!vendor || vendor.trim() === '' || vendor === '—') {
      return alert("This transaction has no distinct vendor name to ignore.");
    }
    if (!confirm(`Are you sure you want to permanently ignore all future text messages containing "${vendor}"?`)) return;
    try {
      await api.addIgnoredPattern(vendor);
      alert(`Successfully muted "${vendor}". You can un-hide this rule in Settings.`);
    } catch (e) {
      alert(e.message || 'Failed to ignore vendor');
    }
  }

  const pendingCount = transactions.filter(t => t.needsReview).length;

  const filteredTransactions = transactions.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const vendorMatch = (t.vendor || '').toLowerCase().includes(q);
    const descMatch = (t.description || '').toLowerCase().includes(q);
    const amountMatch = String(t.amount || '').includes(q);
    const smsMatch = (t.rawSms || '').toLowerCase().includes(q);
    return vendorMatch || descMatch || amountMatch || smsMatch;
  });

  // Find the budget name for the active filter
  const activeBudgetName = filterBudget ? budgets.find(b => String(b.id) === String(filterBudget))?.title : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">
            {activeBudgetName
              ? `Showing transactions for "${activeBudgetName}"`
              : 'View and manage your transaction history'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ maxWidth: 360 }}>
        <div className={`tab${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>
          All Transactions
        </div>
        <div className={`tab${tab === 'pending' ? ' active' : ''}`} onClick={() => setTab('pending')}>
          Needs Review {pendingCount > 0 && `(${pendingCount})`}
        </div>
      </div>

      {/* Filters */}
      <div className="filters-row" style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input 
          className="input" 
          type="text" 
          placeholder="Search vendor, description..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: '200px' }}
        />
        {tab === 'all' && (
          <select className="input" value={filterBudget} onChange={e => setFilterBudget(e.target.value)}
            style={{ width: 180 }}>
            <option value="">All budgets</option>
            {budgets.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="glass-card-static" style={{ overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: 24 }}>
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 44, marginBottom: 4 }} />)}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">
              {tab === 'pending' ? 'No transactions need review!' : 'No transactions found.'}
            </div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Vendor</th>
                <th>Amount</th>
                <th>%</th>
                <th>Effective</th>
                <th>Budget</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(tx => (
                <tr key={tx.id}>
                  <td data-label="Date" style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {new Date(tx.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </td>
                  <td data-label="Vendor">
                    <div style={{ fontWeight: 500 }}>{tx.vendor || '—'}</div>
                    {tx.description && <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{tx.description}</div>}
                  </td>
                  <td data-label="Amount" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{formatCurrency(tx.amount)}</td>
                  <td data-label="%">
                    {tx.percentage !== 100 && (
                      <span className="badge badge-info">{tx.percentage}%</span>
                    )}
                    {tx.percentage === 100 && <span style={{ color: 'var(--text-tertiary)' }}>100%</span>}
                  </td>
                  <td data-label="Effective" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(tx.effectiveAmount)}</td>
                  <td data-label="Budget">
                    {tx.budgetTitle ? (
                      <span className="badge badge-success">{tx.budgetTitle}</span>
                    ) : (
                      <span className="badge badge-warning">Uncategorized</span>
                    )}
                  </td>
                  <td data-label="Status">
                    {tx.needsReview ? (
                      <span className="badge badge-warning">Review</span>
                    ) : tx.categorizedBy === 'ai' ? (
                      <span className="badge badge-ai">AI</span>
                    ) : (
                      <span className="badge badge-success">✓</span>
                    )}
                  </td>
                  <td data-label="Actions">
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-ghost btn-sm" onClick={() => openEdit(tx)} title="Edit">✏️</button>
                      <button className="btn-ghost btn-sm" onClick={() => muteVendor(tx.vendor)} title="Mute future texts from this vendor">🔇</button>
                      <button className="btn-ghost btn-sm" onClick={() => handleDelete(tx.id)} title="Delete">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      {editingTx && (
        <div className="modal-overlay" onClick={() => setEditingTx(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Transaction</h2>
              <button className="btn-ghost btn-icon" onClick={() => setEditingTx(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                {editingTx.rawSms && (
                  <div style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: 8, fontSize: '0.82rem', color: 'var(--text-secondary)', fontFamily: 'monospace', lineHeight: 1.5 }}>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 4 }}>Original SMS</div>
                    {editingTx.rawSms}
                  </div>
                )}

                <div className="input-group">
                  <label>Vendor</label>
                  <input className="input" value={editForm.vendor}
                    onChange={e => setEditForm({...editForm, vendor: e.target.value})} />
                </div>

                <div className="input-group">
                  <label>Description</label>
                  <input className="input" value={editForm.description}
                    onChange={e => setEditForm({...editForm, description: e.target.value})} />
                </div>

                <div className="input-group">
                  <label>Budget Category</label>
                  <select className="input" value={editForm.budgetId}
                    onChange={e => setEditForm({...editForm, budgetId: e.target.value})}>
                    <option value="">Uncategorized</option>
                    {budgets.map(b => <option key={b.id} value={b.id}>{b.title} ({formatCurrency(b.remaining)} left)</option>)}
                  </select>
                </div>

                <div className="input-group">
                  <label>Your Percentage (%)</label>
                  <input className="input" type="number" min="1" max="100" step="1"
                    value={editForm.percentage}
                    onChange={e => setEditForm({...editForm, percentage: e.target.value})} />
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                    Effective amount: {formatCurrency(editingTx.amount * (Number(editForm.percentage) / 100))}
                    {Number(editForm.percentage) < 100 && ` (${100 - Number(editForm.percentage)}% shared with someone else)`}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingTx(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
