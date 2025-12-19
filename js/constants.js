/**
 * Application Constants
 * Centralized constants to avoid magic numbers and improve maintainability
 */

// ====== PAGINATION & LIMITS ======
export const HOME_PAGE_LISTING_LIMIT = 8;
export const SEARCH_RESULTS_PER_PAGE = 20;
export const MY_LISTINGS_PAGE_SIZE = 10;
export const MY_BOOKINGS_PAGE_SIZE = 10;
export const RECOMMENDATIONS_LIMIT = 4;

// ====== UI TIMING (in milliseconds) ======
export const BOOKING_COOLDOWN_SECONDS = 5;
export const TOAST_DURATION_MS = 3000;
export const MAX_VISIBLE_TOASTS = 3;
export const DRAFT_SAVE_INTERVAL_MS = 30000; // 30 seconds
export const NOTIFICATION_POLL_INTERVAL_MS = 60000; // 1 minute

// ====== FILE UPLOAD ======
export const MAX_LISTING_IMAGES = 5;
export const MAX_FILE_SIZE_MB = 2;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// ====== PRICING & CURRENCY ======
export const CURRENCY_SYMBOL = '₹';
export const DEFAULT_DAILY_RATE = 0;
export const DEFAULT_DEPOSIT = 0;

// ====== IMAGE COMPRESSION ======
export const IMAGE_COMPRESSION_QUALITY = 0.7;
export const IMAGE_MAX_WIDTH = 1200;
export const IMAGE_MAX_HEIGHT = 1200;

// ====== BUSINESS RULES ======
export const MIN_RENTAL_DAYS = 1;
export const MAX_RENTAL_DAYS = 365;
export const BOOKING_MIN_ADVANCE_HOURS = 2;

// ====== STATUS VALUES ======
export const LISTING_STATUS = {
    DRAFT: 'draft',
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    ARCHIVED: 'archived'
};

export const BOOKING_STATUS = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
};

export const TRANSACTION_TYPES = {
    RENT: 'rent',
    SELL: 'sell',
    DONATE: 'donate'
};

// ====== FIRESTORE LIMITS ======
export const FIRESTORE_IN_QUERY_LIMIT = 10; // Max items in 'in' query
export const FIRESTORE_BATCH_SIZE = 500; // Max writes per batch
export const FIRESTORE_ADMIN_LIST_LIMIT = 50; // Admin panel list limits

// ====== NOTIFICATIONS ======
export const NOTIFICATIONS_DISPLAY_LIMIT = 10;
export const UNREAD_BADGE_MAX_DISPLAY = 9; // Shows "9+" for more

// ====== CACHE SETTINGS ======
export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const DATA_CACHE_TTL_MS = 60 * 1000; // 1 minute

// ====== ACTIVITY THRESHOLDS ======
export const ACTIVE_USER_DAYS_THRESHOLD = 7; // Days since last activity to count as "active"

// ====== DEBOUNCE/THROTTLE ======
export const DEBOUNCE_DEFAULT_MS = 300;
export const THROTTLE_DEFAULT_MS = 300;
