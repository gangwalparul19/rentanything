/**
 * Skeleton Loader Utility
 * Show skeleton screens while data is loading
 */

/**
 * Generate skeleton card HTML
 * @param {number} count - Number of skeleton cards
 * @returns {string} HTML string
 */
export function generateSkeletonCards(count = 6) {
    const skeletons = [];
    for (let i = 0; i < count; i++) {
        skeletons.push(`
            <div class="skeleton-card">
                <div class="skeleton-image"></div>
                <div class="skeleton-title"></div>
                <div class="skeleton-text"></div>
                <div class="skeleton-button"></div>
            </div>
        `);
    }
    return skeletons.join('');
}

/**
 * Show skeleton loader in container
 * @param {string|HTMLElement} container - Container element or selector
 * @param {number} count - Number of skeletons
 */
export function showSkeletonLoader(container, count = 6) {
    const element = typeof container === 'string' ? document.querySelector(container) : container;
    if (element) {
        element.innerHTML = generateSkeletonCards(count);
    }
}

/**
 * Hide skeleton loader and show content
 * @param {string|HTMLElement} container - Container element or selector
 * @param {string} content - HTML content to show
 */
export function hideSkeletonLoader(container, content) {
    const element = typeof container === 'string' ? document.querySelector(container) : container;
    if (element) {
        element.innerHTML = content;
    }
}
