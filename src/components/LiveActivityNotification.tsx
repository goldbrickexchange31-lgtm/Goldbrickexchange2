import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowDownLeft, ArrowUpRight, TrendingUp, CheckCircle, X } from 'lucide-react';

export interface SocialProofTransaction {
  name: string;
  country: string;
  flag: string;
  type: 'deposit' | 'withdrawal' | 'investment';
  amount: number;
  asset: string;
  planName?: string;
}

// 100+ Realistically Distributed Global Transactions
export const DEMO_TRANSACTIONS_POOL: SocialProofTransaction[] = [
  // USA & Canada
  { name: 'Benjamin G.', country: 'United States', flag: '🇺🇸', type: 'deposit', amount: 5000, asset: 'USDT' },
  { name: 'Alexander W.', country: 'United States', flag: '🇺🇸', type: 'investment', amount: 10000, asset: 'BTC', planName: 'Private Wealth Vault' },
  { name: 'Michael T.', country: 'United States', flag: '🇺🇸', type: 'withdrawal', amount: 3450, asset: 'USDT' },
  { name: 'David H.', country: 'United States', flag: '🇺🇸', type: 'deposit', amount: 15000, asset: 'BTC' },
  { name: 'Sarah J.', country: 'Canada', flag: '🇨🇦', type: 'deposit', amount: 2500, asset: 'ETH' },
  { name: 'Ethan B.', country: 'United States', flag: '🇺🇸', type: 'investment', amount: 7500, asset: 'USDT', planName: 'Starter Vault' },
  { name: 'Olivia P.', country: 'Canada', flag: '🇨🇦', type: 'withdrawal', amount: 6200, asset: 'USDT' },
  { name: 'James L.', country: 'United States', flag: '🇺🇸', type: 'deposit', amount: 25000, asset: 'USDT' },
  { name: 'Daniel M.', country: 'United States', flag: '🇺🇸', type: 'investment', amount: 50000, asset: 'BTC', planName: 'Institutional Tier' },
  { name: 'Emma R.', country: 'United States', flag: '🇺🇸', type: 'withdrawal', amount: 8900, asset: 'ETH' },
  { name: 'William K.', country: 'Canada', flag: '🇨🇦', type: 'deposit', amount: 12000, asset: 'USDT' },
  { name: 'Lucas S.', country: 'United States', flag: '🇺🇸', type: 'deposit', amount: 3500, asset: 'BTC' },
  { name: 'Ava C.', country: 'United States', flag: '🇺🇸', type: 'investment', amount: 20000, asset: 'USDT', planName: 'Private Wealth Vault' },
  { name: 'Noah G.', country: 'Canada', flag: '🇨🇦', type: 'withdrawal', amount: 4800, asset: 'USDT' },

  // UK & Ireland
  { name: 'Arthur K.', country: 'United Kingdom', flag: '🇬🇧', type: 'deposit', amount: 14500, asset: 'USDT' },
  { name: 'George C.', country: 'United Kingdom', flag: '🇬🇧', type: 'investment', amount: 30000, asset: 'BTC', planName: 'Institutional Tier' },
  { name: 'Oliver B.', country: 'United Kingdom', flag: '🇬🇧', type: 'withdrawal', amount: 9400, asset: 'USDT' },
  { name: 'Charlotte D.', country: 'United Kingdom', flag: '🇬🇧', type: 'deposit', amount: 8500, asset: 'ETH' },
  { name: 'Harry P.', country: 'United Kingdom', flag: '🇬🇧', type: 'investment', amount: 12000, asset: 'USDT', planName: 'Private Wealth Vault' },
  { name: 'Liam O.', country: 'Ireland', flag: '🇮🇪', type: 'deposit', amount: 6000, asset: 'USDT' },
  { name: 'Conor M.', country: 'Ireland', flag: '🇮🇪', type: 'withdrawal', amount: 5100, asset: 'BTC' },
  { name: 'Archie F.', country: 'United Kingdom', flag: '🇬🇧', type: 'deposit', amount: 18000, asset: 'USDT' },
  { name: 'Amelia W.', country: 'United Kingdom', flag: '🇬🇧', type: 'investment', amount: 25000, asset: 'ETH', planName: 'Institutional Tier' },

  // Switzerland, Germany, Austria
  { name: 'Helena S.', country: 'Switzerland', flag: '🇨🇭', type: 'deposit', amount: 28400, asset: 'USDT' },
  { name: 'Maximilian B.', country: 'Germany', flag: '🇩🇪', type: 'investment', amount: 35000, asset: 'BTC', planName: 'Institutional Tier' },
  { name: 'Lukas W.', country: 'Austria', flag: '🇦🇹', type: 'deposit', amount: 7200, asset: 'ETH' },
  { name: 'Felix N.', country: 'Germany', flag: '🇩🇪', type: 'withdrawal', amount: 11200, asset: 'USDT' },
  { name: 'Leon K.', country: 'Germany', flag: '🇩🇪', type: 'deposit', amount: 16000, asset: 'BTC' },
  { name: 'Stefan Z.', country: 'Switzerland', flag: '🇨🇭', type: 'investment', amount: 45000, asset: 'USDT', planName: 'Institutional Tier' },
  { name: 'Hannah M.', country: 'Germany', flag: '🇩🇪', type: 'withdrawal', amount: 7800, asset: 'USDT' },
  { name: 'Julian V.', country: 'Switzerland', flag: '🇨🇭', type: 'withdrawal', amount: 22000, asset: 'BTC' },

  // United Arab Emirates, Saudi Arabia, Qatar
  { name: 'Dmitri P.', country: 'United Arab Emirates', flag: '🇦🇪', type: 'deposit', amount: 40000, asset: 'USDT' },
  { name: 'Tariq A.', country: 'United Arab Emirates', flag: '🇦🇪', type: 'investment', amount: 75000, asset: 'BTC', planName: 'Sovereign Institutional' },
  { name: 'Rashid K.', country: 'Saudi Arabia', flag: '🇸🇦', type: 'deposit', amount: 32000, asset: 'USDT' },
  { name: 'Fahad S.', country: 'Qatar', flag: '🇶🇦', type: 'withdrawal', amount: 18500, asset: 'USDT' },
  { name: 'Hamad B.', country: 'United Arab Emirates', flag: '🇦🇪', type: 'investment', amount: 60000, asset: 'USDT', planName: 'Institutional Tier' },
  { name: 'Zayed N.', country: 'United Arab Emirates', flag: '🇦🇪', type: 'deposit', amount: 50000, asset: 'BTC' },
  { name: 'Khalid M.', country: 'Saudi Arabia', flag: '🇸🇦', type: 'withdrawal', amount: 24000, asset: 'USDT' },

  // France, Netherlands, Belgium, Italy, Spain
  { name: 'Sophie M.', country: 'France', flag: '🇫🇷', type: 'deposit', amount: 8200, asset: 'ETH' },
  { name: 'Antoine D.', country: 'France', flag: '🇫🇷', type: 'investment', amount: 15000, asset: 'USDT', planName: 'Private Wealth Vault' },
  { name: 'Daan V.', country: 'Netherlands', flag: '🇳🇱', type: 'deposit', amount: 12500, asset: 'BTC' },
  { name: 'Lars H.', country: 'Netherlands', flag: '🇳🇱', type: 'withdrawal', amount: 9600, asset: 'USDT' },
  { name: 'Matteo R.', country: 'Italy', flag: '🇮🇹', type: 'deposit', amount: 9000, asset: 'USDT' },
  { name: 'Leonardo B.', country: 'Italy', flag: '🇮🇹', type: 'investment', amount: 22000, asset: 'BTC', planName: 'Private Wealth Vault' },
  { name: 'Carlos E.', country: 'Spain', flag: '🇪🇸', type: 'deposit', amount: 6500, asset: 'USDT' },
  { name: 'Javier L.', country: 'Spain', flag: '🇪🇸', type: 'withdrawal', amount: 8300, asset: 'USDT' },
  { name: 'Philippe B.', country: 'Belgium', flag: '🇧🇪', type: 'investment', amount: 17500, asset: 'USDT', planName: 'Private Wealth Vault' },

  // Australia & New Zealand
  { name: 'Jack W.', country: 'Australia', flag: '🇦🇺', type: 'deposit', amount: 11000, asset: 'USDT' },
  { name: 'Thomas H.', country: 'Australia', flag: '🇦🇺', type: 'investment', amount: 25000, asset: 'BTC', planName: 'Institutional Tier' },
  { name: 'Chloe N.', country: 'Australia', flag: '🇦🇺', type: 'withdrawal', amount: 7400, asset: 'USDT' },
  { name: 'Liam J.', country: 'New Zealand', flag: '🇳🇿', type: 'deposit', amount: 8000, asset: 'ETH' },
  { name: 'Mason R.', country: 'Australia', flag: '🇦🇺', type: 'deposit', amount: 19500, asset: 'USDT' },

  // Singapore, Japan, South Korea, Hong Kong
  { name: 'Kenji T.', country: 'Japan', flag: '🇯🇵', type: 'deposit', amount: 30000, asset: 'BTC' },
  { name: 'Hiroshi S.', country: 'Japan', flag: '🇯🇵', type: 'investment', amount: 65000, asset: 'BTC', planName: 'Institutional Tier' },
  { name: 'Min-Jun K.', country: 'South Korea', flag: '🇰🇷', type: 'withdrawal', amount: 14200, asset: 'USDT' },
  { name: 'Ji-Hoon P.', country: 'South Korea', flag: '🇰🇷', type: 'deposit', amount: 22000, asset: 'ETH' },
  { name: 'Wei L.', country: 'Singapore', flag: '🇸🇬', type: 'deposit', amount: 45000, asset: 'USDT' },
  { name: 'Nicholas C.', country: 'Singapore', flag: '🇸🇬', type: 'investment', amount: 80000, asset: 'USDT', planName: 'Sovereign Institutional' },
  { name: 'Cheung W.', country: 'Hong Kong', flag: '🇭🇰', type: 'deposit', amount: 35000, asset: 'BTC' },
  { name: 'Marcus C.', country: 'Hong Kong', flag: '🇭🇰', type: 'withdrawal', amount: 26500, asset: 'USDT' },

  // Nordic Countries
  { name: 'Frederik L.', country: 'Denmark', flag: '🇩🇰', type: 'deposit', amount: 13500, asset: 'USDT' },
  { name: 'Elias N.', country: 'Sweden', flag: '🇸🇪', type: 'investment', amount: 28000, asset: 'BTC', planName: 'Private Wealth Vault' },
  { name: 'Astrid O.', country: 'Norway', flag: '🇳🇴', type: 'deposit', amount: 17000, asset: 'ETH' },
  { name: 'Henrik J.', country: 'Norway', flag: '🇳🇴', type: 'withdrawal', amount: 12800, asset: 'USDT' },
  { name: 'Mikko K.', country: 'Finland', flag: '🇫🇮', type: 'deposit', amount: 9500, asset: 'USDT' },

  // Emerging Wealth Hubs
  { name: 'Mateo C.', country: 'Brazil', flag: '🇧🇷', type: 'deposit', amount: 7500, asset: 'USDT' },
  { name: 'Gabriel F.', country: 'Brazil', flag: '🇧🇷', type: 'investment', amount: 14000, asset: 'BTC', planName: 'Private Wealth Vault' },
  { name: 'Rodrigo M.', country: 'Mexico', flag: '🇲🇽', type: 'withdrawal', amount: 6100, asset: 'USDT' },
  { name: 'Santiago V.', country: 'Colombia', flag: '🇨🇴', type: 'deposit', amount: 5500, asset: 'USDT' },
  { name: 'Rohan P.', country: 'India', flag: '🇮🇳', type: 'deposit', amount: 12000, asset: 'USDT' },
  { name: 'Aarav S.', country: 'India', flag: '🇮🇳', type: 'investment', amount: 25000, asset: 'BTC', planName: 'Private Wealth Vault' },
  { name: 'Vikram N.', country: 'India', flag: '🇮🇳', type: 'withdrawal', amount: 8700, asset: 'USDT' },
  { name: 'Kofi A.', country: 'Ghana', flag: '🇬🇭', type: 'deposit', amount: 4500, asset: 'USDT' },
  { name: 'Chukwudi E.', country: 'Nigeria', flag: '🇳🇬', type: 'investment', amount: 10000, asset: 'USDT', planName: 'Starter Vault' },
  { name: 'Tunde B.', country: 'Nigeria', flag: '🇳🇬', type: 'withdrawal', amount: 6300, asset: 'USDT' },
  { name: 'Thabo M.', country: 'South Africa', flag: '🇿🇦', type: 'deposit', amount: 8500, asset: 'BTC' },
  { name: 'Johannes V.', country: 'South Africa', flag: '🇿🇦', type: 'investment', amount: 18000, asset: 'USDT', planName: 'Private Wealth Vault' },

  // Additional High-Value Transactions
  { name: 'Victoria B.', country: 'United Kingdom', flag: '🇬🇧', type: 'investment', amount: 35000, asset: 'BTC', planName: 'Institutional Tier' },
  { name: 'Christian M.', country: 'Germany', flag: '🇩🇪', type: 'deposit', amount: 21000, asset: 'USDT' },
  { name: 'Sebastian L.', country: 'Austria', flag: '🇦🇹', type: 'withdrawal', amount: 13500, asset: 'USDT' },
  { name: 'Nikolai T.', country: 'Estonia', flag: '🇪🇪', type: 'deposit', amount: 16500, asset: 'BTC' },
  { name: 'Pawel K.', country: 'Poland', flag: '🇵🇱', type: 'investment', amount: 12500, asset: 'USDT', planName: 'Private Wealth Vault' },
  { name: 'Jan S.', country: 'Czech Republic', flag: '🇨🇿', type: 'withdrawal', amount: 7900, asset: 'USDT' },
  { name: 'Andrei V.', country: 'Romania', flag: '🇷🇴', type: 'deposit', amount: 8200, asset: 'USDT' },
  { name: 'Evangelos P.', country: 'Greece', flag: '🇬🇷', type: 'deposit', amount: 9800, asset: 'ETH' },
  { name: 'Dimitrios K.', country: 'Cyprus', flag: '🇨🇾', type: 'investment', amount: 24000, asset: 'USDT', planName: 'Private Wealth Vault' },
  { name: 'Andreas B.', country: 'Cyprus', flag: '🇨🇾', type: 'deposit', amount: 33000, asset: 'BTC' },
  { name: 'Bruno S.', country: 'Portugal', flag: '🇵🇹', type: 'withdrawal', amount: 9100, asset: 'USDT' },
  { name: 'Tiago R.', country: 'Portugal', flag: '🇵🇹', type: 'deposit', amount: 14000, asset: 'USDT' },
  { name: 'Gustav A.', country: 'Sweden', flag: '🇸🇪', type: 'withdrawal', amount: 15400, asset: 'BTC' },
  { name: 'Kasper N.', country: 'Denmark', flag: '🇩🇰', type: 'investment', amount: 22500, asset: 'USDT', planName: 'Private Wealth Vault' },
  { name: 'Magnus E.', country: 'Norway', flag: '🇳🇴', type: 'deposit', amount: 29000, asset: 'BTC' },
  { name: 'Lucas W.', country: 'Australia', flag: '🇦🇺', type: 'deposit', amount: 16000, asset: 'USDT' },
  { name: 'Cooper T.', country: 'Australia', flag: '🇦🇺', type: 'withdrawal', amount: 10500, asset: 'USDT' },
  { name: 'Harrison B.', country: 'Australia', flag: '🇦🇺', type: 'investment', amount: 32000, asset: 'BTC', planName: 'Institutional Tier' },
  { name: 'Caleb F.', country: 'New Zealand', flag: '🇳🇿', type: 'withdrawal', amount: 6800, asset: 'USDT' },
  { name: 'Logan M.', country: 'Canada', flag: '🇨🇦', type: 'deposit', amount: 17500, asset: 'BTC' },
  { name: 'Hunter P.', country: 'Canada', flag: '🇨🇦', type: 'investment', amount: 26000, asset: 'USDT', planName: 'Private Wealth Vault' },
  { name: 'Brayden K.', country: 'Canada', flag: '🇨🇦', type: 'withdrawal', amount: 11500, asset: 'USDT' },
  { name: 'Zachary D.', country: 'United States', flag: '🇺🇸', type: 'deposit', amount: 38000, asset: 'USDT' },
  { name: 'Tyler R.', country: 'United States', flag: '🇺🇸', type: 'investment', amount: 42000, asset: 'BTC', planName: 'Institutional Tier' },
  { name: 'Brandon S.', country: 'United States', flag: '🇺🇸', type: 'withdrawal', amount: 17800, asset: 'USDT' },
  { name: 'Austin W.', country: 'United States', flag: '🇺🇸', type: 'deposit', amount: 21500, asset: 'ETH' },
  { name: 'Dylan G.', country: 'United States', flag: '🇺🇸', type: 'deposit', amount: 13000, asset: 'USDT' },
  { name: 'Cameron T.', country: 'United States', flag: '🇺🇸', type: 'investment', amount: 19500, asset: 'USDT', planName: 'Private Wealth Vault' },
  { name: 'Christian P.', country: 'United States', flag: '🇺🇸', type: 'withdrawal', amount: 14000, asset: 'BTC' },
  { name: 'Jordan L.', country: 'United States', flag: '🇺🇸', type: 'deposit', amount: 27500, asset: 'USDT' },
  { name: 'Nathan M.', country: 'United States', flag: '🇺🇸', type: 'investment', amount: 62000, asset: 'BTC', planName: 'Sovereign Institutional' },
  { name: 'Dominic H.', country: 'United States', flag: '🇺🇸', type: 'withdrawal', amount: 19200, asset: 'USDT' },
  { name: 'Adrian C.', country: 'United States', flag: '🇺🇸', type: 'deposit', amount: 15500, asset: 'BTC' },
  { name: 'Xavier J.', country: 'United States', flag: '🇺🇸', type: 'deposit', amount: 31000, asset: 'USDT' },
  { name: 'Ezekiel D.', country: 'United States', flag: '🇺🇸', type: 'investment', amount: 28500, asset: 'USDT', planName: 'Private Wealth Vault' },
  { name: 'Vincent K.', country: 'United States', flag: '🇺🇸', type: 'withdrawal', amount: 16400, asset: 'ETH' },
  { name: 'Jeremiah B.', country: 'United States', flag: '🇺🇸', type: 'deposit', amount: 9500, asset: 'USDT' },
  { name: 'Elias S.', country: 'United States', flag: '🇺🇸', type: 'deposit', amount: 18500, asset: 'BTC' },
  { name: 'Colton V.', country: 'United States', flag: '🇺🇸', type: 'investment', amount: 24500, asset: 'USDT', planName: 'Private Wealth Vault' },
  { name: 'Kayden T.', country: 'United States', flag: '🇺🇸', type: 'withdrawal', amount: 8900, asset: 'USDT' },
];

