import db from '../db.js';
import { sendPushNotification } from './push.js';

// In-memory cache to prevent duplicate daily pushes
const sentCache = {
  weekly: new Set(),
  highSpend: new Set(),
};

function dispatchAlerts() {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const isSunday = now.getDay() === 0;
  
  // Calculate days left in month
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeft = lastDay.getDate() - now.getDate();

  const users = db.prepare(`SELECT id, notify_weekly_summary, notify_high_spending FROM users`).all();

  for (const user of users) {
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const budgets = db.prepare(`SELECT id, total_amount FROM budgets WHERE user_id = ?`).all(user.id);
    if (budgets.length === 0) continue;

    const totalBudget = budgets.reduce((acc, b) => acc + b.total_amount, 0);
    
    const stats = db.prepare(`
      SELECT COALESCE(SUM(effective_amount), 0) as spent
      FROM transactions 
      WHERE user_id = ? AND strftime('%Y-%m', created_at) = ?
    `).get(user.id, currentMonthStr);
    
    const totalSpent = stats.spent;
    const cacheKey = `${user.id}-${todayStr}`;

    // 1. Weekly Trend (Sundays)
    if (isSunday && user.notify_weekly_summary && !sentCache.weekly.has(cacheKey)) {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 6);
      const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

      const weekStats = db.prepare(`
        SELECT COALESCE(SUM(effective_amount), 0) as spent
        FROM transactions 
        WHERE user_id = ? AND created_at >= ?
      `).get(user.id, startOfWeekStr);

      sendPushNotification(user.id, {
        title: '📊 Weekly Spending Trend',
        body: `You spent $${weekStats.spent.toFixed(2)} this week. Monthly total: $${totalSpent.toFixed(2)} / $${totalBudget.toFixed(2)}`,
        data: { url: '/dashboard' }
      }).catch(() => {});

      sentCache.weekly.add(cacheKey);
    }

    // 2. High Spending Alert
    if (user.notify_high_spending && daysLeft > 3 && !sentCache.highSpend.has(cacheKey)) {
      if (totalBudget > 0 && (totalSpent / totalBudget) >= 0.90) {
        sendPushNotification(user.id, {
          title: '🔥 High Spending Alert',
          body: `You've spent ${((totalSpent/totalBudget)*100).toFixed(0)}% of your monthly budget but have ${daysLeft} days left!`,
          data: { url: '/dashboard' }
        }).catch(() => {});

        sentCache.highSpend.add(cacheKey);
      }
    }
  }

  // Cleanup old cache dates to prevent memory leak
  if (sentCache.weekly.size > 10000) sentCache.weekly.clear();
  if (sentCache.highSpend.size > 10000) sentCache.highSpend.clear();
}

export function startCronScheduler() {
  console.log('[CRON] Analytics and Notification scheduler started');
  // Check every 4 hours
  setInterval(dispatchAlerts, 4 * 60 * 60 * 1000);
  
  // Run once on startup just in case
  setTimeout(dispatchAlerts, 15000);
}
