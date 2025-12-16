
// Firebase Imports
import { db, auth } from './firebase-config.js';
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, getDocs, Timestamp, setDoc, deleteDoc } from 'firebase/firestore';
import { initMobileMenu } from './navigation.js';
import { initTheme } from './theme.js';
import { initAuth } from './auth.js';
import { initHeader } from './header-manager.js';
import { showToast } from './toast.js';
import { initShareMenu, shareToWhatsApp, shareToFacebook, shareToTwitter, shareToLinkedIn, shareViaEmail, copyShareLink, shareNative } from './social-share.js';
import { calculateCO2Savings } from './carbon-calculator.js';

// ... (Existing code)

// Helper: Toggle Favorite
async function toggleFavorite(productId, btn) {
    const user = auth.currentUser;
    if (!user) {
        showToast("Login to save items!", "info");
        return;
    }

    // Disable to prevent spam
    btn.disabled = true;
    const icon = btn.querySelector('i');

    try {
        const favRef = doc(db, "favorites", `${user.uid}_${productId}`);
        const docSnap = await getDoc(favRef);

        if (docSnap.exists()) {
            // Remove
            await deleteDoc(favRef);
            icon.classList.remove('fa-solid');
            icon.classList.add('fa-regular');
            icon.style.color = 'var(--primary)'; // Reset color logic if needed
            showToast("Removed from favorites", "info");
        } else {
            // Add
            await setDoc(favRef, {
                userId: user.uid,
                listingId: productId,
                createdAt: serverTimestamp()
            });
            icon.classList.remove('fa-regular');
            icon.classList.add('fa-solid');
            icon.style.color = '#ef4444'; // Red heart
            showToast("Saved to favorites!", "success");
        }
    } catch (e) {
        console.error("Fav Error:", e);
    } finally {
        btn.disabled = false;
    }
}

// ... (renderProduct modifications below)

// Replace the renderProduct function to include the Favorite Logic
// Wait, replacing the whole function is huge.
// I will insert the favorite check AFTER rendering the HTML.
// I can specifically target the end of the `try { ... render HTML ... }` block inside renderProduct or just append logic.

// Let's modify renderProduct to add the listener and initial check.

// Expose toast to window
window.showToast = showToast;

// Helper: Get URL Parameter
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Global variable for Flatpickr instance
let calendarInstance;

// Booking Logic
async function handleBooking() {
    const user = auth.currentUser;
    if (!user) {
        showToast("Please login to book this item.", "error");
        return;
    }

    const productId = getQueryParam('id');
    if (!productId) return;

    // Validate Date & Time
    const dateRange = calendarInstance ? calendarInstance.selectedDates : [];
    const timeSlot = document.getElementById('time-slot').value;

    if (dateRange.length === 0) {
        showToast("Please select a booking date.", "error");
        return;
    }

    if (!timeSlot) {
        showToast("Please select a time slot.", "error");
        return;
    }

    const startDate = dateRange[0];
    const endDate = dateRange[dateRange.length - 1]; // Handles single date or range

    try {
        const docRef = doc(db, "listings", productId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            showToast("Item not found.", "error");
            return;
        }

        const product = docSnap.data();

        if (product.ownerId === user.uid) {
            showToast("You cannot book your own item.", "error");
            return;
        }

        // Calculate Price (Days * Daily Rate)
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive

        let dailyRate = product.rates?.daily || product.price || 0;
        let totalPrice = dailyRate * diffDays;

        const bookingData = {
            listingId: productId,
            listingTitle: product.title,
            listingImage: product.image,
            ownerId: product.ownerId,
            renterId: user.uid,
            renterName: user.displayName || 'Anonymous',
            amount: totalPrice,
            deposit: product.deposit || 0, // Save Deposit explicitly
            startDate: Timestamp.fromDate(startDate),
            endDate: Timestamp.fromDate(endDate),
            timeSlot: timeSlot,
            status: 'pending',
            createdAt: serverTimestamp()
        };

        // 1. Create Booking
        await addDoc(collection(db, "bookings"), bookingData);

        // 2. Create Notification for App
        await addDoc(collection(db, "notifications"), {
            userId: product.ownerId,
            title: "New Booking Request! 📅",
            body: `${user.displayName || 'Someone'} requested to book ${product.title} for ${diffDays} day(s).`,
            type: "booking_request",
            read: false,
            createdAt: serverTimestamp()
        });

        // 3. Send Email via Cloud Function (Custom SMTP)
        try {
            // Fetch Owner's Email from 'users' collection
            let ownerEmail = "owner_placeholder@example.com";
            try {
                const ownerSnap = await getDoc(doc(db, "users", product.ownerId));
                if (ownerSnap.exists()) {
                    ownerEmail = ownerSnap.data().email;
                }
            } catch (e) {
                console.error("Could not fetch owner email:", e);
            }

            const { httpsCallable, getFunctions } = await import('firebase/functions');
            const functionsVal = getFunctions();
            const sendBookingEmail = httpsCallable(functionsVal, 'sendBookingEmail');

            await sendBookingEmail({
                listingTitle: product.title,
                listingImage: product.image || "https://placehold.co/300",
                ownerEmail: ownerEmail, // Fetched above
                renterName: user.displayName,
                startDate: startDate.toDateString(),
                endDate: endDate.toDateString(),
                timeSlot: timeSlot,
                totalPrice: totalPrice,
                days: diffDays
            });
            console.log("Email function called", ownerEmail);
        } catch (emailError) {
            console.error("Email send failed (non-blocking):", emailError);
            // Don't block the UI for email failure
        }

        showToast("Booking Request sent! 📨", "success");
        // Clear selection
        calendarInstance.clear();

    } catch (error) {
        console.error("Booking failed:", error);
        showToast("Failed to book: " + error.message, "error");
    }
}
window.handleBooking = handleBooking;

