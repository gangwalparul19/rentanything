/**
 * Society Groups Module
 * Manage private communities for housing societies
 */

import { db, auth } from './firebase-config.js';
import {
    doc, getDoc, setDoc, updateDoc, deleteDoc,
    collection, query, where, getDocs, addDoc,
    arrayUnion, arrayRemove, serverTimestamp
} from 'firebase/firestore';
import { showToast } from './toast-enhanced.js';

/**
 * Create a new society group
 * @param {Object} societyData - Society details
 */
export async function createSociety(societyData) {
    const user = auth.currentUser;
    if (!user) {
        showToast('Please login to create a society', 'error');
        return null;
    }

    try {
        const slug = societyData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        // Check if society with this slug already exists
        const existingQuery = query(collection(db, 'societies'), where('slug', '==', slug));
        const existingSnap = await getDocs(existingQuery);

        if (!existingSnap.empty) {
            showToast('A society with this name already exists', 'error');
            return null;
        }

        const societyRef = await addDoc(collection(db, 'societies'), {
            name: societyData.name,
            slug: slug,
            description: societyData.description || '',
            location: societyData.location || '',
            image: societyData.image || null,
            members: [user.uid],
            admins: [user.uid],
            isPrivate: societyData.isPrivate !== false,
            memberCount: 1,
            createdBy: user.uid,
            createdAt: serverTimestamp()
        });

        // Update user's societies list
        await updateDoc(doc(db, 'users', user.uid), {
            societies: arrayUnion(societyRef.id),
            primarySociety: societyRef.id
        });

        showToast('🏠 Society created successfully!', 'success');
        return societyRef.id;

    } catch (error) {
        console.error('Error creating society:', error);
        showToast('Failed to create society', 'error');
        return null;
    }
}

/**
 * Join a society
 * @param {string} societyId - Society ID to join
 */
export async function joinSociety(societyId) {
    const user = auth.currentUser;
    if (!user) {
        showToast('Please login to join a society', 'error');
        return false;
    }

    try {
        const societyRef = doc(db, 'societies', societyId);
        const societySnap = await getDoc(societyRef);

        if (!societySnap.exists()) {
            showToast('Society not found', 'error');
            return false;
        }

        const societyData = societySnap.data();

        // Check if already a member
        if (societyData.members.includes(user.uid)) {
            showToast('You\'re already a member of this society', 'info');
            return true;
        }

        // If private, create a join request
        if (societyData.isPrivate) {
            await addDoc(collection(db, 'society_join_requests'), {
                societyId: societyId,
                societyName: societyData.name,
                userId: user.uid,
                userName: user.displayName || 'User',
                userEmail: user.email,
                userPhoto: user.photoURL,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            showToast('Join request sent! An admin will review it.', 'success');
            return true;
        }

        // Public society - join directly
        await updateDoc(societyRef, {
            members: arrayUnion(user.uid),
            memberCount: (societyData.memberCount || 0) + 1
        });

        await updateDoc(doc(db, 'users', user.uid), {
            societies: arrayUnion(societyId)
        });

        showToast(`🎉 Welcome to ${societyData.name}!`, 'success');
        return true;

    } catch (error) {
        console.error('Error joining society:', error);
        showToast('Failed to join society', 'error');
        return false;
    }
}

/**
 * Leave a society
 * @param {string} societyId - Society ID to leave
 */
export async function leaveSociety(societyId) {
    const user = auth.currentUser;
    if (!user) return false;

    try {
        const societyRef = doc(db, 'societies', societyId);
        const societySnap = await getDoc(societyRef);

        if (!societySnap.exists()) return false;

        const societyData = societySnap.data();

        await updateDoc(societyRef, {
            members: arrayRemove(user.uid),
            admins: arrayRemove(user.uid),
            memberCount: Math.max(0, (societyData.memberCount || 1) - 1)
        });

        await updateDoc(doc(db, 'users', user.uid), {
            societies: arrayRemove(societyId)
        });

        showToast('You\'ve left the society', 'info');
        return true;

    } catch (error) {
        console.error('Error leaving society:', error);
        return false;
    }
}

/**
 * Get user's societies
 * @returns {Promise<Array>} List of societies user belongs to
 */
export async function getUserSocieties() {
    const user = auth.currentUser;
    if (!user) return [];

    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) return [];

        const societyIds = userDoc.data().societies || [];
        if (societyIds.length === 0) return [];

        const societies = [];
        for (const id of societyIds) {
            const societySnap = await getDoc(doc(db, 'societies', id));
            if (societySnap.exists()) {
                societies.push({ id, ...societySnap.data() });
            }
        }

        return societies;

    } catch (error) {
        console.error('Error fetching user societies:', error);
        return [];
    }
}

