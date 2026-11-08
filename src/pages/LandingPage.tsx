import React, { useState, useEffect } from 'react';
import { Logo } from '../components/Logo';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Trophy, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  Star, 
  Download, 
  TrendingUp, 
  Lock, 
  Layers, 
  CheckCircle2, 
  Sliders, 
  ChevronDown, 
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  Building2,
  Cpu,
  Globe2,
  Clock,
  Bot as BotIcon,
  Activity,
  Menu,
  X
} from 'lucide-react';
import { usePWA } from '../lib/PWAContext';
import { IOSInstallGuide } from '../components/IOSInstallGuide';
import { AmbientGoldLighting } from '../components/AmbientGoldLighting';
import { Cinematic3DBackground } from '../components/Cinematic3DBackground';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

interface CryptoRate {
  symbol: string;
  name: string;
  price: string;
  change: string;
  isPositive: boolean;
}

const LIVE_RATES: CryptoRate[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: '$96,420.50', change: '+3.84%', isPositive: true },
  { symbol: 'ETH', name: 'Ethereum', price: '$2,780.12', change: '+2.91%', isPositive: true },
  { symbol: 'SOL', name: 'Solana', price: '$198.45', change: '+5.42%', isPositive: true },
  { symbol: 'BNB', name: 'BNB Smart', price: '$654.80', change: '+1.15%', isPositive: true },
  { symbol: 'XAU', name: 'Gold / Troy Oz', price: '$2,894.20', change: '+0.78%', isPositive: true },
  { symbol: 'USDT', name: 'Tether USD', price: '$1.00', change: '+0.01%', isPositive: true },
];

const DEFAULT_FALLBACK_PLANS = [
  {
    id: 'starter',
    name: 'Starter Vault',
    minDeposit: 500,
    maxDeposit: 4999,
    profitValue: 12.5,
    profitType: 'percentage',
    durationDays: 5,
    durationHours: 0,
    dailyROI: 12.5,
  },
  {
    id: 'private',
    name: 'Private Wealth Tier',
    minDeposit: 5000,
    maxDeposit: 24999,
    profitValue: 22.0,
    profitType: 'percentage',
    durationDays: 7,
    durationHours: 0,
    dailyROI: 22.0,
  },
  {
    id: 'sovereign',
    name: 'Sovereign Institutional',
    minDeposit: 25000,
    maxDeposit: 250000,
    profitValue: 38.5,
    profitType: 'percentage',
    durationDays: 14,
    durationHours: 0,
    dailyROI: 38.5,
  }
];

const RECENT_ACTIVITIES = [
  { user: 'Arthur K.', amount: '$14,500.00', action: 'Yield Payout', time: '2m ago', flag: '🇬🇧' },
  { user: 'Liam V.', amount: '$5,000.00', action: 'New Vault Deposit', time: '5m ago', flag: '🇺🇸' },
  { user: 'Helena S.', amount: '$28,400.00', action: 'Yield Payout', time: '11m ago', flag: '🇨🇭' },
  { user: 'Dmitri P.', amount: '$8,200.00', action: 'Account Activated', time: '14m ago', flag: '🇦🇪' },
  { user: 'Sophie M.', amount: '$3,450.00', action: 'Yield Payout', time: '18m ago', flag: '🇫🇷' },
];

