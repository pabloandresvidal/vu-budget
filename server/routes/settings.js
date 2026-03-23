import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// PUT /api/settings/profile — Update display name, email, notification prefs
router.put('/profile', (req, res) => {
  const { displayName, email, emailNotifications } = req.body;

  const updates = [];
  const values = [];

  if (displayName !== undefined) {
    updates.push('display_name = ?');
    values.push((displayName || '').trim() || null);
  }
  if (email !== undefined) {
    updates.push('email = ?');
    values.push((email || '').trim() || null);
  }
  if (emailNotifications !== undefined) {
    updates.push('email_notifications = ?');
    values.push(emailNotifications ? 1 : 0);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(req.user.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const user = db.prepare('SELECT id, username, display_name, email, email_notifications FROM users WHERE id = ?').get(req.user.id);
  res.json({
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    email: user.email,
    emailNotifications: !!user.email_notifications
  });
});

// GET /api/settings/profile — Get current user profile
router.get('/profile', (req, res) => {
  const user = db.prepare('SELECT id, username, display_name, email, email_notifications, partner_code, linked_to FROM users WHERE id = ?').get(req.user.id);
  res.json({
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    email: user.email,
    emailNotifications: !!user.email_notifications,
    partnerCode: user.partner_code,
    linkedTo: user.linked_to
  });
});

export default router;
