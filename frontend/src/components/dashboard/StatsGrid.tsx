import type { FC } from 'react';
import {
  Users,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Cpu,
  Crosshair,
} from 'lucide-react';

interface LiveStats {
  totalCandidates: number;
  criticalCount: number;
  highCount: number;
  verifyCount: number;
  backendOnline: boolean;
}

interface StatsGridProps {
  liveStats?: LiveStats | null;
}

const StatsGrid: FC<StatsGridProps> = ({ liveStats }) => {
  const hasLive =
    liveStats !== null &&
    liveStats !== undefined &&
    liveStats.backendOnline &&
    liveStats.totalCandidates > 0;
  const isDemo = !hasLive;

  const cards = [
    {
      label: 'PERSON CANDIDATES',
      value: hasLive ? String(liveStats!.totalCandidates) : '4',
      subtext: hasLive ? 'Active tracked candidates' : 'AI-detected in sector',
      icon: Users,
      accentColor: '#0284c7',
      accentBg: '#eff6ff',
      accentBorder: '#bae6fd',
      accentText: '#0284c7',
      badge: isDemo ? 'DEMO' : 'LIVE',
      badgeClass: isDemo
        ? 'bg-slate-100 text-slate-600 border-slate-200'
        : 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold',
    },
    {
      label: 'CRITICAL TRIAGE',
      value: hasLive ? String(liveStats!.criticalCount) : '1',
      subtext: 'Immediate response required',
      icon: AlertTriangle,
      accentColor: '#dc2626',
      accentBg: '#fef2f2',
      accentBorder: '#fecaca',
      accentText: '#dc2626',
      badge: 'URGENT',
      badgeClass: 'bg-red-50 text-red-700 border-red-200 animate-pulse font-black',
      pulse: true,
    },
    {
      label: 'HIGH PRIORITY',
      value: hasLive ? String(liveStats!.highCount) : '2',
      subtext: 'Persistent track or trapped',
      icon: Flame,
      accentColor: '#d97706',
      accentBg: '#fffbeb',
      accentBorder: '#fde68a',
      accentText: '#d97706',
      badge: 'ELEVATED',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 font-bold',
    },
    {
      label: 'VERIFY QUEUE',
      value: hasLive ? String(liveStats!.verifyCount) : '1',
      subtext: 'Low confidence / conflict',
      icon: ShieldAlert,
      accentColor: '#ca8a04',
      accentBg: '#fefce8',
      accentBorder: '#fef08a',
      accentText: '#ca8a04',
      badge: 'REVIEW',
      badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-200 font-bold',
    },
    {
      label: 'DETECTION CONF.',
      value: '91.4%',
      subtext: 'YOLOv8 + ByteTrack avg',
      icon: Cpu,
      accentColor: '#0891b2',
      accentBg: '#ecfeff',
      accentBorder: '#a5f3fc',
      accentText: '#0891b2',
      badge: 'MODEL AVG',
      badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200 font-bold',
    },
    {
      label: 'SEARCH COVERAGE',
      value: '68%',
      subtext: 'UAV corridor mapped',
      icon: Crosshair,
      accentColor: '#16a34a',
      accentBg: '#f0fdf4',
      accentBorder: '#bbf7d0',
      accentText: '#16a34a',
      badge: 'CORRIDOR',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="relative bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col justify-between shadow-[0_2px_10px_rgba(15,23,42,0.06)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 transition-all duration-200 cursor-default"
          >
            {/* Top color accent bar */}
            <div
              className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl"
              style={{ backgroundColor: card.accentColor }}
            />

            {/* Icon + Badge row */}
            <div className="flex items-start justify-between mb-3 mt-1">
              <div
                className="p-2.5 rounded-xl border"
                style={{
                  backgroundColor: card.accentBg,
                  borderColor: card.accentBorder,
                  color: card.accentColor,
                }}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border font-mono ${card.badgeClass}`}>
                {card.badge}
              </span>
            </div>

            {/* Big Value */}
            <div>
              <div
                className="text-3xl sm:text-4xl font-black font-heading tracking-tight leading-none flex items-center gap-2"
                style={{ color: card.accentColor }}
              >
                {card.value}
                {card.pulse && (
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                )}
              </div>
              <div className="text-xs font-black uppercase tracking-wider text-slate-800 mt-2 font-heading">
                {card.label}
              </div>
            </div>

            {/* Subtext */}
            <div className="text-[11px] text-slate-500 font-mono leading-tight pt-2.5 border-t border-slate-100 mt-3">
              {card.subtext}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsGrid;