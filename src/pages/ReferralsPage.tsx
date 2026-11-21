import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Users, Copy, Gift, Check } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { toast } from 'sonner';

export default function ReferralsPage() {
  const { userData } = useAuth();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const referralLink = `${window.location.origin}/register?ref=${userData?.referralCode || ''}`;

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'config', 'general'), (snap) => {
      if (snap.exists()) setConfig(snap.data());
    });

    if (!userData?.referralCode) return () => unsubConfig();
    const q = query(
      collection(db, 'users'),
      where('referredBy', '==', userData.referralCode)
    );

    const unsub = onSnapshot(q, (snap) => {
      setReferrals(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => {
      unsub();
      unsubConfig();
    };
  }, [userData]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-10">
        {/* Header & Earnings Card */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-4 border-b border-white/[0.08]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Users className="size-3.5" />
              <span>Partner Program</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Referral Network</h1>
            <p className="text-sm text-white/55 max-w-xl">
              Invite partners to GoldBrick and earn a{' '}
              <span className="text-primary font-semibold">${config?.referralBonus || 200}.00</span> bonus when each partner activates an investment plan.
            </p>
          </div>

          <Card className="bg-[#0A0F18]/90 border-white/10 w-full lg:w-auto rounded-2xl">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="size-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/25 text-primary shrink-0">
                <Gift className="size-6" />
              </div>
              <div>
                <div className="text-xs text-white/50">Total Referral Earnings</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-white">
                  ${((userData as any)?.referralEarnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invitation Link Card */}
        <Card className="bg-[#0A0F18]/90 border-white/10 shadow-xl rounded-2xl">
          <CardHeader className="p-5 sm:p-6 pb-4 border-b border-white/[0.06]">
            <CardTitle className="text-base sm:text-lg font-semibold text-white">Your Personal Invite Link</CardTitle>
            <CardDescription className="text-xs text-white/50">
              Share this link so new registrations are credited automatically to your account
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                readOnly
                value={referralLink}
                className="bg-black/40 border-white/10 h-12 font-mono text-white flex-1 px-4 rounded-xl text-xs sm:text-sm"
              />
              <Button
                type="button"
                onClick={handleCopy}
                className="h-12 bg-primary text-slate-950 hover:bg-amber-400 font-semibold text-sm px-6 rounded-xl cursor-pointer shrink-0"
              >
                {copied ? <Check className="size-4 mr-2" /> : <Copy className="size-4 mr-2" />}
                {copied ? 'Copied' : 'Copy Link'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  step: '01',
                  title: 'Share Your Link',
                  desc: 'Send your unique registration link directly to friends or colleagues.'
                },
                {
                  step: '02',
                  title: 'Partner Joins & Stakes',
                  desc: 'Your invitee creates an account and initiates their first investment.'
                },
                {
                  step: '03',
                  title: 'Receive Instant Bonus',
                  desc: `Earn $${config?.referralBonus || 200} directly into your available wallet balance.`
                }
              ].map((item) => (
                <div key={item.step} className="p-5 bg-white/[0.03] rounded-xl border border-white/[0.07] space-y-2">
                  <div className="text-primary font-mono font-bold text-sm">{item.step}</div>
                  <div className="font-semibold text-white text-sm">{item.title}</div>
                  <p className="text-xs text-white/55 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Network Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Invited Partners ({referrals.length})</h2>
            <span className="text-xs text-white/45 font-mono">Live Status</span>
          </div>

          <Card className="bg-[#0A0F18]/90 border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/[0.03] text-white/50 text-xs font-medium border-b border-white/[0.07]">
                    <tr>
                      <th className="px-6 py-4">Partner</th>
                      <th className="px-6 py-4 text-center">Total Invested</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {referrals.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-16 text-center text-sm text-white/45">
                          No invited partners yet. Share your link above to begin earning rewards.
                        </td>
                      </tr>
                    ) : (
                      referrals.map((r) => (
                        <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="size-9 rounded-xl bg-white/[0.06] flex items-center justify-center font-semibold text-primary border border-white/10">
                                {r.displayName?.charAt(0).toUpperCase() || 'P'}
                              </div>
                              <span className="font-medium text-white">{r.displayName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center font-mono tabular-nums text-white">
                            ${(r.totalInvested || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-medium ${
                                r.totalInvested > 0
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                                  : 'bg-white/[0.06] text-white/55 border border-white/10'
                              }`}
                            >
                              {r.totalInvested > 0 ? 'Active' : 'Registered'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-white/45 font-mono tabular-nums text-xs">
                            {r.createdAt ? new Date(r.createdAt.toDate()).toLocaleDateString() : 'Recent'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
