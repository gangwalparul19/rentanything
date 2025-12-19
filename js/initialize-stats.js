/**
 * Initialize Platform Stats
 * Run this script once to populate the stats document with actual counts
 */

import { db, auth } from './firebase-config.js';
import { collection, getDocs, query, where, doc, setDoc, serverTimestamp } from 'firebase/firestore';

async function initializeStats() {
    console.log('🔧 Initializing platform stats...');

    // Check if user is authenticated
    if (!auth.currentUser) {
        throw new Error('❌ Not authenticated. Please log in as admin first.');
    }

    // Check if user is admin
    const adminEmails = ['gangwalparul19@gmail.com', 'rentanythingindia@gmail.com'];
    if (!adminEmails.includes(auth.currentUser.email)) {
        throw new Error('❌ Admin access required. Your email: ' + auth.currentUser.email);
    }

    console.log(`✅ Authenticated as admin: ${auth.currentUser.email}`);

    try {
        // Count users
        console.log('Counting users...');
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersCount = usersSnap.size;
        const verifiedCount = usersSnap.docs.filter(doc => doc.data().verified === true).length;

        // Count listings
        console.log('Counting listings...');
        const listingsSnap = await getDocs(collection(db, 'listings'));
        const listingsCount = listingsSnap.size;
        const activeListings = listingsSnap.docs.filter(doc => doc.data().status === 'available').length;

        // Count bookings and revenue
        console.log('Counting bookings...');
        const bookingsSnap = await getDocs(collection(db, 'bookings'));
        const bookingsCount = bookingsSnap.size;

        let totalRevenue = 0;
        let activeBookings = 0;

        bookingsSnap.forEach(doc => {
            const data = doc.data();
            if (data.totalAmount) {
                totalRevenue += data.totalAmount;
            }
            if (data.status === 'active' || data.status === 'approved') {
                activeBookings++;
            }
        });

        const avgPerBooking = bookingsCount > 0 ? Math.round(totalRevenue / bookingsCount) : 0;

        // Count properties
        console.log('Counting properties...');
        const propertiesSnap = await getDocs(collection(db, 'properties'));
        const propertiesCount = propertiesSnap.size;
        const availableProperties = propertiesSnap.docs.filter(doc => doc.data().status === 'available').length;
        const pendingProperties = propertiesSnap.docs.filter(doc => doc.data().status === 'pending').length;

        // Create stats document
        const statsData = {
            users: {
                total: usersCount,
                verified: verifiedCount,
                newThisMonth: 0, // Will be updated as new users join
                lastUpdated: serverTimestamp()
            },
            listings: {
                total: listingsCount,
                active: activeListings,
                pending: 0,
                soldThisMonth: 0,
                lastUpdated: serverTimestamp()
            },
            bookings: {
                total: bookingsCount,
                activeNow: activeBookings,
                thisMonth: 0, // Will be updated
                pendingApproval: 0,
                lastUpdated: serverTimestamp()
            },
            revenue: {
                total: totalRevenue,
                thisMonth: 0, // Will be updated
                avgPerBooking: avgPerBooking,
                lastUpdated: serverTimestamp()
            },
            properties: {
                total: propertiesCount,
                available: availableProperties,
                pending: pendingProperties,
                lastUpdated: serverTimestamp()
            },
            lastFullUpdate: serverTimestamp()
        };

        // Save to Firestore
        await setDoc(doc(db, 'stats', 'platform_stats'), statsData);

        console.log('✅ Stats initialized successfully!');
        console.log('📊 Summary:');
        console.log(`  Users: ${usersCount} (${verifiedCount} verified)`);
        console.log(`  Listings: ${listingsCount} (${activeListings} active)`);
        console.log(`  Bookings: ${bookingsCount} (${activeBookings} active)`);
        console.log(`  Revenue: ₹${totalRevenue} (avg: ₹${avgPerBooking}/booking)`);
        console.log(`  Properties: ${propertiesCount} (${availableProperties} available, ${pendingProperties} pending)`);

        return statsData;

    } catch (error) {
        console.error('❌ Error initializing stats:', error);
        throw error;
    }
}

// Export for use
export { initializeStats };

// If running as standalone script
if (typeof window !== 'undefined') {
    window.initializeStats = initializeStats;
}
