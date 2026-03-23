import webpush from 'web-push';
import db from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vapidPath = path.join(__dirname, '../vapid-keys.json');

// Configure VAPID keys from environment or generate them on the fly
let vapidPublic = process.env.VAPID_PUBLIC_KEY;
let vapidPrivate = process.env.VAPID_PRIVATE_KEY;

if (!vapidPublic || !vapidPrivate) {
  if (fs.existsSync(vapidPath)) {
    const keys = JSON.parse(fs.readFileSync(vapidPath, 'utf8'));
    vapidPublic = keys.publicKey;
    vapidPrivate = keys.privateKey;
    console.log('[PUSH] Loaded persistent VAPID keys from vapid-keys.json');
  } else {
    console.log('[PUSH] No VAPID keys found. Generating persistent keys...');
    const keys = webpush.generateVAPIDKeys();
    vapidPublic = keys.publicKey;
    vapidPrivate = keys.privateKey;
    fs.writeFileSync(vapidPath, JSON.stringify(keys, null, 2));
    console.log('[PUSH] Saved new VAPID keys to vapid-keys.json');
  }
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
      if (err.statusCode === 404 || err.statusCode === 410 || err.statusCode === 400) {
        console.log(`[PUSH] Device unsubscribed or token mismatched (${err.statusCode}). Dropping from database.`);
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
