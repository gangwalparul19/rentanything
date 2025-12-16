
import { auth, db, storage } from './firebase-config.js';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore'; // Added updateDoc
import { initMobileMenu } from './navigation.js';
import { initTheme } from './theme.js';
import { initAuth } from './auth.js';
import { initHeader } from './header-manager.js';
// Duplicate import removed
import { showToast } from './toast.js';

document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initTheme();
    initAuth();
});

const container = document.getElementById('my-listings-container');
const requestsContainer = document.getElementById('booking-requests-container');
const earningsEl = document.getElementById('total-earnings');
const bookingsEl = document.getElementById('total-bookings');
const topItemEl = document.getElementById('top-item');

// Auth Listener
onAuthStateChanged(auth, async (user) => {
    if (user) {
        loadDashboardData(user.uid);
    } else {
        setTimeout(() => {
            if (!auth.currentUser) {
                window.location.href = '/';
            }
        }, 1000);
    }
});

async function loadDashboardData(userId) {
    try {
        // 1. Fetch Listings
        const listingsQ = query(collection(db, "listings"), where("ownerId", "==", userId));
        const listingsSnap = await getDocs(listingsQ);
        const listings = [];
        const listingsMap = {};

        listingsSnap.forEach((doc) => {
            const data = doc.data();
            const id = doc.id;
            const item = { id, ...data, bookingCount: 0, earnings: 0 };
            listings.push(item);
            listingsMap[id] = item; // Store ref for updating stats
        });

        // 2. Fetch Bookings
        const bookingsQ = query(collection(db, "bookings"), where("ownerId", "==", userId));
        const bookingsSnap = await getDocs(bookingsQ);

        let totalEarnings = 0;
        let totalBookings = 0;
        const requestsContainer = document.getElementById('booking-requests-container'); // Reuse for all orders

        // ... (in loadDashboardData) ...
        const pendingRequests = [];
        const activeOrders = []; // New list for confirmed/active

        bookingsSnap.forEach((doc) => {
            const booking = { id: doc.id, ...doc.data() };

            if (booking.status === 'pending') {
                pendingRequests.push(booking);
            } else if (['confirmed', 'active', 'completed'].includes(booking.status)) {
                activeOrders.push(booking);
            }

            // ... (stats logic same) ...
        });

        // 4. Render Orders (Merged function)
        renderOrders(pendingRequests, activeOrders);

        // ... (renderOrders implementation) ...
        function renderOrders(pending, active) {
            if (!requestsContainer) return;

            let html = '';

            // 1. Pending Section
            if (pending.length > 0) {
                html += `<h3 style="font-size:1rem; color:var(--primary); margin-bottom:0.5rem;">⚠️ Action Required</h3>`;
                html += pending.map(req => `
            <div class="request-card" style="background: #fff; border: 1px solid #fed7aa; padding: 1rem; border-radius: 0.75rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 0.95rem;">${req.listingTitle}</div>
                    <div style="font-size: 0.85rem; color: var(--gray);">
                        <i class="fa-regular fa-user"></i> ${req.renterName} • 
                        <i class="fa-solid fa-clock"></i> ${new Date(req.createdAt?.seconds * 1000).toLocaleDateString()}
                    </div>
                    <div style="font-size: 0.85rem; font-weight: 500;">₹${req.amount}</div>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button onclick="updateBookingStatus('${req.id}', 'confirmed')" class="btn" style="background: #10b981; color: white; padding: 0.4rem 0.6rem; border-radius: 0.5rem;" title="Approve">
                        <i class="fa-solid fa-check"></i>
                    </button>
                    <button onclick="updateBookingStatus('${req.id}', 'declined')" class="btn" style="background: #ef4444; color: white; padding: 0.4rem 0.6rem; border-radius: 0.5rem;" title="Decline">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>
        `).join('');
            }

            // 2. Active/Upcoming Section
            if (active.length > 0) {
                html += `<h3 style="font-size:1rem; color:#334155; margin-bottom:0.5rem; margin-top:1.5rem;">📅 Upcoming & Active</h3>`;
                html += active.map(order => {
                    const isHighValue = (order.deposit || 0) >= 10000;
                    const agreementLabel = isHighValue ? 'Agreement (Required)' : 'Agreement (Optional)';
                    const agreementStyle = isHighValue ? 'color:#c2410c; border-color:#fdba74; background:#fff7ed;' : 'btn-outline';

                    return `
            <div class="request-card" style="background: #fff; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 0.75rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 0.95rem;">${order.listingTitle}</div>
                    <div style="font-size: 0.85rem; color: var(--gray);">
                        <i class="fa-regular fa-user"></i> ${order.renterName} <br>
                        ${new Date(order.startDate.seconds * 1000).toLocaleDateString()} - ${new Date(order.endDate.seconds * 1000).toLocaleDateString()}
                    </div>
                </div>
                <div>
                     <a href="agreement.html?id=${order.id}" class="btn ${!isHighValue ? 'btn-outline' : ''}" style="font-size:0.8rem; padding:0.4rem 0.8rem; ${isHighValue ? agreementStyle : ''}">
                        <i class="fa-solid fa-file-contract"></i> ${agreementLabel}
                        ${order.ownerSigned ? '<i class="fa-solid fa-check-circle" style="color:green; margin-left:4px;"></i>' : (isHighValue ? '<i class="fa-solid fa-circle-exclamation" style="color:#ea580c; margin-left:4px;"></i>' : '')}
                     </a>
                </div>
            </div>
        `;
                }).join('');
            }

            if (pending.length === 0 && active.length === 0) {
                html = `<p style="color: var(--gray); font-style: italic;">No active orders or requests.</p>`;
            }

            requestsContainer.innerHTML = html;
        }

        // 5. Render Listings
        renderListings(listings);

    } catch (error) {
        console.error("Error loading dashboard:", error);
    }
}

