# 📧 Integrating Firebase Email Extension

You have successfully set up the code to write to the `mail` collection! To actually send emails, you need to install the **"Trigger Email"** extension in your Firebase Console.

## Step-by-Step Installation Guide

1.  **Go to Firebase Console**
    *   Open your project in the [Firebase Console](https://console.firebase.google.com/).
    *   Click on **"Extensions"** in the left sidebar (under Build).
    *   Click **"Explore Hub"**.

2.  **Find "Trigger Email"**
    *   Search for **"Trigger Email"** (by Firebase).
    *   Click **"Install"**.

3.  **Configure the Extension**
    *   **Cloud Functions Location**: Choose the one closest to you (e.g., `us-central1`).
    *   **SMTP Connection URI**: You need an SMTP service (like Gmail, SendGrid, Mailgun).
        *   **For Gmail (Easiest for testing)**: `smtps://yourname@gmail.com:APP_PASSWORD@smtp.gmail.com:465`
        *   *Note*: You must generate an **App Password** from your Google Account settings (Security -> 2-Step Verification -> App Passwords). *Do not use your main password.*
    *   **Email Documents Collection**: Enter `mail` (This matches our code!).
    *   **Default FROM Email**: Enter your email address (e.g., `noreply@rentanything.shop`).

4.  **Install & Wait**
    *   Click **"Install Extension"**.
    *   It takes about 3-5 minutes to deploy.

## Testing
Once installed:
1.  Go to your app.
2.  Request a Booking.
3.  Check the `mail` collection in Firestore. You should see a `delivery` field appear on the document with a `state: "SUCCESS"` (or `ERROR` if SMTP is wrong).
