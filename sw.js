const CACHE_NAME = 'rentanything-v10';
const urlsToCache = [
    './index.html',
    './search.html',
    './product.html',
    './profile.html',
    './my-listings.html',
    './my-bookings.html',
    './chat.html',
    './requests.html',
    './css/style.css',
    './js/app.js',
    './js/search.js',
    './js/product-details.js',
    './js/profile.js',
    './js/auth.js',
    './js/navigation.js',
    './js/theme.js',
    './js/toast.js',
    './js/chat.js',
    './js/requests.js',
    './js/firebase-config.js'
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
    // Network First Strategy for HTML/CSS/JS to ensure updates are seen immediately
    // Only fall back to cache if offline or network fails.
    event.respondWith(
        fetch(event.request)
            .catch(() => {
                return caches.match(event.request);
            })
    );
});

