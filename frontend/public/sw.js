const CACHE_NAME = 'chopasap-app-v2';
const APP_SHELL = ['/', '/manifest.webmanifest', '/chopasap-logo.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((response) => response || caches.match('/')))
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (!['ORDER_STATUS_NOTIFICATION', 'CHOPASAP_NOTIFICATION'].includes(event.data?.type)) return;

  const { title, body, tag } = event.data;
  event.waitUntil(
    self.registration.showNotification(title || 'ChopASAP update', {
      body: body || 'You have a new update.',
      icon: '/chopasap-logo.png',
      badge: '/chopasap-logo.png',
      tag: tag || 'chopasap-update'
    })
  );
});
