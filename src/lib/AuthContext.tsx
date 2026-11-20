import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { toast } from 'sonner';

interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  balance: number;
  totalProfit: number;
  totalInvested: number;
  referralEarnings: number;
  referralCode: string;
  referredBy?: string | null;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  accountStatus?: 'active' | 'inactive';
  fcmTokens?: string[];
  lastTokenUpdate?: string;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, userData: null, loading: true });

const REVOKED_OR_DELETED_CODES = new Set([
  'auth/user-not-found',
  'auth/user-disabled',
  'auth/user-token-expired',
  'auth/invalid-user-token',
]);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubDoc: (() => void) | null = null;
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }

      if (!u) {
        setUser(null);
        setUserData(null);
        setLoading(false);
        return;
      }

      // Immediately enter loading state and set current user so ProtectedRoute never prematurely redirects to /login during async profile hydration
      setLoading(true);
      setUser(u);

      // Verify the Firebase Auth session has not been deleted or revoked on the server
      try {
        await u.reload();
        await u.getIdToken(true);
      } catch (sessionErr: any) {
        if (REVOKED_OR_DELETED_CODES.has(sessionErr?.code)) {
          console.warn('[AUTH] Session revoked or account deleted:', sessionErr.code);
          await signOut(auth).catch(() => {});
          if (!cancelled) {
            setUser(null);
            setUserData(null);
            setLoading(false);
          }
          return;
        }
      }

      if (cancelled) return;

      const userDocRef = doc(db, 'users', u.uid);
      let hadProfileInSession = false;

      // Initial check to ensure document exists for newly signed-up valid users
      try {
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          hadProfileInSession = true;
          if (!cancelled) {
            setUserData(snap.data() as UserData);
          }
        } else {
          // Re-verify Auth record still exists before initializing a missing profile
          try {
            await u.reload();
          } catch (recheckErr: any) {
            if (REVOKED_OR_DELETED_CODES.has(recheckErr?.code)) {
              await signOut(auth).catch(() => {});
              if (!cancelled) {
                setUser(null);
                setUserData(null);
                setLoading(false);
              }
              return;
            }
          }

          const adminEmails = ['goldbrickexchange31@gmail.com'];
          const myReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          const newProfile = {
            uid: u.uid,
            email: u.email || '',
            displayName: u.displayName || u.email?.split('@')[0] || 'User',
            balance: 0,
            totalProfit: 0,
            totalInvested: 0,
            referralEarnings: 0,
            referralCode: myReferralCode,
            role: adminEmails.includes((u.email || '').toLowerCase()) ? 'admin' : 'user',
            status: 'active',
            accountStatus: 'active',
            createdAt: serverTimestamp(),
          };
          await setDoc(userDocRef, newProfile);
          hadProfileInSession = true;
        }
      } catch (e) {
        console.error('Error checking/creating user doc:', e);
      }

      if (cancelled) return;

      unsubDoc = onSnapshot(
        userDocRef,
        async (docSnap) => {
          if (docSnap.exists()) {
            hadProfileInSession = true;
            setUserData(docSnap.data() as UserData);
            setLoading(false);
          } else if (hadProfileInSession) {
            // Account profile was deleted by admin while logged in: immediately terminate session
            toast.error('Your account session has ended or your account was removed.');
            await signOut(auth).catch(() => {});
            setUser(null);
            setUserData(null);
            setLoading(false);
          } else {
            setLoading(false);
          }
        },
        (err) => {
          console.warn('[AUTH] User profile snapshot notice:', err?.message || err);
          setLoading(false);
        }
      );
    });

    return () => {
      cancelled = true;
      if (unsubDoc) unsubDoc();
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
