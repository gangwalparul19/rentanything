import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc, getDoc, addDoc, getCountFromServer, orderBy, limit, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { showToast } from './toast-enhanced.js';
import { ADMIN_CONFIG, isAdminEmail } from './admin-config.js';
import { sendPropertyApprovalEmail, sendPropertyRejectionEmail, sendListingApprovalEmail, sendListingRejectionEmail } from './email-notifications.js';
import { VirtualScroller } from './virtual-scroller.js';

// Global data storage for export
let analyticsData = {
    users: [],
    bookings: [],
    listings: [],
    properties: [],
    topListings: [],
    activeUsers: []
};

let dateFilter = { start: null, end: null };

// --- NOTIFICATION SYSTEM ---
let unsubscribeNotifs = null;
let notifications = [];


// --- ADMIN CHECK ---
/**
 * Check if user is an admin by email
 * @param {Object} user - Firebase user object
 * @returns {boolean} True if user is admin
 */
function isAdmin(user) {
    if (user && user.email) {
        return isAdminEmail(user.email);
    }
    return false;
}

/**
 * Trigger Google Sign-In for admin login
 */
async function adminGoogleSignIn() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
        prompt: 'select_account'
    });

    try {
        // Set persistence to LOCAL so user stays logged in
        await setPersistence(auth, browserLocalPersistence);

        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Check if user is admin
        if (!isAdmin(user)) {
            showToast('Access denied. Only authorized admin emails can access this panel.', 'error');
            // Sign out non-admin user
            await auth.signOut();
            return false;
        }

        showToast(`Welcome, ${user.displayName || user.email}!`, 'success');
        return true;
    } catch (error) {
        console.error('Admin login error:', error);
        if (error.code === 'auth/popup-closed-by-user') {
            showToast('Login cancelled', 'info');
        } else {
            showToast('Login failed. Please try again.', 'error');
        }
        return false;
    }
}

/**
 * Logout function - exported to window for use in HTML
 */
window.logoutAdmin = async function () {
    if (confirm('Are you sure you want to logout?')) {
        try {
            // Clean up notification listener
            if (unsubscribeNotifs) {
                unsubscribeNotifs();
                unsubscribeNotifs = null;
            }

            // Clean up dashboard real-time listeners
            if (unsubscribeBookings) {
                unsubscribeBookings();
                unsubscribeBookings = null;
            }

            if (unsubscribePendingProps) {
                unsubscribePendingProps();
                unsubscribePendingProps = null;
            }

            await signOut(auth);
            showToast('Logged out successfully', 'info');
            window.location.reload();
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Logout failed. Please try again.', 'error');
        }
    }
};

// --- SECTION NAVIGATION ---
window.showSection = function (sectionId, navItem) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show selected section
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.classList.add('active');
    }

    // Add active class to clicked nav item
    if (navItem) {
        navItem.classList.add('active');
    }

    // Load data for the section
    if (sectionId === 'users') {
        loadUsers();
    } else if (sectionId === 'listings') {
        loadListings();
    } else if (sectionId === 'bookings') {
        loadOrders();
    } else if (sectionId === 'verifications') {
        loadVerifications();
    } else if (sectionId === 'reports') {
        loadReports();
    } else if (sectionId === 'property-approvals') {
        loadPendingProperties();
    } else if (sectionId === 'disputes') {
        // Disputes are loaded via loadDashboard
    } else if (sectionId === 'image-moderation') {
        loadImageModeration();
    } else if (sectionId === 'system-health') {
        loadSystemHealth();
    }
};


// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is logged in, check if admin
            if (!isAdmin(user)) {
                showToast('Unauthorized access. Admin privileges required.', 'error');
                await auth.signOut();
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
                return;
            }

            // Admin access logged via Firebase auth

            // Show sidebar and main content
            const sidebar = document.querySelector('.sidebar');
            const mainContent = document.querySelector('.main-content');
            if (sidebar) sidebar.style.display = 'flex';
            if (mainContent) mainContent.style.display = 'block';

            loadDashboard();

            // Initialize notification system for admin
            try {
                startNotificationListener(user.uid);
            } catch (error) {
                console.error("Error initializing admin notifications:", error);
            }
        } else {
            // Not logged in - show Google Sign-In
            // No user logged in - show login screen

            // Hide sidebar
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) sidebar.style.display = 'none';

            // Show login screen
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.style.display = 'block';
                mainContent.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; text-align: center; padding: 2rem;">
                        <i class="fa-solid fa-shield-halved" style="font-size: 4rem; color: #2563eb; margin-bottom: 2rem;"></i>
                        <h1 style="font-size: 2rem; margin-bottom: 1rem; color: #1e293b;">Admin Login Required</h1>
                        <p style="color: #64748b; margin-bottom: 2rem; font-size: 1.1rem;">Please sign in with your authorized admin email</p>
                        <button id="admin-login-btn" class="btn btn-primary" style="padding: 1rem 2rem; font-size: 1.1rem; display: inline-flex; align-items: center; gap: 0.5rem;">
                            <i class="fa-brands fa-google"></i> Sign in with Google
                        </button>
                        <p style="color: #94a3b8; margin-top: 2rem; font-size: 0.9rem;">Authorized admins only</p>
                    </div>
                `;

                // Add click handler for login button
                const loginBtn = document.getElementById('admin-login-btn');
                if (loginBtn) {
                    loginBtn.addEventListener('click', async () => {
                        const success = await adminGoogleSignIn();
                        if (success) {
                            // Reload the page to restore all dashboard elements
                            window.location.reload();
                        }
                    });
                }
            }
        }
    });


    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    document.getElementById('date-to').valueAsDate = today;
    document.getElementById('date-from').valueAsDate = thirtyDaysAgo;

    dateFilter.start = thirtyDaysAgo.toISOString().split('T')[0];
    dateFilter.end = today.toISOString().split('T')[0];

    // === Date Range Filter ===
    const applyFilterBtn = document.getElementById('apply-filter');
    const resetFilterBtn = document.getElementById('reset-filter');

    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', () => {
            const startDate = document.getElementById('date-from').value;
            const endDate = document.getElementById('date-to').value;

            if (!startDate || !endDate) {
                showToast('Please select both start and end dates', 'warning');
                return;
            }

            if (new Date(startDate) > new Date(endDate)) {
                showToast('Start date cannot be after end date', 'error');
                return;
            }

            dateFilter.start = startDate;
            dateFilter.end = endDate;

            loadAllData();
            showToast('Date range applied successfully!', 'success');
        });
    }

    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', () => {
            // Reset to default last 30 days
            const today = new Date();
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);

            const dateToInput = document.getElementById('date-to');
            const dateFromInput = document.getElementById('date-from');

            if (dateToInput) dateToInput.valueAsDate = today;
            if (dateFromInput) dateFromInput.valueAsDate = thirtyDaysAgo;

            dateFilter.start = thirtyDaysAgo.toISOString().split('T')[0];
            dateFilter.end = today.toISOString().split('T')[0];

            loadAllData();
            showToast('Date filter reset!', 'info');
        });
    }

    // === Global Search ===
    const searchInput = document.getElementById('global-search');
    const searchResults = document.getElementById('search-results');
    const searchResultsContent = document.getElementById('search-results-content');
    let searchTimeout;

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();

            // Clear previous timeout
            clearTimeout(searchTimeout);

            if (query.length === 0) {
                searchResults.style.display = 'none';
                return;
            }

            if (query.length < 2) return; // Wait for at least 2 characters

            // Debounce search
            searchTimeout = setTimeout(() => {
                performGlobalSearch(query);
            }, 300);
        });

        // Close search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });

        // Show results when focusing on search input if there's a query
        searchInput.addEventListener('focus', (e) => {
            if (e.target.value.trim().length >= 2) {
                searchResults.style.display = 'block';
            }
        });
    }

    // === Notification Bell Button ===
    const notificationBell = document.getElementById('notification-bell');
    if (notificationBell) {
        notificationBell.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown(notificationBell);
        });
    }

    // === Close notification dropdown on outside click ===
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('notification-dropdown');
        const bellBtn = document.getElementById('notification-bell');

        if (dropdown && dropdown.style.display === 'block') {
            const isClickInside = dropdown.contains(e.target);
            const isClickOnBell = bellBtn && bellBtn.contains(e.target);

            if (!isClickInside && !isClickOnBell) {
                dropdown.style.display = 'none';
            }
        }
    });
});


// --- NOTIFICATION SYSTEM FUNCTIONS ---

/**
 * Start listening for admin notifications in real-time
 * @param {string} userId - Admin user ID
 */
function startNotificationListener(userId) {
    if (unsubscribeNotifs) unsubscribeNotifs();

    const q = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(10)
    );

    unsubscribeNotifs = onSnapshot(q, (snapshot) => {
        notifications = [];
        let unreadCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            notifications.push({ id: doc.id, ...data });
            if (!data.read) unreadCount++;
        });

        updateBellUI(unreadCount);
        renderDropdown();
    });
}

/**
 * Update notification bell badge UI
 * @param {number} count - Number of unread notifications
 */
function updateBellUI(count) {
    const badge = document.getElementById('notification-badge');

    if (count > 0) {
        if (badge) {
            badge.style.display = 'flex';
            badge.innerText = count > 9 ? '9+' : count;
        }
    } else {
        if (badge) badge.style.display = 'none';
    }
}

/**
 * Toggle notification dropdown visibility
 * Exposed to window for HTML onclick
 */
window.toggleNotifications = function () {
    const dropdown = document.getElementById('notification-dropdown');
    const isVisible = dropdown.style.display === 'block';

    if (isVisible) {
        dropdown.style.display = 'none';
        // Clear logic if needed, but for fixed positioning we can leave resets
        dropdown.style.top = '';
        dropdown.style.left = '';
        dropdown.style.right = '';
        dropdown.style.width = '';
        dropdown.style.transform = '';
        dropdown.style.height = '';
        dropdown.style.maxHeight = '';
        dropdown.style.position = '';
        dropdown.style.zIndex = '';
        dropdown.style.bottom = '';
    } else {
        // Enforce Fixed Position settings every time it opens
        dropdown.style.position = 'fixed';
        dropdown.style.zIndex = '3000';
        dropdown.style.bottom = 'auto'; // CRITICAL: Prevent bottom anchoring

        if (window.innerWidth <= 768) {
            // Mobile: Centered top
            dropdown.style.top = '75px'; // Below header
            dropdown.style.left = '50%';
            dropdown.style.transform = 'translateX(-50%)';
            dropdown.style.right = 'auto';
            dropdown.style.width = '90%';
            dropdown.style.maxWidth = '400px';
        } else {
            // Desktop: Top Right
            dropdown.style.top = '90px'; // Approx 5.5rem
            dropdown.style.right = '30px';
            dropdown.style.left = 'auto';
            dropdown.style.transform = 'none';
            dropdown.style.width = '380px';
        }

        // Reset height to avoid "bottom" look if content is small but height was fixed
        dropdown.style.height = 'auto';
        dropdown.style.maxHeight = '80vh';

        dropdown.style.display = 'block';
    }
};

/**
 * Render notifications in the dropdown
 */
function renderDropdown() {
    const list = document.getElementById('notification-list');
    const countEl = document.getElementById('notif-count');

    if (!list) return;

    // Update count
    const unreadCount = notifications.filter(n => !n.read).length;
    if (countEl) countEl.innerText = unreadCount;

    if (notifications.length === 0) {
        list.innerHTML = `<div style="padding:2rem 1rem; text-align:center; color:#64748b;">
            <i class="fa-regular fa-bell-slash" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
            No notifications yet
        </div>`;
        return;
    }

    list.innerHTML = notifications.map(n => `
        <div class="notification-item" data-notif-id="${n.id}" data-notif-type="${n.type || ''}" data-notif-link="${n.link || ''}" 
             style="padding:1rem 1.5rem; border-bottom:1px solid #e2e8f0; cursor:pointer; background: ${n.read ? 'white' : '#f0f9ff'}; transition: background 0.2s;"
             onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='${n.read ? 'white' : '#f0f9ff'}'">
            <div style="display: flex; align-items: start; gap: 0.75rem;">
                <div style="flex-shrink: 0; width: 8px; height: 8px; border-radius: 50%; background: ${n.read ? 'transparent' : '#ef4444'}; margin-top: 0.5rem;"></div>
                <div style="flex: 1;">
                    <div style="font-weight:600; font-size:0.9rem; margin-bottom:0.25rem; color: #0f172a;">${n.title || n.message}</div>
                    ${n.body ? `<div style="font-size:0.85rem; color:#475569; line-height: 1.4;">${n.body}</div>` : ''}
                    <div style="font-size:0.75rem; color:#94a3b8; margin-top:0.4rem;">
                        <i class="fa-regular fa-clock"></i> ${n.createdAt ? new Date(n.createdAt.seconds * 1000).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }) : 'Just now'}
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // Add click listeners after rendering
    document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.dataset.notifId;
            const type = item.dataset.notifType;
            const link = item.dataset.notifLink;
            handleNotificationClick(id, type, link);
        });
    });
}

