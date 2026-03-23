import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { resolveOwnerId } from './partner.js';

const router = Router();
router.use(authMiddleware);

// List notifications
router.get('/', (req, res) => {
  try {
    const ownerId = resolveOwnerId(req.user.id);
    const notifications = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(ownerId);

    res.json(notifications.map(n => ({
      id: n.id,
      transactionId: n.transaction_id,
      message: n.message,
      isRead: !!n.is_read,
      createdAt: n.created_at
    })));
  } catch (err) {
    console.error('List notifications error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unread count
router.get('/unread-count', (req, res) => {
  try {
    const ownerId = resolveOwnerId(req.user.id);
    const result = db.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
    ).get(ownerId);
    res.json({ count: result.count });
  } catch (err) {
    console.error('Unread count error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark as read
router.put('/:id/read', (req, res) => {
  try {
    const ownerId = resolveOwnerId(req.user.id);
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, ownerId);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all as read
router.put('/read-all', (req, res) => {
  try {
    const ownerId = resolveOwnerId(req.user.id);
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(ownerId);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
