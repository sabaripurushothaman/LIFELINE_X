import { useState, useRef, useEffect } from 'react';
import type { FC } from 'react';
import {
  Bell,
  Menu,
  Flame,
  Radio,
  UserCircle,
  X,
  CheckCircle,
  Info,
  Wifi,
  WifiOff,
  ChevronDown,
  Shield,
} from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  incidentId?: string;
  systemOnline?: boolean;
  statusLoading?: boolean;
  onToggleSidebar?: () => void;
}

const Header: FC<HeaderProps> = ({
  title = 'COMMAND CENTER',
  subtitle = 'AI Disaster Search Intelligence & Survivor Triage',
  incidentId = 'FLOOD-001',
  systemOnline = false,
  statusLoading = true,
  onToggleSidebar,
}) => {
  const [notifOpen, setNotifOpen] = useState(false);
  const [operatorOpen, setOperatorOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const operatorRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (operatorRef.current && !operatorRef.current.contains(e.target as Node)) setOperatorOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const StatusDot = () => {
    if (statusLoading) {
      return <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />;
    }
    return (
      <span
        className={`w-2 h-2 rounded-full ${
          systemOnline
            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse'
            : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
        }`}
      />
    );
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-3 shadow-[0_1px_8px_rgba(15,23,42,0.08)]">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-800 hover:border-sky-400 hover:bg-sky-50 transition-all lg:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-slate-900 font-extrabold text-base sm:text-lg tracking-tight font-heading truncate">
              {title}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-sky-50 border border-sky-200 text-sky-700">
              <Shield className="w-2.5 h-2.5" />
              LIFELINE-X
            </span>
          </div>
          {subtitle && (
            <p className="text-slate-500 text-xs truncate max-w-md hidden md:block">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right: Badges & Controls */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 text-xs">
        {/* Incident Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-700">
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[10px] font-mono font-bold">{incidentId}</span>
        </div>

        {/* Replay Mode Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-50 border border-sky-200 text-sky-700 text-[10px] font-mono">
          <Radio className="w-3 h-3 text-sky-500 animate-pulse" />
          <span>RECORDED REPLAY</span>
        </div>

        {/* Backend Status */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-mono font-bold transition-all ${
          statusLoading
            ? 'bg-amber-50 border-amber-200 text-amber-700'
            : systemOnline
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <StatusDot />
          <span className="hidden sm:inline">
            {statusLoading ? 'CHECKING…' : systemOnline
              ? 'BACKEND ONLINE'
              : 'BACKEND OFFLINE'
            }
          </span>
          {systemOnline ? (
            <Wifi className="w-3 h-3 sm:hidden" />
          ) : (
            <WifiOff className="w-3 h-3 sm:hidden" />
          )}
        </div>

        {/* Demo Badge */}
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-50 border border-amber-300 text-amber-700">
          DEMO
        </span>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            id="notif-btn"
            type="button"
            onClick={() => { setNotifOpen((p) => !p); setOperatorOpen(false); }}
            className={`p-1.5 rounded-lg border transition-all ${
              notifOpen
                ? 'border-sky-400 bg-sky-50 text-sky-600'
                : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600'
            }`}
            aria-label="Notifications"
            aria-expanded={notifOpen}
            aria-haspopup="true"
          >
            <Bell className="w-4 h-4" />
          </button>

          {notifOpen && (
            <div
              id="notif-panel"
              className="dropdown-panel animate-slide-down absolute right-0 top-full mt-2 w-80 z-50"
              role="dialog"
              aria-label="Notification panel"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-slate-400" />
                  <span className="font-bold text-sm text-slate-800 font-heading">Notifications</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  aria-label="Close notifications"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-4 space-y-2">
                {/* System Info Item */}
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-sky-50 border border-sky-100">
                  <div className="p-1 rounded-md bg-sky-100 mt-0.5">
                    <Info className="w-3.5 h-3.5 text-sky-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800">DEMO MODE ACTIVE</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      Showing pre-recorded flood scenario data. Upload a video in Analysis to run live inference.
                    </div>
                  </div>
                </div>

                {/* Empty State */}
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="p-3 rounded-full bg-slate-100 mb-3">
                    <CheckCircle className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="text-sm font-semibold text-slate-600">No active alerts</div>
                  <div className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                    Emergency alerts from the AI pipeline will appear here during live operations.
                  </div>
                </div>
              </div>

              <div className="px-4 py-2.5 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
                NOTIFICATION SYSTEM • LIFELINE-X v2.4
              </div>
            </div>
          )}
        </div>

        {/* Operator Button */}
        <div className="hidden sm:block relative" ref={operatorRef}>
          <button
            id="operator-btn"
            type="button"
            onClick={() => { setOperatorOpen((p) => !p); setNotifOpen(false); }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold transition-all ${
              operatorOpen
                ? 'border-sky-400 bg-sky-50 text-sky-700'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700'
            }`}
            aria-label="Operator menu"
            aria-expanded={operatorOpen}
            aria-haspopup="true"
          >
            <UserCircle className="w-3.5 h-3.5" />
            <span>OPS-01</span>
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${operatorOpen ? 'rotate-180' : ''}`} />
          </button>

          {operatorOpen && (
            <div
              id="operator-panel"
              className="dropdown-panel animate-slide-down absolute right-0 top-full mt-2 w-64 z-50"
              role="dialog"
              aria-label="Operator status panel"
            >
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center">
                  <UserCircle className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800">Dispatch Operator</div>
                  <div className="text-[10px] text-slate-500 font-mono">OPS-01 • DISPATCH-1</div>
                </div>
              </div>

              <div className="p-3 space-y-1">
                <div className="flex items-center justify-between px-2 py-1.5 rounded text-xs">
                  <span className="text-slate-500">Session</span>
                  <span className="font-mono font-semibold text-slate-700">DEMO MODE</span>
                </div>
                <div className="flex items-center justify-between px-2 py-1.5 rounded text-xs">
                  <span className="text-slate-500">Incident</span>
                  <span className="font-mono font-semibold text-amber-700">FLOOD-001</span>
                </div>
                <div className="flex items-center justify-between px-2 py-1.5 rounded text-xs">
                  <span className="text-slate-500">Platform</span>
                  <span className="font-mono font-semibold text-slate-700">LIFELINE-X v2.4</span>
                </div>
                <div className="flex items-center justify-between px-2 py-1.5 rounded text-xs">
                  <span className="text-slate-500">Backend</span>
                  <span className={`font-mono font-semibold ${systemOnline ? 'text-emerald-600' : 'text-red-600'}`}>
                    {statusLoading ? 'CHECKING…' : systemOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
              </div>

              <div className="px-3 pb-3">
                <div className="px-2 py-2 rounded-lg bg-amber-50 border border-amber-100 text-[10px] text-amber-700 font-mono">
                  ⚠ DEMO SESSION — AI detections are advisory only. Human verification required before any rescue dispatch.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;