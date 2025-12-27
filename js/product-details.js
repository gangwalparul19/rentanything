
// Firebase Imports
import { db, auth } from './firebase-config.js';
import { showLoader, hideLoader } from './loader.js';
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, getDocs, Timestamp, setDoc, deleteDoc, limit, onSnapshot } from 'firebase/firestore';
import { initMobileMenu } from './navigation.js';
import { initTheme } from './theme.js';
import { initAuth } from './auth.js';
import { initHeader } from './header-manager.js';
import { initFooter } from './footer-manager.js';
import { showToast } from './toast-enhanced.js';
import { initShareMenu, shareToWhatsApp, shareToFacebook, shareToTwitter, shareToLinkedIn, shareViaEmail, copyShareLink, shareNative } from './social-share.js';
import { calculateCO2Savings } from './carbon-calculator.js';
import { gallery } from './image-gallery.js';
import { dedupedFetch } from './utils';
import { startChatWithOwner } from './chat.js';
import { FocusTrap } from './accessibility.js';
import { generateSkeletonDetails } from './skeleton-loader';
import { checkUserPhone, showPhoneVerificationModal } from './phone-otp.js';

// Init
document.addEventListener('DOMContentLoaded', () => {
    initHeader();      // 1. Inject HTML links and setup UI auth
    initMobileMenu();  // 2. Make menu clickable
    initTheme();       // 3. Setup dark/light mode
    initAuth();        // 4. Setup login button events
    initFooter();
    initShareMenu();
    renderProduct();
});

// Helper: Toggle Favorite (Moved to bottom)

// Expose toast to window
window.showToast = showToast;

// Helper: Get URL Parameter
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Booking UI Logic
function renderBookingCard(product, productId) {
    const section = document.getElementById('booking-section');
    if (!section) return;

    if (product.transactionTypes?.includes('rent')) {
        section.innerHTML = `
            <div class="booking-card">
                <div class="booking-header">Reserve for Rent 📅</div>
                <div id="inline-calendar-container" style="margin-bottom: 1rem;">
                     <input type="text" id="booking-calendar" style="display:none;">
                </div>
                <select id="time-slot" class="booking-input">
                    <option value="">Select Pickup Time</option>
                    <option value="morning">🌅 09:00 AM - 11:00 AM</option>
                    <option value="evening">🌙 06:00 PM - 08:00 PM</option>
                </select>
                <button class="btn btn-primary" onclick="window.handleBooking()" style="width: 100%; margin-top: 1rem;">
                    Request to Rent
                </button>
            </div>`;

        // Init Flatpickr immediately
        calendarInstance = flatpickr("#booking-calendar", {
            mode: "range",
            inline: true,
            minDate: "today"
        });
    }
}

// SEO and Page Metadata Helpers
function updatePageMetadata(product, productId) {
    const price = product.rates?.daily || product.salePrice || 'Free';
    const priceText = product.transactionTypes?.includes('donate') ? 'FREE' : `₹${price}`;
    document.title = `${product.title} - ${priceText} | RentAnything`;

    // Update Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
    }
    metaDesc.content = (product.description || "").substring(0, 160);
}

// Helper: Update or create meta tag
function updateMetaTag(attribute, attributeValue, content) {
    let element = document.querySelector(`meta[${attribute}="${attributeValue}"]`);

    if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, attributeValue);
        document.head.appendChild(element);
    }

    element.setAttribute('content', content);
}

// Helper: Update or create link tag
function updateLinkTag(rel, href) {
    let element = document.querySelector(`link[rel="${rel}"]`);

    if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
    }

    element.setAttribute('href', href);
}

