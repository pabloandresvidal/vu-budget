import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { resolveOwnerId } from './partner.js';
import { notifyPartnerOfChange } from '../services/push.js';

const router = Router();
router.use(authMiddleware);

// List budgets for current user
router.get('/', (req, res) => {
  try {
    const ownerId = resolveOwnerId(req.user.id);
    const budgets = db.prepare(`
      SELECT b.*,
        COALESCE(SUM(CASE WHEN t.created_at >= date('now', 'start of month') THEN t.effective_amount ELSE 0 END), 0) as spent_amount
      FROM budgets b
      LEFT JOIN transactions t ON t.budget_id = b.id
      WHERE b.user_id = ?
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `).all(ownerId);

    res.json(budgets.map(b => ({
      id: b.id,
      title: b.title,
      description: b.description,
      totalAmount: b.total_amount,
      spentAmount: b.spent_amount,
      remaining: b.total_amount - b.spent_amount,
      autoReset: !!b.auto_reset,
      carryOver: !!b.carry_over,
      lastResetAt: b.last_reset_at,
      createdAt: b.created_at
    })));
  } catch (err) {
    console.error('List budgets error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create budget
router.post('/', (req, res) => {
  try {
    const { title, description, totalAmount, autoReset, carryOver } = req.body;
    if (!title || totalAmount == null) {
      return res.status(400).json({ error: 'Title and totalAmount are required' });
    }

    const ownerId = resolveOwnerId(req.user.id);
    const result = db.prepare(
      'INSERT INTO budgets (user_id, title, description, total_amount, auto_reset, carry_over) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(ownerId, title, description || '', totalAmount, autoReset ? 1 : 0, carryOver ? 1 : 0);

    res.status(201).json({
      id: result.lastInsertRowid,
      title,
      description: description || '',
      totalAmount,
      spentAmount: 0,
      remaining: totalAmount,
      autoReset: !!autoReset,
      carryOver: !!carryOver
    });
  } catch (err) {
    console.error('Create budget error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update budget
router.put('/:id', (req, res) => {
  try {
    const { title, description, totalAmount, autoReset, carryOver } = req.body;
    const ownerId = resolveOwnerId(req.user.id);
    const budget = db.prepare('SELECT * FROM budgets WHERE id = ? AND user_id = ?').get(req.params.id, ownerId);
    if (!budget) return res.status(404).json({ error: 'Budget not found' });

    db.prepare(
      'UPDATE budgets SET title = ?, description = ?, total_amount = ?, auto_reset = ?, carry_over = ? WHERE id = ? AND user_id = ?'
    ).run(
      title ?? budget.title,
      description ?? budget.description,
      totalAmount ?? budget.total_amount,
      autoReset !== undefined ? (autoReset ? 1 : 0) : budget.auto_reset,
      carryOver !== undefined ? (carryOver ? 1 : 0) : budget.carry_over,
      req.params.id,
      ownerId
    );

    const updated = db.prepare(`
      SELECT b.*, COALESCE(SUM(CASE WHEN t.created_at >= date('now', 'start of month') THEN t.effective_amount ELSE 0 END), 0) as spent_amount
      FROM budgets b LEFT JOIN transactions t ON t.budget_id = b.id
      WHERE b.id = ? GROUP BY b.id
    `).get(req.params.id);

    notifyPartnerOfChange(req.user.id, ownerId, 'budget', '💳 Budget Updated', 
      `${req.user.username} updated the "${updated.title}" budget.`, '/budgets');

    res.json({
      id: updated.id,
      title: updated.title,
      description: updated.description,
      totalAmount: updated.total_amount,
      spentAmount: updated.spent_amount,
      remaining: updated.total_amount - updated.spent_amount,
      autoReset: !!updated.auto_reset,
      carryOver: !!updated.carry_over,
    });
  } catch (err) {
    console.error('Update budget error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete budget
router.delete('/:id', (req, res) => {
  try {
    const ownerId = resolveOwnerId(req.user.id);
    const budget = db.prepare('SELECT * FROM budgets WHERE id = ? AND user_id = ?').get(req.params.id, ownerId);
    if (!budget) return res.status(404).json({ error: 'Budget not found' });

    // Set transactions in this budget to uncategorized
    db.prepare('UPDATE transactions SET budget_id = NULL, needs_review = 1 WHERE budget_id = ?').run(req.params.id);
    db.prepare('DELETE FROM budgets WHERE id = ?').run(req.params.id);

    notifyPartnerOfChange(req.user.id, ownerId, 'budget', '🗑️ Budget Deleted', 
      `${req.user.username} deleted the "${budget.title}" budget.`, '/budgets');

    res.json({ success: true });
  } catch (err) {
    console.error('Delete budget error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
