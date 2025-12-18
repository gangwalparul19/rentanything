const CACHE_NAME = 'rentanything-v28';
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

self.addEventListener('fetch', (event) => {
    // Skip caching for non-GET requests (POST, PUT, DELETE, etc.)
    if (event.request.method !== 'GET') {
        return;
    }

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

// ===== PUSH NOTIFICATIONS =====

self.addEventListener('push', (event) => {
    console.log('[SW] Push Received:', event);

    let data = { title: 'RentAnything', body: 'New notification!', icon: '/images/icon-192.png', url: '/' };

    if (event.data) {
        try {
            const payload = event.data.json();
            // Support both data-only and notification payloads
            if (payload.notification) {
                data = { ...data, ...payload.notification };
            }
            if (payload.data) {
                data = { ...data, ...payload.data };
            }
        } catch (e) {
            console.error('[SW] Error parsing push data', e);
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || '/images/icon-192.png',
        badge: '/images/icon-192.png',
        vibrate: [200, 100, 200],
        sound: 'default',
        data: {
            url: data.click_action || data.url || '/'
        },
        requireInteraction: false
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification Clicked:', event);
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if there's already a tab open with this URL
            for (const client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // If no tab is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

