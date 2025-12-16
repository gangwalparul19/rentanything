const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting Build Process...');

// 1. Run generate-env.js first
try {
    console.log('📝 Generating Environment Variables...');
    require('./generate-env.js');
} catch (e) {
    console.error('❌ Failed to generate env:', e);
    process.exit(1);
}

// 2. Define Source and Dist
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

// 3. Clean and Create Dist
if (fs.existsSync(distDir)) {
    console.log('🧹 Cleaning old dist...');
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir);

// 4. Copy Function
function copyRecursive(src, dest) {
    const exists = fs.existsSync(src);
    conststats = exists && fs.statSync(src);

    if (!exists) return;

    if (fs.statSync(src).isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest);
        fs.readdirSync(src).forEach(child => {
            copyRecursive(path.join(src, child), path.join(dest, child));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

// 5. Define what to copy
const itemsToCopy = [
    'css',
    'js',
    'functions', // Optional: if needed by backend, but usually Vercel handles this separately. Let's include if unsure.
    'manifest.json',
    'admin-manifest.json',
    'sw.js',
    'admin-sw.js',
    'firebase.json',
    'firestore.rules',
    'storage.rules',
    'database_guide.md' // Optional docs
];

// Copy all HTML files
const files = fs.readdirSync(rootDir);
files.forEach(file => {
    if (file.endsWith('.html') || file.endsWith('.png') || file.endsWith('.ico') || file.endsWith('.json')) {
        // Skip package files and unwanted jsons if needed, but safe to copy
        if (file === 'package.json' || file === 'package-lock.json') return;
        copyRecursive(path.join(rootDir, file), path.join(distDir, file));
    }
});

// Copy specific folders
itemsToCopy.forEach(item => {
    copyRecursive(path.join(rootDir, item), path.join(distDir, item));
});

console.log('✅ Build Complete! Output directory: dist');
