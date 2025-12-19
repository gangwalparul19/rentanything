import { db, auth } from './firebase-config.js';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * Header Manager
 * Standardizes the navigation links, auth state, and notifications.
 */

export function initHeader() {
    const navContainer = document.querySelector('.nav-links');
    if (!navContainer) return;

    // --- Global Components Setup ---
    // Ensure notification dropdown exists globally
    if (!document.getElementById('notification-dropdown')) {
        const dropdown = document.createElement('div');
        dropdown.id = 'notification-dropdown';
        dropdown.className = 'notification-dropdown';
        dropdown.style.display = 'none';
        dropdown.innerHTML = `
            <div class="dropdown-header">
                <h3>Notifications</h3>
                <button id="mark-all-read" class="btn-text">Mark all read</button>
            </div>
            <div id="notification-list" class="notification-list">
                <!-- Notifications will be injected here -->
            </div>
        `;
        document.body.appendChild(dropdown);
    }

    // --- 1. Nav Links ---

    // Standard Links Configuration
    // derived from index.html
    const links = [
        { text: 'Items', href: '/search.html' },
        { text: 'Properties', href: '/properties.html' },
        { text: 'List Item', href: '/create-listing.html', class: 'mobile-only' },
        { text: 'List Property', href: '/list-property.html', class: 'mobile-only' },
        { text: 'Requests', href: '/requests.html' },
        { text: 'How it Works', href: '/index.html#how-it-works' },
        { text: '📱 Install App', href: '#install-app', id: 'mobile-install-app', class: 'install-app-link mobile-only' }
    ];

    // Generate Links
    links.forEach(link => {
        const a = document.createElement('a');
        a.href = link.href;
        a.textContent = link.text;
        if (link.id) a.id = link.id;
        if (link.class) a.className = link.class;

        // Install App Click Handler - handled by app.js PWA logic
        if (link.id === 'mobile-install-app') {
            a.style.display = 'none'; // Hidden by default
            a.setAttribute('role', 'button');
            a.setAttribute('aria-label', 'Install RentAnything as a Progressive Web App');

            // Listen for custom event from app.js when PWA is available
            window.addEventListener('pwa-available', () => {
                a.style.display = 'flex';
            });

            // When clicked, trigger the install via app.js
            a.addEventListener('click', (e) => {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('pwa-install-requested'));
            });
        }

        // Highlight active link based on current page
        // Handle query parameters, trailing slashes, and hash fragments
        if (!link.href.includes('#')) {
            const currentPath = window.location.pathname.replace(/\/$/, ''); // Remove trailing slash
            const linkPath = link.href.replace(/\/$/, ''); // Remove trailing slash from href

            // Check if current path matches the link (exact match or starts with for subpages)
            if (currentPath === linkPath || currentPath.startsWith(linkPath + '/')) {
                a.classList.add('active');
            }

            // Special case: Home page
            if (linkPath === '/' && (currentPath === '' || currentPath === '/')) {
                a.classList.add('active');
            }
        }

        navContainer.appendChild(a);
    });

    // --- 3. Authentication State Management ---
    // We need to inject the bell icon if it doesn't exist (Desktop).
    // Note: Mobile bell is already in index.html, we just need to hook it up.

    // --- 2. Notification System Hookup ---
    // Icons are now hardcoded in index.html as a single set of header icons.
    // We just need to ensure they are hooked up to the listener.

    // --- 3. User Actions & Buttons ---
    const userActions = document.querySelector('.mobile-icons-group');

    // 1. List Item/Property Buttons (Desktop Only in Header)
    if (userActions) {
        // List Item Button
        if (!document.getElementById('list-item-btn')) {
            const createBtn = document.createElement('a');
            createBtn.id = 'list-item-btn';
            createBtn.href = '/create-listing.html';
            createBtn.className = 'btn btn-primary desktop-only';
            createBtn.innerHTML = '<i class="fa-solid fa-plus"></i> List Item';
            createBtn.style.cssText = 'padding: 0.5rem 1rem; font-size: 0.9rem; white-space: nowrap; margin-right: 0.5rem;';
            userActions.insertBefore(createBtn, userActions.firstChild);
        }

        // List Property Button
        if (!document.getElementById('list-property-btn')) {
            const listPropertyBtn = document.createElement('a');
            listPropertyBtn.id = 'list-property-btn';
            listPropertyBtn.href = '/list-property.html';
            listPropertyBtn.className = 'btn btn-outline desktop-only';
            listPropertyBtn.innerHTML = '<i class="fa-solid fa-building"></i> List Property';
            listPropertyBtn.style.cssText = 'padding: 0.5rem 1rem; font-size: 0.9rem; white-space: nowrap; margin-right: 0.5rem;';
            userActions.insertBefore(listPropertyBtn, userActions.firstChild);
        }
    }

    // --- 4. Logic & Listeners ---
    onAuthStateChanged(auth, user => {
        const loginBtn = document.getElementById('login-btn');
        const userProfile = document.getElementById('user-profile');
        const userAvatar = document.getElementById('user-avatar');

        if (user) {
            // Logged In State
            if (loginBtn) loginBtn.style.display = 'none';
            if (userProfile) {
                userProfile.style.display = 'flex';

                // Update user avatar
                if (userAvatar) {
                    userAvatar.src = user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'User');
                }

                // Create dropdown menu only once if it doesn't exist
                if (!document.getElementById('user-dropdown-menu')) {
                    const dropdown = document.createElement('div');
                    dropdown.id = 'user-dropdown-menu';
                    dropdown.className = 'user-dropdown-menu';
                    dropdown.innerHTML = `
        <div class="dropdown-user-info">
            <div class="dropdown-user-name"></div>
            <div class="dropdown-user-email"></div>
        </div>
        <div class="dropdown-divider"></div>
        <a href="/profile.html" class="dropdown-item">
            <i class="fa-solid fa-user"></i> My Profile
        </a>
        <a href="/my-listings.html" class="dropdown-item">
            <i class="fa-solid fa-list"></i> My Listings
        </a>
        <a href="/my-bookings.html" class="dropdown-item">
            <i class="fa-solid fa-calendar"></i> My Bookings
        </a>
        <a href="/wishlist.html" class="dropdown-item">
            <i class="fa-solid fa-heart"></i> My Wishlist
        </a>
        <div class="dropdown-divider"></div>
        <button id="logout-btn-dropdown" class="dropdown-item">
            <i class="fa-solid fa-sign-out"></i> Logout
        </button>
    `;
                    dropdown.style.zIndex = '10000';
                    document.body.appendChild(dropdown);

                    // Setup Dropdown Click Listeners (moved outside the if block in the original, but now part of the new structure)
                    if (userAvatar) {
                        userAvatar.src = user.photoURL || 'https://placehold.co/40';
                        userAvatar.setAttribute('role', 'button');
                        userAvatar.setAttribute('aria-haspopup', 'true');
                        userAvatar.setAttribute('aria-expanded', 'false');
                        userAvatar.setAttribute('aria-label', 'User menu');
                        userAvatar.onclick = (e) => {
                            e.stopPropagation();
                            const dropdown = document.getElementById('user-dropdown-menu');
                            const isExpanded = dropdown.classList.toggle('show');
                            userAvatar.setAttribute('aria-expanded', isExpanded.toString());
                        };
                    }

                    // Logout Handler - This will now work because the ID matches
                    const dropLogout = document.getElementById('logout-btn-dropdown');
                    if (dropLogout) {
                        dropLogout.onclick = () => {
                            import('./toast-enhanced.js').then(m => m.showToast('Logging out...', 'info'));
                            auth.signOut().then(() => {
                                window.location.reload();
                            }).catch(err => {
                                console.error("Logout Error:", err);
                            });
                        };
                    }
                }

                // ALWAYS update user info (even if dropdown already exists)
                // This fixes the stale user profile issue when switching accounts
                const userNameEl = document.querySelector('.dropdown-user-name');
                const userEmailEl = document.querySelector('.dropdown-user-email');
                if (userNameEl) userNameEl.textContent = user.displayName || 'User';
                if (userEmailEl) userEmailEl.textContent = user.email || '';
            }

            try {
                startNotificationListener(user.uid);
            } catch (error) {
                console.error("Error initializing notifications:", error);
            }
        } else {
            // Logged Out State
            if (loginBtn) loginBtn.style.display = 'inline-flex';
            if (userProfile) userProfile.style.display = 'none';

            if (unsubscribeNotifs) {
                unsubscribeNotifs();
                unsubscribeNotifs = null;
            }
        }
    });

    // Mark All Read Listener
    const markReadBtn = document.getElementById('mark-all-read');
    if (markReadBtn) {
        markReadBtn.addEventListener('click', async () => {
            try {
                const { getDocs, writeBatch, limit } = await import('firebase/firestore');
                // Limit to 50 most recent unread notifications for performance
                const q = query(
                    collection(db, "notifications"),
                    where("userId", "==", auth.currentUser.uid),
                    where("read", "==", false),
                    limit(50)
                );
                const snapshot = await getDocs(q);
                const batch = writeBatch(db);
                snapshot.forEach(doc => {
                    batch.update(doc.ref, { read: true });
                });
                await batch.commit();
            } catch (e) {
                console.error("Error marking all read:", e);
            }
        });
    }

    // Toggle Dropdown
    const notificationBtn = document.getElementById('header-notification-btn');
    if (notificationBtn) {
        notificationBtn.onclick = (e) => {
            e.stopPropagation();
            toggleDropdown(notificationBtn);
        };
    }
}

