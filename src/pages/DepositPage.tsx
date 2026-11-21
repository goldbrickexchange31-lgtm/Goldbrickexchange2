import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Copy,
  Check,
  Upload,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Wallet,
  UserCheck,
  Clock,
  AlertCircle,
  Hash,
  FileCheck2,
  ChevronLeft,
  Info
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
  const [submitted, setSubmitted] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isViewingProof, setIsViewingProof] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);

  const activationFee = activationConfig?.amount ?? config?.activationFee ?? 50;
  const activationCurrency = activationConfig?.currency || config?.activationCurrency || '$';

  useEffect(() => {
    const unsubWallets = onSnapshot(collection(db, 'wallets'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setWallets(data);
      if (data.length > 0 && !selectedWallet) setSelectedWallet(data[0]);
    });

    const unsubConfig = onSnapshot(doc(db, 'config', 'general'), (snap) => {
      if (snap.exists()) setConfig(snap.data());
    });

    const unsubActivationConfig = onSnapshot(doc(db, 'settings', 'accountActivation'), (snap) => {
      if (snap.exists()) setActivationConfig(snap.data());
    });

    return () => {
      unsubWallets();
      unsubConfig();
      unsubActivationConfig();
    };
  }, []);

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

  const handleCopy = () => {
    if (!selectedWallet?.address) return;
    navigator.clipboard.writeText(selectedWallet.address);
    setCopied(true);
    toast.success('Wallet address copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
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
      toast.success('Payment proof uploaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'We could not upload your payment proof. Please try again.');
      console.warn('Upload Error Notice:', error?.message || error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitDeposit = async () => {
    if (!selectedWallet) {
      return toast.error('Please select a crypto wallet');
    }
    if (!receiptUrl) {
      return toast.error('Please upload your payment proof screenshot or receipt');
    }

    setLoading(true);
    try {
      if (isActivation) {
        if (!userData) {
          throw new Error('Please sign in to complete account activation');
        }
        if (userData.accountStatus === 'active') {
          toast.success('Your account is already active! Redirecting to dashboard...');
          navigate('/dashboard');
          return;
        }

        const effectiveAmount = parseFloat(String(activationFee)) || 50;

        await addDoc(collection(db, 'activationRequests'), {
          userId: userData.uid,
          userName: userData.displayName || 'Investor',
          userEmail: userData.email || '',
          amount: effectiveAmount,
          currency: activationCurrency,
          paymentProof: receiptUrl,
          walletAddress: selectedWallet.address || '',
          network: selectedWallet.network || '',
          txHash: txHash.trim() || 'Activation-Receipt',
          status: 'pending',
          submittedAt: serverTimestamp()
        });

        try {
          await addDoc(collection(db, 'transactions'), {
            userId: userData.uid,
            userName: userData.displayName || 'Investor',
            userEmail: userData.email || '',
            type: 'deposit',
            amount: effectiveAmount,
            currency: selectedWallet.symbol || selectedWallet.currency || activationCurrency,
            status: 'pending',
            receiptUrl,
            txHash: txHash.trim() || 'Activation-Fee',
            description: 'Account Activation Fee',
            walletAddress: selectedWallet.address || '',
            network: selectedWallet.network || '',
            createdAt: serverTimestamp()
          });
        } catch (tErr) {
          console.warn('Transaction record note:', tErr);
        }

        setSubmitted(true);
        toast.success('Activation request submitted successfully!');
      } else {
        const pathTx = 'transactions';
        await addDoc(collection(db, pathTx), {
          userId: userData?.uid,
          userName: userData?.displayName || 'Investor',
          userEmail: userData?.email,
          type: 'deposit',
          amount: 0,
          amountPendingAdmin: true,
          currency: selectedWallet.symbol || selectedWallet.currency || 'CRYPTO',
          status: 'pending',
          receiptUrl,
          txHash: txHash.trim() || '',
          walletAddress: selectedWallet.address,
          network: selectedWallet.network,
          createdAt: serverTimestamp()
        }).catch(e => handleFirestoreError(e, OperationType.CREATE, pathTx));

        setSubmitted(true);
        toast.success('Deposit proof submitted for admin verification');
      }
    } catch (e: any) {
      toast.error(e.message || 'Submission could not be completed');
    } finally {
      setLoading(false);
    }
  };

  const resetForAnotherDeposit = () => {
    setSubmitted(false);
    setReceiptUrl('');
    setTxHash('');
  };

  return (
    <DashboardLayout>
      <ProofLightboxModal
        isOpen={isViewingProof}
        onClose={() => setIsViewingProof(false)}
        imageUrl={existingActivationReq?.paymentProof || receiptUrl}
        title="Payment Proof"
        userName={userData?.displayName || 'Investor'}
        amount={isActivation ? (existingActivationReq?.amount || activationFee) : undefined}
        currency={isActivation ? (existingActivationReq?.currency || activationCurrency) : undefined}
      />

      <div className="max-w-5xl mx-auto space-y-6 pb-10">
        {/* Clean Page Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
              {isActivation ? (
                <>
                  <UserCheck className="size-3.5" />
                  <span>Account Verification &amp; Activation</span>
                </>
              ) : (
                <>
                  <Wallet className="size-3.5" />
                  <span>Direct Crypto Funding</span>
                </>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {isActivation ? 'Activate Your Account' : 'Deposit Crypto'}
            </h1>
            <p className="text-sm text-white/55 max-w-xl">
              {isActivation
                ? 'Complete your one-time activation fee to unlock portfolio staking and rapid withdrawals.'
                : 'Send crypto to an official wallet below and upload your receipt. Our desk verifies and credits the exact USD value received.'}
            </p>
          </div>
          {!isActivation && !submitted && (
            <Button
              variant="outline"
              onClick={() => navigate('/transactions')}
              className="border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-white/80 hover:text-white h-10 px-4 rounded-xl text-xs font-medium shrink-0 cursor-pointer"
            >
              View Deposit History
            </Button>
          )}
        </header>

        {/* Activation Mode: Existing Pending Request View */}
        {isActivation && existingActivationReq?.status === 'pending' && !resubmitting && !submitted && (
          <Card className="bg-[#0A0F18]/90 border-amber-500/30 rounded-2xl overflow-hidden shadow-xl">
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
                <div className="flex items-center gap-3.5">
                  <div className="size-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Clock className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-amber-400">Pending Review</p>
                    <h3 className="text-lg sm:text-xl font-bold text-white">Activation Request Submitted</h3>
                  </div>
                </div>
                <div className="text-left sm:text-right font-mono tabular-nums">
                  <span className="text-xs text-white/45 block">Activation Fee</span>
                  <span className="text-xl font-bold text-white">
                    {existingActivationReq.currency || activationCurrency}{Number(existingActivationReq.amount).toLocaleString()}
                  </span>
                </div>
              </div>

              <p className="text-sm text-white/65 leading-relaxed">
                Your activation payment proof is currently under review by our compliance team. Once verified, full trading and withdrawal access will be unlocked automatically.
              </p>

              {existingActivationReq.paymentProof && (
                <div className="flex items-center gap-4 bg-white/[0.03] border border-white/[0.08] p-4 rounded-xl">
                  <img
                    src={existingActivationReq.paymentProof}
                    alt="Receipt thumbnail"
                    className="size-14 object-cover rounded-lg border border-white/10 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setIsViewingProof(true)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">Submitted Payment Receipt</p>
                    <p className="text-xs text-white/45">Click to inspect uploaded proof</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsViewingProof(true)}
                    className="h-9 px-3.5 rounded-lg text-amber-400 border-amber-500/30 hover:bg-amber-500/10 text-xs font-medium cursor-pointer"
                  >
                    View Proof
                  </Button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 h-11 bg-primary text-slate-950 hover:bg-amber-400 font-semibold text-sm rounded-xl cursor-pointer"
                >
                  Back to Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setResubmitting(true)}
                  className="h-11 px-5 border-white/10 text-white/70 hover:text-white rounded-xl text-sm cursor-pointer"
                >
                  Submit Updated Receipt
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Activation Mode: Previous Rejection Notice */}
        {isActivation && existingActivationReq?.status === 'rejected' && !submitted && (
          <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-5 flex items-start gap-3.5">
            <AlertCircle className="size-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-red-300">Previous Activation Review Notice</p>
              <p className="text-white/75">
                {existingActivationReq.rejectionReason
                  ? `Audit Note: "${existingActivationReq.rejectionReason}"`
                  : 'Your previous activation payment could not be verified. Please check the wallet details and submit a clear receipt.'}
              </p>
            </div>
          </div>
        )}

        {/* Confirmation Screen */}
        {submitted && (
          <Card className="bg-[#0A0F18]/90 border-white/10 rounded-2xl shadow-2xl max-w-xl mx-auto">
            <CardContent className="p-8 sm:p-10 text-center space-y-6">
              <div className="size-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="size-8" />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">Pending Verification</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  {isActivation ? 'Activation Proof Received' : 'Deposit Proof Submitted'}
                </h2>
                <p className="text-sm text-white/65 leading-relaxed max-w-md mx-auto">
                  {isActivation
                    ? 'Your activation payment proof is queued for review. Your account privileges will unlock as soon as our team verifies the transfer.'
                    : `Your ${selectedWallet?.currency || 'crypto'} transfer proof has been submitted. Our settlement team will verify the transaction and credit the exact USD amount received directly to your balance.`}
                </p>
              </div>

              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 grid grid-cols-2 gap-3 text-left text-xs">
                <div>
                  <span className="text-white/45 block">Asset / Network</span>
                  <span className="font-semibold text-white font-mono">
                    {selectedWallet?.currency} · {selectedWallet?.network}
                  </span>
                </div>
                <div>
                  <span className="text-white/45 block">Credit Method</span>
                  <span className="font-semibold text-amber-400">
                    {isActivation ? `${activationCurrency}${activationFee.toLocaleString()}` : 'Verified On-Chain Amount'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 h-11 bg-primary text-slate-950 hover:bg-amber-400 font-semibold text-sm rounded-xl cursor-pointer"
                >
                  Back to Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={resetForAnotherDeposit}
                  className="flex-1 h-11 border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-white font-medium text-sm rounded-xl cursor-pointer"
                >
                  New Deposit
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Payment Interface */}
        {!submitted && (!isActivation || existingActivationReq?.status !== 'pending' || resubmitting) && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (7 cols): Asset Selection + Wallet QR & Address */}
            <div className="lg:col-span-7 space-y-6">
              {/* Activation Fee Summary Card (only when isActivation) */}
              {isActivation && (
                <div className="bg-gradient-to-br from-amber-500/12 via-[#0A0F18] to-[#0A0F18] border border-amber-500/30 rounded-2xl p-5 sm:p-6 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-amber-400">Required Activation Payment</span>
                    <div className="text-3xl font-bold font-mono tabular-nums text-white">
                      {activationCurrency}{activationFee.toLocaleString()}
                    </div>
                    <p className="text-xs text-white/55">One-time fee configured by GoldBrick administration</p>
                  </div>
                  <div className="hidden sm:flex size-12 rounded-xl bg-amber-500/15 border border-amber-500/25 items-center justify-center text-amber-400 shrink-0">
                    <ShieldCheck className="size-6" />
                  </div>
                </div>
              )}

              {/* Step 1: Select Crypto Network */}
              <Card className="bg-[#0A0F18]/90 border-white/10 rounded-2xl shadow-xl">
                <CardHeader className="p-5 sm:p-6 pb-4 border-b border-white/[0.06]">
                  <CardTitle className="text-base sm:text-lg font-semibold text-white flex items-center justify-between">
                    <span>1. Select Cryptocurrency Wallet</span>
                    <span className="text-xs font-mono text-white/45 font-normal">{wallets.length} available</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-white/50">
                    Choose the coin and network you want to transfer with
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 sm:p-6">
                  {wallets.length === 0 ? (
                    <div className="py-10 text-center text-sm text-white/45 border border-dashed border-white/10 rounded-xl">
                      Loading payment wallets...
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {wallets.map((w) => {
                        const isSelected = selectedWallet?.id === w.id;
                        return (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => setSelectedWallet(w)}
                            className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/10 border-primary shadow-[0_0_0_1px_rgba(245,158,11,0.4)]'
                                : 'bg-white/[0.02] border-white/[0.08] hover:border-white/20 hover:bg-white/[0.04]'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`size-10 rounded-xl flex items-center justify-center font-mono font-bold text-sm shrink-0 ${
                                  isSelected
                                    ? 'bg-primary text-slate-950'
                                    : 'bg-white/[0.06] text-white/65 border border-white/10'
                                }`}
                              >
                                {(w.symbol || w.currency || 'C').slice(0, 4)}
                              </div>
                              <div className="min-w-0">
                                <div className={`font-semibold text-sm truncate ${isSelected ? 'text-white' : 'text-white/80'}`}>
                                  {w.currency}
                                </div>
                                <div className="text-xs font-mono text-white/45 truncate">
                                  {w.network}
                                </div>
                              </div>
                            </div>
                            {isSelected && <CheckCircle2 className="size-5 text-primary shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Step 2: Wallet Address & QR Code */}
              {selectedWallet && (
                <Card className="bg-[#0A0F18]/90 border-white/10 rounded-2xl shadow-xl">
                  <CardHeader className="p-5 sm:p-6 pb-4 border-b border-white/[0.06]">
                    <CardTitle className="text-base sm:text-lg font-semibold text-white">
                      2. Send {selectedWallet.currency} ({selectedWallet.network})
                    </CardTitle>
                    <CardDescription className="text-xs text-white/50">
                      Scan the QR code or copy the official repository address below
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 sm:p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      {/* Crisp White QR Frame */}
                      <div className="p-3.5 bg-white rounded-2xl shadow-lg shrink-0">
                        {selectedWallet.qrCodeUrl ? (
                          <img
                            src={selectedWallet.qrCodeUrl}
                            alt={`${selectedWallet.currency} QR Code`}
                            className="size-40 sm:size-44 object-contain"
                          />
                        ) : (
                          <QRCodeSVG value={selectedWallet.address} size={172} />
                        )}
                      </div>

                      {/* Address + Copy Controls */}
                      <div className="flex-1 w-full space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-white/55">
                            Official {selectedWallet.currency} Address · {selectedWallet.network}
                          </Label>
                          <div className="flex items-center gap-2 bg-black/50 border border-white/10 p-3 rounded-xl">
                            <span className="font-mono text-xs sm:text-sm text-white break-all flex-1 select-all">
                              {selectedWallet.address}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleCopy}
                              className={`h-9 px-3 rounded-lg font-medium text-xs shrink-0 cursor-pointer transition-colors ${
                                copied
                                  ? 'bg-emerald-500 text-white hover:bg-emerald-500'
                                  : 'bg-white/10 text-white hover:bg-primary hover:text-slate-950'
                              }`}
                            >
                              {copied ? (
                                <>
                                  <Check className="size-3.5 mr-1" /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="size-3.5 mr-1" /> Copy
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 flex items-start gap-2.5 text-xs text-white/70 leading-relaxed">
                          <Info className="size-4 text-amber-400 shrink-0 mt-0.5" />
                          <span>
                            {config?.depositInstruction ||
                              `Send only ${selectedWallet.currency} via the ${selectedWallet.network} network. Once you submit proof, our audit team confirms the transfer and credits the exact USD value received.`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column (5 cols): Submit Proof & Finalize */}
            <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">
              <Card className="bg-[#0A0F18]/90 border-white/10 rounded-2xl shadow-xl">
                <CardHeader className="p-5 sm:p-6 pb-4 border-b border-white/[0.06]">
                  <CardTitle className="text-base sm:text-lg font-semibold text-white">
                    3. Submit Payment Proof
                  </CardTitle>
                  <CardDescription className="text-xs text-white/50">
                    {isActivation
                      ? 'Upload your activation transfer receipt to verify your account'
                      : 'Upload a screenshot or PDF of your completed crypto transfer'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-5 sm:p-6 space-y-5">
                  {/* Payment Proof Dropzone */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-white/75">
                      Payment Receipt / Screenshot *
                    </Label>
                    <Input
                      type="file"
                      className="hidden"
                      id="receipt"
                      onChange={handleFileUpload}
                      accept="image/*,application/pdf"
                    />
                    <Label
                      htmlFor="receipt"
                      className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all text-center ${
                        receiptUrl
                          ? 'border-emerald-500/40 bg-emerald-500/[0.05]'
                          : 'border-white/15 bg-white/[0.02] hover:border-primary/50 hover:bg-white/[0.04]'
                      }`}
                    >
                      {isUploading ? (
                        <div className="py-4 flex flex-col items-center gap-2.5">
                          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs font-medium text-primary">Uploading receipt...</span>
                        </div>
                      ) : receiptUrl ? (
                        <div className="w-full space-y-3">
                          {receiptUrl.endsWith('.pdf') ? (
                            <div className="size-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                              <FileCheck2 className="size-6" />
                            </div>
                          ) : (
                            <img
                              src={receiptUrl}
                              alt="Uploaded payment proof"
                              className="max-h-40 w-auto mx-auto rounded-lg border border-white/10 object-contain"
                            />
                          )}
                          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-400">
                            <CheckCircle2 className="size-4" />
                            <span>Receipt Ready · Click to replace</span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-3 space-y-2">
                          <div className="size-11 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center mx-auto text-white/60">
                            <Upload className="size-5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">Click to upload receipt</p>
                            <p className="text-xs text-white/40 mt-0.5">PNG, JPG or PDF (max 5MB)</p>
                          </div>
                        </div>
                      )}
                    </Label>
                  </div>

                  {/* Optional Transaction Hash */}
                  <div className="space-y-2">
                    <Label htmlFor="txHash" className="text-xs font-medium text-white/75">
                      Transaction Hash / TXID <span className="text-white/40 font-normal">(Optional)</span>
                    </Label>
                    <div className="relative">
                      <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/35" />
                      <Input
                        id="txHash"
                        placeholder="Paste blockchain TX hash if available"
                        className="bg-black/40 border-white/10 h-11 pl-10 rounded-xl font-mono text-xs text-white placeholder:text-white/25"
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* How Settlement Works Summary */}
                  {!isActivation && (
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 font-medium text-white/85">
                        <ShieldCheck className="size-4 text-primary shrink-0" />
                        <span>Automatic USD Settlement</span>
                      </div>
                      <p className="text-white/50 leading-relaxed">
                        You do not need to enter an amount upfront. Our admin desk confirms the exact USD value received on-chain and credits your wallet balance.
                      </p>
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={handleSubmitDeposit}
                    disabled={loading || isUploading || !receiptUrl || !selectedWallet}
                    className="w-full h-12 bg-primary text-slate-950 hover:bg-amber-400 font-semibold text-sm rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      isActivation ? 'Submitting Activation...' : 'Submitting Deposit Proof...'
                    ) : (
                      <>
                        <span>{isActivation ? 'Submit Activation Proof' : 'Submit Deposit'}</span>
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>

                  {isActivation && resubmitting && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setResubmitting(false)}
                      className="w-full h-10 text-xs text-white/50 hover:text-white cursor-pointer"
                    >
                      <ChevronLeft className="size-3.5 mr-1" /> Return to status
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
