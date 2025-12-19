import { db, auth } from './firebase-config.js';
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { initMobileMenu } from './navigation.js';
import { initTheme } from './theme.js';
import { initAuth } from './auth.js';
import { initHeader } from './header-manager.js';
import { initFooter } from './footer-manager.js';
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
    initFooter();

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

// Load user's wishlist from Firestore (combines wishlists AND favorites)
async function loadWishlist() {
    const user = auth.currentUser;
    if (!user) {
        showEmptyState('Login to view your wishlist');
        return;
    }

    const container = document.getElementById('wishlist-grid');
    container.innerHTML = '<div class="card-skeleton"></div><div class="card-skeleton"></div><div class="card-skeleton"></div>';

    try {
        wishlistData = [];

        // 1. Fetch from wishlists collection (with notes/priority from product page)
        const wishlistsQuery = query(
            collection(db, 'wishlists'),
            where('userId', '==', user.uid)
        );
        const wishlistsSnap = await getDocs(wishlistsQuery);
        wishlistsSnap.forEach(docSnap => {
            wishlistData.push({
                id: docSnap.id,
                source: 'wishlist',
                ...docSnap.data()
            });
        });

        // 2. Fetch from favorites collection (quick saves from search/browse)
        const favoritesQuery = query(
            collection(db, 'favorites'),
            where('userId', '==', user.uid)
        );
        const favoritesSnap = await getDocs(favoritesQuery);

        // For favorites, we need to fetch listing details
        const favoriteListingIds = [];
        const favoriteDocsMap = new Map();

        favoritesSnap.forEach(docSnap => {
            const data = docSnap.data();
            // Avoid duplicates (if same listing is in both collections)
            const existsInWishlists = wishlistData.some(w => w.listingId === data.listingId);
            if (!existsInWishlists) {
                favoriteListingIds.push(data.listingId);
                favoriteDocsMap.set(data.listingId, {
                    id: docSnap.id,
                    source: 'favorite',
                    ...data
                });
            }
        });

        // Fetch listing details for favorites - BATCHED to avoid N+1 queries
        // Firestore 'in' query supports max 10 items, so we batch them
        if (favoriteListingIds.length > 0) {
            const { query: createQuery, where, getDocs: fetchDocs } = await import('firebase/firestore');

            // Process in batches of 10 (Firestore limit for 'in' queries)
            for (let i = 0; i < favoriteListingIds.length; i += 10) {
                const batch = favoriteListingIds.slice(i, i + 10);

                try {
                    // Use documentId() for querying by document ID
                    const { documentId } = await import('firebase/firestore');
                    const batchQuery = createQuery(
                        collection(db, 'listings'),
                        where(documentId(), 'in', batch)
                    );
                    const batchSnap = await fetchDocs(batchQuery);

                    batchSnap.forEach(docSnap => {
                        const listingData = docSnap.data();
                        const favData = favoriteDocsMap.get(docSnap.id);
                        if (favData) {
                            wishlistData.push({
                                ...favData,
                                listingTitle: listingData.title,
                                listingImage: listingData.image,
                                priority: 'quick-save',
                                notes: 'Saved from browse'
                            });
                        }
                    });
                } catch (e) {
                    console.warn('Batch fetch error:', e);
                }
            }
        }

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
    const isQuickSave = item.priority === 'quick-save' || item.source === 'favorite';
    const priorityClass = isQuickSave ? 'priority-saved' : `priority-${item.priority || 'low'}`;
    const priorityText = isQuickSave ? 'SAVED' : (item.priority || 'low').toUpperCase();
    const notes = isQuickSave ? '' : (item.notes ? `"${item.notes}"` : '');
    const source = item.source || 'wishlist';

    return `
        <div class="wishlist-card">
            <img src="${item.listingImage || 'https://placehold.co/400x300'}" alt="${item.listingTitle}" class="wishlist-image">
            <div class="priority-badge ${priorityClass}">${priorityText}</div>
            
            <div class="wishlist-content">
                <h3 class="wishlist-title">${item.listingTitle}</h3>
                ${notes ? `<p class="wishlist-notes">${notes}</p>` : ''}
                
                <div class="wishlist-actions">
                    <button class="btn-small btn-book" onclick="window.viewItem('${item.listingId}')">
                        <i class="fa-solid fa-eye"></i> View
                    </button>
                    <button class="btn-small btn-remove" onclick="window.removeFromWishlist('${item.listingId}', '${source}')">
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

// Remove from wishlist (handles both collections)
window.removeFromWishlist = async (listingId, source = 'wishlist') => {
    const user = auth.currentUser;
    if (!user) return;

    if (!confirm('Remove this item from your saved items?')) return;

    try {
        const docId = `${user.uid}_${listingId}`;
        const collectionName = source === 'favorite' ? 'favorites' : 'wishlists';
        await deleteDoc(doc(db, collectionName, docId));

        showToast('Removed from saved items', 'info');
        loadWishlist(); // Reload
    } catch (error) {
        console.error('Error removing item:', error);
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
