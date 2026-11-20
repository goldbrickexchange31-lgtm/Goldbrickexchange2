import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';

const ADMIN_EMAILS = ['goldbrickexchange31@gmail.com'];

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, userData, loading: authLoading } = useAuth();

  // If already signed in as an admin, navigate straight to the command center
  useEffect(() => {
    if (authLoading || !user) return;
    const normalized = (user.email || '').trim().toLowerCase();
    const role = String(userData?.role || '').trim().toLowerCase();
    if (ADMIN_EMAILS.includes(normalized) || role === 'admin' || role === 'super_admin') {
      navigate('/admin', { replace: true });
    }
  }, [user, userData, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      toast.error('Please enter your admin email and password');
      return;
    }

    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const signedInEmail = (cred.user.email || cleanEmail).trim().toLowerCase();

      let isAuthorized = ADMIN_EMAILS.includes(signedInEmail);
      if (!isAuthorized) {
        try {
          const userSnap = await getDoc(doc(db, 'users', cred.user.uid));
          const role = String(userSnap.data()?.role || '').trim().toLowerCase();
          if (role === 'admin' || role === 'super_admin') {
            isAuthorized = true;
          }
        } catch (err) {
          console.warn('[ADMIN-LOGIN] Role check error:', err);
        }
      }

      if (!isAuthorized) {
        await signOut(auth).catch(() => {});
        toast.error('Unauthorized access attempt. This portal is restricted to administrators.');
        return;
      }

      toast.success('Admin access granted');
      navigate('/admin', { replace: true });
    } catch (error: any) {
      let msg = error?.message || 'Login failed';
      if (
        error?.code === 'auth/invalid-credential' ||
        error?.code === 'auth/wrong-password' ||
        error?.code === 'auth/user-not-found'
      ) {
        msg = 'Invalid admin email or security password.';
      } else if (error?.code === 'auth/too-many-requests') {
        msg = 'Too many failed attempts. Please wait a few minutes and try again.';
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-card border-border shadow-2xl rounded-[2.5rem] overflow-hidden border">
        <CardHeader className="text-center pt-10 bg-white/5 border-b border-border">
          <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 border border-red-500/20">
            <ShieldAlert className="text-red-500 w-8 h-8" />
          </div>
          <CardTitle className="text-3xl font-black italic vibrant-text uppercase tracking-tighter">ADMIN PORTAL</CardTitle>
          <p className="text-white/40 font-bold text-[10px] uppercase tracking-widest mt-2">Secure authorization required</p>
        </CardHeader>
        <CardContent className="p-6 sm:p-10 pt-8 sm:pt-10">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Restricted Email</Label>
              <Input 
                type="email" 
                placeholder="Admin Email" 
                className="bg-background border-border h-14 rounded-2xl px-6 text-white focus:ring-1 focus:ring-primary/40 font-bold placeholder:text-white/20"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Security Password</Label>
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
              className="w-full bg-primary text-primary-foreground font-black h-16 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all uppercase text-sm cursor-pointer"
              disabled={loading}
            >
              {loading ? 'Authorizing...' : 'Access Command Center'}
            </Button>
          </form>
          <div className="mt-8 text-center">
             <Link to="/" className="text-white/40 hover:text-white text-[10px] uppercase font-black tracking-widest transition-colors">Back to Main Site</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
