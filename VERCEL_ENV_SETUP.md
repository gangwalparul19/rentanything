# Vercel Environment Variables Setup

## Overview
This application uses environment variables to securely store sensitive configuration like Firebase credentials. When deploying to Vercel, you must configure these variables in the Vercel dashboard.

## Required Environment Variables

Configure the following environment variables in your Vercel project:

| Variable Name | Description | Example Value |
|--------------|-------------|---------------|
| `VITE_FIREBASE_API_KEY` | Firebase API Key | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | `your-project-id` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket | `your-project.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID | `123456789` |
| `VITE_FIREBASE_APP_ID` | Firebase App ID | `1:123:web:abc123` |
| `VITE_FIREBASE_MEASUREMENT_ID` | Firebase Measurement ID | `G-XXXXXXXXXX` |
| `VITE_FCM_VAPID_KEY` | Firebase Cloud Messaging VAPID Key | `BPx4Gw...` |
| `VITE_ADMIN_EMAILS` | Admin email addresses (comma-separated) | `admin1@example.com,admin2@example.com` |

## Step-by-Step Configuration

### 1. Access Vercel Dashboard
1. Log in to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**

### 2. Add Environment Variables
For each variable in the table above:

1. Click **Add New**
2. Enter the **Key** (e.g., `VITE_FIREBASE_API_KEY`)
3. Enter the **Value** (your actual Firebase credential)
4. Select environments:
   - ✅ **Production**
   - ✅ **Preview** (recommended)
   - ✅ **Development** (optional)
5. Click **Save**

### 3. Find Your Firebase Credentials

#### Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the **gear icon** → **Project settings**
4. Scroll down to **Your apps**
5. Find your web app config - all values are there

#### FCM VAPID Key
1. In Firebase Console → **Project settings**
2. Go to **Cloud Messaging** tab
3. Under **Web Push certificates**, find your **Key pair**
4. Copy the full VAPID key value

### 4. Redeploy
After adding all environment variables:
1. Go to **Deployments** tab
2. Click **⋯** (three dots) on the latest deployment
3. Select **Redeploy**
4. ✅ Check **Use existing Build Cache**
5. Click **Redeploy**

## Local Development

For local development, the app will use fallback values defined in `js/env.js`.

### Option 1: Use .env file (Recommended)
1. Copy `.env.example` to `.env` in the project root:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and add your actual Firebase credentials
3. The `.env` file is gitignored and won't be committed

### Option 2: Edit env.js directly
1. Edit `js/env.js` 
2. Replace fallback values with your credentials
3. **WARNING**: Never commit real credentials to git!

## Verification

After deployment, verify the configuration:

1. Open your deployed Vercel URL
2. Open browser DevTools (F12)
3. Go to **Console** tab
4. Check for Firebase errors:
   - ❌ If you see auth errors, check Firebase credentials
   - ❌ If you see "admin not authorized", check `VITE_ADMIN_EMAILS`
   - ✅ No errors = configuration successful!

## Troubleshooting

### Admin Login Not Working
- Check `VITE_ADMIN_EMAILS` is set correctly
- Ensure email addresses are comma-separated with no spaces
- Emails are automatically converted to lowercase

### Firebase Connection Failed
- Verify all Firebase environment variables are set
- Check that variable names are **exactly** as shown (including `VITE_` prefix)
- Ensure there are no trailing spaces in values
- Redeploy after adding/modifying variables

### Changes Not Reflecting
- Vercel caches environment variables
- Always **redeploy** after changing environment variables
- Clear browser cache if issues persist

## Security Notes

⚠️ **IMPORTANT**:
- Never commit `.env` files to git
- Never commit real credentials in `js/env.js`
- Only commit `.env.example` as a template
- Use Vercel's encrypted environment variables for production
- Rotate keys if accidentally exposed

## Additional Resources

- [Vercel Environment Variables Documentation](https://vercel.com/docs/projects/environment-variables)
- [Vite Environment Variables Guide](https://vitejs.dev/guide/env-and-mode.html)
- [Firebase Console](https://console.firebase.google.com/)
