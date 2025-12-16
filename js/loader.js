/**
 * Global Loader Utility
 * Provides showLoader(message?) and hideLoader() functions.
 */

// Inject Loader HTML into the DOM if it doesn't exist
function ensureLoaderExists() {
    if (!document.getElementById('global-loader')) {
        const loaderHTML = `
            <div id="global-loader" class="loader-overlay">
                <div class="loader-spinner"></div>
                <div id="loader-message" class="loader-text">Loading...</div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', loaderHTML);
    }
}

/**
 * Shows the full-screen loader.
 * @param {string} message - Optional text to display (default: "Loading...")
 */
export function showLoader(message = "Loading...") {
    ensureLoaderExists();
    const loader = document.getElementById('global-loader');
    const msgEl = document.getElementById('loader-message');
    if (msgEl) msgEl.textContent = message;
    loader.classList.add('active');
}

/**
 * Hides the full-screen loader.
 */
export function hideLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.classList.remove('active');
    }
}
