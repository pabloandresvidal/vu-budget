import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../utils/api';

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState(null);
  const notifRef = useRef(null);
  const prevCountRef = useRef(0);
  const location = useLocation();
  const navigate = useNavigate();

  // Close sidebar on navigate (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location]);

  // Fetch notifications
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function loadNotifications() {
    try {
      const [notifs, count] = await Promise.all([api.getNotifications(), api.getUnreadCount()]);
      setNotifications(notifs);
      setUnreadCount(count.count);

      // Show toast if new unread notifications arrived
      if (count.count > prevCountRef.current && notifs.length > 0) {
        const newest = notifs[0]; // Assuming descending order
        setToast(newest.message);
        setTimeout(() => setToast(null), 5000); // Hide after 5 seconds
      }
      prevCountRef.current = count.count;
    } catch {}
  }

  async function handleNotificationClick(n) {
    if (!n.isRead) {
      await api.markRead(n.id);
      loadNotifications();
    }
    setShowNotifs(false);
    navigate('/transactions');
  }

  async function handleMarkAllRead() {
    await api.markAllRead();
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  const navLinks = [
    { to: '/', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>, label: 'Dashboard', end: true },
    { to: '/budgets', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, label: 'Budgets' },
    { to: '/transactions', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>, label: 'Transactions' },
    { to: '/admin', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>, label: 'Webhooks' },
    { to: '/settings', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>, label: 'Settings' },
  ];

  const initials = user?.displayName?.slice(0, 2).toUpperCase() || user?.username?.slice(0, 2).toUpperCase() || 'VU';

  return (
    <div className="app-layout">
      {/* Toast Notification */}
      <div 
        className={`toast-notification ${toast ? 'visible' : ''}`}
        onClick={() => {
          setToast(null);
          navigate('/transactions');
        }}
      >
        <div style={{ marginRight: 12, fontSize: '1.2rem' }}>🔔</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>New Transaction</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{toast}</div>
        </div>
      </div>


      {/* Sidebar */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">V</div>
          <span className="sidebar-logo-text">VU Budget</span>
        </div>

        <nav className="sidebar-nav">
          {navLinks.map(link => (
            <NavLink key={link.to} to={link.to} end={link.end}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              <span className="sidebar-link-icon">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.displayName || user?.username}</div>
            <div className="sidebar-user-role">Personal Account</div>
          </div>
          <button className="btn-ghost btn-icon" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="btn-ghost btn-icon" onClick={logout} title="Sign out">🚪</button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        {/* Top bar with notification */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4, position: 'relative', zIndex: 105 }}>
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              className="notif-bell"
              type="button"
              role="button"
              onClick={() => setShowNotifs(!showNotifs)}
              onTouchEnd={(e) => { e.preventDefault(); setShowNotifs(prev => !prev); }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>

            {showNotifs && (
              <div className="notif-dropdown">
                <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Notifications</span>
                  {unreadCount > 0 && (
                    <button className="btn-ghost btn-sm" onClick={handleMarkAllRead}>Mark all read</button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                    No notifications yet
                  </div>
                ) : (
                  notifications.slice(0, 15).map(n => (
                    <div key={n.id} className={`notif-item${!n.isRead ? ' unread' : ''}`}
                         onClick={() => handleNotificationClick(n)} style={{ cursor: 'pointer' }}>
                      <div className="notif-message">{n.message}</div>
                      <div className="notif-time">{timeAgo(n.createdAt)}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="page-enter">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="mobile-bottom-tabs">
        {navLinks.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `mobile-tab${isActive ? ' active' : ''}`}
          >
            <span className="mobile-tab-icon">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
