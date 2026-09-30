import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { ShieldAlert, Copy, Check, ExternalLink, Globe } from 'lucide-react';

interface AuthorizedDomainModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  actionType?: 'google' | 'reset-password';
}

export function AuthorizedDomainModal({
  isOpen,
  onOpenChange,
  actionType = 'google',
}: AuthorizedDomainModalProps) {
  const [copied, setCopied] = useState(false);
  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleCopy = () => {
    if (navigator.clipboard && currentDomain) {
      navigator.clipboard.writeText(currentDomain);
      setCopied(true);
      toast.success('Domain copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border shadow-2xl rounded-3xl p-6 overflow-hidden">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-3 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
          </div>
          <DialogTitle className="text-xl font-black italic tracking-tight text-white uppercase">
            Authorize Domain in Firebase
          </DialogTitle>
          <DialogDescription className="text-xs text-white/60 mt-1">
            {actionType === 'google'
              ? 'Google Sign-In requires your domain to be authorized in Firebase Authentication security settings.'
              : 'Password reset redirect requires this domain to be authorized in Firebase Console.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Domain Box */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">
              Your App Host Domain
            </span>
            <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl font-mono text-xs text-white break-all">
              <Globe className="w-4 h-4 text-primary shrink-0" />
              <span className="flex-1 select-all">{currentDomain}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopy}
                className="h-8 px-2.5 text-xs text-primary hover:bg-primary/10 shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span className="ml-1 text-[11px] font-bold">{copied ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>
          </div>

          {/* Quick Step Guide */}
          <div className="p-3.5 bg-black/40 border border-white/10 rounded-xl space-y-2 text-xs text-white/70">
            <div className="font-bold text-white text-[11px] uppercase tracking-wider text-amber-400">
              Quick 30-Second Fix:
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-[11px] leading-relaxed">
              <li>
                Open the{' '}
                <a
                  href="https://console.firebase.google.com/project/goldbrick-cd2b5/authentication/settings"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline font-bold inline-flex items-center gap-0.5 hover:text-primary/80"
                >
                  Firebase Authentication Settings <ExternalLink className="w-2.5 h-2.5 inline" />
                </a>
              </li>
              <li>
                Scroll down to the <strong className="text-white">Authorized domains</strong> section.
              </li>
              <li>
                Click <strong className="text-white">Add domain</strong>, paste the domain above, and click <strong className="text-white">Save</strong>.
              </li>
            </ol>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-11 rounded-xl border-white/10 text-white/70 hover:bg-white/5 text-xs font-bold"
          >
            Close
          </Button>
          <a
            href="https://console.firebase.google.com/project/goldbrick-cd2b5/authentication/settings"
            target="_blank"
            rel="noreferrer"
            className="flex-1"
          >
            <Button
              className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20"
            >
              <span>Open Firebase</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
