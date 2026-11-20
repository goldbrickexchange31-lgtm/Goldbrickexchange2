import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { PWAProvider } from './lib/PWAContext';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import InvestPage from './pages/InvestPage';
import DepositPage from './pages/DepositPage';
import WithdrawPage from './pages/WithdrawPage';
import TransactionsPage from './pages/TransactionsPage';
import AdminLogin from './pages/AdminLogin';

import ReferralsPage from './pages/ReferralsPage';
import SupportPage from './pages/SupportPage';
import TermsPage from './pages/TermsPage';
import VisitorTracker from './components/VisitorTracker';
import { LiveActivityNotification } from './components/LiveActivityNotification';
import { GoldbrickLoadingScreen } from './components/GoldbrickLoadingScreen';
import { PageTransitionLoader } from './components/PageTransitionLoader';
import { auth } from './lib/firebase';

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { user, userData, loading } = useAuth();
  const ADMIN_EMAILS = ['goldbrickexchange31@gmail.com'];

  if (
    loading ||
    (auth.currentUser && (!user || auth.currentUser.uid !== user.uid))
  ) {
    return <GoldbrickLoadingScreen subtitle="VERIFYING SECURITY CREDENTIALS..." />;
  }

  const activeUser = user || auth.currentUser;
  if (!activeUser) {
    return <Navigate to={adminOnly ? "/admin/login" : "/login"} replace />;
  }

  const normalizedEmail = (activeUser.email || '').trim().toLowerCase();
  const isEmailAdmin = ADMIN_EMAILS.includes(normalizedEmail);

  // If userData belongs to a previous account or is still loading for a role-based admin, wait briefly
  if (adminOnly && !isEmailAdmin && (!userData || userData.uid !== activeUser.uid)) {
    return <GoldbrickLoadingScreen subtitle="VERIFYING ADMIN PERMISSIONS..." />;
  }

  const role = String(userData?.role || '').trim().toLowerCase();
  const isUserAdmin = isEmailAdmin || role === 'admin' || role === 'super_admin';

  if (adminOnly && !isUserAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/activate" element={<ProtectedRoute><DepositPage isActivationFlow={true} /></ProtectedRoute>} />
      <Route path="/invest" element={<ProtectedRoute><InvestPage /></ProtectedRoute>} />
      <Route path="/deposit" element={<ProtectedRoute><DepositPage /></ProtectedRoute>} />
      <Route path="/withdraw" element={<ProtectedRoute><WithdrawPage /></ProtectedRoute>} />
      <Route path="/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
      <Route path="/referrals" element={<ProtectedRoute><ReferralsPage /></ProtectedRoute>} />
      <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
      
      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
      <Route path="/terms" element={<TermsPage />} />
    </Routes>
  );
}

export default function App() {
  const [initialBoot, setInitialBoot] = useState(() => {
    try {
      return !sessionStorage.getItem('gb_initial_boot_done');
    } catch {
      return true;
    }
  });

  const handleBootComplete = () => {
    try {
      sessionStorage.setItem('gb_initial_boot_done', 'true');
    } catch {
      // Ignore storage errors in restrictive environments
    }
    setInitialBoot(false);
  };

  return (
    <PWAProvider>
      <AuthProvider>
        <BrowserRouter>
          {initialBoot && (
            <GoldbrickLoadingScreen 
              subtitle="GOLDBRICK QUANTUM VAULT INITIALIZING..." 
              minDuration={1100} 
              onComplete={handleBootComplete} 
            />
          )}
          <ScrollToTop />
          <PageTransitionLoader />
          <VisitorTracker />
          <LiveActivityNotification />
          <AppRoutes />
          <Toaster position="top-right" expand={true} richColors />
        </BrowserRouter>
      </AuthProvider>
    </PWAProvider>
  );
}
