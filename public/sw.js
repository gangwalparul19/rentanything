const CACHE_NAME = 'rentanything-v12';
const urlsToCache = [
    '/index.html',
    '/search.html',
    '/product.html',
    '/manifest.json'
    // Note: Vite bundles CSS/JS with hashes, they'll be cached on-demand
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                // Use robust caching: if one fails, log it but don't fail the whole install
                return Promise.all(
                    urlsToCache.map(url => {
                        return cache.add(url).catch(err => {
                            console.error('Failed to cache file:', url, err);
                        });
                    })
                );
            })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            ).then(() => clients.claim());
        })
    );
});

self.addEventListener('fetch', event => {
    // Network First Strategy: Try network, cache response, fallback to cache if offline
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Cache successful responses dynamically
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(event.request);
            })
    );
});

