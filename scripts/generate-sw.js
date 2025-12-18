const fs = require('fs');
const path = require('path');

/**
 * Generate Firebase Messaging Service Worker with environment variables
 * Uses VITE_ prefixed env vars like env.js does
 */

// Read template
const templatePath = path.join(__dirname, '..', 'firebase-messaging-sw.template.js');
const template = fs.readFileSync(templatePath, 'utf-8');

// Get environment variables (using VITE_ prefix like env.js)
const env = {
    FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY || '',
    FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || '',
    FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    FIREBASE_MESSAGING_SENDER_ID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID || '',
    FIREBASE_MEASUREMENT_ID: process.env.VITE_FIREBASE_MEASUREMENT_ID || ''
};

// Replace placeholders
let swContent = template;
Object.keys(env).forEach(key => {
    const placeholder = `\${${key}}`;
    swContent = swContent.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), env[key]);
});

// Write to root (for local development)
const rootSwPath = path.join(__dirname, '..', 'firebase-messaging-sw.js');
fs.writeFileSync(rootSwPath, swContent);
console.log('✅ Generated firebase-messaging-sw.js');

// Write to public folder (for deployment)
const publicSwPath = path.join(__dirname, '..', 'public', 'firebase-messaging-sw.js');
fs.writeFileSync(publicSwPath, swContent);
console.log('✅ Generated public/firebase-messaging-sw.js');