/**
 * Search for societies
 * @param {string} searchTerm - Search query
 */
export async function searchSocieties(searchTerm) {
    try {
        const q = query(collection(db, 'societies'));
        const snap = await getDocs(q);

        const term = searchTerm.toLowerCase();
        return snap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(society =>
                society.name.toLowerCase().includes(term) ||
                society.location?.toLowerCase().includes(term)
            );

    } catch (error) {
        console.error('Error searching societies:', error);
        return [];
    }
}

/**
 * Approve a join request (admin only)
 * @param {string} requestId - Join request ID
 */
export async function approveJoinRequest(requestId) {
    const user = auth.currentUser;
    if (!user) return false;

    try {
        const requestRef = doc(db, 'society_join_requests', requestId);
        const requestSnap = await getDoc(requestRef);

        if (!requestSnap.exists()) return false;

        const request = requestSnap.data();
        const societyRef = doc(db, 'societies', request.societyId);
        const societySnap = await getDoc(societyRef);

        if (!societySnap.exists()) return false;

        const societyData = societySnap.data();

        // Check if current user is admin
        if (!societyData.admins.includes(user.uid)) {
            showToast('Only admins can approve requests', 'error');
            return false;
        }

        // Add member
        await updateDoc(societyRef, {
            members: arrayUnion(request.userId),
            memberCount: (societyData.memberCount || 0) + 1
        });

        // Update user's societies
        await updateDoc(doc(db, 'users', request.userId), {
            societies: arrayUnion(request.societyId)
        });

        // Update request status
        await updateDoc(requestRef, {
            status: 'approved',
            approvedBy: user.uid,
            approvedAt: serverTimestamp()
        });

        showToast('Member approved!', 'success');
        return true;

    } catch (error) {
        console.error('Error approving join request:', error);
        return false;
    }
}

/**
 * Render society selector dropdown for search/filter
 * @param {Array} societies - User's societies
 * @param {string} selectedId - Currently selected society ID
 */
export function renderSocietySelector(societies, selectedId = '') {
    if (!societies || societies.length === 0) {
        return `
            <select id="society-filter" class="form-control" disabled>
                <option value="">All Locations</option>
            </select>
        `;
    }

    return `
        <select id="society-filter" class="form-control" onchange="window.filterBySociety(this.value)">
            <option value="">All Locations</option>
            ${societies.map(s => `
                <option value="${s.id}" ${selectedId === s.id ? 'selected' : ''}>
                    ${s.name}
                </option>
            `).join('')}
        </select>
    `;
}

/**
 * Render society badge/chips for display
 * @param {Object} society - Society data
 */
export function renderSocietyBadge(society) {
    if (!society) return '';

    return `
        <span style="
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            background: #e0f2fe;
            color: #0284c7;
            padding: 0.25rem 0.6rem;
            border-radius: 0.5rem;
            font-size: 0.8rem;
            font-weight: 500;
        ">
            <i class="fa-solid fa-location-dot"></i>
            ${society.name}
        </span>
    `;
}
