/* GhanaCrimes service worker (hand-written, no Workbox).
   - Web push: pushes carry no payload; we fetch the newest headline and show it.
   - Offline reading: pages you open are kept (network first, cache fallback); /offline when nothing is cached. */
const VERSION = 'gc-sw-v2';
const PAGES = 'gc-pages-v2';
const STATIC = 'gc-static-v2';
const OFFLINE_URL = '/offline';
const MAX_PAGES = 40;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(STATIC).then((c) => c.addAll([OFFLINE_URL, '/icons/icon-192.png'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (![PAGES, STATIC].includes(k)) await caches.delete(k); // drop old Workbox caches
    await self.clients.claim();
  })());
});

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_PAGES; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth')) return;
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) { const c = await caches.open(PAGES); c.put(req, res.clone()).then(() => trim(c)); }
        return res;
      } catch {
        return (await caches.match(req)) || (await caches.match(OFFLINE_URL)) || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) caches.open(STATIC).then((c) => c.put(req, res.clone())); return res; })));
  }
});

self.addEventListener('push', (e) => {
  e.waitUntil((async () => {
    let n = null;
    try { n = await (await fetch('/api/push/latest', { cache: 'no-store' })).json(); } catch {}
    const title = n?.title || 'GhanaCrimes';
    return self.registration.showNotification(title, {
      body: n?.body || 'New on GhanaCrimes', icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
      tag: 'gc-latest', data: { url: n?.url || '/' },
    });
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || '/', self.location.origin).href;
  e.waitUntil((async () => {
    for (const c of await self.clients.matchAll({ type: 'window' })) if (c.url === url && 'focus' in c) return c.focus();
    return self.clients.openWindow(url);
  })());
});

self.addEventListener('message', (e) => {
  if (e.data?.type === 'save-offline' && e.data.url) {
    caches.open(PAGES).then((c) => c.add(e.data.url)).catch(() => {});
  }
});
