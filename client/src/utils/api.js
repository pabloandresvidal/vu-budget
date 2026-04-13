const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('vu_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    if (endpoint !== '/auth/login') {
      localStorage.removeItem('vu_token');
      localStorage.removeItem('vu_user');
      window.location.href = '/login';
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  register: (data) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me'),
  verifyEmail: (token) => request(`/auth/verify/${token}`),
  completeOnboarding: (tier) => request('/auth/complete-onboarding', { method: 'POST', body: JSON.stringify({ tier }) }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token, password) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
  requestLoginCode: (email) => request('/auth/request-code', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyLoginCode: (email, code) => request('/auth/verify-code', { method: 'POST', body: JSON.stringify({ email, code }) }),

  // Budgets
  getBudgets: () => request('/budgets'),
  createBudget: (data) => request('/budgets', { method: 'POST', body: JSON.stringify(data) }),
  updateBudget: (id, data) => request(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBudget: (id) => request(`/budgets/${id}`, { method: 'DELETE' }),

  // Transactions
  getTransactions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/transactions${qs ? '?' + qs : ''}`);
  },
  getPendingTransactions: () => request('/transactions/pending'),
  updateTransaction: (id, data) => request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),

  // Dashboard
  getDashboardSummary: () => request('/dashboard/summary'),
  getDashboardByCategory: () => request('/dashboard/by-category'),
  getDashboardTrend: (days = 30) => request(`/dashboard/trend?days=${days}`),
  getTopVendors: (limit = 10) => request(`/dashboard/top-vendors?limit=${limit}`),

  // Webhooks (Admin)
  getWebhooks: () => request('/admin/webhooks'),
  createWebhook: (data) => request('/admin/webhooks', { method: 'POST', body: JSON.stringify(data) }),
  updateWebhook: (id, data) => request(`/admin/webhooks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWebhook: (id) => request(`/admin/webhooks/${id}`, { method: 'DELETE' }),
  regenerateToken: (id) => request(`/admin/webhooks/${id}/regenerate`, { method: 'POST' }),
  getWebhookLog: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/webhooks/log${qs ? '?' + qs : ''}`);
  },
  getWebhookTransactions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/webhooks/log/transactions${qs ? '?' + qs : ''}`);
  },

  // Notifications
  getNotifications: () => request('/notifications'),
  getUnreadCount: () => request('/notifications/unread-count'),
  markRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: () => request('/notifications/read-all', { method: 'PUT' }),

  // Settings & Profile
  getProfile: () => request('/settings/profile'),
  updateProfile: (data) => request('/settings/profile', { method: 'PUT', body: JSON.stringify(data) }),
  deleteAccount: () => request('/settings/account', { method: 'DELETE' }),

  // Ignored Patterns
  getIgnoredPatterns: () => request('/ignored-patterns'),
  addIgnoredPattern: (pattern) => request('/ignored-patterns', { method: 'POST', body: JSON.stringify({ pattern }) }),
  deleteIgnoredPattern: (id) => request(`/ignored-patterns/${id}`, { method: 'DELETE' }),

  // Partner
  getPartnerCode: () => request('/partner/code'),
  joinPartner: (code) => request('/partner/join', { method: 'POST', body: JSON.stringify({ code }) }),
  unlinkPartner: () => request('/partner/unlink', { method: 'DELETE' }),

  // Push
  getVapidKey: () => request('/push/vapid-key'),
  subscribePush: (data) => request('/push/subscribe', { method: 'POST', body: JSON.stringify(data) }),
};
