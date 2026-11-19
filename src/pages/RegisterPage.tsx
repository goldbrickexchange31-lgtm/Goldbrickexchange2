import { Logo } from '../components/Logo';
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { GoogleIcon } from '../components/GoogleIcon';
import { loginOrSignUpWithGoogle, formatGoogleAuthError } from '../lib/googleAuth';
import { AuthorizedDomainModal } from '../components/AuthorizedDomainModal';
import { executeRecaptchaV3, loadRecaptchaV3 } from '../lib/recaptcha';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [manualReferralCode, setManualReferralCode] = useState('');
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const ref = params.get('ref');
    if (ref) {
      setManualReferralCode(ref.toUpperCase());
    }
  }, [params]);

  useEffect(() => {
    loadRecaptchaV3().catch((err) => {
      console.warn('[reCAPTCHA] Preload notice:', err?.message || err);
    });
  }, []);

  const handleGoogleSignUp = async () => {
    setCaptchaError(null);
    setGoogleLoading(true);
    try {
      // Verify reCAPTCHA v3 on backend before initiating Google account creation
      const recaptchaToken = await executeRecaptchaV3('register');
      const verifyRes = await fetch('/api/auth/verify-recaptcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: recaptchaToken, action: 'register' }),
      });
      const verifyData = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok || !verifyData?.verified) {
        const msg = verifyData?.error || 'Security verification failed. Please try again.';
        setCaptchaError(msg);
        toast.error(msg);
        return;
      }

      const refCode = manualReferralCode || params.get('ref') || null;
      const user = await loginOrSignUpWithGoogle(refCode);
      toast.success(`Account ready! Welcome, ${user.displayName || 'Investor'}!`);
      navigate('/dashboard');
    } catch (error: any) {
      if (error?.code === 'auth/unauthorized-domain') {
        console.warn('Google Sign-Up: Domain not yet allowlisted in Firebase project');
        setShowDomainModal(true);
      } else if (error?.message && !error?.code) {
        setCaptchaError(error.message);
        toast.error(error.message);
      } else {
        console.warn('Google Sign-Up notice:', error?.code || error?.message || error);
        const friendlyMsg = formatGoogleAuthError(error);
        toast.error(friendlyMsg);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setCaptchaError(null);

    if (!agreed) {
      toast.error('Please agree to the Terms and Conditions');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // 1. Generate reCAPTCHA v3 token
      let recaptchaToken = '';
      try {
        recaptchaToken = await executeRecaptchaV3('register');
      } catch (capErr: any) {
        const msg = capErr?.message || 'Security verification could not run. Please refresh the page and try again.';
        setCaptchaError(msg);
        toast.error(msg);
        return;
      }

      const referredBy = manualReferralCode.trim() ? manualReferralCode.trim().toUpperCase() : (params.get('ref') || null);

      // 2. Verify reCAPTCHA securely on backend BEFORE creating Firebase Auth account
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          displayName: name.trim(),
          referralCode: referredBy,
          recaptchaToken,
          action: 'register',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.verified) {
        const msg = data?.error || 'Security verification failed. Please refresh and try again.';
        if (data?.code && data.code !== 'auth/email-already-exists') {
          setCaptchaError(msg);
        }
        toast.error(msg);
        return;
      }

      // 3. Sign in (if created on server) or create client Auth user (only after backend verification succeeded)
      let user;
      if (data.createdOnServer) {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        user = cred.user;
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        user = userCredential.user;
        await updateProfile(user, { displayName: name.trim() });
      }

      // 4. Ensure Firestore user profile exists
      const userDocRef = doc(db, 'users', user.uid);
      const existingSnap = await getDoc(userDocRef);
      if (!existingSnap.exists()) {
        const myReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email || email.trim(),
          displayName: name.trim(),
          balance: 0,
          totalProfit: 0,
          totalInvested: 0,
          referralEarnings: 0,
          referralCode: myReferralCode,
          referredBy: referredBy,
          role: 'user',
          status: 'active',
          accountStatus: 'active',
          createdAt: serverTimestamp()
        }).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`));
      }

      toast.success('Account created successfully');
      navigate('/dashboard');
    } catch (error: any) {
      let message = error?.message || 'Registration failed';
      if (error?.code === 'auth/email-already-in-use') {
        message = 'An account with this email address already exists. Please sign in instead.';
      } else if (error?.code === 'auth/weak-password') {
        message = 'Password is too weak. Please use at least 6 characters.';
      } else if (error?.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else {
        try {
          const info = JSON.parse(error.message);
          message = `Permission Denied: ${info.error}`;
        } catch {
          // keep message
        }
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 py-12 sm:py-20">
      <Card className="w-full max-w-md bg-card border-border shadow-2xl rounded-3xl sm:rounded-[2.5rem] overflow-hidden">
        <CardHeader className="text-center pt-8 sm:pt-10 pb-2">
          <div className="flex justify-center mb-6 sm:mb-8">
            <Link to="/">
              <Logo className="h-10 sm:h-12" />
            </Link>
          </div>
          <CardTitle className="text-3xl sm:text-4xl font-black italic vibrant-text uppercase tracking-tighter">Start Investing</CardTitle>
          <p className="text-white/40 font-bold text-[10px] uppercase tracking-widest mt-2 sm:mt-3 px-4 sm:px-8 leading-relaxed">Join the elite GoldBrick investment community</p>
        </CardHeader>
        <CardContent className="p-5 sm:p-10 pt-4 sm:pt-6">
          {/* One-Click Google Sign Up */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignUp}
            disabled={googleLoading || loading}
            className="w-full h-14 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-sm flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md cursor-pointer mb-6"
          >
            {googleLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Setting Up with Google...
              </span>
            ) : (
              <>
                <GoogleIcon className="w-5 h-5 shrink-0" />
                <span>Sign up with Google</span>
              </>
            )}
          </Button>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
              <span className="bg-card px-4 text-white/40">Or register with email</span>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Full Name</Label>
              <Input 
                placeholder="John Doe" 
                className="bg-background border-border h-14 rounded-2xl px-6 text-white focus:ring-1 focus:ring-primary/40 font-bold"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Email Address</Label>
              <Input 
                type="email" 
                placeholder="email@example.com" 
                className="bg-background border-border h-14 rounded-2xl px-6 text-white focus:ring-1 focus:ring-primary/40 font-bold"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Password</Label>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  className="bg-background border-border h-14 rounded-2xl px-4 text-white focus:ring-1 focus:ring-primary/40 font-bold"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Confirm</Label>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  className="bg-background border-border h-14 rounded-2xl px-4 text-white focus:ring-1 focus:ring-primary/40 font-bold"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Referral Code (Optional)</Label>
              <Input 
                placeholder="GOLDBRICK-XYZ" 
                className="bg-background border-border h-14 rounded-2xl px-6 text-white focus:ring-1 focus:ring-primary/40 font-bold font-mono"
                value={manualReferralCode}
                onChange={(e) => setManualReferralCode(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-3 py-2">
              <input 
                type="checkbox" 
                id="terms" 
                className="size-5 rounded-lg border-border bg-background text-primary transition-all focus:ring-0 checked:bg-primary"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <Label htmlFor="terms" className="text-[10px] font-black text-white/40 cursor-pointer uppercase tracking-widest">
                I agree to the <Link to="/terms" className="text-primary hover:underline transition-all">Terms and Conditions</Link>
              </Label>
            </div>
            {captchaError && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{captchaError}</span>
              </div>
            )}
            <Button 
              type="submit" 
              className="w-full bg-primary text-primary-foreground font-black h-16 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all uppercase text-sm"
              disabled={loading || googleLoading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying & Creating Account...
                </span>
              ) : 'Sign Up Now'}
            </Button>

            <div className="flex items-center justify-center gap-2 text-[10px] text-white/40 text-center leading-relaxed pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                Protected by Google reCAPTCHA v3 ·{' '}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="text-white/60 hover:text-primary underline">Privacy</a>
                {' & '}
                <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" className="text-white/60 hover:text-primary underline">Terms</a>
              </span>
            </div>
          </form>
          <div className="mt-8 text-center text-[10px] font-black uppercase tracking-widest">
            <span className="text-white/40">Already a member? </span>
            <Link to="/login" className="text-primary hover:underline transition-all">Sign In</Link>
          </div>
        </CardContent>
      </Card>

      {/* Authorized Domain Modal */}
      <AuthorizedDomainModal
        isOpen={showDomainModal}
        onOpenChange={setShowDomainModal}
        actionType="google"
      />
    </div>
  );
}
