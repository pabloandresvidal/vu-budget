import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg({ text: '', type: '' });
    if (password !== confirm) {
      return setMsg({ text: 'Passwords do not match', type: 'error' });
    }
    setLoading(true);
    try {
      const res = await api.resetPassword(token, password);
      // Wait to render the success message
      setMsg({ text: res.message || 'Success!', type: 'success' });
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-page">
        <div className="app-bg" />
        <div className="auth-card glass-card-static">
          <p style={{ color: 'white', textAlign: 'center' }}>Invalid or missing token</p>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Link to="/login" className="btn btn-secondary">Go to Login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="app-bg" />
      <div className="auth-card glass-card-static">
        <h1 className="auth-title">New Password</h1>
        <p className="auth-subtitle">Create a secure new password</p>

        {msg.text && (
          <div className={msg.type === 'error' ? 'auth-error' : ''} style={msg.type === 'success' ? { padding: '16px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, fontSize: '0.9rem', color: '#93c5fd', marginBottom: 24, textAlign: 'center' } : {}}>
            {msg.text}
            {msg.type === 'success' && (
              <div style={{ marginTop: 16 }}>
                <Link to="/login" className="btn btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>Go to Login</Link>
              </div>
            )}
          </div>
        )}

        {msg.type !== 'success' && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label>New Password</label>
              <input className="input" type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required />
            </div>
            <div className="input-group">
              <label>Confirm Password</label>
              <input className="input" type="password" placeholder="Repeat password" value={confirm} onChange={e => setConfirm(e.target.value)} minLength={6} required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
