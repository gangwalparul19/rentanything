
// FEATURE: Mark as Sold
window.markAsSold = async function (listingId) {
    if (!confirm('Mark this item as sold? It will be hidden from search results.')) {
        return;
    }

    try {
        const { updateDoc, doc, serverTimestamp } = await import('firebase/firestore');
        const { db, auth } = await import('./firebase-config.js');
        const { showToast } = await import('./toast.js');

        await updateDoc(doc(db, 'listings', listingId), {
            status: 'sold',
            soldAt: serverTimestamp()
        });

        showToast('Listing marked as sold! 🎉', 'success');

        // Refresh listings
        const user = auth.currentUser;
        if (user) {
            // Reload the dashboard data
            const { loadDashboardData } = await import('./my-listings.js');
            if (typeof loadDashboardData === 'function') {
                loadDashboardData(user.uid);
            } else {
                // Fallback: reload page
                window.location.reload();
            }
        }
    } catch (error) {
        console.error('Error marking as sold:', error);
        const { showToast } = await import('./toast.js');
        showToast('Failed to mark as sold. Please try again.', 'error');
    }
};