/**
 * Handle notification click - mark as read and navigate
 * @param {string} id - Notification ID
 * @param {string} type - Notification type
 * @param {string} link - Custom link (optional)
 */
async function handleNotificationClick(id, type, link) {
    // 1. Mark as read
    try {
        const notifRef = doc(db, "notifications", id);
        await updateDoc(notifRef, { read: true });
    } catch (e) {
        console.error("Error marking notification as read:", e);
    }

    // 2. Close dropdown
    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown) dropdown.style.display = 'none';

    // 3. Navigate based on type or link
    if (link) {
        if (link.startsWith('http')) {
            window.open(link, '_blank');
        } else {
            window.location.href = link;
        }
    } else {
        // Default navigation based on notification type
        switch (type) {
            case 'property_approval':
            case 'new_property':
                showSection('property-approvals', document.querySelector('.nav-item[onclick*="property-approvals"]'));
                break;
            case 'new_report':
            case 'report':
                showSection('reports', document.querySelector('.nav-item[onclick*="reports"]'));
                break;
            case 'verification_request':
                showSection('verifications', document.querySelector('.nav-item[onclick*="verifications"]'));
                break;
            case 'new_dispute':
                showSection('disputes', document.querySelector('.nav-item[onclick*="disputes"]'));
                break;
            default:
                // Stay on current page or go to dashboard
                showSection('dashboard', document.querySelector('.nav-item[onclick*="dashboard"]'));
        }
    }
}


// ===== IMPORTS =====
import { getPlatformStats } from './stats-service.js';

// Store unsubscribe functions for cleanup
let unsubscribeBookings = null;
let unsubscribePendingProps = null;

