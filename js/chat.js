import { db, auth } from './firebase-config.js';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, setDoc, getDocs, updateDoc, increment as getIncrement } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { initMobileMenu } from './navigation.js';
import { initTheme } from './theme.js';
import { initAuth } from './auth.js';
import { initHeader } from './header-manager.js';
import { showToast } from './toast-enhanced.js';
import { showEmptyState } from './empty-states.js';
import { subscribeToPushNotifications } from './notification-manager.js';

// Init
document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initTheme();
    initAuth();
    initHeader();
});

let currentUser = null;
let activeChatId = null;
let unsubscribeMessages = null;

// DOM Elements
const conversationsList = document.getElementById('conversations-list');
const chatWindow = document.getElementById('chat-app');
const activeChatView = document.getElementById('active-chat-view');
const noChatView = document.getElementById('no-chat-selected');
const messagesContainer = document.getElementById('messages-container');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const chatNameEl = document.getElementById('chat-name');
const chatItemEl = document.getElementById('chat-item');
const chatImgEl = document.getElementById('chat-img');

// Auth Listener
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        loadConversations();

        // Check for URL params to start a new chat
        const urlParams = new URLSearchParams(window.location.search);
        const startOwnerId = urlParams.get('ownerId');
        const startListingId = urlParams.get('listingId');

        if (startOwnerId && startListingId) {
            await startOrOpenChat(startOwnerId, startListingId);
        }

    } else {
        // Redirect if not logged in
        setTimeout(() => {
            if (!auth.currentUser) window.location.href = '/?login=true';
        }, 1000);
    }
});

// 1. Load Conversations (Sidebar)
function loadConversations() {
    const q = query(
        collection(db, "chats"),
        where("participants", "array-contains", currentUser.uid),
        orderBy("updatedAt", "desc")
    );

    onSnapshot(q, (snapshot) => {
        conversationsList.innerHTML = '';
        if (snapshot.empty) {
            showEmptyState('#conversations-list', 'chat');
            return;
        }

        snapshot.forEach((doc) => {
            const chat = doc.data();
            const chatId = doc.id;

            // Determine "Other User"
            const otherUserId = chat.participants.find(uid => uid !== currentUser.uid);

            let otherUserName = "User";
            let otherUserPhoto = "https://placehold.co/40";
            let unreadCount = 0;

            if (chat.participantData && chat.participantData[otherUserId]) {
                otherUserName = chat.participantData[otherUserId].name;
                otherUserPhoto = chat.participantData[otherUserId].photo;
            }

            if (chat.unreadCounts && chat.unreadCounts[currentUser.uid]) {
                unreadCount = chat.unreadCounts[currentUser.uid];
            }

            const isActive = chatId === activeChatId ? 'active' : '';

            const li = document.createElement('div');
            li.className = `conversation-item ${isActive}`;
            li.innerHTML = `
                <img src="${otherUserPhoto}" class="convo-avatar" alt="${otherUserName}" referrerpolicy="no-referrer">
                <div class="convo-info">
                    <div class="convo-name">
                        ${otherUserName}
                        ${unreadCount > 0 ? `<span class="badge" style="background:red; color:white; font-size:0.7rem; padding:2px 6px; border-radius:10px; margin-left:5px;">${unreadCount}</span>` : ''}
                    </div>
                    <div class="convo-preview" style="${unreadCount > 0 ? 'font-weight:bold; color:black;' : ''}">${chat.lastMessage || 'Start chatting...'}</div>
                </div>
            `;
            li.addEventListener('click', () => loadChat(chatId, chat));
            conversationsList.appendChild(li);
        });
    });
}

// 2. Load Chat Messages (Main Area)
function loadChat(chatId, chatData) {
    activeChatId = chatId;
    noChatView.style.display = 'none';
    activeChatView.style.display = 'flex';

    // Update Header
    const otherUserId = chatData.participants.find(uid => uid !== currentUser.uid);
    window.currentChatOtherUserId = otherUserId; // Store for sending

    // Reset MY unread count logic
    if (chatData.unreadCounts && chatData.unreadCounts[currentUser.uid] > 0) {
        const chatRef = doc(db, "chats", chatId);
        updateDoc(chatRef, {
            [`unreadCounts.${currentUser.uid}`]: 0
        }).catch(err => console.log("Error resetting unread", err));
    }

    if (chatData.participantData && chatData.participantData[otherUserId]) {
        chatNameEl.innerText = chatData.participantData[otherUserId].name;
        chatImgEl.src = chatData.participantData[otherUserId].photo;
    }
    chatItemEl.innerText = chatData.listingTitle || 'Item';

    // Mobile: Show chat window
    if (window.innerWidth <= 768) {
        document.querySelector('.chat-window').classList.add('open');
    }

    // Request notification permission if not already granted
    subscribeToPushNotifications().catch(console.error);

    // Subscribe to Messages
    if (unsubscribeMessages) unsubscribeMessages();

    const q = query(
        collection(db, `chats/${chatId}/messages`),
        orderBy("createdAt", "asc")
    );

    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        messagesContainer.innerHTML = '';
        if (snapshot.empty) {
            console.log("[DEBUG] No messages found in this chat.");
        }
        snapshot.forEach((doc) => {
            const msg = doc.data();
            renderMessage(msg);
        });
        scrollToBottom();
    }, (error) => {
        console.error("[DEBUG] Error fetching messages:", error);
        showToast("Error loading messages: " + error.message, "error");
    });
}

