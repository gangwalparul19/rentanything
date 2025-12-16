// Firebase Cloud Messaging Configuration
import { ENV } from './env.js';

export const FCM_CONFIG = {
    // VAPID key loaded from environment configuration
    // See .env.example.js for setup instructions
    vapidKey: ENV.FCM_VAPID_KEY,

    // Your Firebase config (already in firebase-config.js, but needed for messaging)
    // This is just for reference - use the actual config from firebase-config.js
};

// Notification topics for admin panel
export const NOTIFICATION_TOPICS = {
    NEW_BOOKING: 'new_booking',
    NEW_DISPUTE: 'new_dispute',
    NEW_REPORT: 'new_report',
    PAYMENT_RECEIVED: 'payment_received',
    VERIFICATION_REQUEST: 'verification_request',
};

// Notification settings
export const NOTIFICATION_SETTINGS = {
    // Default enabled notifications
    enabledTopics: [
        NOTIFICATION_TOPICS.NEW_DISPUTE,
        NOTIFICATION_TOPICS.NEW_REPORT,
        NOTIFICATION_TOPICS.VERIFICATION_REQUEST,
    ],

    // Notification options
    requireInteraction: true, // Don't auto-dismiss
    vibrate: [200, 100, 200], // Vibration pattern
    badge: '/images/icon-192.png',
    icon: '/images/icon-192.png',
};
