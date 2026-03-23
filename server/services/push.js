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
  console.log(`\n[PUSH] Attempting to deliver push to User ${userId}... Payload:`, payload);
  if (!vapidPublic) {
    console.warn('[PUSH] Aborted - No VAPID public key configured.');
    return;
  }

  const subscriptions = db.prepare(
    'SELECT * FROM push_subscriptions WHERE user_id = ?'
  ).all(userId);
  console.log(`[PUSH] Found ${subscriptions.length} active device subscriptions for User ${userId}.`);

  if (subscriptions.length === 0) return;

  const pushPayload = JSON.stringify(payload);
  const deleteStmt = db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?');

  const promises = subscriptions.map(async (sub) => {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth }
    };
    try {
      console.log(`[PUSH] Dispatching to endpoint: ${sub.endpoint.substring(0, 45)}...`);
      await webpush.sendNotification(pushSubscription, pushPayload);
      console.log(`[PUSH] Success! Payload delivered to endpoint ending in ${sub.endpoint.slice(-10)}`);
    } catch (err) {
      console.error(`[PUSH] Failed delivery for endpoint ${sub.endpoint.substring(0, 30)}...`);
      console.error(`[PUSH] Error: ${err.message}`);
      if (err.statusCode === 404 || err.statusCode === 410) {
        console.log(`[PUSH] Device unsubscribed or token expired. Dropping from database.`);
        deleteStmt.run(sub.endpoint);
      } else {
        console.error('[PUSH] Full Error Trace:', err);
      }
    }
  });

  await Promise.allSettled(promises);
  console.log('[PUSH] Finished dispatching cycle.\n');
}

/**
 * Get the public VAPID key for the frontend.
 */
export function getVapidPublicKey() {
  return vapidPublic;
}
