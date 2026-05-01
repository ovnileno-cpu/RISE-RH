'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  role: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, role: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch user document
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setRole(userDoc.data().role);
          } else {
            const reqDoc = await getDoc(doc(db, 'signupRequests', firebaseUser.uid));
            if (reqDoc.exists()) {
              localStorage.setItem('signup_notice', reqDoc.data().status === 'rejected'
                ? 'Votre demande a été refusée. Contactez les RH.'
                : 'Votre demande est en attente de validation RH.');
            }
            await signOut(auth);
            setUser(null);
            setRole(null);
          }
        } catch (error) {
          import('./firebase').then(({ handleFirestoreError, OperationType }) => {
            handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          });
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
