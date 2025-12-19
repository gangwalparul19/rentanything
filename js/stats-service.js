/**
 * Firestore Stats Service
 * Manages aggregate statistics to avoid expensive full collection fetches
 */

import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, runTransaction } from 'firebase/firestore';

// Stats document paths
const PLATFORM_STATS_PATH = 'stats/platform_stats';

/**
 * Get platform-wide statistics
 * @returns {Object} Platform stats
 */
export async function getPlatformStats() {
    try {
        const statsDoc = await getDoc(doc(db, PLATFORM_STATS_PATH));

        if (!statsDoc.exists()) {
            // Initialize if doesn't exist
            await initializePlatformStats();
            return await getPlatformStats();
        }

        return statsDoc.data();
    } catch (error) {
        console.error('Error getting platform stats:', error);
        // Return default structure
        return getDefaultStats();
    }
}

/**
 * Initialize platform stats document with defaults
 */
export async function initializePlatformStats() {
    const defaultStats = getDefaultStats();

    try {
        await setDoc(doc(db, PLATFORM_STATS_PATH), defaultStats);
        console.log('Platform stats initialized');
    } catch (error) {
        console.error('Error initializing stats:', error);
    }
}

/**
 * Get default stats structure
 */
function getDefaultStats() {
    return {
        users: {
            total: 0,
            verified: 0,
            newThisMonth: 0,
            lastUpdated: new Date()
        },
        listings: {
            total: 0,
            active: 0,
            pending: 0,
            soldThisMonth: 0,
            lastUpdated: new Date()
        },
        bookings: {
            total: 0,
            activeNow: 0,
            thisMonth: 0,
            pendingApproval: 0,
            lastUpdated: new Date()
        },
        revenue: {
            total: 0,
            thisMonth: 0,
            avgPerBooking: 0,
            lastUpdated: new Date()
        },
        properties: {
            total: 0,
            available: 0,
            pending: 0,
            lastUpdated: new Date()
        },
        lastFullUpdate: new Date()
    };
}

/**
 * Increment a stat counter
 * @param {string} category - Category (users, listings, bookings, etc.)
 * @param {string} field - Field name (total, active, etc.)
 * @param {number} amount - Amount to increment (default: 1)
 */
export async function incrementStat(category, field, amount = 1) {
    try {
        const statsRef = doc(db, PLATFORM_STATS_PATH);
        const updatePath = `${category}.${field}`;

        await updateDoc(statsRef, {
            [updatePath]: increment(amount),
            [`${category}.lastUpdated`]: serverTimestamp()
        });
    } catch (error) {
        console.error(`Error incrementing ${category}.${field}:`, error);
    }
}

/**
 * Decrement a stat counter
 * @param {string} category - Category (users, listings, bookings, etc.)
 * @param {string} field - Field name (total, active, etc.)
 * @param {number} amount - Amount to decrement (default: 1)
 */
export async function decrementStat(category, field, amount = 1) {
    await incrementStat(category, field, -amount);
}

/**
 * Update multiple stats atomically
 * @param {Object} updates - Object with category.field: value pairs
 */
