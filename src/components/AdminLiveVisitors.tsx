import { useState, useMemo } from 'react';
import { 
  Globe, 
  Search, 
  Radio, 
  Smartphone, 
  Laptop, 
  Tablet, 
  Clock, 
  MapPin, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldAlert, 
  Info,
  Calendar,
  Activity,
  UserCheck,
  ChevronRight,
  Eye,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { format, formatDistanceToNow, isToday, isYesterday, subDays } from 'date-fns';
import { toast } from 'sonner';

export interface VisitorRecord {
  id: string;
  visitorId: string;
  sessionId: string;
  ipAddress: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  isp: string;
  device: string;
  browser: string;
  os: string;
  referrer: string;
  currentPage: string;
  pageTitle?: string;
  firstSeen: any;
  lastSeen: any;
  isOnline: boolean;
  visitCount: number;
  pageViewsCount: number;
  flagEmoji: string;
  locationNotice?: string;
  history?: Array<{ page: string; title?: string; timestamp: string }>;
}

interface AdminLiveVisitorsProps {
  visitors: VisitorRecord[];
  loading?: boolean;
  onRefresh?: () => void;
}

export default function AdminLiveVisitors({ visitors, loading = false, onRefresh }: AdminLiveVisitorsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | '7days'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRecord | null>(null);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Helper to get JS Date from Firestore Timestamp or string
  const toDate = (val: any): Date => {
    if (!val) return new Date();
    if (typeof val.toDate === 'function') return val.toDate();
    if (val._seconds) return new Date(val._seconds * 1000);
    if (val.seconds) return new Date(val.seconds * 1000);
    const parsed = new Date(val);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  // Helper to determine if a visitor is currently online (heartbeat within 2 minutes)
  const isVisitorOnline = (v: VisitorRecord): boolean => {
    if (!v.isOnline) return false;
    const lastSeenDate = toDate(v.lastSeen);
    const diffMs = Date.now() - lastSeenDate.getTime();
    return diffMs < 120_000; // 2 minutes
  };

  // Extract unique countries for filter dropdown
  const uniqueCountries = useMemo(() => {
    const set = new Set<string>();
    visitors.forEach(v => {
      if (v.country && v.country !== 'Location unavailable') {
        set.add(v.country);
      }
    });
    return Array.from(set).sort();
  }, [visitors]);

  // Aggregate high-level stats
  const stats = useMemo(() => {
    const now = Date.now();
    let onlineCount = 0;
    let todayCount = 0;
    let lastHourCount = 0;
    const countriesSet = new Set<string>();

    visitors.forEach(v => {
      const lastSeenDate = toDate(v.lastSeen);
      const diffMs = now - lastSeenDate.getTime();

      if (isVisitorOnline(v)) {
        onlineCount++;
      }
      if (isToday(lastSeenDate)) {
        todayCount++;
      }
      if (diffMs < 3600_000) {
        lastHourCount++;
      }
      if (v.country && v.country !== 'Location unavailable') {
        countriesSet.add(v.country);
      }
    });

    return {
      online: onlineCount,
      today: todayCount,
      lastHour: lastHourCount,
      totalCountries: countriesSet.size,
      totalRecords: visitors.length
    };
  }, [visitors]);

  // Filter visitors based on search & filter controls
  const filteredVisitors = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const sevenDaysAgo = subDays(new Date(), 7);

    return visitors.filter(v => {
      const lastSeenDate = toDate(v.lastSeen);
      const isOnline = isVisitorOnline(v);

      // 1. Status Filter
      if (statusFilter === 'online' && !isOnline) return false;
      if (statusFilter === 'offline' && isOnline) return false;

      // 2. Date Filter
      if (dateFilter === 'today' && !isToday(lastSeenDate)) return false;
      if (dateFilter === 'yesterday' && !isYesterday(lastSeenDate)) return false;
      if (dateFilter === '7days' && lastSeenDate < sevenDaysAgo) return false;

      // 3. Device Filter
      if (deviceFilter !== 'all') {
        if (deviceFilter === 'mobile' && !['Android', 'iPhone', 'Mobile Device'].includes(v.device)) {
          return false;
        }
        if (deviceFilter !== 'mobile' && v.device?.toLowerCase() !== deviceFilter.toLowerCase()) {
          return false;
        }
      }

      // 4. Country Filter
      if (countryFilter !== 'all' && v.country !== countryFilter) {
        return false;
      }

      // 5. Search Term (IP, City, Country, VisitorID, SessionID, ISP)
      if (term) {
        const matchesIp = v.ipAddress?.toLowerCase().includes(term);
        const matchesCity = v.city?.toLowerCase().includes(term);
        const matchesCountry = v.country?.toLowerCase().includes(term);
        const matchesIsp = v.isp?.toLowerCase().includes(term);
        const matchesVid = v.visitorId?.toLowerCase().includes(term);
        const matchesSid = v.sessionId?.toLowerCase().includes(term);
        const matchesPage = v.currentPage?.toLowerCase().includes(term);

        if (!matchesIp && !matchesCity && !matchesCountry && !matchesIsp && !matchesVid && !matchesSid && !matchesPage) {
          return false;
        }
      }

      return true;
    });
  }, [visitors, searchTerm, dateFilter, statusFilter, deviceFilter, countryFilter]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIp(text);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const getDeviceIcon = (device: string) => {
    const d = (device || '').toLowerCase();
    if (d.includes('iphone') || d.includes('android') || d.includes('mobile')) {
      return <Smartphone size={14} className="text-primary" />;
    }
    if (d.includes('tablet') || d.includes('ipad')) {
      return <Tablet size={14} className="text-purple-400" />;
    }
    return <Laptop size={14} className="text-sky-400" />;
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white flex items-center gap-2">
              Live Visitors
            </h2>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-green-400">
                {stats.online} Live Now
              </span>
            </div>
          </div>
          <p className="text-xs text-white/40 font-medium mt-1">
            Real-time IP geolocation telemetry, active site presence, and visitor navigation logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="h-8 px-3 rounded-xl border-border bg-white/5 text-xs font-semibold gap-1.5 hover:bg-white/10"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin text-primary' : 'text-white/60'} />
              <span>Refresh</span>
            </Button>
          )}
          <div className="text-[10px] font-mono text-white/40 font-bold uppercase tracking-widest bg-white/5 border border-border px-4 py-2 rounded-xl">
            Auto-Sync: <span className="text-green-400">Active</span> • {stats.totalRecords} Captured Profiles
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card border-border rounded-3xl group transition-all hover:border-green-500/30 shadow-sm border">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-green-500 animate-pulse" /> Online Visitors
              </p>
              <h3 className="text-3xl font-black italic text-green-400 tracking-tighter">
                {stats.online}
              </h3>
              <p className="text-[9px] text-white/40 font-mono">Heartbeat &lt; 2m</p>
            </div>
            <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 group-hover:scale-110 transition-transform">
              <Radio className="size-6 animate-pulse" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border rounded-3xl group transition-all hover:border-primary/20 shadow-sm border">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                Visitors Today
              </p>
              <h3 className="text-3xl font-black italic text-white tracking-tighter">
                {stats.today}
              </h3>
              <p className="text-[9px] text-white/40 font-mono">Unique session visits</p>
            </div>
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-primary group-hover:scale-110 transition-transform">
              <Calendar className="size-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border rounded-3xl group transition-all hover:border-primary/20 shadow-sm border">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                Last 60 Minutes
              </p>
              <h3 className="text-3xl font-black italic text-sky-400 tracking-tighter">
                {stats.lastHour}
              </h3>
              <p className="text-[9px] text-white/40 font-mono">Recent traffic flow</p>
            </div>
            <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 group-hover:scale-110 transition-transform">
              <Clock className="size-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border rounded-3xl group transition-all hover:border-primary/20 shadow-sm border">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                Global Reach
              </p>
              <h3 className="text-3xl font-black italic text-purple-400 tracking-tighter">
                {stats.totalCountries} <span className="text-xs font-normal text-white/40">Countries</span>
              </h3>
              <p className="text-[9px] text-white/40 font-mono">Worldwide distribution</p>
            </div>
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
              <Globe className="size-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar Controls */}
      <Card className="bg-card border-border rounded-3xl overflow-hidden shadow-md">
        <div className="p-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-white/40" />
              <Input
                placeholder="Search by IP, City, Country, Page, ISP, or Visitor ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-background border-border h-12 pl-11 rounded-2xl text-sm text-white placeholder:text-white/40"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-white/40 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1 bg-background p-1 rounded-2xl border border-border shrink-0 overflow-x-auto">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${statusFilter === 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-white/40 hover:text-white'}`}
              >
                All ({visitors.length})
              </button>
              <button
                onClick={() => setStatusFilter('online')}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${statusFilter === 'online' ? 'bg-green-500 text-white shadow-sm' : 'text-white/40 hover:text-green-400'}`}
              >
                <span className="size-1.5 rounded-full bg-green-400 animate-pulse" />
                Online ({stats.online})
              </button>
              <button
                onClick={() => setStatusFilter('offline')}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${statusFilter === 'offline' ? 'bg-white/20 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}
              >
                Offline ({visitors.length - stats.online})
              </button>
            </div>
          </div>

          {/* Secondary Dropdown Filter Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/60">
            {/* Date filter */}
            <div className="flex items-center gap-2 bg-background border border-border px-3 py-2 rounded-xl">
              <Calendar size={14} className="text-white/40 shrink-0" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-white w-full outline-none cursor-pointer uppercase tracking-wider"
              >
                <option value="all" className="bg-card text-white">Date: All Time</option>
                <option value="today" className="bg-card text-white">Date: Today</option>
                <option value="yesterday" className="bg-card text-white">Date: Yesterday</option>
                <option value="7days" className="bg-card text-white">Date: Last 7 Days</option>
              </select>
            </div>

            {/* Device filter */}
            <div className="flex items-center gap-2 bg-background border border-border px-3 py-2 rounded-xl">
              <Smartphone size={14} className="text-white/40 shrink-0" />
              <select
                value={deviceFilter}
                onChange={(e) => setDeviceFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-white w-full outline-none cursor-pointer uppercase tracking-wider"
              >
                <option value="all" className="bg-card text-white">Device: All Hardware</option>
                <option value="mobile" className="bg-card text-white">Device: All Mobile</option>
                <option value="Android" className="bg-card text-white">Device: Android</option>
                <option value="iPhone" className="bg-card text-white">Device: iPhone</option>
                <option value="Desktop" className="bg-card text-white">Device: Desktop / PC</option>
                <option value="Tablet" className="bg-card text-white">Device: Tablet</option>
              </select>
            </div>

            {/* Country filter */}
            <div className="flex items-center gap-2 bg-background border border-border px-3 py-2 rounded-xl">
              <Globe size={14} className="text-white/40 shrink-0" />
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-white w-full outline-none cursor-pointer uppercase tracking-wider"
              >
                <option value="all" className="bg-card text-white">Country: Global (All)</option>
                {uniqueCountries.map(c => (
                  <option key={c} value={c} className="bg-card text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Visitors Table / List */}
      <Card className="bg-card border-border rounded-3xl overflow-hidden shadow-md">
        <CardHeader className="bg-white/5 p-6 border-b border-border flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-black italic uppercase tracking-tighter text-white flex items-center gap-2">
              Visitor Traffic Log
            </CardTitle>
            <CardDescription className="text-[10px] uppercase font-bold text-white/40 font-mono">
              Showing {filteredVisitors.length} of {visitors.length} total records
            </CardDescription>
          </div>

          {(searchTerm || dateFilter !== 'all' || statusFilter !== 'all' || deviceFilter !== 'all' || countryFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setDateFilter('all');
                setStatusFilter('all');
                setDeviceFilter('all');
                setCountryFilter('all');
              }}
              className="text-[10px] font-black uppercase text-primary hover:bg-primary/10 rounded-xl"
            >
              Reset Filters
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5 border-b border-border">
                <tr>
                  <th className="p-6 text-[10px] font-black uppercase text-white/40">Status</th>
                  <th className="p-6 text-[10px] font-black uppercase text-white/40">Location & IP</th>
                  <th className="p-6 text-[10px] font-black uppercase text-white/40">Device & Client</th>
                  <th className="p-6 text-[10px] font-black uppercase text-white/40">Current Page</th>
                  <th className="p-6 text-[10px] font-black uppercase text-white/40">Activity & Time</th>
                  <th className="p-6 text-right text-[10px] font-black uppercase text-white/40">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredVisitors.map((v) => {
                  const isOnline = isVisitorOnline(v);
                  const lastSeenDate = toDate(v.lastSeen);
                  const firstSeenDate = toDate(v.firstSeen);

                  return (
                    <tr 
                      key={v.id} 
                      className="hover:bg-white/5 transition-all group cursor-pointer"
                      onClick={() => setSelectedVisitor(v)}
                    >
                      {/* Online status indicator */}
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-3 w-3">
                            {isOnline && (
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            )}
                            <span 
                              className={`relative inline-flex rounded-full h-3 w-3 ${isOnline ? 'bg-green-500' : 'bg-slate-500'}`} 
                            />
                          </span>
                          <span className={`text-[10px] font-black uppercase tracking-wider ${isOnline ? 'text-green-400 font-bold' : 'text-white/40'}`}>
                            {isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </td>

                      {/* Location & IP */}
                      <td className="p-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xl" role="img" aria-label={v.country}>
                              {v.flagEmoji || '🌐'}
                            </span>
                            <div>
                              <p className="font-black text-white italic text-sm group-hover:text-primary transition-colors flex items-center gap-1.5">
                                {v.country || 'Location unavailable'}
                                {v.city && v.city !== 'Location unavailable' && (
                                  <span className="text-white/40 font-normal text-xs not-italic">
                                    • {v.city}
                                  </span>
                                )}
                              </p>
                              {v.region && v.region !== v.city && v.region !== 'Location unavailable' && (
                                <p className="text-[10px] text-white/40 font-medium">{v.region}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="font-mono text-xs text-white/70 bg-white/5 px-2 py-0.5 rounded border border-white/5 font-semibold">
                              {v.ipAddress || 'Unavailable'}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(v.ipAddress, 'IP Address');
                              }}
                              className="text-white/30 hover:text-white transition-colors"
                              title="Copy IP"
                            >
                              {copiedIp === v.ipAddress ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Device & Client */}
                      <td className="p-6">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-white/5 border border-border">
                              {getDeviceIcon(v.device)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white uppercase tracking-tight">
                                {v.device || 'Desktop'}
                              </p>
                              <p className="text-[10px] text-white/40 font-mono">
                                {v.os || 'Unknown OS'}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[9px] font-mono border-border text-white/60 bg-white/5">
                            {v.browser || 'Browser'}
                          </Badge>
                        </div>
                      </td>

                      {/* Current Page */}
                      <td className="p-6">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-mono text-xs font-bold">
                            {v.currentPage || '/'}
                          </div>
                          {v.pageViewsCount && v.pageViewsCount > 1 && (
                            <p className="text-[9px] text-white/40 font-mono">
                              {v.pageViewsCount} views • {v.visitCount || 1} session{v.visitCount > 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Activity & Time */}
                      <td className="p-6">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-white">
                            {formatDistanceToNow(lastSeenDate, { addSuffix: true })}
                          </p>
                          <p className="text-[10px] text-white/40 font-mono">
                            Visited: {format(firstSeenDate, 'MMM dd, HH:mm')}
                          </p>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="p-6 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVisitor(v);
                          }}
                          className="h-9 border-border bg-background hover:bg-primary hover:text-primary-foreground text-[10px] font-black uppercase rounded-xl transition-all"
                        >
                          <Eye size={12} className="mr-1.5" /> Details
                        </Button>
                      </td>
                    </tr>
                  );
                })}

                {filteredVisitors.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-16 text-center">
                      <div className="max-w-sm mx-auto space-y-3">
                        <div className="size-12 rounded-2xl bg-white/5 border border-border flex items-center justify-center mx-auto text-white/40">
                          <Search size={20} />
                        </div>
                        <h4 className="text-base font-black italic uppercase text-white">No Matching Visitors Found</h4>
                        <p className="text-xs text-white/40">
                          {searchTerm || dateFilter !== 'all' || statusFilter !== 'all' || deviceFilter !== 'all' || countryFilter !== 'all'
                            ? 'Try clearing your search query or loosening applied filters.'
                            : 'No visitor sessions recorded yet. Visitors arriving at the site will appear here in real time.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* VISITOR DETAILS MODAL / DRAWER */}
      <Dialog open={Boolean(selectedVisitor)} onOpenChange={(open) => !open && setSelectedVisitor(null)}>
        <DialogContent className="bg-card border-border text-white rounded-[2.5rem] p-0 overflow-hidden shadow-2xl border max-w-2xl max-h-[90vh] flex flex-col">
          {selectedVisitor && (
            <>
              {/* Modal Header */}
              <DialogHeader className="p-8 bg-white/5 border-b border-border text-left">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl" role="img" aria-label={selectedVisitor.country}>
                      {selectedVisitor.flagEmoji || '🌐'}
                    </span>
                    <div>
                      <DialogTitle className="text-2xl font-black italic uppercase tracking-tight text-white flex items-center gap-2">
                        {selectedVisitor.country || 'Location unavailable'}
                        {selectedVisitor.city && selectedVisitor.city !== 'Location unavailable' && (
                          <span className="text-white/40 not-italic text-lg font-normal">
                            — {selectedVisitor.city}
                          </span>
                        )}
                      </DialogTitle>
                      <p className="text-[11px] text-white/40 font-mono mt-0.5">
                        Session: {selectedVisitor.sessionId}
                      </p>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-border">
                    <span 
                      className={`h-2.5 w-2.5 rounded-full ${isVisitorOnline(selectedVisitor) ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} 
                    />
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isVisitorOnline(selectedVisitor) ? 'text-green-400' : 'text-white/40'}`}>
                      {isVisitorOnline(selectedVisitor) ? 'Active Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </DialogHeader>

              {/* Modal Body */}
              <div className="p-8 space-y-6 overflow-y-auto no-scrollbar flex-1">
                {/* Approximate Location Notice Disclaimer */}
                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-start gap-3 text-primary">
                  <Info size={18} className="shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed space-y-1">
                    <p className="font-bold text-white uppercase text-[10px] tracking-wider">
                      Approximate Geolocation Disclaimer
                    </p>
                    <p className="text-white/70 text-[11px]">
                      IP geolocation approximates region/city based on the visitor&apos;s Internet Service Provider (ISP) network node. It does <strong className="text-white">NOT</strong> pinpoint an exact physical or household address.
                    </p>
                  </div>
                </div>

                {/* Grid of Telemetry Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* IP & ISP Card */}
                  <div className="p-5 rounded-2xl bg-white/5 border border-border space-y-3">
                    <div className="text-[10px] font-black uppercase text-white/40 tracking-widest flex items-center justify-between">
                      <span>Network & Provider</span>
                      <MapPin size={12} className="text-primary" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/60">IP Address:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-black text-white bg-background px-2 py-0.5 rounded border border-border">
                            {selectedVisitor.ipAddress}
                          </span>
                          <button
                            onClick={() => handleCopy(selectedVisitor.ipAddress, 'IP Address')}
                            className="p-1 text-white/40 hover:text-white"
                            title="Copy"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/60">ISP / Organization:</span>
                        <span className="text-xs font-bold text-white text-right max-w-[160px] truncate">
                          {selectedVisitor.isp || 'Unknown'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/60">State / Region:</span>
                        <span className="text-xs font-bold text-white">
                          {selectedVisitor.region || 'Unavailable'}
                        </span>
                      </div>

                      {selectedVisitor.latitude !== null && selectedVisitor.longitude !== null && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/60">Approx. Coordinates:</span>
                          <span className="font-mono text-[11px] text-primary">
                            {selectedVisitor.latitude?.toFixed(4)}, {selectedVisitor.longitude?.toFixed(4)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Device & Client Diagnostics */}
                  <div className="p-5 rounded-2xl bg-white/5 border border-border space-y-3">
                    <div className="text-[10px] font-black uppercase text-white/40 tracking-widest flex items-center justify-between">
                      <span>Hardware & Browser</span>
                      {getDeviceIcon(selectedVisitor.device)}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/60">Device Form:</span>
                        <span className="text-xs font-bold text-white uppercase">
                          {selectedVisitor.device || 'Desktop'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/60">Operating System:</span>
                        <span className="text-xs font-bold text-white">
                          {selectedVisitor.os || 'Unknown OS'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/60">Browser Engine:</span>
                        <span className="text-xs font-bold text-white">
                          {selectedVisitor.browser || 'Browser'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/60">Initial Referrer:</span>
                        <span className="text-xs font-bold text-white text-right max-w-[160px] truncate">
                          {selectedVisitor.referrer || 'Direct'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Session Engagement Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-white/5 border border-border text-center">
                    <p className="text-[9px] font-black uppercase text-white/40 tracking-widest">Total Visits</p>
                    <p className="text-xl font-black italic text-white mt-1">
                      {selectedVisitor.visitCount || 1}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-border text-center">
                    <p className="text-[9px] font-black uppercase text-white/40 tracking-widest">Page Views</p>
                    <p className="text-xl font-black italic text-primary mt-1">
                      {selectedVisitor.pageViewsCount || 1}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-border text-center">
                    <p className="text-[9px] font-black uppercase text-white/40 tracking-widest">Current Page</p>
                    <p className="text-xs font-mono font-bold text-white mt-2 truncate">
                      {selectedVisitor.currentPage || '/'}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-border text-center">
                    <p className="text-[9px] font-black uppercase text-white/40 tracking-widest">Last Active</p>
                    <p className="text-xs font-bold text-white mt-2">
                      {formatDistanceToNow(toDate(selectedVisitor.lastSeen), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                {/* Navigation History Log */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black italic uppercase text-white tracking-wider flex items-center gap-2">
                      <Activity size={14} className="text-primary" />
                      Session Navigation History
                    </h4>
                    <span className="text-[10px] font-mono text-white/40">
                      {selectedVisitor.history?.length || 1} Recorded Stops
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-border space-y-2 divide-y divide-white/5">
                    {selectedVisitor.history && selectedVisitor.history.length > 0 ? (
                      selectedVisitor.history.map((hist, idx) => (
                        <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="size-1.5 rounded-full bg-primary shrink-0" />
                            <span className="font-mono font-bold text-white">{hist.page}</span>
                            {hist.title && (
                              <span className="text-white/40 text-[10px] truncate max-w-[180px]">
                                — {hist.title}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-white/40 shrink-0">
                            {hist.timestamp ? format(new Date(hist.timestamp), 'HH:mm:ss') : 'Recorded'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-xs text-white/40 py-2">
                        {selectedVisitor.currentPage} (Active session)
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <DialogFooter className="p-6 bg-white/5 border-t border-border flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchTerm(selectedVisitor.ipAddress);
                    setSelectedVisitor(null);
                  }}
                  className="text-[10px] font-black uppercase text-primary hover:bg-primary/10 rounded-xl"
                >
                  Filter Traffic by this IP
                </Button>

                <Button
                  onClick={() => setSelectedVisitor(null)}
                  className="bg-primary text-primary-foreground font-black text-xs uppercase px-8 h-12 rounded-xl shadow-lg shadow-primary/20"
                >
                  Close Dossier
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
