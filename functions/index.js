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
