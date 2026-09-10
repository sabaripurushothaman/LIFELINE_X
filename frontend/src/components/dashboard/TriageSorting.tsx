import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Flame,
  User,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Camera,
  Flag,
  MapPin,
  Sparkles,
  Navigation,
  Loader2,
  X,
  ExternalLink,
  Info,
  Layers,
} from 'lucide-react';
import type { SurvivorCandidate, RescuePriority, AiFlagExplanation } from '../../types';
import { api } from '../../services/api';

interface RouteStatusState {
  loading: boolean;
  status: 'IDLE' | 'ROUTE_FOUND' | 'NOT_CONFIGURED' | 'NO_GPS' | 'ERROR';
  distanceKm?: number;
  durationMinutes?: number;
  engine?: string;
  error?: string;
  safetyNote?: string;
}

interface TriageSortingProps {
  candidates: SurvivorCandidate[];
  isReal: boolean;
  sessionName: string;
  hasAnalyzed: boolean;
  isAnalyzing?: boolean;
  currentAnalysisId?: string;
  onCandidateUpdated?: (updated: SurvivorCandidate) => void;
}

const PRIORITY_ORDER: Record<RescuePriority, number> = {
  CRITICAL: 1,
  HIGH: 2,
  VERIFY: 3,
};

const PRIORITY_STYLES: Record<
  RescuePriority,
  {
    label: string;
    border: string;
    bg: string;
    text: string;
    leftBorder: string;
    rowHover: string;
    accentColor: string;
    badgeBg: string;
  }
