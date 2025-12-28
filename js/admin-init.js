/**
 * Admin Panel Main Entry Point
 * Consolidates all admin logic into a single module to ensure proper bundling.
 */

// 1. Static Imports (Ensures Vite traces all dependencies)
import './admin.js';
import './admin-disputes.js';
import { reportGenerator } from './admin-reports.js';
import {
    getNotificationPermissionStatus,
    setupForegroundMessageHandler,
    subscribeToPushNotifications
} from './notification-manager.js';
import { showToast } from './toast-enhanced.js';

// 2. Attach Global Exports (For HTML onclick handlers)
window.reportGenerator = reportGenerator;

// ===== MODAL FUNCTIONS =====
window.openModal = function (title, content, customFooter = null) {
    const modal = document.getElementById('details-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const modalFooter = document.querySelector('.modal-footer');

    if (!modal || !modalTitle || !modalContent) return;

    modalTitle.textContent = title;
    modalContent.innerHTML = content;

    // If custom footer provided, replace default footer
    if (customFooter) {
        modalFooter.innerHTML = customFooter;
    } else {
        // Reset to default footer
        modalFooter.innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Close</button>';
    }

    modal.classList.add('active');
};

window.closeModal = function () {
    const modal = document.getElementById('details-modal');
    if (modal) modal.classList.remove('active');
};

// Rejection Modal
window.openRejectionModal = function (confirmCallback) {
    const modal = document.getElementById('rejection-modal');
    const confirmBtn = document.getElementById('confirm-rejection-btn');
    if (modal) modal.classList.add('active');

    // Setup click handler for the confirm button
    if (confirmBtn) {
        // Clear previous listeners
        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
        newBtn.addEventListener('click', () => {
            const reason = document.getElementById('rejection-reason').value;
            if (reason.trim()) {
                confirmCallback(reason);
                window.closeRejectionModal();
            } else {
                showToast('Please provide a reason', 'warning');
            }
        });
    }
};

window.closeRejectionModal = function () {
    const modal = document.getElementById('rejection-modal');
    if (modal) {
        modal.classList.remove('active');
        document.getElementById('rejection-reason').value = '';
    }
};

// Global click listeners for modals
document.addEventListener('click', (e) => {
    if (e.target.id === 'details-modal') {
        window.closeModal();
    }
    if (e.target.id === 'rejection-modal') {
        window.closeRejectionModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        window.closeModal();
        window.closeRejectionModal();
    }
});

// ===== LOGOUT FUNCTION =====
window.logout = function () {
    if (window.logoutAdmin) {
        window.logoutAdmin();
    } else {
        console.error('Logout function not available');
    }
};

// ===== MOBILE MENU TOGGLE =====
document.addEventListener('DOMContentLoaded', () => {
    const mobileToggle = document.getElementById('mobile-toggle');
    const sidebarClose = document.getElementById('sidebar-close');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
    }

    if (sidebarClose) {
        sidebarClose.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            }
        });
    });

    if (window.innerWidth <= 768 && sidebarClose) {
        sidebarClose.style.display = 'flex';
    }
});

// ===== PWA INSTALL FUNCTIONALITY =====
let deferredPrompt;
const installBtn = document.getElementById('pwa-install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) {
        installBtn.style.display = 'inline-flex';
    }
});

if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        deferredPrompt = null;
        installBtn.style.display = 'none';
    });
}

window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    deferredPrompt = null;
    if (installBtn) installBtn.style.display = 'none';
});

// ===== NOTIFICATION BELL HANDLER =====
const notificationBell = document.getElementById('notification-bell');

if (notificationBell) {
    // Check initial permission status
    const status = getNotificationPermissionStatus();

    if (status === 'granted') {
        notificationBell.querySelector('i').classList.remove('fa-regular');
        notificationBell.querySelector('i').classList.add('fa-solid');
        notificationBell.title = 'Notifications enabled';
        setupForegroundMessageHandler();
    }

    notificationBell.addEventListener('click', async () => {
        try {
            const currentStatus = getNotificationPermissionStatus();

            if (currentStatus === 'granted') {
                showToast('Notifications are already enabled', 'info');
                return;
            }

            if (currentStatus === 'unsupported') {
                showToast('Push notifications not supported in this browser', 'warning');
                return;
            }

            if (currentStatus === 'denied') {
                showToast('Notifications blocked. Please enable in browser settings.', 'error');
                return;
            }

            const token = await subscribeToPushNotifications();

            if (token) {
                notificationBell.querySelector('i').classList.remove('fa-regular');
                notificationBell.querySelector('i').classList.add('fa-solid');
                notificationBell.title = 'Notifications enabled';
                setupForegroundMessageHandler();
                console.log('FCM Token:', token);
            }
        } catch (error) {
            console.error('Error enabling notifications:', error);
            showToast('Failed to enable notifications', 'error');
        }
    });
}

// ===== SERVICE WORKER REGISTRATION =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/admin-sw.js')
            .then((registration) => {
                console.log('Service Worker registered successfully:', registration.scope);
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showToast('New version available! Refresh to update.', 'info');
                        }
                    });
                });
            })
            .catch((error) => {
                console.log('Service Worker registration failed:', error);
            });
    });
}
