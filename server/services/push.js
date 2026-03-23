import webpush from 'web-push';
import db from '../db.js';

// Configure VAPID keys from environment or generate them on the fly
let vapidPublic = process.env.VAPID_PUBLIC_KEY;
let vapidPrivate = process.env.VAPID_PRIVATE_KEY;

if (!vapidPublic || !vapidPrivate) {
  console.log('[PUSH] No VAPID keys found in environment. Generating temporary keys for session...');
  const keys = webpush.generateVAPIDKeys();
  vapidPublic = keys.publicKey;
  vapidPrivate = keys.privateKey;
  console.log('--- GENERATED VAPID KEYS ---');
  console.log('PUBLIC:', vapidPublic);
  console.log('PRIVATE:', vapidPrivate);
  console.log('----------------------------');
}

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@vidalpablo.com',
  vapidPublic,
  vapidPrivate
);
console.log('[PUSH] Web Push configured with VAPID keys');

/**
 * Send a push notification to all subscriptions for a given user.
 */
export async function sendPushNotification(userId, payload) {
  if (!vapidPublic) return;

  const subscriptions = db.prepare(
    'SELECT * FROM push_subscriptions WHERE user_id = ?'
  ).all(userId);

  if (subscriptions.length === 0) return;

  const pushPayload = JSON.stringify(payload);
  const deleteStmt = db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?');

  const promises = subscriptions.map(async (sub) => {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth }
    };
    try {
      await webpush.sendNotification(pushSubscription, pushPayload);
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        console.log(`[PUSH] Subscription expired or removed: ${sub.endpoint}`);
        deleteStmt.run(sub.endpoint);
      } else {
        console.error('[PUSH] Failed to send notification:', err);
      }
    }
  });

  await Promise.allSettled(promises);
}

/**
 * Get the public VAPID key for the frontend.
 */
export function getVapidPublicKey() {
  return vapidPublic;
}
