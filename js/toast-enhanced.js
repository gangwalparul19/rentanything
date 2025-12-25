/**
 * Enhanced Toast Notification System
 * Supports stacking, queuing, progress bars, and positioning
 */

class ToastManager {
    constructor() {
        this.toasts = [];
        this.container = this.createContainer();
        this.nextId = 0;
    }

    createContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container';
        // Explicit inline styles to ensure proper positioning
        container.style.cssText = 'position: fixed; top: 1rem; right: 1rem; z-index: 999999; display: flex; flex-direction: column; gap: 0.5rem; max-width: 400px;';
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-atomic', 'true');
        document.body.appendChild(container);
        return container;
    }

    show(message, type = 'info', options = {}) {
        const toast = {
            id: this.nextId++,
            message,
            type,
            duration: options.duration || 3000,
            pauseOnHover: options.pauseOnHover !== false,
            showProgress: options.showProgress !== false
        };

        const element = this.createToastElement(toast);
        this.container.appendChild(element);
        this.toasts.push({ ...toast, element });

        // Trigger animation
        requestAnimationFrame(() => {
            element.classList.add('show');
        });

        // Auto dismiss
        if (toast.duration > 0) {
            this.startDismissTimer(toast.id, toast.duration);
        }

        return toast.id;
    }

    createToastElement(toast) {
        const el = document.createElement('div');
        el.className = `toast-enhanced toast-${toast.type}`;
        el.setAttribute('role', 'alert');
        el.dataset.id = toast.id;

        const icons = {
            success: 'fa-circle-check',
            error: 'fa-circle-exclamation',
            warning: 'fa-triangle-exclamation',
            info: 'fa-circle-info'
        };

        el.innerHTML = `
            <div class="toast-icon">
                <i class="fa-solid ${icons[toast.type]}"></i>
            </div>
            <div class="toast-message">${toast.message}</div>
            <button class="toast-close" aria-label="Close notification">
                <i class="fa-solid fa-times"></i>
            </button>
            ${toast.showProgress ? '<div class="toast-progress"><div class="toast-progress-bar"></div></div>' : ''}
        `;

        // Close button
        el.querySelector('.toast-close').addEventListener('click', () => {
            this.dismiss(toast.id);
        });

        // Pause on hover
        if (toast.pauseOnHover) {
            el.addEventListener('mouseenter', () => this.pauseTimer(toast.id));
            el.addEventListener('mouseleave', () => this.resumeTimer(toast.id));
        }

        return el;
    }

    startDismissTimer(id, duration) {
        const toast = this.toasts.find(t => t.id === id);
        if (!toast) return;

        const progressBar = toast.element.querySelector('.toast-progress-bar');
        if (progressBar) {
            progressBar.style.transition = `width ${duration}ms linear`;
            requestAnimationFrame(() => {
                progressBar.style.width = '0%';
            });
        }

        toast.timeout = setTimeout(() => {
            this.dismiss(id);
        }, duration);
        toast.startTime = Date.now();
        toast.remainingTime = duration;
    }

    pauseTimer(id) {
        const toast = this.toasts.find(t => t.id === id);
        if (!toast || !toast.timeout) return;

        clearTimeout(toast.timeout);
        toast.remainingTime = toast.remainingTime - (Date.now() - toast.startTime);

        const progressBar = toast.element.querySelector('.toast-progress-bar');
        if (progressBar) {
            const computedWidth = window.getComputedStyle(progressBar).width;
            progressBar.style.width = computedWidth;
            progressBar.style.transition = 'none';
        }
    }

    resumeTimer(id) {
        const toast = this.toasts.find(t => t.id === id);
        if (!toast || toast.remainingTime === undefined) return;

        const progressBar = toast.element.querySelector('.toast-progress-bar');
        if (progressBar) {
            progressBar.style.transition = `width ${toast.remainingTime}ms linear`;
            progressBar.style.width = '0%';
        }

        toast.startTime = Date.now();
        toast.timeout = setTimeout(() => {
            this.dismiss(id);
        }, toast.remainingTime);
    }

    dismiss(id) {
        const index = this.toasts.findIndex(t => t.id === id);
        if (index === -1) return;

        const toast = this.toasts[index];
        toast.element.classList.remove('show');

        setTimeout(() => {
            toast.element.remove();
            this.toasts.splice(index, 1);
        }, 300);

        if (toast.timeout) {
            clearTimeout(toast.timeout);
        }
    }

    dismissAll() {
        [...this.toasts].forEach(toast => this.dismiss(toast.id));
    }
}

// Create global instance
export const toastManager = new ToastManager();

// Backward compatible function
export function showToast(message, type = 'info', options = {}) {
    return toastManager.show(message, type, options);
}
