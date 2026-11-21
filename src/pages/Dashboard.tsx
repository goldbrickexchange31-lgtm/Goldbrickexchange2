import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Wallet,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  RefreshCcw,
  Zap,
  ShieldCheck,
  ChevronRight,
  Activity,
  History
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import BTCChart from '../components/BTCChart';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  increment,
  writeBatch,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import InactiveAccountModal from '../components/InactiveAccountModal';
import InactiveAccountCard from '../components/InactiveAccountCard';

export default function Dashboard() {
  const { user, userData } = useAuth();
  const [allInvestments, setAllInvestments] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [globalActivity, setGlobalActivity] = useState<any[]>([]);
  const [now, setNow] = useState(new Date());
  const [isInactiveModalOpen, setIsInactiveModalOpen] = useState(false);
  const [activationConfig, setActivationConfig] = useState<any>(null);
  const [latestActivationReq, setLatestActivationReq] = useState<any>(null);
  const navigate = useNavigate();

  const isInactive = userData?.accountStatus === 'inactive';
  const activationFee = activationConfig?.amount ?? 50;
  const activationCurrency = activationConfig?.currency || '$';

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'accountActivation'),
      (snap) => {
        if (snap.exists()) setActivationConfig(snap.data());
      },
      (err) => console.warn('Activation settings note:', err?.message || err)
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!userData?.uid) return;
    const q = query(
      collection(db, 'activationRequests'),
      where('userId', '==', userData.uid),
      orderBy('submittedAt', 'desc'),
      limit(1)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          setLatestActivationReq({ id: snap.docs[0].id, ...snap.docs[0].data() });
        } else {
          setLatestActivationReq(null);
        }
      },
      (err) => console.warn('User activation request note:', err?.message || err)
    );
    return () => unsub();
  }, [userData?.uid]);

  useEffect(() => {
    if (isInactive && userData?.uid) {
      const dismissed = sessionStorage.getItem(`goldbrick_inactive_modal_dismissed_${userData.uid}`);
      if (!dismissed) {
        setIsInactiveModalOpen(true);
      }
    } else {
      setIsInactiveModalOpen(false);
    }
  }, [isInactive, userData?.uid]);

  const handleDismissInactiveModal = () => {
    setIsInactiveModalOpen(false);
    if (userData?.uid) {
      sessionStorage.setItem(`goldbrick_inactive_modal_dismissed_${userData.uid}`, 'true');
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const activeInvestments = React.useMemo(() => {
    return allInvestments.filter((i) => {
      const inv = i as any;
      if (inv.status !== 'active') return false;
      if (inv.expiresAt) {
        try {
          const expiry = inv.expiresAt.toDate();
          return expiry > now;
        } catch {
          return true;
        }
      }
      return true;
    });
  }, [allInvestments, now]);

  useEffect(() => {
    if (!userData) return;

    const invQuery = query(
      collection(db, 'investments'),
      where('userId', '==', userData.uid)
    );

    const unsub = onSnapshot(invQuery, (snapshot) => {
      setAllInvestments(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const txQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', userData.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const unsubTx = onSnapshot(txQuery, (snap) => {
      setRecentTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsub();
      unsubTx();
    };
  }, [userData]);

  useEffect(() => {
    const currencies = ['BTC', 'ETH', 'USDT', 'SOL'];
    const names = ['Arthur', 'Helena', 'Marcus', 'Elena', 'Daniel', 'Sofia', 'Liam'];
    const countries = ['🇺🇸', '🇬🇧', '🇨🇦', '🇦🇺', '🇩🇪', '🇨🇭', '🇦🇪', '🇫🇷', '🇯🇵'];

    const generateRow = () => ({
      id: Math.random().toString(36).substring(2, 8).toUpperCase(),
      type: Math.random() > 0.35 ? 'Deposit' : 'Withdrawal',
      amount: (Math.random() * 7500 + 850).toFixed(2),
      currency: currencies[Math.floor(Math.random() * currencies.length)],
      user: names[Math.floor(Math.random() * names.length)] + ' ' + String.fromCharCode(65 + Math.floor(Math.random() * 26)) + '.',
      country: countries[Math.floor(Math.random() * countries.length)],
      time: 'Just now'
    });

    setGlobalActivity(Array.from({ length: 6 }).map(generateRow));

    const interval = setInterval(() => {
      setGlobalActivity((prev) => [generateRow(), ...prev.slice(0, 5)]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const calculateProgress = (expiresAt: any, createdAt: any) => {
    if (!expiresAt || !createdAt) return 0;
    try {
      const end = expiresAt.toDate().getTime();
      const start = createdAt.toDate().getTime();
      const currentNow = Date.now();
      const total = end - start;
      if (total <= 0) return 100;
      const elapsed = currentNow - start;
      return Math.min(100, Math.max(0, (elapsed / total) * 100));
    } catch {
      return 0;
    }
  };

  const isSettlingRef = React.useRef(false);
  useEffect(() => {
    if (!user || allInvestments.length === 0 || !userData || isSettlingRef.current) return;

    const settleExpired = async () => {
      const currentNow = new Date();
      const expired = allInvestments.filter((inv) => {
        if (inv.status !== 'active' || !inv.expiresAt) return false;
        const expDate = inv.expiresAt.toDate ? inv.expiresAt.toDate() : new Date(inv.expiresAt);
        return expDate <= currentNow;
      });

      if (expired.length === 0) return;

      isSettlingRef.current = true;
      const batch = writeBatch(db);
      let totalProfitToUser = 0;
      let totalReturnToUser = 0;

      expired.forEach((inv) => {
        const invRef = doc(db, 'investments', inv.id);
        batch.update(invRef, { status: 'completed', updatedAt: serverTimestamp() });
        totalProfitToUser += inv.profit || 0;
        totalReturnToUser += (inv.amount || 0) + (inv.profit || 0);
      });

      const userRef = doc(db, 'users', user.uid);
      batch.update(userRef, {
        balance: increment(totalReturnToUser),
        totalProfit: increment(totalProfitToUser)
      });

      try {
        await batch.commit();
        toast.success(`Successfully claimed returns from ${expired.length} matured investment(s)!`);
      } catch (error) {
        console.warn('Auto-settle note:', (error as any)?.message || error);
      } finally {
        isSettlingRef.current = false;
      }
    };

    settleExpired();
  }, [allInvestments, user, userData]);

  const totalEarnings = React.useMemo(() => {
    const realized = (userData?.totalProfit || 0) + (userData?.referralEarnings || 0);
    const unrealized = allInvestments
      .filter((inv) => inv.status === 'active')
      .reduce((sum, inv) => sum + (inv.profit || 0), 0);
    return realized + unrealized;
  }, [userData, allInvestments]);

  return (
    <DashboardLayout>
      <InactiveAccountModal
        isOpen={isInactive && isInactiveModalOpen}
        onClose={handleDismissInactiveModal}
        activationFee={activationFee}
        activationCurrency={activationCurrency}
        hasPendingRequest={latestActivationReq?.status === 'pending'}
      />

      <div className="space-y-6 sm:space-y-8 pb-10">
        {isInactive && (
          <InactiveAccountCard
            activationFee={activationFee}
            activationCurrency={activationCurrency}
            hasPendingRequest={latestActivationReq?.status === 'pending'}
            rejectionReason={latestActivationReq?.status === 'rejected' ? latestActivationReq?.rejectionReason : null}
            submittedAt={latestActivationReq?.submittedAt}
          />
        )}

        {/* Top Welcome & Action Row */}
        <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/[0.08]">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Welcome back, {userData?.displayName?.split(' ')[0] || 'Investor'}
            </h1>
            <p className="text-xs sm:text-sm text-white/50">
              Monitor your vault balance, active staking cycles, and portfolio returns.
            </p>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Button
              onClick={() => navigate('/withdraw')}
              variant="outline"
              className="flex-1 sm:flex-none border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white font-medium text-xs sm:text-sm h-10 px-4 rounded-xl cursor-pointer"
            >
              Withdraw
            </Button>
            <Button
              onClick={() => navigate('/deposit')}
              className="flex-1 sm:flex-none bg-primary text-slate-950 hover:bg-amber-400 font-semibold text-xs sm:text-sm h-10 px-5 rounded-xl shadow-lg shadow-primary/20 cursor-pointer"
            >
              <Plus className="size-4 mr-1.5" /> Deposit
            </Button>
          </div>
        </section>

        {/* Primary KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-[#0A0F18]/90 border-white/10 rounded-2xl hover:border-primary/35 transition-colors">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white/50">Available Balance</span>
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Wallet className="size-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-white tracking-tight">
                ${(userData?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <ShieldCheck className="size-3.5" />
                <span>Ready for staking or withdrawal</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0A0F18]/90 border-white/10 rounded-2xl hover:border-primary/35 transition-colors">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white/50">Total Earnings</span>
                <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <TrendingUp className="size-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-primary tracking-tight">
                ${totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-white/45">Realized &amp; projected yields</div>
            </CardContent>
          </Card>

          <Card className="bg-[#0A0F18]/90 border-white/10 rounded-2xl hover:border-primary/35 transition-colors">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white/50">Total Invested</span>
                <div className="size-8 rounded-lg bg-white/[0.06] text-white/75 flex items-center justify-center">
                  <Activity className="size-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-white tracking-tight">
                ${(userData?.totalInvested || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-white/45">Cumulative capital staked</div>
            </CardContent>
          </Card>

          <Card className="bg-[#0A0F18]/90 border-white/10 rounded-2xl hover:border-primary/35 transition-colors">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white/50">Active Plans</span>
                <div className="size-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Zap className="size-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-white tracking-tight">
                {activeInvestments.length}
              </div>
              <button
                type="button"
                onClick={() => navigate('/invest')}
                className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Open new vault</span>
                <ChevronRight className="size-3.5" />
              </button>
            </CardContent>
          </Card>
        </section>

        {/* Chart & Active Investments */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 xl:col-span-8">
            <BTCChart />
          </div>

          <div className="lg:col-span-5 xl:col-span-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Clock className="text-primary size-4" /> Active Investments
              </h2>
              <button
                type="button"
                onClick={() => navigate('/invest')}
                className="text-xs font-medium text-primary hover:underline cursor-pointer"
              >
                Explore plans
              </button>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto no-scrollbar">
              {activeInvestments.length === 0 ? (
                <div className="p-8 border border-dashed border-white/10 rounded-2xl bg-white/[0.02] text-center space-y-3">
                  <Zap className="size-8 text-white/25 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white">No active investment plans</p>
                    <p className="text-xs text-white/45">Start a cycle to begin earning automated returns.</p>
                  </div>
                  <Button
                    onClick={() => navigate('/invest')}
                    className="bg-primary text-slate-950 hover:bg-amber-400 font-semibold text-xs rounded-xl h-9 px-4 cursor-pointer"
                  >
                    Start Investing
                  </Button>
                </div>
              ) : (
                activeInvestments.map((inv) => {
                  const pct = calculateProgress(inv.expiresAt, inv.createdAt);
                  return (
                    <Card key={inv.id} className="bg-[#0A0F18]/90 border-white/10 rounded-2xl">
                      <CardContent className="p-4 sm:p-5 space-y-4">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="text-xs font-medium text-primary">{inv.planName}</div>
                            <div className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">
                              ${inv.amount?.toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[11px] text-white/45">Expected Return</div>
                            <div className="text-base font-bold font-mono tabular-nums text-emerald-400">
                              +${inv.expectedReturn?.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[11px] text-white/50">
                            <span>Progress ({pct.toFixed(0)}%)</span>
                            <span className="text-amber-300 font-mono">
                              {inv.expiresAt?.toDate
                                ? `Matures ${formatDistanceToNow(inv.expiresAt.toDate(), { addSuffix: true })}`
                                : 'Active'}
                            </span>
                          </div>
                          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-primary transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* Global Activity & Recent History */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Live Network Payouts */}
          <Card className="bg-[#0A0F18]/90 border-white/10 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-white/[0.07] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCcw className="size-4 text-primary" />
                <h3 className="text-sm sm:text-base font-semibold text-white">Live Network Activity</h3>
              </div>
              <span className="text-xs font-medium text-emerald-400">Live Feed</span>
            </div>
            <CardContent className="p-0">
              <div className="divide-y divide-white/[0.06]">
                {globalActivity.map((tx) => (
                  <div key={tx.id} className="px-5 py-3.5 flex items-center justify-between text-xs hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-base shrink-0">{tx.country}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{tx.user}</p>
                        <p className="text-[11px] text-white/45 font-mono">
                          {tx.currency} · {tx.type}
                        </p>
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums shrink-0">
                      <p className={`font-semibold ${tx.type === 'Deposit' ? 'text-primary' : 'text-emerald-400'}`}>
                        {tx.type === 'Deposit' ? '+' : ''}${tx.amount}
                      </p>
                      <p className="text-[10px] text-white/40">{tx.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* My Recent Transactions */}
          <Card className="bg-[#0A0F18]/90 border-white/10 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-white/[0.07] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="size-4 text-primary" />
                <h3 className="text-sm sm:text-base font-semibold text-white">Recent Transactions</h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/transactions')}
                className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View all</span>
                <ChevronRight className="size-3.5" />
              </button>
            </div>
            <CardContent className="p-0">
              <div className="divide-y divide-white/[0.06]">
                {recentTransactions.length === 0 ? (
                  <div className="py-14 px-6 text-center text-xs text-white/45">
                    No transactions recorded yet. Make a deposit to get started.
                  </div>
                ) : (
                  recentTransactions.map((tx) => {
                    const isPendingDepositAmount =
                      tx.type === 'deposit' &&
                      tx.status === 'pending' &&
                      (!tx.amount || Number(tx.amount) <= 0 || tx.amountPendingAdmin);
                    return (
                      <div key={tx.id} className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${
                              tx.type === 'deposit' || tx.type === 'referral_bonus'
                                ? 'bg-primary/10 text-primary'
                                : tx.type === 'withdrawal'
                                ? 'bg-orange-500/10 text-orange-400'
                                : 'bg-emerald-500/10 text-emerald-400'
                            }`}
                          >
                            {tx.type === 'withdrawal' ? (
                              <ArrowUpRight className="size-4" />
                            ) : (
                              <ArrowDownLeft className="size-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white capitalize truncate">
                              {String(tx.type || '').replace('_', ' ')}
                            </p>
                            <p className="text-[11px] text-white/45 font-mono">
                              {tx.createdAt
                                ? formatDistanceToNow(tx.createdAt.toDate(), { addSuffix: true })
                                : 'Just now'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {isPendingDepositAmount ? (
                            <p className="text-xs font-medium text-amber-400">Pending Audit</p>
                          ) : (
                            <p className="text-sm font-semibold font-mono tabular-nums text-white">
                              ${Number(tx.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          )}
                          <p
                            className={`text-[11px] font-medium capitalize ${
                              tx.status === 'approved'
                                ? 'text-emerald-400'
                                : tx.status === 'pending'
                                ? 'text-amber-400'
                                : 'text-red-400'
                            }`}
                          >
                            {tx.status}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
}
