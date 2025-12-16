// Push Notification Manager for Admin Panel
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from './firebase-config.js';
import { showToast } from './toast.js';
import { FCM_CONFIG, NOTIFICATION_SETTINGS } from './fcm-config.js';

// Initialize Firebase Cloud Messaging
let messaging = null;

try {
    messaging = getMessaging(app);
} catch (error) {
    console.error('Firebase Messaging initialization error:', error);
}

/**
 * Request notification permission from user
 * @returns {Promise<boolean>} True if permission granted
 */
export async function requestNotificationPermission() {
    try {
        if (!('Notification' in window)) {
            console.warn('This browser does not support notifications');
            showToast('Notifications not supported in this browser', 'warning');
            return false;
        }

        if (Notification.permission === 'granted') {
            console.log('Notification permission already granted');
            return true;
        }

        if (Notification.permission === 'denied') {
            showToast('Notifications are blocked. Please enable in browser settings.', 'error');
            return false;
        }

        // Request permission
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            console.log('Notification permission granted');
            showToast('Notifications enabled successfully!', 'success');
            return true;
        } else {
            console.log('Notification permission denied');
            showToast('Notification permission denied', 'warning');
            return false;
        }
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        showToast('Failed to request notification permission', 'error');
        return false;
    }
}

/**
 * Subscribe to push notifications and get FCM token
 * @returns {Promise<string|null>} FCM token or null
 */
export async function subscribeToPushNotifications() {
    try {
        if (!messaging) {
            console.error('Firebase Messaging not initialized');
            return null;
        }

        // Request permission first
        const hasPermission = await requestNotificationPermission();
        if (!hasPermission) {
            return null;
        }

        // Get service worker registration
        const registration = await navigator.serviceWorker.ready;

        // Get FCM token
        const token = await getToken(messaging, {
            vapidKey: FCM_CONFIG.vapidKey,
            serviceWorkerRegistration: registration
        });

        if (token) {
            console.log('FCM Token obtained:', token);

            // Save token to Firestore for this admin user
            await saveFCMToken(token);

            return token;
        } else {
            console.log('No FCM token available');
            showToast('Failed to get notification token', 'error');
            return null;
        }
    } catch (error) {
        console.error('Error subscribing to push notifications:', error);

        if (error.code === 'messaging/permission-blocked') {
            showToast('Notifications blocked. Enable in browser settings.', 'error');
        } else if (error.code === 'messaging/unsupported-browser') {
            showToast('Push notifications not supported in this browser', 'warning');
        } else {
            showToast('Failed to enable notifications. Check console for details.', 'error');
        }

        return null;
    }
}

/**
 * Save FCM token to Firestore
 * @param {string} token - FCM registration token
 */
async function saveFCMToken(token) {
    try {
        const { auth, db } = await import('./firebase-config.js');
        const { doc, setDoc } = await import('firebase/firestore');

        const user = auth.currentUser;
        if (!user) {
            console.error('No authenticated user');
            return;
        }

        // Save to admin_tokens collection
        await setDoc(doc(db, 'admin_tokens', user.uid), {
            token: token,
            email: user.email,
            lastUpdated: new Date(),
            platform: navigator.platform,
            userAgent: navigator.userAgent
        }, { merge: true });

        console.log('FCM token saved to Firestore');
        showToast('Notification preferences saved', 'success');
    } catch (error) {
        console.error('Error saving FCM token:', error);
    }
}

/**
 * Handle foreground messages (when admin panel is open)
 */
export function setupForegroundMessageHandler() {
    if (!messaging) {
        return;
    }

    onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);

        const notificationTitle = payload.notification?.title || 'New Notification';
        const notificationBody = payload.notification?.body || 'You have a new admin notification';

        // Show toast notification when admin panel is in foreground
        showToast(`${notificationTitle}: ${notificationBody}`, 'info');

        // Optional: Show browser notification even in foreground
        if (Notification.permission === 'granted') {
            new Notification(notificationTitle, {
                body: notificationBody,
                icon: '/images/icon-192.png',
                badge: '/images/icon-192.png',
                tag: payload.data?.type || 'admin-notification',
                requireInteraction: false,
                data: payload.data
            });
        }

        // Refresh data if needed
        if (payload.data?.type === 'new_dispute') {
            // Trigger dispute reload
            if (window.loadDisputes) {
                window.loadDisputes();
            }
        } else if (payload.data?.type === 'new_report') {
            // Trigger report reload
            if (window.loadReports) {
                window.loadReports();
            }
        }
    });
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications() {
    try {
        if (!messaging) {
            return;
        }

        const { auth, db } = await import('./firebase-config.js');
        const { doc, deleteDoc } = await import('firebase/firestore');

        const user = auth.currentUser;
        if (user) {
            // Remove token from Firestore
            await deleteDoc(doc(db, 'admin_tokens', user.uid));
            console.log('FCM token removed from Firestore');
        }

        showToast('Notifications disabled', 'info');
    } catch (error) {
        console.error('Error unsubscribing from notifications:', error);
    }
}

/**
 * Check current notification permission status
 * @returns {string} Permission status: 'granted', 'denied', 'default', or 'unsupported'
 */
export function getNotificationPermissionStatus() {
    if (!('Notification' in window)) {
        return 'unsupported';
    }
    return Notification.permission;
}
