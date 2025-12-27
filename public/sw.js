const CACHE_NAME = 'rentanything-v52';
const STATIC_ASSETS = [
    '/index.html',
    '/search.html',
    '/product.html',
    '/start-selling.html',
    '/my-listings.html',
    '/my-bookings.html',
    '/chat.html',
    '/profile.html',
    '/wishlist.html',
    '/offline.html',
    '/manifest.json',
    '/favicon.ico'
];

// --- INSTALL ---
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS).catch(err => {
                console.error('[SW] Cache addAll failed:', err);
                // Don't fail install if some assets fail (like /offline.html if not created yet)
            });
        })
    );
});

// --- ACTIVATE ---
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            ).then(() => clients.claim());
        })
    );
});

// --- FETCH STRATEGIES ---

/**
 * Strategy: Cache First, falling back to Network
 * Best for: Images, Fonts, Immutable Assets
 */
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // Fallback for images
        if (request.destination === 'image') {
            return caches.match('/favicon.ico'); // Minimal fallback
        }
        throw error;
    }
}

/**
 * Helper: Fetch with Retry
 * Retries network requests on failure with exponential backoff
 */
async function fetchWithRetry(request, retries = 3, delay = 500) {
    try {
        return await fetch(request.clone());
    } catch (error) {
        if (retries <= 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(request, retries - 1, delay * 2);
    }
}

/**
 * Strategy: Network First, falling back to Cache
 * Best for: HTML, API data
 */
async function networkFirst(request) {
    try {
        // Use fetchWithRetry instead of plain fetch
        const networkResponse = await fetchWithRetry(request);

        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, trying cache for:', request.url);
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        // Offline fallback for HTML
        if (request.mode === 'navigate') {
            return caches.match('/offline.html') || caches.match('/index.html');
        }
        throw error;
    }
}

/**
 * Strategy: Stale While Revalidate
 * Best for: CSS, JS, User Avatars (where content might update but speed is key)
 */
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(err => console.log('[SW] Background fetch failed:', err));

    return cachedResponse || fetchPromise;
}

// --- FETCH LISTENER ---
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // 1. Ignore non-GET requests
    if (event.request.method !== 'GET') return;

    // 2. Ignore Chrome extension requests, etc.
    if (!url.protocol.startsWith('http')) return;

    // 3. STRATEGY SELECTION

    // HTML / Navigation -> Network First
    if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // External Assets (Firebase Storage Images, Fonts, CDNs) -> Cache First
    if (
        url.hostname.includes('firebasestorage.googleapis.com') ||
        url.hostname.includes('fonts.googleapis.com') ||
        url.hostname.includes('fonts.gstatic.com') ||
        url.hostname.includes('cdnjs.cloudflare.com') ||
        url.hostname.includes('placehold.co')
    ) {
        event.respondWith(cacheFirst(event.request));
        return;
    }

    // Local JS/CSS -> Stale While Revalidate
    if (url.origin === location.origin && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))) {
        event.respondWith(staleWhileRevalidate(event.request));
        return;
    }

    // API Calls -> Network First (don't cache POST, but GETs might need caching)
    if (url.pathname.startsWith('/api/') || url.hostname === 'api.ipify.org') {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // Default -> Network First (safest fallback)
    event.respondWith(networkFirst(event.request));
});

// ===== PUSH NOTIFICATIONS (UNCHANGED) =====
self.addEventListener('push', (event) => {
    console.log('[SW] Push Received:', event);

    let data = { title: 'RentAnything', body: 'New notification!', icon: '/images/icon-192.png', url: '/' };

    if (event.data) {
        try {
            const payload = event.data.json();
            if (payload.notification) data = { ...data, ...payload.notification };
            if (payload.data) data = { ...data, ...payload.data };
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon,
        badge: '/images/icon-192.png',
        vibrate: [200, 100, 200],
        data: { url: data.click_action || data.url || '/' }
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow(urlToOpen);
        })
    );
});