import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../components/ui/table';
import { ArrowDownLeft, ArrowUpRight, History, ExternalLink, ShieldCheck, Clock, AlertCircle, Eye, ArrowRight } from 'lucide-react';
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
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Listen for user activation requests
    const qAct = query(
      collection(db, 'activationRequests'),
      where('userId', '==', userData.uid),
      orderBy('submittedAt', 'desc')
    );
    const unsubAct = onSnapshot(qAct, (snap) => {
      setActivationRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.warn('Activation requests ledger note:', err?.message || err);
    });

    return () => {
      unsub();
      unsubAct();
    };
  }, [userData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'pending': return 'bg-primary/10 text-primary border-primary/20';
      case 'rejected': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-zinc-500/10 text-zinc-500';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-10 pb-12">
        <header className="space-y-3">
          <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase vibrant-text flex items-center gap-4">
             <History className="text-primary size-8 md:size-12" /> Transaction Ledger
          </h1>
          <p className="text-white/40 font-bold text-[10px] md:text-xs uppercase tracking-[0.3em]">Complete history of your financial deployments and extractions.</p>
        </header>

        <Card className="bg-card border-border rounded-[2.5rem] overflow-hidden shadow-2xl border">
           <CardContent className="p-0">
              <div className="overflow-x-auto no-scrollbar">
                 <Table>
                    <TableHeader className="bg-white/5 border-b border-border">
                       <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="px-8 py-6 text-white/40 font-black uppercase text-[10px] tracking-[0.3em]">Operation Type</TableHead>
                          <TableHead className="px-8 py-6 text-white/40 font-black uppercase text-[10px] tracking-[0.3em]">Volume (USD)</TableHead>
                          <TableHead className="px-8 py-6 text-white/40 font-black uppercase text-[10px] tracking-[0.3em]">Asset</TableHead>
                          <TableHead className="px-8 py-6 text-white/40 font-black uppercase text-[10px] tracking-[0.3em]">Audit Status</TableHead>
                          <TableHead className="px-8 py-6 text-white/40 font-black uppercase text-[10px] tracking-[0.3em]">Timestamp</TableHead>
                          <TableHead className="px-8 py-6 text-white/40 font-black uppercase text-[10px] tracking-[0.3em] text-right">Reference</TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                       {transactions.length === 0 ? (
                          <TableRow>
                             <TableCell colSpan={6} className="h-64 text-center text-white/20 italic font-black uppercase text-xs tracking-[0.5em] border-none">
                                No records currently stored in the blockchain ledger.
                             </TableCell>
                          </TableRow>
                       ) : (
                          transactions.map((tx) => (
                             <TableRow key={tx.id} className="border-border hover:bg-white/5 transition-colors group">
                                <TableCell className="px-8 py-6">
                                   <div className="flex items-center gap-4">
                                      <div className={`size-10 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110 ${tx.type === 'deposit' || tx.type === 'investment' || tx.type === 'referral_bonus' ? 'bg-primary/5 text-primary border-primary/10 shadow-sm shadow-primary/5' : 'bg-orange-500/10 text-orange-500 border-orange-500/20 shadow-sm shadow-orange-500/5'}`}>
                                         {tx.type === 'deposit' || tx.type === 'referral_bonus' || tx.type === 'investment' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                                      </div>
                                      <span className="capitalize font-black text-white italic uppercase tracking-tighter text-sm">{tx.type}</span>
                                   </div>
                                </TableCell>
                                <TableCell className="px-8 py-6 font-black font-mono text-white text-lg tracking-tighter">
                                   ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="px-8 py-6">
                                   <Badge variant="outline" className="font-mono text-white/40 border-white/5 bg-white/5 px-3 font-bold uppercase text-[10px] tracking-widest h-6">
                                      {tx.currency || 'USD'}
                                   </Badge>
                                </TableCell>
                                <TableCell className="px-8 py-6">
                                   <Badge className={`uppercase text-[9px] font-black tracking-widest border-none px-3 h-6 shadow-sm ${getStatusColor(tx.status)}`}>
                                      {tx.status}
                                   </Badge>
                                </TableCell>
                                <TableCell className="px-8 py-6 text-white/40 font-mono font-bold text-[10px]">
                                   {tx.createdAt ? format(tx.createdAt.toDate(), 'MMM dd, yyyy HH:mm') : 'INITIALIZING...'}
                                </TableCell>
                                <TableCell className="px-8 py-6 text-right">
                                   {tx.txHash ? (
                                      <a 
                                        href={`https://etherscan.io/tx/${tx.txHash}`} 
                                        className="text-primary hover:text-white transition-colors inline-flex items-center gap-2 font-black text-[9px] uppercase tracking-widest border border-primary/20 hover:border-primary px-3 py-1.5 rounded-lg bg-primary/5"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                         <span className="hidden md:inline">Verify</span> <ExternalLink size={12} className="inline" />
                                      </a>
                                   ) : (
                                     <span className="text-white/20 font-mono text-xs italic">System Record</span>
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

        {/* Account Activation History Section */}
        <section className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight text-white flex items-center gap-3">
                <ShieldCheck className="size-6 text-amber-400" />
                Account Activation History
              </h2>
              <p className="text-white/40 text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-1">
                Records of your membership activation submissions and audit statuses
              </p>
            </div>
            {userData?.accountStatus === 'inactive' && (
              <Button asChild size="sm" className="bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl">
                <Link to="/activate" className="inline-flex items-center gap-1.5">
                  Submit Activation <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            )}
          </div>

          <Card className="bg-card border-border rounded-[2.5rem] overflow-hidden shadow-2xl border">
            <CardContent className="p-0">
              <div className="overflow-x-auto no-scrollbar">
                <Table>
                  <TableHeader className="bg-white/5 border-b border-border">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="px-8 py-6 text-white/40 font-black uppercase text-[10px] tracking-[0.3em]">Activation</TableHead>
                      <TableHead className="px-8 py-6 text-white/40 font-black uppercase text-[10px] tracking-[0.3em]">Amount</TableHead>
                      <TableHead className="px-8 py-6 text-white/40 font-black uppercase text-[10px] tracking-[0.3em]">Date</TableHead>
                      <TableHead className="px-8 py-6 text-white/40 font-black uppercase text-[10px] tracking-[0.3em]">Status</TableHead>
                      <TableHead className="px-8 py-6 text-white/40 font-black uppercase text-[10px] tracking-[0.3em]">Proof / Receipt</TableHead>
                      <TableHead className="px-8 py-6 text-white/40 font-black uppercase text-[10px] tracking-[0.3em] text-right">Audit Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activationRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-44 text-center text-white/20 italic font-black uppercase text-xs tracking-[0.4em] border-none">
                          No activation requests on record.
                        </TableCell>
                      </TableRow>
                    ) : (
                      activationRequests.map((req) => (
                        <TableRow key={req.id} className="border-border hover:bg-white/5 transition-colors group">
                          <TableCell className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className={`size-10 rounded-xl flex items-center justify-center border ${
                                req.status === 'approved' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                req.status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                'bg-amber-500/10 text-amber-500 border-amber-500/20'
                              }`}>
                                {req.status === 'approved' ? <ShieldCheck className="size-5" /> :
                                 req.status === 'rejected' ? <AlertCircle className="size-5" /> :
                                 <Clock className="size-5" />}
                              </div>
                              <div>
                                <span className="font-black text-white italic uppercase tracking-tighter text-sm block">Account Activation</span>
                                <span className="text-[10px] font-mono text-white/40">{req.network || 'Vault Wire'} • {req.txHash ? req.txHash.slice(0, 14) + '...' : 'Direct Transfer'}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-8 py-6 font-black font-mono text-white text-lg tracking-tighter">
                            {req.currency || '$'}{Number(req.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="px-8 py-6 text-white/50 font-mono font-bold text-xs">
                            {req.submittedAt?.toDate ? format(req.submittedAt.toDate(), 'MMM dd, yyyy HH:mm') : req.submittedAt ? String(req.submittedAt) : 'Pending'}
                          </TableCell>
                          <TableCell className="px-8 py-6">
                            <Badge className={`uppercase text-[9px] font-black tracking-widest border-none px-3 h-6 shadow-sm ${
                              req.status === 'approved' ? 'bg-green-500/15 text-green-400 border border-green-500/30' :
                              req.status === 'rejected' ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                              'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            }`}>
                              {req.status === 'approved' ? 'Approved' : req.status === 'rejected' ? 'Rejected' : 'Pending Review'}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-8 py-6">
                            {req.paymentProof ? (
                              <button
                                type="button"
                                onClick={() => setSelectedProof(req)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-colors cursor-pointer border border-white/10"
                              >
                                <Eye className="size-3.5 text-primary" />
                                <span>View Proof</span>
                              </button>
                            ) : (
                              <span className="text-white/20 text-xs italic">No proof</span>
                            )}
                          </TableCell>
                          <TableCell className="px-8 py-6 text-right">
                            {req.rejectionReason ? (
                              <span className="text-red-400 text-xs font-semibold block max-w-xs ml-auto" title={req.rejectionReason}>
                                Note: {req.rejectionReason}
                              </span>
                            ) : req.approvedAt ? (
                              <span className="text-green-400/80 text-[10px] font-mono font-bold uppercase tracking-wider">
                                Verified by Compliance
                              </span>
                            ) : (
                              <span className="text-amber-400/80 text-[10px] font-mono font-bold uppercase tracking-wider">
                                Under Review
                              </span>
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

        {/* Proof Lightbox Modal */}
        {selectedProof && (
          <ProofLightboxModal
            isOpen={Boolean(selectedProof)}
            onClose={() => setSelectedProof(null)}
            imageUrl={selectedProof.paymentProof}
            title="Activation Payment Proof"
            userName={selectedProof.userName}
            amount={selectedProof.amount}
            currency={selectedProof.currency}
            date={selectedProof.submittedAt?.toDate ? format(selectedProof.submittedAt.toDate(), 'MMM dd, yyyy HH:mm') : ''}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
