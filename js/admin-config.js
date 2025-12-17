// Admin Configuration
// This file contains admin panel configuration settings

import { ENV } from './env.js';

export const ADMIN_CONFIG = {
    // List of authorized admin email addresses
    // HARDCODED FOR NOW - will refine env var loading later
    authorizedEmails: ENV.ADMIN_EMAILS,

    // Admin panel settings
    settings: {
        // Maximum items to load per query
        queryLimit: 50,

        // Default date range for filters (days)
        defaultDateRange: 30,

        // Auto-refresh interval for dashboard (milliseconds, 0 = disabled)
        autoRefreshInterval: 0,
    },

    // Feature flags
    features: {
        enableExports: true,
        enableDisputes: true,
        enableReports: true,
        enableAnalytics: true,
    }
};

// Helper function to check if email is admin
export function isAdminEmail(email) {
    if (!email) return false;
    return ADMIN_CONFIG.authorizedEmails.includes(email.toLowerCase());
}

// Add a new admin (would require authentication in production)
export function addAdmin(email) {
    if (!ADMIN_CONFIG.authorizedEmails.includes(email.toLowerCase())) {
        ADMIN_CONFIG.authorizedEmails.push(email.toLowerCase());
        return true;
    }
    return false;
}

// Remove an admin (would require authentication in production)
export function removeAdmin(email) {
    const index = ADMIN_CONFIG.authorizedEmails.indexOf(email.toLowerCase());
    if (index > -1) {
        ADMIN_CONFIG.authorizedEmails.splice(index, 1);
        return true;
    }
    return false;
}
