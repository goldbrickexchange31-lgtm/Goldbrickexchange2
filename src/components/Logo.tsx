import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "h-12" }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="h-full w-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="gold-royal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
          <linearGradient id="gold-border" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>

        <g transform="translate(5, 5) scale(0.9)">
          <rect x="0" y="0" width="100" height="100" rx="22" fill="url(#gold-royal)" />
          <rect x="2" y="2" width="96" height="96" rx="20" fill="none" stroke="url(#gold-border)" strokeWidth="2" opacity="0.4" />
          <path
            d="M50 20 L76 35 V65 L50 80 L24 65 V35 Z"
            fill="#0F121B"
            opacity="0.35"
          />
          <path
            d="M65 35 C65 35 58 30 50 30 C40 30 33 37 33 50 C33 63 40 70 50 70 C58 70 65 65 65 65 V55 H50"
            stroke="#0A0B10"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      </svg>
      
      <div className="flex flex-col justify-center select-none">
        <div className="text-2xl font-['Space_Grotesk',sans-serif] font-bold tracking-[0.09em] leading-none live-gold-shimmer">
          GOLDBRICK
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-amber-400/40 to-amber-400/80" />
          <span className="flex items-center gap-1.5 text-[9px] font-['Plus_Jakarta_Sans',sans-serif] font-black text-amber-300 tracking-[0.35em] uppercase leading-none drop-shadow-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400"></span>
            </span>
            EXCHANGE
          </span>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-amber-400/80 via-amber-400/40 to-transparent" />
        </div>
      </div>
    </div>
  );
};
