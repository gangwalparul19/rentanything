
import { db, auth } from './firebase-config.js';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp, getDoc, orderBy } from 'firebase/firestore';
import { initMobileMenu } from './navigation.js';
import { initTheme } from './theme.js';
import { initAuth } from './auth.js';
import { initHeader } from './header-manager.js';
import { showToast } from './toast.js';
import { notifyWaitlistedUsers } from './waitlist.js';

// Elements
const container = document.getElementById('bookings-container');
const reviewModal = document.getElementById('review-modal');
const ratingStars = document.querySelectorAll('.star-rating i');
const ratingInput = document.getElementById('rating-value');
const commentInput = document.getElementById('review-comment');

// Init
document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initTheme();
    initAuth();
    initHeader();
});

// Auth
onAuthStateChanged(auth, async (user) => {
    if (user) {
        fetchBookings(user.uid);
    } else {
        window.location.href = '/?login=true';
    }
});


// Fetch Bookings
async function fetchBookings(userId) {
    try {
        const q = query(collection(db, "bookings"), where("renterId", "==", userId));
        const snap = await getDocs(q);

        if (snap.empty) {
            container.innerHTML = `
                <div style="text-align: center; padding: 4rem; color: var(--gray);">
                    <i class="fa-regular fa-calendar-xmark" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <h3>No bookings yet</h3>
                    <p>Browse categories to find something to rent!</p>
                </div>
            `;
            return;
        }

        const bookings = [];
        snap.forEach(doc => bookings.push({ id: doc.id, ...doc.data() }));

        // Sort by date desc (client side for now)
        bookings.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        container.innerHTML = bookings.map(b => renderBookingCard(b)).join('');

    } catch (error) {
        console.error("Error fetching bookings:", error);
        container.innerHTML = `<p style="text-align:center; color:red;">Failed to load bookings.</p>`;
    }
}

// Helper to format date (handles String or Firestore Timestamp)
function formatDate(dateVal) {
    if (!dateVal) return 'N/A';
    // If it's a Firestore Timestamp(seconds, nanoseconds)
    if (dateVal.seconds) {
        return new Date(dateVal.seconds * 1000).toLocaleDateString();
    }
    // If it's already a string or JS Date
    return new Date(dateVal).toLocaleDateString();
}

function renderBookingCard(booking) {
    const isCompleted = booking.status === 'completed';
    const statusColors = {
        'pending': 'status-pending',
        'confirmed': 'status-confirmed',
        'completed': 'status-completed',
        'cancelled': 'status-cancelled',
        'declined': 'status-cancelled'
    };

    const start = formatDate(booking.startDate);
    const end = formatDate(booking.endDate);

    return `
    <div class="booking-card">
        <img src="${booking.listingImage || 'https://via.placeholder.com/150'}" referrerpolicy="no-referrer" class="booking-img" alt="Item">
            <div class="booking-info">
                <span class="status-badge ${statusColors[booking.status] || ''}">${booking.status}</span>
                <h3 class="booking-title">${booking.listingTitle}</h3>
                <div class="booking-details">
                    <div><i class="fa-solid fa-user"></i> Owner: ${booking.ownerName || 'Unknown'}</div>
                    <div><i class="fa-solid fa-calendar"></i> ${start} to ${end}</div>
                    <div><i class="fa-solid fa-indian-rupee-sign"></i> Total: ₹${booking.amount}</div>
                </div>
            </div>
            <div class="booking-actions">
                ${isCompleted ? `
                    <button class="btn btn-outline" onclick="window.openReviewModal('${booking.id}', '${booking.listingId}', '${booking.ownerId}', '${booking.listingTitle}')">
                        <i class="fa-regular fa-star"></i> Write Review
                    </button>
                ` : ''}
                ${booking.status === 'pending' ? `
                    <button class="btn btn-outline" style="color: #ef4444; border-color: #ef4444;" disabled title="Cancel logic not implemented yet">Cancel</button>
                ` : ''}

                ${['confirmed', 'active', 'completed'].includes(booking.status) ? `
                     <button class="btn btn-outline" onclick="window.location.href='/agreement.html?id=${booking.id}'" style="border-color: var(--primary); color: var(--primary);">
                        <i class="fa-solid fa-file-contract"></i> Agreement
                    </button>
                ` : ''}

                <a href="/product.html?id=${booking.listingId}" class="btn btn-primary" style="margin-left: 0.5rem;">View Item</a>
            </div>
            <div style="text-align: right; margin-top: 0.5rem;">
                <a href="report.html?bookingId=${booking.id}" style="font-size: 0.8rem; color: #94a3b8; text-decoration: underline;">Report Issue</a>
            </div>
        </div>
`;
}


