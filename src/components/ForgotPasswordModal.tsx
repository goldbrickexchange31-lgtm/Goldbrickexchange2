import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import {
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  KeyRound,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
  onSuccessLogin?: (email: string) => void;
  initialOobCode?: string | null;
  initialMode?: string | null;
}

export function ForgotPasswordModal({
  isOpen,
  onOpenChange,
  defaultEmail = '',
  onSuccessLogin,
  initialOobCode = null,
  initialMode = null,
}: ForgotPasswordModalProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [view, setView] = useState<'request' | 'sent' | 'reset'>('request');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cooldown countdown for resend
  const [cooldown, setCooldown] = useState(0);

  // State for confirm password reset (when oobCode is present)
  const [oobCode, setOobCode] = useState<string | null>(initialOobCode);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState<string>('');
  const [codeInvalid, setCodeInvalid] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Sync defaultEmail when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (defaultEmail && !email) {
        setEmail(defaultEmail);
      }
    }
  }, [isOpen, defaultEmail]);

  // Handle oobCode if passed via link
  useEffect(() => {
    if (initialMode === 'resetPassword' && initialOobCode) {
      setOobCode(initialOobCode);
      verifyCode(initialOobCode);
    }
  }, [initialMode, initialOobCode]);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const verifyCode = async (code: string) => {
    setVerifyingCode(true);
    setErrorMessage(null);
    setCodeInvalid(false);
    try {
      const userEmail = await verifyPasswordResetCode(auth, code);
      setVerifiedEmail(userEmail);
      setView('reset');
    } catch (err: any) {
      console.error('Password reset code verification failed:', err);
      setCodeInvalid(true);
      setErrorMessage(
        'The password reset link is invalid, expired, or has already been used. Please request a new one.'
      );
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleSendResetEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address (e.g. name@example.com).');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/reset-password`,
        handleCodeInApp: true,
      };

      await sendPasswordResetEmail(auth, cleanEmail, actionCodeSettings);
      setView('sent');
      setCooldown(60);
      toast.success('In-website password reset link sent to your email');
    } catch (err: any) {
      console.error('Password reset error:', err);
      let message = 'Failed to send password reset email. Please try again.';
      if (err.code === 'auth/user-not-found') {
        message = 'No account found with this email address. Please verify your email or create a new account.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'The email address format is invalid.';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Too many requests. Please wait a few moments before trying again.';
      } else if (err.code === 'auth/network-request-failed') {
        message = 'Network connection error. Please check your internet connection.';
      } else if (err.message) {
        message = err.message;
      }
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode) {
      setErrorMessage('Reset code is missing. Please request a new password reset link.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
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
      toast.success('Your password has been reset successfully! You can now log in.');
      if (onSuccessLogin && verifiedEmail) {
        onSuccessLogin(verifiedEmail);
      }
      handleClose();
    } catch (err: any) {
      console.error('Error confirming password reset:', err);
      let message = 'Failed to reset password. The link may have expired.';
      if (err.code === 'auth/expired-action-code') {
        message = 'This reset link has expired. Please request a new password reset link.';
      } else if (err.code === 'auth/invalid-action-code') {
        message = 'This reset link is invalid or has already been used.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Password is too weak. Please use at least 6 characters with mixed letters and numbers.';
      } else if (err.message) {
        message = err.message;
      }
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset view after modal animation finishes
    setTimeout(() => {
      setView('request');
      setErrorMessage(null);
      setNewPassword('');
      setConfirmPassword('');
    }, 200);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-white rounded-[2.5rem] p-0 overflow-hidden shadow-2xl border max-w-md w-full">
        {/* Header */}
        <DialogHeader className="p-8 pb-6 bg-white/5 border-b border-border text-center relative">
          <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 border border-primary/20 shadow-[0_0_20px_rgba(0,102,255,0.15)]">
            {view === 'sent' ? (
              <CheckCircle2 className="text-primary w-7 h-7" />
            ) : view === 'reset' ? (
              <ShieldCheck className="text-primary w-7 h-7" />
            ) : (
              <KeyRound className="text-primary w-7 h-7" />
            )}
          </div>
          <DialogTitle className="text-2xl font-black italic vibrant-text uppercase tracking-tight">
            {view === 'sent'
              ? 'Check Your Email'
              : view === 'reset'
              ? 'Set New Password'
              : 'Reset Password'}
          </DialogTitle>
          <DialogDescription className="text-white/50 text-xs mt-2 leading-relaxed px-4">
            {view === 'sent'
              ? 'We have dispatched secure recovery instructions to your email address.'
              : view === 'reset'
              ? `Create a secure new password for your account (${verifiedEmail || 'GoldBrick'}).`
              : "Enter your registered email address and we'll send you a link to reset your password."}
          </DialogDescription>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-8 pt-6">
          {/* Error Message banner */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-start gap-3 text-destructive text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* VIEW: REQUEST RESET EMAIL */}
          {view === 'request' && (
            <form onSubmit={handleSendResetEmail} className="space-y-6">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  Your Account Email
                </Label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  className="bg-background border-border h-14 rounded-2xl px-6 text-white focus:ring-1 focus:ring-primary/40 font-bold placeholder:text-white/20"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoFocus
                  required
                />
              </div>

              <div className="pt-2 space-y-3">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground font-black h-14 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase text-xs tracking-wider cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending Recovery Link...
                    </span>
                  ) : (
                    'Send Password Reset Link'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  className="w-full h-12 rounded-2xl text-white/40 hover:text-white hover:bg-white/5 font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-2" />
                  Back to Sign In
                </Button>
              </div>
            </form>
          )}

          {/* VIEW: EMAIL SENT CONFIRMATION */}
          {view === 'sent' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-white/5 border border-border/80 text-center space-y-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-white/40">
                  Link sent to
                </div>
                <div className="text-sm font-black text-primary break-all px-2">
                  {email}
                </div>
              </div>

              <div className="text-white/60 text-xs space-y-3 px-2 leading-relaxed">
                <p>
                  Click the link in the email to open our <strong>in-website change password screen</strong>.
                </p>
                <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-white/80 text-[11px] space-y-1">
                  <div className="font-bold text-primary flex items-center gap-1.5 uppercase text-[10px]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Delivery & Anti-Spam Notice
                  </div>
                  <p className="text-white/60">
                    If the message doesn't appear in your Inbox within 1–2 minutes, check your <strong>Spam</strong> or <strong>Junk</strong> folder and tap <strong>"Report Not Spam"</strong>.
                  </p>
                </div>
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
                  onClick={handleClose}
                  className="w-full bg-primary text-primary-foreground font-black h-14 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase text-xs tracking-wider cursor-pointer"
                >
                  Done & Return to Sign In
                </Button>
              </div>
            </div>
          )}

          {/* VIEW: SET NEW PASSWORD (VIA OOB CODE) */}
          {view === 'reset' && (
            <div>
              {verifyingCode ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-white/60 text-xs font-bold uppercase tracking-wider">
                    Verifying reset authorization...
                  </p>
                </div>
              ) : codeInvalid ? (
                <div className="space-y-6 text-center">
                  <p className="text-white/60 text-xs leading-relaxed">
                    This password reset link has expired or has already been used. Please request a new link below.
                  </p>
                  <Button
                    type="button"
                    onClick={() => {
                      setView('request');
                      setCodeInvalid(false);
                      setErrorMessage(null);
                    }}
                    className="w-full bg-primary text-primary-foreground font-black h-14 rounded-2xl uppercase text-xs tracking-wider cursor-pointer"
                  >
                    Request New Reset Link
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleConfirmReset} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="bg-background border-border h-14 rounded-2xl px-6 pr-12 text-white focus:ring-1 focus:ring-primary/40 font-bold"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="bg-background border-border h-14 rounded-2xl px-6 pr-12 text-white focus:ring-1 focus:ring-primary/40 font-bold"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-white/40 font-medium">
                    Must be at least 6 characters with a combination of letters & numbers.
                  </p>

                  <div className="pt-2 space-y-3">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary text-primary-foreground font-black h-14 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase text-xs tracking-wider cursor-pointer"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving New Password...
                        </span>
                      ) : (
                        'Save New Password'
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleClose}
                      className="w-full h-12 rounded-2xl text-white/40 hover:text-white font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