function renderMessage(msg) {
    const div = document.createElement('div');
    const isOwn = msg.senderId === currentUser.uid;
    div.className = `message ${isOwn ? 'message-own' : 'message-other'}`;

    // Time formatting
    const date = msg.createdAt ? msg.createdAt.toDate() : new Date();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // SECURITY FIX: Use textContent instead of innerHTML to prevent XSS
    const messageText = document.createElement('div');
    messageText.textContent = msg.text; // Safe - will escape any HTML/script tags

    const messageTime = document.createElement('div');
    messageTime.className = 'message-time';
    messageTime.textContent = timeStr;

    div.appendChild(messageText);
    div.appendChild(messageTime);
    messagesContainer.appendChild(div);
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 3. Send Message
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text || !activeChatId) return;

    try {
        messageInput.value = ''; // Clear early for UX

        await addDoc(collection(db, `chats/${activeChatId}/messages`), {
            text: text,
            senderId: currentUser.uid,
            createdAt: serverTimestamp()
        });

        // Update Chat Metadata
        const chatRef = doc(db, "chats", activeChatId);

        let updateData = {
            lastMessage: text,
            updatedAt: serverTimestamp()
        };

        if (window.currentChatOtherUserId) {
            updateData[`unreadCounts.${window.currentChatOtherUserId}`] = getIncrement(1);
        }

        await updateDoc(chatRef, updateData);

    } catch (error) {
        console.error("Error sending:", error);
        showToast(`Failed to send: ${error.message} (${error.code})`, "error");
    }
});

// 4. Start/Open Chat from Product Page - INSTANT & OPTIMIZED
async function startOrOpenChat(targetOwnerId, listingId) {
    if (targetOwnerId === currentUser.uid) {
        showToast("You can't chat with yourself!", "error");
        return;
    }

    const uid1 = currentUser.uid < targetOwnerId ? currentUser.uid : targetOwnerId;
    const uid2 = currentUser.uid > targetOwnerId ? currentUser.uid : targetOwnerId;
    const compositeId = `${listingId}_${uid1}_${uid2}`; // UNIQUE ID

    // === INSTANT UX OPTIMIZATION ===
    // Don't wait for Firestore to check if it exists. 
    // We construct a provisional chat object and load it IMMEDIATELY.
    // We still do the backend work, but the user can start typing now.

    // We need at least the other user's info for the header.
    // Try to get it from cache or fetch quickly.
    let targetUser = { name: 'User', photo: 'https://placehold.co/40' };
    let listingTitle = 'Item';

    // Optimistically load interface
    chatItemEl.innerText = "Loading...";
    activeChatId = compositeId;

    // Switch view
    noChatView.style.display = 'none';
    activeChatView.style.display = 'flex';
    document.querySelector('.chat-window').classList.add('open'); // Mobile slide in
    messagesContainer.innerHTML = ''; // Clear old msgs

    // Fetch Data Parallel
    const userPromise = getDoc(doc(db, "users", targetOwnerId));
    const listingPromise = (!listingId.startsWith('req_')) ? getDoc(doc(db, "listings", listingId)) : Promise.resolve(null);
    const chatRef = doc(db, "chats", compositeId);

    try {
        const [userSnap, listingSnap] = await Promise.all([userPromise, listingPromise]);

        if (userSnap.exists()) {
            const u = userSnap.data();
            targetUser = { name: u.displayName || 'User', photo: u.photoURL || 'https://placehold.co/40' };
        }
        if (listingSnap && listingSnap.exists()) {
            listingTitle = listingSnap.data().title;
        }

        // Update Header UI with real data
        chatNameEl.innerText = targetUser.name;
        chatImgEl.src = targetUser.photo;
        chatItemEl.innerText = listingTitle;
        window.currentChatOtherUserId = targetOwnerId;

        // Check/Create Chat in Background
        const chatSnap = await getDoc(chatRef);
        if (!chatSnap.exists()) {
            await setDoc(chatRef, {
                participants: [currentUser.uid, targetOwnerId],
                listingId: listingId,
                listingTitle: listingTitle,
                participantData: {
                    [currentUser.uid]: {
                        name: currentUser.displayName,
                        photo: currentUser.photoURL
                    },
                    [targetOwnerId]: targetUser
                },
                lastMessage: 'Chat started',
                unreadCounts: {
                    [currentUser.uid]: 0,
                    [targetOwnerId]: 1
                },
                updatedAt: serverTimestamp(),
                createdAt: serverTimestamp()
            });
        }
    } catch (e) {
        console.error("Error setting up chat:", e);
    }

    // Finalize URL
    window.history.replaceState({}, document.title, "chat.html");

    // Start listening for messages (this will pick up the 'setDoc' result or existing msgs)
    loadChat(compositeId, {
        participants: [currentUser.uid, targetOwnerId],
        participantData: { [targetOwnerId]: targetUser },
        listingTitle: listingTitle
    });
}

// Back Button for Mobile - Better handled in DOM
const mobileBackBtn = document.createElement('button');
mobileBackBtn.className = 'btn btn-ghost mobile-only';
mobileBackBtn.innerHTML = '<i class="fa-solid fa-arrow-left"></i>';
mobileBackBtn.style.marginRight = '10px';
mobileBackBtn.onclick = () => {
    document.querySelector('.chat-window').classList.remove('open');
    // Optional: Clear active chat to stop listening?
    // unsubscribeMessages(); 
    // activeChatId = null;
};

// Insert into chat header if mobile check
if (window.innerWidth <= 768) {
    const chatHeader = document.querySelector('.chat-header');
    if (chatHeader && !chatHeader.querySelector('.mobile-only')) {
        chatHeader.prepend(mobileBackBtn);
    }
}