// function renderRequests removed 

function renderListings(listings) {
    if (listings.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 4rem; opacity: 0.7;">
                <i class="fa-regular fa-folder-open" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <h3>No listings yet</h3>
                <p>Go ahead and <a href="create-listing.html" style="color: var(--primary);">List your first item</a>!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = listings.map(item => `
        <div class="listing-card" style="position: relative;">
            <div class="card-image" style="height: 200px; width: 100%; overflow: hidden;">
                <img src="${item.image || 'https://via.placeholder.com/400x300'}" referrerpolicy="no-referrer" alt="${item.title}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <div class="card-content" style="padding: 1rem;">
                <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.title}</h3>
                
                <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; border-top: 1px solid #f1f5f9; padding-top: 0.5rem;">
                     <div style="flex: 1; text-align: center;">
                        <div style="font-size: 0.7rem; color: var(--gray);">Earned</div>
                        <div style="font-weight: 600; color: #10b981;">₹${item.earnings}</div>
                     </div>
                     <div style="width: 1px; background: #f1f5f9;"></div>
                     <div style="flex: 1; text-align: center;">
                        <div style="font-size: 0.7rem; color: var(--gray);">Bookings</div>
                        <div style="font-weight: 600;">${item.bookingCount}</div>
                     </div>
                </div>

                <div style="display: flex; gap: 0.5rem;">
                    <a href="create-listing.html?id=${item.id}" class="btn btn-outline" style="flex: 1; text-align: center; padding: 0.5rem;" title="Edit">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </a>
                    <a href="product.html?id=${item.id}" class="btn btn-outline" style="flex: 1; text-align: center; padding: 0.5rem;" title="View">
                         <i class="fa-solid fa-eye"></i>
                    </a>
                    <button onclick="deleteListing('${item.id}')" class="btn btn-outline" style="border-color: #ef4444; color: #ef4444; padding: 0.5rem 0.8rem;" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Window actions
window.deleteListing = async (docId) => { // ... same as before
    if (confirm("Are you sure you want to delete this listing?")) {
        try {
            await deleteDoc(doc(db, "listings", docId));
            showToast("Listing deleted.", "success");
            const user = auth.currentUser;
            if (user) loadDashboardData(user.uid);
        } catch (error) {
            console.error("Error deleting:", error);
            showToast("Failed to delete: " + error.message, "error");
        }
    }
};

window.updateBookingStatus = async (bookingId, status) => {
    try {
        await updateDoc(doc(db, "bookings", bookingId), {
            status: status
        });
        showToast(`Request ${status === 'confirmed' ? 'Approved' : 'Declined'}`, status === 'confirmed' ? 'success' : 'info');

        // Refresh
        const user = auth.currentUser;
        if (user) loadDashboardData(user.uid);
    } catch (error) {
        console.error("Error updating booking:", error);
        showToast("Error updating status", "error");
    }
}
