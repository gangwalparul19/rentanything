// Push Notification Manager for Admin Panel
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '/js/firebase-config.js';
import { showToast } from '/js/toast-enhanced.js';
import { FCM_CONFIG, NOTIFICATION_SETTINGS } from '/js/fcm-config.js';

// Initialize Firebase Cloud Messaging
let messaging = null;

try {
    messaging = getMessaging(app);
} catch (error) {
    console.error('Firebase Messaging initialization error:', error);
}

// Simple "Ding" sound (Base64 to avoid file dependency)
const NOTIFICATION_SOUND = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"); // Short placeholder, will replace with better one if needed or user provides file.
// Actually, let's use a real short beep base64 for better UX.
const ALERT_SOUND = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");

function playNotificationSound() {
    try {
        ALERT_SOUND.currentTime = 0;
        ALERT_SOUND.play().catch(e => console.warn("Audio play failed (interaction required):", e));
    } catch (e) {
        console.error("Sound error:", e);
    }
}

/**
 * Request notification permission from user
 * @param {boolean} showMessages - Whether to show toast messages (default: true)
 * @returns {Promise<boolean>} True if permission granted
 */
export async function requestNotificationPermission(showMessages = true) {
    try {
        if (!('Notification' in window)) {
            console.warn('This browser does not support notifications');
            if (showMessages) {
                showToast('Notifications not supported in this browser', 'warning');
            }
            return false;
        }

        // If already granted, return true silently
        if (Notification.permission === 'granted') {
            return true;
        }

        // If denied, show error message only if explicitly requested
        if (Notification.permission === 'denied') {
            if (showMessages) {
                showToast('Notifications blocked. Please enable in browser settings: click the lock icon in address bar → Site settings → Notifications → Allow', 'error');
            }
            return false;
        }

        // Permission is 'default' - request permission
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            if (showMessages) {
                showToast('🔔 Notifications enabled! You\'ll receive real-time updates', 'success');
                // Play a success sound
                playNotificationSound();
            }
            return true;
        } else if (permission === 'denied') {
            if (showMessages) {
                showToast('Notification permission denied. You can enable it later in browser settings.', 'warning');
            }
            return false;
        } else {
            // Permission dismissed without selection
            return false;
        }
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        if (showMessages) {
            showToast('Failed to request notification permission', 'error');
        }
        return false;
    }
}

/**
 * Subscribe to push notifications and get FCM token
 * @param {boolean} showMessages - Whether to show toast messages
 * @returns {Promise<string|null>} FCM token or null
 */
export async function subscribeToPushNotifications(showMessages = true) {
    try {
        if (!messaging) {
            console.error('Firebase Messaging not initialized');
            return null;
        }

        // Request permission first (with messages enabled)
        const hasPermission = await requestNotificationPermission(showMessages);
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
            // Save token to Firestore for this user
            await saveFCMToken(token);

            if (showMessages) {
                console.log('✅ Push notifications enabled successfully');
            }

            return token;
        } else {
            // No FCM token available
            if (showMessages) {
                showToast('Failed to get notification token', 'error');
            }
            return null;
        }
    } catch (error) {
        console.error('Error subscribing to push notifications:', error);

        if (showMessages) {
            if (error.code === 'messaging/permission-blocked') {
                showToast('Notifications blocked. Click lock icon in address bar → Notifications → Allow', 'error');
            } else if (error.code === 'messaging/unsupported-browser') {
                showToast('Push notifications not supported in this browser', 'warning');
            } else {
                showToast('Failed to enable notifications. Try again later.', 'error');
            }
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

        // Save to fcm_tokens collection (generic for all users)
        await setDoc(doc(db, 'fcm_tokens', user.uid), {
            token: token,
            email: user.email,
            uid: user.uid,
            lastUpdated: new Date(),
            platform: navigator.platform,
            userAgent: navigator.userAgent
        }, { merge: true });

        // showToast('Notification preferences saved', 'success'); // Silent success is better for auto-save
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
        // Foreground message received

        const notificationTitle = payload.notification?.title || 'New Notification';
        const notificationBody = payload.notification?.body || 'You have a new admin notification';

        // Play Sound
        playNotificationSound();

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
            await deleteDoc(doc(db, 'fcm_tokens', user.uid));
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
