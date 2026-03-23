import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// PUT /api/settings/profile — Update display name, email, notification prefs
router.put('/profile', (req, res) => {
  const { displayName, email, emailNotifications, notify_budget_updates, notify_tx_updates, notify_weekly_summary, notify_high_spending } = req.body;

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
  if (notify_budget_updates !== undefined) {
    updates.push('notify_budget_updates = ?');
    values.push(notify_budget_updates ? 1 : 0);
  }
  if (notify_tx_updates !== undefined) {
    updates.push('notify_tx_updates = ?');
    values.push(notify_tx_updates ? 1 : 0);
  }
  if (notify_weekly_summary !== undefined) {
    updates.push('notify_weekly_summary = ?');
    values.push(notify_weekly_summary ? 1 : 0);
  }
  if (notify_high_spending !== undefined) {
    updates.push('notify_high_spending = ?');
    values.push(notify_high_spending ? 1 : 0);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(req.user.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    email: user.email,
    emailNotifications: !!user.email_notifications,
    notify_budget_updates: !!user.notify_budget_updates,
    notify_tx_updates: !!user.notify_tx_updates,
    notify_weekly_summary: !!user.notify_weekly_summary,
    notify_high_spending: !!user.notify_high_spending
  });
});

// GET /api/settings/profile — Get current user profile
router.get('/profile', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    email: user.email,
    emailNotifications: !!user.email_notifications,
    partnerCode: user.partner_code,
    linkedTo: user.linked_to,
    notify_budget_updates: !!user.notify_budget_updates,
    notify_tx_updates: !!user.notify_tx_updates,
    notify_weekly_summary: !!user.notify_weekly_summary,
    notify_high_spending: !!user.notify_high_spending
  });
});

// DELETE /api/settings/account — Permanently delete the user account
router.delete('/account', (req, res) => {
  const user = db.prepare('SELECT id, linked_to FROM users WHERE id = ?').get(req.user.id);
  
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Determine if user has a dependent partner (i.e. user is Primary)
  const dependentPartner = db.prepare('SELECT id FROM users WHERE linked_to = ?').get(user.id);

  try {
    db.transaction(() => {
      if (dependentPartner && !user.linked_to) {
        // Transfer data ownership to the dependent partner so they don't lose the ledger
        db.prepare('UPDATE budgets SET user_id = ? WHERE user_id = ?').run(dependentPartner.id, user.id);
        db.prepare('UPDATE transactions SET user_id = ? WHERE user_id = ?').run(dependentPartner.id, user.id);
        db.prepare('UPDATE ignored_patterns SET user_id = ? WHERE user_id = ?').run(dependentPartner.id, user.id);
        db.prepare('UPDATE webhook_configs SET user_id = ? WHERE user_id = ?').run(dependentPartner.id, user.id);
        
        // Elevate the dependent partner to Primary status
        db.prepare('UPDATE users SET linked_to = NULL WHERE id = ?').run(dependentPartner.id);
      }
      // Delete the account. Cascade drops remaining non-transferred entities.
      db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    })();
    
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Account deletion error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
