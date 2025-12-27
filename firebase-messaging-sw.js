// Firebase Cloud Messaging Service Worker Template
// This file is generated during build - DO NOT EDIT DIRECTLY
// Edit firebase-messaging-sw.template.js instead

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration (injected during build)
firebase.initializeApp({
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
});

const messaging = firebase.messaging();

// Handle background messages (when app is not in focus)
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'RentAnything';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new notification',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: payload.data?.type || 'notification',
        data: payload.data,
        requireInteraction: false,
        vibrate: [200, 100, 200]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification clicked:', event);

    event.notification.close();

    const data = event.notification.data || {};
    let targetUrl = '/';

    // Route based on notification type
    if (data.type === 'community_request') {
        targetUrl = '/requests.html';
    } else if (data.type === 'chat_message' && data.chatId) {
        targetUrl = `/chat.html?id=${data.chatId}`;
    } else if (data.type === 'new_booking' || data.type === 'booking_request') {
        targetUrl = '/my-listings.html';
    } else if (data.type === 'booking_status') {
        targetUrl = '/my-bookings.html';
    } else if (data.type === 'listing_status') {
        targetUrl = '/my-listings.html';
    } else if (data.url) {
        targetUrl = data.url;
    }

    // Open or focus the app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If app is already open, navigate and focus
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
