/**
 * Skeleton Loader Utility
 * Show skeleton screens while data is loading
 */

/**
 * Generate skeleton card HTML
 * @param {number} count - Number of skeleton cards
 * @returns {string} HTML string
 */
export function generateSkeletonCards(count: number = 6): string {
    const skeletons: string[] = [];
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
 * Generate skeleton details HTML (for Product Details page)
 * @returns {string} HTML string
 */
export function generateSkeletonDetails(): string {
    return `
        <div class="skeleton-details">
            <div class="skeleton-image-large" style="height: 400px; width: 100%; border-radius: 1rem; margin-bottom: 2rem;"></div>
            <div class="skeleton-title" style="height: 40px; width: 60%; margin-bottom: 1rem;"></div>
            <div class="skeleton-text" style="height: 20px; width: 40%; margin-bottom: 2rem;"></div>
            <div class="skeleton-text" style="height: 20px; width: 100%; margin-bottom: 0.5rem;"></div>
            <div class="skeleton-text" style="height: 20px; width: 100%; margin-bottom: 0.5rem;"></div>
            <div class="skeleton-text" style="height: 20px; width: 80%; margin-bottom: 2rem;"></div>
        </div>
    `;
}

/**
 * Show skeleton loader in container
 * @param {string|HTMLElement} container - Container element or selector
 * @param {number} count - Number of skeletons
 */
export function showSkeletonLoader(container: string | HTMLElement, count: number = 6): void {
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
export function hideSkeletonLoader(container: string | HTMLElement, content: string): void {
    const element = typeof container === 'string' ? document.querySelector(container) : container;
    if (element) {
        element.innerHTML = content;
    }
}
