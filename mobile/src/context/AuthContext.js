// Authentication Context for managing user state
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [initializing, setInitializing] = useState(true);

    // Listen for auth state changes
    useEffect(() => {
        console.log('Setting up auth listener...');

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            console.log('Auth state changed:', firebaseUser ? 'User logged in' : 'No user');

            try {
                if (firebaseUser) {
                    setUser(firebaseUser);
                    // Fetch user profile from Firestore
                    try {
                        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                        if (userDoc.exists()) {
                            setUserProfile(userDoc.data());
                        } else {
                            console.log('No user profile found in Firestore');
                            setUserProfile(null);
                        }
                    } catch (error) {
                        console.error('Error fetching user profile:', error);
                        setUserProfile(null);
                    }
                } else {
                    setUser(null);
                    setUserProfile(null);
                }
            } catch (error) {
                console.error('Auth state change error:', error);
            } finally {
                console.log('Auth initialization complete');
                setLoading(false);
                setInitializing(false);
            }
        }, (error) => {
            // Error callback for onAuthStateChanged
            console.error('Auth listener error:', error);
            setLoading(false);
            setInitializing(false);
        });

        // Timeout fallback - if auth doesn't respond in 10 seconds, stop loading
        const timeout = setTimeout(() => {
            if (initializing) {
                console.log('Auth timeout - forcing initialization complete');
                setLoading(false);
                setInitializing(false);
            }
        }, 10000);

        return () => {
            unsubscribe();
            clearTimeout(timeout);
        };
    }, []);

    // Sign out function
    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
            setUser(null);
            setUserProfile(null);
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    };

    // Refresh user profile
    const refreshProfile = async () => {
        if (!user) return;
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                setUserProfile(userDoc.data());
            }
        } catch (error) {
            console.error('Error refreshing profile:', error);
        }
    };

    const value = {
        user,
        userProfile,
        loading,
        initializing,
        signOut,
        refreshProfile,
        isAuthenticated: !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
