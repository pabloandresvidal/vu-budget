import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });
    try {
      const res = await api.forgotPassword(email);
      setMsg({ text: res.message, type: 'success' });
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="app-bg" />
      <div className="auth-card glass-card-static">
        <h1 className="auth-title">Recover Password</h1>
        <p className="auth-subtitle">Enter your email to receive a reset link</p>

        {msg.text && (
          <div className={msg.type === 'error' ? 'auth-error' : ''} style={msg.type === 'success' ? { padding: '16px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, fontSize: '0.9rem', color: '#93c5fd', marginBottom: 24, textAlign: 'center' } : {}}>
            {msg.text}
          </div>
        )}

        {msg.type !== 'success' && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Email Address</label>
              <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <div className="auth-footer" style={{ marginTop: 24 }}>
          Remembered your password? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
