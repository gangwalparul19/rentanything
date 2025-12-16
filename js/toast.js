
/**
 * Shows a toast notification.
 * @param {string} message - The message to display.
 * @param {'success'|'error'|'info'} type - The type of toast (default: info).
 * @param {number} duration - Duration in ms (default: 3000).
 */
export function showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');

    // Create container if it doesn't exist
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // Icon based on type
    let icon = '';
    if (type === 'success') icon = '<i class="fa-solid fa-circle-check"></i>';
    if (type === 'error') icon = '<i class="fa-solid fa-circle-exclamation"></i>';
    if (type === 'info') icon = '<i class="fa-solid fa-circle-info"></i>';

    toast.innerHTML = `${icon} <span>${message}</span>`;

    // Add to container
    container.appendChild(toast);

    // Animation In
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Remove after duration
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    }, duration);
}

// Make globally available for inline scripts
window.showToast = showToast;