async function loadDashboard() {
    // ✅ OPTIMIZED: Load from stats document instead of counting entire collections
    try {
        const stats = await getPlatformStats();

        // 1. Static KPIs from stats document (1 read instead of 2+ reads)
        document.getElementById('stat-users').innerText = stats.users?.total || 0;
        document.getElementById('stat-listings').innerText = stats.listings?.total || 0;

        // 2. REAL-TIME: Active Bookings with live updates
        const activeBookingsQ = query(
            collection(db, "bookings"),
            where("status", "in", ["confirmed", "pending"])
        );

        // Clean up previous listener if exists
        if (unsubscribeBookings) unsubscribeBookings();

        // Set up real-time listener for bookings
        unsubscribeBookings = onSnapshot(activeBookingsQ, (snapshot) => {
            let totalRev = 0;
            let bookingCount = snapshot.size;

            snapshot.forEach(b => {
                totalRev += (b.data().totalPrice || 0);
            });

            // Update KPIs
            const statBookings = document.getElementById('stat-bookings');
            if (statBookings) {
                const oldValue = parseInt(statBookings.innerText) || 0;
                statBookings.innerText = bookingCount;

                // Visual pulse effect on change
                if (oldValue !== bookingCount && oldValue !== 0) {
                    statBookings.style.animation = 'pulse 0.5s';
                    setTimeout(() => statBookings.style.animation = '', 500);
                }
            }

            const statRevenue = document.getElementById('stat-revenue');
            if (statRevenue) {
                statRevenue.innerText = totalRev.toLocaleString();
            }

            // Average Booking Value
            const avgBooking = bookingCount > 0 ? Math.round(totalRev / bookingCount) : 0;
            const statAvgBooking = document.getElementById('stat-avg-booking');
            if (statAvgBooking) {
                statAvgBooking.innerText = avgBooking.toLocaleString();
            }
        }, (error) => {
            console.error('Error listening to bookings:', error);
        });

        // 3. REAL-TIME: Pending Properties with live updates
        const pendingPropsQ = query(
            collection(db, "properties"),
            where("approvalStatus", "==", "pending")
        );

        // Clean up previous listener if exists
        if (unsubscribePendingProps) unsubscribePendingProps();

        // Set up real-time listener for pending properties
        unsubscribePendingProps = onSnapshot(pendingPropsQ, (snapshot) => {
            const statPendingProps = document.getElementById('stat-pending-properties');
            if (statPendingProps) {
                const oldValue = parseInt(statPendingProps.innerText) || 0;
                statPendingProps.innerText = snapshot.size;

                // Visual pulse effect on change
                if (oldValue !== snapshot.size && oldValue !== 0) {
                    statPendingProps.style.animation = 'pulse 0.5s';
                    setTimeout(() => statPendingProps.style.animation = '', 500);

                    // Show toast notification for new pending property
                    if (snapshot.size > oldValue) {
                        showToast(`New property pending approval! (+${snapshot.size - oldValue})`, 'info');
                    }
                }
            }
        }, (error) => {
            console.error('Error listening to pending properties:', error);
        });

        // ✅ OPTIMIZED: Use stats for active users (calculate in background or use cached value)
        // For now, keeping real-time query but could be moved to stats
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const allUsersSnap = await getDocs(collection(db, "users"));
        let activeUsers = 0;
        allUsersSnap.forEach(doc => {
            const data = doc.data();
            if (data.lastActive && data.lastActive.toDate() > sevenDaysAgo) {
                activeUsers++;
            }
        });
        document.getElementById('stat-active-users').innerText = activeUsers || 'N/A';

        // ✅ OPTIMIZED: Use stats for property approval rate
        const statProps = stats.properties || {};
        const approved = statProps.available || 0;
        const totalProps = statProps.total || 0;
        const approvalRate = totalProps > 0 ? Math.round((approved / totalProps) * 100) : 0;
        document.getElementById('stat-approval-rate').innerText = approvalRate;

        // 2. Load All Data
        await loadAllData();

        // 3. Load Pending Approvals
        await loadPendingListings();
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showToast('Failed to load dashboard statistics', 'error');
    }
    await loadPendingProperties(); // Load pending properties for approval

    // ===== DISPUTES MANAGEMENT =====
    let allDisputes = [];

    async function loadDisputes() {
        try {
            const snapshot = await getDocs(collection(db, 'disputes'));
            allDisputes = [];

            snapshot.forEach(doc => {
                allDisputes.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Sort by date (newest first)
            allDisputes.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            renderDisputes(allDisputes);
        } catch (error) {
            console.error('Error loading disputes:', error);
            document.getElementById('disputes-table').innerHTML = `
    < tr > <td colspan="9" style="text-align:center; color: red;">Error loading disputes</td></tr >
        `;
        }
    }

    window.filterDisputes = function () {
        const status = document.getElementById('dispute-status-filter').value;

        if (status === 'all') {
            renderDisputes(allDisputes);
        } else {
            const filtered = allDisputes.filter(d => d.status === status);
            renderDisputes(filtered);
        }
    };

    let disputeScroller = null;

    function renderDisputes(disputes) {
        const tbody = document.getElementById('disputes-table');
        const container = tbody.parentElement.parentElement; // .card (scrollable container)

        // Clear existing scroller if any
        if (disputeScroller) {
            disputeScroller.destroy();
            disputeScroller = null;
        }

        if (disputes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 2rem; color: var(--gray);">No disputes found</td></tr>';
            return;
        }

        // Initialize Virtual Scroller
        disputeScroller = new VirtualScroller({
            container: container,
            items: disputes,
            itemHeight: 70, // Estimated height of a row
            buffer: 5,
            onRender: (visibleItems, startIndex, totalHeight, paddingTop, paddingBottom) => {
                const spacerTop = `<tr style="height: ${paddingTop}px; pointer-events: none;"><td colspan="9" style="padding:0; border:none;"></td></tr>`;
                const spacerBottom = `<tr style="height: ${paddingBottom}px; pointer-events: none;"><td colspan="9" style="padding:0; border:none;"></td></tr>`;

                const rows = visibleItems.map((dispute, index) => {
                    const date = dispute.createdAt ?
                        new Date(dispute.createdAt.seconds * 1000).toLocaleDateString() : 'N/A';

                    const statusColors = {
                        'open': 'background: #dbeafe; color: #1e40af;',
                        'under_review': 'background: #fef3c7; color: #92400e;',
                        'awaiting_info': 'background: #fed7aa; color: #9a3412;',
                        'resolved': 'background: #d1fae5; color: #065f46;',
                        'dismissed': 'background: #fee2e2; color: #991b1b;'
                    };

                    const priorityColors = {
                        'low': 'background: #e0f2fe; color: #075985;',
                        'medium': 'background: #fef3c7; color: #92400e;',
                        'high': 'background: #fecaca; color: #991b1b;',
                        'urgent': 'background: #fee2e2; color: #7f1d1d;'
                    };

                    const typeLabels = {
                        'damaged_item': 'Damaged Item',
                        'late_return': 'Late Return',
                        'not_as_described': 'Not as Described',
                        'payment_issue': 'Payment Issue',
                        'no_show': 'No Show',
                        'safety_concern': 'Safety Concern',
                        'other': 'Other'
                    };

                    return `
                    <tr>
                        <td><code style="font-size: 0.75rem;">${dispute.id.substring(0, 8)}...</code></td>
                        <td>
                            <strong>${dispute.listingTitle || 'N/A'}</strong><br>
                            <small style="color: var(--gray);">${dispute.bookingId?.substring(0, 12) || 'N/A'}</small>
                        </td>
                        <td>
                            ${dispute.reporterName || 'Unknown'}<br>
                            <small style="color: var(--gray);">${dispute.reporterType}</small>
                        </td>
                        <td>${typeLabels[dispute.disputeType] || dispute.disputeType}</td>
                        <td>
                            <span style="padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem; font-weight: 600; ${statusColors[dispute.status] || ''}">
                                ${dispute.status.replace('_', ' ').toUpperCase()}
                            </span>
                        </td>
                        <td>
                            <span style="padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem; font-weight: 600; ${priorityColors[dispute.priority] || ''}">
                                ${dispute.priority.toUpperCase()}
                            </span>
                        </td>
                        <td>${date}</td>
                        <td>
                            <span style="background: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem;">
                                ${dispute.evidenceUrls?.length || 0} file(s)
                            </span>
                        </td>
                        <td>
                            <button class="btn-secondary" onclick="viewDisputeDetails('${dispute.id}')" style="font-size: 0.85rem;">
                                <i class="fa-solid fa-eye"></i> View
                            </button>
                        </td>
                    </tr>
                    `;
                }).join('');

                tbody.innerHTML = spacerTop + rows + spacerBottom;
            }
        });
    }

    window.viewDisputeDetails = function (disputeId) {
        const dispute = allDisputes.find(d => d.id === disputeId);
        if (!dispute) return;

        // Simple alert for now - can be enhanced with modal
        let details = `DISPUTE DETAILS\n\n`;
        details += `ID: ${dispute.id} \n`;
        details += `Booking: ${dispute.listingTitle} \n`;
        details += `Reporter: ${dispute.reporterName} (${dispute.reporterType}) \n`;
        details += `Respondent: ${dispute.respondentName} (${dispute.respondentType}) \n`;
        details += `Type: ${dispute.disputeType} \n`;
        details += `Status: ${dispute.status} \n`;
        details += `Priority: ${dispute.priority} \n\n`;
        details += `Description: \n${dispute.description} \n\n`;
        details += `Evidence Files: ${dispute.evidenceUrls?.length || 0} \n`;

        if (dispute.evidenceUrls && dispute.evidenceUrls.length > 0) {
            details += `\nEvidence URLs: \n`;
            dispute.evidenceUrls.forEach((url, i) => {
                details += `${i + 1}. ${url} \n`;
            });
        }

        // Enhanced modal view
        const modalContent = `
            <div class="modal-section">
                <div class="modal-info-grid">
                    <div class="modal-info-item">
                        <div class="modal-info-label">Dispute ID</div>
                        <div class="modal-info-value">${dispute.id}</div>
                    </div>
                    <div class="modal-info-item">
                        <div class="modal-info-label">Booking</div>
                        <div class="modal-info-value">${dispute.listingTitle}</div>
                    </div>
                    <div class="modal-info-item">
                        <div class="modal-info-label">Reporter</div>
                        <div class="modal-info-value">${dispute.reporterName} (${dispute.reporterType})</div>
                    </div>
                    <div class="modal-info-item">
                        <div class="modal-info-label">Respondent</div>
                        <div class="modal-info-value">${dispute.respondentName} (${dispute.respondentType})</div>
                    </div>
                    <div class="modal-info-item">
                        <div class="modal-info-label">Type</div>
                        <div class="modal-info-value">${dispute.disputeType}</div>
                    </div>
                    <div class="modal-info-item">
                        <div class="modal-info-label">Status</div>
                        <div class="modal-info-value"><span class="badge ${dispute.status}">${dispute.status}</span></div>
                    </div>
                    <div class="modal-info-item">
                        <div class="modal-info-label">Priority</div>
                        <div class="modal-info-value">${dispute.priority}</div>
                    </div>
                </div>
            </div>
            <div class="modal-section">
                <div class="modal-section-title">Description</div>
                <p style="color: var(--dark); line-height: 1.6;">${dispute.description}</p>
            </div>
            ${dispute.evidenceUrls && dispute.evidenceUrls.length > 0 ? `
                <div class="modal-section">
                    <div class="modal-section-title">Evidence Files (${dispute.evidenceUrls.length})</div>
                    <ul style="list-style: none; padding: 0;">
                        ${dispute.evidenceUrls.map((url, i) => `
                            <li style="margin-bottom: 0.5rem;">
                                <a href="${url}" target="_blank" style="color: var(--primary); text-decoration: none;">
                                    <i class="fa-solid fa-file"></i> Evidence ${i + 1}
                                </a>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
        `;

        window.openModal('Dispute Details', modalContent, `
            <button class="btn-secondary" onclick="closeModal()">Close</button>
            ${dispute.status !== 'resolved' && dispute.status !== 'dismissed' ? `
                <button class="btn btn-primary" onclick="updateDisputeStatus('${dispute.id}', 'under_review')">
                    <i class="fa-solid fa-magnifying-glass"></i> Mark Under Review
                </button>
                <button class="btn btn-primary" style="background: #22c55e;" onclick="updateDisputeStatus('${dispute.id}', 'resolved')">
                    <i class="fa-solid fa-check"></i> Resolve
                </button>
                <button class="btn btn-primary" style="background: #ef4444;" onclick="updateDisputeStatus('${dispute.id}', 'dismissed')">
                    <i class="fa-solid fa-xmark"></i> Dismiss
                </button>
            ` : ''}
        `);
    };

    // Dispute status update function
    window.updateDisputeStatus = async function (disputeId, newStatus) {
        const statusLabels = {
            'under_review': 'Under Review',
            'resolved': 'Resolved',
            'dismissed': 'Dismissed'
        };

        if (!confirm(`Change dispute status to "${statusLabels[newStatus]}"?`)) return;

        try {
            await updateDoc(doc(db, 'disputes', disputeId), {
                status: newStatus,
                updatedAt: serverTimestamp(),
                updatedBy: auth.currentUser?.uid
            });

            showToast(`Dispute status updated to ${statusLabels[newStatus]}`, 'success');
            loadDisputes(); // Reload disputes table
            closeModal(); // Close the modal
        } catch (error) {
            console.error('Error updating dispute:', error);
            showToast('Failed to update dispute status', 'error');
        }
    };

    // Load disputes on dashboard load
    loadDisputes();

    // 3. Render Charts
    renderCharts();
    renderAdvancedAnalytics();

    // 4. Load Tables
    loadUsers();
    loadListings();
    loadOrders();
    loadVerifications();
    loadReports();
}

// --- LOAD ALL DATA FOR ANALYTICS ---
async function loadAllData() {
    try {
        // Load Users
        const usersSnap = await getDocs(collection(db, "users"));
        analyticsData.users = [];
        usersSnap.forEach(doc => {
            analyticsData.users.push({ id: doc.id, ...doc.data() });
        });

        // Load Bookings
        const bookingsSnap = await getDocs(collection(db, "bookings"));
        analyticsData.bookings = [];
        bookingsSnap.forEach(doc => {
            analyticsData.bookings.push({ id: doc.id, ...doc.data() });
        });

        // Load Listings
        const listingsSnap = await getDocs(collection(db, "listings"));
        analyticsData.listings = [];
        listingsSnap.forEach(doc => {
            analyticsData.listings.push({ id: doc.id, ...doc.data() });
        });

        const propertiesSnap = await getDocs(collection(db, "properties"));
        analyticsData.properties = [];
        propertiesSnap.forEach(doc => {
            analyticsData.properties.push({ id: doc.id, ...doc.data() });
        });

    } catch (error) {
        console.error("Error loading analytics data:", error);
    }
}

// --- PENDING LISTINGS LOGIC ---
async function loadPendingListings() {
    try {
        const section = document.getElementById('pending-approvals-section');
        const badge = document.getElementById('pending-count-badge');
        const tbody = document.getElementById('pending-listings-table');

        // Query pending listings
        const q = query(collection(db, "listings"), where("status", "==", "pending"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            section.style.display = 'none';
            return;
        }

        // Show section if data exists
        section.style.display = 'block';
        badge.innerText = snapshot.size;

        tbody.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <img src="${data.image || 'https://via.placeholder.com/50'}" referrerpolicy="no-referrer" style="width: 50px; height: 50px; object-fit: cover; border-radius: 0.5rem;">
                </td>
                <td>
                    <strong>${data.title}</strong><br>
                    <small style="color: var(--secondary);">${doc.id.substring(0, 8)}...</small>
                </td>
                <td><span class="badge">${data.category}</span></td>
                <td>${data.ownerName || 'Unknown'}</td>
                <td>₹${data.rates?.daily || data.price || 0}/day</td>
                <td>
                    <button class="btn-sm btn-approve" onclick="window.approveListing('${doc.id}')">
                        <i class="fa-solid fa-check"></i> Approve
                    </button>
                    <button class="btn-sm" style="background: #fee2e2; color: #991b1b;" onclick="window.rejectListing('${doc.id}')">
                        <i class="fa-solid fa-xmark"></i> Reject
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error("Error loading pending listings:", error);
    }
}

// --- NOTIFICATION HELPER ---
async function createNotification(userId, title, body, type, metadata = {}) {
    try {
        await addDoc(collection(db, "notifications"), {
            userId: userId,
            title: title,
            body: body,
            type: type, // 'success', 'info', 'warning'
            read: false,
            createdAt: serverTimestamp(),
            ...metadata
        });
    } catch (error) {
        console.error("Error creating notification:", error);
    }
}

// --- LISTING APPROVAL ---
window.approveListing = async (id) => {
    if (!confirm("Approve this listing to go live?")) return;
    try {
        // Get listing data first to get owner info
        const listingRef = doc(db, "listings", id);
        const listingSnap = await getDoc(listingRef);

        if (!listingSnap.exists()) {
            showToast("Listing not found", "error");
            return;
        }

        const listingData = listingSnap.data();

        // Update listing status
        await updateDoc(listingRef, {
            status: "active",
            approvedAt: serverTimestamp(),
            approvedBy: auth.currentUser.uid
        });

        // Create notification for owner
        if (listingData.ownerId) {
            await createNotification(
                listingData.ownerId,
                'Listing Approved! 🎉',
                `Your listing "${listingData.title}" is now live on RentAnything.`,
                'success',
                { listingId: id, action: 'listing_approved' }
            );
        }

        // Send approval email
        try {
            const ownerDoc = await getDoc(doc(db, "users", listingData.ownerId));
            const ownerData = ownerDoc.data();

            if (ownerData?.email) {
                await sendListingApprovalEmail(
                    { id, ...listingData },
                    ownerData.email,
                    ownerData.displayName || ownerData.name || 'User'
                );
            }
        } catch (emailError) {
            console.error('Error sending listing approval email:', emailError);
        }

        showToast("Listing approved! ✅", "success");

        // Refresh ALL relevant sections
        loadPendingListings(); // Remove from pending
        loadListings(); // Show in listings table
        loadDashboard(); // Update stats
    } catch (error) {
        console.error("Error approving listing:", error);
        showToast("Failed to approve listing: " + error.message, "error");
    }
};

// --- LISTING REJECTION ---
window.rejectListing = async (id) => {
    const reason = prompt("Please provide a reason for rejection (will be sent to owner):");

    if (!reason || reason.trim() === '') {
        showToast("Rejection cancelled - reason is required", "info");
        return;
    }

    if (!confirm(`Reject this listing with reason: "${reason}"?`)) return;

    try {
        // Get listing data
        const listingRef = doc(db, "listings", id);
        const listingSnap = await getDoc(listingRef);

        if (!listingSnap.exists()) {
            showToast("Listing not found", "error");
            return;
        }

        const listingData = listingSnap.data();

        // Update listing
        await updateDoc(listingRef, {
            status: "rejected",
            rejectedAt: serverTimestamp(),
            rejectedBy: auth.currentUser.uid,
            rejectionReason: reason.trim()
        });

        // Notify owner
        if (listingData.ownerId) {
            await createNotification(
                listingData.ownerId,
                'Listing Rejected ⚠️',
                `Your listing "${listingData.title}" was not approved. Reason: ${reason}`,
                'warning',
                { listingId: id, action: 'listing_rejected', reason: reason }
            );
        }

        // Send rejection email
        try {
            const ownerDoc = await getDoc(doc(db, "users", listingData.ownerId));
            const ownerData = ownerDoc.data();

            if (ownerData?.email) {
                await sendListingRejectionEmail(
                    { id, ...listingData },
                    ownerData.email,
                    ownerData.displayName || ownerData.name || 'User',
                    reason
                );
            }
        } catch (emailError) {
            console.error('Error sending listing rejection email:', emailError);
        }

        showToast("Listing rejected ❌", "info");

        // Refresh sections
        loadPendingListings();
        loadListings();
        loadDashboard();
    } catch (error) {
        console.error("Error rejecting listing:", error);
        showToast("Failed to reject listing: " + error.message, "error");
    }
};

// --- PROPERTY APPROVALS ---
async function loadPendingProperties() {
    try {
        const badge = document.getElementById('badge-property-count');
        const tbody = document.querySelector('#table-property-approvals tbody');

        // Query pending properties
        const q = query(collection(db, "properties"), where("approvalStatus", "==", "pending"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--gray);">No pending property approvals</td></tr>';
            if (badge) badge.style.display = 'none';
            return;
        }

        // Show badge count
        if (badge) {
            badge.innerText = snapshot.size;
            badge.style.display = 'inline-flex';
        }

        tbody.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const createdDate = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'N/A';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <img src="${data.mainImage || data.images?.[0] || 'https://via.placeholder.com/50'}" 
                             style="width: 50px; height: 50px; object-fit: cover; border-radius: 0.5rem;">
                        <div>
                            <strong>${data.title}</strong><br>
                            <small style="color: var(--secondary);">${doc.id.substring(0, 8)}...</small>
                        </div>
                    </div>
                </td>
                <td>${data.ownerName || 'Unknown'}</td>
                <td>
                    ${data.address?.society || data.address?.building || 'N/A'}<br>
                    <small style="color: var(--gray);">${data.address?.area || ''}, ${data.address?.city || ''}</small>
                </td>
                <td><span class="badge">${data.type || 'N/A'}</span></td>
                <td style="font-weight:600;">₹${(data.monthlyRent || 0).toLocaleString()}/mo</td>
                <td><small>${createdDate}</small></td>
                <td>
                    <button class="btn-sm btn-approve" onclick="window.approveProperty('${doc.id}')">
                        <i class="fa-solid fa-check"></i> Approve
                    </button>
                    <button class="btn-sm" style="background: #fee2e2; color: #991b1b;" onclick="window.rejectProperty('${doc.id}')">
                        <i class="fa-solid fa-xmark"></i> Reject
                    </button>
                    <button class="btn-sm btn-view" onclick="window.open('/property-details.html?id=${doc.id}', '_blank')">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error("Error loading pending properties:", error);
    }
}

window.approveProperty = async (id) => {
    if (!confirm("Approve this property listing? It will be visible to all users.")) return;
    try {
        const propertyDoc = await getDoc(doc(db, "properties", id));
        const propertyData = { id, ...propertyDoc.data() };

        await updateDoc(doc(db, "properties", id), {
            status: "available",
            approvalStatus: "approved",
            approvedAt: new Date(),
            approvedAt: new Date(),
            approvedBy: auth.currentUser?.uid
        });

        // Create notification for owner
        if (propertyData.ownerId) {
            await createNotification(
                propertyData.ownerId,
                'Property Approved! 🏠',
                `Your property "${propertyData.title}" has been approved and is now visible.`,
                'success',
                { listingId: id, action: 'property_approved' }
            );
        }

        // Send approval email
        try {
            const ownerDoc = await getDoc(doc(db, "users", propertyData.ownerId));
            const ownerData = ownerDoc.data();

            if (ownerData?.email) {
                await sendPropertyApprovalEmail(
                    propertyData,
                    ownerData.email,
                    ownerData.displayName || ownerData.name || 'User'
                );
                // Approval email sent successfully
            }
        } catch (emailError) {
            console.error('Error sending approval email:', emailError);
            // Don't fail the approval if email fails
        }

        showToast("Property approved! ✅", "success");
        loadPendingProperties();
        loadDashboard();
    } catch (error) {
        console.error("Error approving property:", error);
        showToast("Failed to approve property", "error");
    }
};

let pendingRejectionPropertyId = null;

window.rejectProperty = async (id) => {
    pendingRejectionPropertyId = id;
    const modal = document.getElementById('rejection-modal');
    const textarea = document.getElementById('rejection-reason');

    // Clear previous input
    textarea.value = '';

    // Show modal
    modal.classList.add('active');
    textarea.focus();
};

window.closeRejectionModal = function () {
    const modal = document.getElementById('rejection-modal');
    modal.classList.remove('active');
    pendingRejectionPropertyId = null;
};

// Initialize rejection confirmation button
document.addEventListener('DOMContentLoaded', () => {
    const confirmBtn = document.getElementById('confirm-rejection-btn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            const reason = document.getElementById('rejection-reason').value.trim();

            if (!reason) {
                showToast('Please provide a rejection reason', 'warning');
                return;
            }

            if (pendingRejectionPropertyId) {
                try {
                    const propertyDoc = await getDoc(doc(db, "properties", pendingRejectionPropertyId));
                    const propertyData = { id: pendingRejectionPropertyId, ...propertyDoc.data() };

                    await updateDoc(doc(db, "properties", pendingRejectionPropertyId), {
                        status: "rejected",
                        approvalStatus: "rejected",
                        rejectedAt: new Date(),
                        rejectedBy: auth.currentUser?.uid,
                        rejectionReason: reason
                    });

                    // Send rejection email
                    try {
                        const ownerDoc = await getDoc(doc(db, "users", propertyData.ownerId));
                        const ownerData = ownerDoc.data();

                        if (ownerData?.email) {
                            await sendPropertyRejectionEmail(
                                propertyData,
                                ownerData.email,
                                ownerData.displayName || ownerData.name || 'User',
                                reason
                            );
                            // Rejection email sent successfully
                        }
                    } catch (emailError) {
                        console.error('Error sending rejection email:', emailError);
                        // Don't fail the rejection if email fails
                    }

                    showToast("Property rejected ❌", "info");
                    closeRejectionModal();
                    loadPendingProperties();
                    loadDashboard();
                } catch (error) {
                    console.error("Error rejecting property:", error);
                    showToast("Failed to reject property", "error");
                }
            }
        });
    }
});

// --- RENDER CHARTS ---
function renderCharts() {
    // Revenue Chart (existing)
    const totalRev = analyticsData.bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const ctx = document.getElementById('revenueChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Revenue (₹)',
                data: [1000, 3000, 2500, 4500, 6000, totalRev],
                borderColor: '#2563eb',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(37, 99, 235, 0.1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } }
        }
    });

    // Category Distribution (existing)
    const categoryCounts = {};
    analyticsData.listings.forEach(listing => {
        const cat = listing.category || 'Other';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const ctx2 = document.getElementById('categoryChart').getContext('2d');
    new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categoryCounts),
            datasets: [{
                data: Object.values(categoryCounts),
                backgroundColor: ['#2563eb', '#22c55e', '#f59e0b', '#64748b', '#ec4899', '#8b5cf6']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true
        }
    });
}

