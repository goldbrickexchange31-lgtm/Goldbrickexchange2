import { useState, useEffect } from 'react';
import { Logo } from '../components/Logo';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import {
  ShieldCheck,
  ArrowRight,
  Star,
  Download,
  TrendingUp,
  Lock,
  CheckCircle2,
  Sliders,
  ChevronDown,
  ArrowUpRight,
  Building2,
  Cpu,
  Bot as BotIcon,
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
}

const LIVE_RATES: CryptoRate[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: '$96,420.50', change: '+3.84%' },
  { symbol: 'ETH', name: 'Ethereum', price: '$2,780.12', change: '+2.91%' },
  { symbol: 'SOL', name: 'Solana', price: '$198.45', change: '+5.42%' },
  { symbol: 'BNB', name: 'BNB Smart', price: '$654.80', change: '+1.15%' },
  { symbol: 'XAU', name: 'Gold / oz', price: '$2,894.20', change: '+0.78%' },
  { symbol: 'USDT', name: 'Tether', price: '$1.00', change: '+0.01%' },
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
  { user: 'Liam V.', amount: '$5,000.00', action: 'Vault Deposit', time: '5m ago', flag: '🇺🇸' },
  { user: 'Helena S.', amount: '$28,400.00', action: 'Yield Payout', time: '11m ago', flag: '🇨🇭' },
  { user: 'Dmitri P.', amount: '$8,200.00', action: 'Account Activated', time: '14m ago', flag: '🇦🇪' },
  { user: 'Sophie M.', amount: '$3,450.00', action: 'Yield Payout', time: '18m ago', flag: '🇫🇷' },
];

