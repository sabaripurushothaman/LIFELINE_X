import { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Flame, Radio, AlertTriangle, Radar, ArrowUpRight, Waves,
  ShieldAlert, CheckCircle2, Film, Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatsGrid, { type LiveStats } from '../components/dashboard/StatsGrid';
import TriageSorting from '../components/dashboard/TriageSorting';
import { useSession } from '../context/SessionContext';
import SessionSelector from '../components/common/SessionSelector';
import type { SurvivorCandidate } from '../types';

const DEMO_CANDIDATES: SurvivorCandidate[] = [
  { track_id: 'LX-017', rescue_priority: 'CRITICAL', detection_confidence: 0.94, survivor_confidence: 0.96, movement_state: 'LOW MOVEMENT', evidence_quality: 'HIGH',   frame_count: 88, latitude: 13.04218, longitude: 80.16431, uncertainty_m: 12, geolocation_method: 'UAV_TELEMETRY_SYNCED', analysis_id: 'demo-flood-001', created_at: Date.now() - 12000 },
  { track_id: 'LX-023', rescue_priority: 'HIGH',     detection_confidence: 0.91, survivor_confidence: 0.88, movement_state: 'MOVING',       evidence_quality: 'HIGH',   frame_count: 64, latitude: 13.04105, longitude: 80.16298, uncertainty_m: 18, geolocation_method: 'UAV_TELEMETRY_SYNCED', analysis_id: 'demo-flood-001', created_at: Date.now() - 21000 },
  { track_id: 'LX-031', rescue_priority: 'HIGH',     detection_confidence: 0.69, survivor_confidence: 0.68, movement_state: 'LOW MOVEMENT', evidence_quality: 'MEDIUM', frame_count: 42, latitude: undefined, longitude: undefined, uncertainty_m: undefined, geolocation_method: undefined, analysis_id: 'demo-flood-001', created_at: Date.now() - 38000 },
  { track_id: 'LX-044', rescue_priority: 'VERIFY',   detection_confidence: 0.71, survivor_confidence: 0.63, movement_state: 'UNKNOWN',      evidence_quality: 'LOW',    frame_count: 18, latitude: 13.04382, longitude: 80.16612, uncertainty_m: 35, geolocation_method: 'ESTIMATED_PROJECTION', analysis_id: 'demo-flood-001', created_at: Date.now() - 64000 },
];

/**
 * DASHBOARD — Mission Overview & Command Center.
 * Respects per-video analysis sessions and clearly separates
 * CURRENT VIDEO RESULTS from MISSION TOTALS.
 */
const Dashboard: React.FC = () => {
  const { currentAnalysisId, currentAnalysis, analyses } = useSession();
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [dashboardCandidates, setDashboardCandidates] = useState<SurvivorCandidate[]>([]);
  const navigate = useNavigate();

  const handleCandidateUpdated = (updated: SurvivorCandidate) => {
    setDashboardCandidates((prev) =>
      prev.map((c) => (c.track_id === updated.track_id ? { ...c, ...updated } : c))
    );
  };

  useEffect(() => {
    const load = async () => {
      try {
        if (currentAnalysisId === 'demo-flood-001') {
          setDashboardCandidates(DEMO_CANDIDATES);
          setLiveStats({
            totalCandidates: DEMO_CANDIDATES.length,
            criticalCount: DEMO_CANDIDATES.filter((c) => c.rescue_priority === 'CRITICAL').length,
            highCount: DEMO_CANDIDATES.filter((c) => c.rescue_priority === 'HIGH').length,
            verifyCount: DEMO_CANDIDATES.filter((c) => c.rescue_priority === 'VERIFY').length,
            backendOnline: true,
            avgConfidence: 0.812,
            isRealSession: false,
            hasAnalyzed: true,
            sessionName: 'demo-flood-001.mp4',
            isDemoMode: true,
          });
          return;
        }

        if (currentAnalysisId) {
          const res = (await api.getSurvivors(currentAnalysisId)) as {
            count: number;
            critical_count: number;
            high_count: number;
            verify_count: number;
            candidates: SurvivorCandidate[];
          };

          const candidates = res.candidates ?? [];
          setDashboardCandidates(candidates);
          const avgConf =
            candidates.length > 0
              ? candidates.reduce((acc, c) => acc + (c.detection_confidence || 0), 0) / candidates.length
              : 0;

          setLiveStats({
            totalCandidates: res.count ?? 0,
            criticalCount: res.critical_count ?? 0,
            highCount: res.high_count ?? 0,
            verifyCount: res.verify_count ?? 0,
            backendOnline: true,
            avgConfidence: avgConf,
            isRealSession: true,
            hasAnalyzed: currentAnalysis?.status === 'COMPLETE',
            sessionName: currentAnalysis?.video_filename || currentAnalysisId,
            isDemoMode: false,
          });
        } else if (analyses.length > 0) {
          const first = analyses[0];
          const res = (await api.getSurvivors(first.id)) as {
            count: number;
            critical_count: number;
            high_count: number;
            verify_count: number;
            candidates: SurvivorCandidate[];
          };
          const candidates = res.candidates ?? [];
          setDashboardCandidates(candidates);
          const avgConf =
            candidates.length > 0
              ? candidates.reduce((acc, c) => acc + (c.detection_confidence || 0), 0) / candidates.length
              : 0;

          setLiveStats({
            totalCandidates: first.candidate_count ?? candidates.length,
            criticalCount: first.critical_count ?? 0,
            highCount: first.high_count ?? 0,
            verifyCount: first.verify_count ?? 0,
            backendOnline: true,
            avgConfidence: avgConf,
            isRealSession: true,
            hasAnalyzed: first.status === 'COMPLETE',
            sessionName: first.video_filename || first.id,
            isDemoMode: false,
          });
        } else {
          setDashboardCandidates([]);
          setLiveStats({
            totalCandidates: 0,
            criticalCount: 0,
            highCount: 0,
            verifyCount: 0,
            backendOnline: true,
            isRealSession: false,
            hasAnalyzed: false,
            isDemoMode: false,
          });
        }
      } catch {
        setDashboardCandidates([]);
        setLiveStats({
          totalCandidates: 0,
          criticalCount: 0,
          highCount: 0,
          verifyCount: 0,
          backendOnline: false,
          isRealSession: false,
          hasAnalyzed: false,
          isDemoMode: false,
        });
      }
    };
    load();
  }, [currentAnalysisId, currentAnalysis?.status, analyses]);

  const isReal = liveStats?.isRealSession && liveStats?.hasAnalyzed;
  const totalMissionCandidates = analyses.reduce((acc, a) => acc + (a.candidate_count ?? 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Video Session Selector Bar ── */}
      {analyses.length > 0 && <SessionSelector />}

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
                <span>INCIDENT: <strong className="text-white">{currentAnalysis?.incident_id || 'FLOOD-001'}</strong></span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-400/15 border border-sky-400/30 text-sky-300">
                <Film className="w-4 h-4 text-sky-400" />
                <span>ACTIVE FOOTAGE: <strong className="text-white truncate max-w-[200px]">{currentAnalysis?.video_filename || 'DEMO REPLAY READY'}</strong></span>
              </div>

              <span className={`px-3 py-1.5 rounded-lg font-bold border ${
                isReal
                  ? 'bg-emerald-400/15 border-emerald-400/30 text-emerald-300'
                  : 'bg-amber-400/15 border-amber-400/30 text-amber-300'
              }`}>
                {isReal ? 'LIVE SESSION INFERENCE' : 'DEMO REPLAY MODE'}
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
              <span>{isReal ? 'VIEW VIDEO ANALYSIS' : 'RUN VIDEO ANALYSIS'}</span>
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

      {/* ── KPI Stats Grid (Per-Video Live Counts) ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-mono font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
            <Film className="w-4 h-4 text-sky-600" />
            <span>CURRENT VIDEO RESULTS ({currentAnalysis?.video_filename || currentAnalysisId || 'DEMO SESSION'})</span>
          </div>
          {isReal && (
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
              VERIFIED ACTUAL DATA
            </span>
          )}
        </div>
        <StatsGrid liveStats={liveStats} />
      </div>

      {/* ── Mission Multi-Video Summary (Distinguishing Current Video from Mission Totals) ── */}
      {analyses.length > 1 && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-600" />
              <h3 className="font-heading font-bold text-sm text-slate-900 uppercase">
                MISSION TOTALS VS CURRENT VIDEO
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-bold">
              {analyses.length} TOTAL VIDEOS ANALYZED IN THIS INCIDENT
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">TOTAL MISSION VIDEOS</span>
              <span className="text-xl font-black text-slate-900">{analyses.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">TOTAL MISSION SURVIVORS</span>
              <span className="text-xl font-black text-emerald-700">{totalMissionCandidates}</span>
            </div>
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-200">
              <span className="text-[10px] text-sky-700 block font-bold">CURRENT VIDEO SURVIVORS</span>
              <span className="text-xl font-black text-sky-800">{liveStats?.totalCandidates ?? 0}</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-[10px] text-amber-700 block font-bold">CRITICAL IN CURRENT VIDEO</span>
              <span className="text-xl font-black text-red-700">{liveStats?.criticalCount ?? 0}</span>
            </div>
          </div>
        </div>
      )}

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

      {/* ── Triage Sorting Table (Rescue Priority) ── */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-sky-700" />
            <h2 className="text-base sm:text-lg font-heading font-black uppercase tracking-wider text-slate-900">
              TRIAGE SORTING
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/survivors')}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-mono font-bold text-sky-700 hover:text-sky-900 transition-colors"
          >
            OPEN SURVIVOR INTEL CONSOLE <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
        <TriageSorting
          candidates={dashboardCandidates}
          isReal={Boolean(liveStats?.isRealSession)}
          sessionName={currentAnalysis?.video_filename || currentAnalysisId || ''}
          hasAnalyzed={Boolean(liveStats?.hasAnalyzed)}
          isAnalyzing={currentAnalysis?.status === 'RUNNING' || currentAnalysis?.status === 'PENDING'}
          currentAnalysisId={currentAnalysisId || undefined}
          onCandidateUpdated={handleCandidateUpdated}
        />
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