// Notification Implementation
let unsubscribeNotifs = null;
let notifications = [];

function startNotificationListener(userId) {
    if (unsubscribeNotifs) unsubscribeNotifs();

    const q = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(10)
    );

    unsubscribeNotifs = onSnapshot(q, (snapshot) => {
        notifications = [];
        let unreadCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            notifications.push({ id: doc.id, ...data });
            if (!data.read) unreadCount++;
        });

        updateBellUI(unreadCount);
        renderDropdown();
    });
}

function updateBellUI(count) {
    const badge = document.getElementById('header-notification-badge');

    if (count > 0) {
        if (badge) {
            badge.style.display = 'block';
            badge.innerText = count > 9 ? '9+' : count;
        }
    } else {
        if (badge) badge.style.display = 'none';
    }
}

function toggleDropdown(triggerBtn) {
    const dropdown = document.getElementById('notification-dropdown');
    const isVisible = dropdown.style.display === 'block';

    if (isVisible) {
        dropdown.style.display = 'none';
    } else {
        // Position it
        const rect = triggerBtn.getBoundingClientRect();
        dropdown.style.top = (rect.bottom + 10) + 'px';

        // Prevent overflow right
        if (window.innerWidth - rect.left < 320) {
            dropdown.style.right = '1rem';
            dropdown.style.left = 'auto';
        } else {
            dropdown.style.left = (rect.left - 150) + 'px'; // Center roughly
        }

        dropdown.style.display = 'block';
    }
}

