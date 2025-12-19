// Service Worker for RentAnything Admin Panel
const CACHE_NAME = 'rentanything-admin-v31';
const ASSETS_TO_CACHE = [
    '/admin.html',
    '/admin-manifest.json',
    '/css/style.css',
    '/js/admin.js',
    '/js/admin-config.js',
    '/js/firebase-config.js',
    '/js/toast.js',
    '/images/icon-192.png',
    '/images/icon-512.png',
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching admin panel assets...');
                return cache.addAll(ASSETS_TO_CACHE).catch(err => {
                    console.error('Failed to cache some assets:', err);
                    // Don't fail the install if some assets can't be cached
                });
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip service worker for Firestore and external requests
    if (event.request.url.includes('firestore.googleapis.com') ||
        event.request.url.includes('firebase') ||
        event.request.url.includes('google') ||
        event.request.url.includes('googleapis')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request).then((fetchResponse) => {
                    // Cache successful GET requests
                    if (event.request.method === 'GET' && fetchResponse.status === 200) {
                        return caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, fetchResponse.clone());
                            return fetchResponse;
                        });
                    }
                    return fetchResponse;
                });
            })
            .catch(() => {
                // Return offline page for HTML requests
                if (event.request.headers.get('accept').includes('text/html')) {
                    return caches.match('/admin.html');
                }
            })
    );
});

// Background sync for future enhancements
self.addEventListener('sync', (event) => {
    console.log('Background sync:', event.tag);

    if (event.tag === 'sync-admin-actions') {
        event.waitUntil(syncPendingActions());
    }
});

async function syncPendingActions() {
    // Future: Sync pending admin actions when back online
    console.log('Syncing pending admin actions...');
}

// ===== PUSH NOTIFICATIONS =====

// Listen for push notifications from Firebase Cloud Messaging
self.addEventListener('push', (event) => {
    console.log('Push notification received:', event);

    let notificationData = {
        title: 'RentAnything Admin',
        body: 'You have a new notification',
        icon: '/images/icon-192.png',
        badge: '/images/icon-192.png',
        data: {}
    };

    // Parse notification data
    if (event.data) {
        try {
            const payload = event.data.json();
            console.log('Notification payload:', payload);

            // FCM sends data in notification object
            if (payload.notification) {
                notificationData.title = payload.notification.title || notificationData.title;
                notificationData.body = payload.notification.body || notificationData.body;
                notificationData.icon = payload.notification.icon || notificationData.icon;
            }

            // Custom data payload
            if (payload.data) {
                notificationData.data = payload.data;
                notificationData.tag = payload.data.type || 'admin-notification';

                // Set click action URL based on notification type
                if (payload.data.type === 'new_dispute') {
                    notificationData.data.url = '/admin.html#disputes';
                } else if (payload.data.type === 'new_report') {
                    notificationData.data.url = '/admin.html#reports';
                } else if (payload.data.type === 'new_booking') {
                    notificationData.data.url = '/admin.html#bookings';
                } else if (payload.data.type === 'verification_request') {
                    notificationData.data.url = '/admin.html#verifications';
                } else {
                    notificationData.data.url = '/admin.html';
                }
            }
        } catch (error) {
            console.error('Error parsing notification:', error);
        }
    }

    // Show notification
    event.waitUntil(
        self.registration.showNotification(notificationData.title, {
            body: notificationData.body,
            icon: notificationData.icon,
            badge: notificationData.badge,
            tag: notificationData.tag,
            data: notificationData.data,
            requireInteraction: true,
            vibrate: [200, 100, 200],
            sound: 'default',
            actions: [
                {
                    action: 'view',
                    title: 'View',
                    icon: '/images/icon-192.png'
                },
                {
                    action: 'close',
                    title: 'Dismiss'
                }
            ]
        })
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);
    event.notification.close();

    // Get the URL to open
    let urlToOpen = '/admin.html';

    if (event.action === 'view' || !event.action) {
        if (event.notification.data && event.notification.data.url) {
            urlToOpen = event.notification.data.url;
        }

        // Open or focus admin panel
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((clientList) => {
                    // Check if admin panel is already open
                    for (let client of clientList) {
                        if (client.url.includes('/admin.html') && 'focus' in client) {
                            // Focus existing window and navigate
                            return client.focus().then(client => {
                                if (client.url !== urlToOpen) {
                                    return client.navigate(urlToOpen);
                                }
                                return client;
                            });
                        }
                    }
                    // Open new window
                    if (clients.openWindow) {
                        return clients.openWindow(urlToOpen);
                    }
                })
        );
    }
    // 'close' action just closes (default behavior)
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
    console.log('Notification closed:', event);
    // Track dismissed notifications if needed
});

