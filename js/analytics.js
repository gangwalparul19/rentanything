/**
 * Enhanced Seller Analytics Dashboard
 * Displays performance metrics, earnings trends, view counts, and conversion rates
 */

import { db, auth } from './firebase-config.js';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { initHeader } from './header-manager.js';
import { initMobileMenu } from './navigation.js';
import { initTheme } from './theme.js';
import { initAuth } from './auth.js';
import { showLoader, hideLoader } from './loader.js';
import { initFooter } from './footer-manager.js';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    initMobileMenu();
    initTheme();
    initAuth();
    initFooter();

    onAuthStateChanged(auth, (user) => {
        if (user) {
            loadAnalytics(user.uid);
        } else {
            window.location.href = '/?login=true';
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
        renderCharts(bookings, listings);
        renderTopListings(listings, bookings);

    } catch (error) {
        console.error('Error loading analytics:', error);
    } finally {
        hideLoader();
    }
}

/**
 * Calculate comprehensive metrics including conversion rates
 */
function calculateMetrics(listings, bookings) {
    const totalListings = listings.length;
    const activeListings = listings.filter(l => l.status === 'active' || l.status === 'approved').length;
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'active').length;

    // Calculate total views across all listings
    const totalViews = listings.reduce((sum, listing) => sum + (listing.views || 0), 0);
    const avgViewsPerListing = totalListings > 0 ? Math.round(totalViews / totalListings) : 0;

    // Calculate conversion rate (bookings / views * 100)
    const conversionRate = totalViews > 0 ? ((totalBookings / totalViews) * 100).toFixed(2) : 0;

    // Calculate revenue
    let totalRevenue = 0;
    let thisMonthRevenue = 0;
    let lastMonthRevenue = 0;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    bookings.forEach(booking => {
        if (booking.status === 'confirmed' || booking.status === 'completed') {
            const price = booking.totalPrice || 0;
            totalRevenue += price;

            const bookingDate = booking.createdAt?.toDate();
            if (bookingDate) {
                if (bookingDate >= monthStart) {
                    thisMonthRevenue += price;
                } else if (bookingDate >= lastMonthStart && bookingDate <= lastMonthEnd) {
                    lastMonthRevenue += price;
                }
            }
        }
    });

    // Calculate revenue growth
    const revenueGrowth = lastMonthRevenue > 0
        ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
        : thisMonthRevenue > 0 ? 100 : 0;

    return {
        totalListings,
        activeListings,
        totalBookings,
        confirmedBookings,
        totalRevenue,
        thisMonthRevenue,
        totalViews,
        avgViewsPerListing,
        conversionRate,
        revenueGrowth
    };
}

/**
 * Render enhanced stats cards with conversion metrics
 */
function renderStatsCards(metrics) {
    const statsGrid = document.getElementById('stats-grid');
    if (!statsGrid) return;

    statsGrid.innerHTML = `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 1rem; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
            <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 0.5rem;">Total Listings</div>
            <div style="font-size: 2rem; font-weight: 700;">${metrics.totalListings}</div>
            <div style="font-size: 0.85rem; opacity: 0.8; margin-top: 0.25rem;">${metrics.activeListings} active</div>
        </div>
        
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 1.5rem; border-radius: 1rem; box-shadow: 0 4px 12px rgba(245, 87, 108, 0.3);">
            <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 0.5rem;">Total Views</div>
            <div style="font-size: 2rem; font-weight: 700;">${metrics.totalViews.toLocaleString()}</div>
            <div style="font-size: 0.85rem; opacity: 0.8; margin-top: 0.25rem;">${metrics.avgViewsPerListing} avg per listing</div>
        </div>
        
        <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 1.5rem; border-radius: 1rem; box-shadow: 0 4px 12px rgba(79, 172, 254, 0.3);">
            <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 0.5rem;">Conversion Rate</div>
            <div style="font-size: 2rem; font-weight: 700;">${metrics.conversionRate}%</div>
            <div style="font-size: 0.85rem; opacity: 0.8; margin-top: 0.25rem;">${metrics.totalBookings} of ${metrics.totalViews} views</div>
        </div>
        
        <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 1.5rem; border-radius: 1rem; box-shadow: 0 4px 12px rgba(67, 233, 123, 0.3);">
            <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 0.5rem;">Total Revenue</div>
            <div style="font-size: 2rem; font-weight: 700;">₹${metrics.totalRevenue.toLocaleString()}</div>
            <div style="font-size: 0.85rem; opacity: 0.8; margin-top: 0.25rem;">All time earnings</div>
        </div>
        
        <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; padding: 1.5rem; border-radius: 1rem; box-shadow: 0 4px 12px rgba(250, 112, 154, 0.3);">
            <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 0.5rem;">This Month</div>
            <div style="font-size: 2rem; font-weight: 700;">₹${metrics.thisMonthRevenue.toLocaleString()}</div>
            <div style="font-size: 0.85rem; opacity: 0.8; margin-top: 0.25rem;">
                ${metrics.revenueGrowth > 0 ? '↗' : metrics.revenueGrowth < 0 ? '↘' : '→'} ${Math.abs(metrics.revenueGrowth)}% vs last month
            </div>
        </div>
        
        <div style="background: linear-gradient(135deg, #30cfd0 0%, #330867 100%); color: white; padding: 1.5rem; border-radius: 1rem; box-shadow: 0 4px 12px rgba(48, 207, 208, 0.3);">
            <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 0.5rem;">Total Bookings</div>
            <div style="font-size: 2rem; font-weight: 700;">${metrics.totalBookings}</div>
            <div style="font-size: 0.85rem; opacity: 0.8; margin-top: 0.25rem;">${metrics.confirmedBookings} confirmed</div>
        </div>
    `;
}

