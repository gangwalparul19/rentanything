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
    FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAn4tsCwVcjziA81sSNz5_GG7GW2a5-0B0',
    FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'rent-anything-shop.firebaseapp.com',
    FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'rent-anything-shop',
    FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'rent-anything-shop.firebasestorage.app',
    FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '453157285688',
    FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID || '1:453157285688:web:27a1a725acb45a6dd99bcd',
    FIREBASE_MEASUREMENT_ID: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-VNG1BQ39DG',

    // FCM VAPID Key
    FCM_VAPID_KEY: import.meta.env.VITE_FCM_VAPID_KEY || 'BPx4GwUnsLX4ATKXPFQkZCP_JoYsnPw_lcEJK_pDMN_s8z3MlrxK1xrdPm6EvGACg2bRktQ5f-L6gQ1JzBtyujE',

    // Admin emails
    ADMIN_EMAILS: (typeof rawAdminEmails === 'string' && rawAdminEmails.trim())
        ? rawAdminEmails.split(',').map(e => e.trim().toLowerCase())
        : ['gangwalparul19@gmail.com', 'rentanythingindia@gmail.com'],

    // Environment flags
    DEBUG_MODE: !isProduction,
    IS_PRODUCTION: isProduction
};

console.log('✅ Admin emails:', ENV.ADMIN_EMAILS);