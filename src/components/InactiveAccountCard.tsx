import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowRight, Sparkles, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface InactiveAccountCardProps {
  activationFee?: number;
  activationCurrency?: string;
  hasPendingRequest?: boolean;
  rejectionReason?: string | null;
  submittedAt?: any;
}

export const InactiveAccountCard: FC<InactiveAccountCardProps> = ({
  activationFee = 50,
  activationCurrency = '$',
  hasPendingRequest = false,
  rejectionReason = null,
  submittedAt,
}) => {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] border-2 border-amber-500/30 bg-gradient-to-br from-card via-card to-amber-950/15 p-6 sm:p-8 shadow-2xl shadow-black/40 transition-all">
      {/* Background subtle illumination */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">
              Account Status
            </span>
            <span className="text-white/20">•</span>
            {hasPendingRequest ? (
              <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 font-black uppercase text-[10px] tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-400 animate-ping" />
                PENDING REVIEW
              </Badge>
            ) : rejectionReason ? (
              <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 font-black uppercase text-[10px] tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-red-400" />
                INACTIVE • ACTION REQUIRED
              </Badge>
            ) : (
              <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 font-black uppercase text-[10px] tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-400" />
                INACTIVE
              </Badge>
            )}
          </div>

          <h3 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight text-white flex items-center gap-2.5">
            {hasPendingRequest ? (
              <>
                <Clock className="size-6 text-amber-400 shrink-0" />
                Activation Payment Submitted for Audit
              </>
            ) : rejectionReason ? (
              <>
                <AlertCircle className="size-6 text-red-400 shrink-0" />
                Activation Verification Notice
              </>
            ) : (
              <>
                <ShieldAlert className="size-6 text-amber-400 shrink-0" />
                Your Account is Currently Inactive
              </>
            )}
          </h3>

          <p className="text-white/70 text-xs sm:text-sm font-medium leading-relaxed">
            {hasPendingRequest ? (
              <>
                Your payment proof is currently under review by compliance. Once verified, full account capabilities will be unlocked automatically.
              </>
            ) : rejectionReason ? (
              <>
                <span className="text-red-300 font-bold block mb-1">Audit Note: {rejectionReason}</span>
                Please review your deposit details and submit a valid payment receipt to activate your account.
              </>
            ) : (
              <>
                Activate your account to unlock full access to Goldbrick investment packages, portfolio returns, capital deployment, and rapid withdrawals.
              </>
            )}
          </p>

          {!hasPendingRequest && (
            <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-white/50">
              <span>Standard Activation Fee:</span>
              <span className="font-black text-white bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-lg text-xs">
                {activationCurrency}{activationFee.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <div className="w-full md:w-auto shrink-0 flex flex-col sm:flex-row md:flex-col gap-2.5">
          <Button
            type="button"
            onClick={() => navigate('/activate')}
            className="h-12 sm:h-14 px-6 sm:px-8 bg-primary text-primary-foreground font-black uppercase text-[11px] sm:text-xs tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer w-full"
          >
            {hasPendingRequest ? (
              <>
                View Audit Status <ArrowRight className="size-4" />
              </>
            ) : rejectionReason ? (
              <>
                Submit New Proof <ArrowRight className="size-4" />
              </>
            ) : (
              <>
                Activate Account <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InactiveAccountCard;
