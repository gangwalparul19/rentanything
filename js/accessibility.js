/**
 * Accessibility Utilities
 * Focus management, keyboard navigation, and screen reader support
 */

// ============ Focus Management ============

/**
 * Skip to main content link
 */
function createSkipLink() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Skip to main content';
    skipLink.addEventListener('click', (e) => {
        e.preventDefault();
        const mainContent = document.getElementById('main-content') ||
            document.querySelector('main') ||
            document.querySelector('[role="main"]');
        if (mainContent) {
            mainContent.setAttribute('tabindex', '-1');
            mainContent.focus();
            mainContent.scrollIntoView({ behavior: 'smooth' });
        }
    });

    document.body.insertBefore(skipLink, document.body.firstChild);
}

/**
 * Focus trap for modals
 */
class FocusTrap {
    constructor(element) {
        this.element = element;
        this.focusableElements = null;
        this.firstFocusable = null;
        this.lastFocusable = null;
        this.previousFocus = null;
    }

    activate() {
        // Store current focus
        this.previousFocus = document.activeElement;

        // Get focusable elements
        this.updateFocusableElements();

        // Focus first element
        if (this.firstFocusable) {
            this.firstFocusable.focus();
        }

        // Add event listeners
        this.element.addEventListener('keydown', this.handleKeyDown);
    }

    deactivate() {
        // Remove event listeners
        this.element.removeEventListener('keydown', this.handleKeyDown);

        // Restore previous focus
        if (this.previousFocus && this.previousFocus.focus) {
            this.previousFocus.focus();
        }
    }

    updateFocusableElements() {
        const focusableSelectors = [
            'a[href]',
            'button:not([disabled])',
            'textarea:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            '[tabindex]:not([tabindex="-1"])'
        ].join(',');

        this.focusableElements = Array.from(
            this.element.querySelectorAll(focusableSelectors)
        );

        this.firstFocusable = this.focusableElements[0];
        this.lastFocusable = this.focusableElements[this.focusableElements.length - 1];
    }

    handleKeyDown = (e) => {
        if (e.key !== 'Tab') return;

        // Update focusable elements (in case DOM changed)
        this.updateFocusableElements();

        if (e.shiftKey) {
            // Shift + Tab
            if (document.activeElement === this.firstFocusable) {
                e.preventDefault();
                this.lastFocusable.focus();
            }
        } else {
            // Tab
            if (document.activeElement === this.lastFocusable) {
                e.preventDefault();
                this.firstFocusable.focus();
            }
        }
    }
}

// ============ Live Regions for Screen Readers ============

/**
 * Announce message to screen readers
 */
function announce(message, priority = 'polite') {
    let liveRegion = document.getElementById('aria-live-region');

    if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = 'aria-live-region';
        liveRegion.setAttribute('aria-live', priority);
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        document.body.appendChild(liveRegion);
    }

    // Clear and set message
    liveRegion.textContent = '';
    setTimeout(() => {
        liveRegion.textContent = message;
    }, 100);
}

// ============ Keyboard Shortcuts ============

class KeyboardShortcuts {
    constructor() {
        this.shortcuts = new Map();
        this.enabled = true;
        this.init();
    }

    init() {
        document.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Add default shortcuts
        this.register('/', () => {
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                e.preventDefault();
                searchInput.focus();
            }
        }, 'Focus search');

        this.register('Escape', () => {
            // Close modals
            const activeModal = document.querySelector('.modal-overlay.active, .modal-container.active');
            if (activeModal && typeof window.closeModal === 'function') {
                window.closeModal();
            }

            // Close dropdowns
            const activeDropdown = document.querySelector('[style*="display: block"]');
            if (activeDropdown) {
                activeDropdown.style.display = 'none';
            }
        }, 'Close modals/dropdowns');

