

// Firebase Imports
import { db } from './firebase-config.js';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { initMobileMenu } from './navigation.js';
import { initTheme } from './theme.js';
import { initAuth } from './auth.js';
import { initHeader } from './header-manager.js';
import { showLoader, hideLoader } from './loader.js';
import { HOME_PAGE_LISTING_LIMIT } from './constants.js';
import { ERROR_MESSAGES } from './error-messages.js';

// console.log('RentAnything App Initialized');

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
        console.log("Fetched listings count:", querySnapshot.size);

        const listings = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log("Listing:", doc.id, "status:", data.status, "image:", data.image);
            // FILTER: Only show approved/active listings (or legacy items without status field)
            if (data.status === 'active' || data.status === 'approved' || !data.status) {
                listings.push({ id: doc.id, ...data });
            }
        });

        console.log("Filtered listings to display:", listings.length);
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
            if (item.transactionTypes.includes('donate')) badges.push('<span style="background: #ffe4e6; color: #e11d48; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600;" margin-right:4px;>FREE</span>');
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
    initMobileMenu();
    initTheme();
    initAuth();
    initHeader();

    // Load real data
    fetchListings();

    // Calculate and display environmental impact
    calculateEnvironmentalImpact();

    // Register Service Worker with update logic
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', async () => {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('SW registered: ', registration);

                // Check for updates on every load
                registration.update();

                registration.onupdatefound = () => {
                    const installingWorker = registration.installing;
                    if (installingWorker == null) return;

                    installingWorker.onstatechange = () => {
                        if (installingWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                                // New update available
                                console.log('New content is available; please refresh.');
                                // Optionally show a toast to the user
                                if (window.confirm('A new version of RentAnything is available. Refresh to update?')) {
                                    window.location.reload();
                                }
                            } else {
                                // Content is cached for offline use
                                console.log('Content is cached for offline use.');
                            }
                        }
                    };
                };
            } catch (error) {
                console.log('SW registration failed: ', error);
            }
        });
    }
});

// Calculate Environmental Impact from Bookings
async function calculateEnvironmentalImpact() {
    try {
        const bookingsSnapshot = await getDocs(collection(db, "bookings"));
        let totalCO2 = 0;

        bookingsSnapshot.forEach((doc) => {
            const booking = doc.data();
            // Only count completed bookings
            if (booking.status === 'completed' && booking.co2Saved) {
                totalCO2 += parseFloat(booking.co2Saved) || 0;
            }
        });

        // Calculate trees equivalent (1 tree absorbs ~21kg CO2 per year)
        const treesEquivalent = Math.floor(totalCO2 / 21);

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
        document.getElementById('environmental-impact-section').style.display = 'none';
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


// PWA Install Prompt Logic
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;

    // Show your customized install prompt for your PWA
    showInstallPromotion();
});

function showInstallPromotion() {
    // Create floating Install Button if not exists
    if (!document.getElementById('pwa-install-btn')) {
        const btn = document.createElement('button');
        btn.id = 'pwa-install-btn';
        btn.className = 'btn btn-primary';
        btn.innerHTML = '<i class="fa-solid fa-download"></i> Install App';
        btn.style.position = 'fixed';
        btn.style.bottom = '20px';
        btn.style.left = '50%';
        btn.style.transform = 'translateX(-50%)';
        btn.style.zIndex = '1000';
        btn.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.4)';
        btn.style.borderRadius = '50px';
        btn.style.padding = '12px 24px';
        btn.style.animation = 'fadeInUp 0.5s ease-out';

        // Keyframes for animation need to be in CSS globally or injected
        // Ensuring it looks good without extra CSS file edit:
        // btn.style.display = 'block'; 

        btn.addEventListener('click', async () => {
            // Hide the app provided install promotion
            hideInstallPromotion();
            // Show the install prompt
            deferredPrompt.prompt();
            // Wait for the user to respond to the prompt
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            // We've used the prompt, and can't use it again, throw it away
            deferredPrompt = null;
        });

        document.body.appendChild(btn);
    }
}

function hideInstallPromotion() {
    const btn = document.getElementById('pwa-install-btn');
    if (btn) btn.style.display = 'none';
}