// Real-Time Booking Listener with Color-Coded Dates
let bookingListener = null;
let currentProductId = null;
let bookingData = { confirmed: [], pending: [] };

async function setupRealtimeBookingListener(productId) {
    currentProductId = productId;

    // Unsubscribe previous listener if exists
    if (bookingListener) {
        bookingListener();
    }

    const { onSnapshot } = await import('firebase/firestore');

    const q = query(
        collection(db, "bookings"),
        where("listingId", "==", productId)
    );

    // Set up real-time listener
    bookingListener = onSnapshot(q, (snapshot) => {
        bookingData = { confirmed: [], pending: [] };

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.startDate && data.endDate) {
                const booking = {
                    from: data.startDate.toDate(),
                    to: data.endDate.toDate(),
                    status: data.status
                };

                if (data.status === 'confirmed') {
                    bookingData.confirmed.push(booking);
                } else if (data.status === 'pending') {
                    bookingData.pending.push(booking);
                }
            }
        });

        // Re-initialize calendar with new data
        if (calendarInstance) {
            reloadCalendar();
        }
    }, (error) => {
        console.error("Booking listener error:", error);
    });
}

function getBlockedDatesForCalendar() {
    // Block both confirmed and pending bookings
    return [...bookingData.confirmed, ...bookingData.pending];
}

function reloadCalendar() {
    if (!calendarInstance) return;

    // Destroy and recreate with new blocked dates
    calendarInstance.destroy();

    const blockedDates = getBlockedDatesForCalendar();

    calendarInstance = flatpickr("#booking-calendar", {
        mode: "range",
        inline: true,
        minDate: "today",
        dateFormat: "Y-m-d",
        disable: blockedDates,
        locale: {
            firstDayOfWeek: 1
        },
        onDayCreate: function (dObj, dStr, fp, dayElem) {
            const date = dayElem.dateObj;

            // Check if date is in confirmed bookings (red)
            const isConfirmed = bookingData.confirmed.some(b =>
                date >= b.from && date <= b.to
            );

            // Check if date is in pending bookings (orange)
            const isPending = bookingData.pending.some(b =>
                date >= b.from && date <= b.to
            );

            // Check if date is a buffer day (1 day after booking ends)
            const isBuffer = bookingData.confirmed.some(b => {
                const dayAfter = new Date(b.to);
                dayAfter.setDate(dayAfter.getDate() + 1);
                return date.toDateString() === dayAfter.toDateString();
            });

            // Apply custom styling
            if (isConfirmed) {
                dayElem.classList.add('flatpickr-confirmed');
                dayElem.style.background = '#fee2e2';
                dayElem.style.color = '#991b1b';
                dayElem.title = 'Confirmed Booking';
            } else if (isPending) {
                dayElem.classList.add('flatpickr-pending');
                dayElem.style.background = '#fef3c7';
                dayElem.style.color = '#92400e';
                dayElem.title = 'Pending Confirmation';
            } else if (isBuffer) {
                dayElem.classList.add('flatpickr-buffer');
                dayElem.style.background = '#f3f4f6';
                dayElem.style.color = '#6b7280';
                dayElem.title = 'Buffer Day (Cleaning)';
                // Also disable buffer days
                dayElem.classList.add('flatpickr-disabled');
            } else {
                // Available - subtle green tint
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (date >= today) {
                    dayElem.style.background = '#f0fdf4';
                    dayElem.style.color = '#166534';
                }
            }
        },
        onChange: function (selectedDates, dateStr, instance) {
            if (selectedDates.length > 0) {
                const days = selectedDates.length === 2
                    ? Math.ceil((selectedDates[1] - selectedDates[0]) / (1000 * 60 * 60 * 24)) + 1
                    : 1;
                console.log(`Selected ${days} day(s)`);
            }
        }
    });
}

