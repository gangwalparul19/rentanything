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
        navContainer.appendChild(a);
    });

    // --- 2. Notification System & Bell Icon ---
    // We need to inject the bell icon if it doesn't exist (Desktop).
    // Note: Mobile bell is already in index.html, we just need to hook it up.

    // Check if Desktop Actions container exists
    const userActions = document.querySelector('.user-actions');
    if (userActions) {
        // Add "Create Listing" button (only if it doesn't exist)
        if (!document.getElementById('list-item-btn')) {
            const createBtn = document.createElement('a');
            createBtn.id = 'list-item-btn';
            createBtn.href = '/create-listing.html';
            createBtn.className = 'btn btn-primary';
            createBtn.innerHTML = '<i class="fa-solid fa-plus"></i> List Item';
            createBtn.style.cssText = 'padding: 0.5rem 1rem; font-size: 0.9rem; white-space: nowrap;';
            userActions.appendChild(createBtn);
        }

        // Add "List Property" button (only if it doesn't exist)
        if (!document.getElementById('list-property-btn')) {
            const listPropertyBtn = document.createElement('a');
            listPropertyBtn.id = 'list-property-btn';
            listPropertyBtn.href = '/list-property.html';
            listPropertyBtn.className = 'btn btn-outline';
            listPropertyBtn.innerHTML = '<i class="fa-solid fa-building"></i> List Property';
            listPropertyBtn.style.cssText = 'padding: 0.5rem 1rem; font-size: 0.9rem; white-space: nowrap; margin-left: 0.5rem;';
            userActions.appendChild(listPropertyBtn);
        }

        // Create Bell Button
        if (!document.getElementById('desktop-notification-btn')) {
            const bellBtn = document.createElement('button');
            bellBtn.id = 'desktop-notification-btn';
            bellBtn.className = 'btn btn-outline';
            bellBtn.style.display = 'none'; // Hidden until logged in
            bellBtn.style.padding = '0.4rem 0.6rem';
            bellBtn.style.fontSize = '1.1rem';
            bellBtn.style.marginRight = '0.5rem';
            bellBtn.style.border = 'none';
            bellBtn.style.position = 'relative';
            bellBtn.innerHTML = `
                <i class="fa-regular fa-bell"></i>
                <span class="badg" style="display:none; position:absolute; top:0; right:0; background:#ef4444; width:8px; height:8px; border-radius:50%;"></span>
            `;

            // Insert before User Profile / Login
            const profileSection = document.getElementById('user-profile');
            if (profileSection) {
                userActions.insertBefore(bellBtn, profileSection);
            }
        }
    }

    // --- 3. Notification Dropdown UI ---
    // Inject Dropdown HTML at end of body if not exists
    if (!document.getElementById('notification-dropdown')) {
        const dropdown = document.createElement('div');
        dropdown.id = 'notification-dropdown';
        dropdown.style.display = 'none';
        dropdown.style.position = 'absolute';
        dropdown.style.top = '60px'; // Adjust based on header height
        dropdown.style.right = '10%'; // Adjust based on bell position
        dropdown.style.width = '300px';
        dropdown.style.background = 'white';
        dropdown.style.borderRadius = '0.75rem';
        dropdown.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
        dropdown.style.zIndex = '1000';
        dropdown.style.overflow = 'hidden';
        dropdown.style.border = '1px solid #e2e8f0';

        dropdown.innerHTML = `
            <div style="padding: 1rem; border-bottom: 1px solid #f1f5f9; font-weight: 600; display:flex; justify-content:space-between;">
                <span>Notifications</span>
                <span id="mark-all-read" style="font-size:0.8rem; color:var(--primary); cursor:pointer;">Mark read</span>
            </div>
            <div id="notification-list" style="max-height: 300px; overflow-y: auto;">
                <div style="padding:1rem; text-align:center; color:var(--gray);">No new notifications</div>
            </div>
        `;
        document.body.appendChild(dropdown);
    }

    // --- 4. Logic & Listeners ---
    onAuthStateChanged(auth, user => {
        const desktopBell = document.getElementById('desktop-notification-btn');
        const mobileBell = document.getElementById('mobile-notification-btn');

        if (user) {
            if (desktopBell) desktopBell.style.display = 'inline-block';
            if (mobileBell) mobileBell.style.display = 'inline-block';

            try {
                startNotificationListener(user.uid);
            } catch (error) {
                console.error("Error initializing notifications:", error);
            }
        } else {
            if (desktopBell) desktopBell.style.display = 'none';
            if (mobileBell) mobileBell.style.display = 'none';
        }
    });

    // Toggle Dropdown
    const desktopBell = document.getElementById('desktop-notification-btn');
    if (desktopBell) {
        desktopBell.onclick = (e) => {
            e.stopPropagation();
            toggleDropdown(desktopBell);
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
    const desktopBadge = document.querySelector('#desktop-notification-btn .badg');
    const mobileBadge = document.querySelector('#mobile-notification-btn .notif-badge');

    if (count > 0) {
        if (desktopBadge) desktopBadge.style.display = 'block';
        if (mobileBadge) {
            mobileBadge.style.display = 'block';
            mobileBadge.innerText = count > 9 ? '9+' : count;
        }
    } else {
        if (desktopBadge) desktopBadge.style.display = 'none';
        if (mobileBadge) mobileBadge.style.display = 'none';
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
    const desktopBell = document.getElementById('desktop-notification-btn');
    const mobileBell = document.getElementById('mobile-notification-btn');

    if (dropdown && dropdown.style.display === 'block') {
        // Check if click is outside dropdown and not on any bell button
        const isClickInside = dropdown.contains(e.target);
        const isClickOnDesktopBell = desktopBell && desktopBell.contains(e.target);
        const isClickOnMobileBell = mobileBell && mobileBell.contains(e.target);

        if (!isClickInside && !isClickOnDesktopBell && !isClickOnMobileBell) {
            dropdown.style.display = 'none';
        }
    }
});
