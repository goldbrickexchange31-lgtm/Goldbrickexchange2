import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Zap, ShieldCheck, Trophy, Crown, ArrowRight, Gauge, Cpu, Box, Gem, DollarSign, CheckCircle2 } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import {
  collection,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  doc,
  increment,
  query,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

const PLAN_ICONS = [Zap, Cpu, Gauge, Box, Trophy, Gem, Crown, ShieldCheck];

export default function InvestPage() {
  const { userData } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'plans'), (snap) => {
      const fsPlans = snap.docs
        .map((d, index) => ({
          id: d.id,
          ...(d.data() as any),
          icon: PLAN_ICONS[index % PLAN_ICONS.length]
        }))
        .sort((a: any, b: any) => (a.minDeposit || 0) - (b.minDeposit || 0));
      setPlans(fsPlans);
      if (fsPlans.length > 0 && !selectedPlan) {
        setSelectedPlan(fsPlans[0]);
        setAmount(String(fsPlans[0].minDeposit || ''));
      }
    });

    const unsubConfig = onSnapshot(doc(db, 'config', 'general'), (snap) => {
      if (snap.exists()) setConfig(snap.data());
    });

    return () => {
      unsub();
      unsubConfig();
    };
  }, []);

  const handleInvest = async () => {
    if (!userData) return;
    if (!selectedPlan) return toast.error('Please select an investment plan');

    const val = parseFloat(amount);
    if (isNaN(val) || val < (selectedPlan.minDeposit || 0) || val > (selectedPlan.maxDeposit || Infinity)) {
      return toast.error(`Amount must be between $${selectedPlan.minDeposit?.toLocaleString()} and $${selectedPlan.maxDeposit?.toLocaleString()}`);
    }

    if ((userData.balance || 0) < val) {
      return toast.error('Insufficient balance. Please deposit funds first.');
    }

    if (loading) return;

    setLoading(true);
    try {
      const batch = writeBatch(db);
      const expiresAt = new Date();

      if (selectedPlan.durationDays) {
        expiresAt.setDate(expiresAt.getDate() + selectedPlan.durationDays);
      } else if (selectedPlan.durationHours) {
        expiresAt.setHours(expiresAt.getHours() + selectedPlan.durationHours);
      } else {
        expiresAt.setDate(expiresAt.getDate() + 1);
      }

      let profit = 0;
      const profitValue = selectedPlan.profitValue || selectedPlan.dailyROI || selectedPlan.roi || 0;
      const minDeposit = selectedPlan.minDeposit || 1;

      if (selectedPlan.profitType === 'fixed') {
        profit = (val / minDeposit) * profitValue;
      } else {
        profit = (val * profitValue) / 100;
      }

      const expectedReturn = val + profit;

      const investmentRef = doc(collection(db, 'investments'));
      batch.set(investmentRef, {
        userId: userData.uid,
        userName: userData.displayName || 'Investor',
        userEmail: userData.email,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        amount: val,
        minDeposit,
        profit,
        profitValue,
        profitType: selectedPlan.profitType || 'percentage',
        expectedReturn,
        status: 'active',
        durationDays: selectedPlan.durationDays || 0,
        durationHours: selectedPlan.durationHours || 0,
        expiresAt: Timestamp.fromDate(expiresAt),
        createdAt: serverTimestamp()
      });

      if ((userData.totalInvested || 0) === 0 && userData.referredBy) {
        const bonusAmount = config?.referralBonus || 200;
        const referrersQuery = query(collection(db, 'users'), where('referralCode', '==', userData.referredBy));
        const referrerSnap = await getDocs(referrersQuery);

        if (!referrerSnap.empty) {
          const referrerId = referrerSnap.docs[0].id;
          batch.update(doc(db, 'users', referrerId), {
            balance: increment(bonusAmount),
            referralEarnings: increment(bonusAmount)
          });

          const refTxRef = doc(collection(db, 'transactions'));
          batch.set(refTxRef, {
            userId: referrerId,
            userName: referrerSnap.docs[0].data().displayName || 'Referrer',
            userEmail: referrerSnap.docs[0].data().email,
            amount: bonusAmount,
            type: 'referral_bonus',
            status: 'approved',
            description: `Referral bonus from ${userData.displayName}`,
            createdAt: serverTimestamp()
          });
        }
      }

      batch.update(doc(db, 'users', userData.uid), {
        balance: increment(-val),
        totalInvested: increment(val)
      });

      const txRef = doc(collection(db, 'transactions'));
      batch.set(txRef, {
        userId: userData.uid,
        userName: userData.displayName,
        userEmail: userData.email,
        amount: val,
        type: 'investment',
        status: 'approved',
        description: `Staked in ${selectedPlan.name}`,
        createdAt: serverTimestamp()
      });

      await batch.commit().catch((e) => handleFirestoreError(e, OperationType.WRITE, 'Atomic Investment Batch'));

      toast.success(`Investment activated in ${selectedPlan.name}!`);
      navigate('/dashboard');
    } catch (e: any) {
      toast.error(e.message || 'Investment activation failed');
    } finally {
      setLoading(false);
    }
  };

  const parsedAmount = parseFloat(amount) || 0;
  const profitVal = selectedPlan ? (selectedPlan.profitValue || selectedPlan.dailyROI || selectedPlan.roi || 0) : 0;
  const projectedProfit = selectedPlan && parsedAmount > 0
    ? (selectedPlan.profitType === 'fixed'
        ? (parsedAmount / (selectedPlan.minDeposit || 1)) * profitVal
        : (parsedAmount * profitVal) / 100)
    : 0;
  const projectedTotal = parsedAmount + projectedProfit;

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-10">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Gem className="size-3.5" />
              <span>Automated Staking Vaults</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Investment Plans</h1>
            <p className="text-sm text-white/55">
              Select a vault tier and stake funds directly from your available balance.
            </p>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-[#0A0F18] border border-white/10 text-xs font-mono tabular-nums">
            <span className="text-white/45 block text-[11px]">Available Balance</span>
            <span className="text-base font-bold text-white">
              ${(userData?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </header>

        {/* Plan Grid */}
        {plans.length === 0 ? (
          <div className="bg-[#0A0F18]/80 border border-dashed border-white/10 rounded-2xl p-16 text-center text-sm text-white/45">
            No active investment plans available right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {plans.map((plan) => {
              const isSelected = selectedPlan?.id === plan.id;
              const pDisplay =
                plan.profitType === 'fixed'
                  ? `$${plan.profitValue?.toLocaleString()}`
                  : `${plan.profitValue || plan.dailyROI || 0}%`;

              return (
                <Card
                  key={plan.id}
                  onClick={() => {
                    setSelectedPlan(plan);
                    setAmount(String(plan.minDeposit || ''));
                  }}
                  className={`cursor-pointer transition-all rounded-2xl border overflow-hidden ${
                    isSelected
                      ? 'bg-amber-500/[0.08] border-primary shadow-lg shadow-primary/10'
                      : 'bg-[#0A0F18]/90 border-white/10 hover:border-white/25'
                  }`}
                >
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className={`size-10 rounded-xl flex items-center justify-center ${
                          isSelected
                            ? 'bg-primary text-slate-950'
                            : 'bg-white/[0.06] text-primary border border-white/10'
                        }`}
                      >
                        <plan.icon className="size-5" />
                      </div>
                      {isSelected && <CheckCircle2 className="size-5 text-primary" />}
                    </div>
                    <CardTitle className="text-lg font-bold text-white">{plan.name}</CardTitle>
                    <CardDescription className="text-xs font-mono text-primary font-semibold mt-0.5">
                      {pDisplay} {plan.durationHours ? 'Hourly' : 'Cycle'} Return
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 pt-2 space-y-4">
                    <div className="space-y-2 text-xs font-mono tabular-nums border-t border-white/[0.07] pt-3">
                      <div className="flex justify-between">
                        <span className="text-white/45 font-sans">Min Entry</span>
                        <span className="text-white font-semibold">${plan.minDeposit?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/45 font-sans">Max Entry</span>
                        <span className="text-white font-semibold">${plan.maxDeposit?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/45 font-sans">Duration</span>
                        <span className="text-white font-semibold">
                          {plan.durationDays ? `${plan.durationDays} Days` : `${plan.durationHours || 0} Hours`}
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant={isSelected ? 'default' : 'outline'}
                      className={`w-full h-10 rounded-xl text-xs font-semibold cursor-pointer ${
                        isSelected
                          ? 'bg-primary text-slate-950 hover:bg-amber-400'
                          : 'border-white/10 bg-white/[0.03] text-white/80 hover:text-white'
                      }`}
                    >
                      {isSelected ? 'Selected Plan' : 'Select Plan'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Deployment Configuration Panel */}
        {selectedPlan && (
          <Card className="bg-[#0A0F18]/90 border-white/10 rounded-2xl shadow-xl max-w-3xl mx-auto">
            <CardHeader className="p-5 sm:p-6 border-b border-white/[0.07]">
              <CardTitle className="text-lg sm:text-xl font-bold text-white">
                Stake in {selectedPlan.name}
              </CardTitle>
              <CardDescription className="text-xs text-white/50">
                Limits: ${selectedPlan.minDeposit?.toLocaleString()} – ${selectedPlan.maxDeposit?.toLocaleString()} · Duration:{' '}
                {selectedPlan.durationDays ? `${selectedPlan.durationDays} Days` : `${selectedPlan.durationHours || 0} Hours`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <Label htmlFor="stakeAmount" className="text-white/75 font-medium">
                    Investment Amount (USD)
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      const maxAllowed = Math.min(userData?.balance || 0, selectedPlan.maxDeposit || Infinity);
                      setAmount(String(Math.max(selectedPlan.minDeposit || 0, Math.floor(maxAllowed))));
                    }}
                    className="text-primary hover:underline font-mono cursor-pointer"
                  >
                    Use Max Available
                  </button>
                </div>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-primary" />
                  <Input
                    id="stakeAmount"
                    type="number"
                    placeholder="0.00"
                    className="bg-black/40 border-white/10 h-13 pl-11 text-xl font-bold font-mono tabular-nums text-white rounded-xl"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-1">
                  <span className="text-xs text-white/50">Expected Profit</span>
                  <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
                    +${projectedProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-white/45">
                    {selectedPlan.profitType === 'fixed'
                      ? 'Fixed return rate'
                      : `${selectedPlan.profitValue || selectedPlan.dailyROI || 0}% cycle yield`}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-1">
                  <span className="text-xs text-white/50">Total Maturity Payout</span>
                  <div className="text-2xl font-bold font-mono tabular-nums text-white">
                    ${projectedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-white/45">
                    Credited automatically on completion
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                <Button
                  type="button"
                  onClick={handleInvest}
                  disabled={loading || !amount || parsedAmount <= 0}
                  className="w-full sm:w-auto flex-1 h-12 bg-primary text-slate-950 hover:bg-amber-400 font-semibold text-sm rounded-xl shadow-lg shadow-primary/20 cursor-pointer"
                >
                  {loading ? 'Activating Investment...' : 'Confirm & Start Staking'}
                  <ArrowRight className="size-4 ml-1.5" />
                </Button>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-white/55 leading-relaxed">
                <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
                <span>
                  Principal and accrued yields are safeguarded by GoldBrick Reserve Coverage and settle automatically to your wallet at cycle end.
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
