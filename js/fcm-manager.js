/**
 * FCM Manager - Firebase Cloud Messaging Token Management
 * Handles push notification setup for both users and admins
 */

import { db, auth } from './firebase-config.js';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { showToast } from './toast-enhanced.js';

let messaging = null;

// VAPID Key from environment variable (set VITE_FCM_VAPID_KEY in Vercel)
// For Vercel, add an env var: VITE_FCM_VAPID_KEY = your_vapid_key
// This will be replaced at build time
const VAPID_KEY = import.meta.env.FCM_VAPID_KEY || '';

/**
 * Initialize Firebase Cloud Messaging
 */
export async function initFCM() {
    try {
        // Check if messaging is supported
        if (!('Notification' in window)) {
            console.log('Notifications not supported');
            return null;
        }

        // Initialize messaging
        const { getMessaging: getMsg } = await import('firebase/messaging');
        messaging = getMsg();

        // Listen for foreground messages
        onMessage(messaging, (payload) => {
            console.log('Foreground message received:', payload);

            // Show toast for foreground notifications
            const title = payload.notification?.title || 'New Notification';
            const body = payload.notification?.body || '';

            showToast(`${title}: ${body}`, 'info', 5000);

            // Also show browser notification if permission granted
            if (Notification.permission === 'granted') {
                new Notification(title, {
                    body: body,
                    icon: '/logo.png',
                    badge: '/logo.png'
                });
            }
        });

        return messaging;
    } catch (error) {
        console.error('Error initializing FCM:', error);
        return null;
    }
}

/**
 * Request notification permission and save FCM token
 * @param {string} userId - User's Firebase UID
 * @param {boolean} isAdmin - Whether user is an admin
 * @returns {Promise<string|null>} FCM token or null
 */
export async function requestAndSaveFCMToken(userId, isAdmin = false) {
    try {
        // Check permission
        if (Notification.permission === 'denied') {
            showToast('Notifications are blocked. Please enable in browser settings.', 'warning');
            return null;
        }

        // Request permission if not granted
        if (Notification.permission !== 'granted') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                showToast('Notification permission denied', 'warning');
                return null;
            }
        }

        // Initialize FCM if not already
        if (!messaging) {
            await initFCM();
        }

        // Get FCM token
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });

        if (token) {
            // Save to Firestore
            await setDoc(doc(db, 'fcm_tokens', userId), {
                token: token,
                userId: userId,
                isAdmin: isAdmin,
                platform: navigator.platform,
                userAgent: navigator.userAgent,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            }, { merge: true });

            console.log('FCM Token saved for user:', userId);
            showToast('Notifications enabled! You will receive alerts.', 'success');
            return token;
        }

        return null;
    } catch (error) {
        console.error('Error getting FCM token:', error);
        showToast('Failed to enable notifications', 'error');
        return null;
    }
}

/**
 * Check if user has FCM token and update if needed
 * @param {string} userId - User's Firebase UID
 */
export async function updateFCMTokenIfNeeded(userId) {
    try {
        if (Notification.permission !== 'granted') {
            return;
        }

        if (!messaging) {
            await initFCM();
        }

        const token = await getToken(messaging, { vapidKey: VAPID_KEY });

        if (token) {
            // Update token in Firestore (in case it changed)
            await setDoc(doc(db, 'fcm_tokens', userId), {
                token: token,
                updatedAt: serverTimestamp()
            }, { merge: true });
        }
    } catch (error) {
        console.error('Error updating FCM token:', error);
    }
}
