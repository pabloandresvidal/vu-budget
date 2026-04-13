import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { resolveOwnerId } from './partner.js';

const router = Router();
router.use(authMiddleware);

// Summary: total budget, total spent, remaining
router.get('/summary', (req, res) => {
  try {
    const ownerId = resolveOwnerId(req.user.id);
    const budgetSummary = db.prepare(`
      SELECT
        COALESCE(SUM(b.total_amount), 0) as total_budget
      FROM budgets b WHERE b.user_id = ?
    `).get(ownerId);

    const spentSummary = db.prepare(`
      SELECT COALESCE(SUM(t.effective_amount), 0) as total_spent
      FROM transactions t WHERE t.user_id = ? AND t.budget_id IS NOT NULL
      AND t.created_at >= date('now', 'start of month')
    `).get(ownerId);

    const pendingCount = db.prepare(
      'SELECT COUNT(*) as count FROM transactions WHERE user_id = ? AND needs_review = 1'
    ).get(ownerId);

    const totalTransactions = db.prepare(
      'SELECT COUNT(*) as count FROM transactions WHERE user_id = ?'
    ).get(ownerId);

    res.json({
      totalBudget: budgetSummary.total_budget,
      totalSpent: spentSummary.total_spent,
      remaining: budgetSummary.total_budget - spentSummary.total_spent,
      pendingReview: pendingCount.count,
      totalTransactions: totalTransactions.count
    });
  } catch (err) {
    console.error('Dashboard summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Spending by category (budget)
router.get('/by-category', (req, res) => {
  try {
    const ownerId = resolveOwnerId(req.user.id);
    const categories = db.prepare(`
      SELECT
        b.id,
        b.title,
        b.total_amount,
        COALESCE(SUM(CASE WHEN t.created_at >= date('now', 'start of month') THEN t.effective_amount ELSE 0 END), 0) as spent
      FROM budgets b
      LEFT JOIN transactions t ON t.budget_id = b.id
      WHERE b.user_id = ?
      GROUP BY b.id
      ORDER BY spent DESC
    `).all(ownerId);

    // Add uncategorized
    const uncategorized = db.prepare(`
      SELECT COALESCE(SUM(effective_amount), 0) as spent
      FROM transactions WHERE user_id = ? AND budget_id IS NULL
      AND created_at >= date('now', 'start of month')
    `).get(ownerId);

    const result = categories.map(c => ({
      id: c.id,
      name: c.title,
      budget: c.total_amount,
      spent: c.spent,
      percentage: c.total_amount > 0 ? Math.round((c.spent / c.total_amount) * 100) : 0
    }));

    if (uncategorized.spent > 0) {
      result.push({
        id: null,
        name: 'Uncategorized',
        budget: 0,
        spent: uncategorized.spent,
        percentage: 0
      });
    }

    res.json(result);
  } catch (err) {
    console.error('Dashboard by-category error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Spending trend (last 30 days, daily)
router.get('/trend', (req, res) => {
  try {
    const { days = 30 } = req.query;
    const ownerId = resolveOwnerId(req.user.id);
    const trend = db.prepare(`
      SELECT
        DATE(created_at) as date,
        SUM(effective_amount) as total
      FROM transactions
      WHERE user_id = ? AND created_at >= DATE('now', ?)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all(ownerId, `-${Number(days)} days`);

    res.json(trend.map(t => ({ date: t.date, total: t.total })));
  } catch (err) {
    console.error('Dashboard trend error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Top vendors by spend
router.get('/top-vendors', (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const ownerId = resolveOwnerId(req.user.id);
    const vendors = db.prepare(`
      SELECT vendor, SUM(effective_amount) as total, COUNT(*) as count
      FROM transactions
      WHERE user_id = ? AND vendor != '' AND vendor IS NOT NULL
      GROUP BY vendor
      ORDER BY total DESC
      LIMIT ?
    `).all(ownerId, Number(limit));

    res.json(vendors.map(v => ({ vendor: v.vendor, total: v.total, count: v.count })));
  } catch (err) {
    console.error('Dashboard top-vendors error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
