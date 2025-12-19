/**
 * Admin Dashboard Widgets Enhancement
 * Adds sparklines, trend indicators, and quick actions to KPI cards
 */

// Store historical data for sparklines (mock data for now, can be replaced with real data)
let kpiHistory = {
    users: [45, 52, 48, 61, 70, 75, 82],
    listings: [120, 135, 128, 145, 152, 158, 165],
    bookings: [15, 18, 22, 19, 25, 28, 32],
    revenue: [45000, 52000, 48000, 61000, 65000, 70000, 75000]
};

/**
 * Create a simple sparkline chart using canvas
 * @param {string} canvasId - ID of canvas element
 * @param {Array} data - Array of numbers to plot
 * @param {string} color - Line color
 */
function createSparkline(canvasId, data, color = '#2563eb') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate min/max for scaling
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    // Calculate points
    const points = data.map((value, index) => ({
        x: (index / (data.length - 1)) * width,
        y: height - ((value - min) / range) * height
    }));

    // Draw area fill
    ctx.beginPath();
    ctx.moveTo(0, height);
    points.forEach(point => {
        ctx.lineTo(point.x, point.y);
    });
    ctx.lineTo(width, height);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, color + '40'); // 25% opacity
    gradient.addColorStop(1, color + '00'); // 0% opacity
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach(point => {
        ctx.lineTo(point.x, point.y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
}

/**
 * Calculate trend percentage from last two data points
 * @param {Array} data - Historical data
 * @returns {Object} {value, isPositive}
 */
function calculateTrend(data) {
    if (data.length < 2) return { value: 0, isPositive: true };

    const current = data[data.length - 1];
    const previous = data[data.length - 2];
    const change = ((current - previous) / previous) * 100;

    return {
        value: Math.abs(change).toFixed(1),
        isPositive: change >= 0
    };
}

/**
 * Enhance KPI card with sparkline and trend indicator
 * @param {string} cardId - ID of the KPI card element
 * @param {Object} options - Configuration options
 */
function enhanceKPICard(cardId, options = {}) {
    const {
        data = [],
        color = '#2563eb',
        showSparkline = true,
        showTrend = true,
        quickActions = []
    } = options;

    const card = document.getElementById(cardId);
    if (!card) return;

    // Add sparkline canvas if enabled
    if (showSparkline && data.length > 0) {
        let sparklineContainer = card.querySelector('.kpi-sparkline');
        if (!sparklineContainer) {
            sparklineContainer = document.createElement('div');
            sparklineContainer.className = 'kpi-sparkline';
            sparklineContainer.innerHTML = `<canvas width="100" height="30" id="${cardId}-sparkline"></canvas>`;
            card.querySelector('.kpi-info').appendChild(sparklineContainer);
        }

        // Render sparkline
        setTimeout(() => createSparkline(`${cardId}-sparkline`, data, color), 100);
    }

    // Add trend indicator if enabled
    if (showTrend && data.length > 1) {
        const trend = calculateTrend(data);
        let trendEl = card.querySelector('.kpi-trend');

        if (!trendEl) {
            trendEl = document.createElement('div');
            trendEl.className = 'kpi-trend';
            card.querySelector('.kpi-info').appendChild(trendEl);
        }

        trendEl.innerHTML = `
            <span class="trend-indicator ${trend.isPositive ? 'trend-up' : 'trend-down'}">
                <i class="fa-solid fa-arrow-${trend.isPositive ? 'up' : 'down'}"></i>
                ${trend.value}%
            </span>
            <span class="trend-label">vs last period</span>
        `;
    }

    // Add quick actions if provided
    if (quickActions.length > 0) {
        let actionsEl = card.querySelector('.kpi-actions');

        if (!actionsEl) {
            actionsEl = document.createElement('div');
            actionsEl.className = 'kpi-actions';
            card.appendChild(actionsEl);
        }

        actionsEl.innerHTML = quickActions.map(action => `
            <button class="kpi-action-btn" onclick="${action.onClick}">
                <i class="fa-solid fa-${action.icon}"></i>
                ${action.label}
            </button>
        `).join('');
    }
}

/**
 * Initialize all KPI enhancements
 */
function initAdminDashboardWidgets() {
    // Enhance Users KPI
    enhanceKPICard('users-kpi', {
        data: kpiHistory.users,
        color: '#2563eb',
        quickActions: [
            { icon: 'user-plus', label: 'Add User', onClick: 'openAddUserModal()' },
            { icon: 'list', label: 'View All', onClick: 'showSection("users-section")' }
        ]
    });

    // Enhance Listings KPI
    enhanceKPICard('listings-kpi', {
        data: kpiHistory.listings,
        color: '#16a34a',
        quickActions: [
            { icon: 'plus', label: 'New Listing', onClick: 'window.location.href="/create-listing.html"' },
            { icon: 'list', label: 'View All', onClick: 'showSection("listings-section")' }
        ]
    });

    // Enhance Bookings KPI
    enhanceKPICard('bookings-kpi', {
        data: kpiHistory.bookings,
        color: '#f59e0b',
        quickActions: [
            { icon: 'calendar', label: 'View Calendar', onClick: 'showSection("bookings-section")' }
        ]
    });

    // Enhance Revenue KPI
    enhanceKPICard('revenue-kpi', {
        data: kpiHistory.revenue,
        color: '#9333ea',
        quickActions: [
            { icon: 'chart-line', label: 'Analytics', onClick: 'showSection("analytics-section")' }
        ]
    });
}

// Export functions
window.enhanceKPICard = enhanceKPICard;
window.initAdminDashboardWidgets = initAdminDashboardWidgets;
window.kpiHistory = kpiHistory;

// Auto-initialize when dashboard loads
if (typeof window.loadDashboard === 'function') {
    const originalLoadDashboard = window.loadDashboard;
    window.loadDashboard = async function () {
        await originalLoadDashboard();
        initAdminDashboardWidgets();
    };
}
