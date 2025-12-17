/**
 * Gamification Badges System
 * Awards badges and tracks user achievements
 */

import { db, auth } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { showToast } from './toast-enhanced.js';

// Badge definitions
export const BADGES = {
    FIRST_LISTING: {
        id: 'first_listing',
        name: 'First Step',
        description: 'Created your first listing',
        icon: '🎯',
        points: 10
    },
    FIRST_BOOKING: {
        id: 'first_booking',
        name: 'First Deal',
        description: 'Completed your first booking',
        icon: '🤝',
        points: 20
    },
    VERIFIED_USER: {
        id: 'verified_user',
        name: 'Verified',
        description: 'Verified your account',
        icon: '✓',
        points: 50
    },
    TEN_TRANSACTIONS: {
        id: '10_transactions',
        name: 'Power User',
        description: 'Completed 10 transactions',
        icon: '⚡',
        points: 100
    },
    FIFTY_TRANSACTIONS: {
        id: '50_transactions',
        name: 'Pro Trader',
        description: 'Completed 50 transactions',
        icon: '🌟',
        points: 500
    },
    ECO_WARRIOR: {
        id: 'eco_warrior',
        name: 'Eco Warrior',
        description: 'Saved 100kg CO2 through reuse',
        icon: '🌱',
        points: 75
    }
};

/**
 * Award a badge to a user
 * @param {string} userId - User ID
 * @param {string} badgeId - Badge identifier
 */
export async function awardBadge(userId, badgeId) {
    try {
        const badge = Object.values(BADGES).find(b => b.id === badgeId);
        if (!badge) {
            console.error('Invalid badge ID:', badgeId);
            return;
        }

        const badgesRef = doc(db, 'badges', userId);
        const badgesSnap = await getDoc(badgesRef);

        if (badgesSnap.exists()) {
            const data = badgesSnap.data();
            if (data.badges && data.badges.includes(badgeId)) {
                // Already has this badge
                return;
            }

            await updateDoc(badgesRef, {
                badges: [...(data.badges || []), badgeId],
                points: increment(badge.points),
                lastUpdated: serverTimestamp()
            });
        } else {
            await setDoc(badgesRef, {
                userId,
                badges: [badgeId],
                points: badge.points,
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp()
            });
        }

        // Show toast notification
        showToast(`🎉 Badge Unlocked: ${badge.name}! (+${badge.points} points)`, 'success');

    } catch (error) {
        console.error('Error awarding badge:', error);
    }
}

/**
 * Get user's badges
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User badges data
 */
export async function getUserBadges(userId) {
    try {
        const badgesRef = doc(db, 'badges', userId);
        const badgesSnap = await getDoc(badgesRef);

        if (badgesSnap.exists()) {
            return badgesSnap.data();
        }

        return { badges: [], points: 0 };
    } catch (error) {
        console.error('Error fetching badges:', error);
        return { badges: [], points: 0 };
    }
}

/**
 * Check and award transaction milestones
 * @param {string} userId - User ID
 * @param {number} transactionCount - Total transactions completed
 */
export async function checkTransactionMilestones(userId, transactionCount) {
    if (transactionCount === 1) {
        await awardBadge(userId, 'first_booking');
    } else if (transactionCount === 10) {
        await awardBadge(userId, '10_transactions');
    } else if (transactionCount === 50) {
        await awardBadge(userId, '50_transactions');
    }
}

/**
 * Render badges display
 * @param {Array<string>} badgeIds - Array of badge IDs
 * @param {number} points - Total points
 * @returns {string} HTML string for badges display
 */
export function renderBadges(badgeIds, points) {
    if (!badgeIds || badgeIds.length === 0) {
        return `
            <div style="text-align: center; padding: 2rem; color: #94a3b8;">
                <i class="fa-solid fa-award" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                <p>No badges yet. Start earning by completing transactions!</p>
            </div>
        `;
    }

    const badgesHTML = badgeIds.map(badgeId => {
        const badge = Object.values(BADGES).find(b => b.id === badgeId);
        if (!badge) return '';

        return `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 0.75rem; padding: 1rem; color: white; text-align: center;">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">${badge.icon}</div>
                <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 0.25rem;">${badge.name}</div>
                <div style="font-size: 0.75rem; opacity: 0.9;">${badge.description}</div>
                <div style="margin-top: 0.5rem; font-size: 0.7rem; opacity: 0.8;">+${badge.points} points</div>
            </div>
        `;
    }).join('');

    return `
        <div style="background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); border-radius: 0.5rem; padding: 1rem; margin-bottom: 1.5rem; text-align: center;">
            <div style="font-weight: 700; font-size: 1.2rem; color: #92400e;">
                <i class="fa-solid fa-trophy"></i> ${points} Points
            </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem;">
            ${badgesHTML}
        </div>
    `;
}
