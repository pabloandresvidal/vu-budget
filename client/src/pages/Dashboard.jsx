import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import {
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar
} from 'recharts';

const COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6'];

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
      color: 'var(--text-primary)',
      borderRadius: 8, padding: '8px 12px', fontSize: '0.82rem',
      boxShadow: 'var(--glass-shadow)'
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#a78bfa' }}>
          {p.name}: {formatCurrency(p.value)}
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [trend, setTrend] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [pushPermission, setPushPermission] = useState('granted');

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [s, c, t, v] = await Promise.all([
        api.getDashboardSummary(),
        api.getDashboardByCategory(),
        api.getDashboardTrend(30),
        api.getTopVendors(8),
      ]);
      setSummary(s); setCategories(c); setTrend(t); setVendors(v);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 15000);

    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }

    // Clear app icon badge when dashboard is opened
    if ('clearAppBadge' in navigator) {
      navigator.clearAppBadge().catch(e => console.warn('Badge clear error', e));
    }

    // Setup push notifications silently if already granted
    if ('serviceWorker' in navigator && 'PushManager' in window && Notification.permission === 'granted') {
      setupPush();
    }

    return () => clearInterval(interval);
  }, [loadData]);

  async function setupPush() {
    console.log('[PUSH SETUP] setupPush triggered. Current permission:', Notification.permission);
    try {
      if (Notification.permission === 'default') {
        console.log('[PUSH SETUP] Requesting permission from user...');
        const perm = await Notification.requestPermission();
        console.log('[PUSH SETUP] User answered:', perm);
      }
      if (Notification.permission === 'granted') {
        console.log('[PUSH SETUP] Permission is granted. Fetching SW registration...');
        const reg = await navigator.serviceWorker.ready;
        console.log('[PUSH SETUP] SW is ready. Scope:', reg.scope);
        let sub = await reg.pushManager.getSubscription();
        console.log('[PUSH SETUP] Existing subscription:', sub ? 'Found' : 'None');
        
        const { publicKey } = await api.getVapidKey();
        const serverKeyBuffer = urlBase64ToUint8Array(publicKey);

        if (sub) {
          // Compare browser's existing server key to backend's current key
          const currentKey = new Uint8Array(sub.options.applicationServerKey);
          let match = currentKey.length === serverKeyBuffer.length;
          if (match) {
            for (let i = 0; i < currentKey.length; i++) {
              if (currentKey[i] !== serverKeyBuffer[i]) {
                match = false; break;
              }
            }
          }
          if (!match) {
            console.warn('[PUSH SETUP] VAPID key changed on backend! Unsubscribing broken token...');
            await sub.unsubscribe();
            sub = null;
          }
        }

        if (!sub) {
          console.log('[PUSH SETUP] Subscribing via PushManager...');
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: serverKeyBuffer
          });
          console.log('[PUSH SETUP] Got subscription from browser. Sending to server...');
          await api.subscribePush(sub.toJSON());
          console.log('[PUSH SETUP] Success! Server securely stored subscription.');
        } else {
          await api.subscribePush(sub.toJSON());
          console.log('[PUSH SETUP] Validated existing subscription with server.');
        }
      } else {
        console.warn('[PUSH SETUP] Permission strictly denied by user or device.');
      }
    } catch (err) {
      console.error('[PUSH SETUP] Fatal error during setup:', err);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="page-header"><h1 className="page-title">Dashboard</h1></div>
        <div className="stat-grid">
          {[1,2,3,4].map(i => <div key={i} className="glass-card-static stat-card"><div className="skeleton" style={{height:60}} /></div>)}
        </div>
      </div>
    );
  }

  const usagePercent = summary && summary.totalBudget > 0
    ? Math.round((summary.totalSpent / summary.totalBudget) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your spending and budgets</p>
        </div>
        <span className="last-updated">Live — {lastUpdated.toLocaleTimeString()}</span>
      </div>

      {/* iOS Push Prompt (Requires User Gesture) */}
      {pushPermission === 'default' && (
        <div className="glass-card-static" style={{ padding: '16px 20px', marginBottom: 24, borderLeft: '3px solid var(--accent-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 4 }}>Enable Push Notifications</h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Get instant alerts on your lockscreen when bank transactions are categorized.</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={async () => {
            await setupPush();
            if ('Notification' in window) setPushPermission(Notification.permission);
          }}>Enable Notifications</button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="stat-grid">
        <div className="glass-card stat-card purple">
          <div className="stat-label">Total Budget</div>
          <div className="stat-value purple">{formatCurrency(summary?.totalBudget)}</div>
          <div className="stat-change">Across all categories</div>
        </div>
        <div className="glass-card stat-card cyan">
          <div className="stat-label">Total Spent</div>
          <div className="stat-value cyan">{formatCurrency(summary?.totalSpent)}</div>
          <div className="stat-change">{usagePercent}% of budget used</div>
        </div>
        <div className="glass-card stat-card green">
          <div className="stat-label">Remaining</div>
          <div className="stat-value green">{formatCurrency(summary?.remaining)}</div>
          <div className="stat-change">Available to spend</div>
        </div>
        <div className="glass-card stat-card orange"
          onClick={() => window.location.href = '/transactions?tab=pending'}
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer', transition: 'all 0.2s ease', border: '1px solid var(--color-warning)' }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(245, 158, 11, 0.2)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'var(--glass-shadow)';
          }}
        >
          <div className="stat-label" style={{ color: 'var(--color-warning)', fontWeight: 'bold' }}>⚠️ Pending Review</div>
          <div className="stat-value orange">{summary?.pendingReview || 0}</div>
          <div className="stat-change" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
            Click to review {summary?.pendingReview || 0} transactions ➡️
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
        {/* Spending by Category Pie */}
        <div className="glass-card-static chart-container">
          <div className="chart-title">Spending by Category</div>
          {categories.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={categories} dataKey="spent" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                  innerRadius={55} paddingAngle={3} strokeWidth={0}>
                  {categories.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div style={{ fontSize: '2rem', opacity: 0.3 }}>📊</div>
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginTop: 8 }}>No spending data yet</div>
            </div>
          )}
          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 8 }}>
            {categories.map((c, i) => (
              <div key={c.id || i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)' }}>{c.name}</span>
                <span style={{ color: 'var(--text-tertiary)' }}>{formatCurrency(c.spent)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Spending Trend */}
        <div className="glass-card-static chart-container">
          <div className="chart-title">Spending Trend (30 Days)</div>
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trend} margin={{ top: 5, right: 20, left: 10, bottom: 25 }}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                  tickFormatter={d => new Date(d + 'T00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  axisLine={false} tickLine={false}
                  label={{ value: 'Date', position: 'insideBottom', offset: -15, fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }} />
                <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                  tickFormatter={v => `$${v}`} axisLine={false} tickLine={false}
                  label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft', offset: 0, fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="total" stroke="#7c3aed" strokeWidth={2}
                  fill="url(#trendGradient)" name="Spent" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div style={{ fontSize: '2rem', opacity: 0.3 }}>📈</div>
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginTop: 8 }}>No trend data yet</div>
            </div>
          )}
        </div>
      </div>

      {/* Top Vendors */}
      <div className="glass-card-static chart-container">
        <div className="chart-title">Top Vendors</div>
        {vendors.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(200, vendors.length * 40)}>
            <BarChart data={vendors} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                tickFormatter={v => `$${v}`} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="vendor" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                axisLine={false} tickLine={false} width={120} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" name="Total Spent" radius={[0, 4, 4, 0]} maxBarSize={24}>
                {vendors.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state" style={{ padding: '40px 0' }}>
            <div style={{ fontSize: '2rem', opacity: 0.3 }}>🏪</div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginTop: 8 }}>No vendor data yet</div>
          </div>
        )}
      </div>
    </div>
  );
}
