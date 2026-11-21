import { Logo } from './Logo';
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import {
  BarChart3,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  Users,
  MessageSquare,
  Menu,
  X,
  LayoutDashboard,
  LogOut,
  Settings,
  Download,
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { auth } from '../lib/firebase';
import { usePWA } from '../lib/PWAContext';
import { IOSInstallGuide } from './IOSInstallGuide';
import { ChangePasswordModal } from './ChangePasswordModal';
import { onForegroundMessage } from '../lib/notifications';

const PAGE_LABELS: Record<string, string> = {
  '/dashboard': 'Portfolio Overview',
  '/invest': 'Investment Vaults',
  '/deposit': 'Crypto Deposit',
  '/activate': 'Account Activation',
  '/withdraw': 'Withdraw Funds',
  '/transactions': 'Transaction Ledger',
  '/referrals': 'Referral Network',
  '/support': 'Priority Support',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const location = useLocation();
  const { userData, user } = useAuth();
  const navigate = useNavigate();
  const { isInstallable, handleInstallClick, showIOSInstructions, setShowIOSInstructions } = usePWA();

  useEffect(() => {
    if (!user) return;
    let unsubscribe: any;
    onForegroundMessage().then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [user]);

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Invest', icon: BarChart3, path: '/invest' },
    { name: 'Deposit', icon: ArrowDownLeft, path: '/deposit' },
    { name: 'Withdraw', icon: ArrowUpRight, path: '/withdraw' },
    { name: 'History', icon: History, path: '/transactions' },
    { name: 'Referrals', icon: Users, path: '/referrals' },
    { name: 'Support', icon: MessageSquare, path: '/support' },
  ];

  const handleLogout = () => {
    auth.signOut();
    navigate('/');
  };

  const adminEmails = ['goldbrickexchange31@gmail.com'];
  const role = String(userData?.role || '').trim().toLowerCase();
  const isAdmin =
    role === 'admin' ||
    role === 'super_admin' ||
    Boolean(auth.currentUser?.email && adminEmails.includes(auth.currentUser.email.toLowerCase()));

  const isSupportRoute = location.pathname === '/support';
  const currentPageLabel = PAGE_LABELS[location.pathname] || 'Client Portal';

  return (
    <div
      className={`${
        isSupportRoute ? 'h-[100dvh] overflow-hidden pb-16 md:pb-0' : 'min-h-screen pb-20 md:pb-0'
      } bg-[#05080D] text-white flex flex-col md:flex-row font-sans selection:bg-primary/20 selection:text-primary`}
    >
      <IOSInstallGuide
        isOpen={showIOSInstructions}
        onClose={() => setShowIOSInstructions(false)}
      />

      {/* Floating Support Quick Button (hidden on /support) */}
      {!isSupportRoute && (
        <Link
          to="/support"
          aria-label="Open Priority Support"
          className="fixed bottom-20 right-4 z-[55] md:bottom-7 md:right-7 bg-primary text-slate-950 size-12 md:size-13 rounded-full flex items-center justify-center shadow-xl shadow-primary/25 hover:bg-amber-400 hover:scale-105 transition-all cursor-pointer"
        >
          <MessageSquare className="size-5 md:size-6" />
        </Link>
      )}

      {/* Mobile Top Header */}
      <header className="md:hidden h-15 shrink-0 flex items-center justify-between px-4 border-b border-white/[0.08] bg-[#080C14]/95 backdrop-blur-xl sticky top-0 z-50">
        <Link to="/dashboard" className="flex items-center gap-2">
          <Logo className="h-7" />
        </Link>
        <div className="flex items-center gap-2">
          {isInstallable && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleInstallClick}
              className="h-8 border-primary/40 bg-primary/10 text-primary font-semibold text-xs px-2.5 rounded-lg"
            >
              <Download className="size-3.5 mr-1" /> Install
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle Menu"
            className="text-white/80 hover:text-white hover:bg-white/[0.06] h-9 w-9 rounded-lg"
          >
            {isSidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Desktop Static + Mobile Drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#080C14] border-r border-white/[0.08] transition-transform duration-200 md:translate-x-0 md:static flex flex-col shrink-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="h-16 px-6 hidden md:flex items-center border-b border-white/[0.07]">
            <Link to="/dashboard" className="flex items-center">
              <Logo className="h-8" />
            </Link>
          </div>

          <div className="md:hidden h-15 px-5 flex items-center justify-between border-b border-white/[0.07]">
            <Logo className="h-7" />
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 rounded-lg text-white/60 hover:text-white"
            >
              <X className="size-5" />
            </button>
          </div>

          <nav className="flex-1 px-3.5 py-5 space-y-1 overflow-y-auto no-scrollbar">
            <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-white/35">
              Navigation
            </p>
            {menuItems.map((item) => {
              const active =
                location.pathname === item.path ||
                (item.path === '/deposit' && location.pathname === '/activate');
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-primary text-slate-950 font-semibold shadow-md shadow-primary/15'
                      : 'text-white/65 hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  <item.icon className={`size-4.5 shrink-0 ${active ? 'text-slate-950' : 'text-primary/80'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            <div className="pt-4 mt-4 border-t border-white/[0.07] space-y-1">
              <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-white/35">
                Account
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsSidebarOpen(false);
                  setIsChangePasswordOpen(true);
                }}
                className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium text-white/65 hover:bg-white/[0.05] hover:text-white transition-all cursor-pointer text-left"
              >
                <KeyRound className="size-4.5 text-primary/80 shrink-0" />
                <span>Change Password</span>
              </button>

              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-amber-300/90 hover:bg-amber-500/10 hover:text-amber-200 transition-all"
                >
                  <Settings className="size-4.5 text-amber-400 shrink-0" />
                  <span>Admin Panel</span>
                </Link>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="md:hidden flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer text-left"
              >
                <LogOut className="size-4.5 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </nav>

          {/* Desktop Sidebar Footer */}
          <div className="p-3.5 border-t border-white/[0.07] hidden md:block">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-white/55 hover:text-red-400 hover:bg-red-500/10 transition-all rounded-xl cursor-pointer h-10 px-3.5 text-sm font-medium"
            >
              <LogOut className="size-4 mr-2.5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main
        className={`flex-1 flex flex-col min-w-0 ${
          isSupportRoute ? 'min-h-0 overflow-hidden' : 'overflow-y-auto no-scrollbar'
        }`}
      >
        {/* Desktop Top Bar */}
        <header className="hidden md:flex shrink-0 h-16 items-center justify-between px-6 lg:px-8 border-b border-white/[0.07] bg-[#05080D]/90 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-2.5 text-xs text-white/50">
            <span className="font-medium text-white/40">GoldBrick</span>
            <span className="text-white/25">/</span>
            <span className="font-medium text-white">{currentPageLabel}</span>
          </div>

          <div className="flex items-center gap-3">
            {isInstallable && (
              <Button
                onClick={handleInstallClick}
                variant="outline"
                size="sm"
                className="h-9 border-primary/40 bg-primary/10 text-primary font-semibold text-xs px-3.5 rounded-xl hover:bg-primary/20 transition-all cursor-pointer"
              >
                <Download className="size-3.5 mr-1.5" /> Install App
              </Button>
            )}

            <button
              type="button"
              onClick={() => setIsChangePasswordOpen(true)}
              className="flex items-center gap-2.5 px-2.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-primary/35 rounded-xl transition-all cursor-pointer text-left"
              title="Security & Password Settings"
            >
              <div className="size-7 rounded-lg bg-primary text-slate-950 flex items-center justify-center font-bold text-xs shrink-0">
                {userData?.displayName?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="pr-1">
                <p className="text-xs font-semibold text-white leading-none">
                  {userData?.displayName?.split(' ')[0] || 'Client'}
                </p>
                <p className="text-[10px] text-white/45 flex items-center gap-1 mt-0.5 leading-none">
                  <ShieldCheck className="size-2.5 text-emerald-400" />
                  <span>{userData?.accountStatus === 'inactive' ? 'Inactive' : 'Verified'}</span>
                </p>
              </div>
            </button>
          </div>
        </header>

        <div
          className={
            isSupportRoute
              ? 'flex-1 min-h-0 w-full max-w-6xl mx-auto p-0 md:p-6 flex flex-col overflow-hidden'
              : 'max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 w-full'
          }
        >
          {children}
        </div>
      </main>

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onOpenChange={setIsChangePasswordOpen}
      />

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#080C14]/95 backdrop-blur-xl border-t border-white/[0.08] flex items-center justify-around px-2 z-50">
        <Link
          to="/dashboard"
          className={`flex flex-col items-center gap-0.5 px-2 py-1 ${
            location.pathname === '/dashboard' ? 'text-primary' : 'text-white/50'
          }`}
        >
          <LayoutDashboard className="size-5" />
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        <Link
          to="/invest"
          className={`flex flex-col items-center gap-0.5 px-2 py-1 ${
            location.pathname === '/invest' ? 'text-primary' : 'text-white/50'
          }`}
        >
          <BarChart3 className="size-5" />
          <span className="text-[10px] font-medium">Invest</span>
        </Link>
        <Link to="/deposit" className="flex flex-col items-center -mt-6">
          <div className="size-12 bg-primary text-slate-950 rounded-full flex items-center justify-center shadow-lg shadow-primary/30 border-4 border-[#05080D]">
            <ArrowDownLeft className="size-5" />
          </div>
          <span className="text-[10px] mt-0.5 text-primary font-semibold">Deposit</span>
        </Link>
        <Link
          to="/withdraw"
          className={`flex flex-col items-center gap-0.5 px-2 py-1 ${
            location.pathname === '/withdraw' ? 'text-primary' : 'text-white/50'
          }`}
        >
          <ArrowUpRight className="size-5" />
          <span className="text-[10px] font-medium">Withdraw</span>
        </Link>
        <Link
          to="/transactions"
          className={`flex flex-col items-center gap-0.5 px-2 py-1 ${
            location.pathname === '/transactions' ? 'text-primary' : 'text-white/50'
          }`}
        >
          <History className="size-5" />
          <span className="text-[10px] font-medium">History</span>
        </Link>
      </nav>
    </div>
  );
}