// --- ADVANCED ANALYTICS ---
function renderAdvancedAnalytics() {
    renderUserGrowthChart();
    renderBookingTrendsChart();
    loadTopListings();
    loadMostActiveUsers();
}

function renderUserGrowthChart() {
    // Group users by month
    const monthlyData = {};
    let filteredUsers = applyDateFilterToData(analyticsData.users, 'createdAt');

    filteredUsers.forEach(user => {
        if (user.createdAt) {
            const date = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
            const monthKey = `${date.getFullYear()} -${String(date.getMonth() + 1).padStart(2, '0')} `;
            monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
        }
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    const labels = sortedMonths.map(m => {
        const [year, month] = m.split('-');
        return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });
    const data = sortedMonths.map(m => monthlyData[m]);

    const ctx = document.getElementById('userGrowthChart').getContext('2d');
    // Destroy previous chart if exists
    if (window.userGrowthChartInstance) {
        window.userGrowthChartInstance.destroy();
    }
    window.userGrowthChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'New Users',
                data: data,
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true }
            }
        }
    });
}

function renderBookingTrendsChart() {
    // Group bookings by month
    const monthlyData = {};
    let filteredBookings = applyDateFilterToData(analyticsData.bookings, 'createdAt');

    filteredBookings.forEach(booking => {
        if (booking.createdAt) {
            const date = booking.createdAt.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt);
            const monthKey = `${date.getFullYear()} -${String(date.getMonth() + 1).padStart(2, '0')} `;
            monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
        }
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    const labels = sortedMonths.map(m => {
        const [year, month] = m.split('-');
        return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });
    const data = sortedMonths.map(m => monthlyData[m]);

    const ctx = document.getElementById('bookingTrendsChart').getContext('2d');
    // Destroy previous chart if exists
    if (window.bookingTrendsChartInstance) {
        window.bookingTrendsChartInstance.destroy();
    }
    window.bookingTrendsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Bookings',
                data: data,
                backgroundColor: '#2563eb',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true }
            }
        }
    });
}

