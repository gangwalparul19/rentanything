const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting Build Process...');

// 1. Run generate-env.js to create js/env.js (Vite needs this)
try {
    console.log('📝 Generating Environment Variables...');
    require('./generate-env.js');
} catch (e) {
    console.error('❌ Failed to generate env:', e);
    process.exit(1);
}

// 2. Run Vite Build
try {
    console.log('📦 Running Vite Build...');
    // stdio: 'inherit' lets us see Vite's output colors/progress
    execSync('npx vite build', { stdio: 'inherit' });
} catch (e) {
    console.error('❌ Vite Build Failed:', e);
    process.exit(1);
}

// 3. Post-Build
// Vite handles 'public/' folder automatically (copies to dist root).
// We only need to copy special files NOT in public/ but needed in dist/
const distDir = path.join(__dirname, '../dist');
const rootDir = path.join(__dirname, '..');

const extraFiles = [
    'firebase.json',
    // 'store.rules', // Move rules if needed, or leave at root
];

console.log('📂 Copying extra static files...');
extraFiles.forEach(file => {
    const src = path.join(rootDir, file);
    const dest = path.join(distDir, file);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
    }
});

console.log('✅ Build Complete! Output directory: dist');
