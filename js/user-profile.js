
import { db, auth } from './firebase-config.js';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { initMobileMenu } from './navigation.js';
import { initTheme } from './theme.js';
import { initAuth } from './auth.js';
import { initHeader } from './header-manager.js';
import { showToast } from './toast-enhanced.js';
import { initFooter } from './footer-manager.js';

// Init
document.addEventListener('DOMContentLoaded', () => {

    initHeader();      // 1. Inject HTML links and setup UI auth
    initMobileMenu();  // 2. Make menu clickable
    initTheme();       // 3. Setup dark/light mode
    initAuth();        // 4. Setup login button events
    loadPublicProfile();
    initFooter();
});

async function loadPublicProfile() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('uid'); // Get UID from URL
    const container = document.getElementById('profile-content');

    if (!userId) {
        container.innerHTML = `<div style="text-align:center;"><h2>User not found 😕</h2></div>`;
        return;
    }

    try {
        // 1. Fetch User Data
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            container.innerHTML = `<div style="text-align:center;"><h2>User does not exist 🚫</h2></div>`;
            return;
        }

        const user = userSnap.data();

        // 2. Fetch Listings (Active Only)
        const qListings = query(
            collection(db, "listings"),
            where("ownerId", "==", userId),
            where("status", "==", "approved"), // Assuming 'approved' is the live status
            // orderBy("createdAt", "desc") // Requires composite index usually, let's keep it simple first
        );
        const listingsSnap = await getDocs(qListings);
        const listings = [];
        listingsSnap.forEach(doc => listings.push({ id: doc.id, ...doc.data() }));

        // 3. Fetch Reviews
        const qReviews = query(
            collection(db, "reviews"),
            where("ownerId", "==", userId)
        );
        const reviewsSnap = await getDocs(qReviews);
        const reviews = [];
        let totalRating = 0;
        reviewsSnap.forEach(doc => {
            const r = doc.data();
            reviews.push(r);
            totalRating += r.rating;
        });

        const avgRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : "New";

        // --- RENDER HTML ---
        container.innerHTML = `
            <div class="profile-header-card">
                <div class="profile-header-bg"></div>
                <img src="${user.photoURL || 'https://placehold.co/150'}" alt="${user.displayName}" class="profile-avatar-large">
                
                <h1 class="profile-name">
                    ${user.displayName || 'RentAnything Member'}
                    ${user.idVerificationStatus === 'verified'
                ? '<i class="fa-solid fa-circle-check" style="color:#16a34a; font-size:1.2rem; margin-left:5px;" title="Verified Identity"></i>'
                : ''}
                </h1>
                
                <div class="profile-meta">
                    <span><i class="fa-solid fa-location-dot"></i> ${user.society || 'Hinjewadi, Pune'}</span>
                    <span><i class="fa-regular fa-calendar"></i> Joined ${user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'Recently'}</span>
                </div>

                <p style="margin-top: 1rem; max-width: 600px; margin-left: auto; margin-right: auto; line-height: 1.6;">
                    ${user.bio || "No bio available."}
                </p>

                <div class="stat-grid">
                    <div class="stat-item">
                        <div class="stat-value">${avgRating} <i class="fa-solid fa-star" style="color:#fbbf24; font-size:1rem;"></i></div>
                        <div class="stat-label">${reviews.length} Reviews</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${listings.length}</div>
                        <div class="stat-label">Active Listings</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${user.responseTime || '< 1hr'}</div>
                        <div class="stat-label">Response Time</div>
                    </div>
                </div>

                <div style="margin-top: 2rem;">
                     ${userId !== auth.currentUser?.uid ?
                `<a href="chat.html?ownerId=${userId}&listingId=profile_contact" class="btn btn-primary"><i class="fa-solid fa-comment"></i> Send Message</a>`
                : '<span class="badge" style="background:#f1f5f9; color:#64748b; padding:0.5rem 1rem;">This is your public profile view</span>'}
                </div>
            </div>

            <!-- TAB SYSTEM (Simple) -->
            <div style="margin-bottom: 2rem;">
                <h3 class="section-title" style="font-size: 1.5rem; margin-bottom: 1rem;">Inventory</h3>
                ${listings.length === 0 ? '<p style="text-align:center; color:var(--gray);">No active listings.</p>' :
                `<div class="listings-grid-profile">
                        ${listings.map(item => renderProfileListingCard(item)).join('')}
                   </div>`
            }
            </div>

            <!-- REVIEWS SECTION -->
            <div style="margin-bottom: 4rem;">
                <h3 class="section-title" style="font-size: 1.5rem; margin-bottom: 1rem;">Reviews</h3>
                ${reviews.length === 0 ? '<p style="text-align:center; color:var(--gray);">No reviews yet.</p>' :
                reviews.map(r => `
                    <div style="background:white; padding:1rem; border-radius:0.75rem; border:1px solid #e2e8f0; margin-bottom:1rem; display:flex; gap:1rem;">
                        <img src="${r.reviewerImage || 'https://placehold.co/40'}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
                        <div>
                            <div style="font-weight:600; font-size:0.95rem;">${r.reviewerName}</div>
                            <div style="color:#fbbf24; font-size:0.8rem; margin-bottom:0.2rem;">
                                ${Array(r.rating).fill('<i class="fa-solid fa-star"></i>').join('')}
                            </div>
                            <p style="font-size:0.9rem; color:#475569;">${r.comment}</p>
                        </div>
                    </div>
                  `).join('')
            }
            </div>
        `;

    } catch (error) {
        console.error("Error loading public profile:", error);
        container.innerHTML = `<div style="text-align:center;"><h2>Error loading profile ⚠️</h2><p>${error.message}</p></div>`;
    }
}

function renderProfileListingCard(item) {
    // Badges Logic
    let badgesHtml = '';
    const types = item.transactionTypes || ['rent'];
    if (types.includes('rent')) badgesHtml += `<span style="background:#e0f2fe; color:#0284c7; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:700; margin-right:4px;">RENT</span>`;
    if (types.includes('sell')) badgesHtml += `<span style="background:#dcfce7; color:#16a34a; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:700; margin-right:4px;">BUY</span>`;
    if (types.includes('donate')) badgesHtml += `<span style="background:#ffe4e6; color:#e11d48; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:700;">FREE</span>`;

    // Price Logic
    let priceDisplay = '';
    if (types.includes('rent') && item.rates?.daily) {
        priceDisplay = `₹${item.rates.daily}/day`;
    } else if (types.includes('sell')) {
        priceDisplay = `₹${item.salePrice}`;
    } else if (types.includes('donate')) {
        priceDisplay = `Free`;
    }

    return `
        <div class="listing-card" onclick="window.location.href='/product.html?id=${item.id}'" style="cursor:pointer; border:1px solid #e2e8f0; border-radius:0.75rem; overflow:hidden; background:white;">
            <div style="height:150px; overflow:hidden; position:relative;">
                <img src="${item.image || 'https://placehold.co/300'}" style="width:100%; height:100%; object-fit:cover;">
                <div style="position:absolute; top:8px; left:8px;">${badgesHtml}</div>
            </div>
            <div style="padding:1rem;">
                <h3 style="font-size:1rem; font-weight:600; margin-bottom:0.3rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.title}</h3>
                <div style="color:var(--primary); font-weight:700;">${priceDisplay}</div>
                <div style="font-size:0.8rem; color:var(--gray); margin-top:0.5rem;"><i class="fa-solid fa-location-dot"></i> ${item.location || 'Pune'}</div>
            </div>
        </div>
    `;
}
