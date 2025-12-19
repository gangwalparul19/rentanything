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

// Helper function for recursive folder copy (needed for public/ to dist/)
function copyFolderRecursiveSync(source, target) {
    let files = [];
    const targetFolder = path.join(target, path.basename(source));
    if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder);
    }
    if (fs.existsSync(source) && fs.lstatSync(source).isDirectory()) {
        files = fs.readdirSync(source);
        files.forEach(function (file) {
            const curSource = path.join(source, file);
            if (fs.lstatSync(curSource).isDirectory()) {
                copyFolderRecursiveSync(curSource, targetFolder);
            } else {
                fs.copyFileSync(curSource, path.join(targetFolder, file));
            }
        });
    }
}

async function build() {
    try {
        console.log('🔧 Starting build process...\n');

        // Step 1: Generate environment configuration (already done above, but keeping the execSync for consistency if this block were standalone)
        // console.log('📝 Generating environment configuration...');
        // execSync('node scripts/generate-env.js', { stdio: 'inherit' }); // This was already done by require('./generate-env.js')

        // Step 2: Generate Firebase Messaging Service Worker
        console.log('📝 Generating Firebase Messaging Service Worker...');
        execSync('node scripts/generate-sw.js', { stdio: 'inherit' });

        // Step 3: Run Vite build
        console.log('\n🏗️  Running Vite build...');
        execSync('vite build', { stdio: 'inherit' });

        // Step 4: Copy extra files to dist
        console.log('\n📁 Copying additional files to dist...');

        const distDir = path.join(__dirname, '../dist');
        const rootDir = path.join(__dirname, '..');

        // Files to copy that Vite doesn't handle
        const extraFiles = [
            'firebase.json',
            'firestore.rules',
            'storage.rules',
            '_redirects',
            'vercel.json',
            // PWA Icons
            'android-chrome-192x192.png',
            'android-chrome-512x512.png',
            'apple-touch-icon.png',
            'favicon-16x16.png',
            'favicon-32x32.png',
            // Additional assets
            'banner2.png',
            'banner3.png'
        ];

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

        // Copy all files from public/ to dist/ (including Firebase config)
        // Note: Vite usually handles public folder, but this ensures specific files are there if needed.
        // The original script had a separate public copy, this integrates it.
        const publicDir = path.join(rootDir, 'public');
        if (fs.existsSync(publicDir)) {
            // Copy contents of public to dist, not public folder itself into dist/public
            fs.readdirSync(publicDir).forEach(item => {
                const srcPath = path.join(publicDir, item);
                const destPath = path.join(distDir, item);
                if (fs.lstatSync(srcPath).isDirectory()) {
                    copyFolderRecursiveSync(srcPath, distDir); // Copy folder content to dist
                } else {
                    fs.copyFileSync(srcPath, destPath);
                }
            });
            console.log('  ✓ All assets from public/ folder copied to dist/');
        }

        console.log('\n✅ Build completed successfully!');
        console.log('🌐 Ready for deployment!\n');

    } catch (error) {
        console.error('\n❌ Build failed:', error.message);
        process.exit(1);
    }
}

// Execute the build process
build();

console.log('');
console.log('✅ Build Complete! Output directory: dist');
console.log('📦 Vite has bundled all JavaScript modules (including Firebase)');
console.log('📁 All assets from public/ folder copied to dist/');
console.log('🌐 Ready for deployment!');
