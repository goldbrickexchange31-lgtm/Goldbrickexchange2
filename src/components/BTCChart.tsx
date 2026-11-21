import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Tooltip,
  Cell
} from 'recharts';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

export default function BTCChart() {
  const [data, setData] = useState<any[]>([]);
  const [currentPrice, setCurrentPrice] = useState(96420.50);
  const [change, setChange] = useState(348.20);
  const [changePercent] = useState(3.84);
  const [stats] = useState({ high: 97180.00, low: 94890.00 });

  useEffect(() => {
    const initialData = Array.from({ length: 30 }).map((_, i) => ({
      index: i,
      value: Math.random() * 50 + 25,
      type: Math.random() > 0.45 ? 'up' : 'down'
    }));
    setData(initialData);

    const interval = setInterval(() => {
      const isUp = Math.random() > 0.45;
      const priceMove = (Math.random() * 14) * (isUp ? 1 : -1);

      setCurrentPrice((prev) => prev + priceMove);
      setChange((prev) => prev + priceMove);

      setData((current) => [
        ...current.slice(1),
        {
          index: current[current.length - 1].index + 1,
          value: Math.random() * 50 + 25,
          type: isUp ? 'up' : 'down'
        }
      ]);
    }, 2200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-[#0A0F18]/90 rounded-2xl border border-white/10 p-5 sm:p-6 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
            <Activity className="size-5" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm sm:text-base leading-tight">
              Bitcoin Liquidity Index
            </div>
            <div className="text-white/45 text-xs font-mono">BTC / USD · Global Feed</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
          <span className="size-2 rounded-full bg-emerald-400" />
          <span>Live Feed</span>
        </div>
      </div>

      {/* Price Section */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div className="space-y-1.5">
          <div className="text-3xl sm:text-4xl font-bold font-mono tabular-nums text-white tracking-tight">
            ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-2.5 text-xs font-mono tabular-nums">
            <span className={`inline-flex items-center font-semibold ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {change >= 0 ? <TrendingUp className="size-3.5 mr-1" /> : <TrendingDown className="size-3.5 mr-1" />}
              {change >= 0 ? '+' : ''}{change.toFixed(2)}
            </span>
            <span className="text-white/45">({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)</span>
          </div>
        </div>

        <div className="flex sm:flex-col gap-4 sm:gap-1 text-right font-mono tabular-nums text-xs">
          <div className="flex items-center justify-end gap-2">
            <span className="text-white/40">24h High</span>
            <span className="text-white font-semibold">${stats.high.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-white/40">24h Low</span>
            <span className="text-white font-semibold">${stats.low.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <Bar dataKey="value" radius={[3, 3, 3, 3]} minPointSize={5}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.type === 'up' ? '#10b981' : '#f59e0b'}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
            <Tooltip cursor={false} content={() => null} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Info */}
      <div className="mt-5 pt-4 border-t border-white/[0.07] grid grid-cols-3 gap-4 font-mono tabular-nums text-xs">
        <div>
          <span className="text-white/40 block text-[11px]">24h Open</span>
          <span className="text-white font-medium">$94,950.00</span>
        </div>
        <div>
          <span className="text-white/40 block text-[11px]">24h Volume</span>
          <span className="text-white font-medium">$1.29B</span>
        </div>
        <div className="text-right">
          <span className="text-white/40 block text-[11px]">Sync Interval</span>
          <span className="text-emerald-400 font-medium">Real-time</span>
        </div>
      </div>
    </div>
  );
}
