import { useState } from 'react';
import type { FC } from 'react';
import {
  Map as MapIcon,
  Navigation,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface SurvivorMarker {
  id: string;
  priority: 'CRITICAL' | 'HIGH' | 'VERIFY';
  confidence: number;
  movement: string;
  locationConf: string;
  x: number;
  y: number;
  uncertaintyRadius: number;
}

const IncidentMap: FC = () => {
  const [selectedSurvivor, setSelectedSurvivor] = useState<SurvivorMarker | null>(null);
  const [hoveredSurvivor, setHoveredSurvivor] = useState<SurvivorMarker | null>(null);
  const [showFloodExtent, setShowFloodExtent] = useState(true);

  const survivors: SurvivorMarker[] = [
    { id: 'LX-017', priority: 'CRITICAL', confidence: 94, movement: 'LOW MOVEMENT', locationConf: '±12m', x: 62, y: 38, uncertaintyRadius: 36 },
    { id: 'LX-023', priority: 'HIGH',     confidence: 87, movement: 'MOVING',       locationConf: '±18m', x: 44, y: 56, uncertaintyRadius: 42 },
    { id: 'LX-031', priority: 'HIGH',     confidence: 76, movement: 'STATIONARY',   locationConf: '±24m', x: 74, y: 68, uncertaintyRadius: 48 },
    { id: 'LX-044', priority: 'VERIFY',   confidence: 61, movement: 'UNKNOWN',      locationConf: '±35m', x: 28, y: 34, uncertaintyRadius: 54 },
  ];

  const flightPoints = [
    { x: 15, y: 78 }, { x: 25, y: 62 }, { x: 38, y: 55 },
    { x: 48, y: 45 }, { x: 58, y: 40 }, { x: 68, y: 48 },
    { x: 76, y: 35 }, { x: 88, y: 22 },
  ];

  const priorityColors: Record<'CRITICAL' | 'HIGH' | 'VERIFY', { border: string; bg: string; glow: string; label: string }> = {
    CRITICAL: { border: '#dc2626', bg: 'rgba(220,38,38,0.2)', glow: '0 0 14px rgba(220,38,38,0.75)', label: 'text-red-600' },
    HIGH:     { border: '#d97706', bg: 'rgba(217,119,6,0.2)',  glow: '0 0 14px rgba(217,119,6,0.75)',  label: 'text-amber-600' },
    VERIFY:   { border: '#ca8a04', bg: 'rgba(202,138,4,0.2)', glow: '0 0 14px rgba(202,138,4,0.75)', label: 'text-yellow-600' },
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-[0_4px_16px_rgba(15,23,42,0.10)] overflow-hidden flex flex-col h-full">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-600">
            <MapIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800 font-heading flex items-center gap-2">
              TACTICAL INCIDENT MAP
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 font-mono">
                FLOOD-001
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              13°04'21"N 80°16'42"E • SECTOR ALPHA
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFloodExtent(!showFloodExtent)}
            className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold border transition-all ${
              showFloodExtent
                ? 'bg-sky-50 border-sky-300 text-sky-700'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            FLOOD EXTENT
          </button>
          <div className="flex items-center gap-1 text-emerald-600 font-mono text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>GIS SYNCED</span>
          </div>
        </div>
      </div>

      {/* Map Viewport — daylight aerial look */}
      <div className="relative aspect-video w-full overflow-hidden select-none bg-[#b8ccd8]">
        {/* Aerial map SVG */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 500">
          <defs>
            <radialGradient id="mapBg" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#c8d8e8" />
              <stop offset="60%" stopColor="#b0c4d6" />
              <stop offset="100%" stopColor="#9ab4c8" />
            </radialGradient>
            <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(100,140,170,0.18)" strokeWidth="1" />
            </pattern>
          </defs>

          <rect width="800" height="500" fill="url(#mapBg)" />

          {/* Terrain blocks */}
          <rect x="80" y="60"  width="160" height="120" rx="4" fill="#8fac8a" opacity="0.75" stroke="#6b8c6b" strokeWidth="1.5" />
          <rect x="320" y="40" width="200" height="90"  rx="4" fill="#8fac8a" opacity="0.65" stroke="#6b8c6b" strokeWidth="1" />
          <rect x="560" y="80" width="140" height="160" rx="4" fill="#7a9e7a" opacity="0.6"  stroke="#6b8c6b" strokeWidth="1" />
          <rect x="150" y="280" width="120" height="80" rx="4" fill="#a0b89a" opacity="0.7" stroke="#7a9a7a" strokeWidth="1" />
          <rect x="480" y="320" width="160" height="100" rx="4" fill="#a0b89a" opacity="0.65" stroke="#7a9a7a" strokeWidth="1" />

          {/* Roads */}
          <path d="M 0,250 Q 200,220 400,260 T 800,230" fill="none" stroke="#c8b97a" strokeWidth="5" opacity="0.8" />
          <path d="M 400,0 L 400,500" fill="none" stroke="#c8b97a" strokeWidth="4" opacity="0.5" />

          {/* Flood inundation overlay */}
          {showFloodExtent && (
            <path
              d="M 180,500 L 220,380 Q 350,340 460,390 T 700,320 L 780,260 L 800,500 Z"
              fill="rgba(56,189,248,0.22)"
              stroke="rgba(14,165,233,0.5)"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
          )}

          {/* Search sector outline */}
          <polygon
            points="140,80 680,60 740,430 180,450"
            fill="none"
            stroke="rgba(2,132,199,0.3)"
            strokeWidth="2"
            strokeDasharray="8 6"
          />

          {/* Grid overlay */}
          <rect width="800" height="500" fill="url(#mapGrid)" />

          {/* Flight path */}
          <polyline
            points={flightPoints.map((p) => `${(p.x * 800) / 100},${(p.y * 500) / 100}`).join(' ')}
            fill="none"
            stroke="#0284c7"
            strokeWidth="2.5"
            strokeDasharray="8 5"
            strokeLinecap="round"
            opacity="0.85"
          />
        </svg>

        {/* Sector tag */}
        <div className="absolute top-3 left-3 bg-white/85 backdrop-blur-sm border border-sky-200 rounded-md px-2 py-1 text-[9px] font-mono text-slate-600">
          <span className="text-sky-700 font-bold">SECTOR ALPHA</span> • PRIORITY COVERAGE
        </div>

        {/* Zoom controls */}
        <div className="absolute top-3 right-3 flex flex-col gap-1 z-20">
          <button
            type="button"
            className="p-1.5 rounded-md bg-white/85 border border-slate-300 text-slate-600 hover:text-sky-700 hover:border-sky-300 hover:bg-white transition-all"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="p-1.5 rounded-md bg-white/85 border border-slate-300 text-slate-600 hover:text-sky-700 hover:border-sky-300 hover:bg-white transition-all"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* UAV Marker */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
          style={{ left: '50%', top: '44%' }}
        >
          <div className="relative flex items-center justify-center">
            <div
              className="absolute w-20 h-20 bg-gradient-to-t from-transparent via-sky-400/20 to-transparent rounded-full transform rotate-[127deg]"
              style={{ clipPath: 'polygon(50% 50%, 20% 0%, 80% 0%)' }}
            />
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-sky-600 border-2 border-white shadow-[0_0_14px_rgba(2,132,199,0.7)]">
              <Navigation className="w-4 h-4 text-white transform rotate-[127deg]" />
            </div>
            <div className="absolute top-full mt-1 whitespace-nowrap bg-white/90 border border-sky-200 px-1.5 py-0.5 rounded text-[8px] font-mono text-sky-700 font-bold shadow-sm">
              UAV-01 • 82m
            </div>
          </div>
        </div>

        {/* Survivor Markers */}
        {survivors.map((survivor) => {
          const cfg = priorityColors[survivor.priority];
          const isSelected = selectedSurvivor?.id === survivor.id;
          return (
            <div
              key={survivor.id}
              className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group transition-transform duration-200 ${isSelected ? 'scale-125 z-30' : ''}`}
              style={{ left: `${survivor.x}%`, top: `${survivor.y}%` }}
              onClick={() => setSelectedSurvivor(survivor)}
              onMouseEnter={() => setHoveredSurvivor(survivor)}
              onMouseLeave={() => setHoveredSurvivor(null)}
            >
              {/* Uncertainty radius */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 rounded-full border border-dashed pointer-events-none"
                style={{
                  width: `${survivor.uncertaintyRadius}px`,
                  height: `${survivor.uncertaintyRadius}px`,
                  borderColor: cfg.border,
                  backgroundColor: cfg.bg,
                }}
              />

              {/* Pin */}
              <div
                className="relative flex items-center justify-center w-7 h-7 rounded-full border-2 transition-transform group-hover:scale-125"
                style={{ borderColor: cfg.border, backgroundColor: 'white', boxShadow: cfg.glow }}
              >
                <span className="text-[9px] font-black font-mono" style={{ color: cfg.border }}>
                  {survivor.id.replace('LX-', '')}
                </span>
                {survivor.priority === 'CRITICAL' && (
                  <span className="absolute inset-0 rounded-full border border-red-500 animate-ping pointer-events-none" />
                )}
              </div>

              {/* ID label */}
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 rounded-md bg-white/90 border text-[8px] font-mono font-bold whitespace-nowrap shadow-md"
                style={{ borderColor: cfg.border, color: cfg.border }}
              >
                {survivor.id} • {survivor.confidence}%
              </div>
            </div>
          );
        })}

        {/* Hover/selection info card */}
        {(hoveredSurvivor || selectedSurvivor) && (
          <div className="absolute bottom-3 right-3 z-30 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl p-3 text-[10px] font-mono text-slate-700 shadow-lg max-w-xs animate-fade-in-up">
            {(() => {
              const s = hoveredSurvivor || selectedSurvivor!;
              const cfg = priorityColors[s.priority];
              return (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="font-black text-slate-900 font-heading text-xs">{s.id}</span>
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold border" style={{ backgroundColor: cfg.bg, borderColor: cfg.border, color: cfg.border }}>
                      {s.priority}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px]">
                    <span className="text-slate-500">SURVIVOR CONF:</span>
                    <span className="text-slate-800 font-bold">{s.confidence}%</span>
                    <span className="text-slate-500">MOVEMENT:</span>
                    <span className="text-sky-700">{s.movement}</span>
                    <span className="text-slate-500">GEO PRECISION:</span>
                    <span className="text-emerald-700">{s.locationConf}</span>
                  </div>
                  <div className="pt-1 text-[8px] text-slate-400 italic">
                    Click marker to inspect evidence chain
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-white/85 backdrop-blur-sm border border-slate-200 rounded-lg p-2 text-[9px] font-mono text-slate-600 space-y-1">
          <div className="text-[8px] font-bold uppercase text-slate-400">PRIORITY MARKERS</div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> CRITICAL</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> HIGH</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> VERIFY</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-500 flex-shrink-0">
        <div>FLIGHT PATH: <strong className="text-sky-700">CORRIDOR-A ACTIVE</strong></div>
        <div>COVERAGE: <strong className="text-emerald-700">68% MAPPED</strong></div>
        <div className="text-amber-600 font-semibold">HUMAN REVIEW MANDATORY</div>
      </div>
    </div>
  );
};

export default IncidentMap;