function loadTopListings() {
    // Count bookings per listing
    const listingStats = {};
    analyticsData.bookings.forEach(booking => {
        const listingId = booking.listingId;
        if (!listingStats[listingId]) {
            listingStats[listingId] = { bookings: 0, revenue: 0 };
        }
        listingStats[listingId].bookings++;
        listingStats[listingId].revenue += (booking.totalPrice || 0);
    });

    // Match with listing details
    const topListings = analyticsData.listings.map(listing => ({
        id: listing.id,
        title: listing.title,
        bookings: listingStats[listing.id]?.bookings || 0,
        revenue: listingStats[listing.id]?.revenue || 0
    })).sort((a, b) => b.bookings - a.bookings).slice(0, 10);

    analyticsData.topListings = topListings;

    const tbody = document.querySelector('#table-top-listings tbody');
    tbody.innerHTML = '';
    topListings.forEach((listing, index) => {
        tbody.innerHTML += `
            <tr>
                <td style="font-weight: 700; color: var(--primary);">${index + 1}</td>
                <td>${listing.title || 'Unknown'}</td>
                <td><span class="badge verified">${listing.bookings}</span></td>
                <td style="font-weight: 600;">₹${listing.revenue.toLocaleString()}</td>
            </tr>
        `;
    });

    if (topListings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--secondary);">No data available</td></tr>';
    }
}

function loadMostActiveUsers() {
    // Count activity per user (listings + bookings)
    const userStats = {};

    analyticsData.listings.forEach(listing => {
        const uid = listing.ownerId;
        if (!userStats[uid]) {
            userStats[uid] = { listings: 0, bookings: 0, name: listing.ownerName || 'Unknown' };
        }
        userStats[uid].listings++;
    });

    analyticsData.bookings.forEach(booking => {
        const uid = booking.renterId;
        if (!userStats[uid]) {
            userStats[uid] = { listings: 0, bookings: 0, name: 'Unknown' };
        }
        userStats[uid].bookings++;
    });

    // Convert to array and sort by total activity
    const activeUsers = Object.entries(userStats).map(([uid, stats]) => ({
        uid,
        name: stats.name,
        listings: stats.listings,
        bookings: stats.bookings,
        totalActivity: stats.listings + stats.bookings
    })).sort((a, b) => b.totalActivity - a.totalActivity).slice(0, 10);

    analyticsData.activeUsers = activeUsers;

    const tbody = document.querySelector('#table-active-users tbody');
    tbody.innerHTML = '';
    activeUsers.forEach((user, index) => {
        tbody.innerHTML += `
            <tr>
                <td style="font-weight: 700; color: var(--primary);">${index + 1}</td>
                <td>${user.name}</td>
                <td><span class="badge pending">${user.listings}</span></td>
                <td><span class="badge verified">${user.bookings}</span></td>
            </tr>
        `;
    });

    if (activeUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--secondary);">No data available</td></tr>';
    }
}

// --- DATE FILTERING ---
function applyDateFilterToData(data, dateField) {
    if (!dateFilter.start && !dateFilter.end) return data;

    return data.filter(item => {
        if (!item[dateField]) return false;
        const itemDate = item[dateField].toDate ? item[dateField].toDate() : new Date(item[dateField]);

        if (dateFilter.start && itemDate < dateFilter.start) return false;
        if (dateFilter.end && itemDate > dateFilter.end) return false;

        return true;
    });
}

window.applyDateFilter = () => {
    const startInput = document.getElementById('date-from').value;
    const endInput = document.getElementById('date-to').value;

    if (startInput) dateFilter.start = new Date(startInput);
    if (endInput) {
        dateFilter.end = new Date(endInput);
        dateFilter.end.setHours(23, 59, 59, 999); // End of day
    }

    renderAdvancedAnalytics();
    showToast("Date filter applied", "success");
};

window.clearDateFilter = () => {
    dateFilter = { start: null, end: null };
    document.getElementById('date-from').value = '';
    document.getElementById('date-to').value = '';
    renderAdvancedAnalytics();
    showToast("Filter cleared", "info");
};

window.viewImage = (src) => {
    const m = document.getElementById('image-modal');
    document.getElementById('modal-img').src = src;
    m.style.display = 'flex';
    m.onclick = () => m.style.display = 'none';
};

// --- USER ACTIONS ---
window.toggleUserVerification = async (userId, currentlyVerified) => {
    const newStatus = currentlyVerified ? 'unverified' : 'verified';
    const action = currentlyVerified ? 'unverify' : 'verify';

    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
        await updateDoc(doc(db, "users", userId), {
            idVerificationStatus: newStatus
        });
        showToast(`User ${action}ed successfully!`, "success");
        loadUsers();
    } catch (error) {
        console.error(`Error ${action}ing user:`, error);
        showToast(`Failed to ${action} user`, "error");
    }
};

// --- LISTING ACTIONS ---
window.toggleListingStatus = async (listingId, currentlyActive) => {
    const newStatus = currentlyActive ? 'inactive' : 'active';
    const action = currentlyActive ? 'deactivate' : 'activate';

    if (!confirm(`Are you sure you want to ${action} this listing?`)) return;

    try {
        await updateDoc(doc(db, "listings", listingId), {
            status: newStatus
        });
        showToast(`Listing ${action}d successfully!`, "success");
        loadListings();
    } catch (error) {
        console.error(`Error ${action}ing listing:`, error);
        showToast(`Failed to ${action} listing`, "error");
    }
};

