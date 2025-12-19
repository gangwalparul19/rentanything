import { auth } from './firebase-config.js';
import { onAuthStateChanged } from 'firebase/auth';
import { initHeader } from './header-manager.js';
import { initMobileMenu } from './navigation.js';
import { initTheme } from './theme.js';
import { initAuth } from './auth.js';
import { initFooter } from './footer-manager.js';
import { showToast } from './toast-enhanced.js';
import {
    loadThread,
    loadPosts,
    createPost,
    toggleLikePost
} from './forum.js';

// State
let currentThread = null;
let threadId = null;
let posts = [];

// DOM Elements
const threadLoading = document.getElementById('thread-loading');
const threadContent = document.getElementById('thread-content');
const threadNotFound = document.getElementById('thread-not-found');
const replyForm = document.getElementById('reply-form');
const replyContent = document.getElementById('reply-content');
const replyCountChar = document.getElementById('reply-count-char');
const repliesContainer = document.getElementById('replies-container');
const noReplies = document.getElementById('no-replies');

// Init
document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    initMobileMenu();
    initTheme();
    initAuth();
    initFooter();

    // Get thread ID from URL
    const params = new URLSearchParams(window.location.search);
    threadId = params.get('id');

    if (!threadId) {
        showThreadNotFound();
        return;
    }

    setupEventListeners();
    loadThreadData();
});

function setupEventListeners() {
    // Reply form
    replyForm?.addEventListener('submit', handleReply);

    // Character counter
    replyContent?.addEventListener('input', (e) => {
        const length = e.target.value.length;
        replyCountChar.textContent = length;
        if (length > 1000) {
            replyCountChar.style.color = '#e11d48';
        } else {
            replyCountChar.style.color = '';
        }
    });
}

// Load thread and replies
async function loadThreadData() {
    try {
        // Load thread
        currentThread = await loadThread(threadId);

        if (!currentThread) {
            showThreadNotFound();
            return;
        }

        // Display thread
        displayThread(currentThread);

        // Load replies
        posts = await loadPosts(threadId);
        displayReplies(posts);

        // Hide loading, show content
        threadLoading.style.display = 'none';
        threadContent.style.display = 'block';

    } catch (error) {
        console.error('Error loading thread:', error);
        showThreadNotFound();
    }
}

// Display thread
function displayThread(thread) {
    // Category badge
    const categoryBadge = document.getElementById('thread-category-badge');
    categoryBadge.textContent = getCategoryName(thread.categoryId);
    categoryBadge.className = `thread-category ${thread.categoryId || 'general'}`;

    // Date and views
    document.getElementById('thread-date').textContent = formatDate(thread.createdAt);
    document.getElementById('thread-views').textContent = thread.views || 0;

    // Title
    document.getElementById('thread-title').textContent = thread.title;

    // Tags
    const tagsContainer = document.getElementById('thread-tags');
    if (thread.tags && thread.tags.length > 0) {
        tagsContainer.innerHTML = thread.tags.map(tag =>
            `<span class="thread-tag">#${escapeHtml(tag)}</span>`
        ).join('');
    }

    // Author
    document.getElementById('thread-author-photo').src = thread.authorPhoto || 'https://placehold.co/48';
    document.getElementById('thread-author-name').textContent = thread.authorName;
    document.getElementById('thread-time').textContent = timeAgo(thread.createdAt);

    // Content
    document.getElementById('thread-content-text').textContent = thread.content;

    // Likes (if implemented)
    document.getElementById('thread-likes').textContent = thread.likeCount || 0;
}

// Display replies
function displayReplies(replies) {
    const replyCountElem = document.getElementById('reply-count');
    replyCountElem.textContent = replies.length;

    if (replies.length === 0) {
        repliesContainer.innerHTML = '';
        noReplies.style.display = 'block';
        return;
    }

    noReplies.style.display = 'none';

    repliesContainer.innerHTML = replies.map(post => `
        <div class="post-card" data-post-id="${post.id}">
            <div class="post-author">
                <img src="${post.authorPhoto || 'https://placehold.co/48'}" alt="${post.authorName}" referrerpolicy="no-referrer" onerror="this.src='https://placehold.co/48'">
                <div>
                    <div class="author-name">${escapeHtml(post.authorName)}</div>
                    <div class="post-time">${timeAgo(post.createdAt)}</div>
                </div>
            </div>
            <div class="post-content">${escapeHtml(post.content)}</div>
            <div class="post-actions">
                <button class="action-btn like-btn ${post.likes?.includes(auth.currentUser?.uid) ? 'liked' : ''}" onclick="handleLikePost('${post.id}')">
                    <i class="${post.likes?.includes(auth.currentUser?.uid) ? 'fas' : 'far'} fa-heart"></i>
                    <span class="like-count">${post.likeCount || 0}</span>
                </button>
            </div>
        </div>
    `).join('');
}

// Handle reply submission
async function handleReply(e) {
    e.preventDefault();

    if (!auth.currentUser) {
        showToast('Please login to reply', 'info');
        return;
    }

    const content = replyContent.value.trim();

    if (!content) {
        showToast('Please enter a reply', 'error');
        return;
    }

    if (content.length > 1000) {
        showToast('Reply is too long (max 1000 characters)', 'error');
        return;
    }

    const success = await createPost(threadId, content, currentThread.societyId);

    if (success) {
        // Clear form
        replyContent.value = '';
        replyCountChar.textContent = '0';

        // Reload replies
        posts = await loadPosts(threadId);
        displayReplies(posts);
    }
}

// Handle like post
window.handleLikePost = async function (postId) {
    if (!auth.currentUser) {
        showToast('Please login to like', 'info');
        return;
    }

    const success = await toggleLikePost(postId);

    if (success) {
        // Reload replies to update UI
        posts = await loadPosts(threadId);
        displayReplies(posts);
    }
};

// Show thread not found
function showThreadNotFound() {
    threadLoading.style.display = 'none';
    threadContent.style.display = 'none';
    threadNotFound.style.display = 'block';
}

// Helper functions
function getCategoryName(categoryId) {
    const categories = {
        'advice': '💡 Request for Advice',
        'general': '💬 General Discussion',
        'feedback': '📢 Feedback & Suggestions'
    };
    return categories[categoryId] || '💬 General';
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function timeAgo(timestamp) {
    if (!timestamp) return 'Just now';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date() - date) / 1000);

    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval !== 1 ? 's' : ''} ago`;
        }
    }

    return 'Just now';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
