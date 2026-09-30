import { Logo } from '../components/Logo';
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';
import { Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';
import { GoogleIcon } from '../components/GoogleIcon';
import { loginOrSignUpWithGoogle, formatGoogleAuthError } from '../lib/googleAuth';
import { AuthorizedDomainModal } from '../components/AuthorizedDomainModal';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [showDomainModal, setShowDomainModal] = useState(false);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');
  const forgotParam = searchParams.get('forgot');
  const emailParam = searchParams.get('email');

  useEffect(() => {
    if (emailParam && !email) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  // Check if opened via URL parameters (e.g. ?forgot=true or ?mode=resetPassword)
  useEffect(() => {
    if (mode === 'resetPassword' && oobCode) {
      navigate(`/reset-password?mode=resetPassword&oobCode=${encodeURIComponent(oobCode)}`, { replace: true });
    } else if (forgotParam === 'true') {
      setIsForgotOpen(true);
    }
  }, [mode, oobCode, forgotParam, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      toast.success('Welcome back to GoldBrick');
      navigate('/dashboard');
    } catch (error: any) {
      console.warn('Login attempt failed:', error?.code || error?.message || error);
      let message = error.message || 'Login failed';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        message = 'Invalid email or password. If you forgot your password, click "Forgot Password?" below.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Access temporarily disabled due to many failed attempts. You can reset your password immediately or try again later.';
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const user = await loginOrSignUpWithGoogle();
      toast.success(`Welcome, ${user.displayName || 'Investor'}!`);
      navigate('/dashboard');
    } catch (error: any) {
      if (error?.code === 'auth/unauthorized-domain') {
        console.warn('Google Sign-In: Domain not yet allowlisted in Firebase project');
        setShowDomainModal(true);
      } else {
        console.warn('Google Sign-In notice:', error?.code || error?.message || error);
        const friendlyMsg = formatGoogleAuthError(error);
        toast.error(friendlyMsg);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPasswordOpen = () => {
    setIsForgotOpen(true);
  };

  const handleForgotPasswordClose = (open: boolean) => {
    setIsForgotOpen(open);
    if (!open) {
      // Clear reset params from URL if present
      if (mode || oobCode || forgotParam) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('mode');
        nextParams.delete('oobCode');
        nextParams.delete('apiKey');
        nextParams.delete('forgot');
        setSearchParams(nextParams, { replace: true });
      }
    }
  };

  const handlePasswordResetSuccess = (verifiedEmail: string) => {
    setEmail(verifiedEmail);
    setPassword('');
    // Clear URL query parameters
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('mode');
    nextParams.delete('oobCode');
    nextParams.delete('apiKey');
    nextParams.delete('forgot');
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-card border-border shadow-2xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="text-center pt-10 pb-2">
          <div className="flex justify-center mb-8">
            <Link to="/">
              <Logo className="h-12" />
            </Link>
          </div>
          <CardTitle className="text-4xl font-black italic vibrant-text uppercase tracking-tighter">
            Welcome Back
          </CardTitle>
          <p className="text-white/40 font-bold text-[10px] uppercase tracking-widest mt-3 px-8 leading-relaxed">
            Sign in to your GoldBrick account
          </p>
        </CardHeader>
        <CardContent className="p-10 pt-6">
          {/* One-Click Google Sign In */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full h-14 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-sm flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md cursor-pointer mb-6"
          >
            {googleLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Connecting with Google...
              </span>
            ) : (
              <>
                <GoogleIcon className="w-5 h-5 shrink-0" />
                <span>Continue with Google</span>
              </>
            )}
          </Button>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
              <span className="bg-card px-4 text-white/40">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">
                Email Address
              </Label>
              <Input
                type="email"
                placeholder="email@example.com"
                className="bg-background border-border h-14 rounded-2xl px-6 text-white focus:ring-1 focus:ring-primary/40 font-bold placeholder:text-white/20"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={handleForgotPasswordOpen}
                  className="text-[10px] font-black uppercase text-primary hover:text-primary/80 hover:underline tracking-widest transition-all cursor-pointer flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3 inline-block" />
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="bg-background border-border h-14 rounded-2xl px-6 pr-12 text-white focus:ring-1 focus:ring-primary/40 font-bold placeholder:text-white/20"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground font-black h-16 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase text-sm cursor-pointer"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing In...
                </span>
              ) : (
                'Sign In Now'
              )}
            </Button>
          </form>

          {/* Quick link for forgotten password as secondary recovery access */}
          <div className="mt-6 pt-5 border-t border-border/50 text-center">
            <button
              type="button"
              onClick={handleForgotPasswordOpen}
              className="text-[11px] font-bold text-white/50 hover:text-primary transition-colors cursor-pointer"
            >
              Having trouble signing in? <span className="text-primary underline">Reset your password</span>
            </button>
          </div>

          <div className="mt-6 text-center text-[10px] font-black uppercase tracking-widest">
            <span className="text-white/40">New to GoldBrick? </span>
            <Link to="/register" className="text-primary hover:underline transition-all">
              Create Account
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Forgotten Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotOpen}
        onOpenChange={handleForgotPasswordClose}
        defaultEmail={email}
        onSuccessLogin={handlePasswordResetSuccess}
        initialOobCode={oobCode}
        initialMode={mode}
      />

      {/* Authorized Domain Modal for Firebase Configuration */}
      <AuthorizedDomainModal
        isOpen={showDomainModal}
        onOpenChange={setShowDomainModal}
        actionType="google"
      />
    </div>
  );
}