function renderDropdown() {
    const list = document.getElementById('notification-list');
    if (!list) return;

    if (notifications.length === 0) {
        list.innerHTML = `<div style="padding:1rem; text-align:center; color:var(--gray);">No notifications yet zzZ</div>`;
        return;
    }

    list.innerHTML = notifications.map(n => `
        <div class="notification-item" data-notif-id="${n.id}" data-notif-type="${n.type}" data-notif-link="${n.link || ''}" 
             style="padding:0.75rem 1rem; border-bottom:1px solid #f8fafc; cursor:pointer; background: ${n.read ? 'white' : '#f0f9ff'};">
            <div style="font-weight:600; font-size:0.9rem; margin-bottom:0.2rem;">${n.title}</div>
            <div style="font-size:0.85rem; color:#475569;">${n.body}</div>
            <div style="font-size:0.7rem; color:#94a3b8; margin-top:0.3rem;">${n.createdAt ? new Date(n.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</div>
        </div>
    `).join('');

    // Add click listeners after rendering
    document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.dataset.notifId;
            const type = item.dataset.notifType;
            const link = item.dataset.notifLink;
            handleNotificationClick(id, type, link);
        });
    });
}

// Handler for notification clicks
async function handleNotificationClick(id, type, link) {
    // 1. Mark as read
    try {
        const notifRef = doc(db, "notifications", id);
        await updateDoc(notifRef, { read: true });
    } catch (e) { console.error("Error marking read", e); }

    // 2. Close dropdown
    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown) dropdown.style.display = 'none';

    // 3. Redirect
    if (link) {
        window.location.href = link;
    } else {
        // Default Routes
        if (type === 'booking_request') window.location.href = 'my-listings.html';
        if (type === 'booking_update') window.location.href = 'my-bookings.html';
        if (type === 'message') window.location.href = 'chat.html';
        if (type === 'new_property') window.location.href = 'properties.html';
    }
}

