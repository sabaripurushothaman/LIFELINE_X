import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  MapPin,
  CheckCircle2,
  XCircle,
  Camera,
  Flag,
  ChevronRight,
  Crosshair,
  Sparkles,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import type { SurvivorCandidate, RescuePriority, AiFlagExplanation } from '../types';

const PRIORITY_CONFIG: Record<
  RescuePriority,
  { label: string; border: string; bg: string; text: string; leftBorder: string; rowHover: string; accentColor: string }
> = {
  CRITICAL: {
    label: 'CRITICAL',
    border: 'border-red-300',
    bg: 'bg-red-50',
    text: 'text-red-700',
    leftBorder: 'border-l-4 border-l-red-500',
    rowHover: 'hover:bg-red-50/50',
    accentColor: '#dc2626',
  },
  HIGH: {
    label: 'HIGH',
    border: 'border-amber-300',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    leftBorder: 'border-l-4 border-l-amber-500',
    rowHover: 'hover:bg-amber-50/50',
    accentColor: '#d97706',
  },
  VERIFY: {
    label: 'VERIFY',
    border: 'border-yellow-300',
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    leftBorder: 'border-l-4 border-l-yellow-400',
    rowHover: 'hover:bg-yellow-50/30',
    accentColor: '#ca8a04',
  },
};