// --- REVIEW LOGIC ---

// Star Rating Interaction
ratingStars.forEach(star => {
    star.addEventListener('click', () => {
        const rating = star.dataset.rating;
        ratingInput.value = rating;
        updateStars(rating);
    });
});

function updateStars(rating) {
    ratingStars.forEach(s => {
        if (s.dataset.rating <= rating) {
            s.style.color = '#fbbf24'; // Gold
            s.classList.remove('fa-regular');
            s.classList.add('fa-solid');
        } else {
            s.style.color = '#e2e8f0'; // Gray
            s.classList.remove('fa-solid');
            s.classList.add('fa-regular'); // Actually we used fa-solid for all but color change. 
            // If using regular for empty:
            // But FontAwesome solid star is defined. Let's just user color.
        }
    });
}

window.openReviewModal = (bookingId, listingId, ownerId, title) => {
    document.getElementById('review-booking-id').value = bookingId;
    document.getElementById('review-listing-id').value = listingId;
    document.getElementById('review-owner-id').value = ownerId;
    document.getElementById('review-item-title').textContent = "Reviewing: " + title;

    // Reset form
    ratingInput.value = 0;
    commentInput.value = '';
    updateStars(0);

    reviewModal.style.display = 'flex';
};

window.closeReviewModal = () => {
    reviewModal.style.display = 'none';
};

window.submitReview = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const rating = parseInt(ratingInput.value);
    const comment = commentInput.value.trim();
    const bookingId = document.getElementById('review-booking-id').value;
    const listingId = document.getElementById('review-listing-id').value;
    const ownerId = document.getElementById('review-owner-id').value;

    if (rating === 0) {
        showToast("Please select a star rating", "error");
        return;
    }
    if (!comment) {
        showToast("Please write a comment", "error");
        return;
    }

    try {
        // 1. Check for existing review (Optional but good)
        // For now, simpler: just add.

        await addDoc(collection(db, "reviews"), {
            reviewerId: user.uid,
            reviewerName: user.displayName,
            reviewerImage: user.photoURL,
            listingId: listingId,
            ownerId: ownerId, // user being reviewed (as owner)
            bookingId: bookingId,
            rating: rating,
            comment: comment,
            createdAt: serverTimestamp(),
            type: 'renter_to_owner'
        });

        // 2. Mark booking as reviewed (optional to hide button)
        // await updateDoc(doc(db, "bookings", bookingId), { hasReview: true });

        showToast("Review submitted!", "success");
        closeReviewModal();
        // optionally refresh to hide button

    } catch (error) {
        console.error("Error submitting review:", error);
        showToast("Failed to submit review", "error");
    }
};

window.confirmBooking = async (bookingId, action) => {
    if (!confirm(`Are you sure you want to ${action} this booking ?`)) return;

    try {
        const bookingRef = doc(db, 'bookings', bookingId);
        const bookingSnap = await getDoc(bookingRef);

        if (!bookingSnap.exists()) {
            showToast('Booking not found', 'error');
            return;
        }

        const bookingData = bookingSnap.data();
        const newStatus = action === 'accept' ? 'confirmed' : 'rejected';

        // Update booking status
        await updateDoc(bookingRef, {
            status: newStatus,
            updatedAt: serverTimestamp()
        });

        // Notify renter
        await addDoc(collection(db, 'notifications'), {
            userId: bookingData.renterId,
            title: action === 'accept' ? 'Booking Confirmed! 🎉' : 'Booking Declined',
            body: `Your booking for ${bookingData.listingTitle} has been ${newStatus}.`,
            type: 'booking_update',
            read: false,
            createdAt: serverTimestamp()
        });

        // If rejected or completed, notify waitlisted users
        if (newStatus === 'rejected') {
            await notifyWaitlistedUsers(bookingData.listingId, bookingData.listingTitle);
        }

        showToast(`Booking ${newStatus} !`, 'success');
        fetchBookings(auth.currentUser.uid); // Reload bookings for the current user
    } catch (error) {
        console.error('Error updating booking:', error);
        showToast('Failed to update booking', 'error');
    }
};

window.onclick = function (event) {
    if (event.target == reviewModal) {
        closeReviewModal();
    }
};
