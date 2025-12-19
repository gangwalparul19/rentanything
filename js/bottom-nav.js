/**
 * Bottom Navigation Component
 * Mobile-only bottom navigation bar
 */

class BottomNav {
    constructor(items = []) {
        this.items = items.length > 0 ? items : this.getDefaultItems();
        this.currentPath = window.location.pathname;
        this.init();
    }

    getDefaultItems() {
        return [
            { icon: 'fa-house', label: 'Home', path: '/' },
            { icon: 'fa-magnifying-glass', label: 'Search', path: '/search.html' },
            { icon: 'fa-heart', label: 'Saved', path: '/favorites.html' },
            { icon: 'fa-message', label: 'Messages', path: '/chat.html' },
            { icon: 'fa-user', label: 'Profile', path: '/profile.html' }
        ];
    }

    init() {
        // Only show on mobile
        if (window.matchMedia('(min-width: 769px)').matches) {
            return;
        }

        // Create bottom nav HTML
        const nav = document.createElement('nav');
        nav.className = 'bottom-navigation';
        nav.innerHTML = `
            <div class="bottom-nav-items">
                ${this.items.map(item => this.createNavItem(item)).join('')}
            </div>
        `;

        document.body.appendChild(nav);

        // Add body padding to prevent content from hiding behind nav
        document.body.style.paddingBottom = '80px';
    }

    createNavItem(item) {
        const isActive = this.isActive(item.path);
        return `
            <a href="${item.path}" class="bottom-nav-item ${isActive ? 'active' : ''}">
                <i class="fa-solid ${item.icon}"></i>
                <span class="nav-label">${item.label}</span>
            </a>
        `;
    }

    isActive(path) {
        if (path === '/' && this.currentPath === '/') return true;
        if (path !== '/' && this.currentPath.includes(path)) return true;
        return false;
    }
}

// Export
window.BottomNav = BottomNav;
export { BottomNav };

// Auto-initialize on mobile
if (window.matchMedia('(max-width: 768px)').matches) {
    new BottomNav();
}
