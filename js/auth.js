
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

    // FIX: Define a global logout function for elements using inline onclick
    window.logout = async () => {
        try {
            await signOut(auth);
            showToast('Logged out.', 'info');
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            console.error("Logout Failed:", error);
            showToast("Logout failed", 'error');
        }
    };

    // Monitor Auth State
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Register for Push Notifications
            subscribeToPushNotifications(false).catch(err => console.log("Push notifications unavailable:", err));

            // 1. Chat Badge Logic (Managed here for real-time updates)
            const { collection, query, where, onSnapshot } = await import('firebase/firestore');
            const { db } = await import('./firebase-config.js');

            async function updateChatBadge(userId) {
                const chatBadge = document.getElementById('header-chat-badge');
                if (!chatBadge) return;

                try {
                    const q = query(collection(db, "chats"), where("participants", "array-contains", userId));
                    onSnapshot(q, (snapshot) => {
                        let totalUnread = 0;
                        snapshot.forEach(doc => {
                            const data = doc.data();
                            if (data.unreadCounts && data.unreadCounts[userId]) {
                                totalUnread += data.unreadCounts[userId];
                            }
                        });

                        if (totalUnread > 0) {
                            chatBadge.style.display = 'block';
                            chatBadge.innerText = totalUnread > 9 ? '9+' : totalUnread;
                        } else {
                            chatBadge.style.display = 'none';
                        }
                    });
                } catch (error) {
                    console.error("Error updating chat badge:", error);
                }
            }
            updateChatBadge(user.uid);
        }
    });
}
