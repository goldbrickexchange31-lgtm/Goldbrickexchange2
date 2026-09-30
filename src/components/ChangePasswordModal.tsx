import React, { useState } from 'react';
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
import { auth } from '../lib/firebase';
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import {
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordModal({ isOpen, onOpenChange }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage(null);
    setLoading(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetForm, 200);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !user.email) {
      setErrorMessage('You must be signed in to change your password.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // 2. Update password
      await updatePassword(user, newPassword);

      toast.success('Your password has been changed successfully!');
      handleClose();
    } catch (err: any) {
      console.error('[CHANGE-PASSWORD] Error:', err);
      let message = 'Failed to change password. Please check your current password.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = 'The current password you entered is incorrect.';
      } else if (err.code === 'auth/weak-password') {
        message = 'The new password is too weak. Please include letters and numbers.';
      } else if (err.code === 'auth/requires-recent-login') {
        message = 'Please log out and log back in before changing your password for security.';
      }
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-white rounded-[2.5rem] p-0 overflow-hidden shadow-2xl border max-w-md w-full">
        {/* Header */}
        <DialogHeader className="p-8 pb-6 bg-white/5 border-b border-border text-center">
          <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-3 border border-primary/20 shadow-[0_0_20px_rgba(0,102,255,0.15)]">
            <KeyRound className="text-primary w-7 h-7" />
          </div>
          <DialogTitle className="text-2xl font-black italic vibrant-text uppercase tracking-tight">
            Change Password
          </DialogTitle>
          <DialogDescription className="text-white/50 text-xs mt-1 px-4 leading-relaxed">
            Update your account password directly on the GoldBrick website.
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="p-8 pt-6">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-start gap-3 text-destructive text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-5">
            {/* Current Password */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-primary" />
                Current Password
              </Label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  className="bg-background border-border h-14 rounded-2xl px-6 pr-12 text-white focus:ring-1 focus:ring-primary/40 font-bold"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-primary" />
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
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                  aria-label="Toggle new password visibility"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-primary" />
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

            <p className="text-[10px] text-white/40">
              Password must be at least 8 characters with a mix of letters and numbers.
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
                    Updating Password...
                  </span>
                ) : (
                  'Update Password'
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                className="w-full h-12 rounded-2xl text-white/40 hover:text-white font-black uppercase text-[10px] tracking-widest cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