// --- BOOKING ACTIONS ---
window.viewBookingDetails = async (bookingId) => {
    try {
        const bookingDoc = await getDoc(doc(db, "bookings", bookingId));
        if (!bookingDoc.exists()) {
            showToast("Booking not found", "error");
            return;
        }

        const booking = bookingDoc.data();
        const details = `
BOOKING DETAILS

Booking ID: ${bookingId}
Listing: ${booking.listingTitle || 'N/A'}
Renter: ${booking.renterName || 'N/A'}
Start Date: ${booking.startDate?.toDate().toLocaleDateString() || 'N/A'}
End Date: ${booking.endDate?.toDate().toLocaleDateString() || 'N/A'}
Total Price: ₹${booking.totalPrice || booking.total || 0}
Status: ${booking.status || 'N/A'}
Security Deposit: ₹${booking.securityDeposit || 0}
Payment Status: ${booking.paymentStatus || 'N/A'}
        `.trim();

        // Enhanced modal view
        const modalContent = `
            <div class="modal-section">
                <div class="modal-info-grid">
                    <div class="modal-info-item">
                        <div class="modal-info-label">Booking ID</div>
                        <div class="modal-info-value">${booking.id}</div>
                    </div>
                    <div class="modal-info-item">
                        <div class="modal-info-label">Listing</div>
                        <div class="modal-info-value">${booking.listingTitle}</div>
                    </div>
                    <div class="modal-info-item">
                        <div class="modal-info-label">Renter</div>
                        <div class="modal-info-value">${booking.renterName} (${booking.renterEmail})</div>
                    </div>
                    <div class="modal-info-item">
                        <div class="modal-info-label">Owner</div>
                        <div class="modal-info-value">${booking.ownerName} (${booking.ownerEmail})</div>
                    </div>
                    <div class="modal-info-item">
                        <div class="modal-info-label">Status</div>
                        <div class="modal-info-value"><span class="badge ${booking.status}">${booking.status}</span></div>
                    </div>
                    <div class="modal-info-item">
                        <div class="modal-info-label">Total Price</div>
                        <div class="modal-info-value">₹${(booking.totalPrice || booking.total || 0).toLocaleString()}</div>
                    </div>
                    <div class="modal-info-item">
                        <div class="modal-info-label">Start Date</div>
                        <div class="modal-info-value">${booking.startDate}</div>
                    </div>
                    <div class="modal-info-item">
                        <div class="modal-info-label">End Date</div>
                        <div class="modal-info-value">${booking.endDate}</div>
                    </div>
                    <div class="modal-info-item">
                        <div class="modal-info-label">Created</div>
                        <div class="modal-info-value">${new Date(booking.createdAt?.seconds * 1000).toLocaleString() || 'N/A'}</div>
                    </div>
                </div>
            </div>
        `;

        window.openModal('Booking Details', modalContent);
    } catch (error) {
        console.error("Error viewing booking:", error);
        showToast("Failed to load booking details", "error");
    }
};

// --- CSV EXPORT ---
window.exportToCSV = (type) => {
    let data = [];
    let filename = '';
    let headers = [];

    switch (type) {
        case 'users':
            data = analyticsData.users.map(u => ({
                'Display Name': u.displayName || 'N/A',
                'Email': u.email || 'N/A',
                'Phone': u.phoneNumber || 'N/A',
                'Society': u.society || 'N/A',
                'Verification Status': u.idVerificationStatus || 'Unverified',
                'Joined Date': u.createdAt ? (u.createdAt.toDate ? u.createdAt.toDate().toLocaleDateString() : new Date(u.createdAt).toLocaleDateString()) : 'N/A'
            }));
            filename = 'users_export.csv';
            break;

        case 'bookings':
            data = analyticsData.bookings.map(b => ({
                'Listing ID': b.listingId || 'N/A',
                'Renter ID': b.renterId || 'N/A',
                'Status': b.status || 'N/A',
                'Start Date': b.startDate ? (b.startDate.toDate ? b.startDate.toDate().toLocaleDateString() : new Date(b.startDate).toLocaleDateString()) : 'N/A',
                'End Date': b.endDate ? (b.endDate.toDate ? b.endDate.toDate().toLocaleDateString() : new Date(b.endDate).toLocaleDateString()) : 'N/A',
                'Total Price': b.totalPrice || 0,
                'Security Deposit': b.securityDeposit || 0,
                'Created At': b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate().toLocaleDateString() : new Date(b.createdAt).toLocaleDateString()) : 'N/A'
            }));
            filename = 'bookings_export.csv';
            break;

        case 'topListings':
            data = analyticsData.topListings.map((l, idx) => ({
                'Rank': idx + 1,
                'Listing Title': l.title || 'N/A',
                'Total Bookings': l.bookings,
                'Total Revenue': l.revenue
            }));
            filename = 'top_listings_export.csv';
            break;

        case 'activeUsers':
            data = analyticsData.activeUsers.map((u, idx) => ({
                'Rank': idx + 1,
                'User Name': u.name,
                'Listings Created': u.listings,
                'Bookings Made': u.bookings,
                'Total Activity': u.totalActivity
            }));
            filename = 'active_users_export.csv';
            break;

        default:
            showToast("Unknown export type", "error");
            return;
    }

    if (data.length === 0) {
        showToast("No data to export", "warning");
        return;
    }

    // Convert to CSV
    headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const value = row[header];
            // Escape commas and quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${data.length} rows to ${filename}`, "success");
};

// Export Disputes
async function exportDisputes() {
    try {
        if (allDisputes.length === 0) {
            showToast('No disputes to export', 'warning');
            return;
        }

        const headers = ['ID', 'Listing', 'Reporter', 'Respondent', 'Type', 'Status', 'Priority', 'Created', 'Description'];
        const rows = [headers];

        allDisputes.forEach(d => {
            rows.push([
                d.id,
                d.listingTitle,
                `${d.reporterName} (${d.reporterType})`,
                `${d.respondentName} (${d.respondentType})`,
                d.disputeType,
                d.status,
                d.priority,
                new Date(d.createdAt?.seconds * 1000).toLocaleDateString(),
                (d.description || '').replace(/,/g, ';') // Replace commas for CSV
            ]);
        });

        const csvContent = "data:text/csv;charset=utf-8," + rows.map(r => r.join(",")).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `disputes_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast(`Exported ${allDisputes.length} disputes successfully`, 'success');
    } catch (error) {
        console.error('CSV Export Error:', error);
        showToast('Failed to export disputes. Please try again.', 'error');
    }
}

// --- DATA LOADERS ---
async function loadUsers() {
    const list = document.querySelector('#table-users tbody');
    if (!list) return;
    const snap = await getDocs(query(collection(db, "users"), limit(50)));
    list.innerHTML = '';
    snap.forEach(docSnap => {
        const d = docSnap.data();
        const isVerified = d.idVerificationStatus === 'verified';
        list.innerHTML += `
            <tr>
                <td><div style="font-weight:600">${d.displayName || 'User'}</div></td>
                <td>${d.email || '-'}</td>
                <td><span class="badge ${isVerified ? 'verified' : 'pending'}">${d.idVerificationStatus || 'Unverified'}</span></td>
                <td>${d.createdAt?.toDate().toLocaleDateString() || '-'}</td>
                <td>
                    <button class="btn-sm ${isVerified ? 'btn-view' : 'btn-approve'}" 
                        onclick="toggleUserVerification('${docSnap.id}', ${isVerified})">
                        ${isVerified ? 'Unverify' : 'Verify'}
                    </button>
                    <button class="btn-sm btn-view" onclick="window.open('profile.html?uid=${docSnap.id}', '_blank')">
                        <i class="fa-solid fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `;
    });
}

async function loadListings() {
    const list = document.querySelector('#table-listings tbody');
    if (!list) return;
    const snap = await getDocs(query(collection(db, "listings"), limit(50)));
    list.innerHTML = '';
    snap.forEach(docSnap => {
        const d = docSnap.data();
        const status = d.status || 'pending';

        // Determine badge style and button based on status
        let badgeClass = 'pending';
        let badgeText = status;
        let actionButtons = '';

        if (status === 'pending') {
            badgeClass = 'pending';
            badgeText = 'Pending';
            actionButtons = `
                <button class="btn-sm btn-approve" onclick="window.approveListing('${docSnap.id}')">
                    <i class="fa-solid fa-check"></i> Approve
                </button>
                <button class="btn-sm" style="background: #fee2e2; color: #991b1b;" onclick="window.rejectListing('${docSnap.id}')">
                    <i class="fa-solid fa-xmark"></i> Reject
                </button>
            `;
        } else if (status === 'active') {
            badgeClass = 'verified';
            badgeText = 'Active';
            actionButtons = `
                <button class="btn-sm" style="background: #fee2e2; color: #991b1b;" onclick="toggleListingStatus('${docSnap.id}', true)">
                    Deactivate
                </button>
            `;
        } else if (status === 'rejected') {
            badgeClass = 'open';
            badgeText = 'Rejected';
            actionButtons = `
                <button class="btn-sm btn-approve" onclick="window.approveListing('${docSnap.id}')">
                    <i class="fa-solid fa-check"></i> Approve
                </button>
            `;
        } else {
            badgeClass = 'pending';
            badgeText = 'Inactive';
            actionButtons = `
                <button class="btn-sm btn-approve" onclick="toggleListingStatus('${docSnap.id}', false)">
                    Activate
                </button>
            `;
        }

        list.innerHTML += `
            <tr>
                <td>${d.title || '-'}</td>
                <td>${d.category || '-'}</td>
                <td>₹${d.rates?.daily || d.price || '0'}</td>
                <td>${d.ownerName || 'Unknown'}</td>
                <td><span class="badge ${badgeClass}">${badgeText}</span></td>
                <td>
                    ${actionButtons}
                    <button class="btn-sm btn-view" onclick="window.open('/product.html?id=${docSnap.id}', '_blank')">
                        <i class="fa-solid fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `;
    });
}

async function loadOrders() {
    const list = document.querySelector('#table-bookings tbody');
    if (!list) return;
    const snap = await getDocs(query(collection(db, "bookings"), orderBy("createdAt", "desc"), limit(50)));
    list.innerHTML = '';
    snap.forEach(docSnap => {
        const d = docSnap.data();
        const totalPrice = d.totalPrice || d.total || 0;
        const startDate = d.startDate?.toDate ? d.startDate.toDate().toLocaleDateString() : '-';
        const endDate = d.endDate?.toDate ? d.endDate.toDate().toLocaleDateString() : '-';
        list.innerHTML += `
            <tr>
                <td>${d.listingTitle || `Listing #${d.listingId?.substring(0, 8)}...`}</td>
                <td>${d.renterName || `User #${d.renterId?.substring(0, 8)}...`}</td>
                <td>${startDate} - ${endDate}</td>
                <td style="font-weight: 600;">₹${totalPrice.toLocaleString()}</td>
                <td><span class="badge ${d.status === 'confirmed' || d.status === 'completed' ? 'verified' : 'pending'}">${d.status || 'Pending'}</span></td>
                <td>
                    <button class="btn-sm btn-view" onclick="viewBookingDetails('${docSnap.id}')">
                        <i class="fa-solid fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `;
    });
}

