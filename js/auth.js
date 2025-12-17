
import { auth, googleProvider } from './firebase-config.js';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { showToast } from './toast-enhanced.js';
import { subscribeToPushNotifications } from './notification-manager.js';

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
        console.log("Auth State Changed:", user ? "Logged In" : "Logged Out");
        console.log("Login Btn Check:", loginBtn);
        if (user) {
            // User is signed in
            if (loginBtn) loginBtn.style.display = 'none';
        } else {
            // User is signed out
            if (loginBtn) {
                console.log("Showing Login Button (Forced)");
                // Force visibility with !important
                loginBtn.style.setProperty('display', 'inline-flex', 'important');
            } else {
                console.error("Login Button NOT FOUND in DOM");
            }
            if (userProfile) userProfile.style.display = 'none';
        }

        if (user) {


            // Register for Push Notifications
            console.log("🔔 Initializing Push Notifications for User...");
            subscribeToPushNotifications().catch(err => console.error("Push registration failed:", err));

            // Mobile Notification Bell Visibility
            const mobileNotifBtn = document.getElementById('mobile-notification-btn');
            if (mobileNotifBtn) mobileNotifBtn.style.display = '';

            // Mobile Chat Button Visibility
            const mobileChatBtn = document.getElementById('mobile-chat-btn');
            if (mobileChatBtn) mobileChatBtn.style.display = '';


            // Notification Badge Logic
            const { collection, query, where, onSnapshot } = await import('firebase/firestore');
            const { db } = await import('./firebase-config.js');

            onSnapshot(q, (snapshot) => {
                let totalUnread = 0;
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.unreadCounts && data.unreadCounts[user.uid]) {
                        totalUnread += data.unreadCounts[user.uid];
                    }
                });

                // Update UI - Badge Only
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
            // Bell logic is handled by header-manager.js
            // We only need to ensure the mobile bell (if any) is synced or rely on header-manager.
            // Removing duplicate bell injection from here.

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
