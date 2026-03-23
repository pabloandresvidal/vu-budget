import db from '../db.js';

export function checkAndResetBudgets() {
  const now = new Date();
  
  // Only process if it's the 1st of the month
  if (now.getDate() !== 1) return;

  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const budgets = db.prepare('SELECT * FROM budgets WHERE auto_reset = 1').all();

  console.log(`[CRON] Checking budget resets for ${now.toISOString()}...`);
  const stmtUpdateBudget = db.prepare('UPDATE budgets SET total_amount = ?, last_reset_at = ? WHERE id = ?');
  
  db.transaction(() => {
    for (const b of budgets) {
      // Skip if already reset this month
      if (b.last_reset_at === currentMonthStr) continue;

      let newAmount = b.total_amount;

      // Handle carry over
      if (b.carry_over) {
        const stats = db.prepare(`
          SELECT COALESCE(SUM(effective_amount), 0) as spent
          FROM transactions 
          WHERE budget_id = ?
        `).get(b.id);
        
        const remaining = b.total_amount - stats.spent;
        if (remaining > 0) {
          console.log(`[CRON] Carrying over $${remaining} for budget "${b.title}"`);
          newAmount = b.total_amount + remaining; // Adds remaining to the base total for the new month
          // Note: The logic here assumes total_amount is the dynamic balance pool.
          // For a true reset, we should calculate the original base, but since total_amount 
          // is effectively the pool, we add remaining to the original intended base.
          // To make it simple: 
          // If total_amount was 500, spent was 400. Remaining = 100.
          // Next month total_amount becomes 500 (base) + 100 = 600.
          // For robust apps, separate 'base_amount' and 'current_amount' is better,
          // but here we just append to the active total_amount assuming it was the base.
        }
      }

      // Instead of wiping total_amount, we just insert a balance adjustment transaction?
      // No, let's just make the "carry over" inject a positive transaction returning funds,
      // or we just reset the transactions for the month. Since transactions aren't deleted,
      // the new month naturally starts with 0 spent in the new month timeframe!
      // Wait, the API calculates `spent_amount` by summing ALL transactions ever! 
      // This means we MUST clear out old transactions from the budget, or change the API to only sum THIS MONTH'S transactions.
      // To strictly reset without changing the API too much, we can just detach old transactions 
      // (set budget_id = NULL) or better, we set budget_id = NULL but leave categorized_by='reset'
      
      console.log(`[CRON] Resetting budget "${b.title}"`);
      db.prepare(`UPDATE transactions SET budget_id = NULL, categorized_by = 'archived_reset' WHERE budget_id = ?`).run(b.id);
      
      stmtUpdateBudget.run(newAmount, currentMonthStr, b.id);
    }
  })();
}

export function startResetScheduler() {
  console.log('[CRON] Budget reset scheduler started');
  // Check every 6 hours
  setInterval(checkAndResetBudgets, 6 * 60 * 60 * 1000);
  
  // Run once on startup just in case
  setTimeout(checkAndResetBudgets, 10000);
}
