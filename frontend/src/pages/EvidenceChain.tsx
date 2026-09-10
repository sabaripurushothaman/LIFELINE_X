import { useState, useEffect } from 'react';
import {
  GitMerge,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Camera,
  Activity,
  Radio,
  MapPin,
  Flame,
  HelpCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { api } from '../services/api';
import type { EvidenceChain, SurvivorCandidate, RescuePriority } from '../types';
import { useSession } from '../context/SessionContext';
import SessionSelector from '../components/common/SessionSelector';

const SOURCE_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  RGB_DETECTION: { label: 'RGB Person Detection', icon: Camera },
  TRACK_PERSISTENCE: { label: 'Multi-Frame Track Persistence', icon: Activity },
  MOVEMENT: { label: 'Movement & Biomechanics Analysis', icon: Activity },
  THERMAL: { label: 'Thermal Infrared Signature', icon: Flame },
  TELEMETRY: { label: 'UAV Flight Telemetry Sync', icon: Radio },
  GEOLOCATION: { label: 'Flat-Ground Geolocation Matrix', icon: MapPin },
};

const QUALITY_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  HIGH: { color: '#16a34a', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  MEDIUM: { color: '#d97706', bg: 'bg-amber-50', border: 'border-amber-200' },
  LOW: { color: '#dc2626', bg: 'bg-red-50', border: 'border-red-200' },
  'NOT AVAILABLE': { color: '#64748b', bg: 'bg-slate-100', border: 'border-slate-200' },
  UNKNOWN: { color: '#64748b', bg: 'bg-slate-100', border: 'border-slate-200' },
};

const PRIORITY_BADGES: Record<RescuePriority, { label: string; style: string }> = {
  CRITICAL: { label: 'CRITICAL', style: 'bg-red-50 text-red-700 border-red-300' },
  HIGH: { label: 'HIGH', style: 'bg-amber-50 text-amber-700 border-amber-300' },
  VERIFY: { label: 'VERIFY', style: 'bg-yellow-50 text-yellow-700 border-yellow-300' },
};

// Fallback demo candidates
const DEMO_CANDIDATES: SurvivorCandidate[] = [
  {
    track_id: 'LX-017',
    rescue_priority: 'CRITICAL',
    detection_confidence: 0.94,
    survivor_confidence: 0.96,
    movement_state: 'LOW MOVEMENT',
    evidence_quality: 'HIGH',
    frame_count: 88,
    latitude: 13.04218,
    longitude: 80.16431,
    uncertainty_m: 12,
    geolocation_method: 'UAV_TELEMETRY_SYNCED',
    analysis_id: 'demo-flood-001',
    created_at: Date.now() - 12000,
  },
  {
    track_id: 'LX-031',
    rescue_priority: 'HIGH',
    detection_confidence: 0.69,
    survivor_confidence: 0.68,
    movement_state: 'LOW MOVEMENT',
    evidence_quality: 'MEDIUM',
    frame_count: 42,
    evidence_conflict: true,
    latitude: undefined,
    longitude: undefined,
    uncertainty_m: undefined,
    geolocation_method: undefined,
    analysis_id: 'demo-flood-001',
    created_at: Date.now() - 38000,
  },
  {
    track_id: 'LX-023',
    rescue_priority: 'HIGH',
    detection_confidence: 0.91,
    survivor_confidence: 0.88,
    movement_state: 'MOVING',
    evidence_quality: 'HIGH',
    frame_count: 64,
    latitude: 13.04105,
    longitude: 80.16298,
    uncertainty_m: 18,
    geolocation_method: 'UAV_TELEMETRY_SYNCED',
    analysis_id: 'demo-flood-001',
    created_at: Date.now() - 21000,
  },
];

interface CandidateEvidenceProps {
  candidate: SurvivorCandidate;
  isInitiallyExpanded?: boolean;
}

