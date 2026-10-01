import { GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export async function loginOrSignUpWithGoogle(referralCode?: string | null): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account'
  });

  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  // Check if profile exists, otherwise create it
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const adminEmails = ['goldbrickexchange31@gmail.com'];
      const myReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Investor',
        profilePic: user.photoURL || '',
        balance: 0,
        totalProfit: 0,
        totalInvested: 0,
        referralEarnings: 0,
        referralCode: myReferralCode,
        referredBy: referralCode || null,
        role: adminEmails.includes(user.email || '') ? 'admin' : 'user',
        status: 'active',
        accountStatus: adminEmails.includes(user.email || '') ? 'active' : 'inactive',
        createdAt: serverTimestamp()
      });
    }
  } catch (err) {
    console.error('Error synchronizing user profile after Google sign-in:', err);
    // Continue even if firestore write fails, as AuthContext has self-healing creation
  }

  return user;
}

export function formatGoogleAuthError(error: any): string {
  if (!error) return 'Google sign-in failed.';
  
  if (error.code === 'auth/popup-closed-by-user') {
    return 'Sign-in cancelled. Please complete the Google authorization popup.';
  }
  if (error.code === 'auth/popup-blocked') {
    return 'The sign-in popup was blocked by your browser. Please allow popups for this site and try again.';
  }
  if (error.code === 'auth/unauthorized-domain') {
    return 'This domain is not yet authorized in Firebase Authentication. Please add it in Firebase Console > Authentication > Settings > Authorized Domains.';
  }
  if (error.code === 'auth/account-exists-with-different-credential') {
    return 'An account already exists with this email using a different sign-in method.';
  }
  if (error.code === 'auth/network-request-failed') {
    return 'Network connection error. Please check your internet connection.';
  }
  
  return error.message || 'Failed to authenticate with Google.';
}
