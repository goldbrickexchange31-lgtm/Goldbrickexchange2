import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { auth } from '../lib/firebase';
import {
  verifyPasswordResetCode,
  confirmPasswordReset,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
  Mail,
  RefreshCw,
  Lock,
  Check,
} from 'lucide-react';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL parameters
  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');

  // Step views: 'verifying' | 'form' | 'invalid' | 'success' | 'request'
  const [view, setView] = useState<'verifying' | 'form' | 'invalid' | 'success' | 'request'>(
    oobCode ? 'verifying' : 'request'
  );

  // States for password reset with code
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // States for requesting reset email
  const [requestEmail, setRequestEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown countdown timer
  useEffect(() => {
    try {
      const saved = localStorage.getItem('goldbrick_pwd_reset_cooldown_ts');
      if (saved) {
        const elapsed = Math.floor((Date.now() - parseInt(saved, 10)) / 1000);
        if (elapsed < 60) {
          setCooldown(60 - elapsed);
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Verify the oobCode when present
  useEffect(() => {
    if (oobCode) {
      handleVerifyCode(oobCode);
    } else {
      setView('request');
    }
  }, [oobCode]);

  const handleVerifyCode = async (code: string) => {
    setView('verifying');
    setErrorMessage(null);
    try {
      const email = await verifyPasswordResetCode(auth, code);
      setVerifiedEmail(email);
      setView('form');
    } catch (err: any) {
      console.warn('[RESET] Code verification failed:', err?.code || err?.message || err);
      let message = 'This password reset link is invalid, expired, or has already been used.';
      if (err.code === 'auth/expired-action-code') {
        message = 'This password reset link has expired. For your security, links are valid for 1 hour.';
      } else if (err.code === 'auth/invalid-action-code') {
        message = 'This link has already been used or is malformed.';
      }
      setErrorMessage(message);
      setView('invalid');
    }
  };

  // Password strength calculations
  const hasMinLength = newPassword.length >= 8;
  const hasMixedChars = /[a-zA-Z]/.test(newPassword) && /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const getStrengthPercent = () => {
    let score = 0;
    if (newPassword.length >= 6) score += 25;
    if (newPassword.length >= 8) score += 25;
    if (/[a-zA-Z]/.test(newPassword) && /[0-9]/.test(newPassword)) score += 25;
    if (/[^a-zA-Z0-9]/.test(newPassword)) score += 25;
    return score;
  };

  const strengthPercent = getStrengthPercent();
  const strengthColor =
    strengthPercent <= 25
      ? 'bg-red-500'
      : strengthPercent <= 50
      ? 'bg-amber-500'
      : strengthPercent <= 75
      ? 'bg-blue-500'
      : 'bg-emerald-500';

  const strengthLabel =
    strengthPercent <= 25
      ? 'Weak'
      : strengthPercent <= 50
      ? 'Fair'
      : strengthPercent <= 75
      ? 'Good'
      : 'Very Strong';

  // Handle password submission
  const handleSubmitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode) {
      setErrorMessage('Reset code is missing. Please request a new link.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setView('success');
      toast.success('Password updated successfully!');
      // Auto-redirect to login after 3.5s
      setTimeout(() => {
        navigate(`/login?email=${encodeURIComponent(verifiedEmail)}`);
      }, 3500);
    } catch (err: any) {
      console.warn('[RESET] Confirm password reset notice:', err?.code || err?.message || err);
      let message = 'Failed to reset password. The link may have expired.';
      if (err.code === 'auth/expired-action-code') {
        message = 'This reset link has expired. Please request a new one.';
      } else if (err.code === 'auth/weak-password') {
        message = 'The password entered is too weak. Please use letters and numbers.';
      }
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Handle sending reset email directly with actionCodeSettings pointing back to this website
  const handleSendResetEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = requestEmail.trim();

    if (!cleanEmail) {
      setErrorMessage('Please enter your account email.');
      return;
    }

    if (cooldown > 0) {
      const waitMsg = `Please wait ${cooldown}s before requesting another reset email.`;
      setErrorMessage(waitMsg);
      toast.warning(waitMsg);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // Guarantee the link directs directly back to this in-website /reset-password page
      const actionCodeSettings = {
        url: `${window.location.origin}/reset-password`,
        handleCodeInApp: true,
      };

      try {
        await sendPasswordResetEmail(auth, cleanEmail, actionCodeSettings);
      } catch (sendErr: any) {
        if (sendErr.code === 'auth/unauthorized-continue-uri') {
          console.warn('[RESET] Custom continue URI not yet authorized in Firebase Console. Falling back to standard reset email.');
          await sendPasswordResetEmail(auth, cleanEmail);
        } else {
          throw sendErr;
        }
      }

      setEmailSent(true);
      setCooldown(60);
      try {
        localStorage.setItem('goldbrick_pwd_reset_cooldown_ts', Date.now().toString());
      } catch (_) {}
      toast.success('Password reset instructions sent!');
    } catch (err: any) {
      if (err?.code === 'auth/too-many-requests') {
        console.warn('[RESET] Rate limit reached on Firebase Auth (auth/too-many-requests).');
        setCooldown(60);
        try {
          localStorage.setItem('goldbrick_pwd_reset_cooldown_ts', Date.now().toString());
        } catch (_) {}
        const limitMsg = 'Too many requests. Firebase has temporarily paused reset emails from this device for your security. Please wait a minute and check your inbox or spam folder.';
        setErrorMessage(limitMsg);
        toast.warning('Please wait a minute before requesting another password reset.');
        return;
      }

      console.warn('[RESET] Request notice:', err?.code || err?.message || err);
      let message = 'Failed to send reset email. Please try again.';
      if (err.code === 'auth/user-not-found') {
        message = 'No account found with this email. Please check your spelling or register.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Please provide a valid email format (e.g. name@example.com).';
      }
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-8 font-sans">
      <div className="w-full max-w-md">
        {/* Top Header Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="hover:opacity-90 transition-opacity mb-3">
            <Logo className="h-10" />
          </Link>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-border text-[10px] font-black uppercase tracking-widest text-white/50">
            <ShieldCheck className="w-3 h-3 text-primary" />
            GoldBrick Security Protocol
          </div>
        </div>

        <Card className="bg-card border-border shadow-2xl rounded-[2.5rem] overflow-hidden border">
          {/* Header */}
          <CardHeader className="text-center pt-8 pb-4 bg-white/5 border-b border-border">
            <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-3 border border-primary/20 shadow-[0_0_20px_rgba(0,102,255,0.15)]">
              {view === 'success' ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              ) : view === 'invalid' ? (
                <AlertCircle className="w-7 h-7 text-destructive" />
              ) : (
                <KeyRound className="w-7 h-7 text-primary" />
              )}
            </div>

            <CardTitle className="text-2xl font-black italic vibrant-text uppercase tracking-tight">
              {view === 'verifying'
                ? 'Verifying Link...'
                : view === 'form'
                ? 'Set New Password'
                : view === 'success'
                ? 'Password Updated!'
                : view === 'invalid'
                ? 'Link Invalid or Expired'
                : emailSent
                ? 'Check Your Email'
                : 'Reset Password'}
            </CardTitle>

            <CardDescription className="text-white/50 text-xs mt-1 px-4 leading-relaxed">
              {view === 'verifying'
                ? 'Authenticating your security reset token with the GoldBrick network...'
                : view === 'form'
                ? `Choose a secure new password for ${verifiedEmail}`
                : view === 'success'
                ? 'Your credentials have been updated securely. Redirecting to login...'
                : view === 'invalid'
                ? 'Security links are single-use and expire after 1 hour.'
                : emailSent
                ? `We dispatched recovery instructions to ${requestEmail}`
                : 'Enter your registered email to receive an in-website password reset link.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            {/* Global Error Banner */}
            {errorMessage && (
              <div className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-start gap-3 text-destructive text-xs leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{errorMessage}</div>
              </div>
            )}

            {/* STATE 1: VERIFYING TOKEN */}
            {view === 'verifying' && (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-white/60 text-xs font-bold uppercase tracking-wider">
                  Verifying reset authorization...
                </p>
              </div>
            )}

            {/* STATE 2: NEW PASSWORD FORM (WHEN OOBCODE IS VALID) */}
            {view === 'form' && (
              <form onSubmit={handleSubmitNewPassword} className="space-y-6">
                {/* Verified Account Badge */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <Mail className="w-3.5 h-3.5 text-primary" />
                    <span className="text-white/40 text-[10px] uppercase font-black">Account:</span>
                    <span className="text-white font-bold truncate max-w-[200px]">{verifiedEmail}</span>
                  </div>
                  <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" /> Verified
                  </span>
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-primary" />
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      className="bg-background border-border h-14 rounded-2xl px-6 pr-12 text-white focus:ring-1 focus:ring-primary/40 font-bold"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      required
                      minLength={8}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                      aria-label="Toggle password visibility"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {newPassword.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-white/40 uppercase">Strength:</span>
                        <span className="text-white font-black">{strengthLabel}</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${strengthColor}`}
                          style={{ width: `${strengthPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm New Password */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-primary" />
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      className="bg-background border-border h-14 rounded-2xl px-6 pr-12 text-white focus:ring-1 focus:ring-primary/40 font-bold"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Requirements Checklist */}
                <div className="p-4 rounded-2xl bg-white/5 border border-border/80 space-y-2 text-[11px]">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                        hasMinLength ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/30'
                      }`}
                    >
                      {hasMinLength ? '✓' : '•'}
                    </div>
                    <span className={hasMinLength ? 'text-white font-medium' : 'text-white/40'}>
                      At least 8 characters
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                        hasMixedChars ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/30'
                      }`}
                    >
                      {hasMixedChars ? '✓' : '•'}
                    </div>
                    <span className={hasMixedChars ? 'text-white font-medium' : 'text-white/40'}>
                      Contains both letters and numbers
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                        passwordsMatch ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/30'
                      }`}
                    >
                      {passwordsMatch ? '✓' : '•'}
                    </div>
                    <span className={passwordsMatch ? 'text-white font-medium' : 'text-white/40'}>
                      Both passwords match
                    </span>
                  </div>
                </div>

                <div className="pt-2 space-y-3">
                  <Button
                    type="submit"
                    disabled={loading || !hasMinLength || !passwordsMatch}
                    className="w-full bg-primary text-primary-foreground font-black h-16 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase text-xs tracking-wider cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Updating Password...
                      </span>
                    ) : (
                      'Save Password & Complete'
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => navigate('/login')}
                    className="w-full h-12 rounded-2xl text-white/40 hover:text-white hover:bg-white/5 font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-2" />
                    Back to Sign In
                  </Button>
                </div>
              </form>
            )}

            {/* STATE 3: SUCCESS CONFIRMATION */}
            {view === 'success' && (
              <div className="space-y-6 text-center py-4">
                <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <h3 className="text-base font-black text-emerald-400 uppercase tracking-wide">
                    Password Successfully Changed
                  </h3>
                  <p className="text-white/70 text-xs leading-relaxed">
                    You can now sign in with your new password on any device.
                  </p>
                </div>

                <div className="pt-4 space-y-3">
                  <Button
                    type="button"
                    onClick={() => navigate(`/login?email=${encodeURIComponent(verifiedEmail)}`)}
                    className="w-full bg-primary text-primary-foreground font-black h-16 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase text-xs tracking-wider cursor-pointer"
                  >
                    Proceed to Sign In Now
                  </Button>
                </div>
              </div>
            )}

            {/* STATE 4: INVALID OR EXPIRED TOKEN */}
            {view === 'invalid' && (
              <div className="space-y-6 text-center">
                <div className="p-6 rounded-2xl bg-white/5 border border-border space-y-2 text-left">
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">Why did this happen?</h4>
                  <ul className="list-disc list-inside text-xs text-white/60 space-y-1.5 leading-relaxed">
                    <li>This reset link has expired (links expire after 1 hour)</li>
                    <li>The link was already used to set a new password</li>
                    <li>A newer password reset email was requested</li>
                  </ul>
                </div>

                <div className="pt-2 space-y-3">
                  <Button
                    type="button"
                    onClick={() => {
                      setView('request');
                      setErrorMessage(null);
                    }}
                    className="w-full bg-primary text-primary-foreground font-black h-14 rounded-2xl uppercase text-xs tracking-wider cursor-pointer shadow-lg shadow-primary/20"
                  >
                    Request a Fresh Reset Link
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => navigate('/login')}
                    className="w-full h-12 rounded-2xl text-white/40 hover:text-white font-black uppercase text-[10px] tracking-widest cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-2" />
                    Back to Sign In
                  </Button>
                </div>
              </div>
            )}

            {/* STATE 5: REQUEST RESET LINK (NO OOBCODE OR INVALID) */}
            {view === 'request' && (
              <>
                {!emailSent ? (
                  <form onSubmit={handleSendResetEmail} className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-primary" />
                        Account Email Address
                      </Label>
                      <Input
                        type="email"
                        placeholder="name@example.com"
                        className="bg-background border-border h-14 rounded-2xl px-6 text-white focus:ring-1 focus:ring-primary/40 font-bold placeholder:text-white/20"
                        value={requestEmail}
                        onChange={(e) => {
                          setRequestEmail(e.target.value);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        required
                        autoFocus
                      />
                    </div>

                    <div className="pt-2 space-y-3">
                      <Button
                        type="submit"
                        disabled={loading || cooldown > 0}
                        className="w-full bg-primary text-primary-foreground font-black h-16 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase text-xs tracking-wider cursor-pointer disabled:opacity-50"
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Dispatching Security Link...
                          </span>
                        ) : cooldown > 0 ? (
                          <span className="flex items-center gap-2">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Please wait {cooldown}s...
                          </span>
                        ) : (
                          'Send Password Reset Link'
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => navigate('/login')}
                        className="w-full h-12 rounded-2xl text-white/40 hover:text-white hover:bg-white/5 font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 mr-2" />
                        Back to Sign In
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="p-5 rounded-2xl bg-white/5 border border-border/80 text-center space-y-2">
                      <div className="text-[10px] font-black uppercase tracking-widest text-white/40">
                        Recovery link dispatched to
                      </div>
                      <div className="text-sm font-black text-primary break-all px-2">
                        {requestEmail}
                      </div>
                    </div>

                    {/* Anti-Spam Guidance Card */}
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2 text-xs leading-relaxed text-white/80">
                      <div className="font-black text-primary uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" />
                        Delivery & Anti-Spam Note
                      </div>
                      <p className="text-white/60 text-[11px]">
                        The link inside the email will open this exact in-website change password screen.
                      </p>
                      <p className="text-white/60 text-[11px]">
                        If you do not see the email in your Inbox within 60 seconds, check your <strong>Spam</strong> or <strong>Junk</strong> folder and click <strong>"Report Not Spam"</strong>.
                      </p>
                    </div>

                    <div className="pt-2 space-y-3">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={cooldown > 0 || loading}
                        onClick={() => handleSendResetEmail()}
                        className="w-full h-14 rounded-2xl border-border bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Resending...
                          </span>
                        ) : cooldown > 0 ? (
                          <span className="flex items-center gap-2">
                            <RefreshCw className="w-3.5 h-3.5" />
                            Resend Email ({cooldown}s)
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <RefreshCw className="w-3.5 h-3.5" />
                            Resend Reset Email
                          </span>
                        )}
                      </Button>

                      <Button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="w-full bg-primary text-primary-foreground font-black h-14 rounded-2xl uppercase text-xs tracking-wider cursor-pointer"
                      >
                        Return to Sign In
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer info */}
        <p className="text-center text-[10px] text-white/30 uppercase tracking-widest mt-8 font-bold">
          © {new Date().getFullYear()} GoldBrick Exchange. SSL Secured & Encrypted.
        </p>
      </div>
    </div>
  );
}
