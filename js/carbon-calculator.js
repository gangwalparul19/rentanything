import { db, auth } from './firebase-config.js';
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc, increment, query, where, getDocs } from 'firebase/firestore';
import { showToast } from './toast.js';

/**
 * Emission Factors Database (kg CO2e per item)
 * Based on lifecycle assessment data
 */
const emissionFactors = {
    'Electronics': {
        'Laptop': 300,
        'Camera': 80,
        'Projector': 150,
        'Speaker': 40,
        'Gaming Console': 200,
        'Tablet': 100,
        'Phone': 70,
        'TV': 250,
        'Monitor': 150
    },
    'Tools': {
        'Power Drill': 50,
        'Lawn Mower': 120,
        'Pressure Washer': 80,
        'Ladder': 30,
        'Saw': 40,
        'Sander': 35,
        'Hammer Drill': 55
    },
    'Sports': {
        'Bicycle': 100,
        'Kayak': 150,
        'Camping Tent': 60,
        'Ski Equipment': 80,
        'Surfboard': 70,
        'Golf Clubs': 90,
        'Treadmill': 200
    },
    'Furniture': {
        'Table': 80,
        'Chair': 40,
        'Sofa': 200,
        'Desk': 100,
        'Bookshelf': 60,
        'Bed Frame': 150
    },
    'Appliances': {
        'Vacuum Cleaner': 70,
        'Microwave': 80,
        'Air Conditioner': 300,
        'Heater': 100,
        'Fan': 30
    },
    'Outdoor': {
        'BBQ Grill': 90,
        'Generator': 150,
        'Lawn Edger': 40,
        'Leaf Blower': 50
    },
    'default': 50 // Generic items
};

/**
 * Item lifespan in days (for rental share calculation)
 */
const itemLifespanDays = 3650; // 10 years default

/**
 * Calculate CO2 savings for a rental
 * @param {string} category - Item category
 * @param {string} itemName - Item name/title
 * @param {number} rentalDays - Number of rental days
 * @returns {number} CO2 saved in kg
 */
export function calculateCO2Savings(category, itemName, rentalDays) {
    try {
        const productionEmissions = getEmissionFactor(category, itemName);
        const rentalShare = rentalDays / itemLifespanDays;
        const maintenanceEmissions = productionEmissions * 0.02; // 2% of production

        // CO2 saved = avoiding production - small maintenance cost
        const saved = productionEmissions - (rentalShare * maintenanceEmissions);

        return Math.max(0, Math.round(saved * 100) / 100); // Round to 2 decimals, never negative
    } catch (error) {
        console.error('Error calculating CO2:', error);
        return 0;
    }
}

/**
 * Get emission factor for specific item
 * @param {string} category - Item category
 * @param {string} itemName - Item name
 * @returns {number} Emission factor in kg CO2
 */
function getEmissionFactor(category, itemName) {
    // Try exact match first
    if (emissionFactors[category]) {
        // Check if item name contains any key from category
        for (const [key, value] of Object.entries(emissionFactors[category])) {
            if (itemName.toLowerCase().includes(key.toLowerCase())) {
                return value;
            }
        }
    }

    // Return default
    return emissionFactors.default;
}

/**
 * Calculate real-world equivalencies
 * @param {number} co2Kg - CO2 in kilograms
 * @returns {object} Equivalencies
 */
export function calculateEquivalencies(co2Kg) {
    return {
        trees: Math.round(co2Kg / 21), // 1 tree absorbs ~21kg CO2/year
        carKm: Math.round(co2Kg / 0.12), // Average car: 120g CO2/km
        lightbulbHours: Math.round(co2Kg / 0.05), // LED bulb: 50g CO2/hour
        smartphones: Math.round(co2Kg / 0.07) // Charging 1 smartphone: 70g CO2
    };
}

/**
 * Track environmental impact after booking
 * @param {string} userId - User ID
 * @param {string} bookingId - Booking ID
 * @param {string} listingId - Listing ID
 * @param {object} bookingData - Booking details
 */
export async function trackEnvironmentalImpact(userId, bookingId, listingId, bookingData) {
    try {
        const co2Saved = calculateCO2Savings(
            bookingData.category || 'default',
            bookingData.listingTitle || '',
            bookingData.rentalDays || 1
        );

        if (co2Saved === 0) return;

        // Store individual impact record
        await addDoc(collection(db, 'environmental_impact'), {
            userId: userId,
            bookingId: bookingId,
            listingId: listingId,
            co2SavedKg: co2Saved,
            category: bookingData.category || 'Other',
            rentalDays: bookingData.rentalDays || 1,
            listingTitle: bookingData.listingTitle || 'Item',
            createdAt: serverTimestamp()
        });

        // Update user's total impact
        await updateUserEcoProfile(userId, co2Saved);

        // Update platform stats
        await updatePlatformStats(co2Saved);

        console.log(`✅ Environmental impact tracked: ${co2Saved}kg CO2 saved`);

        // Show celebratory toast
        const equiv = calculateEquivalencies(co2Saved);
        showToast(`🌱 Great! You saved ${co2Saved}kg of CO2 (equivalent to ${equiv.trees} trees planted!)`, 'success');

    } catch (error) {
        console.error('Error tracking environmental impact:', error);
        // Fail silently - don't block booking
    }
}

