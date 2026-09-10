import type { FC } from 'react';
import { Eye, User, Flame, Radio } from 'lucide-react';

const RecentDetections: FC = () => {
  const demoEvents = [
    { time: '14:32:08', trackId: 'LX-017', type: 'PERSON CANDIDATE', confidence: '94%', movement: 'LOW MOVEMENT', evidence: 'RGB + MULTI-FRAME', priority: 'CRITICAL' },
    { time: '14:31:54', trackId: 'LX-023', type: 'PERSON CANDIDATE', confidence: '91%', movement: 'MOVING',       evidence: 'RGB + THERMAL',    priority: 'HIGH' },
    { time: '14:31:41', trackId: 'LX-031', type: 'PERSON CANDIDATE', confidence: '87%', movement: 'STATIONARY',   evidence: 'RGB + TRACK',      priority: 'HIGH' },
    { time: '14:31:19', trackId: 'LX-044', type: 'HEAT ANOMALY',     confidence: '71%', movement: 'UNKNOWN',      evidence: 'RGB ONLY',         priority: 'VERIFY' },
    { time: '14:30:57', trackId: 'AN-009', type: 'ANIMAL / DISMISSED', confidence: '83%', movement: 'RAPID RUN', evidence: 'RGB CLASSIFIER',   priority: 'FILTERED' },
  ];

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-50 border-red-200 text-red-700';
      case 'HIGH':     return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'VERIFY':   return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      default:         return 'bg-slate-100 border-slate-200 text-slate-500';
    }
  };

  const getLeftBorder = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'border-l-2 border-l-red-400';
      case 'HIGH':     return 'border-l-2 border-l-amber-400';
      case 'VERIFY':   return 'border-l-2 border-l-yellow-400';
      default:         return 'border-l-2 border-l-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-[0_4px_16px_rgba(15,23,42,0.10)] overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-600">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800 font-heading flex items-center gap-2">
              DETECTION LOG
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-700 font-mono">
                5 EVENTS
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">YOLOv8 INFERENCE STREAM</div>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-amber-50 border border-amber-200 text-amber-700">
          DEMO STREAM
        </span>
      </div>

      {/* Events */}
      <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
        {demoEvents.map((event) => (
          <div
            key={`${event.time}-${event.trackId}`}
            className={`px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-all text-xs ${getLeftBorder(event.priority)}`}
          >
            {/* Track ID + Time */}
            <div className="flex items-center gap-2.5 min-w-[110px]">
              <div className="p-1 rounded-md bg-slate-100 border border-slate-200">
                {event.priority === 'CRITICAL' ? (
                  <Flame className="w-3.5 h-3.5 text-red-500" />
                ) : (
                  <User className="w-3.5 h-3.5 text-sky-600" />
                )}
              </div>
              <div>
                <div className="font-mono font-black text-slate-800 text-[11px]">{event.trackId}</div>
                <div className="text-[9px] font-mono text-slate-400">{event.time}</div>
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0 hidden sm:block">
              <div className="font-medium text-slate-700 truncate text-[11px]">{event.type}</div>
              <div className="text-[9px] text-slate-400 font-mono truncate">{event.evidence}</div>
            </div>

            {/* Confidence + Movement */}
            <div className="text-right font-mono flex-shrink-0">
              <div className="text-[11px] font-black text-slate-800">{event.confidence}</div>
              <div className="text-[9px] text-sky-600">{event.movement}</div>
            </div>

            {/* Priority badge */}
            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border flex-shrink-0 ${getPriorityBadge(event.priority)}`}>
              {event.priority}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-500 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-emerald-600">
          <Radio className="w-3 h-3 animate-pulse" />
          <span>INFERENCE: 10 Hz</span>
        </div>
        <div>DEMO INFERENCE DATA</div>
      </div>
    </div>
  );
};

export default RecentDetections;