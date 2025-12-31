import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { apiClient } from '../api/client';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const idToken = await user.getIdToken();
                setToken(idToken);
                setCurrentUser(user);

                // Sync user with backend
                try {
                    await apiClient.login(idToken);
                } catch (error) {
                    console.error("Backend login sync failed", error);
                }
            } else {
                setCurrentUser(null);
                setToken(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const loginWithGoogle = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login failed", error);
        }
    };

    const logout = () => {
        return signOut(auth);
    };

    const value = {
        currentUser,
        token,
        loginWithGoogle,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
