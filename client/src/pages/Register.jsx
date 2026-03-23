import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (password !== confirm) {
      return setError('Passwords do not match');
    }
    setLoading(true);
    try {
      const res = await register({ username: email, password, email });
      if (res.requiresVerification) {
        setSuccessMsg(res.message);
        // Clear form
        setEmail(''); setPassword(''); setConfirm('');
      } else {
        navigate('/'); // Logged in immediately
      }
    } catch (err) {
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
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Start managing your budget with AI</p>

        {error && (
          <div className="auth-error">
            {error}
            {error.toLowerCase().includes('already exists') && (
              <div style={{ marginTop: 12 }}>
                <Link to="/forgot-password" style={{ color: 'white', textDecoration: 'underline' }}>Recover your password instead?</Link>
              </div>
            )}
          </div>
        )}
        {successMsg && (
          <div style={{ padding: '16px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, fontSize: '0.9rem', color: '#93c5fd', marginBottom: 24, textAlign: 'center' }}>
            {successMsg}
          </div>
        )}

        {!successMsg && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="reg-email">Email Address</label>
              <input id="reg-email" className="input" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="input-group">
              <label htmlFor="reg-password">Password</label>
              <input id="reg-password" className="input" type="password" placeholder="Min 6 characters"
                value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="input-group">
              <label htmlFor="reg-confirm">Confirm Password</label>
              <input id="reg-confirm" className="input" type="password" placeholder="Repeat password"
                value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        )}

        <div className="auth-footer" style={{ marginTop: 24 }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
