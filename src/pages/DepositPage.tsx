import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Copy, 
  Upload, 
  CheckCircle2, 
  QrCode, 
  ArrowRight, 
  ShieldCheck, 
  DollarSign, 
  Wallet, 
  UserCheck, 
  Clock, 
  AlertCircle,
  FileText,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, doc, query, where, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { ProofLightboxModal } from '../components/ProofLightboxModal';

interface DepositPageProps {
  isActivationFlow?: boolean;
}

export default function DepositPage({ isActivationFlow = false }: DepositPageProps) {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isActivation = Boolean(
    isActivationFlow || 
    searchParams.get('type') === 'activation' || 
    searchParams.get('action') === 'activate' ||
    location.pathname === '/activate'
  );

  const [wallets, setWallets] = useState<any[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [activationConfig, setActivationConfig] = useState<any>(null);
  const [existingActivationReq, setExistingActivationReq] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isViewingProof, setIsViewingProof] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);

  // Dynamic activation fee and currency from admin settings
  const activationFee = activationConfig?.amount ?? config?.activationFee ?? 50;
  const activationCurrency = activationConfig?.currency || config?.activationCurrency || '$';

  useEffect(() => {
    // Listen to Wallets
    const unsubWallets = onSnapshot(collection(db, 'wallets'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWallets(data);
      if (data.length > 0 && !selectedWallet) setSelectedWallet(data[0]);
    });

    // Listen to Config
    const unsubConfig = onSnapshot(doc(db, 'config', 'general'), (snap) => {
      if (snap.exists()) setConfig(snap.data());
    });

    // Listen to Activation Settings
    const unsubActivationConfig = onSnapshot(doc(db, 'settings', 'accountActivation'), (snap) => {
      if (snap.exists()) setActivationConfig(snap.data());
    });

    return () => {
      unsubWallets();
      unsubConfig();
      unsubActivationConfig();
    };
  }, []);

  // Listen to existing user activation requests
  useEffect(() => {
    if (!userData?.uid) return;
    const q = query(
      collection(db, 'activationRequests'),
      where('userId', '==', userData.uid),
      orderBy('submittedAt', 'desc'),
      limit(1)
    );
    const unsubReq = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setExistingActivationReq({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setExistingActivationReq(null);
      }
    }, (err) => {
      console.warn('Activation request query note:', err?.message || err);
    });

    return () => unsubReq();
  }, [userData?.uid]);

  // Set default amount when activation mode is active
  useEffect(() => {
    if (isActivation) {
      setAmount(String(activationFee));
    }
  }, [isActivation, activationFee]);

  const handleCopy = () => {
    if (!selectedWallet) return;
    navigator.clipboard.writeText(selectedWallet.address);
    toast.success('Address copied to clipboard');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Please upload a valid payment receipt (PNG, JPG, or PDF)');
      return;
    }

    setIsUploading(true);
    try {
      const res = await fetch('/api/upload/signature', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Signature fetch failed: ${errorText || 'Check server configuration'}`);
      }
      const { timestamp, signature, cloud_name, api_key } = await res.json();

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', api_key);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('upload_preset', 'Goldbrick');

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.error?.message || 'Receipt upload could not be completed');
      }

      const data = await uploadRes.json();
      setReceiptUrl(data.secure_url);
      toast.success('Proof of payment uploaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'We could not upload your payment proof. Please try again.');
      console.warn('Upload Error Notice:', error?.message || error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitDeposit = async () => {
    if (!receiptUrl) {
      return toast.error('Please upload your payment proof / receipt');
    }
    if (!selectedWallet) {
      return toast.error('Please select a payment repository');
    }

    setLoading(true);
    try {
      if (isActivation) {
        // ACTIVATION FLOW VALIDATION
        if (!userData) {
          throw new Error('Please sign in to complete account activation');
        }
        if (userData.accountStatus === 'active') {
          toast.success('Your account is already active! Redirecting to dashboard...');
          navigate('/dashboard');
          return;
        }

        const effectiveAmount = parseFloat(String(activationFee)) || 50;

        // 1. Submit to activationRequests collection
        await addDoc(collection(db, 'activationRequests'), {
          userId: userData.uid,
          userName: userData.displayName || 'Investor',
          userEmail: userData.email || '',
          amount: effectiveAmount,
          currency: activationCurrency,
          paymentProof: receiptUrl,
          walletAddress: selectedWallet.address || '',
          network: selectedWallet.network || '',
          txHash: txHash || 'Activation-Receipt',
          status: 'pending',
          submittedAt: serverTimestamp()
        });

        // 2. Also register in transactions ledger
        try {
          await addDoc(collection(db, 'transactions'), {
            userId: userData.uid,
            userName: userData.displayName || 'Investor',
            userEmail: userData.email || '',
            type: 'deposit',
            amount: effectiveAmount,
            currency: selectedWallet.symbol || activationCurrency,
            status: 'pending',
            receiptUrl,
            txHash: txHash || 'Activation-Fee',
            description: 'Account Activation Fee',
            walletAddress: selectedWallet.address || '',
            network: selectedWallet.network || '',
            createdAt: serverTimestamp()
          });
        } catch (tErr) {
          console.warn('Transaction record note:', tErr);
        }

        setStep(3);
        toast.success('Activation request submitted successfully!');
      } else {
        // STANDARD DEPOSIT FLOW
        if (!amount || !txHash || !receiptUrl) {
          return toast.error('Required fields: Amount, TX Hash, and Receipt');
        }

        const pathTx = 'transactions';
        await addDoc(collection(db, pathTx), {
          userId: userData?.uid,
          userName: userData?.displayName || 'Investor',
          userEmail: userData?.email,
          type: 'deposit',
          amount: parseFloat(amount),
          currency: selectedWallet.symbol,
          status: 'pending',
          receiptUrl,
          txHash,
          walletAddress: selectedWallet.address,
          network: selectedWallet.network,
          createdAt: serverTimestamp()
        }).catch(e => handleFirestoreError(e, OperationType.CREATE, pathTx));

        setStep(3);
        toast.success('Capital injection submitted for audit');
      }
    } catch (e: any) {
      toast.error(e.message || 'Submission sequence could not be completed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <ProofLightboxModal
        isOpen={isViewingProof}
        onClose={() => setIsViewingProof(false)}
        imageUrl={existingActivationReq?.paymentProof || receiptUrl}
        title="Activation Payment Proof"
        userName={userData?.displayName || 'Investor'}
        amount={existingActivationReq?.amount || activationFee}
        currency={existingActivationReq?.currency || activationCurrency}
      />

      <div className="max-w-2xl mx-auto space-y-10 pb-12 px-4 sm:px-0">
        <header className="space-y-3">
          {isActivation ? (
            <>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] font-black uppercase tracking-widest">
                <UserCheck className="size-3.5" />
                Account Activation Protocol
              </div>
              <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase vibrant-text leading-tight drop-shadow-sm">
                Activate Your Account
              </h1>
              <p className="text-white/40 font-bold text-[10px] uppercase tracking-[0.3em]">
                Complete the one-time activation fee to unlock full access to your Goldbrick account
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase vibrant-text leading-tight drop-shadow-sm">Deposit Capital</h1>
              <p className="text-white/40 font-bold text-[10px] uppercase tracking-[0.3em] font-bold">Deploy your assets into the investment pool</p>
            </>
          )}
        </header>

        {/* Existing Pending Request Notice in Activation Mode */}
        {isActivation && existingActivationReq?.status === 'pending' && !resubmitting && step !== 3 && (
          <Card className="bg-card border-amber-500/30 shadow-2xl rounded-[2.5rem] overflow-hidden border-t-4 border-t-amber-500 border p-8 md:p-10 space-y-8 animate-in fade-in">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border pb-6">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Clock className="size-6 animate-pulse" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-400">
                    <span className="size-2 rounded-full bg-amber-400 animate-ping" />
                    STATUS: PENDING REVIEW
                  </div>
                  <h3 className="text-xl md:text-2xl font-black italic uppercase text-white tracking-tight">Activation Request Submitted</h3>
                </div>
              </div>
            </div>

            <p className="text-white/70 text-xs md:text-sm font-medium leading-relaxed">
              Your payment proof has been submitted successfully and is awaiting review. Our compliance team is verifying your deposit transaction. Once confirmed, full account privileges will be activated automatically.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/5 p-6 rounded-2xl border border-white/10 font-mono text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-sans font-black uppercase tracking-widest text-white/40 block">Payment Amount</span>
                <span className="text-lg font-black text-white italic">
                  {existingActivationReq.currency || activationCurrency}{Number(existingActivationReq.amount).toLocaleString()}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-sans font-black uppercase tracking-widest text-white/40 block">Payment Status</span>
                <span className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="size-3.5" /> Pending Review
                </span>
              </div>
            </div>

            {existingActivationReq.paymentProof && (
              <div className="space-y-3">
                <Label className="text-[10px] text-white/40 font-black uppercase tracking-widest">Submitted Payment Proof</Label>
                <div className="flex items-center gap-4 bg-background border border-border p-4 rounded-2xl">
                  <img 
                    src={existingActivationReq.paymentProof} 
                    alt="Receipt thumbnail" 
                    className="size-16 object-cover rounded-xl border border-white/10 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setIsViewingProof(true)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">Receipt Evidence</p>
                    <p className="text-[10px] font-mono text-white/40">Click to view full-resolution ledger evidence</p>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsViewingProof(true)}
                    className="h-10 px-4 rounded-xl text-primary font-bold text-xs border-primary/30"
                  >
                    View Proof
                  </Button>
                </div>
              </div>
            )}

            <div className="pt-4 flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={() => navigate('/dashboard')}
                className="flex-1 h-14 bg-primary text-primary-foreground font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.01]"
              >
                View Dashboard
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setResubmitting(true)}
                className="h-14 px-6 text-white/40 hover:text-white uppercase text-[10px] font-black tracking-widest"
              >
                Submit Updated Receipt
              </Button>
            </div>
          </Card>
        )}

        {/* Previous Rejection Notice if any */}
        {isActivation && existingActivationReq?.status === 'rejected' && step === 1 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-left space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2 text-red-400 font-black uppercase text-xs tracking-wider">
              <AlertCircle className="size-4 shrink-0" />
              Previous Activation Review Notice
            </div>
            <p className="text-white/80 text-xs font-medium">
              {existingActivationReq.rejectionReason 
                ? `Audit Note: "${existingActivationReq.rejectionReason}"`
                : "Your previous activation payment could not be verified. Please review the payment details and submit valid proof."}
            </p>
            <p className="text-white/40 text-[10px] font-mono">
              You can submit a new payment proof below to request verification.
            </p>
          </div>
        )}

        {/* STEP 1: Amount / Activation Fee & Repository Setup */}
        {step === 1 && (!isActivation || existingActivationReq?.status !== 'pending' || resubmitting) && (
          <Card className="bg-card border-border shadow-2xl rounded-[2.5rem] overflow-hidden border-t-4 border-t-primary border">
            <CardHeader className="p-8 border-b border-border bg-white/5">
               <CardTitle className="text-2xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
                 <Wallet className="size-6 text-primary" /> {isActivation ? 'Activation Fee & Repository' : 'Setup Amount'}
               </CardTitle>
               <CardDescription className="text-white/40 font-bold text-[10px] uppercase tracking-widest mt-2 px-1">
                 {isActivation ? 'ONE-TIME ACCOUNT ACTIVATION PAYMENT' : 'CHOOSE YOUR ASSET AND INVESTMENT VOLUME'}
               </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 p-10">
               {/* In Activation mode: show prominent fee card */}
               {isActivation && (
                 <div className="bg-gradient-to-br from-amber-500/10 to-primary/5 border border-amber-500/25 rounded-2xl p-6 space-y-2">
                   <div className="flex items-center justify-between flex-wrap gap-2">
                     <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Account Activation Fee</span>
                     <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">Standard Verification</span>
                   </div>
                   <div className="text-4xl md:text-5xl font-black font-mono text-white italic tracking-tight">
                     {activationCurrency}{activationFee.toLocaleString()}
                   </div>
                   <p className="text-white/50 text-[11px] font-medium leading-relaxed">
                     Complete payment using the payment repository and instructions below. Once submitted, your payment proof will be audited by administration.
                   </p>
                 </div>
               )}

               <div className="space-y-4">
                  <Label className="text-[10px] text-white/40 font-black uppercase tracking-widest">
                    {isActivation ? 'Select Payment Method / Wallet' : 'Select Cryptocurrency'}
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {wallets.map(w => (
                       <div 
                         key={w.id} 
                         onClick={() => setSelectedWallet(w)}
                         className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all flex items-center justify-between group ${selectedWallet?.id === w.id ? 'bg-primary/5 border-primary shadow-lg shadow-primary/10' : 'bg-card border-border hover:border-primary/30'}`}
                       >
                          <div className="flex items-center gap-4">
                             <div className={`size-14 rounded-2xl flex items-center justify-center font-black italic text-2xl transition-all ${selectedWallet?.id === w.id ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-white/5 text-white/20 border border-white/5'}`}>
                                {w.symbol?.[0] || 'W'}
                             </div>
                             <div>
                                <div className={`font-black uppercase tracking-tighter italic text-lg ${selectedWallet?.id === w.id ? 'text-primary' : 'text-white/40'}`}>{w.currency}</div>
                                <div className="text-[10px] text-white/20 font-mono uppercase font-bold tracking-widest">{w.network}</div>
                             </div>
                          </div>
                          {selectedWallet?.id === w.id && <CheckCircle2 className="text-primary size-7 animate-in zoom-in" />}
                       </div>
                     ))}
                  </div>
               </div>

               {!isActivation ? (
                 <div className="space-y-4">
                    <Label className="text-[10px] text-white/40 font-black uppercase tracking-widest">Deposit Amount (USD)</Label>
                    <div className="relative group">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 size-10 bg-white/5 rounded-xl flex items-center justify-center border border-border group-focus-within:border-primary/40 transition-colors">
                        <DollarSign className="size-6 text-primary" />
                      </div>
                      <Input 
                        type="number" 
                        placeholder="e.g. 5000" 
                        className="bg-background border-border h-20 md:h-24 text-4xl md:text-5xl font-black font-mono text-white pl-20 md:pl-24 rounded-2xl md:rounded-[2rem] focus:ring-1 focus:ring-primary/20 shadow-inner placeholder:text-white/5"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2 bg-white/5 p-4 rounded-xl border border-border">
                       <ShieldCheck className="size-4 text-primary" />
                       <p className="text-[10px] text-white/40 font-black uppercase tracking-widest italic">Minimum Deposit Requirement: <span className="text-white font-black">$100.00</span></p>
                    </div>
                 </div>
               ) : (
                 <div className="space-y-4">
                    <Label className="text-[10px] text-white/40 font-black uppercase tracking-widest">Payment Amount ({activationCurrency})</Label>
                    <div className="relative">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 size-10 bg-white/5 rounded-xl flex items-center justify-center border border-border">
                        <DollarSign className="size-6 text-primary" />
                      </div>
                      <Input 
                        type="text" 
                        readOnly
                        disabled
                        className="bg-background border-border h-16 md:h-20 text-3xl md:text-4xl font-black font-mono text-white pl-20 rounded-2xl shadow-inner cursor-not-allowed opacity-90"
                        value={`${activationCurrency}${activationFee.toLocaleString()}`}
                      />
                    </div>
                    <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                      * This amount is dynamically configured by Goldbrick administration.
                    </p>
                 </div>
               )}

               <Button 
                 onClick={() => setStep(2)} 
                 disabled={!selectedWallet || (!isActivation && (!amount || parseFloat(amount) < 10))} 
                 className="w-full h-16 md:h-20 bg-primary text-primary-foreground font-black text-[10px] md:text-base uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all hover:shadow-primary/40 flex items-center justify-center gap-2 cursor-pointer"
               >
                 PROCEED TO PAYMENT <ArrowRight className="size-4 md:size-5" />
               </Button>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Payment Details, Repository Address & Proof Upload */}
        {step === 2 && selectedWallet && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5">
            <Card className="bg-card border-border shadow-2xl rounded-[2.5rem] overflow-hidden border-t-4 border-t-primary border">
               <CardHeader className="text-center p-8 md:p-10 border-b border-border bg-white/5">
                  <CardTitle className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase vibrant-text">
                    {isActivation ? 'Activate Account' : 'Final Audit'}
                  </CardTitle>
                  <CardDescription className="text-white/40 font-bold text-[10px] uppercase tracking-widest mt-3">
                    TRANSFER {isActivation ? `${activationCurrency}${activationFee.toLocaleString()}` : `${amount} USD EQUIVALENT`} TO THE ADDRESS BELOW
                  </CardDescription>
               </CardHeader>
               <CardContent className="flex flex-col items-center p-8 md:p-10 space-y-8 md:space-y-10">
                  <div className="p-8 bg-background rounded-[3rem] shadow-2xl relative group border-4 border-white/5">
                     {selectedWallet.qrCodeUrl ? (
                        <img src={selectedWallet.qrCodeUrl} alt="QR Code" className="size-[240px] object-contain rounded-xl" />
                     ) : (
                        <QRCodeSVG value={selectedWallet.address} size={240} className="rounded-xl" />
                     )}
                     <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem] flex items-center justify-center backdrop-blur-[2px]">
                        <QrCode className="size-20 text-primary opacity-40 animate-pulse" />
                     </div>
                  </div>
                  
                  <div className="w-full space-y-10">
                    <div className="space-y-4 text-center">
                       <Label className="text-[10px] text-white/40 font-black uppercase tracking-[0.3em]">Official {selectedWallet.currency} Repository ({selectedWallet.network})</Label>
                       <div className="flex items-center gap-3 bg-white/5 border-2 border-border p-6 rounded-[1.5rem] group relative overflow-hidden shadow-inner">
                          <div className="absolute inset-0 bg-primary opacity-[0.03] translate-x-[-100%] group-hover:translate-x-[0%] transition-transform duration-700" />
                          <span className="text-sm md:text-lg font-black font-mono break-all text-white flex-1 z-10 select-all px-2">{selectedWallet.address}</span>
                          <Button size="icon" variant="ghost" onClick={handleCopy} className="size-14 rounded-2xl bg-background text-primary border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all z-10 shadow-sm cursor-pointer">
                            <Copy className="size-6" />
                          </Button>
                       </div>
                    </div>

                    <div className="bg-white/5 p-8 rounded-[2rem] border border-border space-y-4 relative overflow-hidden shadow-sm">
                       <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12">
                          <ShieldCheck className="size-20" />
                       </div>
                       <div className="flex items-center gap-3 text-primary relative z-10">
                          <ShieldCheck className="size-6" />
                          <span className="text-xs font-black uppercase tracking-widest italic">Security Directives</span>
                       </div>
                       <p className="text-[11px] text-white/40 font-bold leading-relaxed uppercase relative z-10">
                         {config?.depositInstruction || "Transfer the exact activation amount to the secured vault address above. Upload your clear payment receipt for administrator review."}
                       </p>
                    </div>

                    <div className="space-y-8 pt-10 border-t border-border">
                       <div className="space-y-4">
                          <Label className="text-[10px] text-white/40 font-black uppercase tracking-widest">Digital Signature Hash / TXID (Optional)</Label>
                          <div className="relative">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 size-8 bg-white/5 rounded-lg flex items-center justify-center border border-border">
                              <Wallet className="size-4 text-primary" />
                            </div>
                            <Input 
                              placeholder="PASTE BLOCKCHAIN HASH OR TRANSACTION REF" 
                              className="bg-background border-border h-16 pl-16 rounded-2xl font-mono text-sm uppercase tracking-widest text-white placeholder:text-white/10 shadow-sm font-bold"
                              value={txHash}
                              onChange={(e) => setTxHash(e.target.value)}
                            />
                          </div>
                       </div>
                       
                       <div className="space-y-4">
                          <Label className="text-[10px] text-white/40 font-black uppercase tracking-widest">Upload Payment Proof (SCREENSHOT / RECEIPT) *</Label>
                          <div className="relative">
                             <Input 
                                type="file" 
                                className="hidden" 
                                id="receipt" 
                                onChange={handleFileUpload}
                                accept="image/*,application/pdf"
                             />
                             <Label 
                                htmlFor="receipt" 
                                className="flex items-center justify-center gap-4 bg-white/5 border-2 border-border border-dashed py-16 rounded-[2.5rem] cursor-pointer hover:border-primary transition-all group overflow-hidden relative shadow-inner"
                             >
                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                {isUploading ? (
                                  <div className="flex flex-col items-center gap-4">
                                    <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">Uploading Receipt Proof...</span>
                                  </div>
                                ) : receiptUrl ? (
                                  <div className="flex flex-col items-center gap-4 text-green-500 font-black uppercase tracking-[0.2em] animate-in zoom-in">
                                    <div className="size-16 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/30 shadow-lg shadow-green-500/20">
                                       <CheckCircle2 className="size-10 text-green-400" /> 
                                    </div>
                                    <span className="text-sm">Payment Proof Ready</span>
                                    <span className="text-[10px] font-mono text-white/40">Click to change file</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-6 text-center">
                                     <div className="size-20 bg-background rounded-3xl flex items-center justify-center border border-border shadow-md group-hover:scale-110 transition-transform">
                                        <Upload className="size-10 text-white/20 group-hover:text-primary transition-colors" /> 
                                     </div>
                                     <div className="space-y-2">
                                       <span className="text-xs font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-white transition-colors">Choose File or Click to Upload</span>
                                       <p className="text-[9px] text-white/20 uppercase font-bold tracking-widest">Accepted: PNG, JPG, PDF (MAX 5MB)</p>
                                     </div>
                                  </div>
                                )}
                             </Label>
                          </div>
                       </div>
                    </div>
                  </div>
                  
                  <div className="w-full flex flex-col gap-6 pt-6">
                    <Button 
                      onClick={handleSubmitDeposit} 
                      disabled={loading || !receiptUrl} 
                      className="w-full h-16 md:h-20 bg-primary text-primary-foreground font-black text-[10px] md:text-base uppercase tracking-widest rounded-2xl shadow-2xl shadow-primary/30 hover:scale-[1.01] transition-all hover:shadow-primary/50 flex items-center justify-center cursor-pointer"
                    >
                      {loading ? (
                        isActivation ? 'SUBMITTING ACTIVATION REQUEST...' : 'AUDITING TRANSACTION...'
                      ) : (
                        isActivation ? 'SUBMIT ACTIVATION REQUEST' : 'DEPLOY CAPITAL NOW'
                      )}
                    </Button>
                    <Button variant="ghost" onClick={() => setStep(1)} className="w-full text-white/40 font-black uppercase text-xs tracking-widest hover:text-white transition-colors h-12 cursor-pointer">
                      <ChevronLeft className="size-4 mr-1" /> Return to Selection
                    </Button>
                  </div>
               </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 3: Submission Confirmation */}
        {step === 3 && (
          <Card className="bg-card border-border text-center py-20 rounded-[3.5rem] shadow-3xl border animate-in zoom-in duration-500">
             <CardContent className="space-y-8">
                <div className="size-28 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto ring-[14px] ring-amber-500/10 shadow-lg shadow-amber-500/10 animate-bounce">
                   <CheckCircle2 className="size-14" />
                </div>
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest">
                    Status: PENDING REVIEW
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter vibrant-text leading-tight">
                    {isActivation ? 'Activation Request Submitted' : 'Syncing Processed'}
                  </h2>
                  <p className="text-white/60 font-medium text-xs md:text-sm max-w-md mx-auto leading-relaxed">
                    {isActivation ? (
                      <>
                        Your payment proof has been submitted successfully and is awaiting review. Our administrative team will verify your payment and activate your account shortly.
                      </>
                    ) : (
                      <>
                        Your injection of <span className="text-white font-black underline decoration-primary decoration-4 underline-offset-4">${amount}</span> is scheduled for audit. Expect fulfillment within 30-60 minutes.
                      </>
                    )}
                  </p>
                </div>
                <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-sm mx-auto px-6">
                   <Button onClick={() => navigate('/dashboard')} className="w-full h-14 bg-primary text-primary-foreground font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all text-xs cursor-pointer">
                     BACK TO DASHBOARD
                   </Button>
                   <Button variant="ghost" onClick={() => navigate('/transactions')} className="w-full h-14 uppercase text-xs font-black tracking-[0.2em] text-white/40 hover:text-white cursor-pointer">
                     AUDIT LOGS
                   </Button>
                </div>
             </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
