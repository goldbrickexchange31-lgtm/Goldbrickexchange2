import { FC } from 'react';
import { X, ExternalLink, Download, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/button';

interface ProofLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  userName?: string;
  amount?: number | string;
  currency?: string;
  date?: string;
}

export const ProofLightboxModal: FC<ProofLightboxModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'Payment Evidence Audit',
  userName,
  amount,
  currency = '$',
  date,
}) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[96vh] flex flex-col bg-card border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ImageIcon className="size-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black uppercase italic tracking-tight text-white">{title}</h3>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/40">
                {userName ? `Submitted by ${userName}` : 'Ledger Evidence Receipt'}
                {amount !== undefined ? ` • ${currency}${Number(amount).toLocaleString()}` : ''}
                {date ? ` • ${date}` : ''}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <a 
              href={imageUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              title="Open raw image in new tab"
            >
              <ExternalLink className="size-5" />
            </a>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              aria-label="Close proof viewer"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Modal Image Body with Zoom/Scroll */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-black/40 min-h-[300px]">
          <img 
            src={imageUrl} 
            alt="Payment receipt proof" 
            className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-2xl border border-white/5"
          />
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-border/80 bg-white/[0.02] flex items-center justify-between text-xs text-white/40 font-mono">
          <span>Click outside or press close when done</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onClose} 
            className="h-9 px-4 rounded-xl text-white font-bold text-xs"
          >
            Close Viewer
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProofLightboxModal;
