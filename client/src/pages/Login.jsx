import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setNeedsVerification(false);
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      if (err.message?.includes('verify')) {
        setNeedsVerification(true);
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="app-bg" />
      <div className="auth-card glass-card-static">
        <div className="auth-logo">
          <div className="sidebar-logo-icon" style={{ width: 48, height: 48, fontSize: '1.4rem' }}>V</div>
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your VU Budget account</p>

        {needsVerification ? (
          <div style={{ padding: '12px 16px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, fontSize: '0.85rem', color: '#93c5fd', marginBottom: 8 }}>
            📬 Check your inbox for a verification email. <br />
            <Link to="/register" style={{ color: '#93c5fd', textDecoration: 'underline' }}>Re-register</Link> if you didn't receive it.
          </div>
        ) : (
          error && <div className="auth-error">{error}</div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input id="username" className="input" type="text" placeholder="Enter your username"
              value={username} onChange={e => setUsername(e.target.value)} required autoFocus />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input id="password" className="input" type="password" placeholder="Enter your password"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
}
