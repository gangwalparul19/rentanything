import { db, auth } from './firebase-config.js';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { initMobileMenu } from './navigation.js';
import { initTheme } from './theme.js';
import { initAuth } from './auth.js';
import { initHeader } from './header-manager.js';
import { initFooter } from './footer-manager.js';
import { showToast } from './toast-enhanced.js';
import { subscribeToPushNotifications, getNotificationPermissionStatus } from './notification-manager.js';

document.addEventListener('DOMContentLoaded', () => {
    initHeader();      // 1. Inject HTML links and setup UI auth
    initMobileMenu();  // 2. Make menu clickable
    initTheme();       // 3. Setup dark/light mode
    initAuth();        // 4. Setup login button events
    initFooter();
    loadRequests();

    // Prompt for notifications if not already enabled (after a short delay)
    setTimeout(() => {
        if (getNotificationPermissionStatus() === 'default') {
            showNotificationPrompt();
        }
    }, 2000);
});

const requestsContainer = document.getElementById('requests-container');
const requestForm = document.getElementById('request-form');

let currentUser = null;
let unsubscribeRequests = null;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
});

// 1. Post Request
// Guard: Only attach listener if the form exists
if (requestForm) {
    requestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) {
            showToast("Please login to post a request", "error");
            return;
        }

        const title = document.getElementById('req-title').value;
        const desc = document.getElementById('req-desc').value;

        try {
            await addDoc(collection(db, "requests"), {
                title: title,
                description: desc,
                userId: currentUser.uid,
                userName: currentUser.displayName || 'Neighbor',
                userPhoto: currentUser.photoURL,
                status: 'open',
                createdAt: serverTimestamp()
            });

            showToast("Request posted!", "success");
            window.closeModal();
            requestForm.reset();
        } catch (e) {
            console.error("Error posting:", e);
            showToast("Failed to post request", "error");
        }
    });
}

// 2. Load Requests
function loadRequests() {
    const q = query(collection(db, "requests"), orderBy("createdAt", "desc"));

    unsubscribeRequests = onSnapshot(q, (snapshot) => {
        requestsContainer.innerHTML = '';
        if (snapshot.empty) {
            requestsContainer.innerHTML = `
                <div style="text-align:center; padding:3rem; color:var(--gray);">
                    <i class="fa-regular fa-paper-plane" style="font-size:3rem; margin-bottom:1rem;"></i>
                    <h3>No requests yet</h3>
                    <p>Be the first to ask for something!</p>
                </div>
            `;
            return;
        }

        snapshot.forEach(doc => {
            const req = doc.data();
            const date = req.createdAt ? req.createdAt.toDate().toLocaleDateString() : 'Just now';

            const card = document.createElement('div');
            card.className = 'request-card';

            // Only show "I have this" button if not own request
            const isOwn = currentUser && req.userId === currentUser.uid;
            const actionBtn = isOwn
                ? `<span class="badge" style="background:#f1f5f9; color:var(--gray);">Your Request</span>`
                : `<button class="btn btn-sm btn-outline" onclick="window.replyToRequest('${req.userId}', '${req.title}')">
                     <i class="fa-regular fa-message"></i> I have this!
                   </button>`;

            card.innerHTML = `
                <div class="request-user">
                    <div style="position: relative;">
                        <img src="${req.userPhoto || 'https://placehold.co/40'}" class="requester-avatar" referrerpolicy="no-referrer">
                        <div class="online-indicator"></div>
                    </div>
                    <div>
                        <div style="font-weight:600;">${req.userName}</div>
                        <div style="font-size:0.8rem; color:var(--gray);">${date}</div>
                    </div>
                    ${actionBtn}
                </div>
                <div class="request-title">${req.title}</div>
                <p style="color:var(--text-light); line-height:1.5;">${req.description}</p>
            `;
            requestsContainer.appendChild(card);
        });
    });
}