        this.register('?', () => {
            this.showShortcutsHelp();
        }, 'Show keyboard shortcuts');
    }

    register(key, callback, description = '') {
        this.shortcuts.set(key.toLowerCase(), { callback, description });
    }

    handleKeydown(e) {
        if (!this.enabled) return;

        // Don't trigger in input fields (except for specific keys)
        const isInputField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
        if (isInputField && !['Escape'].includes(e.key)) return;

        const key = e.key.toLowerCase();
        const shortcut = this.shortcuts.get(key);

        if (shortcut) {
            shortcut.callback(e);
        }
    }

    showShortcutsHelp() {
        const shortcuts = Array.from(this.shortcuts.entries())
            .filter(([_, data]) => data.description)
            .map(([key, data]) => `<tr><td><kbd>${key}</kbd></td><td>${data.description}</td></tr>`)
            .join('');

        const helpHTML = `
            <div class="shortcuts-help-modal">
                <h3>Keyboard Shortcuts</h3>
                <table>
                    <thead>
                        <tr><th>Key</th><th>Action</th></tr>
                    </thead>
                    <tbody>${shortcuts}</tbody>
                </table>
                <button onclick="this.closest('.shortcuts-help-modal').remove()">Close</button>
            </div>
        `;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = helpHTML;
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        document.body.appendChild(overlay);
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }
}

// ============ ARIA Label Helpers ============

/**
 * Add ARIA labels to common elements
 */
function enhanceARIA() {
    // Add landmarks if missing
    if (!document.querySelector('[role="main"]') && !document.querySelector('main')) {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.setAttribute('role', 'main');
        }
    }

    // Enhance buttons without accessible names
    document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])').forEach(btn => {
        if (!btn.textContent.trim() && btn.querySelector('i')) {
            // Icon-only button
            const icon = btn.querySelector('i');
            const iconClass = icon.className;

            // Try to infer label from icon
            if (iconClass.includes('fa-trash')) btn.setAttribute('aria-label', 'Delete');
            else if (iconClass.includes('fa-edit')) btn.setAttribute('aria-label', 'Edit');
            else if (iconClass.includes('fa-heart')) btn.setAttribute('aria-label', 'Favorite');
            else if (iconClass.includes('fa-times') || iconClass.includes('fa-xmark')) btn.setAttribute('aria-label', 'Close');
            else if (iconClass.includes('fa-search')) btn.setAttribute('aria-label', 'Search');
            else if (iconClass.includes('fa-filter')) btn.setAttribute('aria-label', 'Filter');
            else btn.setAttribute('aria-label', 'Button');
        }
    });

    // Enhance form inputs without labels
    document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])').forEach(input => {
        if (input.placeholder && !input.labels?.length) {
            input.setAttribute('aria-label', input.placeholder);
        }
    });
}

// ============ Form Validation Announcements ============

/**
 * Announce form errors to screen readers
 */
function announceFormError(fieldName, errorMessage) {
    announce(`Error in ${fieldName}: ${errorMessage}`, 'assertive');
}

/**
 * Announce form success
 */
function announceFormSuccess(message) {
    announce(message, 'polite');
}

// ============ Initialize ============

function initAccessibility() {
    // Create skip link
    createSkipLink();

    // Enhance ARIA labels
    enhanceARIA();

    // Initialize keyboard shortcuts
    window.keyboardShortcuts = new KeyboardShortcuts();

    // Add focus visible class for better focus indicators
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            document.body.classList.add('using-keyboard');
        }
    });

    document.addEventListener('mousedown', () => {
        document.body.classList.remove('using-keyboard');
    });
}

// ============ Exports ============

window.FocusTrap = FocusTrap;
window.announce = announce;
window.announceFormError = announceFormError;
window.announceFormSuccess = announceFormSuccess;
window.KeyboardShortcuts = KeyboardShortcuts;

export {
    FocusTrap,
    announce,
    announceFormError,
    announceFormSuccess,
    KeyboardShortcuts,
    initAccessibility
};

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccessibility);
} else {
    initAccessibility();
}
