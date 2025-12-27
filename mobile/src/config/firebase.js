// Firebase Configuration for React Native
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAn4tsCwVcjziA81sSNz5_GG7GW2a5-0B0",
    authDomain: "rent-anything-shop.firebaseapp.com",
    projectId: "rent-anything-shop",
    storageBucket: "rent-anything-shop.firebasestorage.app",
    messagingSenderId: "453157285688",
    appId: "1:453157285688:web:27a1a725acb45a6dd99bcd",
    measurementId: "G-VNG1BQ39DG"
};

// Initialize Firebase (check if already initialized)
let app;
if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}

// Initialize Services using simpler getAuth (works better with Expo)
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
