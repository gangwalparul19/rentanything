
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
        // Core Auth State Logic (UI visibility is now handled by header-manager.js)
        if (user) {
            // Register for Push Notifications
            subscribeToPushNotifications().catch(err => console.error("Push registration failed:", err));

            // Import Firestore modules once for the user session
            const { collection, query, where, onSnapshot } = await import('firebase/firestore');
            const { db } = await import('./firebase-config.js');

            // 2. Chat Badge Logic
            async function updateChatBadge(userId) {
                const chatBadge = document.getElementById('header-chat-badge');
                const chatBtn = document.getElementById('header-chat-btn');

                if (!chatBadge) return;

                try {
                    const q = query(collection(db, "chats"), where("participants", "array-contains", userId));

                    onSnapshot(q, (snapshot) => {
                        let unreadCount = 0;
                        snapshot.forEach(doc => {
                            const data = doc.data();
                            // Assuming 'lastMessage' exists and has 'senderId' and 'read' properties
                            // And that 'unreadCounts' is no longer the primary source for badge
                            // If 'unreadCounts' is still used, adjust this logic.
                            // For now, checking if the last message is unread and not sent by the current user.
                            if (data.lastMessage && data.lastMessage.senderId !== userId && !data.lastMessage.read) {
                                unreadCount++;
                            }
                        });

                        if (unreadCount > 0) {
                            chatBadge.style.display = 'block';
                            chatBadge.innerText = unreadCount > 9 ? '9+' : unreadCount;
                            if (chatBtn) chatBtn.classList.add('has-unread');
                        } else {
                            chatBadge.style.display = 'none';
                            if (chatBtn) chatBtn.classList.remove('has-unread');
                        }
                    });
                } catch (error) {
                    console.error("Error updating chat badge:", error);
                }
            }
            // Call the chat badge update function
            updateChatBadge(user.uid);

            // Populate User Profile Dropdown
            if (userProfile) {
                // Only render if not already rendered
                if (!document.getElementById('user-dropdown-menu')) {
                    userProfile.insertAdjacentHTML('beforeend', `
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
                    `);

                    // Avatar Click Event
                    if (userAvatar) {
                        userAvatar.src = user.photoURL || 'https://placehold.co/40';
                        userAvatar.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const dropdown = document.getElementById('user-dropdown-menu');
                            if (dropdown) dropdown.classList.toggle('show');
                        });
                    }

                    // Close on click outside
                    document.addEventListener('click', () => {
                        const dropdownMenu = document.getElementById('user-dropdown-menu');
                        if (dropdownMenu && dropdownMenu.classList.contains('show')) {
                            dropdownMenu.classList.remove('show');
                        }
                    });

                    // Logout Logic
                    document.addEventListener('click', (e) => {
                        if (e.target && e.target.id === 'logout-btn-dropdown' || e.target.closest('#logout-btn-dropdown')) {
                            auth.signOut().then(() => window.location.reload());
                        }
                    });
                }
            }
        }
    });
}
