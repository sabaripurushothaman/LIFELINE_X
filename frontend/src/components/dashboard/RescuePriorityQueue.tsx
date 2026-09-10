import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Flame,
  Activity,
  MapPin,
  Clock,
  ArrowRight,
  Eye,
  ShieldCheck,
} from 'lucide-react';

interface PriorityRecord {
  id: string;
  priority: 'CRITICAL' | 'HIGH' | 'VERIFY';
  survivorConfidence: number;
  detectionConfidence: number;
  movement: 'LOW MOVEMENT' | 'MOVING' | 'STATIONARY' | 'UNKNOWN';
  evidenceQuality: 'HIGH' | 'MEDIUM' | 'LOW';
  locationConfidence: string;
  ageFreshness: string;
  status: string;
  evidenceSummary: string;
}

const RescuePriorityQueue: FC = () => {
  const navigate = useNavigate();

  const records: PriorityRecord[] = [
    { id: 'LX-017', priority: 'CRITICAL', survivorConfidence: 96, detectionConfidence: 94, movement: 'LOW MOVEMENT', evidenceQuality: 'HIGH', locationConfidence: '±12m (GPS SYNC)', ageFreshness: '12 sec', status: 'HUMAN REVIEW REQUIRED', evidenceSummary: '6/6 SIGNALS' },
    { id: 'LX-023', priority: 'HIGH',     survivorConfidence: 88, detectionConfidence: 91, movement: 'MOVING',       evidenceQuality: 'HIGH', locationConfidence: '±18m (GPS SYNC)', ageFreshness: '21 sec', status: 'HUMAN REVIEW REQUIRED', evidenceSummary: '6/6 SIGNALS' },
    { id: 'LX-031', priority: 'HIGH',     survivorConfidence: 81, detectionConfidence: 87, movement: 'STATIONARY',   evidenceQuality: 'MEDIUM', locationConfidence: '±24m (ESTIMATED)', ageFreshness: '38 sec', status: 'HUMAN REVIEW REQUIRED', evidenceSummary: '5/6 SIGNALS' },
    { id: 'LX-044', priority: 'VERIFY',   survivorConfidence: 63, detectionConfidence: 71, movement: 'UNKNOWN',      evidenceQuality: 'LOW', locationConfidence: '±35m (APPROX)', ageFreshness: '64 sec', status: 'HUMAN REVIEW REQUIRED', evidenceSummary: '3/6 SIGNALS' },
  ];

  const priorityConfig = {
    CRITICAL: {
      color: '#dc2626',
      badgeClass: 'bg-red-50 border-red-300 text-red-700',
      barColor: '#dc2626',
      rowHover: 'hover:bg-red-50/40',
      leftBorder: 'border-l-4 border-l-red-500',
    },
    HIGH: {
      color: '#d97706',
      badgeClass: 'bg-amber-50 border-amber-300 text-amber-700',
      barColor: '#d97706',
      rowHover: 'hover:bg-amber-50/40',
      leftBorder: 'border-l-4 border-l-amber-500',
    },
    VERIFY: {
      color: '#ca8a04',
      badgeClass: 'bg-yellow-50 border-yellow-300 text-yellow-700',
      barColor: '#ca8a04',
      rowHover: 'hover:bg-yellow-50/30',
      leftBorder: 'border-l-4 border-l-yellow-500',
    },
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-[0_4px_16px_rgba(15,23,42,0.10)] overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3.5 border-b border-slate-100 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-600">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
              RESCUE PRIORITY QUEUE
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-50 border border-red-200 text-red-700 font-mono">
                TRIAGE ADVISORY
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Ranked candidates requiring human dispatch review & verification
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-amber-50 border border-amber-200 text-amber-700">
            DEMO DATA
          </span>
          <button
            type="button"
            onClick={() => navigate('/survivors')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 text-xs font-semibold transition-all shadow-sm"
          >
            <span>FULL SURVIVORS UI</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Queue Items */}
      <div className="divide-y divide-slate-100">
        {records.map((record) => {
          const cfg = priorityConfig[record.priority];
          return (
            <div
              key={record.id}
              onClick={() => navigate('/survivors')}
              className={`p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer transition-all duration-150 ${cfg.rowHover} ${cfg.leftBorder}`}
            >
              {/* Left: ID + Priority */}
              <div className="flex items-center gap-3 min-w-[180px]">
                <div
                  className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-50 border-2 font-heading font-black text-sm text-slate-800 flex-shrink-0"
                  style={{ borderColor: cfg.color }}
                >
                  {record.id}
                </div>
                <div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border font-mono ${cfg.badgeClass}`}
                  >
                    {record.priority}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{record.ageFreshness} ago</span>
                  </div>
                </div>
              </div>

              {/* Middle: Confidence bars */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1 max-w-xl">
                {/* Survivor Confidence */}
                <div>
                  <div className="flex items-center justify-between text-[10px] mb-1.5 font-mono">
                    <span className="text-slate-500">SURVIVOR CONF.</span>
                    <span className="font-black text-slate-800">{record.survivorConfidence}%</span>
                  </div>
                  <div className="conf-bar">
                    <div
                      className="conf-bar-fill"
                      style={{ width: `${record.survivorConfidence}%`, backgroundColor: cfg.barColor }}
                    />
                  </div>
                </div>

                {/* Detection Confidence */}
                <div>
                  <div className="flex items-center justify-between text-[10px] mb-1.5 font-mono">
                    <span className="text-slate-500">DETECTION CONF.</span>
                    <span className="font-black text-sky-700">{record.detectionConfidence}%</span>
                  </div>
                  <div className="conf-bar">
                    <div
                      className="conf-bar-fill bg-sky-500"
                      style={{ width: `${record.detectionConfidence}%` }}
                    />
                  </div>
                </div>

                {/* Movement */}
                <div className="hidden sm:block">
                  <div className="text-[10px] text-slate-500 mb-1.5 font-mono">MOVEMENT</div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Activity className="w-3.5 h-3.5 text-sky-600" />
                    <span>{record.movement}</span>
                  </div>
                </div>
              </div>

              {/* Right: Location + Evidence + Action */}
              <div className="flex items-center gap-4 text-xs flex-shrink-0">
                <div className="font-mono text-[10px]">
                  <div className="text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    <span>LOCATION</span>
                  </div>
                  <div className="text-slate-700 font-semibold">{record.locationConfidence}</div>
                </div>

                <div className="font-mono text-[10px] hidden md:block">
                  <div className="text-slate-500 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-sky-600" />
                    <span>EVIDENCE</span>
                  </div>
                  <div className="text-sky-700 font-semibold">{record.evidenceSummary}</div>
                </div>

                <button
                  type="button"
                  className="p-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-600 hover:bg-sky-100 hover:scale-105 transition-all shadow-sm"
                  aria-label="Inspect candidate details"
                  onClick={(e) => { e.stopPropagation(); navigate('/survivors'); }}
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-100 flex flex-wrap items-center justify-between text-[10px] font-mono text-amber-700 gap-2">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>AI ranking is advisory only. Human verification required before rescue dispatch.</span>
        </div>
        <div className="text-amber-600 font-semibold">MULTI-CRITERIA TRIAGE SCORER v2.4</div>
      </div>
    </div>
  );
};

export default RescuePriorityQueue;