export function LiveActivityNotification() {
  const [currentTx, setCurrentTx] = useState<SocialProofTransaction | null>(null);
  const [timeAgo, setTimeAgo] = useState('just now');
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Initial delay before showing first popup so user can view hero cleanly
    const initialTimer = setTimeout(() => {
      showRandomTransaction();
    }, 4500);

    const intervalTimer = setInterval(() => {
      showRandomTransaction();
    }, 11000); // Trigger every 11 seconds

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, []);

  const showRandomTransaction = () => {
    const randomIndex = Math.floor(Math.random() * DEMO_TRANSACTIONS_POOL.length);
    const tx = DEMO_TRANSACTIONS_POOL[randomIndex];
    setCurrentTx(tx);
    
    // Pick realistic time ago
    const times = ['just now', '12s ago', '24s ago', '48s ago', '1m ago', '2m ago'];
    setTimeAgo(times[Math.floor(Math.random() * times.length)]);
    setIsDismissed(false);

    // Auto-hide popup after 5 seconds to never block reading or clicks
    setTimeout(() => {
      setIsDismissed(true);
    }, 5500);
  };

  if (!currentTx || isDismissed) return null;

  const isDeposit = currentTx.type === 'deposit';
  const isInvestment = currentTx.type === 'investment';
  const isWithdrawal = currentTx.type === 'withdrawal';

  const badgeColor = isDeposit
    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : isInvestment
    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    : 'bg-sky-500/15 text-sky-400 border-sky-500/30';

  const actionText = isDeposit
    ? 'deposited'
    : isInvestment
    ? 'invested into'
    : 'withdrew';

  const IconComponent = isDeposit ? ArrowDownLeft : isInvestment ? TrendingUp : ArrowUpRight;

  return (
    <div className="fixed bottom-5 left-5 z-40 max-w-sm pointer-events-none">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="pointer-events-auto bg-[#0A0D14]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 shadow-2xl shadow-black/80 flex items-start gap-3.5 group hover:border-primary/40 transition-all select-none"
        >
          {/* Visual Indicator Icon */}
          <div className="relative mt-0.5">
            <div className={`size-9 rounded-xl flex items-center justify-center border ${badgeColor}`}>
              <IconComponent size={16} />
            </div>
            <span className="absolute -top-1 -right-1 text-xs">
              {currentTx.flag}
            </span>
          </div>

          {/* Transaction Narrative Details */}
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-1.5 leading-tight">
              <span className="font-bold text-white text-xs truncate">
                {currentTx.name}
              </span>
              <span className="text-[10px] text-white/40 font-mono">
                from {currentTx.country}
              </span>
            </div>

            <p className="text-xs text-white/80 mt-1 leading-snug">
              Has {actionText}{' '}
              <span className="font-mono font-black text-amber-400">
                ${currentTx.amount.toLocaleString()}
              </span>{' '}
              <span className="text-[10px] font-mono text-white/50">
                ({currentTx.asset})
              </span>
              {currentTx.planName && (
                <span className="text-white/60 text-[11px] block mt-0.5 font-medium">
                  → {currentTx.planName}
                </span>
              )}
            </p>

            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle size={10} /> Verified On-Chain
              </span>
              <span className="text-[9px] font-mono text-white/30">•</span>
              <span className="text-[9px] font-mono text-white/40">{timeAgo}</span>
            </div>
          </div>

          {/* Close / Dismiss button */}
          <button
            onClick={() => setIsDismissed(true)}
            className="text-white/30 hover:text-white p-1 rounded-md transition-colors"
            title="Dismiss notification"
          >
            <X size={12} />
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