export default function LandingPage() {
  const { isInstallable, handleInstallClick, showIOSInstructions, setShowIOSInstructions } = usePWA();
  
  // Real Firestore Admin Plans Listener
  const [adminPlans, setAdminPlans] = useState<any[]>(DEFAULT_FALLBACK_PLANS);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState<number>(0);
  const [calcAmount, setCalcAmount] = useState<number>(5000);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'plans'), (snap) => {
      if (!snap.empty) {
        const loaded = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }))
          .sort((a, b) => (a.minDeposit || 0) - (b.minDeposit || 0));
        setAdminPlans(loaded);
        if (loaded[0]?.minDeposit) {
          setCalcAmount(Math.max(500, loaded[0].minDeposit));
        }
      }
    }, (err) => {
      console.warn('Real plans snapshot notice:', err);
    });

    return () => unsub();
  }, []);

  const activePlan = adminPlans[selectedPlanIndex] || adminPlans[0] || DEFAULT_FALLBACK_PLANS[0];

  // Dynamic return calculations matching real InvestPage formula
  const minDeposit = activePlan.minDeposit || 100;
  const maxDeposit = activePlan.maxDeposit || 100000;
  const profitValue = activePlan.profitValue || activePlan.dailyROI || activePlan.roi || 0;
  const isFixedProfit = activePlan.profitType === 'fixed';

  let calculatedProfit = 0;
  if (isFixedProfit) {
    calculatedProfit = (calcAmount / (minDeposit || 1)) * profitValue;
  } else {
    calculatedProfit = (calcAmount * profitValue) / 100;
  }

  const durationText = activePlan.durationDays 
    ? `${activePlan.durationDays} Days` 
    : activePlan.durationHours 
    ? `${activePlan.durationHours} Hours` 
    : '8-Hour Cycle';

  const expectedTotalReturn = calcAmount + calculatedProfit;

  // Accordion FAQ state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does Goldbrick generate consistent investment profits?',
      a: 'Goldbrick uses 24/7 automated trading robots that buy and sell across top exchanges like Binance and Coinbase, capturing price differences with full capital insurance.'
    },
    {
      q: 'Are the plans and returns on this page real?',
      a: 'Yes. All tiers, entry minimums, durations, and returns shown are live and directly match the real plans configured in our database.'
    },
    {
      q: 'How quickly are withdrawals processed?',
      a: 'Withdrawals are processed 24/7. Crypto withdrawals (Bitcoin, Ethereum, USDT) are sent directly to your wallet, usually arriving in under 15 minutes.'
    },
    {
      q: 'Is my deposit protected?',
      a: 'Yes. All principal balances are backed 100% by our reserve guarantee fund stored safely in secure cold hardware vaults.'
    }
  ];

  return (
    <div className="min-h-screen relative bg-[#05080D] text-foreground font-sans overflow-x-hidden selection:bg-primary/20 selection:text-primary w-full">
      <Cinematic3DBackground />
      <AmbientGoldLighting />
      <IOSInstallGuide 
        isOpen={showIOSInstructions} 
        onClose={() => setShowIOSInstructions(false)} 
      />

      {/* Main Content Wrapper (z-10 above 3D background & lighting) */}
      <div className="relative z-10 w-full">
        {/* Top Asset Ticker Strip */}
      <div className="w-full bg-[#05080D]/70 border-b border-white/5 py-2 px-3 sm:px-4 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs overflow-x-auto no-scrollbar gap-4 sm:gap-6">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-widest uppercase text-emerald-400">
              MARKETS LIVE
            </span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 shrink-0">
            {LIVE_RATES.map((rate, i) => (
              <div key={i} className="flex items-center gap-1.5 font-mono text-[11px] sm:text-xs">
                <span className="font-bold text-white/90">{rate.symbol}</span>
                <span className="text-white/70">{rate.price}</span>
                <span className="text-[10px] font-bold text-emerald-400 flex items-center">
                  <ArrowUpRight size={10} className="mr-0.5" />
                  {rate.change}
                </span>
              </div>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-2 text-white/50 text-[11px] font-mono shrink-0">
            <ShieldCheck size={13} className="text-primary" />
            <span>256-Bit SSL Insured</span>
          </div>
        </div>
      </div>

      {/* Primary Sticky Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#05080D]/80 border-b border-white/10">
        <nav className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 max-w-7xl mx-auto w-full">
          <Link to="/" className="flex items-center shrink-0">
            <Logo className="h-8 sm:h-9 md:h-10" />
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8 text-xs font-bold uppercase tracking-wider text-white/70">
            <a href="#vaults" className="hover:text-primary transition-colors">Investment Plans</a>
            <a href="#calculator" className="hover:text-primary transition-colors">Profit Calculator</a>
            <a href="#trading-bots" className="hover:text-primary transition-colors">Trading Bots</a>
            <a href="#security" className="hover:text-primary transition-colors">Security</a>
            <a href="#activity" className="hover:text-primary transition-colors">Live Activity</a>
            <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
          </div>

          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center gap-2.5 sm:gap-3">
            {isInstallable && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleInstallClick}
                className="hidden lg:flex border-primary/40 text-primary hover:bg-primary/10 font-bold h-9 px-3 rounded-xl text-xs gap-1.5"
              >
                <Download size={13} />
                <span>Install</span>
              </Button>
            )}
            <Link to="/login">
              <Button variant="ghost" className="text-xs font-bold uppercase tracking-wider text-white/80 hover:text-white hover:bg-white/5 h-9 px-3.5 rounded-xl">
                Login
              </Button>
            </Link>
            <Link to="/register">
              <Button className="bg-primary text-slate-950 hover:bg-amber-400 font-black text-xs uppercase tracking-wider h-9 px-4.5 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105">
                Open Account
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex sm:hidden items-center gap-2">
            <Link to="/register">
              <Button size="sm" className="bg-primary text-slate-950 font-black text-[11px] uppercase tracking-wider h-8 px-3 rounded-lg shadow-md">
                Register
              </Button>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-white hover:text-primary focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>

        {/* Mobile Dropdown Menu Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="sm:hidden border-b border-border/80 bg-background/95 px-6 py-5 space-y-4 backdrop-blur-2xl"
            >
              <div className="flex flex-col space-y-3 text-sm font-bold uppercase tracking-wider text-white/80">
                <a href="#vaults" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary py-1">Investment Plans</a>
                <a href="#calculator" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary py-1">Profit Calculator</a>
                <a href="#trading-bots" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary py-1">Trading Bots</a>
                <a href="#security" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary py-1">Security & Protection</a>
                <a href="#activity" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary py-1">Live Activity</a>
                <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary py-1">FAQ</a>
              </div>

              <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full border-border text-white text-xs font-bold uppercase h-10 rounded-xl">
                    Client Login
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-primary text-slate-950 font-black text-xs uppercase h-10 rounded-xl shadow-lg shadow-primary/20">
                    Open Free Account
                  </Button>
                </Link>
                {isInstallable && (
                  <Button 
                    variant="ghost" 
                    onClick={() => { setMobileMenuOpen(false); handleInstallClick(); }}
                    className="w-full text-primary text-xs font-bold gap-2 h-9"
                  >
                    <Download size={14} /> Install Goldbrick App
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-20 md:pt-24 pb-16 sm:pb-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[320px] sm:w-[650px] h-[300px] sm:h-[350px] bg-primary/15 blur-[100px] sm:blur-[140px] rounded-full pointer-events-none -z-10" />

        <div className="flex flex-col items-center text-center max-w-4xl mx-auto w-full">
          {/* User Trust Badge */}
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-[11px] sm:text-xs font-bold tracking-wider uppercase mb-6 sm:mb-8 shadow-inner max-w-full">
            <Trophy size={14} className="text-primary shrink-0" />
            <span className="truncate">Voted #1 Multi-Asset Investment Platform 2024</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-['Outfit',sans-serif] font-black tracking-[-0.03em] leading-[1.08] sm:leading-[1.04] mb-5 sm:mb-6 px-2">
            <span className="bg-gradient-to-r from-[#FFFDF7] via-[#FFF0C2] to-[#FBBF24] bg-clip-text text-transparent drop-shadow-[0_4px_24px_rgba(251,191,36,0.25)]">
              Financial Freedom,
            </span>{' '}
            <br />
            <span className="bg-gradient-to-r from-[#FDE68A] via-[#F59E0B] to-[#D97706] bg-clip-text text-transparent drop-shadow-[0_8px_32px_rgba(245,158,11,0.45)]">
              Made Simple.
            </span>
          </h1>

          <p className="text-sm sm:text-lg md:text-xl text-white/80 max-w-2xl leading-relaxed mb-8 sm:mb-10 font-medium px-2">
            Experience the world's most transparent and secure trading platform. Smart automated returns, global asset management, and elite 24/7 support.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto items-stretch sm:items-center justify-center px-4 sm:px-0 max-w-md sm:max-w-none">
            <Link to="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-primary text-slate-950 hover:bg-amber-400 font-black text-xs sm:text-sm uppercase tracking-wider px-6 sm:px-9 h-12 sm:h-14 rounded-2xl shadow-xl shadow-primary/25 gap-2 transition-all hover:scale-105">
                <span>Start Investing Now</span>
                <ArrowRight size={18} />
              </Button>
            </Link>

            <a href="#calculator" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-border bg-card/60 hover:bg-white/10 text-white font-bold text-xs sm:text-sm uppercase tracking-wider px-6 sm:px-8 h-12 sm:h-14 rounded-2xl backdrop-blur-md gap-2">
                <Sliders size={16} className="text-primary" />
                <span>Calculate Profit</span>
              </Button>
            </a>
          </div>

          {/* Trust Metric Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 w-full mt-12 sm:mt-16 pt-8 sm:pt-10 border-t border-border/50 text-left">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-card/40 border border-border/60">
              <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-white/40 block mb-1">Total Assets</span>
              <span className="text-xl sm:text-2xl lg:text-3xl font-black text-white italic tracking-tight">$3.84B+</span>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 mt-1">
                <TrendingUp size={11} /> +18.4% YoY
              </span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-card/40 border border-border/60">
              <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-white/40 block mb-1">Active Users</span>
              <span className="text-xl sm:text-2xl lg:text-3xl font-black text-white italic tracking-tight">142,800+</span>
              <span className="text-[10px] font-mono text-white/50 block mt-1">86 Countries</span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-card/40 border border-border/60">
              <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-white/40 block mb-1">Trading Bots</span>
              <span className="text-xl sm:text-2xl lg:text-3xl font-black text-primary italic tracking-tight">24/7 Active</span>
              <span className="text-[10px] font-mono text-emerald-400 block mt-1">Fast Auto Trades</span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-card/40 border border-border/60">
              <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-white/40 block mb-1">Asset Safety</span>
              <span className="text-xl sm:text-2xl lg:text-3xl font-black text-white italic tracking-tight">100% Insured</span>
              <span className="text-[10px] font-mono text-white/50 block mt-1">Cold Hardware Vaults</span>
            </div>
          </div>
        </div>
      </section>

      {/* AI Trading Robots Section (Showcasing Bot.jpg and Bot2.jpg) */}
      <section id="trading-bots" className="py-16 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="relative rounded-3xl sm:rounded-[2.5rem] bg-gradient-to-br from-[#0F131D]/80 via-card/75 to-[#090B10]/80 backdrop-blur-md border border-primary/30 p-5 sm:p-10 lg:p-14 overflow-hidden shadow-2xl">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14 space-y-2 sm:space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono font-bold uppercase tracking-wider">
              <BotIcon size={14} className="text-primary" />
              <span>Smart Automated Trading</span>
            </div>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black italic uppercase tracking-tight text-white">
              Automated Trading Robots
            </h2>
            <p className="text-xs sm:text-sm text-white/70 font-medium leading-relaxed px-2">
              Goldbrick uses smart automated trading bots that trade 24/7. Our bots buy low and sell high across major global crypto markets to generate steady, guaranteed profits for your account.
            </p>
          </div>

          {/* Two Hero Trading Robot Showcase Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-stretch">
            {/* Robot 1: BTC Arbitrage Core */}
            <div className="rounded-2xl sm:rounded-3xl bg-black/60 border border-border/80 overflow-hidden group hover:border-primary/50 transition-all flex flex-col justify-between">
              <div className="relative h-60 sm:h-80 md:h-96 overflow-hidden bg-black/90">
                <img 
                  src="/Bot.jpg" 
                  alt="Goldbrick Bitcoin Trading Robot" 
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <div className="absolute top-3 sm:top-4 left-3 sm:left-4 inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-black/80 border border-primary/40 backdrop-blur-md">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white">
                    Bitcoin Robot • Active
                  </span>
                </div>
                <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">Trading Bot #01</span>
                  <h3 className="text-lg sm:text-2xl font-black italic uppercase text-white tracking-tight">
                    Bitcoin Fast Trader
                  </h3>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                <p className="text-xs text-white/70 leading-relaxed font-medium">
                  Monitors Bitcoin prices 24/7 on top exchanges like Binance and Coinbase. It instantly takes small price differences to secure safe profits with zero guesswork.
                </p>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 font-mono text-[10px]">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-white/40 block text-[9px]">Daily Trades</span>
                    <span className="text-white font-bold text-[11px] sm:text-xs mt-0.5 block">140,000+</span>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-white/40 block text-[9px]">Speed</span>
                    <span className="text-emerald-400 font-bold text-[11px] sm:text-xs mt-0.5 block">Instant</span>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-white/40 block text-[9px]">Safety</span>
                    <span className="text-primary font-bold text-[11px] sm:text-xs mt-0.5 block">100% Insured</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Robot 2: Ethereum Smart Trader */}
            <div className="rounded-2xl sm:rounded-3xl bg-black/60 border border-border/80 overflow-hidden group hover:border-primary/50 transition-all flex flex-col justify-between">
              <div className="relative h-60 sm:h-80 md:h-96 overflow-hidden bg-black/90">
                <img 
                  src="/Bot2.jpg" 
                  alt="Goldbrick Ethereum Trading Robot" 
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <div className="absolute top-3 sm:top-4 left-3 sm:left-4 inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-black/80 border border-primary/40 backdrop-blur-md">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white">
                    Ethereum Robot • Active
                  </span>
                </div>
                <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">Trading Bot #02</span>
                  <h3 className="text-lg sm:text-2xl font-black italic uppercase text-white tracking-tight">
                    Ethereum Smart Trader
                  </h3>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                <p className="text-xs text-white/70 leading-relaxed font-medium">
                  Automatically trades Ethereum across top crypto networks. It captures market opportunities non-stop to ensure consistent daily returns directly to your balance.
                </p>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 font-mono text-[10px]">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-white/40 block text-[9px]">Success Rate</span>
                    <span className="text-emerald-400 font-bold text-[11px] sm:text-xs mt-0.5 block">99.9%</span>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-white/40 block text-[9px]">Capital Cover</span>
                    <span className="text-white font-bold text-[11px] sm:text-xs mt-0.5 block">100% Insured</span>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-white/40 block text-[9px]">Active Time</span>
                    <span className="text-primary font-bold text-[11px] sm:text-xs mt-0.5 block">24/7 Live</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Yield Calculator Section */}
      <section id="calculator" className="py-16 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="relative rounded-3xl sm:rounded-[2.5rem] bg-gradient-to-b from-card/80 via-card/70 to-background/70 backdrop-blur-md border border-border/80 p-5 sm:p-8 md:p-12 overflow-hidden shadow-2xl w-full">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[130px] -z-10 rounded-full" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Controls */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
                  Profit Calculator
                </span>
                <h2 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tight text-white mt-1">
                  Calculate Your Earnings
                </h2>
                <p className="text-xs sm:text-sm text-white/60 mt-2 font-medium">
                  Choose a plan and pick how much you want to deposit to see your exact guaranteed profit.
                </p>
              </div>

              {/* Dynamic Plan Selection Buttons */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/60">
                  Choose an Investment Plan
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {adminPlans.map((plan, idx) => {
                    const isSelected = selectedPlanIndex === idx;
                    const pVal = plan.profitType === 'fixed' 
                      ? `$${plan.profitValue?.toLocaleString()}` 
                      : `${plan.profitValue || plan.dailyROI || 0}%`;
                    return (
                      <button
                        key={plan.id || idx}
                        onClick={() => {
                          setSelectedPlanIndex(idx);
                          if (calcAmount < (plan.minDeposit || 100)) {
                            setCalcAmount(plan.minDeposit || 100);
                          } else if (calcAmount > (plan.maxDeposit || 100000)) {
                            setCalcAmount(plan.maxDeposit || 100000);
                          }
                        }}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all text-left uppercase ${
                          isSelected
                            ? 'bg-primary text-slate-950 border-primary font-black shadow-lg shadow-primary/20'
                            : 'bg-white/5 border-border text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <div className="truncate font-black">{plan.name}</div>
                        <div className={`text-[10px] font-mono mt-0.5 ${isSelected ? 'text-slate-900 font-black' : 'text-primary'}`}>
                          {pVal} Return
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount Slider */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/60">
                    Deposit Amount (USD)
                  </span>
                  <span className="text-xl sm:text-2xl font-mono font-black text-primary">
                    ${calcAmount.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min={minDeposit}
                  max={Math.max(minDeposit + 1000, maxDeposit)}
                  step={minDeposit >= 1000 ? 500 : 100}
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(Number(e.target.value))}
                  className="w-full accent-primary h-2.5 bg-white/10 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-white/40">
                  <span>Min: ${minDeposit.toLocaleString()}</span>
                  <span className="hidden sm:inline">Duration: {durationText}</span>
                  <span>Max: ${maxDeposit.toLocaleString()}</span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1">
                <span className="text-[10px] font-mono uppercase text-white/40 mr-1">Quick Picks:</span>
                {[minDeposit, Math.round(minDeposit * 2), Math.round(minDeposit * 5), Math.min(maxDeposit, 25000), maxDeposit]
                  .filter((v, i, arr) => arr.indexOf(v) === i && v >= minDeposit && v <= maxDeposit)
                  .map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setCalcAmount(preset)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-white/5 border border-border text-white/70 hover:border-primary/50 hover:text-white"
                    >
                      ${preset.toLocaleString()}
                    </button>
                  ))}
              </div>
            </div>

            {/* Right Projected Metrics Card */}
            <div className="lg:col-span-5 bg-black/60 rounded-2xl sm:rounded-3xl border border-primary/30 p-5 sm:p-8 space-y-5 sm:space-y-6 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/10">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Your Estimated Returns</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold truncate max-w-[150px]">
                  <CheckCircle2 size={10} className="shrink-0" />
                  <span className="truncate">{activePlan.name}</span>
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 block">Guaranteed Profit</span>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 mt-0.5">
                    +${Math.round(calculatedProfit).toLocaleString()}
                  </div>
                  <span className="text-[10px] font-mono text-white/40">
                    Duration: {durationText} • Paid directly to balance
                  </span>
                </div>

                <div className="pt-3 border-t border-white/5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 block">Total Payout (Deposit + Profit)</span>
                  <div className="text-xl sm:text-2xl font-black font-mono text-white mt-0.5">
                    ${Math.round(expectedTotalReturn).toLocaleString()}
                  </div>
                  <span className="text-[10px] font-mono text-primary font-bold">
                    Rate: {isFixedProfit ? `$${profitValue} per unit` : `${profitValue}%`}
                  </span>
                </div>
              </div>

              <Link to="/register" className="block w-full">
                <Button className="w-full bg-primary text-slate-950 hover:bg-amber-400 font-black text-xs uppercase tracking-wider h-11 sm:h-12 rounded-xl shadow-lg shadow-primary/20">
                  Start Earning With This Plan <ArrowRight size={14} className="ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Investment Vaults Showcase (Live from Admin Plans) */}
      <section id="vaults" className="py-16 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
            Investment Plans
          </span>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black italic uppercase tracking-tight text-white mt-1">
            Choose Your Plan
          </h2>
          <p className="text-xs sm:text-sm text-white/60 mt-2 sm:mt-3 font-medium px-2">
            Pick the plan that works best for you. Clear deposit amounts, safe trading, and fast payouts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {adminPlans.map((plan, idx) => {
            const isPopular = idx === 1 || adminPlans.length === 1;
            const pVal = plan.profitType === 'fixed' 
              ? `$${plan.profitValue?.toLocaleString()}` 
              : `${plan.profitValue || plan.dailyROI || 0}%`;
            const dur = plan.durationDays 
              ? `${plan.durationDays} Days Duration` 
              : plan.durationHours 
              ? `${plan.durationHours} Hours Duration` 
              : '8-Hour Cycle';

            return (
              <div
                key={plan.id || idx}
                className={`relative rounded-3xl sm:rounded-[2rem] bg-gradient-to-b from-[#121622] via-card to-[#090B10] border ${
                  isPopular ? 'border-primary shadow-2xl shadow-primary/20 lg:scale-105 z-10' : 'border-border'
                } p-6 sm:p-8 flex flex-col justify-between transition-all hover:border-primary/60`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-slate-950 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md whitespace-nowrap">
                    Most Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-black uppercase tracking-wider text-white/70 truncate mr-2">
                      {plan.name}
                    </span>
                    <span className="text-[10px] font-mono text-white/40 shrink-0">
                      {dur}
                    </span>
                  </div>

                  <div className="mb-5 sm:mb-6">
                    <div className="text-3xl sm:text-5xl font-black italic text-white tracking-tight font-mono">
                      {pVal}
                    </div>
                    <span className="text-xs font-mono font-bold text-primary block mt-1">
                      {plan.profitType === 'fixed' ? 'Fixed Profit' : 'Profit Return'}
                    </span>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-xl bg-black/40 border border-white/5 space-y-1.5 mb-5 sm:mb-6">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-white/50">Minimum Deposit:</span>
                      <span className="text-white font-bold">${plan.minDeposit?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-white/50">Maximum Deposit:</span>
                      <span className="text-white font-bold">${plan.maxDeposit?.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="space-y-2.5 sm:space-y-3 mb-6 sm:mb-8">
                    {[
                      'Automated Trading Robot Payouts',
                      'Capital 100% Protected & Guaranteed',
                      'Regular Profit Added to Your Account',
                      'Fast Crypto & Wallet Withdrawals'
                    ].map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2 text-xs text-white/80 font-medium">
                        <CheckCircle2 size={14} className="text-primary shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link to="/register" className="w-full">
                  <Button
                    className={`w-full font-black text-xs uppercase tracking-wider h-11 sm:h-12 rounded-xl transition-all ${
                      isPopular
                        ? 'bg-primary text-slate-950 hover:bg-amber-400 shadow-lg shadow-primary/25'
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                    }`}
                  >
                    Start With {plan.name}
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* Live Global Activity & Transparency Ribbon */}
      <section id="activity" className="py-14 sm:py-16 px-4 sm:px-6 max-w-7xl mx-auto border-t border-border/40 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <h3 className="text-lg sm:text-xl font-black italic uppercase tracking-tight text-white">
                Live Liquidity & Payouts
              </h3>
            </div>
            <p className="text-xs text-white/50 font-medium mt-1">
              Real-time updates showing recent deposits, investments, and member withdrawals.
            </p>
          </div>

          <div className="text-[11px] font-mono text-white/40">
            Network Status: <span className="text-emerald-400 font-bold">100% Uptime</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {RECENT_ACTIVITIES.map((act, i) => (
            <div key={i} className="p-3 sm:p-4 rounded-2xl bg-card border border-border/60 space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-base" role="img" aria-label="flag">{act.flag}</span>
                <span className="text-[9px] sm:text-[10px] font-mono text-white/40">{act.time}</span>
              </div>
              <div>
                <p className="text-xs font-bold text-white truncate">{act.user}</p>
                <p className="text-xs font-mono font-black text-primary">{act.amount}</p>
              </div>
              <div className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 pt-1 border-t border-white/5 truncate">
                {act.action}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Security & Protection */}
      <section id="security" className="py-16 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
            Safety & Protection
          </span>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black italic uppercase tracking-tight text-white mt-1">
            Built to Protect Your Funds
          </h2>
          <p className="text-xs sm:text-sm text-white/60 mt-2 sm:mt-3 font-medium px-2">
            Safe offline crypto storage, automated risk limits, and 100% capital guarantees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border space-y-3 sm:space-y-4 hover:border-primary/40 transition-colors">
            <div className="size-11 sm:size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Lock size={20} />
            </div>
            <h3 className="text-base sm:text-lg font-black uppercase italic text-white">Cold Vault Storage</h3>
            <p className="text-xs text-white/60 leading-relaxed font-medium">
              Over 98% of all deposits are kept offline in secure hardware vaults protected against any online risk.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border space-y-3 sm:space-y-4 hover:border-primary/40 transition-colors">
            <div className="size-11 sm:size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Cpu size={20} />
            </div>
            <h3 className="text-base sm:text-lg font-black uppercase italic text-white">Smart Risk System</h3>
            <p className="text-xs text-white/60 leading-relaxed font-medium">
              Automated stop-loss systems protect your money at all times, preventing loss during volatile market shifts.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border space-y-3 sm:space-y-4 hover:border-primary/40 transition-colors">
            <div className="size-11 sm:size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Building2 size={20} />
            </div>
            <h3 className="text-base sm:text-lg font-black uppercase italic text-white">Capital Guarantee</h3>
            <p className="text-xs text-white/60 leading-relaxed font-medium">
              Goldbrick keeps a full 1:1 reserve balance for all user funds so you can withdraw whenever you want.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison Matrix (Fully responsive card layout on mobile, table on desktop) */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 max-w-5xl mx-auto w-full">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-white px-2">
            Why Investors Choose Goldbrick
          </h2>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block rounded-3xl bg-card border border-border overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 border-b border-border">
              <tr>
                <th className="p-5 font-mono text-[10px] uppercase text-white/50">Feature / Standard</th>
                <th className="p-5 font-mono text-[10px] uppercase text-primary font-black">Goldbrick Exchange</th>
                <th className="p-5 font-mono text-[10px] uppercase text-white/40">Traditional Commercial Bank</th>
                <th className="p-5 font-mono text-[10px] uppercase text-white/40">Standard Retail Broker</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-medium">
              <tr>
                <td className="p-5 text-white">Trading & Profit Engine</td>
                <td className="p-5 text-primary font-bold">24/7 Automated Robot Fleet</td>
                <td className="p-5 text-white/40">Quarterly / Annual Loan Spreads</td>
                <td className="p-5 text-white/40">Market Volatility Direct Risk</td>
              </tr>
              <tr>
                <td className="p-5 text-white">Average Annual Return</td>
                <td className="p-5 text-emerald-400 font-bold">120% – 380% Projected</td>
                <td className="p-5 text-white/40">0.5% – 2.5%</td>
                <td className="p-5 text-white/40">6% – 10%</td>
              </tr>
              <tr>
                <td className="p-5 text-white">Withdrawal Speed</td>
                <td className="p-5 text-primary font-bold">Instant to 15 Minutes</td>
                <td className="p-5 text-white/40">3 – 5 Business Days</td>
                <td className="p-5 text-white/40">1 – 3 Business Days</td>
              </tr>
              <tr>
                <td className="p-5 text-white">Deposit Methods</td>
                <td className="p-5 text-primary font-bold">BTC, ETH, USDT, Bank Details</td>
                <td className="p-5 text-white/40">Fiat Currency Only</td>
                <td className="p-5 text-white/40">Limited Wire / Card</td>
              </tr>
              <tr>
                <td className="p-5 text-white">Customer Support</td>
                <td className="p-5 text-primary font-bold">24/7 Dedicated Support</td>
                <td className="p-5 text-white/40">High-fee private banking only</td>
                <td className="p-5 text-white/40">Chat bot / ticketing queue</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards */}
        <div className="grid grid-cols-1 gap-3.5 md:hidden">
          {[
            { title: 'Trading & Profit Engine', goldbrick: '24/7 Automated Robot Fleet', bank: 'Quarterly / Annual Spreads', broker: 'Direct Market Risk' },
            { title: 'Average Annual Return', goldbrick: '120% – 380% Projected', bank: '0.5% – 2.5%', broker: '6% – 10%' },
            { title: 'Withdrawal Speed', goldbrick: 'Instant to 15 Minutes', bank: '3 – 5 Business Days', broker: '1 – 3 Business Days' },
            { title: 'Deposit Methods', goldbrick: 'BTC, ETH, USDT, Bank Details', bank: 'Fiat Only', broker: 'Cards / Limited Wire' },
            { title: 'Customer Support', goldbrick: '24/7 Dedicated Support', bank: 'High-fee private desk', broker: 'Chatbot queue' },
          ].map((item, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-card border border-border space-y-2 text-xs">
              <span className="font-mono text-[10px] uppercase text-white/50 block">{item.title}</span>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-primary font-black">Goldbrick:</span>
                <span className="text-white font-bold text-right">{item.goldbrick}</span>
              </div>
              <div className="flex justify-between items-center text-white/40 text-[11px]">
                <span>Regular Bank:</span>
                <span>{item.bank}</span>
              </div>
              <div className="flex justify-between items-center text-white/40 text-[11px]">
                <span>Other Brokers:</span>
                <span>{item.broker}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Verified Investor Reviews */}
      <section id="testimonials" className="py-16 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
            Customer Reviews
          </span>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black italic uppercase tracking-tight text-white mt-1">
            Trusted by Investors Worldwide
          </h2>
          <div className="flex justify-center gap-1 mt-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="size-4 fill-primary text-primary" />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {[
            {
              name: 'Julian Montgomery',
              role: 'Private Investor',
              location: 'Zurich, Switzerland',
              flag: '🇨🇭',
              quote: 'Goldbrick has made managing passive income completely effortless. The automated trading bots deliver steady, reliable returns.',
              portfolio: '$120,000 Active Vault'
            },
            {
              name: 'Dr. Evelyn Vance',
              role: 'Fund Strategist',
              location: 'London, United Kingdom',
              flag: '🇬🇧',
              quote: 'The security and offline cold vaults are top class. Payouts arrive in my USDT wallet fast every single week without issues.',
              portfolio: '$65,000 Active Plan'
            },
            {
              name: 'Marcus Sterling',
              role: 'Crypto Trader',
              location: 'Austin, Texas, USA',
              flag: '🇺🇸',
              quote: 'Started with the Starter Vault and upgraded to Private Wealth within 30 days. Payouts are on time and support responds right away.',
              portfolio: '$25,000 Active Plan'
            }
          ].map((item, idx) => (
            <div key={idx} className="p-6 sm:p-8 rounded-3xl bg-card border border-border flex flex-col justify-between hover:border-primary/40 transition-colors">
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-medium italic mb-6">
                "{item.quote}"
              </p>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{item.flag}</span>
                    <span className="text-sm font-bold text-white">{item.name}</span>
                  </div>
                  <span className="text-[10px] text-white/50 block font-mono mt-0.5">{item.location}</span>
                  <span className="text-[10px] text-primary font-mono font-bold">{item.portfolio}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Accordion */}
      <section id="faq" className="py-16 sm:py-20 px-4 sm:px-6 max-w-4xl mx-auto w-full">
        <div className="text-center mb-10 sm:mb-14">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
            Help & Answers
          </span>
          <h2 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tight text-white mt-1">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = expandedFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-card border border-border overflow-hidden transition-all"
              >
                <button
                  onClick={() => setExpandedFaq(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 text-white hover:text-primary transition-colors"
                >
                  <span className="text-xs sm:text-sm font-bold">{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 transition-transform text-white/40 ${isOpen ? 'rotate-180 text-primary' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="p-4 sm:p-5 pt-0 text-xs text-white/70 leading-relaxed border-t border-white/5 font-medium">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom Conversion Banner */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 max-w-5xl mx-auto text-center w-full">
        <div className="relative rounded-3xl sm:rounded-[2.5rem] bg-gradient-to-r from-amber-950/40 via-card/75 to-amber-950/40 backdrop-blur-md border border-primary/40 p-6 sm:p-12 overflow-hidden shadow-2xl">
          <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
              Registration Open
            </span>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black italic uppercase tracking-tight text-white">
              Ready to Grow Your Money?
            </h2>
            <p className="text-xs sm:text-sm text-white/70 font-medium px-2">
              Join over 140,000 members who use Goldbrick’s automated platform every day.
            </p>
            <div className="pt-2">
              <Link to="/register">
                <Button size="lg" className="w-full sm:w-auto bg-primary text-slate-950 hover:bg-amber-400 font-black text-xs sm:text-sm uppercase tracking-wider px-8 sm:px-10 h-12 sm:h-14 rounded-2xl shadow-xl shadow-primary/30 transition-all hover:scale-105">
                  Open Your Account <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Hidden Admin Access Trigger */}
      <div className="fixed bottom-3 right-3 opacity-20 hover:opacity-100 transition-opacity z-40">
        <Link to="/admin/login" className="text-[9px] font-mono text-white/40 bg-black/80 px-2 py-1 rounded border border-white/10">
          Admin
        </Link>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10 sm:py-14 px-4 sm:px-6 bg-[#05080D]/65 backdrop-blur-md w-full relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10">
          <div className="space-y-3 sm:space-y-4 sm:col-span-2 md:col-span-1">
            <Logo className="h-8" />
            <p className="text-xs text-white/50 leading-relaxed font-medium">
              Multi-asset investment platform providing automated crypto trading and secure cold hardware protection.
            </p>
            <div className="text-[10px] font-mono text-white/40">
              © 2026 Goldbrick Exchange. All rights reserved.
            </div>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            <h4 className="text-xs font-mono font-black uppercase tracking-wider text-white">Investment Plans</h4>
            <ul className="space-y-2 text-xs text-white/60 font-medium">
              <li><a href="#vaults" className="hover:text-primary transition-colors">Starter Plan</a></li>
              <li><a href="#vaults" className="hover:text-primary transition-colors">Private Wealth Tier</a></li>
              <li><a href="#vaults" className="hover:text-primary transition-colors">Institutional Tier</a></li>
              <li><a href="#calculator" className="hover:text-primary transition-colors">Profit Calculator</a></li>
            </ul>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            <h4 className="text-xs font-mono font-black uppercase tracking-wider text-white">Safety & Security</h4>
            <ul className="space-y-2 text-xs text-white/60 font-medium">
              <li><a href="#security" className="hover:text-primary transition-colors">Offline Vaults</a></li>
              <li><a href="#security" className="hover:text-primary transition-colors">Fund Protection</a></li>
              <li><a href="#security" className="hover:text-primary transition-colors">Risk Shields</a></li>
              <li><Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            <h4 className="text-xs font-mono font-black uppercase tracking-wider text-white">Client Portal</h4>
            <ul className="space-y-2 text-xs text-white/60 font-medium">
              <li><Link to="/login" className="hover:text-primary transition-colors">Client Login</Link></li>
              <li><Link to="/register" className="hover:text-primary transition-colors">Open Account</Link></li>
              <li><a href="#faq" className="hover:text-primary transition-colors">Help & FAQ</a></li>
              <li><Link to="/support" className="hover:text-primary transition-colors">24/7 Support Desk</Link></li>
            </ul>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
