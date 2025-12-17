/**
 * Email Notification Helper
 * Sends emails via Firestore collection (processed by Firebase Extension)
 */

import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Send property approval email
 */
export async function sendPropertyApprovalEmail(property, ownerEmail, ownerName) {
    try {
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const { app } = await import('./firebase-config.js');
        const functions = getFunctions(app);
        const sendEmail = httpsCallable(functions, 'sendGenericEmail');

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f3f4f6; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px 20px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
        .content { padding: 40px 30px; }
        .content p { color: #374151; line-height: 1.6; margin-bottom: 15px; }
        .property-info { background-color: #f9fafb; border-left: 4px solid #2563eb; padding: 20px; margin: 25px 0; }
        .button { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .button:hover { background: #1d4ed8; }
        .footer { background-color: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Property Approved!</h1>
        </div>
        <div class="content">
            <p>Hi ${ownerName},</p>
            <p>Great news! Your property listing has been approved by our admin team and is now live on RentAnything.</p>
            
            <div class="property-info">
                <strong>Property:</strong> ${property.title}<br>
                <strong>Location:</strong> ${property.address?.area}, ${property.address?.city}<br>
                <strong>Monthly Rent:</strong> ₹${property.monthlyRent?.toLocaleString()}/month
            </div>
            
            <p>Your listing is now visible to potential renters in Hinjewadi Phase 3. You'll receive notifications when users express interest in your property.</p>
            
            <p style="text-align: center;">
                <a href="https://rentanything.shop/property-details.html?id=${property.id}" class="button">View Your Listing</a>
            </p>
            
            <p>Tips for success:</p>
            <ul>
                <li>Respond promptly to inquiries</li>
                <li>Keep your availability calendar updated</li>
                <li>Add high-quality photos if you haven't already</li>
            </ul>
            
            <p>Best regards,<br><strong>RentAnything Team</strong></p>
        </div>
        <div class="footer">
            <p>RentAnything - Hyper-local Rentals for Megapolis Community</p>
            <p>Hinjewadi Phase 3, Pune</p>
        </div>
    </div>
</body>
</html>
        `;

        await sendEmail({
            to: ownerEmail,
            subject: '🎉 Property Approved - RentAnything',
            html: htmlContent
        });

        console.log('Approval email sent successfully');
        return true;
    } catch (error) {
        console.error('Error sending approval email:', error);
        return false;
    }
}

/**
 * Send property rejection email
 */
export async function sendPropertyRejectionEmail(property, ownerEmail, ownerName, rejectionReason) {
    try {
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const { app } = await import('./firebase-config.js');
        const functions = getFunctions(app);
        const sendEmail = httpsCallable(functions, 'sendGenericEmail');

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f3f4f6; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
        .content { padding: 40px 30px; }
        .content p { color: #374151; line-height: 1.6; margin-bottom: 15px; }
        .rejection-box { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 25px 0; }
        .button { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .button:hover { background: #1d4ed8; }
        .footer { background-color: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Property Listing Update</h1>
        </div>
        <div class="content">
            <p>Hi ${ownerName},</p>
            <p>Thank you for submitting your property listing to RentAnything. After review, we're unable to approve your listing at this time.</p>
            
            <div class="rejection-box">
                <strong>Property:</strong> ${property.title}<br><br>
                <strong>Reason for rejection:</strong><br>
                ${rejectionReason}
            </div>
            
            <p>Don't worry! You can address the issues mentioned above and resubmit your property listing. Our team is here to help you get your property listed successfully.</p>
            
            <p style="text-align: center;">
                <a href="https://rentanything.shop/list-property.html" class="button">Submit New Listing</a>
            </p>
            
            <p>If you have any questions or need clarification, please don't hesitate to contact our support team.</p>
            
            <p>Best regards,<br><strong>RentAnything Team</strong></p>
        </div>
        <div class="footer">
            <p>RentAnything - Hyper-local Rentals for Megapolis Community</p>
            <p>Hinjewadi Phase 3, Pune</p>
        </div>
    </div>
</body>
</html>
        `;

        await sendEmail({
            to: ownerEmail,
            subject: 'Property Listing Update - RentAnything',
            html: htmlContent
        });

        console.log('Rejection email sent successfully');
        return true;
    } catch (error) {
        console.error('Error sending rejection email:', error);
        return false;
    }
}
