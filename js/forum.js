import { db, auth } from './firebase-config.js';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, increment, orderBy, limit, arrayUnion, arrayRemove } from 'firebase/firestore';
import { showToast } from './toast.js';

/**
 * Default forum categories
 */
export const forumCategories = [
    { id: 'general', name: 'General Discussion', icon: '💬', description: 'General community topics' },
    { id: 'recommendations', name: 'Recommendations', icon: '🔧', description: 'Service provider recommendations' },
    { id: 'events', name: 'Events & Gatherings', icon: '🎉', description: 'Community events and meetups' },
    { id: 'announcements', name: 'Announcements', icon: '📢', description: 'Important community updates' },
    { id: 'marketplace', name: 'Buy/Sell/Trade', icon: '🏠', description: 'Local marketplace' },
    { id: 'qa', name: 'Q&A / Help', icon: '❓', description: 'Questions and answers' }
];

/**
 * Load threads for a society
 * @param {string} societyId - Society ID
 * @param {string} categoryId - Optional category filter
 * @param {object} options - Sort and filter options
 * @returns {array} Array of threads
 */
export async function loadThreads(societyId, categoryId = null, options = {}) {
    try {
        let q = query(
            collection(db, 'forum_threads'),
            where('societyId', '==', societyId)
        );

        if (categoryId) {
            q = query(q, where('categoryId', '==', categoryId));
        }

        // Apply sorting
        const sortBy = options.sortBy || 'lastActivityAt';
        q = query(q, orderBy(sortBy, 'desc'));

        // Apply limit
        if (options.limit) {
            q = query(q, limit(options.limit));
        }

        const snapshot = await getDocs(q);
        const threads = [];

        snapshot.forEach(doc => {
            threads.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return threads;
    } catch (error) {
        console.error('Error loading threads:', error);
        return [];
    }
}

/**
 * Load a single thread by ID
 * @param {string} threadId - Thread ID 
 * @returns {object|null} Thread data
 */
export async function loadThread(threadId) {
    try {
        const threadRef = doc(db, 'forum_threads', threadId);
        const threadSnap = await getDoc(threadRef);

        if (threadSnap.exists()) {
            // Increment view count
            await updateDoc(threadRef, {
                views: increment(1)
            });

            return {
                id: threadSnap.id,
                ...threadSnap.data()
            };
        }
        return null;
    } catch (error) {
        console.error('Error loading thread:', error);
        return null;
    }
}

/**
 * Create a new thread
 * @param {object} threadData - Thread data
 * @returns {string|null} Thread ID
 */
export async function createThread(threadData) {
    const user = auth.currentUser;
    if (!user) {
        showToast('Please login to create a thread', 'error');
        return null;
    }

    try {
        const thread = {
            societyId: threadData.societyId,
            categoryId: threadData.categoryId,
            title: threadData.title,
            content: threadData.content,
            authorId: user.uid,
            authorName: user.displayName || 'User',
            authorPhoto: user.photoURL || '',
            tags: threadData.tags || [],
            views: 0,
            replyCount: 0,
            lastActivityAt: serverTimestamp(),
            isPinned: false,
            isLocked: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'forum_threads'), thread);
        showToast('Thread created successfully! 🎉', 'success');
        return docRef.id;
    } catch (error) {
        console.error('Error creating thread:', error);
        showToast('Failed to create thread', 'error');
        return null;
    }
}

/**
 * Load posts for a thread
 * @param {string} threadId - Thread ID
 * @returns {array} Array of posts
 */
export async function loadPosts(threadId) {
    try {
        const q = query(
            collection(db, 'forum_posts'),
            where('threadId', '==', threadId),
            orderBy('createdAt', 'asc')
        );

        const snapshot = await getDocs(q);
        const posts = [];

        snapshot.forEach(doc => {
            posts.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return posts;
    } catch (error) {
        console.error('Error loading posts:', error);
        return [];
    }
}

/**
 * Create a new post (reply)
 * @param {string} threadId - Thread ID
 * @param {string} content - Post content
 * @param {string} societyId - Society ID
 * @returns {boolean} Success
 */
export async function createPost(threadId, content, societyId) {
    const user = auth.currentUser;
    if (!user) {
        showToast('Please login to reply', 'error');
        return false;
    }

    try {
        const post = {
            threadId: threadId,
            societyId: societyId,
            content: content,
            authorId: user.uid,
            authorName: user.displayName || 'User',
            authorPhoto: user.photoURL || '',
            likes: [],
            likeCount: 0,
            isEdited: false,
            createdAt: serverTimestamp()
        };

        await addDoc(collection(db, 'forum_posts'), post);

        // Update thread reply count and last activity
        const threadRef = doc(db, 'forum_threads', threadId);
        await updateDoc(threadRef, {
            replyCount: increment(1),
            lastActivityAt: serverTimestamp()
        });

        // Notify thread author (if not replying to own thread)
        const threadSnap = await getDoc(threadRef);
        if (threadSnap.exists() && threadSnap.data().authorId !== user.uid) {
            await addDoc(collection(db, 'notifications'), {
                userId: threadSnap.data().authorId,
                title: 'New reply to your thread',
                body: `${user.displayName || 'Someone'} replied to "${threadSnap.data().title}"`,
                type: 'forum_reply',
                threadId: threadId,
                read: false,
                createdAt: serverTimestamp()
            });
        }

        showToast('Reply posted! 💬', 'success');
        return true;
    } catch (error) {
        console.error('Error creating post:', error);
        showToast('Failed to post reply', 'error');
        return false;
    }
}

/**
 * Like/unlike a post
 * @param {string} postId - Post ID
 * @returns {boolean} Success
 */
export async function toggleLikePost(postId) {
    const user = auth.currentUser;
    if (!user) {
        showToast('Please login to like posts', 'error');
        return false;
    }

    try {
        const postRef = doc(db, 'forum_posts', postId);
        const postSnap = await getDoc(postRef);

        if (!postSnap.exists()) return false;

        const likes = postSnap.data().likes || [];
        const hasLiked = likes.includes(user.uid);

        if (hasLiked) {
            // Unlike
            await updateDoc(postRef, {
                likes: arrayRemove(user.uid),
                likeCount: increment(-1)
            });
        } else {
            // Like
            await updateDoc(postRef, {
                likes: arrayUnion(user.uid),
                likeCount: increment(1)
            });
        }

        return true;
    } catch (error) {
        console.error('Error toggling like:', error);
        return false;
    }
}

/**
 * Pin/unpin a thread (admin/moderator only)
 * @param {string} threadId - Thread ID
 * @param {boolean} isPinned - Pin state
 * @returns {boolean} Success
 */
export async function pinThread(threadId, isPinned) {
    try {
        const threadRef = doc(db, 'forum_threads', threadId);
        await updateDoc(threadRef, {
            isPinned: isPinned,
            updatedAt: serverTimestamp()
        });
        showToast(isPinned ? 'Thread pinned 📌' : 'Thread unpinned', 'success');
        return true;
    } catch (error) {
        console.error('Error pinning thread:', error);
        showToast('Failed to update thread', 'error');
        return false;
    }
}

/**
 * Lock/unlock a thread (admin/moderator only)
 * @param {string} threadId - Thread ID
 * @param {boolean} isLocked - Lock state
 * @returns {boolean} Success
 */
export async function lockThread(threadId, isLocked) {
    try {
        const threadRef = doc(db, 'forum_threads', threadId);
        await updateDoc(threadRef, {
            isLocked: isLocked,
            updatedAt: serverTimestamp()
        });
        showToast(isLocked ? 'Thread locked 🔒' : 'Thread unlocked', 'success');
        return true;
    } catch (error) {
        console.error('Error locking thread:', error);
        showToast('Failed to update thread', 'error');
        return false;
    }
}

/**
 * Delete a thread
 * @param {string} threadId - Thread ID
 * @returns {boolean} Success
 */
export async function deleteThread(threadId) {
    try {
        // Delete all posts in thread
        const postsQuery = query(
            collection(db, 'forum_posts'),
            where('threadId', '==', threadId)
        );
        const postsSnap = await getDocs(postsQuery);

        const deletePromises = postsSnap.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        // Delete thread
        await deleteDoc(doc(db, 'forum_threads', threadId));

        showToast('Thread deleted', 'success');
        return true;
    } catch (error) {
        console.error('Error deleting thread:', error);
        showToast('Failed to delete thread', 'error');
        return false;
    }
}

/**
 * Search threads
 * @param {string} query - Search query
 * @param {string} societyId - Society ID
 * @returns {array} Matching threads
 */
export async function searchThreads(searchQuery, societyId) {
    try {
        // Simple client-side search (for better search, use Algolia or similar)
        const allThreads = await loadThreads(societyId);
        const lowerQuery = searchQuery.toLowerCase();

        return allThreads.filter(thread =>
            thread.title.toLowerCase().includes(lowerQuery) ||
            thread.content.toLowerCase().includes(lowerQuery) ||
            thread.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
    } catch (error) {
        console.error('Error searching threads:', error);
        return [];
    }
}

/**
 * Get thread count by category
 * @param {string} societyId - Society ID
 * @param {string} categoryId - Category ID
 * @returns {number} Thread count
 */
export async function getThreadCountByCategory(societyId, categoryId) {
    try {
        const q = query(
            collection(db, 'forum_threads'),
            where('societyId', '==', societyId),
            where('categoryId', '==', categoryId)
        );

        const snapshot = await getDocs(q);
        return snapshot.size;
    } catch (error) {
        console.error('Error getting thread count:', error);
        return 0;
    }
}
