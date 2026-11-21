import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ArrowUpCircle, DollarSign, Wallet, Lock, ShieldCheck, ArrowRight } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch
} from 'firebase/firestore';

export default function WithdrawPage() {
  const { userData } = useAuth();
  const [amount, setAmount] = useState('');
  const [wallet, setWallet] = useState('');
  const [currency, setCurrency] = useState('BTC');
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'general'), (snap) => {
      if (snap.exists()) setConfig(snap.data());
      else setConfig({ minWithdrawal: 100, maxWithdrawal: 50000, withdrawalFee: 10, withdrawalFeeType: 'percentage' });
    });
    return () => unsub();
  }, []);

  const calculateFee = () => {
    if (!config) return 0;
    const val = parseFloat(amount) || 0;
    if (config.withdrawalFeeType === 'fixed') {
      return config.withdrawalFee || 0;
    }
    return (val * (config.withdrawalFee || 0)) / 100;
  };

  const handleWithdraw = async () => {
    if (!userData || !config) return;
    const val = parseFloat(amount);

    if (isNaN(val) || val < (config.minWithdrawal || 0) || val > (config.maxWithdrawal || Infinity)) {
      return toast.error(`Amount must be between $${config.minWithdrawal?.toLocaleString()} and $${config.maxWithdrawal?.toLocaleString()}`);
    }

    if ((userData.balance || 0) < val) {
      return toast.error('Insufficient balance for this withdrawal');
    }

    if (!wallet || wallet.length < 10) {
      return toast.error('Please enter a valid destination wallet address');
    }

    setLoading(true);
    try {
      const fee = calculateFee();
      const netAmount = val - fee;

      if (netAmount <= 0) {
        setLoading(false);
        return toast.error('Amount is too small to cover withdrawal fees');
      }

      const batch = writeBatch(db);

      const userRef = doc(db, 'users', userData.uid);
      batch.update(userRef, {
        balance: increment(-val)
      });

      const txRef = doc(collection(db, 'transactions'));
      batch.set(txRef, {
        userId: userData.uid,
        userName: userData.displayName || 'User',
        userEmail: userData.email,
        type: 'withdrawal',
        amount: val,
        fee,
        netAmount,
        currency,
        walletAddress: wallet,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      await batch.commit().catch((e) => handleFirestoreError(e, OperationType.WRITE, 'Withdrawal Batch'));

      toast.success('Withdrawal request submitted! Waiting for processing.');
      navigate('/transactions');
    } catch {
      toast.error('Withdrawal failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const parsedAmount = parseFloat(amount) || 0;
  const fee = calculateFee();
  const netPayout = Math.max(0, parsedAmount - fee);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-10">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <ArrowUpCircle className="size-3.5" />
              <span>External Payouts</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Withdraw Funds</h1>
            <p className="text-sm text-white/55">
              Transfer available profits or principal directly to your external crypto wallet.
            </p>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-[#0A0F18] border border-white/10 text-xs font-mono tabular-nums">
            <span className="text-white/45 block text-[11px]">Available to Withdraw</span>
            <span className="text-base font-bold text-white">
              ${(userData?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Form (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            <Card className="bg-[#0A0F18]/90 border-white/10 rounded-2xl shadow-xl">
              <CardHeader className="p-5 sm:p-6 pb-4 border-b border-white/[0.06]">
                <CardTitle className="text-base sm:text-lg font-semibold text-white">Payout Details</CardTitle>
                <CardDescription className="text-xs text-white/50">
                  Min: ${config?.minWithdrawal?.toLocaleString() || 100} · Max: ${config?.maxWithdrawal?.toLocaleString() || '50,000'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 space-y-5">
                {/* Currency Selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-white/75">Select Payout Asset</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { code: 'BTC', name: 'Bitcoin' },
                      { code: 'ETH', name: 'Ethereum' },
                      { code: 'USDT', name: 'Tether (USDT)' }
                    ].map((c) => {
                      const active = currency === c.code;
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => setCurrency(c.code)}
                          className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                            active
                              ? 'bg-amber-500/10 border-primary text-white'
                              : 'bg-white/[0.02] border-white/[0.08] text-white/65 hover:border-white/20 hover:text-white'
                          }`}
                        >
                          <div className={`text-sm font-bold font-mono ${active ? 'text-primary' : 'text-white'}`}>
                            {c.code}
                          </div>
                          <div className="text-[11px] text-white/45 mt-0.5">{c.name}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <Label htmlFor="withdrawAmount" className="text-white/75 font-medium">
                      Withdrawal Amount (USD)
                    </Label>
                    <button
                      type="button"
                      onClick={() => setAmount(String(Math.floor(userData?.balance || 0)))}
                      className="text-primary hover:underline font-mono cursor-pointer"
                    >
                      Max: ${(userData?.balance || 0).toLocaleString()}
                    </button>
                  </div>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-primary" />
                    <Input
                      id="withdrawAmount"
                      type="number"
                      placeholder="0.00"
                      className="bg-black/40 border-white/10 h-12 pl-10 rounded-xl font-mono tabular-nums font-bold text-lg text-white"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>

                {/* Wallet Input */}
                <div className="space-y-2">
                  <Label htmlFor="destWallet" className="text-xs font-medium text-white/75">
                    Destination {currency} Wallet Address
                  </Label>
                  <div className="relative">
                    <Wallet className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/40" />
                    <Input
                      id="destWallet"
                      placeholder={`Enter your ${currency} receiving address`}
                      className="bg-black/40 border-white/10 h-12 pl-10 rounded-xl font-mono text-xs sm:text-sm text-white placeholder:text-white/25"
                      value={wallet}
                      onChange={(e) => setWallet(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleWithdraw}
                  disabled={loading || !amount || !wallet}
                  className="w-full h-12 bg-primary text-slate-950 hover:bg-amber-400 font-semibold text-sm rounded-xl shadow-lg shadow-primary/20 cursor-pointer"
                >
                  {loading ? 'Processing Request...' : 'Submit Withdrawal Request'}
                  <ArrowRight className="size-4 ml-1.5" />
                </Button>
              </CardContent>
            </Card>

            <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.07] text-xs text-white/55 leading-relaxed">
              <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
              <span>
                Please verify your receiving address carefully before submitting. Blockchain transfers are irreversible once processed.
              </span>
            </div>
          </div>

          {/* Right Summary (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <Card className="bg-[#0A0F18]/90 border-white/10 rounded-2xl shadow-xl">
              <CardHeader className="p-5 sm:p-6 pb-4 border-b border-white/[0.06]">
                <CardTitle className="text-base font-semibold text-white">Payout Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="space-y-3 text-sm font-mono tabular-nums">
                  <div className="flex justify-between items-center py-2 border-b border-white/[0.06]">
                    <span className="text-xs font-sans text-white/50">Requested Amount</span>
                    <span className="text-white font-semibold">
                      ${parsedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/[0.06]">
                    <span className="text-xs font-sans text-white/50">
                      Network Fee ({config?.withdrawalFeeType === 'fixed' ? 'Fixed' : `${config?.withdrawalFee || 0}%`})
                    </span>
                    <span className="text-red-400 font-semibold">
                      -${fee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 space-y-1">
                  <span className="text-xs text-white/50">Estimated Net Payout</span>
                  <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-emerald-400">
                    ${netPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-xs text-white/45 block">Asset: {currency}</span>
                </div>

                <div className="pt-2 space-y-2 text-xs">
                  <div className="flex justify-between text-white/55">
                    <span>Minimum Withdrawal</span>
                    <span className="font-mono text-white">${config?.minWithdrawal || 100}</span>
                  </div>
                  <div className="flex justify-between text-white/55">
                    <span>Processing Speed</span>
                    <span className="text-emerald-400 font-medium">Under 15 Minutes</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0A0F18]/90 border-white/10 rounded-2xl">
              <CardContent className="p-5 flex items-start gap-3.5">
                <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Lock className="size-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-white">Multi-Signature Cold Vaults</h4>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Every withdrawal passes automated compliance and multi-sig settlement checks to safeguard your assets.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
