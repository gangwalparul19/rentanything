/**
 * Global Exports Registry
 * 
 * This file documents and centralizes all global window.* assignments
 * used throughout the application for onclick handlers in HTML templates.
 * 
 * WHY GLOBAL ASSIGNMENTS EXIST:
 * -----------------------------
 * When HTML is generated dynamically via innerHTML with onclick handlers,
 * those handlers can only call functions that are on the window object.
 * ES modules don't automatically expose functions to window.
 * 
 * ALTERNATIVES (for future refactoring):
 * --------------------------------------
 * 1. Event Delegation: Attach one listener to a parent, check event.target
 * 2. data-* Attributes: Use data-action="..." and handle in delegated listener
 * 3. Template Elements: Use <template> elements with cloneNode
 * 4. Web Components: Create custom elements with encapsulated behavior
 * 
 * CURRENT GLOBAL FUNCTIONS:
 * -------------------------
 * The following functions are intentionally exposed to window for HTML onclick handlers:
 */

// ============================================
// LISTING MANAGEMENT
// ============================================
// window.editListing - Edit a listing (my-listings.js)
// window.deleteListing - Delete a listing (my-listings.js)
// window.refreshListings - Refresh listings grid (my-listings.js)

// ============================================
// WISHLIST & FAVORITES
// ============================================
// window.removeFromWishlist - Remove item from wishlist (wishlist.js)
// window.viewItem - Navigate to item details (wishlist.js)
// window.toggleSaved - Toggle bookmark on search (search.js)

// ============================================
// BOOKING
// ============================================
// window.cancelBooking - Cancel a pending booking (my-bookings.js)
// window.viewBookingDetails - View booking modal (my-bookings.js)

// ============================================
// CHAT
// ============================================
// window.loadChat - Load a specific chat conversation (chat.js)
// window.replyToRequest - Start chat from request board (requests.js)

// ============================================
// ADMIN PANEL
// ============================================
// window.showSection - Navigate between admin sections (admin.js)
// window.logoutAdmin - Admin logout (admin.js)
// window.approveListing - Approve pending listing (admin.js)
// window.rejectListing - Reject pending listing (admin.js)
// window.approveProperty - Approve property (admin.js)
// window.rejectProperty - Reject property (admin.js)
// window.viewDisputeDetails - View dispute modal (admin.js)
// window.filterDisputes - Filter disputes table (admin.js)

// ============================================
// PRODUCT DETAILS
// ============================================
// window.bookNow - Book the current product (product-details.js)
// window.showWishlistModal - Show wishlist modal (product-details.js)
// window.closeWishlistModal - Close wishlist modal (product-details.js)
// window.confirmAddToWishlist - Add to wishlist (product-details.js)

// ============================================
// SEARCH & FILTERS
// ============================================
// window.clearFilters - Clear all search filters (search.js)
// window.applyFilters - Apply search filters (search.js)

// ============================================
// UI COMPONENTS
// ============================================
// window.showToast - Show toast notification (toast-enhanced.js)
// window.EmptyState - Empty state component class (empty-state.js)

// ============================================
// AUTH
// ============================================
// window.openLoginModal - Open login dialog (auth.js)
// window.logout - User logout (auth.js)

/**
 * HELPER: Export function to window with optional namespace
 * @param {string} name - Global function name
 * @param {Function} fn - Function to export
 * @param {string} namespace - Optional namespace (e.g., 'admin')
 */
export function exposeToWindow(name, fn, namespace = null) {
    if (namespace) {
        window[namespace] = window[namespace] || {};
        window[namespace][name] = fn;
    } else {
        window[name] = fn;
    }
}

/**
 * ALTERNATIVE: Event delegation helper
 * Use this pattern instead of onclick handlers for new code
 * 
 * @example
 * // In your HTML template:
 * `<button data-action="delete" data-id="${item.id}">Delete</button>`
 * 
 * // In your JS:
 * delegateEvents(container, {
 *     'delete': (target) => deleteItem(target.dataset.id),
 *     'edit': (target) => editItem(target.dataset.id)
 * });
 */
export function delegateEvents(container, handlers) {
    const element = typeof container === 'string'
        ? document.querySelector(container)
        : container;

    if (!element) return;

    element.addEventListener('click', (e) => {
        const actionElement = e.target.closest('[data-action]');
        if (!actionElement) return;

        const action = actionElement.dataset.action;
        if (handlers[action]) {
            e.preventDefault();
            handlers[action](actionElement, e);
        }
    });
}