// --- OPERATIONS (Verifications & Reports) ---
async function loadVerifications() {
    const q = query(collection(db, "users"), where("idVerificationStatus", "==", "pending"));
    const snap = await getDocs(q);

    const badge = document.getElementById('badge-verif-count');
    if (snap.size > 0) { badge.innerText = snap.size; badge.style.display = 'inline-block'; }

    const list = document.getElementById('verify-list-body');
    list.innerHTML = '';
    snap.forEach(docSnap => {
        const d = docSnap.data();
        list.innerHTML += `
            <tr>
                <td>${d.displayName}<br><small>${d.email}</small></td>
                <td><img src="${d.idDocumentUrl}" referrerpolicy="no-referrer" style="width:40px; height:40px; object-fit:cover; border-radius:4px; cursor:zoom-in;" onclick="window.viewImage('${d.idDocumentUrl}')"></td>
                <td>
                    <button class="btn-sm btn-approve" onclick="verifyUser('${docSnap.id}', 'approve')">Approve</button>
                    <button class="btn-sm" style="background:#fee2e2; color:#991b1b;" onclick="verifyUser('${docSnap.id}', 'reject')">Reject</button>
                </td>
            </tr>
        `;
    });
}

async function loadReports() {
    const q = query(collection(db, "reports"), where("status", "==", "open"));
    const snap = await getDocs(q);

    const badge = document.getElementById('badge-report-count');
    if (snap.size > 0) { badge.innerText = snap.size; badge.style.display = 'inline-block'; }

    const list = document.getElementById('report-list-body');
    list.innerHTML = '';
    snap.forEach(docSnap => {
        const d = docSnap.data();
        list.innerHTML += `
            <tr>
                <td>${d.reporterName || 'Anon'}</td>
                <td>${d.issueType}</td>
                <td>${d.description.substring(0, 40)}...</td>
                <td><span class="badge open">Open</span></td>
                <td><button class="btn-sm btn-approve" onclick="resolveReport('${docSnap.id}')">Resolve</button></td>
            </tr>
        `;
    });
}

// --- GLOBAL ACTIONS ---
window.verifyUser = async (uid, action) => {
    if (!confirm(`Are you sure?`)) return;
    const newStatus = action === 'approve' ? 'verified' : 'rejected';
    try {
        await updateDoc(doc(db, "users", uid), { idVerificationStatus: newStatus });
        showToast("User updated!", "success");
        loadVerifications();
    } catch (e) { console.error(e); }
};

window.resolveReport = async (rid) => {
    if (!confirm("Resolve this issue?")) return;
    try {
        await updateDoc(doc(db, "reports", rid), { status: 'resolved' });
        showToast("Report resolved", "success");
        loadReports();
    } catch (e) { console.error(e); }
};

window.viewImage = (src) => {
    const m = document.getElementById('image-modal');
    document.getElementById('modal-img').src = src;
    m.style.display = 'flex';
    m.onclick = () => m.style.display = 'none';
};

// --- MOBILE MENU TOGGLE ---
document.addEventListener('DOMContentLoaded', () => {
    const mobileToggle = document.getElementById('mobile-toggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebar-close');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    // Function to open sidebar
    const openSidebar = () => {
        if (sidebar) sidebar.classList.add('active');
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
        // Prevent body scroll when sidebar is open on mobile
        document.body.style.overflow = 'hidden';
    };

    // Function to close sidebar
    const closeSidebar = () => {
        if (sidebar) sidebar.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        // Restore body scroll
        document.body.style.overflow = '';
    };

    // Mobile toggle button click
    if (mobileToggle) {
        mobileToggle.addEventListener('click', openSidebar);
    }

    // Close button click
    if (sidebarClose) {
        sidebarClose.addEventListener('click', closeSidebar);
    }

    // Overlay click
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }

    // Close sidebar when clicking on nav items on mobile
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Only close on mobile (when overlay is active)
            if (window.innerWidth <= 768 && sidebarOverlay && sidebarOverlay.classList.contains('active')) {
                closeSidebar();
            }
        });
    });
});

