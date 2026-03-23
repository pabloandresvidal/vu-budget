import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { resolveOwnerId } from './partner.js';

const router = Router();
router.use(authMiddleware);

// List webhook configs
router.get('/', (req, res) => {
  try {
    const ownerId = resolveOwnerId(req.user.id);
    const configs = db.prepare('SELECT * FROM webhook_configs WHERE user_id = ? ORDER BY created_at DESC').all(ownerId);
    res.json(configs.map(c => ({
      id: c.id,
      name: c.name,
      headerName: c.header_name,
      secretToken: c.secret_token,
      isActive: !!c.is_active,
      webhookUrl: `/api/webhook/${c.secret_token}`,
      createdAt: c.created_at
    })));
  } catch (err) {
    console.error('List webhooks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create webhook config
router.post('/', (req, res) => {
  try {
    const { name, headerName } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const ownerId = resolveOwnerId(req.user.id);
    const secretToken = uuidv4();
    const result = db.prepare(
      'INSERT INTO webhook_configs (user_id, name, header_name, secret_token) VALUES (?, ?, ?, ?)'
    ).run(ownerId, name, headerName || 'X-SMS-Body', secretToken);

    res.status(201).json({
      id: result.lastInsertRowid,
      name,
      headerName: headerName || 'X-SMS-Body',
      secretToken,
      isActive: true,
      webhookUrl: `/api/webhook/${secretToken}`
    });
  } catch (err) {
    console.error('Create webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update webhook config
router.put('/:id', (req, res) => {
  try {
    const { name, headerName, isActive } = req.body;
    const ownerId = resolveOwnerId(req.user.id);
    const config = db.prepare('SELECT * FROM webhook_configs WHERE id = ? AND user_id = ?').get(req.params.id, ownerId);
    if (!config) return res.status(404).json({ error: 'Webhook config not found' });

    db.prepare(
      'UPDATE webhook_configs SET name = ?, header_name = ?, is_active = ? WHERE id = ?'
    ).run(
      name ?? config.name,
      headerName ?? config.header_name,
      isActive !== undefined ? (isActive ? 1 : 0) : config.is_active,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM webhook_configs WHERE id = ?').get(req.params.id);
    res.json({
      id: updated.id,
      name: updated.name,
      headerName: updated.header_name,
      secretToken: updated.secret_token,
      isActive: !!updated.is_active,
      webhookUrl: `/api/webhook/${updated.secret_token}`
    });
  } catch (err) {
    console.error('Update webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete webhook config
router.delete('/:id', (req, res) => {
  try {
    const ownerId = resolveOwnerId(req.user.id);
    const config = db.prepare('SELECT * FROM webhook_configs WHERE id = ? AND user_id = ?').get(req.params.id, ownerId);
    if (!config) return res.status(404).json({ error: 'Webhook config not found' });

    db.prepare('DELETE FROM webhook_configs WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Regenerate secret token
router.post('/:id/regenerate', (req, res) => {
  try {
    const ownerId = resolveOwnerId(req.user.id);
    const config = db.prepare('SELECT * FROM webhook_configs WHERE id = ? AND user_id = ?').get(req.params.id, ownerId);
    if (!config) return res.status(404).json({ error: 'Webhook config not found' });

    const newToken = uuidv4();
    db.prepare('UPDATE webhook_configs SET secret_token = ? WHERE id = ?').run(newToken, req.params.id);

    res.json({ secretToken: newToken });
  } catch (err) {
    console.error('Regenerate token error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
