import { auth } from './firebase-config.js';
import { onAuthStateChanged } from 'firebase/auth';
import { initHeader } from './header-manager.js';
import { initMobileMenu } from './navigation.js';
import { initTheme } from './theme.js';
import { initAuth } from './auth.js';
import { initFooter } from './footer-manager.js';
import { showToast } from './toast-enhanced.js';
import {
    forumCategories,
    loadThreads,
    createThread,
    searchThreads
} from './forum.js';

// State
let currentCategory = 'all';
let allThreads = [];

// DOM Elements
const threadsContainer = document.getElementById('threads-container');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const filterButtons = document.querySelectorAll('.filter-btn');
const newThreadBtn = document.getElementById('new-thread-btn');
const newThreadModal = document.getElementById('new-thread-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelBtn = document.getElementById('cancel-btn');
const newThreadForm = document.getElementById('new-thread-form');

// Character counters
const titleInput = document.getElementById('thread-title');
const contentInput = document.getElementById('thread-content');
const titleCount = document.getElementById('title-count');
const contentCount = document.getElementById('content-count');

// Init
document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    initMobileMenu();
    initTheme();
    initAuth();
    initFooter();

    setupEventListeners();
});

// Auth Listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadForumThreads();
    } else {
        loadForumThreads(); // Can view even if not logged in
    }
});

function setupEventListeners() {
    // Search
    searchInput?.addEventListener('input', handleSearch);

    // Category Filters
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            filterThreads();
        });
    });

    // Modal
    newThreadBtn?.addEventListener('click', openModal);
    closeModalBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    newThreadModal?.addEventListener('click', (e) => {
        if (e.target === newThreadModal) closeModal();
    });

    // Form
    newThreadForm?.addEventListener('submit', handleCreateThread);

    // Character counters
    titleInput?.addEventListener('input', (e) => {
        titleCount.textContent = e.target.value.length;
    });
    contentInput?.addEventListener('input', (e) => {
        contentCount.textContent = e.target.value.length;
    });
}

// Load all threads
async function loadForumThreads() {
    try {
        threadsContainer.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Loading threads...</p></div>';

        // Load all threads (no societyId filter for now)
        allThreads = await loadThreads(null, null, { sortBy: 'last ActivityAt', limit: 50 });

        displayThreads(allThreads);
    } catch (error) {
        console.error('Error loading threads:', error);
        threadsContainer.innerHTML = '<div class="empty-state"><p>Error loading threads. Please try again.</p></div>';
    }
}

// Display threads
function displayThreads(threads) {
    if (!threadsContainer) return;

    if (threads.length === 0) {
        threadsContainer.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    threadsContainer.innerHTML = threads.map(thread => `
        <div class="thread-card ${thread.isPinned ? 'pinned' : ''}" onclick="window.location.href='/forum-thread.html?id=${thread.id}'">
            <div class="thread-card-header">
                <div>
                    ${thread.isPinned ? '<i class="fas fa-thumbtack" style="color: var(--primary); margin-right: 0.5rem;"></i>' : ''}
                    <h3 class="thread-title">${escapeHtml(thread.title)}</h3>
                </div>
                <span class="thread-category ${thread.categoryId || 'general'}">${getCategoryName(thread.categoryId)}</span>
            </div>
            
            <p class="thread-excerpt">${escapeHtml(thread.content).substring(0, 200)}${thread.content.length > 200 ? '...' : ''}</p>
            
            ${thread.tags && thread.tags.length > 0 ? `
                <div class="thread-tags">
                    ${thread.tags.map(tag => `<span class="thread-tag">#${escapeHtml(tag)}</span>`).join('')}
                </div>
            ` : ''}
            
            <div class="thread-footer">
                <div class="thread-author">
                    <img src="${thread.authorPhoto || 'https://placehold.co/24'}" alt="${thread.authorName}" referrerpolicy="no-referrer" onerror="this.src='https://placehold.co/24'">
                    <span>${escapeHtml(thread.authorName)}</span>
                </div>
                <div class="thread-stats">
                    <span class="thread-stat"><i class="fas fa-comment"></i> ${thread.replyCount || 0}</span>
                    <span class="thread-stat"><i class="fas fa-eye"></i> ${thread.views || 0}</span>
                    <span class="thread-stat"><i class="fas fa-clock"></i> ${timeAgo(thread.lastActivityAt)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Filter threads
function filterThreads() {
    let filtered = allThreads;

    if (currentCategory !== 'all') {
        filtered = allThreads.filter(t => t.categoryId === currentCategory);
    }

    displayThreads(filtered);
}

// Search threads
let searchTimeout;
async function handleSearch(e) {
    const query = e.target.value.trim();

    clearTimeout(searchTimeout);

    if (!query) {
        filterThreads();
        return;
    }

    searchTimeout = setTimeout(async () => {
        const results = await searchThreads(query, null);

        // Apply category filter if active
        let filtered = results;
        if (currentCategory !== 'all') {
            filtered = results.filter(t => t.categoryId === currentCategory);
        }

        displayThreads(filtered);
    }, 300);
}

// Modal functions
function openModal() {
    if (!auth.currentUser) {
        showToast('Please login to create a thread', 'info');
        return;
    }
    newThreadModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    newThreadModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    newThreadForm.reset();
    titleCount.textContent = '0';
    contentCount.textContent = '0';
}

// Create thread
async function handleCreateThread(e) {
    e.preventDefault();

    if (!auth.currentUser) {
        showToast('Please login to create a thread', 'error');
        return;
    }

    const title = document.getElementById('thread-title').value.trim();
    const content = document.getElementById('thread-content').value.trim();
    const category = document.getElementById('thread-category').value;
    const tagsInput = document.getElementById('thread-tags').value.trim();

    if (!title || !content || !category) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

    const threadData = {
        title,
        content,
        categoryId: category,
        tags,
        societyId: null // Global forum
    };

    const threadId = await createThread(threadData);

    if (threadId) {
        closeModal();
        // Redirect to new thread
        window.location.href = `/forum-thread.html?id=${threadId}`;
    }
}

// Helper functions
function getCategoryName(categoryId) {
    const category = forumCategories.find(c => c.id === categoryId);
    return category ? category.name : 'General';
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
