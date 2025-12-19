/**
 * Standardized Error and Success Messages
 * Centralized messages for consistent user experience
 */

// ====== ERROR MESSAGES ======
export const ERROR_MESSAGES = {
    // Network & Loading
    FETCH_FAILED: 'Unable to load data. Please check your connection.',
    LOAD_FAILED: 'Failed to load. Please try again.',
    SAVE_FAILED: 'Failed to save changes. Please try again.',
    UPLOAD_FAILED: 'Upload failed. Please try again.',
    DELETE_FAILED: 'Failed to delete. Please try again.',
    UPDATE_FAILED: 'Failed to update. Please try again.',

    // Authentication
    LOGIN_REQUIRED: 'Please log in to continue.',
    LOGIN_FAILED: 'Login failed. Please try again.',
    LOGOUT_FAILED: 'Logout failed. Please try again.',
    PERMISSION_DENIED: 'You don\'t have permission to do that.',
    SESSION_EXPIRED: 'Your session has expired. Please log in again.',

    // Validation
    INVALID_FILE: 'Invalid file. Please select a valid image.',
    FILE_TOO_LARGE: 'File is too large. Maximum size is 2MB.',
    FIELD_REQUIRED: 'This field is required.',
    INVALID_INPUT: 'Please enter valid information.',
    INVALID_EMAIL: 'Please enter a valid email address.',
    INVALID_PHONE: 'Please enter a valid phone number.',
    INVALID_DATE: 'Please select a valid date.',
    INVALID_PRICE: 'Please enter a valid price.',

    // Booking
    BOOKING_FAILED: 'Booking request failed. Please try again.',
    INVALID_DATES: 'Please select valid dates.',
    DATES_UNAVAILABLE: 'Selected dates are not available.',

    // Generic
    SOMETHING_WRONG: 'Something went wrong. Please try again.',
    NOT_FOUND: 'Item not found.',
    NO_RESULTS: 'No results found.',
    SERVICE_UNAVAILABLE: 'Service temporarily unavailable.',
};

// ====== SUCCESS MESSAGES ======
export const SUCCESS_MESSAGES = {
    SAVED: 'Saved successfully!',
    UPLOADED: 'Upload complete!',
    SENT: 'Sent successfully!',
    UPDATED: 'Updated successfully!',
    DELETED: 'Deleted successfully!',
    CREATED: 'Created successfully!',

    // Specific actions
    LISTING_CREATED: 'Listing created successfully!',
    LISTING_UPDATED: 'Listing updated successfully!',
    BOOKING_SENT: 'Booking request sent!',
    PROFILE_UPDATED: 'Profile updated successfully!',
    MESSAGE_SENT: 'Message sent!',
};

// ====== INFO MESSAGES ======
export const INFO_MESSAGES = {
    LOADING: 'Loading...',
    PROCESSING: 'Processing...',
    UPLOADING: 'Uploading...',
    SAVING: 'Saving...',
    PLEASE_WAIT: 'Please wait...',
};

// ====== ERROR CODE MAPPING ======
const FIREBASE_ERROR_MAP = {
    'permission-denied': ERROR_MESSAGES.PERMISSION_DENIED,
    'unavailable': ERROR_MESSAGES.SERVICE_UNAVAILABLE,
    'not-found': ERROR_MESSAGES.NOT_FOUND,
    'unauthenticated': ERROR_MESSAGES.LOGIN_REQUIRED,
    'auth/popup-closed-by-user': 'Login cancelled',
    'auth/network-request-failed': 'Network error. Check your connection.',
};

/**
 * Centralized error handler for consistent error handling across the app
 * @param {Error} error - The error object
 * @param {string} context - Description of what operation failed (e.g., "loading profile")
 * @param {Object} options - Options
 * @param {boolean} options.showToast - Whether to show a toast (default: true)
 * @param {boolean} options.logToConsole - Whether to log to console (default: true)
 * @param {string} options.fallbackMessage - Fallback message if no mapping found
 * @returns {string} The user-friendly error message
 */
export function handleError(error, context = 'operation', options = {}) {
    const {
        showToast = true,
        logToConsole = true,
        fallbackMessage = ERROR_MESSAGES.SOMETHING_WRONG
    } = options;

    // Log to console for debugging
    if (logToConsole) {
        console.error(`Error during ${context}:`, error);
    }

    // Get user-friendly message
    let userMessage = fallbackMessage;

    // Check for Firebase error codes
    if (error?.code) {
        userMessage = FIREBASE_ERROR_MAP[error.code] || fallbackMessage;
    }
    // Check for standard error message
    else if (error?.message) {
        // Don't expose raw error messages that might contain sensitive info
        // Only use message if it's likely user-friendly (short, no stack traces)
        if (error.message.length < 100 && !error.message.includes('at ')) {
            userMessage = error.message;
        }
    }

    // Show toast notification if showToast is enabled
    if (showToast && typeof window !== 'undefined' && window.showToast) {
        window.showToast(userMessage, 'error');
    }

    return userMessage;
}

/**
 * Wrapper for async operations with consistent error handling
 * @param {Function} asyncFn - Async function to execute
 * @param {string} context - Description of the operation
 * @param {Object} options - Error handling options
 * @returns {Promise<[result, error]>} Tuple of [result, error]
 */
export async function safeAsync(asyncFn, context = 'operation', options = {}) {
    try {
        const result = await asyncFn();
        return [result, null];
    } catch (error) {
        const message = handleError(error, context, options);
        return [null, { error, message }];
    }
}
