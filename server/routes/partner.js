import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Helper: resolve the "effective" owner user_id (follow linked_to)
function resolveOwnerId(userId) {
  const user = db.prepare('SELECT id, linked_to FROM users WHERE id = ?').get(userId);
  return user?.linked_to || user?.id || userId;
}

// GET /api/partner/code — Get or generate your partner invite code
router.get('/code', (req, res) => {
  let user = db.prepare('SELECT id, partner_code, linked_to, display_name FROM users WHERE id = ?').get(req.user.id);

  if (!user) return res.status(404).json({ error: 'User not found' });

  // If linked as a partner, return the primary user's code instead
  if (user.linked_to) {
    const primary = db.prepare('SELECT id, partner_code, display_name FROM users WHERE id = ?').get(user.linked_to);
    if (!primary) {
      // The linked primary user was deleted, clean up the broken link securely
      db.prepare('UPDATE users SET linked_to = NULL WHERE id = ?').run(user.id);
      user.linked_to = null;
    } else {
      return res.json({
        code: primary.partner_code,
        linkedTo: { id: primary.id, displayName: primary.display_name },
        isLinked: true
      });
    }
  }

  // Generate a code if they don't have one
  if (!user.partner_code) {
    const code = uuidv4().split('-')[0].toUpperCase(); // e.g. "A1B2C3D4"
    db.prepare('UPDATE users SET partner_code = ? WHERE id = ?').run(code, user.id);
    user.partner_code = code;
  }

  // Get linked partner info if any
  const partner = db.prepare('SELECT id, display_name, username FROM users WHERE linked_to = ?').get(user.id);

  res.json({
    code: user.partner_code,
    linkedTo: null,
    isLinked: false,
    partner: partner ? { id: partner.id, displayName: partner.display_name, username: partner.username } : null
  });
});

// POST /api/partner/join — Link to a primary user via invite code
router.post('/join', (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Invite code is required' });

  // Can't link if already linked
  const me = db.prepare('SELECT id, linked_to FROM users WHERE id = ?').get(req.user.id);
  if (me.linked_to) {
    return res.status(400).json({ error: 'You are already linked to a partner. Unlink first.' });
  }

  // Find the code owner
  const primary = db.prepare('SELECT id, display_name, username FROM users WHERE partner_code = ?').get(code.toUpperCase());
  if (!primary) return res.status(404).json({ error: 'Invite code not found. Check the code and try again.' });
  if (primary.id === req.user.id) return res.status(400).json({ error: 'You cannot link to yourself.' });

  db.prepare('UPDATE users SET linked_to = ? WHERE id = ?').run(primary.id, req.user.id);

  res.json({
    success: true,
    linkedTo: { id: primary.id, displayName: primary.display_name, username: primary.username }
  });
});

// DELETE /api/partner/unlink — Remove partner link
router.delete('/unlink', (req, res) => {
  db.prepare('UPDATE users SET linked_to = NULL WHERE id = ?').run(req.user.id);
  res.json({ success: true });
});

export { resolveOwnerId };
export default router;
