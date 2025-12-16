const fs = require('fs');
const path = require('path');

// Output path: root/js/env.js
const envFilePath = path.join(__dirname, '../js/env.js');
const exampleFilePath = path.join(__dirname, '../js/env.example.js');

// Helper to extract value from file content using regex
function extractVal(content, key) {
    const regex = new RegExp(`${key}:\\s*['"](.+?)['"]`);
    const match = content.match(regex);
    return match ? match[1] : '';
}

let fileContent = '';
if (fs.existsSync(exampleFilePath)) {
    fileContent = fs.readFileSync(exampleFilePath, 'utf8');
}

// Priority: Process Env (Vercel) > env.example.js (User local edit) > Empty
const getEnv = (key) => process.env[key] || extractVal(fileContent, key) || '';

const envContent = `
export const ENV = {
    FIREBASE_API_KEY: '${getEnv('FIREBASE_API_KEY')}',
    FIREBASE_AUTH_DOMAIN: '${getEnv('FIREBASE_AUTH_DOMAIN')}',
    FIREBASE_PROJECT_ID: '${getEnv('FIREBASE_PROJECT_ID')}',
    FIREBASE_STORAGE_BUCKET: '${getEnv('FIREBASE_STORAGE_BUCKET')}',
    FIREBASE_MESSAGING_SENDER_ID: '${getEnv('FIREBASE_MESSAGING_SENDER_ID')}',
    FIREBASE_APP_ID: '${getEnv('FIREBASE_APP_ID')}',
    FIREBASE_MEASUREMENT_ID: '${getEnv('FIREBASE_MEASUREMENT_ID')}',
    
    FCM_VAPID_KEY: '${getEnv('FCM_VAPID_KEY')}',
    
    // Admin emails are array, handle carefully
    ADMIN_EMAILS: ${(process.env.ADMIN_EMAILS ? JSON.stringify(process.env.ADMIN_EMAILS.split(',')) : "['admin@rentanything.shop']")}
};
`;

try {
    fs.writeFileSync(envFilePath, envContent.trim());
    console.log('✅ Generated js/env.js (using process.env + env.example.js fallback).');
} catch (error) {
    console.error('❌ Error generating js/env.js:', error);
    process.exit(1);
}
