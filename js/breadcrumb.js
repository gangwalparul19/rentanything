/**
 * Breadcrumb Navigation Component
 * Provides contextual navigation path for users
 */

class Breadcrumb {
    constructor(containerId = 'breadcrumb-nav') {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            // Create container if it doesn't exist
            this.container = document.createElement('nav');
            this.container.id = containerId;
            this.container.className = 'breadcrumb-nav';
            this.container.setAttribute('aria-label', 'Breadcrumb');

            // Insert at top of main content
            const main = document.querySelector('main') || document.querySelector('.main-content');
            if (main) {
                main.insertBefore(this.container, main.firstChild);
            }
        }

        this.items = [];
    }

    /**
     * Add breadcrumb item
     * @param {string} label - Display text
     * @param {string} url - Link URL (optional for last item)
     */
    addItem(label, url = null) {
        this.items.push({ label, url });
        return this;
    }

    /**
     * Build breadcrumb from current page
     */
    buildFromPath() {
        const path = window.location.pathname;
        const params = new URLSearchParams(window.location.search);

        // Always start with Home
        this.addItem('Home', '/');

        // Parse path
        if (path.includes('/search')) {
            this.addItem('Search', '/search.html');

            // Add category if present
            const category = params.get('category');
            if (category) {
                this.addItem(this.formatLabel(category));
            }
        } else if (path.includes('/product')) {
            this.addItem('Search', '/search.html');

            // Get product title from page if available
            const productTitle = document.querySelector('h1')?.textContent;
            if (productTitle) {
                this.addItem(productTitle);
            } else {
                this.addItem('Product Details');
            }
        } else if (path.includes('/properties')) {
            this.addItem('Properties', '/properties.html');
        } else if (path.includes('/property-details')) {
            this.addItem('Properties', '/properties.html');
            const propertyTitle = document.querySelector('h1')?.textContent;
            if (propertyTitle) {
                this.addItem(propertyTitle);
            }
        } else if (path.includes('/my-bookings')) {
            this.addItem('My Account', '/profile.html');
            this.addItem('My Bookings');
        } else if (path.includes('/chat')) {
            this.addItem('Messages');
        } else if (path.includes('/profile')) {
            this.addItem('My Account');
        }

        return this;
    }

    /**
     * Format label for display
     */
    formatLabel(str) {
        return str
            .replace(/-/g, ' ')
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Render breadcrumb
     */
    render() {
        if (this.items.length === 0) {
            this.buildFromPath();
        }

        const ol = document.createElement('ol');
        ol.className = 'breadcrumb-list';

        this.items.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'breadcrumb-item';

            if (index === this.items.length - 1) {
                // Last item (current page)
                li.setAttribute('aria-current', 'page');
                li.innerHTML = `<span>${item.label}</span>`;
            } else if (item.url) {
                // Linked item
                li.innerHTML = `
                    <a href="${item.url}">${item.label}</a>
                    <span class="breadcrumb-separator">
                        <i class="fa-solid fa-chevron-right"></i>
                    </span>
                `;
            } else {
                // Non-linked item
                li.innerHTML = `
                    <span>${item.label}</span>
                    <span class="breadcrumb-separator">
                        <i class="fa-solid fa-chevron-right"></i>
                    </span>
                `;
            }

            ol.appendChild(li);
        });

        this.container.innerHTML = '';
        this.container.appendChild(ol);

        return this;
    }

    /**
     * Clear breadcrumb
     */
    clear() {
        this.items = [];
        this.container.innerHTML = '';
        return this;
    }
}

// Auto-initialize breadcrumb on compatible pages
function initBreadcrumb() {
    // Skip on homepage and admin
    if (window.location.pathname === '/' || window.location.pathname.includes('/admin')) {
        return;
    }

    const breadcrumb = new Breadcrumb();
    breadcrumb.render();
}

// Export
window.Breadcrumb = Breadcrumb;
export { Breadcrumb, initBreadcrumb };

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBreadcrumb);
} else {
    initBreadcrumb();
}
