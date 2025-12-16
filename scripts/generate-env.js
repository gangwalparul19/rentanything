const fs = require('fs');
const path = require('path');

// Output path: root/js/env.js
const envFilePath = path.join(__dirname, '../js/env.js');

// Map of environment variables to inject
// These correspond to the keys in js/env.example.js
// Vercel/System Env Vars -> Your Code's ENV object
const envContent = `
export const ENV = {
    FIREBASE_API_KEY: '${process.env.FIREBASE_API_KEY || ''}',
    FIREBASE_AUTH_DOMAIN: '${process.env.FIREBASE_AUTH_DOMAIN || ''}',
    FIREBASE_PROJECT_ID: '${process.env.FIREBASE_PROJECT_ID || ''}',
    FIREBASE_STORAGE_BUCKET: '${process.env.FIREBASE_STORAGE_BUCKET || ''}',
    FIREBASE_MESSAGING_SENDER_ID: '${process.env.FIREBASE_MESSAGING_SENDER_ID || ''}',
    FIREBASE_APP_ID: '${process.env.FIREBASE_APP_ID || ''}',
    FIREBASE_MEASUREMENT_ID: '${process.env.FIREBASE_MEASUREMENT_ID || ''}',
    
    FCM_VAPID_KEY: '${process.env.FCM_VAPID_KEY || ''}',
    
    // Admin emails (comma separated string in env var -> array)
    ADMIN_EMAILS: ${(process.env.ADMIN_EMAILS ? JSON.stringify(process.env.ADMIN_EMAILS.split(',')) : "['admin@rentanything.shop']")}
};
`;

try {
    fs.writeFileSync(envFilePath, envContent.trim());
    console.log('✅ Generated js/env.js from environment variables.');
} catch (error) {
    console.error('❌ Error generating js/env.js:', error);
    process.exit(1);
}
