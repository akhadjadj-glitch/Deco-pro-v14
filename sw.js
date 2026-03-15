var CACHE_NAME = 'decor-pro-v13-cache';
var APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_SHELL);
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  // Use Stale-While-Revalidate pattern for maximum performance & offline availability
  if (event.request.method !== 'GET') return;

  // Firebase Firestore/Storage API endpoints handled purely by Cache-First or Network fallback
  if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('firebasestorage.googleapis.com')) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Stale-While-Revalidate for application assets
  event.respondWith(
    caches.match(event.request).then(function(cachedResponse) {
      const fetchPromise = fetch(event.request).then(function(networkResponse) {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(function() {
        return cachedResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});
