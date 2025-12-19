/**
 * UI Error Boundary Utility
 * Provides graceful error handling for UI components and async operations
 * 
 * Prevents blank screens and provides user-friendly error messages
 */

/**
 * Wrap a UI render function with error boundary
 * Shows a friendly error message instead of breaking the page
 * 
 * @param {HTMLElement|string} container - Container element or selector
 * @param {Function} renderFn - Async function that renders content
 * @param {Object} options - Configuration options
 * @param {string} options.errorTitle - Title shown on error (default: "Something went wrong")
 * @param {string} options.errorMessage - Message shown on error
 * @param {string} options.retryLabel - Label for retry button (default: "Try Again")
 * @param {boolean} options.showRetry - Whether to show retry button (default: true)
 * @returns {Promise<boolean>} - True if render succeeded, false if error
 * 
 * @example
 * await renderWithBoundary('#my-container', async () => {
 *     const data = await fetchData();
 *     container.innerHTML = renderTemplate(data);
 * });
 */
export async function renderWithBoundary(container, renderFn, options = {}) {
    const {
        errorTitle = 'Something went wrong',
        errorMessage = 'We couldn\'t load this content. Please try again.',
        retryLabel = 'Try Again',
        showRetry = true
    } = options;

    const element = typeof container === 'string'
        ? document.querySelector(container)
        : container;

    if (!element) {
        console.error('renderWithBoundary: Container not found');
        return false;
    }

    try {
        await renderFn();
        return true;
    } catch (error) {
        console.error('UI Error Boundary caught error:', error);

        // Generate unique ID for retry button
        const retryId = `retry-${Date.now()}`;

        element.innerHTML = `
            <div class="error-boundary" style="
                text-align: center;
                padding: 3rem 2rem;
                background: #fef2f2;
                border-radius: 1rem;
                border: 1px solid #fecaca;
            ">
                <div style="margin-bottom: 1rem;">
                    <i class="fa-solid fa-triangle-exclamation" style="
                        font-size: 3rem;
                        color: #ef4444;
                    "></i>
                </div>
                <h3 style="
                    color: #991b1b;
                    margin-bottom: 0.5rem;
                    font-size: 1.25rem;
                ">${errorTitle}</h3>
                <p style="
                    color: #7f1d1d;
                    margin-bottom: 1.5rem;
                    font-size: 0.95rem;
                ">${errorMessage}</p>
                ${showRetry ? `
                    <button id="${retryId}" class="btn btn-primary" style="
                        background: #ef4444;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 0.5rem;
                        color: white;
                        cursor: pointer;
                        font-size: 1rem;
                    ">
                        <i class="fa-solid fa-rotate-right"></i> ${retryLabel}
                    </button>
                ` : ''}
            </div>
        `;

        // Add retry handler
        if (showRetry) {
            const retryBtn = document.getElementById(retryId);
            if (retryBtn) {
                retryBtn.addEventListener('click', () => {
                    // Show loading state
                    element.innerHTML = `
                        <div style="text-align: center; padding: 3rem;">
                            <div class="spinner" style="
                                width: 40px;
                                height: 40px;
                                border: 4px solid #e2e8f0;
                                border-top-color: #4f46e5;
                                border-radius: 50%;
                                animation: spin 0.8s linear infinite;
                                margin: 0 auto 1rem;
                            "></div>
                            <p style="color: var(--gray);">Loading...</p>
                        </div>
                    `;
                    // Retry
                    renderWithBoundary(element, renderFn, options);
                });
            }
        }

        return false;
    }
}

/**
 * Global error handler for uncaught errors
 * Prevents blank screens by showing a recovery UI
 */
export function initGlobalErrorHandler() {
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);

        // Don't show for script/resource load errors
        if (event.target !== window) return;

        // Show toast if available
        if (window.showToast) {
            window.showToast('An unexpected error occurred', 'error');
        }
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled rejection:', event.reason);

        // Show toast if available
        if (window.showToast) {
            window.showToast('An unexpected error occurred', 'error');
        }

        // Prevent the default handling (console error)
        event.preventDefault();
    });
}

/**
 * Safe JSON parse that returns null on error instead of throwing
 * @param {string} json - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails (default: null)
 * @returns {*} Parsed object or fallback
 */
export function safeJsonParse(json, fallback = null) {
    try {
        return JSON.parse(json);
    } catch {
        return fallback;
    }
}

/**
 * Safe localStorage access that handles quota errors and missing storage
 */
export const safeStorage = {
    get(key, fallback = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? safeJsonParse(item, fallback) : fallback;
        } catch {
            return fallback;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn('localStorage set failed:', error);
            return false;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch {
            return false;
        }
    }
};
