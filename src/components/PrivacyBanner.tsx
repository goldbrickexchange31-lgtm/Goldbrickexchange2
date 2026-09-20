import { useState, useEffect } from 'react';
import { Shield, ExternalLink, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyBanner() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const ack = localStorage.getItem('gb_privacy_acknowledged');
      if (!ack) {
        // Show after brief delay so it doesn't jarringly pop on immediate paint
        const timer = setTimeout(() => setIsOpen(true), 2000);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore storage restrictions
    }
  }, []);

  const handleDismiss = () => {
    setIsOpen(false);
    try {
      localStorage.setItem('gb_privacy_acknowledged', 'true');
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <aside aria-label="Privacy notice" className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-40 animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div className="bg-card/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-2xl p-4 text-white flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Shield size={14} />
            </div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white">
              Privacy & Telemetry Notice
            </h4>
          </div>
          <button 
            onClick={handleDismiss} 
            className="text-white/40 hover:text-white p-1 rounded-md transition-colors"
            title="Dismiss notice"
          >
            <X size={14} />
          </button>
        </div>

        <p className="text-[11px] text-white/60 leading-relaxed">
          We use approximate IP-based geolocation and basic device diagnostics solely to secure accounts, prevent multi-accounting fraud, and monitor platform health. We do not gather exact GPS locations, card details, or private credentials.
        </p>

        <div className="flex items-center justify-between pt-1 border-t border-white/5">
          <Link 
            to="/terms" 
            className="text-[10px] text-primary hover:underline font-bold uppercase tracking-wider inline-flex items-center gap-1"
          >
            Read Policies <ExternalLink size={10} />
          </Link>
          <button
            onClick={handleDismiss}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors shadow-sm"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </aside>
  );
}
