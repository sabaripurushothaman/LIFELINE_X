import type { FC } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Video,
  BarChart3,
  Users,
  GitMerge,
  Map as MapIcon,
  Crosshair,
  Award,
  Activity,
  Radio,
  Shield,
  X,
  Flame,
  Waves,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const navLinks = [
    { to: '/', label: 'COMMAND CENTER', icon: LayoutDashboard, badge: 'LIVE' },
    { to: '/camera', label: 'LIVE CAMERA', icon: Video },
    { to: '/analysis', label: 'ANALYSIS', icon: BarChart3 },
    { to: '/survivors', label: 'SURVIVORS', icon: Users, alertCount: 4 },
    { to: '/evidence', label: 'EVIDENCE CHAIN', icon: GitMerge },
    { to: '/map', label: 'MAP', icon: MapIcon },
    { to: '/coverage', label: 'SEARCH COVERAGE', icon: Crosshair },
    { to: '/evaluation', label: 'EVALUATION', icon: Award },
    { to: '/system', label: 'SYSTEM HEALTH', icon: Activity },
  ];

  return (
    <>
      {/* Backdrop for mobile drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0f2a4a] text-slate-100 flex flex-col min-w-0 transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-[4px_0_24px_rgba(15,23,42,0.25)] ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
      >
        {/* Top accent stripe */}
        <div className="h-1 w-full bg-linear-to-r from-sky-400 via-cyan-400 to-sky-500 shrink-0" />

        {/* Brand Header */}
        <div className="px-4 py-4 shrink-0 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Logo Icon */}
              <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/40">
                <Shield className="w-5 h-5 text-sky-300" />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-[#0f2a4a] animate-pulse" />
              </div>

              <div>
                <div className="text-xl font-black tracking-tight text-white font-heading leading-none">
                  LIFELINE<span className="text-sky-400">-X</span>
                </div>
                <div className="text-[9px] font-bold text-sky-400/80 tracking-[0.15em] uppercase mt-0.5">
                  Disaster Intelligence
                </div>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 lg:hidden transition-colors"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Incident Badge */}
          <div className="mt-3 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px]">
            <div className="flex items-center gap-1.5 text-slate-300 font-mono">
              <Flame className="w-3 h-3 text-amber-400" />
              <span>INCIDENT: <strong className="text-white">FLOOD-001</strong></span>
            </div>
            <div className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold tracking-wider">ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav
          className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5"
          aria-label="Main tactical navigation"
        >
          <div className="text-[9px] font-bold tracking-[0.12em] text-slate-500 px-3 pb-2 uppercase">
            Operations
          </div>
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onClose}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `group flex items-center px-3 py-2.5 text-[11px] font-semibold rounded-lg transition-all duration-150 ${isActive
                    ? 'bg-sky-500/20 text-white border border-sky-400/30 shadow-[inset_0_0_8px_rgba(14,165,233,0.1)]'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/8'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 shrink-0 mr-3 transition-all ${isActive ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'
                        }`}
                      aria-hidden="true"
                    />
                    <span className="tracking-wider flex-1">{link.label}</span>

                    {link.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-sky-500/25 text-sky-300 border border-sky-400/30 animate-pulse">
                        {link.badge}
                      </span>
                    )}

                    {link.alertCount && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-400/30">
                        {link.alertCount}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Mission Footer */}
        <div className="p-3 shrink-0 border-t border-white/10">
          <div className="rounded-xl bg-white/5 border border-white/8 p-3 space-y-2">
            {/* Disaster identity icons */}
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-sky-400">
              <Waves className="w-3.5 h-3.5" />
              <span>FLOOD RESPONSE OPS</span>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] font-mono border-t border-white/8 pt-2">
              <div>
                <div className="text-slate-500 text-[9px]">MODE</div>
                <div className="text-slate-200 font-bold">REPLAY</div>
              </div>
              <div>
                <div className="text-slate-500 text-[9px]">UAV</div>
                <div className="text-sky-300 font-bold">UAV-01</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/8 text-[9px] font-mono">
              <div className="flex items-center gap-1 text-emerald-400">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>SYNCED</span>
              </div>
              <span className="text-amber-400 font-bold">DEMO MODE</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;