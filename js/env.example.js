// Environment Configuration Template
// INSTRUCTIONS:
// 1. Copy this file to .env.js (same directory)
// 2. Replace ALL placeholder values with your actual keys from Firebase Console
// 3. Never commit .env.js to git (it's in .gitignore)

export const ENV = {
    // ===== FIREBASE CONFIGURATION =====
    // Get from: Firebase Console → Project Settings → General → Your apps → Web app
    FIREBASE_API_KEY: 'YOUR_FIREBASE_API_KEY_HERE',
    FIREBASE_AUTH_DOMAIN: 'your-project.firebaseapp.com',
    FIREBASE_PROJECT_ID: 'your-project-id',
    FIREBASE_STORAGE_BUCKET: 'your-project.firebasestorage.app',
    FIREBASE_MESSAGING_SENDER_ID: 'YOUR_SENDER_ID',
    FIREBASE_APP_ID: 'YOUR_APP_ID',
    FIREBASE_MEASUREMENT_ID: 'G-XXXXXXXXXX',
    
    // ===== FIREBASE CLOUD MESSAGING =====
    // Get from: Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
    FCM_VAPID_KEY: 'YOUR_VAPID_KEY_HERE',
    
    // ===== ADMIN CONFIGURATION =====
    // Add authorized admin email addresses
    ADMIN_EMAILS: [
        'admin1@example.com',
        'admin2@example.com',
    ],
    
    // ===== OPTIONAL: ADD OTHER SECRETS =====
    // STRIPE_PUBLIC_KEY: 'pk_test_...',
    // GOOGLE_MAPS_API_KEY: 'AIza...',
};
