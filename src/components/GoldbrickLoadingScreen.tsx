import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Lock, Sparkles, Cpu } from 'lucide-react';

interface GoldbrickLoadingScreenProps {
  subtitle?: string;
  onComplete?: () => void;
  minDuration?: number;
}

const SECURITY_STEPS = [
  'INITIALIZING QUANTUM VAULT ENCRYPTION...',
  'SYNCHRONIZING ASSET LEDGER & RATES...',
  'VERIFYING 256-BIT PROTOCOL HANDSHAKE...',
  'GOLDBRICK FINANCIAL GATEWAY CONNECTED',
];

export const GoldbrickLoadingScreen: React.FC<GoldbrickLoadingScreenProps> = ({
  subtitle,
  onComplete,
  minDuration = 1200,
}) => {
  const [progress, setProgress] = useState(12);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.round((elapsed / minDuration) * 100), 100);
      setProgress(pct);

      if (pct < 35) {
        setStepIndex(0);
      } else if (pct < 65) {
        setStepIndex(1);
      } else if (pct < 90) {
        setStepIndex(2);
      } else {
        setStepIndex(3);
      }

      if (pct >= 100) {
        clearInterval(interval);
        if (onComplete) {
          setTimeout(onComplete, 200);
        }
      }
    }, 25);

    return () => clearInterval(interval);
  }, [minDuration, onComplete]);

  return (
    <div 
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#05080D] overflow-hidden select-none"
      role="status"
      aria-label="Loading Goldbrick Exchange"
    >
      {/* Ambient Moving Gold Radial Atmosphere */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background: 'radial-gradient(circle at 50% 45%, rgba(245, 169, 0, 0.22) 0%, rgba(213, 183, 121, 0.08) 40%, rgba(5, 8, 13, 0) 70%)',
        }}
      />

      {/* Subtle Golden Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(245, 169, 0, 0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(245, 169, 0, 0.6) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Central Emblem & Gyroscopic Rings */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Outer Counter-Rotating Segmented Gyro Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
          className="absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full border border-dashed border-amber-400/25 pointer-events-none"
        >
          {/* Tick nodes on outer ring */}
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_#F5A900]" />
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-300/60" />
          <span className="absolute top-1/2 -left-1 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-300/60" />
          <span className="absolute top-1/2 -right-1 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-300/60" />
        </motion.div>

        {/* Inner Counter-Rotating Precision Orbit Ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          className="absolute w-36 h-36 sm:w-40 sm:h-40 rounded-full border border-amber-400/35 border-t-amber-300 border-r-transparent pointer-events-none shadow-[0_0_20px_rgba(245,169,0,0.15)]"
        />

        {/* Pulsing Core Glow */}
        <motion.div
          animate={{ scale: [0.95, 1.1, 0.95], opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-28 h-28 rounded-full bg-amber-500/20 blur-xl pointer-events-none"
        />

        {/* Goldbrick Royal Crest Emblem */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center"
        >
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full drop-shadow-[0_0_24px_rgba(245,169,0,0.45)]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="load-gold-royal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE68A" />
                <stop offset="45%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#B45309" />
              </linearGradient>
              <linearGradient id="load-gold-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFF" />
                <stop offset="60%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#92400E" />
              </linearGradient>
            </defs>

            <g transform="translate(6, 6) scale(0.88)">
              {/* Outer Golden Rounded Cube */}
              <rect x="0" y="0" width="100" height="100" rx="24" fill="url(#load-gold-royal)" />
              <rect 
                x="2.5" 
                y="2.5" 
                width="95" 
                height="95" 
                rx="21.5" 
                fill="none" 
                stroke="url(#load-gold-stroke)" 
                strokeWidth="2.5" 
                opacity="0.6" 
              />
              
              {/* Inner Diamond Geometry */}
              <path
                d="M50 18 L78 35 V65 L50 82 L22 65 V35 Z"
                fill="#0A0C13"
                opacity="0.4"
              />

              {/* Bold Iconic 'G' Monogram */}
              <path
                d="M66 34 C66 34 58 28 49 28 C38 28 30 36 30 50 C30 64 38 72 49 72 C58 72 66 66 66 66 V54 H49"
                stroke="#080A10"
                strokeWidth="8.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </g>
          </svg>
        </motion.div>
      </div>

      {/* Brand Identity Typography */}
      <div className="mt-8 flex flex-col items-center text-center px-4">
        <h2 className="text-xl sm:text-2xl font-['Space_Grotesk',sans-serif] font-bold tracking-[0.16em] text-white">
          <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(245,169,0,0.35)]">
            GOLDBRICK
          </span>
          <span className="text-white/90 ml-2 font-medium">EXCHANGE</span>
        </h2>

        {/* Dynamic Context Subtitle */}
        <p className="mt-1 text-[11px] sm:text-xs font-mono font-semibold tracking-[0.25em] uppercase text-amber-400/80">
          {subtitle || 'INSTITUTIONAL ASSET GATEWAY'}
        </p>
      </div>

      {/* Precision Progress Bar Section */}
      <div className="mt-8 w-64 sm:w-80 flex flex-col items-center px-4">
        {/* Progress Track */}
        <div className="relative w-full h-1.5 sm:h-2 rounded-full bg-white/5 border border-white/10 overflow-hidden shadow-inner backdrop-blur-sm">
          {/* Animated Gold Fill */}
          <motion.div
            className="h-full bg-gradient-to-r from-amber-500 via-amber-300 to-white rounded-full relative"
            style={{ width: `${progress}%` }}
            transition={{ ease: 'easeOut', duration: 0.1 }}
          >
            {/* Glowing Specular Head Spark */}
            <span className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white blur-[2px] shadow-[0_0_12px_#FFF]" />
          </motion.div>
        </div>

        {/* Progress Percentage & Status Readout */}
        <div className="w-full mt-3 flex items-center justify-between text-[11px] font-mono text-white/70">
          <span className="flex items-center gap-1.5 text-amber-300 font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>SECURE LINK</span>
          </span>

          <span className="font-bold text-amber-400 font-mono tracking-widest text-xs">
            {progress}%
          </span>
        </div>

        {/* Step-by-Step Security Protocol Text */}
        <div className="mt-2.5 h-5 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={stepIndex}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="text-[10px] sm:text-[11px] font-mono font-medium tracking-wider text-white/60 text-center uppercase truncate max-w-full"
            >
              {SECURITY_STEPS[stepIndex]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Institutional Security Assurance Footer */}
      <div className="absolute bottom-6 sm:bottom-8 flex items-center gap-3 sm:gap-4 text-[10px] font-mono tracking-widest text-white/40 uppercase">
        <div className="flex items-center gap-1">
          <ShieldCheck size={12} className="text-amber-400" />
          <span>256-Bit SSL Insured</span>
        </div>
        <span className="text-white/20">•</span>
        <div className="flex items-center gap-1">
          <Lock size={11} className="text-amber-400" />
          <span>Quantum Shield</span>
        </div>
      </div>
    </div>
  );
};
