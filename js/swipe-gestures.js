/**
 * Swipe Gestures Utility
 * Detect and handle swipe gestures on touch devices
 */

class SwipeDetector {
    constructor(element, options = {}) {
        this.element = typeof element === 'string' ? document.querySelector(element) : element;
        if (!this.element) return;

        this.options = {
            threshold: 50, // Minimum distance to trigger swipe
            timeout: 300, // Maximum time for swipe
            onSwipeLeft: null,
            onSwipeRight: null,
            onSwipeUp: null,
            onSwipeDown: null,
            ...options
        };

        this.startX = 0;
        this.startY = 0;
        this.startTime = 0;

        this.init();
    }

    init() {
        this.element.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: true });
        this.element.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: true });
    }

    onTouchStart(e) {
        this.startX = e.touches[0].clientX;
        this.startY = e.touches[0].clientY;
        this.startTime = Date.now();
    }

    onTouchEnd(e) {
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const endTime = Date.now();

        const deltaX = endX - this.startX;
        const deltaY = endY - this.startY;
        const deltaTime = endTime - this.startTime;

        // Check if swipe is valid
        if (deltaTime > this.options.timeout) return;

        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        // Horizontal swipe
        if (absX > this.options.threshold && absX > absY) {
            if (deltaX > 0) {
                this.options.onSwipeRight?.(e);
            } else {
                this.options.onSwipeLeft?.(e);
            }
        }
        // Vertical swipe
        else if (absY > this.options.threshold && absY > absX) {
            if (deltaY > 0) {
                this.options.onSwipeDown?.(e);
            } else {
                this.options.onSwipeUp?.(e);
            }
        }
    }
}

/**
 * Card Swipe Actions
 * Swipe cards left/right for quick actions
 */
class CardSwipe {
    constructor(cardSelector, options = {}) {
        this.cards = document.querySelectorAll(cardSelector);
        this.options = {
            leftAction: { icon: 'fa-trash', color: '#dc2626', label: 'Delete' },
            rightAction: { icon: 'fa-heart', color: '#16a34a', label: 'Save' },
            onSwipeLeft: null,
            onSwipeRight: null,
            ...options
        };

        this.init();
    }

    init() {
        this.cards.forEach(card => {
            new SwipeDetector(card, {
                onSwipeLeft: (e) => this.handleSwipeLeft(card, e),
                onSwipeRight: (e) => this.handleSwipeRight(card, e)
            });
        });
    }

    handleSwipeLeft(card, e) {
        this.showAction(card, 'left');
        this.options.onSwipeLeft?.(card, e);
    }

    handleSwipeRight(card, e) {
        this.showAction(card, 'right');
        this.options.onSwipeRight?.(card, e);
    }

    showAction(card, direction) {
        const action = direction === 'left' ? this.options.leftAction : this.options.rightAction;

        // Add visual feedback
        card.style.transform = direction === 'left' ? 'translateX(-10px)' : 'translateX(10px)';
        card.style.transition = 'transform 0.3s ease';

        // Show action indicator
        const indicator = document.createElement('div');
        indicator.className = 'swipe-action-indicator';
        indicator.style.cssText = `
            position: absolute;
            ${direction}: 1rem;
            top: 50%;
            transform: translateY(-50%);
            background: ${action.color};
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            z-index: 10;
        `;
        indicator.innerHTML = `<i class="fa-solid ${action.icon}"></i> ${action.label}`;

        card.style.position = 'relative';
        card.appendChild(indicator);

        // Reset after animation
        setTimeout(() => {
            card.style.transform = '';
            indicator.remove();
        }, 1000);
    }
}

// Export
window.SwipeDetector = SwipeDetector;
window.CardSwipe = CardSwipe;
export { SwipeDetector, CardSwipe };

// Example usage for listing cards
if (document.querySelector('.listing-card')) {
    new CardSwipe('.listing-card', {
        onSwipeLeft: (card) => {
            console.log('Delete action for:', card);
        },
        onSwipeRight: (card) => {
            console.log('Save action for:', card);
        }
    });
}