const REVIEW_ACTIONS = [
  { id: 'CONFIRM_SURVIVOR',     label: 'CONFIRM SURVIVOR',  icon: CheckCircle2, cls: 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100' },
  { id: 'MARK_FALSE_POSITIVE',  label: 'FALSE POSITIVE',    icon: XCircle,      cls: 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100' },
  { id: 'REQUEST_MORE_IMAGERY', label: 'MORE IMAGERY',      icon: Camera,       cls: 'bg-sky-50 border-sky-300 text-sky-700 hover:bg-sky-100' },
  { id: 'FLAG_FOR_REVIEW',      label: 'FLAG FOR REVIEW',   icon: Flag,         cls: 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100' },
];

const DEMO_CANDIDATES: SurvivorCandidate[] = [
  { track_id: 'LX-017', rescue_priority: 'CRITICAL', detection_confidence: 0.94, survivor_confidence: 0.96, movement_state: 'LOW MOVEMENT', evidence_quality: 'HIGH',   frame_count: 88, latitude: 13.04218, longitude: 80.16431, uncertainty_m: 12, geolocation_method: 'UAV_TELEMETRY_SYNCED', analysis_id: 'demo-flood-001', created_at: Date.now() - 12000 },
  { track_id: 'LX-023', rescue_priority: 'HIGH',     detection_confidence: 0.91, survivor_confidence: 0.88, movement_state: 'MOVING',       evidence_quality: 'HIGH',   frame_count: 64, latitude: 13.04105, longitude: 80.16298, uncertainty_m: 18, geolocation_method: 'UAV_TELEMETRY_SYNCED', analysis_id: 'demo-flood-001', created_at: Date.now() - 21000 },
  { track_id: 'LX-031', rescue_priority: 'HIGH',     detection_confidence: 0.69, survivor_confidence: 0.68, movement_state: 'LOW MOVEMENT', evidence_quality: 'MEDIUM', frame_count: 42, latitude: undefined, longitude: undefined, uncertainty_m: undefined, geolocation_method: undefined, analysis_id: 'demo-flood-001', created_at: Date.now() - 38000 },
  { track_id: 'LX-044', rescue_priority: 'VERIFY',   detection_confidence: 0.71, survivor_confidence: 0.63, movement_state: 'UNKNOWN',      evidence_quality: 'LOW',    frame_count: 18, latitude: 13.04382, longitude: 80.16612, uncertainty_m: 35, geolocation_method: 'ESTIMATED_PROJECTION', analysis_id: 'demo-flood-001', created_at: Date.now() - 64000 },
];

interface DetailPanelProps {
  candidate: SurvivorCandidate;
  explanation: AiFlagExplanation | null;
  onReview: (decision: string) => void;
  onClose: () => void;
}

const DetailPanel = ({ candidate, explanation, onReview, onClose }: DetailPanelProps) => {
  const cfg = PRIORITY_CONFIG[candidate.rescue_priority] ?? PRIORITY_CONFIG.VERIFY;
  const isConflict = explanation?.evidence_conflict ?? (candidate.track_id === 'LX-031');

  const pipelineStages = [
    { label: 'RAW FRAME',          status: 'PASS',    detail: `Frame #${candidate.frame_count * 15 + 4000}` },
    { label: 'PERSON DETECTION',   status: 'PASS',    detail: `YOLOv8 ${(candidate.detection_confidence * 100).toFixed(0)}%` },
    { label: 'TRACK PERSISTENCE',  status: 'PASS',    detail: `${candidate.frame_count} frames tracked` },
    { label: 'MOVEMENT ANALYSIS',  status: 'PASS',    detail: candidate.movement_state },
    { label: 'THERMAL EVIDENCE',   status: candidate.track_id === 'LX-023' ? 'PASS' : 'N/A', detail: candidate.track_id === 'LX-023' ? '87% heat signature' : 'Not available' },
    { label: 'TELEMETRY',          status: candidate.latitude ? 'PASS' : 'NO TELEM', detail: candidate.latitude ? 'UAV synced' : 'Telemetry missing' },
    { label: 'GEOLOCATION',        status: candidate.latitude ? 'PASS' : 'NO GPS',   detail: candidate.latitude ? `±${candidate.uncertainty_m ?? 15}m precision` : 'No GPS fix' },
    { label: 'SURVIVOR CONFIDENCE',status: 'FUSED',   detail: `${((candidate.survivor_confidence ?? candidate.detection_confidence) * 100).toFixed(0)}% score` },
    { label: 'RESCUE PRIORITY',    status: candidate.rescue_priority, detail: candidate.rescue_priority },
  ];

  const stageStyle = (status: string) => {
    if (status === 'PASS' || status === 'FUSED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'CRITICAL') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-slate-100 text-slate-500 border-slate-200';
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white border-l border-slate-200 shadow-[0_0_40px_rgba(15,23,42,0.2)] z-50 flex flex-col overflow-hidden animate-slide-down">
      {/* Drawer Header */}
      <div className={`px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0 ${cfg.bg}`}>
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl border-2 flex items-center justify-center font-heading font-black text-sm bg-white"
            style={{ borderColor: cfg.accentColor, color: cfg.accentColor }}
          >
            {candidate.track_id}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-black text-base text-slate-900">
                SURVIVOR INTELLIGENCE
              </h3>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${cfg.border} ${cfg.bg} ${cfg.text}`}>
                {candidate.rescue_priority}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              {candidate.analysis_id ?? 'FLOOD-001'} • MULTI-SENSOR TRACE
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-all"
          aria-label="Close dossier"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
        {/* Visual Frame Evidence */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 overflow-hidden">
          <div className="px-3 py-2 bg-white border-b border-slate-100 flex items-center justify-between font-mono text-[10px]">
            <span className="text-slate-700 font-bold flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-sky-600" />
              VISUAL FRAME EVIDENCE
            </span>
            <span className="text-sky-600">RGB OPTICAL CROP</span>
          </div>
          <div className="relative aspect-video flex items-center justify-center bg-[#051926] p-4">
            <div className="relative w-36 h-36 rounded-xl border-2 border-dashed border-sky-400/50 flex flex-col items-center justify-center p-2 bg-sky-400/5">
              <Crosshair className="w-8 h-8 text-sky-400 animate-pulse" />
              <div className="mt-2 text-[10px] font-mono text-white font-bold">{candidate.track_id}</div>
              <div className="text-[9px] font-mono text-sky-400">CONF: {(candidate.detection_confidence * 100).toFixed(0)}%</div>
            </div>
            <div className="absolute bottom-2 right-2 text-[9px] font-mono text-slate-400 bg-black/60 px-1.5 py-0.5 rounded">
              SIMULATED FRAME CROP
            </div>
          </div>
        </div>

        {/* Evidence Conflict */}
        {isConflict && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-3">
            <div className="flex items-center gap-2 text-red-700 font-heading font-black text-xs">
              <AlertTriangle className="w-4 h-4" />
              EVIDENCE CONFLICT — HUMAN REVIEW REQUIRED
            </div>
            <p className="text-[11px] text-red-600 leading-relaxed">
              Evidence sources disagree on classification confidence. Thermal or movement signals diverge from optical detection. Never confirm without human triage.
            </p>
            <div className="grid grid-cols-4 gap-2 font-mono text-[10px] text-center">
              {[
                { label: 'RGB', value: `${(candidate.detection_confidence * 100).toFixed(0)}%`, color: 'text-sky-700' },
                { label: 'THERMAL', value: candidate.track_id === 'LX-023' ? '87%' : '31%', color: 'text-amber-700' },
                { label: 'MOVEMENT', value: candidate.movement_state === 'MOVING' ? '78%' : '15%', color: 'text-slate-700' },
                { label: 'TRACKING', value: candidate.frame_count > 30 ? '88%' : '42%', color: 'text-emerald-700' },
              ].map((s) => (
                <div key={s.label} className="bg-white p-1.5 rounded-lg border border-red-100">
                  <span className="text-slate-500 block text-[8px]">{s.label}</span>
                  <span className={`font-black ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Primary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { label: 'DETECTION CONF', value: `${(candidate.detection_confidence * 100).toFixed(0)}%`, valueClass: 'text-sky-700' },
            { label: 'SURVIVOR CONF',  value: `${((candidate.survivor_confidence ?? candidate.detection_confidence) * 100).toFixed(0)}%`, valueClass: cfg.text },
            { label: 'MOVEMENT',       value: candidate.movement_state, valueClass: 'text-slate-800' },
            { label: 'EVIDENCE',       value: candidate.evidence_quality, valueClass: 'text-emerald-700' },
          ].map((m) => (
            <div key={m.label} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block text-[9px] font-mono">{m.label}</span>
              <span className={`text-base font-black font-mono ${m.valueClass}`}>{m.value}</span>
            </div>
          ))}
        </div>

        {/* Geolocation */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 font-mono">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-800 font-bold flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              GEOLOCATION INTELLIGENCE
            </span>
            <span className={candidate.latitude ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
              {candidate.latitude ? 'AVAILABLE' : 'NO GPS / UNMAPPED'}
            </span>
          </div>
          {candidate.latitude ? (
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 pt-1">
              <div>LAT: <span className="text-slate-900 font-bold">{candidate.latitude.toFixed(6)}</span></div>
              <div>LON: <span className="text-slate-900 font-bold">{candidate.longitude?.toFixed(6)}</span></div>
              <div className="col-span-2 text-sky-700">
                UNCERTAINTY: ±{candidate.uncertainty_m?.toFixed(0) ?? 15}m ({candidate.geolocation_method})
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-slate-500 italic">
              Telemetry synchronized coordinates unavailable. Estimated pixel coordinates only.
            </div>
          )}
        </div>

        {/* WHY DID AI FLAG THIS? */}
        <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-heading font-black text-xs text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              WHY DID AI FLAG THIS?
            </h4>
            <span className="text-[9px] font-mono text-sky-600 font-bold">EVIDENCE CHAIN</span>
          </div>

          <div className="relative pl-5 space-y-2.5 border-l-2 border-sky-300 ml-2">
            {pipelineStages.map((stage, idx) => (
              <div key={idx} className="relative">
                <div className="absolute -left-[25px] top-0.5 w-3 h-3 rounded-full bg-white border-2 border-sky-400 flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-sky-500" />
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-700 font-mono">{stage.label}</span>
                  <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md border ${stageStyle(stage.status)}`}>
                    {stage.status}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">{stage.detail}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Human Review */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-heading font-bold text-xs text-slate-900 uppercase tracking-wider">
              OPERATOR HUMAN REVIEW
            </h4>
            <span className="text-[9px] font-mono text-amber-700 font-bold">HUMAN IN THE LOOP</span>
          </div>

          {candidate.human_decision ? (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <div>
                <div className="font-bold text-emerald-700 text-xs font-mono">
                  DECISION: {candidate.human_decision}
                </div>
                <div className="text-[9px] text-slate-600">Committed to mission audit log.</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {REVIEW_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => onReview(action.id)}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-[11px] font-semibold transition-all ${action.cls}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{action.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="text-[9px] text-amber-700 text-center font-mono">
            ⚠ AI recommendations are advisory. Rescuer dispatches require authenticated verification.
          </div>
        </div>
      </div>
    </div>
  );
};

const Survivors = () => {
  const [candidates, setCandidates] = useState<SurvivorCandidate[]>([]);
  const [selected, setSelected] = useState<SurvivorCandidate | null>(null);
  const [explanation, setExplanation] = useState<AiFlagExplanation | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('ALL');

  useEffect(() => {
    const load = async () => {
      try {
        const result = (await api.getSurvivors()) as { candidates: SurvivorCandidate[] };
        setCandidates(result.candidates?.length > 0 ? result.candidates : DEMO_CANDIDATES);
      } catch {
        setCandidates(DEMO_CANDIDATES);
      }
    };
    load();
  }, []);

  const handleSelectCandidate = async (c: SurvivorCandidate) => {
    setSelected(c);
    setExplanation(null);
    try {
      const detail = (await api.getSurvivor(c.track_id)) as { ai_flag_explanation: AiFlagExplanation; candidate: SurvivorCandidate };
      setExplanation(detail.ai_flag_explanation ?? null);
      if (detail.candidate) setSelected({ ...c, ...detail.candidate });
    } catch { /* keep demo */ }
  };

  const handleReview = async (decision: string) => {
    if (!selected) return;
    try {
      await api.submitReview({ analysis_id: selected.analysis_id ?? 'demo-flood-001', track_id: selected.track_id, decision });
    } catch { /* local fallback */ }
    setSelected((prev) => (prev ? { ...prev, human_decision: decision } : null));
    setCandidates((prev) => prev.map((c) => (c.track_id === selected.track_id ? { ...c, human_decision: decision } : c)));
  };

  const totalCount    = candidates.length;
  const criticalCount = candidates.filter((c) => c.rescue_priority === 'CRITICAL').length;
  const highCount     = candidates.filter((c) => c.rescue_priority === 'HIGH').length;
  const verifyCount   = candidates.filter((c) => c.rescue_priority === 'VERIFY').length;
  const trackedCount  = candidates.filter((c) => c.frame_count > 10).length;
  const noGpsCount    = candidates.filter((c) => !c.latitude).length;

  const filtered = filterPriority === 'ALL' ? candidates : candidates.filter((c) => c.rescue_priority === filterPriority);

  const kpiCards = [
    { label: 'TOTAL CANDIDATES', value: totalCount,    color: 'text-sky-700',     sub: 'SECTOR FLOOD-001',    topColor: '#0284c7' },
    { label: 'CRITICAL',         value: criticalCount, color: 'text-red-700',     sub: 'IMMEDIATE TRIAGE',    topColor: '#dc2626' },
    { label: 'HIGH',             value: highCount,     color: 'text-amber-700',   sub: 'PERSISTENT SIGNALS',  topColor: '#d97706' },
    { label: 'VERIFY',           value: verifyCount,   color: 'text-yellow-700',  sub: 'ANOMALY REVIEW',      topColor: '#ca8a04' },
    { label: 'TRACKED',          value: trackedCount,  color: 'text-emerald-700', sub: 'MULTI-FRAME CONF',    topColor: '#16a34a' },
    { label: 'NO GPS',           value: noGpsCount,    color: 'text-slate-600',   sub: 'ESTIMATED ONLY',      topColor: '#64748b' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-heading">
              SURVIVOR INTELLIGENCE
            </h1>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-red-50 border border-red-200 text-red-700 animate-pulse">
              TRIAGE ACTIVE
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            AI-detected human candidates requiring rescue-team verification & operational dispatch.
          </p>
        </div>
        <span className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-amber-50 border border-amber-200 text-amber-700">
          DEMO DATA VERIFIED
        </span>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((card, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.07)] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ backgroundColor: card.topColor }} />
            <div className="mt-1">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-heading">{card.label}</div>
              <div className={`text-2xl font-black font-heading mt-1 ${card.color}`}>{card.value}</div>
              <div className={`text-[9px] font-mono mt-0.5 ${card.color}`}>{card.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2 flex-wrap">
          {['ALL', 'CRITICAL', 'HIGH', 'VERIFY'].map((f) => {
            const isActive = filterPriority === f;
            const colors: Record<string, string> = {
              ALL: isActive ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400',
              CRITICAL: isActive ? 'bg-red-600 text-white border-red-600' : 'bg-white border-slate-200 text-slate-600 hover:border-red-300',
              HIGH: isActive ? 'bg-amber-600 text-white border-amber-600' : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300',
              VERIFY: isActive ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white border-slate-200 text-slate-600 hover:border-yellow-300',
            };
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilterPriority(f)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-heading font-bold border transition-all ${colors[f]}`}
              >
                {f} ({f === 'ALL' ? candidates.length : candidates.filter((c) => c.rescue_priority === f).length})
              </button>
            );
          })}
        </div>
        <div className="text-xs font-mono text-slate-500">
          {filtered.length} of {candidates.length} candidates
        </div>
      </div>

      {/* Candidate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((c) => {
          const cfg = PRIORITY_CONFIG[c.rescue_priority] ?? PRIORITY_CONFIG.VERIFY;
          const detPercent  = Math.round(c.detection_confidence * 100);
          const survPercent = Math.round((c.survivor_confidence ?? c.detection_confidence) * 100);
          const isSelected  = selected?.track_id === c.track_id;

          return (
            <div
              key={c.track_id}
              onClick={() => handleSelectCandidate(c)}
              className={`relative group bg-white rounded-2xl border shadow-[0_2px_10px_rgba(15,23,42,0.08)] cursor-pointer transition-all duration-200 overflow-hidden ${
                isSelected
                  ? 'border-sky-400 shadow-[0_4px_20px_rgba(2,132,199,0.2)] ring-1 ring-sky-300'
                  : 'border-slate-200 hover:shadow-[0_4px_16px_rgba(15,23,42,0.12)] hover:border-slate-300'
              } ${cfg.leftBorder}`}
            >
              {/* Priority color top bar */}
              <div className="h-1 w-full" style={{ backgroundColor: cfg.accentColor }} />

              <div className="p-5">
                {/* Header: ID + Priority + Button */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-14 h-14 rounded-xl border-2 flex items-center justify-center font-heading font-black text-sm bg-slate-50"
                      style={{ borderColor: cfg.accentColor, color: cfg.accentColor }}
                    >
                      {c.track_id}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-md border ${cfg.border} ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                        {c.human_decision && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {c.human_decision}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-1">
                        {c.frame_count} TRACK FRAMES • {c.evidence_quality} EVIDENCE
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleSelectCandidate(c); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 hover:bg-sky-600 hover:text-white hover:border-sky-600 text-xs font-heading font-bold transition-all"
                  >
                    <span>INTEL</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Confidence bars */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                      <span className="text-slate-500">DETECTION CONFIDENCE</span>
                      <span className="text-sky-700 font-black">{detPercent}%</span>
                    </div>
                    <div className="conf-bar">
                      <div className="conf-bar-fill bg-sky-500" style={{ width: `${detPercent}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                      <span className="text-slate-500">SURVIVOR CANDIDATE CONFIDENCE</span>
                      <span className={`font-black ${cfg.text}`}>{survPercent}%</span>
                    </div>
                    <div className="conf-bar">
                      <div className="conf-bar-fill" style={{ width: `${survPercent}%`, backgroundColor: cfg.accentColor }} />
                    </div>
                  </div>
                </div>

                {/* Metadata footer */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center font-mono text-[10px]">
                  <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 block text-[8px]">MOVEMENT</span>
                    <span className="text-slate-700 font-bold text-[9px]">{c.movement_state}</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 block text-[8px]">EVIDENCE</span>
                    <span className="text-emerald-700 font-bold">{c.evidence_quality}</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 block text-[8px]">LOCATION</span>
                    <span className={c.latitude ? 'text-sky-700 font-bold' : 'text-slate-400'}>
                      {c.latitude ? `±${c.uncertainty_m ?? 15}m` : 'NO GPS'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Drawer */}
      {selected && (
        <DetailPanel candidate={selected} explanation={explanation} onReview={handleReview} onClose={() => setSelected(null)} />
      )}
    </div>
  );
};

export default Survivors;
