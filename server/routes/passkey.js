import { Router } from 'express';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

function getRpId() {
  if (process.env.RP_ID) return process.env.RP_ID;
  // Derive from APP_URL if available
  try {
    return new URL(process.env.APP_URL).hostname;
  } catch {
    return 'localhost';
  }
}

function getExpectedOrigins() {
  if (process.env.RP_ORIGIN) return [process.env.RP_ORIGIN];
  if (process.env.APP_URL) return [process.env.APP_URL];
  // In development, allow both localhost variants
  const port = process.env.PORT || 3000;
  return [`http://localhost:${port}`, `http://localhost:5173`];
}

function getUserCredentials(userId) {
  return db.prepare('SELECT * FROM passkey_credentials WHERE user_id = ?').all(userId);
}

function isoBase64URL_toBuffer(base64url) {
  return Buffer.from(base64url, 'base64url');
}

// ── Authenticated Routes (Settings — manage passkeys) ────────────────────────

// GET /api/passkey/credentials — List user's passkeys
router.get('/credentials', authMiddleware, (req, res) => {
  const creds = getUserCredentials(req.user.id);
  res.json(creds.map(c => ({
    id: c.id,
    name: c.name,
    deviceType: c.device_type,
    backedUp: !!c.backed_up,
    transports: c.transports ? JSON.parse(c.transports) : [],
    createdAt: c.created_at,
  })));
});

// POST /api/passkey/register-options — Generate registration challenge
router.post('/register-options', authMiddleware, async (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const existingCreds = getUserCredentials(user.id);

    const options = await generateRegistrationOptions({
      rpName: 'VU Budget',
      rpID: getRpId(),
      userName: user.email || user.username,
      userDisplayName: user.display_name || user.username,
      // Prevent re-registering the same authenticator
      excludeCredentials: existingCreds.map(c => ({
        id: c.id,
        transports: c.transports ? JSON.parse(c.transports) : undefined,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      attestationType: 'none',
    });

    // Store challenge for verification
    db.prepare('UPDATE users SET current_challenge = ? WHERE id = ?')
      .run(options.challenge, user.id);

    res.json(options);
  } catch (err) {
    console.error('Passkey register-options error:', err);
    res.status(500).json({ error: 'Failed to generate registration options' });
  }
});

// POST /api/passkey/register-verify — Verify and store the credential
router.post('/register-verify', authMiddleware, async (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user || !user.current_challenge) {
      return res.status(400).json({ error: 'No registration in progress' });
    }

    const { body, name } = req.body;

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: user.current_challenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: getRpId(),
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: 'Verification failed' });
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    // Store the credential
    db.prepare(
      `INSERT INTO passkey_credentials (id, user_id, public_key, counter, device_type, backed_up, transports, name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      credential.id,
      user.id,
      Buffer.from(credential.publicKey),
      credential.counter,
      credentialDeviceType,
      credentialBackedUp ? 1 : 0,
      JSON.stringify(credential.transports || []),
      (name || '').trim() || 'Passkey'
    );

    // Clear challenge
    db.prepare('UPDATE users SET current_challenge = NULL WHERE id = ?').run(user.id);

    res.json({ success: true, message: 'Passkey registered successfully!' });
  } catch (err) {
    console.error('Passkey register-verify error:', err);
    res.status(500).json({ error: 'Failed to verify registration' });
  }
});

// DELETE /api/passkey/:id — Remove a passkey
router.delete('/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM passkey_credentials WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Passkey not found' });
  }
  res.json({ success: true });
});

// PUT /api/passkey/:id/rename — Rename a passkey
router.put('/:id/rename', authMiddleware, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

  const result = db.prepare('UPDATE passkey_credentials SET name = ? WHERE id = ? AND user_id = ?')
    .run(name.trim(), req.params.id, req.user.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Passkey not found' });
  }
  res.json({ success: true });
});

// ── Public Routes (Login — authenticate with passkey) ────────────────────────

// POST /api/passkey/auth-options — Generate authentication challenge
router.post('/auth-options', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?')
      .get(email.toLowerCase(), email.toLowerCase());

    if (!user) {
      // Don't reveal whether the user exists — still return valid-looking options
      // with no allowCredentials so the browser shows the generic passkey picker
      const options = await generateAuthenticationOptions({
        rpID: getRpId(),
        userVerification: 'preferred',
      });
      return res.json(options);
    }

    const creds = getUserCredentials(user.id);

    if (creds.length === 0) {
      return res.status(400).json({ error: 'No passkeys registered for this account. Please log in with password or email code.' });
    }

    const options = await generateAuthenticationOptions({
      rpID: getRpId(),
      allowCredentials: creds.map(c => ({
        id: c.id,
        transports: c.transports ? JSON.parse(c.transports) : undefined,
      })),
      userVerification: 'preferred',
    });

    // Store challenge for verification
    db.prepare('UPDATE users SET current_challenge = ? WHERE id = ?')
      .run(options.challenge, user.id);

    res.json(options);
  } catch (err) {
    console.error('Passkey auth-options error:', err);
    res.status(500).json({ error: 'Failed to generate authentication options' });
  }
});

// POST /api/passkey/auth-verify — Verify authentication and return JWT
router.post('/auth-verify', async (req, res) => {
  try {
    const { body, email } = req.body;
    if (!body || !email) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?')
      .get(email.toLowerCase(), email.toLowerCase());

    if (!user || !user.current_challenge) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    // Find the credential being used
    const credential = db.prepare('SELECT * FROM passkey_credentials WHERE id = ? AND user_id = ?')
      .get(body.id, user.id);

    if (!credential) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: user.current_challenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: getRpId(),
      credential: {
        id: credential.id,
        publicKey: credential.public_key,
        counter: credential.counter,
        transports: credential.transports ? JSON.parse(credential.transports) : undefined,
      },
    });

    if (!verification.verified) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    // Update the sign counter for replay protection
    db.prepare('UPDATE passkey_credentials SET counter = ? WHERE id = ?')
      .run(verification.authenticationInfo.newCounter, credential.id);

    // Clear challenge
    db.prepare('UPDATE users SET current_challenge = NULL WHERE id = ?').run(user.id);

    // Block unverified users
    if (!user.is_verified) {
      return res.status(403).json({
        error: 'Please verify your email before logging in.',
        requiresVerification: true,
      });
    }

    // Issue JWT
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
        notify_high_spending: Boolean(user.notify_high_spending),
      },
    });
  } catch (err) {
    console.error('Passkey auth-verify error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

export default router;
