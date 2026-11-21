import { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../components/ui/table';
import { ArrowDownLeft, ArrowUpRight, History, ShieldCheck, Clock, AlertCircle, Eye, ArrowRight } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import ProofLightboxModal from '../components/ProofLightboxModal';

export default function TransactionsPage() {
  const { userData } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activationRequests, setActivationRequests] = useState<any[]>([]);
  const [selectedProof, setSelectedProof] = useState<any>(null);

  useEffect(() => {
    if (!userData) return;
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userData.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const qAct = query(
      collection(db, 'activationRequests'),
      where('userId', '==', userData.uid),
      orderBy('submittedAt', 'desc')
    );
    const unsubAct = onSnapshot(
      qAct,
      (snap) => {
        setActivationRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        console.warn('Activation requests ledger note:', err?.message || err);
      }
    );

    return () => {
      unsub();
      unsubAct();
    };
  }, [userData]);

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25';
      case 'pending':
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/25';
      case 'rejected':
        return 'bg-red-500/15 text-red-400 border border-red-500/25';
      default:
        return 'bg-white/10 text-white/60 border border-white/10';
    }
  };

  const isPendingDepositAudit = (tx: any) =>
    tx.type === 'deposit' &&
    tx.status === 'pending' &&
    (!tx.amount || Number(tx.amount) <= 0 || tx.amountPendingAdmin);

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-10">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <History className="size-3.5" />
              <span>Financial Records</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Transaction History</h1>
            <p className="text-sm text-white/55">
              Track all deposits, investments, withdrawals, and account activation records.
            </p>
          </div>
          <Button
            asChild
            className="bg-primary text-slate-950 hover:bg-amber-400 font-semibold text-xs sm:text-sm h-10 px-4 rounded-xl w-fit"
          >
            <Link to="/deposit">New Deposit</Link>
          </Button>
        </header>

        {/* Main Transactions Table (Desktop) + Mobile Cards */}
        <Card className="bg-[#0A0F18]/90 border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <CardContent className="p-0">
            {/* Mobile List View */}
            <div className="md:hidden divide-y divide-white/[0.06]">
              {transactions.length === 0 ? (
                <div className="p-12 text-center text-sm text-white/45">
                  No transactions recorded yet.
                </div>
              ) : (
                transactions.map((tx) => {
                  const awaitingAmount = isPendingDepositAudit(tx);
                  return (
                    <div key={tx.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${
                              tx.type === 'withdrawal'
                                ? 'bg-orange-500/10 text-orange-400'
                                : 'bg-primary/10 text-primary'
                            }`}
                          >
                            {tx.type === 'withdrawal' ? <ArrowUpRight size={17} /> : <ArrowDownLeft size={17} />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white capitalize truncate">
                              {String(tx.type || '').replace('_', ' ')}
                            </p>
                            <p className="text-[11px] font-mono text-white/45">
                              {tx.createdAt ? format(tx.createdAt.toDate(), 'MMM dd, yyyy HH:mm') : 'Just now'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {awaitingAmount ? (
                            <span className="text-xs font-medium text-amber-400 block">Pending Audit</span>
                          ) : (
                            <span className="text-sm font-bold font-mono tabular-nums text-white block">
                              ${Number(tx.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                          <span className="text-[11px] font-mono text-white/45">{tx.currency || 'USD'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-md text-[11px] font-medium capitalize ${statusBadgeClass(tx.status)}`}>
                          {tx.status}
                        </span>
                        {tx.receiptUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedProof({
                                imageUrl: tx.receiptUrl,
                                title: 'Deposit Receipt',
                                userName: tx.userName,
                                amount: awaitingAmount ? undefined : tx.amount,
                                currency: '$',
                                date: tx.createdAt ? format(tx.createdAt.toDate(), 'MMM dd, yyyy HH:mm') : ''
                              })
                            }
                            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline cursor-pointer"
                          >
                            <Eye className="size-3.5" /> View Receipt
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader className="bg-white/[0.03] border-b border-white/[0.07]">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="px-6 py-4 text-white/50 font-medium text-xs">Type</TableHead>
                    <TableHead className="px-6 py-4 text-white/50 font-medium text-xs">Amount (USD)</TableHead>
                    <TableHead className="px-6 py-4 text-white/50 font-medium text-xs">Asset</TableHead>
                    <TableHead className="px-6 py-4 text-white/50 font-medium text-xs">Status</TableHead>
                    <TableHead className="px-6 py-4 text-white/50 font-medium text-xs">Date</TableHead>
                    <TableHead className="px-6 py-4 text-white/50 font-medium text-xs text-right">Proof / Ref</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center text-sm text-white/45 border-none">
                        No transactions recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((tx) => {
                      const awaitingAmount = isPendingDepositAudit(tx);
                      return (
                        <TableRow key={tx.id} className="border-white/[0.06] hover:bg-white/[0.02] transition-colors">
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`size-9 rounded-xl flex items-center justify-center border ${
                                  tx.type === 'withdrawal'
                                    ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                    : 'bg-primary/10 text-primary border-primary/20'
                                }`}
                              >
                                {tx.type === 'withdrawal' ? <ArrowUpRight size={17} /> : <ArrowDownLeft size={17} />}
                              </div>
                              <span className="capitalize font-medium text-white text-sm">
                                {String(tx.type || '').replace('_', ' ')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 font-mono tabular-nums text-sm font-semibold text-white">
                            {awaitingAmount ? (
                              <span className="text-xs font-sans font-medium text-amber-400">
                                Pending Admin Verification
                              </span>
                            ) : (
                              `$${Number(tx.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-xs font-mono text-white/65">
                            {tx.currency || 'USD'}
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-medium capitalize ${statusBadgeClass(tx.status)}`}>
                              {tx.status}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-white/50 font-mono tabular-nums text-xs">
                            {tx.createdAt ? format(tx.createdAt.toDate(), 'MMM dd, yyyy HH:mm') : 'Just now'}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            {tx.receiptUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedProof({
                                    imageUrl: tx.receiptUrl,
                                    title: 'Deposit Receipt',
                                    userName: tx.userName,
                                    amount: awaitingAmount ? undefined : tx.amount,
                                    currency: '$',
                                    date: tx.createdAt ? format(tx.createdAt.toDate(), 'MMM dd, yyyy HH:mm') : ''
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs font-medium border border-white/10 cursor-pointer"
                              >
                                <Eye className="size-3.5 text-primary" /> View Proof
                              </button>
                            ) : tx.txHash ? (
                              <span className="font-mono text-xs text-white/50" title={tx.txHash}>
                                {tx.txHash.slice(0, 12)}...
                              </span>
                            ) : (
                              <span className="text-white/30 text-xs">System Record</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Account Activation History Section */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="size-5 text-amber-400" />
                Account Activation History
              </h2>
              <p className="text-xs sm:text-sm text-white/50 mt-0.5">
                Verification records and approval status for account activation requests.
              </p>
            </div>
            {userData?.accountStatus === 'inactive' && (
              <Button asChild size="sm" className="bg-primary text-slate-950 hover:bg-amber-400 font-semibold text-xs rounded-xl w-fit">
                <Link to="/activate" className="inline-flex items-center gap-1.5">
                  Activate Account <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            )}
          </div>

          <Card className="bg-[#0A0F18]/90 border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-white/[0.03] border-b border-white/[0.07]">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="px-6 py-4 text-white/50 font-medium text-xs">Request</TableHead>
                      <TableHead className="px-6 py-4 text-white/50 font-medium text-xs">Amount</TableHead>
                      <TableHead className="px-6 py-4 text-white/50 font-medium text-xs">Submitted</TableHead>
                      <TableHead className="px-6 py-4 text-white/50 font-medium text-xs">Status</TableHead>
                      <TableHead className="px-6 py-4 text-white/50 font-medium text-xs">Receipt</TableHead>
                      <TableHead className="px-6 py-4 text-white/50 font-medium text-xs text-right">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activationRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-sm text-white/45 border-none">
                          No activation requests on record.
                        </TableCell>
                      </TableRow>
                    ) : (
                      activationRequests.map((req) => (
                        <TableRow key={req.id} className="border-white/[0.06] hover:bg-white/[0.02] transition-colors">
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`size-9 rounded-xl flex items-center justify-center border ${
                                  req.status === 'approved'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : req.status === 'rejected'
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                }`}
                              >
                                {req.status === 'approved' ? (
                                  <ShieldCheck className="size-4.5" />
                                ) : req.status === 'rejected' ? (
                                  <AlertCircle className="size-4.5" />
                                ) : (
                                  <Clock className="size-4.5" />
                                )}
                              </div>
                              <div>
                                <span className="font-medium text-white text-sm block">Account Activation</span>
                                <span className="text-xs font-mono text-white/45">{req.network || 'Crypto Transfer'}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 font-mono tabular-nums font-semibold text-white text-sm">
                            {req.currency || '$'}{Number(req.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-white/50 font-mono tabular-nums text-xs">
                            {req.submittedAt?.toDate ? format(req.submittedAt.toDate(), 'MMM dd, yyyy HH:mm') : 'Pending'}
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-medium capitalize ${statusBadgeClass(req.status)}`}>
                              {req.status === 'pending' ? 'Pending Review' : req.status}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            {req.paymentProof ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedProof({
                                    imageUrl: req.paymentProof,
                                    title: 'Activation Payment Proof',
                                    userName: req.userName,
                                    amount: req.amount,
                                    currency: req.currency,
                                    date: req.submittedAt?.toDate ? format(req.submittedAt.toDate(), 'MMM dd, yyyy HH:mm') : ''
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs font-medium border border-white/10 cursor-pointer"
                              >
                                <Eye className="size-3.5 text-primary" /> View Proof
                              </button>
                            ) : (
                              <span className="text-white/30 text-xs">No proof</span>
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right text-xs">
                            {req.rejectionReason ? (
                              <span className="text-red-400">{req.rejectionReason}</span>
                            ) : req.approvedAt ? (
                              <span className="text-emerald-400">Verified</span>
                            ) : (
                              <span className="text-amber-400">Under Review</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>

        {selectedProof && (
          <ProofLightboxModal
            isOpen={Boolean(selectedProof)}
            onClose={() => setSelectedProof(null)}
            imageUrl={selectedProof.imageUrl}
            title={selectedProof.title}
            userName={selectedProof.userName}
            amount={selectedProof.amount}
            currency={selectedProof.currency}
            date={selectedProof.date}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
