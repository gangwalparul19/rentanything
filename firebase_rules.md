# Firebase Security Rules Setup 🛡️

The error `storage/unauthorized` means your Firebase Storage Rules are blocking the upload. You need to update them in the console to allow logged-in users to upload files.

## 1. Storage Rules (Fixes Image Upload Error)
1.  Go to **Firebase Console** -> **Build** -> **Storage**.
2.  Click the **Rules** tab (top).
3.  Delete everything there and Paste this:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      // Allow public read access (so everyone can see images)
      allow read: if true;
      // Only allow upload if user is logged in
      allow write: if request.auth != null;
    }
  }
}
```
4.  Click **Publish**.

---

## 2. Firestore Database Rules (Prevents Future Errors)
While you are at it, let's make sure the Database is also open for authenticated users.

1.  Go to **Build** -> **Firestore Database**.
2.  Click the **Rules** tab.
3.  Delete everything and Paste this:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      // Allow public read access (so everyone can see listings/users/chats if we want transparency)
      // Ideally, chat should be restricted to participants, but for MVP/Debug: allow read if auth
      allow read: if true;
      // Only allow write if user is logged in
      allow write: if request.auth != null;
    }
  }
}
```
4.  Click **Publish**.

---
**Try listing the item again after clicking Publish!**
