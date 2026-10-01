import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowRight, Lock, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';

interface InactiveAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  activationFee?: number;
  activationCurrency?: string;
  hasPendingRequest?: boolean;
}

export const InactiveAccountModal: FC<InactiveAccountModalProps> = ({
  isOpen,
  onClose,
  activationFee = 50,
  activationCurrency = '$',
  hasPendingRequest = false,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleActivateClick = () => {
    onClose();
    navigate('/activate');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="relative w-full max-w-lg bg-card/95 border border-amber-500/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(245,158,11,0.08)] rounded-[2.5rem] p-8 sm:p-10 text-white overflow-hidden animate-in zoom-in-95 duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Subtle decorative background ambient glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col items-center text-center space-y-6">
          {/* Elegant Status Icon Badge */}
          <div className="relative flex items-center justify-center">
            <div className="size-20 sm:size-24 rounded-3xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shadow-inner group">
              <div className="size-12 sm:size-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center">
                {hasPendingRequest ? (
                  <Sparkles className="size-7 sm:size-8 text-amber-400 animate-pulse" />
                ) : (
                  <Lock className="size-7 sm:size-8 text-amber-400" />
                )}
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 size-5 rounded-full bg-amber-500 border-2 border-card flex items-center justify-center">
              <span className="size-2 rounded-full bg-white animate-ping opacity-75" />
            </span>
          </div>

          {/* Heading and Copy */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest">
              <span className="size-1.5 rounded-full bg-amber-400" />
              Account Status Notice
            </div>
            <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-white leading-tight">
              {hasPendingRequest ? 'Activation In Review' : 'Your Account is Inactive'}
            </h2>
            <p className="text-white/60 text-xs sm:text-sm font-medium leading-relaxed max-w-md mx-auto">
              {hasPendingRequest ? (
                <>Your account activation payment has been submitted and is currently being audited by Goldbrick compliance. You will receive full access immediately upon approval.</>
              ) : (
                <>Your account needs to be activated before you can access the full Goldbrick investment portfolio, capital deposits, and return payouts.</>
              )}
            </p>
          </div>

          {/* Status Metric Box */}
          <div className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 sm:p-5 flex items-center justify-between text-left">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Status Requirement</p>
              <p className="text-sm font-bold text-white mt-0.5">
                {hasPendingRequest ? 'Audit In Progress' : 'One-time Activation Fee'}
              </p>
            </div>
            <div className="text-right font-mono">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                {hasPendingRequest ? 'Pending' : 'Required'}
              </p>
              <p className="text-lg font-black text-white italic">
                {hasPendingRequest ? (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-sans font-bold">
                    <CheckCircle2 className="size-3.5" /> Proof Received
                  </span>
                ) : (
                  `${activationCurrency}${activationFee.toLocaleString()}`
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-3 pt-2">
            <Button
              type="button"
              onClick={handleActivateClick}
              className="w-full h-14 sm:h-16 bg-primary text-primary-foreground font-black text-xs sm:text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {hasPendingRequest ? 'View Activation Status' : 'Activate Account'}
              <ArrowRight className="size-4" />
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-white/40 hover:text-white transition-colors uppercase tracking-wider py-2 cursor-pointer"
            >
              View Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InactiveAccountModal;