// Cleanup listener on page unload
window.addEventListener('beforeunload', () => {
    if (bookingListener) {
        bookingListener();
    }
});

// Logic: Render Product Details
async function renderProduct() {
    const productId = getQueryParam('id');
    const container = document.querySelector('.product-container');

    if (!container) return; // ... (Error handling same as before) ...
    // Note: Re-implementing logic to be safe
    if (!productId) {
        container.innerHTML = `<div style="text-align:center; grid-column: 1/-1;"><h2>Product not found 😕</h2><a href="/" class="btn btn-primary" style="margin-top:1rem;">Browse Listings</a></div>`;
        return;
    }

    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 4rem;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>`;

    try {
        const docRef = doc(db, "listings", productId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            container.innerHTML = `<div style="text-align:center; grid-column: 1/-1;"><h2>Item not listed anymore 🚫</h2><a href="/" class="btn btn-primary" style="margin-top:1rem;">Browse Listings</a></div>`;
            return;
        }

        const product = docSnap.data();

        // -- Gallery HTML --
        let galleryHtml = `
        <div class="main-image-wrapper" style="position: relative;">
            <img src="${product.image || 'https://placehold.co/600x400'}" alt="${product.title}" class="product-image" id="main-image">
            <button id="fav-btn" class="btn-icon" style="position: absolute; top: 1rem; right: 1rem; background: white; border-radius: 50%; width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: none; cursor: pointer; z-index: 10;">
                <i class="fa-regular fa-heart" style="font-size: 1.5rem; color: var(--primary);"></i>
            </button>
        </div>`;

        if (product.images && product.images.length > 1) {
            galleryHtml += `<div style="display: flex; gap: 0.5rem; margin-top: 1rem; overflow-x: auto; padding-bottom: 0.5rem;">
                ${product.images.map(img => `
                    <img src="${img}" onclick="document.getElementById('main-image').src='${img}'" 
                    style="width: 80px; height: 60px; object-fit: cover; border-radius: 0.5rem; cursor: pointer; border: 1px solid #e2e8f0; flex-shrink: 0;">
                `).join('')}
            </div>`;
        }

        // -- Rates HTML --
        let ratesHtml = '';
        if (product.rates) {
            ratesHtml = `
                <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; background: #f8fafc; padding: 1rem; border-radius: 0.75rem;">
                    ${product.rates.daily ? `<div><div style="font-size: 0.8rem; color: var(--gray);">Daily</div><div style="font-weight: 600;">₹${product.rates.daily}</div></div>` : ''}
                    ${product.rates.weekly ? `<div><div style="font-size: 0.8rem; color: var(--gray);">Weekly</div><div style="font-weight: 600;">₹${product.rates.weekly}</div></div>` : ''}
                    ${product.rates.monthly ? `<div><div style="font-size: 0.8rem; color: var(--gray);">Monthly</div><div style="font-weight: 600;">₹${product.rates.monthly}</div></div>` : ''}
                </div>
            `;
        } else {
            ratesHtml = `<div class="price-tag">₹${product.price}<span class="price-period">/${product.period}</span></div>`;
        }


        // Fetch Owner Data for Verification Status
        // Note: 'doc' and 'getDoc' are already imported at the top. Accessing them directly.
        let isOwnerVerified = false;
        try {
            if (product.ownerId) {
                const ownerRef = doc(db, 'users', product.ownerId);
                const ownerSnap = await getDoc(ownerRef);
                if (ownerSnap.exists()) {
                    isOwnerVerified = ownerSnap.data().isVerified || false;
                }
            }
        } catch (e) { console.error("Owner Fetch Error", e); }


        // Inject Content
        container.innerHTML = `
            <div class="product-image-section">
                ${galleryHtml}
            </div>
            
            <!-- Mobile Sticky Booking Bar -->
            <div class="mobile-booking-bar">
                <div>
                    <div style="font-size: 0.8rem; color: var(--gray);">Daily Rate</div>
                    <div style="font-weight: 700; color: var(--primary); font-size: 1.2rem;">₹${product.rates?.daily || product.price}</div>
                </div>
                <button class="btn btn-primary" onclick="document.querySelector('.booking-card').scrollIntoView({behavior: 'smooth'})">
                    Request Booking
                </button>
            </div>

            <div class="product-info-section">
                <div class="product-info">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <h1 style="margin-bottom: 0.5rem; line-height: 1.2;">${product.title}</h1>
                        
                        <!-- Share Menu -->
                        <div class="share-menu">
                            <button class="share-trigger">
                                <i class="fa-solid fa-share-nodes"></i>
                            </button>
                            <div class="share-dropdown">
                                <button onclick="shareToWhatsApp('${product.title.replace(/'/g, "\\'")}', '${product.rates?.daily || product.price}', window.location.href)">
                                    <i class="fa-brands fa-whatsapp"></i> 
                                </button>
                                <button onclick="shareToInstagram(window.location.href)">
                                    <i class="fa-brands fa-instagram"></i> 
                                </button>
                                <button onclick="shareToFacebook(window.location.href)">
                                    <i class="fa-brands fa-facebook"></i> 
                                </button>
                                <button onclick="copyShareLink(window.location.href)">
                                    <i class="fa-solid fa-link"></i> 
                                </button>
                                <button class="native-share-btn" onclick="shareNative('${product.title.replace(/'/g, "\\'")}', 'Check out ${product.title.replace(/'/g, "\\'")} for ₹${product.rates?.daily || product.price}/day', window.location.href)">
                                    <i class="fa-solid fa-share-from-square"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="product-meta">
                        <span class="location"><i class="fa-solid fa-location-dot"></i> ${product.location}</span>
                        <span class="rating-badge"><i class="fa-solid fa-star"></i> ${product.rating || 'New'}</span>
                    </div>

                    <p class="description" style="margin-bottom: 1rem;">${product.description}</p>
                    
                    ${(() => {
                const estimatedCO2 = calculateCO2Savings(product.category || 'default', product.title, 3);
                return estimatedCO2 > 0 ? `
                            <div class="eco-badge">
                                <i class="fa-solid fa-leaf"></i>
                                <span>Save ~${estimatedCO2}kg CO2 by renting</span>
                            </div>
                        ` : '';
            })()}
                    
                    ${ratesHtml}

                    <div class="owner-card" style="display: flex; align-items: center; gap: 1rem; margin: 1.5rem 0; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 0.75rem;">
                        <div class="owner-avatar" style="width: 50px; height: 50px; border-radius: 50%; overflow: hidden; background: #f1f5f9;">
                             ${product.ownerPhoto ? `<img src="${product.ownerPhoto}" referrerpolicy="no-referrer" style="width:100%; height:100%; object-fit: cover;">` : '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center;"><i class="fa-regular fa-user"></i></div>'}
                        </div>
                        <div>
                            <div style="font-weight: 600;">Listed by ${product.ownerName || 'Neighbor'}</div>
                            ${isOwnerVerified
                ? `<div style="font-size: 0.85rem; color: var(--secondary); font-weight:500;"><i class="fa-solid fa-circle-check"></i> Verified Neighbor</div>`
                : `<div style="font-size: 0.85rem; color: var(--gray);">Member</div>`
            }
                        </div>
                    </div>

                    <!-- Booking Section -->
                    <div class="booking-card">
                        <div class="booking-header">Reserve your spot 📅</div>
                        
                <div class="booking-group">
                    <label class="booking-label">Check Availability</label>
                    <div style="font-size: 0.8rem; margin-bottom: 0.5rem; display: flex; gap: 1rem; flex-wrap: wrap;">
                        <span style="display:flex; align-items:center; gap:4px;"><span style="width:10px; height:10px; background:#f0fdf4; border:1px solid #166534; border-radius:50%;"></span> Available</span>
                        <span style="display:flex; align-items:center; gap:4px;"><span style="width:10px; height:10px; background:#fee2e2; border-radius:50%;"></span> Confirmed</span>
                        <span style="display:flex; align-items:center; gap:4px;"><span style="width:10px; height:10px; background:#fef3c7; border-radius:50%;"></span> Pending</span>
                        <span style="display:flex; align-items:center; gap:4px;"><span style="width:10px; height:10px; background:#f3f4f6; border-radius:50%;"></span> Buffer</span>
                    </div>
                    <!-- Inline Calendar Target -->
                    <div id="inline-calendar-container" style="border: 1px solid #e2e8f0; border-radius: 0.5rem; overflow: hidden; margin-bottom: 1rem;">
                         <input type="text" id="booking-calendar" style="display:none;">
                    </div>
                </div>

                <div class="booking-group">
                    <label class="booking-label">Pickup Time Slot</label>
                    <select id="time-slot" class="booking-input">
                                <option value="">Select a comfortable time</option>
                                <option value="09:00 AM - 11:00 AM">🌅 09:00 AM - 11:00 AM</option>
                                <option value="11:00 AM - 01:00 PM">☀️ 11:00 AM - 01:00 PM</option>
                                <option value="02:00 PM - 04:00 PM">🌤️ 02:00 PM - 04:00 PM</option>
                                <option value="04:00 PM - 06:00 PM">🌥️ 04:00 PM - 06:00 PM</option>
                                <option value="06:00 PM - 08:00 PM">🌙 06:00 PM - 08:00 PM</option>
                            </select>
                        </div>

                <!-- DEPOSIT ALERT -->
                ${product.deposit > 0 ? `
                <div style="background: #fff7ed; padding: 0.75rem; border-radius: 0.5rem; border: 1px dashed #fdba74; margin-bottom: 1.5rem; display: flex; align-items: flex-start; gap: 0.5rem;">
                    <i class="fa-solid fa-shield-halved" style="color: #ea580c; margin-top: 0.2rem;"></i>
                    <div>
                        <div style="font-weight: 600; font-size: 0.9rem; color: #9a3412;">Refundable Security Deposit</div>
                        <div style="font-size: 1.1rem; font-weight: 700; color: #ea580c;">₹${product.deposit}</div>
                        <div style="font-size: 0.75rem; color: #c2410c;">Paid upfront, returned upon safe return.</div>
                    </div>
                </div>` : ''}

                <!-- Action Buttons -->
                <button class="btn btn-primary" onclick="window.handleBooking()" style="width: 100%; margin-bottom: 1rem; padding: 1rem; font-size: 1.1rem;">
                    Request to Rent
                </button>
                    </div>


                    
                    <div style="margin-top: 2rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                        <button id="wishlist-btn" class="btn btn-outline btn-large" style="width: 100%; border-radius: 0.75rem;">
                            <i class="fa-regular fa-heart"></i> Wishlist
                        </button>
                        <button class="btn btn-outline btn-large" style="width: 100%; border-radius: 0.75rem;" 
                            onclick="window.location.href='chat.html?ownerId=${product.ownerId}&listingId=${getQueryParam('id')}'">
                            <i class="fa-regular fa-comment-dots"></i> Chat
                        </button>
                    </div>
                </div>
            </div>
        `;

        // -- REVIEWS SECTION --
        try {
            const qReviews = query(
                collection(db, "reviews"),
                where("listingId", "==", productId),
                // orderBy("createdAt", "desc") // complex index
            );
            const reviewSnap = await getDocs(qReviews);

            let totalRating = 0;
            let reviewCount = 0;
            let reviewsHtml = '';

            reviewSnap.forEach(doc => {
                const r = doc.data();
                totalRating += r.rating;
                reviewCount++;
                reviewsHtml += `
                    <div style="padding: 1rem; border-bottom: 1px solid #f1f5f9;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <img src="${r.reviewerImage || 'https://placehold.co/30'}" referrerpolicy="no-referrer" style="width:30px; height:30px; border-radius:50%;">
                            <div style="font-weight: 500; font-size: 0.9rem;">${r.reviewerName || 'User'}</div>
                            <div style="color: #fbbf24; font-size: 0.8rem;">
                                ${Array(5).fill(0).map((_, i) => `<i class="${i < r.rating ? 'fa-solid' : 'fa-regular'} fa-star"></i>`).join('')}
                            </div>
                            <div style="font-size: 0.75rem; color: var(--gray); margin-left: auto;">
                                ${r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleDateString() : ''}
                            </div>
                        </div>
                        <p style="font-size: 0.9rem; color: var(--text-dark); line-height: 1.5;">${r.comment}</p>
                    </div>
                `;
            });

            // Update Header Rating if we have real data
            if (reviewCount > 0) {
                const avg = (totalRating / reviewCount).toFixed(1);
                // Try to find the star icon in the header and update it?
                // Or just render the reviews section
                container.innerHTML += `
                    <div style="grid-column: 1/-1; margin-top: 3rem; background: white; padding: 2rem; border-radius: 1rem; border: 1px solid #e2e8f0;">
                        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
                            <h2 style="margin: 0;">Reviews</h2>
                            <span style="font-size: 1.2rem; font-weight: 600; color: var(--primary);">
                                <i class="fa-solid fa-star" style="color:#fbbf24;"></i> ${avg} 
                                <span style="font-weight: 400; color: var(--gray); font-size: 1rem;">(${reviewCount})</span>
                            </span>
                        </div>
                        <div class="reviews-list">
                            ${reviewsHtml}
                        </div>
                    </div>
                `;
            } else {
                container.innerHTML += `
                    <div style="grid-column: 1/-1; margin-top: 3rem; background: white; padding: 2rem; border-radius: 1rem; border: 1px solid #e2e8f0;">
                        <h2 style="margin-bottom: 0.5rem;">Reviews</h2>
                        <p style="color: var(--gray);">No reviews yet. Be the first to rent and review!</p>
                    </div>
                `;
            }

        } catch (e) {
            console.error("Reviews load error", e);
        }

        // -- RECOMMENDATIONS ENGINE --
        try {
            const qRelated = query(
                collection(db, "listings"),
                where("category", "==", product.category || "Other"),
                // limit(4) // Fetch 4, exclude current, left with 3
            );

            const relSnap = await getDocs(qRelated);
            let relatedHtml = '';
            let count = 0;

            relSnap.forEach(doc => {
                if (doc.id !== productId && count < 3) {
                    const item = doc.data();
                    relatedHtml += `
                        <a href="product.html?id=${doc.id}" style="text-decoration:none; color:inherit;">
                            <div style="width: 250px; flex-shrink: 0; border: 1px solid #e2e8f0; border-radius: 1rem; overflow: hidden; background: white;">
                                <img src="${item.image || 'https://placehold.co/300'}" style="width: 100%; height: 160px; object-fit: cover;">
                                <div style="padding: 1rem;">
                                    <div style="font-weight: 600; margin-bottom: 0.5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.title}</div>
                                    <div style="color: var(--primary); font-weight: 700;">₹${item.price}<span style="font-size:0.8rem; font-weight:400; color:var(--gray);">/${item.period}</span></div>
                                </div>
                            </div>
                        </a>
                    `;
                    count++;
                }
            });

            if (relatedHtml) {
                container.innerHTML += `
                    <div style="grid-column: 1/-1; margin-top: 4rem;">
                        <h2 style="margin-bottom: 1.5rem;">You Might Also Like 🛍️</h2>
                        <div style="display: flex; gap: 1.5rem; overflow-x: auto; padding-bottom: 1rem; scrollbar-width: none;">
                            ${relatedHtml}
                        </div>
                    </div>
                `;
            }
        } catch (err) {
            console.log("Rec Engine Error (Non-critical):", err);
        }

        // Setup Real-Time Booking Listener
        await setupRealtimeBookingListener(productId);

        // Initialize Flatpickr (will be populated by listener)
        const blockedDates = getBlockedDatesForCalendar();

        calendarInstance = flatpickr("#booking-calendar", {
            mode: "range",
            inline: true,
            minDate: "today",
            dateFormat: "Y-m-d",
            disable: blockedDates,
            locale: {
                firstDayOfWeek: 1
            },
            onDayCreate: function (dObj, dStr, fp, dayElem) {
                const date = dayElem.dateObj;

                const isConfirmed = bookingData.confirmed.some(b =>
                    date >= b.from && date <= b.to
                );

                const isPending = bookingData.pending.some(b =>
                    date >= b.from && date <= b.to
                );

                const isBuffer = bookingData.confirmed.some(b => {
                    const dayAfter = new Date(b.to);
                    dayAfter.setDate(dayAfter.getDate() + 1);
                    return date.toDateString() === dayAfter.toDateString();
                });

                if (isConfirmed) {
                    dayElem.style.background = '#fee2e2';
                    dayElem.style.color = '#991b1b';
                    dayElem.title = 'Confirmed Booking';
                } else if (isPending) {
                    dayElem.style.background = '#fef3c7';
                    dayElem.style.color = '#92400e';
                    dayElem.title = 'Pending Confirmation';
                } else if (isBuffer) {
                    dayElem.style.background = '#f3f4f6';
                    dayElem.style.color = '#6b7280';
                    dayElem.title = 'Buffer Day';
                    dayElem.classList.add('flatpickr-disabled');
                } else {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (date >= today) {
                        dayElem.style.background = '#f0fdf4';
                        dayElem.style.color = '#166534';
                    }
                }
            },
            onChange: function (selectedDates, dateStr, instance) {
                if (selectedDates.length > 0) {
                    const days = selectedDates.length === 2
                        ? Math.ceil((selectedDates[1] - selectedDates[0]) / (1000 * 60 * 60 * 24)) + 1
                        : 1;
                    // Optional: Show selected days count
                }
            }
        });

        // --- FAVORITES LOGIC ---
        const favBtn = document.getElementById('fav-btn');
        if (favBtn) {
            // Check status
            if (auth.currentUser) {
                const favRef = doc(db, "favorites", `${auth.currentUser.uid}_${productId}`);
                getDoc(favRef).then(snap => {
                    if (snap.exists()) {
                        const icon = favBtn.querySelector('i');
                        icon.classList.remove('fa-regular');
                        icon.classList.add('fa-solid');
                        icon.style.color = '#ef4444';
                    }
                });
            }

            favBtn.onclick = () => toggleFavorite(productId, favBtn);
        }

        // --- WISHLIST LOGIC ---
        const wishlistBtn = document.getElementById('wishlist-btn');
        if (wishlistBtn) {
            // Check if already in wishlist
            if (auth.currentUser) {
                checkWishlistStatus(productId).then(inWishlist => {
                    if (inWishlist) {
                        const icon = wishlistBtn.querySelector('i');
                        icon.classList.remove('fa-regular');
                        icon.classList.add('fa-solid');
                        wishlistBtn.innerHTML = '<i class="fa-solid fa-heart"></i> In Wishlist';
                    }
                });
            }

            wishlistBtn.onclick = () => {
                if (!auth.currentUser) {
                    showToast('Please login to add to wishlist', 'info');
                    return;
                }
                showWishlistModal(productId, product.title, product.image || product.images?.[0]);
            };
        }

        // --- SHARE LOGIC ---
        const shareBtn = document.getElementById('share-btn');
        if (shareBtn) {
            shareBtn.onclick = () => {
                const text = `Hey! Found this *${product.title}* on RentAnything for ₹${product.rates?.daily || product.price}/day. Check it out:`;
                const url = window.location.href;
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`;

                // If Web Share API is supported (Mobile Native Share)
                if (navigator.share) {
                    navigator.share({
                        title: product.title,
                        text: text,
                        url: url
                    }).catch(console.error);
                } else {
                    // Fallback to WhatsApp
                    window.open(whatsappUrl, '_blank');
                }
            };
        }

    } catch (error) {
        console.error("Error fetching product:", error);
        container.innerHTML = `<div style="text-align:center; grid-column: 1/-1;"><h2>Error loading product ⚠️</h2><p>${error.message}</p></div>`;
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initTheme();
    initAuth();
    initHeader();
    initShareMenu();

    renderProduct();
});

