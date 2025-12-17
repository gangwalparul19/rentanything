// Environment configuration that works in both development and production
// In development: uses fallback values defined below
// In production (Vercel): uses environment variables set in Vercel dashboard

// Check if running in production build
const isProduction = import.meta.env.MODE === 'production';

// Get admin emails safely
const rawAdminEmails = import.meta.env.VITE_ADMIN_EMAILS;

// Debug logging
console.log('🔍 ENV DEBUG:', {
    mode: import.meta.env.MODE,
    isProduction,
    rawAdminEmails: rawAdminEmails,
    hasEnv: typeof rawAdminEmails !== 'undefined'
});

export const ENV = {
    // Firebase Configuration
    FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
    FIREBASE_MEASUREMENT_ID: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,

    // FCM VAPID Key
    FCM_VAPID_KEY: import.meta.env.VITE_FCM_VAPID_KEY,

    // Admin emails
    ADMIN_EMAILS: (typeof rawAdminEmails === 'string' && rawAdminEmails.trim())
        ? rawAdminEmails.split(',').map(e => e.trim().toLowerCase())
        : ['gangwalparul19@gmail.com', 'rentanythingindia@gmail.com'],

    // Environment flags
    DEBUG_MODE: !isProduction,
    IS_PRODUCTION: isProduction
};

console.log('✅ Admin emails:', ENV.ADMIN_EMAILS);