// 3. Reply Logic (Start Chat)
window.replyToRequest = async (targetUserId, reqTitle) => {
    if (!currentUser) {
        showToast("Please login to reply", "info");
        return;
    }

    // We treat this as "Starting a chat" but related to a Request, not a Listing.
    // We can reuse the chat structure but maybe mark it as 'request' type or just generic.
    // For MVP, we'll just start a chat and pass a listingId of 'request' or something unique.
    // Hack: Use 'REQ_<targetUserId>' as listingId to group chats? No.
    // Let's just create a chat with a specific initial message.

    try {
        // Create/Find Chat logic similar to chat.js but adapted
        // For verify simple MVP, let's redirect to chat.html with a special flag
        // or just create the chat doc here directly.

        const uid1 = currentUser.uid < targetUserId ? currentUser.uid : targetUserId;
        const uid2 = currentUser.uid > targetUserId ? currentUser.uid : targetUserId;
        const compositeId = `req_${uid1}_${uid2}_${Date.now()}`; // Unique chat for this request? Or generic user-user chat?
        // Better: Generic User-to-User chat? 
        // Let's stick to the pattern: Chat is tied to an "Item" usually.
        // Here the item is the "Request".

        // Let's just redirect to chat with a pre-filled message intent?
        // Currently chat.js expects ownerId and listingId.
        // Let's Update chat.js to handle generic chats later. 
        // For NOW: Create the chat doc here and redirect.

        const chatRef = doc(db, "chats", compositeId);

        // Target User Data (We need to fetch or just use what we have from the card? We have generic info)
        // Ideally fetch fresh.
        const userSnap = await getDoc(doc(db, "users", targetUserId));
        const targetUser = userSnap.exists() ? userSnap.data() : { displayName: 'Neighbor', photoURL: null };

        await setDoc(chatRef, {
            participants: [currentUser.uid, targetUserId],
            listingId: 'request_response', // Special ID
            listingTitle: `Re: ${reqTitle}`,
            participantData: {
                [currentUser.uid]: { name: currentUser.displayName, photo: currentUser.photoURL },
                [targetUserId]: { name: targetUser.displayName, photo: targetUser.photoURL }
            },
            lastMessage: `I have the "${reqTitle}" you requested!`,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp()
        });

        // Add the initial message
        await addDoc(collection(db, `chats/${compositeId}/messages`), {
            text: `Hi! I saw your request for "${reqTitle}" and I might be able to help.`,
            senderId: currentUser.uid,
            createdAt: serverTimestamp()
        });

        window.location.href = `chat.html`; // Sidebar will pick it up

    } catch (e) {
        console.error("Chat creation error", e);
        showToast("Error starting chat", "error");
    }
};

// Cleanup listener on page unload to prevent memory leaks
window.addEventListener('beforeunload', () => {
    if (unsubscribeRequests) {
        unsubscribeRequests();
        unsubscribeRequests = null;
    }
});

// ==================== NOTIFICATION PROMPT ====================

/**
 * Show a non-intrusive banner prompting users to enable push notifications
 */
function showNotificationPrompt() {
    // Don't show if user is not logged in
    if (!currentUser) return;

    // Check if user already dismissed the prompt
    if (localStorage.getItem('community-notif-dismissed')) return;

    const banner = document.createElement('div');
    banner.id = 'notif-prompt-banner';
    banner.innerHTML = `
        <div style="
            position: fixed;
            bottom: 1rem;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            padding: 0.75rem 1.25rem;
            border-radius: 1rem;
            box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4);
            display: flex;
            align-items: center;
            gap: 1rem;
            z-index: 9999;
            max-width: 90vw;
            animation: slideUp 0.3s ease-out;
        ">
            <span style="font-size: 1.5rem;">🔔</span>
            <div style="flex: 1;">
                <div style="font-weight: 600; font-size: 0.95rem;">Get notified when neighbors post!</div>
                <div style="font-size: 0.8rem; opacity: 0.9;">Even when app is closed</div>
            </div>
            <button onclick="window.enableCommunityNotifications()" style="
                background: white;
                color: #6366f1;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 0.5rem;
                font-weight: 600;
                cursor: pointer;
                font-size: 0.85rem;
            ">Enable</button>
            <button onclick="window.dismissNotificationPrompt()" style="
                background: transparent;
                border: none;
                color: white;
                opacity: 0.7;
                cursor: pointer;
                font-size: 1.2rem;
                padding: 0 0.25rem;
            ">✕</button>
        </div>
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from { transform: translateX(-50%) translateY(100px); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(banner);
}

/**
 * Enable push notifications when user clicks the button
 */
window.enableCommunityNotifications = async () => {
    const banner = document.getElementById('notif-prompt-banner');

    try {
        const token = await subscribeToPushNotifications(true);
        if (token) {
            showToast('🎉 Notifications enabled! You\'ll know when neighbors post.', 'success');
        }
    } catch (e) {
        console.error('Enable notifications error:', e);
    }

    banner?.remove();
};

/**
 * Dismiss the notification prompt and remember the choice
 */
window.dismissNotificationPrompt = () => {
    const banner = document.getElementById('notif-prompt-banner');
    banner?.remove();
    localStorage.setItem('community-notif-dismissed', 'true');
};