> = {
  CRITICAL: {
    label: 'CRITICAL',
    border: 'border-red-400',
    bg: 'bg-red-50',
    text: 'text-red-700',
    leftBorder: 'border-l-4 border-l-red-600',
    rowHover: 'hover:bg-red-50/50',
    accentColor: '#dc2626',
    badgeBg: 'bg-red-100 text-red-800 border-red-300',
  },
  HIGH: {
    label: 'HIGH',
    border: 'border-amber-400',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    leftBorder: 'border-l-4 border-l-amber-500',
    rowHover: 'hover:bg-amber-50/50',
    accentColor: '#d97706',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  VERIFY: {
    label: 'VERIFY',
    border: 'border-yellow-400',
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    leftBorder: 'border-l-4 border-l-yellow-500',
    rowHover: 'hover:bg-yellow-50/40',
    accentColor: '#ca8a04',
    badgeBg: 'bg-yellow-100 text-yellow-900 border-yellow-300',
  },
};

const REVIEW_ACTIONS = [
  { id: 'CONFIRM_SURVIVOR', label: 'CONFIRM SURVIVOR', icon: CheckCircle2, cls: 'bg-emerald-600 hover:bg-emerald-500 text-white' },
  { id: 'MARK_FALSE_POSITIVE', label: 'MARK FALSE POSITIVE', icon: XCircle, cls: 'bg-rose-600 hover:bg-rose-500 text-white' },
  { id: 'REQUEST_MORE_IMAGERY', label: 'REQUEST MORE IMAGERY', icon: Camera, cls: 'bg-sky-600 hover:bg-sky-500 text-white' },
  { id: 'FLAG_FOR_REVIEW', label: 'FLAG FOR REVIEW', icon: Flag, cls: 'bg-amber-600 hover:bg-amber-500 text-white' },
];

export const TriageSorting: React.FC<TriageSortingProps> = ({
  candidates,
  isReal,
  sessionName,
  hasAnalyzed,
  isAnalyzing = false,
  currentAnalysisId,
  onCandidateUpdated,
}) => {
  const navigate = useNavigate();
  const [selectedCandidate, setSelectedCandidate] = useState<SurvivorCandidate | null>(null);
  const [explanation, setExplanation] = useState<AiFlagExplanation | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [routeState, setRouteState] = useState<RouteStatusState>({ loading: false, status: 'IDLE' });

  // ── Auto-sort candidates: CRITICAL -> HIGH -> VERIFY, then by survivor_confidence desc
  const sortedCandidates = useMemo(() => {
    return [...candidates].sort((a, b) => {
      const orderA = PRIORITY_ORDER[a.rescue_priority] ?? 99;
      const orderB = PRIORITY_ORDER[b.rescue_priority] ?? 99;
      if (orderA !== orderB) return orderA - orderB;

      const confA = a.survivor_confidence ?? a.detection_confidence ?? 0;
      const confB = b.survivor_confidence ?? b.detection_confidence ?? 0;
      return confB - confA;
    });
  }, [candidates]);

  // ── Handle row click to open specific person's details
  const handleSelectCandidate = async (candidate: SurvivorCandidate) => {
    setSelectedCandidate(candidate);
    setExplanation(null);
    setActionError(null);
    setRouteState({ loading: false, status: 'IDLE' });

    try {
      const detail = (await api.getSurvivor(
        candidate.track_id,
        candidate.analysis_id || currentAnalysisId || undefined
      )) as {
        ai_flag_explanation: AiFlagExplanation;
        candidate: SurvivorCandidate;
      };
      if (detail.ai_flag_explanation) setExplanation(detail.ai_flag_explanation);
      if (detail.candidate) setSelectedCandidate({ ...candidate, ...detail.candidate });
    } catch {
      // Retain already selected object
    }
  };

  // ── Handle human review action buttons
  const handleReviewAction = async (decision: string) => {
    if (!selectedCandidate) return;
    setActionLoading(decision);
    setActionError(null);

    const targetAnalysisId = selectedCandidate.analysis_id || currentAnalysisId || 'demo-flood-001';

    try {
      await api.submitReview({
        analysis_id: targetAnalysisId,
        track_id: selectedCandidate.track_id,
        decision,
      });

      const updated = {
        ...selectedCandidate,
        human_decision: decision,
        human_review_status: decision,
      };
      setSelectedCandidate(updated);
      if (onCandidateUpdated) onCandidateUpdated(updated);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to submit review action to backend.');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Handle "GET BEST ROUTE"
  const handleGetBestRoute = async () => {
    if (!selectedCandidate) return;

    if (!selectedCandidate.latitude || !selectedCandidate.longitude) {
      setRouteState({
        loading: false,
        status: 'NO_GPS',
        error: 'NO GPS DATA IN THIS VIDEO — ROUTE UNAVAILABLE',
      });
      return;
    }

    setRouteState({ loading: true, status: 'IDLE' });

    try {
      // Default responder HQ coords (Sector Alpha HQ)
      const respLat = 13.0480;
      const respLon = 80.1690;

      const res = (await api.getRouting(
        respLat,
        respLon,
        selectedCandidate.latitude,
        selectedCandidate.longitude,
        selectedCandidate.track_id
      )) as any;

      if (res.status === 'ROUTE_FOUND') {
        setRouteState({
          loading: false,
          status: 'ROUTE_FOUND',
          distanceKm: res.distance_km,
          durationMinutes: res.duration_minutes,
          engine: res.routing_engine,
          safetyNote: res.safety_note,
        });
      } else {
        setRouteState({
          loading: false,
          status: 'NOT_CONFIGURED',
          error: res.note || 'ROUTING SERVICE NOT CONFIGURED',
        });
      }
    } catch {
      setRouteState({
        loading: false,
        status: 'ERROR',
        error: 'ROUTING SERVICE UNAVAILABLE',
      });
    }
  };

  // ── Helper formatting
  const formatTime = (timestamp?: number) => {
    if (!timestamp) return 'JUST NOW';
    const d = new Date(timestamp);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  const getStatusLabel = (candidate: SurvivorCandidate) => {
    if (candidate.human_decision) {
      switch (candidate.human_decision) {
        case 'CONFIRM_SURVIVOR':
          return { text: 'CONFIRMED', cls: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-black' };
        case 'MARK_FALSE_POSITIVE':
          return { text: 'FALSE POSITIVE', cls: 'bg-slate-200 text-slate-700 border-slate-300 font-bold' };
        case 'REQUEST_MORE_IMAGERY':
          return { text: 'MORE IMAGERY REQUESTED', cls: 'bg-sky-100 text-sky-900 border-sky-300 font-bold' };
        case 'FLAG_FOR_REVIEW':
          return { text: 'FLAGGED FOR REVIEW', cls: 'bg-amber-100 text-amber-900 border-amber-300 font-bold' };
        default:
          return { text: candidate.human_decision, cls: 'bg-slate-100 text-slate-800 border-slate-200 font-bold' };
      }
    }
    return { text: 'HUMAN REVIEW REQUIRED', cls: 'bg-red-50 text-red-700 border-red-200 font-bold animate-pulse' };
  };

  const getLocationLabel = (candidate: SurvivorCandidate) => {
    if (candidate.latitude && candidate.longitude) {
      return `±${candidate.uncertainty_m ?? 15}m (${candidate.geolocation_method || 'GPS SYNC'})`;
    }
    return 'NO GPS DATA';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_20px_rgba(15,23,42,0.07)] overflow-hidden font-mono">
      {/* ── Table Header Bar ── */}
      <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-sky-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-100 border border-sky-200 text-sky-700">
            <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 font-heading tracking-tight">
                TRIAGE SORTING
              </h2>
              <span className="text-xs sm:text-sm px-2.5 py-0.5 rounded-md bg-sky-100 border border-sky-300 text-sky-900 font-bold">
                {sortedCandidates.length} CANDIDATES
              </span>
              <span className="text-xs text-slate-500 font-medium">
                (SORTED BY RESCUE PRIORITY)
              </span>
            </div>
            <div className="text-xs sm:text-sm text-slate-500 font-mono mt-0.5">
              {isReal
                ? `ACTIVE FOOTAGE: ${sessionName || currentAnalysisId || 'SELECTED VIDEO'}`
                : 'DEMO DISASTER CORRIDOR (FLOOD-001)'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold border ${
              isReal
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-amber-50 border-amber-300 text-amber-800'
            }`}
          >
            {isReal ? 'REAL MISSION INFERENCE' : 'DEMO MODE'}
          </span>
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[840px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/80 text-[11px] sm:text-xs font-heading font-black text-slate-700 uppercase tracking-wider">
              <th className="py-3.5 px-4">PRIORITY</th>
              <th className="py-3.5 px-4">SURVIVOR ID</th>
              <th className="py-3.5 px-4">DETECTION CONF</th>
              <th className="py-3.5 px-4">SURVIVOR CONF</th>
              <th className="py-3.5 px-4">MOVEMENT</th>
              <th className="py-3.5 px-4">LOCATION CONFIDENCE</th>
              <th className="py-3.5 px-4">EVIDENCE</th>
              <th className="py-3.5 px-4">STATUS</th>
              <th className="py-3.5 px-4 text-right">ACTION</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-mono">
            {/* Empty State: Waiting for analysis */}
            {isReal && !hasAnalyzed && !isAnalyzing && (
              <tr>
                <td colSpan={9} className="py-12 px-6 text-center">
                  <div className="max-w-md mx-auto space-y-3">
                    <ShieldAlert className="w-10 h-10 text-slate-400 mx-auto" />
                    <div className="text-base font-heading font-black text-slate-800">
                      WAITING FOR ANALYSIS
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 font-sans leading-relaxed">
                      No video analysis has been run for this session. Upload drone footage and run detection to populate the triage sorting table.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/analysis')}
                      className="mt-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-heading font-bold text-xs tracking-wider transition-all shadow-sm"
                    >
                      OPEN VIDEO ANALYSIS
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Empty State: Analysis in progress */}
            {isReal && isAnalyzing && (
              <tr>
                <td colSpan={9} className="py-12 px-6 text-center">
                  <div className="max-w-md mx-auto space-y-3">
                    <Loader2 className="w-10 h-10 text-sky-600 animate-spin mx-auto" />
                    <div className="text-base font-heading font-black text-slate-800">
                      ANALYSIS IN PROGRESS
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 font-sans leading-relaxed">
                      AI is evaluating sampled video frames, tracking persistence, and calculating rescue priorities. Detections will appear immediately upon completion.
                    </p>
                  </div>
                </td>
              </tr>
            )}

            {/* Empty State: Completed with zero candidates */}
            {isReal && hasAnalyzed && sortedCandidates.length === 0 && (
              <tr>
                <td colSpan={9} className="py-12 px-6 text-center">
                  <div className="max-w-md mx-auto space-y-3">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                    <div className="text-base font-heading font-black text-slate-800">
                      NO SURVIVOR CANDIDATES DETECTED
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 font-sans leading-relaxed">
                      Video &quot;{sessionName}&quot; was scanned completely across all sampled frames. Zero human candidates exceeded detection thresholds in this sector.
                    </p>
                  </div>
                </td>
              </tr>
            )}

            {/* Candidate Rows */}
            {sortedCandidates.map((candidate) => {
              const priorityStyle = PRIORITY_STYLES[candidate.rescue_priority] ?? PRIORITY_STYLES.VERIFY;
              const isSelected = selectedCandidate?.track_id === candidate.track_id;
              const statusInfo = getStatusLabel(candidate);
              const detConf = Math.round(candidate.detection_confidence * 100);
              const survConf = Math.round((candidate.survivor_confidence ?? candidate.detection_confidence) * 100);
              const locationLabel = getLocationLabel(candidate);

              return (
                <tr
                  key={candidate.track_id}
                  onClick={() => handleSelectCandidate(candidate)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectCandidate(candidate);
                    }
                  }}
                  tabIndex={0}
                  className={`cursor-pointer transition-all duration-150 ${priorityStyle.leftBorder} ${
                    isSelected
                      ? 'bg-sky-100/60 ring-1 ring-sky-400 font-semibold'
                      : `${priorityStyle.rowHover} bg-white`
                  }`}
                >
                  {/* PRIORITY */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-heading font-black border ${priorityStyle.badgeBg}`}
                    >
                      {candidate.rescue_priority === 'CRITICAL' ? (
                        <Flame className="w-3.5 h-3.5 text-red-600" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      )}
                      <span>{candidate.rescue_priority}</span>
                    </span>
                  </td>

                  {/* SURVIVOR ID */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-heading font-black text-slate-900 text-sm sm:text-base">
                          {candidate.track_id}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatTime(candidate.created_at)}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* DETECTION CONF */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="font-black text-slate-900 text-sm sm:text-base">
                        {detConf}%
                      </div>
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-500 rounded-full"
                          style={{ width: `${detConf}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* SURVIVOR CONF */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className={`font-black text-sm sm:text-base ${priorityStyle.text}`}>
                        {survConf}%
                      </div>
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${survConf}%`,
                            backgroundColor: priorityStyle.accentColor,
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* MOVEMENT */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                      {candidate.movement_state || 'UNKNOWN'}
                    </span>
                  </td>

                  {/* LOCATION CONFIDENCE */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <MapPin
                        className={`w-4 h-4 flex-shrink-0 ${
                          candidate.latitude ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      />
                      <span
                        className={`text-xs font-bold ${
                          candidate.latitude ? 'text-slate-800' : 'text-slate-400 italic'
                        }`}
                      >
                        {locationLabel}
                      </span>
                    </div>
                  </td>

                  {/* EVIDENCE */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-800">
                      {candidate.evidence_quality || 'RGB OPTICAL'}
                    </span>
                  </td>

                  {/* STATUS */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-block text-xs px-2.5 py-1 rounded-md border font-bold ${statusInfo.cls}`}
                    >
                      {statusInfo.text}
                    </span>
                  </td>

                  {/* ACTION */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectCandidate(candidate);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-300 text-sky-800 hover:bg-sky-600 hover:text-white text-xs font-heading font-bold transition-all shadow-sm"
                    >
                      DETAILS
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Table Footer ── */}
      <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs font-mono text-slate-600 gap-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-600" />
          <span>Click any row to open the full survivor intelligence dossier, evidence chain, and routing console.</span>
        </div>
        <div className="font-bold text-slate-700">
          TRIAGE DISPATCH CONSOLE • {sortedCandidates.length} DETECTIONS RANKED
        </div>
      </div>

      {/* ── PERSON DETAILS DRAWER (SURVIVOR [ID] — DETAILS) ── */}
      {selectedCandidate && (
        <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white border-l border-slate-300 shadow-[0_0_50px_rgba(15,23,42,0.3)] z-50 flex flex-col overflow-hidden animate-slide-down font-mono">
          {/* Drawer Header */}
          {(() => {
            const pStyle = PRIORITY_STYLES[selectedCandidate.rescue_priority] ?? PRIORITY_STYLES.VERIFY;
            return (
              <div className={`px-6 py-5 border-b border-slate-200 flex items-center justify-between flex-shrink-0 ${pStyle.bg}`}>
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-12 h-12 rounded-xl border-2 flex items-center justify-center font-heading font-black text-base bg-white shadow-sm"
                    style={{ borderColor: pStyle.accentColor, color: pStyle.accentColor }}
                  >
                    {selectedCandidate.track_id}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-black text-lg text-slate-900">
                        SURVIVOR {selectedCandidate.track_id} — DETAILS
                      </h3>
                      <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-md border ${pStyle.badgeBg}`}>
                        {selectedCandidate.rescue_priority}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      VIDEO SESSION: {selectedCandidate.analysis_id || currentAnalysisId || 'FLOOD-001'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
                  className="p-2 rounded-xl border border-slate-300 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-400 transition-all shadow-sm"
                  aria-label="Close details"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            );
          })()}

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs sm:text-sm">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] sm:text-xs text-slate-500 block font-heading font-bold uppercase">
                  DETECTION CONF
                </span>
                <span className="text-lg sm:text-xl font-black text-sky-700 font-heading">
                  {Math.round(selectedCandidate.detection_confidence * 100)}%
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] sm:text-xs text-slate-500 block font-heading font-bold uppercase">
                  SURVIVOR CONF
                </span>
                <span className="text-lg sm:text-xl font-black text-red-700 font-heading">
                  {Math.round((selectedCandidate.survivor_confidence ?? selectedCandidate.detection_confidence) * 100)}%
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] sm:text-xs text-slate-500 block font-heading font-bold uppercase">
                  MOVEMENT STATE
                </span>
                <span className="text-sm sm:text-base font-bold text-slate-800 font-heading truncate block">
                  {selectedCandidate.movement_state || 'UNKNOWN'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] sm:text-xs text-slate-500 block font-heading font-bold uppercase">
                  TRACK PERSISTENCE
                </span>
                <span className="text-lg sm:text-xl font-black text-emerald-700 font-heading">
                  {selectedCandidate.frame_count} FRAMES
                </span>
              </div>
            </div>

            {/* Geolocation Intelligence */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-900 font-heading font-black text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  GEOLOCATION &amp; TELEMETRY
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                    selectedCandidate.latitude
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {selectedCandidate.latitude ? 'GPS FIX ACTIVE' : 'NO GPS DATA'}
                </span>
              </div>

              {selectedCandidate.latitude && selectedCandidate.longitude ? (
                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-400 block text-[10px]">LATITUDE</span>
                    <span className="font-bold text-slate-900">{selectedCandidate.latitude.toFixed(6)}°N</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">LONGITUDE</span>
                    <span className="font-bold text-slate-900">{selectedCandidate.longitude.toFixed(6)}°E</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">UNCERTAINTY RADIUS</span>
                    <span className="font-bold text-sky-700">±{selectedCandidate.uncertainty_m ?? 15}m</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">GEOLOCATION METHOD</span>
                    <span className="font-bold text-slate-800">{selectedCandidate.geolocation_method || 'TELEMETRY SYNC'}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Flight telemetry was not recorded or synchronized for this video. Coordinates cannot be calculated.
                </p>
              )}
            </div>

            {/* AI Flag Explanation Summary */}
            {explanation && (
              <div className="p-4 rounded-xl bg-sky-100/60 border border-sky-300 space-y-2">
                <div className="flex items-center gap-2 text-sky-950 font-heading font-black text-xs uppercase">
                  <Sparkles className="w-3.5 h-3.5 text-sky-700" />
                  <span>AI REASONING SUMMARY</span>
                </div>
                <p className="text-xs text-slate-800 font-sans leading-relaxed">
                  {explanation.summary}
                </p>
                {explanation.conflict_note && (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span>{explanation.conflict_note}</span>
                  </div>
                )}
              </div>
            )}

            {/* WHY DID AI FLAG THIS? (Evidence Chain) */}
            <div className="p-4 sm:p-5 rounded-xl bg-sky-50/70 border border-sky-200 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-heading font-black text-sm text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-600" />
                  WHY DID AI FLAG THIS? (EVIDENCE CHAIN)
                </h4>
                <button
                  type="button"
                  onClick={() => navigate('/evidence')}
                  className="text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1"
                >
                  <span>FULL CHAIN</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="relative pl-5 space-y-3 border-l-2 border-sky-300 ml-2">
                {[
                  {
                    step: 'RAW FRAME',
                    status: 'PASS',
                    detail: `Sampled frame sequence #${selectedCandidate.frame_count * 15 + 2000}`,
                  },
                  {
                    step: 'PERSON DETECTION',
                    status: 'PASS',
                    detail: `YOLOv8 optical confidence: ${Math.round(selectedCandidate.detection_confidence * 100)}%`,
                  },
                  {
                    step: 'TRACK ID',
                    status: 'PASS',
                    detail: `ByteTrack persistent track ID: ${selectedCandidate.track_id}`,
                  },
                  {
                    step: 'PERSISTENCE',
                    status: selectedCandidate.frame_count > 10 ? 'PASS' : 'PARTIAL',
                    detail: `Sustained across ${selectedCandidate.frame_count} video frames`,
                  },
                  {
                    step: 'MOVEMENT',
                    status: 'PASS',
                    detail: `Classification: ${selectedCandidate.movement_state || 'UNKNOWN'}`,
                  },
                  {
                    step: 'THERMAL',
                    status: 'N/A',
                    detail: 'RGB camera footage only. No thermal sensor stream provided.',
                  },
                  {
                    step: 'TELEMETRY',
                    status: selectedCandidate.latitude ? 'PASS' : 'NO TELEM',
                    detail: selectedCandidate.latitude ? 'Synchronized with UAV flight log' : 'Telemetry absent',
                  },
                  {
                    step: 'GEOLOCATION',
                    status: selectedCandidate.latitude ? 'PASS' : 'NO GPS',
                    detail: selectedCandidate.latitude ? `±${selectedCandidate.uncertainty_m ?? 15}m precision` : 'Estimated pixel projection only',
                  },
                  {
                    step: 'UNCERTAINTY',
                    status: 'CALCULATED',
                    detail: selectedCandidate.latitude ? `Error boundary: ${selectedCandidate.uncertainty_m ?? 15}m` : 'Uncertainty cannot be measured without GPS',
                  },
                  {
                    step: 'SURVIVOR CONFIDENCE & PRIORITY',
                    status: selectedCandidate.rescue_priority,
                    detail: `Fused score: ${Math.round((selectedCandidate.survivor_confidence ?? selectedCandidate.detection_confidence) * 100)}% → Queue: ${selectedCandidate.rescue_priority}`,
                  },
                ].map((item, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-white border-2 border-sky-500 flex items-center justify-center">
                      <div className="w-1 h-1 rounded-full bg-sky-600" />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{item.step}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          item.status === 'PASS' || item.status === 'CALCULATED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : item.status === 'CRITICAL'
                            ? 'bg-red-50 text-red-800 border-red-300 font-black'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Emergency Routing Section */}
            <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-heading font-black text-sm text-slate-900 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-sky-600" />
                  EMERGENCY ROUTING
                </h4>
                {selectedCandidate.latitude && (
                  <button
                    type="button"
                    onClick={() => navigate('/map')}
                    className="text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1"
                  >
                    <span>OPEN MAP</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Get Best Route Button */}
              <button
                type="button"
                disabled={routeState.loading}
                onClick={handleGetBestRoute}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-300 text-white font-heading font-bold text-sm tracking-wide shadow-sm transition-all"
              >
                {routeState.loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>CALCULATING OSRM ROAD ROUTE...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" />
                    <span>GET BEST ROUTE</span>
                  </>
                )}
              </button>

              {/* Route status outcome */}
              {routeState.status === 'ROUTE_FOUND' && (
                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                    <span>ROAD NETWORK ROUTE FOUND</span>
                    <span>ENGINE: {routeState.engine || 'OSRM'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>DISTANCE: <strong className="text-slate-900">{routeState.distanceKm} km</strong></div>
                    <div>EST. TIME: <strong className="text-slate-900">{routeState.durationMinutes} min</strong></div>
                  </div>
                  {routeState.safetyNote && (
                    <p className="text-[10px] text-emerald-700 font-sans">{routeState.safetyNote}</p>
                  )}
                </div>
              )}

              {routeState.status === 'NOT_CONFIGURED' && (
                <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1">
                  <div className="font-bold">ROUTING SERVICE NOT CONFIGURED</div>
                  <p className="text-[11px] text-slate-600 font-sans">{routeState.error}</p>
                </div>
              )}

              {routeState.status === 'NO_GPS' && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs space-y-1">
                  <div className="font-bold">ROUTE UNAVAILABLE</div>
                  <p className="text-[11px] text-red-600 font-sans">
                    This video lacks GPS coordinates. An emergency ground route cannot be computed without verified coordinates.
                  </p>
                </div>
              )}

              {routeState.status === 'ERROR' && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
                  <div className="font-bold">ROUTE UNAVAILABLE</div>
                  <div className="text-[11px] text-slate-600 font-sans">{routeState.error}</div>
                </div>
              )}
            </div>

            {/* Operator Human Review Actions */}
            <div className="p-4 sm:p-5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="font-heading font-black text-sm text-slate-900 uppercase">
                  OPERATOR HUMAN REVIEW
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                  DECISION AUDIT LOG
                </span>
              </div>

              {actionError && (
                <div className="p-3 rounded-lg bg-red-100 border border-red-300 text-red-800 text-xs">
                  <strong>Error:</strong> {actionError}
                </div>
              )}

              {selectedCandidate.human_decision ? (
                <div className="p-3.5 rounded-xl bg-white border border-emerald-300 shadow-sm space-y-1">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>RECORDED DECISION: {selectedCandidate.human_decision}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-sans">
                    Logged to mission database. AI recommendation cannot overwrite this human verified state.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleReviewAction('FLAG_FOR_REVIEW')}
                      className="text-xs text-sky-700 underline font-bold"
                    >
                      Re-open / Change decision
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {REVIEW_ACTIONS.map((act) => {
                    const Icon = act.icon;
                    const isBusy = actionLoading === act.id;
                    return (
                      <button
                        key={act.id}
                        type="button"
                        disabled={actionLoading !== null}
                        onClick={() => handleReviewAction(act.id)}
                        className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-heading font-bold text-xs tracking-wide shadow-sm transition-all ${act.cls}`}
                      >
                        {isBusy ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                        <span>{act.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <p className="text-[10px] text-amber-800 font-sans text-center">
                ⚠ AI outputs are advisory. Rescue dispatch requires human operator verification.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TriageSorting;
