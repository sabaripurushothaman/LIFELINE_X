import { useState, useEffect } from 'react';
import StatsGrid from '../components/dashboard/StatsGrid';
import DroneFeed from '../components/dashboard/DroneFeed';
import IncidentMap from '../components/dashboard/IncidentMap';
import RescuePriorityQueue from '../components/dashboard/RescuePriorityQueue';
import RecentDetections from '../components/dashboard/RecentDetections';
import SystemStatus from '../components/dashboard/SystemStatus';
import { api } from '../services/api';
import { Flame, Radio, AlertTriangle, Radar, ArrowUpRight, Waves } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBackendStatus } from '../hooks/useBackendStatus';

interface ApiStats {
  totalCandidates: number;
  criticalCount: number;
  highCount: number;
  verifyCount: number;
  backendOnline: boolean;
}

const Dashboard: React.FC = () => {
  const [apiStats, setApiStats] = useState<ApiStats | null>(null);
  const navigate = useNavigate();
  const { isOnline, isLoading } = useBackendStatus();

  useEffect(() => {
    const load = async () => {
      try {
        const survivors = await api.getSurvivors();
        const s = survivors as {
          count: number;
          critical_count: number;
          high_count: number;
          verify_count: number;
        };
        setApiStats({
          totalCandidates: s.count ?? 0,
          criticalCount: s.critical_count ?? 0,
          highCount: s.high_count ?? 0,
          verifyCount: s.verify_count ?? 0,
          backendOnline: true,
        });
      } catch {
        setApiStats({
          totalCandidates: 0,
          criticalCount: 0,
          highCount: 0,
          verifyCount: 0,
          backendOnline: false,
        });
      }
    };
    load();
  }, [isOnline]);

  const hasRealData = apiStats !== null && apiStats.totalCandidates > 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f2a4a] via-[#142e52] to-[#0a1e36] shadow-[0_8px_32px_rgba(15,23,42,0.3)] p-6 md:p-8">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 tactical-grid opacity-40 pointer-events-none" />
        {/* Blue ambient glow top */}
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-sky-400/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-64 h-64 rounded-full bg-cyan-400/8 blur-3xl pointer-events-none" />

        {/* Scanning line */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-sky-400/40 to-transparent animate-scanline" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            {/* Mission Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-400/15 border border-sky-400/30 text-sky-300 text-xs font-mono font-bold tracking-wider">
              <Radar className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} />
              <span>DISASTER COMMAND CENTER • MISSION CONTROL</span>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-heading">
                LIFELINE<span className="text-sky-400">-X</span>{' '}
                <span className="text-slate-300 font-bold">COMMAND CENTER</span>
              </h1>
              <p className="text-slate-400 text-sm leading-relaxed mt-2 max-w-2xl">
                AI-powered disaster search intelligence — detect, verify, and prioritize survivors across flood zones and complex disaster terrain.
              </p>
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-400/15 border border-amber-400/30 text-amber-300">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>INCIDENT: <strong className="text-white">FLOOD-001</strong></span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-400/15 border border-sky-400/30 text-sky-300">
                <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                <span>UAV REPLAY: <strong className="text-white">ACTIVE</strong></span>
              </div>

              {/* Real backend status */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-bold transition-all ${
                isLoading
                  ? 'bg-amber-400/10 border-amber-400/30 text-amber-300'
                  : isOnline
                    ? 'bg-emerald-400/15 border-emerald-400/30 text-emerald-300'
                    : 'bg-red-400/15 border-red-400/30 text-red-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  isLoading ? 'bg-amber-400 animate-pulse'
                  : isOnline ? 'bg-emerald-400 animate-pulse'
                  : 'bg-red-400'
                }`} />
                <span>
                  {isLoading ? 'CHECKING BACKEND…'
                    : isOnline ? 'BACKEND ONLINE'
                    : 'BACKEND OFFLINE'}
                </span>
              </div>

              <span className="px-2.5 py-1.5 rounded-lg font-bold bg-amber-400/15 border border-amber-400/30 text-amber-300">
                {hasRealData ? 'LIVE INFERENCE' : 'DEMO REPLAY MODE'}
              </span>

              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                <Waves className="w-3.5 h-3.5 text-sky-400" />
                <span>FLOOD ZONE: SECTOR ALPHA</span>
              </div>
            </div>
          </div>

          {/* Quick Launch Buttons */}
          <div className="flex flex-row lg:flex-col gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => navigate('/analysis')}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-heading font-extrabold text-sm tracking-wider shadow-[0_0_20px_rgba(14,165,233,0.4)] hover:shadow-[0_0_28px_rgba(14,165,233,0.6)] hover:scale-[1.02] transition-all"
            >
              <span>RUN PIPELINE</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/survivors')}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-heading font-bold text-sm tracking-wider hover:bg-white/15 hover:border-white/30 transition-all"
            >
              <span>SURVIVOR INTEL</span>
              <ArrowUpRight className="w-4 h-4 text-sky-400" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <StatsGrid liveStats={apiStats} />

      {/* Drone Feed + Map Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-full min-h-[460px]">
          <DroneFeed />
        </div>
        <div className="h-full min-h-[460px]">
          <IncidentMap />
        </div>
      </div>

      {/* Rescue Priority Queue */}
      <RescuePriorityQueue />

      {/* Detection Log + System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-full min-h-[300px]">
          <RecentDetections />
        </div>
        <div className="h-full min-h-[300px]">
          <SystemStatus />
        </div>
      </div>

      {/* Safety Advisory Footer */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between text-xs font-mono text-amber-700 gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
          <span className="font-semibold">SAFETY ADVISORY:</span>
          <span>AI detections are advisory indications only. Formal rescue dispatch requires human operator verification.</span>
        </div>
        <div className="text-amber-600 font-semibold">LIFELINE-X PLATFORM • RESCUE OPS v2.4</div>
      </div>
    </div>
  );
};

export default Dashboard;