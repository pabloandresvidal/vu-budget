import { Router } from 'express';
import db from '../db.js';
import { categorizeSMS } from '../services/ai.js';
import { sendReviewNotification } from '../services/email.js';

const router = Router();

// POST /api/webhook/:userId
// Receives SMS from bank forwarding service
router.post('/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const user = db.prepare('SELECT id, email, email_notifications, linked_to FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Use primary user's data if this is a linked (partner) account
    const ownerId = user.linked_to || user.id;

    // Get active webhook configs for this user (or their primary account)
    const configs = db.prepare(
      'SELECT * FROM webhook_configs WHERE user_id = ? AND is_active = 1'
    ).all(ownerId);

    // Try to extract SMS from configured headers, fallback to X-SMS-Body, then body
    let smsText = '';
    for (const config of configs) {
      const headerVal = req.headers[config.header_name.toLowerCase()];
      if (headerVal) {
        // Verify secret token if configured
        if (config.secret_token) {
          const providedToken = req.headers['x-webhook-secret'] || req.headers['authorization'];
          if (providedToken !== config.secret_token && providedToken !== `Bearer ${config.secret_token}`) {
            continue; // Skip this config, token doesn't match
          }
        }
        smsText = headerVal;
        break;
      }
    }

    // Fallback: check default header or body
    if (!smsText) {
      smsText = req.headers['x-sms-body'] || req.body?.sms || req.body?.message || req.body?.text || '';
    }

    if (!smsText) {
      return res.status(400).json({ error: 'No SMS content found in request' });
    }

    // Get budgets from the primary account
    const budgets = db.prepare('SELECT id, title, description FROM budgets WHERE user_id = ?').all(ownerId);

    // Categorize with AI
    const result = await categorizeSMS(smsText, budgets);

    // Determine if needs review — lower threshold so clear matches auto-categorize
    const needsReview = result.confidence < 0.55 || !result.budgetId ? 1 : 0;
    const effectiveAmount = result.amount;

    // Insert transaction under the primary account
    const txResult = db.prepare(`
      INSERT INTO transactions (user_id, budget_id, vendor, description, amount, percentage, effective_amount, raw_sms, categorized_by, needs_review)
      VALUES (?, ?, ?, ?, ?, 100, ?, ?, ?, ?)
    `).run(
      ownerId,
      needsReview ? null : result.budgetId,
      result.vendor,
      result.description,
      result.amount,
      effectiveAmount,
      smsText,
      needsReview ? null : 'ai',
      needsReview
    );

    // Create in-app notification if needs review
    if (needsReview) {
      db.prepare(`
        INSERT INTO notifications (user_id, transaction_id, message)
        VALUES (?, ?, ?)
      `).run(
        ownerId,
        txResult.lastInsertRowid,
        `New transaction from "${result.vendor}" for $${result.amount.toFixed(2)} needs categorization.`
      );

      // Send email notification (non-blocking)
      const primaryUser = db.prepare('SELECT id, email, email_notifications FROM users WHERE id = ?').get(ownerId);
      sendReviewNotification(primaryUser, { vendor: result.vendor, amount: result.amount }).catch(() => {});
    }

    res.status(201).json({
      transactionId: txResult.lastInsertRowid,
      categorized: !needsReview,
      vendor: result.vendor,
      amount: result.amount,
      budgetId: needsReview ? null : result.budgetId,
      confidence: result.confidence
    });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
