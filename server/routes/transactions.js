import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { resolveOwnerId } from './partner.js';

const router = Router();
router.use(authMiddleware);

// List transactions with optional filters
router.get('/', (req, res) => {
  try {
    const ownerId = resolveOwnerId(req.user.id);
    const { budgetId, needsReview, startDate, endDate, limit = 50, offset = 0 } = req.query;
    let query = `
      SELECT t.*, b.title as budget_title
      FROM transactions t
      LEFT JOIN budgets b ON t.budget_id = b.id
      WHERE t.user_id = ?
    `;
    const params = [ownerId];

    if (budgetId) {
      query += ' AND t.budget_id = ?';
      params.push(budgetId);
    }
    if (needsReview === '1' || needsReview === 'true') {
      query += ' AND t.needs_review = 1';
    }
    if (startDate) {
      query += ' AND t.created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND t.created_at <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const transactions = db.prepare(query).all(...params);

    const countQuery = `SELECT COUNT(*) as total FROM transactions t WHERE t.user_id = ?`;
    const { total } = db.prepare(countQuery).get(ownerId);

    res.json({
      transactions: transactions.map(t => ({
        id: t.id,
        budgetId: t.budget_id,
        budgetTitle: t.budget_title,
        vendor: t.vendor,
        description: t.description,
        amount: t.amount,
        percentage: t.percentage,
        effectiveAmount: t.effective_amount,
        rawSms: t.raw_sms,
        categorizedBy: t.categorized_by,
        needsReview: !!t.needs_review,
        createdAt: t.created_at
      })),
      total
    });
  } catch (err) {
    console.error('List transactions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Pending review transactions
router.get('/pending', (req, res) => {
  try {
    const ownerId = resolveOwnerId(req.user.id);
    const transactions = db.prepare(`
      SELECT t.*, b.title as budget_title
      FROM transactions t
      LEFT JOIN budgets b ON t.budget_id = b.id
      WHERE t.user_id = ? AND t.needs_review = 1
      ORDER BY t.created_at DESC
    `).all(ownerId);

    res.json(transactions.map(t => ({
      id: t.id,
      budgetId: t.budget_id,
      budgetTitle: t.budget_title,
      vendor: t.vendor,
      description: t.description,
      amount: t.amount,
      percentage: t.percentage,
      effectiveAmount: t.effective_amount,
      rawSms: t.raw_sms,
      categorizedBy: t.categorized_by,
      needsReview: true,
      createdAt: t.created_at
    })));
  } catch (err) {
    console.error('Pending transactions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update transaction (recategorize, change percentage)
router.put('/:id', (req, res) => {
  try {
    const { budgetId, percentage, vendor, description } = req.body;
    const ownerId = resolveOwnerId(req.user.id);
    const tx = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(req.params.id, ownerId);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    // Validate budget belongs to owner if provided
    if (budgetId !== undefined && budgetId !== null) {
      const budget = db.prepare('SELECT id FROM budgets WHERE id = ? AND user_id = ?').get(budgetId, ownerId);
      if (!budget) return res.status(400).json({ error: 'Invalid budget' });
    }

    const newPercentage = percentage ?? tx.percentage;
    const newAmount = tx.amount;
    const newEffective = newAmount * (newPercentage / 100);
    const newBudgetId = budgetId !== undefined ? budgetId : tx.budget_id;
    const newVendor = vendor ?? tx.vendor;
    const newDescription = description ?? tx.description;

    db.prepare(`
      UPDATE transactions
      SET budget_id = ?, percentage = ?, effective_amount = ?, vendor = ?, description = ?,
          needs_review = 0, categorized_by = 'user'
      WHERE id = ? AND user_id = ?
    `).run(newBudgetId, newPercentage, newEffective, newVendor, newDescription, req.params.id, ownerId);

    const updated = db.prepare(`
      SELECT t.*, b.title as budget_title
      FROM transactions t LEFT JOIN budgets b ON t.budget_id = b.id
      WHERE t.id = ?
    `).get(req.params.id);

    res.json({
      id: updated.id,
      budgetId: updated.budget_id,
      budgetTitle: updated.budget_title,
      vendor: updated.vendor,
      description: updated.description,
      amount: updated.amount,
      percentage: updated.percentage,
      effectiveAmount: updated.effective_amount,
      rawSms: updated.raw_sms,
      categorizedBy: updated.categorized_by,
      needsReview: false,
      createdAt: updated.created_at
    });
  } catch (err) {
    console.error('Update transaction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete transaction
router.delete('/:id', (req, res) => {
  try {
    const ownerId = resolveOwnerId(req.user.id);
    const tx = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(req.params.id, ownerId);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete transaction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
