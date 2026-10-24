/* ═══════════════════════════════════════════════════════════
   SPORTDATA — SERVICE WORKER
   Met en cache les ressources nécessaires au fonctionnement hors ligne.
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'sportdata-v26-modal-localization';
const CACHE_URLS = [
  './index.html',
  './style.css',
  './app_offline.js',
  './manifest.json',
  './app-icon.png',
  './sportdata-logo.png',
];

// Installer la nouvelle version en mettant en cache toutes les ressources essentielles.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      const requests = CACHE_URLS.map(url =>
        new Request(new URL(url, self.registration.scope), { cache: 'reload' })
      );
      return cache.addAll(requests);
    }).catch(error => {
      console.error('[SW] Échec de la mise en cache hors ligne:', error);
      throw error;
    })
  );
  self.skipWaiting();
});

// Supprimer les anciens caches SportData puis prendre immédiatement le contrôle des pages.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key =>
        key.startsWith('sportdata-') && key !== CACHE_NAME
      ).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Traiter uniquement les requêtes GET ; les autres méthodes ne sont pas mises en cache.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Laisser les appels Supabase passer par le réseau et signaler clairement l'absence de connexion.
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response(
        JSON.stringify({ error: 'offline' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      ))
    );
    return;
  }

  // Mettre en cache les polices lorsqu'elles sont disponibles, sans bloquer leur chargement réseau.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    // Pour le reste, privilégier le cache et utiliser index.html comme solution de repli hors ligne.
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return res;
        })
      )
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME)
      .then(cache => cache.match(event.request, { ignoreSearch: true }))
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res.ok && url.origin === self.location.origin) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return res;
        }).catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.open(CACHE_NAME).then(cache =>
              cache.match(new URL('./index.html', self.registration.scope))
            );
          }
          return new Response('Ressource indisponible hors ligne.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        });
      })
  );
});
