/**
 * Pull-to-Refresh Component
 * Native app-like pull-to-refresh functionality for mobile
 */

class PullToRefresh {
    constructor(options = {}) {
        this.options = {
            container: document.body,
            threshold: 80,
            maxPull: 120,
            onRefresh: () => window.location.reload(),
            ...options
        };

        this.container = typeof this.options.container === 'string'
            ? document.querySelector(this.options.container)
            : this.options.container;

        this.startY = 0;
        this.currentY = 0;
        this.pulling = false;
        this.refreshing = false;

        this.init();
    }

    init() {
        // Create pull indicator
        this.indicator = document.createElement('div');
        this.indicator.className = 'pull-to-refresh-indicator';
        this.indicator.innerHTML = `
            <div class="pull-icon">
                <i class="fa-solid fa-arrow-down"></i>
            </div>
            <div class="pull-text">Pull to refresh</div>
        `;

        // Insert at top of container
        if (this.container.firstChild) {
            this.container.insertBefore(this.indicator, this.container.firstChild);
        } else {
            this.container.appendChild(this.indicator);
        }

        // Add touch event listeners
        this.container.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: true });
        this.container.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        this.container.addEventListener('touchend', () => this.onTouchEnd());
    }

    onTouchStart(e) {
        // Only trigger if scrolled to top
        if (window.scrollY === 0 && !this.refreshing) {
            this.startY = e.touches[0].clientY;
            this.pulling = true;
        }
    }

    onTouchMove(e) {
        if (!this.pulling || this.refreshing) return;

        this.currentY = e.touches[0].clientY;
        const pullDistance = Math.min(
            Math.max(this.currentY - this.startY, 0),
            this.options.maxPull
        );

        if (pullDistance > 0) {
            e.preventDefault(); // Prevent scroll

            // Update indicator
            this.indicator.style.height = `${pullDistance}px`;
            this.indicator.style.opacity = Math.min(pullDistance / this.options.threshold, 1);

            // Change icon based on threshold
            const icon = this.indicator.querySelector('.pull-icon i');
            const text = this.indicator.querySelector('.pull-text');

            if (pullDistance >= this.options.threshold) {
                icon.className = 'fa-solid fa-rotate';
                text.textContent = 'Release to refresh';
                this.indicator.classList.add('ready');
            } else {
                icon.className = 'fa-solid fa-arrow-down';
                text.textContent = 'Pull to refresh';
                this.indicator.classList.remove('ready');
            }

            // Rotate icon
            icon.style.transform = `rotate(${pullDistance * 2}deg)`;
        }
    }

    async onTouchEnd() {
        if (!this.pulling) return;

        this.pulling = false;
        const pullDistance = this.currentY - this.startY;

        if (pullDistance >= this.options.threshold && !this.refreshing) {
            // Trigger refresh
            this.refreshing = true;
            this.indicator.classList.add('refreshing');
            this.indicator.querySelector('.pull-icon i').className = 'fa-solid fa-spinner fa-spin';
            this.indicator.querySelector('.pull-text').textContent = 'Refreshing...';

            try {
                await this.options.onRefresh();
            } catch (error) {
                console.error('Refresh failed:', error);
            } finally {
                // Reset after delay
                setTimeout(() => {
                    this.reset();
                }, 500);
            }
        } else {
            // Reset without refresh
            this.reset();
        }
    }

    reset() {
        this.indicator.style.height = '0px';
        this.indicator.style.opacity = '0';
        this.indicator.classList.remove('ready', 'refreshing');
        this.refreshing = false;
        this.startY = 0;
        this.currentY = 0;
    }
}

// Export
window.PullToRefresh = PullToRefresh;
export { PullToRefresh };

// Auto-initialize on mobile pages
if (window.matchMedia('(max-width: 768px)').matches) {
    // Initialize on pages that benefit from refresh
    const refreshablePages = ['/search.html', '/properties.html', '/my-bookings.html'];
    const currentPath = window.location.pathname;

    if (refreshablePages.some(page => currentPath.includes(page))) {
        new PullToRefresh({
            onRefresh: async () => {
                // Custom refresh logic per page
                if (typeof window.filterAndRender === 'function') {
                    await window.filterAndRender();
                } else if (typeof window.loadProperties === 'function') {
                    await window.loadProperties();
                } else {
                    window.location.reload();
                }
            }
        });
    }
}
