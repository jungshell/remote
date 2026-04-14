import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider } from '../services/firebase';
import { 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithPopup
} from 'firebase/auth';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    function login(email, password) {
        if (!auth) return Promise.reject(new Error('Firebase가 초기화되지 않았습니다. .env를 확인해 주세요.'));
        return signInWithEmailAndPassword(auth, email, password);
    }

    function signup(email, password) {
        if (!auth) return Promise.reject(new Error('Firebase가 초기화되지 않았습니다. .env를 확인해 주세요.'));
        return createUserWithEmailAndPassword(auth, email, password);
    }

    function loginWithGoogle() {
        if (!auth) return Promise.reject(new Error('Firebase가 초기화되지 않았습니다. .env를 확인해 주세요.'));
        return signInWithPopup(auth, googleProvider);
    }

    function logout() {
        if (!auth) return Promise.resolve();
        return signOut(auth);
    }

    useEffect(() => {
        if (!auth) {
            setLoading(false);
            return;
        }
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        login,
        signup,
        loginWithGoogle,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
