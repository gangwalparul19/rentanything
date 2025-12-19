import { db, auth } from './firebase-config.js';
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { initMobileMenu } from './navigation.js';
import { initTheme } from './theme.js';
import { initAuth } from './auth.js';
import { initHeader } from './header-manager.js';
import { showToast } from './toast-enhanced.js';
import { showEmptyState } from './empty-states.js';

let currentFilter = 'all';
let wishlistData = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initHeader();      // 1. Inject HTML links and setup UI auth
    initMobileMenu();  // 2. Make menu clickable
    initTheme();       // 3. Setup dark/light mode
    initAuth();        // 4. Setup login button events

    // Set up filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            renderWishlist();
        });
    });

    // Load wishlist when auth state changes
    auth.onAuthStateChanged(user => {
        if (user) {
            loadWishlist();
        } else {
            showEmptyState('Login to view your wishlist');
        }
    });
});

// Load user's wishlist from Firestore
async function loadWishlist() {
    const user = auth.currentUser;
    if (!user) {
        showEmptyState('Login to view your wishlist');
        return;
    }

    const container = document.getElementById('wishlist-grid');
    container.innerHTML = '<div class="card-skeleton"></div><div class="card-skeleton"></div><div class="card-skeleton"></div>';

    try {
        const q = query(
            collection(db, 'wishlists'),
            where('userId', '==', user.uid)
        );

        const snapshot = await getDocs(q);
        wishlistData = [];

        snapshot.forEach(doc => {
            wishlistData.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Sort by createdAt (newest first)
        wishlistData.sort((a, b) => {
            const aTime = a.createdAt?.toMillis() || 0;
            const bTime = b.createdAt?.toMillis() || 0;
            return bTime - aTime;
        });

        renderWishlist();

    } catch (error) {
        console.error('Error loading wishlist:', error);
        container.innerHTML = `<div class="empty-state">
            <div class="empty-icon">⚠️</div>
            <h2>Error loading wishlist</h2>
            <p style="color: var(--gray);">${error.message}</p>
        </div>`;
    }
}

// Render wishlist based on current filter
function renderWishlist() {
    const container = document.getElementById('wishlist-grid');

    // Filter data
    let filtered = wishlistData;
    if (currentFilter !== 'all') {
        filtered = wishlistData.filter(item => item.priority === currentFilter);
    }

    if (filtered.length === 0) {
        showEmptyState('#wishlist-grid', 'wishlist');
        return;
    }

    container.innerHTML = filtered.map(item => createWishlistCard(item)).join('');
}

// Create wishlist card HTML
function createWishlistCard(item) {
    const priorityClass = `priority-${item.priority || 'low'}`;
    const priorityText = (item.priority || 'low').toUpperCase();
    const notes = item.notes || 'No notes added';

    return `
        <div class="wishlist-card">
            <img src="${item.listingImage || 'https://placehold.co/400x300'}" alt="${item.listingTitle}" class="wishlist-image">
            <div class="priority-badge ${priorityClass}">${priorityText}</div>
            
            <div class="wishlist-content">
                <h3 class="wishlist-title">${item.listingTitle}</h3>
                <p class="wishlist-notes">"${notes}"</p>
                
                <div class="wishlist-actions">
                    <button class="btn-small btn-book" onclick="window.viewItem('${item.listingId}')">
                        <i class="fa-solid fa-eye"></i> View
                    </button>
                    <button class="btn-small btn-remove" onclick="window.removeFromWishlist('${item.listingId}')">
                        <i class="fa-solid fa-trash"></i> Remove
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Add to wishlist (called from product pages)
export async function addToWishlist(listingId, listingTitle, listingImage, notes = '', priority = 'medium') {
    const user = auth.currentUser;
    if (!user) {
        showToast('Please login to add items to wishlist', 'error');
        return false;
    }

    try {
        const wishlistId = `${user.uid}_${listingId}`;
        await setDoc(doc(db, 'wishlists', wishlistId), {
            userId: user.uid,
            listingId: listingId,
            listingTitle: listingTitle,
            listingImage: listingImage,
            notes: notes,
            priority: priority,
            createdAt: serverTimestamp()
        });

        showToast('Added to wishlist! 💖', 'success');
        return true;
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        showToast('Failed to add to wishlist', 'error');
        return false;
    }
}

// Remove from wishlist
window.removeFromWishlist = async (listingId) => {
    const user = auth.currentUser;
    if (!user) return;

    if (!confirm('Remove this item from your wishlist?')) return;

    try {
        const wishlistId = `${user.uid}_${listingId}`;
        await deleteDoc(doc(db, 'wishlists', wishlistId));

        showToast('Removed from wishlist', 'info');
        loadWishlist(); // Reload
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        showToast('Failed to remove item', 'error');
    }
};

// Update wishlist notes/priority
export async function updateWishlistItem(listingId, updates) {
    const user = auth.currentUser;
    if (!user) return false;

    try {
        const wishlistId = `${user.uid}_${listingId}`;
        await updateDoc(doc(db, 'wishlists', wishlistId), updates);

        showToast('Wishlist updated!', 'success');
        return true;
    } catch (error) {
        console.error('Error updating wishlist:', error);
        showToast('Failed to update', 'error');
        return false;
    }
}

// Check if item is in wishlist
export async function isInWishlist(listingId) {
    const user = auth.currentUser;
    if (!user) return false;

    try {
        const wishlistId = `${user.uid}_${listingId}`;
        const docSnap = await getDoc(doc(db, 'wishlists', wishlistId));
        return docSnap.exists();
    } catch (error) {
        console.error('Error checking wishlist:', error);
        return false;
    }
}

// View item (navigate to product page)
window.viewItem = (listingId) => {
    window.location.href = `/product.html?id=${listingId}`;
};

// Expose functions for external use
window.addToWishlist = addToWishlist;
