// COMEX GOLD TRADE — Service Worker v2
// Push Notifications + Offline Cache

const CACHE_NAME = 'comex-v2';
const VAPID_PUBLIC_KEY = 'BMTFc2XyM070WuZG2Ewjlsj4kMehvOy9qTFYw45EQw0SEw_uohKIpdi47cDCHHnE26wafRwI_AQBghanxOQO-Us';

// ================================================================
// INSTALL — cache static assets
// ================================================================
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c =>
      c.addAll(['./user.html', './manifest.json']).catch(() => {})
    )
  );
  self.skipWaiting();
});

// ================================================================
// ACTIVATE — clean old caches
// ================================================================
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ================================================================
// FETCH — network first, cache fallback
// ================================================================
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache successful responses
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ================================================================
// PUSH — show notification
// ================================================================
self.addEventListener('push', e => {
  let data = { title: 'COMEX GOLD TRADE', body: 'You have a new notification', icon: '/manifest.json' };
  try {
    if (e.data) data = { ...data, ...e.data.json() };
  } catch(err) {
    if (e.data) data.body = e.data.text();
  }

  const options = {
    body: data.body,
    icon: data.icon || './manifest.json',
    badge: './manifest.json',
    vibrate: [100, 50, 100],
    data: { url: data.url || './user.html', timestamp: Date.now() },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Dismiss' },
    ],
    requireInteraction: false,
    tag: 'comex-notification',
  };

  e.waitUntil(
    self.registration.showNotification(data.title || 'COMEX GOLD TRADE', options)
  );
});

// ================================================================
// NOTIFICATION CLICK — open app
// ================================================================
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'close') return;
  const url = e.notification.data?.url || './user.html';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('user.html') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// ================================================================
// PUSH SUBSCRIPTION CHANGE
// ================================================================
self.addEventListener('pushsubscriptionchange', e => {
  e.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_PUBLIC_KEY,
    }).then(sub => {
      // Could notify server here
      console.log('Push subscription updated:', sub);
    })
  );
});