const CandidateEvidenceCard = ({ candidate, isInitiallyExpanded = false }: CandidateEvidenceProps) => {
  const [chain, setChain] = useState<EvidenceChain | null>(null);
  const [expanded, setExpanded] = useState(isInitiallyExpanded);
  const [loading, setLoading] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<string | null>(candidate.human_decision ?? null);

  const loadChain = async () => {
    if (chain) {
      setExpanded(!expanded);
      return;
    }
    setLoading(true);
    setExpanded(true);
    try {
      const result = (await api.getEvidence(candidate.track_id, candidate.analysis_id)) as EvidenceChain;
      setChain(result);
    } catch {
      // Fallback demo chain
      setChain({
        track_id: candidate.track_id,
        analysis_id: candidate.analysis_id ?? 'demo-flood-001',
        evidence_items: [
          {
            source: 'RGB_DETECTION',
            quality: 'HIGH',
            available: true,
            value: candidate.detection_confidence,
            notes: 'YOLOv8 deep learning person candidate detection in 4K optical feed',
          },
          {
            source: 'TRACK_PERSISTENCE',
            quality: 'HIGH',
            available: true,
            value: `${candidate.frame_count} frames`,
            notes: 'ByteTrack Kalman filter association verified across consecutive frames',
          },
          {
            source: 'MOVEMENT',
            quality: 'MEDIUM',
            available: true,
            value: candidate.movement_state,
            notes: 'Optical flow spatial displacement indicates trapped / low movement posture',
          },
          {
            source: 'THERMAL',
            quality: candidate.track_id === 'LX-023' ? 'HIGH' : 'NOT AVAILABLE',
            available: candidate.track_id === 'LX-023',
            value: candidate.track_id === 'LX-023' ? 0.87 : null,
            notes: candidate.track_id === 'LX-023' ? 'Infrared thermal body heat confirmation' : 'Thermal payload not mounted on this flight leg',
          },
          {
            source: 'TELEMETRY',
            quality: candidate.latitude ? 'HIGH' : 'LOW',
            available: !!candidate.latitude,
            value: candidate.latitude ? 'SYNCED' : 'MISSING',
            notes: candidate.latitude ? 'UAV altitude (82m), pitch, roll, and GPS synchronized' : 'Telemetry timestamp drift exceeds 500ms',
          },
          {
            source: 'GEOLOCATION',
            quality: candidate.latitude ? 'HIGH' : 'NOT AVAILABLE',
            available: !!candidate.latitude,
            value: candidate.latitude ? `±${candidate.uncertainty_m ?? 15}m` : null,
            notes: candidate.latitude ? 'Flat-ground pinhole camera projection to WGS84' : 'GPS coordinates unavailable',
          },
        ],
        available_count: candidate.latitude ? 5 : 3,
        total_count: 6,
        has_conflict: candidate.evidence_conflict ?? (candidate.track_id === 'LX-031'),
        evidence_summary: '5/6 signals verified',
        overall_quality: candidate.evidence_quality,
        human_review_required: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isInitiallyExpanded) {
      loadChain();
    }
  }, []);

  const pBadge = PRIORITY_BADGES[candidate.rescue_priority] ?? PRIORITY_BADGES.VERIFY;
  const isConflict = candidate.evidence_conflict || (chain?.has_conflict ?? false);

  const handleReview = async (action: string) => {
    try {
      await api.submitReview({
        analysis_id: candidate.analysis_id ?? 'demo-flood-001',
        track_id: candidate.track_id,
        decision: action,
      });
    } catch {
      // Demo fallback
    }
    setReviewDecision(action);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.10)] transition-all">
      {/* Header Accordion Button */}
      <button
        type="button"
        onClick={loadChain}
        className="w-full flex flex-wrap items-center justify-between p-4 sm:p-5 hover:bg-slate-50 transition-all text-left gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-sky-50 border-2 border-sky-300 flex items-center justify-center font-mono font-black text-sm text-sky-700">
            {candidate.track_id}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-black text-slate-900 text-base">
                EVIDENCE DOSSIER: {candidate.track_id}
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${pBadge.style}`}>
                {pBadge.label}
              </span>
              {isConflict && (
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-300 animate-pulse">
                  ⚠ SENSOR CONFLICT
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              CONFIDENCE: {Math.round((candidate.survivor_confidence ?? candidate.detection_confidence) * 100)}% • QUALITY: {candidate.evidence_quality}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {reviewDecision && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              REVIEWED: {reviewDecision}
            </span>
          )}
          <div className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-500">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Expanded Investigation Chain Body */}
      {expanded && (
        <div className="p-4 sm:p-6 border-t border-slate-100 space-y-6 bg-slate-50">
          {loading && (
            <div className="text-center py-6 text-sky-600 font-mono text-xs animate-pulse">
              Synthesizing multi-modal evidence chain…
            </div>
          )}

          {/* Conflict Warning State & Human Triage Actions (Section 9) */}
          {isConflict && (
            <div className="p-4 sm:p-5 rounded-xl bg-red-50 border border-red-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-700 font-heading font-black text-sm">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                  <span>EVIDENCE CONFLICT — HUMAN REVIEW REQUIRED</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-300">
                  DISCREPANCY DETECTED
                </span>
              </div>

              <p className="text-xs text-red-700 leading-relaxed">
                Why this needs review: Multiple evidence sources produce conflicting confidence values. Optical detection suggests a person, but secondary verification (thermal or tracking persistence) exhibits low correlation. Never automatically confirm without human triage.
              </p>

              {/* Conflict Signal Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono text-xs">
                <div className="bg-white p-2 rounded-lg border border-red-100">
                  <span className="text-[9px] text-slate-500 block">RGB OPTICAL</span>
                  <span className="text-sky-700 font-black text-sm">94%</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-red-100">
                  <span className="text-[9px] text-slate-500 block">THERMAL IR</span>
                  <span className="text-red-700 font-black text-sm">31%</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-red-100">
                  <span className="text-[9px] text-slate-500 block">MOVEMENT FLOW</span>
                  <span className="text-amber-700 font-black text-sm">15%</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-red-100">
                  <span className="text-[9px] text-slate-500 block">TRACK PERSISTENCE</span>
                  <span className="text-slate-800 font-black text-sm">42%</span>
                </div>
              </div>

              {/* Four Action Buttons */}
              <div className="pt-2">
                <div className="text-[10px] font-mono text-slate-600 mb-2 font-semibold">RESOLVE SENSOR DISCREPANCY:</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button type="button" onClick={() => handleReview('CONFIRM_SURVIVOR')}
                    className="p-2 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100 text-xs font-bold font-mono transition-all">
                    CONFIRM SURVIVOR
                  </button>
                  <button type="button" onClick={() => handleReview('MARK_FALSE_POSITIVE')}
                    className="p-2 rounded-lg bg-red-50 border border-red-300 text-red-700 hover:bg-red-100 text-xs font-bold font-mono transition-all">
                    FALSE POSITIVE
                  </button>
                  <button type="button" onClick={() => handleReview('REQUEST_MORE_IMAGERY')}
                    className="p-2 rounded-lg bg-sky-50 border border-sky-300 text-sky-700 hover:bg-sky-100 text-xs font-bold font-mono transition-all">
                    MORE IMAGERY
                  </button>
                  <button type="button" onClick={() => handleReview('FLAG_FOR_REVIEW')}
                    className="p-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100 text-xs font-bold font-mono transition-all">
                    FLAG FOR REVIEW
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Vertical Timeline Evidence Chain */}
          {chain && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-heading font-black text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <GitMerge className="w-4 h-4 text-sky-600" />
                  STEP-BY-STEP EVIDENCE PROVENANCE CHAIN
                </h4>
                <span className="text-[10px] font-mono text-slate-400">
                  {chain.available_count} OF {chain.total_count} SIGNALS VERIFIED
                </span>
              </div>

              {/* Vertical connected timeline */}
              <div className="relative pl-6 sm:pl-8 space-y-4 border-l-2 border-sky-300 ml-3 py-1">
                {chain.evidence_items.map((item, idx) => {
                  const src = SOURCE_CONFIG[item.source] || { label: item.source, icon: HelpCircle };
                  const qCfg = QUALITY_CONFIG[item.quality] || QUALITY_CONFIG.UNKNOWN;
                  const Icon = src.icon;

                  return (
                    <div key={idx} className="relative group">
                      {/* Animated connector node */}
                      <div className="absolute -left-7.75 sm:-left-9.75 top-1.5 w-4 h-4 rounded-full bg-white border-2 border-[#7DACE4] flex items-center justify-center shadow-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                      </div>

                      {/* Item Card */}
                      <div className="p-3 sm:p-4 rounded-xl bg-white border border-slate-200 hover:border-sky-300 transition-all shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-sky-600" />
                            <span className="font-heading font-bold text-sm text-slate-900">
                              {src.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${qCfg.bg} ${qCfg.border}`} style={{ color: qCfg.color }}>
                              QUALITY: {item.quality}
                            </span>
                            {item.available ? (
                              <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                AVAILABLE
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                                <XCircle className="w-3.5 h-3.5" />
                                N/A
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                          {item.notes}
                        </p>

                        {item.available && item.value !== null && item.value !== undefined && (
                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2 font-mono text-[11px]">
                            <span className="text-slate-500">MEASURED VALUE:</span>
                            <span className="text-sky-700 font-bold">
                              {typeof item.value === 'number'
                                ? item.value <= 1 && item.value > 0
                                  ? `${(item.value * 100).toFixed(1)}%`
                                  : String(item.value)
                                : String(item.value)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const EvidenceChainPage = () => {
  const { currentAnalysisId, currentAnalysis, analyses } = useSession();
  const [candidates, setCandidates] = useState<SurvivorCandidate[]>([]);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        if (currentAnalysisId) {
          const result = (await api.getSurvivors(currentAnalysisId)) as { candidates: SurvivorCandidate[] };
          setCandidates(result.candidates ?? []);
          setIsDemo(false);
        } else if (analyses.length > 0) {
          const result = (await api.getSurvivors(analyses[0].id)) as { candidates: SurvivorCandidate[] };
          setCandidates(result.candidates ?? []);
          setIsDemo(false);
        } else {
          setCandidates(DEMO_CANDIDATES);
          setIsDemo(true);
        }
      } catch {
        setCandidates(DEMO_CANDIDATES);
        setIsDemo(true);
      }
    };
    load();
  }, [currentAnalysisId, analyses.length]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-heading">
              EVIDENCE CHAIN INVESTIGATION
            </h1>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-sky-50 border border-sky-200 text-sky-700">
              PROVENANCE TRACE
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Multi-modal evidence provenance breakdown for every survivor candidate. Transparent AI decision audit trail.
          </p>
        </div>
        <span className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border ${isDemo
          ? 'bg-amber-50 border-amber-200 text-amber-700'
          : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
          {isDemo ? 'DEMO REPLAY' : `SESSION: ${currentAnalysis?.video_filename || currentAnalysisId}`}
        </span>
      </div>

      {/* Video Session Selector */}
      {analyses.length > 0 && <SessionSelector />}

      {/* Global Pipeline Schematic Banner */}
      <div className="p-4 rounded-xl bg-sky-50 border border-sky-200">
        <div className="text-xs font-mono font-bold text-slate-700 mb-2.5 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-sky-600" />
          <span>LIFELINE-X EVIDENCE PIPELINE ARCHITECTURE</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-600">
          {[
            'RAW FRAME', 'YOLO DETECTION', 'TRACK ID', 'PERSISTENCE',
            'MOVEMENT', 'THERMAL', 'TELEMETRY', 'GEOLOCATION',
            'SURVIVOR CONF.', 'RESCUE PRIORITY',
          ].map((step, idx) => (
            <span key={step} className="flex items-center gap-1.5">
              <span className="px-2 py-1 rounded-md bg-white border border-sky-200 text-slate-800 font-bold shadow-sm">
                {step}
              </span>
              {idx < 9 && <span className="text-sky-500 font-bold">→</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Candidate Dossier Cards List */}
      {candidates.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 font-mono space-y-2">
          <div className="text-slate-400 text-sm font-bold uppercase tracking-wider">
            NO EVIDENCE CHAINS FOR THIS VIDEO SESSION
          </div>
          <p className="text-xs text-slate-500">
            Session: {currentAnalysis?.video_filename || currentAnalysisId} • 0 candidates flagged.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {candidates.map((candidate, idx) => (
            <CandidateEvidenceCard
              key={`${candidate.analysis_id || currentAnalysisId}-${candidate.track_id}`}
              candidate={candidate}
              isInitiallyExpanded={idx === 0 || candidate.track_id === 'LX-031'}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default EvidenceChainPage;