export default function LandingPage() {
  const { isInstallable, handleInstallClick, showIOSInstructions, setShowIOSInstructions } = usePWA();

  const [adminPlans, setAdminPlans] = useState<any[]>(DEFAULT_FALLBACK_PLANS);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState<number>(0);
  const [calcAmount, setCalcAmount] = useState<number>(5000);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'plans'),
      (snap) => {
        if (!snap.empty) {
          const loaded = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as any) }))
            .sort((a, b) => (a.minDeposit || 0) - (b.minDeposit || 0));
          setAdminPlans(loaded);
          if (loaded[0]?.minDeposit) {
            setCalcAmount(Math.max(500, loaded[0].minDeposit));
          }
        }
      },
      (err) => {
        console.warn('Real plans snapshot notice:', err);
      }
    );

    return () => unsub();
  }, []);

  const activePlan = adminPlans[selectedPlanIndex] || adminPlans[0] || DEFAULT_FALLBACK_PLANS[0];
  const minDeposit = activePlan.minDeposit || 100;
  const maxDeposit = activePlan.maxDeposit || 100000;
  const profitValue = activePlan.profitValue || activePlan.dailyROI || activePlan.roi || 0;
  const isFixedProfit = activePlan.profitType === 'fixed';

  const calculatedProfit = isFixedProfit
    ? (calcAmount / (minDeposit || 1)) * profitValue
    : (calcAmount * profitValue) / 100;

  const durationText = activePlan.durationDays
    ? `${activePlan.durationDays} Days`
    : activePlan.durationHours
    ? `${activePlan.durationHours} Hours`
    : '8-Hour Cycle';

  const expectedTotalReturn = calcAmount + calculatedProfit;

  const faqs = [
    {
      q: 'How does Goldbrick generate consistent investment profits?',
      a: 'Goldbrick deploys automated trading robots operating 24/7 across major exchanges like Binance and Coinbase, capturing liquidity spreads with strict capital controls.'
    },
    {
      q: 'Are the plans and returns displayed here live?',
      a: 'Yes. Every investment tier, entry range, duration cycle, and projected return updates live from our active platform database.'
    },
    {
      q: 'How quickly are crypto withdrawals processed?',
      a: 'Withdrawals operate 24/7. Bitcoin, Ethereum, and USDT transfers are routed directly to your external wallet, typically settling in under 15 minutes.'
    },
    {
      q: 'How are deposited funds protected?',
      a: 'Over 98% of client reserves are held in offline cold hardware vaults backed by our 1:1 liquidity reserve guarantee.'
    }
  ];

  return (
    <div className="min-h-screen relative bg-[#05080D] text-white font-sans overflow-x-hidden selection:bg-primary/20 selection:text-primary w-full">
      <Cinematic3DBackground />
      <AmbientGoldLighting />
      <IOSInstallGuide
        isOpen={showIOSInstructions}
        onClose={() => setShowIOSInstructions(false)}
      />

      <div className="relative z-10 w-full">
        {/* Top Market Feed Bar */}
        <div className="w-full bg-[#05080D]/80 border-b border-white/[0.06] py-2 px-4 backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs overflow-x-auto no-scrollbar gap-6">
            <div className="flex items-center gap-2 shrink-0">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-mono font-medium text-emerald-400">
                Markets Live
              </span>
            </div>

            <div className="flex items-center gap-5 shrink-0 font-mono tabular-nums text-[11px]">
              {LIVE_RATES.map((rate) => (
                <div key={rate.symbol} className="flex items-center gap-1.5">
                  <span className="font-semibold text-white/90">{rate.symbol}</span>
                  <span className="text-white/65">{rate.price}</span>
                  <span className="text-emerald-400 flex items-center">
                    <ArrowUpRight size={11} className="mr-0.5" />
                    {rate.change}
                  </span>
                </div>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-1.5 text-white/50 text-[11px] font-mono shrink-0">
              <ShieldCheck size={13} className="text-primary" />
              <span>256-Bit SSL Custody</span>
            </div>
          </div>
        </div>

        {/* Sticky Navigation Header */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#05080D]/85 border-b border-white/[0.08]">
          <nav className="flex items-center justify-between px-4 sm:px-6 h-16 max-w-7xl mx-auto w-full">
            <Link to="/" className="flex items-center shrink-0">
              <Logo className="h-8 sm:h-9" />
            </Link>

            <div className="hidden md:flex items-center gap-7 text-xs font-medium text-white/70">
              <a href="#vaults" className="hover:text-white transition-colors">Plans</a>
              <a href="#calculator" className="hover:text-white transition-colors">Calculator</a>
              <a href="#trading-bots" className="hover:text-white transition-colors">Trading Bots</a>
              <a href="#security" className="hover:text-white transition-colors">Security</a>
              <a href="#activity" className="hover:text-white transition-colors">Activity</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            </div>

            <div className="hidden sm:flex items-center gap-2.5">
              {isInstallable && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInstallClick}
                  className="hidden lg:flex border-primary/40 text-primary hover:bg-primary/10 font-medium h-9 px-3 rounded-xl text-xs gap-1.5 cursor-pointer"
                >
                  <Download size={13} />
                  <span>Install</span>
                </Button>
              )}
              <Link to="/login">
                <Button
                  variant="ghost"
                  className="text-xs font-medium text-white/80 hover:text-white hover:bg-white/[0.06] h-9 px-3.5 rounded-xl cursor-pointer"
                >
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button className="bg-primary text-slate-950 hover:bg-amber-400 font-semibold text-xs h-9 px-4 rounded-xl shadow-lg shadow-primary/20 cursor-pointer">
                  Open Account
                </Button>
              </Link>
            </div>

            <div className="flex sm:hidden items-center gap-2">
              <Link to="/register">
                <Button size="sm" className="bg-primary text-slate-950 font-semibold text-xs h-8 px-3 rounded-lg">
                  Register
                </Button>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg bg-white/[0.05] border border-white/10 text-white hover:text-primary"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </nav>

          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="sm:hidden border-b border-white/10 bg-[#080C14]/98 px-5 py-4 space-y-4 backdrop-blur-2xl"
              >
                <div className="flex flex-col space-y-2.5 text-sm font-medium text-white/80">
                  <a href="#vaults" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary py-1">Investment Plans</a>
                  <a href="#calculator" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary py-1">Profit Calculator</a>
                  <a href="#trading-bots" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary py-1">Trading Bots</a>
                  <a href="#security" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary py-1">Security &amp; Protection</a>
                  <a href="#activity" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary py-1">Live Activity</a>
                  <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary py-1">FAQ</a>
                </div>

                <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full border-white/10 text-white text-xs font-semibold h-10 rounded-xl">
                      Client Sign In
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-primary text-slate-950 font-semibold text-xs h-10 rounded-xl">
                      Open Free Account
                    </Button>
                  </Link>
                  {isInstallable && (
                    <Button
                      variant="ghost"
                      onClick={() => { setMobileMenuOpen(false); handleInstallClick(); }}
                      className="w-full text-primary text-xs font-medium gap-2 h-9"
                    >
                      <Download size={14} /> Install GoldBrick App
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* Hero Section */}
        <section className="relative pt-14 sm:pt-20 md:pt-24 pb-16 sm:pb-20 px-4 sm:px-6 max-w-6xl mx-auto w-full">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <p className="text-xs sm:text-sm font-medium text-amber-300/90 mb-4 tracking-wide">
              Automated Multi-Asset Staking · Cold Hardware Custody
            </p>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-5 [text-wrap:balance]">
              <span className="text-white">Financial Freedom,</span>{' '}
              <span className="bg-gradient-to-r from-[#FDE68A] via-[#F59E0B] to-[#D97706] bg-clip-text text-transparent">
                Engineered Clearly.
              </span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-white/70 max-w-2xl leading-relaxed mb-8">
              Grow your digital assets with 24/7 automated market bots, transparent cycle yields, cold-vault custody, and instant crypto settlements.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-stretch sm:items-center justify-center max-w-sm sm:max-w-none">
              <Link to="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-primary text-slate-950 hover:bg-amber-400 font-semibold text-sm px-7 h-12 rounded-xl shadow-xl shadow-primary/25 gap-2 cursor-pointer">
                  <span>Start Investing Now</span>
                  <ArrowRight size={16} />
                </Button>
              </Link>

              <a href="#calculator" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-white font-medium text-sm px-6 h-12 rounded-xl backdrop-blur-md gap-2 cursor-pointer">
                  <Sliders size={15} className="text-primary" />
                  <span>Calculate Profit</span>
                </Button>
              </a>
            </div>
          </div>

          {/* Clean Structured Metric Ledger */}
          <div className="mt-14 sm:mt-16 rounded-2xl bg-[#0A0F18]/85 backdrop-blur-md border border-white/10 grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08] overflow-hidden">
            <div className="p-5 sm:p-6">
              <span className="text-xs text-white/45 block mb-1">Assets Under Custody</span>
              <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-white">$3.84B+</span>
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 mt-1">
                <TrendingUp size={12} /> +18.4% YoY
              </span>
            </div>

            <div className="p-5 sm:p-6">
              <span className="text-xs text-white/45 block mb-1">Verified Investors</span>
              <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-white">142,800+</span>
              <span className="text-xs text-white/50 block mt-1">Across 86 countries</span>
            </div>

            <div className="p-5 sm:p-6">
              <span className="text-xs text-white/45 block mb-1">Execution Engine</span>
              <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-primary">24/7 Live</span>
              <span className="text-xs text-emerald-400 block mt-1">Automated arbitrage</span>
            </div>

            <div className="p-5 sm:p-6">
              <span className="text-xs text-white/45 block mb-1">Reserve Protection</span>
              <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-white">100% Insured</span>
              <span className="text-xs text-white/50 block mt-1">Cold hardware vaults</span>
            </div>
          </div>
        </section>

        {/* Automated Trading Robots Section */}
        <section id="trading-bots" className="py-16 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
          <div className="rounded-3xl bg-[#0A0F18]/85 backdrop-blur-md border border-white/10 p-6 sm:p-10 lg:p-12 shadow-2xl">
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12 space-y-2.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                <BotIcon size={15} />
                <span>Automated Execution</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
                Automated Trading Robots
              </h2>
              <p className="text-sm text-white/65 leading-relaxed">
                Continuous algorithmic execution across major crypto liquidity venues to generate consistent returns with strict risk limits.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Robot 01 */}
              <div className="rounded-2xl bg-[#05080D]/80 border border-white/10 overflow-hidden group hover:border-primary/40 transition-colors flex flex-col justify-between">
                <div className="relative h-64 sm:h-80 overflow-hidden bg-black">
                  <img
                    src="/Bot.jpg"
                    alt="Goldbrick Bitcoin Trading Robot"
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#05080D] via-black/25 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-mono text-primary font-medium block">01 · Bitcoin Core</span>
                      <h3 className="text-xl font-bold text-white">Bitcoin Fast Trader</h3>
                    </div>
                    <span className="text-xs font-medium text-emerald-400">Active</span>
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-4">
                  <p className="text-sm text-white/65 leading-relaxed">
                    Scans Bitcoin order books 24/7 across Binance and Coinbase, capturing micro-arbitrage spreads with automated execution.
                  </p>

                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/[0.07] font-mono tabular-nums text-xs">
                    <div>
                      <span className="text-white/45 block text-[11px] font-sans">Daily Trades</span>
                      <span className="text-white font-semibold mt-0.5 block">140,000+</span>
                    </div>
                    <div>
                      <span className="text-white/45 block text-[11px] font-sans">Execution</span>
                      <span className="text-emerald-400 font-semibold mt-0.5 block">Instant</span>
                    </div>
                    <div>
                      <span className="text-white/45 block text-[11px] font-sans">Coverage</span>
                      <span className="text-primary font-semibold mt-0.5 block">100% Insured</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Robot 02 */}
              <div className="rounded-2xl bg-[#05080D]/80 border border-white/10 overflow-hidden group hover:border-primary/40 transition-colors flex flex-col justify-between">
                <div className="relative h-64 sm:h-80 overflow-hidden bg-black">
                  <img
                    src="/Bot2.jpg"
                    alt="Goldbrick Ethereum Trading Robot"
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#05080D] via-black/25 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-mono text-primary font-medium block">02 · Ethereum Desk</span>
                      <h3 className="text-xl font-bold text-white">Ethereum Smart Trader</h3>
                    </div>
                    <span className="text-xs font-medium text-emerald-400">Active</span>
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-4">
                  <p className="text-sm text-white/65 leading-relaxed">
                    Balances Ethereum liquidity pools non-stop to capture institutional spreads and credit reliable cycle yields directly to your wallet.
                  </p>

                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/[0.07] font-mono tabular-nums text-xs">
                    <div>
                      <span className="text-white/45 block text-[11px] font-sans">Success Rate</span>
                      <span className="text-emerald-400 font-semibold mt-0.5 block">99.9%</span>
                    </div>
                    <div>
                      <span className="text-white/45 block text-[11px] font-sans">Capital Cover</span>
                      <span className="text-white font-semibold mt-0.5 block">100% Insured</span>
                    </div>
                    <div>
                      <span className="text-white/45 block text-[11px] font-sans">Availability</span>
                      <span className="text-primary font-semibold mt-0.5 block">24/7 Live</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Yield Calculator */}
        <section id="calculator" className="py-16 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
          <div className="rounded-3xl bg-[#0A0F18]/90 backdrop-blur-md border border-white/10 p-6 sm:p-10 shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-6">
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-primary">Profit Calculator</span>
                  <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
                    Calculate Your Returns
                  </h2>
                  <p className="text-sm text-white/60">
                    Select an active plan and adjust your investment amount to preview your projected payout.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/65 block">Choose an Investment Plan</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {adminPlans.map((plan, idx) => {
                      const isSelected = selectedPlanIndex === idx;
                      const pVal =
                        plan.profitType === 'fixed'
                          ? `$${plan.profitValue?.toLocaleString()}`
                          : `${plan.profitValue || plan.dailyROI || 0}%`;
                      return (
                        <button
                          key={plan.id || idx}
                          type="button"
                          onClick={() => {
                            setSelectedPlanIndex(idx);
                            if (calcAmount < (plan.minDeposit || 100)) {
                              setCalcAmount(plan.minDeposit || 100);
                            } else if (calcAmount > (plan.maxDeposit || 100000)) {
                              setCalcAmount(plan.maxDeposit || 100000);
                            }
                          }}
                          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-primary text-slate-950 border-primary font-semibold shadow-md'
                              : 'bg-white/[0.03] border-white/10 text-white/80 hover:bg-white/[0.07]'
                          }`}
                        >
                          <div className="truncate text-sm font-semibold">{plan.name}</div>
                          <div className={`text-xs font-mono mt-0.5 ${isSelected ? 'text-slate-900 font-bold' : 'text-primary'}`}>
                            {pVal} Return
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white/65">Investment Amount (USD)</span>
                    <span className="text-2xl font-mono tabular-nums font-bold text-primary">
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
                    className="w-full accent-primary h-2 bg-white/10 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-xs font-mono tabular-nums text-white/45">
                    <span>Min: ${minDeposit.toLocaleString()}</span>
                    <span className="hidden sm:inline">Duration: {durationText}</span>
                    <span>Max: ${maxDeposit.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-white/45 mr-1">Quick Amounts:</span>
                  {[minDeposit, Math.round(minDeposit * 2), Math.round(minDeposit * 5), Math.min(maxDeposit, 25000), maxDeposit]
                    .filter((v, i, arr) => arr.indexOf(v) === i && v >= minDeposit && v <= maxDeposit)
                    .map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCalcAmount(preset)}
                        className="px-3 py-1 rounded-lg text-xs font-mono tabular-nums bg-white/[0.04] border border-white/10 text-white/75 hover:border-primary/50 hover:text-white cursor-pointer"
                      >
                        ${preset.toLocaleString()}
                      </button>
                    ))}
                </div>
              </div>

              <div className="lg:col-span-5 bg-[#05080D]/85 rounded-2xl border border-primary/30 p-6 sm:p-7 space-y-5">
                <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
                  <span className="text-xs font-medium text-white/50">Estimated Returns</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                    <CheckCircle2 size={13} />
                    <span>{activePlan.name}</span>
                  </span>
                </div>

                <div className="space-y-4 font-mono tabular-nums">
                  <div>
                    <span className="text-xs font-sans text-white/50 block">Projected Profit</span>
                    <div className="text-3xl font-bold text-emerald-400 mt-1">
                      +${Math.round(calculatedProfit).toLocaleString()}
                    </div>
                    <span className="text-xs font-sans text-white/45 mt-1 block">
                      Duration: {durationText} · Settled to balance
                    </span>
                  </div>

                  <div className="pt-4 border-t border-white/[0.07]">
                    <span className="text-xs font-sans text-white/50 block">Total Return (Principal + Profit)</span>
                    <div className="text-2xl font-bold text-white mt-1">
                      ${Math.round(expectedTotalReturn).toLocaleString()}
                    </div>
                    <span className="text-xs text-primary font-medium mt-1 block">
                      Rate: {isFixedProfit ? `$${profitValue} per unit` : `${profitValue}%`}
                    </span>
                  </div>
                </div>

                <Link to="/register" className="block w-full pt-1">
                  <Button className="w-full bg-primary text-slate-950 hover:bg-amber-400 font-semibold text-sm h-11 rounded-xl shadow-lg shadow-primary/20 cursor-pointer">
                    Start Earning With This Plan <ArrowRight size={15} className="ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Investment Vaults Showcase */}
        <section id="vaults" className="py-16 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-medium text-primary">Investment Plans</span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
              Choose Your Investment Plan
            </h2>
            <p className="text-sm text-white/60">
              Transparent entry limits, automated execution cycles, and fast withdrawals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminPlans.map((plan, idx) => {
              const isPopular = idx === 1 || adminPlans.length === 1;
              const pVal =
                plan.profitType === 'fixed'
                  ? `$${plan.profitValue?.toLocaleString()}`
                  : `${plan.profitValue || plan.dailyROI || 0}%`;
              const dur = plan.durationDays
                ? `${plan.durationDays} Days`
                : plan.durationHours
                ? `${plan.durationHours} Hours`
                : '8-Hour Cycle';

              return (
                <div
                  key={plan.id || idx}
                  className={`relative rounded-2xl bg-[#0A0F18]/90 border ${
                    isPopular ? 'border-primary/70 shadow-2xl shadow-primary/10' : 'border-white/10'
                  } p-6 sm:p-7 flex flex-col justify-between transition-colors hover:border-primary/50`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span className="text-sm font-semibold text-white truncate">{plan.name}</span>
                      <span className="text-xs font-mono text-white/50 shrink-0">{dur}</span>
                    </div>

                    <div className="mb-5">
                      <div className="text-4xl font-bold font-mono tabular-nums text-white tracking-tight">
                        {pVal}
                      </div>
                      <span className="text-xs font-medium text-primary block mt-1">
                        {plan.profitType === 'fixed' ? 'Fixed Profit' : 'Cycle Return'}
                        {isPopular ? ' · Most Popular' : ''}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-2 mb-5 text-xs font-mono tabular-nums">
                      <div className="flex justify-between">
                        <span className="text-white/50 font-sans">Minimum Deposit</span>
                        <span className="text-white font-semibold">${plan.minDeposit?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/50 font-sans">Maximum Deposit</span>
                        <span className="text-white font-semibold">${plan.maxDeposit?.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="space-y-2.5 mb-7">
                      {[
                        'Automated Trading Robot Payouts',
                        '100% Reserve-Backed Principal',
                        'Scheduled Profits Credited Automatically',
                        'Fast Crypto Wallet Withdrawals'
                      ].map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-2.5 text-xs text-white/75">
                          <CheckCircle2 size={14} className="text-primary shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Link to="/register" className="w-full">
                    <Button
                      className={`w-full font-semibold text-xs sm:text-sm h-11 rounded-xl cursor-pointer ${
                        isPopular
                          ? 'bg-primary text-slate-950 hover:bg-amber-400 shadow-lg shadow-primary/20'
                          : 'bg-white/[0.07] text-white hover:bg-white/[0.14] border border-white/10'
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

        {/* Live Global Activity Strip */}
        <section id="activity" className="py-14 sm:py-16 px-4 sm:px-6 max-w-7xl mx-auto border-t border-white/[0.07] w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-7">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-400" />
                Recent Liquidity &amp; Payouts
              </h3>
              <p className="text-xs text-white/50 mt-1">
                Live member deposits, account activations, and scheduled withdrawals.
              </p>
            </div>

            <div className="text-xs font-mono text-white/50">
              System Status: <span className="text-emerald-400 font-semibold">100% Operational</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {RECENT_ACTIVITIES.map((act, i) => (
              <div key={i} className="p-4 rounded-xl bg-[#0A0F18]/90 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-base" role="img" aria-label="country">{act.flag}</span>
                  <span className="text-[11px] font-mono text-white/45">{act.time}</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-white truncate">{act.user}</p>
                  <p className="text-sm font-mono tabular-nums font-bold text-primary mt-0.5">{act.amount}</p>
                </div>
                <div className="text-[11px] text-emerald-400 pt-1.5 border-t border-white/[0.06] truncate">
                  {act.action}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Security & Protection */}
        <section id="security" className="py-16 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-medium text-primary">Security Architecture</span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
              Built to Protect Your Funds
            </h2>
            <p className="text-sm text-white/60">
              Offline cold-vault custody, automated risk limits, and full reserve backing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#0A0F18]/90 border border-white/10 space-y-3 hover:border-primary/40 transition-colors">
              <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Lock size={20} />
              </div>
              <h3 className="text-base font-semibold text-white">Cold Vault Storage</h3>
              <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                Over 98% of platform reserves are secured offline inside multi-signature cold hardware vaults isolated from network risk.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0A0F18]/90 border border-white/10 space-y-3 hover:border-primary/40 transition-colors">
              <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Cpu size={20} />
              </div>
              <h3 className="text-base font-semibold text-white">Smart Risk Controls</h3>
              <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                Automated stop-loss and exposure caps protect member capital around the clock during volatile market swings.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0A0F18]/90 border border-white/10 space-y-3 hover:border-primary/40 transition-colors">
              <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Building2 size={20} />
              </div>
              <h3 className="text-base font-semibold text-white">1:1 Reserve Guarantee</h3>
              <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                GoldBrick maintains full 1:1 liquid reserve coverage across all client balances so withdrawals remain rapid anytime.
              </p>
            </div>
          </div>
        </section>

        {/* Comparison Matrix */}
        <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-5xl mx-auto w-full">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Why Investors Choose GoldBrick
            </h2>
          </div>

          <div className="hidden md:block rounded-2xl bg-[#0A0F18]/90 border border-white/10 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.04] border-b border-white/[0.08]">
                <tr>
                  <th className="p-5 font-medium text-white/50">Standard</th>
                  <th className="p-5 font-semibold text-primary">GoldBrick Exchange</th>
                  <th className="p-5 font-medium text-white/45">Traditional Bank</th>
                  <th className="p-5 font-medium text-white/45">Retail Broker</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                <tr>
                  <td className="p-5 text-white font-medium">Execution Engine</td>
                  <td className="p-5 text-primary font-semibold">24/7 Automated Robot Fleet</td>
                  <td className="p-5 text-white/45">Quarterly Loan Spreads</td>
                  <td className="p-5 text-white/45">Manual Market Exposure</td>
                </tr>
                <tr>
                  <td className="p-5 text-white font-medium">Withdrawal Speed</td>
                  <td className="p-5 text-emerald-400 font-semibold">Instant to 15 Minutes</td>
                  <td className="p-5 text-white/45">3 – 5 Business Days</td>
                  <td className="p-5 text-white/45">1 – 3 Business Days</td>
                </tr>
                <tr>
                  <td className="p-5 text-white font-medium">Funding Options</td>
                  <td className="p-5 text-white font-semibold">BTC, ETH, USDT, Multi-Chain</td>
                  <td className="p-5 text-white/45">Fiat Wire Only</td>
                  <td className="p-5 text-white/45">Limited Card / Wire</td>
                </tr>
                <tr>
                  <td className="p-5 text-white font-medium">Client Support</td>
                  <td className="p-5 text-primary font-semibold">24/7 Direct Priority Desk</td>
                  <td className="p-5 text-white/45">High-fee private banking</td>
                  <td className="p-5 text-white/45">Automated ticket queue</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-3 md:hidden">
            {[
              { title: 'Execution Engine', goldbrick: '24/7 Automated Robot Fleet', bank: 'Quarterly Spreads', broker: 'Manual Exposure' },
              { title: 'Withdrawal Speed', goldbrick: 'Instant to 15 Minutes', bank: '3 – 5 Business Days', broker: '1 – 3 Business Days' },
              { title: 'Funding Options', goldbrick: 'BTC, ETH, USDT, Multi-Chain', bank: 'Fiat Wire Only', broker: 'Limited Card / Wire' },
              { title: 'Client Support', goldbrick: '24/7 Direct Priority Desk', bank: 'Private banking only', broker: 'Ticket queue' },
            ].map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-[#0A0F18]/90 border border-white/10 space-y-2 text-xs">
                <span className="font-medium text-white/50 block">{item.title}</span>
                <div className="flex justify-between items-center py-1 border-b border-white/[0.06]">
                  <span className="text-primary font-semibold">GoldBrick</span>
                  <span className="text-white font-medium text-right">{item.goldbrick}</span>
                </div>
                <div className="flex justify-between items-center text-white/45">
                  <span>Traditional Bank</span>
                  <span>{item.bank}</span>
                </div>
                <div className="flex justify-between items-center text-white/45">
                  <span>Retail Broker</span>
                  <span>{item.broker}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="py-16 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-medium text-primary">Client Feedback</span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
              Trusted by Global Investors
            </h2>
            <div className="flex justify-center gap-1 pt-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="size-4 fill-primary text-primary" />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Julian Montgomery',
                location: 'Zurich, Switzerland',
                flag: '🇨🇭',
                quote: 'GoldBrick made managing automated crypto returns seamless. Withdrawals settle reliably without unnecessary friction.',
                portfolio: '$120,000 Active Vault'
              },
              {
                name: 'Dr. Evelyn Vance',
                location: 'London, United Kingdom',
                flag: '🇬🇧',
                quote: 'Cold hardware custody and clear audit tracking give me real confidence. My USDT payouts arrive within minutes.',
                portfolio: '$65,000 Active Plan'
              },
              {
                name: 'Marcus Sterling',
                location: 'Austin, Texas, USA',
                flag: '🇺🇸',
                quote: 'Started on the Starter Vault and scaled up within my first month. The support team replies quickly whenever needed.',
                portfolio: '$25,000 Active Plan'
              }
            ].map((item, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-[#0A0F18]/90 border border-white/10 flex flex-col justify-between space-y-5">
                <p className="text-sm text-white/75 leading-relaxed">
                  &ldquo;{item.quote}&rdquo;
                </p>

                <div className="pt-4 border-t border-white/[0.07]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{item.flag}</span>
                    <span className="text-sm font-semibold text-white">{item.name}</span>
                  </div>
                  <span className="text-xs text-white/45 block mt-0.5">{item.location}</span>
                  <span className="text-xs text-primary font-mono font-medium block mt-1">{item.portfolio}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-16 sm:py-20 px-4 sm:px-6 max-w-4xl mx-auto w-full">
          <div className="text-center mb-10 space-y-1.5">
            <span className="text-xs font-medium text-primary">Help Center</span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl bg-[#0A0F18]/90 border border-white/10 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 text-white hover:text-primary transition-colors cursor-pointer"
                  >
                    <span className="text-sm font-semibold">{faq.q}</span>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 transition-transform text-white/45 ${isOpen ? 'rotate-180 text-primary' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-2 text-xs sm:text-sm text-white/65 leading-relaxed border-t border-white/[0.06]">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-14 sm:py-20 px-4 sm:px-6 max-w-5xl mx-auto text-center w-full">
          <div className="rounded-3xl bg-gradient-to-br from-amber-500/15 via-[#0A0F18]/90 to-[#0A0F18]/90 backdrop-blur-md border border-primary/35 p-8 sm:p-12 shadow-2xl space-y-5">
            <span className="text-xs font-medium text-primary">Open Membership</span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
              Ready to Grow Your Digital Portfolio?
            </h2>
            <p className="text-sm text-white/65 max-w-xl mx-auto">
              Join over 140,000 members investing securely with GoldBrick&apos;s automated vaults.
            </p>
            <div className="pt-2">
              <Link to="/register">
                <Button size="lg" className="w-full sm:w-auto bg-primary text-slate-950 hover:bg-amber-400 font-semibold text-sm px-8 h-12 rounded-xl shadow-xl shadow-primary/25 cursor-pointer">
                  Open Your Account <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Discreet Admin Link */}
        <div className="fixed bottom-3 right-3 opacity-20 hover:opacity-100 transition-opacity z-40">
          <Link to="/admin/login" className="text-[10px] font-mono text-white/50 bg-black/80 px-2 py-1 rounded border border-white/10">
            Admin
          </Link>
        </div>

        {/* Footer */}
        <footer className="border-t border-white/[0.08] py-12 px-4 sm:px-6 bg-[#05080D]/80 backdrop-blur-md w-full">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-3 sm:col-span-2 md:col-span-1">
              <Logo className="h-8" />
              <p className="text-xs text-white/50 leading-relaxed">
                Multi-asset digital investment platform with automated execution and cold hardware custody.
              </p>
              <div className="text-xs font-mono text-white/40">
                &copy; 2026 GoldBrick Exchange. All rights reserved.
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-white">Investment Plans</h4>
              <ul className="space-y-2 text-xs text-white/55">
                <li><a href="#vaults" className="hover:text-primary transition-colors">Starter Vault</a></li>
                <li><a href="#vaults" className="hover:text-primary transition-colors">Private Wealth Tier</a></li>
                <li><a href="#vaults" className="hover:text-primary transition-colors">Sovereign Institutional</a></li>
                <li><a href="#calculator" className="hover:text-primary transition-colors">Profit Calculator</a></li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-white">Safety &amp; Custody</h4>
              <ul className="space-y-2 text-xs text-white/55">
                <li><a href="#security" className="hover:text-primary transition-colors">Cold Vaults</a></li>
                <li><a href="#security" className="hover:text-primary transition-colors">Reserve Coverage</a></li>
                <li><a href="#security" className="hover:text-primary transition-colors">Risk Controls</a></li>
                <li><Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-white">Client Portal</h4>
              <ul className="space-y-2 text-xs text-white/55">
                <li><Link to="/login" className="hover:text-primary transition-colors">Client Sign In</Link></li>
                <li><Link to="/register" className="hover:text-primary transition-colors">Open Account</Link></li>
                <li><a href="#faq" className="hover:text-primary transition-colors">Help &amp; FAQ</a></li>
                <li><Link to="/support" className="hover:text-primary transition-colors">24/7 Support Desk</Link></li>
              </ul>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
