self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const notificationOptions = {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200, 100, 200, 100, 200],
      requireInteraction: true,
      data: data.data || {}
    };

    if ('setAppBadge' in navigator) {
      navigator.setAppBadge(1).catch(e => console.warn('Badge error', e));
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'VU Budget', notificationOptions)
    );
  } catch (err) {
    console.error('Error parsing push data', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(e => console.warn('Badge clear error', e));
  }

  const urlPath = event.notification.data.url || '/';
  const fullUrl = new URL(urlPath, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus any existing app window (same origin)
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          client.navigate(fullUrl);
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});