// Wishlist Modal HTML (inject into DOM)
function createWishlistModal() {
    const modalHTML = `
        <div id="wishlist-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; align-items:center; justify-content:center;">
            <div style="background:white; border-radius:1rem; padding:2rem; max-width:500px; width:90%; box-shadow:0 20px 25px -5px rgba(0,0,0,0.3);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                    <h2 style="margin:0;">Add to Wishlist 💖</h2>
                    <button onclick="closeWishlistModal()" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--gray);">&times;</button>
                </div>
                
                <div style="margin-bottom:1rem;">
                    <label style="display:block; margin-bottom:0.5rem; font-weight:500;">Priority Level</label>
                    <select id="wishlist-priority" style="width:100%; padding:0.75rem; border:1px solid #e2e8f0; border-radius:0.5rem; font-size:1rem;">
                        <option value="low">Low - Just browsing</option>
                        <option value="medium" selected>Medium - Interested</option>
                        <option value="high">High - Need ASAP</option>
                    </select>
                </div>
                
                <div style="margin-bottom:1.5rem;">
                    <label style="display:block; margin-bottom:0.5rem; font-weight:500;">Notes (Optional)</label>
                    <textarea id="wishlist-notes" placeholder="e.g., For birthday party in June..." style="width:100%; padding:0.75rem; border:1px solid #e2e8f0; border-radius:0.5rem; font-size:1rem; min-height:80px; resize:vertical;"></textarea>
                </div>
                
                <div style="display:flex; gap:1rem;">
                    <button onclick="closeWishlistModal()" class="btn btn-outline" style="flex:1;">Cancel</button>
                    <button onclick="confirmAddToWishlist()" class="btn btn-primary" style="flex:1;">Add to Wishlist</button>
                </div>
            </div>
        </div>
    `;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = modalHTML;
    document.body.appendChild(tempDiv.firstElementChild);
}

