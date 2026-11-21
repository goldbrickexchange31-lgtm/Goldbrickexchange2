import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowRight, AlertCircle, Clock } from 'lucide-react';
import { Button } from './ui/button';

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
}) => {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-[#0A0F18] to-[#0A0F18] p-5 sm:p-6 shadow-xl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-medium">
            {hasPendingRequest ? (
              <span className="text-amber-400 flex items-center gap-1.5">
                <Clock className="size-3.5" /> Account Activation · Pending Review
              </span>
            ) : rejectionReason ? (
              <span className="text-red-400 flex items-center gap-1.5">
                <AlertCircle className="size-3.5" /> Account Inactive · Verification Required
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1.5">
                <ShieldAlert className="size-3.5" /> Account Status · Inactive
              </span>
            )}
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-white">
            {hasPendingRequest
              ? 'Activation Payment Under Review'
              : rejectionReason
              ? 'Activation Verification Required'
              : 'Activate Your GoldBrick Account'}
          </h3>

          <p className="text-sm text-white/65 leading-relaxed">
            {hasPendingRequest ? (
              'Your activation payment proof is currently being audited by compliance. Full investment and withdrawal privileges will unlock immediately once approved.'
            ) : rejectionReason ? (
              <>
                <span className="text-red-300 font-medium block mb-0.5">Audit Note: {rejectionReason}</span>
                Please review the wallet details and submit an updated receipt to activate your account.
              </>
            ) : (
              <>
                Complete the one-time activation payment (<span className="font-mono font-semibold text-white">{activationCurrency}{activationFee.toLocaleString()}</span>) to unlock investment plans and instant withdrawals.
              </>
            )}
          </p>
        </div>

        <Button
          type="button"
          onClick={() => navigate('/activate')}
          className="w-full md:w-auto h-11 px-5 bg-primary text-slate-950 hover:bg-amber-400 font-semibold text-sm rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <span>
            {hasPendingRequest
              ? 'View Status'
              : rejectionReason
              ? 'Submit New Proof'
              : 'Activate Account'}
          </span>
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
};

export default InactiveAccountCard;