/**
 * Update user's eco profile
 * @param {string} userId - User ID
 * @param {number} co2Saved - CO2 saved in this transaction
 */
async function updateUserEcoProfile(userId, co2Saved) {
    const profileRef = doc(db, 'user_eco_profile', userId);

    try {
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
            // Update existing profile
            const currentTotal = profileSnap.data().totalCO2Saved || 0;
            const newTotal = currentTotal + co2Saved;

            await setDoc(profileRef, {
                totalCO2Saved: newTotal,
                totalRentals: increment(1),
                lastUpdated: serverTimestamp()
            }, { merge: true });

            // Check for new badges
            await checkAndAwardBadges(userId, newTotal);
        } else {
            // Create new profile
            await setDoc(profileRef, {
                userId: userId,
                totalCO2Saved: co2Saved,
                totalRentals: 1,
                badges: [],
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Error updating user eco profile:', error);
    }
}

/**
 * Update platform-wide stats
 * @param {number} co2Saved - CO2 saved in this transaction
 */
async function updatePlatformStats(co2Saved) {
    const statsRef = doc(db, 'platform_stats', 'environmental');

    try {
        await setDoc(statsRef, {
            totalCO2Saved: increment(co2Saved),
            totalImpactRecords: increment(1),
            lastUpdated: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error('Error updating platform stats:', error);
    }
}

/**
 * Badge definitions
 */
const badges = {
    'eco_starter': {
        name: 'Eco Starter',
        icon: '🌱',
        requirement: 10,
        description: 'Saved your first 10kg of CO2'
    },
    'climate_champion': {
        name: 'Climate Champion',
        icon: '🌍',
        requirement: 100,
        description: 'Prevented 100kg of emissions!'
    },
    'earth_hero': {
        name: 'Earth Hero',
        icon: '🦸',
        requirement: 500,
        description: "You're a sustainability superstar!"
    },
    'planet_protector': {
        name: 'Planet Protector',
        icon: '🌟',
        requirement: 1000,
        description: 'Over 1 ton of CO2 saved!'
    }
};

/**
 * Check and award badges based on total CO2 saved
 * @param {string} userId - User ID
 * @param {number} totalCO2 - Total CO2 saved by user
 */
async function checkAndAwardBadges(userId, totalCO2) {
    try {
        const profileRef = doc(db, 'user_eco_profile', userId);
        const profileSnap = await getDoc(profileRef);

        if (!profileSnap.exists()) return;

        const currentBadges = profileSnap.data().badges || [];
        const earnedBadges = Object.keys(badges).filter(
            badgeId => totalCO2 >= badges[badgeId].requirement && !currentBadges.includes(badgeId)
        );

        if (earnedBadges.length > 0) {
            // Add new badges to profile
            await setDoc(profileRef, {
                badges: [...currentBadges, ...earnedBadges],
                lastUpdated: serverTimestamp()
            }, { merge: true });

            // Send notification for each new badge
            for (const badgeId of earnedBadges) {
                const badge = badges[badgeId];
                await addDoc(collection(db, 'notifications'), {
                    userId: userId,
                    title: `${badge.icon} Badge Unlocked: ${badge.name}!`,
                    body: badge.description,
                    type: 'badge_earned',
                    badgeId: badgeId,
                    read: false,
                    createdAt: serverTimestamp()
                });
            }
        }
    } catch (error) {
        console.error('Error checking badges:', error);
    }
}

/**
 * Get user's eco profile
 * @param {string} userId - User ID
 * @returns {object|null} Eco profile data
 */
export async function getUserEcoProfile(userId) {
    try {
        const profileRef = doc(db, 'user_eco_profile', userId);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
            return profileSnap.data();
        }
        return null;
    } catch (error) {
        console.error('Error getting eco profile:', error);
        return null;
    }
}

/**
 * Get platform environmental stats
 * @returns {object|null} Platform stats
 */
export async function getPlatformEcoStats() {
    try {
        const statsRef = doc(db, 'platform_stats', 'environmental');
        const statsSnap = await getDoc(statsRef);

        if (statsSnap.exists()) {
            return statsSnap.data();
        }
        return { totalCO2Saved: 0, totalImpactRecords: 0 };
    } catch (error) {
        console.error('Error getting platform stats:', error);
        return { totalCO2Saved: 0, totalImpactRecords: 0 };
    }
}

// Export badge definitions for UI use
export { badges };
