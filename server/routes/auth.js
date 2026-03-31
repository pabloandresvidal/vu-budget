import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { sendWelcomeEmail, sendVerificationEmail, sendPasswordResetEmail, sendLoginCode } from '../services/email.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password, displayName, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be 3-30 characters' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username.toLowerCase(), email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email/username already exists.', emailExists: true });
    }

    const hash = await bcrypt.hash(password, 12);

    // Generate verify token if email provided
    const verifyToken = email ? uuidv4() : null;
    // If no email, mark as verified automatically
    const isVerified = email ? 0 : 1;

    const result = db.prepare(
      'INSERT INTO users (username, password_hash, display_name, email, is_verified, verify_token) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(username.toLowerCase(), hash, displayName || username, email || null, isVerified, verifyToken);

    // Send verification email if provided (non-blocking)
    if (email && verifyToken) {
      sendVerificationEmail({ email, display_name: displayName || username }, verifyToken).catch(() => {});
    }

    // If no email verification needed, log in immediately
    if (isVerified) {
      const token = jwt.sign(
        { id: result.lastInsertRowid, username: username.toLowerCase() },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.status(201).json({
        token,
        user: { 
          id: result.lastInsertRowid, 
          username: username.toLowerCase(), 
          displayName: displayName || username,
          onboarding_completed: false,
          subscription_tier: 'free'
        }
      });
    }

    res.status(201).json({
      message: 'Account created! Please check your email to verify your account before logging in.',
      requiresVerification: true
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username.toLowerCase(), username.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Block unverified users
    if (!user.is_verified) {
      return res.status(403).json({
        error: 'Please verify your email before logging in. Check your inbox for a verification link.',
        requiresVerification: true
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { 
        id: user.id, 
        username: user.username, 
        displayName: user.display_name,
        onboarding_completed: Boolean(user.onboarding_completed),
        subscription_tier: user.subscription_tier,
        notify_budget_updates: Boolean(user.notify_budget_updates),
        notify_tx_updates: Boolean(user.notify_tx_updates),
        notify_weekly_summary: Boolean(user.notify_weekly_summary),
        notify_high_spending: Boolean(user.notify_high_spending)
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/verify/:token
router.get('/verify/:token', (req, res) => {
  const { token } = req.params;
  const user = db.prepare('SELECT id, username, display_name FROM users WHERE verify_token = ?').get(token);

  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired verification link.' });
  }

  db.prepare('UPDATE users SET is_verified = 1, verify_token = NULL WHERE id = ?').run(user.id);

  res.json({ success: true, message: 'Email verified! You can now log in.' });
});

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || user.is_verified) {
    // Return success even if not found to prevent user enumeration
    return res.json({ message: 'If that email is registered, a new link has been sent.' });
  }

  const token = uuidv4();
  db.prepare('UPDATE users SET verify_token = ? WHERE id = ?').run(token, user.id);
  sendVerificationEmail(user, token).catch(() => {});

  res.json({ message: 'Verification email resent. Please check your inbox.' });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ 
    id: user.id, 
    username: user.username, 
    displayName: user.display_name, 
    createdAt: user.created_at,
    onboarding_completed: Boolean(user.onboarding_completed),
    subscription_tier: user.subscription_tier,
    notify_budget_updates: Boolean(user.notify_budget_updates),
    notify_tx_updates: Boolean(user.notify_tx_updates),
    notify_weekly_summary: Boolean(user.notify_weekly_summary),
    notify_high_spending: Boolean(user.notify_high_spending)
  });
});

// POST /api/auth/complete-onboarding
router.post('/complete-onboarding', authMiddleware, (req, res) => {
  const { tier } = req.body;
  if (tier !== 'free') return res.status(400).json({ error: 'Only free tier is currently supported' });

  db.prepare('UPDATE users SET onboarding_completed = 1, subscription_tier = ? WHERE id = ?').run(tier, req.user.id);
  res.json({ success: true, onboarding_completed: true, subscription_tier: tier });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?').get(email.toLowerCase(), email.toLowerCase());
  
  if (!user) {
    return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  }

  const token = uuidv4();
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  db.prepare('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?').run(token, expires, user.id);
  
  sendPasswordResetEmail(user, token).catch(() => {});

  res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  
  if (!token || !password) return res.status(400).json({ error: 'Invalid request' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const user = db.prepare('SELECT id, reset_expires FROM users WHERE reset_token = ?').get(token);
  
  if (!user || new Date(user.reset_expires) < new Date()) {
    return res.status(400).json({ error: 'Password reset link is invalid or has expired.' });
  }

  const hash = await bcrypt.hash(password, 12);
  db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?').run(hash, user.id);

  res.json({ success: true, message: 'Password has been successfully reset! You may now log in.' });
});

// POST /api/auth/request-code
// Send a 6-digit passwordless login code to the user's email
router.post('/request-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Always return generic success to prevent email enumeration
    const genericMsg = { message: 'If an account with that email exists, a login code has been sent.' };

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user || !user.is_verified) {
      return res.json(genericMsg);
    }

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    db.prepare('UPDATE users SET login_code = ?, login_code_expires = ? WHERE id = ?').run(code, expires, user.id);

    // Send code via email (non-blocking)
    sendLoginCode(user, code).catch(() => {});

    res.json(genericMsg);
  } catch (err) {
    console.error('Request-code error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/verify-code
// Validate the 6-digit code and return a JWT
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());

    if (!user || !user.login_code || user.login_code !== code.trim()) {
      return res.status(401).json({ error: 'Invalid or expired code.' });
    }

    if (new Date(user.login_code_expires) < new Date()) {
      // Clear expired code
      db.prepare('UPDATE users SET login_code = NULL, login_code_expires = NULL WHERE id = ?').run(user.id);
      return res.status(401).json({ error: 'Code has expired. Please request a new one.' });
    }

    // Clear used code
    db.prepare('UPDATE users SET login_code = NULL, login_code_expires = NULL WHERE id = ?').run(user.id);

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        onboarding_completed: Boolean(user.onboarding_completed),
        subscription_tier: user.subscription_tier,
        notify_budget_updates: Boolean(user.notify_budget_updates),
        notify_tx_updates: Boolean(user.notify_tx_updates),
        notify_weekly_summary: Boolean(user.notify_weekly_summary),
        notify_high_spending: Boolean(user.notify_high_spending)
      }
    });
  } catch (err) {
    console.error('Verify-code error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
