import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { RoleType } from '../data/officialTargets.ts';

export interface AppUser {
  id?: number;
  uid: string;
  email: string;
  nama: string;
  role: RoleType;
  unitKerja?: string;
}

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  appUser: AppUser | null;
  activeRole: RoleType;
  loadingAuth: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  setRoleMode: (role: RoleType) => Promise<void>;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [activeRole, setActiveRole] = useState<RoleType>('OPERATOR');
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const token = await fbUser.getIdToken();
          setIdToken(token);
          const res = await fetch('/api/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            setAppUser(data.user);
            setActiveRole((data.user.role as RoleType) || 'OPERATOR');
          } else {
            setAppUser({
              uid: fbUser.uid,
              email: fbUser.email || 'operator@lan.go.id',
              nama: fbUser.displayName || 'Operator Inspektorat',
              role: 'OPERATOR',
            });
          }
        } catch (err) {
          console.error('Failed syncing user profile:', err);
        }
      } else {
        setIdToken(null);
        setAppUser(null);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const token = await cred.user.getIdToken();
      setIdToken(token);
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      setAuthError(
        err?.message || 'Gagal masuk dengan Google. Pastikan jendela pop-up diizinkan.'
      );
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setIdToken(null);
      setAppUser(null);
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  const setRoleMode = async (newRole: RoleType) => {
    setActiveRole(newRole);
    if (firebaseUser) {
      try {
        const token = await firebaseUser.getIdToken();
        const res = await fetch('/api/me/role', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role: newRole }),
        });
        if (res.ok) {
          const data = await res.json();
          setAppUser(data.user);
        }
      } catch (err) {
        console.error('Error updating role on server:', err);
      }
    }
  };

  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json');
    }

    let token = idToken;
    if (firebaseUser) {
      try {
        token = await firebaseUser.getIdToken();
        setIdToken(token);
      } catch (e) {
        console.error('Token refresh error:', e);
      }
    }

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        appUser,
        activeRole,
        loadingAuth,
        authError,
        signInWithGoogle,
        signOut,
        setRoleMode,
        apiFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }
  return ctx;
}