// Helper: Add structured data for SEO
function addStructuredData(product, productId, priceText) {
    // Remove existing structured data if present
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
        existingScript.remove();
    }

    const structuredData = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product.title,
        "description": product.description || product.title,
        "image": product.image || 'https://placehold.co/600x400',
        "brand": {
            "@type": "Brand",
            "name": "RentAnything"
        }
    };

    // Add offers for rental/sale items
    if (product.rates?.daily || product.salePrice) {
        structuredData.offers = {
            "@type": "Offer",
            "priceCurrency": "INR",
            "price": product.rates?.daily || product.salePrice,
            "availability": "https://schema.org/InStock",
            "url": window.location.href
        };
    }

    // Add rating if available
    if (product.rating) {
        structuredData.aggregateRating = {
            "@type": "AggregateRating",
            "ratingValue": product.rating,
            "reviewCount": product.reviewCount || 1
        };
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);
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

    // Validate Date & Time first (before OTP check)
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

    // ✅ Phone OTP Verification Check
    const phoneStatus = await checkUserPhone();

    if (!phoneStatus.hasPhone || !phoneStatus.isVerified) {
        // Show phone verification modal
        showPhoneVerificationModal(() => {
            // After successful verification, proceed with booking
            processBooking(productId, dateRange, timeSlot);
        });
        return;
    }

    // Phone is already verified, proceed with booking
    await processBooking(productId, dateRange, timeSlot);
}

