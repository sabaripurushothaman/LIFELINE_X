import { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Flame, Radio, AlertTriangle, Radar, ArrowUpRight, Waves,
  ShieldAlert, CheckCircle2, Film,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatsGrid from '../components/dashboard/StatsGrid';
import RecentDetections from '../components/dashboard/RecentDetections';

interface ApiStats {
  totalCandidates: number;
  criticalCount: number;
  highCount: number;
  verifyCount: number;
  backendOnline: boolean;
}

/**
 * DASHBOARD — Concise mission overview only.
 * Full feature implementations are on their own dedicated pages.
 * No sidebar duplication or repetitive feature cards.
 */
const Dashboard: React.FC = () => {
  const [apiStats, setApiStats] = useState<ApiStats | null>(null);
  const navigate = useNavigate();

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
  }, []);

  const hasRealData = apiStats !== null && apiStats.totalCandidates > 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

      {/* ── Mission Hero Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f2a4a] via-[#142e52] to-[#0a1e36] shadow-[0_8px_32px_rgba(15,23,42,0.3)] p-6 md:p-8">
        <div className="absolute inset-0 tactical-grid opacity-40 pointer-events-none" />
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-sky-400/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-64 h-64 rounded-full bg-cyan-400/8 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-sky-400/40 to-transparent animate-scanline" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3.5 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-400/15 border border-sky-400/30 text-sky-300 text-xs font-mono font-bold tracking-wider">
              <Radar className="w-4 h-4 animate-spin" style={{ animationDuration: '8s' }} />
              <span>DISASTER COMMAND CENTER • MISSION CONTROL</span>
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white font-heading">
                LIFELINE<span className="text-sky-400">-X</span>{' '}
                <span className="text-slate-300 font-bold">MISSION OVERVIEW</span>
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed mt-2 max-w-2xl font-normal">
                AI-driven disaster search intelligence — detecting, tracking, and prioritizing survivors across flood zones and complex terrain with real-time routing.
              </p>
            </div>

            {/* Mission status indicators */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono pt-1">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-400/15 border border-amber-400/30 text-amber-300">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>INCIDENT: <strong className="text-white">FLOOD-001</strong></span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-400/15 border border-sky-400/30 text-sky-300">
                <Film className="w-4 h-4 text-sky-400" />
                <span>UAV FOOTAGE: <strong className="text-white">4K REPLAY READY</strong></span>
              </div>

              <span className="px-3 py-1.5 rounded-lg font-bold bg-amber-400/15 border border-amber-400/30 text-amber-300">
                {hasRealData ? 'LIVE INFERENCE' : 'DEMO REPLAY MODE'}
              </span>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                <Waves className="w-4 h-4 text-sky-400" />
                <span>ZONE: SECTOR ALPHA</span>
              </div>
            </div>
          </div>

          {/* Direct CTA Launch Buttons */}
          <div className="flex flex-row lg:flex-col gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => navigate('/analysis')}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-heading font-black text-sm tracking-wider shadow-[0_0_20px_rgba(14,165,233,0.4)] hover:shadow-[0_0_28px_rgba(14,165,233,0.6)] hover:scale-[1.02] transition-all"
            >
              <span>RUN VIDEO ANALYSIS</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/survivors')}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white font-heading font-bold text-sm tracking-wider hover:bg-white/15 hover:border-white/30 transition-all"
            >
              <span>SURVIVOR INTEL</span>
              <ArrowUpRight className="w-4 h-4 text-sky-400" />
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Stats Grid (Real-time counts) ── */}
      <StatsGrid liveStats={apiStats} />

      {/* ── Mission Reconnaissance & Pipeline Summary Card ── */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-[0_4px_16px_rgba(15,23,42,0.06)] grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-6">
          <div className="flex items-center gap-2 text-sky-700 font-heading font-bold text-sm uppercase tracking-wide">
            <Film className="w-4 h-4" />
            <span>Primary Video Input</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Standard UAV reconnaissance drone video. Ingests 4K UHD (3840×2160) or 1080p footage with synchronized flight telemetry for precise ground projection.
          </p>
          <div className="pt-2 flex items-center gap-2 text-xs font-mono text-emerald-700 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Native 4K UHD Supported</span>
          </div>
        </div>

        <div className="space-y-2 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-6">
          <div className="flex items-center gap-2 text-amber-700 font-heading font-bold text-sm uppercase tracking-wide">
            <Radio className="w-4 h-4" />
            <span>AI Triage Pipeline</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Multi-stage pipeline: YOLOv8 person detection &rarr; animal filtering &rarr; ByteTrack persistence &rarr; movement analysis &rarr; telemetry geolocation &rarr; evidence chain.
          </p>
          <div className="pt-2 flex items-center gap-2 text-xs font-mono text-slate-500">
            <span>Safety Rule: Non-vital advisory states only</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 font-heading font-bold text-sm uppercase tracking-wide">
            <ShieldAlert className="w-4 h-4" />
            <span>Disaster Response Triage</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Candidates are prioritized into CRITICAL, HIGH, and VERIFY queues with direct interactive GIS mapping and shortest emergency routing computation.
          </p>
          <div className="pt-2 flex items-center gap-2 text-xs font-mono text-sky-700 font-bold">
            <button
              type="button"
              onClick={() => navigate('/map')}
              className="hover:underline flex items-center gap-1"
            >
              Open Tactical Map &amp; Routing <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Recent Detection Events Summary ── */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-sky-700" />
            <h2 className="text-base font-heading font-black uppercase tracking-wider text-slate-900">
              RECENT DETECTION EVENTS
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/survivors')}
            className="flex items-center gap-1.5 text-xs font-mono font-bold text-sky-700 hover:text-sky-900 transition-colors"
          >
            VIEW ALL SURVIVOR CANDIDATES <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
        <RecentDetections />
      </div>

      {/* ── Safety Advisory Footer ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between text-xs sm:text-sm font-mono text-amber-800 gap-3">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <span className="font-bold">SAFETY ADVISORY:</span>
          <span>AI detections are advisory indications only. Formal rescue dispatch requires human operator verification.</span>
        </div>
        <div className="text-amber-700 font-bold">LIFELINE-X PLATFORM • RESCUE OPS v2.4</div>
      </div>
    </div>
  );
};

export default Dashboard;