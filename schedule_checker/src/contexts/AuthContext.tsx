"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = getFirebaseAuth();

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ?? null);
      setLoading(false);
    });
    return () => unsub();
  }, [auth]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!auth) throw new Error("Auth not initialized");
      await signInWithEmailAndPassword(auth, email, password);
    },
    [auth]
  );

  const signInWithGoogle = useCallback(async () => {
    if (!auth) throw new Error("Auth not initialized");
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }, [auth]);

  const signOut = useCallback(async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  }, [auth]);

  const value: AuthContextValue = {
    user,
    loading,
    signInWithEmail,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
