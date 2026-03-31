import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export default function Login() {
  const { login, loginWithCode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('password'); // 'password' | 'code'
  const [codeSent, setCodeSent] = useState(false);
  const [codeMessage, setCodeMessage] = useState('');

  async function handlePasswordLogin(e) {
    e.preventDefault();
    setError('');
    setNeedsVerification(false);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      if (err.message?.includes('verify')) {
        setNeedsVerification(true);
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestCode(e) {
    e.preventDefault();
    setError('');
    setCodeMessage('');
    setLoading(true);
    try {
      const res = await api.requestLoginCode(email);
      setCodeSent(true);
      setCodeMessage(res.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginWithCode(email, code);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function switchMode(newMode) {
    setMode(newMode);
    setError('');
    setCodeSent(false);
    setCodeMessage('');
    setCode('');
    setNeedsVerification(false);
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

        {/* Mode Toggle */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4 }}>
          <button
            type="button"
            onClick={() => switchMode('password')}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
              background: mode === 'password' ? 'var(--primary-color)' : 'transparent',
              color: mode === 'password' ? '#fff' : 'var(--text-tertiary)',
              fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => switchMode('code')}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
              background: mode === 'code' ? 'var(--primary-color)' : 'transparent',
              color: mode === 'code' ? '#fff' : 'var(--text-tertiary)',
              fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Email Code
          </button>
        </div>

        {needsVerification && (
          <div style={{ padding: '12px 16px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, fontSize: '0.85rem', color: '#93c5fd', marginBottom: 8 }}>
            📬 Check your inbox for a verification email. <br />
            <Link to="/register" style={{ color: '#93c5fd', textDecoration: 'underline' }}>Re-register</Link> if you didn't receive it.
          </div>
        )}

        {!needsVerification && error && <div className="auth-error">{error}</div>}

        {codeMessage && !error && (
          <div style={{ padding: '12px 16px', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 8, fontSize: '0.85rem', color: '#7dd3fc', marginBottom: 16, textAlign: 'center' }}>
            📧 {codeMessage}
          </div>
        )}

        {/* PASSWORD MODE */}
        {mode === 'password' && (
          <form className="auth-form" onSubmit={handlePasswordLogin}>
            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <input id="email" className="input" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label htmlFor="password">Password</label>
                <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Forgot Password?</Link>
              </div>
              <input id="password" className="input" type="password" placeholder="Enter your password"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* EMAIL CODE MODE */}
        {mode === 'code' && !codeSent && (
          <form className="auth-form" onSubmit={handleRequestCode}>
            <div className="input-group">
              <label htmlFor="code-email">Email Address</label>
              <input id="code-email" className="input" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Login Code'}
            </button>
          </form>
        )}

        {mode === 'code' && codeSent && (
          <form className="auth-form" onSubmit={handleVerifyCode}>
            <div className="input-group">
              <label htmlFor="login-code">Enter the 6-digit code sent to your email</label>
              <input id="login-code" className="input" type="text" inputMode="numeric" maxLength={6}
                placeholder="000000" autoComplete="one-time-code"
                value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                required autoFocus
                style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.4rem', fontWeight: 700 }}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading || code.length !== 6}>
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>
            <button type="button" onClick={() => { setCodeSent(false); setCode(''); setError(''); setCodeMessage(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', paddingTop: 8, fontSize: '0.85rem' }}>
              ← Back to email
            </button>
          </form>
        )}

        <div className="auth-footer">
          Don't have an account? <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
}
