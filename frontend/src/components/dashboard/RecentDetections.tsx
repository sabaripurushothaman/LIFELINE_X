import type { FC } from 'react';
import { Eye, User, Flame, Radio, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { SurvivorCandidate } from '../../types';

interface RecentDetectionsProps {
  candidates?: SurvivorCandidate[];
  isReal?: boolean;
  sessionName?: string;
  hasAnalyzed?: boolean;
}

const RecentDetections: FC<RecentDetectionsProps> = ({
  candidates = [],
  isReal = false,
  sessionName = '',
  hasAnalyzed = false,
}) => {
  const demoEvents = [
    { time: '14:32:08', trackId: 'LX-017', type: 'PERSON CANDIDATE', confidence: '94%', movement: 'LOW MOVEMENT', evidence: 'RGB + MULTI-FRAME', priority: 'CRITICAL' },
    { time: '14:31:54', trackId: 'LX-023', type: 'PERSON CANDIDATE', confidence: '91%', movement: 'MOVING',       evidence: 'RGB + THERMAL',    priority: 'HIGH' },
    { time: '14:31:41', trackId: 'LX-031', type: 'PERSON CANDIDATE', confidence: '87%', movement: 'STATIONARY',   evidence: 'RGB + TRACK',      priority: 'HIGH' },
    { time: '14:31:19', trackId: 'LX-044', type: 'HEAT ANOMALY',     confidence: '71%', movement: 'UNKNOWN',      evidence: 'RGB ONLY',         priority: 'VERIFY' },
    { time: '14:30:57', trackId: 'AN-009', type: 'ANIMAL / DISMISSED', confidence: '83%', movement: 'RAPID RUN', evidence: 'RGB CLASSIFIER',   priority: 'FILTERED' },
  ];

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-50 border-red-300 text-red-700 font-black';
      case 'HIGH':     return 'bg-amber-50 border-amber-300 text-amber-800 font-bold';
      case 'VERIFY':   return 'bg-yellow-50 border-yellow-300 text-yellow-800 font-bold';
      default:         return 'bg-slate-100 border-slate-200 text-slate-500 font-medium';
    }
  };

  const getLeftBorder = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'border-l-4 border-l-red-500';
      case 'HIGH':     return 'border-l-4 border-l-amber-500';
      case 'VERIFY':   return 'border-l-4 border-l-yellow-400';
      default:         return 'border-l-4 border-l-slate-300';
    }
  };

  // Convert real candidates to event items
  const realEvents = candidates.map((c, idx) => {
    const d = c.created_at ? new Date(c.created_at) : new Date(Date.now() - idx * 14000);
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    return {
      time: timeStr,
      trackId: c.track_id,
      type: 'PERSON CANDIDATE',
      confidence: `${Math.round(c.detection_confidence * 100)}%`,
      movement: c.movement_state || 'UNKNOWN',
      evidence: c.latitude
        ? `RGB + TELEM (±${c.uncertainty_m ?? 15}m)`
        : 'RGB OPTICAL (NO GPS)',
      priority: c.rescue_priority,
    };
  });

  const displayEvents = isReal ? realEvents : demoEvents;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_16px_rgba(15,23,42,0.06)] overflow-hidden flex flex-col h-full font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-600">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm sm:text-base font-bold text-slate-900 font-heading flex items-center gap-2">
              {isReal ? 'REAL-TIME DETECTION LOG' : 'DEMO DETECTION LOG'}
              <span className="text-xs px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-700 font-mono font-bold">
                {displayEvents.length} EVENTS
              </span>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              {isReal
                ? `ACTIVE SESSION: ${sessionName || 'CURRENT VIDEO'}`
                : 'DEMO INFERENCE PIPELINE (FLOOD-001)'}
            </div>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-lg text-xs font-bold font-mono border ${
            isReal
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-amber-50 border-amber-200 text-amber-700'
          }`}
        >
          {isReal ? 'ACTUAL INFERENCE' : 'DEMO REPLAY'}
        </span>
      </div>

      {/* Events List or Empty State */}
      {isReal && hasAnalyzed && displayEvents.length === 0 ? (
        <div className="p-8 text-center space-y-2 my-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
          <div className="text-sm font-bold text-slate-800">NO HUMAN CANDIDATES DETECTED</div>
          <p className="text-xs text-slate-500">
            Pipeline analyzed all sampled frames in &quot;{sessionName}&quot;. Zero person candidates met detection threshold.
          </p>
        </div>
      ) : isReal && !hasAnalyzed ? (
        <div className="p-8 text-center space-y-2 my-auto">
          <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="text-sm font-bold text-slate-700">WAITING FOR ANALYSIS</div>
          <p className="text-xs text-slate-500">
            Upload and analyze a recorded video in Analysis to stream real detection events.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
          {displayEvents.map((event) => (
            <div
              key={`${event.time}-${event.trackId}`}
              className={`px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-all text-sm ${getLeftBorder(
                event.priority
              )}`}
            >
              {/* Track ID + Time */}
              <div className="flex items-center gap-3 min-w-[130px]">
                <div className="p-1.5 rounded-lg bg-slate-100 border border-slate-200">
                  {event.priority === 'CRITICAL' ? (
                    <Flame className="w-4 h-4 text-red-500" />
                  ) : (
                    <User className="w-4 h-4 text-sky-600" />
                  )}
                </div>
                <div>
                  <div className="font-mono font-black text-slate-900 text-xs sm:text-sm">
                    {event.trackId}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">{event.time}</div>
                </div>
              </div>

              {/* Classification & Evidence */}
              <div className="flex-1 min-w-0 hidden sm:block">
                <div className="font-bold text-slate-800 truncate text-xs sm:text-sm">
                  {event.type}
                </div>
                <div className="text-xs text-slate-500 font-mono truncate mt-0.5">
                  {event.evidence}
                </div>
              </div>

              {/* Confidence + Movement */}
              <div className="text-right font-mono flex-shrink-0">
                <div className="text-xs sm:text-sm font-black text-slate-900">
                  {event.confidence} CONF
                </div>
                <div className="text-xs font-semibold text-sky-700">{event.movement}</div>
              </div>

              {/* Priority Badge */}
              <span
                className={`text-xs font-mono px-2.5 py-1 rounded-lg border flex-shrink-0 ${getPriorityBadge(
                  event.priority
                )}`}
              >
                {event.priority}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-500 flex-shrink-0">
        <div className="flex items-center gap-2 text-emerald-700 font-semibold">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>INFERENCE RATE: 10 Hz</span>
        </div>
        <div>{isReal ? 'REAL VIDEO STREAM' : 'DEMO REPLAY STREAM'}</div>
      </div>
    </div>
  );
};

export default RecentDetections;