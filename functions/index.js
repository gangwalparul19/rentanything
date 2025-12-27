const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const cors = require("cors")({ origin: true });

admin.initializeApp();

/**
 * Configure Transporter
 * We use Firebase Config variables to store sensitive info.
 * Set them via CLI:
 * firebase functions:config:set smtp.email="your-email@gmail.com" smtp.password="your-app-password"
 */
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: functions.config().smtp.email,
        pass: functions.config().smtp.password,
    },
});

exports.sendBookingEmail = functions.https.onCall(async (data, context) => {
    // 1. Auth Guard
    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "The function must be called while authenticated."
        );
    }

    const { listingTitle, listingImage, ownerEmail, renterName, startDate, endDate, timeSlot, totalPrice, days } = data;

    // 2. Validate Data
    if (!listingTitle || !ownerEmail || !renterName) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Missing required email details."
        );
    }

    const logoUrl = "https://firebasestorage.googleapis.com/v0/b/YOUR_PROJECT_ID.appspot.com/o/logo.png?alt=media"; // TODO: Replace with your actual hosted logo URL

    const mailOptions = {
        from: `RentAnything <${functions.config().smtp.email}>`,
        to: ownerEmail,
        subject: `Start Earning! New Booking Request for ${listingTitle}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Booking Request</title>
    <style>
        body { margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-top: 40px; margin-bottom: 40px; }
        .header { background-color: #2563EB; padding: 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px; }
        .hero-image { width: 100%; height: 250px; object-fit: cover; background-color: #e5e7eb; }
        .content { padding: 40px 30px; color: #1f2937; }
        .greeting { font-size: 20px; font-weight: 600; margin-bottom: 20px; color: #111827; }
        .card { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .label { color: #6b7280; font-size: 14px; font-weight: 500; }
        .value { color: #111827; font-size: 14px; font-weight: 600; text-align: right; }
        .price { color: #2563EB; font-size: 18px; font-weight: 700; }
        .cta-button { display: block; width: 100%; background-color: #2563EB; color: #ffffff; text-align: center; padding: 16px 0; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 30px; font-size: 16px; }
        .footer { background-color: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <!-- Logo / Brand Header -->
        <div class="header">
            <!-- Ideally use an <img> tag here if you have a hosted URL -->
            <h1>RentAnything<span style="color:#93c5fd">.shop</span></h1>
        </div>

        <!-- Product Hero Image -->
        <img src="${listingImage}" alt="${listingTitle}" class="hero-image" />

        <div class="content">
            <div class="greeting">High Five! ✋</div>
            <p style="margin-bottom: 24px; line-height: 1.6; color: #4b5563;">
                <strong>${renterName}</strong> wants to verify and rent your item. 
                Please review the details below and approve the request from your dashboard.
            </p>

            <div class="card">
                <div style="font-size: 16px; font-weight: 700; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                    ${listingTitle}
                </div>
                
                <div class="detail-row">
                    <span class="label">Check-in</span>
                    <span class="value">${startDate}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Check-out</span>
                    <span class="value">${endDate}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Duration</span>
                    <span class="value">${days} Days</span>
                </div>
                <div class="detail-row">
                    <span class="label">Pickup Time</span>
                    <span class="value">${timeSlot}</span>
                </div>
                <div class="detail-row" style="margin-top: 10px; border-top: 1px dashed #e5e7eb; padding-top: 15px; align-items: center;">
                    <span class="label">ESTIMATED EARNINGS</span>
                    <span class="value price">₹${totalPrice}</span>
                </div>
            </div>

            <a href="https://rentanything.shop/my-listings.html" class="cta-button">Go to Dashboard to Approve</a>
            
            <p style="text-align: center; margin-top: 20px; font-size: 13px; color: #9ca3af;">
                You have 24 hours to accept or decline before the request expires.
            </p>
        </div>

        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} RentAnything.shop. All rights reserved.</p>
            <p>Sent with ❤️ from your local marketplace.</p>
        </div>
    </div>
</body>
</html>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true, message: "Email sent successfully" };
    } catch (error) {
        console.error("Error sending email:", error);
        throw new functions.https.HttpsError("internal", "Unable to send email");
    }
});

exports.sendGenericEmail = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Auth required");
    }

    const { to, subject, html } = data;
    if (!to || !subject || !html) {
        throw new functions.https.HttpsError("invalid-argument", "Missing email fields");
    }

    try {
        await transporter.sendMail({
            from: `RentAnything <${functions.config().smtp.email}>`,
            to,
            subject,
            html
        });
        return { success: true };
    } catch (error) {
        console.error("Error sending generic email:", error);
        throw new functions.https.HttpsError("internal", "Email failed");
    }
});

/**
 * Send Chat Push Notification
 * Triggers when a new message is created in a chat
 * Also creates in-app notification in Firestore
 */
exports.sendChatNotification = functions.firestore
    .document('chats/{chatId}/messages/{messageId}')
    .onCreate(async (snap, context) => {
        const message = snap.data();
        const chatId = context.params.chatId;

        // 1. Get Chat Metadata to find participants
        const chatRef = admin.firestore().collection('chats').doc(chatId);
        const chatSnap = await chatRef.get();

        if (!chatSnap.exists) {
            console.log('Chat not found');
            return null;
        }

        const chatData = chatSnap.data();
        const senderId = message.senderId;

        // Find the "other" participant
        const recipientId = chatData.participants.find(uid => uid !== senderId);
        if (!recipientId) return null;

        // Get sender name
        let senderName = "Someone";
        if (chatData.participantData && chatData.participantData[senderId]) {
            senderName = chatData.participantData[senderId].name || "Someone";
        }

        // 2. Create in-app notification in Firestore (for notification bell)
        try {
            await admin.firestore().collection('notifications').add({
                userId: recipientId,
                title: `💬 ${senderName}`,
                body: message.text || 'Sent a photo',
                type: 'message',
                link: `/chat.html?id=${chatId}`,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.error('Error creating in-app notification:', e);
        }

        // 3. Get Recipient's FCM Token for push notification
        const tokenSnap = await admin.firestore().collection('fcm_tokens').doc(recipientId).get();
        if (!tokenSnap.exists) {
            console.log('No FCM token for user:', recipientId);
            return null;
        }

        const { token } = tokenSnap.data();
        if (!token) return null;

        // 4. Send Push Notification using FCM v1 API
        const fcmMessage = {
            token: token,
            notification: {
                title: senderName,
                body: message.text || 'Sent a photo'
            },
            data: {
                url: `/chat.html?id=${chatId}`,
                chatId: chatId,
                type: 'chat_message'
            },
            webpush: {
                fcmOptions: {
                    link: `/chat.html?id=${chatId}`
                },
                notification: {
                    icon: '/icon-192.png',
                    badge: '/icon-192.png'
                }
            }
        };

        try {
            await admin.messaging().send(fcmMessage);
            console.log('Push notification sent to:', recipientId);
        } catch (error) {
            console.error('Error sending push notification:', error);
            // Cleanup invalid tokens
            if (error.code === 'messaging/registration-token-not-registered') {
                await admin.firestore().collection('fcm_tokens').doc(recipientId).delete();
                console.log('Cleaned up invalid token for:', recipientId);
            }
        }
    });

/**
 * Notify Admins when a new listing is submitted for approval
 */
exports.notifyAdminsNewListing = functions.firestore
    .document('listings/{listingId}')
    .onCreate(async (snap, context) => {
        const listing = snap.data();
        const listingId = context.params.listingId;

        // Only notify for pending listings
        if (listing.status !== 'pending') return null;

        // Get all admin FCM tokens
        const adminTokens = await admin.firestore()
            .collection('fcm_tokens')
            .where('isAdmin', '==', true)
            .get();

        if (adminTokens.empty) {
            console.log('No admin FCM tokens found');
            return null;
        }

        const tokens = adminTokens.docs.map(doc => doc.data().token).filter(t => t);

        const payload = {
            notification: {
                title: '📦 New Listing Submitted',
                body: `${listing.title || 'New item'} needs approval`,
                icon: '/logo.png'
            },
            data: {
                type: 'new_listing',
                listingId: listingId,
                url: '/admin.html#listings'
            }
        };

        try {
            const response = await admin.messaging().sendMulticast({
                tokens: tokens,
                ...payload
            });
            console.log(`Sent notification to ${response.successCount} admins`);
        } catch (error) {
            console.error('Error sending admin notification:', error);
        }
    });

/**
 * Notify Admins when a new property is submitted for approval
 */
exports.notifyAdminsNewProperty = functions.firestore
    .document('properties/{propertyId}')
    .onCreate(async (snap, context) => {
        const property = snap.data();
        const propertyId = context.params.propertyId;

        // Get all admin FCM tokens
        const adminTokens = await admin.firestore()
            .collection('fcm_tokens')
            .where('isAdmin', '==', true)
            .get();

        if (adminTokens.empty) return null;

        const tokens = adminTokens.docs.map(doc => doc.data().token).filter(t => t);

        const payload = {
            notification: {
                title: '🏠 New Property Submitted',
                body: `${property.title || 'New property'} needs approval`,
                icon: '/logo.png'
            },
            data: {
                type: 'new_property',
                propertyId: propertyId,
                url: '/admin.html#property-approvals'
            }
        };

        try {
            await admin.messaging().sendMulticast({ tokens, ...payload });
        } catch (error) {
            console.error('Error sending property notification:', error);
        }
    });

/**
 * Notify User when their listing is approved or rejected
 */
exports.notifyUserListingStatus = functions.firestore
    .document('listings/{listingId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();
        const listingId = context.params.listingId;

        // Only notify if status changed
        if (before.status === after.status) return null;

        const ownerId = after.ownerId;
        if (!ownerId) return null;

        // Get owner's FCM token
        const tokenSnap = await admin.firestore().collection('fcm_tokens').doc(ownerId).get();
        if (!tokenSnap.exists) return null;

        const { token } = tokenSnap.data();
        if (!token) return null;

        let title, body;
        if (after.status === 'active' || after.status === 'approved') {
            title = '✅ Listing Approved!';
            body = `Your item "${after.title}" is now live and visible to renters.`;
        } else if (after.status === 'rejected') {
            title = '❌ Listing Not Approved';
            body = `Your item "${after.title}" was not approved. Check your email for details.`;
        } else {
            return null;
        }

        const payload = {
            notification: { title, body, icon: '/logo.png' },
            data: { type: 'listing_status', listingId, url: '/my-listings.html' }
        };

        try {
            await admin.messaging().send({ token, ...payload });
        } catch (error) {
            console.error('Error sending listing status notification:', error);
        }
    });

/**
 * Notify Owner when they receive a new booking request
 * Creates both push notification and in-app notification
 */
exports.notifyOwnerNewBooking = functions.firestore
    .document('bookings/{bookingId}')
    .onCreate(async (snap, context) => {
        const booking = snap.data();
        const bookingId = context.params.bookingId;

        const ownerId = booking.ownerId;
        if (!ownerId) return null;

        const title = '🎉 New Booking Request!';
        const body = `${booking.renterName || 'Someone'} wants to rent "${booking.listingTitle || 'your item'}"`;

        // 1. Create in-app notification (for notification bell)
        try {
            await admin.firestore().collection('notifications').add({
                userId: ownerId,
                title: title,
                body: body,
                type: 'booking_request',
                link: '/my-listings.html',
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.error('Error creating in-app notification:', e);
        }

        // 2. Send push notification
        const tokenSnap = await admin.firestore().collection('fcm_tokens').doc(ownerId).get();
        if (!tokenSnap.exists) return null;

        const { token } = tokenSnap.data();
        if (!token) return null;

        const fcmMessage = {
            token: token,
            notification: { title, body },
            data: {
                type: 'new_booking',
                bookingId: bookingId,
                url: '/my-listings.html'
            },
            webpush: {
                notification: {
                    icon: '/icon-192.png',
                    badge: '/icon-192.png'
                }
            }
        };

        try {
            await admin.messaging().send(fcmMessage);
            console.log('Booking notification sent to owner:', ownerId);
        } catch (error) {
            console.error('Error sending booking notification:', error);
            if (error.code === 'messaging/registration-token-not-registered') {
                await admin.firestore().collection('fcm_tokens').doc(ownerId).delete();
            }
        }
    });

/**
 * Notify Renter when their booking status changes
 * Creates both push notification and in-app notification
 */
exports.notifyRenterBookingStatus = functions.firestore
    .document('bookings/{bookingId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();
        const bookingId = context.params.bookingId;

        // Only notify if status changed
        if (before.status === after.status) return null;

        const renterId = after.renterId;
        if (!renterId) return null;

        let title, body;
        if (after.status === 'confirmed' || after.status === 'approved') {
            title = '🎊 Booking Confirmed!';
            body = `Your booking for "${after.listingTitle}" has been approved!`;
        } else if (after.status === 'rejected' || after.status === 'declined') {
            title = '😔 Booking Declined';
            body = `Your booking for "${after.listingTitle}" was not approved.`;
        } else if (after.status === 'completed') {
            title = '⭐ Booking Complete';
            body = `How was your experience with "${after.listingTitle}"? Leave a review!`;
        } else {
            return null;
        }

        // 1. Create in-app notification (for notification bell)
        try {
            await admin.firestore().collection('notifications').add({
                userId: renterId,
                title: title,
                body: body,
                type: 'booking_update',
                link: '/my-bookings.html',
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.error('Error creating in-app notification:', e);
        }

        // 2. Send push notification
        const tokenSnap = await admin.firestore().collection('fcm_tokens').doc(renterId).get();
        if (!tokenSnap.exists) return null;

        const { token } = tokenSnap.data();
        if (!token) return null;

        const fcmMessage = {
            token: token,
            notification: { title, body },
            data: { type: 'booking_status', bookingId, url: '/my-bookings.html' },
            webpush: {
                notification: {
                    icon: '/icon-192.png',
                    badge: '/icon-192.png'
                }
            }
        };

        try {
            await admin.messaging().send(fcmMessage);
            console.log('Booking status notification sent to:', renterId);
        } catch (error) {
            console.error('Error sending booking status notification:', error);
            if (error.code === 'messaging/registration-token-not-registered') {
                await admin.firestore().collection('fcm_tokens').doc(renterId).delete();
            }
        }
    });

/**
 * Notify ALL users when a new Community Board request is posted
 * Sends push notification to all registered FCM tokens (except poster)
 * Works even when the PWA is closed - leverages Service Worker
 */
exports.notifyCommunityBoardPost = functions.firestore
    .document('requests/{requestId}')
    .onCreate(async (snap, context) => {
        const request = snap.data();
        const requestId = context.params.requestId;
        const posterId = request.userId;

        console.log(`New community request: ${requestId} by ${posterId}`);

        // Get ALL FCM tokens except the poster's
        const tokensSnap = await admin.firestore()
            .collection('fcm_tokens')
            .get();

        if (tokensSnap.empty) {
            console.log('No FCM tokens found');
            return null;
        }

        // Filter out poster's token and collect valid tokens
        const tokens = tokensSnap.docs
            .filter(doc => doc.id !== posterId)
            .map(doc => doc.data().token)
            .filter(t => t);

        if (tokens.length === 0) {
            console.log('No eligible recipients after filtering');
            return null;
        }

        console.log(`Sending notification to ${tokens.length} users`);

        const payload = {
            notification: {
                title: `📢 ${request.userName || 'A neighbor'} needs something!`,
                body: request.title || 'New community request posted',
                icon: '/icon-192.png'
            },
            data: {
                type: 'community_request',
                requestId: requestId,
                url: '/requests.html'
            }
        };

        // Send in batches (FCM limit is 500 per multicast call)
        const batchSize = 500;
        let successCount = 0;
        let failureCount = 0;

        for (let i = 0; i < tokens.length; i += batchSize) {
            const batch = tokens.slice(i, i + batchSize);
            try {
                const response = await admin.messaging().sendEachForMulticast({
                    tokens: batch,
                    notification: payload.notification,
                    data: payload.data
                });
                successCount += response.successCount;
                failureCount += response.failureCount;

                // Clean up invalid tokens
                response.responses.forEach((resp, idx) => {
                    if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
                        // Find the user with this token and delete
                        const invalidToken = batch[idx];
                        tokensSnap.docs.forEach(doc => {
                            if (doc.data().token === invalidToken) {
                                admin.firestore().collection('fcm_tokens').doc(doc.id).delete();
                                console.log(`Cleaned up invalid token for user: ${doc.id}`);
                            }
                        });
                    }
                });
            } catch (error) {
                console.error('Batch send error:', error);
                failureCount += batch.length;
            }
        }

        console.log(`Community notification sent: ${successCount} success, ${failureCount} failures`);
        return { success: successCount, failed: failureCount };
    });

/**
 * Weekly Email Digest
 * Sends personalized email to users every Monday at 9 AM IST
 * Contains new listings in their area and community highlights
 */
exports.sendWeeklyEmailDigest = functions.pubsub
    .schedule('0 9 * * 1') // Every Monday at 9 AM
    .timeZone('Asia/Kolkata')
    .onRun(async (context) => {
        console.log('Starting weekly email digest...');

        try {
            // Get all users who have email digest enabled
            const usersSnap = await admin.firestore()
                .collection('users')
                .where('emailPreferences.digest', '==', true)
                .get();

            if (usersSnap.empty) {
                console.log('No users subscribed to digest');
                return null;
            }

            // Get listings from the past week
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

            const newListingsSnap = await admin.firestore()
                .collection('listings')
                .where('status', 'in', ['active', 'approved'])
                .where('createdAt', '>=', oneWeekAgo)
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get();

            const newListings = newListingsSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Get community requests from past week
            const requestsSnap = await admin.firestore()
                .collection('requests')
                .where('createdAt', '>=', oneWeekAgo)
                .orderBy('createdAt', 'desc')
                .limit(5)
                .get();

            const communityRequests = requestsSnap.docs.map(doc => doc.data());

            let successCount = 0;
            let failureCount = 0;

            // Send personalized email to each user
            for (const userDoc of usersSnap.docs) {
                const user = userDoc.data();

                if (!user.email) continue;

                // Filter listings by user's location/society if available
                let relevantListings = newListings;
                if (user.society) {
                    relevantListings = newListings.filter(l =>
                        l.location?.toLowerCase().includes(user.society.toLowerCase())
                    );
                    // If no local matches, show all new listings
                    if (relevantListings.length === 0) relevantListings = newListings.slice(0, 5);
                }

                // Build email HTML
                const listingsHtml = relevantListings.slice(0, 5).map(listing => `
                    <div style="display: flex; gap: 1rem; padding: 1rem; border-bottom: 1px solid #e5e7eb;">
                        <img src="${listing.image || 'https://placehold.co/100'}" 
                             style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
                        <div>
                            <div style="font-weight: 600; color: #1f2937;">${listing.title}</div>
                            <div style="color: #6b7280; font-size: 0.9rem;">₹${listing.rates?.daily || listing.price || 0}/day</div>
                            <div style="color: #9ca3af; font-size: 0.8rem;">${listing.location || ''}</div>
                        </div>
                    </div>
                `).join('');

                const requestsHtml = communityRequests.slice(0, 3).map(req => `
                    <div style="padding: 0.75rem; background: #f9fafb; border-radius: 8px; margin-bottom: 0.5rem;">
                        <div style="font-weight: 600; color: #1f2937;">${req.title}</div>
                        <div style="color: #6b7280; font-size: 0.85rem;">by ${req.userName || 'Neighbor'}</div>
                    </div>
                `).join('');

                const emailHtml = `
                <!DOCTYPE html>
                <html>
                <head><meta charset="utf-8"></head>
                <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background: #f3f4f6; padding: 40px 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">Your Weekly Digest 📬</h1>
                            <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0;">What's new in your neighborhood</p>
                        </div>
                        
                        <div style="padding: 30px;">
                            <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 1rem;">🆕 New Listings This Week</h2>
                            ${listingsHtml || '<p style="color: #6b7280;">No new listings this week</p>'}
                            
                            <div style="margin-top: 2rem;">
                                <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 1rem;">📢 Community Needs Help With</h2>
                                ${requestsHtml || '<p style="color: #6b7280;">No new requests</p>'}
                            </div>
                            
                            <div style="text-align: center; margin-top: 2rem;">
                                <a href="https://rentanything.shop" 
                                   style="display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                                    Browse All Listings
                                </a>
                            </div>
                        </div>
                        
                        <div style="background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                            <p>You're receiving this because you subscribed to weekly digests.</p>
                            <a href="https://rentanything.shop/profile.html?unsubscribe=digest" style="color: #4F46E5;">Unsubscribe</a>
                        </div>
                    </div>
                </body>
                </html>
                `;

                try {
                    await transporter.sendMail({
                        from: `RentAnything <${functions.config().smtp.email}>`,
                        to: user.email,
                        subject: `📬 Your Weekly Digest - ${newListings.length} new items near you!`,
                        html: emailHtml
                    });
                    successCount++;
                } catch (e) {
                    console.error(`Failed to send digest to ${user.email}:`, e);
                    failureCount++;
                }
            }

            console.log(`Weekly digest sent: ${successCount} success, ${failureCount} failures`);
            return { success: successCount, failed: failureCount };

        } catch (error) {
            console.error('Weekly digest error:', error);
            return null;
        }
    });