/**
 * Render enhanced charts with earnings trends and conversion funnel
 */
function renderCharts(bookings, listings) {
    // Prepare monthly data for last 6 months
    const monthlyBookings = {};
    const monthlyRevenue = {};
    const monthlyViews = {};

    // Process bookings
    bookings.forEach(booking => {
        const date = booking.createdAt?.toDate();
        if (!date) return;

        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyBookings[monthKey] = (monthlyBookings[monthKey] || 0) + 1;

        if (booking.status === 'confirmed' || booking.status === 'completed') {
            monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + (booking.totalPrice || 0);
        }
    });

    // Estimate views per month (if listing has view tracking)
    listings.forEach(listing => {
        const createdDate = listing.createdAt?.toDate();
        if (!createdDate) return;

        const views = listing.views || 0;
        // Distribute views evenly across months since creation (rough estimate)
        const monthsActive = Math.max(1, Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24 * 30)));
        const viewsPerMonth = Math.floor(views / monthsActive);

        for (let i = 0; i < Math.min(6, monthsActive); i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyViews[monthKey] = (monthlyViews[monthKey] || 0) + viewsPerMonth;
        }
    });

    // Get last 6 months
    const labels = [];
    const bookingData = [];
    const revenueData = [];
    const viewsData = [];
    const conversionData = [];

    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        labels.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));

        const views = monthlyViews[monthKey] || 0;
        const bookings = monthlyBookings[monthKey] || 0;

        bookingData.push(bookings);
        revenueData.push(monthlyRevenue[monthKey] || 0);
        viewsData.push(views);
        conversionData.push(views > 0 ? ((bookings / views) * 100).toFixed(2) : 0);
    }

    // Earnings Trend Chart (Enhanced)
    new Chart(document.getElementById('bookings-chart'), {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Revenue (₹)',
                data: revenueData,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.2)',
                tension: 0.4,
                fill: true,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true, position: 'top' },
                title: { display: true, text: 'Earnings Trend (Last 6 months)' }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return '₹' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });

    // Views vs Bookings (Conversion Funnel)
    new Chart(document.getElementById('revenue-chart'), {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Views',
                    data: viewsData,
                    backgroundColor: 'rgba(79, 172, 254, 0.6)',
                    borderColor: '#4facfe',
                    borderWidth: 1
                },
                {
                    label: 'Bookings',
                    data: bookingData,
                    backgroundColor: 'rgba(67, 233, 123, 0.6)',
                    borderColor: '#43e97b',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true, position: 'top' },
                title: { display: true, text: 'Views vs Bookings (Conversion Funnel)' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

/**
 * Render top performing listings with conversion rates
 */
function renderTopListings(listings, bookings) {
    const container = document.getElementById('top-listings');
    if (!container) return;

    // Calculate detailed stats per listing
    const listingStats = listings.map(listing => {
        const listingBookings = bookings.filter(b => b.listingId === listing.id);
        const revenue = listingBookings.reduce((sum, b) => {
            if (b.status === 'confirmed' || b.status === 'completed') {
                return sum + (b.totalPrice || 0);
            }
            return sum;
        }, 0);

        const views = listing.views || 0;
        const conversionRate = views > 0 ? ((listingBookings.length / views) * 100).toFixed(2) : 0;

        return {
            ...listing,
            bookingCount: listingBookings.length,
            revenue,
            views,
            conversionRate
        };
    });

    // Sort by revenue
    listingStats.sort((a, b) => b.revenue - a.revenue);
    const top5 = listingStats.slice(0, 5);

    if (top5.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 2rem;">No listings yet. <a href="/create-listing.html" style="color: var(--primary);">Create your first listing</a></p>';
        return;
    }

    container.innerHTML = top5.map((listing, index) => `
        <div style="border-bottom: 1px solid #f1f5f9; padding: 1rem 0; display: grid; grid-template-columns: auto 1fr auto auto; gap: 1rem; align-items: center;">
            <div style="font-weight: 700; font-size: 1.5rem; color: ${index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'var(--gray)'};">
                ${index + 1}
            </div>
            <img src="${listing.image || 'https://placehold.co/80'}" alt="${listing.title}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 0.5rem;" onerror="this.src='https://placehold.co/80'">
            <div style="flex: 1;">
                <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">${listing.title}</h4>
                <div style="display: flex; gap: 1.5rem; color: var(--gray); font-size: 0.85rem;">
                    <span><i class="fas fa-eye"></i> ${listing.views} views</span>
                    <span><i class="fas fa-calendar-check"></i> ${listing.bookingCount} bookings</span>
                    <span><i class="fas fa-chart-line"></i> ${listing.conversionRate}% conversion</span>
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-weight: 700; font-size: 1.25rem; color: var(--primary);">₹${listing.revenue.toLocaleString()}</div>
                <div style="font-size: 0.85rem; color: var(--gray);">Revenue</div>
            </div>
        </div>
    `).join('');
}