// === USER ACTIVITY TIMELINE ===
window.viewUserActivity = async function (userId, userName) {
    try {
        showToast('Loading user activity...', 'info');

        let timeline = [];

        // Fetch user's listings
        const listingsQ = query(collection(db, "listings"), where("ownerId", "==", userId));
        const listingsSnap = await getDocs(listingsQ);
        listingsSnap.forEach(doc => {
            const data = doc.data();
            timeline.push({
                type: 'listing',
                icon: 'fa-list',
                color: '#3b82f6',
                title: 'Listed Item',
                description: data.title,
                date: data.createdAt ? data.createdAt.toDate() : null,
                status: data.status
            });
        });

        // Fetch user's bookings as renter
        const bookingsQ = query(collection(db, "bookings"), where("renterId", "==", userId));
        const bookingsSnap = await getDocs(bookingsQ);
        bookingsSnap.forEach(doc => {
            const data = doc.data();
            timeline.push({
                type: 'booking',
                icon: 'fa-calendar-check',
                color: '#22c55e',
                title: 'Booked Item',
                description: data.listingTitle,
                date: data.createdAt ? data.createdAt.toDate() : null,
                status: data.status
            });
        });

        // Fetch user's properties
        const propertiesQ = query(collection(db, "properties"), where("ownerId", "==", userId));
        const propertiesSnap = await getDocs(propertiesQ);
        propertiesSnap.forEach(doc => {
            const data = doc.data();
            timeline.push({
                type: 'property',
                icon: 'fa-building',
                color: '#8b5cf6',
                title: 'Listed Property',
                description: data.title,
                date: data.createdAt ? data.createdAt.toDate() : null,
                status: data.approvalStatus
            });
        });

        // Sort by date (newest first)
        timeline.sort((a, b) => (b.date || 0) - (a.date || 0));

        // Build modal content
        const modalContent = `
            <div style="margin-bottom: 1rem;">
                <div style="font-size: 0.9rem; color: var(--secondary);">
                    Total Activities: <strong>${timeline.length}</strong>
                </div>
            </div>
            ${timeline.length === 0 ? `
                <div style="padding: 3rem 2rem; text-align: center; color: var(--secondary);">
                    <i class="fa-solid fa-inbox" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                    <p>No activity found for this user</p>
                </div>
            ` : `
                <div style="position: relative; padding-left: 2rem;">
                    <div style="position: absolute; left: 0.75rem; top: 0; bottom: 0; width: 2px; background: #e2e8f0;"></div>
                    ${timeline.map((item, index) => `
                        <div style="position: relative; margin-bottom: ${index === timeline.length - 1 ? '0' : '1.5rem'};">
                            <div style="position: absolute; left: -1.25rem; width: 2.5rem; height: 2.5rem; border-radius: 50%; background: ${item.color}15; border: 3px solid white; box-shadow: 0 0 0 3px ${item.color}; display: flex; align-items: center; justify-content: center;">
                                <i class="fa-solid ${item.icon}" style="color: ${item.color}; font-size: 0.9rem;"></i>
                            </div>
                            <div style="background: #f8fafc; padding: 1rem; border-radius: 0.5rem; border-left: 3px solid ${item.color};">
                                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                                    <div style="font-weight: 600; color: var(--dark);">${item.title}</div>
                                    <span style="font-size: 0.75rem; color: var(--secondary);">${item.date ? item.date.toLocaleDateString() : 'N/A'}</span>
                                </div>
                                <div style="color: var(--dark); margin-bottom: 0.5rem;">${item.description}</div>
                                <span style="font-size: 0.8rem; padding: 0.25rem 0.75rem; border-radius: 999px; background: ${item.status === 'active' || item.status === 'confirmed' ? '#dcfce7' : item.status === 'pending' ? '#fef3c7' : '#fee2e2'}; color: ${item.status === 'active' || item.status === 'confirmed' ? '#166534' : item.status === 'pending' ? '#92400e' : '#991b1b'}; font-weight: 600;">${item.status || 'N/A'}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
        `;

        window.openModal(`Activity Timeline - ${userName}`, modalContent);
    } catch (error) {
        console.error('Error loading user activity:', error);
        showToast('Failed to load user activity', 'error');
    }
};

// === EXPORT TO CSV ===
window.exportToCSV = function (data, filename) {
    if (!data || data.length === 0) {
        showToast('No data to export', 'warning');
        return;
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);

    // Build CSV content
    let csvContent = headers.join(',') + '\n';

    data.forEach(item => {
        const row = headers.map(header => {
            let value = item[header];

            // Handle special cases
            if (value === null || value === undefined) value = '';
            if (typeof value === 'object') value = JSON.stringify(value);

            // Escape quotes and wrap in quotes if contains comma
            value = String(value).replace(/"/g, '""');
            if (value.includes(',') || value.includes('\n')) {
                value = `"${value}"`;
            }

            return value;
        });
        csvContent += row.join(',') + '\n';
    });

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${data.length} records to CSV`, 'success');
};

// Export current users
window.exportUsers = async function () {
    try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const users = [];
        usersSnap.forEach(doc => {
            const data = doc.data();
            users.push({
                id: doc.id,
                name: data.displayName || '',
                email: data.email || '',
                phone: data.phone || '',
                joined: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : ''
            });
        });
        exportToCSV(users, 'users');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Export failed', 'error');
    }
};

// Export current listings
window.exportListings = async function () {
    try {
        const listingsSnap = await getDocs(collection(db, 'listings'));
        const listings = [];
        listingsSnap.forEach(doc => {
            const data = doc.data();
            listings.push({
                id: doc.id,
                title: data.title || '',
                category: data.category || '',
                owner: data.ownerName || '',
                price: data.rates?.daily || data.price || 0,
                status: data.status || '',
                created: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : ''
            });
        });
        exportToCSV(listings, 'listings');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Export failed', 'error');
    }
};

// Export current bookings
window.exportBookings = async function () {
    try {
        const bookingsSnap = await getDocs(collection(db, 'bookings'));
        const bookings = [];
        bookingsSnap.forEach(doc => {
            const data = doc.data();
            bookings.push({
                id: doc.id,
                listing: data.listingTitle || '',
                renter: data.renterName || '',
                amount: data.totalPrice || 0,
                status: data.status || '',
                created: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : ''
            });
        });
        exportToCSV(bookings, 'bookings');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Export failed', 'error');
    }
};

// --- IMAGE MODERATION ---
async function loadImageModeration() {
    const gallery = document.getElementById('image-gallery');
    if (!gallery) return;

    gallery.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem;"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading gallery...</div>';

    // Use listings from analyticsData
    const listings = analyticsData.listings;

    if (listings.length === 0) {
        gallery.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">No images found in listings.</p>';
        return;
    }

    let html = '';
    listings.forEach(listing => {
        // Collect all images (main image + images array)
        const images = [];
        if (listing.image) images.push(listing.image);
        if (listing.images && Array.isArray(listing.images)) {
            listing.images.forEach(img => { if (img !== listing.image) images.push(img); });
        }

        images.forEach(img => {
            html += `
                <div class="card" style="padding: 0.5rem; margin-bottom: 0;">
                    <img src="${img}" referrerpolicy="no-referrer" style="width: 100%; height: 160px; object-fit: cover; border-radius: 0.5rem; cursor: pointer;" 
                         onclick="window.viewImage('${img}')" onerror="this.src='https://placehold.co/200x150?text=Error'">
                    <div style="margin-top: 0.5rem; font-size: 0.8rem;">
                        <strong>${listing.title.substring(0, 20)}...</strong><br>
                        <span style="color: var(--secondary);">${listing.ownerName || 'Unknown Owner'}</span>
                    </div>
                </div>
            `;
        });
    });

    gallery.innerHTML = html || '<p style="grid-column: 1/-1; text-align: center;">No images to display.</p>';
}

// --- SYSTEM HEALTH ---
async function loadSystemHealth() {
    // Fill basic stats from analyticsData
    document.getElementById('health-users').innerText = analyticsData.users.length;
    document.getElementById('health-listings').innerText = analyticsData.listings.length;
    document.getElementById('health-bookings').innerText = analyticsData.bookings.length;
    document.getElementById('health-properties').innerText = analyticsData.properties.length;

    // Calculate quality metrics
    let totalImages = 0;
    let listingsWithNoImages = 0;
    let flaggedCount = 0;
    let priceIssues = 0;
    let keywordMatches = 0;
    const suspiciousKeywords = ['scam', 'fake', 'test', 'dummy', 'spam'];

    analyticsData.listings.forEach(l => {
        // Image stats
        const imgCount = l.images ? l.images.length : (l.image ? 1 : 0);
        totalImages += imgCount;
        if (imgCount === 0) listingsWithNoImages++;

        // Flagged logic
        if (l.status === 'rejected' || l.status === 'flagged') flaggedCount++;

        // Price issue logic (e.g., abnormally high/low prices)
        const price = parseFloat(l.price || (l.rates ? l.rates.daily : 0));
        if (price > 100000 || price <= 1) priceIssues++;

        // Keyword matches
        const content = (l.title + ' ' + (l.description || '')).toLowerCase();
        if (suspiciousKeywords.some(word => content.includes(word))) keywordMatches++;
    });

    // Populate the Health UI
    document.getElementById('health-total-images').innerText = totalImages;
    document.getElementById('health-no-images').innerText = listingsWithNoImages;
    document.getElementById('health-avg-images').innerText = analyticsData.listings.length > 0 ? (totalImages / analyticsData.listings.length).toFixed(1) : 0;
    document.getElementById('health-flagged').innerText = flaggedCount;
    document.getElementById('health-price-issues').innerText = priceIssues;
    document.getElementById('health-keyword-matches').innerText = keywordMatches;
}

async function performGlobalSearch(searchTerm) {
    const resultsContent = document.getElementById('search-results-content');
    const resultsContainer = document.getElementById('search-results');
    resultsContent.innerHTML = '<div style="padding:1rem; text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Searching...</div>';
    resultsContainer.style.display = 'block';

    try {
        // Simple client-side filtering of already loaded analyticsData
        const userMatches = analyticsData.users.filter(u =>
            (u.displayName || '').toLowerCase().includes(searchTerm) ||
            (u.email || '').toLowerCase().includes(searchTerm)
        ).slice(0, 3);

        const listingMatches = analyticsData.listings.filter(l =>
            (l.title || '').toLowerCase().includes(searchTerm)
        ).slice(0, 3);

        if (userMatches.length === 0 && listingMatches.length === 0) {
            resultsContent.innerHTML = '<div style="padding:1rem; color:var(--secondary);">No results found</div>';
            return;
        }

        resultsContent.innerHTML = `
            ${userMatches.map(u => `
                <div class="search-item" onclick="window.viewUserActivity('${u.id}', '${u.displayName}')" style="padding:0.75rem; cursor:pointer; border-bottom:1px solid #f1f5f9;">
                    <i class="fa-solid fa-user" style="color:var(--primary);"></i> ${u.displayName || 'User'} <small>(${u.email})</small>
                </div>
            `).join('')}
            ${listingMatches.map(l => `
                <div class="search-item" onclick="window.open('/product.html?id=${l.id}', '_blank')" style="padding:0.75rem; cursor:pointer; border-bottom:1px solid #f1f5f9;">
                    <i class="fa-solid fa-box" style="color:var(--success);"></i> ${l.title}
                </div>
            `).join('')}
        `;
    } catch (error) {
        resultsContent.innerHTML = '<div style="padding:1rem; color:red;">Search error</div>';
    }
}
window.performGlobalSearch = performGlobalSearch;

// --- MISSING FUNCTIONS IMPLEMENTATION ---

/**
 * Logout function alias for admin.html onclick handler
 */
window.logout = function () {
    window.logoutAdmin();
};

/**
 * Toggle notification dropdown - alias for toggleDropdown
 */
window.toggleNotifications = function () {
    const notificationBell = document.getElementById('notification-bell');
    if (notificationBell) {
        toggleDropdown(notificationBell);
    }
};

/**
 * Toggle sidebar for mobile view
 */
window.toggleSidebar = function () {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (sidebar && overlay) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
};

/**
 * Open generic modal
 * @param {string} modalId - ID of the modal element to open
 */
window.openModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
};

/**
 * Close generic modal
 * @param {string} modalId - Optional ID of specific modal, otherwise closes the modal with class 'active'
 */
window.closeModal = function (modalId) {
    if (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    } else {
        // Close any active modal
        const activeModals = document.querySelectorAll('.modal-overlay.active, .modal-container.active');
        activeModals.forEach(modal => {
            modal.classList.remove('active');
            modal.style.display = 'none';
        });
    }
};

// ============ ADMIN PWA INSTALL & NOTIFICATIONS ============

// Store the install prompt
let adminDeferredPrompt = null;

// Listen for beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    adminDeferredPrompt = e;
    // Show the install button
    const installBtn = document.getElementById('admin-install-btn');
    if (installBtn) {
        installBtn.style.display = 'flex';
    }
});

// Install admin app as PWA
window.installAdminApp = async function () {
    if (!adminDeferredPrompt) {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            showToast('App is already installed!', 'info');
        } else {
            showToast('Install not available. Try using Chrome or Edge.', 'warning');
        }
        return;
    }

    try {
        adminDeferredPrompt.prompt();
        const { outcome } = await adminDeferredPrompt.userChoice;

        if (outcome === 'accepted') {
            showToast('Admin App installed successfully! 🎉', 'success');
            // Hide install button
            const installBtn = document.getElementById('admin-install-btn');
            if (installBtn) installBtn.style.display = 'none';
        }

        adminDeferredPrompt = null;
    } catch (error) {
        console.error('Install error:', error);
        showToast('Install failed. Please try again.', 'error');
    }
};

// Enable push notifications
window.enableNotifications = async function () {
    const notifBtn = document.getElementById('admin-notif-btn');

    // Check if notifications are supported
    if (!('Notification' in window)) {
        showToast('Notifications are not supported in this browser', 'warning');
        return;
    }

    // Check current permission state
    if (Notification.permission === 'granted') {
        showToast('Notifications are already enabled! ✅', 'info');
        if (notifBtn) {
            notifBtn.innerHTML = '<i class="fa-solid fa-bell-slash"></i> Notifications Enabled';
        }
        return;
    }

    if (Notification.permission === 'denied') {
        showToast('Notifications were blocked. Please enable them in browser settings.', 'warning');
        return;
    }

    // Request permission
    try {
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            showToast('Notifications enabled! Saving your token...', 'info');

            // Save FCM token for push notifications
            try {
                const currentUser = auth.currentUser;
                if (currentUser) {
                    // Import FCM manager dynamically
                    const { requestAndSaveFCMToken } = await import('./fcm-manager.js');
                    await requestAndSaveFCMToken(currentUser.uid, true); // true = isAdmin
                }
            } catch (fcmError) {
                console.error('FCM token save error:', fcmError);
                // Still show success for browser notifications
            }

            showToast('Notifications enabled! You will receive alerts for new listings, properties, and disputes. 🔔', 'success');

            // Update button UI
            if (notifBtn) {
                notifBtn.innerHTML = '<i class="fa-solid fa-bell"></i> Notifications Enabled';
                notifBtn.style.color = '#22c55e';
            }

            // Send a test notification
            new Notification('RentAnything Admin', {
                body: 'You will now receive admin notifications!',
                icon: '/logo.png',
                badge: '/logo.png'
            });
        } else {
            showToast('Notification permission denied', 'warning');
        }
    } catch (error) {
        console.error('Notification permission error:', error);
        showToast('Failed to enable notifications', 'error');
    }
};

// Register admin service worker on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Register service worker for PWA and push notifications
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/admin-sw.js');
            console.log('Admin Service Worker registered:', registration);

            // Update install button visibility based on standalone mode
            if (window.matchMedia('(display-mode: standalone)').matches) {
                const installBtn = document.getElementById('admin-install-btn');
                if (installBtn) installBtn.style.display = 'none';
            }

            // Check notification permission and update UI
            if (Notification.permission === 'granted') {
                const notifBtn = document.getElementById('admin-notif-btn');
                if (notifBtn) {
                    notifBtn.innerHTML = '<i class="fa-solid fa-bell"></i> Notifications Enabled';
                    notifBtn.style.color = '#22c55e';
                }
            }
        } catch (error) {
            console.error('Admin SW registration failed:', error);
        }
    }
});
