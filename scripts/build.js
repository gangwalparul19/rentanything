const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Build Process...');

// 1. Run generate-env.js to create js/env.js (Vite needs this)
try {
    console.log('📝 Generating Environment Variables...');
    require('./generate-env.js');
    console.log('✅ Generated js/env.js (using process.env + env.example.js fallback).');
} catch (e) {
    console.error('❌ Environment generation failed:', e);
    process.exit(1);
}

// 2. Run Vite Build (CRITICAL: This bundles Firebase modules properly!)
try {
    console.log('📦 Running Vite Build...');
    // stdio: 'inherit' lets us see Vite's output colors/progress
    execSync('npx vite build', { stdio: 'inherit' });
    console.log('✅ Vite build completed successfully!');
} catch (e) {
    console.error('❌ Vite Build Failed:', e);
    process.exit(1);
}

// 3. Post-Build: Copy additional files not handled by Vite
const distDir = path.join(__dirname, '../dist');
const rootDir = path.join(__dirname, '..');

// Files to copy that Vite doesn't handle
const extraFiles = [
    'firebase.json',
    'firestore.rules',
    'storage.rules',
    '_redirects',
    'vercel.json'
];

console.log('📂 Copying extra configuration files...');
extraFiles.forEach(file => {
    const src = path.join(rootDir, file);
    const dest = path.join(distDir, file);
    if (fs.existsSync(src)) {
        try {
            fs.copyFileSync(src, dest);
            console.log(`  ✓ Copied ${file}`);
        } catch (err) {
            console.warn(`  ⚠ Could not copy ${file}:`, err.message);
        }
    }
});

console.log('');
console.log('✅ Build Complete! Output directory: dist');
console.log('📦 Vite has bundled all JavaScript modules (including Firebase)');
console.log('📁 All assets from public/ folder copied to dist/');
console.log('🌐 Ready for deployment!');
