/**
 * Empty State Component
 * Beautiful, informative empty states with SVG illustrations
 */

const emptyStateIllustrations = {
    search: `
        <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="80" cy="80" r="40" stroke="#E5E7EB" stroke-width="8" fill="none"/>
            <path d="M110 110L140 140" stroke="#E5E7EB" stroke-width="8" stroke-linecap="round"/>
            <circle cx="100" cy="100" r="60" stroke="#3B82F6" stroke-width="4" fill="none" opacity="0.3"/>
            <text x="100" y="180" text-anchor="middle" fill="#6B7280" font-size="14">No results found</text>
        </svg>
    `,
    bookings: `
        <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="40" y="40" width="120" height="120" rx="8" stroke="#E5E7EB" stroke-width="4" fill="#F9FAFB"/>
            <rect x="60" y="20" width="20" height="40" rx="4" fill="#3B82F6"/>
            <rect x="120" y="20" width="20" height="40" rx="4" fill="#3B82F6"/>
            <line x1="60" y1="80" x2="140" y2="80" stroke="#E5E7EB" stroke-width="2"/>
            <line x1="60" y1="100" x2="140" y2="100" stroke="#E5E7EB" stroke-width="2"/>
            <line x1="60" y1="120" x2="140" y2="120" stroke="#E5E7EB" stroke-width="2"/>
            <text x="100" y="180" text-anchor="middle" fill="#6B7280" font-size="14">No bookings yet</text>
        </svg>
    `,
    favorites: `
        <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 60 L115 90 L150 95 L125 120 L130 155 L100 140 L70 155 L75 120 L50 95 L85 90 Z" 
                  stroke="#E5E7EB" stroke-width="4" fill="#F9FAFB"/>
            <circle cx="100" cy="100" r="70" stroke="#EF4444" stroke-width="2" fill="none" opacity="0.3"/>
            <text x="100" y="180" text-anchor="middle" fill="#6B7280" font-size="14">No favorites saved</text>
        </svg>
    `,
    messages: `
        <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="30" y="60" width="140" height="80" rx="12" stroke="#E5E7EB" stroke-width="4" fill="#F9FAFB"/>
            <path d="M30 60 L100 110 L170 60" stroke="#3B82F6" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <text x="100" y="180" text-anchor="middle" fill="#6B7280" font-size="14">No messages</text>
        </svg>
    `,
    properties: `
        <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 40 L160 80 L160 150 L40 150 L40 80 Z" stroke="#E5E7EB" stroke-width="4" fill="#F9FAFB"/>
            <rect x="80" y="110" width="40" height="40" fill="#3B82F6" opacity="0.3"/>
            <rect x="60" y="80" width="25" height="25" fill="#E5E7EB"/>
            <rect x="115" y="80" width="25" height="25" fill="#E5E7EB"/>
            <text x="100" y="180" text-anchor="middle" fill="#6B7280" font-size="14">No properties found</text>
        </svg>
    `
};

class EmptyState {
    constructor(container, type, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.type = type;
        this.options = {
            title: this.getDefaultTitle(type),
            description: this.getDefaultDescription(type),
            actions: [],
            ...options
        };

        this.render();
    }

    getDefaultTitle(type) {
        const titles = {
            search: 'No results found',
            bookings: 'No bookings yet',
            favorites: 'No favorites saved',
            messages: 'No messages',
            properties: 'No properties found',
            default: 'Nothing here yet'
        };
        return titles[type] || titles.default;
    }

    getDefaultDescription(type) {
        const descriptions = {
            search: 'Try adjusting your filters or search terms',
            bookings: 'Start exploring items to rent',
            favorites: 'Save items you like for easy access later',
            messages: 'Your conversation will appear here',
            properties: 'Be the first to list a property!',
            default: 'Get started by taking an action below'
        };
        return descriptions[type] || descriptions.default;
    }

    render() {
        const illustration = emptyStateIllustrations[this.type] || emptyStateIllustrations.search;
        const actions = this.options.actions.map(action => `
            <button class="btn ${action.primary ? 'btn-primary' : 'btn-outline'}" 
                    onclick="${action.onClick}">
                ${action.icon ? `<i class="fa-solid fa-${action.icon}"></i>` : ''}
                ${action.label}
            </button>
        `).join('');

        this.container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-illustration">
                    ${illustration}
                </div>
                <h3 class="empty-state-title">${this.options.title}</h3>
                <p class="empty-state-description">${this.options.description}</p>
                ${actions ? `<div class="empty-state-actions">${actions}</div>` : ''}
            </div>
        `;
    }
}

// Export
window.EmptyState = EmptyState;
export { EmptyState, emptyStateIllustrations };
