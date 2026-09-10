import { useState } from 'react';
import {
  Crosshair,
  AlertTriangle,
  Clock,
  Navigation,
} from 'lucide-react';

const Coverage = () => {
  const [activeLayer, setActiveLayer] = useState<'ALL' | 'SEARCHED' | 'PARTIAL' | 'GAPS'>('ALL');

  // Flight path points across the search area
  const flightPath = [
    { x: 12, y: 82 },
    { x: 22, y: 64 },
    { x: 34, y: 52 },
    { x: 46, y: 44 },
    { x: 58, y: 38 },
    { x: 70, y: 46 },
    { x: 82, y: 32 },
    { x: 92, y: 18 },
  ];

  const coverageStats = [
    {
      label: 'SEARCHED',
      percentage: '42%',
      area: '1.8 km²',
      color: '#10b981',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      status: 'HIGH CONFIDENCE OVERLAP',
    },
    {
      label: 'PARTIALLY SEARCHED',
      percentage: '26%',
      area: '1.1 km²',
      color: '#f59e0b',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      status: 'SINGLE-PASS ONLY',
    },
    {
      label: 'INSUFFICIENTLY SEARCHED',
      percentage: '32%',
      area: '1.4 km²',
      color: '#ef4444',
      bg: 'bg-red-50',
      border: 'border-red-200',
      status: 'CRITICAL SEARCH GAPS',
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-heading">
              SEARCH COVERAGE INTELLIGENCE
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
              68% TOTAL MAPPED
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            UAV sensor swath coverage analysis, blind spot detection, and priority search gap identification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-slate-100 text-slate-400 border border-slate-200">
            RECORDED FLIGHT PASS 1
          </span>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {coverageStats.map((stat) => (
          <div
            key={stat.label}
            className={`p-4 rounded-xl bg-white/90 backdrop-blur-xl border ${stat.border} shadow-[0_4px_16px_rgba(15,23,42,0.10)]`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400">
                {stat.label}
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-500">
                {stat.area}
              </span>
            </div>
            <div className="text-3xl font-black font-heading tracking-tight" style={{ color: stat.color }}>
              {stat.percentage}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-1 pt-1.5 border-t border-[rgba(30,58,95,0.4)]">
              {stat.status}
            </div>
          </div>
        ))}
      </div>

      {/* Main Tactical Map-Based Coverage View */}
      <div className="bg-white border border-slate-200 shadow-[0_4px_16px_rgba(15,23,42,0.10)] rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.10)]">
        {/* Map Header Controls */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-700">
              <Crosshair className="w-4 h-4" />
            </div>
            <span className="font-heading font-bold text-sm text-slate-900">
              HEATMAP &amp; SWATH COVERAGE CORRIDORS
            </span>
          </div>

          {/* Layer Filter Buttons */}
          <div className="flex items-center gap-1.5">
            {(['ALL', 'SEARCHED', 'PARTIAL', 'GAPS'] as const).map((layer) => (
              <button
                key={layer}
                type="button"
                onClick={() => setActiveLayer(layer)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                  activeLayer === layer
                    ? 'bg-sky-500 text-[#020817] border-[#06b6d4] shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                    : 'bg-white text-slate-400 border-slate-200 hover:text-slate-800'
                }`}
              >
                {layer}
              </button>
            ))}
          </div>
        </div>

        {/* Map Viewport */}
        <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full bg-[#020917] overflow-hidden select-none">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 500">
            <defs>
              {/* Pattern for Searched grid */}
              <pattern id="searchedGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                <rect width="30" height="30" fill="none" stroke="rgba(16,185,129,0.18)" strokeWidth="1" />
                <circle cx="15" cy="15" r="1.5" fill="rgba(16,185,129,0.3)" />
              </pattern>
              {/* Pattern for Partial grid */}
              <pattern id="partialGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 0,30 L 30,0" fill="none" stroke="rgba(245,158,11,0.22)" strokeWidth="1.5" />
              </pattern>
              {/* Pattern for Unsearched Gap grid */}
              <pattern id="gapGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="none" stroke="rgba(239,68,68,0.2)" strokeWidth="1" />
                <path d="M 0,0 L 20,20 M 20,0 L 0,20" stroke="rgba(239,68,68,0.15)" strokeWidth="0.8" />
              </pattern>
            </defs>

            {/* Background Grid */}
            <rect width="1000" height="500" fill="#030c1e" />

            {/* SECTOR 1: SEARCHED (Corridor under flight path) */}
            {(activeLayer === 'ALL' || activeLayer === 'SEARCHED') && (
              <polygon
                points="100,500 180,360 400,240 600,180 820,120 950,50 1000,120 720,280 500,380 320,500"
                fill="url(#searchedGrid)"
                stroke="rgba(16,185,129,0.5)"
                strokeWidth="1.5"
              />
            )}

            {/* SECTOR 2: PARTIALLY SEARCHED (Periphery swath) */}
            {(activeLayer === 'ALL' || activeLayer === 'PARTIAL') && (
              <polygon
                points="180,360 30,220 220,120 400,240"
                fill="url(#partialGrid)"
                stroke="rgba(245,158,11,0.5)"
                strokeWidth="1.5"
              />
            )}

            {/* SECTOR 3: CRITICAL GAP (Inundated river bend unmapped) */}
            {(activeLayer === 'ALL' || activeLayer === 'GAPS') && (
              <polygon
                points="520,380 750,280 920,380 700,500"
                fill="url(#gapGrid)"
                stroke="rgba(239,68,68,0.6)"
                strokeWidth="2"
                strokeDasharray="6 4"
              />
            )}

            {/* Flight Path Polyline */}
            <polyline
              points={flightPath.map((p) => `${p.x * 10},${p.y * 5}`).join(' ')}
              fill="none"
              stroke="#0284c7"
              strokeWidth="3"
              strokeDasharray="8 6"
              strokeLinecap="round"
            />

            {/* Flight Swath Corridor Buffer Lines */}
            <polyline
              points={flightPath.map((p) => `${p.x * 10 - 25},${p.y * 5 - 25}`).join(' ')}
              fill="none"
              stroke="rgba(2,132,199,0.25)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <polyline
              points={flightPath.map((p) => `${p.x * 10 + 25},${p.y * 5 + 25}`).join(' ')}
              fill="none"
              stroke="rgba(2,132,199,0.25)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          </svg>

          {/* Tactical Overlay Badges on Map */}
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md border border-sky-200 rounded-lg p-2 text-[10px] font-mono text-slate-500 space-y-1">
            <div className="flex items-center gap-1.5 text-sky-700 font-bold">
              <Navigation className="w-3.5 h-3.5 transform rotate-45" />
              <span>UAV-01 OPTICAL SWATH: 60m AGL</span>
            </div>
            <div className="text-slate-400">FLIGHT SPEED: 14.2 m/s • OVERLAP: 70%</div>
          </div>

          {/* Blind Spot Alert Pin */}
          <div className="absolute bottom-8 right-24 bg-red-50 border border-[#ef4444]/60 rounded-lg p-2 text-[9px] font-mono text-slate-800 max-w-xs shadow-[0_0_15px_rgba(239,68,68,0.3)]">
            <div className="flex items-center gap-1.5 text-red-700 font-bold">
              <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
              <span>SEARCH GAP: SECTOR 4B</span>
            </div>
            <div className="text-slate-500 mt-0.5">
              Dense flood tree canopy; secondary thermal UAV pass scheduled.
            </div>
          </div>

          {/* Map Legend */}
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md border border-slate-200 rounded-lg p-2 text-[9px] font-mono text-slate-500 space-y-1">
            <div className="text-[8px] font-bold text-slate-400">SWATH CLASSIFICATION</div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-emerald-700">
                <span className="w-2 h-2 rounded bg-emerald-500" /> SEARCHED
              </span>
              <span className="flex items-center gap-1 text-amber-600">
                <span className="w-2 h-2 rounded bg-amber-500" /> PARTIAL
              </span>
              <span className="flex items-center gap-1 text-red-700">
                <span className="w-2 h-2 rounded bg-red-500" /> GAP / UNSEARCHED
              </span>
            </div>
          </div>
        </div>

        {/* Map Footer Bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 gap-2">
          <div className="flex items-center gap-2 text-emerald-700">
            <Clock className="w-3.5 h-3.5" />
            <span>COVERAGE FRESHNESS: RECORDED 14m AGO</span>
          </div>
          <div className="text-slate-400">
            TOTAL SECTOR AREA: 4.3 km²
          </div>
        </div>
      </div>

      {/* Strict Disaster Safety Mandate Notice (Section 10) */}
      <div className="p-4 rounded-xl bg-white border border-red-200 text-xs space-y-2">
        <div className="flex items-center gap-2 text-red-700 font-heading font-black tracking-wider text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>DISASTER SEARCH COVERAGE DOCTRINE</span>
        </div>
        <div className="text-slate-500 space-y-1 leading-relaxed text-xs">
          <p>
            • Areas are strictly designated as <strong>SEARCHED</strong>, <strong>PARTIALLY SEARCHED</strong>, or <strong>INSUFFICIENTLY SEARCHED</strong>.
          </p>
          <p className="text-amber-600">
            • <strong>&quot;AREA SAFE&quot; IS NEVER USED.</strong> An area where no candidates are found is designated as <strong>&quot;NO CONFIRMED SURVIVOR DETECTED&quot;</strong> or <strong>&quot;SEARCH INCOMPLETE&quot;</strong>.
          </p>
          <p className="text-slate-400">
            • AI search completeness reflects sensor visibility only. Submerged debris or non-line-of-sight zones require ground / boat team physical clearance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Coverage;