// Close dropdown on click outside
window.addEventListener('click', (e) => {
    const dropdown = document.getElementById('notification-dropdown');
    const bellBtn = document.getElementById('header-notification-btn');

    if (dropdown && dropdown.style.display === 'block') {
        const isClickInside = dropdown.contains(e.target);
        const isClickOnBell = bellBtn && bellBtn.contains(e.target);

        if (!isClickInside && !isClickOnBell) {
            dropdown.style.display = 'none';
        }
    }

    // Also close user dropdown when clicking outside
    const userDropdown = document.getElementById('user-dropdown-menu');
    const userAvatar = document.getElementById('user-avatar');

    if (userDropdown && userDropdown.classList.contains('show')) {
        const isClickInsideUserDropdown = userDropdown.contains(e.target);
        const isClickOnAvatar = userAvatar && userAvatar.contains(e.target);

        if (!isClickInsideUserDropdown && !isClickOnAvatar) {
            userDropdown.classList.remove('show');
            if (userAvatar) userAvatar.setAttribute('aria-expanded', 'false');
        }
    }
});

// Keyboard Navigation Support
window.addEventListener('keydown', (e) => {
    // Escape key closes all dropdowns and menus
    if (e.key === 'Escape' || e.key === 'Esc') {
        // Close notification dropdown
        const notificationDropdown = document.getElementById('notification-dropdown');
        if (notificationDropdown && notificationDropdown.style.display === 'block') {
            notificationDropdown.style.display = 'none';
        }

        // Close user dropdown
        const userDropdown = document.getElementById('user-dropdown-menu');
        const userAvatar = document.getElementById('user-avatar');
        if (userDropdown && userDropdown.classList.contains('show')) {
            userDropdown.classList.remove('show');
            if (userAvatar) userAvatar.setAttribute('aria-expanded', 'false');
        }

        // Close mobile menu
        const navLinks = document.querySelector('.nav-links');
        const backdrop = document.querySelector('.nav-backdrop');
        const menuBtn = document.querySelector('.mobile-menu-btn');
        const header = document.querySelector('.app-header');

        if (navLinks && navLinks.classList.contains('active')) {
            navLinks.classList.remove('active');
            if (backdrop) backdrop.classList.remove('active');
            if (menuBtn) menuBtn.classList.remove('active');
            document.body.classList.remove('menu-open');
            if (header) header.classList.remove('active');
        }
    }
});

// Cleanup notification listener on page unload
window.addEventListener('beforeunload', () => {
    if (unsubscribeNotifs) {
        unsubscribeNotifs();
        unsubscribeNotifs = null;
    }
});
