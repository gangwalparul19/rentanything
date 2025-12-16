import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

// Dynamically find all HTML files in the root directory
const root = __dirname;
const files = fs.readdirSync(root);
const htmlFiles = files.filter(file => file.endsWith('.html'));

// Create input object for Rollup
const input = {};
htmlFiles.forEach(file => {
    const name = file.replace('.html', '');
    input[name] = resolve(root, file);
});

export default defineConfig({
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: input
        }
    },
    // Ensure the root is correctly set to current dir
    root: '.',
    // Allow serving from root
    server: {
        fs: {
            allow: ['..']
        }
    }
});
