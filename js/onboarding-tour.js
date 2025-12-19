/**
 * Onboarding Tour Component
 * Interactive step-by-step guide for new users
 */

class OnboardingTour {
    constructor(steps, options = {}) {
        this.steps = steps;
        this.currentStep = 0;
        this.options = {
            onComplete: null,
            onSkip: null,
            storageKey: 'onboarding_completed',
            showProgress: true,
            ...options
        };

        this.overlay = null;
        this.tooltip = null;
    }

    start() {
        // Check if already completed
        if (localStorage.getItem(this.options.storageKey)) {
            return;
        }

        this.createOverlay();
        this.showStep(0);
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'onboarding-overlay';
        document.body.appendChild(this.overlay);

        this.tooltip = document.createElement('div');
        this.tooltip.className = 'onboarding-tooltip';
        document.body.appendChild(this.tooltip);
    }

    showStep(index) {
        if (index >= this.steps.length) {
            this.complete();
            return;
        }

        this.currentStep = index;
        const step = this.steps[index];

        // Highlight element
        const element = document.querySelector(step.element);
        if (!element) {
            this.next();
            return;
        }

        this.highlightElement(element);
        this.positionTooltip(element, step);
    }

    highlightElement(element) {
        // Remove previous highlights
        document.querySelectorAll('.onboarding-highlight').forEach(el => {
            el.classList.remove('onboarding-highlight');
        });

        element.classList.add('onboarding-highlight');
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    positionTooltip(element, step) {
        const rect = element.getBoundingClientRect();
        const position = step.position || 'bottom';

        this.tooltip.innerHTML = `
            <div class="tooltip-content">
                ${this.options.showProgress ? `
                    <div class="tooltip-progress">
                        Step ${this.currentStep + 1} of ${this.steps.length}
                    </div>
                ` : ''}
                <h4>${step.title}</h4>
                <p>${step.content}</p>
                <div class="tooltip-actions">
                    ${this.currentStep > 0 ? '<button class="btn btn-outline" onclick="tour.previous()">Back</button>' : ''}
                    <button class="btn btn-outline" onclick="tour.skip()">Skip Tour</button>
                    <button class="btn btn-primary" onclick="tour.next()">
                        ${this.currentStep < this.steps.length - 1 ? 'Next' : 'Finish'}
                    </button>
                </div>
            </div>
        `;

        // Position tooltip
        let top, left;

        switch (position) {
            case 'top':
                top = rect.top - this.tooltip.offsetHeight - 20;
                left = rect.left + (rect.width / 2) - (this.tooltip.offsetWidth / 2);
                break;
            case 'bottom':
                top = rect.bottom + 20;
                left = rect.left + (rect.width / 2) - (this.tooltip.offsetWidth / 2);
                break;
            case 'left':
                top = rect.top + (rect.height / 2) - (this.tooltip.offsetHeight / 2);
                left = rect.left - this.tooltip.offsetWidth - 20;
                break;
            case 'right':
                top = rect.top + (rect.height / 2) - (this.tooltip.offsetHeight / 2);
                left = rect.right + 20;
                break;
        }

        this.tooltip.style.top = `${top}px`;
        this.tooltip.style.left = `${left}px`;
        this.tooltip.classList.add('visible');
    }

    next() {
        this.showStep(this.currentStep + 1);
    }

    previous() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    }

    skip() {
        if (confirm('Are you sure you want to skip the tour?')) {
            this.complete();
            this.options.onSkip?.();
        }
    }

    complete() {
        localStorage.setItem(this.options.storageKey, 'true');
        this.overlay?.remove();
        this.tooltip?.remove();
        document.querySelectorAll('.onboarding-highlight').forEach(el => {
            el.classList.remove('onboarding-highlight');
        });
        this.options.onComplete?.();
    }
}

// Example tour for search page
const searchPageTour = [
    {
        element: '#search-input',
        title: 'Search for Items',
        content: 'Start typing to search for items you want to rent or buy.',
        position: 'bottom'
    },
    {
        element: '.filters-sidebar',
        title: 'Filter Results',
        content: 'Use filters to narrow down your search by category, price, and more.',
        position: 'right'
    },
    {
        element: '.listing-card',
        title: 'Browse Listings',
        content: 'Click on any item to see more details and make a booking.',
        position: 'top'
    },
    {
        element: '.btn-icon',
        title: 'Save Favorites',
        content: 'Click the bookmark icon to save items for later.',
        position: 'left'
    }
];

// Auto-start tour for new users
function initOnboarding() {
    if (window.location.pathname.includes('search')) {
        window.tour = new OnboardingTour(searchPageTour, {
            onComplete: () => {
                if (typeof window.announce === 'function') {
                    window.announce('Tour completed! Happy browsing!');
                }
            }
        });

        // Start after a short delay
        setTimeout(() => {
            window.tour.start();
        }, 1000);
    }
}

// Export
window.OnboardingTour = OnboardingTour;
export { OnboardingTour, initOnboarding };

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOnboarding);
} else {
    initOnboarding();
}