export async function updateStats(updates) {
    try {
        const statsRef = doc(db, PLATFORM_STATS_PATH);

        // Add timestamp for each category being updated
        const categories = new Set();
        Object.keys(updates).forEach(key => {
            const category = key.split('.')[0];
            categories.add(category);
        });

        categories.forEach(category => {
            updates[`${category}.lastUpdated`] = serverTimestamp();
        });

        await updateDoc(statsRef, updates);
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

/**
 * User Stats - individual user counters
 */

/**
 * Get user-specific stats
 * @param {string} userId 
 */
export async function getUserStats(userId) {
    try {
        const statsDoc = await getDoc(doc(db, `stats/user_stats/${userId}`));

        if (!statsDoc.exists()) {
            return {
                bookingsCount: 0,
                listingsCount: 0,
                totalSpent: 0,
                totalEarned: 0,
                rating: 0,
                reviewsCount: 0
            };
        }

        return statsDoc.data();
    } catch (error) {
        console.error('Error getting user stats:', error);
        return null;
    }
}

/**
 * Initialize user stats
 * @param {string} userId 
 */
export async function initializeUserStats(userId) {
    try {
        await setDoc(doc(db, `stats/user_stats/${userId}`), {
            bookingsCount: 0,
            listingsCount: 0,
            totalSpent: 0,
            totalEarned: 0,
            rating: 0,
            reviewsCount: 0,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error initializing user stats:', error);
    }
}

/**
 * Increment user stat
 * @param {string} userId 
 * @param {string} field 
 * @param {number} amount 
 */
export async function incrementUserStat(userId, field, amount = 1) {
    try {
        const statsRef = doc(db, `stats/user_stats/${userId}`);
        await updateDoc(statsRef, {
            [field]: increment(amount)
        });
    } catch (error) {
        console.error(`Error incrementing user stat ${field}:`, error);
    }
}

/**
 * Helper functions for common operations
 */

// User created
export async function onUserCreated() {
    await incrementStat('users', 'total');
    await incrementStat('users', 'newThisMonth');
}

// User deleted
export async function onUserDeleted() {
    await decrementStat('users', 'total');
}

// User verified
export async function onUserVerified() {
    await incrementStat('users', 'verified');
}

// Listing created
export async function onListingCreated() {
    await incrementStat('listings', 'total');
    await incrementStat('listings', 'active');
}

// Listing deleted
export async function onListingDeleted(wasActive = true) {
    await decrementStat('listings', 'total');
    if (wasActive) {
        await decrementStat('listings', 'active');
    }
}

// Listing sold
export async function onListingSold() {
    await decrementStat('listings', 'active');
    await incrementStat('listings', 'soldThisMonth');
}

// Booking created
export async function onBookingCreated(amount) {
    await updateStats({
        'bookings.total': increment(1),
        'bookings.activeNow': increment(1),
        'bookings.thisMonth': increment(1),
        'revenue.total': increment(amount),
        'revenue.thisMonth': increment(amount)
    });
}

// Booking completed
export async function onBookingCompleted() {
    await decrementStat('bookings', 'activeNow');
}

// Booking cancelled
export async function onBookingCancelled(amount) {
    await updateStats({
        'bookings.activeNow': increment(-1),
        'revenue.total': increment(-amount),
        'revenue.thisMonth': increment(-amount)
    });
}

// Property created
export async function onPropertyCreated() {
    await incrementStat('properties', 'total');
    await incrementStat('properties', 'pending');
}

// Property approved
export async function onPropertyApproved() {
    await updateStats({
        'properties.pending': increment(-1),
        'properties.available': increment(1)
    });
}

// Property rejected
export async function onPropertyRejected() {
    await updateStats({
        'properties.pending': increment(-1),
        'properties.total': increment(-1)
    });
}

/**
 * Recalculate average booking value
 * Should be called periodically or after bulk updates
 */
export async function recalculateAverages() {
    try {
        const stats = await getPlatformStats();

        if (stats.bookings.total > 0) {
            const avgPerBooking = Math.round(stats.revenue.total / stats.bookings.total);

            await updateDoc(doc(db, PLATFORM_STATS_PATH), {
                'revenue.avgPerBooking': avgPerBooking,
                'revenue.lastUpdated': serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Error recalculating averages:', error);
    }
}

// Export all
export default {
    getPlatformStats,
    initializePlatformStats,
    incrementStat,
    decrementStat,
    updateStats,
    getUserStats,
    initializeUserStats,
    incrementUserStat,
    // Event handlers
    onUserCreated,
    onUserDeleted,
    onUserVerified,
    onListingCreated,
    onListingDeleted,
    onListingSold,
    onBookingCreated,
    onBookingCompleted,
    onBookingCancelled,
    onPropertyCreated,
    onPropertyApproved,
    onPropertyRejected,
    recalculateAverages
};
