

// Firebase Imports
import { db } from './firebase-config.js';
import { collection, getDocs, query, limit, doc, getDoc } from 'firebase/firestore';
import { initMobileMenu } from './navigation.js';
import { initTheme } from './theme.js';
import { initAuth } from './auth.js';
import { initHeader } from './header-manager.js';
import { initFooter } from './footer-manager.js';
import { showLoader, hideLoader } from './loader.js';
import { HOME_PAGE_LISTING_LIMIT } from './constants.js';
import { showToast } from './toast-enhanced.js';

// console.log('RentAnything App Initialized');

// === PWA INSTALLATION (Registered at top level to prevent race condition) ===
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Notify other parts of the app that PWA is available
    window.dispatchEvent(new CustomEvent('pwa-available'));

    // Show install button (if it exists)
    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
        installBtn.style.display = 'flex';
    }
});

// Listen for install requests from header menu
window.addEventListener('pwa-install-requested', async () => {
    if (deferredPrompt) {
        try {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                showToast('App installed successfully!', 'success');
            }

            deferredPrompt = null;
            const installBtn = document.getElementById('install-btn');
            if (installBtn) installBtn.style.display = 'none';

            // Hide menu install link too
            const menuInstallLink = document.getElementById('mobile-install-app');
            if (menuInstallLink) menuInstallLink.style.display = 'none';

        } catch (error) {
            console.error('Install prompt error:', error);
        }
    } else {
        // Already installed or not available
        if (window.matchMedia('(display-mode: standalone)').matches) {
            showToast('App is already installed!', 'info');
        } else {
            showToast('Install not available on this device', 'info');
        }
    }
});

// Install button click handler (registered after DOM is ready)
document.addEventListener('DOMContentLoaded', () => {
    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
        installBtn.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('pwa-install-requested'));
        });
    }
});


// DOM Elements
const listingsContainer = document.getElementById('listings-container');

// Fetch Listings from Firestore
async function fetchListings() {
    showLoader('Loading amazing items...');
    try {
        // Simple query without orderBy to avoid index requirement
        const q = query(
            collection(db, "listings"),
            limit(HOME_PAGE_LISTING_LIMIT)
        );
        const querySnapshot = await getDocs(q);
        // Debug: Fetched listings count

        const listings = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // FILTER: Only show approved/active listings (or legacy items without status field)
            if (data.status === 'active' || data.status === 'approved' || !data.status) {
                listings.push({ id: doc.id, ...data });
            }
        });

        // Debug: Filtered listings to display
        renderListings(listings);
    } catch (error) {
        console.error("Error fetching listings:", error);
        if (listingsContainer) {
            listingsContainer.innerHTML = `<p style="text-align: center; grid-column: 1/-1;">Error loading listings. ${error.message}</p>`;
        }
    } finally {
        hideLoader();
    }
}

