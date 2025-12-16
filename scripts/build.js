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

// 3. Post-Build: Copy essential static files that might be missed
// (Vite handles imported assets, but root files like sw.js or firebase.json need help if not strictly imported)
const distDir = path.join(__dirname, '../dist');
const rootDir = path.join(__dirname, '..');

const extraFiles = [
    'firebase.json',
    'admin-manifest.json', // Manifests are usually linked in HTML, but good to be safe
    'manifest.json',
    'sw.js',
    'admin-sw.js'
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
