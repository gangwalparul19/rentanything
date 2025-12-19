/**
 * Analytics Dashboard
 * Displays performance metrics for listing owners
 */

import { db, auth } from './firebase-config.js';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { initHeader } from './header-manager.js';
import { showLoader, hideLoader } from './loader.js';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initHeader();      // 1. Inject HTML links and setup UI auth
    initMobileMenu();  // 2. Make menu clickable
    initTheme();       // 3. Setup dark/light mode
    initAuth();        // 4. Setup login button events

    onAuthStateChanged(auth, (user) => {
        if (user) {
            loadAnalytics(user.uid);
        } else {
            window.location.href = 'login.html';
        }
    });
});

/**
 * Load analytics data for user
 */
async function loadAnalytics(userId) {
    showLoader('Loading analytics...');

    try {
        // Fetch user's listings
        const listingsQuery = query(
            collection(db, 'listings'),
            where('ownerId', '==', userId)
        );
        const listingsSnap = await getDocs(listingsQuery);
        const listings = [];
        listingsSnap.forEach(doc => {
            listings.push({ id: doc.id, ...doc.data() });
        });

        // Fetch bookings for these listings
        const bookingsQuery = query(
            collection(db, 'bookings'),
            where('ownerId', '==', userId)
        );
        const bookingsSnap = await getDocs(bookingsQuery);
        const bookings = [];
        bookingsSnap.forEach(doc => {
            bookings.push({ id: doc.id, ...doc.data() });
        });

        // Calculate metrics
        const metrics = calculateMetrics(listings, bookings);

        // Render components
        renderStatsCards(metrics);
        renderCharts(bookings);
        renderTopListings(listings, bookings);

    } catch (error) {
        console.error('Error loading analytics:', error);
    } finally {
        hideLoader();
    }
}

/**
 * Calculate key metrics
 */
function calculateMetrics(listings, bookings) {
    const totalListings = listings.length;
    const activeListings = listings.filter(l => l.status === 'active' || l.status === 'approved').length;
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'active').length;

    // Calculate revenue
    let totalRevenue = 0;
    let thisMonthRevenue = 0;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    bookings.forEach(booking => {
        if (booking.status === 'confirmed' || booking.status === 'completed') {
            totalRevenue += booking.totalPrice || 0;

            const bookingDate = booking.createdAt?.toDate();
            if (bookingDate && bookingDate >= monthStart) {
                thisMonthRevenue += booking.totalPrice || 0;
            }
        }
    });

    return {
        totalListings,
        activeListings,
        totalBookings,
        confirmedBookings,
        totalRevenue,
        thisMonthRevenue
    };
}

/**
 * Render stats cards
 */
function renderStatsCards(metrics) {
    const statsGrid = document.getElementById('stats-grid');
    if (!statsGrid) return;

    statsGrid.innerHTML = `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 1rem;">
            <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 0.5rem;">Total Listings</div>
            <div style="font-size: 2rem; font-weight: 700;">${metrics.totalListings}</div>
            <div style="font-size: 0.85rem; opacity: 0.8; margin-top: 0.25rem;">${metrics.activeListings} active</div>
        </div>
        
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 1.5rem; border-radius: 1rem;">
            <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 0.5rem;">Total Bookings</div>
            <div style="font-size: 2rem; font-weight: 700;">${metrics.totalBookings}</div>
            <div style="font-size: 0.85rem; opacity: 0.8; margin-top: 0.25rem;">${metrics.confirmedBookings} confirmed</div>
        </div>
        
        <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 1.5rem; border-radius: 1rem;">
            <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 0.5rem;">Total Revenue</div>
            <div style="font-size: 2rem; font-weight: 700;">₹${metrics.totalRevenue.toLocaleString()}</div>
            <div style="font-size: 0.85rem; opacity: 0.8; margin-top: 0.25rem;">All time</div>
        </div>
        
        <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 1.5rem; border-radius: 1rem;">
            <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 0.5rem;">This Month</div>
            <div style="font-size: 2rem; font-weight: 700;">₹${metrics.thisMonthRevenue.toLocaleString()}</div>
            <div style="font-size: 0.85rem; opacity: 0.8; margin-top: 0.25rem;">Revenue</div>
        </div>
    `;
}

/**
 * Render charts
 */
function renderCharts(bookings) {
    // Prepare data for bookings chart (last 6 months)
    const monthlyBookings = {};
    const monthlyRevenue = {};

    bookings.forEach(booking => {
        const date = booking.createdAt?.toDate();
        if (!date) return;

        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyBookings[monthKey] = (monthlyBookings[monthKey] || 0) + 1;

        if (booking.status === 'confirmed' || booking.status === 'completed') {
            monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + (booking.totalPrice || 0);
        }
    });

    // Get last 6 months
    const labels = [];
    const bookingData = [];
    const revenueData = [];

    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
        bookingData.push(monthlyBookings[monthKey] || 0);
        revenueData.push(monthlyRevenue[monthKey] || 0);
    }

    // Bookings chart
    new Chart(document.getElementById('bookings-chart'), {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Bookings',
                data: bookingData,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } }
        }
    });

    // Revenue chart
    new Chart(document.getElementById('revenue-chart'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Revenue (₹)',
                data: revenueData,
                backgroundColor: '#4facfe'
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } }
        }
    });
}

/**
 * Render top listings
 */
function renderTopListings(listings, bookings) {
    const container = document.getElementById('top-listings');
    if (!container) return;

    // Calculate bookings per listing
    const listingStats = listings.map(listing => {
        const listingBookings = bookings.filter(b => b.listingId === listing.id);
        const revenue = listingBookings.reduce((sum, b) => {
            if (b.status === 'confirmed' || b.status === 'completed') {
                return sum + (b.totalPrice || 0);
            }
            return sum;
        }, 0);

        return {
            ...listing,
            bookingCount: listingBookings.length,
            revenue
        };
    });

    // Sort by revenue
    listingStats.sort((a, b) => b.revenue - a.revenue);
    const top5 = listingStats.slice(0, 5);

    if (top5.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 2rem;">No listings yet</p>';
        return;
    }

    container.innerHTML = top5.map(listing => `
        <div style="border-bottom: 1px solid #f1f5f9; padding: 1rem 0; display: flex; align-items: center; gap: 1rem;">
            <img src="${listing.image}" alt="${listing.title}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 0.5rem;">
            <div style="flex: 1;">
                <h4 style="font-size: 1rem; margin-bottom: 0.25rem;">${listing.title}</h4>
                <div style="color: var(--gray); font-size: 0.9rem;">${listing.bookingCount} bookings</div>
            </div>
            <div style="text-align: right;">
                <div style="font-weight: 700; font-size: 1.1rem; color: var(--primary);">₹${listing.revenue.toLocaleString()}</div>
                <div style="font-size: 0.85rem; color: var(--gray);">Revenue</div>
            </div>
        </div>
    `).join('');
}
