import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET /api/ignored-patterns
// Returns all ignored patterns for the user
router.get('/', (req, res) => {
  try {
    const patterns = db.prepare('SELECT id, pattern, created_at FROM ignored_patterns WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json(patterns);
  } catch (err) {
    console.error('Fetch ignored patterns error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/ignored-patterns
// Add a new pattern
router.post('/', (req, res) => {
  try {
    const { pattern } = req.body;
    if (!pattern || typeof pattern !== 'string' || pattern.trim() === '') {
      return res.status(400).json({ error: 'Valid pattern is required' });
    }

    const cleanPattern = pattern.trim();
    
    // Check if it already exists
    const existing = db.prepare('SELECT id FROM ignored_patterns WHERE user_id = ? AND pattern = ?').get(req.user.id, cleanPattern);
    if (existing) {
      return res.status(409).json({ error: 'This vendor is already ignored' });
    }

    const info = db.prepare('INSERT INTO ignored_patterns (user_id, pattern) VALUES (?, ?)').run(req.user.id, cleanPattern);
    const newPattern = db.prepare('SELECT * FROM ignored_patterns WHERE id = ?').get(info.lastInsertRowid);
    
    res.status(201).json(newPattern);
  } catch (err) {
    console.error('Create ignored pattern error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/ignored-patterns/:id
// Remove a pattern
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const info = db.prepare('DELETE FROM ignored_patterns WHERE id = ? AND user_id = ?').run(id, req.user.id);
    
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Pattern not found or unauthorized' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Delete ignored pattern error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
