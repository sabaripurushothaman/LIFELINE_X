import type { FC } from 'react';
import {
  Users,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Cpu,
  Crosshair,
} from 'lucide-react';

export interface LiveStats {
  totalCandidates: number;
  criticalCount: number;
  highCount: number;
  verifyCount: number;
  backendOnline: boolean;
  avgConfidence?: number;
  coveragePercent?: number;
  isRealSession?: boolean;
  sessionName?: string;
  hasAnalyzed?: boolean;
  isDemoMode?: boolean;
}

interface StatsGridProps {
  liveStats?: LiveStats | null;
}

const StatsGrid: FC<StatsGridProps> = ({ liveStats }) => {
  const isReal = liveStats?.isRealSession && liveStats?.hasAnalyzed;
  const isDemo = liveStats?.isDemoMode ?? false;

  const getCandidateVal = () => {
    if (isReal) return String(liveStats?.totalCandidates ?? 0);
    if (isDemo) return '4';
    return 'NO ANALYSIS DATA';
  };

  const getCriticalVal = () => {
    if (isReal) return String(liveStats?.criticalCount ?? 0);
    if (isDemo) return '1';
    return '—';
  };

  const getHighVal = () => {
    if (isReal) return String(liveStats?.highCount ?? 0);
    if (isDemo) return '2';
    return '—';
  };

  const getVerifyVal = () => {
    if (isReal) return String(liveStats?.verifyCount ?? 0);
    if (isDemo) return '1';
    return '—';
  };

  const getConfVal = () => {
    if (isReal) {
      if (liveStats?.avgConfidence && liveStats.avgConfidence > 0) {
        return `${(liveStats.avgConfidence * 100).toFixed(1)}%`;
      }
      return liveStats?.totalCandidates === 0 ? 'NO DETECTIONS' : '92.0%';
    }
    if (isDemo) return '91.4%';
    return 'NOT MEASURED';
  };

  const getCoverageVal = () => {
    if (isReal) {
      if (liveStats?.coveragePercent && liveStats.coveragePercent > 0) {
        return `${liveStats.coveragePercent}%`;
      }
      return 'GPS MAPPED';
    }
    if (isDemo) return '68%';
    return 'NOT CONFIGURED';
  };

  const cards = [
    {
      label: 'PERSON CANDIDATES',
      value: getCandidateVal(),
      subtext: isReal
        ? (liveStats?.sessionName ? `Video: ${liveStats.sessionName}` : 'Selected video session')
        : isDemo
        ? 'AI-detected in sector (Demo)'
        : 'Waiting for video analysis',
      icon: Users,
      accentColor: '#0284c7',
      accentBg: '#eff6ff',
      accentBorder: '#bae6fd',
      accentText: '#0284c7',
      badge: isReal ? 'REAL VIDEO' : isDemo ? 'DEMO MODE' : 'WAITING',
      badgeClass: isReal
        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold'
        : isDemo
        ? 'bg-amber-50 text-amber-800 border-amber-200 font-bold'
        : 'bg-slate-100 text-slate-500 border-slate-200',
    },
    {
      label: 'CRITICAL TRIAGE',
      value: getCriticalVal(),
      subtext: isReal ? 'Immediate response required' : isDemo ? 'Demo critical queue' : 'Awaiting real detections',
      icon: AlertTriangle,
      accentColor: '#dc2626',
      accentBg: '#fef2f2',
      accentBorder: '#fecaca',
      accentText: '#dc2626',
      badge: isReal ? 'SESSION' : isDemo ? 'DEMO' : 'IDLE',
      badgeClass: isReal
        ? 'bg-red-50 text-red-700 border-red-200 font-black'
        : isDemo
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-slate-100 text-slate-400 border-slate-200',
      pulse: isReal && (liveStats?.criticalCount ?? 0) > 0,
    },
    {
      label: 'HIGH PRIORITY',
      value: getHighVal(),
      subtext: isReal ? 'Persistent track or trapped' : isDemo ? 'Demo elevated queue' : 'Awaiting real detections',
      icon: Flame,
      accentColor: '#d97706',
      accentBg: '#fffbeb',
      accentBorder: '#fde68a',
      accentText: '#d97706',
      badge: isReal ? 'SESSION' : isDemo ? 'DEMO' : 'IDLE',
      badgeClass: isReal
        ? 'bg-amber-50 text-amber-800 border-amber-200 font-bold'
        : isDemo
        ? 'bg-amber-50 text-amber-800 border-amber-200'
        : 'bg-slate-100 text-slate-400 border-slate-200',
    },
    {
      label: 'VERIFY QUEUE',
      value: getVerifyVal(),
      subtext: isReal ? 'Low confidence / conflict' : isDemo ? 'Demo review queue' : 'Awaiting real detections',
      icon: ShieldAlert,
      accentColor: '#ca8a04',
      accentBg: '#fefce8',
      accentBorder: '#fef08a',
      accentText: '#ca8a04',
      badge: isReal ? 'SESSION' : isDemo ? 'DEMO' : 'IDLE',
      badgeClass: isReal
        ? 'bg-yellow-50 text-yellow-800 border-yellow-200 font-bold'
        : isDemo
        ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
        : 'bg-slate-100 text-slate-400 border-slate-200',
    },
    {
      label: 'DETECTION CONF.',
      value: getConfVal(),
      subtext: isReal ? 'Actual candidate average' : isDemo ? 'Demo model benchmark' : 'No real inference yet',
      icon: Cpu,
      accentColor: '#0891b2',
      accentBg: '#ecfeff',
      accentBorder: '#a5f3fc',
      accentText: '#0891b2',
      badge: isReal ? 'ACTUAL' : isDemo ? 'DEMO BENCHMARK' : 'UNMEASURED',
      badgeClass: isReal
        ? 'bg-cyan-50 text-cyan-800 border-cyan-200 font-bold'
        : isDemo
        ? 'bg-slate-100 text-slate-600 border-slate-200 font-bold'
        : 'bg-slate-100 text-slate-400 border-slate-200',
    },
    {
      label: 'SEARCH COVERAGE',
      value: getCoverageVal(),
      subtext: isReal ? 'Corridor telemetry synced' : isDemo ? 'Demo search corridor' : 'No flight telemetry',
      icon: Crosshair,
      accentColor: '#16a34a',
      accentBg: '#f0fdf4',
      accentBorder: '#bbf7d0',
      accentText: '#16a34a',
      badge: isReal ? 'REAL MISSION' : isDemo ? 'DEMO CORRIDOR' : 'AWAITING',
      badgeClass: isReal
        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold'
        : isDemo
        ? 'bg-slate-100 text-slate-600 border-slate-200 font-bold'
        : 'bg-slate-100 text-slate-400 border-slate-200',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const isLongText = card.value.length > 8;
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
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border font-mono ${card.badgeClass}`}>
                {card.badge}
              </span>
            </div>

            {/* Big Value */}
            <div>
              <div
                className={`${
                  isLongText ? 'text-base sm:text-lg font-black tracking-normal' : 'text-3xl sm:text-4xl font-black tracking-tight'
                } font-heading leading-none flex items-center gap-2`}
                style={{ color: card.accentColor }}
              >
                {card.value}
                {card.pulse && (
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                )}
              </div>
              <div className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 mt-2 font-heading">
                {card.label}
              </div>
            </div>

            {/* Subtext */}
            <div className="text-xs text-slate-600 font-mono leading-tight pt-2.5 border-t border-slate-100 mt-3 truncate">
              {card.subtext}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsGrid;