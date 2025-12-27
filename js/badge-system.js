/**
 * Reputation System - Badges for RentAnything
 * Calculates and manages user badges based on activity and verification status
 */

import { db } from './firebase-config.js';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore';

// Badge Definitions
export const BADGES = {
    VERIFIED: {
        id: 'verified',
        name: 'Verified',
        icon: '✓',
        color: '#22c55e',
        bgColor: '#dcfce7',
        description: 'Identity verified',
        criteria: 'Complete ID verification'
    },
    SUPER_HOST: {
        id: 'super_host',
        name: 'Super Host',
        icon: '🏆',
        color: '#f59e0b',
        bgColor: '#fef3c7',
        description: '10+ rentals, 4.5+ rating',
        criteria: 'Complete 10+ rentals with 4.5+ average rating'
    },
    QUICK_RESPONDER: {
        id: 'quick_responder',
        name: 'Quick Responder',
        icon: '⚡',
        color: '#8b5cf6',
        bgColor: '#ede9fe',
        description: 'Responds within 1 hour',
        criteria: 'Maintain average response time under 1 hour'
    },
    PERFECT_SCORE: {
        id: 'perfect_score',
        name: 'Perfect Score',
        icon: '💯',
        color: '#ec4899',
        bgColor: '#fce7f3',
        description: 'All 5-star reviews',
        criteria: 'Receive only 5-star reviews (minimum 3)'
    },
    TRUSTED_RENTER: {
        id: 'trusted_renter',
        name: 'Trusted Renter',
        icon: '🎖️',
        color: '#3b82f6',
        bgColor: '#dbeafe',
        description: '5+ successful rentals',
        criteria: 'Complete 5+ rentals as a renter'
    },
    OG_MEMBER: {
        id: 'og_member',
        name: 'OG Member',
        icon: '📅',
        color: '#6366f1',
        bgColor: '#e0e7ff',
        description: 'Early adopter',
        criteria: 'Account created more than 6 months ago'
    },
    COMMUNITY_HELPER: {
        id: 'community_helper',
        name: 'Community Helper',
        icon: '🤝',
        color: '#14b8a6',
        bgColor: '#ccfbf1',
        description: 'Responds to community requests',
        criteria: 'Help 5+ community requests'
    }
};

/**
 * Calculate badges for a user based on their activity
 * @param {string} userId - User ID to calculate badges for
 * @returns {Promise<string[]>} Array of badge IDs the user has earned
 */
export async function calculateUserBadges(userId) {
    const earnedBadges = [];

    try {
        // Get user data
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) return earnedBadges;

        const userData = userSnap.data();

        // 1. VERIFIED - Check ID verification status
        if (userData.idVerificationStatus === 'verified') {
            earnedBadges.push('verified');
        }

        // 2. OG_MEMBER - Account > 6 months old
        if (userData.createdAt) {
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            const accountDate = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);

            if (accountDate < sixMonthsAgo) {
                earnedBadges.push('og_member');
            }
        }

        // 3. Get owner stats (completed rentals as owner)
        const ownerBookingsQuery = query(
            collection(db, 'bookings'),
            where('ownerId', '==', userId),
            where('status', '==', 'completed')
        );
        const ownerBookingsSnap = await getCountFromServer(ownerBookingsQuery);
        const ownerCompletedRentals = ownerBookingsSnap.data().count;

        // 4. SUPER_HOST - 10+ completed rentals + high rating
        if (ownerCompletedRentals >= 10) {
            const avgRating = userData.rating || userData.avgRating || 0;
            if (avgRating >= 4.5) {
                earnedBadges.push('super_host');
            }
        }

        // 5. Get renter stats (completed rentals as renter)
        const renterBookingsQuery = query(
            collection(db, 'bookings'),
            where('renterId', '==', userId),
            where('status', '==', 'completed')
        );
        const renterBookingsSnap = await getCountFromServer(renterBookingsQuery);
        const renterCompletedRentals = renterBookingsSnap.data().count;

        // 6. TRUSTED_RENTER - 5+ completed rentals as renter
        if (renterCompletedRentals >= 5) {
            earnedBadges.push('trusted_renter');
        }

        // 7. QUICK_RESPONDER - Check average response time
        if (userData.avgResponseTime && userData.avgResponseTime < 60) { // < 60 minutes
            earnedBadges.push('quick_responder');
        }

        // 8. PERFECT_SCORE - All 5-star reviews (min 3)
        if (userData.reviewCount >= 3 && userData.rating === 5) {
            earnedBadges.push('perfect_score');
        }

        // 9. COMMUNITY_HELPER - Helped 5+ community requests
        if (userData.communityHelps >= 5) {
            earnedBadges.push('community_helper');
        }

    } catch (error) {
        console.error('Error calculating badges:', error);
    }

    return earnedBadges;
}

/**
 * Update user's badges in Firestore
 * @param {string} userId - User ID to update badges for
 */
export async function updateUserBadges(userId) {
    try {
        const badges = await calculateUserBadges(userId);
        const userRef = doc(db, 'users', userId);

        await updateDoc(userRef, {
            badges: badges,
            badgesUpdatedAt: new Date()
        });

        return badges;
    } catch (error) {
        console.error('Error updating user badges:', error);
        return [];
    }
}

/**
 * Render badges as HTML
 * @param {string[]} badgeIds - Array of badge IDs to render
 * @param {string} size - 'sm', 'md', or 'lg'
 * @returns {string} HTML string of badges
 */
export function renderBadges(badgeIds, size = 'sm') {
    if (!badgeIds || badgeIds.length === 0) return '';

    const sizeStyles = {
        sm: 'padding: 0.15rem 0.4rem; font-size: 0.7rem;',
        md: 'padding: 0.25rem 0.6rem; font-size: 0.8rem;',
        lg: 'padding: 0.35rem 0.8rem; font-size: 0.9rem;'
    };

    return badgeIds.map(badgeId => {
        const badge = Object.values(BADGES).find(b => b.id === badgeId);
        if (!badge) return '';

        return `
            <span class="user-badge" 
                  style="display: inline-flex; align-items: center; gap: 0.2rem;
                         background: ${badge.bgColor}; color: ${badge.color};
                         border-radius: 0.5rem; font-weight: 600;
                         ${sizeStyles[size]}"
                  title="${badge.description}">
                <span>${badge.icon}</span>
                <span>${badge.name}</span>
            </span>
        `;
    }).join('');
}

/**
 * Render a single verification badge (common use case)
 * @param {boolean} isVerified - Whether user is verified
 * @returns {string} HTML string
 */
export function renderVerificationBadge(isVerified) {
    if (!isVerified) return '';

    const badge = BADGES.VERIFIED;
    return `
        <span class="verified-badge" 
              style="display: inline-flex; align-items: center; gap: 0.25rem;
                     color: ${badge.color}; font-size: 0.85rem; font-weight: 600;"
              title="${badge.description}">
            <i class="fa-solid fa-circle-check"></i>
            Verified
        </span>
    `;
}

/**
 * Get badge info by ID
 * @param {string} badgeId - Badge ID
 * @returns {Object|null} Badge info object
 */
export function getBadgeInfo(badgeId) {
    return Object.values(BADGES).find(b => b.id === badgeId) || null;
}

/**
 * Render all available badges with status for a profile page
 * @param {string[]} earnedBadges - Array of badge IDs user has earned
 * @returns {string} HTML string showing all badges with earned/not earned status
 */
export function renderBadgeShowcase(earnedBadges = []) {
    const allBadges = Object.values(BADGES);

    return `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem;">
            ${allBadges.map(badge => {
        const isEarned = earnedBadges.includes(badge.id);
        return `
                    <div style="background: ${isEarned ? badge.bgColor : '#f1f5f9'};
                                border-radius: 0.75rem; padding: 1rem; text-align: center;
                                opacity: ${isEarned ? '1' : '0.5'};
                                border: 2px solid ${isEarned ? badge.color : 'transparent'};">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">${badge.icon}</div>
                        <div style="font-weight: 600; color: ${isEarned ? badge.color : '#64748b'}; font-size: 0.9rem;">
                            ${badge.name}
                        </div>
                        <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.25rem;">
                            ${badge.description}
                        </div>
                        ${isEarned ? '<div style="margin-top: 0.5rem; font-size: 0.7rem; color: #22c55e;">✓ Earned</div>' : ''}
                    </div>
                `;
    }).join('')}
        </div>
    `;
}
