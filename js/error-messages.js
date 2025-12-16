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
