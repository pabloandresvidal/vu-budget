import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { resolveOwnerId } from './partner.js';
import { getVapidPublicKey } from '../services/push.js';

const router = Router();
router.use(authMiddleware);

// GET /api/push/vapid-key
router.get('/vapid-key', (req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
});

// POST /api/push/subscribe
router.post('/subscribe', (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys) {
      console.warn('[PUSH API] Invalid subscription object received from frontend');
      return res.status(400).json({ error: 'Invalid subscription object' });
    }

    const ownerId = resolveOwnerId(req.user.id);
    const existing = db.prepare('SELECT id FROM push_subscriptions WHERE endpoint = ?').get(endpoint);

    if (!existing) {
      console.log(`[PUSH API] Registering new standalone subscription for User ${ownerId}`);
      db.prepare(
        'INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)'
      ).run(ownerId, endpoint, keys.p256dh, keys.auth);
    } else {
      console.log(`[PUSH API] Verified existing subscription for User ${ownerId}`);
    }

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('[PUSH API] Subscription error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
