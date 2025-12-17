import { db, auth } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { showToast } from './toast-enhanced.js';

/**
 * Share to WhatsApp
 */
export function shareToWhatsApp(title, price, url) {
    const text = `Check out "${title}" for ₹${price}/day on RentAnything!\n\nRent items in your neighborhood 🏘️`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + '\n\n' + url)}`;

    window.open(whatsappUrl, '_blank');
    trackShare('whatsapp', url);
}

/**
 * Share to Facebook
 */
export function shareToFacebook(url) {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(fbUrl, '_blank', 'width=600,height=400');
    trackShare('facebook', url);
}

/**
 * Share to Twitter
 */
export function shareToTwitter(title, url) {
    const text = `Check out "${title}" on RentAnything - Rent anything in your neighborhood! 🏘️`;
    const hashtags = 'RentAnything,SharingEconomy';
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${hashtags}`;

    window.open(twitterUrl, '_blank', 'width=600,height=400');
    trackShare('twitter', url);
}

/**
 * Share to LinkedIn
 */
export function shareToLinkedIn(url) {
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    window.open(linkedinUrl, '_blank', 'width=600,height=400');
    trackShare('linkedin', url);
}

/**
 * Share via Email
 */
export function shareViaEmail(title, price, description, url) {
    const subject = `Check out: ${title} on RentAnything`;
    const body = `Hi!\n\nI found this item on RentAnything that might interest you:\n\n📦 ${title}\n💰 Price: ₹${price}/day\n📝 ${description.substring(0, 150)}...\n\n🔗 View here: ${url}\n\nRentAnything - Rent anything in your neighborhood!\n`;

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    trackShare('email', url);
}

/**
 * Copy share link to clipboard
 */
export async function copyShareLink(url) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(url);
            showToast('Link copied to clipboard! 📋', 'success');
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = url;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();

            try {
                document.execCommand('copy');
                showToast('Link copied to clipboard! 📋', 'success');
            } catch (err) {
                showToast('Failed to copy link', 'error');
            }

            document.body.removeChild(textArea);
        }

        trackShare('copy_link', url);
    } catch (err) {
        console.error('Copy failed:', err);
        showToast('Failed to copy link', 'error');
    }
}

/**
 * Native share API (mobile)
 */
export async function shareNative(title, text, url) {
    if (navigator.share) {
        try {
            await navigator.share({
                title: title,
                text: text,
                url: url
            });
            trackShare('native', url);
        } catch (err) {
            // User cancelled share or error occurred
            if (err.name !== 'AbortError') {
                console.error('Share failed:', err);
                showToast('Share cancelled', 'info');
            }
        }
    } else {
        showToast('Sharing not supported on this device', 'info');
    }
}

/**
 * Track share events for analytics
 */
async function trackShare(platform, url) {
    try {
        // Extract listing ID from URL
        const urlObj = new URL(url);
        const listingId = urlObj.searchParams.get('id');

        if (!listingId) {
            console.log('No listing ID found in URL');
            return;
        }

        // Store share analytics
        await addDoc(collection(db, 'share_analytics'), {
            listingId: listingId,
            platform: platform,
            sharedAt: serverTimestamp(),
            userId: auth.currentUser?.uid || 'anonymous',
            url: url
        });

        console.log(`Share tracked: ${platform} for listing ${listingId}`);
    } catch (error) {
        // Fail silently - don't block sharing if analytics fail
        console.log('Share tracking failed:', error);
    }
}

/**
 * Initialize share menu toggle
 */
export function initShareMenu() {
    const shareMenus = document.querySelectorAll('.share-menu');

    shareMenus.forEach(menu => {
        const trigger = menu.querySelector('.share-trigger');

        if (trigger) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();

                // Close other open menus
                shareMenus.forEach(m => {
                    if (m !== menu) {
                        m.classList.remove('active');
                    }
                });

                // Toggle current menu
                menu.classList.toggle('active');
            });
        }
    });

    // Close menu when clicking outside
    document.addEventListener('click', () => {
        shareMenus.forEach(menu => menu.classList.remove('active'));
    });
}

// Expose functions globally for HTML onclick handlers
window.shareToWhatsApp = shareToWhatsApp;
window.shareToFacebook = shareToFacebook;
window.shareToTwitter = shareToTwitter;
window.shareToLinkedIn = shareToLinkedIn;
window.shareViaEmail = shareViaEmail;
window.copyShareLink = copyShareLink;
window.shareNative = shareNative;
