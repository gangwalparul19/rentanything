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

    // --- 1. Nav Links ---

    // Standard Links Configuration
    // derived from index.html
    const links = [
        { text: 'Browse Items', href: '/search.html' },
        { text: 'Browse Properties', href: '/properties.html' },
        { text: 'Requests', href: '/requests.html' },
        { text: 'How it Works', href: '/index.html#how-it-works' }
    ];

    // Clear existing content (if any)
    navContainer.innerHTML = '';

    // Generate Links
    links.forEach(link => {
        const a = document.createElement('a');
        a.href = link.href;
        a.textContent = link.text;

        // Optional: Highlight active link based on URL
        // Simple check: if current path ends with the link href (excluding anchors for now)
        if (window.location.pathname === link.href && !link.href.includes('#')) {
            a.classList.add('active');
        }

        navContainer.appendChild(a);
    });

    // --- 2. Notification System & Bell Icon ---
    // We need to inject the bell icon if it doesn't exist (Desktop).
    // Note: Mobile bell is already in index.html, we just need to hook it up.

    // --- 2. Notification System Hookup ---
    // Icons are now hardcoded in index.html as a single set of header icons.
    // We just need to ensure they are hooked up to the listener.

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

        if (user) {
            // Logged In State
            if (loginBtn) loginBtn.style.display = 'none';
            if (userProfile) userProfile.style.display = 'flex';

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
                const { getDocs, writeBatch } = await import('firebase/firestore');
                const q = query(collection(db, "notifications"), where("userId", "==", auth.currentUser.uid), where("read", "==", false));
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
});