// Render Listings
function renderListings(listings) {
    if (!listingsContainer) {
        console.error("Listings container not found!");
        return;
    }

    if (listings.length === 0) {
        listingsContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                <h3>No items listed yet 😔</h3>
                <p>Be the first one to list an item!</p>
            </div>
        `;
        return;
    }

    listingsContainer.innerHTML = listings.map(item => {
        // Badges
        const badges = [];
        if (item.transactionTypes) {
            if (item.transactionTypes.includes('rent')) badges.push('<span style="background: #e0f2fe; color: #0284c7; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; margin-right:4px;">RENT</span>');
            if (item.transactionTypes.includes('sell')) badges.push('<span style="background: #dcfce7; color: #16a34a; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; margin-right:4px;">BUY</span>');
            if (item.transactionTypes.includes('donate')) badges.push('<span style="background: #ffe4e6; color: #e11d48; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; margin-right:4px;">FREE</span>');
        } else {
            // Default to Rent
            badges.push('<span style="background: #e0f2fe; color: #0284c7; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600;">RENT</span>');
        }

        // Price Display Logic
        let priceDisplay = '';
        if (item.transactionTypes && item.transactionTypes.includes('donate')) {
            priceDisplay = '<span style="color: #e11d48;">Free (Donation)</span>';
        } else if (item.transactionTypes && item.transactionTypes.includes('sell') && !item.transactionTypes.includes('rent')) {
            priceDisplay = `₹${item.salePrice || 'N/A'} <span style="font-weight: 400; font-size: 0.8rem; color: var(--gray);">to buy</span>`;
        } else {
            // Rent is primary or mixed
            priceDisplay = item.rates?.daily ? `₹${item.rates.daily}<span style="font-weight: 400; font-size: 0.8rem; color: var(--gray);">/day</span>` :
                item.rates?.weekly ? `₹${item.rates.weekly}<span style="font-weight: 400; font-size: 0.8rem; color: var(--gray);">/week</span>` :
                    `₹${item.price || 'N/A'}`;
        }

        return `
        <a href="/product.html?id=${item.id}" class="listing-card" style="text-decoration: none; color: inherit; display: block;">
            <div class="card-image" style="height: 200px; width: 100%; overflow: hidden; position: relative; background: #f1f5f9;">
                <img src="${item.image || 'https://placehold.co/400x300?text=No+Image'}" alt="${item.title}" loading="eager" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='https://placehold.co/400x300?text=No+Image';" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s;">
                <div style="position: absolute; top: 10px; left: 10px; display:flex; flex-wrap:wrap; gap:4px;">
                    ${badges.join('')}
                </div>
                ${item.rating ? `<span style="background: white; position: absolute; top: 10px; right: 10px; padding: 2px 8px; border-radius: 10px; font-size: 0.8rem; font-weight: 600;">⭐ ${item.rating}</span>` : ''}
            </div>
            <div class="card-content" style="padding: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                    <h3 style="font-size: 1.1rem; line-height: 1.3; margin-bottom: 0.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%;">${item.title}</h3>
                </div>
                <p style="color: var(--gray); font-size: 0.9rem; margin-bottom: 0.5rem;"><i class="fa-solid fa-location-dot"></i> ${item.location}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                    <span style="font-weight: 700; font-size: 1.1rem;">
                        ${priceDisplay}
                    </span>
                    <span class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">View</span>
                </div>
            </div>
        </a>
    `}).join('');
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    // 2. Attaches listeners to the elements created in step 1
    initMobileMenu();
    initAuth();
    initTheme();
    initFooter();
    // Load real data
    fetchListings();

    // Calculate and display environmental impact
    calculateEnvironmentalImpact();

    // Register Service Worker with update logic
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', async () => {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                // Service Worker registered successfully

                // Check for updates on every load
                registration.update();

                registration.onupdatefound = () => {
                    const installingWorker = registration.installing;
                    if (installingWorker == null) return;

                    installingWorker.onstatechange = () => {
                        if (installingWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                                // New update available
                                // Optionally show a toast to the user
                                if (window.confirm('A new version of RentAnything is available. Refresh to update?')) {
                                    window.location.reload();
                                }
                            } else {
                                // Content is cached for offline use
                            }
                        }
                    };
                };
            } catch (error) {
                console.error('SW registration failed:', error);
            }
        });
    }
});

// Calculate Environmental Impact from Stats Document (Optimized!)
async function calculateEnvironmentalImpact() {
    try {
        // OPTIMIZED: Read from stats document instead of fetching all bookings
        // Before: N reads (one per booking)
        // After: 1 read (stats document)
        const statsRef = doc(db, 'stats', 'platform_stats');
        const statsSnap = await getDoc(statsRef);

        let totalCO2 = 0;
        let treesEquivalent = 0;

        if (statsSnap.exists()) {
            const stats = statsSnap.data();
            const envStats = stats.environmental || {};

            totalCO2 = envStats.totalCO2Saved || 0;
            // Calculate trees equivalent (1 tree absorbs ~21kg CO2 per year)
            treesEquivalent = Math.floor(totalCO2 / 21);
        }

        // Only show section if we have meaningful impact (>=10 trees)
        const impactSection = document.getElementById('environmental-impact-section');

        if (treesEquivalent >= 10) {
            // Show the section with fade-in animation
            impactSection.style.display = 'block';
            impactSection.style.animation = 'fadeInUp 0.8s ease-out';

            // Animate the numbers
            animateCounter('platform-co2', totalCO2.toFixed(1));
            animateCounter('platform-trees', treesEquivalent);
        } else {
            // Keep section hidden
            impactSection.style.display = 'none';
        }
    } catch (error) {
        console.error("Error calculating environmental impact:", error);
        // Keep section hidden on error
        const impactSection = document.getElementById('environmental-impact-section');
        if (impactSection) {
            impactSection.style.display = 'none';
        }
    }
}

// Animate counter from 0 to target value
function animateCounter(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const duration = 2000; // 2 seconds
    const startValue = 0;
    const startTime = performance.now();

    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = startValue + (targetValue - startValue) * easeOutQuart;

        element.textContent = Math.floor(currentValue);

        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = targetValue; // Ensure final value is exact
        }
    }

    requestAnimationFrame(updateCounter);
}
