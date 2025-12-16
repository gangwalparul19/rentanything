# Firebase Database Setup Guide 🗄️

Great question! Firebase **Cloud Firestore** is a NoSQL database, which works differently from traditional SQL databases (like MySQL).

## Key Concept: Automatic Creation 🪄
**You do NOT need to create "tables" manually.**
In Firestore:
*   **Tables** are called **Collections**.
*   **Rows** are called **Documents**.

The code I wrote automatically creates these collections the first time we save data.
*   When you click "Publish Listing", it looks for a collection named `listings`.
*   If it doesn't exist, **Firebase creates it automatically!**

---

## 🚨 CRITICAL SETUP STEP: Enable Database & Storage
Before the code can work, you must "Switch On" the database in the console.

### 1. Enable Firestore Database
1.  Go to [Firebase Console](https://console.firebase.google.com/).
2.  In the left sidebar, click **Build** -> **Firestore Database**.
3.  Click **Create Database**.
4.  Select **NAM5 (us-central)** (or closest region).
5.  **Important**: Choose **Start in Test Mode** (allows read/write for 30 days while developing).
6.  Click **Enable**.

### 2. Enable Storage (For Images)
1.  In the left sidebar, click **Build** -> **Storage**.
2.  Click **Get Started**.
3.  **Important**: Choose **Start in Test Mode**.
4.  Click **Done**.

---

## Our Data Structure

### 1. Listings Collection (`listings`)
*Automatically created when you list an item.*
*   Stores: Title, Price, Description, Image URL, Owner Info.

### 2. Users Collection (`users`)
*Currently managed by Firebase Auth.*
*   We can create a manual `users` collection later if you want to store extra data like "Phone Number" or "Address".

### 3. Categories
*Currently hardcoded in the HTML.*
*   Right now, categories are just text in `create-listing.html`.
*   We don't need a database table for this unless you want to let Admins add new categories dynamically without changing code.

## How to Verify
Once you Enable Firestore and try listing an item:
1.  Go back to **Firestore Database** tab.
2.  You will see a `listings` collection appear!
3.  Click it to see the data (documents) inside.
