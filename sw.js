/* ═══════════════════════════════════════════════════════════
   SPORTDATA — Service Worker
   Met en cache tous les fichiers pour fonctionner 100% offline
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'sportdata-v3';
const CACHE_URLS = [
  '/',
  '/index.html',
  '/style.css',
  '/app_offline.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap',
];

/* Installation : met en cache tous les fichiers */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Mise en cache des fichiers offline');
      return cache.addAll(CACHE_URLS.map(url => new Request(url, { cache: 'reload' })));
    }).catch(e => console.warn('[SW] Cache partiel:', e))
  );
  self.skipWaiting();
});

/* Activation : nettoyer les anciens caches */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* Interception des requêtes */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Requêtes Supabase → toujours en ligne (pas de cache)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response(
        JSON.stringify({ error: 'offline' }),
        { headers: { 'Content-Type': 'application/json' } }
      ))
    );
    return;
  }

  // Requêtes Google Fonts → cache puis réseau
  if (url.hostname.includes('fonts')) {
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Fichiers app → cache first (offline-first)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
