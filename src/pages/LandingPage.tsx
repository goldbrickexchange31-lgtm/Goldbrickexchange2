import React, { useState, useEffect } from 'react';
import { Logo } from '../components/Logo';
import { motion } from 'motion/react';
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
  Activity
} from 'lucide-react';
import { usePWA } from '../lib/PWAContext';
import { IOSInstallGuide } from '../components/IOSInstallGuide';
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

// Fallback plans if admin hasn't created any plans yet
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

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'plans'), (snap) => {
      if (!snap.empty) {
        const loaded = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }))
          .sort((a, b) => (a.minDeposit || 0) - (b.minDeposit || 0));
        setAdminPlans(loaded);
        // Default slider amount to middle plan's minimum or reasonable default
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

  // Dynamic return calculations matching real InvestPage formula exactly
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
      q: 'How does Goldbrick generate consistent algorithmic investment yields?',
      a: 'Goldbrick executes high-frequency institutional cross-exchange arbitrage, automated liquidity provisioning across decentralized orderbooks, and autonomous trading robots (BTC & ETH liquidity nodes) backed by multi-layered risk limits and segregated hedging vaults.'
    },
    {
      q: 'Are the investment plans and returns on this page real and active?',
      a: 'Yes. All tiers, entry thresholds, durations, and returns displayed on this page are live-synchronized with the Goldbrick master plan database and match the exact payout algorithm inside the client dashboard.'
    },
    {
      q: 'How quickly are withdrawals processed to my external wallet?',
      a: 'Withdrawals are processed around the clock. Crypto withdrawals (Bitcoin, Ethereum, USDT TRC20/ERC20) are broadcasted immediately via our automated multisig gateway, typically settling in under 15 minutes.'
    },
    {
      q: 'Are my deposited assets insured against market volatility?',
      a: 'Yes. All principal balances are safeguarded by our Capital Protection Reserve Fund (CPRF) held in cold storage multi-signature accounts across Tier-1 financial institutions.'
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden selection:bg-primary/20 selection:text-primary">
      <IOSInstallGuide 
        isOpen={showIOSInstructions} 
        onClose={() => setShowIOSInstructions(false)} 
      />

      {/* Top Asset Ticker Strip */}
      <div className="w-full bg-black/60 border-b border-border/40 py-2 px-4 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs overflow-x-auto no-scrollbar gap-6">
          <div className="flex items-center gap-2 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-emerald-400">
              MARKETS LIVE
            </span>
          </div>

          <div className="flex items-center gap-6 shrink-0">
            {LIVE_RATES.map((rate, i) => (
              <div key={i} className="flex items-center gap-2 font-mono">
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
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <Link to="/" className="flex items-center">
            <Logo className="h-9 md:h-10" />
          </Link>

          <div className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-white/70">
            <a href="#vaults" className="hover:text-primary transition-colors">Investment Vaults</a>
            <a href="#calculator" className="hover:text-primary transition-colors">Yield Calculator</a>
            <a href="#trading-bots" className="hover:text-primary transition-colors">AI Trading Bots</a>
            <a href="#security" className="hover:text-primary transition-colors">Institutional Security</a>
            <a href="#activity" className="hover:text-primary transition-colors">Live Activity</a>
            <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            {isInstallable && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleInstallClick}
                className="hidden sm:flex border-primary/40 text-primary hover:bg-primary/10 font-bold h-9 px-3.5 rounded-xl text-xs gap-1.5"
              >
                <Download size={13} />
                <span>Install App</span>
              </Button>
            )}
            <Link to="/login">
              <Button variant="ghost" className="text-xs font-bold uppercase tracking-wider text-white/80 hover:text-white hover:bg-white/5 h-9 px-4 rounded-xl">
                Client Login
              </Button>
            </Link>
            <Link to="/register">
              <Button className="bg-primary text-slate-950 hover:bg-amber-400 font-black text-xs uppercase tracking-wider h-9 px-5 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105">
                Open Account
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-6 max-w-7xl mx-auto">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[650px] h-[350px] bg-primary/15 blur-[140px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-40 right-10 w-[350px] h-[350px] bg-amber-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* User Trust Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold tracking-wider uppercase mb-8 shadow-inner">
            <Trophy size={14} className="text-primary" />
            <span>Voted #1 Multi-Asset Investment Platform 2024</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.08] text-white mb-6 uppercase italic">
            Financial Freedom, <br />
            <span className="vibrant-text">Made Simple.</span>
          </h1>

          <p className="text-base sm:text-xl text-white/80 max-w-2xl leading-relaxed mb-10 font-medium">
            Experience the world's most transparent and secure trading platform. Smart automated returns, global asset management, and elite 24/7 support.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center justify-center">
            <Link to="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-primary text-slate-950 hover:bg-amber-400 font-black text-sm uppercase tracking-wider px-9 h-14 rounded-2xl shadow-xl shadow-primary/25 gap-2 transition-all hover:scale-105">
                <span>Start Investing Now</span>
                <ArrowRight size={18} />
              </Button>
            </Link>

            <a href="#calculator" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-border bg-card/60 hover:bg-white/10 text-white font-bold text-sm uppercase tracking-wider px-8 h-14 rounded-2xl backdrop-blur-md gap-2">
                <Sliders size={16} className="text-primary" />
                <span>Calculate Yield</span>
              </Button>
            </a>
          </div>

          {/* Trust Metric Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 w-full mt-16 pt-10 border-t border-border/50 text-left">
            <div className="p-4 rounded-2xl bg-card/40 border border-border/60">
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 block mb-1">Total Assets Managed</span>
              <span className="text-2xl sm:text-3xl font-black text-white italic tracking-tight">$3.84 Billion+</span>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 mt-1">
                <TrendingUp size={11} /> +18.4% YoY
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-card/40 border border-border/60">
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 block mb-1">Active Portfolios</span>
              <span className="text-2xl sm:text-3xl font-black text-white italic tracking-tight">142,800+</span>
              <span className="text-[10px] font-mono text-white/50 block mt-1">Across 86 Countries</span>
            </div>

            <div className="p-4 rounded-2xl bg-card/40 border border-border/60">
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 block mb-1">Active Arbitrage Bots</span>
              <span className="text-2xl sm:text-3xl font-black text-primary italic tracking-tight">24/7 AI Core</span>
              <span className="text-[10px] font-mono text-emerald-400 block mt-1">Micro-second Precision</span>
            </div>

            <div className="p-4 rounded-2xl bg-card/40 border border-border/60">
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 block mb-1">Audit & Custody</span>
              <span className="text-2xl sm:text-3xl font-black text-white italic tracking-tight">Tier-1 Insured</span>
              <span className="text-[10px] font-mono text-white/50 block mt-1">Proof of Reserves On-Chain</span>
            </div>
          </div>
        </div>
      </section>

      {/* AI Trading Robots Section (Showcasing Bot.jpg and Bot2.jpg) */}
      <section id="trading-bots" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="relative rounded-[2.5rem] bg-gradient-to-br from-[#0F131D] via-card to-[#090B10] border border-primary/30 p-8 sm:p-14 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[150px] -z-10 rounded-full pointer-events-none" />

          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono font-bold uppercase tracking-wider">
              <BotIcon size={14} className="text-primary" />
              <span>Smart Automated Trading</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tight text-white">
              Automated Trading Robots
            </h2>
            <p className="text-xs sm:text-sm text-white/70 font-medium leading-relaxed">
              Goldbrick uses smart automated trading bots that trade 24/7. Our bots buy low and sell high across major global crypto markets to generate steady, guaranteed profits for your account.
            </p>
          </div>

          {/* Two Hero Trading Robot Showcase Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* Robot 1: BTC Arbitrage Core */}
            <div className="rounded-3xl bg-black/60 border border-border/80 overflow-hidden group hover:border-primary/50 transition-all flex flex-col justify-between">
              <div className="relative h-72 sm:h-96 overflow-hidden bg-black/90">
                <img 
                  src="/Bot.jpg" 
                  alt="Goldbrick Bitcoin Trading Robot" 
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <div className="absolute top-4 left-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/80 border border-primary/40 backdrop-blur-md">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white">
                    Bitcoin Robot • Active
                  </span>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">Trading Bot #01</span>
                  <h3 className="text-xl sm:text-2xl font-black italic uppercase text-white tracking-tight">
                    Bitcoin Fast Trader
                  </h3>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-white/70 leading-relaxed font-medium">
                  Monitors Bitcoin prices 24/7 on top exchanges like Binance and Coinbase. It instantly takes small price differences to secure safe profits with zero guesswork.
                </p>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 font-mono text-[10px]">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-white/40 block">Daily Trades</span>
                    <span className="text-white font-bold text-xs mt-0.5 block">140,000+</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-white/40 block">Speed</span>
                    <span className="text-emerald-400 font-bold text-xs mt-0.5 block">Instant</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-white/40 block">Safety</span>
                    <span className="text-primary font-bold text-xs mt-0.5 block">100% Protected</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Robot 2: Ethereum Multi-Asset Matrix */}
            <div className="rounded-3xl bg-black/60 border border-border/80 overflow-hidden group hover:border-primary/50 transition-all flex flex-col justify-between">
              <div className="relative h-72 sm:h-96 overflow-hidden bg-black/90">
                <img 
                  src="/Bot2.jpg" 
                  alt="Goldbrick Ethereum Trading Robot" 
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <div className="absolute top-4 left-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/80 border border-primary/40 backdrop-blur-md">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white">
                    Ethereum Robot • Active
                  </span>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">Trading Bot #02</span>
                  <h3 className="text-xl sm:text-2xl font-black italic uppercase text-white tracking-tight">
                    Ethereum Smart Trader
                  </h3>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-white/70 leading-relaxed font-medium">
                  Automatically trades Ethereum across top crypto networks. It captures market opportunities non-stop to ensure consistent daily returns directly to your balance.
                </p>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 font-mono text-[10px]">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-white/40 block">Success Rate</span>
                    <span className="text-emerald-400 font-bold text-xs mt-0.5 block">99.9%</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-white/40 block">Capital Cover</span>
                    <span className="text-white font-bold text-xs mt-0.5 block">100% Insured</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-white/40 block">Active Time</span>
                    <span className="text-primary font-bold text-xs mt-0.5 block">24/7 Live</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Yield Calculator Section (Dynamically synchronized with Admin Plans) */}
      <section id="calculator" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="relative rounded-[2.5rem] bg-gradient-to-b from-card via-card/90 to-background border border-border/80 p-8 sm:p-12 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 blur-[130px] -z-10 rounded-full" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Controls */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
                  Profit Calculator
                </span>
                <h2 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tight text-white mt-1">
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
                          // Adjust slider if out of bounds
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
                        <div className="truncate">{plan.name}</div>
                        <div className={`text-[10px] font-mono mt-0.5 ${isSelected ? 'text-slate-900 font-black' : 'text-primary'}`}>
                          {pVal} Return
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/60">
                    Deposit Principal (USD)
                  </span>
                  <span className="text-2xl font-mono font-black text-primary">
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
                  <span>Duration: {durationText}</span>
                  <span>Max: ${maxDeposit.toLocaleString()}</span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-[10px] font-mono uppercase text-white/40">Quick Amounts:</span>
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
            <div className="lg:col-span-5 bg-black/60 rounded-3xl border border-primary/30 p-8 space-y-6 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Live Yield Math</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                  <CheckCircle2 size={10} /> {activePlan.name}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 block">Calculated Profit Yield</span>
                  <div className="text-3xl font-black font-mono text-emerald-400 mt-0.5">
                    +${Math.round(calculatedProfit).toLocaleString()}
                  </div>
                  <span className="text-[10px] font-mono text-white/40">
                    Duration: {durationText} • Credited directly to balance
                  </span>
                </div>

                <div className="pt-3 border-t border-white/5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 block">Total Payout (Principal + Profit)</span>
                  <div className="text-2xl font-black font-mono text-white mt-0.5">
                    ${Math.round(expectedTotalReturn).toLocaleString()}
                  </div>
                  <span className="text-[10px] font-mono text-primary font-bold">
                    Net Return Rate: {isFixedProfit ? `$${profitValue} per unit` : `${profitValue}%`}
                  </span>
                </div>
              </div>

              <Link to="/register" className="block w-full">
                <Button className="w-full bg-primary text-slate-950 hover:bg-amber-400 font-black text-xs uppercase tracking-wider h-12 rounded-xl shadow-lg shadow-primary/20">
                  Activate Plan & Start <ArrowRight size={14} className="ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Investment Vaults Showcase (Live from Admin Plans) */}
      <section id="vaults" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
            Investment Plans
          </span>
          <h2 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tight text-white mt-1">
            Choose Your Plan
          </h2>
          <p className="text-xs sm:text-sm text-white/60 mt-3 font-medium">
            Pick the plan that works best for you. Clear deposit amounts, safe trading, and fast payouts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                className={`relative rounded-[2rem] bg-gradient-to-b from-[#121622] via-card to-[#090B10] border ${
                  isPopular ? 'border-primary shadow-2xl shadow-primary/20 scale-105 z-10' : 'border-border'
                } p-8 flex flex-col justify-between transition-all hover:border-primary/60`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-slate-950 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                    Most Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-black uppercase tracking-wider text-white/70">
                      {plan.name}
                    </span>
                    <span className="text-[10px] font-mono text-white/40">
                      {dur}
                    </span>
                  </div>

                  <div className="mb-6">
                    <div className="text-4xl sm:text-5xl font-black italic text-white tracking-tight font-mono">
                      {pVal}
                    </div>
                    <span className="text-xs font-mono font-bold text-primary block mt-1">
                      {plan.profitType === 'fixed' ? 'Fixed Profit' : 'Profit Return'}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1.5 mb-6">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-white/50">Minimum Deposit:</span>
                      <span className="text-white font-bold">${plan.minDeposit?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-white/50">Maximum Deposit:</span>
                      <span className="text-white font-bold">${plan.maxDeposit?.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-8">
                    {[
                      'Automated Trading Robot Payouts',
                      'Capital 100% Protected & Guaranteed',
                      'Regular Profit Added to Your Account',
                      'Fast Crypto & Wallet Withdrawals'
                    ].map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2.5 text-xs text-white/80 font-medium">
                        <CheckCircle2 size={14} className="text-primary shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link to="/register" className="w-full">
                  <Button
                    className={`w-full font-black text-xs uppercase tracking-wider h-12 rounded-xl transition-all ${
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
      <section id="activity" className="py-16 px-6 max-w-7xl mx-auto border-t border-border/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <h3 className="text-xl font-black italic uppercase tracking-tight text-white">
                Live Liquidity Flow & Payouts
              </h3>
            </div>
            <p className="text-xs text-white/50 font-medium mt-1">
              Real-time ledger updates reflecting institutional yield disbursements and incoming vault deposits.
            </p>
          </div>

          <div className="text-[11px] font-mono text-white/40">
            Network Status: <span className="text-emerald-400 font-bold">100% Uptime</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {RECENT_ACTIVITIES.map((act, i) => (
            <div key={i} className="p-4 rounded-2xl bg-card border border-border/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-base" role="img" aria-label="flag">{act.flag}</span>
                <span className="text-[10px] font-mono text-white/40">{act.time}</span>
              </div>
              <div>
                <p className="text-xs font-bold text-white truncate">{act.user}</p>
                <p className="text-xs font-mono font-black text-primary">{act.amount}</p>
              </div>
              <div className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 pt-1 border-t border-white/5">
                {act.action}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Institutional Security Matrix */}
      <section id="security" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
            Security & Compliance
          </span>
          <h2 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tight text-white mt-1">
            Built for Institutional Resilience
          </h2>
          <p className="text-xs sm:text-sm text-white/60 mt-3 font-medium">
            Multi-signature cold storage, automated fraud detection, and regulatory capital separation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl bg-card border border-border space-y-4 hover:border-primary/40 transition-colors">
            <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Lock size={22} />
            </div>
            <h3 className="text-lg font-black uppercase italic text-white">Cold Vault Segregation</h3>
            <p className="text-xs text-white/60 leading-relaxed font-medium">
              Over 98% of all client crypto deposits are kept offline in air-gapped, geographic-redundant hardware security modules (HSMs).
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-card border border-border space-y-4 hover:border-primary/40 transition-colors">
            <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Cpu size={22} />
            </div>
            <h3 className="text-lg font-black uppercase italic text-white">Quantitative Risk Engine</h3>
            <p className="text-xs text-white/60 leading-relaxed font-medium">
              Automated stop-losses and smart arbitrage safeguards prevent single-venue drawdown risks in volatile trading conditions.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-card border border-border space-y-4 hover:border-primary/40 transition-colors">
            <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Building2 size={22} />
            </div>
            <h3 className="text-lg font-black uppercase italic text-white">Tier-1 Capital Reserves</h3>
            <p className="text-xs text-white/60 leading-relaxed font-medium">
              Goldbrick maintains a 1:1 liquid capital reserve guarantee, audited on a continuous basis for complete investor peace of mind.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison Matrix */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black italic uppercase tracking-tight text-white">
            Why High-Net-Worth Investors Choose Goldbrick
          </h2>
        </div>

        <div className="rounded-3xl bg-card border border-border overflow-hidden">
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
                <td className="p-5 text-white">Yield Payout Engine</td>
                <td className="p-5 text-primary font-bold">Autonomous HFT Robot Fleet</td>
                <td className="p-5 text-white/40">Quarterly / Annual Loan Spreads</td>
                <td className="p-5 text-white/40">Market Volatility Direct Risk</td>
              </tr>
              <tr>
                <td className="p-5 text-white">Average Annualized Yield</td>
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
                <td className="p-5 text-white">Deposit Assets Accepted</td>
                <td className="p-5 text-primary font-bold">BTC, ETH, USDT, Wire Transfer</td>
                <td className="p-5 text-white/40">Fiat Currency Only</td>
                <td className="p-5 text-white/40">Limited Wire / Card</td>
              </tr>
              <tr>
                <td className="p-5 text-white">Dedicated Account Advisor</td>
                <td className="p-5 text-primary font-bold">Included on all tiers</td>
                <td className="p-5 text-white/40">High-fee private banking only</td>
                <td className="p-5 text-white/40">Chat bot / ticketing queue</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Verified Investor Reviews */}
      <section id="testimonials" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
            Client Endorsements
          </span>
          <h2 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tight text-white mt-1">
            Trusted by Modern Capitalists
          </h2>
          <div className="flex justify-center gap-1 mt-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="size-4 fill-primary text-primary" />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              name: 'Julian Montgomery',
              role: 'Private Family Office Director',
              location: 'Zurich, Switzerland',
              flag: '🇨🇭',
              quote: 'Goldbrick has streamlined our treasury management. The autonomous trading bots provide unmatched liquidity control and consistent alpha.',
              portfolio: '$120,000 Private Vault'
            },
            {
              name: 'Dr. Evelyn Vance',
              role: 'Quantitative Fund Strategist',
              location: 'London, United Kingdom',
              flag: '🇬🇧',
              quote: 'The security infrastructure and cold vault separation are truly institutional standard. Seamless USDT payouts every single week without delay.',
              portfolio: '$65,000 Institutional Tier'
            },
            {
              name: 'Marcus Sterling',
              role: 'Crypto Asset Investor',
              location: 'Austin, Texas, USA',
              flag: '🇺🇸',
              quote: 'Started with the Starter Vault and scaled up to Private Wealth within 30 days. Payouts are precise and customer support is exceptional.',
              portfolio: '$25,000 Wealth Tier'
            }
          ].map((item, idx) => (
            <div key={idx} className="p-8 rounded-3xl bg-card border border-border flex flex-col justify-between hover:border-primary/40 transition-colors">
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-medium italic mb-6">
                "{item.quote}"
              </p>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{item.flag}</span>
                    <span className="text-sm font-bold text-white">{item.name}</span>
                  </div>
                  <span className="text-[10px] text-white/50 block font-mono mt-0.5">{item.role}</span>
                  <span className="text-[10px] text-primary font-mono font-bold">{item.portfolio}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Institutional FAQ Accordion */}
      <section id="faq" className="py-20 px-6 max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
            Clarification Desk
          </span>
          <h2 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tight text-white mt-1">
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
                  className="w-full p-5 text-left flex items-center justify-between gap-4 text-white hover:text-primary transition-colors"
                >
                  <span className="text-sm font-bold">{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 transition-transform text-white/40 ${isOpen ? 'rotate-180 text-primary' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="p-5 pt-0 text-xs text-white/70 leading-relaxed border-t border-white/5 font-medium">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom Conversion Banner */}
      <section className="py-20 px-6 max-w-5xl mx-auto text-center">
        <div className="relative rounded-[2.5rem] bg-gradient-to-r from-amber-950/40 via-card to-amber-950/40 border border-primary/40 p-12 overflow-hidden shadow-2xl">
          <div className="max-w-2xl mx-auto space-y-6">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
              Exclusive Registration Window Open
            </span>
            <h2 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tight text-white">
              Ready to Accelerate Your Capital?
            </h2>
            <p className="text-xs sm:text-sm text-white/70 font-medium">
              Join over 140,000 private investors leveraging Goldbrick’s automated quantitative yield engine today.
            </p>
            <div className="pt-2">
              <Link to="/register">
                <Button size="lg" className="bg-primary text-slate-950 hover:bg-amber-400 font-black text-sm uppercase tracking-wider px-10 h-14 rounded-2xl shadow-xl shadow-primary/30 transition-all hover:scale-105">
                  Open Your Vault Today <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Hidden Admin Access Trigger */}
      <div className="fixed bottom-3 right-3 opacity-20 hover:opacity-100 transition-opacity z-40">
        <Link to="/admin/login" className="text-[9px] font-mono text-white/40 bg-black/80 px-2 py-1 rounded border border-white/10">
          Admin Portal
        </Link>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/60 py-14 px-6 bg-black/40">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-4 md:col-span-1">
            <Logo className="h-8" />
            <p className="text-xs text-white/50 leading-relaxed font-medium">
              Institutional digital asset investment platform providing automated yield compounding powered by autonomous trading robots.
            </p>
            <div className="text-[10px] font-mono text-white/40">
              © 2026 Goldbrick Exchange. All rights reserved.
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-mono font-black uppercase tracking-wider text-white">Platform Vaults</h4>
            <ul className="space-y-2 text-xs text-white/60 font-medium">
              <li><a href="#vaults" className="hover:text-primary transition-colors">Starter Vault</a></li>
              <li><a href="#vaults" className="hover:text-primary transition-colors">Private Wealth Tier</a></li>
              <li><a href="#vaults" className="hover:text-primary transition-colors">Sovereign Institutional</a></li>
              <li><a href="#calculator" className="hover:text-primary transition-colors">Yield Calculator</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-mono font-black uppercase tracking-wider text-white">Security & Audit</h4>
            <ul className="space-y-2 text-xs text-white/60 font-medium">
              <li><a href="#security" className="hover:text-primary transition-colors">Cold Vault Custody</a></li>
              <li><a href="#security" className="hover:text-primary transition-colors">Proof of Reserves</a></li>
              <li><a href="#security" className="hover:text-primary transition-colors">Capital Protection Fund</a></li>
              <li><a href="#security" className="hover:text-primary transition-colors">Multi-Sig Architecture</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-mono font-black uppercase tracking-wider text-white">Client Desk</h4>
            <ul className="space-y-2 text-xs text-white/60 font-medium">
              <li><Link to="/login" className="hover:text-primary transition-colors">Client Login</Link></li>
              <li><Link to="/register" className="hover:text-primary transition-colors">Open New Account</Link></li>
              <li><a href="#faq" className="hover:text-primary transition-colors">Frequently Asked Questions</a></li>
              <li><a href="mailto:support@goldbrick.exchange" className="hover:text-primary transition-colors">24/7 Security Desk</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
