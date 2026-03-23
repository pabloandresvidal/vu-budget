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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(18,18,42,0.95)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, padding: '8px 12px', fontSize: '0.82rem'
    }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{label}</div>
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
    return () => clearInterval(interval);
  }, [loadData]);

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
        <div className="glass-card stat-card orange">
          <div className="stat-label">Pending Review</div>
          <div className="stat-value orange">{summary?.pendingReview || 0}</div>
          <div className="stat-change">{summary?.totalTransactions || 0} total transactions</div>
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
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                  tickFormatter={d => new Date(d + 'T00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                  tickFormatter={v => `$${v}`} axisLine={false} tickLine={false} />
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
            <BarChart data={vendors} layout="vertical" margin={{ left: 80, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                tickFormatter={v => `$${v}`} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="vendor" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                axisLine={false} tickLine={false} width={80} />
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
