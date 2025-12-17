/**
 * Empty State Templates
 * Reusable empty state HTML generators
 */

export const emptyStates = {
    search: () => `
        <div class="empty-state empty-state-search">
            <div class="empty-state-icon">
                <i class="fa-solid fa-magnifying-glass"></i>
            </div>
            <h3 class="empty-state-title">No results found</h3>
            <p class="empty-state-description">
                Try adjusting your filters or search in a different area.
                We're constantly adding new items!
            </p>
            <div class="empty-state-actions">
                <button class="btn btn-outline" onclick="window.clearFilters()">
                    <i class="fa-solid fa-filter-circle-xmark"></i> Clear Filters
                </button>
                <a href="/index.html" class="btn btn-primary">
                    <i class="fa-solid fa-home"></i> Back to Home
                </a>
            </div>
        </div>
    `,

    wishlist: () => `
        <div class="empty-state empty-state-wishlist">
            <div class="empty-state-icon">
                <i class="fa-regular fa-heart"></i>
            </div>
            <h3 class="empty-state-title">Your wishlist is empty</h3>
            <p class="empty-state-description">
                Save items you love to your wishlist and rent them later!
            </p>
            <div class="empty-state-actions">
                <a href="/search.html" class="btn btn-primary">
                    <i class="fa-solid fa-magnifying-glass"></i> Browse Listings
                </a>
            </div>
        </div>
    `,

    myListings: () => `
        <div class="empty-state">
            <div class="empty-state-icon">
                <i class="fa-solid fa-box-open"></i>
            </div>
            <h3 class="empty-state-title">You haven't listed anything yet</h3>
            <p class="empty-state-description">
                Start earning by renting out items you're not using!
            </p>
            <div class="empty-state-actions">
                <a href="/create-listing.html" class="btn btn-primary">
                    <i class="fa-solid fa-plus"></i> Create Your First Listing
                </a>
            </div>
        </div>
    `,

    bookings: () => `
        <div class="empty-state empty-state-bookings">
            <div class="empty-state-icon">
                <i class="fa-solid fa-calendar-xmark"></i>
            </div>
            <h3 class="empty-state-title">No bookings yet</h3>
            <p class="empty-state-description">
                Browse our listings and rent something awesome!
            </p>
            <div class="empty-state-actions">
                <a href="/search.html" class="btn btn-primary">
                    <i class="fa-solid fa-magnifying-glass"></i> Browse Items
                </a>
            </div>
        </div>
    `,

    chat: () => `
        <div class="empty-state empty-state-chat">
            <div class="empty-state-icon">
                <i class="fa-regular fa-comments"></i>
            </div>
            <h3 class="empty-state-title">No conversations yet</h3>
            <p class="empty-state-description">
                Start chatting with neighbors about items you want to rent!
            </p>
            <div class="empty-state-actions">
                <a href="/search.html" class="btn btn-primary">
                    <i class="fa-solid fa-magnifying-glass"></i> Find Items
                </a>
            </div>
        </div>
    `
};

/**
 * Show empty state in container
 * @param {string|HTMLElement} container - Container element or selector
 * @param {string} type - Type of empty state (search, wishlist, etc.)
 */
export function showEmptyState(container, type) {
    const element = typeof container === 'string' ? document.querySelector(container) : container;
    if (element && emptyStates[type]) {
        element.innerHTML = emptyStates[type]();
    }
}
