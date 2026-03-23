import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../utils/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the link.');
      return;
    }
    api.verifyEmail(token)
      .then(res => {
        setStatus('success');
        setMessage(res.message || 'Email verified successfully!');
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.message || 'Verification failed. The link may have expired.');
      });
  }, [token]);

  return (
    <div className="auth-page">
      <div className="app-bg" />
      <div className="auth-card glass-card-static" style={{ textAlign: 'center', padding: 48 }}>
        {status === 'loading' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>⏳</div>
            <h2 className="auth-title">Verifying your email…</h2>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>✅</div>
            <h2 className="auth-title" style={{ color: '#6ee7b7' }}>Email Verified!</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8, marginBottom: 32 }}>{message}</p>
            <Link to="/login" className="btn btn-primary" style={{ display: 'inline-flex' }}>
              Go to Login →
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>❌</div>
            <h2 className="auth-title" style={{ color: '#fca5a5' }}>Verification Failed</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8, marginBottom: 32 }}>{message}</p>
            <Link to="/login" className="btn btn-secondary" style={{ display: 'inline-flex' }}>
              Back to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
