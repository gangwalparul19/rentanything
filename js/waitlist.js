import { db, auth } from './firebase-config.js';
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { showToast } from './toast.js';

// Add to waitlist
export async function addToWaitlist(listingId, listingTitle, listingImage, desiredDates = null) {
    const user = auth.currentUser;
    if (!user) {
        showToast('Please login to join waitlist', 'error');
        return false;
    }

    try {
        const waitlistId = `${user.uid}_${listingId}`;

        // Check if already in waitlist
        const existingDoc = await getDoc(doc(db, 'waitlists', waitlistId));
        if (existingDoc.exists()) {
            showToast('You are already on the waitlist for this item', 'info');
            return false;
        }

        await setDoc(doc(db, 'waitlists', waitlistId), {
            userId: user.uid,
            listingId: listingId,
            listingTitle: listingTitle,
            listingImage: listingImage,
            desiredDates: desiredDates,
            notified: false,
            createdAt: serverTimestamp()
        });

        showToast('Added to waitlist! We\'ll notify you when available 🔔', 'success');
        return true;
    } catch (error) {
        console.error('Error adding to waitlist:', error);
        showToast('Failed to add to waitlist', 'error');
        return false;
    }
}

// Remove from waitlist
export async function removeFromWaitlist(listingId) {
    const user = auth.currentUser;
    if (!user) return false;

    try {
        const waitlistId = `${user.uid}_${listingId}`;
        await deleteDoc(doc(db, 'waitlists', waitlistId));

        showToast('Removed from waitlist', 'info');
        return true;
    } catch (error) {
        console.error('Error removing from waitlist:', error);
        showToast('Failed to remove from waitlist', 'error');
        return false;
    }
}

// Check if item is in waitlist
export async function isInWaitlist(listingId) {
    const user = auth.currentUser;
    if (!user) return false;

    try {
        const waitlistId = `${user.uid}_${listingId}`;
        const docSnap = await getDoc(doc(db, 'waitlists', waitlistId));
        return docSnap.exists();
    } catch (error) {
        console.error('Error checking waitlist:', error);
        return false;
    }
}

// Notify waitlisted users when item becomes available
// Called when booking is cancelled/rejected/completed
export async function notifyWaitlistedUsers(listingId, listingTitle) {
    try {
        // Get all users on waitlist for this listing who haven't been notified
        const q = query(
            collection(db, 'waitlists'),
            where('listingId', '==', listingId),
            where('notified', '==', false)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log('No waitlisted users to notify');
            return;
        }

        // Send notification to each user
        const promises = [];
        snapshot.forEach(docSnap => {
            const waitlistData = docSnap.data();

            // Create notification
            const notificationPromise = addDoc(collection(db, 'notifications'), {
                userId: waitlistData.userId,
                title: 'Item Available! 📦',
                body: `${listingTitle} is now available for rent. Book it before it's gone!`,
                type: 'waitlist_available',
                listingId: listingId,
                read: false,
                createdAt: serverTimestamp()
            });

            // Mark as notified
            const updatePromise = setDoc(doc(db, 'waitlists', docSnap.id), {
                ...waitlistData,
                notified: true,
                notifiedAt: serverTimestamp()
            });

            promises.push(notificationPromise, updatePromise);
        });

        await Promise.all(promises);
        console.log(`Notified ${snapshot.size} waitlisted users for ${listingTitle}`);

    } catch (error) {
        console.error('Error notifying waitlisted users:', error);
    }
}

// Get waitlist count for a listing (for owners to see demand)
export async function getWaitlistCount(listingId) {
    try {
        const q = query(
            collection(db, 'waitlists'),
            where('listingId', '==', listingId)
        );

        const snapshot = await getDocs(q);
        return snapshot.size;
    } catch (error) {
        console.error('Error getting waitlist count:', error);
        return 0;
    }
}

// Get user's waitlist items
export async function getUserWaitlist(userId) {
    try {
        const q = query(
            collection(db, 'waitlists'),
            where('userId', '==', userId)
        );

        const snapshot = await getDocs(q);
        const waitlist = [];

        snapshot.forEach(doc => {
            waitlist.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return waitlist;
    } catch (error) {
        console.error('Error getting user waitlist:', error);
        return [];
    }
}

// Expose for window access
window.addToWaitlist = addToWaitlist;
window.removeFromWaitlist = removeFromWaitlist;
window.notifyWaitlistedUsers = notifyWaitlistedUsers;
