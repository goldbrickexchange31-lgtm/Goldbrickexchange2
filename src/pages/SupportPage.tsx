import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import {
  MessageSquare,
  Send,
  Phone as WhatsApp,
  ShieldCheck,
  ArrowLeft,
  Info,
  Zap,
  Check,
  CheckCheck,
  Headphones,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  writeBatch,
} from 'firebase/firestore';
import { toast } from 'sonner';
import {
  ChatAutoReplyConfig,
  DEFAULT_CHAT_AUTO_REPLY,
  isUserEligibleForAutoReply,
  toDateSafe,
} from '../lib/chatSupport';

export default function SupportPage() {
  const { user, userData } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [chatMeta, setChatMeta] = useState<any>(null);
  const [autoReplyConfig, setAutoReplyConfig] = useState<ChatAutoReplyConfig>(DEFAULT_CHAT_AUTO_REPLY);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasInitialScrolled = useRef(false);
  const chatExistsRef = useRef(false);
  const autoReplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load general platform config (WhatsApp link, etc.)
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'config', 'general'),
      (snap) => {
        if (snap.exists()) setConfig(snap.data());
      },
      (err) => console.warn('Config snapshot notice:', err?.message || err)
    );
    return () => unsub();
  }, []);

  // Load live Auto Quick Reply configuration
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      doc(db, 'settings', 'chatAutoReply'),
      (snap) => {
        if (snap.exists()) {
          setAutoReplyConfig({ ...DEFAULT_CHAT_AUTO_REPLY, ...(snap.data() as any) });
        }
      },
      (err) => console.warn('Auto-reply config notice:', err?.message || err)
    );
    return () => unsub();
  }, [user]);

  // Listen to parent chat doc for metadata & cooldown tracking
  useEffect(() => {
    if (!user) return;
    const chatRef = doc(db, 'chats', user.uid);
    const unsub = onSnapshot(
      chatRef,
      (snap) => {
        chatExistsRef.current = snap.exists();
        setChatMeta(snap.exists() ? snap.data() : null);
      },
      (err) => console.warn('Chat meta notice:', err?.message || err)
    );
    return () => unsub();
  }, [user]);

  // Mark incoming admin messages as read when user is actively viewing
  const markAdminMessagesAsRead = useCallback(
    async (currentMessages: any[]) => {
      if (!user || typeof document === 'undefined' || document.visibilityState !== 'visible') {
        return;
      }

      const unreadAdminMsgs = currentMessages.filter(
        (m) => m.id && m.senderId === 'admin' && m.readByUser !== true
      );

      if (unreadAdminMsgs.length === 0) return;

      try {
        const batch = writeBatch(db);
        unreadAdminMsgs.forEach((m) => {
          const msgRef = doc(db, 'chats', user.uid, 'messages', m.id);
          batch.update(msgRef, {
            readByUser: true,
            readAt: serverTimestamp(),
          });
        });

        if (chatExistsRef.current) {
          batch.update(doc(db, 'chats', user.uid), {
            unreadByUser: false,
            userLastActive: serverTimestamp(),
            userOnline: true,
          });
        }

        await batch.commit();
      } catch (err: any) {
        console.warn('Read receipt update notice:', err?.message || err);
      }
    },
    [user]
  );

  // Listen to chat messages and mark incoming admin messages as viewed
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'chats', user.uid, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(150)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMessages(msgs);
        markAdminMessagesAsRead(msgs);
      },
      (err) => console.warn('Messages snapshot notice:', err?.message || err)
    );
    return () => unsub();
  }, [user, markAdminMessagesAsRead]);

  // Re-check read receipts & update presence when returning to tab or focusing window
  useEffect(() => {
    if (!user) return;

    const updateChatPresence = async (online: boolean) => {
      if (!chatExistsRef.current) return;
      try {
        await updateDoc(doc(db, 'chats', user.uid), {
          userOnline: online,
          userLastActive: serverTimestamp(),
        });
      } catch {
        // Ignore if doc doesn't exist yet
      }
    };

    updateChatPresence(true);
    const heartbeat = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updateChatPresence(true);
      }
    }, 45_000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        updateChatPresence(true);
        markAdminMessagesAsRead(messages);
      } else {
        updateChatPresence(false);
      }
    };

    const handleFocus = () => {
      updateChatPresence(true);
      markAdminMessagesAsRead(messages);
    };

    const handlePageHide = () => {
      updateChatPresence(false);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pagehide', handlePageHide);
      updateChatPresence(false);
    };
  }, [user, messages, markAdminMessagesAsRead]);

  // Initial scroll to latest message on open
  useEffect(() => {
    if (messages.length > 0 && !hasInitialScrolled.current) {
      const timer = setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
        hasInitialScrolled.current = true;
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  useEffect(() => {
    return () => {
      if (autoReplyTimerRef.current) {
        clearTimeout(autoReplyTimerRef.current);
      }
    };
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !user || sending) return;

    setInput('');
    setSending(true);

    try {
      const displayName = userData?.displayName || user.email?.split('@')[0] || 'Client';
      const email = userData?.email || user.email || '';

      await addDoc(collection(db, 'chats', user.uid, 'messages'), {
        text: trimmed,
        senderId: user.uid,
        senderName: displayName,
        readByAdmin: false,
        createdAt: serverTimestamp(),
      });

      const chatRef = doc(db, 'chats', user.uid);
      await setDoc(
        chatRef,
        {
          lastMessage: trimmed,
          lastSenderId: user.uid,
          lastActive: serverTimestamp(),
          userLastActive: serverTimestamp(),
          userOnline: true,
          userName: displayName,
          userEmail: email,
          userId: user.uid,
          unreadByAdmin: true,
        },
        { merge: true }
      );
      chatExistsRef.current = true;

      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 80);

      // Check & trigger Automated Admin Quick Reply if enabled for this user
      let activeAutoCfg = autoReplyConfig;
      try {
        const freshSnap = await getDoc(doc(db, 'settings', 'chatAutoReply'));
        if (freshSnap.exists()) {
          activeAutoCfg = { ...DEFAULT_CHAT_AUTO_REPLY, ...(freshSnap.data() as any) };
        }
      } catch {
        // Fallback to cached snapshot
      }

      if (isUserEligibleForAutoReply(activeAutoCfg, user.uid)) {
        const cooldownMs = Math.max(0, Number(activeAutoCfg.cooldownMinutes ?? 5)) * 60 * 1000;
        const lastAutoAt = toDateSafe(chatMeta?.lastAutoReplyAt)?.getTime() || 0;
        const lastManualAdminAt = toDateSafe(chatMeta?.lastManualAdminReplyAt)?.getTime() || 0;
        const now = Date.now();

        // Send if cooldown elapsed, or if admin manually replied since the previous auto-reply
        const shouldSendAutoReply =
          cooldownMs === 0 ||
          lastAutoAt === 0 ||
          lastManualAdminAt > lastAutoAt ||
          now - lastAutoAt >= cooldownMs;

        if (shouldSendAutoReply) {
          const replyText = activeAutoCfg.message.trim();
          if (autoReplyTimerRef.current) clearTimeout(autoReplyTimerRef.current);

          autoReplyTimerRef.current = setTimeout(async () => {
            try {
              const userViewingNow =
                typeof document !== 'undefined' && document.visibilityState === 'visible';

              await addDoc(collection(db, 'chats', user.uid, 'messages'), {
                text: replyText,
                senderId: 'admin',
                senderName: 'GoldBrick Support (Auto-Reply)',
                isAutoReply: true,
                readByUser: userViewingNow,
                readAt: userViewingNow ? serverTimestamp() : null,
                createdAt: serverTimestamp(),
              });

              await setDoc(
                chatRef,
                {
                  lastMessage: replyText,
                  lastSenderId: 'admin',
                  lastAutoReplyAt: serverTimestamp(),
                  unreadByUser: !userViewingNow,
                  // Preserve unreadByAdmin: true so admin still sees the user's incoming message!
                  unreadByAdmin: true,
                },
                { merge: true }
              );

              setTimeout(() => {
                scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
              }, 80);
            } catch (autoErr) {
              console.warn('Auto quick-reply dispatch notice:', autoErr);
            }
          }, 600);
        }
      }
    } catch {
      toast.error('Failed to send message');
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex-1 min-h-0 flex flex-col gap-4 md:gap-6 h-full">
        {/* Desktop Top Heading (hidden on mobile for full-page chat experience) */}
        <div className="hidden md:flex items-center justify-between gap-6 shrink-0">
          <div className="space-y-1">
            <h1 className="text-3xl font-black italic tracking-tighter uppercase vibrant-text leading-tight flex items-center gap-3">
              <MessageSquare className="text-primary size-8" /> Support Hub
            </h1>
            <p className="text-white/45 font-bold text-[11px] uppercase tracking-widest">
              Encrypted point-to-point communication · Avg response{' '}
              <span className="text-primary">under 15 minutes</span>
            </p>
          </div>
          {config?.whatsappLink && (
            <a href={config.whatsappLink} target="_blank" rel="noopener noreferrer">
              <Button className="bg-[#25D366] hover:bg-[#128C7E] text-white font-black h-12 px-6 rounded-2xl shadow-lg flex items-center gap-2.5 transition-all hover:scale-105 uppercase text-xs tracking-widest cursor-pointer">
                <WhatsApp className="size-5" /> WhatsApp Support
              </Button>
            </a>
          )}
        </div>

        {/* Main Chat Grid (Full-Screen Mobile + Balanced Desktop Split) */}
        <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
          <div className="xl:col-span-2 flex flex-col min-h-0 h-full">
            <Card className="bg-card border-border flex-1 min-h-0 flex flex-col shadow-2xl rounded-none md:rounded-[2rem] overflow-hidden border-0 md:border h-full">
              {/* Compact Mobile-Optimized Chat Header */}
              <CardHeader className="border-b border-border bg-white/5 px-3.5 py-3 md:px-6 md:py-4 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 md:gap-3.5 min-w-0">
                    <Link
                      to="/dashboard"
                      aria-label="Back to Dashboard"
                      className="md:hidden size-9 rounded-xl bg-white/5 border border-border flex items-center justify-center text-white/70 hover:text-white shrink-0"
                    >
                      <ArrowLeft className="size-4" />
                    </Link>
                    <div className="relative size-10 md:size-11 bg-primary/15 rounded-xl md:rounded-2xl border border-primary/30 flex items-center justify-center shrink-0">
                      <Headphones className="text-primary size-5" />
                      <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-green-500 ring-2 ring-card animate-pulse" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm md:text-base font-black text-white italic uppercase tracking-tight truncate">
                        GoldBrick Support
                      </CardTitle>
                      <div className="flex items-center gap-1.5 text-[10px] text-green-400 font-bold uppercase tracking-wider">
                        <span className="truncate">Priority Desk • Online</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                    {config?.whatsappLink && (
                      <a
                        href={config.whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="xl:hidden inline-flex items-center gap-1.5 h-8 px-2.5 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] text-[10px] font-black uppercase tracking-wider"
                        title="WhatsApp Support"
                      >
                        <WhatsApp className="size-3.5" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsInfoOpen(true)}
                      aria-label="Security Directives & Info"
                      className="xl:hidden size-8 rounded-xl bg-white/5 border border-border flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
                    >
                      <Info className="size-4" />
                    </button>
                    <Badge className="hidden sm:inline-flex bg-primary/15 text-primary border border-primary/20 font-black px-3 py-1 rounded-full uppercase text-[9px] tracking-widest">
                      Secure Link
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              {/* Scrollable Messages Area */}
              <CardContent className="flex-1 min-h-0 overflow-y-auto px-3.5 py-4 md:p-6 space-y-3.5 bg-black/20 scroll-smooth no-scrollbar">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-10 px-6">
                    <div className="size-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center">
                      <MessageSquare size={30} className="text-primary" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-lg font-black italic uppercase text-white">Start a Conversation</h4>
                      <p className="text-xs font-medium text-white/50 leading-relaxed max-w-xs">
                        Send a message below to connect directly with our GoldBrick wealth & support team.
                      </p>
                    </div>
                  </div>
                )}

                {messages.map((m, i) => {
                  const isMine = m.senderId === user?.uid;
                  const msgTime = toDateSafe(m.createdAt);
                  return (
                    <div
                      key={m.id || i}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[78%] px-4 py-3 rounded-2xl text-sm md:text-[15px] shadow-sm ${
                          isMine
                            ? 'bg-primary text-primary-foreground font-semibold rounded-tr-sm shadow-primary/10'
                            : 'bg-card text-white/95 border border-border rounded-tl-sm font-normal'
                        }`}
                      >
                        {!isMine && m.isAutoReply && (
                          <div className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full mb-1.5">
                            <Zap className="size-2.5" />
                            Auto Quick Reply
                          </div>
                        )}
                        <p className="leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>
                        <div
                          className={`flex items-center justify-end gap-1.5 text-[10px] mt-1.5 font-mono ${
                            isMine ? 'text-primary-foreground/70' : 'text-white/35'
                          }`}
                        >
                          <span>
                            {msgTime
                              ? msgTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : 'Sending...'}
                          </span>
                          {isMine &&
                            (m.readByAdmin ? (
                              <CheckCheck className="size-3.5 text-sky-900" aria-label="Seen by support" />
                            ) : (
                              <Check className="size-3.5 opacity-60" aria-label="Sent" />
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={scrollRef} />
              </CardContent>

              {/* Sticky Mobile-Friendly Composer */}
              <div className="p-3 md:p-4 border-t border-border bg-card shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 md:gap-3">
                  <Input
                    placeholder="Type your message..."
                    className="bg-background border-border flex-1 h-12 md:h-13 text-white placeholder:text-white/30 font-medium px-4 rounded-xl md:rounded-2xl text-sm md:text-base focus-visible:ring-1 focus-visible:ring-primary/50"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <Button
                    type="submit"
                    disabled={!input.trim() || sending}
                    size="icon"
                    className="size-12 md:size-13 bg-primary text-primary-foreground rounded-xl md:rounded-2xl shadow-lg shadow-primary/25 hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="size-5" />
                  </Button>
                </form>
              </div>
            </Card>
          </div>

          {/* Desktop Side Cards (moved to Info dialog on mobile/tablet so chat stays full-page) */}
          <div className="hidden xl:flex flex-col gap-6 overflow-y-auto no-scrollbar">
            <Card className="bg-card border-border shadow-xl rounded-[2rem] border-t-4 border-t-primary border">
              <CardHeader className="p-6 pb-2">
                <CardTitle className="text-lg font-black italic uppercase tracking-tighter text-white">
                  GoldBrick Directives
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex gap-3.5 p-4 bg-white/5 rounded-2xl border border-border">
                  <ShieldCheck className="text-primary size-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="font-black italic uppercase text-xs text-white">Zero-Trust Protocol</h5>
                    <p className="text-[10px] text-white/45 font-bold leading-relaxed uppercase tracking-tight">
                      Our staff will NEVER ask for passwords, private keys, or seed phrases.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3.5 p-4 bg-white/5 rounded-2xl border border-border">
                  <WhatsApp className="text-green-500 size-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="font-black italic uppercase text-xs text-white">Priority Uplink</h5>
                    <p className="text-[10px] text-white/45 font-bold leading-relaxed uppercase tracking-tight">
                      Use WhatsApp for immediate assistance regarding pending deposits.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <a
              href={config?.whatsappLink || '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!config?.whatsappLink) {
                  e.preventDefault();
                  toast.info('Emergency support is only available via the direct link provided by our administrators.');
                }
              }}
              className={`block group transition-all active:scale-95 ${
                !config?.whatsappLink ? 'cursor-not-allowed opacity-60' : ''
              }`}
            >
              <Card
                className={`bg-card border-border shadow-2xl rounded-[2rem] overflow-hidden transition-all duration-500 border ${
                  config?.whatsappLink ? 'hover:border-primary/50 hover:bg-white/5' : ''
                }`}
              >
                <div className={`h-2 bg-[#25D366] ${config?.whatsappLink ? '' : 'grayscale'}`} />
                <CardContent className="p-6 text-center space-y-4">
                  <div className="flex justify-center">
                    <div
                      className={`size-14 rounded-2xl flex items-center justify-center ${
                        config?.whatsappLink ? 'bg-[#25D366] text-white shadow-xl' : 'bg-white/5 text-slate-300'
                      }`}
                    >
                      <WhatsApp className="size-7" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div
                      className={`font-black uppercase italic tracking-tighter text-lg ${
                        config?.whatsappLink ? 'vibrant-text' : 'text-white/20'
                      }`}
                    >
                      Emergency Support
                    </div>
                    <p className="text-[10px] text-white/45 font-bold leading-relaxed uppercase tracking-widest">
                      24/7 response unit for account security & liquidity inquiries.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    disabled={!config?.whatsappLink}
                    className={`w-full font-black uppercase text-[10px] tracking-[0.2em] h-10 rounded-xl ${
                      config?.whatsappLink
                        ? 'text-primary hover:bg-primary/5 border border-primary/20'
                        : 'text-white/20 border border-white/10'
                    }`}
                  >
                    {config?.whatsappLink ? 'INITIATE UPLINK' : 'LINK STANDBY'}
                  </Button>
                </CardContent>
              </Card>
            </a>
          </div>
        </div>
      </div>

      {/* Mobile Info Modal for GoldBrick Directives & Emergency Support */}
      <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
        <DialogContent className="bg-card border-border text-white sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black italic uppercase tracking-tight text-white">
              Support Guidelines
            </DialogTitle>
            <DialogDescription className="text-xs text-white/50">
              Security rules & direct escalation channels.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex gap-3 p-4 bg-white/5 rounded-2xl border border-border">
              <ShieldCheck className="text-primary size-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h5 className="font-black italic uppercase text-xs text-white">Zero-Trust Protocol</h5>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  GoldBrick staff will NEVER ask for passwords, private keys, or seed phrases.
                </p>
              </div>
            </div>
            {config?.whatsappLink && (
              <a
                href={config.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 w-full h-12 rounded-2xl bg-[#25D366] text-white font-black uppercase text-xs tracking-wider"
              >
                <WhatsApp className="size-5" /> Open WhatsApp Support
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
