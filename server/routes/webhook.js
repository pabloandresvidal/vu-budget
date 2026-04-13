import { Router } from 'express';
import db from '../db.js';
import { categorizeSMS } from '../services/ai.js';
import { sendReviewNotification } from '../services/email.js';
import { sendPushNotification } from '../services/push.js';

const router = Router();

// Built-in payment confirmation phrases to always ignore
const PAYMENT_PHRASES = [
  'thanks for your payment',
  'thank you for your payment',
  'payment received',
  'payment posted',
  'payment confirmation',
  'payment successful',
  'payment has been received',
  'payment has been applied',
  'we received your payment',
  'your payment of',
  'payment was successful',
  'payment processed',
];

// POST /api/webhook/:token
// Receives SMS from bank forwarding service using the unique secret token
router.post('/:token', async (req, res) => {
  try {
    const token = req.params.token;
    
    // Find the active webhook config matching this exact token
    const config = db.prepare('SELECT * FROM webhook_configs WHERE secret_token = ? AND is_active = 1').get(token);
    if (!config) {
      return res.status(404).json({ error: 'Webhook endpoint not found or inactive' });
    }

    const userId = config.user_id;
    const user = db.prepare('SELECT id, email, email_notifications, linked_to FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Use primary user's data if this is a linked (partner) account
    const ownerId = user.linked_to || user.id;

    // Try to extract SMS from configured header, fallback to general body text
    let smsText = '';
    const headerVal = req.headers[config.header_name.toLowerCase()];
    if (headerVal) {
      smsText = headerVal;
    }
    console.log(`[WEBHOOK] Step 1 — Header "${config.header_name}" value:`, smsText || '(empty)');

    // Fallback: check default header, or extract aggressively from various body fields
    if (!smsText && req.body) {
      smsText = req.headers['x-sms-body'] || 
                req.body?.sms || 
                req.body?.message || 
                req.body?.text || 
                req.body?.body || 
                (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
    }

    if (!smsText) {
      return res.status(400).json({ error: 'No SMS content found in request' });
    }

    console.log(`[WEBHOOK] Step 2 — Final SMS text: "${smsText}"`);

    // Check against built-in payment confirmation phrases
    const smsLower = smsText.toLowerCase();
    const matchedPayment = PAYMENT_PHRASES.find(phrase => smsLower.includes(phrase));
    
    if (matchedPayment) {
      console.log(`[WEBHOOK] Dropped! SMS matches payment phrase: "${matchedPayment}"`);
      db.prepare(`
        INSERT INTO webhook_log (user_id, raw_sms, status, matched_pattern)
        VALUES (?, ?, 'ignored_payment', ?)
      `).run(ownerId, smsText, matchedPayment);
      return res.status(200).json({ ignored: true, reason: 'Payment confirmation message', pattern: matchedPayment });
    }

    // Check against user's AI exclusion rules
    const ignoredPatterns = db.prepare('SELECT pattern FROM ignored_patterns WHERE user_id = ?').all(ownerId);
    const matchedPattern = ignoredPatterns.find(p => smsLower.includes(p.pattern.toLowerCase()));
    
    if (matchedPattern) {
      console.log(`[WEBHOOK] Dropped! SMS matches AI exception rule: "${matchedPattern.pattern}"`);
      db.prepare(`
        INSERT INTO webhook_log (user_id, raw_sms, status, matched_pattern)
        VALUES (?, ?, 'ignored_pattern', ?)
      `).run(ownerId, smsText, matchedPattern.pattern);
      return res.status(200).json({ ignored: true, reason: 'Matched ignore pattern', pattern: matchedPattern.pattern });
    }

    // Get budgets from the primary account
    const budgets = db.prepare('SELECT id, title, description FROM budgets WHERE user_id = ?').all(ownerId);

    // Fetch recent categorized transactions for AI learning context
    const pastTransactions = db.prepare(`
      SELECT t.vendor, b.title AS budget_title, b.id AS budget_id
      FROM transactions t
      JOIN budgets b ON t.budget_id = b.id
      WHERE t.user_id = ? AND t.needs_review = 0 AND t.budget_id IS NOT NULL
      ORDER BY t.created_at DESC
      LIMIT 50
    `).all(ownerId);

    // Categorize with AI (now with history context)
    const result = await categorizeSMS(smsText, budgets, pastTransactions);

    // Determine if needs review — lower threshold so clear matches auto-categorize
    const needsReview = result.confidence < 0.4 || !result.budgetId ? 1 : 0;
    const effectiveAmount = result.amount;
    console.log(`[WEBHOOK] Step 3 — AI result: vendor="${result.vendor}", amount=${result.amount}, budgetId=${result.budgetId}, confidence=${result.confidence}, needsReview=${needsReview}`);

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

    // Log to webhook_log
    db.prepare(`
      INSERT INTO webhook_log (user_id, raw_sms, vendor, amount, status, transaction_id)
      VALUES (?, ?, ?, ?, 'processed', ?)
    `).run(ownerId, smsText, result.vendor, result.amount, txResult.lastInsertRowid);

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

    // Send push notification for ALL transactions (not just needs review)
    sendPushNotification(ownerId, {
      title: needsReview ? '💰 Transaction Needs Review' : '✅ Transaction Auto-Categorized',
      body: `${result.vendor}: $${result.amount.toFixed(2)}${needsReview ? ' — Tap to categorize' : ` → ${budgets.find(b => b.id === result.budgetId)?.title || 'Budget'}`}`,
      data: { url: '/transactions', transactionId: txResult.lastInsertRowid }
    }).catch(() => {});

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