// Separated booking processing logic
async function processBooking(productId, dateRange, timeSlot) {
    const user = auth.currentUser;
    if (!user) return;

    showLoader("Processing booking request...");

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

        // 3. WhatsApp Integration (Auto-Open)
        try {
            const ownerDoc = await getDoc(doc(db, "users", product.ownerId));
            if (ownerDoc.exists()) {
                const ownerData = ownerDoc.data();
                if (ownerData.phoneNumber) {
                    // Format dates readable
                    const startStr = startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                    const endStr = endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

                    const message = `Hi, I just requested to book "${product.title}" on RentAnything.\n📅 Dates: ${startStr} - ${endStr}\n💰 Total: ₹${totalPrice}\n\nIs it available?`;
                    const waUrl = `https://wa.me/${ownerData.phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

                    // Open in new tab immediately
                    window.open(waUrl, '_blank');
                }
            }
        } catch (e) {
            console.error("WhatsApp redirect failed:", e);
        }

        // 3. Send Email via Cloud Function (Custom SMTP)
        try {
            // Fetch owner details from users collection
            let ownerEmail = product.ownerEmail || "rentanythingindia@gmail.com"; // Fallback
            let isOwnerVerified = false;

            try {
                const ownerDoc = await getDoc(doc(db, "users", product.ownerId));
                if (ownerDoc.exists()) {
                    const ownerData = ownerDoc.data();
                    ownerEmail = ownerData.email || ownerEmail; // Use fetched email
                    isOwnerVerified = ownerData.idVerificationStatus === 'verified';
                }
            } catch (e) {
                console.error("Owner Fetch Error", e);
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
            // Email function called
        } catch (emailError) {
            console.error("Email send failed (non-blocking):", emailError);
            // Don't block the UI for email failure
        }

        showToast('Booking request sent successfully! 🎉', 'success');

        // Redirect to My Bookings page
        setTimeout(() => {
            hideLoader();  // FIX: Hide loader before redirect
            window.location.href = '/my-bookings.html';
        }, 1500);

    } catch (error) {
        console.error('Booking failed:', error);
        hideLoader();  // FIX: Hide loader on error
        showToast('Booking failed. Please try again.', 'error');
    } finally {
        hideLoader();
        // The button re-enabling logic is now handled by the countdown interval,
        // but if an error occurs before the interval starts, we need to re-enable it.
        // This is handled by the early returns above.
    }
}
window.handleBooking = handleBooking;

// Real-Time Booking Listener with Color-Coded Dates
let bookingListener = null;
let currentProductId = null;
let bookingData = { confirmed: [], pending: [] };

async function setupRealtimeBookingListener(productId) {
    currentProductId = productId;

    // Unsubscribe previous listener
    if (bookingListener) {
        bookingListener();
    }

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
    // Block confirmed and pending bookings
    const blockedRanges = [...bookingData.confirmed, ...bookingData.pending];

    // ENHANCEMENT: Automatically add buffer days (day after booking ends)
    // This prevents same-day turnaround and gives owners time for inspection/cleaning
    const bufferDays = [];

    // Add buffer days for confirmed bookings (highest priority)
    bookingData.confirmed.forEach(booking => {
        const bufferDate = new Date(booking.to);
        bufferDate.setDate(bufferDate.getDate() + 1);

        // Only add if not today or in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        bufferDate.setHours(0, 0, 0, 0);

        if (bufferDate >= today) {
            bufferDays.push({
                from: bufferDate,
                to: bufferDate
            });
        }
    });

    // Also add buffer days for pending bookings
    // (to avoid double-booking conflicts if pending gets confirmed)
    bookingData.pending.forEach(booking => {
        const bufferDate = new Date(booking.to);
        bufferDate.setDate(bufferDate.getDate() + 1);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        bufferDate.setHours(0, 0, 0, 0);

        if (bufferDate >= today) {
            bufferDays.push({
                from: bufferDate,
                to: bufferDate
            });
        }
    });

    // Combine all blocked dates: bookings + buffer days
    return [...blockedRanges, ...bufferDays];
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
            // Now checking BOTH confirmed AND pending bookings for buffer days
            const isConfirmedBuffer = bookingData.confirmed.some(b => {
                const dayAfter = new Date(b.to);
                dayAfter.setDate(dayAfter.getDate() + 1);
                return date.toDateString() === dayAfter.toDateString();
            });

            const isPendingBuffer = bookingData.pending.some(b => {
                const dayAfter = new Date(b.to);
                dayAfter.setDate(dayAfter.getDate() + 1);
                return date.toDateString() === dayAfter.toDateString();
            });

            const isBuffer = isConfirmedBuffer || isPendingBuffer;

            // Apply custom styling
            if (isConfirmed) {
                dayElem.classList.add('flatpickr-confirmed');
                dayElem.style.background = '#fee2e2';
                dayElem.style.color = '#991b1b';
                dayElem.title = 'Confirmed Booking - Unavailable';
            } else if (isPending) {
                dayElem.classList.add('flatpickr-pending');
                dayElem.style.background = '#fef3c7';
                dayElem.style.color = '#92400e';
                dayElem.title = 'Pending Confirmation - Unavailable';
            } else if (isBuffer) {
                dayElem.classList.add('flatpickr-buffer');
                dayElem.style.background = '#e5e7eb';
                dayElem.style.color = '#4b5563';
                dayElem.style.fontWeight = '500';

                // Different tooltip based on buffer type
                if (isConfirmedBuffer) {
                    dayElem.title = '🧹 Buffer Day - Reserved for cleaning/inspection';
                } else {
                    dayElem.title = '⏳ Buffer Day - May be needed for cleaning';
                }

                // Also disable buffer days (already handled by disable array, but this ensures it)
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
                // Selected days for rental
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
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    const container = document.querySelector('.product-container');

    if (!container) return;
    if (!productId) {
        container.innerHTML = `<div style="text-align:center; grid-column: 1/-1;"><h2>Product not found 😕</h2><a href="/" class="btn btn-primary" style="margin-top:1rem;">Browse Listings</a></div>`;
        return;
    }

    container.innerHTML = generateSkeletonDetails();

    try {
        const docRef = doc(db, "listings", productId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            container.innerHTML = `<div style="text-align:center; grid-column: 1/-1;"><h2>Item not listed anymore 🚫</h2><a href="/" class="btn btn-primary" style="margin-top:1rem;">Browse Listings</a></div>`;
            return;
        }

        const product = docSnap.data();
        window.currentProduct = { id: productId, ...product };
        const transactionTypes = product.transactionTypes || ['rent']; // Default to rent

        // ============ UPDATE DYNAMIC METADATA FOR SOCIAL SHARING ============
        updatePageMetadata(product, productId);

        // -- Gallery HTML --
        let galleryHtml = `
        <div class="main-image-wrapper" style="position: relative;">
            <img src="${product.image || 'https://placehold.co/600x400'}" alt="${product.title}" class="product-image" id="main-image">
            <div style="position: absolute; top: 10px; left: 10px; display:flex; flex-wrap:wrap; gap:6px;">
                 ${transactionTypes.includes('rent') ? '<span style="background: #e0f2fe; color: #0284c7; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 700;">RENT</span>' : ''}
                 ${transactionTypes.includes('sell') ? '<span style="background: #dcfce7; color: #16a34a; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 700;">BUY</span>' : ''}
                 ${transactionTypes.includes('donate') ? '<span style="background: #ffe4e6; color: #e11d48; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 700;">FREE</span>' : ''}
            </div>
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

        // -- Rates / Price HTML --
        let ratesHtml = '';
        if (transactionTypes.includes('rent') && product.rates) {
            ratesHtml += `
                <div style="margin-bottom: 1.5rem;">
                    <h3 style="font-size: 1rem; color: var(--gray); margin-bottom: 0.5rem;">Rental Rates</h3>
                    <div style="display: flex; gap: 1rem; background: #f8fafc; padding: 1rem; border-radius: 0.75rem;">
                        ${product.rates.daily ? `<div><div style="font-size: 0.8rem; color: var(--gray);">Daily</div><div style="font-weight: 600;">₹${product.rates.daily}</div></div>` : ''}
                        ${product.rates.weekly ? `<div><div style="font-size: 0.8rem; color: var(--gray);">Weekly</div><div style="font-weight: 600;">₹${product.rates.weekly}</div></div>` : ''}
                        ${product.rates.monthly ? `<div><div style="font-size: 0.8rem; color: var(--gray);">Monthly</div><div style="font-weight: 600;">₹${product.rates.monthly}</div></div>` : ''}
                    </div>
                </div>
            `;
        }

        if (transactionTypes.includes('sell') && product.salePrice) {
            ratesHtml += `
                <div style="margin-bottom: 1.5rem;">
                    <h3 style="font-size: 1rem; color: var(--gray); margin-bottom: 0.5rem;">Purchase Price</h3>
                    <div class="price-tag" style="margin-bottom: 0;">₹${product.salePrice}</div>
                </div>
            `;
        }

        if (transactionTypes.includes('donate')) {
            ratesHtml += `
                <div style="margin-bottom: 1.5rem;">
                    <h3 style="font-size: 1rem; color: var(--gray); margin-bottom: 0.5rem;">Donation</h3>
                    <div class="price-tag" style="color: #e11d48; margin-bottom: 0;">FREE <span style="font-size: 1rem; color: var(--gray); font-weight: 400;">(${product.donateDescription || 'Free pickup'})</span></div>
                </div>
            `;
        }

        // Fetch Owner Data
        let isOwnerVerified = false;
        try {
            if (product.ownerId) {
                const ownerRef = doc(db, 'users', product.ownerId);
                // Deduped fetch for owner data
                const ownerSnap = await dedupedFetch(
                    `user-${product.ownerId}`,
                    () => getDoc(ownerRef)
                );

                if (ownerSnap.exists()) {
                    const ownerData = ownerSnap.data();
                    isOwnerVerified = ownerData.idVerificationStatus === 'verified';
                }
            }
        } catch (e) { console.error("Owner Fetch Error", e); }

        // FIX: Don't let the booking listener failure stop the page from loading
        if (transactionTypes.includes('rent')) {
            setupRealtimeBookingListener(productId).catch(err => {
                console.error('Booking listener setup failed:', err);
            });
        }


        // -- Action Sections (Rent/Buy/Donate) --
        let actionsHtml = '';

        // 1. RENT SECTION
        if (transactionTypes.includes('rent')) {
            actionsHtml += `
                <div class="booking-card" style="margin-bottom: 4rem;">
                    <div class="booking-header">Reserve for Rent 📅</div>
                    
                    <div class="booking-group">
                        <label class="booking-label">Check Availability</label>
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

                    <!-- FEATURE: Price Preview -->
                    <div id="price-preview" style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 0.75rem; padding: 1rem; margin-bottom: 1rem; display: none;">
                        <div style="font-weight: 600; color: #0c4a6e; margin-bottom: 0.5rem; font-size: 0.9rem;">
                            <i class="fa-solid fa-calculator"></i> Price Estimate
                        </div>
                        <div id="price-breakdown" style="color: #075985; font-size: 0.95rem;"></div>
                    </div>

                    ${product.deposit > 0 ? `
                    <div style="background: #fff7ed; padding: 0.75rem; border-radius: 0.5rem; border: 1px dashed #fdba74; margin-bottom: 1.5rem; display: flex; align-items: flex-start; gap: 0.5rem;">
                        <i class="fa-solid fa-shield-halved" style="color: #ea580c; margin-top: 0.2rem;"></i>
                        <div>
                            <div style="font-weight: 600; font-size: 0.9rem; color: #9a3412;">Refundable Security Deposit</div>
                            <div style="font-size: 1.1rem; font-weight: 700; color: #ea580c;">₹${product.deposit}</div>
                        </div>
                    </div>` : ''}

                    <button id="book-now-button" class="btn btn-primary" onclick="window.handleBooking()" style="width: 100%; padding: 1rem; font-size: 1.1rem;">
                        Request to Rent
                    </button>
                </div>
            `;
        }

        // 2. BUY SECTION
        if (transactionTypes.includes('sell')) {
            actionsHtml += `
                <div class="booking-card" style="margin-bottom: 4rem; border-color: #bbf7d0;">
                    <div class="booking-header" style="background: #dcfce7; color: #166534;">Buy this Item 🛍️</div>
                    <div style="padding: 1.5rem text-align: center;">
                        <p style="margin-bottom: 1rem;">Interested in owning this item?</p>
                        <div style="font-size: 2rem; font-weight: 700; color: #16a34a; margin-bottom: 1rem;">₹${product.salePrice}</div>
                        <button class="btn btn-primary" onclick="window.handleBuy()" style="width: 100%; padding: 1rem; font-size: 1.1rem; background: #16a34a; border-color: #16a34a;">
                             Contact Seller
                        </button>
                    </div>
                </div>
            `;
        }

        // 3. DONATE SECTION
        if (transactionTypes.includes('donate')) {
            actionsHtml += `
                <div class="booking-card" style="margin-bottom: 4rem; border-color: #fecdd3;">
                    <div class="booking-header" style="background: #ffe4e6; color: #9f1239;">Claim Free Item ❤️</div>
                    <div style="padding: 1.5rem text-align: center;">
                        <p style="margin-bottom: 1rem;">This item is being given away for free!</p>
                        <p style="font-size: 0.9rem; color: var(--gray); margin-bottom: 1rem;">Note: ${product.donateDescription || 'Pickup required'}</p>
                        <button class="btn btn-primary" onclick="window.handleClaim()" style="width: 100%; padding: 1rem; font-size: 1.1rem; background: #e11d48; border-color: #e11d48;">
                            Contact to Claim
                        </button>
                    </div>
                </div>
            `;
        }


        // Inject Content
        container.innerHTML = `
            <div class="product-image-section">
                ${galleryHtml}
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
                            </div>
                        </div>
                    </div>
                    <div class="product-meta">
                        <span class="location"><i class="fa-solid fa-location-dot"></i> ${product.location}</span>
                        <span class="rating-badge"><i class="fa-solid fa-star"></i> ${product.rating || 'New'}</span>
                    </div>

                    <p class="description" style="margin-bottom: 1rem;">${product.description}</p>
                    
                    <!-- Eco Badge -->
                    ${(() => {
                const estimatedCO2 = calculateCO2Savings(product.category || 'default', product.title, 3);
                return estimatedCO2 > 0 ? `
                            <div class="eco-badge">
                                <i class="fa-solid fa-leaf"></i>
                                <span>Save ~${estimatedCO2}kg CO2 via reuse</span>
                            </div>
                        ` : '';
            })()}
                    
                    ${ratesHtml}

                    <div class="owner-card" style="display: flex; align-items: center; gap: 1rem; margin: 1.5rem 0; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 0.75rem; cursor: pointer; transition: background 0.2s;" 
                         onclick="window.location.href='/user-profile.html?uid=${product.ownerId}'">
                        <div class="owner-avatar" style="width: 50px; height: 50px; border-radius: 50%; overflow: hidden; background: #f1f5f9;">
                             ${product.ownerPhoto ? `<img src="${product.ownerPhoto}" referrerpolicy="no-referrer" style="width:100%; height:100%; object-fit: cover;">` : '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center;"><i class="fa-regular fa-user"></i></div>'}
                        </div>
                        <div>
                            <div style="font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                                Listed by ${product.ownerName || 'Neighbor'}
                                ${isOwnerVerified ?
                `<span title="Govt ID Verified" style="color: #16a34a; font-size: 0.9rem;"><i class="fa-solid fa-circle-check"></i></span>`
                : ''}
                                <i class="fa-solid fa-chevron-right" style="font-size: 0.7rem; color: var(--gray); margin-left: auto;"></i>
                            </div>
                            ${isOwnerVerified
                ? `<div style="font-size: 0.85rem; color: var(--secondary); font-weight:500;"><i class="fa-solid fa-circle-check"></i> Verified Neighbor</div>`
                : `<div style="font-size: 0.85rem; color: var(--gray);">View Profile</div>`
            }
                        </div>
                    </div>

                    <!-- DYNAMIC ACTIONS -->
                    ${actionsHtml}
                    
                    <div style="margin-top: 2rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                        <button id="wishlist-btn" class="btn btn-outline btn-large" style="width: 100%; border-radius: 0.75rem;">
                            <i class="fa-regular fa-heart"></i> Wishlist
                        </button>
                        <button class="btn btn-outline btn-large" style="width: 100%; border-radius: 0.75rem;" 
                            onclick="window.location.href='/chat.html?ownerId=${product.ownerId}&listingId=${getQueryParam('id')}'">
                            <i class="fa-regular fa-comment-dots"></i> Chat
                        </button>
                    </div>
                </div>
            </div>
        `;

        // -- REVIEWS SECTION --
        // ... (Existing Review Logic - Keeping it simpler here to save space in replacement, assuming it was working)
        // Actually I should keep the review logic. I'll paste it back.
        window.currentProduct = { id: productId, ...product };
        loadReviews(productId, container);

        // Render Booking or Sale details
        renderBookingCard(product, productId);

        // -- RECOMMENDATIONS --
        loadRecommendations(product.category, productId);


        // Setup Real-Time Booking Listener ONLY if Renting
        if (transactionTypes.includes('rent')) {
            await setupRealtimeBookingListener(productId);
            // Initialize Flatpickr
            const blockedDates = getBlockedDatesForCalendar();
            calendarInstance = flatpickr("#booking-calendar", {
                mode: "range",
                inline: true,
                minDate: "today",
                dateFormat: "Y-m-d",
                disable: blockedDates,
                locale: { firstDayOfWeek: 1 },
                // ... (rest of config)
            });
        }

        // Setup Buttons (Fav, Wishlist, Share)
        setupInteractionButtons(productId, product);

        // Setup Image Gallery
        setupImageGallery(product);

    } catch (error) {
        console.error("Error fetching product:", error);
        // Sanitize error message to prevent XSS
        const safeMessage = error.message?.replace(/</g, '&lt;').replace(/>/g, '&gt;') || 'Unknown error';
        container.innerHTML = `<div style="text-align:center; grid-column: 1/-1;"><h2>Error loading product ⚠️</h2><p>${safeMessage}</p></div>`;
    }
}

// Extracted Helpers to keep renderProduct clean(er)
async function loadReviews(productId, container) {
    try {
        const q = query(collection(db, "reviews"), where("listingId", "==", productId));
        const snap = await getDocs(q);

        if (snap.empty) return;

        const reviewsSection = document.createElement('div');
        reviewsSection.style.cssText = "grid-column: 1/-1; margin-top: 3rem; background: white; padding: 2rem; border-radius: 1rem;";
        reviewsSection.innerHTML = `<h2>Reviews (${snap.size})</h2>`;

        snap.forEach(doc => {
            const r = doc.data();
            reviewsSection.innerHTML += `
                <div style="padding: 1rem; border-bottom: 1px solid #f1f5f9;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                        <strong>${r.reviewerName || 'Neighbor'}</strong>
                        <span>${'⭐'.repeat(r.rating || 5)}</span>
                    </div>
                    <p style="margin:0; color:var(--gray);">${r.comment}</p>
                </div>`;
        });
        container.appendChild(reviewsSection);
    } catch (e) {
        console.error("Reviews load error:", e);
    }
}

async function toggleFavorite(listingId, btn, product) {
    if (!auth.currentUser) {
        showToast("Login to save items", "info");
        return;
    }

    const icon = btn.querySelector('i');
    const wasSaved = icon.classList.contains('fa-solid'); // Check solid class

    // 1. Optimistic UI Update
    if (wasSaved) {
        // Revert to empty
        btn.innerHTML = '<i class="fa-regular fa-heart"></i> Add to Favorites';
        btn.classList.remove('active');
    } else {
        // Set to filled
        btn.innerHTML = '<i class="fa-solid fa-heart"></i> Saved';
        btn.classList.add('active');

        // Animation
        const i = btn.querySelector('i');
        i.style.transform = 'scale(1.2)';
        setTimeout(() => i.style.transform = 'scale(1)', 200);
    }

    try {
        const favRef = doc(db, "favorites", `${auth.currentUser.uid}_${listingId}`);
        const docSnap = await getDoc(favRef);

        if (docSnap.exists()) {
            await deleteDoc(favRef);
            showToast("Removed from favorites", "info");
        } else {
            await setDoc(favRef, {
                userId: auth.currentUser.uid,
                listingId: listingId,
                title: product.title,
                image: product.image,
                savedAt: serverTimestamp()
            });
            showToast("Saved to favorites", "success");
        }
    } catch (error) {
        console.error("Favorite toggle error:", error);

        // 2. Rollback UI
        if (wasSaved) {
            btn.innerHTML = '<i class="fa-solid fa-heart"></i> Saved';
            btn.classList.add('active');
        } else {
            btn.innerHTML = '<i class="fa-regular fa-heart"></i> Add to Favorites';
            btn.classList.remove('active');
        }
        showToast("Failed to update favorite", "error");
    }
}

function setupInteractionButtons(productId, product) {
    // Favorites
    const favBtn = document.getElementById('fav-btn');
    if (favBtn) {
        if (auth.currentUser) {
            // Check status
            const favRef = doc(db, "favorites", `${auth.currentUser.uid}_${productId}`);
            getDoc(favRef).then(snap => {
                if (snap.exists()) {
                    favBtn.innerHTML = '<i class="fa-solid fa-heart"></i> Saved';
                    favBtn.classList.add('active');
                }
            });
        }
        favBtn.onclick = () => toggleFavorite(productId, favBtn, product);
    }

    // Wishlist
    const wishlistBtn = document.getElementById('wishlist-btn');
    if (wishlistBtn) {
        // Check if already in wishlist
        checkWishlistStatus(productId).then(isInWishlist => {
            if (isInWishlist) {
                wishlistBtn.innerHTML = '<i class="fa-solid fa-heart"></i> In Wishlist';
                wishlistBtn.style.color = '#ef4444';
            }
        });

        wishlistBtn.onclick = () => {
            if (!auth.currentUser) {
                showToast('Please login to add items to wishlist', 'error');
                return;
            }
            showWishlistModal(productId, product.title, product.image);
        };
    }

    // Share
    const shareTrigger = document.querySelector('.share-trigger');
    if (shareTrigger) {
        shareTrigger.onclick = () => {
            const dropdown = document.querySelector('.share-dropdown');
            if (dropdown) dropdown.classList.toggle('active');
        };
    }
}

function setupImageGallery(product) {
    const mainImage = document.getElementById('main-image');
    if (!mainImage) return;

    // Collect all images
    const images = [product.image || 'https://placehold.co/600x400'];
    if (product.images && product.images.length > 0) {
        images.push(...product.images);
    }

    // Add click handler to main image
    mainImage.style.cursor = 'pointer';
    mainImage.addEventListener('click', () => {
        const currentSrc = mainImage.src;
        const startIndex = images.findIndex(img => img === currentSrc) || 0;
        gallery.open(images, startIndex);
    });

    // Add click handlers to thumbnails (if they exist)
    const thumbnails = document.querySelectorAll('.main-image-wrapper + div img');
    thumbnails.forEach((thumb, index) => {
        thumb.style.cursor = 'pointer';
        const originalOnclick = thumb.onclick;
        thumb.onclick = (e) => {
            if (originalOnclick) originalOnclick.call(thumb, e);
            // Double click to open gallery
        };
        thumb.addEventListener('dblclick', () => {
            gallery.open(images, index + 1); // +1 because first image is main
        });
    });
}

// Handle Buy (Chat) Click
window.handleBuy = async function () {
    if (!auth.currentUser) {
        showToast("Login to contact owner", "info");
        return;
    }
    if (!window.currentProduct) return;

    await startChatWithOwner(
        window.currentProduct.ownerId,
        window.currentProduct.id,
        window.currentProduct.title
    );
};

window.handleClaim = function () {
    window.handleBuy(); // Same logic, just opening chat
}

// Wishlist Modal HTML (inject into DOM)
function createWishlistModal() {
    const modalHTML = `
        <div id="wishlist-modal" role="dialog" aria-modal="true" aria-labelledby="wishlist-title" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; align-items:center; justify-content:center;">
            <div style="background:white; border-radius:1rem; padding:2rem; max-width:500px; width:90%; box-shadow:0 20px 25px -5px rgba(0,0,0,0.3);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                    <h2 id="wishlist-title" style="margin:0;">Add to Wishlist 💖</h2>
                    <button onclick="closeWishlistModal()" aria-label="Close" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--gray);">&times;</button>
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

    // Close on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('wishlist-modal').style.display === 'flex') {
            closeWishlistModal();
        }
    });
}

// Show wishlist modal
let currentWishlistItem = null;
let wishlistTrap = null;

window.showWishlistModal = (listingId, listingTitle, listingImage) => {
    currentWishlistItem = { listingId, listingTitle, listingImage };

    const modal = document.getElementById('wishlist-modal');
    if (!modal) {
        createWishlistModal();
    }

    // Refresh ref in case created
    const modalEl = document.getElementById('wishlist-modal');
    modalEl.style.display = 'flex';
    document.getElementById('wishlist-notes').value = '';
    document.getElementById('wishlist-priority').value = 'medium';

    // Init Logic for Focus Trap
    if (!wishlistTrap) {
        wishlistTrap = new FocusTrap(modalEl);
    }
    wishlistTrap.activate();
};

window.closeWishlistModal = () => {
    document.getElementById('wishlist-modal').style.display = 'none';
    currentWishlistItem = null;
    if (wishlistTrap) {
        wishlistTrap.deactivate();
    }
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

// --- 7. Smart Recommendations ---

// Define Related Category Mappings
const RELATED_CATEGORIES = {
    'Books': ['Electronics', 'Furniture'],
    'Electronics': ['Camera', 'Audio'],
    'Camera': ['Electronics', 'Travel'],
    'Furniture': ['Decor', 'Books'],
    'Clothing': ['Accessories', 'Jewelry'],
    'Fitness': ['Sports', 'Health'],
    'Camping': ['Hiking', 'Travel', 'Sports'],
    'Tools': ['Garden', 'DIY'],
    'Vehicles': ['Tools', 'Accessories']
};

async function loadRecommendations(category, currentId) {
    const recContainer = document.getElementById('recommendation-container');
    if (!recContainer) return; // Prevent "Cannot set innerHTML of null"

    recContainer.innerHTML = '<div class="loader-spinner" style="margin:2rem auto;"></div>';

    try {
        const q = query(
            collection(db, "listings"),
            where("category", "==", category),
            where("status", "in", ["active", "approved"]),
            limit(4)
        );
        const snap = await getDocs(q);
        let items = [];
        snap.forEach(doc => {
            if (doc.id !== currentId) items.push({ id: doc.id, ...doc.data() });
        });

        if (items.length === 0) {
            recContainer.innerHTML = `<p style="text-align:center; color:var(--gray); width:100%;">No similar items found.</p>`;
            return;
        }

        recContainer.innerHTML = items.map(item => `
            <div class="product-card" onclick="window.location.href='/product.html?id=${item.id}'">
                <div class="product-img-wrapper" style="height: 180px;">
                    <img src="${item.image}" alt="${item.title}">
                </div>
                <div class="product-info">
                     <h3 style="font-size: 1rem;">${item.title}</h3>
                     <div class="product-price">₹${item.rates?.daily || item.salePrice || 0}</div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error("Recs error:", error);
        recContainer.innerHTML = "";
    }
}

function renderListingCard(product) {
    return `
        <div class="product-card" onclick="window.location.href='/product.html?id=${product.id}'">
            <div class="product-img-wrapper" style="height: 180px;">
                <img src="${product.image}" alt="${product.title}">
                <div class="category-badge">${product.category}</div>
            </div>
            <div class="product-info">
                 <h3 class="product-title" style="font-size: 1rem;">${product.title}</h3>
                 <div class="product-price">₹${product.rates?.daily || product.salePrice} <span style="font-size:0.7rem; font-weight:400;">${product.rates?.daily ? '/ day' : '(Buy)'}</span></div>
            </div>
        </div>
    `;
}
