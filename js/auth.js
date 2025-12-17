
import { auth, googleProvider } from './firebase-config.js';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { showToast } from './toast-enhanced.js';

export function initAuth() {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userProfile = document.getElementById('user-profile');
    const userAvatar = document.getElementById('user-avatar');

    // Login Event
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            try {
                const result = await signInWithPopup(auth, googleProvider);
                const user = result.user;

                // Save/Update User in Firestore
                const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
                const { db } = await import('./firebase-config.js');

                await setDoc(doc(db, "users", user.uid), {
                    uid: user.uid,
                    displayName: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    lastLogin: serverTimestamp()
                }, { merge: true });

                showToast('Logged in successfully!', 'success');
            } catch (error) {
                console.error("Login Failed:", error);
                showToast("Login failed: " + error.message, 'error');
            }
        });
    }

    // Logout Event
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                showToast('Logged out.', 'info');
                // Optional: Reload to clear state cleanly
                setTimeout(() => window.location.reload(), 1000);
            } catch (error) {
                console.error("Logout Failed:", error);
                showToast("Logout failed", 'error');
            }
        });
    }

    // Monitor Auth State
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in
            // User is signed in
            if (loginBtn) loginBtn.style.display = 'none';
            // Mobile Notification Bell Visibility
            const mobileNotifBtn = document.getElementById('mobile-notification-btn');
            if (mobileNotifBtn) mobileNotifBtn.style.display = '';

            // Mobile Chat Button Visibility
            const mobileChatBtn = document.getElementById('mobile-chat-btn');
            if (mobileChatBtn) mobileChatBtn.style.display = '';


            // Notification Badge Logic
            const { collection, query, where, onSnapshot } = await import('firebase/firestore');
            const { db } = await import('./firebase-config.js');

            const q = query(
                collection(db, "chats"),
                where("participants", "array-contains", user.uid)
            );

            onSnapshot(q, (snapshot) => {
                let totalUnread = 0;
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.unreadCounts && data.unreadCounts[user.uid]) {
                        totalUnread += data.unreadCounts[user.uid];
                    }
                });

                // Update UI
                // We'll append a badge to the "Messages" link in the dropdown AND maybe a bell icon in header?
                // User asked for "Notification Icon". Let's add a Chat Icon with Badge next to Profile.

                let chatIconBtn = document.getElementById('header-chat-btn');

                // Inject Icon if missing (Right before User Profile)
                if (!chatIconBtn && userProfile) {
                    const container = document.createElement('div');
                    container.innerHTML = `
                        <a href="chat.html" id="header-chat-btn" class="btn btn-outline" style="padding: 0.4rem 0.8rem; margin-right: 0.5rem; position: relative;" title="Messages">
                            <i class="fa-regular fa-paper-plane"></i>
                            <span id="header-chat-badge" style="display: none; position: absolute; top: -5px; right: -5px; background: #ef4444; color: white; border-radius: 50%; padding: 2px 6px; font-size: 0.7rem; border: 2px solid white;">0</span>
                        </a>
                    `;
                    userProfile.parentNode.insertBefore(container.firstElementChild, userProfile);
                    chatIconBtn = document.getElementById('header-chat-btn');
                }

                const badge = document.getElementById('header-chat-badge');
                if (badge) {
                    if (totalUnread > 0) {
                        badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
                        badge.style.display = 'block';
                    } else {
                        badge.style.display = 'none';
                    }
                }
            });

            // --- 2. System Notifications (Bell) ---
            const qNotif = query(
                collection(db, "notifications"),
                where("userId", "==", user.uid),
                where("read", "==", false)
                // orderBy("createdAt", "desc") 
            );

            onSnapshot(qNotif, (snapshot) => {
                const notifCount = snapshot.size;
                const userProfile = document.getElementById('user-profile');
                if (!userProfile) return;

                // Check if bell exists
                let bellIconContainer = document.getElementById('header-bell-container');

                if (!bellIconContainer) {
                    const container = document.createElement('div');
                    container.id = 'header-bell-container';
                    container.classList.add('desktop-only');
                    container.innerHTML = `
                        <div style="position:relative; margin-right: 0.5rem;">
                            <button id="notif-btn" class="btn btn-ghost" style="padding: 0.4rem 0.5rem; font-size: 1.2rem; position:relative; color: var(--text-dark);" title="Notifications">
                                <i class="fa-regular fa-bell"></i>
                                <span class="notif-badge" style="display:none; position:absolute; top:-2px; right:-2px; background:#ef4444; color:white; border-radius:50%; padding: 2px 5px; font-size:0.65rem; border:1px solid white;">0</span>
                            </button>
                            <!-- Dropdown -->
                            <div id="notif-dropdown" style="display:none; position:absolute; top:120%; right:0; width:280px; background:white; border:1px solid #e2e8f0; border-radius:0.75rem; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); z-index:100; max-height:400px; overflow-y:auto;">
                                <div style="padding:0.75rem 1rem; border-bottom:1px solid #f1f5f9; font-weight:600; font-size: 0.9rem; display:flex; justify-content:space-between; align-items:center;">
                                    <span>Notifications</span>
                                    <span style="font-size:0.75rem; color:var(--primary); cursor:pointer;" onclick="window.markAllRead()">Mark all read</span>
                                </div>
                                <div id="notif-list"></div>
                            </div>
                        </div>
                    `;
                    // Insert logic: Bell -> Chat -> Profile
                    const chatBtn = document.getElementById('header-chat-btn');
                    // chatBtn is inside a div container (see line 87-95 approx). 
                    // chatBtn.parentNode is that container.
                    // We want to insert BEFORE that container.
                    if (chatBtn && chatBtn.parentNode && chatBtn.parentNode.parentNode) {
                        chatBtn.parentNode.parentNode.insertBefore(container, chatBtn.parentNode);
                    } else {
                        // Fallback: just before profile
                        userProfile.parentNode.insertBefore(container, userProfile);
                    }

                    bellIconContainer = container;

                    // Click Listener
                    const btn = document.getElementById('notif-btn');
                    const dropdown = document.getElementById('notif-dropdown');
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        // Close other dropdowns (user menu)
                        document.getElementById('user-dropdown-menu')?.classList.remove('show');

                        const isHidden = dropdown.style.display === 'none';
                        dropdown.style.display = isHidden ? 'block' : 'none';
                    });

                    // Close on click outside
                    document.addEventListener('click', () => { if (dropdown) dropdown.style.display = 'none'; });
                    if (dropdown) dropdown.addEventListener('click', (e) => e.stopPropagation());

                    // Mobile Bell Click
                    const mobileNotifBtn = document.getElementById('mobile-notification-btn');
                    if (mobileNotifBtn) {
                        mobileNotifBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (dropdown) {
                                // Toggle dropdown visibility
                                const isHidden = dropdown.style.display === 'none';
                                dropdown.style.display = isHidden ? 'block' : 'none';

                                // Position it relative to mobile button if visible?
                                // Simplified: Just toggle it. It might appear top-right (absolute).
                                // We might need to ensure its z-index or position suits mobile.
                                if (isHidden) {
                                    // Force position for mobile
                                    if (window.innerWidth < 768) {
                                        dropdown.style.top = '60px';
                                        dropdown.style.right = '10px';
                                        dropdown.style.position = 'fixed';
                                        dropdown.style.width = 'calc(100% - 20px)';
                                        dropdown.style.maxHeight = '50vh';
                                    }
                                }
                            }
                        });
                    }
                }

                // Update Badge
                const mobileNotifBtn = document.getElementById('mobile-notification-btn');

                if (bellIconContainer) {
                    const badge = bellIconContainer.querySelector('.notif-badge');
                    if (notifCount > 0) {
                        badge.style.display = 'block';
                        badge.innerText = notifCount > 9 ? '9+' : notifCount;
                        // Mobile Badge
                        if (mobileNotifBtn) {
                            const mBadge = mobileNotifBtn.querySelector('.notif-badge');
                            if (mBadge) {
                                mBadge.style.display = 'block';
                                mBadge.innerText = notifCount > 9 ? '9+' : notifCount;
                            }
                        }
                    } else {
                        badge.style.display = 'none';
                        if (mobileNotifBtn) {
                            const mBadge = mobileNotifBtn.querySelector('.notif-badge');
                            if (mBadge) mBadge.style.display = 'none';
                        }
                    }
                }

                // Populate Dropdown
                const listEl = document.getElementById('notif-list');
                if (listEl) {
                    if (notifCount === 0) {
                        listEl.innerHTML = `<div style="padding:1rem; text-align:center; color:#94a3b8; font-size:0.85rem;">No new notifications</div>`;
                    } else {
                        listEl.innerHTML = '';
                        snapshot.forEach(docSnap => {
                            const data = docSnap.data();
                            const item = document.createElement('div');
                            item.style.cssText = "padding:0.75rem 1rem; border-bottom:1px solid #f1f5f9; cursor:pointer; transition:background 0.2s;";
                            item.onmouseover = () => item.style.background = '#f8fafc';
                            item.onmouseout = () => item.style.background = 'white';
                            item.innerHTML = `
                                <div style="font-size:0.85rem; font-weight:500; margin-bottom:0.1rem; color:#1e293b;">${data.title}</div>
                                <div style="font-size:0.75rem; color:#64748b;">${data.body}</div>
                            `;
                            item.onclick = async () => {
                                // Mark read & Redirect
                                try {
                                    const { doc: fireDoc, updateDoc } = await import('firebase/firestore');
                                    await updateDoc(fireDoc(db, "notifications", docSnap.id), { read: true });

                                    if (data.type === 'booking_request') window.location.href = 'my-listings.html';
                                    else if (data.type === 'booking_update') window.location.href = 'my-bookings.html';
                                } catch (e) { console.error(e); }
                            };
                            listEl.appendChild(item);
                        });
                    }
                }
            });

            // Setup Mark All Read (Global)
            window.markAllRead = async () => {
                const { getDocs, query, collection, where, writeBatch } = await import('firebase/firestore');
                const qMa = query(collection(db, "notifications"), where("userId", "==", user.uid), where("read", "==", false));
                const snapMa = await getDocs(qMa);
                const batch = writeBatch(db);
                snapMa.forEach(d => {
                    batch.update(d.ref, { read: true });
                });
                await batch.commit();
            };

            if (userProfile) {
                userProfile.style.display = 'flex';
                // ... rest of profile code
                // Dropdown HTML structure
                // Only update if not already rendered to avoid image reload flickering (429 fix)
                if (!document.getElementById('user-dropdown-menu')) {
                    userProfile.innerHTML = `
                        <div class="user-dropdown-container">
                            <img id="user-avatar-btn" src="${user.photoURL || 'https://placehold.co/40'}" 
                                alt="Profile" title="Click for menu"
                                referrerpolicy="no-referrer"
                                onerror="this.onerror=null;this.src='https://placehold.co/40?text=U';">
                            <div class="user-dropdown-menu" id="user-dropdown-menu">
                                <div class="dropdown-header">
                                    <span class="dropdown-user-name">${user.displayName || 'User'}</span>
                                    <span class="dropdown-user-email">${user.email}</span>
                                </div>
                                <a href="profile.html" class="dropdown-item">
                                    <i class="fa-regular fa-id-card"></i> My Profile
                                </a>
                                <a href="my-bookings.html" class="dropdown-item">
                                    <i class="fa-solid fa-basket-shopping"></i> My Rentals
                                </a>
                                <a href="my-listings.html" class="dropdown-item">
                                    <i class="fa-solid fa-list-check"></i> My Listings
                                </a>
                                <div class="dropdown-divider"></div>
                                <button id="logout-btn-dropdown" class="dropdown-item" style="width:100%; text-align:left; border:none; background:none; cursor:pointer;">
                                    <i class="fa-solid fa-arrow-right-from-bracket"></i> Logout
                                </button>
                            </div>
                        </div>
                    `;

                    // Event Listeners for Dropdown
                    const avatarBtn = document.getElementById('user-avatar-btn');
                    const dropdownMenu = document.getElementById('user-dropdown-menu'); // Re-select

                    avatarBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        dropdownMenu.classList.toggle('show');
                    });

                    // Close on click outside
                    document.addEventListener('click', () => {
                        if (dropdownMenu && dropdownMenu.classList.contains('show')) dropdownMenu.classList.remove('show');
                    });

                    // Hide mobile buttons on logic if needed (handled in onAuthStateChanged mostly, but good to be safe)
                    // Actually, onAuthStateChanged handles UI reset on signOut/reload most times.
                    // But let's add the safe cleanup if we can find the right place.
                    // The previous replace failed because it looked for specific lines not in this view range?
                    // Line 296 in previous view was where the logic was...
                    // Let's stick to onAuthStateChanged managing it. 
                    // Wait, onAuthStateChanged has an existing block for "else" (logged out).
                    // I should check finding that block instead of inside the dropdown logic.

                    // Logout Logic
                    document.getElementById('logout-btn-dropdown').addEventListener('click', async () => {
                        await auth.signOut();
                        window.location.reload();
                    });
                }
            }
        } else {
            // User is signed out
            console.log("User logged out");
            if (loginBtn) loginBtn.style.display = 'inline-flex';
            if (userProfile) userProfile.style.display = 'none';

            // Hide mobile chat button
            const mobileChatBtn = document.getElementById('mobile-chat-btn');
            if (mobileChatBtn) mobileChatBtn.style.display = 'none';
        }
    });
}
