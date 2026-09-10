import { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Flame, Radio, AlertTriangle, Radar, ArrowUpRight, Waves,
  Users, ShieldAlert, Video, Map as MapIcon, GitMerge,
  Crosshair, Award, Activity, BarChart3, Eye,
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
 * No feature duplication here.
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

  // Feature navigation cards — lead operators to dedicated feature pages
  const featureLinks = [
    {
      to: '/camera',
      icon: Video,
      label: 'LIVE CAMERA',
      desc: 'Video replay, resolution metadata, detection overlay',
      color: '#0284c7',
      bg: 'bg-sky-50',
      border: 'border-sky-200',
    },
    {
      to: '/analysis',
      icon: BarChart3,
      label: 'ANALYSIS',
      desc: 'Upload UAV footage and run AI detection pipeline',
      color: '#0891b2',
      bg: 'bg-cyan-50',
      border: 'border-cyan-200',
    },
    {
      to: '/survivors',
      icon: Users,
      label: 'SURVIVORS',
      desc: 'Triage candidates, review evidence, dispatch actions',
      color: '#dc2626',
      bg: 'bg-red-50',
      border: 'border-red-200',
    },
    {
      to: '/evidence',
      icon: GitMerge,
      label: 'EVIDENCE CHAIN',
      desc: 'Multi-modal evidence provenance and conflict audit',
      color: '#7c3aed',
      bg: 'bg-violet-50',
      border: 'border-violet-200',
    },
    {
      to: '/map',
      icon: MapIcon,
      label: 'MAP & ROUTING',
      desc: 'Tactical GIS map with emergency routing to survivors',
      color: '#16a34a',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
    },
    {
      to: '/coverage',
      icon: Crosshair,
      label: 'SEARCH COVERAGE',
      desc: 'UAV corridor coverage, gaps, and priority sectors',
      color: '#ca8a04',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    },
    {
      to: '/evaluation',
      icon: Award,
      label: 'EVALUATION',
      desc: 'Validated benchmarks — integrity-first metrics only',
      color: '#0891b2',
      bg: 'bg-teal-50',
      border: 'border-teal-200',
    },
    {
      to: '/system',
      icon: Activity,
      label: 'SYSTEM HEALTH',
      desc: 'Backend, AI model, database, and pipeline status',
      color: '#64748b',
      bg: 'bg-slate-50',
      border: 'border-slate-200',
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f2a4a] via-[#142e52] to-[#0a1e36] shadow-[0_8px_32px_rgba(15,23,42,0.3)] p-6 md:p-8">
        <div className="absolute inset-0 tactical-grid opacity-40 pointer-events-none" />
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-sky-400/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-64 h-64 rounded-full bg-cyan-400/8 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-sky-400/40 to-transparent animate-scanline" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-400/15 border border-sky-400/30 text-sky-300 text-xs font-mono font-bold tracking-wider">
              <Radar className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} />
              <span>DISASTER COMMAND CENTER • MISSION CONTROL</span>
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-heading">
                LIFELINE<span className="text-sky-400">-X</span>{' '}
                <span className="text-slate-300 font-bold">COMMAND CENTER</span>
              </h1>
              <p className="text-slate-400 text-sm leading-relaxed mt-2 max-w-2xl">
                AI-powered disaster search intelligence — detect, verify, and prioritize survivors across flood zones and complex disaster terrain.
              </p>
            </div>

            {/* Mission badges — no backend status here (already shown in header) */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-400/15 border border-amber-400/30 text-amber-300">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>INCIDENT: <strong className="text-white">FLOOD-001</strong></span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-400/15 border border-sky-400/30 text-sky-300">
                <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                <span>UAV: <strong className="text-white">REPLAY MODE</strong></span>
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

          {/* Quick launch */}
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

      {/* KPI Stats Grid — live from backend */}
      <StatsGrid liveStats={apiStats} />

      {/* Feature Navigation Grid */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-4 h-4 text-sky-600" />
          <h2 className="text-sm font-heading font-black uppercase tracking-wider text-slate-800">
            MISSION MODULES
          </h2>
          <span className="text-[10px] font-mono text-slate-400 ml-1">Select a module to open its full workspace</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {featureLinks.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.to}
                type="button"
                onClick={() => navigate(link.to)}
                className={`group text-left p-4 rounded-xl bg-white border ${link.border} hover:shadow-[0_4px_16px_rgba(15,23,42,0.10)] hover:-translate-y-0.5 transition-all duration-200 shadow-sm`}
              >
                <div
                  className={`inline-flex items-center justify-center w-9 h-9 rounded-lg mb-2.5 ${link.bg} border ${link.border}`}
                >
                  <Icon className="w-4 h-4" style={{ color: link.color }} />
                </div>
                <div className="text-[11px] font-heading font-black text-slate-900 tracking-wide">{link.label}</div>
                <div className="text-[10px] text-slate-500 font-mono mt-1 leading-snug">{link.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Detections Log — summary only, not the full Survivors page */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-sky-600" />
            <h2 className="text-sm font-heading font-black uppercase tracking-wider text-slate-800">
              RECENT DETECTION EVENTS
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/survivors')}
            className="flex items-center gap-1 text-[11px] font-mono font-bold text-sky-700 hover:text-sky-900 transition-colors"
          >
            VIEW ALL CANDIDATES <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <RecentDetections />
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