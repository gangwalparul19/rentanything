/**
 * Virtual Scroller
 * Efficiently manages large lists by calculating the visible window.
 * Layout-agnostic: Can be used with Divs, Tables, or Custom Elements via onRender callback.
 */
export class VirtualScroller {
    /**
     * @param {Object} options Configuration options
     * @param {HTMLElement} options.container - The scrolling container element
     * @param {number} options.itemHeight - Est. or fixed height of each item in pixels
     * @param {Array} options.items - Full list of items
     * @param {Function} options.onRender - Callback(visibleItems, startIndex, totalHeight, paddingTop, paddingBottom)
     * @param {number} options.buffer - Number of extra items to render (default: 5)
     */
    constructor(options) {
        this.container = options.container;
        this.itemHeight = options.itemHeight;
        this.items = options.items || [];
        this.onRender = options.onRender;
        this.buffer = options.buffer || 5;

        // State
        this.visibleStart = -1;
        this.visibleEnd = -1;
        this.ticking = false;

        // Bind match
        this.handleScroll = this.handleScroll.bind(this);

        this.init();
    }

    init() {
        this.handleScroll(); // Initial render
        this.container.addEventListener('scroll', this.handleScroll, { passive: true });
    }

    handleScroll() {
        if (!this.ticking) {
            window.requestAnimationFrame(() => {
                this.update();
                this.ticking = false;
            });
            this.ticking = true;
        }
    }

    updateItems(newItems) {
        this.items = newItems;
        this.container.scrollTop = 0;
        this.visibleStart = -1; // Force re-render
        this.update();
    }

    update() {
        if (!this.items.length) {
            this.onRender([], 0, 0, 0, 0);
            return;
        }

        const scrollTop = this.container.scrollTop;
        const containerHeight = this.container.clientHeight || 500; // Fallback if hidden
        const totalItems = this.items.length;
        const totalHeight = totalItems * this.itemHeight;

        // Calculate visible range
        let startIndex = Math.floor(scrollTop / this.itemHeight) - this.buffer;
        let endIndex = Math.ceil((scrollTop + containerHeight) / this.itemHeight) + this.buffer;

        // Clamp
        startIndex = Math.max(0, startIndex);
        endIndex = Math.min(totalItems, endIndex);

        // Optimization
        if (startIndex === this.visibleStart && endIndex === this.visibleEnd) {
            return;
        }

        this.visibleStart = startIndex;
        this.visibleEnd = endIndex;

        const paddingTop = startIndex * this.itemHeight;
        const paddingBottom = (totalItems - endIndex) * this.itemHeight;
        const visibleItems = this.items.slice(startIndex, endIndex);

        this.onRender(visibleItems, startIndex, totalHeight, paddingTop, paddingBottom);
    }

    destroy() {
        this.container.removeEventListener('scroll', this.handleScroll);
    }
}