// Show wishlist modal
let currentWishlistItem = null;

window.showWishlistModal = (listingId, listingTitle, listingImage) => {
    currentWishlistItem = { listingId, listingTitle, listingImage };

    if (!document.getElementById('wishlist-modal')) {
        createWishlistModal();
    }

    document.getElementById('wishlist-modal').style.display = 'flex';
    document.getElementById('wishlist-notes').value = '';
    document.getElementById('wishlist-priority').value = 'medium';
};

window.closeWishlistModal = () => {
    document.getElementById('wishlist-modal').style.display = 'none';
    currentWishlistItem = null;
};

window.confirmAddToWishlist = async () => {
    if (!currentWishlistItem) return;

    const notes = document.getElementById('wishlist-notes').value;
    const priority = document.getElementById('wishlist-priority').value;

    const user = auth.currentUser;
    if (!user) {
        showToast('Please login first', 'error');
        return;
    }

    try {
        const wishlistId = `${user.uid}_${currentWishlistItem.listingId}`;
        await setDoc(doc(db, 'wishlists', wishlistId), {
            userId: user.uid,
            listingId: currentWishlistItem.listingId,
            listingTitle: currentWishlistItem.listingTitle,
            listingImage: currentWishlistItem.listingImage,
            notes: notes,
            priority: priority,
            createdAt: serverTimestamp()
        });

        showToast('Added to wishlist! 💖', 'success');
        window.closeWishlistModal();

        // Update button if exists
        const wishlistBtn = document.getElementById('wishlist-btn');
        if (wishlistBtn) {
            const icon = wishlistBtn.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-regular');
                icon.classList.add('fa-solid');
            }
            wishlistBtn.innerHTML = '<i class="fa-solid fa-heart"></i> In Wishlist';
        }
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        showToast('Failed to add to wishlist', 'error');
    }
};

// Helper to check if item is in wishlist
async function checkWishlistStatus(listingId) {
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
